import { useCallback, useEffect, useMemo } from 'react';
import type { GameSnapshot } from '@mbd/contracts';
import { useNudges } from '@/features/onboarding/nudges';
import { exportSnapshotToJson } from '@/shared/lib/saveSystem';
import { isSimAdvanceCoordinatorBusy } from '@/shared/hooks/useSimAdvanceExecutor';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { logger } from '@/shared/lib/logger';
import {
  buildDashboardNudgeTriggers,
  shouldAutoSkipFirstSeriesPointerNudge,
} from '../lib/dashboardPageTransforms';

interface UseDashboardGuidedStartOptions {
  activeSaveId: string | null;
  activeSaveSlot?: number | null;
  completedUserGames: number;
  day: number;
  exportSnapshot: () => Promise<GameSnapshot>;
  gmName?: string | null;
  hasCurrentDayGame: boolean;
  hasFutureScheduledGame: boolean;
  hasPriorScheduledGame: boolean;
  isInitialized: boolean;
  phase: string;
  scheduleLoaded: boolean;
  season: number;
  teamName?: string | null;
}

export function useDashboardGuidedStart({
  activeSaveId,
  activeSaveSlot,
  completedUserGames,
  day,
  exportSnapshot,
  gmName,
  hasCurrentDayGame,
  hasFutureScheduledGame,
  hasPriorScheduledGame,
  isInitialized,
  phase,
  scheduleLoaded,
  season,
  teamName,
}: UseDashboardGuidedStartOptions) {
  const activeGuidedStartSaveId = activeSaveSlot != null ? `save-slot-${activeSaveSlot}` : activeSaveId;
  const dashboardNudgeTriggers = useMemo(
    () => buildDashboardNudgeTriggers({
      isInitialized,
      season,
      phase,
      scheduleLoaded,
      completedUserGames,
      hasCurrentDayGame,
      hasPriorScheduledGame,
      hasFutureScheduledGame,
    }),
    [
      completedUserGames,
      hasCurrentDayGame,
      hasFutureScheduledGame,
      hasPriorScheduledGame,
      isInitialized,
      phase,
      scheduleLoaded,
      season,
    ],
  );
  const {
    current: currentDashboardNudge,
    dismiss: dismissDashboardNudge,
    isSeen: isDashboardNudgeSeen,
    skip: skipDashboardNudge,
  } = useNudges({
    saveSlotId: activeGuidedStartSaveId,
    triggers: dashboardNudgeTriggers,
  });

  useEffect(() => {
    if (
      shouldAutoSkipFirstSeriesPointerNudge({
        isInitialized,
        season,
        phase,
        scheduleLoaded,
        completedUserGames,
      })
      && !isDashboardNudgeSeen('first_series_pointer')
    ) {
      skipDashboardNudge('first_series_pointer');
    }
  }, [
    completedUserGames,
    isDashboardNudgeSeen,
    isInitialized,
    phase,
    scheduleLoaded,
    season,
    skipDashboardNudge,
  ]);

  const handleExportGuidedStartBackup = useCallback(async () => {
    const capturedSaveId = activeSaveId;
    if (!capturedSaveId || isSimAdvanceCoordinatorBusy()) return false;
    let snapshot: GameSnapshot;
    try {
      snapshot = await exportSnapshot();
    } catch (error) {
      logger.error('Failed to export guided-start backup:', error);
      return false;
    }
    if (isSimAdvanceCoordinatorBusy() || useGameStore.getState().activeSaveId !== capturedSaveId) {
      return false;
    }
    const exportName = `${gmName ?? 'General Manager'} • ${teamName ?? 'Franchise'} • Season ${season} Day ${day}`;
    const payload = exportSnapshotToJson(exportName, snapshot);

    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return false;
    }

    const blob = new Blob([payload], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mbd-season-${season}-day-${day}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    return true;
  }, [activeSaveId, day, exportSnapshot, gmName, season, teamName]);

  return {
    currentDashboardNudge,
    dismissDashboardNudge,
    handleExportGuidedStartBackup,
  };
}
