import { useCallback, useEffect, useState } from 'react';
import { logger } from '@/shared/lib/logger';
import type { PerformanceDiagnosticsView } from '@/workers/sim.worker.diagnostics';

type DiagnosticsBusyState = 'archive' | 'prune' | null;

interface SettingsDiagnosticsMutationResult {
  diagnostics: PerformanceDiagnosticsView;
}

interface ArchiveOldSeasonsResult extends SettingsDiagnosticsMutationResult {
  archivedCount: number;
}

interface PruneStaleDataResult extends SettingsDiagnosticsMutationResult {
  prunedCount: number;
}

interface UseSettingsDiagnosticsDataOptions {
  activeManagedSaveId: string | null;
  archiveOldSeasons?: () => Promise<unknown>;
  getPerformanceDiagnostics?: () => Promise<unknown>;
  onStatusChange: (status: string) => void;
  persistActiveSave: () => Promise<{ saved: boolean; saveName: string | null }>;
  pruneStaleData?: () => Promise<unknown>;
  workerReady: boolean;
}

interface UseSettingsDiagnosticsDataResult {
  diagnostics: PerformanceDiagnosticsView | null;
  diagnosticsBusy: DiagnosticsBusyState;
  handleArchiveOldSeasons: () => Promise<void>;
  handlePruneStaleData: () => Promise<void>;
  refreshDiagnostics: () => Promise<void>;
}

export function useSettingsDiagnosticsData({
  activeManagedSaveId,
  archiveOldSeasons,
  getPerformanceDiagnostics,
  onStatusChange,
  persistActiveSave,
  pruneStaleData,
  workerReady,
}: UseSettingsDiagnosticsDataOptions): UseSettingsDiagnosticsDataResult {
  const [diagnostics, setDiagnostics] = useState<PerformanceDiagnosticsView | null>(null);
  const [diagnosticsBusy, setDiagnosticsBusy] = useState<DiagnosticsBusyState>(null);

  const refreshDiagnostics = useCallback(async () => {
    if (!workerReady || !getPerformanceDiagnostics) {
      setDiagnostics(null);
      return;
    }

    setDiagnostics(await getPerformanceDiagnostics() as PerformanceDiagnosticsView | null);
  }, [getPerformanceDiagnostics, workerReady]);

  useEffect(() => {
    void refreshDiagnostics();
  }, [activeManagedSaveId, refreshDiagnostics]);

  const handleArchiveOldSeasons = useCallback(async () => {
    if (!activeManagedSaveId || !archiveOldSeasons) {
      return;
    }

    setDiagnosticsBusy('archive');
    onStatusChange('');
    try {
      const result = await archiveOldSeasons() as ArchiveOldSeasonsResult;
      setDiagnostics(result.diagnostics);
      if (result.archivedCount === 0) {
        onStatusChange('No older seasons needed archiving.');
        return;
      }
      const persistence = await persistActiveSave().catch((error: unknown) => {
        logger.error('Failed to persist archived seasons:', error);
        return { saved: false as const, saveName: null };
      });
      if (!persistence.saved) {
        onStatusChange(
          `Archived ${result.archivedCount} older seasons, but the updated save was not durable. Use Retry in the save status.`,
        );
        return;
      }
      onStatusChange(`Archived ${result.archivedCount} older seasons into the long-term archive.`);
    } catch (error) {
      logger.error('Failed to archive older seasons:', error);
      onStatusChange('Failed to archive older seasons.');
    } finally {
      setDiagnosticsBusy(null);
    }
  }, [activeManagedSaveId, archiveOldSeasons, onStatusChange, persistActiveSave]);

  const handlePruneStaleData = useCallback(async () => {
    if (!activeManagedSaveId || !pruneStaleData) {
      return;
    }

    setDiagnosticsBusy('prune');
    onStatusChange('');
    try {
      const result = await pruneStaleData() as PruneStaleDataResult;
      setDiagnostics(result.diagnostics);
      if (result.prunedCount === 0) {
        onStatusChange('No stale entries needed pruning.');
        return;
      }
      const persistence = await persistActiveSave().catch((error: unknown) => {
        logger.error('Failed to persist pruned save state:', error);
        return { saved: false as const, saveName: null };
      });
      if (!persistence.saved) {
        onStatusChange(
          `Pruned ${result.prunedCount} stale entries, but the updated save was not durable. Use Retry in the save status.`,
        );
        return;
      }
      onStatusChange(`Pruned ${result.prunedCount} stale entries from the active save.`);
    } catch (error) {
      logger.error('Failed to prune stale data:', error);
      onStatusChange('Failed to prune stale data.');
    } finally {
      setDiagnosticsBusy(null);
    }
  }, [activeManagedSaveId, onStatusChange, persistActiveSave, pruneStaleData]);

  return {
    diagnostics,
    diagnosticsBusy,
    handleArchiveOldSeasons,
    handlePruneStaleData,
    refreshDiagnostics,
  };
}
