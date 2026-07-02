import { useCallback, useEffect, useState } from 'react';

export interface ComparisonPlayerRef {
  id: string;
  name: string;
  position: string;
  age: number;
  teamId: string;
}

export interface AttributeComparison {
  attribute: string;
  label: string;
  playerAValue: number;
  playerBValue: number;
  advantage: 'playerA' | 'playerB' | 'even';
  differenceDisplay: number;
  significantGap: boolean;
}

export interface RankedAttribute {
  attribute: string;
  label: string;
  displayRating: number;
  letterGrade: string;
}

export interface StatComparison {
  statName: string;
  playerAValue: string;
  playerBValue: string;
  advantage: 'playerA' | 'playerB' | 'even';
}

export interface PlayerComparisonData {
  comparison: {
    attributeComparison: AttributeComparison[];
    overallAdvantage: 'playerA' | 'playerB' | 'even';
    advantageMargin: number;
    headToHeadSummary: string;
  };
  statComparison: StatComparison[];
  summary: string;
  rankedA: RankedAttribute[];
  rankedB: RankedAttribute[];
  playerA: ComparisonPlayerRef;
  playerB: ComparisonPlayerRef;
}

interface UsePlayerComparisonRouteDataOptions {
  getPlayerComparison: (playerIdA: string, playerIdB: string) => Promise<PlayerComparisonData | null>;
  isInitialized: boolean;
  playerIdA: string;
  playerIdB: string;
  workerReady: boolean;
}

export function usePlayerComparisonRouteData({
  getPlayerComparison,
  isInitialized,
  playerIdA,
  playerIdB,
  workerReady,
}: UsePlayerComparisonRouteDataOptions) {
  const [data, setData] = useState<PlayerComparisonData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchComparison = useCallback(async () => {
    if (!isInitialized || !workerReady || !playerIdA || !playerIdB) return;
    setLoading(true);
    const result = await getPlayerComparison(playerIdA, playerIdB);
    setData(result);
    setLoading(false);
  }, [getPlayerComparison, isInitialized, playerIdA, playerIdB, workerReady]);

  useEffect(() => {
    void fetchComparison();
  }, [fetchComparison]);

  return {
    data,
    loading,
    playerA: data?.playerA ?? null,
    playerB: data?.playerB ?? null,
  };
}
