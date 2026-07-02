import { useCallback, useEffect, useState } from 'react';
import type {
  ObjectivesView,
  Scenario,
  ScenarioProgress,
} from '../components/ScenarioCatalogContentPanel';

interface UseScenarioCatalogRouteDataOptions {
  day: number;
  getScenarioCatalog: () => Promise<RawScenario[] | null | undefined>;
  getScenarioObjectivesView: (scenarioId: string) => Promise<ObjectivesView | null | undefined>;
  getScenarioProgress: () => Promise<RawScenarioProgress | null | undefined>;
  isInitialized: boolean;
  phase: string;
  season: number;
  workerReady: boolean;
}

interface RawScenario {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  maxSeasons: number;
  requiresCareerMode: boolean;
  startingTeamId?: string | null;
}

interface RawScenarioProgress {
  completed?: boolean;
  currentSeason?: number;
  failed?: boolean;
  objectivesCompleted?: number;
  objectivesTotal?: number;
  progress?: number;
  scenarioId: string;
  startSeason?: number;
  status?: string;
  summary: string;
}

function normalizeCatalog(catalog: RawScenario[] | null | undefined): Scenario[] {
  return (catalog ?? []).map((scenario) => ({
    ...scenario,
    startingTeamId: scenario.startingTeamId ?? null,
  }));
}

function normalizeScenarioProgress(
  progress: RawScenarioProgress,
  season: number,
  objectivesView: ObjectivesView | null,
): ScenarioProgress {
  const objectiveCount = objectivesView?.objectives.length;
  const objectivesCompleted = objectivesView?.objectives.filter((objective) => objective.completed).length;
  const total = progress.objectivesTotal ?? objectiveCount ?? 1;

  return {
    scenarioId: progress.scenarioId,
    status: progress.status ?? (progress.completed ? 'complete' : progress.failed ? 'failed' : 'in_progress'),
    currentSeason: progress.currentSeason ?? (
      typeof progress.startSeason === 'number'
        ? Math.max(1, season - progress.startSeason + 1)
        : season
    ),
    objectivesCompleted: progress.objectivesCompleted
      ?? objectivesCompleted
      ?? Math.round((progress.progress ?? 0) * total),
    objectivesTotal: total,
    summary: progress.summary,
  };
}

export function useScenarioCatalogRouteData({
  day,
  getScenarioCatalog,
  getScenarioObjectivesView,
  getScenarioProgress,
  isInitialized,
  phase,
  season,
  workerReady,
}: UseScenarioCatalogRouteDataOptions) {
  const [catalog, setCatalog] = useState<Scenario[]>([]);
  const [progress, setProgress] = useState<ScenarioProgress | null>(null);
  const [objectivesView, setObjectivesView] = useState<ObjectivesView | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    const [catalogData, progressData] = await Promise.all([
      getScenarioCatalog(),
      getScenarioProgress(),
    ]);
    const catalogView = normalizeCatalog(catalogData);
    let objectivesViewData: ObjectivesView | null = null;
    let progressView: ScenarioProgress | null = null;

    if (progressData) {
      const objData = await getScenarioObjectivesView(progressData.scenarioId);
      objectivesViewData = objData ?? null;
      progressView = normalizeScenarioProgress(progressData, season, objectivesViewData);
    }

    setCatalog(catalogView);
    setProgress(progressView);
    setObjectivesView(objectivesViewData);
    setLoading(false);
  }, [getScenarioCatalog, getScenarioObjectivesView, getScenarioProgress, isInitialized, season, workerReady]);

  useEffect(() => {
    void fetchData();
  }, [day, fetchData, phase, season]);

  return {
    activeScenarioId: progress?.scenarioId ?? null,
    catalog,
    loading,
    objectivesView,
    progress,
  };
}
