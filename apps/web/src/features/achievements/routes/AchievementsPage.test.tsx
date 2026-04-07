import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import AchievementsPage from './AchievementsPage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const MOCK_ACHIEVEMENTS = [
  {
    id: 'first_championship',
    category: 'dynasty',
    name: 'Ring Ceremony',
    description: 'Win your first championship.',
    unlocked: true,
    unlockedAt: 3,
    unlockSummary: 'Won the World Series in Season 3.',
    progress: null,
  },
  {
    id: 'moneyball_master',
    category: 'moneyball',
    name: 'Moneyball Master',
    description: 'Win 90+ games with a bottom-5 payroll.',
    unlocked: false,
    unlockedAt: null,
    unlockSummary: null,
    progress: { current: 82, target: 90, summary: '82 wins this season' },
  },
  {
    id: 'prospect_dev',
    category: 'development',
    name: 'Farm Fresh',
    description: 'Develop 3 homegrown All-Stars.',
    unlocked: false,
    unlockedAt: null,
    unlockSummary: null,
    progress: { current: 1, target: 3, summary: '1 of 3 All-Stars developed' },
  },
];

describe('AchievementsPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 5,
      day: 1,
      phase: 'regular_season',
      isInitialized: true,
      userTeamId: 'nyy',
      teamName: 'Yankees',
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

  it('renders trophy room with unlocked and locked achievements', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getAchievements: vi.fn().mockResolvedValue(MOCK_ACHIEVEMENTS),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <AchievementsPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Trophy Room');
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('/ 3 unlocked');
    expect(container.textContent).toContain('Ring Ceremony');
    expect(container.textContent).toContain('Won the World Series in Season 3');
    expect(container.textContent).toContain('Moneyball Master');
    expect(container.textContent).toContain('82 wins this season');
    expect(container.textContent).toContain('Farm Fresh');
  });

  it('renders category filter buttons with counts', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getAchievements: vi.fn().mockResolvedValue(MOCK_ACHIEVEMENTS),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <AchievementsPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('dynasty');
    expect(container.textContent).toContain('moneyball');
    expect(container.textContent).toContain('development');
  });

  it('shows empty state when no achievements', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getAchievements: vi.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <AchievementsPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('No achievements yet');
  });
});
