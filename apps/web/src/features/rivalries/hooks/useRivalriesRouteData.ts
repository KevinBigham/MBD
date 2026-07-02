import { useCallback, useEffect, useState } from 'react';
import type { Rivalry } from '@mbd/contracts';

interface UseRivalriesRouteDataOptions {
  day: number;
  getRivalries: () => Promise<unknown[] | null | undefined>;
  isInitialized: boolean;
  phase: string;
  season: number;
  workerReady: boolean;
}

export function useRivalriesRouteData({
  day,
  getRivalries,
  isInitialized,
  phase,
  season,
  workerReady,
}: UseRivalriesRouteDataOptions) {
  const [rivalries, setRivalries] = useState<Rivalry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    const data = await getRivalries();
    setRivalries((data ?? []) as Rivalry[]);
    setLoading(false);
  }, [getRivalries, isInitialized, workerReady]);

  useEffect(() => {
    void fetchData();
  }, [day, fetchData, phase, season]);

  return { loading, rivalries };
}
