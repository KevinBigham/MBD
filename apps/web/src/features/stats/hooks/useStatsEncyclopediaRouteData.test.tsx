import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  useStatsEncyclopediaRouteData,
  type LeagueContextView,
} from './useStatsEncyclopediaRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useStatsEncyclopediaRouteData>[0];
type HookResult = ReturnType<typeof useStatsEncyclopediaRouteData>;

const leagueContext: LeagueContextView = {
  leagueWoba: 0.318,
  leagueOps: 0.721,
  leagueEra: 4.12,
  leagueFip: 4.04,
  runsPerWin: 9.7,
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useStatsEncyclopediaRouteData(options));
  return null;
}

describe('useStatsEncyclopediaRouteData', () => {
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
    const getPerformanceDiagnostics = vi.fn().mockResolvedValue({ leagueContext });

    return {
      getPerformanceDiagnostics,
      options: {
        day: 74,
        getPerformanceDiagnostics,
        isInitialized: true,
        phase: 'regular',
        season: 4,
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
    const { getPerformanceDiagnostics, options } = makeOptions({
      workerReady: false,
    });

    const result = await renderHook(options);

    expect(getPerformanceDiagnostics).not.toHaveBeenCalled();
    expect(result.leagueContext).toBeNull();
  });

  it('loads league context from performance diagnostics', async () => {
    const { getPerformanceDiagnostics, options } = makeOptions();

    const result = await renderHook(options);

    expect(getPerformanceDiagnostics).toHaveBeenCalledTimes(1);
    expect(result.leagueContext).toBe(leagueContext);
  });

  it('refetches optional league context when the game calendar changes', async () => {
    const { getPerformanceDiagnostics, options } = makeOptions();
    await renderHook(options);

    await renderHook({
      ...options,
      day: 75,
    });
    await renderHook({
      ...options,
      day: 1,
      phase: 'offseason',
      season: 5,
    });

    expect(getPerformanceDiagnostics).toHaveBeenCalledTimes(3);
  });
});
