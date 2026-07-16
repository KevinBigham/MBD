import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useExactTradeMutationExecutor } from './useExactTradeMutationExecutor';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const runtime = vi.hoisted(() => ({
  status: { kind: 'idle' } as { kind: string },
  execute: vi.fn(),
  release: vi.fn(),
  store: {
    activeSaveId: 'save-slot-1' as string | null,
    gmName: 'GM',
    teamName: 'New York',
    season: 4,
    isInitialized: true,
    setInitialized: vi.fn(),
  },
}));

vi.mock('@/shared/lib/exactSaveMutationCoordinator', () => ({
  executeExactSaveMutation: runtime.execute,
  didFlowAwareExactMutationChange: (result: unknown) => (
    typeof result !== 'object'
    || result === null
    || !('flowStateChanged' in result)
    || (result as { flowStateChanged?: unknown }).flowStateChanged !== false
  ),
  getExactSaveMutationStatus: () => runtime.status,
}));
vi.mock('@/shared/lib/saveSessionOwnership', () => ({
  releaseActiveSaveSessionOwnership: runtime.release,
}));
vi.mock('./useGameStore', () => {
  const hook = (() => ({ ...runtime.store })) as unknown as typeof import('./useGameStore').useGameStore;
  hook.getState = (() => runtime.store) as unknown as typeof hook.getState;
  return { useGameStore: hook };
});

type Executor = ReturnType<typeof useExactTradeMutationExecutor<unknown>>;

describe('useExactTradeMutationExecutor', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: Executor | null;

  beforeEach(() => {
    runtime.status = { kind: 'idle' };
    runtime.execute.mockReset();
    runtime.release.mockReset();
    runtime.store.activeSaveId = 'save-slot-1';
    runtime.store.gmName = 'GM';
    runtime.store.teamName = 'New York';
    runtime.store.season = 4;
    runtime.store.isInitialized = true;
    runtime.store.setInitialized.mockReset();
    latest = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  async function render() {
    function Probe() {
      latest = useExactTradeMutationExecutor({} as never, true);
      return null;
    }
    await act(async () => {
      root.render(<Probe />);
      await Promise.resolve();
    });
    return latest!;
  }

  it('passes the complete retained-salary package to one exact-save operation and returns only its durable result', async () => {
    const result = { success: true, flowStateChanged: true };
    runtime.execute.mockResolvedValue({ kind: 'durable', result });
    const executor = await render();
    const offeringAssets = [{
      type: 'player' as const,
      playerId: 'p1',
      contractReference: { annualSalary: 20, contractEndSeasonExclusive: 7 },
      retainedSalary: { annualAmount: 5, startSeason: 4, endSeasonExclusive: 7 },
      cashConsideration: { amount: 2, season: 4 },
    }];
    const requestingAssets = [{ type: 'player' as const, playerId: 'p2' }];

    await expect(executor.startNegotiation(offeringAssets, requestingAssets, 'bos')).resolves.toBe(result);
    expect(runtime.execute).toHaveBeenCalledWith(expect.objectContaining({
      saveId: 'save-slot-1',
      season: 4,
      operation: {
        kind: 'startTradeNegotiation',
        offeringAssets,
        requestingAssets,
        toTeamId: 'bos',
      },
    }));
  });

  it('blocks stale-save and concurrent admission before coordinator side effects', async () => {
    const executor = await render();
    runtime.store.activeSaveId = 'save-slot-2';
    await expect(executor.respondToTradeOffer('offer-1', 'accept')).resolves.toBeNull();
    expect(runtime.execute).not.toHaveBeenCalled();

    runtime.store.activeSaveId = 'save-slot-1';
    runtime.status = { kind: 'running' };
    await expect(executor.resolveNegotiation('neg-1', 'accept')).resolves.toBeNull();
    expect(runtime.execute).not.toHaveBeenCalled();
  });

  it('treats an unchanged result as coherent without inventing persistence work', async () => {
    const result = { success: false, flowStateChanged: false };
    runtime.execute.mockResolvedValue({ kind: 'unchanged', result });
    const executor = await render();

    await expect(executor.respondToTradeOffer('missing', 'accept')).resolves.toBe(result);
  });

  it('releases ownership and uninitializes only the same save on fail-closed', async () => {
    const events: string[] = [];
    runtime.release.mockImplementation(async () => { events.push('release'); });
    runtime.store.setInitialized.mockImplementation(() => { events.push('uninitialize'); });
    runtime.execute.mockImplementation(async (options) => {
      await options.failClosed(new Error('durable write lost'));
      return { kind: 'reload_required', error: new Error('durable write lost') };
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const executor = await render();

    await expect(executor.resolveNegotiation('neg-1', 'accept')).resolves.toBeNull();
    expect(events).toEqual(['release', 'uninitialize']);

    runtime.execute.mockImplementation(async (options) => {
      runtime.store.activeSaveId = 'save-slot-2';
      await options.failClosed(new Error('stale save failed'));
      return { kind: 'reload_required', error: new Error('stale save failed') };
    });
    runtime.release.mockClear();
    runtime.store.setInitialized.mockClear();
    runtime.store.activeSaveId = 'save-slot-1';
    const successorSafeExecutor = await render();
    await expect(successorSafeExecutor.resolveNegotiation('neg-2', 'accept')).resolves.toBeNull();
    expect(runtime.release).not.toHaveBeenCalled();
    expect(runtime.store.setInitialized).not.toHaveBeenCalled();
  });
});
