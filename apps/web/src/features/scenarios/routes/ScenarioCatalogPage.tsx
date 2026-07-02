import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { PageShell } from '@/shared/components/PageShell';
import ScenarioCatalogContentPanel from '../components/ScenarioCatalogContentPanel';
import { useScenarioCatalogRouteData } from '../hooks/useScenarioCatalogRouteData';

export default function ScenarioCatalogPage() {
  const worker = useWorker();
  const { isInitialized, season, day, phase } = useGameStore();
  const {
    activeScenarioId,
    catalog,
    loading,
    objectivesView,
    progress,
  } = useScenarioCatalogRouteData({
    day,
    getScenarioCatalog: worker.getScenarioCatalog,
    getScenarioObjectivesView: worker.getScenarioObjectivesView,
    getScenarioProgress: worker.getScenarioProgress,
    isInitialized,
    phase,
    season,
    workerReady: worker.isReady,
  });

  return (
    <PageShell loading={loading}>
      <ScenarioCatalogContentPanel
        activeScenarioId={activeScenarioId}
        catalog={catalog}
        objectivesView={objectivesView}
        progress={progress}
      />
    </PageShell>
  );
}
