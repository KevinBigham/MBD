import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import GMCareerPage from './GMCareerPage';
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
    return null;
  }),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const MOCK_GM_CAREER = {
  careerHistory: [
    {
      teamId: 'bos',
      seasons: 3,
      record: { wins: 250, losses: 236 },
      championships: 0,
      hiredSeason: 1,
      firedSeason: 3,
      firedReason: 'Missed playoffs three consecutive seasons.',
      reputation: 42,
    },
    {
      teamId: 'nym',
      seasons: 2,
      record: { wins: 190, losses: 134 },
      championships: 1,
      hiredSeason: 4,
      firedSeason: null,
      firedReason: null,
      reputation: 78,
    },
  ],
  currentTeamId: 'nym',
  reputation: 78,
  overallRecord: { wins: 440, losses: 370 },
  championships: 1,
  hiredSeason: 4,
  firedSeasons: [3],
  careerAchievements: ['Won 1 championship.'],
  jobSearchActive: false,
  lastFiredReason: null,
};

const MOCK_JOB_MARKET = {
  availableJobs: [],
  applicationDeadlineSeason: null,
};

describe('GMCareerPage', () => {
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

  it('renders GM career record and timeline entries', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getGMCareer: vi.fn().mockResolvedValue(MOCK_GM_CAREER),
      getJobMarket: vi.fn().mockResolvedValue(MOCK_JOB_MARKET),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <GMCareerPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    // Header
    expect(container.textContent).toContain('GM Career Hub');

    // GM profile
    expect(container.textContent).toContain('Kevin Bigham');
    expect(container.textContent).toContain('New York Tycoons');

    // Career record
    expect(container.textContent).toContain('440');
    expect(container.textContent).toContain('370');

    // Championships
    expect(container.textContent).toContain('1');

    // Timeline entries
    expect(container.textContent).toContain('Boston Noreasters');
    expect(container.textContent).toContain('Fired');
    expect(container.textContent).toContain('Missed playoffs');
    expect(container.textContent).toContain('Active');
  });

  it('shows job market panel when job search is active', async () => {
    const activeCareer = {
      ...MOCK_GM_CAREER,
      jobSearchActive: true,
    };
    const activeJobMarket = {
      availableJobs: [
        {
          teamId: 'bos',
          ownerArchetype: 'Hands-Off',
          budget: 'High',
          expectations: 'Win now',
          difficulty: 'Medium',
          attractiveness: 0.75,
        },
      ],
      applicationDeadlineSeason: 6,
    };

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getGMCareer: vi.fn().mockResolvedValue(activeCareer),
      getJobMarket: vi.fn().mockResolvedValue(activeJobMarket),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <GMCareerPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Job Market');
    expect(container.textContent).toContain('Job Search Active');
    expect(container.textContent).toContain('Win now');
    expect(container.textContent).toContain('Application deadline: Season 6');
  });
});
