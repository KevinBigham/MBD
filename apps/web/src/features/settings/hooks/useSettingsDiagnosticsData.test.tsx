import { act, StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useSettingsDiagnosticsData } from './useSettingsDiagnosticsData';
import type {
  ActiveSavePersistenceReceipt,
  ActiveSavePersistenceStatus,
} from '@/shared/lib/activeSavePersistence';
import type { LocalStorageEstimate } from '@/shared/lib/saveSystem';
import type { OriginStorageEstimate } from '@/shared/lib/storagePressure';
import type { PerformanceDiagnosticsView } from '@/workers/sim.worker.diagnostics';
import type { SettingsOperationOwner } from '../lib/settingsOperationCoordinator';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useSettingsDiagnosticsData>[0];
type HookResult = ReturnType<typeof useSettingsDiagnosticsData>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useSettingsDiagnosticsData(options));
  return null;
}

function makeDiagnostics(overrides: Partial<PerformanceDiagnosticsView> = {}): PerformanceDiagnosticsView {
  return {
    totals: {
      totalSeasons: 12,
      snapshotSizeBytes: 524288,
      liveArchiveSeasons: 10,
      archivedSeasons: 2,
    },
    queues: {
      newsItems: 14,
      briefingItems: 4,
      tickerEntries: 9,
      staleTickerEntries: 2,
      activeWatchers: 3,
      resolvedWatchers: 1,
      staleWatchers: 1,
      scoutConflicts: 2,
    },
    runtime: {
      lastSimDayMs: 18.4,
      lastSaveMs: 11.2,
      lastLoadMs: 6.8,
    },
    queryTimings: {
      enabled: true,
      warningCount: 1,
      topSlowQueries: [
        {
          name: 'getDashboardSummary',
          callCount: 2,
          latestMs: 95,
          averageMs: 70,
          maxMs: 95,
          budgetMs: 80,
          overBudget: true,
        },
      ],
    },
    ...overrides,
  };
}

function makePersistenceStatus(overrides: Partial<ActiveSavePersistenceStatus> = {}): ActiveSavePersistenceStatus {
  return {
    state: 'idle',
    saveId: 'save-slot-1',
    saveName: 'Healthy Save',
    desiredGeneration: 0,
    durableGeneration: 0,
    pendingWrites: 0,
    canRetry: false,
    lastSavedAt: null,
    errorMessage: null,
    failureKind: null,
    recovery: null,
    ...overrides,
  };
}

function makeReceipt(
  saveId = 'save-slot-1',
  generation = 1,
): ActiveSavePersistenceReceipt {
  return Object.freeze({ saveId, generation }) as ActiveSavePersistenceReceipt;
}

function makeSettingsOwner(label = 'test'): SettingsOperationOwner {
  return Symbol(label) as SettingsOperationOwner;
}

function makeLocalEstimate(bytes = 1000): LocalStorageEstimate {
  return {
    status: 'available',
    allMbdBytes: bytes,
    allMbdBytesKnown: true,
    unattributedBytes: 0,
    trees: [],
    message: null,
  };
}

