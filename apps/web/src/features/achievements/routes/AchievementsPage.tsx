import { Suspense, lazy } from 'react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { PageShell } from '@/shared/components/PageShell';
import AchievementsContentPanel from '../components/AchievementsContentPanel';
import { useAchievementsRouteData } from '../hooks/useAchievementsRouteData';

const AwardCeremonyModal = lazy(() => import('../components/AwardCeremonyModal'));

export default function AchievementsPage() {
  const worker = useWorker();
  const { isInitialized, season, day, phase } = useGameStore();
  const {
    achievements,
    ceremony,
    ceremonyLoading,
    closeCeremony,
    filter,
    loading,
    openCeremony,
    setFilter,
  } = useAchievementsRouteData({
    day,
    getAchievements: worker.getAchievements,
    getAwardCeremony: worker.getAwardCeremony,
    isInitialized,
    phase,
    season,
    workerReady: worker.isReady,
  });

  return (
    <PageShell loading={loading}>
      <AchievementsContentPanel
        achievements={achievements}
        ceremonyLoading={ceremonyLoading}
        filter={filter}
        onChangeFilter={setFilter}
        onOpenCeremony={() => void openCeremony()}
      />

      {ceremony && (
        <Suspense fallback={null}>
          <AwardCeremonyModal
            ceremony={ceremony}
            onClose={closeCeremony}
          />
        </Suspense>
      )}
    </PageShell>
  );
}
