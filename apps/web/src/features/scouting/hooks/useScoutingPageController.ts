import { useCallback, useEffect, useMemo, useState } from 'react';
import { TEAMS } from '@mbd/sim-core';
import { logger } from '@/shared/lib/logger';
import { formatScoutingMoney } from '../components/InternationalScoutingPanel';
import type { ScoutReportView } from '../components/ProScoutingPanel';
import type { ScoutView } from '../components/ScoutingDepartmentPanel';
import type { ScoutingOwnerStateView } from '../components/ScoutingFrontOfficeContextPanel';
import type { ScoutingView } from '../components/ScoutingViewTabs';
import type { ScoutingPageContentProps } from '../components/ScoutingPageContent';
import type { IFAPoolView, IFAProspectView, IFAReportView, PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TeamChemistry } from '@mbd/contracts';

function formatMoney(value: number): string {
  return formatScoutingMoney(value);
}

function snapshotSaved(value: unknown): value is { saved: true } {
  return typeof value === 'object'
    && value !== null
    && 'saved' in value
    && (value as { saved?: unknown }).saved === true;
}

interface ScoutingPageWorker {
  getIFAPool: () => Promise<unknown>;
  getOwnerState: (teamId: string) => Promise<unknown>;
  getScoutingStaff: () => Promise<unknown>;
  getTeamChemistry: (teamId: string) => Promise<unknown>;
  isReady: boolean;
  scoutIFAPlayer: (playerId: string) => Promise<unknown>;
  scoutPlayerReport: (playerId: string) => Promise<unknown>;
  searchPlayers: (query: string, limit: number) => Promise<unknown>;
  signIFAPlayer: (playerId: string, bonusAmount: number) => Promise<unknown>;
  tradeIFAPoolSpace: (teamId: string, amount: number) => Promise<unknown>;
}

export interface UseScoutingPageControllerOptions {
  autosaveActiveGame: (options?: { season?: number }) => Promise<unknown>;
  isInitialized: boolean;
  season: number;
  userTeamId: string;
  worker: ScoutingPageWorker;
}

interface UseScoutingPageControllerResult {
  contentProps: ScoutingPageContentProps;
}