function makeOriginEstimate(percentage = 50): OriginStorageEstimate {
  return {
    status: 'available',
    usage: percentage,
    quota: 100,
    percentage,
    pressure: percentage >= 90 ? 'critical' : percentage >= 80 ? 'warning' : 'normal',
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

describe('useSettingsDiagnosticsData', () => {
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
    const persistenceStatus = makePersistenceStatus();
    const settingsOwner = makeSettingsOwner();
    return {
      activeManagedSaveId: 'save-slot-1',
      archiveOldSeasons: vi.fn().mockResolvedValue({
        archivedCount: 2,
        diagnostics: makeDiagnostics({
          totals: {
            totalSeasons: 12,
            snapshotSizeBytes: 500000,
            liveArchiveSeasons: 8,
            archivedSeasons: 4,
          },
        }),
      }),
      getPerformanceDiagnostics: vi.fn().mockResolvedValue(makeDiagnostics()),
      getPersistenceStatus: vi.fn().mockReturnValue(persistenceStatus),
      beginSettingsOperation: vi.fn().mockReturnValue(settingsOwner),
      finishSettingsOperation: vi.fn(),
      onStatusChange: vi.fn(),
      persistenceStatus,
      persistActiveSave: vi.fn().mockResolvedValue({
        saved: true,
        saveName: 'Healthy Save',
      }),
      pruneStaleData: vi.fn().mockResolvedValue({
        prunedCount: 3,
        diagnostics: makeDiagnostics({
          queues: {
            newsItems: 14,
            briefingItems: 4,
            tickerEntries: 7,
            staleTickerEntries: 0,
            activeWatchers: 2,
            resolvedWatchers: 0,
            staleWatchers: 0,
            scoutConflicts: 2,
          },
        }),
      }),
      readLocalStorageEstimate: vi.fn().mockResolvedValue(makeLocalEstimate()),
      readOriginStorageEstimate: vi.fn().mockResolvedValue(makeOriginEstimate()),
      workerReady: true,
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

  async function waitForAssertion(assertion: () => void) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        assertion();
        return;
      } catch (error) {
        lastError = error;
      }
      await act(async () => {
        await Promise.resolve();
      });
    }
    throw lastError;
  }

  it('loads runtime diagnostics when the worker is ready', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.diagnostics?.totals.totalSeasons).toBe(12);
      expect(latestResult?.diagnostics?.queryTimings.warningCount).toBe(1);
    });

    expect(options.getPerformanceDiagnostics).toHaveBeenCalledTimes(1);
  });

  it('clears diagnostics and skips worker calls until diagnostics are available', async () => {
    const options = baseOptions({
      getPerformanceDiagnostics: undefined,
      workerReady: false,
    });
    await renderHook(options);

    await act(async () => {
      await Promise.resolve();
    });

    expect(latestResult?.diagnostics).toBeNull();
    expect(latestResult?.diagnosticsBusy).toBe(false);
  });

  it('keeps historical archive protected and prunes the active managed save with status updates', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.diagnostics?.totals.archivedSeasons).toBe(2);
    });

    await act(async () => {
      await latestResult?.handleArchiveOldSeasons();
    });

    expect(options.archiveOldSeasons).not.toHaveBeenCalled();
    expect(options.persistActiveSave).not.toHaveBeenCalled();
    expect(options.onStatusChange).toHaveBeenCalledWith('Detailed season history is protected. Lossless archival is not available.');

    await act(async () => {
      await latestResult?.handlePruneStaleData('save-slot-1', { staleTickerEntries: 2, staleWatchers: 1 });
    });

    expect(options.pruneStaleData).toHaveBeenCalledWith();
    expect(options.persistActiveSave).toHaveBeenCalledTimes(1);
    expect(vi.mocked(options.getPerformanceDiagnostics!).mock.invocationCallOrder[1]!).toBeLessThan(
      vi.mocked(options.pruneStaleData!).mock.invocationCallOrder[0]!,
    );
    expect(vi.mocked(options.pruneStaleData!).mock.invocationCallOrder[0]!).toBeLessThan(
      vi.mocked(options.persistActiveSave).mock.invocationCallOrder[0]!,
    );
    expect(options.onStatusChange).toHaveBeenCalledWith('Pruned 3 expired ticker entries or resolved/expired consequence watchers from the active save.');
  });

  it('does not claim durable pruning when coordinator persistence fails', async () => {
    const persistActiveSave = vi.fn().mockResolvedValue({
      saved: false,
      saveName: 'Healthy Save',
    });
    const options = baseOptions({ persistActiveSave });
    await renderHook(options);

    await act(async () => {
      await latestResult?.handlePruneStaleData('save-slot-1', { staleTickerEntries: 2, staleWatchers: 1 });
    });

    expect(options.pruneStaleData).toHaveBeenCalledTimes(1);
    expect(persistActiveSave).toHaveBeenCalledTimes(1);
    expect(latestResult?.diagnostics?.totals.archivedSeasons).toBe(2);
    expect(options.onStatusChange).toHaveBeenLastCalledWith(
      'Pruned 3 stale entries in memory, but the change is not durable. Reload restores the prior durable save; Retry cannot preserve this maintenance change.',
    );
  });

  it('keeps the prior read-only diagnostics and durable truth when post-write telemetry fails', async () => {
    const before = makeDiagnostics();
    const mutationDto = makeDiagnostics({ totals: { ...before.totals, snapshotSizeBytes: 0 } });
    const getPerformanceDiagnostics = vi.fn()
      .mockResolvedValueOnce(before)
      .mockResolvedValueOnce(before)
      .mockRejectedValueOnce(new Error('telemetry unavailable'));
    const options = baseOptions({
      getPerformanceDiagnostics,
      pruneStaleData: vi.fn().mockResolvedValue({ prunedCount: 3, diagnostics: mutationDto }),
    });
    await renderHook(options);
    await waitForAssertion(() => expect(latestResult?.diagnostics?.totals.snapshotSizeBytes).toBe(524288));
    await act(async () => { await latestResult?.handlePruneStaleData('save-slot-1', { staleTickerEntries: 2, staleWatchers: 1 }); });
    expect(options.pruneStaleData).toHaveBeenCalledTimes(1);
    expect(options.persistActiveSave).toHaveBeenCalledTimes(1);
    expect(latestResult?.diagnostics?.totals.snapshotSizeBytes).toBe(524288);
    expect(latestResult?.telemetryUnavailable).toBe(true);
    expect(options.onStatusChange).toHaveBeenLastCalledWith(
      'Pruned 3 expired ticker entries or resolved/expired consequence watchers and saved them durably. Telemetry is temporarily unavailable.',
    );
  });

  it('does not retain a retry or call persistence when the worker mutation rejects', async () => {
    const options = baseOptions({ pruneStaleData: vi.fn().mockRejectedValue(new Error('mutation rejected')) });
    await renderHook(options);
    await act(async () => { await latestResult?.handlePruneStaleData('save-slot-1', { staleTickerEntries: 2, staleWatchers: 1 }); });
    expect(options.pruneStaleData).toHaveBeenCalledTimes(1);
    expect(options.persistActiveSave).not.toHaveBeenCalled();
    expect(options.onStatusChange).toHaveBeenLastCalledWith('Stale-data maintenance did not complete. No durable storage claim was made.');
  });

  it('does not enqueue persistence when maintenance finds nothing to mutate', async () => {
    const persistActiveSave = vi.fn().mockResolvedValue({
      saved: true,
      saveName: 'Healthy Save',
    });
    const options = baseOptions({
      archiveOldSeasons: vi.fn().mockResolvedValue({
        archivedCount: 0,
        diagnostics: makeDiagnostics(),
      }),
      persistActiveSave,
      pruneStaleData: vi.fn().mockResolvedValue({
        prunedCount: 0,
        diagnostics: makeDiagnostics(),
      }),
    });
    await renderHook(options);

    await act(async () => {
      await latestResult?.handlePruneStaleData('save-slot-1', { staleTickerEntries: 2, staleWatchers: 1 });
    });
    expect(persistActiveSave).not.toHaveBeenCalled();
    expect(options.onStatusChange).toHaveBeenLastCalledWith('No expired ticker entries or resolved/expired consequence watchers needed pruning.');
  });

  it('fails closed before Comlink for a stale confirmation or competing Settings operation', async () => {
    const beginSettingsOperation = vi.fn().mockReturnValue(makeSettingsOwner('stale-confirmation'));
    const options = baseOptions({ beginSettingsOperation });
    await renderHook(options);
    await act(async () => { await latestResult?.handlePruneStaleData('save-slot-2', { staleTickerEntries: 2, staleWatchers: 1 }); });
    expect(options.pruneStaleData).not.toHaveBeenCalled();
    expect(options.persistActiveSave).not.toHaveBeenCalled();
  });

  it('does not reach Comlink, export, or persistence when the shared Settings latch is already owned', async () => {
    const beginSettingsOperation = vi.fn().mockReturnValue(null);
    const options = baseOptions({ beginSettingsOperation });
    await renderHook(options);
    await act(async () => { await latestResult?.handlePruneStaleData('save-slot-1', { staleTickerEntries: 2, staleWatchers: 1 }); });
    expect(beginSettingsOperation).toHaveBeenCalledTimes(1);
    expect(options.pruneStaleData).not.toHaveBeenCalled();
    expect(options.persistActiveSave).not.toHaveBeenCalled();
  });

  it('fails closed when the exact stale ticker/watcher eligibility changed after confirmation', async () => {
    const initial = makeDiagnostics();
    const changed = makeDiagnostics({
      queues: { ...initial.queues, staleTickerEntries: 1, staleWatchers: 1 },
    });
    const getPerformanceDiagnostics = vi.fn()
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(changed);
    const options = baseOptions({ getPerformanceDiagnostics });
    await renderHook(options);
    await waitForAssertion(() => expect(latestResult?.diagnostics).toEqual(initial));
    await act(async () => {
      await latestResult?.handlePruneStaleData('save-slot-1', { staleTickerEntries: 2, staleWatchers: 1 });
    });
    expect(options.pruneStaleData).not.toHaveBeenCalled();
    expect(options.persistActiveSave).not.toHaveBeenCalled();
    expect(options.onStatusChange).toHaveBeenLastCalledWith(
      'Prune confirmation expired because stale-data eligibility changed. Reopen it to review current facts.',
    );
  });

  it('fails closed when the active save changes while exact eligibility is being revalidated', async () => {
    const initial = makeDiagnostics();
    let resolveRevalidation!: (value: PerformanceDiagnosticsView) => void;
    const getPerformanceDiagnostics = vi.fn()
      .mockResolvedValueOnce(initial)
      .mockImplementationOnce(() => new Promise<PerformanceDiagnosticsView>((resolve) => { resolveRevalidation = resolve; }));
    const optionsA = baseOptions({ activeManagedSaveId: 'save-slot-1', getPerformanceDiagnostics });
    await renderHook(optionsA);
    await waitForAssertion(() => expect(latestResult?.diagnostics).toEqual(initial));
    let pending!: Promise<void>;
    await act(async () => {
      pending = latestResult!.handlePruneStaleData('save-slot-1', { staleTickerEntries: 2, staleWatchers: 1 });
      await Promise.resolve();
    });
    const optionsB = { ...optionsA, activeManagedSaveId: 'save-slot-2' };
    await act(async () => { root.render(<HookHarness options={optionsB} onRender={(result) => { latestResult = result; }} />); });
    await act(async () => { resolveRevalidation(initial); await pending; });
    expect(optionsA.pruneStaleData).not.toHaveBeenCalled();
    expect(optionsA.persistActiveSave).not.toHaveBeenCalled();
    expect(optionsA.onStatusChange).toHaveBeenLastCalledWith(
      'Prune confirmation expired because the active save changed. Reopen it to review current facts.',
    );
  });

  it('does not install a slower diagnostics read after the active save changes', async () => {
    let resolveA!: (value: PerformanceDiagnosticsView) => void;
    let resolveB!: (value: PerformanceDiagnosticsView) => void;
    const getPerformanceDiagnostics = vi.fn()
      .mockImplementationOnce(() => new Promise<PerformanceDiagnosticsView>((resolve) => { resolveA = resolve; }))
      .mockImplementationOnce(() => new Promise<PerformanceDiagnosticsView>((resolve) => { resolveB = resolve; }));
    const optionsA = baseOptions({ activeManagedSaveId: 'save-slot-1', getPerformanceDiagnostics });
    await renderHook(optionsA);
    const optionsB = { ...optionsA, activeManagedSaveId: 'save-slot-2' };
    await act(async () => { root.render(<HookHarness options={optionsB} onRender={(result) => { latestResult = result; }} />); });
    await act(async () => { resolveB(makeDiagnostics({ totals: { ...makeDiagnostics().totals, totalSeasons: 22 } })); });
    await act(async () => { resolveA(makeDiagnostics({ totals: { ...makeDiagnostics().totals, totalSeasons: 11 } })); });
    expect(latestResult?.diagnostics?.totals.totalSeasons).toBe(22);
  });

  it('clears A while B loads and leaves B unavailable when its exact diagnostics request rejects', async () => {
    let resolveA!: (value: PerformanceDiagnosticsView) => void;
    let rejectB!: (error: Error) => void;
    const getPerformanceDiagnostics = vi.fn()
      .mockImplementationOnce(() => new Promise<PerformanceDiagnosticsView>((resolve) => { resolveA = resolve; }))
      .mockImplementationOnce(() => new Promise<PerformanceDiagnosticsView>((_resolve, reject) => { rejectB = reject; }));
    const optionsA = baseOptions({ activeManagedSaveId: 'save-slot-1', getPerformanceDiagnostics });
    await renderHook(optionsA);
    const optionsB = { ...optionsA, activeManagedSaveId: 'save-slot-2' };
    await act(async () => { root.render(<HookHarness options={optionsB} onRender={(result) => { latestResult = result; }} />); });
    expect(latestResult?.diagnostics).toBeNull();
    await act(async () => { resolveA(makeDiagnostics()); rejectB(new Error('B rejected')); });
    expect(latestResult?.diagnostics).toBeNull();
  });

  it('does not cancel the coherent worker/local/origin refresh when failure truth changes', async () => {
    const pendingWorker = deferred<PerformanceDiagnosticsView>();
    const pendingLocal = deferred<LocalStorageEstimate>();
    const pendingOrigin = deferred<OriginStorageEstimate>();
    const quotaStatus = makePersistenceStatus({ state: 'failed', failureKind: 'quota' });
    const options = baseOptions({
      getPerformanceDiagnostics: vi.fn().mockReturnValue(pendingWorker.promise),
      persistenceFailureKind: 'quota',
      persistenceState: 'failed',
      persistenceStatus: quotaStatus,
      readLocalStorageEstimate: vi.fn().mockReturnValue(pendingLocal.promise),
      readOriginStorageEstimate: vi.fn().mockReturnValue(pendingOrigin.promise),
    });
    await renderHook(options);
    expect(latestResult?.originEstimate?.pressure).toBe('critical');

    const recoveredStatus = makePersistenceStatus({ state: 'saved', failureKind: null });
    await act(async () => {
      root.render(<HookHarness options={{
        ...options,
        persistenceFailureKind: null,
        persistenceState: 'saved',
        persistenceStatus: recoveredStatus,
      }} onRender={(result) => { latestResult = result; }} />);
      pendingWorker.resolve(makeDiagnostics({ totals: { ...makeDiagnostics().totals, totalSeasons: 22 } }));
      pendingLocal.resolve(makeLocalEstimate(2200));
      pendingOrigin.resolve(makeOriginEstimate(85));
    });

    await waitForAssertion(() => {
      expect(latestResult?.diagnostics?.totals.totalSeasons).toBe(22);
      expect(latestResult?.localEstimate?.allMbdBytes).toBe(2200);
      expect(latestResult?.originEstimate?.percentage).toBe(85);
      expect(latestResult?.originEstimate?.pressure).toBe('warning');
    });
    expect(options.getPerformanceDiagnostics).toHaveBeenCalledTimes(1);
    expect(options.readLocalStorageEstimate).toHaveBeenCalledTimes(1);
    expect(options.readOriginStorageEstimate).toHaveBeenCalledTimes(1);
  });

  it('refreshes coherent telemetry when a cross-remount Settings owner releases', async () => {
    const getPerformanceDiagnostics = vi.fn()
      .mockResolvedValueOnce(makeDiagnostics())
      .mockResolvedValueOnce(makeDiagnostics({ totals: { ...makeDiagnostics().totals, snapshotSizeBytes: 600000 } }));
    const readLocalStorageEstimate = vi.fn()
      .mockResolvedValueOnce(makeLocalEstimate(1000))
      .mockResolvedValueOnce(makeLocalEstimate(900));
    const readOriginStorageEstimate = vi.fn()
      .mockResolvedValueOnce(makeOriginEstimate(85))
      .mockResolvedValueOnce(makeOriginEstimate(86));
    const options = baseOptions({
      getPerformanceDiagnostics,
      readLocalStorageEstimate,
      readOriginStorageEstimate,
      settingsOperationBusy: true,
    });
    await renderHook(options);
    await waitForAssertion(() => expect(latestResult?.localEstimate?.allMbdBytes).toBe(1000));

    await act(async () => {
      root.render(<HookHarness options={{ ...options, settingsOperationBusy: false }} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    await waitForAssertion(() => {
      expect(latestResult?.diagnostics?.totals.snapshotSizeBytes).toBe(600000);
      expect(latestResult?.localEstimate?.allMbdBytes).toBe(900);
      expect(latestResult?.originEstimate?.percentage).toBe(86);
    });
    expect(getPerformanceDiagnostics).toHaveBeenCalledTimes(2);
    expect(readLocalStorageEstimate).toHaveBeenCalledTimes(2);
    expect(readOriginStorageEstimate).toHaveBeenCalledTimes(2);
  });

  it('holds the shared Settings latch through worker, local, origin, final status, and telemetry settlement', async () => {
    const postWorker = deferred<PerformanceDiagnosticsView>();
    const postLocal = deferred<LocalStorageEstimate>();
    const postOrigin = deferred<OriginStorageEstimate>();
    const settingsOwner = makeSettingsOwner('full-telemetry');
    const beginSettingsOperation = vi.fn().mockReturnValue(settingsOwner);
    const finishSettingsOperation = vi.fn();
    const onStatusChange = vi.fn();
    const getPerformanceDiagnostics = vi.fn()
      .mockResolvedValueOnce(makeDiagnostics())
      .mockResolvedValueOnce(makeDiagnostics())
      .mockReturnValueOnce(postWorker.promise);
    const readLocalStorageEstimate = vi.fn()
      .mockResolvedValueOnce(makeLocalEstimate(1000))
      .mockReturnValueOnce(postLocal.promise);
    const readOriginStorageEstimate = vi.fn()
      .mockResolvedValueOnce(makeOriginEstimate(50))
      .mockReturnValueOnce(postOrigin.promise);
    const options = baseOptions({
      beginSettingsOperation,
      finishSettingsOperation,
      getPerformanceDiagnostics,
      onStatusChange,
      readLocalStorageEstimate,
      readOriginStorageEstimate,
    });
    await renderHook(options);
    await waitForAssertion(() => expect(latestResult?.diagnostics).not.toBeNull());
    let operation!: Promise<void>;
    await act(async () => {
      operation = latestResult!.handlePruneStaleData('save-slot-1', { staleTickerEntries: 2, staleWatchers: 1 });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(finishSettingsOperation).not.toHaveBeenCalled();
    expect(onStatusChange).not.toHaveBeenCalledWith(expect.stringContaining('from the active save'));
    await act(async () => {
      postWorker.resolve(makeDiagnostics({ totals: { ...makeDiagnostics().totals, snapshotSizeBytes: 500000 } }));
      await Promise.resolve();
    });
    expect(finishSettingsOperation).not.toHaveBeenCalled();
    await act(async () => {
      postLocal.resolve(makeLocalEstimate(900));
      postOrigin.resolve(makeOriginEstimate(85));
      await operation;
    });
    expect(latestResult?.localEstimate?.allMbdBytes).toBe(900);
    expect(latestResult?.originEstimate?.percentage).toBe(85);
    expect(onStatusChange).toHaveBeenLastCalledWith(
      'Pruned 3 expired ticker entries or resolved/expired consequence watchers from the active save.',
    );
    expect(onStatusChange.mock.invocationCallOrder.at(-1)).toBeLessThan(
      finishSettingsOperation.mock.invocationCallOrder[0]!,
    );
    expect(finishSettingsOperation).toHaveBeenCalledWith(settingsOwner);
  });

  it('reconciles only the exact accepted maintenance receipt after persistence-only Retry', async () => {
    const receipt = makeReceipt();
    let receiptDurable = false;
    let liveStatus = makePersistenceStatus();
    const getPersistenceStatus = vi.fn(() => liveStatus);
    const onStatusChange = vi.fn();
    const settingsOwner = makeSettingsOwner('retry-reconciliation');
    const beginSettingsOperation = vi.fn().mockReturnValue(settingsOwner);
    const finishSettingsOperation = vi.fn();
    const persistActiveSave = vi.fn().mockImplementation(async () => {
      liveStatus = makePersistenceStatus({
        state: 'failed',
        desiredGeneration: 1,
        durableGeneration: 0,
        pendingWrites: 1,
        canRetry: true,
        failureKind: 'quota',
      });
      return { acceptedReceipt: receipt, saved: false, saveName: 'Healthy Save' };
    });
    const options = baseOptions({
      beginSettingsOperation,
      finishSettingsOperation,
      getPersistenceStatus,
      isPersistenceReceiptDurable: (candidate) => receiptDurable && candidate === receipt,
      onStatusChange,
      persistenceState: 'idle',
      persistenceStatus: liveStatus,
      persistActiveSave,
    });
    await renderHook(options);
    await waitForAssertion(() => expect(latestResult?.diagnostics).not.toBeNull());
    await act(async () => {
      await latestResult!.handlePruneStaleData('save-slot-1', { staleTickerEntries: 2, staleWatchers: 1 });
    });
    expect(onStatusChange).toHaveBeenLastCalledWith(
      'Pruned 3 stale entries in memory, but the change is not durable. Reload restores the prior durable save; Use the persistence-only Retry in save status.',
    );
    expect(options.pruneStaleData).toHaveBeenCalledTimes(1);
    expect(options.persistActiveSave).toHaveBeenCalledTimes(1);

    receiptDurable = true;
    liveStatus = makePersistenceStatus({
      state: 'saved',
      desiredGeneration: 1,
      durableGeneration: 1,
      pendingWrites: 0,
      canRetry: false,
    });
    await act(async () => {
      root.render(<HookHarness options={{ ...options, persistenceState: 'saved', persistenceStatus: liveStatus }} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    await waitForAssertion(() => {
      expect(onStatusChange).toHaveBeenLastCalledWith(
        'Pruned 3 stale entries and saved them durably through persistence-only Retry.',
      );
    });
    expect(options.pruneStaleData).toHaveBeenCalledTimes(1);
    expect(options.persistActiveSave).toHaveBeenCalledTimes(1);
    expect(finishSettingsOperation).toHaveBeenCalledTimes(2);
    expect(finishSettingsOperation).toHaveBeenNthCalledWith(1, settingsOwner);
    expect(finishSettingsOperation).toHaveBeenNthCalledWith(2, settingsOwner);
  });

  it('does not associate an older retained job with a new maintenance export failure', async () => {
    let liveStatus = makePersistenceStatus({
      state: 'failed', desiredGeneration: 1, durableGeneration: 0, pendingWrites: 1, canRetry: true, failureKind: 'quota',
    });
    const onStatusChange = vi.fn();
    const options = baseOptions({
      getPersistenceStatus: vi.fn(() => liveStatus),
      onStatusChange,
      persistenceState: 'failed',
      persistenceStatus: liveStatus,
      persistActiveSave: vi.fn().mockResolvedValue({ acceptedReceipt: null, saved: false, saveName: null }),
    });
    await renderHook(options);
    await waitForAssertion(() => expect(latestResult?.diagnostics).not.toBeNull());
    await act(async () => {
      await latestResult!.handlePruneStaleData('save-slot-1', { staleTickerEntries: 2, staleWatchers: 1 });
    });
    const failureCopy = vi.mocked(onStatusChange).mock.calls.at(-1)?.[0];
    expect(failureCopy).toBe(
      'Pruned 3 stale entries in memory, but the change is not durable. Reload restores the prior durable save; Retry cannot preserve this maintenance change.',
    );
    liveStatus = makePersistenceStatus({
      state: 'saved', desiredGeneration: 1, durableGeneration: 1, pendingWrites: 0, canRetry: false,
    });
    await act(async () => {
      root.render(<HookHarness options={{ ...options, persistenceState: 'saved', persistenceStatus: liveStatus }} onRender={(result) => {
        latestResult = result;
      }} />);
      await Promise.resolve();
    });
    expect(vi.mocked(onStatusChange).mock.calls.at(-1)?.[0]).toBe(failureCopy);
    expect(options.pruneStaleData).toHaveBeenCalledTimes(1);
  });

  it('does not reconcile a receipt after same-save activation resets and reuses generation one', async () => {
    const receipt = makeReceipt();
    let liveStatus = makePersistenceStatus();
    const onStatusChange = vi.fn();
    const options = baseOptions({
      getPersistenceStatus: vi.fn(() => liveStatus),
      isPersistenceReceiptDurable: vi.fn().mockReturnValue(false),
      onStatusChange,
      persistenceStatus: liveStatus,
      persistActiveSave: vi.fn().mockImplementation(async () => {
        liveStatus = makePersistenceStatus({
          state: 'failed', desiredGeneration: 1, durableGeneration: 0, pendingWrites: 1, canRetry: true, failureKind: 'quota',
        });
        return { acceptedReceipt: receipt, saved: false, saveName: null };
      }),
    });
    await renderHook(options);
    await waitForAssertion(() => expect(latestResult?.diagnostics).not.toBeNull());
    await act(async () => {
      await latestResult!.handlePruneStaleData('save-slot-1', { staleTickerEntries: 2, staleWatchers: 1 });
    });
    const failureCopy = vi.mocked(onStatusChange).mock.calls.at(-1)?.[0];

    liveStatus = makePersistenceStatus();
    await act(async () => {
      root.render(<HookHarness options={{ ...options, persistenceState: 'idle', persistenceStatus: liveStatus }} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    liveStatus = makePersistenceStatus({
      state: 'saved', desiredGeneration: 1, durableGeneration: 1, pendingWrites: 0,
    });
    await act(async () => {
      root.render(<HookHarness options={{ ...options, persistenceState: 'saved', persistenceStatus: liveStatus }} onRender={(result) => {
        latestResult = result;
      }} />);
      await Promise.resolve();
    });

    expect(vi.mocked(onStatusChange).mock.calls.at(-1)?.[0]).toBe(failureCopy);
    expect(options.pruneStaleData).toHaveBeenCalledTimes(1);
    expect(options.persistActiveSave).toHaveBeenCalledTimes(1);
  });

  it('installs current telemetry under React StrictMode effect replay', async () => {
    const options = baseOptions();
    await act(async () => {
      root.render(
        <StrictMode>
          <HookHarness options={options} onRender={(result) => { latestResult = result; }} />
        </StrictMode>,
      );
    });
    await waitForAssertion(() => {
      expect(latestResult?.diagnostics?.totals.totalSeasons).toBe(12);
      expect(latestResult?.localEstimate?.allMbdBytes).toBe(1000);
      expect(latestResult?.originEstimate?.percentage).toBe(50);
    });
  });

  it('returns false and performs no status update when a refresh settles after unmount', async () => {
    const localContainer = document.createElement('div');
    document.body.appendChild(localContainer);
    const localRoot = createRoot(localContainer);
    const pendingDiagnostics = deferred<PerformanceDiagnosticsView>();
    const onStatusChange = vi.fn();
    const options = baseOptions({
      getPerformanceDiagnostics: vi.fn().mockReturnValue(pendingDiagnostics.promise),
      onStatusChange,
    });
    let localResult: HookResult | null = null;
    await act(async () => {
      localRoot.render(<HookHarness options={options} onRender={(result) => { localResult = result; }} />);
    });
    const refresh = localResult!.refreshDiagnostics('save-slot-1');
    await act(async () => { localRoot.unmount(); });
    await act(async () => {
      pendingDiagnostics.resolve(makeDiagnostics());
      expect(await refresh).toBe(false);
    });
    expect(onStatusChange).not.toHaveBeenCalled();
    localContainer.remove();
  });
});
