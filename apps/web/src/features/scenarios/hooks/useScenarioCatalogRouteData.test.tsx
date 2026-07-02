import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type {
  ObjectivesView,
  Scenario,
  ScenarioProgress,
} from '../components/ScenarioCatalogContentPanel';
import { useScenarioCatalogRouteData } from './useScenarioCatalogRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useScenarioCatalogRouteData>[0];
type HookResult = ReturnType<typeof useScenarioCatalogRouteData>;

const catalog: Scenario[] = [
  {
    id: 'underdog',
    name: 'The Underdog',
    description: 'Take a low-budget team to the title.',
    difficulty: 'hard',
    maxSeasons: 5,
    requiresCareerMode: false,
    startingTeamId: 'por',
  },
  {
    id: 'rebuild',
    name: 'The Rebuild',
    description: 'Turn a 100-loss team into a playoff contender.',
    difficulty: 'standard',
    maxSeasons: 3,
    requiresCareerMode: false,
    startingTeamId: 'col',
  },
];

const progress: ScenarioProgress = {
  scenarioId: 'underdog',
  status: 'in_progress',
  currentSeason: 3,
  objectivesCompleted: 2,
  objectivesTotal: 5,
  summary: 'Making progress toward the pennant.',
};

const objectivesView: ObjectivesView = {
  scenarioId: 'underdog',
  completionPercentage: 40,
  difficultyExplanation: 'Payroll restrictions keep the margin thin.',
  strategyTips: ['Keep payroll flexible.'],
  objectives: [{
    id: 'wins',
    label: 'Win 90 games',
    description: 'Build a credible regular-season contender.',
    targetValue: 90,
    currentValue: 84,
    completed: false,
    category: 'wins',
  }],
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useScenarioCatalogRouteData(options));
  return null;
}

describe('useScenarioCatalogRouteData', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latest = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function makeOptions(overrides: Partial<HookOptions> = {}) {
    const getScenarioCatalog = vi.fn().mockResolvedValue(catalog);
    const getScenarioProgress = vi.fn().mockResolvedValue(progress);
    const getScenarioObjectivesView = vi.fn().mockResolvedValue(objectivesView);

    return {
      getScenarioCatalog,
      getScenarioObjectivesView,
      getScenarioProgress,
      options: {
        day: 72,
        getScenarioCatalog,
        getScenarioObjectivesView,
        getScenarioProgress,
        isInitialized: true,
        phase: 'regular_season',
        season: 3,
        workerReady: true,
        ...overrides,
      } satisfies HookOptions,
    };
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latest = result;
      }} />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest).toBeTruthy();
    return latest as HookResult;
  }

  it('waits without querying until game state and worker are ready', async () => {
    const {
      getScenarioCatalog,
      getScenarioObjectivesView,
      getScenarioProgress,
      options,
    } = makeOptions({ workerReady: false });

    const result = await renderHook(options);

    expect(getScenarioCatalog).not.toHaveBeenCalled();
    expect(getScenarioProgress).not.toHaveBeenCalled();
    expect(getScenarioObjectivesView).not.toHaveBeenCalled();
    expect(result.loading).toBe(true);
    expect(result.catalog).toEqual([]);
    expect(result.progress).toBeNull();
    expect(result.objectivesView).toBeNull();
    expect(result.activeScenarioId).toBeNull();
  });

  it('loads catalog, progress, objectives, and active scenario id when ready', async () => {
    const {
      getScenarioCatalog,
      getScenarioObjectivesView,
      getScenarioProgress,
      options,
    } = makeOptions();

    const result = await renderHook(options);

    expect(getScenarioCatalog).toHaveBeenCalledTimes(1);
    expect(getScenarioProgress).toHaveBeenCalledTimes(1);
    expect(getScenarioObjectivesView).toHaveBeenCalledWith('underdog');
    expect(result.loading).toBe(false);
    expect(result.catalog).toEqual(catalog);
    expect(result.progress).toEqual(progress);
    expect(result.objectivesView).toBe(objectivesView);
    expect(result.activeScenarioId).toBe('underdog');
  });

  it('normalizes worker progress into the catalog panel view model', async () => {
    const workerProgress = {
      scenarioId: 'underdog',
      startSeason: 2,
      maxSeasons: 5,
      progress: 0.4,
      completed: false,
      completedSeason: null,
      failed: false,
      summary: 'Making progress toward the pennant.',
      name: 'The Underdog',
      description: 'Take a low-budget team to the title.',
      requiresCareerMode: false,
    };
    const { options } = makeOptions({
      getScenarioProgress: vi.fn().mockResolvedValue(workerProgress),
    });

    const result = await renderHook(options);

    expect(result.progress).toEqual({
      scenarioId: 'underdog',
      status: 'in_progress',
      currentSeason: 2,
      objectivesCompleted: 0,
      objectivesTotal: 1,
      summary: 'Making progress toward the pennant.',
    });
  });

  it('skips objective loading when no scenario is active', async () => {
    const {
      getScenarioObjectivesView,
      options,
    } = makeOptions({
      getScenarioProgress: vi.fn().mockResolvedValue(null),
    });

    const result = await renderHook(options);

    expect(getScenarioObjectivesView).not.toHaveBeenCalled();
    expect(result.loading).toBe(false);
    expect(result.catalog).toEqual(catalog);
    expect(result.progress).toBeNull();
    expect(result.objectivesView).toBeNull();
    expect(result.activeScenarioId).toBeNull();
  });

  it('refetches scenario data when the game calendar changes', async () => {
    const { getScenarioCatalog, getScenarioObjectivesView, getScenarioProgress, options } = makeOptions();
    await renderHook(options);

    await renderHook({
      ...options,
      day: 73,
    });
    await renderHook({
      ...options,
      day: 1,
      phase: 'offseason',
      season: 4,
    });

    expect(getScenarioCatalog).toHaveBeenCalledTimes(3);
    expect(getScenarioProgress).toHaveBeenCalledTimes(3);
    expect(getScenarioObjectivesView).toHaveBeenCalledTimes(3);
  });
});
