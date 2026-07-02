import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ScenarioCatalogContentPanel, {
  type ObjectivesView,
  type Scenario,
  type ScenarioProgress,
} from './ScenarioCatalogContentPanel';

vi.mock('@mbd/sim-core', () => ({
  getTeamById: vi.fn((teamId: string) => {
    if (teamId === 'por') return { city: 'Oakland', name: 'Sasquatch' };
    if (teamId === 'col') return { city: 'Chicago', name: 'Wayfinders' };
    return null;
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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
    id: 'turnaround',
    name: 'The Turnaround',
    description: 'Rebuild the farm and return to October.',
    difficulty: 'standard',
    maxSeasons: 3,
    requiresCareerMode: true,
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
  strategyTips: ['Keep payroll flexible.', 'Use prospects as surplus value.'],
  objectives: [
    {
      id: 'wins',
      label: 'Win 90 games',
      description: 'Build a credible regular-season contender.',
      targetValue: 90,
      currentValue: 84,
      completed: false,
      category: 'wins',
    },
    {
      id: 'playoffs',
      label: 'Reach October',
      description: 'Qualify for the postseason.',
      targetValue: 1,
      currentValue: 1,
      completed: true,
      category: 'playoffs',
    },
  ],
};

describe('ScenarioCatalogContentPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders catalog, active progress, objective details, and strategy context', async () => {
    await act(async () => {
      root.render(
        <ScenarioCatalogContentPanel
          activeScenarioId="underdog"
          catalog={catalog}
          objectivesView={objectivesView}
          progress={progress}
        />,
      );
    });

    expect(container.textContent).toContain('Challenge Mode');
    expect(container.textContent).toContain('2 scenarios available');
    expect(container.textContent).toContain('The Underdog');
    expect(container.textContent).toContain('Hard');
    expect(container.textContent).toContain('Oakland Sasquatch');
    expect(container.textContent).toContain('The Turnaround');
    expect(container.textContent).toContain('Career Mode');
    expect(container.textContent).toContain('Active Challenge');
    expect(container.textContent).toContain('In Progress');
    expect(container.textContent).toContain('2/5 objectives (40%)');
    expect(container.textContent).toContain('Win 90 games');
    expect(container.textContent).toContain('84/90');
    expect(container.textContent).toContain('Reach October');
    expect(container.textContent).toContain('Strategy Tips');
    expect(container.textContent).toContain('Keep payroll flexible.');
    expect(container.textContent).toContain('Difficulty');
    expect(container.textContent).toContain('Payroll restrictions keep the margin thin.');
  });

  it('omits active challenge sections when no scenario is active', async () => {
    await act(async () => {
      root.render(
        <ScenarioCatalogContentPanel
          activeScenarioId={null}
          catalog={catalog}
          objectivesView={null}
          progress={null}
        />,
      );
    });

    expect(container.textContent).toContain('Challenge Mode');
    expect(container.textContent).not.toContain('Active Challenge');
    expect(container.textContent).not.toContain('Objectives');
    expect(container.textContent).not.toContain('Strategy Tips');
  });
});
