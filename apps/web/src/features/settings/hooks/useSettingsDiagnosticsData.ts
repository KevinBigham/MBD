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
  archiveOldSeasons?: (saveId: string) => Promise<unknown>;
  getPerformanceDiagnostics?: () => Promise<unknown>;
  onStatusChange: (status: string) => void;
  pruneStaleData?: (saveId: string) => Promise<unknown>;
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
      const result = await archiveOldSeasons(activeManagedSaveId) as ArchiveOldSeasonsResult;
      setDiagnostics(result.diagnostics);
      onStatusChange(`Archived ${result.archivedCount} older seasons into the long-term archive.`);
    } catch (error) {
      logger.error('Failed to archive older seasons:', error);
      onStatusChange('Failed to archive older seasons.');
    } finally {
      setDiagnosticsBusy(null);
    }
  }, [activeManagedSaveId, archiveOldSeasons, onStatusChange]);

  const handlePruneStaleData = useCallback(async () => {
    if (!activeManagedSaveId || !pruneStaleData) {
      return;
    }

    setDiagnosticsBusy('prune');
    onStatusChange('');
    try {
      const result = await pruneStaleData(activeManagedSaveId) as PruneStaleDataResult;
      setDiagnostics(result.diagnostics);
      onStatusChange(`Pruned ${result.prunedCount} stale entries from the active save.`);
    } catch (error) {
      logger.error('Failed to prune stale data:', error);
      onStatusChange('Failed to prune stale data.');
    } finally {
      setDiagnosticsBusy(null);
    }
  }, [activeManagedSaveId, onStatusChange, pruneStaleData]);

  return {
    diagnostics,
    diagnosticsBusy,
    handleArchiveOldSeasons,
    handlePruneStaleData,
    refreshDiagnostics,
  };
}
