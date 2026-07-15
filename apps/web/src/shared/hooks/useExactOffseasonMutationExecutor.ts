import { useCallback } from 'react';
import { useGameStore } from './useGameStore';
import { releaseActiveSaveSessionOwnership } from '@/shared/lib/saveSessionOwnership';
import {
  executeExactSaveMutation,
  getExactSaveMutationStatus,
  type ExactSaveMutationWorker,
} from '@/shared/lib/exactSaveMutationCoordinator';

type OffseasonOperation = 'advanceOffseason' | 'skipOffseasonPhase';

export interface ExactOffseasonMutationWorker<Result>
  extends ExactSaveMutationWorker<Result, OffseasonOperation> {}

export function useExactOffseasonMutationExecutor<Result>(
  worker: ExactOffseasonMutationWorker<Result>,
  workerReady: boolean,
) {
  const store = useGameStore();

  return useCallback(async (operation: OffseasonOperation): Promise<Result | null> => {
    const live = useGameStore.getState();
    const capturedSaveId = store.activeSaveId;
    if (!capturedSaveId
      || live.activeSaveId !== capturedSaveId
      || !store.isInitialized
      || !live.isInitialized
      || store.phase !== 'offseason'
      || live.phase !== 'offseason'
      || !workerReady
      || getExactSaveMutationStatus().kind !== 'idle') {
      return null;
    }

    const outcome = await executeExactSaveMutation({
      saveId: capturedSaveId,
      gmName: store.gmName,
      teamName: store.teamName,
      season: store.season,
      operation,
      worker,
      failClosed: async () => {
        if (useGameStore.getState().activeSaveId !== capturedSaveId) return;
        try {
          await releaseActiveSaveSessionOwnership();
        } catch (error) {
          console.error('Exact offseason mutation ownership release failed:', error);
        } finally {
          if (useGameStore.getState().activeSaveId === capturedSaveId) {
            useGameStore.getState().setInitialized(false);
          }
        }
      },
    });

    if (outcome.kind !== 'durable') {
      console.error('Exact offseason mutation did not reach durability:', outcome.error);
      return null;
    }
    return outcome.result;
  }, [store.activeSaveId, store.gmName, store.isInitialized, store.phase, store.season, store.teamName, worker, workerReady]);
}
