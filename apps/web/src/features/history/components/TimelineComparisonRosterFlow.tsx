import { Users } from 'lucide-react';
import type { TimelineComparison } from '@mbd/contracts';

type TimelineComparisonRosterDelta = Pick<TimelineComparison['rosterDelta'], 'added' | 'lost'>;

interface TimelineComparisonRosterFlowProps {
  rosterDelta: TimelineComparisonRosterDelta;
}

export default function TimelineComparisonRosterFlow({
  rosterDelta,
}: TimelineComparisonRosterFlowProps) {
  const { added, lost } = rosterDelta;

  if (added.length === 0 && lost.length === 0) {
    return (
      <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-dynasty-muted" />
          <span className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Roster Changes</span>
        </div>
        <p className="mt-2 font-heading text-sm text-dynasty-muted">No roster divergence between timelines.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-dynasty-muted" />
        <span className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Roster Divergence</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {added.length > 0 && (
          <div>
            <div className="font-data text-[10px] text-accent-success">
              +{added.length} Acquired in Branch
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {added.map((name) => (
                <span
                  key={name}
                  className="rounded border border-accent-success/30 bg-accent-success/10 px-2 py-0.5 font-data text-[11px] text-accent-success"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
        {lost.length > 0 && (
          <div>
            <div className="font-data text-[10px] text-accent-danger">
              -{lost.length} Lost in Branch
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {lost.map((name) => (
                <span
                  key={name}
                  className="rounded border border-accent-danger/30 bg-accent-danger/10 px-2 py-0.5 font-data text-[11px] text-accent-danger"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
