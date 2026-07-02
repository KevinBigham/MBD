import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardStatKey } from '@mbd/sim-core';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

interface UseLeagueLeadersRouteDataOptions {
  day: number;
  getLeagueLeaders: (stat: LeaderboardStatKey, limit?: number) => Promise<PlayerDTO[] | null | undefined>;
  isInitialized: boolean;
  phase: string;
  season: number;
  workerReady: boolean;
}

export function useLeagueLeadersRouteData({
  day,
  getLeagueLeaders,
  isInitialized,
  phase,
  season,
  workerReady,
}: UseLeagueLeadersRouteDataOptions) {
  const [activeCat, setActiveCat] = useState<LeaderboardStatKey>('war');
  const [leaders, setLeaders] = useState<PlayerDTO[]>([]);

  const fetchLeaders = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const data = await getLeagueLeaders(activeCat, 20);
    setLeaders(data ?? []);
  }, [activeCat, getLeagueLeaders, isInitialized, workerReady]);

  useEffect(() => {
    void fetchLeaders();
  }, [day, fetchLeaders, phase, season]);

  return {
    activeCat,
    leaders,
    setActiveCat,
  };
}
