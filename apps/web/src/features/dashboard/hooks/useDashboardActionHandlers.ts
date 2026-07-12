import { useCallback, useRef, useState } from 'react';
import type { GameState } from '@/shared/hooks/useGameStore';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { isSimAdvanceCoordinatorBusy } from '@/shared/hooks/useSimAdvanceExecutor';
import type { SimAdvanceCoordinatorOutcome } from '@/shared/lib/simAdvanceCoordinator';
import type { SimAdvanceOperation } from '@/shared/lib/saveSystem';
import { logger } from '@/shared/lib/logger';
import {
  quickActionLabel,
  type DashboardSummary,
  type SimAction,
} from '../lib/dashboardPageTransforms';

interface ApplyForJobResult {
  success?: boolean;
  teamId?: string;
  teamName?: string;
}
export type LegacyDashboardOperation = 'simDay' | 'simWeek' | 'simMonth';
export type LegacyDashboardPhase = 'playoffs' | 'offseason';
export interface LegacyDashboardResult { season: number; day: number; phase: string; gamesPlayed?: number; success?: boolean; }
export interface DashboardQuickSimCommand { action: Exclude<SimAction, null>; journal: SimAdvanceOperation; legacy: LegacyDashboardOperation; }
export const DASHBOARD_QUICK_SIM_COMMANDS = {
  day: { action: 'day', journal: 'sim_day', legacy: 'simDay' },
  week: { action: 'week', journal: 'sim_week', legacy: 'simWeek' },
  month: { action: 'month', journal: 'sim_month', legacy: 'simMonth' },
} as const satisfies Record<'day' | 'week' | 'month', DashboardQuickSimCommand>;

function snapshotSaved(value: unknown): value is { saved: true } {
  return typeof value === 'object'
    && value !== null
    && 'saved' in value
    && (value as { saved?: unknown }).saved === true;
}

interface UseDashboardActionHandlersOptions {
  activeSaveId: string | null;
  activeSaveSlot: number | null;
  applyForJob: (teamId: string) => Promise<ApplyForJobResult | null | undefined>;
  autosaveActiveGame: (context: { season: number }) => Promise<unknown>;
  day: number;
  dismissWelcomeBriefing: () => Promise<{ success?: boolean; flowStateChanged?: boolean }>;
  executeRegularSim: (operation: SimAdvanceOperation) => Promise<SimAdvanceCoordinatorOutcome>;
  executeLegacySim: (operation: LegacyDashboardOperation, expectedPhase: LegacyDashboardPhase) => Promise<LegacyDashboardResult>;
  fetchDashboardData: (options?: { throwOnError?: boolean; context?: { season: number; phase: string } }) => Promise<void>;
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
  executeRegularSim,
  executeLegacySim,
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
  const simInFlight = useRef(false);

  const handleApplyForJob = useCallback(async (teamId: string) => {
    if (isSimAdvanceCoordinatorBusy()) return;
    const capturedSaveId = activeSaveId;
    if (!capturedSaveId) return;
    setApplyingTeamId(teamId);
    try {
      const result = await applyForJob(teamId);
      const afterApply = useGameStore.getState().activeSaveId;
      if (isSimAdvanceCoordinatorBusy() || afterApply !== capturedSaveId) return;
      if (result?.success) {
        const persisted = await autosaveActiveGame({ season });
        if (!snapshotSaved(persisted)) return;
        const afterPersistence = useGameStore.getState().activeSaveId;
        if (isSimAdvanceCoordinatorBusy() || afterPersistence !== capturedSaveId) return;
        initializeGame({
          season,
          day,
          phase,
          playerCount,
          userTeamId: result.teamId ?? teamId,
          teamName: result.teamName ?? summary?.franchise.teamName ?? 'Franchise',
          gmName: summary?.franchise.gmName ?? 'General Manager',
          difficulty: summary?.franchise.difficulty ?? 'standard',
          activeSaveId: capturedSaveId,
          activeSaveSlot,
        });
        await fetchDashboardData();
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

  const handleSim = useCallback(async (command: DashboardQuickSimCommand) => {
    const action = command.action;
    const capturedSaveId = activeSaveId;
    const capturedPhase = phase;
    const live = useGameStore.getState();
    if (simInFlight.current || !capturedSaveId || live.activeSaveId !== capturedSaveId || live.phase !== capturedPhase || !live.isInitialized || isSimAdvanceCoordinatorBusy()) return;
    simInFlight.current = true;
    setSimAction(action);
    try {
      if (capturedPhase === 'preseason' || capturedPhase === 'regular') {
        const outcome = await executeRegularSim(command.journal);
        if (outcome.kind === 'blocked') return;
      } else if (capturedPhase === 'playoffs' || capturedPhase === 'offseason') {
        const result = await executeLegacySim(command.legacy, capturedPhase);
        const afterRpc = useGameStore.getState();
        if (result.success === false || isSimAdvanceCoordinatorBusy() || afterRpc.activeSaveId !== capturedSaveId || afterRpc.phase !== capturedPhase || !afterRpc.isInitialized) return;
        const persisted = await autosaveActiveGame({ season: result.season });
        if (!snapshotSaved(persisted)) return;
        const afterPersistence = useGameStore.getState();
        if (isSimAdvanceCoordinatorBusy() || afterPersistence.activeSaveId !== capturedSaveId || afterPersistence.phase !== capturedPhase || !afterPersistence.isInitialized) return;
        updateFromSim(result);
        await fetchDashboardData();
      } else return;
    } catch (error) {
      logger.error(`Failed to ${quickActionLabel(action).toLowerCase()}:`, error);
    } finally {
      setSimAction(null);
      simInFlight.current = false;
    }
  }, [activeSaveId, autosaveActiveGame, executeLegacySim, executeRegularSim, fetchDashboardData, phase, updateFromSim]);

  const handleDismissWelcomeBriefing = useCallback(async () => {
    if (isSimAdvanceCoordinatorBusy()) return;
    const capturedSaveId = activeSaveId;
    if (!capturedSaveId) return;
    const result = await dismissWelcomeBriefing();
    const liveSaveId = useGameStore.getState().activeSaveId;
    if (isSimAdvanceCoordinatorBusy() || liveSaveId !== capturedSaveId) return;
    if (result.flowStateChanged === false) return;
    const persisted = await autosaveActiveGame({ season });
    if (!snapshotSaved(persisted)) return;
    if (isSimAdvanceCoordinatorBusy() || useGameStore.getState().activeSaveId !== capturedSaveId) return;
    await fetchDashboardData();
  }, [activeSaveId, autosaveActiveGame, dismissWelcomeBriefing, fetchDashboardData, season]);

  return {
    applyingTeamId,
    handleApplyForJob,
    handleDismissWelcomeBriefing,
    handleSim,
    simAction,
  };
}
