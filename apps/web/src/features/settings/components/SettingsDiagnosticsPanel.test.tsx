import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import SettingsDiagnosticsPanel from './SettingsDiagnosticsPanel';
import type { LocalStorageEstimate } from '@/shared/lib/saveSystem';
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
};

const localEstimate: LocalStorageEstimate = {
  status: 'available',
  allMbdBytes: 9512,
  allMbdBytesKnown: true,
  unattributedBytes: 0,
  trees: [{
    rootSaveId: 'save-slot-1',
    slotNumber: 1,
    saveIds: ['save-slot-1'],
    primaryBytes: 3000,
    shadowBytes: 4000,
    leaderboardBytes: 2000,
    journalBytes: 512,
    totalBytes: 9512,
    attribution: 'complete',
  }],
  message: null,
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
    const onPruneStaleData = vi.fn();

    await act(async () => {
      root.render(
        <SettingsDiagnosticsPanel
          activeManagedSaveId="save-slot-1"
          diagnostics={diagnostics}
          diagnosticsBusy={null}
          localEstimate={localEstimate}
          originEstimate={{ status: 'available', usage: 85, quota: 100, percentage: 85, pressure: 'warning' }}
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
    expect(container.textContent).toContain('small operational simulation-journal records');
    expect(container.textContent).toContain('3.0 KB primary + 4.0 KB shadow + 2.0 KB leaderboard + 512 B operational simulation journal');

    const pruneButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Prune Stale Data'),
    );

    const expectMobileCriticalControl = (controlId: string) => {
      const control = container.querySelector(`[data-mobile-critical-control="${controlId}"]`);

      expect(control).toBeInstanceOf(HTMLButtonElement);
      expect(control?.className).toContain('mobile-critical-control');
      expect(control?.className).toContain('focus-ring');
    };

    expectMobileCriticalControl('settings-maintenance-prune');

    await act(async () => {
      pruneButton?.click();
    });

    expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(onPruneStaleData).not.toHaveBeenCalled();
  });

  it('keeps local and origin evidence visible when worker diagnostics are unavailable', async () => {
    const onPruneStaleData = vi.fn();
    await act(async () => {
      root.render(
        <SettingsDiagnosticsPanel
          activeManagedSaveId="save-slot-1"
          diagnostics={null}
          diagnosticsBusy={false}
          localEstimate={localEstimate}
          originEstimate={{ status: 'available', usage: 85, quota: 100, percentage: 85, pressure: 'warning' }}
          onPruneStaleData={onPruneStaleData}
        />,
      );
    });

    expect(container.textContent).toContain('Worker runtime diagnostics unavailable.');
    expect(container.textContent).toContain('Current worker snapshot estimate unavailable.');
    expect(container.textContent).toContain('9.5 KB');
    expect(container.textContent).toContain('85.00% approximate origin usage');
    const pruneButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Prune Stale Data')) as HTMLButtonElement;
    expect(pruneButton.disabled).toBe(true);
    await act(async () => { pruneButton.click(); });
    expect(onPruneStaleData).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('focus-traps the sibling alertdialog and restores the opener on Escape', async () => {
    const onPruneStaleData = vi.fn();
    await act(async () => {
      root.render(<SettingsDiagnosticsPanel activeManagedSaveId="save-slot-1" diagnostics={diagnostics} diagnosticsBusy={false} onPruneStaleData={onPruneStaleData} />);
    });
    const opener = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Prune Stale Data'))!;
    await act(async () => { opener.click(); });
    const dialog = container.querySelector('[role="alertdialog"]')!;
    const controls = Array.from(dialog.querySelectorAll('button')) as HTMLButtonElement[];
    const cancel = controls[0]!;
    const confirm = controls[1]!;
    expect(dialog.closest('[aria-hidden="true"]')).toBeNull();
    expect(document.activeElement).toBe(cancel);
    await act(async () => { cancel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); });
    expect(document.activeElement).toBe(confirm);
    await act(async () => { confirm.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); });
    expect(document.activeElement).toBe(cancel);
    await act(async () => { cancel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })); });
    expect(document.activeElement).toBe(confirm);
    await act(async () => { confirm.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })); });
    expect(document.activeElement).toBe(cancel);
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(onPruneStaleData).not.toHaveBeenCalled();
  });

  it('closes and fully releases modal fencing when worker diagnostics disappear', async () => {
    const onPruneStaleData = vi.fn();
    const renderPanel = async (nextDiagnostics: PerformanceDiagnosticsView | null) => {
      await act(async () => {
        root.render(
          <SettingsDiagnosticsPanel
            activeManagedSaveId="save-slot-1"
            diagnostics={nextDiagnostics}
            diagnosticsBusy={false}
            onPruneStaleData={onPruneStaleData}
          />,
        );
      });
    };

    await renderPanel(diagnostics);
    const opener = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Prune Stale Data'))!;
    await act(async () => { opener.click(); });
    expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(document.documentElement.dataset.mbdModalOpen).toBe('true');
    expect((container.firstElementChild as HTMLDivElement).inert).toBe(true);

    await renderPanel(null);
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.documentElement.dataset.mbdModalOpen).toBeUndefined();
    expect((container.firstElementChild as HTMLDivElement).inert).toBe(false);
    expect(container.firstElementChild?.hasAttribute('aria-hidden')).toBe(false);
    expect(onPruneStaleData).not.toHaveBeenCalled();

    await renderPanel(diagnostics);
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.documentElement.dataset.mbdModalOpen).toBeUndefined();
  });

  it('closes and fully releases modal fencing when the active save changes', async () => {
    const onPruneStaleData = vi.fn();
    const renderPanel = async (activeManagedSaveId: string) => {
      await act(async () => {
        root.render(
          <SettingsDiagnosticsPanel
            activeManagedSaveId={activeManagedSaveId}
            diagnostics={diagnostics}
            diagnosticsBusy={false}
            onPruneStaleData={onPruneStaleData}
          />,
        );
      });
    };

    await renderPanel('save-slot-1');
    const opener = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Prune Stale Data'))!;
    await act(async () => { opener.click(); });
    expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();

    await renderPanel('save-slot-2');
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.documentElement.dataset.mbdModalOpen).toBeUndefined();
    expect((container.firstElementChild as HTMLDivElement).inert).toBe(false);
    expect(container.firstElementChild?.hasAttribute('aria-hidden')).toBe(false);
    expect(onPruneStaleData).not.toHaveBeenCalled();

    await renderPanel('save-slot-1');
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('shows quota failure as critical even when navigator reports a low estimate', async () => {
    await act(async () => {
      root.render(<SettingsDiagnosticsPanel activeManagedSaveId="save-slot-1" diagnostics={diagnostics} diagnosticsBusy={false} originEstimate={{ status: 'unavailable', usage: null, quota: null, percentage: null, pressure: 'critical' }} onPruneStaleData={vi.fn()} />);
    });
    expect(container.textContent).toContain('Critical: a future save may fail.');
  });

  it('renders unavailable local records as unavailable rather than a 0 B estimate', async () => {
    await act(async () => {
      root.render(<SettingsDiagnosticsPanel activeManagedSaveId="save-slot-1" diagnostics={diagnostics} diagnosticsBusy={false} localEstimate={{ status: 'unavailable', allMbdBytes: null, allMbdBytesKnown: false, unattributedBytes: null, trees: [], message: 'Unavailable.' }} onPruneStaleData={vi.fn()} />);
    });
    expect(container.textContent).toContain('Local MBD record estimate unavailable');
    expect(container.textContent).not.toContain('0 B in-memory JSON estimate');
  });

  it('renders disabled maintenance controls without an active managed save', async () => {
    await act(async () => {
      root.render(
        <SettingsDiagnosticsPanel
          activeManagedSaveId={null}
          diagnostics={diagnostics}
          diagnosticsBusy={null}
          onPruneStaleData={vi.fn()}
        />,
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const pruneButton = buttons.find((button) => button.textContent?.includes('Prune Stale Data'));

    expect((pruneButton as HTMLButtonElement | undefined)?.disabled).toBe(true);
  });

  it.each([
    [79.99, 'normal', '79.99% approximate origin usage'],
    [80, 'warning', '80.00% approximate origin usage'],
    [89.99, 'warning', '89.99% approximate origin usage'],
    [90, 'critical', '90.00% approximate origin usage'],
  ] as const)('renders the %s boundary without contradictory rounding', async (percentage, pressure, copy) => {
    await act(async () => {
      root.render(
        <SettingsDiagnosticsPanel
          activeManagedSaveId="save-slot-1"
          diagnostics={diagnostics}
          diagnosticsBusy={false}
          originEstimate={{ status: 'available', usage: percentage, quota: 100, percentage, pressure }}
          onPruneStaleData={vi.fn()}
        />,
      );
    });
    expect(container.textContent).toContain(copy);
  });

  it('allows scoped keyboard activation while blocking modified shortcuts', async () => {
    const onPruneStaleData = vi.fn();
    await act(async () => {
      root.render(<SettingsDiagnosticsPanel activeManagedSaveId="save-slot-1" diagnostics={diagnostics} diagnosticsBusy={false} onPruneStaleData={onPruneStaleData} />);
    });
    const opener = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Prune Stale Data'))!;
    await act(async () => { opener.click(); });
    const dialog = container.querySelector('[role="alertdialog"]')!;
    const [cancel, confirm] = Array.from(dialog.querySelectorAll('button')) as HTMLButtonElement[];
    await act(async () => {
      cancel!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', shiftKey: true, bubbles: true }));
      cancel!.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    });
    expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(onPruneStaleData).not.toHaveBeenCalled();
    await act(async () => {
      confirm!.focus();
      confirm!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onPruneStaleData).toHaveBeenCalledTimes(1);
    expect(onPruneStaleData).toHaveBeenCalledWith('save-slot-1', { staleTickerEntries: 2, staleWatchers: 1 });

    await act(async () => { opener.click(); });
    const cancelAgain = container.querySelector('[role="alertdialog"] button') as HTMLButtonElement;
    await act(async () => {
      cancelAgain.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(onPruneStaleData).toHaveBeenCalledTimes(1);
  });
});
