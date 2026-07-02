import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SetupDynastyWizardPanel, {
  type ScenarioCatalogEntry,
  type SetupDifficulty,
  type SetupPlayMode,
  type SetupWizardMode,
} from './SetupDynastyWizardPanel';
import type {
  SetupPreview,
  SetupTeamOption,
  SetupTeamPickerFilters,
} from './SetupTeamPickerPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const teamOptions = [
  { id: 'nym', label: 'New York Tycoons' },
  { id: 'kc', label: 'Kansas City BBQ Fountains' },
] as const satisfies readonly SetupTeamOption[];

const tycoonsPreview = {
  teamId: 'nym',
  teamName: 'New York Tycoons',
  division: 'AL_EAST',
  archetype: 'Empire Under Pressure',
  franchiseHook: "The sport's loudest market wants October immediately.",
  whyNow: 'The roster can win now if the room is aligned.',
  marketSize: 'large',
  timeline: 'Win now',
  payrollTier: 'Premier',
  farmSystemRating: 'B+',
  strengths: ['middle-of-order thump'],
  weaknesses: ['bullpen stability'],
  teamIdentityBlurb: 'Big-market expectations with enough prospects to support a push.',
  projectedRecord: '88-74',
  topPlayers: [
    { playerId: 'p-judge', name: 'Aaron Judge', position: 'RF', overall: 78 },
  ],
  divisionRivals: [
    { teamId: 'bos', teamName: 'Boston Noreasters' },
  ],
} as const satisfies SetupPreview;

const budgetScenario = {
  id: 'budget-squeeze',
  name: 'Small Market Squeeze',
  description: 'Win while navigating a small payroll and a thin veteran core.',
  difficulty: 'hard',
  maxSeasons: 3,
  requiresCareerMode: true,
  startingTeamId: 'kc',
} as const satisfies ScenarioCatalogEntry;

const rebuildScenario = {
  id: 'farm-build',
  name: 'Farm Build',
  description: 'Build around a young farm system.',
  difficulty: 'standard',
  maxSeasons: 5,
  requiresCareerMode: false,
  startingTeamId: 'sea',
} as const satisfies ScenarioCatalogEntry;

function defaultFilters(): SetupTeamPickerFilters {
  return {
    archetype: 'all',
    farm: 'all',
    market: 'all',
    payroll: 'all',
    timeline: 'all',
  };
}

function renderPanel(overrides: Partial<React.ComponentProps<typeof SetupDynastyWizardPanel>> = {}) {
  const props = {
    busySlot: null,
    difficulty: 'standard' as SetupDifficulty,
    filters: defaultFilters(),
    gmName: 'Alex Rivera',
    onBack: vi.fn(),
    onBeginDynasty: vi.fn(),
    onChangeDayOneExperience: vi.fn(),
    onChangeDifficulty: vi.fn(),
    onChangeFilter: vi.fn(),
    onChangeGmName: vi.fn(),
    onChangePlayMode: vi.fn(),
    onChangeWizardMode: vi.fn(),
    onSelectScenario: vi.fn(),
    onSelectTeam: vi.fn(),
    playMode: 'standard' as SetupPlayMode,
    previewMap: { nym: tycoonsPreview },
    selectedScenario: null,
    selectedScenarioId: budgetScenario.id,
    selectedSlot: 4,
    selectedTeamId: 'nym',
    scenarioCatalog: [budgetScenario, rebuildScenario],
    teamOptions,
    dayOneExperience: 'full' as const,
    wizardMode: 'dynasty' as SetupWizardMode,
    workerIsReady: true,
    workerStatus: 'ready',
    ...overrides,
  };

  return props;
}

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(text),
  );
  expect(button, `Missing button "${text}"`).toBeTruthy();
  return button as HTMLButtonElement;
}

function expectMobileCriticalControls(container: HTMLElement, controlId: string, expectedCount: number): void {
  const controls = Array.from(container.querySelectorAll(`[data-mobile-critical-control="${controlId}"]`));

  expect(controls).toHaveLength(expectedCount);
  for (const control of controls) {
    expect(control.getAttribute('class')).toContain('mobile-critical-control');
    expect(control.getAttribute('class')).toContain('focus-ring');
  }
}

