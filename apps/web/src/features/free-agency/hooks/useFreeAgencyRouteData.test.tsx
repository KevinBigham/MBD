import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  useFreeAgencyRouteData,
  type FreeAgencyRouteDataOptions,
  type FreeAgencyRouteDataResult,
} from './useFreeAgencyRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function HookHarness({
  options,
  onRender,
}: {
  options: FreeAgencyRouteDataOptions;
  onRender: (result: FreeAgencyRouteDataResult) => void;
}) {
  onRender(useFreeAgencyRouteData(options));
  return null;
}

describe('useFreeAgencyRouteData', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: FreeAgencyRouteDataResult | null;

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

  function makeOptions(overrides: Partial<FreeAgencyRouteDataOptions> = {}) {
    const getFreeAgents = vi.fn().mockResolvedValue([
      {
        id: 'fa-1',
        firstName: 'Power',
        lastName: 'Bat',
        position: '1B',
        age: 31,
        displayRating: 66,
        letterGrade: 'A',
        marketValue: 22,
        demandLevel: 'elite',
      },
      {
        marketValue: 7,
        demandLevel: 'low',
        letterGrade: 'C',
        player: {
          id: 'fa-2',
          firstName: 'Depth',
          lastName: 'Arm',
          position: 'SP',
          age: 35,
          overallRating: 255,
        },
      },
      {
        firstName: 'Missing',
        lastName: 'Identifier',
      },
    ]);
    const getFinanceOverview = vi.fn().mockResolvedValue({
      totalPayroll: 120,
      budget: 160,
      capSpace: 30,
    });

    return {
      getFinanceOverview,
      getFreeAgents,
      options: {
        getFinanceOverview,
        getFreeAgents,
        isInitialized: true,
        phase: 'offseason',
        workerReady: true,
        ...overrides,
      } satisfies FreeAgencyRouteDataOptions,
    };
  }

  async function renderHook(options: FreeAgencyRouteDataOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latest = result;
      }} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest).toBeTruthy();
    return latest as FreeAgencyRouteDataResult;
  }

  it('waits without querying until game state and worker are ready', async () => {
    const { getFinanceOverview, getFreeAgents, options } = makeOptions({
      workerReady: false,
    });

    const result = await renderHook(options);

    expect(getFreeAgents).not.toHaveBeenCalled();
    expect(getFinanceOverview).not.toHaveBeenCalled();
    expect(result.loading).toBe(true);
    expect(result.agents).toEqual([]);
    expect(result.filteredAgents).toEqual([]);
    expect(result.finance).toBeNull();
  });

  it('loads and normalizes free agents and finance overview data', async () => {
    const { getFinanceOverview, getFreeAgents, options } = makeOptions();

    const result = await renderHook(options);

    expect(getFreeAgents).toHaveBeenCalledWith(200);
    expect(getFinanceOverview).toHaveBeenCalledTimes(1);
    expect(result.loading).toBe(false);
    expect(result.finance).toEqual({
      totalPayroll: 120,
      budget: 160,
      capSpace: 30,
    });
    expect(result.agents.map((agent) => agent.id)).toEqual(['fa-1', 'fa-2']);
    expect(result.agents[1]).toMatchObject({
      firstName: 'Depth',
      lastName: 'Arm',
      position: 'SP',
      displayRating: 51,
      demandLevel: 'low',
    });
  });

  it('filters and sorts market rows from route-owned controls', async () => {
    const { options } = makeOptions();
    let result = await renderHook(options);

    await act(async () => {
      result.setSearchQuery('power');
      result.setDemandFilter('elite');
      result.setPositionFilter('hitters');
      await Promise.resolve();
    });

    result = latest as FreeAgencyRouteDataResult;
    expect(result.filteredAgents.map((agent) => agent.id)).toEqual(['fa-1']);

    await act(async () => {
      result.setSearchQuery('');
      result.setDemandFilter('all');
      result.setPositionFilter('all');
      result.handleSortKeyChange('age');
      await Promise.resolve();
    });

    result = latest as FreeAgencyRouteDataResult;
    expect(result.filteredAgents.map((agent) => agent.id)).toEqual(['fa-2', 'fa-1']);

    await act(async () => {
      result.handleSortKeyChange('age');
      await Promise.resolve();
    });

    result = latest as FreeAgencyRouteDataResult;
    expect(result.filteredAgents.map((agent) => agent.id)).toEqual(['fa-1', 'fa-2']);
    expect(result.sortDesc).toBe(false);
  });

  it('removes signed players from the route market while preserving the refresh callback', async () => {
    const { options } = makeOptions();
    let result = await renderHook(options);

    await act(async () => {
      result.removeAgentById('fa-1');
      await Promise.resolve();
    });

    result = latest as FreeAgencyRouteDataResult;
    expect(result.agents.map((agent) => agent.id)).toEqual(['fa-2']);

    await act(async () => {
      await result.fetchFreeAgents();
      await Promise.resolve();
    });

    result = latest as FreeAgencyRouteDataResult;
    expect(result.agents.map((agent) => agent.id)).toEqual(['fa-1', 'fa-2']);
  });

  it('refetches the market when the phase changes', async () => {
    const { getFinanceOverview, getFreeAgents, options } = makeOptions();
    await renderHook(options);

    await renderHook({
      ...options,
      phase: 'regular',
    });

    expect(getFreeAgents).toHaveBeenCalledTimes(2);
    expect(getFinanceOverview).toHaveBeenCalledTimes(2);
  });
});
