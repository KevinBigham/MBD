import { useCallback, useEffect, useState } from 'react';
import type {
  AchievementCategoryFilter,
  AchievementView,
} from '../components/AchievementsContentPanel';

export interface CeremonyScript {
  season: number;
  awards: Array<{
    awardId: string;
    awardName: string;
    winnerId: string;
    winnerName: string;
    headline: string;
    votingSummary: string;
    historicalContext: string;
    reactionQuote: string;
    runnerUpNames: string[];
  }>;
  openingRemarks: string;
  closingRemarks: string;
}

interface UseAchievementsRouteDataOptions {
  day: number;
  getAchievements: () => Promise<unknown[] | null | undefined>;
  getAwardCeremony: () => Promise<CeremonyScript | null | undefined>;
  isInitialized: boolean;
  phase: string;
  season: number;
  workerReady: boolean;
}

export function useAchievementsRouteData({
  day,
  getAchievements,
  getAwardCeremony,
  isInitialized,
  phase,
  season,
  workerReady,
}: UseAchievementsRouteDataOptions) {
  const [achievements, setAchievements] = useState<AchievementView[]>([]);
  const [filter, setFilter] = useState<AchievementCategoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [ceremony, setCeremony] = useState<CeremonyScript | null>(null);
  const [ceremonyLoading, setCeremonyLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    const data = await getAchievements();
    setAchievements((data ?? []) as AchievementView[]);
    setLoading(false);
  }, [getAchievements, isInitialized, workerReady]);

  const openCeremony = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setCeremonyLoading(true);
    const script = await getAwardCeremony();
    if (script) {
      setCeremony(script);
    }
    setCeremonyLoading(false);
  }, [getAwardCeremony, isInitialized, workerReady]);

  const closeCeremony = useCallback(() => {
    setCeremony(null);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [day, fetchData, phase, season]);

  return {
    achievements,
    ceremony,
    ceremonyLoading,
    closeCeremony,
    filter,
    loading,
    openCeremony,
    setFilter,
  };
}
