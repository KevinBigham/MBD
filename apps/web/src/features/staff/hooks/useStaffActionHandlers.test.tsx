import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useStaffActionHandlers } from './useStaffActionHandlers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useStaffActionHandlers>[0];
type HookResult = ReturnType<typeof useStaffActionHandlers>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useStaffActionHandlers(options));
  return null;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
}

describe('useStaffActionHandlers', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      autosaveActiveGame: vi.fn().mockResolvedValue(undefined),
      fetchStaffData: vi.fn().mockResolvedValue(undefined),
      fireCoach: vi.fn().mockResolvedValue({ success: true }),
      hireCoach: vi.fn().mockResolvedValue({ success: true }),
      season: 7,
      ...overrides,
    };
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  it('hires a coach, refreshes staff data, autosaves the current season, and clears busy state', async () => {
    const hireDeferred = createDeferred<unknown>();
    const options = baseOptions({
      hireCoach: vi.fn().mockReturnValue(hireDeferred.promise),
    });
    await renderHook(options);

    let pendingHire: Promise<void> | null = null;
    await act(async () => {
      pendingHire = latestResult?.handleHire('coach-market-1') ?? null;
      await Promise.resolve();
    });

    expect(latestResult?.busyCoachId).toBe('coach-market-1');
    expect(options.hireCoach).toHaveBeenCalledWith('coach-market-1');
    expect(options.fetchStaffData).not.toHaveBeenCalled();
    expect(options.autosaveActiveGame).not.toHaveBeenCalled();

    await act(async () => {
      hireDeferred.resolve({ success: true });
      await pendingHire;
    });

    expect(options.fetchStaffData).toHaveBeenCalledTimes(1);
    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: 7 });
    expect(latestResult?.busyCoachId).toBeNull();
  });

  it('fires a coach and clears busy state without refresh or autosave when the worker rejects', async () => {
    const fireError = new Error('coach locked');
    const options = baseOptions({
      fireCoach: vi.fn().mockRejectedValue(fireError),
    });
    await renderHook(options);

    let rejection: unknown;
    await act(async () => {
      try {
        await latestResult?.handleFire('coach-active-1');
      } catch (error) {
        rejection = error;
      }
    });

    expect(rejection).toBe(fireError);
    expect(options.fireCoach).toHaveBeenCalledWith('coach-active-1');
    expect(options.fetchStaffData).not.toHaveBeenCalled();
    expect(options.autosaveActiveGame).not.toHaveBeenCalled();
    expect(latestResult?.busyCoachId).toBeNull();
  });
});
