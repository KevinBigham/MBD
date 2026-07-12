import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { DashboardSummary } from '../lib/dashboardPageTransforms';
import { useDashboardPageController } from './useDashboardPageController';
import { isSimAdvanceCoordinatorBusy, useSimAdvanceExecutor } from '@/shared/hooks/useSimAdvanceExecutor';
import { useGameStore } from '@/shared/hooks/useGameStore';

vi.mock('@/shared/hooks/useSimAdvanceExecutor', () => ({
  useSimAdvanceExecutor: vi.fn(),
  isSimAdvanceCoordinatorBusy: vi.fn(() => false),
}));

const mockedUseSimAdvanceExecutor = vi.mocked(useSimAdvanceExecutor);
const mockedIsSimAdvanceCoordinatorBusy = vi.mocked(isSimAdvanceCoordinatorBusy);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useDashboardPageController>[0];
type HookResult = ReturnType<typeof useDashboardPageController>;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

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
    simAdvance: {},
    simLegacyAdvance: vi.fn(),
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
    mockedIsSimAdvanceCoordinatorBusy.mockReturnValue(false);
    useGameStore.getState().setActiveSave('save-root', 1);
    useGameStore.getState().setInitialized(true);
    useGameStore.getState().setPhase('regular');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
    mockedUseSimAdvanceExecutor.mockReturnValue({
      execute: vi.fn().mockResolvedValue({ kind: 'durable' }),
      status: { kind: 'idle' },
    } as unknown as ReturnType<typeof useSimAdvanceExecutor>);
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
      expect(mockedUseSimAdvanceExecutor.mock.results[0]?.value.execute).toHaveBeenCalledWith('sim_day');
      expect(game.updateFromSim).not.toHaveBeenCalled();
      expect(autosaveActiveGame).not.toHaveBeenCalled();
    });
  });

  it('projects coordinator busy into rendered dashboard sim controls', async () => {
    mockedUseSimAdvanceExecutor.mockReturnValue({ execute: vi.fn(), status: { kind: 'running', operation: 'sim_day' } } as unknown as ReturnType<typeof useSimAdvanceExecutor>);
    await renderHook({ autosaveActiveGame: vi.fn(), game: createGameState(), worker: createWorkerMock() });
    await waitForAssertion(() => expect(latestResult?.contentProps.simBusy).toBe(true));
    expect(latestResult?.contentProps.onSimDay).toBeTypeOf('function'); expect(latestResult?.contentProps.onSimWeek).toBeTypeOf('function'); expect(latestResult?.contentProps.onSimMonth).toBeTypeOf('function');
  });

  it('keeps playoff dashboard handlers rendered and projects a held local legacy simulation as busy', async () => {
    let resolveLegacy!: (value: { season: number; day: number; phase: string; success: boolean }) => void;
    const simLegacyAdvance = vi.fn().mockReturnValue(new Promise((resolve) => { resolveLegacy = resolve; }));
    const worker = createWorkerMock({ simLegacyAdvance });
    const game = createGameState({ phase: 'playoffs' });
    useGameStore.getState().setPhase('playoffs');
    const autosaveActiveGame = vi.fn().mockResolvedValue({ saved: true });
    await renderHook({ autosaveActiveGame, game, worker });
    await waitForAssertion(() => {
      expect(latestResult?.contentProps.onSimDay).toBeTypeOf('function');
      expect(latestResult?.contentProps.onSimWeek).toBeTypeOf('function');
      expect(latestResult?.contentProps.onSimMonth).toBeTypeOf('function');
    });
    await act(async () => { latestResult?.contentProps.onSimDay(); await Promise.resolve(); });
    expect(simLegacyAdvance).toHaveBeenCalledWith('simDay', 'playoffs');
    await waitForAssertion(() => expect(latestResult?.contentProps.simBusy).toBe(true));
    await act(async () => { resolveLegacy({ season: 1, day: 2, phase: 'playoffs', success: true }); await Promise.resolve(); await Promise.resolve(); });
    await waitForAssertion(() => expect(latestResult?.contentProps.simBusy).toBe(false));
  });

  it('projects held playoff legacy work as busy while keeping every sim control represented', async () => {
    const legacy = createDeferred<{ season: number; day: number; phase: string; gamesPlayed: number }>();
    const simLegacyAdvance = vi.fn().mockReturnValue(legacy.promise);
    const autosaveActiveGame = vi.fn().mockResolvedValue({ saved: true });
    const game = createGameState({ phase: 'playoffs' });
    useGameStore.getState().setPhase('playoffs');

    await renderHook({
      autosaveActiveGame,
      game,
      worker: createWorkerMock({ simLegacyAdvance }),
    });

    expect(latestResult?.contentProps.onSimDay).toBeTypeOf('function');
    expect(latestResult?.contentProps.onSimWeek).toBeTypeOf('function');
    expect(latestResult?.contentProps.onSimMonth).toBeTypeOf('function');

    await act(async () => {
      latestResult?.contentProps.onSimDay();
      await Promise.resolve();
    });

    await waitForAssertion(() => {
      expect(simLegacyAdvance).toHaveBeenCalledWith('simDay', 'playoffs');
      expect(latestResult?.contentProps.simBusy).toBe(true);
    });

    await act(async () => {
      legacy.resolve({ season: 1, day: 1, phase: 'playoffs', gamesPlayed: 4 });
      await legacy.promise;
      await Promise.resolve();
    });

    await waitForAssertion(() => {
      expect(latestResult?.contentProps.simBusy).toBe(false);
      expect(autosaveActiveGame).toHaveBeenCalledTimes(1);
    });
  });
});
