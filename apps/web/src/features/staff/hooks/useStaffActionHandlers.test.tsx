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
      autosaveActiveGame: vi.fn().mockResolvedValue({ saved: true }),
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
    expect(vi.mocked(options.autosaveActiveGame).mock.invocationCallOrder[0]!)
      .toBeLessThan(vi.mocked(options.fetchStaffData).mock.invocationCallOrder[0]!);
    expect(latestResult?.busyCoachId).toBeNull();
  });

  it('holds the staff refresh until persistence settles', async () => {
    const persistenceDeferred = createDeferred<unknown>();
    const options = baseOptions({
      autosaveActiveGame: vi.fn().mockReturnValue(persistenceDeferred.promise),
    });
    await renderHook(options);
    let pending!: Promise<void>;

    await act(async () => {
      pending = latestResult!.handleHire('coach-held');
      await vi.waitFor(() => expect(options.autosaveActiveGame).toHaveBeenCalledTimes(1));
    });
    expect(options.fetchStaffData).not.toHaveBeenCalled();

    await act(async () => {
      persistenceDeferred.resolve({ saved: true });
      await pending;
    });
    expect(options.fetchStaffData).toHaveBeenCalledTimes(1);
    expect(latestResult?.busyCoachId).toBeNull();
  });

  it('does not persist or refresh a resolved unsuccessful staff action', async () => {
    const options = baseOptions({
      hireCoach: vi.fn().mockResolvedValue({ success: false }),
    });
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleHire('coach-rejected');
    });

    expect(options.autosaveActiveGame).not.toHaveBeenCalled();
    expect(options.fetchStaffData).not.toHaveBeenCalled();
    expect(latestResult?.busyCoachId).toBeNull();
  });

  it('does not refresh a successful staff mutation when persistence resolves unsaved', async () => {
    const options = baseOptions({
      autosaveActiveGame: vi.fn().mockResolvedValue({ saved: false }),
    });
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleFire('coach-unsaved');
    });

    expect(options.autosaveActiveGame).toHaveBeenCalledTimes(1);
    expect(options.fetchStaffData).not.toHaveBeenCalled();
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
