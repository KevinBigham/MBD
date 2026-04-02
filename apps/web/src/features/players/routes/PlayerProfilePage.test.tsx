import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PlayerProfilePage from './PlayerProfilePage';
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

describe('PlayerProfilePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 5,
      day: 92,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nyy',
      teamName: 'Yankees',
      playerCount: 780,
      gamesPlayed: 91,
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

  it('shows development trajectory, checkpoint history, and extension history', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getPlayer: vi.fn().mockResolvedValue({
        id: 'player-1',
        firstName: 'Marco',
        lastName: 'Ascension',
        age: 23,
        position: 'SS',
        overallRating: 67,
        displayRating: 58,
        letterGrade: 'B',
        rosterStatus: 'AA',
        teamId: 'nyy',
        ceiling: 72,
        floor: 55,
        developmentProgram: 'mlb_prep',
        developmentTrajectory: 'ahead_of_curve',
        contract: {
          years: 1,
          annualSalary: 2.4,
          totalValue: 2.4,
          noTradeClause: false,
          noTradeClauseType: 'none',
          playerOption: false,
          teamOption: false,
          optOutYears: [],
          signingBonus: 0,
          buyoutAmount: 0,
          deferredMoney: [],
        },
        extensionHistory: [{
          season: 4,
          teamId: 'nyy',
          years: 6,
          annualSalary: 18.2,
          totalValue: 109.2,
          outcome: 'accepted',
        }],
        stats: null,
      }),
      getAdvancedStats: vi.fn().mockResolvedValue({
        war: 4.8,
        woba: 0.378,
        wrcPlus: 142,
        opsPlus: 137,
        iso: 0.224,
        fip: null,
        xfip: null,
        whip: null,
        kPer9: null,
        bbPer9: null,
        kBb: null,
      }),
      getPersonalityProfile: vi.fn().mockResolvedValue({
        playerId: 'player-1',
        archetype: 'clubhouse_engine',
        morale: {
          score: 66,
          trend: 'rising',
          summary: 'Responding well to the current program.',
          lastUpdated: 'S5D92',
        },
        personality: {
          workEthic: 71,
          mentalToughness: 64,
          leadership: 57,
          competitiveness: 69,
        },
        summary: 'High-motor infielder with strong internal drive.',
      }),
      getDevelopmentReports: vi.fn().mockResolvedValue({
        playerId: 'player-1',
        history: [
          {
            season: 5,
            month: 4,
            trajectory: 'ahead_of_curve',
            summary: 'Improved first-step reads and contact quality.',
            overallRating: 345,
          },
        ],
        recommendations: [
          {
            playerId: 'player-1',
            teamId: 'nyy',
            fromPosition: 'SS',
            toPosition: '2B',
            confidence: 0.72,
            reason: 'Double-play turns project as a plus fit.',
          },
        ],
      }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/players/player-1']}>
          <Routes>
            <Route path="/players/:playerId" element={<PlayerProfilePage />} />
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Development Trajectory');
    expect(container.textContent).toContain('ahead_of_curve');
    expect(container.textContent).toContain('Checkpoint History');
    expect(container.textContent).toContain('Improved first-step reads');
    expect(container.textContent).toContain('Extension History');
    expect(container.textContent).toContain('$18.2M');
    expect(container.textContent).toContain('2B');
    expect(container.textContent).toContain('Advanced Stats');
    expect(container.textContent).toContain('wOBA');
    expect(container.textContent).toContain('4.8');
  });
});
