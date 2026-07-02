import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { TeamStandingsDTO } from '@/workers/sim.worker.helpers';
import { useStandingsRouteData } from './useStandingsRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useStandingsRouteData>[0];
type HookResult = ReturnType<typeof useStandingsRouteData>;

const standings: Record<string, TeamStandingsDTO[]> = {
  al_east: [
    {
      teamId: 'nym',
      teamName: 'Tycoons',
      city: 'New York',
      abbreviation: 'NYT',
      division: 'al_east',
      wins: 52,
      losses: 28,
      pct: '.650',
      gamesBack: 0,
      streak: 'W4',
      runDifferential: 84,
    },
  ],
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useStandingsRouteData(options));
  return null;
}

describe('useStandingsRouteData', () => {
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
    const getStandings = vi.fn().mockResolvedValue({ divisions: standings });

    return {
      getStandings,
      options: {
        day: 80,
        getStandings,
        isInitialized: true,
        phase: 'regular_season',
        season: 1,
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
    const { getStandings, options } = makeOptions({ workerReady: false });

    const result = await renderHook(options);

    expect(getStandings).not.toHaveBeenCalled();
    expect(result.standings).toEqual({});
  });

  it('loads division standings when ready', async () => {
    const { getStandings, options } = makeOptions();

    const result = await renderHook(options);

    expect(getStandings).toHaveBeenCalledTimes(1);
    expect(result.standings).toBe(standings);
  });

  it('keeps empty standings when the worker has no standings payload', async () => {
    const emptyGetStandings = vi.fn().mockResolvedValue(null);
    const { options } = makeOptions({
      getStandings: emptyGetStandings,
    });

    const result = await renderHook(options);

    expect(emptyGetStandings).toHaveBeenCalledTimes(1);
    expect(result.standings).toEqual({});
  });

  it('refetches standings when the game calendar changes', async () => {
    const { getStandings, options } = makeOptions();
    await renderHook(options);

    await renderHook({
      ...options,
      day: 81,
    });
    await renderHook({
      ...options,
      day: 1,
      phase: 'offseason',
      season: 2,
    });

    expect(getStandings).toHaveBeenCalledTimes(3);
  });
});
