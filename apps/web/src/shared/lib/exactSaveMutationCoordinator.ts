import { GameSnapshotSchema } from '@mbd/contracts';
import {
  abortExactSaveMutationPersistenceLease,
  beginExactSaveMutationPersistenceLease,
  captureExactSaveMutationSnapshot,
  closeCommittedExactSaveMutationPersistenceLeaseFailClosed,
  finishExactSaveMutationPersistenceLease,
  isActiveSavePersistenceReceiptDurable,
  poisonExactSaveMutationPersistenceLease,
  waitForExactSaveMutationPersistenceReceipt,
  type ActiveSavePersistenceReceipt,
  type ExactSaveMutationPersistenceLease,
} from './activeSavePersistence';
import {
  assertActiveSaveSessionOwned,
  assertSaveTreeSessionOwned,
} from './saveSessionOwnership';
import { resolveSaveSessionTarget } from './saveSystem';
import {
  assertExactSaveMutationWorkerSessionAdmissionAvailable,
  assertExactSaveMutationWorkerSessionCurrent,
  beginExactSaveMutationWorkerSession,
  finishExactSaveMutationWorkerSession,
  type ExactSaveMutationWorkerSession,
} from './workerMutationSession';

export type ExactSaveMutationStatus =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'persisting' }
  | { kind: 'rolling_back' }
  | { kind: 'fail_closed'; error: unknown };

export type ExactSaveMutationOutcome<Result> =
  | { kind: 'durable'; result: Result }
  | { kind: 'unchanged'; result: Result }
  | { kind: 'rolled_back'; error: unknown }
  | { kind: 'blocked'; error: unknown }
  | { kind: 'reload_required'; error: unknown };

export interface ExactSaveMutationWorker<Result, Operation> {
  exportSnapshot(session: ExactSaveMutationWorkerSession): Promise<object>;
  execute(session: ExactSaveMutationWorkerSession, operation: Operation): Promise<Result>;
  restoreBaseline(
    session: ExactSaveMutationWorkerSession,
    snapshot: object,
  ): Promise<{ importResult: { success: boolean }; restoredSnapshot: object }>;
  publishFlow(session: ExactSaveMutationWorkerSession): void;
  discardFlow(session: ExactSaveMutationWorkerSession): void;
}

export interface ExecuteExactSaveMutationOptions<Result, Operation> {
  saveId: string;
  gmName: string | null;
  teamName: string | null;
  season: number;
  operation: Operation;
  worker: ExactSaveMutationWorker<Result, Operation>;
  didChange?: (result: Result) => boolean;
  failClosed: (error: unknown) => Promise<void> | void;
}

export function didFlowAwareExactMutationChange(result: unknown): boolean {
  return typeof result !== 'object'
    || result === null
    || !('flowStateChanged' in result)
    || (result as { flowStateChanged?: unknown }).flowStateChanged !== false;
}

let status: ExactSaveMutationStatus = { kind: 'idle' };
const listeners = new Set<() => void>();

function publishStatus(next: ExactSaveMutationStatus) {
  status = Object.freeze(next);
  listeners.forEach((listener) => listener());
}

export function getExactSaveMutationStatus(): ExactSaveMutationStatus {
  return status;
}

export function subscribeToExactSaveMutationStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshotsEqual(left: object, right: object): boolean {
  return JSON.stringify(GameSnapshotSchema.parse(left)) === JSON.stringify(GameSnapshotSchema.parse(right));
}

function assertExactAuthority(
  saveId: string,
  rootSaveId: string,
  session: ExactSaveMutationWorkerSession,
) {
  assertActiveSaveSessionOwned(saveId);
  assertSaveTreeSessionOwned(rootSaveId);
  assertExactSaveMutationWorkerSessionCurrent(session, saveId, rootSaveId);
}

async function failClosed<Result, Operation>(
  error: unknown,
  options: ExecuteExactSaveMutationOptions<Result, Operation>,
  session: ExactSaveMutationWorkerSession | null,
  persistenceLease: ExactSaveMutationPersistenceLease | null,
  receipt: ActiveSavePersistenceReceipt | null,
): Promise<ExactSaveMutationOutcome<Result>> {
  publishStatus({ kind: 'fail_closed', error });
  if (persistenceLease) {
    try {
      if (receipt && isActiveSavePersistenceReceiptDurable(receipt)) {
        closeCommittedExactSaveMutationPersistenceLeaseFailClosed(persistenceLease, receipt);
      } else {
        poisonExactSaveMutationPersistenceLease(persistenceLease);
      }
    } catch (secondary) {
      console.error('Exact-save mutation persistence fail-close failed:', secondary);
    }
  }
  if (!session) {
    console.error('Exact-save mutation fail-close lost its worker fence before the page was retired.');
  }
  // Keep the exact worker session held. Releasing it here would let ordinary
  // mutations or snapshot exports touch a worker whose accepted post snapshot
  // is not coherently owned. A hard reload recreates this module and worker.
  try {
    await options.failClosed(error);
  } catch (secondary) {
    console.error('Exact-save mutation fail-close callback failed:', secondary);
  }
  return { kind: 'reload_required', error };
}

/**
 * Runs one non-journalled mutation under exact save authority. The baseline is
 * retained only for pre-acceptance rollback; once a post-snapshot receipt is
 * accepted, persistence retries that exact object while the worker lane stays
 * fenced. Roadmap item 8 remains the sole regular-season WAL owner.
 */
