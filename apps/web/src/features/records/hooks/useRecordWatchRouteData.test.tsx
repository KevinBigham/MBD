import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { RecordBookEntry, RecordWatchEntry } from '@mbd/contracts';
import { useRecordWatchRouteData } from './useRecordWatchRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useRecordWatchRouteData>[0];
type HookResult = ReturnType<typeof useRecordWatchRouteData>;

const watchEntry: RecordWatchEntry = {
  id: 'watch-1',
  playerId: 'player-1',
  playerName: 'Milo Slugger',
  teamId: 'nym',
  recordId: 'hr-season',
  recordLabel: 'Single-season HR',
  currentValue: 55,
  holderValue: 61,
  projectedValue: 64.2,
  progressRatio: 0.91,
  summary: 'On pace to challenge the franchise mark.',
};

const franchiseRecord: RecordBookEntry = {
  id: 'record-1',
  label: 'Single-season HR',
  category: 'individual_single_season',
  scope: 'franchise',
  stat: 'hr',
  qualifier: null,
  teamId: 'nym',
  trackingFromSeason: 1,
  note: null,
  holders: [
    {
      value: 61,
      season: 6,
      teamId: 'nym',
      playerId: 'player-2',
      playerName: 'Arlo Hammer',
      displayValue: '61',
    },
  ],
};

const recordBook = {
  franchise: [franchiseRecord],
  league: [],
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useRecordWatchRouteData(options));
  return null;
}

describe('useRecordWatchRouteData', () => {
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
    const getRecordBook = vi.fn().mockResolvedValue(recordBook);
    const getRecordWatchList = vi.fn().mockResolvedValue([watchEntry]);

    return {
      getRecordBook,
      getRecordWatchList,
      options: {
        day: 112,
        getRecordBook,
        getRecordWatchList,
        isInitialized: true,
        phase: 'regular',
        season: 7,
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
    const { getRecordBook, getRecordWatchList, options } = makeOptions({
      workerReady: false,
    });

    const result = await renderHook(options);

    expect(getRecordBook).not.toHaveBeenCalled();
    expect(getRecordWatchList).not.toHaveBeenCalled();
    expect(result.loading).toBe(true);
    expect(result.recordBook).toEqual({ franchise: [], league: [] });
    expect(result.watchList).toEqual([]);
  });

  it('loads record watch and record book data', async () => {
    const { getRecordBook, getRecordWatchList, options } = makeOptions();

    const result = await renderHook(options);

    expect(getRecordWatchList).toHaveBeenCalledTimes(1);
    expect(getRecordBook).toHaveBeenCalledTimes(1);
    expect(result.loading).toBe(false);
    expect(result.watchList).toEqual([watchEntry]);
    expect(result.recordBook).toEqual(recordBook);
  });

  it('falls back to empty record-book groups when the worker returns null data', async () => {
    const emptyWatchList = vi.fn().mockResolvedValue(null);
    const { options } = makeOptions({
      getRecordBook: vi.fn().mockResolvedValue(null),
      getRecordWatchList: emptyWatchList,
    });

    const result = await renderHook(options);

    expect(emptyWatchList).toHaveBeenCalledTimes(1);
    expect(result.loading).toBe(false);
    expect(result.watchList).toEqual([]);
    expect(result.recordBook).toEqual({ franchise: [], league: [] });
  });

  it('refetches record data when the game calendar changes', async () => {
    const { getRecordBook, getRecordWatchList, options } = makeOptions();
    await renderHook(options);

    await renderHook({
      ...options,
      day: 113,
    });
    await renderHook({
      ...options,
      day: 1,
      phase: 'offseason',
      season: 8,
    });

    expect(getRecordWatchList).toHaveBeenCalledTimes(3);
    expect(getRecordBook).toHaveBeenCalledTimes(3);
  });
});
