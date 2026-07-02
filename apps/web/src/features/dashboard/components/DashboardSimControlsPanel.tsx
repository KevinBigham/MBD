import { Play } from 'lucide-react';

export type DashboardSimAction = 'day' | 'week' | 'month' | null;

interface DashboardSimControlsPanelProps {
  simAction: DashboardSimAction;
  activeStorylineCount: number;
  challengeName: string | null;
  onSimDay: () => void;
  onSimWeek: () => void;
  onSimMonth: () => void;
}

function QuickActionButton({
  busy,
  'data-mobile-critical-control': mobileCriticalControl,
  label,
  onClick,
  shortcut,
}: {
  busy: boolean;
  'data-mobile-critical-control': string;
  label: string;
  onClick: () => void;
  shortcut: string;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      aria-keyshortcuts={shortcut}
      data-mobile-critical-control={mobileCriticalControl}
      onClick={onClick}
      className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Play className="h-3.5 w-3.5" />
      {busy ? `${label}...` : label}
    </button>
  );
}

export default function DashboardSimControlsPanel({
  simAction,
  activeStorylineCount,
  challengeName,
  onSimDay,
  onSimWeek,
  onSimMonth,
}: DashboardSimControlsPanelProps) {
  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-surface p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <QuickActionButton
            busy={simAction === 'day'}
            data-mobile-critical-control="dashboard-sim-day"
            label="Sim Day"
            onClick={onSimDay}
            shortcut="Space"
          />
          <QuickActionButton
            busy={simAction === 'week'}
            data-mobile-critical-control="dashboard-sim-week"
            label="Sim Week"
            onClick={onSimWeek}
            shortcut="Shift+Space"
          />
          <QuickActionButton
            busy={simAction === 'month'}
            data-mobile-critical-control="dashboard-sim-month"
            label="Sim Month"
            onClick={onSimMonth}
            shortcut="Control+Space Meta+Space"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-dynasty-border px-3 py-1 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            {activeStorylineCount} active story arcs
          </span>
          {challengeName ? (
            <span className="rounded-full border border-accent-warning/40 bg-accent-warning/10 px-3 py-1 font-data text-[11px] uppercase tracking-[0.16em] text-accent-warning">
              {challengeName}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
