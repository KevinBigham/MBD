import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import PlayersPageContent from '../components/PlayersPageContent';
import { usePlayersRouteData } from '../hooks/usePlayersRouteData';

export default function PlayersPage() {
  const worker = useWorker();
  const { isInitialized } = useGameStore();
  const { players, query, setQuery } = usePlayersRouteData({
    getLeagueLeaders: worker.getLeagueLeaders,
    isInitialized,
    searchPlayers: worker.searchPlayers,
    workerReady: worker.isReady,
  });
  const navigate = useNavigate();
  const handlePlayerOpen = useCallback((playerId: string) => {
    navigate(`/players/${playerId}`);
  }, [navigate]);

  return (
    <PlayersPageContent
      onPlayerOpen={handlePlayerOpen}
      onQueryChange={setQuery}
      players={players}
      query={query}
    />
  );
}
