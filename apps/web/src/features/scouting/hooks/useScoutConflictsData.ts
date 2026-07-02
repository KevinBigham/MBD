import { useCallback, useEffect, useState } from 'react';

export interface ScoutOpinion {
  source: string;
  overallGrade: number;
  ceiling: number;
  floor: number;
  confidence: number;
  summary: string;
}

export interface ScoutConflict {
  prospectId: string;
  headline: string;
  opinions: ScoutOpinion[];
  divergence: number;
  resolved: boolean;
  resolution: {
    season: number;
    actualGrade: number;
    closestSource: string;
  } | null;
  winningSource: string | null;
  outcomeSummary: string | null;
}

interface UseScoutConflictsDataOptions {
  day: number;
  getScoutConflicts: () => Promise<unknown>;
  isInitialized: boolean;
  phase: string;
  season: number;
  workerReady: boolean;
}

interface UseScoutConflictsDataResult {
  conflicts: ScoutConflict[];
  loading: boolean;
}

export function useScoutConflictsData({
  day,
  getScoutConflicts,
  isInitialized,
  phase,
  season,
  workerReady,
}: UseScoutConflictsDataOptions): UseScoutConflictsDataResult {
  const [conflicts, setConflicts] = useState<ScoutConflict[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    const data = await getScoutConflicts();
    setConflicts((data ?? []) as ScoutConflict[]);
    setLoading(false);
  }, [getScoutConflicts, isInitialized, workerReady]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, season, day, phase]);

  return { conflicts, loading };
}
