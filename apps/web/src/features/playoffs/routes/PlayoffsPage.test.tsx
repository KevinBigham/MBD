import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PlayoffsPage from './PlayoffsPage';
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

describe('PlayoffsPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 1,
      phase: 'playoffs',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 162,
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

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getPlayoffBracket: vi.fn().mockResolvedValue({
        seeds: [
          { teamId: 'nym', seed: 1, wins: 101, losses: 61, league: 'AL', divisionWinner: true },
          { teamId: 'cle', seed: 3, wins: 94, losses: 68, league: 'AL', divisionWinner: true },
          { teamId: 'lax', seed: 1, wins: 102, losses: 60, league: 'NL', divisionWinner: true },
          { teamId: 'phi', seed: 4, wins: 90, losses: 72, league: 'NL', divisionWinner: false },
        ],
        currentRound: 'DIVISION_SERIES',
        currentRoundSeries: [{
          id: 'AL-DS-1',
          round: 'DIVISION_SERIES',
          league: 'AL',
          bestOf: 5,
          higherSeed: { teamId: 'nym', seed: 1, wins: 101, losses: 61, league: 'AL', divisionWinner: true },
          lowerSeed: { teamId: 'cle', seed: 3, wins: 94, losses: 68, league: 'AL', divisionWinner: true },
          games: [{
            gameNumber: 1,
            winnerId: 'nym',
            loserId: 'cle',
            homeTeamId: 'nym',
            awayTeamId: 'cle',
            homeScore: 5,
            awayScore: 2,
            innings: 9,
            keyPerformers: [
              { playerId: 'p1', playerName: 'Aaron Judge', teamId: 'nym', statLine: '3-4, 1 HR, 3 RBI' },
            ],
            boxScore: {
              gameId: 'g1',
              homeTeamId: 'nym',
              awayTeamId: 'cle',
              homeScore: 5,
              awayScore: 2,
              innings: 9,
              events: [],
            },
          }],
          higherSeedWins: 1,
          lowerSeedWins: 0,
          leaderSummary: 'NYY leads 1-0',
          status: 'in_progress',
          winnerId: null,
          loserId: null,
        }],
        completedRounds: [],
        series: [],
        champion: null,
        runnerUp: null,
      }),
      getSeasonFlowState: vi.fn().mockResolvedValue({
        playoffPreview: [
          { id: 'AL-DS-1', round: 'Division Series', bestOf: 5, home: { teamId: 'nym', teamName: 'New York Tycoons', abbreviation: 'NYT', seed: 1, placeholder: null }, away: { teamId: 'cle', teamName: 'Cleveland Forge', abbreviation: 'CLE', seed: 3, placeholder: null } },
          { id: 'WS-1', round: 'World Series', bestOf: 7, home: { teamId: null, teamName: 'AL Champion', abbreviation: 'TBD', seed: null, placeholder: 'AL Champion' }, away: { teamId: null, teamName: 'NL Champion', abbreviation: 'TBD', seed: null, placeholder: 'NL Champion' } },
        ],
      }),
      getDynastyScore: vi.fn().mockResolvedValue({ score: 215, grade: 'B' }),
      simPlayoffGame: vi.fn().mockResolvedValue({ season: 3, day: 1, phase: 'playoffs', gamesPlayed: 1 }),
      simPlayoffSeries: vi.fn().mockResolvedValue({ season: 3, day: 1, phase: 'playoffs', gamesPlayed: 3 }),
      simPlayoffRound: vi.fn().mockResolvedValue({ season: 3, day: 1, phase: 'playoffs', gamesPlayed: 8 }),
      simRemainingPlayoffs: vi.fn().mockResolvedValue({ season: 3, day: 1, phase: 'playoffs', gamesPlayed: 17 }),
    } as unknown as ReturnType<typeof useWorker>);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders the interactive bracket and postseason controls', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <PlayoffsPage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Playoffs');
    expect(container.textContent).toContain('NYY leads 1-0');
    expect(container.textContent).toContain('Sim Next Game');
    expect(container.textContent).toContain('Sim Series');
    expect(container.textContent).toContain('Sim Round');
    expect(container.textContent).toContain('Sim All');
    expect(container.textContent).toContain('Aaron Judge');
  });
});
