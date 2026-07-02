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
      userTeamId: 'nym',
      teamName: 'Tycoons',
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
          teamId: 'nym',
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
          teamId: 'nym',
          summary: 'Mike Trout carried the offense all summer.',
        },
      ]),
      getSeasonHistory: vi.fn().mockResolvedValue([
        {
          season: 1,
          championTeamId: 'hou',
          runnerUpTeamId: 'nym',
          worldSeriesRecord: '4-3',
          summary: 'Houston survived a seven-game classic.',
          awards: [],
          keyMoments: ['The Tycoons fell one win short.'],
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
            teamId: 'nym',
            record: '88-74',
            playoffResult: 'Championship Series exit',
            storylines: ['Came up short late in October.'],
          },
        },
        {
          season: 2,
          championTeamId: 'nym',
          runnerUpTeamId: 'lax',
          worldSeriesRecord: '4-2',
          summary: 'New York survived a heavyweight October bracket.',
          awards: [{
            season: 2,
            award: 'MVP',
            league: 'AL',
            playerId: 'player-mvp',
            teamId: 'nym',
            summary: 'Mike Trout carried the offense all summer.',
          }],
          keyMoments: ['Mike Trout changed the lineup ceiling.'],
          statLeaders: {
            hr: [{ playerId: 'player-mvp', teamId: 'nym', value: '44', summary: '44 HR' }],
            rbi: [{ playerId: 'player-rbi', teamId: 'nym', value: '131', summary: '131 RBI' }],
            avg: [{ playerId: 'player-avg', teamId: 'cha', value: '.350', summary: '.350 AVG' }],
            era: [{ playerId: 'player-era', teamId: 'bos', value: '2.61', summary: '2.61 ERA' }],
            k: [{ playerId: 'player-k', teamId: 'bos', value: '236', summary: '236 K' }],
            w: [{ playerId: 'player-w', teamId: 'sea', value: '20', summary: '20 W' }],
          },
          notableRetirements: [{
            playerId: 'player-retire',
            teamId: 'nym',
            seasonsPlayed: 14,
            overallRating: 78,
            summary: 'A franchise fixture walked away after 14 seasons.',
          }],
          blockbusterTrades: [{
            headline: 'Deadline blockbuster reshaped the race',
            summary: 'The Tycoons bought aggressively at the deadline.',
            playerIds: ['player-mvp'],
            teamIds: ['nym', 'lax'],
          }],
          userSeason: {
            teamId: 'nym',
            record: '97-65',
            playoffResult: 'Champion',
            storylines: ['Won the World Series in six games.'],
          },
        },
      ]),
      getHistoryOverview: vi.fn().mockResolvedValue({ seasonViews: [] }),
      getSeasonArchive: vi.fn().mockImplementation(async (season?: number) => {
        if (season === 1) {
          return {
            season: 1,
            standings: [
              { teamId: 'nym', wins: 88, losses: 74, divisionRank: 2, gamesBack: 5 },
            ],
            playoffSeries: [
              { round: 'CHAMPIONSHIP_SERIES', winnerTeamId: 'hou', loserTeamId: 'nym', result: '4-2' },
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
                teamIds: ['nym'],
                impactScore: 76,
              },
            ],
            draftClass: [
              {
                pickNumber: 12,
                playerId: 'pick-1',
                playerName: 'Jorge Mendez',
                teamId: 'nym',
                currentStatus: 'AAA',
              },
            ],
            financials: [
              { teamId: 'nym', payroll: 220, budget: 235 },
            ],
            userSummary: {
              teamId: 'nym',
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
            { teamId: 'nym', wins: 97, losses: 65, divisionRank: 1, gamesBack: 0 },
            { teamId: 'bos', wins: 92, losses: 70, divisionRank: 2, gamesBack: 5 },
            { teamId: 'lax', wins: 98, losses: 64, divisionRank: 1, gamesBack: 0 },
          ],
          playoffSeries: [
            { round: 'ALCS', winnerTeamId: 'nym', loserTeamId: 'hou', result: '4-1' },
            { round: 'WORLD_SERIES', winnerTeamId: 'nym', loserTeamId: 'lax', result: '4-2' },
          ],
          awards: [{
            season: 2,
            award: 'MVP',
            league: 'AL',
            playerId: 'player-mvp',
            teamId: 'nym',
            summary: 'Mike Trout carried the offense all summer.',
          }],
          statLeaders: {
            hr: [{ playerId: 'player-mvp', teamId: 'nym', value: '44', summary: '44 HR' }],
            rbi: [{ playerId: 'player-rbi', teamId: 'nym', value: '131', summary: '131 RBI' }],
            avg: [{ playerId: 'player-avg', teamId: 'cha', value: '.350', summary: '.350 AVG' }],
            era: [{ playerId: 'player-era', teamId: 'bos', value: '2.61', summary: '2.61 ERA' }],
            k: [{ playerId: 'player-k', teamId: 'bos', value: '236', summary: '236 K' }],
            w: [{ playerId: 'player-w', teamId: 'sea', value: '20', summary: '20 W' }],
          },
          transactions: [
            {
              headline: 'Deadline blockbuster reshaped the race',
              summary: 'The Tycoons bought aggressively at the deadline.',
              playerIds: ['player-mvp'],
              teamIds: ['nym', 'lax'],
              impactScore: 91,
            },
          ],
          draftClass: [
            {
              pickNumber: 8,
              playerId: 'pick-2',
              playerName: 'Calvin Velez',
              teamId: 'nym',
              currentStatus: 'AA',
            },
          ],
          financials: [
            { teamId: 'nym', payroll: 245, budget: 255 },
            { teamId: 'bos', payroll: 231, budget: 240 },
          ],
          userSummary: {
            teamId: 'nym',
            record: '97-65',
            playoffResult: 'Champion',
            storylines: ['Won the World Series in six games.'],
          },
          timelineEvents: ['Won the World Series', 'Deadline blockbuster reshaped the race'],
        };
      }),
      compareSeasons: vi.fn().mockResolvedValue({
        userTeamId: 'nym',
        left: {
          season: 1,
          userSummary: {
            teamId: 'nym',
            record: '88-74',
            playoffResult: 'Championship Series exit',
            storylines: ['Came up short late in October.'],
          },
          financials: [{ teamId: 'nym', payroll: 220, budget: 235 }],
        },
        right: {
          season: 2,
          userSummary: {
            teamId: 'nym',
            record: '97-65',
            playoffResult: 'Champion',
            storylines: ['Won the World Series in six games.'],
          },
          financials: [{ teamId: 'nym', payroll: 245, budget: 255 }],
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
            teamId: 'nym',
            category: 'individual_single_season',
            stat: 'hr',
            label: 'Most Home Runs',
            qualifier: null,
            holders: [{
              playerId: 'player-mvp',
              playerName: 'Mike Trout',
              teamId: 'nym',
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
          teamId: 'nym',
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
          teamA: 'nym',
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
          teamIds: ['nym'],
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
          playerMomentBeats: [
            {
              playerId: 'player-breakout',
              teamId: 'nym',
              type: 'rookie_breakout',
              label: 'Breakout Season',
              summary: 'Rafael Diaz forced his way into the core with a loud rookie season.',
              relevance: 0.97,
              day: 162,
            },
            {
              playerId: 'player-injury',
              teamId: 'nym',
              type: 'injury_return_hero',
              label: 'Injury Return',
              summary: 'Mina Stone came back from a long absence and carried September.',
              relevance: 0.94,
              day: 152,
            },
          ],
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
      getBranches: vi.fn().mockResolvedValue([
        {
          id: 'branch-1',
          slotNumber: null,
          season: 5,
          day: 88,
          phase: 'regular',
          parentSaveId: 'save-slot-1',
          isRootSave: false,
          branchMeta: {
            id: 'branch-1',
            saveId: 'branch-1',
            branchedAtSeason: 4,
            branchedAtDay: 62,
            description: 'Aggressive deadline push',
            createdAt: '2026-04-04T00:00:00.000Z',
          },
        },
      ]),
      compareWithBranch: vi.fn().mockResolvedValue({
        branchMeta: {
          id: 'branch-1',
          saveId: 'branch-1',
          branchedAtSeason: 4,
          branchedAtDay: 62,
          description: 'Aggressive deadline push',
          createdAt: '2026-04-04T00:00:00.000Z',
        },
        recordDelta: {
          parent: { wins: 85, losses: 77, pct: 0.525 },
          branch: { wins: 91, losses: 71, pct: 0.562 },
          delta: 6,
        },
        standingsDelta: {
          parent: { divisionRank: 2, gamesBack: 4 },
          branch: { divisionRank: 1, gamesBack: 0 },
          delta: 1,
        },
        rosterDelta: {
          parent: ['Aaron Judge'],
          branch: ['Aaron Judge', 'Spencer Jones'],
          added: ['Spencer Jones'],
          lost: [],
          delta: 1,
        },
        championshipsDelta: { parent: 0, branch: 1, delta: 1 },
        tradesDelta: { parent: 1, branch: 3, delta: 2 },
      }),
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
          'player-breakout': 'Rafael Diaz',
          'player-injury': 'Mina Stone',
          'pick-2': 'Calvin Velez',
        },
        teams: {
          nym: 'New York Tycoons',
          bos: 'Boston Noreasters',
          bal: 'Baltimore Crab Cakes',
          tor: 'Charlotte Weavers',
          sea: 'Seattle Drizzle',
          lax: 'Los Angeles Lightning',
          lad: 'Los Angeles Sunset Strip',
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

    expect(container.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('Boston Noreasters');
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
    expect(container.textContent).toContain('NYT 8-5 BOS');
    expect(container.textContent).toContain('Historical record');
    expect(container.textContent).toContain('NYT 144-132 BOS');

    await clickButton('timeline');
    expect(container.textContent).toContain('Aggressive deadline push');
    expect(container.textContent).toContain('91-71');
    expect(container.textContent).toContain('Spencer Jones');

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

  it('renders dynasty timeline chapters with expand or collapse behavior and recap reuse', async () => {
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

    await clickButton('timeline');

    const chapterToggle = container.querySelector<HTMLButtonElement>('[data-testid="dynasty-chapter-toggle"]');
    expect(chapterToggle).toBeTruthy();
    expect(chapterToggle?.textContent).toContain('Peak Years');
    expect(chapterToggle?.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('Anthony Rizzo retired');
    expect(container.textContent).toContain('Timeline Memory');
    expect(container.textContent).toContain('Defining Trade');
    expect(container.textContent).toContain('Draft Pick #8');
    expect(container.textContent).toContain('AL MVP');
    expect(container.textContent).toContain('Retirement');
    expect(container.textContent).toContain('Breakout Season');
    expect(container.textContent).toContain('Injury Return');
    expect(container.textContent).toContain('Mike Trout');
    expect(container.textContent).toContain('Rafael Diaz');
    expect(container.textContent).toContain('Mina Stone');
    expect(container.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('Los Angeles Lightning');
    expect(container.querySelector('a[href="/players/player-mvp"]')?.textContent).toContain('Mike Trout');
    expect(container.querySelector('a[href="/players/player-breakout"]')?.textContent).toContain('Rafael Diaz');
    expect(container.querySelector('a[href="/players/player-injury"]')?.textContent).toContain('Mina Stone');
    expect(container.querySelector('[data-testid="timeline-memory-team"]')?.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('Open Recap');

    await act(async () => {
      chapterToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(chapterToggle?.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).not.toContain('Open Recap');

    await act(async () => {
      chapterToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await clickButton('Open Recap');
    expect(container.textContent).toContain('Year in Review');
    expect(container.textContent).toContain('Season 2');
  });

  it('renders a trophy room empty state before any achievements are unlocked', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getAwardRaces: vi.fn().mockResolvedValue(null),
      getAwardHistory: vi.fn().mockResolvedValue([]),
      getSeasonHistory: vi.fn().mockResolvedValue([]),
      getHistoryOverview: vi.fn().mockResolvedValue({ seasonViews: [] }),
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
      getBranches: vi.fn().mockResolvedValue([]),
      compareWithBranch: vi.fn().mockResolvedValue(null),
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

  it('hides the timeline tab when no what-if branches exist', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getAwardRaces: vi.fn().mockResolvedValue(null),
      getAwardHistory: vi.fn().mockResolvedValue([]),
      getSeasonHistory: vi.fn().mockResolvedValue([]),
      getHistoryOverview: vi.fn().mockResolvedValue({ seasonViews: [] }),
      getSeasonArchive: vi.fn().mockResolvedValue(null),
      compareSeasons: vi.fn().mockResolvedValue(null),
      getRecordBook: vi.fn().mockResolvedValue({ franchise: [], league: [] }),
      getRecordWatchList: vi.fn().mockResolvedValue([]),
      getRivalries: vi.fn().mockResolvedValue([]),
      getHallOfFame: vi.fn().mockResolvedValue([]),
      getFranchiseTimeline: vi.fn().mockResolvedValue([]),
      getDynastyScore: vi.fn().mockResolvedValue(null),
      getAchievements: vi.fn().mockResolvedValue([]),
      getDynastyCards: vi.fn().mockResolvedValue([]),
      getDynastyLeaderboard: vi.fn().mockResolvedValue([]),
      getBranches: vi.fn().mockResolvedValue([]),
      compareWithBranch: vi.fn().mockResolvedValue(null),
      resolveHistoryDisplayNames: vi.fn().mockResolvedValue({ players: {}, teams: {} }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <HistoryPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const timelineButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.trim().toLowerCase() === 'timeline');

    expect(timelineButton).toBeUndefined();
  });
});
