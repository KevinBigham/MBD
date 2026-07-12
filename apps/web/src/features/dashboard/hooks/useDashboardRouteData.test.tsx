import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useDashboardRouteData } from './useDashboardRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useDashboardRouteData>[0];
type HookResult = ReturnType<typeof useDashboardRouteData>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useDashboardRouteData(options));
  return null;
}

const dashboardSummary = {
  franchise: {
    teamName: 'New York Tycoons',
    abbreviation: 'NYT',
    gmName: 'Alex Rivera',
    difficulty: 'hard',
    welcomeBriefingPending: false,
    season: 4,
    record: '50-38',
    division: 'AL_EAST',
    divisionRank: 1,
    dynasty: { score: 215, grade: 'B' },
    status: 'active',
    endReason: null,
    owner: null,
    chemistry: null,
    frontOffice: {
      reputation: 64,
      summary: 'The front office has built real credibility around the league.',
    },
  },
  fanSentiment: { score: 63, trend: 'rising', summary: 'The city is buying in.' },
  challenge: null,
  momentum: {
    last10: '7-3',
    streak: 'W3',
    runDifferential: 21,
    seasonRunDiffPerGame: 0.24,
    last30RunDiffPerGame: 0.48,
    playoffProbability: 74,
  },
  roster: {
    topPerformers: [],
    injuredCount: 0,
    nextReturnDays: null,
    fatigueWarnings: [],
    payroll: 212.4,
    budget: 235,
    luxuryTax: 16.2,
  },
  intel: {
    tradeInboxCount: 0,
    expiringContracts: [],
    topProspect: null,
    rivalries: [],
  },
  tradeIntel: {
    daysUntilDeadline: 34,
    deadlineMode: false,
    activeTradeOffers: 0,
    recentSummary: null,
    recentTrades: [],
  },
  farmIntel: { topProspects: [], recentMoves: [] },
  storylinesToWatch: [],
  divisionStandings: [],
  pressRoom: {
    latest: null,
    feed: [],
    briefingCount: 0,
    newsCount: 0,
    unreadCount: 0,
  },
  thisDayInHistory: null,
};

const career = {
  currentTeamId: 'nym',
  reputation: 64,
  overallRecord: { wins: 312, losses: 254 },
  careerHistory: [{ teamId: 'nym', firedSeason: null }],
  jobSearchActive: false,
  lastFiredReason: null,
};

