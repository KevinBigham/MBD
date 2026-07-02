import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import StandingsContentPanel from '../components/StandingsContentPanel';
import { useStandingsRouteData } from '../hooks/useStandingsRouteData';

export default function StandingsPage() {
  const worker = useWorker();
  const { day, season, phase, userTeamId, isInitialized } = useGameStore();
  const { standings } = useStandingsRouteData({
    day,
    getStandings: worker.getStandings,
    isInitialized,
    phase,
    season,
    workerReady: worker.isReady,
  });

  return (
    <StandingsContentPanel
      day={day}
      season={season}
      standings={standings}
      userTeamId={userTeamId}
    />
  );
}
