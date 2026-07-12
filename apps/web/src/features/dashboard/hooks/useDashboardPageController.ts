import { useMemo } from 'react';
import type { GameState } from '@/shared/hooks/useGameStore';
import type { useWorker } from '@/shared/hooks/useWorker';
import { useSimAdvanceExecutor } from '@/shared/hooks/useSimAdvanceExecutor';
import type { DashboardPageContentProps } from '../components/DashboardPageContent';
import { useDashboardActionHandlers } from './useDashboardActionHandlers';
import { DASHBOARD_QUICK_SIM_COMMANDS } from './useDashboardActionHandlers';
import { useDashboardGuidedStart } from './useDashboardGuidedStart';
import { useDashboardRouteData } from './useDashboardRouteData';
import {
  buildAttentionItems,
  getDashboardScheduleFlags,
  shouldShowOpeningDayChecklist,
} from '../lib/dashboardPageTransforms';

export type DashboardPageControllerWorker = Pick<
  ReturnType<typeof useWorker>,
  | 'applyForJob'
  | 'dismissWelcomeBriefing'
  | 'exportSnapshot'
  | 'getDashboardSummary'
  | 'getGamePlayByPlay'
  | 'getGMCareer'
  | 'getJobMarket'
  | 'getOffseasonHeadline'
  | 'getRecentGameRecaps'
  | 'getScheduleView'
  | 'getSeasonRecap'
  | 'isReady'
  | 'simAdvance'
  | 'simLegacyAdvance'
>;

export type DashboardPageControllerGameState = Pick<
  GameState,
  | 'activeSaveId'
  | 'activeSaveSlot'
  | 'day'
  | 'gmName'
  | 'initializeGame'
  | 'isInitialized'
  | 'phase'
  | 'playerCount'
  | 'season'
  | 'teamName'
  | 'updateFromSim'
  | 'userTeamId'
>;

export interface UseDashboardPageControllerOptions {
  autosaveActiveGame: (context: { season: number }) => Promise<unknown>;
  game: DashboardPageControllerGameState;
  worker: DashboardPageControllerWorker;
}

interface UseDashboardPageControllerResult {
  contentProps: DashboardPageContentProps;
  pageShellLoading: boolean;
}

function regularSimAction(status: ReturnType<typeof useSimAdvanceExecutor>['status']) {
  if (!('operation' in status)) return null;
  switch (status.operation) {
    case 'sim_day': return 'day' as const;
    case 'sim_week': return 'week' as const;
    case 'sim_month': return 'month' as const;
    default: return null;
  }
}

export function useDashboardPageController({
  autosaveActiveGame,
  game,
  worker,
}: UseDashboardPageControllerOptions): UseDashboardPageControllerResult {
  const {
    activeSaveId,
    activeSaveSlot,
    day,
    gmName,
    initializeGame,
    isInitialized,
    phase,
    playerCount,
    season,
    teamName,
    updateFromSim,
    userTeamId,
  } = game;

  const {
    career,
    fetchDashboardData,
    jobMarket,
    loading,
    offseasonHeadline,
    playByPlayLoading,
    recentRecaps,
    scheduleEntries,
    seasonRecap,
    selectedGameDetail,
    selectedGameIndex,
    setSelectedGameIndex,
    summary,
  } = useDashboardRouteData({
    day,
    getDashboardSummary: worker.getDashboardSummary,
    getGamePlayByPlay: worker.getGamePlayByPlay,
    getGMCareer: worker.getGMCareer,
    getJobMarket: worker.getJobMarket,
    getOffseasonHeadline: worker.getOffseasonHeadline,
    getRecentGameRecaps: worker.getRecentGameRecaps,
    getScheduleView: typeof worker.getScheduleView === 'function' ? worker.getScheduleView : undefined,
    getSeasonRecap: worker.getSeasonRecap,
    isInitialized,
    phase,
    season,
    workerReady: worker.isReady,
  });

  const regularAdvance = useSimAdvanceExecutor({
    worker: worker.simAdvance,
    workerReady: worker.isReady,
    refreshAfterDurable: async (result) => {
      await fetchDashboardData({
        throwOnError: true,
        context: {
          season: (result as { season?: number }).season ?? season,
          phase: (result as { phase?: string }).phase ?? phase,
        },
      });
    },
  });

  const {
    applyingTeamId,
    handleApplyForJob,
    handleDismissWelcomeBriefing,
    handleSim,
    simAction,
  } = useDashboardActionHandlers({
    activeSaveId,
    activeSaveSlot,
    applyForJob: worker.applyForJob,
    autosaveActiveGame,
    day,
    dismissWelcomeBriefing: worker.dismissWelcomeBriefing,
    executeRegularSim: regularAdvance.execute,
    executeLegacySim: worker.simLegacyAdvance,
    fetchDashboardData,
    initializeGame,
    phase,
    playerCount,
    season,
    summary,
    updateFromSim,
  });

  const scheduleLoaded = scheduleEntries != null;
  const scheduleFlags = useMemo(
    () => getDashboardScheduleFlags(scheduleEntries, day),
    [day, scheduleEntries],
  );
  const {
    completedUserGames,
    hasCurrentDayGame,
    hasPriorScheduledGame,
    hasFutureScheduledGame,
  } = scheduleFlags;
  const attentionItems = useMemo(
    () => buildAttentionItems(summary, phase, completedUserGames, hasCurrentDayGame),
    [completedUserGames, hasCurrentDayGame, phase, summary],
  );
  const showOpeningDayChecklist = shouldShowOpeningDayChecklist(summary, phase, completedUserGames);
  const {
    currentDashboardNudge,
    dismissDashboardNudge,
    handleExportGuidedStartBackup,
  } = useDashboardGuidedStart({
    activeSaveId,
    activeSaveSlot,
    completedUserGames,
    day,
    exportSnapshot: worker.exportSnapshot,
    gmName,
    hasCurrentDayGame,
    hasFutureScheduledGame,
    hasPriorScheduledGame,
    isInitialized,
    phase,
    scheduleLoaded,
    season,
    teamName,
  });

  return {
    contentProps: {
      applyingTeamId,
      attentionItems,
      career,
      currentDashboardNudge,
      jobMarket,
      offseasonHeadline,
      onApplyForJob: (teamId) => {
        void handleApplyForJob(teamId);
      },
      onDismissDashboardNudge: dismissDashboardNudge,
      onDismissWelcomeBriefing: () => {
        void handleDismissWelcomeBriefing();
      },
      onExportGuidedStartBackup: handleExportGuidedStartBackup,
      onSelectGame: setSelectedGameIndex,
      onSimDay: () => void handleSim(DASHBOARD_QUICK_SIM_COMMANDS.day),
      onSimMonth: () => void handleSim(DASHBOARD_QUICK_SIM_COMMANDS.month),
      onSimWeek: () => void handleSim(DASHBOARD_QUICK_SIM_COMMANDS.week),
      phase,
      playByPlayLoading,
      recentRecaps,
      season,
      seasonRecap,
      selectedGameDetail,
      selectedGameIndex,
      showOpeningDayChecklist,
      simAction: regularAdvance.status.kind === 'idle'
        ? simAction
        : (regularSimAction(regularAdvance.status) ?? simAction),
      simBusy: regularAdvance.status.kind !== 'idle' || simAction !== null,
      summary,
      userTeamId,
    },
    pageShellLoading: loading && summary == null,
  };
}
