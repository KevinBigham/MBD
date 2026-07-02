import { useEffect, useState } from 'react';
import type { GamePlayByPlayView } from '../components/BoxScoreContentPanel';

interface UseBoxScoreRouteDataOptions {
  gameRef: number | string;
  getGamePlayByPlay: (gameRef: number | string) => Promise<unknown>;
  isInitialized: boolean;
  workerReady: boolean;
}

interface UseBoxScoreRouteDataResult {
  data: GamePlayByPlayView | null;
  loading: boolean;
}

export function useBoxScoreRouteData({
  gameRef,
  getGamePlayByPlay,
  isInitialized,
  workerReady,
}: UseBoxScoreRouteDataOptions): UseBoxScoreRouteDataResult {
  const [data, setData] = useState<GamePlayByPlayView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (
      !isInitialized
      || !workerReady
      || (typeof gameRef === 'number' && Number.isNaN(gameRef))
      || (typeof gameRef === 'string' && gameRef.length === 0)
    ) return;

    let active = true;
    setLoading(true);
    void (async () => {
      const result = await getGamePlayByPlay(gameRef);
      if (!active) {
        return;
      }
      setData((result ?? null) as GamePlayByPlayView | null);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [gameRef, getGamePlayByPlay, isInitialized, workerReady]);

  return { data, loading };
}
