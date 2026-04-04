import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import MinorsPage from './MinorsPage';
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

describe('MinorsPage', () => {
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

  it('renders the farm report alongside affiliate results', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getAffiliateOverview: vi.fn().mockResolvedValue({
        affiliates: [
          {
            level: 'AAA',
            label: 'AAA',
            wins: 48,
            losses: 32,
            gamesPlayed: 80,
            runDifferential: 37,
            topPerformer: {
              playerId: 'prospect-1',
              playerName: 'Marco Ascension',
              statLine: '.322 AVG · 14 HR',
            },
          },
        ],
        recentBoxScores: [
          {
            id: 'box-1',
            day: 92,
            level: 'AAA',
            label: 'AAA',
            result: 'W',
            scoreline: '6-3 vs BOS',
            summary: 'The lineup controlled the zone all night.',
          },
        ],
        waiverClaims: [],
        farmReport: {
          bondedProspects: 4,
          activeSetbackCount: 1,
          breakoutCandidates: [
            {
              playerId: 'prospect-1',
              playerName: 'Marco Ascension',
              summary: 'Dark horse Marco Ascension could be next in line for a callup.',
            },
          ],
          topProspects: [
            {
              playerId: 'prospect-1',
              playerName: 'Marco Ascension',
              position: 'SS',
              level: 'AAA',
              levelLabel: 'AAA',
              overallRating: 61,
              ceiling: 74,
              bondStrength: 42,
              loyaltyModifier: 0.42,
              milestones: ['Drafted Round 1, 3', 'Promoted to AAA, 5'],
              latestLineSummary: '.322 AVG · 82 H · 14 HR · 48 RBI',
              activeSetback: {
                type: 'hot_streak',
                summary: 'Marco Ascension is tearing through upper-level pitching.',
                endMonth: 5,
                endSeason: 5,
              },
            },
          ],
        },
      }),
      getAffiliateBoxScore: vi.fn().mockResolvedValue({
        id: 'box-1',
        season: 5,
        day: 92,
        level: 'AAA',
        label: 'AAA',
        homeTeamName: 'Yankees',
        awayTeamName: 'Red Sox',
        homeScore: 6,
        awayScore: 3,
        summary: 'The lineup controlled the zone all night.',
        notablePlayers: [
          {
            playerId: 'prospect-1',
            playerName: 'Marco Ascension',
            position: 'SS',
          },
        ],
      }),
      getProspectPipeline: vi.fn().mockResolvedValue({
        health: {
          score: 78,
          label: 'surging',
          readyNow: 1,
          nextWave: 2,
          longTerm: 1,
          summary: 'One prospect is knocking on the MLB door and two more sit in the next wave.',
        },
        prospects: [
          {
            playerId: 'prospect-1',
            playerName: 'Marco Ascension',
            position: 'SS',
            level: 'AAA',
            levelLabel: 'AAA',
            age: 22,
            overallRating: 61,
            ceiling: 74,
            bondStrength: 42,
            eta: 'Ready now',
            trend: 'surging',
            latestLineSummary: '.322 AVG · 82 H · 14 HR · 48 RBI',
            activeSetback: null,
            milestones: ['Drafted Round 1, 3'],
          },
        ],
      }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(<MinorsPage />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Minor League Hub');
    expect(container.textContent).toContain('Farm report');
    expect(container.textContent).toContain('Pipeline Health');
    expect(container.textContent).toContain('surging');
    expect(container.textContent).toContain('Ready now');
    expect(container.textContent).toContain('bonded prospects');
    expect(container.textContent).toContain('Breakout candidates');
    expect(container.textContent).toContain('could be next in line for a callup');
    expect(container.textContent).toContain('Marco Ascension');
    expect(container.textContent).toContain('Bond 42');
    expect(container.textContent).toContain('tearing through upper-level pitching');
    expect(container.textContent).toContain('Recent affiliate results');
    expect(container.textContent).toContain('Selected box score');
  });
});
