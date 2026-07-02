import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { ScheduleGameEntry } from '../components/ScheduleContentPanel';
import { useScheduleRouteData } from './useScheduleRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useScheduleRouteData>[0];
type HookResult = ReturnType<typeof useScheduleRouteData>;

const schedule: ScheduleGameEntry[] = [
  {
    day: 9,
    opponentId: 'bos',
    opponentName: 'Boston Noreasters',
    opponentAbbr: 'BOS',
    isHome: true,
    isCompleted: true,
    userScore: 5,
    opponentScore: 3,
    result: 'W',
    gameIndex: 17,
  },
  {
    day: 10,
    opponentId: 'bal',
    opponentName: 'Baltimore Crab Cakes',
    opponentAbbr: 'BAL',
    isHome: false,
    isCompleted: false,
  },
];

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useScheduleRouteData(options));
  return null;
}

describe('useScheduleRouteData', () => {
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
    const getScheduleView = vi.fn().mockResolvedValue(schedule);

    return {
      getScheduleView,
      options: {
        day: 10,
        getScheduleView,
        isInitialized: true,
        phase: 'regular_season',
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
    const { getScheduleView, options } = makeOptions({ workerReady: false });

    const result = await renderHook(options);

    expect(getScheduleView).not.toHaveBeenCalled();
    expect(result.schedule).toEqual([]);
  });

  it('loads the schedule from the existing worker query', async () => {
    const { getScheduleView, options } = makeOptions();

    const result = await renderHook(options);

    expect(getScheduleView).toHaveBeenCalledTimes(1);
    expect(result.schedule).toEqual(schedule);
  });

  it('keeps a safe empty schedule when the worker payload is unavailable', async () => {
    const getScheduleView = vi.fn().mockResolvedValue(null);
    const { options } = makeOptions({ getScheduleView });

    const result = await renderHook(options);

    expect(getScheduleView).toHaveBeenCalledTimes(1);
    expect(result.schedule).toEqual([]);
  });

  it('refetches schedule route data when the game calendar changes', async () => {
    const { getScheduleView, options } = makeOptions();

    await renderHook(options);
    await renderHook({ ...options, day: 11 });
    await renderHook({ ...options, day: 1, phase: 'offseason', season: 6 });

    expect(getScheduleView).toHaveBeenCalledTimes(3);
  });
});
