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
      activeSaveId: 'save-slot-1',
      setSeason: vi.fn(),
      setDay: vi.fn(),
      setPhase: vi.fn(),
      setSimulating: vi.fn(),
      setInitialized: vi.fn(),
      setUserTeamId: vi.fn(),
      updateFromSim: vi.fn(),
      initializeGame: vi.fn(),
      activeSaveSlot: 1,
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
          season: 1,
          championTeamId: 'hou',
          runnerUpTeamId: 'nyy',
          worldSeriesRecord: '4-3',
          summary: 'Houston survived a seven-game classic.',
          awards: [],
          keyMoments: ['The Yankees fell one win short.'],
          statLeaders: {
            hr: [],
            rbi: [],
            avg: [],
            era: [],
            k: [],
            w: [],
          },
          notableRetirements: [],
          blockbusterTrades: [],
          userSeason: {
            teamId: 'nyy',
            record: '88-74',
            playoffResult: 'Championship Series exit',
            storylines: ['Came up short late in October.'],
          },
        },
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
      getSeasonArchive: vi.fn().mockImplementation(async (season?: number) => {
        if (season === 1) {
          return {
            season: 1,
            standings: [
              { teamId: 'nyy', wins: 88, losses: 74, divisionRank: 2, gamesBack: 5 },
            ],
            playoffSeries: [
              { round: 'CHAMPIONSHIP_SERIES', winnerTeamId: 'hou', loserTeamId: 'nyy', result: '4-2' },
            ],
            awards: [],
            statLeaders: {
              hr: [],
              rbi: [],
              avg: [],
              era: [],
              k: [],
              w: [],
            },
            transactions: [
              {
                headline: 'Midwinter reset thinned the roster',
                summary: 'New York cleared payroll and prospect space.',
                playerIds: ['player-mvp'],
                teamIds: ['nyy'],
                impactScore: 76,
              },
            ],
            draftClass: [
              {
                pickNumber: 12,
                playerId: 'pick-1',
                playerName: 'Jorge Mendez',
                teamId: 'nyy',
                currentStatus: 'AAA',
              },
            ],
            financials: [
              { teamId: 'nyy', payroll: 220, budget: 235 },
            ],
            userSummary: {
              teamId: 'nyy',
              record: '88-74',
              playoffResult: 'Championship Series exit',
              storylines: ['Came up short late in October.'],
            },
            timelineEvents: ['Reached the ALCS'],
          };
        }

        return {
          season: 2,
          standings: [
            { teamId: 'nyy', wins: 97, losses: 65, divisionRank: 1, gamesBack: 0 },
            { teamId: 'bos', wins: 92, losses: 70, divisionRank: 2, gamesBack: 5 },
            { teamId: 'lad', wins: 98, losses: 64, divisionRank: 1, gamesBack: 0 },
          ],
          playoffSeries: [
            { round: 'ALCS', winnerTeamId: 'nyy', loserTeamId: 'hou', result: '4-1' },
            { round: 'WORLD_SERIES', winnerTeamId: 'nyy', loserTeamId: 'lad', result: '4-2' },
          ],
          awards: [{
            season: 2,
            award: 'MVP',
            league: 'AL',
            playerId: 'player-mvp',
            teamId: 'nyy',
            summary: 'Mike Trout carried the offense all summer.',
          }],
          statLeaders: {
            hr: [{ playerId: 'player-mvp', teamId: 'nyy', value: '44', summary: '44 HR' }],
            rbi: [{ playerId: 'player-rbi', teamId: 'nyy', value: '131', summary: '131 RBI' }],
            avg: [{ playerId: 'player-avg', teamId: 'tor', value: '.350', summary: '.350 AVG' }],
            era: [{ playerId: 'player-era', teamId: 'bos', value: '2.61', summary: '2.61 ERA' }],
            k: [{ playerId: 'player-k', teamId: 'bos', value: '236', summary: '236 K' }],
            w: [{ playerId: 'player-w', teamId: 'sea', value: '20', summary: '20 W' }],
          },
          transactions: [
            {
              headline: 'Deadline blockbuster reshaped the race',
              summary: 'The Yankees bought aggressively at the deadline.',
              playerIds: ['player-mvp'],
              teamIds: ['nyy', 'lad'],
              impactScore: 91,
            },
          ],
          draftClass: [
            {
              pickNumber: 8,
              playerId: 'pick-2',
              playerName: 'Calvin Velez',
              teamId: 'nyy',
              currentStatus: 'AA',
            },
          ],
          financials: [
            { teamId: 'nyy', payroll: 245, budget: 255 },
            { teamId: 'bos', payroll: 231, budget: 240 },
          ],
          userSummary: {
            teamId: 'nyy',
            record: '97-65',
            playoffResult: 'Champion',
            storylines: ['Won the World Series in six games.'],
          },
          timelineEvents: ['Won the World Series', 'Deadline blockbuster reshaped the race'],
        };
      }),
      compareSeasons: vi.fn().mockResolvedValue({
        userTeamId: 'nyy',
        left: {
          season: 1,
          userSummary: {
            teamId: 'nyy',
            record: '88-74',
            playoffResult: 'Championship Series exit',
            storylines: ['Came up short late in October.'],
          },
          financials: [{ teamId: 'nyy', payroll: 220, budget: 235 }],
        },
        right: {
          season: 2,
          userSummary: {
            teamId: 'nyy',
            record: '97-65',
            playoffResult: 'Champion',
            storylines: ['Won the World Series in six games.'],
          },
          financials: [{ teamId: 'nyy', payroll: 245, budget: 255 }],
        },
        deltas: {
          wins: 9,
          payroll: 25,
          budget: 20,
        },
      }),
      getRecordBook: vi.fn().mockResolvedValue({
        franchise: [
          {
            id: 'franchise:nyy:individual_single_season:hr',
            scope: 'franchise',
            teamId: 'nyy',
            category: 'individual_single_season',
            stat: 'hr',
            label: 'Most Home Runs',
            qualifier: null,
            holders: [{
              playerId: 'player-mvp',
              playerName: 'Mike Trout',
              teamId: 'nyy',
              season: 2,
              value: 44,
              displayValue: '44',
            }],
            trackingFromSeason: null,
            note: null,
          },
        ],
        league: [],
      }),
      getRecordWatchList: vi.fn().mockResolvedValue([
        {
          id: 'watch-1',
          recordId: 'franchise:nyy:individual_single_season:hr',
          playerId: 'player-mvp',
          playerName: 'Mike Trout',
          teamId: 'nyy',
          recordLabel: 'Most Home Runs',
          currentValue: 24,
          projectedValue: 61,
          holderValue: 44,
          progressRatio: 0.55,
          summary: 'Mike Trout is on pace for 61 HR. Franchise record is 44.',
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
          origin: 'historical',
          currentSeasonWinsA: 8,
          currentSeasonWinsB: 5,
          historicalWinsA: 144,
          historicalWinsB: 132,
          eventHistory: [],
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

  async function clickButton(label: string) {
    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.includes(label));
    expect(button).toBeTruthy();
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

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

    expect(container.textContent).toContain('New York Yankees');
    expect(container.textContent).toContain('Boston Red Sox');
    expect(container.textContent).toContain('Season Browser');
    expect(container.textContent).toContain('Compare Seasons');
    expect(container.textContent).toContain('Season 2 vs Season 1');
    expect(container.textContent).toContain('Calvin Velez');
    expect(container.textContent).toContain('Payroll');
    expect(container.textContent).toContain('$245.0M');

    await clickButton('leaders');
    expect(container.textContent).toContain('Mike Trout');

    await clickButton('records');
    expect(container.textContent).toContain('Records');
    expect(container.textContent).toContain('Most Home Runs');
    expect(container.textContent).toContain('Mike Trout is on pace for 61 HR');
    expect(container.textContent).toContain('Origin');
    expect(container.textContent).toContain('Historical');
    expect(container.textContent).toContain('Current season');
    expect(container.textContent).toContain('NYY 8-5 BOS');
    expect(container.textContent).toContain('Historical record');
    expect(container.textContent).toContain('NYY 144-132 BOS');

    await clickButton('timeline');
    expect(container.textContent).toContain('Dynasty Timeline');
    expect(container.textContent).toContain('Franchise Timeline');

    await clickButton('Awards / HOF');
    expect(container.textContent).toContain('Hall of Fame');
    expect(container.textContent).toContain('Derek Jeter');
    expect(container.textContent).toContain('Dynasty Score');
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

    await clickButton('Awards / HOF');
    expect(container.textContent).toContain('No achievements unlocked yet');
    expect(container.textContent).toContain('Keep pushing seasons, titles, and milestones to fill the trophy room.');
  });
});
