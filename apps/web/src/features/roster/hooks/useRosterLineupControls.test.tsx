import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DayOneOpeningPlan } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import { useRosterLineupControls } from './useRosterLineupControls';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useRosterLineupControls>[0];
type HookResult = ReturnType<typeof useRosterLineupControls>;

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

const mlbRoster: PlayerDTO[] = [
  player({ id: 'cf-1', firstName: 'Tomas', lastName: 'Table', position: 'CF', displayRating: 72 }),
  player({ id: 'ss-1', firstName: 'Diego', lastName: 'Drive', position: 'SS', displayRating: 77 }),
  player({ id: 'c-1', firstName: 'Cal', lastName: 'Catcher', position: 'C', displayRating: 68 }),
  player({ id: 'c-2', firstName: 'Ben', lastName: 'Backup', position: 'C', displayRating: 61 }),
  player({ id: 'sp-1', firstName: 'Ace', lastName: 'Starter', position: 'SP', displayRating: 82 }),
  player({ id: 'sp-2', firstName: 'Milo', lastName: 'Second', position: 'SP', displayRating: 74 }),
  player({ id: 'rp-1', firstName: 'Riley', lastName: 'Relief', position: 'RP', displayRating: 66 }),
  player({ id: 'cl-1', firstName: 'Casey', lastName: 'Closer', position: 'CL', displayRating: 80 }),
];

const rosterPlan: DayOneOpeningPlan = {
  lineupPlayerIds: ['ss-1', 'cf-1'],
  rotationPlayerIds: ['sp-1', 'sp-2'],
  bullpen: {
    closerId: 'cl-1',
    setupIds: ['rp-1'],
    longReliefId: 'sp-2',
  },
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useRosterLineupControls(options));
  return null;
}

describe('useRosterLineupControls', () => {
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
    return {
      activeSaveId: null,
      activeSaveSlot: 2,
      autosaveActiveGame: vi.fn().mockResolvedValue(undefined),
      mlbRoster,
      rosterPlan,
      season: 5,
      setRosterPlan: vi.fn(),
      updateRosterPlan: vi.fn().mockResolvedValue({ success: true, plan: rosterPlan }),
      userTeamId: 'nym',
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

  it('loads save-scoped depth preferences and builds lineup panel props from roster plan order', async () => {
    window.localStorage.setItem('mbd:roster-depth-plan:slot-2:nym', JSON.stringify({ C: ['c-2', 'c-1'] }));

    await renderHook(baseOptions());

    expect(latestResult?.hitters.map((player) => player.id)).toEqual(['cf-1', 'ss-1', 'c-1', 'c-2']);
    expect(latestResult?.pitchers.map((player) => player.id)).toEqual(['sp-1', 'sp-2', 'rp-1', 'cl-1']);
    expect(latestResult?.lineupPanelProps.lineupPlayers.map((player) => player.id)).toEqual(['ss-1', 'cf-1', 'c-1', 'c-2']);
    expect(latestResult?.lineupPanelProps.rotationPlayers.map((player) => player.id)).toEqual(['sp-1', 'sp-2']);
    expect(latestResult?.lineupPanelProps.depthChartGroups.find((group) => group.position === 'C')?.players.map((player) => player.id))
      .toEqual(['c-2', 'c-1']);
  });

  it('persists lineup and pitcher depth changes through the existing roster-plan and autosave callbacks', async () => {
    const options = baseOptions({
      updateRosterPlan: vi.fn()
        .mockResolvedValueOnce({ success: true, plan: { ...rosterPlan, lineupPlayerIds: ['cf-1', 'ss-1'] } })
        .mockResolvedValueOnce({ success: true, plan: { ...rosterPlan, rotationPlayerIds: ['sp-2', 'sp-1'] } }),
    });
    await renderHook(options);

    act(() => {
      latestResult?.lineupPanelProps.onLineupReorder(['cf-1', 'ss-1', 'c-1', 'c-2']);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(options.updateRosterPlan).toHaveBeenCalledWith({ lineupPlayerIds: ['cf-1', 'ss-1', 'c-1', 'c-2'] });
    expect(options.setRosterPlan).toHaveBeenCalledWith(expect.objectContaining({ lineupPlayerIds: ['cf-1', 'ss-1'] }));
    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: 5 });

    act(() => {
      latestResult?.lineupPanelProps.onDepthReorder('SP', ['sp-2', 'sp-1']);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(window.localStorage.getItem('mbd:roster-depth-plan:slot-2:nym')).toBe(JSON.stringify({ SP: ['sp-2', 'sp-1'] }));
    expect(options.updateRosterPlan).toHaveBeenLastCalledWith(expect.objectContaining({
      rotationPlayerIds: ['sp-2', 'sp-1'],
      bullpen: expect.objectContaining({
        closerId: 'cl-1',
      }),
    }));
  });

  it('keeps non-pitcher depth changes local and skips roster-plan persistence when no worker callback is available', async () => {
    const options = baseOptions({ updateRosterPlan: undefined });
    await renderHook(options);

    act(() => {
      latestResult?.lineupPanelProps.onDepthReorder('C', ['c-2', 'c-1']);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(window.localStorage.getItem('mbd:roster-depth-plan:slot-2:nym')).toBe(JSON.stringify({ C: ['c-2', 'c-1'] }));
    expect(options.autosaveActiveGame).not.toHaveBeenCalled();
  });
});
