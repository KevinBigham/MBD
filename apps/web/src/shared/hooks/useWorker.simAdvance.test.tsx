import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function installRuntimeMocks(
  workerApi: Record<string, ReturnType<typeof vi.fn>> | Array<Record<string, ReturnType<typeof vi.fn>>>,
  preparedOperation = 'sim_day',
) {
  const apis = Array.isArray(workerApi) ? workerApi : [workerApi];
  const workers: Array<{ addEventListener: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> }> = [];
  let generation = 0;
  vi.doMock('comlink', () => ({ wrap: vi.fn(() => apis[Math.min(generation++, apis.length - 1)]!) }));
  vi.doMock('sonner', () => ({ toast: { error: vi.fn() } }));
  vi.doMock('@/shared/lib/saveSessionOwnership', () => ({
    assertActiveSaveSessionOwned: vi.fn(),
    assertSaveSessionSnapshotExportAuthorized: vi.fn(() => 'ordinary'),
    assertSaveSessionImportAuthorized: vi.fn(),
    assertSaveSessionNewGameAuthorized: vi.fn(),
    withActiveSaveSessionSnapshotExportAuthorization: vi.fn((_id: string, operation: () => Promise<unknown>) => operation()),
    withActiveSaveSessionImportAuthorization: vi.fn((_id: string, operation: () => Promise<unknown>) => operation()),
    SaveSessionOwnershipError: class SaveSessionOwnershipError extends Error {
      constructor(readonly kind: string, message: string, readonly rootSaveId: string | null) { super(message); }
    },
  }));
  const preparedIntent = Object.freeze({ prepared: 'durable-intent' });
  let workerAuthorizationClaimed = false;
  vi.doMock('@/shared/lib/saveSystem', () => ({
    assertDurablyPreparedSimAdvanceIntent: vi.fn((intent: object, saveId: string, rootSaveId: string) => {
      if (intent !== preparedIntent || saveId !== 'save-slot-1' || rootSaveId !== 'save-slot-1') {
        throw new Error('not an exact durably prepared simulation intent');
      }
    }),
    claimDurablyPreparedSimAdvanceIntent: vi.fn((intent: object, saveId: string, rootSaveId: string, operation: string) => {
      if (intent !== preparedIntent || saveId !== 'save-slot-1' || rootSaveId !== 'save-slot-1' || operation !== preparedOperation) {
        throw new Error('not an exact durably prepared simulation intent');
      }
      if (workerAuthorizationClaimed) {
        throw new Error('durable intent already issued its one worker authorization');
      }
      workerAuthorizationClaimed = true;
    }),
  }));
  class MockWorker {
    addEventListener = vi.fn();
    postMessage = vi.fn();
    start = vi.fn();
    terminate = vi.fn();
    constructor() { workers.push(this); }
  }
  vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
  return { workers, preparedIntent };
}

async function authorize(
  session: { expectedSaveId: string; expectedRootSaveId: string },
  operation: 'simDay' | 'simWeek' | 'simMonth' | 'simToPlayoffs',
  preparedIntent: object,
) {
  const { createSimAdvanceWorkerAuthorization } = await import('@/shared/lib/workerMutationSession');
  return createSimAdvanceWorkerAuthorization(
    session as never,
    session.expectedSaveId,
    session.expectedRootSaveId,
    operation,
    preparedIntent,
  );
}

