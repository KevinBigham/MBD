import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { PageShell } from '@/shared/components/PageShell';
import RivalriesContentPanel from '../components/RivalriesContentPanel';
import { useRivalriesRouteData } from '../hooks/useRivalriesRouteData';

export default function RivalriesPage() {
  const worker = useWorker();
  const { isInitialized, season, day, phase } = useGameStore();
  const { loading, rivalries } = useRivalriesRouteData({
    day,
    getRivalries: worker.getRivalries,
    isInitialized,
    phase,
    season,
    workerReady: worker.isReady,
  });

  return (
    <PageShell loading={loading}>
      <RivalriesContentPanel rivalries={rivalries} />
    </PageShell>
  );
}
