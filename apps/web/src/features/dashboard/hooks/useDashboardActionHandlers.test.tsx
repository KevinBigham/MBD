import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { DashboardSummary } from '../lib/dashboardPageTransforms';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { DASHBOARD_QUICK_SIM_COMMANDS, useDashboardActionHandlers } from './useDashboardActionHandlers';

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
    useGameStore.getState().setActiveSave('save-slot-2', 2);
    useGameStore.getState().setInitialized(true);
    useGameStore.getState().setPhase('regular');
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
      autosaveActiveGame: vi.fn().mockResolvedValue({ saved: true }),
      day: 88,
      dismissWelcomeBriefing: vi.fn().mockResolvedValue({ success: true, flowStateChanged: true }),
      executeLegacySim: vi.fn().mockResolvedValue({ season: 4, day: 89, phase: 'playoffs', success: true }),
      executeRegularSim: vi.fn().mockResolvedValue({ kind: 'durable' }),
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

  it('routes a quick sim through the shared exact-save executor without local mirror, refresh, or autosave work', async () => {
    const simDeferred = createDeferred<{ kind: 'durable' }>();
    const options = baseOptions();
    options.executeRegularSim = vi.fn().mockReturnValue(simDeferred.promise);
    await renderHook(options);

    let pendingSim: Promise<void> | null = null;
    await act(async () => {
      pendingSim = latestResult?.handleSim(DASHBOARD_QUICK_SIM_COMMANDS.day) ?? null;
      await Promise.resolve();
    });

    expect(latestResult?.simAction).toBe('day');
    expect(options.executeRegularSim).toHaveBeenCalledWith('sim_day');
    expect(options.fetchDashboardData).not.toHaveBeenCalled();
    expect(options.autosaveActiveGame).not.toHaveBeenCalled();

    await act(async () => {
      simDeferred.resolve({ kind: 'durable' });
      await pendingSim;
    });

    expect(options.fetchDashboardData).not.toHaveBeenCalled();
    expect(options.autosaveActiveGame).not.toHaveBeenCalled();
    expect(latestResult?.simAction).toBeNull();
  });

  it.each([
    ['day', 'sim_day', 'simDay'], ['week', 'sim_week', 'simWeek'], ['month', 'sim_month', 'simMonth'],
  ] as const)('routes %s through journal in preseason and regular', async (key, journal, legacy) => {
    for (const phase of ['preseason', 'regular'] as const) {
      useGameStore.getState().setPhase(phase);
      const options = baseOptions({ phase });
      await renderHook(options);
      await latestResult?.handleSim(DASHBOARD_QUICK_SIM_COMMANDS[key]);
      expect(options.executeRegularSim).toHaveBeenCalledWith(journal);
      expect(options.executeLegacySim).not.toHaveBeenCalled();
      expect(options.updateFromSim).not.toHaveBeenCalled();
      latestResult = null;
    }
  });

  it.each([
    ['day', 'simDay'], ['week', 'simWeek'], ['month', 'simMonth'],
  ] as const)('routes %s through exact legacy operation in playoffs and offseason', async (key, legacy) => {
    for (const phase of ['playoffs', 'offseason'] as const) {
      useGameStore.getState().setPhase(phase);
      const options = baseOptions({ phase, autosaveActiveGame: vi.fn().mockResolvedValue({ saved: true }) });
      await renderHook(options);
      await latestResult?.handleSim(DASHBOARD_QUICK_SIM_COMMANDS[key]);
      expect(options.executeRegularSim).not.toHaveBeenCalled();
      expect(options.executeLegacySim).toHaveBeenCalledWith(legacy, phase);
      expect(options.updateFromSim).toHaveBeenCalledTimes(1);
      expect(options.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(options.autosaveActiveGame).toHaveBeenCalledTimes(1);
      expect(vi.mocked(options.autosaveActiveGame).mock.invocationCallOrder[0]!)
        .toBeLessThan(vi.mocked(options.fetchDashboardData).mock.invocationCallOrder[0]!);
      latestResult = null;
    }
  });

  it('blocks unknown, stale, failed, and duplicate legacy commands without fallback effects', async () => {
    useGameStore.getState().setPhase('draft');
    let options = baseOptions({ phase: 'draft' }); await renderHook(options);
    await latestResult?.handleSim(DASHBOARD_QUICK_SIM_COMMANDS.day);
    expect(options.executeRegularSim).not.toHaveBeenCalled(); expect(options.executeLegacySim).not.toHaveBeenCalled();
    latestResult = null;
    useGameStore.getState().setPhase('playoffs');
    options = baseOptions({ phase: 'playoffs', executeLegacySim: vi.fn().mockResolvedValue({ season: 4, day: 90, phase: 'playoffs', success: false }) });
    const hook = await renderHook(options);
    await hook.handleSim(DASHBOARD_QUICK_SIM_COMMANDS.day);
    expect(options.updateFromSim).not.toHaveBeenCalled(); expect(options.autosaveActiveGame).not.toHaveBeenCalled();
  });

  it('does not publish a held legacy A result after live save becomes B', async () => {
    const held = createDeferred<{ season: number; day: number; phase: string; success: boolean }>();
    useGameStore.getState().setPhase('playoffs');
    const options = baseOptions({ phase: 'playoffs', executeLegacySim: vi.fn().mockReturnValue(held.promise), autosaveActiveGame: vi.fn().mockResolvedValue({ saved: true }) });
    const hook = await renderHook(options); const pending = hook.handleSim(DASHBOARD_QUICK_SIM_COMMANDS.day);
    useGameStore.getState().setActiveSave('save-slot-b', 3);
    await act(async () => { held.resolve({ season: 4, day: 90, phase: 'playoffs', success: true }); await pending; });
    expect(options.updateFromSim).not.toHaveBeenCalled(); expect(options.fetchDashboardData).not.toHaveBeenCalled(); expect(options.autosaveActiveGame).not.toHaveBeenCalled();
  });

  it('does not publish a held legacy A result after authority becomes null', async () => {
    const held = createDeferred<{ season: number; day: number; phase: string; success: boolean }>();
    useGameStore.getState().setPhase('playoffs');
    const options = baseOptions({ phase: 'playoffs', executeLegacySim: vi.fn().mockReturnValue(held.promise), autosaveActiveGame: vi.fn().mockResolvedValue({ saved: true }) });
    const hook = await renderHook(options); const pending = hook.handleSim(DASHBOARD_QUICK_SIM_COMMANDS.week);
    useGameStore.getState().setActiveSave(null, null);
    await act(async () => { held.resolve({ season: 4, day: 91, phase: 'playoffs', success: true }); await pending; });
    expect(options.updateFromSim).not.toHaveBeenCalled(); expect(options.fetchDashboardData).not.toHaveBeenCalled(); expect(options.autosaveActiveGame).not.toHaveBeenCalled();
  });

  it('admits exactly one same-tick held legacy command and handles rejection without effects', async () => {
    const held = createDeferred<{ season: number; day: number; phase: string; success: boolean }>();
    useGameStore.getState().setPhase('offseason');
    const options = baseOptions({ phase: 'offseason', executeLegacySim: vi.fn().mockReturnValue(held.promise), autosaveActiveGame: vi.fn().mockResolvedValue({ saved: true }) });
    const hook = await renderHook(options); const first = hook.handleSim(DASHBOARD_QUICK_SIM_COMMANDS.month); const second = hook.handleSim(DASHBOARD_QUICK_SIM_COMMANDS.month);
    expect(options.executeLegacySim).toHaveBeenCalledTimes(1);
    await act(async () => { held.resolve({ season: 4, day: 1, phase: 'offseason', success: true }); await Promise.all([first, second]); });
    expect(options.updateFromSim).toHaveBeenCalledTimes(1); expect(options.fetchDashboardData).toHaveBeenCalledTimes(1); expect(options.autosaveActiveGame).toHaveBeenCalledTimes(1);
  });

  it('blocks rendered/live phase mismatch and handles legacy rejection without fallback', async () => {
    useGameStore.getState().setPhase('offseason');
    const mismatch = baseOptions({ phase: 'playoffs' }); const hook = await renderHook(mismatch);
    await hook.handleSim(DASHBOARD_QUICK_SIM_COMMANDS.day);
    expect(mismatch.executeRegularSim).not.toHaveBeenCalled(); expect(mismatch.executeLegacySim).not.toHaveBeenCalled();
    useGameStore.getState().setPhase('playoffs');
    const rejected = baseOptions({ phase: 'playoffs', executeLegacySim: vi.fn().mockRejectedValue(new Error('wrong phase')) }); const next = await renderHook(rejected);
    await expect(next.handleSim(DASHBOARD_QUICK_SIM_COMMANDS.day)).resolves.toBeUndefined();
    expect(rejected.updateFromSim).not.toHaveBeenCalled(); expect(rejected.fetchDashboardData).not.toHaveBeenCalled(); expect(rejected.autosaveActiveGame).not.toHaveBeenCalled();
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
    expect(vi.mocked(options.autosaveActiveGame).mock.invocationCallOrder[0]!)
      .toBeLessThan(vi.mocked(options.fetchDashboardData).mock.invocationCallOrder[0]!);
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
    expect(vi.mocked(options.autosaveActiveGame).mock.invocationCallOrder[0]!)
      .toBeLessThan(vi.mocked(options.fetchDashboardData).mock.invocationCallOrder[0]!);
  });

  it('accepts the exact legacy snapshot before a later dashboard refresh failure', async () => {
    useGameStore.getState().setPhase('playoffs');
    const options = baseOptions({
      phase: 'playoffs',
      autosaveActiveGame: vi.fn().mockResolvedValue({ saved: true }),
      fetchDashboardData: vi.fn().mockRejectedValue(new Error('dashboard read failed')),
    });
    const hook = await renderHook(options);

    await expect(hook.handleSim(DASHBOARD_QUICK_SIM_COMMANDS.day)).resolves.toBeUndefined();

    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: 4 });
    expect(options.fetchDashboardData).toHaveBeenCalledTimes(1);
    expect(vi.mocked(options.autosaveActiveGame).mock.invocationCallOrder[0]!)
      .toBeLessThan(vi.mocked(options.fetchDashboardData).mock.invocationCallOrder[0]!);
  });

  it('does not mirror a legacy simulation result until its exact autosave is durable', async () => {
    useGameStore.getState().setPhase('playoffs');
    let resolveSave!: (value: { saved: true }) => void;
    const options = baseOptions({
      phase: 'playoffs',
      autosaveActiveGame: vi.fn(() => new Promise<{ saved: true }>((resolve) => { resolveSave = resolve; })),
    });
    const hook = await renderHook(options);
    const pending = hook.handleSim(DASHBOARD_QUICK_SIM_COMMANDS.day);
    await vi.waitFor(() => expect(options.autosaveActiveGame).toHaveBeenCalledTimes(1));
    expect(options.updateFromSim).not.toHaveBeenCalled();
    expect(options.fetchDashboardData).not.toHaveBeenCalled();
    await act(async () => {
      resolveSave({ saved: true });
      await pending;
    });
    expect(options.updateFromSim).toHaveBeenCalledTimes(1);
    expect(options.fetchDashboardData).toHaveBeenCalledTimes(1);
  });

  it('does not start dashboard refresh work when exact persistence is not durable', async () => {
    const options = baseOptions({
      autosaveActiveGame: vi.fn().mockResolvedValue({ saved: false }),
    });
    const hook = await renderHook(options);

    await act(async () => {
      await hook.handleApplyForJob('bos');
      await hook.handleDismissWelcomeBriefing();
    });

    expect(options.autosaveActiveGame).toHaveBeenCalledTimes(2);
    expect(options.fetchDashboardData).not.toHaveBeenCalled();
  });
});
