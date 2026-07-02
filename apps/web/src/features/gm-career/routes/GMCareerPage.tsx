import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { GMCareerContentPanel } from '../components/GMCareerContentPanel';
import { useGMCareerRouteData } from '../hooks/useGMCareerRouteData';

export default function GMCareerPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, season, day, phase, gmName } = useGameStore();
  const { career, jobMarket, teamMoments } = useGMCareerRouteData({
    day,
    getGMCareer: worker.getGMCareer,
    getJobMarket: worker.getJobMarket,
    getTeamMoments: worker.getTeamMoments,
    isInitialized,
    phase,
    season,
    workerReady,
  });

  if (!career) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="font-data text-sm text-dynasty-muted">Loading GM career data...</div>
      </div>
    );
  }

  return (
    <GMCareerContentPanel
      career={career}
      gmName={gmName}
      jobMarket={jobMarket}
      teamMoments={teamMoments}
    />
  );
}
