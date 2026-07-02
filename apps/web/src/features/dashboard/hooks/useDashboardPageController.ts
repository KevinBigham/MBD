import { useMemo } from 'react';
import type { GameState } from '@/shared/hooks/useGameStore';
import type { useWorker } from '@/shared/hooks/useWorker';
import type { DashboardPageContentProps } from '../components/DashboardPageContent';
import { useDashboardActionHandlers } from './useDashboardActionHandlers';
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
  | 'simDay'
  | 'simMonth'
  | 'simWeek'
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
      onSimDay: () => void handleSim('day', () => worker.simDay()),
      onSimMonth: () => void handleSim('month', () => worker.simMonth()),
      onSimWeek: () => void handleSim('week', () => worker.simWeek()),
      phase,
      playByPlayLoading,
      recentRecaps,
      season,
      seasonRecap,
      selectedGameDetail,
      selectedGameIndex,
      showOpeningDayChecklist,
      simAction,
      summary,
      userTeamId,
    },
    pageShellLoading: loading && summary == null,
  };
}
