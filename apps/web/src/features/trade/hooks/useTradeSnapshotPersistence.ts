import { useCallback } from 'react';
import { logger } from '@/shared/lib/logger';
import { persistActiveSaveSnapshot } from '@/shared/lib/activeSavePersistence';

interface UseTradeSnapshotPersistenceOptions {
  activeSaveId: string | null | undefined;
  activeSaveSlot: number | null | undefined;
  exportSnapshot: () => Promise<object>;
  gmName: string | null | undefined;
  season: number;
  teamName: string | null | undefined;
}

export function useTradeSnapshotPersistence({
  activeSaveId,
  activeSaveSlot,
  exportSnapshot,
  gmName,
  season,
  teamName,
}: UseTradeSnapshotPersistenceOptions): () => Promise<void> {
  return useCallback(async () => {
    if (!activeSaveId) {
      return;
    }

    try {
      await persistActiveSaveSnapshot({
        activeSaveId,
        activeSaveSlot,
        gmName,
        teamName,
        season,
        exportSnapshot,
      });
    } catch (error) {
      logger.error('Failed to autosave trade negotiation state:', error);
    }
  }, [activeSaveId, activeSaveSlot, exportSnapshot, gmName, season, teamName]);
}
