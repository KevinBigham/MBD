import { useCallback } from 'react';
import { useGameStore } from './useGameStore';
import { useWorker } from './useWorker';
import { logger } from '@/shared/lib/logger';
import { persistActiveSaveSnapshot } from '@/shared/lib/activeSavePersistence';
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
    try {
      if (options.transitionSaveId && options.transitionSaveId !== activeSaveId) {
        throw new Error(
          `Cannot capture ${options.transitionSaveId} from worker state bound to ${activeSaveId ?? 'no active save'}.`,
        );
      }
      return await persistActiveSaveSnapshot({
        activeSaveId,
        activeSaveSlot,
        gmName,
        teamName,
        season: options.season ?? season,
        saveName: options.saveName,
        exportSnapshot: () => options.transitionSaveId
          ? withActiveSaveSessionSnapshotExportAuthorization(
              options.transitionSaveId,
              () => worker.exportSnapshot() as Promise<object>,
            )
          : worker.exportSnapshot() as Promise<object>,
      });
    } catch (error) {
      logger.error('Failed to autosave active game:', error);
      return { saved: false, saveName: null };
    }
  }, [activeSaveId, activeSaveSlot, gmName, season, teamName, worker]);
}
