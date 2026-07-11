import type { ActiveSaveSessionTransition } from './activeSavePersistence';
import {
  getSaveSessionOwnershipSnapshot,
  releaseActiveSaveSessionOwnership,
  withActiveSaveSessionImportAuthorization,
  withActiveSaveSessionSnapshotExportAuthorization,
} from './saveSessionOwnership';

interface SnapshotImportResult {
  success: boolean;
  error?: unknown;
}

export type SaveSessionWorkerRecoveryResult =
  | { kind: 'discarded_candidate' }
  | { kind: 'restored_outgoing' }
  | { kind: 'reload_required'; error: unknown };

export async function captureOutgoingSaveSessionSnapshot(
  transition: ActiveSaveSessionTransition,
  exportSnapshot: () => Promise<object>,
): Promise<object | null> {
  if (!transition.outgoingSaveId) {
    return null;
  }
  return withActiveSaveSessionSnapshotExportAuthorization(
    transition.outgoingSaveId,
    exportSnapshot,
  );
}

/**
 * A candidate import replaces the singleton worker before ownership can be
 * committed. If that commit fails, discard the candidate and restore the
 * quiescent outgoing snapshot while its active lock is still held. A failed
 * restore releases active authority and marks the UI uninitialized so no
 * stale callback can mutate an ambiguous worker; AppBoot can then perform the
 * ordinary verified reload, or the player can hard-reload if worker restart
 * itself is unavailable.
 */
export async function recoverWorkerAfterCandidateImportFailure({
  importSnapshot,
  candidateCommitted = false,
  outgoingSnapshot,
  restartWorker,
  setInitialized,
  transition,
}: {
  importSnapshot: (snapshot: object) => Promise<SnapshotImportResult>;
  candidateCommitted?: boolean;
  outgoingSnapshot: object | null;
  restartWorker: () => Promise<void>;
  setInitialized?: (initialized: boolean) => void;
  transition: ActiveSaveSessionTransition;
}): Promise<SaveSessionWorkerRecoveryResult> {
  try {
    await restartWorker();
    const ownership = getSaveSessionOwnershipSnapshot();
    const candidateIsAuthoritative = candidateCommitted
      || ownership.activeSaveId === transition.targetSaveId;
    if (candidateIsAuthoritative) {
      let releaseError: unknown = null;
      try {
        await releaseActiveSaveSessionOwnership();
      } catch (error) {
        releaseError = error;
      } finally {
        setInitialized?.(false);
      }
      return {
        kind: 'reload_required',
        error: releaseError
          ? new AggregateError(
              [releaseError],
              'Candidate activation failed and its active session could not be released cleanly.',
            )
          : new Error(
              'The candidate became authoritative but activation did not finish; a verified reload is required.',
            ),
      };
    }
    if (!transition.outgoingSaveId) {
      return { kind: 'discarded_candidate' };
    }
    if (!outgoingSnapshot) {
      throw new Error('The outgoing dynasty snapshot was unavailable for rollback.');
    }

    const restored = await withActiveSaveSessionImportAuthorization(
      transition.outgoingSaveId,
      () => importSnapshot(outgoingSnapshot),
    );
    if (!restored.success) {
      throw new Error(
        typeof restored.error === 'string'
          ? restored.error
          : 'The outgoing dynasty could not be restored after the failed switch.',
      );
    }
    return { kind: 'restored_outgoing' };
  } catch (error) {
    try {
      await restartWorker();
    } catch {
      // The active claim is released below, so even a failed worker restart
      // cannot leave the ambiguous worker authorized for gameplay.
    }
    let recoveryError = error;
    if (transition.outgoingSaveId) {
      try {
        await releaseActiveSaveSessionOwnership();
      } catch (releaseError) {
        recoveryError = new AggregateError(
          [error, releaseError],
          'Worker rollback and active save-session release both failed.',
        );
      } finally {
        setInitialized?.(false);
      }
    }
    return { kind: 'reload_required', error: recoveryError };
  }
}
