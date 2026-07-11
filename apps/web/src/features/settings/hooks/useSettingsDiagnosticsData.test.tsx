import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useSettingsDiagnosticsData } from './useSettingsDiagnosticsData';
import type { PerformanceDiagnosticsView } from '@/workers/sim.worker.diagnostics';

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
      onStatusChange: vi.fn(),
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
            scoutConflicts: 2,
          },
        }),
      }),
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
    expect(latestResult?.diagnosticsBusy).toBeNull();
  });

  it('archives and prunes the active managed save with status updates', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.diagnostics?.totals.archivedSeasons).toBe(2);
    });

    await act(async () => {
      await latestResult?.handleArchiveOldSeasons();
    });

    expect(options.archiveOldSeasons).toHaveBeenCalledWith();
    expect(options.persistActiveSave).toHaveBeenCalledTimes(1);
    expect(vi.mocked(options.archiveOldSeasons!).mock.invocationCallOrder[0]!).toBeLessThan(
      vi.mocked(options.persistActiveSave).mock.invocationCallOrder[0]!,
    );
    expect(options.onStatusChange).toHaveBeenCalledWith('');
    expect(options.onStatusChange).toHaveBeenCalledWith('Archived 2 older seasons into the long-term archive.');
    expect(latestResult?.diagnostics?.totals.archivedSeasons).toBe(4);

    await act(async () => {
      await latestResult?.handlePruneStaleData();
    });

    expect(options.pruneStaleData).toHaveBeenCalledWith();
    expect(options.persistActiveSave).toHaveBeenCalledTimes(2);
    expect(vi.mocked(options.pruneStaleData!).mock.invocationCallOrder[0]!).toBeLessThan(
      vi.mocked(options.persistActiveSave).mock.invocationCallOrder[1]!,
    );
    expect(options.onStatusChange).toHaveBeenCalledWith('Pruned 3 stale entries from the active save.');
    expect(latestResult?.diagnostics?.queues.staleTickerEntries).toBe(0);
  });

  it('reports a completed mutation separately when coordinator persistence fails', async () => {
    const persistActiveSave = vi.fn().mockResolvedValue({
      saved: false,
      saveName: 'Healthy Save',
    });
    const options = baseOptions({ persistActiveSave });
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleArchiveOldSeasons();
    });

    expect(options.archiveOldSeasons).toHaveBeenCalledTimes(1);
    expect(persistActiveSave).toHaveBeenCalledTimes(1);
    expect(latestResult?.diagnostics?.totals.archivedSeasons).toBe(4);
    expect(options.onStatusChange).toHaveBeenLastCalledWith(
      'Archived 2 older seasons, but the updated save was not durable. Use Retry in the save status.',
    );
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
      await latestResult?.handleArchiveOldSeasons();
    });
    expect(persistActiveSave).not.toHaveBeenCalled();
    expect(options.onStatusChange).toHaveBeenLastCalledWith('No older seasons needed archiving.');

    await act(async () => {
      await latestResult?.handlePruneStaleData();
    });
    expect(persistActiveSave).not.toHaveBeenCalled();
    expect(options.onStatusChange).toHaveBeenLastCalledWith('No stale entries needed pruning.');
  });
});
