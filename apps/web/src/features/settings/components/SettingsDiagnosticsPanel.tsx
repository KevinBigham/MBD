import { useEffect, useRef, useState } from 'react';
import type { LocalStorageEstimate } from '@/shared/lib/saveSystem';
import {
  formatOriginStoragePercentage,
  type OriginStorageEstimate,
} from '@/shared/lib/storagePressure';
import type { PerformanceDiagnosticsView } from '@/workers/sim.worker.diagnostics';
import type { PruneStaleEligibility } from '../hooks/useSettingsDiagnosticsData';

const EMPTY_QUERY_TIMINGS: PerformanceDiagnosticsView['queryTimings'] = {
  enabled: false,
  warningCount: 0,
  topSlowQueries: [],
};

interface SettingsDiagnosticsPanelProps {
  activeManagedSaveId: string | null;
  diagnostics: PerformanceDiagnosticsView | null;
  diagnosticsBusy: boolean | 'archive' | 'prune' | null;
  localEstimate?: LocalStorageEstimate | null;
  originEstimate?: OriginStorageEstimate | null;
  onArchiveOldSeasons?: () => void | Promise<void>;
  onPruneStaleData: (confirmedSaveId?: string, eligibility?: PruneStaleEligibility) => void | Promise<void>;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  if (bytes >= 1000) {
    return `${(bytes / 1000).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function formatRuntime(value: number | null): string {
  return value == null ? 'Not measured yet' : `${value.toFixed(1)} ms`;
}

function formatBudgetStatus(entry: PerformanceDiagnosticsView['queryTimings']['topSlowQueries'][number]): string {
  if (entry.budgetMs == null) {
    return 'No budget';
  }
  return entry.overBudget
    ? `Over ${formatRuntime(entry.budgetMs)} budget`
    : `Under ${formatRuntime(entry.budgetMs)} budget`;
}

function WorkerQueryDiagnosticsPanel(props: {
  queryTimings?: PerformanceDiagnosticsView['queryTimings'];
}) {
  const queryTimings = props.queryTimings ?? EMPTY_QUERY_TIMINGS;
  const hasRows = queryTimings.enabled && queryTimings.topSlowQueries.length > 0;

  return (
    <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4 md:col-span-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
          Worker Query Diagnostics
        </div>
        <div className={`font-heading text-xs ${queryTimings.warningCount > 0 ? 'text-accent-warning' : 'text-dynasty-muted'}`}>
          {queryTimings.enabled ? `${queryTimings.warningCount} budget warnings` : 'Profiling disabled'}
        </div>
      </div>

      {hasRows ? (
        <div className="mt-4 space-y-3">
          {queryTimings.topSlowQueries.map((entry) => (
            <div
              key={entry.name}
              className="grid gap-2 border-t border-dynasty-border/60 pt-3 font-heading text-xs text-dynasty-text sm:grid-cols-[minmax(0,1fr)_auto_auto]"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-dynasty-textBright">{entry.name}</div>
                <div className="mt-1 text-dynasty-muted">
                  {entry.callCount} calls, {formatRuntime(entry.averageMs)} avg
                </div>
              </div>
              <div>{formatRuntime(entry.maxMs)} max</div>
              <div className={entry.overBudget ? 'text-accent-warning' : 'text-dynasty-muted'}>
                {formatBudgetStatus(entry)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 font-heading text-xs text-dynasty-muted">
          {queryTimings.enabled
            ? 'No profiled worker queries yet.'
            : 'Set VITE_MBD_PROFILE_WORKER_QUERIES=1 before launch to record query timings.'}
        </p>
      )}
    </div>
  );
}

export default function SettingsDiagnosticsPanel({
  activeManagedSaveId,
  diagnostics,
  diagnosticsBusy,
  localEstimate = null,
  originEstimate = null,
  onPruneStaleData,
}: SettingsDiagnosticsPanelProps) {
  const [confirmSaveId, setConfirmSaveId] = useState<string | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const backgroundRef = useRef<HTMLDivElement | null>(null);
  const restoreOpenerFocusRef = useRef(false);
  const activeTree = localEstimate?.trees.find((tree) => activeManagedSaveId != null && tree.saveIds.includes(activeManagedSaveId)) ?? null;
  const dialogOpen = Boolean(
    confirmSaveId
    && diagnostics
    && confirmSaveId === activeManagedSaveId,
  );
  useEffect(() => {
    if (confirmSaveId && !dialogOpen) {
      restoreOpenerFocusRef.current = false;
      setConfirmSaveId(null);
    }
  }, [confirmSaveId, dialogOpen]);
  useEffect(() => {
    if (backgroundRef.current) backgroundRef.current.inert = dialogOpen;
    if (dialogOpen) document.documentElement.dataset.mbdModalOpen = 'true';
    else delete document.documentElement.dataset.mbdModalOpen;
    return () => { delete document.documentElement.dataset.mbdModalOpen; };
  }, [dialogOpen]);
  useEffect(() => {
    if (!confirmSaveId && restoreOpenerFocusRef.current) {
      restoreOpenerFocusRef.current = false;
      openerRef.current?.focus();
    }
  }, [confirmSaveId]);
  useEffect(() => { if (dialogOpen) cancelRef.current?.focus(); }, [dialogOpen]);
  useEffect(() => {
    if (!dialogOpen) return;
    const blockOutsideInteraction = (event: Event) => {
      const dialog = (event.target as Element | null)?.closest?.('[role="alertdialog"]');
      if (!dialog) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        restoreOpenerFocusRef.current = true;
        setConfirmSaveId(null);
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        const focusables = [cancelRef.current, confirmRef.current].filter((element): element is HTMLButtonElement => element != null);
        const currentIndex = focusables.indexOf(document.activeElement as HTMLButtonElement);
        const nextIndex = event.shiftKey
          ? (currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1)
          : (currentIndex === focusables.length - 1 ? 0 : currentIndex + 1);
        focusables[nextIndex]?.focus();
        return;
      }
      const targetIsDialogButton = event.target === cancelRef.current || event.target === confirmRef.current;
      const isUnmodifiedActivation = targetIsDialogButton
        && !event.altKey
        && !event.ctrlKey
        && !event.metaKey
        && !event.shiftKey
        && !event.repeat
        && (event.key === 'Enter' || event.key === ' ');
      if (isUnmodifiedActivation) {
        // Perform exactly one scoped button activation while preventing the
        // key from reaching application-wide simulation or command shortcuts.
        event.preventDefault();
        event.stopImmediatePropagation();
        (event.target as HTMLButtonElement).click();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('click', blockOutsideInteraction, true);
    window.addEventListener('pointerdown', blockOutsideInteraction, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('click', blockOutsideInteraction, true);
      window.removeEventListener('pointerdown', blockOutsideInteraction, true);
    };
  }, [dialogOpen]);
  return (
    <>
      <div ref={backgroundRef} className="space-y-6" aria-hidden={dialogOpen ? true : undefined}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Runtime</div>
          <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
            {diagnostics ? (
              <>
                <div>Last Sim Day: {formatRuntime(diagnostics.runtime.lastSimDayMs)}</div>
                <div>Last Save: {formatRuntime(diagnostics.runtime.lastSaveMs)}</div>
                <div>Last Load: {formatRuntime(diagnostics.runtime.lastLoadMs)}</div>
              </>
            ) : <div className="text-dynasty-muted">Worker runtime diagnostics unavailable.</div>}
          </div>
        </div>
        <div data-testid="storage-current-snapshot" data-storage-bytes={diagnostics?.totals.snapshotSizeBytes} className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Current Snapshot</div>
          <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
            {diagnostics ? (
              <>
                <div>{formatBytes(diagnostics.totals.snapshotSizeBytes)} in-memory JSON estimate</div>
                <div className="text-dynasty-muted">Not a durable record or browser-quota measurement.</div>
                <div>{diagnostics.totals.totalSeasons} total seasons tracked</div>
              </>
            ) : <div className="text-dynasty-muted">Current worker snapshot estimate unavailable.</div>}
          </div>
        </div>
        <div data-testid="storage-local-mbd" data-storage-bytes={localEstimate?.allMbdBytes ?? undefined} data-active-tree-bytes={activeTree?.totalBytes ?? undefined} className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Local MBD Records</div>
          <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
            <div>{localEstimate ? (localEstimate.allMbdBytes == null ? 'Local MBD record estimate unavailable' : localEstimate.allMbdBytesKnown ? formatBytes(localEstimate.allMbdBytes) : `${formatBytes(localEstimate.allMbdBytes)} known lower bound`) : 'Reading local records…'}</div>
            <div className="text-dynasty-muted">Estimated serialized save, shadow, leaderboard, and small operational simulation-journal records; browser overhead is not measured.</div>
            {activeTree ? (
              <div className="text-dynasty-muted">Active protected tree (slot {activeTree.slotNumber}): {formatBytes(activeTree.primaryBytes)} primary + {formatBytes(activeTree.shadowBytes)} shadow + {formatBytes(activeTree.leaderboardBytes)} leaderboard + {formatBytes(activeTree.journalBytes)} operational simulation journal{activeTree.attribution === 'partial' ? ' (partial attribution)' : ''}.</div>
            ) : localEstimate ? (
              <div className="text-dynasty-muted">Active protected tree {localEstimate.status === 'unavailable' ? 'is unavailable' : 'is partial or unattributable'}; its bytes are not inferred from another save.</div>
            ) : null}
            {localEstimate?.message ? <div className="text-accent-warning">{localEstimate.message}</div> : null}
          </div>
        </div>
        <div data-testid="storage-origin" data-origin-percentage={originEstimate?.percentage ?? undefined} className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Origin Storage</div>
          <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
            <div>{originEstimate?.status === 'available' ? `${formatOriginStoragePercentage(originEstimate.percentage!)}% approximate origin usage` : 'Approximate origin usage unavailable'}</div>
            <div className={originEstimate?.pressure === 'critical' ? 'text-accent-danger' : originEstimate?.pressure === 'warning' ? 'text-accent-warning' : 'text-dynasty-muted'}>{originEstimate?.pressure === 'critical' ? 'Critical: a future save may fail.' : originEstimate?.pressure === 'warning' ? 'Warning: origin storage is 80% to under 90% of its approximate quota.' : originEstimate?.pressure === 'normal' ? 'Normal: approximate origin usage is below 80%.' : 'Origin-wide estimate unavailable; it includes more than MBD when provided.'}</div>
          </div>
        </div>
        <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Archive</div>
          <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
            {diagnostics ? (
              <>
                <div>{diagnostics.totals.liveArchiveSeasons} live season archives</div>
                <div>{diagnostics.totals.archivedSeasons} archived seasons</div>
              </>
            ) : <div className="text-dynasty-muted">Worker archive diagnostics unavailable.</div>}
          </div>
        </div>
        <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Queues</div>
          <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
            {diagnostics ? (
              <>
                <div>{diagnostics.queues.tickerEntries} ticker entries</div>
                <div>{diagnostics.queues.activeWatchers} active watchers</div>
                <div>{diagnostics.queues.resolvedWatchers} resolved watchers</div>
              </>
            ) : <div className="text-dynasty-muted">Worker queue diagnostics unavailable.</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Narrative Footprint</div>
          <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
            {diagnostics ? (
              <>
                <div>{diagnostics.queues.newsItems} news items</div>
                <div>{diagnostics.queues.briefingItems} briefing items</div>
                <div>{diagnostics.queues.scoutConflicts} scout conflicts</div>
                <div>{diagnostics.queues.staleTickerEntries} stale ticker entries</div>
              </>
            ) : <div className="text-dynasty-muted">Worker narrative diagnostics unavailable.</div>}
          </div>
        </div>

        <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Maintenance</div>
          <p className="mt-3 font-heading text-xs text-dynasty-muted">
            Detailed season history is protected. Lossless archival is not available. You can only remove expired ticker entries and resolved or expired consequence watchers.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              ref={openerRef}
              type="button"
              disabled={!activeManagedSaveId || !diagnostics || Boolean(diagnosticsBusy)}
              data-mobile-critical-control="settings-maintenance-prune"
              onClick={() => setConfirmSaveId(diagnostics ? activeManagedSaveId : null)}
              className="mobile-critical-control focus-ring rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prune Stale Data
            </button>
          </div>
        </div>

        <WorkerQueryDiagnosticsPanel queryTimings={diagnostics?.queryTimings} />
      </div>
      </div>
      {dialogOpen && confirmSaveId && diagnostics ? (
        <div role="alertdialog" aria-modal="true" aria-labelledby="prune-stale-title" className="fixed inset-4 z-50 overflow-auto rounded border border-accent-warning/50 bg-dynasty-surface p-4 shadow-xl">
          <h3 id="prune-stale-title" className="font-heading font-semibold text-dynasty-textBright">Prune only stale presentation data?</h3>
          <p className="mt-2 font-heading text-sm text-dynasty-text">This removes {diagnostics.queues.staleTickerEntries} expired ticker entries and {diagnostics.queues.staleWatchers} resolved or expired consequence watchers from this exact active save. Season history, transactions, awards, finances, and branches are protected.</p>
          <div className="mt-4 flex gap-2">
            <button ref={cancelRef} type="button" className="mobile-critical-control focus-ring rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide" onClick={() => { restoreOpenerFocusRef.current = true; setConfirmSaveId(null); }}>Cancel</button>
            <button ref={confirmRef} type="button" className="mobile-critical-control focus-ring rounded border border-accent-warning/50 px-3 py-2 font-heading text-xs uppercase tracking-wide text-accent-warning" onClick={() => { if (confirmSaveId === activeManagedSaveId && !diagnosticsBusy) void onPruneStaleData(confirmSaveId, { staleTickerEntries: diagnostics.queues.staleTickerEntries, staleWatchers: diagnostics.queues.staleWatchers }); setConfirmSaveId(null); }}>Prune stale data</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
