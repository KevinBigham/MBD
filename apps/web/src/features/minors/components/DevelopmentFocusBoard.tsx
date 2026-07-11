import { Settings2 } from 'lucide-react';
import { minorLevelLabel } from '@/shared/lib/labels';
import type { ProspectPipelineView } from './PipelineView';

export type DevelopmentFocus = ProspectPipelineView['developmentFocus'];
export type DevelopmentFocusPriority = DevelopmentFocus['priorities'][number];

export default function DevelopmentFocusBoard({
  actionMessage,
  busyPlayerId,
  focus,
  onApplyPlan,
}: {
  actionMessage?: string | null;
  busyPlayerId?: string | null;
  focus: DevelopmentFocus | null | undefined;
  onApplyPlan?: (priority: DevelopmentFocusPriority) => void;
}): JSX.Element | null {
  if (!focus || focus.priorities.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-heading text-xs uppercase text-dynasty-muted">Development Focus</div>
          <div className="mt-1 font-data text-sm text-dynasty-muted">{focus.summary}</div>
        </div>
        <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
          {focus.priorities.length} {focus.priorities.length === 1 ? 'priority' : 'priorities'}
        </div>
      </div>
      {actionMessage ? (
        <div className="mt-3 rounded border border-accent-info/30 bg-accent-info/10 px-3 py-2 font-data text-xs text-accent-info">
          {actionMessage}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {focus.priorities.map((priority) => (
          <div
            key={`${priority.category}-${priority.playerId}`}
            data-testid="development-focus-card"
            data-focus-category={priority.category}
            data-player-id={priority.playerId}
            data-player-level={priority.level}
            className="rounded border border-dynasty-border bg-dynasty-elevated p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-heading text-sm text-dynasty-text">{priority.playerName}</div>
                <div className="mt-1 font-data text-xs text-dynasty-muted">{minorLevelLabel(priority.level)}</div>
              </div>
              <div className="rounded-full border border-accent-info/40 bg-accent-info/10 px-2 py-1 font-data text-[10px] uppercase tracking-[0.14em] text-accent-info">
                {priority.label}
              </div>
            </div>
            <div className="mt-3 font-heading text-sm text-dynasty-text">{priority.action}</div>
            <div className="mt-2 text-xs text-dynasty-muted">{priority.reason}</div>
            {onApplyPlan ? (
              <button
                type="button"
                aria-label={`Apply development plan for ${priority.playerName}`}
                disabled={busyPlayerId === priority.playerId}
                onClick={() => onApplyPlan(priority)}
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-accent-primary/50 bg-accent-primary/10 px-3 py-2 font-heading text-xs font-semibold text-accent-primary transition-colors hover:bg-accent-primary/20 disabled:cursor-not-allowed disabled:border-dynasty-border disabled:bg-dynasty-surface disabled:text-dynasty-muted"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Apply plan
              </button>
            ) : null}
            {priority.evidence.length > 0 ? (
              <div className="mt-3 space-y-1">
                {priority.evidence.map((item) => (
                  <div key={item} className="rounded border border-dynasty-border bg-dynasty-surface px-2 py-1 text-xs text-dynasty-muted">
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
