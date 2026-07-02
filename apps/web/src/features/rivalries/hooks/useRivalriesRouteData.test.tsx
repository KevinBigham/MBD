import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { Rivalry } from '@mbd/contracts';
import { useRivalriesRouteData } from './useRivalriesRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useRivalriesRouteData>[0];
type HookResult = ReturnType<typeof useRivalriesRouteData>;

const rivalries: Rivalry[] = [
  {
    id: 'nym-bos',
    teamA: 'nym',
    teamB: 'bos',
    intensity: 85,
    summary: 'The greatest rivalry in baseball.',
    reasons: ['Division rivals', 'Historic postseason battles'],
    origin: 'historical',
    active: true,
    currentSeasonWinsA: 7,
    currentSeasonWinsB: 5,
    historicalWinsA: 1200,
    historicalWinsB: 1150,
    eventHistory: [
      { season: 5, type: 'playoff', summary: 'ALCS Game 7 thriller' },
    ],
    closeRaceStreak: 4,
    playoffSeriesStreak: 3,
  },
];

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useRivalriesRouteData(options));
  return null;
}

describe('useRivalriesRouteData', () => {
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
    const getRivalries = vi.fn().mockResolvedValue(rivalries);

    return {
      getRivalries,
      options: {
        day: 88,
        getRivalries,
        isInitialized: true,
        phase: 'regular_season',
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
    const { getRivalries, options } = makeOptions({ workerReady: false });

    const result = await renderHook(options);

    expect(getRivalries).not.toHaveBeenCalled();
    expect(result.loading).toBe(true);
    expect(result.rivalries).toEqual([]);
  });

  it('loads rivalries and refetches when the game calendar changes', async () => {
    const { getRivalries, options } = makeOptions();
    const result = await renderHook(options);

    expect(getRivalries).toHaveBeenCalledTimes(1);
    expect(result.loading).toBe(false);
    expect(result.rivalries).toEqual(rivalries);

    await renderHook({ ...options, day: 89 });
    await renderHook({ ...options, day: 1, phase: 'offseason', season: 5 });

    expect(getRivalries).toHaveBeenCalledTimes(3);
  });

  it('keeps an empty rivalry list when the worker returns no payload', async () => {
    const emptyGetRivalries = vi.fn().mockResolvedValue(null);
    const { options } = makeOptions({ getRivalries: emptyGetRivalries });

    const result = await renderHook(options);

    expect(emptyGetRivalries).toHaveBeenCalledTimes(1);
    expect(result.loading).toBe(false);
    expect(result.rivalries).toEqual([]);
  });
});
