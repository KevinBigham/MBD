import { Link } from 'react-router-dom';

export interface MilestoneAlert {
  playerId: string;
  playerName: string;
  milestoneLabel: string;
  currentValue: number;
  threshold: number;
  remaining: number;
  urgency: 'imminent' | 'close' | 'approaching';
}

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

export default function MilestoneTrackerCardBody({
  loading,
  alerts,
}: {
  loading: boolean;
  alerts: MilestoneAlert[];
}) {
  const visible = alerts.slice(0, MAX_VISIBLE);
  const overflowCount = alerts.length - MAX_VISIBLE;

  if (loading) {
    return <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
        No milestone watches active. Career milestones appear as players approach major
        statistical thresholds.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {visible.map((alert) => (
        <MilestoneAlertRow key={`${alert.playerId}-${alert.milestoneLabel}`} alert={alert} />
      ))}

      {overflowCount > 0 ? (
        <div className="px-1 font-heading text-xs text-dynasty-muted">
          and {overflowCount} more...
        </div>
      ) : null}
    </div>
  );
}

function MilestoneAlertRow({ alert }: { alert: MilestoneAlert }) {
  const progress =
    alert.threshold > 0 ? Math.min((alert.currentValue / alert.threshold) * 100, 100) : 0;

  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
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
}
