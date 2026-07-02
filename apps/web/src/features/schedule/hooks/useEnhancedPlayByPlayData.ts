import { useEffect, useState } from 'react';

export interface EnhancedPlayByPlayEntry {
  text: string;
  excitement: 1 | 2 | 3 | 4 | 5;
  isHighlight: boolean;
  situation: string;
}

export interface EnhancedPlayByPlayData {
  gameIndex: number;
  homeTeamId: string;
  awayTeamId: string;
  entries: EnhancedPlayByPlayEntry[];
  highlightCount: number;
  maxExcitement: number;
}

interface UseEnhancedPlayByPlayDataOptions {
  gameIndex: number;
  getEnhancedGamePlayByPlay: (gameIndex: number) => Promise<unknown>;
  isInitialized: boolean;
  workerReady: boolean;
}

interface UseEnhancedPlayByPlayDataResult {
  data: EnhancedPlayByPlayData | null;
  loading: boolean;
}

export function useEnhancedPlayByPlayData({
  gameIndex,
  getEnhancedGamePlayByPlay,
  isInitialized,
  workerReady,
}: UseEnhancedPlayByPlayDataOptions): UseEnhancedPlayByPlayDataResult {
  const [data, setData] = useState<EnhancedPlayByPlayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isInitialized || !workerReady || Number.isNaN(gameIndex)) return;

    setLoading(true);
    void (async () => {
      const result = await getEnhancedGamePlayByPlay(gameIndex);
      setData((result ?? null) as EnhancedPlayByPlayData | null);
      setLoading(false);
    })();
  }, [gameIndex, getEnhancedGamePlayByPlay, isInitialized, workerReady]);

  return { data, loading };
}