describe('useWorker simAdvance adapter', () => {
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

  it.each(['simDay', 'simWeek', 'simMonth', 'simToPlayoffs'] as const)(
    'runs only %s after an authorized baseline export',
    async (operation) => {
      const baseline = { schemaVersion: 34, season: 7, day: 12, phase: 'regular' };
      const post = { schemaVersion: 34, season: 7, day: 13, phase: 'regular' };
      const results = {
        simDay: { day: 13, flowStateChanged: false, marker: 'day' },
        simWeek: { day: 19, flowStateChanged: false, marker: 'week' },
        simMonth: { day: 43, flowStateChanged: false, marker: 'month' },
        simToPlayoffs: { day: 162, flowStateChanged: false, marker: 'playoffs' },
      };
      const workerApi = {
        ping: vi.fn().mockResolvedValue({ pong: true }),
        exportSnapshot: vi.fn().mockResolvedValueOnce(baseline).mockResolvedValueOnce(post),
        simDay: vi.fn().mockResolvedValue(results.simDay),
        simWeek: vi.fn().mockResolvedValue(results.simWeek),
        simMonth: vi.fn().mockResolvedValue(results.simMonth),
        simToPlayoffs: vi.fn().mockResolvedValue(results.simToPlayoffs),
      };
      const runtime = installRuntimeMocks(workerApi, {
        simDay: 'sim_day',
        simWeek: 'sim_week',
        simMonth: 'sim_month',
        simToPlayoffs: 'sim_to_playoffs',
      }[operation]);
      const { useGameStore } = await import('./useGameStore');
      useGameStore.getState().setActiveSave('save-slot-1', 1);
      const { useWorker } = await import('./useWorker');
      const { beginSimAdvanceWorkerSession, finishSimAdvanceWorkerSession } = await import('@/shared/lib/workerMutationSession');
      const ownership = await import('@/shared/lib/saveSessionOwnership');
      const workerRef: { current: ReturnType<typeof useWorker> | null } = { current: null };
      function Probe() { workerRef.current = useWorker(); return null; }
      await act(async () => { root.render(<Probe />); await Promise.resolve(); await Promise.resolve(); });
      const worker = workerRef.current;
      if (!worker) throw new Error('Worker hook did not render.');
      const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
      await expect(worker.simAdvance.exportSnapshot(session)).resolves.toEqual(baseline);
      const authorization = await authorize(session, operation, runtime.preparedIntent);
      await expect(worker.simAdvance.execute(session, authorization, operation)).resolves.toEqual({
        result: results[operation], flowStateChanged: false,
      });
      for (const method of ['simDay', 'simWeek', 'simMonth', 'simToPlayoffs'] as const) {
        expect(workerApi[method]).toHaveBeenCalledTimes(method === operation ? 1 : 0);
        if (method === operation) expect(workerApi[method]).toHaveBeenCalledWith();
      }
      await expect(worker.simAdvance.exportSnapshot(session)).resolves.toEqual(post);
      expect(() => worker.simAdvance.publishFlow(session)).not.toThrow();
      finishSimAdvanceWorkerSession(session);
      expect(ownership.assertSaveSessionSnapshotExportAuthorized).toHaveBeenCalledTimes(2);
      expect(ownership.assertActiveSaveSessionOwned).toHaveBeenCalled();
    },
  );

  it('rejects an invalid runtime operation without consuming baseline authority', async () => {
    const workerApi = {
      ping: vi.fn().mockResolvedValue({ pong: true }),
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
      simDay: vi.fn().mockResolvedValue({ flowStateChanged: false }), simWeek: vi.fn(), simMonth: vi.fn(), simToPlayoffs: vi.fn(),
    };
    const runtime = installRuntimeMocks(workerApi);
    const { useGameStore } = await import('./useGameStore'); useGameStore.getState().setActiveSave('save-slot-1', 1);
    const { useWorker } = await import('./useWorker');
    const { beginSimAdvanceWorkerSession, finishSimAdvanceWorkerSession } = await import('@/shared/lib/workerMutationSession');
    const ref: { current: ReturnType<typeof useWorker> | null } = { current: null };
    function Probe() { ref.current = useWorker(); return null; }
    await act(async () => { root.render(<Probe />); await Promise.resolve(); });
    const worker = ref.current!; const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    await worker.simAdvance.exportSnapshot(session);
    const authorization = await authorize(session, 'simDay', runtime.preparedIntent);
    await expect(worker.simAdvance.execute(session, authorization, 'simSeason' as import('./useWorker').SimAdvanceWorkerOperation)).rejects.toThrow('Unsupported');
    expect(workerApi.simDay).not.toHaveBeenCalled(); expect(workerApi.exportSnapshot).toHaveBeenCalledTimes(1);
    await worker.simAdvance.execute(session, authorization, 'simDay'); await worker.simAdvance.exportSnapshot(session);
    worker.simAdvance.discardFlow(session); finishSimAdvanceWorkerSession(session);
  });

  it('rejects forged, wrong-operation, and reused journal authorizations before Comlink gameplay', async () => {
    const workerApi = {
      ping: vi.fn().mockResolvedValue({ pong: true }),
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
      simDay: vi.fn().mockResolvedValue({ flowStateChanged: false }), simWeek: vi.fn(), simMonth: vi.fn(), simToPlayoffs: vi.fn(),
    };
    const runtime = installRuntimeMocks(workerApi);
    const { useGameStore } = await import('./useGameStore'); useGameStore.getState().setActiveSave('save-slot-1', 1);
    const { useWorker } = await import('./useWorker');
    const { beginSimAdvanceWorkerSession, createSimAdvanceWorkerAuthorization, finishSimAdvanceWorkerSession } = await import('@/shared/lib/workerMutationSession');
    const ref: { current: ReturnType<typeof useWorker> | null } = { current: null }; function Probe() { ref.current = useWorker(); return null; }
    await act(async () => { root.render(<Probe />); await Promise.resolve(); });
    const worker = ref.current!; const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    await worker.simAdvance.exportSnapshot(session);
    expect(() => createSimAdvanceWorkerAuthorization(session, 'save-slot-1', 'save-slot-1', 'simDay', {})).toThrow('durably prepared');
    await expect(worker.simAdvance.execute(session, {} as never, 'simDay')).rejects.toThrow();
    await expect(authorize(session, 'simWeek', runtime.preparedIntent)).rejects.toThrow('durably prepared');
    expect(workerApi.simDay).not.toHaveBeenCalled();
    const exact = await authorize(session, 'simDay', runtime.preparedIntent);
    await worker.simAdvance.execute(session, exact, 'simDay');
    await expect(worker.simAdvance.execute(session, exact, 'simDay')).rejects.toThrow();
    expect(workerApi.simDay).toHaveBeenCalledTimes(1);
    await worker.simAdvance.exportSnapshot(session); worker.simAdvance.discardFlow(session); finishSimAdvanceWorkerSession(session);
  });

  it('enforces phase ordering and poisons a rejected execution before later Comlink work', async () => {
    const workerApi = {
      ping: vi.fn().mockResolvedValue({ pong: true }),
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
      simDay: vi.fn().mockResolvedValue({ flowStateChanged: false }), simWeek: vi.fn(), simMonth: vi.fn(), simToPlayoffs: vi.fn(),
    };
    const runtime = installRuntimeMocks(workerApi);
    const { useGameStore } = await import('./useGameStore'); useGameStore.getState().setActiveSave('save-slot-1', 1);
    const { useWorker } = await import('./useWorker'); const { beginSimAdvanceWorkerSession, finishSimAdvanceWorkerSession } = await import('@/shared/lib/workerMutationSession');
    const ref: { current: ReturnType<typeof useWorker> | null } = { current: null }; function Probe() { ref.current = useWorker(); return null; }
    await act(async () => { root.render(<Probe />); await Promise.resolve(); });
    const worker = ref.current!; const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    const authorization = await authorize(session, 'simDay', runtime.preparedIntent);
    await expect(worker.simAdvance.execute(session, authorization, 'simDay')).rejects.toThrow('before its baseline');
    expect(workerApi.simDay).not.toHaveBeenCalled();
    await worker.simAdvance.exportSnapshot(session);
    await expect(worker.simAdvance.exportSnapshot(session)).rejects.toThrow('phase');
    expect(workerApi.exportSnapshot).toHaveBeenCalledTimes(1);
    await worker.simAdvance.execute(session, authorization, 'simDay');
    expect(() => worker.simAdvance.publishFlow(session)).toThrow('before post');
    await worker.simAdvance.exportSnapshot(session); worker.simAdvance.publishFlow(session);
    expect(() => worker.simAdvance.publishFlow(session)).toThrow('before post');
    expect(() => worker.simAdvance.discardFlow(session)).toThrow('phase'); finishSimAdvanceWorkerSession(session);
  });

  it('publishes deferred flow once while isolating throwing subscribers', async () => {
    const workerApi = {
      ping: vi.fn().mockResolvedValue({ pong: true }),
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
      simDay: vi.fn().mockResolvedValue({ flowStateChanged: true }), simWeek: vi.fn(), simMonth: vi.fn(), simToPlayoffs: vi.fn(),
    };
    const runtime = installRuntimeMocks(workerApi);
    const { useGameStore } = await import('./useGameStore'); useGameStore.getState().setActiveSave('save-slot-1', 1);
    const { useWorker } = await import('./useWorker'); const { beginSimAdvanceWorkerSession, finishSimAdvanceWorkerSession } = await import('@/shared/lib/workerMutationSession');
    const ref: { current: ReturnType<typeof useWorker> | null } = { current: null }; function Probe() { ref.current = useWorker(); return null; }
    await act(async () => { root.render(<Probe />); await Promise.resolve(); });
    const worker = ref.current!; const first = worker.subscribeToFlowUpdates(() => { throw new Error('flow listener'); }); const second = vi.fn(); const unsubscribe = worker.subscribeToFlowUpdates(second);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    const authorization = await authorize(session, 'simDay', runtime.preparedIntent);
    await worker.simAdvance.exportSnapshot(session); await worker.simAdvance.execute(session, authorization, 'simDay'); await worker.simAdvance.exportSnapshot(session);
    expect(second).not.toHaveBeenCalled(); expect(() => worker.simAdvance.publishFlow(session)).not.toThrow();
    expect(second).toHaveBeenCalledTimes(1); expect(consoleError).toHaveBeenCalled();
    expect(() => worker.simAdvance.publishFlow(session)).toThrow(); expect(second).toHaveBeenCalledTimes(1);
    first(); unsubscribe(); finishSimAdvanceWorkerSession(session);
  });

  it('restores a poisoned simulation baseline in a fresh worker without replaying gameplay', async () => {
    const baseline = { schemaVersion: 34, season: 7, day: 12, phase: 'regular' };
    const first = { ping: vi.fn().mockResolvedValue({ pong: true }), exportSnapshot: vi.fn().mockResolvedValue(baseline), simDay: vi.fn().mockRejectedValue(new Error('dispatched')) };
    const second = { ping: vi.fn().mockResolvedValue({ pong: true }), importSnapshot: vi.fn().mockResolvedValue({ success: true, flowStateChanged: true }), exportSnapshot: vi.fn().mockResolvedValue(baseline), simDay: vi.fn(), simWeek: vi.fn(), simMonth: vi.fn(), simToPlayoffs: vi.fn() };
    const runtime = installRuntimeMocks([first, second]);
    const { useGameStore } = await import('./useGameStore'); useGameStore.getState().setActiveSave('save-slot-1', 1);
    const { useWorker } = await import('./useWorker'); const { beginSimAdvanceWorkerSession, finishSimAdvanceWorkerSession } = await import('@/shared/lib/workerMutationSession');
    const ref: { current: ReturnType<typeof useWorker> | null } = { current: null }; function Probe() { ref.current = useWorker(); return null; }
    await act(async () => { root.render(<Probe />); await Promise.resolve(); });
    const worker = ref.current!; const flow = vi.fn(); const unsubscribe = worker.subscribeToFlowUpdates(flow); const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    const authorization = await authorize(session, 'simDay', runtime.preparedIntent);
    await worker.simAdvance.exportSnapshot(session); await expect(worker.simAdvance.execute(session, authorization, 'simDay')).rejects.toThrow('dispatched');
    await expect(worker.simAdvance.exportSnapshot(session)).rejects.toThrow(); await expect(() => worker.simAdvance.discardFlow(session)).toThrow();
    await expect(worker.simAdvance.restoreBaseline(session, baseline)).resolves.toEqual({ importResult: { success: true, flowStateChanged: true }, restoredSnapshot: baseline });
    const ownership = await import('@/shared/lib/saveSessionOwnership');
    expect(ownership.withActiveSaveSessionImportAuthorization).toHaveBeenCalledTimes(1);
    expect(ownership.withActiveSaveSessionImportAuthorization).toHaveBeenCalledWith('save-slot-1', expect.any(Function));
    expect(ownership.assertSaveSessionImportAuthorized).toHaveBeenCalledTimes(1);
    expect(ownership.withActiveSaveSessionSnapshotExportAuthorization).toHaveBeenCalledTimes(2);
    expect(ownership.assertSaveSessionSnapshotExportAuthorized).toHaveBeenCalledTimes(2);
    expect(runtime.workers).toHaveLength(2); expect(runtime.workers[0]!.terminate).toHaveBeenCalled(); expect(second.ping).toHaveBeenCalledTimes(2);
    expect(second.importSnapshot).toHaveBeenCalledWith(baseline); expect(second.exportSnapshot).toHaveBeenCalledTimes(1);
    expect(second.simDay).not.toHaveBeenCalled(); expect(flow).not.toHaveBeenCalled(); unsubscribe(); finishSimAdvanceWorkerSession(session);
  });

  it('invalidates the fresh worker and remains fail-closed when baseline import fails', async () => {
    const baseline = { schemaVersion: 34, season: 7, day: 12, phase: 'regular' };
    const first = { ping: vi.fn().mockResolvedValue({ pong: true }), exportSnapshot: vi.fn().mockResolvedValue(baseline) };
    const second = { ping: vi.fn().mockResolvedValue({ pong: true }), importSnapshot: vi.fn().mockResolvedValue({ success: false, error: 'bad baseline' }), exportSnapshot: vi.fn(), simDay: vi.fn() };
    const runtime = installRuntimeMocks([first, second]);
    const { useGameStore } = await import('./useGameStore'); useGameStore.getState().setActiveSave('save-slot-1', 1);
    const { useWorker } = await import('./useWorker'); const { beginSimAdvanceWorkerSession, finishSimAdvanceWorkerSession } = await import('@/shared/lib/workerMutationSession');
    const ref: { current: ReturnType<typeof useWorker> | null } = { current: null }; function Probe() { ref.current = useWorker(); return null; }
    await act(async () => { root.render(<Probe />); await Promise.resolve(); });
    const worker = ref.current!; const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1'); await worker.simAdvance.exportSnapshot(session);
    await expect(worker.simAdvance.restoreBaseline(session, baseline)).rejects.toThrow('Baseline snapshot import failed');
    const ownership = await import('@/shared/lib/saveSessionOwnership');
    expect(ownership.withActiveSaveSessionImportAuthorization).toHaveBeenCalledTimes(1);
    expect(ownership.withActiveSaveSessionImportAuthorization).toHaveBeenCalledWith('save-slot-1', expect.any(Function));
    expect(ownership.assertSaveSessionImportAuthorized).toHaveBeenCalledTimes(1);
    expect(ownership.withActiveSaveSessionSnapshotExportAuthorization).toHaveBeenCalledTimes(1);
    expect(ownership.assertSaveSessionSnapshotExportAuthorized).toHaveBeenCalledTimes(1);
    expect(runtime.workers).toHaveLength(2); expect(runtime.workers[0]!.terminate).toHaveBeenCalled(); expect(runtime.workers[1]!.terminate).toHaveBeenCalled(); expect(second.exportSnapshot).not.toHaveBeenCalled();
    await expect(worker.simAdvance.exportSnapshot(session)).rejects.toThrow(); expect(() => worker.simAdvance.publishFlow(session)).toThrow(); expect(() => worker.simAdvance.discardFlow(session)).toThrow(); finishSimAdvanceWorkerSession(session);
  });

  it('keeps ordinary calls fenced for the entire held adapter export permit', async () => {
    let resolveExport!: (snapshot: object) => void;
    const heldExport = new Promise<object>((resolve) => { resolveExport = resolve; });
    const workerApi = { ping: vi.fn().mockResolvedValue({ pong: true }), exportSnapshot: vi.fn().mockReturnValue(heldExport), simDay: vi.fn() };
    installRuntimeMocks(workerApi);
    const { useGameStore } = await import('./useGameStore'); useGameStore.getState().setActiveSave('save-slot-1', 1);
    const { useWorker } = await import('./useWorker'); const { beginSimAdvanceWorkerSession, finishSimAdvanceWorkerSession } = await import('@/shared/lib/workerMutationSession');
    const ref: { current: ReturnType<typeof useWorker> | null } = { current: null }; function Probe() { ref.current = useWorker(); return null; }
    await act(async () => { root.render(<Probe />); await Promise.resolve(); });
    const worker = ref.current!; const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    await expect(worker.simDay()).rejects.toThrow(); await expect(worker.exportSnapshot()).rejects.toThrow(); expect(workerApi.simDay).not.toHaveBeenCalled();
    const capture = worker.simAdvance.exportSnapshot(session); await vi.waitFor(() => expect(workerApi.exportSnapshot).toHaveBeenCalledTimes(1));
    expect(() => finishSimAdvanceWorkerSession(session)).toThrow('worker work is still active');
    await expect(worker.simDay()).rejects.toThrow(); await expect(worker.exportSnapshot()).rejects.toThrow();
    resolveExport({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }); await capture;
    worker.simAdvance.discardFlow(session); finishSimAdvanceWorkerSession(session); expect(workerApi.simDay).not.toHaveBeenCalled();
  });

  it('rejects wrong, stale, and completed adapter sessions before remote work', async () => {
    const workerApi = { ping: vi.fn().mockResolvedValue({ pong: true }), exportSnapshot: vi.fn(), simDay: vi.fn(), importSnapshot: vi.fn() };
    installRuntimeMocks(workerApi);
    const { useGameStore } = await import('./useGameStore'); useGameStore.getState().setActiveSave('save-slot-1', 1);
    const { useWorker } = await import('./useWorker'); const { beginSimAdvanceWorkerSession, finishSimAdvanceWorkerSession } = await import('@/shared/lib/workerMutationSession');
    const ref: { current: ReturnType<typeof useWorker> | null } = { current: null }; function Probe() { ref.current = useWorker(); return null; }
    await act(async () => { root.render(<Probe />); await Promise.resolve(); }); const worker = ref.current!;
    const wrong = await beginSimAdvanceWorkerSession('save-slot-2', 'save-slot-2');
    await expect(worker.simAdvance.exportSnapshot(wrong)).rejects.toThrow(); await expect(worker.simAdvance.execute(wrong, {} as never, 'simDay')).rejects.toThrow(); await expect(worker.simAdvance.restoreBaseline(wrong, {})).rejects.toThrow(); expect(() => worker.simAdvance.publishFlow(wrong)).toThrow(); expect(() => worker.simAdvance.discardFlow(wrong)).toThrow(); finishSimAdvanceWorkerSession(wrong);
    const stale = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1'); finishSimAdvanceWorkerSession(stale); await expect(worker.simAdvance.exportSnapshot(stale)).rejects.toThrow();
    const completed = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1'); worker.simAdvance.discardFlow(completed); await expect(worker.simAdvance.exportSnapshot(completed)).rejects.toThrow(); await expect(worker.simAdvance.execute(completed, {} as never, 'simDay')).rejects.toThrow(); await expect(worker.simAdvance.restoreBaseline(completed, {})).rejects.toThrow(); expect(() => worker.simAdvance.publishFlow(completed)).toThrow(); expect(() => worker.simAdvance.discardFlow(completed)).toThrow(); finishSimAdvanceWorkerSession(completed);
    expect(workerApi.exportSnapshot).not.toHaveBeenCalled(); expect(workerApi.simDay).not.toHaveBeenCalled(); expect(workerApi.importSnapshot).not.toHaveBeenCalled();
  });
});
