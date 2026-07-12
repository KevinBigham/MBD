import { GameSnapshotSchema } from '@mbd/contracts';
import {
  assertActiveSaveSessionOwned,
  assertSaveTreeSessionOwned,
} from './saveSessionOwnership';
import {
  assessSimAdvanceBaseline,
  consumeSimAdvanceIntentRollback,
  isJournalSimAdvancePhase,
  prepareSimAdvanceIntent,
  resolveSaveSessionTarget,
  type SimAdvanceIntent,
  type SimAdvanceOperation,
} from './saveSystem';
import {
  beginSimAdvancePersistenceLease,
  captureSimAdvanceBaselineSeal,
  captureSimAdvanceSnapshot,
  closeCommittedSimAdvancePersistenceLeaseFailClosed,
  finishSimAdvancePersistenceLease,
  getActiveSavePersistenceStatus,
  isActiveSavePersistenceReceiptDurable,
  poisonSimAdvancePersistenceLease,
  subscribeToActiveSavePersistenceStatus,
  waitForActiveSavePersistenceReceipt,
  type ActiveSavePersistenceReceipt,
  type ActiveSaveSnapshotCaptureOptions,
  type SimAdvancePersistenceLease,
} from './activeSavePersistence';
import {
  assertSimAdvanceWorkerSessionAdmissionAvailable,
  assertSimAdvanceWorkerSessionCurrent,
  beginSimAdvanceWorkerSession,
  createSimAdvanceWorkerAuthorization,
  finishSimAdvanceWorkerSession,
  type SimAdvanceWorkerAuthorization,
  type SimAdvanceWorkerSession,
} from './workerMutationSession';

export type SimAdvanceCoordinatorStatus =
  | { kind: 'idle' }
  | { kind: 'preparing'; operation: SimAdvanceOperation }
  | { kind: 'running'; operation: SimAdvanceOperation }
  | { kind: 'persisting'; operation: SimAdvanceOperation }
  | { kind: 'publishing'; operation: SimAdvanceOperation }
  | { kind: 'rolling_back'; operation: SimAdvanceOperation }
  | { kind: 'retry_wait'; operation: SimAdvanceOperation; resume: 'preparing' | 'persisting' }
  | { kind: 'fail_closed'; error: unknown };

export type SimAdvanceCoordinatorOutcome =
  | { kind: 'durable' }
  | { kind: 'rolled_back' }
  | { kind: 'blocked'; error: unknown }
  | { kind: 'reload_required'; error: unknown };

export interface SimAdvanceCoordinatorWorker<Result> {
  exportSnapshot(session: SimAdvanceWorkerSession): Promise<object>;
  execute(
    session: SimAdvanceWorkerSession,
    authorization: SimAdvanceWorkerAuthorization,
    operation: 'simDay' | 'simWeek' | 'simMonth' | 'simToPlayoffs',
  ): Promise<{ result: Result; flowStateChanged: boolean }>;
  publishFlow(session: SimAdvanceWorkerSession): void;
  discardFlow(session: SimAdvanceWorkerSession): void;
  restoreBaseline(
    session: SimAdvanceWorkerSession,
    snapshot: object,
  ): Promise<{ importResult: { success: boolean }; restoredSnapshot: object }>;
}

export interface ExecuteSimAdvanceOptions<Result> {
  saveId: string;
  operation: SimAdvanceOperation;
  worker: SimAdvanceCoordinatorWorker<Result>;
  /** Runs only after the exact post receipt became durable while both lanes remain held. */
  publishDurable: (result: Result) => Promise<void> | void;
  /** Must uninitialize/release UI ownership; persistence/worker lanes stay fail closed. */
  failClosed: (error: unknown) => Promise<void> | void;
}

type ResolvedTarget = NonNullable<Awaited<ReturnType<typeof resolveSaveSessionTarget>>>;

let snapshot: SimAdvanceCoordinatorStatus = { kind: 'idle' };
const listeners = new Set<() => void>();
let activeRunId: symbol | null = null;

function publishStatus(next: SimAdvanceCoordinatorStatus): void {
  snapshot = Object.freeze(next);
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      // Coordinator observers are presentation-only and cannot reinterpret a
      // durable IndexedDB outcome as a save failure.
      console.error('Simulation advance coordinator observer failed:', error);
    }
  }
}

export function getSimAdvanceCoordinatorStatus(): SimAdvanceCoordinatorStatus {
  return snapshot;
}