export function useScoutingPageController({
  autosaveActiveGame,
  isInitialized,
  season,
  userTeamId,
  worker,
}: UseScoutingPageControllerOptions): UseScoutingPageControllerResult {
  const workerReady = worker.isReady;
  const [activeView, setActiveView] = useState<ScoutingView>('international');
  const [scouts, setScouts] = useState<ScoutView[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerDTO[]>([]);
  const [scoutReport, setScoutReport] = useState<ScoutReportView | null>(null);
  const [recentReports, setRecentReports] = useState<ScoutReportView[]>([]);
  const [ifaPool, setIFAPool] = useState<IFAPoolView | null>(null);
  const [ifaReport, setIFAReport] = useState<IFAReportView | null>(null);
  const [ifaBonus, setIFABonus] = useState('');
  const [tradeTarget, setTradeTarget] = useState('bos');
  const [tradeAmount, setTradeAmount] = useState('0.50');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [chemistry, setChemistry] = useState<TeamChemistry | null>(null);
  const [ownerState, setOwnerState] = useState<ScoutingOwnerStateView | null>(null);
  const [loading, setLoading] = useState(false);
  const [ifaLoading, setIFALoading] = useState(false);

  const refreshIFAPool = useCallback(async () => {
    if (!workerReady || !isInitialized) return;
    try {
      const pool = await worker.getIFAPool();
      if (pool) {
        setIFAPool(pool as IFAPoolView);
      }
    } catch (err) {
      logger.error('Failed to fetch IFA pool:', err);
    }
  }, [isInitialized, worker, workerReady]);

  useEffect(() => {
    if (!isInitialized || !workerReady) return;
    (async () => {
      try {
        const [staff, chemistryData, ownerData, pool] = await Promise.all([
          worker.getScoutingStaff(),
          worker.getTeamChemistry(userTeamId),
          worker.getOwnerState(userTeamId),
          worker.getIFAPool(),
        ]);
        if (Array.isArray(staff)) setScouts(staff as ScoutView[]);
        setChemistry((chemistryData ?? null) as TeamChemistry | null);
        setOwnerState((ownerData ?? null) as ScoutingOwnerStateView | null);
        setIFAPool((pool ?? null) as IFAPoolView | null);
      } catch (err) {
        logger.error('Failed to fetch scouting overview:', err);
      }
    })();
  }, [isInitialized, userTeamId, worker, workerReady]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !workerReady) return;
    try {
      const results = await worker.searchPlayers(searchQuery.trim(), 10);
      setSearchResults(results as PlayerDTO[]);
    } catch {
      setSearchResults([]);
    }
  }, [searchQuery, worker, workerReady]);

  const handleScout = useCallback(async (player: PlayerDTO) => {
    setScoutReport(null);
    setLoading(true);
    try {
      const report = await worker.scoutPlayerReport(player.id);
      if (report) {
        setScoutReport(report as ScoutReportView);
        setRecentReports((prev) => [report as ScoutReportView, ...prev].slice(0, 20));
      }
    } catch (err) {
      logger.error('Failed to scout player:', err);
    }
    setLoading(false);
  }, [worker]);

  const handleScoutIFA = useCallback(async (prospect: IFAProspectView) => {
    setActionMessage(null);
    setIFALoading(true);
    try {
      const result = await worker.scoutIFAPlayer(prospect.id) as
        | { success: true; report: IFAReportView }
        | { success: false; error: string };
      if (!result.success) {
        setActionMessage(result.error);
        return;
      }
      if (!snapshotSaved(await autosaveActiveGame({ season }))) {
        setActionMessage('That scouting report could not be saved.');
        return;
      }
      setIFAReport(result.report);
      setIFABonus(result.report.expectedBonus.toFixed(2));
      await refreshIFAPool();
    } catch (err) {
      logger.error('Failed to scout IFA player:', err);
      setActionMessage('Unable to scout that prospect right now.');
    } finally {
      setIFALoading(false);
    }
  }, [autosaveActiveGame, refreshIFAPool, season, worker]);

  const handleSignIFA = useCallback(async () => {
    if (!ifaReport) return;
    setActionMessage(null);
    setIFALoading(true);
    try {
      const bonusAmount = Number.parseFloat(ifaBonus);
      const result = await worker.signIFAPlayer(ifaReport.playerId, bonusAmount) as
        | { success: true; remainingBudget: number }
        | { success: false; error: string };
      if (!result.success) {
        setActionMessage(result.error);
        return;
      }
      if (!snapshotSaved(await autosaveActiveGame({ season }))) {
        setActionMessage('That international signing could not be saved.');
        return;
      }
      setActionMessage(`Signed ${ifaReport.playerName}. Remaining pool: ${formatMoney(result.remainingBudget)}.`);
      await refreshIFAPool();
      setIFAReport(null);
    } catch (err) {
      logger.error('Failed to sign IFA player:', err);
      setActionMessage('Unable to finalize that signing.');
    } finally {
      setIFALoading(false);
    }
  }, [autosaveActiveGame, ifaBonus, ifaReport, refreshIFAPool, season, worker]);

  const handleTradeIFAPool = useCallback(async () => {
    setActionMessage(null);
    setIFALoading(true);
    try {
      const amount = Number.parseFloat(tradeAmount);
      const result = await worker.tradeIFAPoolSpace(tradeTarget, amount) as
        | { success: true; remainingBudget: number }
        | { success: false; error: string };
      if (!result.success) {
        setActionMessage(result.error);
        return;
      }
      if (!snapshotSaved(await autosaveActiveGame({ season }))) {
        setActionMessage('That pool-space transfer could not be saved.');
        return;
      }
      setActionMessage(`Transferred ${formatMoney(amount)} of pool space. Remaining pool: ${formatMoney(result.remainingBudget)}.`);
      await refreshIFAPool();
    } catch (err) {
      logger.error('Failed to trade IFA pool space:', err);
      setActionMessage('Unable to move pool space right now.');
    } finally {
      setIFALoading(false);
    }
  }, [autosaveActiveGame, refreshIFAPool, season, tradeAmount, tradeTarget, worker]);

  const handleScoutPlayerSelection = useCallback((player: PlayerDTO) => {
    const scoutPromise = handleScout(player);
    setSearchResults([]);
    return scoutPromise;
  }, [handleScout]);

  const tradeTargets = useMemo(
    () => TEAMS.filter((team) => team.id !== userTeamId),
    [userTeamId],
  );

  return {
    contentProps: {
      actionMessage,
      activeView,
      chemistry,
      ifaBonus,
      ifaLoading,
      ifaPool,
      ifaReport,
      loading,
      onChangeIFABonus: setIFABonus,
      onChangeSearchQuery: setSearchQuery,
      onChangeTradeAmount: setTradeAmount,
      onChangeTradeTarget: setTradeTarget,
      onChangeView: setActiveView,
      onScoutPlayer: handleScoutPlayerSelection,
      onScoutProspect: handleScoutIFA,
      onSearch: handleSearch,
      onSignProspect: handleSignIFA,
      onTradePoolSpace: handleTradeIFAPool,
      ownerState,
      recentReports,
      scoutReport,
      scouts,
      searchQuery,
      searchResults,
      tradeAmount,
      tradeTarget,
      tradeTargets,
    },
  };
}