describe('SetupDynastyWizardPanel', () => {
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
    vi.clearAllMocks();
  });

  it('renders dynasty setup controls and delegates route-owned state changes', async () => {
    const props = renderPanel();

    await act(async () => {
      root.render(<SetupDynastyWizardPanel {...props} />);
    });

    expect(container.textContent).toContain('Start in Slot 4');
    expect(container.textContent).toContain('Open Dynasty');
    expect(container.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('Standard Dynasty');
    expect(container.textContent).toContain('Full Day One');

    expectMobileCriticalControls(container, 'setup-wizard-start-type', 2);
    expectMobileCriticalControls(container, 'setup-wizard-difficulty', 1);
    expectMobileCriticalControls(container, 'setup-wizard-play-mode', 2);
    expectMobileCriticalControls(container, 'setup-wizard-day-one', 2);
    expectMobileCriticalControls(container, 'setup-wizard-gm-name', 1);
    expectMobileCriticalControls(container, 'setup-wizard-back', 1);
    expectMobileCriticalControls(container, 'setup-wizard-submit', 1);

    const difficultySelect = container.querySelector('#setup-difficulty') as HTMLSelectElement;
    const gmNameInput = container.querySelector('#setup-gm-name') as HTMLInputElement;
    const setInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

    await act(async () => {
      buttonByText(container, 'Challenge Scenario').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      buttonByText(container, 'GM Career').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      buttonByText(container, 'Quick Start').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      difficultySelect.value = 'hard';
      difficultySelect.dispatchEvent(new Event('change', { bubbles: true }));
      setInputValue?.call(gmNameInput, 'Morgan Foster');
      gmNameInput.dispatchEvent(new Event('input', { bubbles: true }));
      buttonByText(container, 'Back to Save Hub').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      buttonByText(container, 'Begin Season 1').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onChangeWizardMode).toHaveBeenCalledWith('scenario');
    expect(props.onChangePlayMode).toHaveBeenCalledWith('career');
    expect(props.onChangeDayOneExperience).toHaveBeenCalledWith('quick');
    expect(props.onChangeDifficulty).toHaveBeenCalledWith('hard');
    expect(props.onChangeGmName).toHaveBeenCalledWith('Morgan Foster');
    expect(props.onBack).toHaveBeenCalled();
    expect(props.onBeginDynasty).toHaveBeenCalled();
  });

  it('renders scenario setup controls without dynasty team or day-one controls', async () => {
    const props = renderPanel({
      selectedScenario: budgetScenario,
      wizardMode: 'scenario',
      workerStatus: 'error',
    });

    await act(async () => {
      root.render(<SetupDynastyWizardPanel {...props} />);
    });

    expect(container.textContent).toContain('Scenario');
    expect(container.textContent).toContain('Small Market Squeeze');
    expect(container.textContent).toContain('Hard · 3 seasons');
    expect(container.textContent).toContain('This scenario uses career-mode rules.');
    expect(container.textContent).toContain('Launch Scenario');
    expect(container.textContent).toContain('Sim engine failed to load.');
    expect(container.textContent).not.toContain('Team');
    expect(container.textContent).not.toContain('Day One Experience');

    expectMobileCriticalControls(container, 'setup-wizard-start-type', 2);
    expectMobileCriticalControls(container, 'setup-wizard-scenario', 2);
    expectMobileCriticalControls(container, 'setup-wizard-difficulty', 1);
    expectMobileCriticalControls(container, 'setup-wizard-gm-name', 1);
    expectMobileCriticalControls(container, 'setup-wizard-back', 1);
    expectMobileCriticalControls(container, 'setup-wizard-submit', 1);

    await act(async () => {
      buttonByText(container, 'Farm Build').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onSelectScenario).toHaveBeenCalledWith('farm-build');
  });
});
