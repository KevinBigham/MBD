import { useCallback, useSyncExternalStore } from 'react';
import { releaseActiveSaveSessionOwnership } from '@/shared/lib/saveSessionOwnership';
import {
  executeSimAdvance,
  getSimAdvanceCoordinatorStatus,
  subscribeToSimAdvanceCoordinator,
  type SimAdvanceCoordinatorOutcome,
  type SimAdvanceCoordinatorStatus,
  type SimAdvanceCoordinatorWorker,
} from '@/shared/lib/simAdvanceCoordinator';
import { isJournalSimAdvancePhase, type SimAdvanceOperation } from '@/shared/lib/saveSystem';
import { useGameStore } from './useGameStore';
import { isBootRecoveryAdmissionBlocked } from '@/shared/lib/bootRecoveryAdmission';

export function useSimAdvanceCoordinatorStatus(): SimAdvanceCoordinatorStatus {
  return useSyncExternalStore(
    subscribeToSimAdvanceCoordinator,
    getSimAdvanceCoordinatorStatus,
    getSimAdvanceCoordinatorStatus,
  );
}

export function isSimAdvanceCoordinatorBusy(): boolean {
  return getSimAdvanceCoordinatorStatus().kind !== 'idle' || isBootRecoveryAdmissionBlocked();
}

export interface UseSimAdvanceExecutorOptions<Result> {
  /** Pass the hook's exact `worker.simAdvance` object, never a forwarding proxy. */
  worker: SimAdvanceCoordinatorWorker<Result>;
  workerReady: boolean;
  /** The initiating surface's strict post-durable refresh. */
  refreshAfterDurable: (result: Result) => Promise<void> | void;
}

const blocked = (message: string): SimAdvanceCoordinatorOutcome => ({
  kind: 'blocked',
  error: new Error(message),
});

/**
 * The only React-facing admission point for owned regular-season advances.
 * It deliberately keeps UI mirrors downstream of the coordinator's exact
 * durable receipt and uses the store imperatively at publish time so a stale
 * mounted surface cannot update a successor save.
 */
export function useSimAdvanceExecutor<Result>(
  { worker, workerReady, refreshAfterDurable }: UseSimAdvanceExecutorOptions<Result>,
): {
  execute: (operation: SimAdvanceOperation) => Promise<SimAdvanceCoordinatorOutcome>;
  status: SimAdvanceCoordinatorStatus;
} {
  const status = useSimAdvanceCoordinatorStatus();
  const mountedSaveId = useGameStore((state) => state.activeSaveId);
  const initialized = useGameStore((state) => state.isInitialized);
  const mountedPhase = useGameStore((state) => state.phase);

  const execute = useCallback(async (operation: SimAdvanceOperation): Promise<SimAdvanceCoordinatorOutcome> => {
    const initial = useGameStore.getState();
    const capturedSaveId = mountedSaveId;
    if (!capturedSaveId
      || capturedSaveId !== initial.activeSaveId
      || !initial.isInitialized
      || initial.phase !== mountedPhase
      || !isJournalSimAdvancePhase(initial.phase)
      || !initialized
      || !workerReady
      || getSimAdvanceCoordinatorStatus().kind !== 'idle') {
      return blocked('The requested simulation advance is no longer admissible for this save.');
    }

    try {
      return await executeSimAdvance({
      saveId: capturedSaveId,
      operation,
      worker,
      publishDurable: async (result) => {
        const live = useGameStore.getState();
        if (live.activeSaveId !== capturedSaveId) {
          throw new Error('The active save changed before the durable simulation result could publish.');
        }
        // This is intentionally synchronous: route DTO reads and flow remain
        // downstream of the exact worker result mirror and strict refresh.
        live.updateFromSim(result as Parameters<typeof live.updateFromSim>[0]);
        await refreshAfterDurable(result);
      },
      failClosed: async () => {
        // A stale surface must never release or uninitialize a successor.
        if (useGameStore.getState().activeSaveId !== capturedSaveId) return;
        try {
          await releaseActiveSaveSessionOwnership();
        } catch (releaseError) {
          // Coordinator remains fail-closed; a release error must not prevent
          // the same-save UI from becoming uninitialized/reload-only.
          console.error('Simulation fail-closed ownership release failed:', releaseError);
        } finally {
          if (useGameStore.getState().activeSaveId === capturedSaveId) {
            useGameStore.getState().setInitialized(false);
          }
        }
      },
      });
    } catch (error) {
      // A same-tick click from another surface races after its initial idle
      // observation. The module-scoped coordinator owns the command; expose
      // that race as a harmless local admission block, never an unhandled UI
      // promise. All other coordinator failures retain their original path.
      if (getSimAdvanceCoordinatorStatus().kind !== 'idle'
        && error instanceof Error
        && error.message === 'A simulation advance command is already active.') {
        return blocked(error.message);
      }
      throw error;
    }
  }, [initialized, mountedPhase, mountedSaveId, refreshAfterDurable, worker, workerReady]);

  return { execute, status };
}
