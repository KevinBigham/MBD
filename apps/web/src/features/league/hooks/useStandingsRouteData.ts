import { useCallback, useEffect, useState } from 'react';
import type { TeamStandingsDTO } from '@/workers/sim.worker.helpers';

interface UseStandingsRouteDataOptions {
  day: number;
  getStandings: () => Promise<{ divisions: Record<string, TeamStandingsDTO[]> } | null | undefined>;
  isInitialized: boolean;
  phase: string;
  season: number;
  workerReady: boolean;
}

export function useStandingsRouteData({
  day,
  getStandings,
  isInitialized,
  phase,
  season,
  workerReady,
}: UseStandingsRouteDataOptions) {
  const [standings, setStandings] = useState<Record<string, TeamStandingsDTO[]>>({});

  const fetchStandings = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const data = await getStandings();
    setStandings(data?.divisions ?? {});
  }, [getStandings, isInitialized, workerReady]);

  useEffect(() => {
    void fetchStandings();
  }, [day, fetchStandings, phase, season]);

  return {
    standings,
  };
}
