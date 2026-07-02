import { useCallback, useEffect, useState } from 'react';
import type { PlayerProfileView } from '../components/playerProfileShared';

interface PlayerProfileViewWorker {
  getPlayerProfileView: (playerId: string) => Promise<unknown>;
}

interface UsePlayerProfileViewOptions {
  isInitialized: boolean;
  workerReady: boolean;
  playerId?: string;
  day: number;
  season: number;
  worker: PlayerProfileViewWorker;
}

export function usePlayerProfileView({
  isInitialized,
  workerReady,
  playerId,
  day,
  season,
  worker,
}: UsePlayerProfileViewOptions) {
  const [view, setView] = useState<PlayerProfileView | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!isInitialized || !workerReady || !playerId) {
      return;
    }

    setLoading(true);
    try {
      const data = await worker.getPlayerProfileView(playerId);
      setView((data as PlayerProfileView | null) ?? null);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, playerId, worker, workerReady]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile, day, season]);

  const player = view?.player ?? null;

  return {
    view,
    player,
    loading,
    fetchProfile,
  };
}
