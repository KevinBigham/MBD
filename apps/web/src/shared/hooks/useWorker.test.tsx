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
      postMessage = vi.fn();
      start = vi.fn();
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

  it('publishes a durable presentation refresh only when the route explicitly requests it', async () => {
    type WorkerHookProbe = {
      advanceOffseason: () => Promise<unknown>;
      publishDurablePresentation: () => boolean;
      skipOffseasonPhase: () => Promise<unknown>;
      subscribeToFlowUpdates: (callback: () => void) => () => void;
    };
    const workerApi = {
      advanceOffseason: vi.fn().mockResolvedValue({ currentPhase: 'arbitration', flowStateChanged: true }),
      ping: vi.fn().mockResolvedValue({ pong: true }),
      skipOffseasonPhase: vi.fn().mockResolvedValue({ currentPhase: 'free_agency', flowStateChanged: true }),
    };
    vi.doMock('comlink', () => ({ wrap: vi.fn(() => workerApi) }));
    vi.doMock('sonner', () => ({ toast: { error: vi.fn() } }));
    class MockWorker {
      addEventListener = vi.fn();
      postMessage = vi.fn();
      start = vi.fn();
      terminate = vi.fn();
    }
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

    const { useGameStore } = await import('./useGameStore');
    await act(async () => {
      useGameStore.getState().setActiveSave('save-slot-a', 1);
    });
    const { useWorker } = await import('./useWorker');
    let latest: WorkerHookProbe | null = null;
    function Probe() { latest = useWorker() as unknown as WorkerHookProbe; return null; }
    await act(async () => { root.render(<Probe />); await Promise.resolve(); });

    const worker = latest!;
    const flow = vi.fn();
    const unsubscribe = worker.subscribeToFlowUpdates(flow);
    await expect(worker.advanceOffseason()).resolves.toEqual({ currentPhase: 'arbitration', flowStateChanged: true });
    await expect(worker.skipOffseasonPhase()).resolves.toEqual({ currentPhase: 'free_agency', flowStateChanged: true });
    expect(flow).not.toHaveBeenCalled();
    expect(worker.publishDurablePresentation()).toBe(true);
    expect(flow).toHaveBeenCalledTimes(1);
    await act(async () => {
      useGameStore.getState().setActiveSave('save-slot-b', 2);
    });
    expect(worker.publishDurablePresentation()).toBe(false);
    expect(flow).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('exposes route-used free agency and history query APIs', async () => {
    type WorkerHookProbe = {
      getFreeAgents: (limit?: number) => Promise<unknown>;
      getHistoryOverview: () => Promise<unknown>;
    };

    const getFreeAgents = vi.fn().mockResolvedValue([{ id: 'fa-1' }]);
    const getHistoryOverview = vi.fn().mockResolvedValue({ seasonViews: [{ season: 1 }] });
    const ping = vi.fn().mockResolvedValue({ pong: true, timestamp: 0 });
    const workerApi = {
      ping,
      getFreeAgents,
      getHistoryOverview,
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
      postMessage = vi.fn();
      start = vi.fn();
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

    expect(typeof worker.getFreeAgents).toBe('function');
    expect(typeof worker.getHistoryOverview).toBe('function');

    await expect(worker.getFreeAgents(200)).resolves.toEqual([{ id: 'fa-1' }]);
    await expect(worker.getHistoryOverview()).resolves.toEqual({ seasonViews: [{ season: 1 }] });
    expect(getFreeAgents).toHaveBeenCalledWith(200);
    expect(getHistoryOverview).toHaveBeenCalledWith();
  });

  it('exposes route-owned mentorship query API', async () => {
    type WorkerHookProbe = {
      getMentorships: () => Promise<unknown>;
    };

    const getMentorships = vi.fn().mockResolvedValue({
      mentorCount: 2,
      protegeeCount: 3,
      pairings: [{ mentorName: 'Elias Anchor', protegeeName: 'Milo Spark' }],
    });
    const ping = vi.fn().mockResolvedValue({ pong: true, timestamp: 0 });
    const workerApi = {
      ping,
      getMentorships,
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
      postMessage = vi.fn();
      start = vi.fn();
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

    expect(typeof worker.getMentorships).toBe('function');
    await expect(worker.getMentorships()).resolves.toEqual({
      mentorCount: 2,
      protegeeCount: 3,
      pairings: [{ mentorName: 'Elias Anchor', protegeeName: 'Milo Spark' }],
    });
    expect(getMentorships).toHaveBeenCalledWith();
  });

  it('defers ordinary reads and rejects ordinary mutation/export before Comlink while an exact advance is active', async () => {
    type WorkerHookProbe = {
      getFreeAgents: (limit?: number) => Promise<unknown>;
      getStandings: () => Promise<unknown>;
      simDay: () => Promise<unknown>;
      simLegacyAdvance: (operation: 'simDay', expectedPhase: 'playoffs') => Promise<unknown>;
      exportSnapshot: () => Promise<unknown>;
    };
    const getFreeAgents = vi.fn().mockResolvedValue([{ id: 'fa-1' }]);
    const getStandings = vi.fn().mockResolvedValue([{ teamId: 'nym' }]);
    const simDay = vi.fn();
    const simLegacyAdvance = vi.fn();
    const exportSnapshot = vi.fn();
    let status: { kind: string } = { kind: 'running' };
    const statusListeners = new Set<() => void>();
    vi.doMock('comlink', () => ({ wrap: vi.fn(() => ({ ping: vi.fn().mockResolvedValue({ pong: true }), getFreeAgents, getStandings, simDay, simLegacyAdvance, exportSnapshot })) }));
    vi.doMock('sonner', () => ({ toast: { error: vi.fn() } }));
    vi.doMock('@/shared/lib/simAdvanceCoordinator', () => ({
      getSimAdvanceCoordinatorStatus: () => status,
      subscribeToSimAdvanceCoordinator: (callback: () => void) => {
        statusListeners.add(callback);
        return () => { statusListeners.delete(callback); };
      },
      resetSimAdvanceCoordinatorForTesting: () => {
        status = { kind: 'fail_closed' };
        for (const callback of [...statusListeners]) callback();
        status = { kind: 'idle' };
      },
    }));
    class MockWorker {
      addEventListener = vi.fn();
      postMessage = vi.fn();
      start = vi.fn();
      terminate = vi.fn();
    }
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
    const { useWorker } = await import('./useWorker');
    const { resetSimAdvanceCoordinatorForTesting } = await import('@/shared/lib/simAdvanceCoordinator');
    let latest: WorkerHookProbe | null = null;
    function Probe() { latest = useWorker() as unknown as WorkerHookProbe; return null; }
    await act(async () => { root.render(<Probe />); await Promise.resolve(); });
    const worker = latest!;
    const delayedRead = worker.getStandings();
    const blockedFreeAgents = worker.getFreeAgents(25);
    await Promise.resolve();
    expect(getStandings).not.toHaveBeenCalled();
    expect(getFreeAgents).not.toHaveBeenCalled();
    await expect(worker.simDay()).rejects.toThrow('held');
    await expect(worker.simLegacyAdvance('simDay', 'playoffs')).rejects.toThrow('held');
    await expect(worker.exportSnapshot()).rejects.toThrow('held');
    expect(simDay).not.toHaveBeenCalled();
    expect(simLegacyAdvance).not.toHaveBeenCalled();
    expect(exportSnapshot).not.toHaveBeenCalled();
    status = { kind: 'publishing' };
    for (const callback of [...statusListeners]) callback();
    await expect(delayedRead).resolves.toEqual([{ teamId: 'nym' }]);
    await expect(blockedFreeAgents).rejects.toThrow('held');
    expect(getFreeAgents).not.toHaveBeenCalled();
    status = { kind: 'fail_closed' };
    const retiredRead = worker.getStandings();
    await expect(retiredRead).rejects.toThrow('reload');
    expect(getStandings).toHaveBeenCalledTimes(1);
    status = { kind: 'running' };
    const resetRead = worker.getStandings();
    await Promise.resolve();
    resetSimAdvanceCoordinatorForTesting();
    await expect(resetRead).rejects.toThrow('reload');
    expect(getStandings).toHaveBeenCalledTimes(1);
  });
});
