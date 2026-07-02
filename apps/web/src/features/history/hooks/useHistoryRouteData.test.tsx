import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useHistoryRouteData } from './useHistoryRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useHistoryRouteData>[0];
type HookResult = ReturnType<typeof useHistoryRouteData>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useHistoryRouteData(options));
  return null;
}

const seasonHistory = [
  {
    season: 1,
    championTeamId: 'bos',
    runnerUpTeamId: 'nym',
    worldSeriesRecord: '4-2',
    summary: 'Boston closed the first chapter.',
    awards: [],
    keyMoments: ['New York reached October early.'],
    statLeaders: { hr: [], rbi: [], avg: [], era: [], k: [], w: [] },
    notableRetirements: [],
    blockbusterTrades: [],
    userSeason: {
      teamId: 'nym',
      record: '88-74',
      playoffResult: 'Championship Series exit',
      storylines: ['The run ended one round short.'],
    },
  },
  {
    season: 2,
    championTeamId: 'nym',
    runnerUpTeamId: 'lax',
    worldSeriesRecord: '4-2',
    summary: 'New York finished the climb.',
    awards: [],
    keyMoments: ['Mike Trout changed the lineup ceiling.'],
    statLeaders: {
      hr: [{ playerId: 'player-mvp', teamId: 'nym', value: '44', summary: '44 HR' }],
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
      record: '97-65',
      playoffResult: 'Champion',
      storylines: ['Won the World Series in six games.'],
    },
  },
];

function archiveFor(season: number) {
  return {
    season,
    standings: [
      { teamId: 'nym', wins: season === 2 ? 97 : 88, losses: season === 2 ? 65 : 74, divisionRank: 1, gamesBack: 0 },
      { teamId: 'bos', wins: 91, losses: 71, divisionRank: 2, gamesBack: 6 },
    ],
    playoffSeries: [],
    awards: [],
    statLeaders: { hr: [], rbi: [], avg: [], era: [], k: [], w: [] },
    transactions: [],
    draftClass: [],
    financials: [{ teamId: 'nym', payroll: season === 2 ? 245 : 220, budget: season === 2 ? 255 : 235 }],
    userSummary: {
      teamId: 'nym',
      record: season === 2 ? '97-65' : '88-74',
      playoffResult: season === 2 ? 'Champion' : 'Championship Series exit',
      storylines: [],
    },
    timelineEvents: [],
  };
}

