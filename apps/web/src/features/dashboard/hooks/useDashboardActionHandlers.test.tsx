import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { DashboardSummary } from '../lib/dashboardPageTransforms';
import { useDashboardActionHandlers } from './useDashboardActionHandlers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useDashboardActionHandlers>[0];
type HookResult = ReturnType<typeof useDashboardActionHandlers>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useDashboardActionHandlers(options));
  return null;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
}

function buildSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
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
      frontOffice: null,
    },
    fanSentiment: {
      score: 52,
      trend: 'stable',
      summary: 'The market is waiting to see the next move.',
    },
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
      daysUntilDeadline: null,
      deadlineMode: false,
      activeTradeOffers: 0,
      recentSummary: null,
      recentTrades: [],
    },
    farmIntel: {
      topProspects: [],
      recentMoves: [],
    },
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

describe('useDashboardActionHandlers', () => {
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
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      applyForJob: vi.fn().mockResolvedValue({
        success: true,
        teamId: 'bos',
        teamName: 'Boston Noreasters',
      }),
      autosaveActiveGame: vi.fn().mockResolvedValue(undefined),
      day: 88,
      dismissWelcomeBriefing: vi.fn().mockResolvedValue({ success: true }),
      fetchDashboardData: vi.fn().mockResolvedValue(undefined),
      initializeGame: vi.fn(),
      phase: 'regular',
      playerCount: 780,
      season: 4,
      summary: buildSummary(),
      updateFromSim: vi.fn(),
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

  it('runs a quick sim, applies the result, refreshes dashboard data, autosaves the result season, and clears busy state', async () => {
    const simDeferred = createDeferred<{ season: number; day: number; phase: string; gamesPlayed?: number }>();
    const options = baseOptions();
    await renderHook(options);

    let pendingSim: Promise<void> | null = null;
    await act(async () => {
      pendingSim = latestResult?.handleSim('day', () => simDeferred.promise) ?? null;
      await Promise.resolve();
    });

    expect(latestResult?.simAction).toBe('day');
    expect(options.updateFromSim).not.toHaveBeenCalled();
    expect(options.fetchDashboardData).not.toHaveBeenCalled();
    expect(options.autosaveActiveGame).not.toHaveBeenCalled();

    const simResult = { season: 5, day: 12, phase: 'regular', gamesPlayed: 93 };
    await act(async () => {
      simDeferred.resolve(simResult);
      await pendingSim;
    });

    expect(options.updateFromSim).toHaveBeenCalledWith(simResult);
    expect(options.fetchDashboardData).toHaveBeenCalledTimes(1);
    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: 5 });
    expect(latestResult?.simAction).toBeNull();
  });

  it('applies for a new job with franchise fallbacks, refreshes dashboard data, autosaves the current season, and clears busy state', async () => {
    const applyDeferred = createDeferred<{ success: boolean; teamId: string; teamName: string }>();
    const options = baseOptions({
      applyForJob: vi.fn().mockReturnValue(applyDeferred.promise),
    });
    await renderHook(options);

    let pendingApply: Promise<void> | null = null;
    await act(async () => {
      pendingApply = latestResult?.handleApplyForJob('bos') ?? null;
      await Promise.resolve();
    });

    expect(latestResult?.applyingTeamId).toBe('bos');
    expect(options.applyForJob).toHaveBeenCalledWith('bos');
    expect(options.initializeGame).not.toHaveBeenCalled();

    await act(async () => {
      applyDeferred.resolve({ success: true, teamId: 'bos', teamName: 'Boston Noreasters' });
      await pendingApply;
    });

    expect(options.initializeGame).toHaveBeenCalledWith({
      season: 4,
      day: 88,
      phase: 'regular',
      playerCount: 780,
      userTeamId: 'bos',
      teamName: 'Boston Noreasters',
      gmName: 'Alex Rivera',
      difficulty: 'hard',
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
    });
    expect(options.fetchDashboardData).toHaveBeenCalledTimes(1);
    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: 4 });
    expect(latestResult?.applyingTeamId).toBeNull();
  });

  it('dismisses the welcome briefing, refreshes dashboard data, and autosaves the current season', async () => {
    const options = baseOptions();
    const hook = await renderHook(options);

    await act(async () => {
      await hook.handleDismissWelcomeBriefing();
    });

    expect(options.dismissWelcomeBriefing).toHaveBeenCalledTimes(1);
    expect(options.fetchDashboardData).toHaveBeenCalledTimes(1);
    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: 4 });
  });
});
