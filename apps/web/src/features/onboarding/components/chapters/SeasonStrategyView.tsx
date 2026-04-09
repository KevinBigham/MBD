import type { SeasonStrategyBriefing } from '@mbd/sim-core';

interface Props {
  data: SeasonStrategyBriefing;
}

export function SeasonStrategyView({ data }: Props) {
  return (
    <div className="space-y-5">
      <p className="font-heading text-sm text-dynasty-text">{data.summaryNarrative}</p>

      {/* Competitive window */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Competitive Window
        </h4>
        <div className="mt-3 flex items-center gap-3">
          <WindowBadge window={data.competitiveWindow} />
          <div>
            <p className="font-data text-xs text-dynasty-muted">
              Recommended Goal:{' '}
              <span className="capitalize text-dynasty-text">
                {data.recommendedSeasonGoal.replace(/_/g, ' ')}
              </span>
            </p>
            <p className="font-data text-xs text-dynasty-muted">
              Recommended Approach:{' '}
              <span className="capitalize text-dynasty-text">
                {data.recommendedTradeApproach}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Strategic priorities */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Strategic Priorities
        </h4>
        <div className="mt-3 space-y-2">
          {data.priorityList.map((priority, idx) => (
            <div
              key={priority.id}
              className="flex items-start gap-3 rounded border border-dynasty-border/50 bg-dynasty-bg/40 px-3 py-2"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-primary/15 font-data text-xs font-semibold text-accent-primary">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <span className="font-heading text-sm font-medium text-dynasty-text">
                  {priority.title}
                </span>
                <p className="mt-0.5 font-data text-[11px] text-dynasty-muted">
                  {priority.description}
                </p>
              </div>
              <PriorityBar score={priority.score} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WindowBadge({ window: win }: { window: string }) {
  const styles: Record<string, string> = {
    win_now: 'bg-accent-success/15 text-accent-success border-accent-success/30',
    stable_contender: 'bg-accent-primary/15 text-accent-primary border-accent-primary/30',
    transitioning: 'bg-accent-warning/15 text-accent-warning border-accent-warning/30',
    retooling: 'bg-accent-warning/15 text-accent-warning border-accent-warning/30',
    rebuild: 'bg-dynasty-muted/15 text-dynasty-muted border-dynasty-muted/30',
  };
  return (
    <span className={`rounded-lg border px-3 py-1.5 font-heading text-sm font-medium capitalize ${styles[win] ?? ''}`}>
      {win.replace(/_/g, ' ')}
    </span>
  );
}

function PriorityBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="flex w-16 items-center gap-1">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-dynasty-border">
        <div
          className="h-full rounded-full bg-accent-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-data text-[10px] text-dynasty-muted">{Math.round(pct)}</span>
    </div>
  );
}
