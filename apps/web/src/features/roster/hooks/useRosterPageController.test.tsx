import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DayOneOpeningPlan } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import { useRosterPageController } from './useRosterPageController';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useRosterPageController>[0];
type HookResult = ReturnType<typeof useRosterPageController>;

function player(overrides: Partial<PlayerDTO> = {}): PlayerDTO {
  return {
    id: 'player-1',
    firstName: 'Aaron',
    lastName: 'Everyday',
    age: 28,
    position: 'CF',
    overallRating: 70,
    displayRating: 60,
    letterGrade: 'B',
    rosterStatus: 'MLB',
    teamId: 'nym',
    serviceTimeDays: 401,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: null,
    contract: {
      years: 2,
      annualSalary: 8,
      totalValue: 16,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    ceiling: 78,
    floor: 48,
    developmentProgram: null,
    developmentTrajectory: 'stable',
    personalityTraits: [],
    extensionHistory: [],
    stats: null,
    advanced: {
      war: 4.3,
      avg: null,
      obp: null,
      slg: null,
      ops: null,
      iso: null,
      woba: null,
      wrcPlus: null,
      opsPlus: null,
      fip: null,
      xfip: null,
      whip: null,
      kPer9: null,
      bbPer9: null,
      kBb: null,
    },
    ...overrides,
  };
}

const rosterPlan: DayOneOpeningPlan = {
  lineupPlayerIds: ['ss-1', 'cf-1'],
  rotationPlayerIds: ['sp-1'],
  bullpen: {
    closerId: null,
    setupIds: [],
    longReliefId: null,
  },
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useRosterPageController(options));
  return null;
}

describe('useRosterPageController', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
    window.localStorage.clear();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    const worker: HookOptions['worker'] = {
      isReady: true,
      claimOffWaivers: vi.fn().mockResolvedValue({ success: true }),
      demotePlayer: vi.fn().mockResolvedValue({ success: true }),
      designateForAssignment: vi.fn().mockResolvedValue({ success: true }),
      getAffiliateOverview: vi.fn().mockResolvedValue(null),
      getExtensionCandidates: vi.fn().mockResolvedValue([]),
      getExtensionOffer: vi.fn().mockResolvedValue(null),
      getFullRoster: vi.fn().mockResolvedValue({
        mlb: [
          player({ id: 'cf-1', firstName: 'Tomas', lastName: 'Table', position: 'CF' }),
          player({ id: 'ss-1', firstName: 'Diego', lastName: 'Drive', position: 'SS' }),
          player({ id: 'sp-1', firstName: 'Ace', lastName: 'Starter', position: 'SP' }),
        ],
        minors: {},
      }),
      getPromotionCandidates: vi.fn().mockResolvedValue([]),
      getRosterComplianceIssues: vi.fn().mockResolvedValue(null),
      getRosterPlan: vi.fn().mockResolvedValue(rosterPlan),
      getTeamChemistry: vi.fn().mockResolvedValue(null),
      negotiateExtension: vi.fn().mockResolvedValue(null),
      promotePlayer: vi.fn().mockResolvedValue({ success: true }),
      updateRosterPlan: vi.fn().mockResolvedValue({
        success: true,
        plan: { ...rosterPlan, lineupPlayerIds: ['cf-1', 'ss-1'] },
      }),
    };

    return {
      autosaveActiveGame: vi.fn().mockResolvedValue(undefined),
      game: {
        activeSaveId: 'save-root',
        activeSaveSlot: 2,
        day: 97,
        isInitialized: true,
        phase: 'regular',
        season: 5,
        userTeamId: 'nym',
      },
      worker,
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
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        assertion();
        return;
      } catch (error) {
        lastError = error;
      }
      await act(async () => {
        await Promise.resolve();
      });
    }
    throw lastError;
  }

  it('builds roster content props from existing hooks and persists lineup changes through typed worker APIs', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.contentProps.activeTab).toBe('mlb');
      expect(latestResult?.contentProps.statusPanelProps.activeRosterCount).toBe(3);
      expect(latestResult?.contentProps.mlbControlPanelProps.hitters.map((row) => row.id))
        .toEqual(['cf-1', 'ss-1']);
      expect(latestResult?.contentProps.mlbControlPanelProps.pitchers.map((row) => row.id))
        .toEqual(['sp-1']);
      expect(latestResult?.contentProps.lineupPanelProps.lineupPlayers.map((row) => row.id))
        .toEqual(['ss-1', 'cf-1']);
    });

    act(() => {
      latestResult?.contentProps.onChangeTab('lineup');
    });
    expect(latestResult?.contentProps.activeTab).toBe('lineup');

    act(() => {
      latestResult?.contentProps.lineupPanelProps.onLineupReorder(['cf-1', 'ss-1']);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(options.worker.updateRosterPlan).toHaveBeenCalledWith({ lineupPlayerIds: ['cf-1', 'ss-1'] });
    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: 5 });
  });
});
