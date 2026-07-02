import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { DashboardSummary } from '../lib/dashboardPageTransforms';
import { useDashboardPageController } from './useDashboardPageController';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useDashboardPageController>[0];
type HookResult = ReturnType<typeof useDashboardPageController>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useDashboardPageController(options));
  return null;
}

function buildSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    franchise: {
      teamName: 'New York Tycoons',
      abbreviation: 'NYT',
      gmName: 'Alex Rivera',
      difficulty: 'hard',
      welcomeBriefingPending: false,
      season: 1,
      record: '0-0',
      division: 'AL_EAST',
      divisionRank: 1,
      dynasty: { score: 0, grade: 'C' },
      status: 'active',
      endReason: null,
      owner: null,
      chemistry: null,
      frontOffice: null,
    },
    fanSentiment: { score: 52, trend: 'stable', summary: 'The market is waiting.' },
    challenge: null,
    momentum: {
      last10: '0-0',
      streak: 'W0',
      runDifferential: 0,
      seasonRunDiffPerGame: 0,
      last30RunDiffPerGame: 0,
      playoffProbability: 0,
    },
    roster: {
      topPerformers: [],
      injuredCount: 1,
      nextReturnDays: 6,
      fatigueWarnings: [
        {
          playerId: 'p-fatigue',
          name: 'Tired Starter',
          position: 'SP',
          fatigueScore: 84,
          summary: 'Needs a breather.',
        },
      ],
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
    ...overrides,
  };
}

function createWorkerMock(overrides: Partial<HookOptions['worker']> = {}): HookOptions['worker'] {
  return {
    isReady: true,
    applyForJob: vi.fn().mockResolvedValue(null),
    dismissWelcomeBriefing: vi.fn().mockResolvedValue({ success: true }),
    exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34 }),
    getDashboardSummary: vi.fn().mockResolvedValue(buildSummary()),
    getGamePlayByPlay: vi.fn().mockResolvedValue(null),
    getGMCareer: vi.fn().mockResolvedValue({
      currentTeamId: 'nym',
      reputation: 64,
      overallRecord: { wins: 0, losses: 0 },
      careerHistory: [{ teamId: 'nym', firedSeason: null }],
      jobSearchActive: false,
      lastFiredReason: null,
    }),
    getJobMarket: vi.fn().mockResolvedValue({ availableJobs: [] }),
    getOffseasonHeadline: vi.fn().mockResolvedValue(null),
    getRecentGameRecaps: vi.fn().mockResolvedValue([]),
    getScheduleView: vi.fn().mockResolvedValue([
      { day: 1, isCompleted: false },
      { day: 2, isCompleted: false },
    ]),
    getSeasonRecap: vi.fn().mockResolvedValue(null),
    simDay: vi.fn().mockResolvedValue({ season: 1, day: 2, phase: 'regular', playerCount: 780 }),
    simMonth: vi.fn().mockResolvedValue({ season: 1, day: 31, phase: 'regular', playerCount: 780 }),
    simWeek: vi.fn().mockResolvedValue({ season: 1, day: 8, phase: 'regular', playerCount: 780 }),
    ...overrides,
  } as HookOptions['worker'];
}

function createGameState(overrides: Partial<HookOptions['game']> = {}): HookOptions['game'] {
  return {
    activeSaveId: 'save-root',
    activeSaveSlot: null,
    day: 1,
    gmName: 'Alex Rivera',
    initializeGame: vi.fn(),
    isInitialized: true,
    phase: 'regular',
    playerCount: 780,
    season: 1,
    teamName: 'New York Tycoons',
    updateFromSim: vi.fn(),
    userTeamId: 'nym',
    ...overrides,
  };
}

describe('useDashboardPageController', () => {
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
    localStorage.clear();
    vi.clearAllMocks();
  });

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

  it('builds dashboard content props from route data, schedule flags, and action handlers', async () => {
    const worker = createWorkerMock();
    const game = createGameState();
    const autosaveActiveGame = vi.fn().mockResolvedValue(undefined);

    await renderHook({ autosaveActiveGame, game, worker });

    await waitForAssertion(() => {
      expect(latestResult?.pageShellLoading).toBe(false);
      expect(latestResult?.contentProps.summary?.franchise.teamName).toBe('New York Tycoons');
      expect(latestResult?.contentProps.attentionItems.map((item) => item.id)).toContain('roster-health');
      expect(latestResult?.contentProps.showOpeningDayChecklist).toBe(true);
      expect(latestResult?.contentProps.userTeamId).toBe('nym');
    });

    await act(async () => {
      latestResult?.contentProps.onSimDay();
      await Promise.resolve();
    });

    await waitForAssertion(() => {
      expect(worker.simDay).toHaveBeenCalledTimes(1);
      expect(game.updateFromSim).toHaveBeenCalledWith({
        season: 1,
        day: 2,
        phase: 'regular',
        playerCount: 780,
      });
      expect(autosaveActiveGame).toHaveBeenCalledWith({ season: 1 });
    });
  });
});
