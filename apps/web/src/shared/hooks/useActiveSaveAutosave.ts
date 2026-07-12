import { useCallback } from 'react';
import { useGameStore } from './useGameStore';
import { useWorker } from './useWorker';
import { logger } from '@/shared/lib/logger';
import { isSimAdvanceCoordinatorBusy } from './useSimAdvanceExecutor';
import {
  persistActiveSaveSnapshot,
  type ActiveSavePersistenceReceipt,
} from '@/shared/lib/activeSavePersistence';
import { withActiveSaveSessionSnapshotExportAuthorization } from '@/shared/lib/saveSessionOwnership';

interface ActiveSaveAutosaveOptions {
  season?: number;
  saveName?: string;
  transitionSaveId?: string;
}

export function useActiveSaveAutosave() {
  const worker = useWorker();
  const {
    activeSaveId,
    activeSaveSlot,
    gmName,
    teamName,
    season,
  } = useGameStore();

  return useCallback(async (options: ActiveSaveAutosaveOptions = {}) => {
    let acceptedReceipt: ActiveSavePersistenceReceipt | null = null;
    try {
      // This is a handler-independent backstop. UI controls also fence
      // themselves, but an already-captured callback must not export a worker
      // snapshot into an exact journal lease.
      if (isSimAdvanceCoordinatorBusy()) {
        return { saved: false, saveName: null, acceptedReceipt };
      }
      if (options.transitionSaveId && options.transitionSaveId !== activeSaveId) {
        throw new Error(
          `Cannot capture ${options.transitionSaveId} from worker state bound to ${activeSaveId ?? 'no active save'}.`,
        );
      }
      const result = await persistActiveSaveSnapshot({
        activeSaveId,
        activeSaveSlot,
        gmName,
        teamName,
        season: options.season ?? season,
        saveName: options.saveName,
        onSnapshotAccepted: (receipt) => {
          acceptedReceipt = receipt;
        },
        exportSnapshot: () => options.transitionSaveId
          ? withActiveSaveSessionSnapshotExportAuthorization(
              options.transitionSaveId,
              () => worker.exportSnapshot() as Promise<object>,
            )
          : worker.exportSnapshot() as Promise<object>,
      });
      return { ...result, acceptedReceipt };
    } catch (error) {
      logger.error('Failed to autosave active game:', error);
      return { saved: false, saveName: null, acceptedReceipt };
    }
  }, [activeSaveId, activeSaveSlot, gmName, season, teamName, worker]);
}