export function subscribeToSimAdvanceCoordinator(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function workerOperation(operation: SimAdvanceOperation): 'simDay' | 'simWeek' | 'simMonth' | 'simToPlayoffs' {
  switch (operation) {
    case 'sim_day': return 'simDay';
    case 'sim_week': return 'simWeek';
    case 'sim_month': return 'simMonth';
    case 'sim_to_playoffs': return 'simToPlayoffs';
  }
}

function exactSnapshotEquals(left: object, right: object): boolean {
  return JSON.stringify(GameSnapshotSchema.parse(left)) === JSON.stringify(GameSnapshotSchema.parse(right));
}

function assertExactAuthority(
  target: ResolvedTarget,
  session: SimAdvanceWorkerSession | null,
): void {
  assertActiveSaveSessionOwned(target.saveId);
  assertSaveTreeSessionOwned(target.rootSaveId);
  if (session) {
    assertSimAdvanceWorkerSessionCurrent(session, target.saveId, target.rootSaveId);
  }
}

function captureOptions(
  target: ResolvedTarget,
  season: number,
  exportSnapshot: () => Promise<object>,
): ActiveSaveSnapshotCaptureOptions {
  return {
    activeSaveId: target.saveId,
    activeSaveSlot: target.saveId === target.rootSaveId ? target.slotNumber : null,
    gmName: null,
    teamName: null,
    season,
    exportSnapshot,
  };
}

function isPersistenceRetrying(saveId: string): boolean {
  const status = getActiveSavePersistenceStatus(saveId);
  return status.state === 'failed'
    || status.recovery?.phase === 'retry_scheduled'
    || status.recovery?.phase === 'retrying'
    || status.recovery?.phase === 'fallback_ready';
}

/**
 * Holds both worker and persistence lanes while a single exact receipt settles.
 * Status is presentation-only: the receipt remains the authority for success.
 */
async function waitForExactReceipt(
  receipt: ActiveSavePersistenceReceipt,
  target: ResolvedTarget,
  operation: SimAdvanceOperation,
  runId: symbol,
  resume: 'preparing' | 'persisting',
): Promise<Awaited<ReturnType<typeof waitForActiveSavePersistenceReceipt>>> {
  const updateRetryStatus = () => {
    if (activeRunId !== runId
      || (snapshot.kind !== resume && snapshot.kind !== 'retry_wait')
      || snapshot.operation !== operation) {
      return;
    }
    if (isPersistenceRetrying(target.saveId)) {
      publishStatus({ kind: 'retry_wait', operation, resume });
    } else if (snapshot.kind === 'retry_wait') {
      publishStatus({ kind: resume, operation });
    }
  };
  let unsubscribe: (() => void) | null = null;
  try {
    unsubscribe = subscribeToActiveSavePersistenceStatus(updateRetryStatus);
    // A failed status can predate subscription registration.
    updateRetryStatus();
    const settled = await waitForActiveSavePersistenceReceipt(receipt);
    if (snapshot.kind === 'retry_wait') publishStatus({ kind: resume, operation });
    return settled;
  } finally {
    try {
      unsubscribe?.();
    } catch (error) {
      console.error('Simulation coordinator persistence-status unsubscribe failed:', error);
    }
  }
}

async function enterFailClosed<Result>(
  error: unknown,
  options: ExecuteSimAdvanceOptions<Result>,
  lease: SimAdvancePersistenceLease | null,
  currentReceipt: ActiveSavePersistenceReceipt | null,
): Promise<SimAdvanceCoordinatorOutcome> {
  // This status transition comes first. None of the cleanup callbacks may
  // reopen the module-scoped executor or leave it claiming ordinary progress.
  publishStatus({ kind: 'fail_closed', error });
  if (lease) {
    let committedCurrentReceipt = false;
    try {
      committedCurrentReceipt = currentReceipt != null
        && isActiveSavePersistenceReceiptDurable(currentReceipt);
    } catch (secondary) {
      console.error('Simulation coordinator durable-receipt inspection failed:', secondary);
    }
    try {
      if (committedCurrentReceipt && currentReceipt) {
        closeCommittedSimAdvancePersistenceLeaseFailClosed(lease, currentReceipt);
      } else {
        poisonSimAdvancePersistenceLease(lease);
      }
    } catch (secondary) {
      console.error('Simulation coordinator fail-closed persistence retirement failed:', secondary);
    }
  }
  try {
    await options.failClosed(error);
  } catch (secondary) {
    console.error('Simulation coordinator fail-closed callback failed:', secondary);
  }
  return { kind: 'reload_required', error };
}

async function rollbackBeforePostAcceptance<Result>(
  error: unknown,
  options: ExecuteSimAdvanceOptions<Result>,
  target: ResolvedTarget,
  session: SimAdvanceWorkerSession,
  lease: SimAdvancePersistenceLease,
  intent: SimAdvanceIntent,
  rollbackSnapshot: object,
  currentReceipt: ActiveSavePersistenceReceipt | null,
): Promise<SimAdvanceCoordinatorOutcome> {
  let heldLease: SimAdvancePersistenceLease | null = lease;
  let heldSession: SimAdvanceWorkerSession | null = session;
  try {
    publishStatus({ kind: 'rolling_back', operation: options.operation });
    assertExactAuthority(target, session);
    const restored = await options.worker.restoreBaseline(session, rollbackSnapshot);
    assertExactAuthority(target, session);
    if (!restored.importResult.success || !exactSnapshotEquals(restored.restoredSnapshot, rollbackSnapshot)) {
      throw new Error('Simulation baseline restoration did not verify exactly.');
    }
    await consumeSimAdvanceIntentRollback(intent);
    assertExactAuthority(target, session);
    // Validate and reserve the worker release first; its callback closes
    // persistence while ordinary worker mutation/export/switch authority is
    // still fenced. A callback failure leaves both exact lanes available for
    // fail-closed retirement rather than reopening persistence first.
    const releaseLease = heldLease;
    const releaseSession = heldSession;
    if (!releaseLease || !releaseSession) throw new Error('Simulation rollback authority disappeared before release.');
    finishSimAdvanceWorkerSession(releaseSession, () => finishSimAdvancePersistenceLease(releaseLease));
    heldLease = null;
    heldSession = null;
    activeRunId = null;
    publishStatus({ kind: 'idle' });
    return { kind: 'rolled_back' };
  } catch (rollbackError) {
    return enterFailClosed(rollbackError ?? error, options, heldLease, currentReceipt);
  }
}

/** One module-scoped exact-save regular-season command. */
export async function executeSimAdvance<Result>(
  options: ExecuteSimAdvanceOptions<Result>,
): Promise<SimAdvanceCoordinatorOutcome> {
  if (snapshot.kind !== 'idle') {
    throw new Error('A simulation advance command is already active.');
  }
  try {
    // Admission is intentionally synchronous and precedes even presentation
    // state. An ordinary worker mutation that won this turn remains free to
    // enter its exact persistence capture without being rejected by a
    // coordinator status that has not acquired worker authority.
    assertSimAdvanceWorkerSessionAdmissionAvailable(options.saveId);
  } catch (error) {
    return { kind: 'blocked', error };
  }
  publishStatus({ kind: 'preparing', operation: options.operation });
  const runId = Symbol(`sim-advance-run:${options.saveId}:${options.operation}`);
  activeRunId = runId;

  let target: ResolvedTarget | null = null;
  let session: SimAdvanceWorkerSession | null = null;
  let lease: SimAdvancePersistenceLease | null = null;
  let intent: SimAdvanceIntent | null = null;
  let rollbackSnapshot: object | null = null;
  let currentReceipt: ActiveSavePersistenceReceipt | null = null;
  let postAccepted = false;

  try {
    target = await resolveSaveSessionTarget(options.saveId);
    if (!target || target.saveId !== options.saveId) {
      throw new Error('The exact simulation save could not be resolved.');
    }
    assertExactAuthority(target, null);

    session = beginSimAdvanceWorkerSession(target.saveId, target.rootSaveId);
    assertExactAuthority(target, session);
    lease = await beginSimAdvancePersistenceLease(target.saveId, target.rootSaveId);
    assertExactAuthority(target, session);

    const exportedBaseline = await options.worker.exportSnapshot(session);
    assertExactAuthority(target, session);
    let assessment = await assessSimAdvanceBaseline(target.saveId, target.rootSaveId, exportedBaseline);
    assertExactAuthority(target, session);
    if (!isJournalSimAdvancePhase(GameSnapshotSchema.parse(assessment.proof.workerSnapshot).phase)) {
      // The worker export/durable proof is authoritative: postseason and
      // offseason belong to the bounded legacy lane, before any journal side
      // effect, seal, gameplay, or flow publication.
      options.worker.discardFlow(session);
      const releaseLease = lease;
      const releaseSession = session;
      finishSimAdvanceWorkerSession(releaseSession, () => finishSimAdvancePersistenceLease(releaseLease));
      lease = null;
      session = null;
      activeRunId = null;
      publishStatus({ kind: 'idle' });
      return { kind: 'blocked', error: new Error('Simulation journal is unavailable outside preseason or regular season.') };
    }
    rollbackSnapshot = assessment.proof.workerSnapshot;

    if (assessment.kind === 'seal_required') {
      const retainedBaseline = assessment.proof.workerSnapshot;
      const sealReceipt = await captureSimAdvanceBaselineSeal(
        lease,
        assessment.proof,
        captureOptions(target, assessment.proof.baseline.season, async () => retainedBaseline),
      );
      currentReceipt = sealReceipt;
      assertExactAuthority(target, session);
      const sealOutcome = await waitForExactReceipt(sealReceipt, target, options.operation, runId, 'preparing');
      assertExactAuthority(target, session);
      if (sealOutcome.kind !== 'durable') {
        throw new Error(`Simulation baseline seal receipt retired: ${sealOutcome.reason}`);
      }
      // The seal callback returned the retained first export. Reassessment is
      // deliberately against that same object: no second worker export exists.
      assessment = await assessSimAdvanceBaseline(target.saveId, target.rootSaveId, retainedBaseline);
      assertExactAuthority(target, session);
      if (!isJournalSimAdvancePhase(GameSnapshotSchema.parse(assessment.proof.workerSnapshot).phase)) {
        throw new Error('Simulation baseline left its journalled phase during sealing.');
      }
      if (assessment.kind !== 'ready') {
        throw new Error('Simulation baseline remains seal-required after its exact durable seal.');
      }
      rollbackSnapshot = assessment.proof.workerSnapshot;
    }

    if (assessment.kind !== 'ready') {
      throw new Error('Simulation baseline assessment did not produce ready evidence.');
    }
    const readyProof = assessment.proof;
    intent = await prepareSimAdvanceIntent(readyProof, options.operation);
    assertExactAuthority(target, session);

    publishStatus({ kind: 'running', operation: options.operation });
    const operation = workerOperation(options.operation);
    const authorization = createSimAdvanceWorkerAuthorization(
      session,
      target.saveId,
      target.rootSaveId,
      operation,
      intent,
    );
    const executed = await options.worker.execute(session, authorization, operation);
    assertExactAuthority(target, session);
    const retainedPost = await options.worker.exportSnapshot(session);
    assertExactAuthority(target, session);
    const postReceipt = await captureSimAdvanceSnapshot(lease, intent, {
      ...captureOptions(target, readyProof.baseline.season, async () => retainedPost),
      // Never accept a caller-controlled label for a journalled command.
      saveName: readyProof.baseline.name,
    });
    // A capture rejection remains rollback territory. This flip is intentionally
    // after the exact receipt object exists.
    postAccepted = true;
    currentReceipt = postReceipt;
    assertExactAuthority(target, session);

    publishStatus({ kind: 'persisting', operation: options.operation });
    const postOutcome = await waitForExactReceipt(postReceipt, target, options.operation, runId, 'persisting');
    if (postOutcome.kind !== 'durable') {
      throw new Error(`Simulation post receipt retired: ${postOutcome.reason}`);
    }
    assertExactAuthority(target, session);
    // Ordinary read admission opens only once the exact post transaction is
    // durable. A retired receipt leaves the worker's in-memory post fenced.
    publishStatus({ kind: 'publishing', operation: options.operation });
    assertExactAuthority(target, session);
    await options.publishDurable(executed.result);
    assertExactAuthority(target, session);
    assertExactAuthority(target, session);
    options.worker.publishFlow(session);
    assertExactAuthority(target, session);
    const releaseLease = lease;
    const releaseSession = session;
    if (!releaseLease || !releaseSession) throw new Error('Simulation command authority disappeared before release.');
    finishSimAdvanceWorkerSession(releaseSession, () => finishSimAdvancePersistenceLease(releaseLease));
    lease = null;
    session = null;
    activeRunId = null;
    publishStatus({ kind: 'idle' });
    return { kind: 'durable' };
  } catch (error) {
    // Resolution/authority failures before a persistence lease exists, and a
    // typed ordinary-work admission block, leave no journal/export/gameplay
    // side effect. Return a precise idle outcome without failing a newer save.
    if (!lease && !intent && !postAccepted) {
      try {
        if (session) finishSimAdvanceWorkerSession(session);
      } catch (finishError) {
        return enterFailClosed(finishError, options, null, null);
      }
      activeRunId = null;
      publishStatus({ kind: 'idle' });
      return { kind: 'blocked', error };
    }
    if (!target) {
      return enterFailClosed(error, options, lease, currentReceipt);
    }
    if (intent && !postAccepted && session && lease && rollbackSnapshot) {
      return rollbackBeforePostAcceptance(
        error,
        options,
        target,
        session,
        lease,
        intent,
        rollbackSnapshot,
        currentReceipt,
      );
    }
    return enterFailClosed(error, options, lease, currentReceipt);
  }
}

export function resetSimAdvanceCoordinatorForTesting(): void {
  // Deferred ordinary worker reads subscribe to this module. A test reset
  // must retire them, not release a stale call into a newly-created worker.
  // Restore the idle fixture silently only after the terminal notification.
  publishStatus({ kind: 'fail_closed', error: new Error('Simulation coordinator reset.') });
  activeRunId = null;
  listeners.clear();
  snapshot = { kind: 'idle' };
}
