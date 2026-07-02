import { useCallback, useEffect, useState } from 'react';

export interface LeagueContextView {
  leagueWoba: number;
  leagueOps: number;
  leagueEra: number;
  leagueFip: number;
  runsPerWin: number;
}

interface UseStatsEncyclopediaRouteDataOptions {
  day: number;
  getPerformanceDiagnostics: () => Promise<unknown>;
  isInitialized: boolean;
  phase: string;
  season: number;
  workerReady: boolean;
}

export function useStatsEncyclopediaRouteData({
  day,
  getPerformanceDiagnostics,
  isInitialized,
  phase,
  season,
  workerReady,
}: UseStatsEncyclopediaRouteDataOptions) {
  const [leagueContext, setLeagueContext] = useState<LeagueContextView | null>(null);

  const fetchContext = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    try {
      const diagnostics = await getPerformanceDiagnostics();
      if (diagnostics && typeof diagnostics === 'object' && 'leagueContext' in diagnostics) {
        setLeagueContext(diagnostics.leagueContext as LeagueContextView);
      }
    } catch {
      // League context is an optional reference aid; leave the encyclopedia usable if unavailable.
    }
  }, [getPerformanceDiagnostics, isInitialized, workerReady]);

  useEffect(() => {
    void fetchContext();
  }, [day, fetchContext, phase, season]);

  return {
    leagueContext,
  };
}
