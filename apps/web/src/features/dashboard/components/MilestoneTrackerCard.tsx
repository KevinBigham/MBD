import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';

interface MilestoneAlert {
  playerId: string;
  playerName: string;
  milestoneLabel: string;
  currentValue: number;
  threshold: number;
  remaining: number;
  urgency: 'imminent' | 'close' | 'approaching';
}

const URGENCY_ORDER: Record<MilestoneAlert['urgency'], number> = {
  imminent: 0,
  close: 1,
  approaching: 2,
};

const MAX_VISIBLE = 5;

function urgencyBadgeClasses(urgency: MilestoneAlert['urgency']): string {
  switch (urgency) {
    case 'imminent':
      return 'bg-accent-danger/20 text-accent-danger animate-pulse';
    case 'close':
      return 'bg-accent-warning/20 text-accent-warning';
    case 'approaching':
      return 'bg-accent-info/20 text-accent-info';
  }
}

function urgencyLabel(urgency: MilestoneAlert['urgency']): string {
  switch (urgency) {
    case 'imminent':
      return 'Imminent';
    case 'close':
      return 'Close';
    case 'approaching':
      return 'Approaching';
  }
}

export default function MilestoneTrackerCard() {
  const { getMilestoneTrackerAlerts, isReady } = useWorker();
  const [alerts, setAlerts] = useState<MilestoneAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await getMilestoneTrackerAlerts();
      const sorted = [...(data as MilestoneAlert[])].sort(
        (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency],
      );
      setAlerts(sorted);
    } catch {
      // Silently handle — card is non-critical intel
    } finally {
      setLoading(false);
    }
  }, [getMilestoneTrackerAlerts]);

  useEffect(() => {
    if (isReady) {
      fetchAlerts();
    }
  }, [isReady, fetchAlerts]);

  const visible = alerts.slice(0, MAX_VISIBLE);
  const overflowCount = alerts.length - MAX_VISIBLE;

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-accent-warning" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
          Milestone Watch
        </h2>
        {alerts.length > 0 && (
          <span className="ml-auto rounded-full bg-accent-warning/20 px-2 py-0.5 font-data text-[11px] font-medium text-accent-warning">
            {alerts.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>
      ) : alerts.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
          No milestone watches active. Career milestones appear as players approach major
          statistical thresholds.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {visible.map((alert) => {
            const progress =
              alert.threshold > 0
                ? Math.min((alert.currentValue / alert.threshold) * 100, 100)
                : 0;

            return (
              <div
                key={`${alert.playerId}-${alert.milestoneLabel}`}
                className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Link
                      to={`/players/${alert.playerId}`}
                      className="truncate font-heading text-sm text-dynasty-textBright hover:text-accent-primary"
                    >
                      {alert.playerName}
                    </Link>
                    <span className="shrink-0 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                      {alert.milestoneLabel}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-data text-[10px] font-medium uppercase tracking-wider ${urgencyBadgeClasses(alert.urgency)}`}
                  >
                    {urgencyLabel(alert.urgency)}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-dynasty-border/50">
                      <div
                        className="h-full rounded-full bg-accent-warning transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 font-data text-xs text-dynasty-textBright">
                    {alert.currentValue.toLocaleString()} / {alert.threshold.toLocaleString()}
                  </div>
                </div>

                <div className="mt-1 font-data text-[11px] text-dynasty-muted">
                  {alert.remaining.toLocaleString()} to go
                </div>
              </div>
            );
          })}

          {overflowCount > 0 && (
            <div className="px-1 font-heading text-xs text-dynasty-muted">
              and {overflowCount} more...
            </div>
          )}
        </div>
      )}
    </section>
  );
}
