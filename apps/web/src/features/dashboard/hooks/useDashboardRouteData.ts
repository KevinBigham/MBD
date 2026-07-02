import { useCallback, useEffect, useState } from 'react';
import type { GamePlayByPlayView, GameRecapView } from '../components/gameDayBroadcast';
import type { DashboardSummary, ScheduleGameEntry } from '../lib/dashboardPageTransforms';
import type { SeasonRecapView, OffseasonHeadlineView } from '@/workers/sim.worker.seasonNarrative';
import { logger } from '@/shared/lib/logger';

export interface GMCareerView {
  currentTeamId: string;
  reputation: number;
  overallRecord: { wins: number; losses: number };
  careerHistory: Array<{ teamId: string; firedSeason: number | null }>;
  jobSearchActive: boolean;
  lastFiredReason: string | null;
}

export interface JobMarketView {
  availableJobs: Array<{
    teamId: string;
    budget: string;
    expectations: string;
    difficulty: string;
    attractiveness: number;
  }>;
}

interface UseDashboardRouteDataOptions {
  day: number;
  getDashboardSummary: () => Promise<unknown>;
  getGamePlayByPlay: (gameIndex: number) => Promise<unknown>;
  getGMCareer: () => Promise<unknown>;
  getJobMarket: () => Promise<unknown>;
  getOffseasonHeadline: (season?: number) => Promise<unknown>;
  getRecentGameRecaps: (limit: number) => Promise<unknown>;
  getScheduleView?: () => Promise<unknown>;
  getSeasonRecap: (season?: number) => Promise<unknown>;
  isInitialized: boolean;
  phase: string;
  season: number;
  workerReady: boolean;
}

interface UseDashboardRouteDataResult {
  career: GMCareerView | null;
  fetchDashboardData: () => Promise<void>;
  jobMarket: JobMarketView | null;
  loading: boolean;
  offseasonHeadline: OffseasonHeadlineView | null;
  playByPlayLoading: boolean;
  recentRecaps: GameRecapView[];
  scheduleEntries: ScheduleGameEntry[] | null;
  seasonRecap: SeasonRecapView | null;
  selectedGameDetail: GamePlayByPlayView | null;
  selectedGameIndex: number | null;
  setSelectedGameIndex: (gameIndex: number | null) => void;
  summary: DashboardSummary | null;
}

export function useDashboardRouteData({
  day,
  getDashboardSummary,
  getGamePlayByPlay,
  getGMCareer,
  getJobMarket,
  getOffseasonHeadline,
  getRecentGameRecaps,
  getScheduleView,
  getSeasonRecap,
  isInitialized,
  phase,
  season,
  workerReady,
}: UseDashboardRouteDataOptions): UseDashboardRouteDataResult {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [career, setCareer] = useState<GMCareerView | null>(null);
  const [jobMarket, setJobMarket] = useState<JobMarketView | null>(null);
  const [seasonRecap, setSeasonRecap] = useState<SeasonRecapView | null>(null);
  const [offseasonHeadline, setOffseasonHeadline] = useState<OffseasonHeadlineView | null>(null);
  const [recentRecaps, setRecentRecaps] = useState<GameRecapView[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleGameEntry[] | null>(null);
  const [selectedGameIndex, setSelectedGameIndex] = useState<number | null>(null);
  const [selectedGameDetail, setSelectedGameDetail] = useState<GamePlayByPlayView | null>(null);
  const [playByPlayLoading, setPlayByPlayLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    try {
      const [nextSummary, nextCareer, nextJobMarket, nextRecaps, nextSeasonRecap, nextOffseasonHeadline, nextSchedule] = await Promise.all([
        getDashboardSummary(),
        getGMCareer(),
        getJobMarket(),
        getRecentGameRecaps(3),
        phase === 'offseason' ? getSeasonRecap(season) : Promise.resolve(null),
        phase === 'offseason' ? getOffseasonHeadline(season) : Promise.resolve(null),
        getScheduleView?.() ?? Promise.resolve(null),
      ]);
      setSummary((nextSummary ?? null) as DashboardSummary | null);
      setCareer((nextCareer ?? null) as GMCareerView | null);
      setJobMarket((nextJobMarket ?? null) as JobMarketView | null);
      setSeasonRecap((nextSeasonRecap ?? null) as SeasonRecapView | null);
      setOffseasonHeadline((nextOffseasonHeadline ?? null) as OffseasonHeadlineView | null);
      setScheduleEntries((nextSchedule ?? null) as ScheduleGameEntry[] | null);

      const recapViews = (nextRecaps ?? []) as GameRecapView[];
      setRecentRecaps(recapViews);
      setSelectedGameIndex((currentValue) => {
        if (recapViews.length === 0) {
          return null;
        }
        if (currentValue != null && recapViews.some((recap) => recap.gameIndex === currentValue)) {
          return currentValue;
        }
        return recapViews[0]?.gameIndex ?? null;
      });
    } catch (error) {
      logger.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [
    getDashboardSummary,
    getGMCareer,
    getJobMarket,
    getOffseasonHeadline,
    getRecentGameRecaps,
    getScheduleView,
    getSeasonRecap,
    isInitialized,
    phase,
    season,
    workerReady,
  ]);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData, day, season, phase]);

  useEffect(() => {
    if (!isInitialized || !workerReady || selectedGameIndex == null) {
      setSelectedGameDetail(null);
      setPlayByPlayLoading(false);
      return;
    }

    let active = true;
    setPlayByPlayLoading(true);
    void getGamePlayByPlay(selectedGameIndex)
      .then((detail) => {
        if (!active) {
          return;
        }
        setSelectedGameDetail((detail ?? null) as GamePlayByPlayView | null);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        logger.error('Failed to fetch game play-by-play:', error);
        setSelectedGameDetail(null);
      })
      .finally(() => {
        if (active) {
          setPlayByPlayLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [getGamePlayByPlay, isInitialized, selectedGameIndex, workerReady]);

  return {
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
  };
}
