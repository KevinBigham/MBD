import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useTradeMultiTeamRosters } from './useTradeMultiTeamRosters';
import type { MultiTeamLaneState } from '../components/MultiTeamLaneCard';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useTradeMultiTeamRosters>[0];
type HookResult = ReturnType<typeof useTradeMultiTeamRosters>;

function makePlayer(id: string, displayRating: number, lastName: string): PlayerDTO {
  return {
    id,
    firstName: 'Test',
    lastName,
    age: 25,
    position: 'SS',
    overallRating: displayRating,
    displayRating,
    letterGrade: 'B',
    rosterStatus: 'MLB',
    teamId: 'sea',
    serviceTimeDays: 172,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: null,
    contract: {
      years: 1,
      annualSalary: 1.2,
      totalValue: 1.2,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    ceiling: displayRating + 5,
    floor: displayRating - 5,
    developmentProgram: null,
    developmentTrajectory: 'on_track',
    extensionHistory: [],
    stats: null,
    advanced: null,
  };
}

function makeLane(laneId: string, teamId: string): MultiTeamLaneState {
  return {
    laneId,
    teamId,
    role: 'facilitator',
    outgoing: [],
  };
}

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  const result = useTradeMultiTeamRosters(options);
  onRender(result);
  return null;
}

describe('useTradeMultiTeamRosters', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latest = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latest = result;
      }} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest).toBeTruthy();
    return latest as HookResult;
  }

  it('does not load lane rosters until the multi-team builder opens', async () => {
    const getTeamRoster = vi.fn().mockResolvedValue([]);

    const result = await renderHook({
      isOpen: false,
      isInitialized: true,
      workerReady: true,
      lanes: [makeLane('lane-1', 'sea')],
      getTeamRoster,
    });

    expect(getTeamRoster).not.toHaveBeenCalled();
    expect(result.multiTeamRosters).toEqual({});
  });

  it('loads each distinct missing lane roster once and preserves cached rosters', async () => {
    const cachedUserPlayer = makePlayer('nym-1', 74, 'Cached');
    const lowerRated = makePlayer('sea-1', 62, 'Young');
    const higherRated = makePlayer('sea-2', 81, 'Kirby');
    const getTeamRoster = vi.fn().mockResolvedValue([lowerRated, higherRated]);
    const closedOptions = {
      isOpen: false,
      isInitialized: true,
      workerReady: true,
      lanes: [makeLane('lane-1', 'nym'), makeLane('lane-2', 'sea'), makeLane('lane-3', 'sea')],
      getTeamRoster,
    };

    let result = await renderHook(closedOptions);
    await act(async () => {
      result.setMultiTeamRosters({ nym: [cachedUserPlayer] });
    });

    result = await renderHook({
      ...closedOptions,
      isOpen: true,
    });

    expect(getTeamRoster).toHaveBeenCalledTimes(1);
    expect(getTeamRoster).toHaveBeenCalledWith('sea');
    expect(result.multiTeamRosters.nym).toEqual([cachedUserPlayer]);
    const loadedRoster = result.multiTeamRosters.sea;
    expect(loadedRoster).toBeDefined();
    expect(loadedRoster?.map((player) => player.id)).toEqual(['sea-2', 'sea-1']);
  });
});
