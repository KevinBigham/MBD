import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import RivalriesPage from './RivalriesPage';
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
    if (teamId === 'nym') return { city: 'New York', name: 'Tycoons', abbreviation: 'NYT' };
    if (teamId === 'bos') return { city: 'Boston', name: "Noreasters", abbreviation: 'BOS' };
    if (teamId === 'lax') return { city: 'Los Angeles', name: 'Sunset Strip', abbreviation: 'LAX' };
    if (teamId === 'sfg') return { city: 'San Francisco', name: 'Fog Horns', abbreviation: 'SFB' };
    return null;
  }),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const MOCK_RIVALRIES = [
  {
    id: 'nyy-bos',
    teamA: 'nym',
    teamB: 'bos',
    intensity: 85,
    summary: 'The greatest rivalry in baseball.',
    reasons: ['Division rivals', 'Historic postseason battles'],
    origin: 'historical',
    active: true,
    currentSeasonWinsA: 7,
    currentSeasonWinsB: 5,
    historicalWinsA: 1200,
    historicalWinsB: 1150,
    eventHistory: [
      { season: 5, type: 'playoff', summary: 'ALCS Game 7 thriller' },
      { season: 4, type: 'regular_season', summary: 'Bench-clearing brawl' },
    ],
    closeRaceStreak: 4,
    playoffSeriesStreak: 3,
  },
  {
    id: 'lad-sfg',
    teamA: 'lax',
    teamB: 'sfg',
    intensity: 35,
    summary: 'West coast classic.',
    reasons: ['Division rivals'],
    origin: 'division_race',
    active: false,
    currentSeasonWinsA: 0,
    currentSeasonWinsB: 0,
    historicalWinsA: 500,
    historicalWinsB: 480,
    eventHistory: [],
    closeRaceStreak: 0,
    playoffSeriesStreak: 0,
  },
];

describe('RivalriesPage', () => {
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
      userTeamId: 'nym',
      teamName: 'Tycoons',
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

  it('renders rivalry cards with teams and intensity', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getRivalries: vi.fn().mockResolvedValue(MOCK_RIVALRIES),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RivalriesPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Rivalry Watch');
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('active');
    expect(container.textContent).toContain('NYT');
    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('HEATED 85');
    expect(container.textContent).toContain('historical');
    expect(container.textContent).toContain('ALCS Game 7 thriller');
    expect(container.textContent).toContain('4-season race');
    expect(container.textContent).toContain('3 playoff meetings');
  });

  it('shows dormant badge for inactive rivalries', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getRivalries: vi.fn().mockResolvedValue(MOCK_RIVALRIES),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RivalriesPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('DORMANT');
    expect(container.textContent).toContain('LAX');
    expect(container.textContent).toContain('SFB');
  });

  it('shows empty state when no rivalries', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getRivalries: vi.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RivalriesPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('No rivalries yet');
  });
});
