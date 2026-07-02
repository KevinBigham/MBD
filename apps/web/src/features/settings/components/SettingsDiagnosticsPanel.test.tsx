import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import SettingsDiagnosticsPanel from './SettingsDiagnosticsPanel';
import type { PerformanceDiagnosticsView } from '@/workers/sim.worker.diagnostics';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const diagnostics: PerformanceDiagnosticsView = {
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
};

describe('SettingsDiagnosticsPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders runtime, storage, maintenance, and worker query diagnostics', async () => {
    const onArchiveOldSeasons = vi.fn();
    const onPruneStaleData = vi.fn();

    await act(async () => {
      root.render(
        <SettingsDiagnosticsPanel
          activeManagedSaveId="save-slot-1"
          diagnostics={diagnostics}
          diagnosticsBusy={null}
          onArchiveOldSeasons={onArchiveOldSeasons}
          onPruneStaleData={onPruneStaleData}
        />,
      );
    });

    expect(container.textContent).toContain('Runtime');
    expect(container.textContent).toContain('Last Sim Day: 18.4 ms');
    expect(container.textContent).toContain('524.3 KB');
    expect(container.textContent).toContain('10 live season archives');
    expect(container.textContent).toContain('9 ticker entries');
    expect(container.textContent).toContain('14 news items');
    expect(container.textContent).toContain('Worker Query Diagnostics');
    expect(container.textContent).toContain('1 budget warnings');
    expect(container.textContent).toContain('getDashboardSummary');
    expect(container.textContent).toContain('2 calls, 70.0 ms avg');
    expect(container.textContent).toContain('95.0 ms max');
    expect(container.textContent).toContain('Over 80.0 ms budget');

    const archiveButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Archive Older Seasons'),
    );
    const pruneButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Prune Stale Data'),
    );

    const expectMobileCriticalControl = (controlId: string) => {
      const control = container.querySelector(`[data-mobile-critical-control="${controlId}"]`);

      expect(control).toBeInstanceOf(HTMLButtonElement);
      expect(control?.className).toContain('mobile-critical-control');
      expect(control?.className).toContain('focus-ring');
    };

    expectMobileCriticalControl('settings-maintenance-archive');
    expectMobileCriticalControl('settings-maintenance-prune');

    await act(async () => {
      archiveButton?.click();
      pruneButton?.click();
    });

    expect(onArchiveOldSeasons).toHaveBeenCalledTimes(1);
    expect(onPruneStaleData).toHaveBeenCalledTimes(1);
  });

  it('renders unavailable and disabled maintenance states', async () => {
    await act(async () => {
      root.render(
        <SettingsDiagnosticsPanel
          activeManagedSaveId={null}
          diagnostics={null}
          diagnosticsBusy="archive"
          onArchiveOldSeasons={vi.fn()}
          onPruneStaleData={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('Diagnostics are unavailable until the simulation worker finishes booting.');
  });

  it('renders disabled maintenance controls without an active managed save', async () => {
    await act(async () => {
      root.render(
        <SettingsDiagnosticsPanel
          activeManagedSaveId={null}
          diagnostics={diagnostics}
          diagnosticsBusy={null}
          onArchiveOldSeasons={vi.fn()}
          onPruneStaleData={vi.fn()}
        />,
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const archiveButton = buttons.find((button) => button.textContent?.includes('Archive Older Seasons'));
    const pruneButton = buttons.find((button) => button.textContent?.includes('Prune Stale Data'));

    expect((archiveButton as HTMLButtonElement | undefined)?.disabled).toBe(true);
    expect((pruneButton as HTMLButtonElement | undefined)?.disabled).toBe(true);
  });
});
