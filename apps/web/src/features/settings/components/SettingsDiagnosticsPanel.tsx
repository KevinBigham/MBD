import type { PerformanceDiagnosticsView } from '@/workers/sim.worker.diagnostics';

const EMPTY_QUERY_TIMINGS: PerformanceDiagnosticsView['queryTimings'] = {
  enabled: false,
  warningCount: 0,
  topSlowQueries: [],
};

interface SettingsDiagnosticsPanelProps {
  activeManagedSaveId: string | null;
  diagnostics: PerformanceDiagnosticsView | null;
  diagnosticsBusy: 'archive' | 'prune' | null;
  onArchiveOldSeasons: () => void | Promise<void>;
  onPruneStaleData: () => void | Promise<void>;
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
  onArchiveOldSeasons,
  onPruneStaleData,
}: SettingsDiagnosticsPanelProps) {
  if (!diagnostics) {
    return (
      <div className="font-heading text-sm text-dynasty-muted">
        Diagnostics are unavailable until the simulation worker finishes booting.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Runtime</div>
          <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
            <div>Last Sim Day: {formatRuntime(diagnostics.runtime.lastSimDayMs)}</div>
            <div>Last Save: {formatRuntime(diagnostics.runtime.lastSaveMs)}</div>
            <div>Last Load: {formatRuntime(diagnostics.runtime.lastLoadMs)}</div>
          </div>
        </div>
        <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Storage</div>
          <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
            <div>{formatBytes(diagnostics.totals.snapshotSizeBytes)}</div>
            <div>{diagnostics.totals.totalSeasons} total seasons tracked</div>
          </div>
        </div>
        <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Archive</div>
          <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
            <div>{diagnostics.totals.liveArchiveSeasons} live season archives</div>
            <div>{diagnostics.totals.archivedSeasons} archived seasons</div>
          </div>
        </div>
        <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Queues</div>
          <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
            <div>{diagnostics.queues.tickerEntries} ticker entries</div>
            <div>{diagnostics.queues.activeWatchers} active watchers</div>
            <div>{diagnostics.queues.resolvedWatchers} resolved watchers</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Narrative Footprint</div>
          <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
            <div>{diagnostics.queues.newsItems} news items</div>
            <div>{diagnostics.queues.briefingItems} briefing items</div>
            <div>{diagnostics.queues.scoutConflicts} scout conflicts</div>
            <div>{diagnostics.queues.staleTickerEntries} stale ticker entries</div>
          </div>
        </div>

        <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Maintenance</div>
          <p className="mt-3 font-heading text-xs text-dynasty-muted">
            Archive older season recap detail and prune stale runtime queues without changing save schema compatibility.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!activeManagedSaveId || diagnosticsBusy != null}
              data-mobile-critical-control="settings-maintenance-archive"
              onClick={() => void onArchiveOldSeasons()}
              className="mobile-critical-control focus-ring rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
            >
              Archive Older Seasons
            </button>
            <button
              type="button"
              disabled={!activeManagedSaveId || diagnosticsBusy != null}
              data-mobile-critical-control="settings-maintenance-prune"
              onClick={() => void onPruneStaleData()}
              className="mobile-critical-control focus-ring rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prune Stale Data
            </button>
          </div>
        </div>

        <WorkerQueryDiagnosticsPanel queryTimings={diagnostics.queryTimings} />
      </div>
    </div>
  );
}