describe('useHistoryRouteData', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      compareSeasons: vi.fn().mockResolvedValue({
        userTeamId: 'nym',
        left: { season: 1, userSummary: seasonHistory[0]?.userSeason, financials: [{ teamId: 'nym', payroll: 220, budget: 235 }] },
        right: { season: 2, userSummary: seasonHistory[1]?.userSeason, financials: [{ teamId: 'nym', payroll: 245, budget: 255 }] },
        deltas: { wins: 9, payroll: 25, budget: 20 },
      }),
      compareWithBranch: vi.fn().mockResolvedValue({
        branchMeta: {
          id: 'branch-1',
          saveId: 'branch-1',
          branchedAtSeason: 2,
          branchedAtDay: 80,
          description: 'Aggressive deadline push',
          createdAt: '2026-04-04T00:00:00.000Z',
        },
        recordDelta: {
          parent: { wins: 88, losses: 74, pct: 0.543 },
          branch: { wins: 94, losses: 68, pct: 0.58 },
          delta: 6,
        },
        standingsDelta: {
          parent: { divisionRank: 2, gamesBack: 4 },
          branch: { divisionRank: 1, gamesBack: 0 },
          delta: 1,
        },
        rosterDelta: { parent: ['Mike Trout'], branch: ['Mike Trout', 'Spencer Jones'], added: ['Spencer Jones'], lost: [], delta: 1 },
        championshipsDelta: { parent: 0, branch: 1, delta: 1 },
        tradesDelta: { parent: 1, branch: 3, delta: 2 },
      }),
      getAchievements: vi.fn().mockResolvedValue([
        { id: 'champion', name: 'Champion', unlocked: true },
      ]),
      getAllTimeLeaders: vi.fn().mockResolvedValue({
        batting: [],
        pitching: [],
      }),
      getAwardHistory: vi.fn().mockResolvedValue([
        { season: 2, award: 'MVP', league: 'AL', playerId: 'player-mvp', teamId: 'nym', summary: 'Mike Trout carried the offense.' },
      ]),
      getAwardRaces: vi.fn().mockResolvedValue({
        mvp: [{ playerId: 'player-mvp', teamId: 'nym', score: 99, summary: 'The lineup is running through one elite bat.' }],
        cyYoung: [],
        roy: [],
      }),
      getBranches: vi.fn().mockResolvedValue([
        {
          id: 'branch-1',
          season: 3,
          day: 88,
          phase: 'regular',
          parentSaveId: 'save-slot-1',
          isRootSave: false,
          branchMeta: {
            id: 'branch-1',
            saveId: 'branch-1',
            branchedAtSeason: 2,
            branchedAtDay: 80,
            description: 'Aggressive deadline push',
            createdAt: '2026-04-04T00:00:00.000Z',
          },
        },
      ]),
      getDynastyCards: vi.fn().mockResolvedValue([
        { id: 'card-1', title: 'The First Flag', textSummary: 'The Tycoons broke through.' },
      ]),
      getDynastyLeaderboard: vi.fn().mockResolvedValue([
        { id: 'live-1', slotNumber: 1, teamId: 'nym', season: 2, gmName: 'Alex Rivera', score: 215 },
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
      getFranchiseTimeline: vi.fn().mockResolvedValue([
        { season: 2, record: '97-65', playoffResult: 'Champion', championship: true, keyAcquisitions: [], keyDepartures: [], dynastyScore: 215 },
      ]),
      getHallOfFame: vi.fn().mockResolvedValue([]),
      getHistoryOverview: vi.fn().mockResolvedValue({ seasonViews: [] }),
      getRecordBook: vi.fn().mockResolvedValue({
        franchise: [
          {
            id: 'franchise:nym:hr',
            scope: 'franchise',
            teamId: 'nym',
            category: 'individual_single_season',
            stat: 'hr',
            label: 'Most Home Runs',
            qualifier: null,
            holders: [{ playerId: 'player-mvp', playerName: 'Mike Trout', teamId: 'nym', season: 2, value: 44, displayValue: '44' }],
            trackingFromSeason: null,
            note: null,
          },
        ],
        league: [],
      }),
      getRecordWatchList: vi.fn().mockResolvedValue([]),
      getRivalries: vi.fn().mockResolvedValue([]),
      getSeasonArchive: vi.fn().mockImplementation(async (archiveSeason?: number) => archiveFor(archiveSeason ?? 2)),
      getSeasonHistory: vi.fn().mockResolvedValue(seasonHistory),
      isInitialized: true,
      listLeaderboardEntries: vi.fn().mockResolvedValue([
        { id: 'stored-1', slotNumber: 1, teamId: 'nym', season: 2, gmName: 'Alex Rivera', score: 215 },
        { id: 'stored-2', slotNumber: 2, teamId: 'bos', season: 2, gmName: 'Casey Stone', score: 160 },
      ]),
      resolveHistoryDisplayNames: vi.fn().mockResolvedValue({
        players: { 'player-mvp': 'Mike Trout' },
        teams: { nym: 'New York Tycoons', bos: 'Boston Noreasters', lax: 'Los Angeles Lightning' },
      }),
      userTeamId: 'nym',
      workerReady: true,
      ...overrides,
    } as HookOptions;
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  async function waitForAssertion(assertion: () => void) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        assertion();
        return;
      } catch (error) {
        lastError = error;
      }
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      });
    }
    throw lastError;
  }

  it('loads history route data, archived season fallbacks, initial comparison, branch comparisons, and merged leaderboard entries', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.loading).toBe(false);
      expect(latestResult?.seasonHistory).toHaveLength(2);
      expect(Object.keys(latestResult?.seasonViews ?? {}).sort()).toEqual(['1', '2']);
      expect(latestResult?.selectedSeason).toBe(2);
      expect(latestResult?.comparisonSeason).toBe(1);
      expect(latestResult?.seasonComparison?.deltas.wins).toBe(9);
      expect(latestResult?.displayNames.players['player-mvp']).toBe('Mike Trout');
      expect(latestResult?.branches).toHaveLength(1);
      expect(latestResult?.timelineComparisons).toHaveLength(1);
      expect(latestResult?.leaderboardEntries.map((entry) => entry.id)).toEqual(['stored-1', 'stored-2']);
      expect(latestResult?.selectedAchievementId).toBe('champion');
      expect(latestResult?.allTimeLeaders).toEqual({ batting: [], pitching: [] });
    });

    expect(options.getSeasonArchive).toHaveBeenCalledWith(2);
    expect(options.getSeasonArchive).toHaveBeenCalledWith(1);
    expect(options.compareSeasons).toHaveBeenCalledWith(1, 2);
    expect(options.getBranches).toHaveBeenCalledWith('save-slot-1');
    expect(options.compareWithBranch).toHaveBeenCalledWith('save-slot-1', 'branch-1');
    expect(options.resolveHistoryDisplayNames).toHaveBeenCalledWith(
      expect.arrayContaining(['player-mvp']),
      expect.arrayContaining(['nym']),
    );
  });

  it('uses history overview season views without falling back to per-season archive queries', async () => {
    const options = baseOptions({
      getHistoryOverview: vi.fn().mockResolvedValue({ seasonViews: [archiveFor(4), archiveFor(3)] }),
      getSeasonHistory: vi.fn().mockResolvedValue([]),
    });
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.loading).toBe(false);
      expect(Object.keys(latestResult?.seasonViews ?? {}).sort()).toEqual(['3', '4']);
      expect(latestResult?.selectedSeason).toBe(4);
      expect(latestResult?.comparisonSeason).toBe(3);
    });

    expect(options.getSeasonArchive).not.toHaveBeenCalled();
    expect(options.compareSeasons).toHaveBeenCalledWith(3, 4);
  });

  it('does not query worker history before initialization and readiness', async () => {
    const options = baseOptions({ isInitialized: false, workerReady: false });
    await renderHook(options);

    await act(async () => {
      await Promise.resolve();
    });

    expect(latestResult?.loading).toBe(true);
    expect(options.getAwardRaces).not.toHaveBeenCalled();
    expect(options.getSeasonHistory).not.toHaveBeenCalled();
    expect(options.listLeaderboardEntries).not.toHaveBeenCalled();
  });
});
