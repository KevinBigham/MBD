import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { LeaderboardStatKey } from '@mbd/sim-core';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import { useLeagueLeadersRouteData } from './useLeagueLeadersRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useLeagueLeadersRouteData>[0];
type HookResult = ReturnType<typeof useLeagueLeadersRouteData>;

const hitterLeader = {
  id: 'hitter-1',
  firstName: 'Aaron',
  lastName: 'Judge',
  position: 'RF',
  teamId: 'nym',
  displayRating: 73,
  stats: {
    avg: '.318',
    hr: 32,
    rbi: 88,
    hits: 126,
    strikeouts: 0,
    era: '0.00',
  },
  advanced: {
    war: 5.6,
    woba: 0.412,
    wrcPlus: 168,
    opsPlus: 171,
    iso: 0.294,
    fip: null,
    xfip: null,
    whip: null,
    kPer9: null,
    bbPer9: null,
    kBb: null,
  },
} as PlayerDTO;

const pitcherLeader = {
  id: 'pitcher-1',
  firstName: 'Gerrit',
  lastName: 'Cole',
  position: 'SP',
  teamId: 'nym',
  displayRating: 68,
  stats: {
    avg: '.000',
    hr: 0,
    rbi: 0,
    hits: 0,
    strikeouts: 151,
    era: '2.91',
  },
  advanced: {
    war: 4.9,
    woba: null,
    wrcPlus: null,
    opsPlus: null,
    iso: null,
    fip: 2.83,
    xfip: 3.04,
    whip: 1.01,
    kPer9: 10.8,
    bbPer9: 2.1,
    kBb: 5.14,
  },
} as PlayerDTO;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useLeagueLeadersRouteData(options));
  return null;
}

describe('useLeagueLeadersRouteData', () => {
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
    vi.clearAllMocks();
  });

  function makeOptions(overrides: Partial<HookOptions> = {}) {
    const getLeagueLeaders = vi.fn().mockImplementation(async (stat: LeaderboardStatKey) => {
      if (stat === 'fip') {
        return [pitcherLeader];
      }
      return [hitterLeader];
    });

    return {
      getLeagueLeaders,
      options: {
        day: 88,
        getLeagueLeaders,
        isInitialized: true,
        phase: 'regular',
        season: 5,
        workerReady: true,
        ...overrides,
      } satisfies HookOptions,
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
    const { getLeagueLeaders, options } = makeOptions({ workerReady: false });

    const result = await renderHook(options);

    expect(getLeagueLeaders).not.toHaveBeenCalled();
    expect(result.activeCat).toBe('war');
    expect(result.leaders).toEqual([]);
  });

  it('loads default WAR leaders and reloads when the category changes', async () => {
    const { getLeagueLeaders, options } = makeOptions();
    const result = await renderHook(options);

    expect(getLeagueLeaders).toHaveBeenCalledWith('war', 20);
    expect(result.activeCat).toBe('war');
    expect(result.leaders).toEqual([hitterLeader]);

    await act(async () => {
      result.setActiveCat('fip');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getLeagueLeaders).toHaveBeenCalledWith('fip', 20);
    expect(latest?.activeCat).toBe('fip');
    expect(latest?.leaders).toEqual([pitcherLeader]);
  });

  it('refetches leaders when the game calendar changes', async () => {
    const { getLeagueLeaders, options } = makeOptions();
    await renderHook(options);

    await renderHook({
      ...options,
      day: 89,
    });
    await renderHook({
      ...options,
      day: 1,
      phase: 'offseason',
      season: 6,
    });

    expect(getLeagueLeaders).toHaveBeenCalledTimes(3);
  });
});
