import type { ProspectPipelineView } from '@/workers/sim.worker.pipeline';
import { RatingBadge } from '@/shared/components/RatingBadge';

export type { ProspectPipelineView } from '@/workers/sim.worker.pipeline';

function trendTone(trend: ProspectPipelineView['prospects'][number]['trend']): string {
  switch (trend) {
    case 'surging':
      return 'border-accent-success/40 bg-accent-success/10 text-accent-success';
    case 'setback':
      return 'border-accent-danger/40 bg-accent-danger/10 text-accent-danger';
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
  }
}

export default function PipelineView({
  pipeline,
}: {
  pipeline: ProspectPipelineView | null;
}) {
  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-heading text-xs uppercase text-dynasty-muted">Pipeline View</div>
          <div className="mt-1 font-data text-sm text-dynasty-muted">
            ETA framing for the next wave of impact talent.
          </div>
        </div>
        {pipeline ? (
          <div className="font-data text-sm text-dynasty-text">
            Score {pipeline.health.score}
          </div>
        ) : null}
      </div>

      {pipeline && pipeline.prospects.length > 0 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {pipeline.prospects.map((prospect) => (
            <div key={prospect.playerId} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-heading text-sm text-dynasty-text">{prospect.playerName}</div>
                  <div className="mt-1 font-data text-xs text-dynasty-muted">
                    {prospect.position} | {prospect.levelLabel} | Age {prospect.age}
                  </div>
                </div>
                <RatingBadge value={prospect.overallRating} size="sm" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-accent-info/40 bg-accent-info/10 px-2 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-accent-info">
                  {prospect.eta}
                </span>
                <span className={`rounded-full border px-2 py-1 font-data text-[10px] uppercase tracking-[0.16em] ${trendTone(prospect.trend)}`}>
                  {prospect.trend}
                </span>
              </div>
              <div className="mt-3 text-sm text-dynasty-muted">
                {prospect.latestLineSummary ?? 'No recent minor-league line available.'}
              </div>
              {prospect.activeSetback ? (
                <div className="mt-3 rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 text-xs text-dynasty-muted">
                  {prospect.activeSetback.summary}
                </div>
              ) : null}
              {prospect.milestones.length > 0 ? (
                <div className="mt-3 text-xs text-dynasty-muted">{prospect.milestones.join(' | ')}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-4 text-sm text-dynasty-muted">
          No prospect pipeline entries available yet.
        </div>
      )}
    </section>
  );
}
