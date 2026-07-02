import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import { usePlayersRouteData } from './usePlayersRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof usePlayersRouteData>[0];
type HookResult = ReturnType<typeof usePlayersRouteData>;

function makePlayer(id: string, firstName: string, hr: number): PlayerDTO {
  return {
    id,
    firstName,
    lastName: 'Slugger',
    age: 27,
    position: 'CF',
    overallRating: 73,
    displayRating: 69,
    letterGrade: 'B',
    rosterStatus: 'MLB',
    teamId: 'nym',
    serviceTimeDays: 734,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: null,
    contract: {
      years: 2,
      annualSalary: 8.5,
      totalValue: 17,
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
    floor: 61,
    developmentProgram: null,
    developmentTrajectory: 'steady',
    personalityTraits: ['Captain'],
    extensionHistory: [],
    stats: {
      pa: 280,
      ab: 250,
      hits: 78,
      doubles: 18,
      triples: 3,
      hr,
      rbi: 47,
      bb: 25,
      k: 46,
      runs: 52,
      hbp: 2,
      sacFlies: 3,
      avg: '.312',
      ip: 0,
      earnedRuns: 0,
      strikeouts: 0,
      walks: 0,
      hitsAllowed: 0,
      homeRunsAllowed: 0,
      hitBatters: 0,
      flyBallsAllowed: 0,
      wins: 0,
      losses: 0,
      era: '0.00',
    },
    advanced: null,
  };
}

const defaultPlayers = [makePlayer('player-1', 'Ada', 31)];
const searchResults = [makePlayer('player-2', 'Grace', 12)];

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(usePlayersRouteData(options));
  return null;
}

describe('usePlayersRouteData', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: HookResult | null;

  beforeEach(() => {
    vi.useFakeTimers();
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
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function makeOptions(overrides: Partial<HookOptions> = {}) {
    const getLeagueLeaders = vi.fn().mockResolvedValue(defaultPlayers);
    const searchPlayers = vi.fn().mockResolvedValue(searchResults);

    return {
      getLeagueLeaders,
      options: {
        getLeagueLeaders,
        isInitialized: true,
        searchPlayers,
        workerReady: true,
        ...overrides,
      } satisfies HookOptions,
      searchPlayers,
    };
  }

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

  it('waits without querying until game state and worker are ready', async () => {
    const { getLeagueLeaders, options, searchPlayers } = makeOptions({ workerReady: false });

    const result = await renderHook(options);

    expect(getLeagueLeaders).not.toHaveBeenCalled();
    expect(searchPlayers).not.toHaveBeenCalled();
    expect(result.query).toBe('');
    expect(result.players).toEqual([]);
  });

  it('loads default home run leaders for an empty search', async () => {
    const { getLeagueLeaders, options, searchPlayers } = makeOptions();

    const result = await renderHook(options);

    expect(getLeagueLeaders).toHaveBeenCalledWith('hr', 50);
    expect(searchPlayers).not.toHaveBeenCalled();
    expect(result.query).toBe('');
    expect(result.players).toEqual(defaultPlayers);
  });

  it('debounces player search and returns to defaults when the query clears', async () => {
    const { getLeagueLeaders, options, searchPlayers } = makeOptions();
    await renderHook(options);

    await act(async () => {
      latest?.setQuery('Grace');
      await Promise.resolve();
    });

    expect(searchPlayers).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(199);
      await Promise.resolve();
    });

    expect(searchPlayers).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(searchPlayers).toHaveBeenCalledWith('Grace', 30);
    expect(latest?.players).toEqual(searchResults);

    await act(async () => {
      latest?.setQuery('');
      await Promise.resolve();
    });

    expect(getLeagueLeaders).toHaveBeenCalledTimes(1);
    expect(latest?.players).toEqual(defaultPlayers);
  });
});
