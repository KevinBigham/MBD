import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import HistoryPage from './HistoryPage';
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

describe('HistoryPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 162,
      phase: 'offseason',
      isInitialized: true,
      userTeamId: 'nyy',
      teamName: 'Yankees',
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
      getAwardRaces: vi.fn().mockResolvedValue({
        mvp: [{
          playerId: 'player-mvp',
          teamId: 'nyy',
          score: 99,
          summary: 'The lineup is running through one elite bat.',
        }],
        cyYoung: [{
          playerId: 'player-cy',
          teamId: 'bos',
          score: 95,
          summary: 'He has owned the zone all year.',
        }],
        roy: [{
          playerId: 'player-roy',
          teamId: 'bal',
          score: 88,
          summary: 'The rookie class has a clear frontrunner.',
        }],
      }),
      getAwardHistory: vi.fn().mockResolvedValue([
        {
          season: 2,
          award: 'MVP',
          league: 'AL',
          playerId: 'player-mvp',
          teamId: 'nyy',
          summary: 'Mike Trout carried the offense all summer.',
        },
      ]),
      getSeasonHistory: vi.fn().mockResolvedValue([
        {
          season: 2,
          championTeamId: 'nyy',
          runnerUpTeamId: 'lad',
          worldSeriesRecord: '4-2',
          summary: 'New York survived a heavyweight October bracket.',
          awards: [{
            season: 2,
            award: 'MVP',
            league: 'AL',
            playerId: 'player-mvp',
            teamId: 'nyy',
            summary: 'Mike Trout carried the offense all summer.',
          }],
          keyMoments: ['Mike Trout changed the lineup ceiling.'],
          statLeaders: {
            hr: [{ playerId: 'player-mvp', teamId: 'nyy', value: '44', summary: '44 HR' }],
            rbi: [{ playerId: 'player-rbi', teamId: 'nyy', value: '131', summary: '131 RBI' }],
            avg: [{ playerId: 'player-avg', teamId: 'tor', value: '.350', summary: '.350 AVG' }],
            era: [{ playerId: 'player-era', teamId: 'bos', value: '2.61', summary: '2.61 ERA' }],
            k: [{ playerId: 'player-k', teamId: 'bos', value: '236', summary: '236 K' }],
            w: [{ playerId: 'player-w', teamId: 'sea', value: '20', summary: '20 W' }],
          },
          notableRetirements: [{
            playerId: 'player-retire',
            teamId: 'nyy',
            seasonsPlayed: 14,
            overallRating: 78,
            summary: 'A franchise fixture walked away after 14 seasons.',
          }],
          blockbusterTrades: [{
            headline: 'Deadline blockbuster reshaped the race',
            summary: 'The Yankees bought aggressively at the deadline.',
            playerIds: ['player-mvp'],
            teamIds: ['nyy', 'lad'],
          }],
          userSeason: {
            teamId: 'nyy',
            record: '97-65',
            playoffResult: 'Champion',
            storylines: ['Won the World Series in six games.'],
          },
        },
      ]),
      getRivalries: vi.fn().mockResolvedValue([
        {
          id: 'nyy-bos',
          teamA: 'nyy',
          teamB: 'bos',
          intensity: 84,
          summary: 'Every series is carrying real postseason weight.',
          reasons: ['division race', 'recent playoffs'],
        },
      ]),
      getHallOfFame: vi.fn().mockResolvedValue([
        {
          playerId: 'player-hof',
          playerName: 'Derek Jeter',
          position: 'SS',
          seasonsPlayed: 18,
          teamIds: ['nyy'],
          inductionSeason: 5,
          score: 91,
          inductionType: 'first_ballot',
          careerStats: {
            batting: { hits: 312, hr: 42, rbi: 155 },
            pitching: null,
          },
        },
      ]),
      getFranchiseTimeline: vi.fn().mockResolvedValue([
        {
          season: 2,
          record: '97-65',
          playoffResult: 'Champion',
          championship: true,
          keyAcquisitions: ['Deadline blockbuster reshaped the race'],
          keyDepartures: ['Anthony Rizzo retired'],
          dynastyScore: 215,
        },
      ]),
      getDynastyScore: vi.fn().mockResolvedValue({
        score: 215,
        grade: 'B',
        breakdown: {
          championships: 1,
          worldSeriesAppearances: 1,
          playoffAppearances: 1,
          ninetyWinSeasons: 1,
          divisionTitles: 1,
          losingSeasons: 0,
          awardWinners: 1,
        },
      }),
      getAchievements: vi.fn().mockResolvedValue([
        {
          id: 'champion',
          category: 'dynasty',
          name: 'Champion',
          description: 'Win the World Series.',
          metric: 'championships',
          target: 1,
          progressLabel: 'World Series titles',
          unlocked: true,
          unlockedAt: 'S2D180',
          unlockSummary: 'Won the World Series.',
          progress: {
            current: 1,
            target: 1,
            summary: 'World Series titles',
          },
        },
        {
          id: 'decade',
          category: 'longevity',
          name: 'Decade',
          description: 'Stay with one club for 10 seasons.',
          metric: 'seasonsManaged',
          target: 10,
          progressLabel: 'Seasons managed',
          unlocked: false,
          unlockedAt: null,
          unlockSummary: null,
          progress: {
            current: 2,
            target: 10,
            summary: 'Seasons managed',
          },
        },
      ]),
      resolveHistoryDisplayNames: vi.fn().mockResolvedValue({
        players: {
          'player-mvp': 'Mike Trout',
          'player-cy': 'Gerrit Cole',
          'player-roy': 'Jackson Holliday',
          'player-rbi': 'Aaron Judge',
          'player-avg': 'Bo Bichette',
          'player-era': 'Chris Sale',
          'player-k': 'Gerrit Cole',
          'player-w': 'Logan Gilbert',
          'player-retire': 'Anthony Rizzo',
        },
        teams: {
          nyy: 'New York Yankees',
          bos: 'Boston Red Sox',
          bal: 'Baltimore Orioles',
          tor: 'Toronto Blue Jays',
          sea: 'Seattle Mariners',
          lad: 'Los Angeles Dodgers',
        },
      }),
    } as unknown as ReturnType<typeof useWorker>);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders resolved names and rich season recap content', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <HistoryPage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Mike Trout');
    expect(container.textContent).toContain('New York Yankees');
    expect(container.textContent).toContain('Boston Red Sox');
    expect(container.textContent).toContain('Season 2 Recap');
    expect(container.textContent).toContain('New York Yankees def. Los Angeles Dodgers (4-2)');
    expect(container.textContent).toContain('Anthony Rizzo');
    expect(container.textContent).toContain('Deadline blockbuster reshaped the race');
    expect(container.textContent).toContain('97-65');
    expect(container.textContent).toContain('Hall of Fame');
    expect(container.textContent).toContain('Derek Jeter');
    expect(container.textContent).toContain('Dynasty Score');
    expect(container.textContent).toContain('Franchise Timeline');
    expect(container.textContent).toContain('Trophy Room');
    expect(container.textContent).toContain('Champion');
    expect(container.textContent).toContain('2 / 10');
    expect(container.textContent).not.toContain('player-mvp');
    expect(container.textContent).not.toContain('nyy vs bos');
  });

  it('renders a trophy room empty state before any achievements are unlocked', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getAwardRaces: vi.fn().mockResolvedValue(null),
      getAwardHistory: vi.fn().mockResolvedValue([]),
      getSeasonHistory: vi.fn().mockResolvedValue([]),
      getRivalries: vi.fn().mockResolvedValue([]),
      getHallOfFame: vi.fn().mockResolvedValue([]),
      getFranchiseTimeline: vi.fn().mockResolvedValue([]),
      getDynastyScore: vi.fn().mockResolvedValue({
        score: 0,
        grade: 'F',
        breakdown: {
          championships: 0,
          worldSeriesAppearances: 0,
          playoffAppearances: 0,
          ninetyWinSeasons: 0,
          divisionTitles: 0,
          losingSeasons: 0,
          awardWinners: 0,
        },
      }),
      getAchievements: vi.fn().mockResolvedValue([
        {
          id: 'decade',
          category: 'longevity',
          name: 'Decade',
          description: 'Stay with one club for 10 seasons.',
          unlocked: false,
          unlockedAt: null,
          unlockSummary: null,
          progress: {
            current: 0,
            target: 10,
            summary: 'Seasons managed',
          },
        },
      ]),
      resolveHistoryDisplayNames: vi.fn().mockResolvedValue({
        players: {},
        teams: {},
      }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <HistoryPage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('No achievements unlocked yet');
    expect(container.textContent).toContain('Keep pushing seasons, titles, and milestones to fill the trophy room.');
  });
});
