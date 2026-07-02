import { useCallback, useState } from 'react';
import type { GameState } from '@/shared/hooks/useGameStore';
import { logger } from '@/shared/lib/logger';
import {
  quickActionLabel,
  type DashboardSummary,
  type SimAction,
} from '../lib/dashboardPageTransforms';

type SimResult = Parameters<GameState['updateFromSim']>[0];

interface ApplyForJobResult {
  success?: boolean;
  teamId?: string;
  teamName?: string;
}

interface UseDashboardActionHandlersOptions {
  activeSaveId: string | null;
  activeSaveSlot: number | null;
  applyForJob: (teamId: string) => Promise<ApplyForJobResult | null | undefined>;
  autosaveActiveGame: (context: { season: number }) => Promise<unknown>;
  day: number;
  dismissWelcomeBriefing: () => Promise<unknown>;
  fetchDashboardData: () => Promise<void>;
  initializeGame: GameState['initializeGame'];
  phase: string;
  playerCount: number;
  season: number;
  summary: DashboardSummary | null;
  updateFromSim: GameState['updateFromSim'];
}

export function useDashboardActionHandlers({
  activeSaveId,
  activeSaveSlot,
  applyForJob,
  autosaveActiveGame,
  day,
  dismissWelcomeBriefing,
  fetchDashboardData,
  initializeGame,
  phase,
  playerCount,
  season,
  summary,
  updateFromSim,
}: UseDashboardActionHandlersOptions) {
  const [applyingTeamId, setApplyingTeamId] = useState<string | null>(null);
  const [simAction, setSimAction] = useState<SimAction>(null);

  const handleApplyForJob = useCallback(async (teamId: string) => {
    setApplyingTeamId(teamId);
    try {
      const result = await applyForJob(teamId);
      if (result?.success) {
        initializeGame({
          season,
          day,
          phase,
          playerCount,
          userTeamId: result.teamId ?? teamId,
          teamName: result.teamName ?? summary?.franchise.teamName ?? 'Franchise',
          gmName: summary?.franchise.gmName ?? 'General Manager',
          difficulty: summary?.franchise.difficulty ?? 'standard',
          activeSaveId,
          activeSaveSlot,
        });
        await fetchDashboardData();
        await autosaveActiveGame({ season });
      }
    } catch (error) {
      logger.error('Failed to apply for job:', error);
    } finally {
      setApplyingTeamId(null);
    }
  }, [
    activeSaveId,
    activeSaveSlot,
    applyForJob,
    autosaveActiveGame,
    day,
    fetchDashboardData,
    initializeGame,
    phase,
    playerCount,
    season,
    summary,
  ]);

  const handleSim = useCallback(async (
    action: Exclude<SimAction, null>,
    run: () => Promise<SimResult>,
  ) => {
    setSimAction(action);
    try {
      const result = await run();
      updateFromSim(result);
      await fetchDashboardData();
      await autosaveActiveGame({ season: result.season });
    } catch (error) {
      logger.error(`Failed to ${quickActionLabel(action).toLowerCase()}:`, error);
    } finally {
      setSimAction(null);
    }
  }, [autosaveActiveGame, fetchDashboardData, updateFromSim]);

  const handleDismissWelcomeBriefing = useCallback(async () => {
    await dismissWelcomeBriefing();
    await fetchDashboardData();
    await autosaveActiveGame({ season });
  }, [autosaveActiveGame, dismissWelcomeBriefing, fetchDashboardData, season]);

  return {
    applyingTeamId,
    handleApplyForJob,
    handleDismissWelcomeBriefing,
    handleSim,
    simAction,
  };
}