const jobMarket = { availableJobs: [] };
const recaps = [
  { gameIndex: 101, recap: 'Tycoons win the opener.', highlights: [], playByPlay: [], boxScore: null },
  { gameIndex: 102, recap: 'Boston answers late.', highlights: [], playByPlay: [], boxScore: null },
];
const playByPlay = new Map([
  [101, { gameIndex: 101, recap: 'Tycoons win the opener.', highlights: [], plays: [], boxScore: null }],
  [102, { gameIndex: 102, recap: 'Boston answers late.', highlights: [], plays: [], boxScore: null }],
]);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('useDashboardRouteData', () => {
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
      day: 88,
      getDashboardSummary: vi.fn().mockResolvedValue(dashboardSummary),
      getGamePlayByPlay: vi.fn().mockImplementation(async (gameIndex: number) => playByPlay.get(gameIndex) ?? null),
      getGMCareer: vi.fn().mockResolvedValue(career),
      getJobMarket: vi.fn().mockResolvedValue(jobMarket),
      getOffseasonHeadline: vi.fn().mockResolvedValue({ season: 4, headline: 'October left a live title window' }),
      getRecentGameRecaps: vi.fn().mockResolvedValue(recaps),
      getScheduleView: vi.fn().mockResolvedValue([
        {
          day: 88,
          opponentId: 'bos',
          opponentName: 'Boston Noreasters',
          opponentAbbr: 'BOS',
          isHome: true,
          isCompleted: false,
        },
      ]),
      getSeasonRecap: vi.fn().mockResolvedValue({
        season: 4,
        recap: 'A 94-68 season kept the Tycoons in the story.',
        storylines: ['The title window stayed open.'],
      }),
      isInitialized: true,
      phase: 'regular',
      season: 4,
      workerReady: true,
      ...overrides,
    };
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
    for (let attempt = 0; attempt < 20; attempt += 1) {
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

  it('loads dashboard data and selects the first recent recap for play-by-play', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.loading).toBe(false);
      expect(latestResult?.summary?.franchise.teamName).toBe('New York Tycoons');
      expect(latestResult?.career?.currentTeamId).toBe('nym');
      expect(latestResult?.jobMarket?.availableJobs).toEqual([]);
      expect(latestResult?.recentRecaps).toEqual(recaps);
      expect(latestResult?.scheduleEntries?.[0]?.day).toBe(88);
      expect(latestResult?.selectedGameIndex).toBe(101);
      expect(latestResult?.selectedGameDetail?.gameIndex).toBe(101);
      expect(latestResult?.playByPlayLoading).toBe(false);
    });

    expect(options.getRecentGameRecaps).toHaveBeenCalledWith(3);
    expect(options.getSeasonRecap).not.toHaveBeenCalled();
    expect(options.getOffseasonHeadline).not.toHaveBeenCalled();
    expect(options.getGamePlayByPlay).toHaveBeenCalledWith(101);
  });

  it('fetches play-by-play when the selected game changes', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.selectedGameDetail?.gameIndex).toBe(101);
    });

    await act(async () => {
      latestResult?.setSelectedGameIndex(102);
    });

    await waitForAssertion(() => {
      expect(latestResult?.selectedGameIndex).toBe(102);
      expect(latestResult?.selectedGameDetail?.gameIndex).toBe(102);
    });

    expect(options.getGamePlayByPlay).toHaveBeenCalledWith(102);
  });

  it('loads offseason narrative queries only during offseason', async () => {
    const options = baseOptions({
      getRecentGameRecaps: vi.fn().mockResolvedValue([]),
      getScheduleView: undefined,
      phase: 'offseason',
    });
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.loading).toBe(false);
      expect(latestResult?.scheduleEntries).toBeNull();
      expect(latestResult?.selectedGameIndex).toBeNull();
      expect(latestResult?.seasonRecap?.recap).toContain('94-68');
      expect(latestResult?.offseasonHeadline?.headline).toContain('title window');
    });

    expect(options.getSeasonRecap).toHaveBeenCalledWith(4);
    expect(options.getOffseasonHeadline).toHaveBeenCalledWith(4);
    expect(options.getGamePlayByPlay).not.toHaveBeenCalled();
  });

  it('lets a strict post-durable refresh supersede an older normal request without stale publish or loading cleanup', async () => {
    const normalSummary = deferred<unknown>();
    const strictSummary = deferred<unknown>();
    const strictDashboard = {
      ...dashboardSummary,
      franchise: { ...dashboardSummary.franchise, teamName: 'Durable Season 5 Tycoons', season: 5 },
    };
    const getDashboardSummary = vi.fn()
      .mockReturnValueOnce(normalSummary.promise)
      .mockReturnValueOnce(strictSummary.promise);
    const options = baseOptions({ getDashboardSummary });
    await renderHook(options);
    let strict!: Promise<void>;
    await act(async () => {
      strict = latestResult!.fetchDashboardData({
        throwOnError: true,
        context: { season: 5, phase: 'offseason' },
      });
      await Promise.resolve();
    });
    expect(getDashboardSummary).toHaveBeenCalledTimes(2);

    await act(async () => {
      normalSummary.resolve(dashboardSummary);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latestResult?.loading).toBe(true);
    expect(latestResult?.summary).toBeNull();

    await act(async () => {
      strictSummary.resolve(strictDashboard);
      await strict;
    });
    expect(latestResult?.loading).toBe(false);
    expect(latestResult?.summary?.franchise.teamName).toBe('Durable Season 5 Tycoons');
    expect(options.getSeasonRecap).toHaveBeenCalledWith(5);
    expect(options.getOffseasonHeadline).toHaveBeenCalledWith(5);
  });

  it('does not admit an ordinary refresh while a strict refresh owns presentation', async () => {
    const strictSummary = deferred<unknown>();
    const options = baseOptions();
    await renderHook(options);
    await waitForAssertion(() => expect(latestResult?.loading).toBe(false));
    vi.mocked(options.getDashboardSummary).mockReturnValueOnce(strictSummary.promise);
    let strict!: Promise<void>;
    await act(async () => {
      strict = latestResult!.fetchDashboardData({ throwOnError: true });
      await Promise.resolve();
      await latestResult!.fetchDashboardData();
    });
    expect(options.getDashboardSummary).toHaveBeenCalledTimes(2);
    await act(async () => { strictSummary.resolve(dashboardSummary); await strict; });
    expect(latestResult?.loading).toBe(false);
  });

  it('rethrows strict refresh rejection, clears loading, and releases the strict epoch', async () => {
    const options = baseOptions();
    await renderHook(options);
    await waitForAssertion(() => expect(latestResult?.loading).toBe(false));
    vi.mocked(options.getDashboardSummary).mockRejectedValueOnce(new Error('strict dashboard rejected'));
    let rejection: unknown;
    await act(async () => {
      try {
        await latestResult!.fetchDashboardData({ throwOnError: true });
      } catch (error) {
        rejection = error;
      }
    });
    expect(rejection).toEqual(expect.objectContaining({ message: 'strict dashboard rejected' }));
    expect(latestResult?.loading).toBe(false);

    await act(async () => { await latestResult!.fetchDashboardData(); });
    expect(options.getDashboardSummary).toHaveBeenCalledTimes(3);
    expect(latestResult?.loading).toBe(false);
  });
});
