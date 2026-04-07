import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ScenarioCatalogPage from './ScenarioCatalogPage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('@mbd/sim-core', () => ({
  getTeamById: vi.fn((teamId: string) => {
    if (teamId === 'oak') return { city: 'Oakland', name: 'Athletics', abbreviation: 'OAK' };
    if (teamId === 'cws') return { city: 'Chicago', name: 'White Sox', abbreviation: 'CWS' };
    if (teamId === 'lad') return { city: 'Los Angeles', name: 'Dodgers', abbreviation: 'LAD' };
    return null;
  }),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const MOCK_CATALOG = [
  {
    id: 'underdog',
    name: 'The Underdog',
    description: 'Take a low-budget team to the title.',
    difficulty: 'hard',
    maxSeasons: 5,
    requiresCareerMode: false,
    startingTeamId: 'oak',
  },
  {
    id: 'rebuild',
    name: 'The Rebuild',
    description: 'Turn a 100-loss team into a playoff contender.',
    difficulty: 'standard',
    maxSeasons: 3,
    requiresCareerMode: false,
    startingTeamId: 'cws',
  },
  {
    id: 'dynasty',
    name: 'The Dynasty',
    description: 'Win 3 championships in 5 years.',
    difficulty: 'legendary',
    maxSeasons: 5,
    requiresCareerMode: false,
    startingTeamId: 'lad',
  },
];

const MOCK_PROGRESS = {
  scenarioId: 'underdog',
  status: 'in_progress',
  currentSeason: 3,
  objectivesCompleted: 2,
  objectivesTotal: 5,
  summary: 'Making progress toward the pennant.',
};

describe('ScenarioCatalogPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 1,
      phase: 'regular_season',
      isInitialized: true,
      userTeamId: 'oak',
      teamName: 'Athletics',
      gmName: 'Kevin Bigham',
      playerCount: 780,
      gamesPlayed: 0,
      isSimulating: false,
      setSeason: vi.fn(),
      setDay: vi.fn(),
      setPhase: vi.fn(),
      setSimulating: vi.fn(),
      setInitialized: vi.fn(),
      setUserTeamId: vi.fn(),
      updateFromSim: vi.fn(),
      initializeGame: vi.fn(),
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders scenario catalog with difficulty badges and active progress', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getScenarioCatalog: vi.fn().mockResolvedValue(MOCK_CATALOG),
      getScenarioProgress: vi.fn().mockResolvedValue(MOCK_PROGRESS),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <ScenarioCatalogPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Challenge Mode');
    expect(container.textContent).toContain('3 scenarios available');

    // Scenarios
    expect(container.textContent).toContain('The Underdog');
    expect(container.textContent).toContain('hard');
    expect(container.textContent).toContain('The Rebuild');
    expect(container.textContent).toContain('standard');
    expect(container.textContent).toContain('The Dynasty');
    expect(container.textContent).toContain('legendary');

    // Active progress
    expect(container.textContent).toContain('Active Challenge');
    expect(container.textContent).toContain('in_progress');
    expect(container.textContent).toContain('2/5 objectives');
    expect(container.textContent).toContain('Making progress');
  });

  it('renders without progress section when no active scenario', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getScenarioCatalog: vi.fn().mockResolvedValue(MOCK_CATALOG),
      getScenarioProgress: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <ScenarioCatalogPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Challenge Mode');
    expect(container.textContent).not.toContain('Active Challenge');
  });
});
