import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  useScoutConflictsData,
  type ScoutConflict,
} from './useScoutConflictsData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useScoutConflictsData>[0];
type HookResult = ReturnType<typeof useScoutConflictsData>;

const conflicts: ScoutConflict[] = [
  {
    prospectId: 'p1',
    headline: 'Is Rodriguez the real deal?',
    opinions: [
      {
        source: 'scout_director',
        overallGrade: 65,
        ceiling: 75,
        floor: 55,
        confidence: 80,
        summary: 'Plus bat speed and power projection.',
      },
    ],
    divergence: 13,
    resolved: false,
    resolution: null,
    winningSource: null,
    outcomeSummary: null,
  },
];

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useScoutConflictsData(options));
  return null;
}

describe('useScoutConflictsData', () => {
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
    const getScoutConflicts = vi.fn().mockResolvedValue(conflicts);

    return {
      getScoutConflicts,
      options: {
        day: 1,
        getScoutConflicts,
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
    const { getScoutConflicts, options } = makeOptions({ workerReady: false });

    const result = await renderHook(options);

    expect(getScoutConflicts).not.toHaveBeenCalled();
    expect(result.conflicts).toEqual([]);
    expect(result.loading).toBe(true);
  });

  it('loads scout conflicts from the existing worker query', async () => {
    const { getScoutConflicts, options } = makeOptions();

    const result = await renderHook(options);

    expect(getScoutConflicts).toHaveBeenCalledTimes(1);
    expect(result.conflicts).toEqual(conflicts);
    expect(result.loading).toBe(false);
  });

  it('uses an empty conflict list when the worker payload is unavailable', async () => {
    const getScoutConflicts = vi.fn().mockResolvedValue(null);
    const { options } = makeOptions({ getScoutConflicts });

    const result = await renderHook(options);

    expect(getScoutConflicts).toHaveBeenCalledTimes(1);
    expect(result.conflicts).toEqual([]);
    expect(result.loading).toBe(false);
  });

  it('refetches scout conflicts when the route calendar changes', async () => {
    const { getScoutConflicts, options } = makeOptions();
    await renderHook(options);

    await renderHook({
      ...options,
      day: 2,
    });

    expect(getScoutConflicts).toHaveBeenCalledTimes(2);
  });
});
