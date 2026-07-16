import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function installRuntimeMocks(workerApi: Record<string, ReturnType<typeof vi.fn>>) {
  vi.doMock('comlink', () => ({ wrap: vi.fn(() => workerApi) }));
  vi.doMock('sonner', () => ({ toast: { error: vi.fn() } }));
  vi.doMock('@/shared/lib/saveSessionOwnership', () => ({
    assertActiveSaveSessionOwned: vi.fn(),
    assertSaveSessionSnapshotExportAuthorized: vi.fn(() => 'exact_save_mutation'),
    assertSaveSessionImportAuthorized: vi.fn(),
    assertSaveSessionNewGameAuthorized: vi.fn(),
    withActiveSaveSessionSnapshotExportAuthorization: vi.fn((_id: string, operation: () => Promise<unknown>) => operation()),
    withActiveSaveSessionImportAuthorization: vi.fn((_id: string, operation: () => Promise<unknown>) => operation()),
    SaveSessionOwnershipError: class SaveSessionOwnershipError extends Error {
      constructor(readonly kind: string, message: string, readonly rootSaveId: string | null) { super(message); }
    },
  }));
  class MockWorker {
    addEventListener = vi.fn();
    postMessage = vi.fn();
    start = vi.fn();
    terminate = vi.fn();
  }
  vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
}

describe('useWorker exact trade mutation adapter', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.resetModules();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it.each([
    {
      label: 'start',
      operation: {
        kind: 'startTradeNegotiation' as const,
        offeringAssets: [{ type: 'player' as const, playerId: 'p1' }],
        requestingAssets: [{ type: 'player' as const, playerId: 'p2' }],
        toTeamId: 'bos',
      },
      method: 'startNegotiation',
      args: [
        [{ type: 'player', playerId: 'p1' }],
        [{ type: 'player', playerId: 'p2' }],
        'bos',
      ],
    },
    {
      label: 'advance',
      operation: {
        kind: 'advanceTradeNegotiation' as const,
        negotiationId: 'neg-1',
        tradePackage: {
          offeringAssets: [{ type: 'player' as const, playerId: 'p1' }],
          requestingAssets: [{ type: 'player' as const, playerId: 'p2' }],
        },
      },
      method: 'advanceNegotiation',
      args: [
        'neg-1',
        {
          offeringAssets: [{ type: 'player', playerId: 'p1' }],
          requestingAssets: [{ type: 'player', playerId: 'p2' }],
        },
      ],
    },
    {
      label: 'resolve',
      operation: {
        kind: 'resolveTradeNegotiation' as const,
        negotiationId: 'neg-1',
        action: 'accept' as const,
      },
      method: 'resolveNegotiation',
      args: ['neg-1', 'accept'],
    },
    {
      label: 'incoming response',
      operation: {
        kind: 'respondToTradeOffer' as const,
        offerId: 'offer-1',
        response: 'counter' as const,
        counterPackage: {
          offeringAssets: [{ type: 'player' as const, playerId: 'p1' }],
          requestingAssets: [{ type: 'player' as const, playerId: 'p2' }],
        },
      },
      method: 'respondToTradeOffer',
      args: [
        'offer-1',
        'counter',
        {
          offeringAssets: [{ type: 'player', playerId: 'p1' }],
          requestingAssets: [{ type: 'player', playerId: 'p2' }],
        },
      ],
    },
  ])('dispatches $label only after an exact baseline export', async ({ operation, method, args }) => {
    const baseline = { schemaVersion: 35, season: 4, day: 60, phase: 'regular' };
    const post = { ...baseline, marker: 'post' };
    const result = { success: true, flowStateChanged: true };
    const workerApi = {
      ping: vi.fn().mockResolvedValue({ pong: true }),
      exportSnapshot: vi.fn().mockResolvedValueOnce(baseline).mockResolvedValueOnce(post),
      startNegotiation: vi.fn().mockResolvedValue(result),
      advanceNegotiation: vi.fn().mockResolvedValue(result),
      resolveNegotiation: vi.fn().mockResolvedValue(result),
      respondToTradeOffer: vi.fn().mockResolvedValue(result),
    };
    installRuntimeMocks(workerApi);
    const { useGameStore } = await import('./useGameStore');
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    const { useWorker } = await import('./useWorker');
    const {
      beginExactSaveMutationWorkerSession,
      finishExactSaveMutationWorkerSession,
    } = await import('@/shared/lib/workerMutationSession');
    const ref: { current: ReturnType<typeof useWorker> | null } = { current: null };
    function Probe() { ref.current = useWorker(); return null; }
    await act(async () => {
      root.render(<Probe />);
      await Promise.resolve();
      await Promise.resolve();
    });
    const worker = ref.current!;
    const session = beginExactSaveMutationWorkerSession('save-slot-1', 'save-slot-1');

    await expect(worker.exactSaveMutation.execute(session, operation)).rejects.toThrow('baseline');
    expect(workerApi[method as keyof typeof workerApi]).not.toHaveBeenCalled();
    await expect(worker.exactSaveMutation.exportSnapshot(session)).resolves.toEqual(baseline);
    await expect(worker.exactSaveMutation.execute(session, operation)).resolves.toEqual(result);
    expect(workerApi[method as keyof typeof workerApi]).toHaveBeenCalledWith(...args);
    await expect(worker.exactSaveMutation.exportSnapshot(session)).resolves.toEqual(post);
    expect(() => worker.exactSaveMutation.publishFlow(session)).not.toThrow();
    finishExactSaveMutationWorkerSession(session);
  });
});