export async function executeExactSaveMutation<Result, Operation>(
  options: ExecuteExactSaveMutationOptions<Result, Operation>,
): Promise<ExactSaveMutationOutcome<Result>> {
  if (status.kind !== 'idle') {
    return { kind: 'blocked', error: new Error('An exact-save mutation is already active.') };
  }
  try {
    assertExactSaveMutationWorkerSessionAdmissionAvailable();
  } catch (error) {
    return { kind: 'blocked', error };
  }
  // Publish before target resolution's first async boundary. Otherwise two
  // callbacks in the same turn can both observe idle, and the losing callback
  // can later overwrite the admitted run's status even though the worker
  // session correctly rejects its mutation.
  publishStatus({ kind: 'running' });

  let session: ExactSaveMutationWorkerSession | null = null;
  let persistenceLease: ExactSaveMutationPersistenceLease | null = null;
  let baseline: object | null = null;
  let postAccepted: ActiveSavePersistenceReceipt | null = null;
  let workerStarted = false;

  try {
    const target = await resolveSaveSessionTarget(options.saveId);
    if (!target || target.saveId !== options.saveId) {
      throw new Error('The exact mutation save could not be resolved.');
    }
    assertActiveSaveSessionOwned(target.saveId);
    assertSaveTreeSessionOwned(target.rootSaveId);
    session = beginExactSaveMutationWorkerSession(target.saveId, target.rootSaveId);
    assertExactAuthority(target.saveId, target.rootSaveId, session);
    persistenceLease = await beginExactSaveMutationPersistenceLease(target.saveId, target.rootSaveId);
    assertExactAuthority(target.saveId, target.rootSaveId, session);

    baseline = await options.worker.exportSnapshot(session);
    assertExactAuthority(target.saveId, target.rootSaveId, session);
    workerStarted = true;
    const result = await options.worker.execute(session, options.operation);
    assertExactAuthority(target.saveId, target.rootSaveId, session);
    const retainedPost = await options.worker.exportSnapshot(session);
    assertExactAuthority(target.saveId, target.rootSaveId, session);

    if (options.didChange && !options.didChange(result)) {
      if (!snapshotsEqual(retainedPost, baseline)) {
        throw new Error('A no-change exact mutation altered the canonical snapshot.');
      }
      options.worker.discardFlow(session);
      finishExactSaveMutationWorkerSession(session, () => {
        abortExactSaveMutationPersistenceLease(persistenceLease!);
      });
      session = null;
      persistenceLease = null;
      publishStatus({ kind: 'idle' });
      return { kind: 'unchanged', result };
    }

    publishStatus({ kind: 'persisting' });
    postAccepted = await captureExactSaveMutationSnapshot(persistenceLease, {
      activeSaveId: target.saveId,
      activeSaveSlot: target.saveId === target.rootSaveId ? target.slotNumber : null,
      gmName: options.gmName,
      teamName: options.teamName,
      season: options.season,
      exportSnapshot: async () => retainedPost,
    });
    const receiptOutcome = await waitForExactSaveMutationPersistenceReceipt(postAccepted);
    assertExactAuthority(target.saveId, target.rootSaveId, session);
    if (receiptOutcome.kind !== 'durable') {
      return failClosed(
        new Error(`Exact mutation receipt retired: ${receiptOutcome.reason}`),
        options,
        session,
        persistenceLease,
        postAccepted,
      );
    }

    options.worker.publishFlow(session);
    assertExactAuthority(target.saveId, target.rootSaveId, session);
    finishExactSaveMutationWorkerSession(session, () => {
      finishExactSaveMutationPersistenceLease(persistenceLease!, postAccepted!);
    });
    session = null;
    persistenceLease = null;
    publishStatus({ kind: 'idle' });
    return { kind: 'durable', result };
  } catch (error) {
    if (session && workerStarted && baseline && !postAccepted) {
      try {
        publishStatus({ kind: 'rolling_back' });
        const restored = await options.worker.restoreBaseline(session, baseline);
        assertExactSaveMutationWorkerSessionCurrent(session, options.saveId);
        if (!restored.importResult.success || !snapshotsEqual(restored.restoredSnapshot, baseline)) {
          throw new Error('Exact mutation baseline restoration did not verify.');
        }
        finishExactSaveMutationWorkerSession(session, () => {
          if (persistenceLease) abortExactSaveMutationPersistenceLease(persistenceLease);
        });
        session = null;
        persistenceLease = null;
        publishStatus({ kind: 'idle' });
        return { kind: 'rolled_back', error };
      } catch (rollbackError) {
        return failClosed(rollbackError, options, session, persistenceLease, postAccepted);
      }
    }
    // Receipt acceptance is the point of no return. If ownership or worker
    // identity changes after that point, releasing the fence and reporting a
    // routine block could expose a worker snapshot that the UI no longer owns.
    if (postAccepted) {
      return failClosed(error, options, session, persistenceLease, postAccepted);
    }
    if (session) {
      try {
        finishExactSaveMutationWorkerSession(session, () => {
          if (persistenceLease) abortExactSaveMutationPersistenceLease(persistenceLease);
        });
      } catch (secondary) {
        return failClosed(secondary, options, session, persistenceLease, postAccepted);
      }
      session = null;
      persistenceLease = null;
    } else if (persistenceLease) {
      try { abortExactSaveMutationPersistenceLease(persistenceLease); }
      catch (secondary) { return failClosed(secondary, options, session, persistenceLease, postAccepted); }
      persistenceLease = null;
    }
    publishStatus({ kind: 'idle' });
    return { kind: 'blocked', error };
  }
}

export function resetExactSaveMutationCoordinatorForTesting() {
  status = { kind: 'idle' };
  listeners.clear();
}
