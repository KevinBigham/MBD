import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('useWorker', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.resetModules();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('exposes makeContractOffer as a callable worker mutation', async () => {
    type WorkerHookProbe = {
      makeContractOffer: (playerId: string, years: number, salary: number) => Promise<unknown>;
    };

    const makeContractOffer = vi.fn().mockResolvedValue({ accepted: true, reason: 'Signed.' });
    const ping = vi.fn().mockResolvedValue({ pong: true, timestamp: 0 });
    const workerApi = {
      ping,
      makeContractOffer,
    };

    vi.doMock('comlink', () => ({
      wrap: vi.fn(() => workerApi),
    }));
    vi.doMock('sonner', () => ({
      toast: {
        error: vi.fn(),
      },
    }));

    class MockWorker {
      addEventListener = vi.fn();
      terminate = vi.fn();
    }

    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

    const { useWorker } = await import('./useWorker');

    let latest: WorkerHookProbe | null = null;

    function Probe() {
      latest = useWorker() as unknown as WorkerHookProbe;
      return null;
    }

    await act(async () => {
      root.render(<Probe />);
      await Promise.resolve();
    });

    if (!latest) {
      throw new Error('useWorker probe did not capture the hook result');
    }

    const worker = latest as WorkerHookProbe;

    expect(typeof worker.makeContractOffer).toBe('function');

    await act(async () => {
      const result = await worker.makeContractOffer('fa-1', 4, 22);
      expect(result).toEqual({ accepted: true, reason: 'Signed.' });
    });

    expect(makeContractOffer).toHaveBeenCalledWith('fa-1', 4, 22);
  });
});
