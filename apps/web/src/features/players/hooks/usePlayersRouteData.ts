import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

const PLAYER_SEARCH_DEBOUNCE_MS = 200;

interface UsePlayersRouteDataOptions {
  getLeagueLeaders: (stat: 'hr', limit: number) => Promise<unknown[] | null | undefined>;
  isInitialized: boolean;
  searchPlayers: (query: string, limit: number) => Promise<unknown[] | null | undefined>;
  workerReady: boolean;
}

export function usePlayersRouteData({
  getLeagueLeaders,
  isInitialized,
  searchPlayers,
  workerReady,
}: UsePlayersRouteDataOptions) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerDTO[]>([]);
  const [defaultPlayers, setDefaultPlayers] = useState<PlayerDTO[]>([]);

  const fetchDefaults = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const leaders = await getLeagueLeaders('hr', 50);
    setDefaultPlayers((leaders ?? []) as PlayerDTO[]);
  }, [getLeagueLeaders, isInitialized, workerReady]);

  useEffect(() => {
    void fetchDefaults();
  }, [fetchDefaults]);

  useEffect(() => {
    if (!query || !workerReady) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const found = await searchPlayers(query, 30);
      setResults((found ?? []) as PlayerDTO[]);
    }, PLAYER_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, searchPlayers, workerReady]);

  const players = useMemo(
    () => (query ? results : defaultPlayers),
    [defaultPlayers, query, results],
  );

  return {
    players,
    query,
    setQuery,
  };
}
