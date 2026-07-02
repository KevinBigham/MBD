import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import LeagueLeadersContentPanel from '../components/LeagueLeadersContentPanel';
import { useLeagueLeadersRouteData } from '../hooks/useLeagueLeadersRouteData';

export default function LeadersPage() {
  const worker = useWorker();
  const { day, season, phase, isInitialized } = useGameStore();
  const { activeCat, leaders, setActiveCat } = useLeagueLeadersRouteData({
    day,
    getLeagueLeaders: worker.getLeagueLeaders,
    isInitialized,
    phase,
    season,
    workerReady: worker.isReady,
  });

  return (
    <LeagueLeadersContentPanel
      season={season}
      activeCat={activeCat}
      leaders={leaders}
      onSelectCategory={setActiveCat}
    />
  );
}
