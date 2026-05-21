import type { ProspectPipelineView } from '@/workers/sim.worker.pipeline';
import { humanizeLabel, minorLevelLabel } from '@/shared/lib/labels';

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
  const groups = pipeline ? [
    {
      key: 'ready',
      label: 'Ready Now',
      description: 'Near-term contributors and depth options the big club can use soon.',
      prospects: pipeline.prospects.filter((prospect) => prospect.prospectTier !== 'organizational_depth' && prospect.eta === 'Ready now'),
    },
    {
      key: 'next',
      label: 'Next Wave',
      description: 'Prospects tracking for this season or next season.',
      prospects: pipeline.prospects.filter((prospect) =>
        prospect.prospectTier !== 'organizational_depth' && (prospect.eta === 'This season' || prospect.eta === 'Next season'),
      ),
    },
    {
      key: 'long',
      label: 'Long View',
      description: 'Younger players with distance, volatility, or higher ceiling bets.',
      prospects: pipeline.prospects.filter((prospect) =>
        prospect.prospectTier !== 'organizational_depth' && prospect.eta !== 'Ready now' && prospect.eta !== 'This season' && prospect.eta !== 'Next season',
      ),
    },
    {
      key: 'depth',
      label: 'Organizational Depth',
      description: 'Older or lower-ceiling minor leaguers who still matter for coverage.',
      prospects: pipeline.prospects.filter((prospect) => prospect.prospectTier === 'organizational_depth'),
    },
  ].filter((group) => group.prospects.length > 0) : [];

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
        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <section key={group.key} className="rounded-lg border border-dynasty-border/70 bg-dynasty-base/20 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="font-heading text-xs uppercase tracking-wide text-dynasty-muted">{group.label}</div>
                  <div className="mt-1 font-heading text-xs text-dynasty-muted">{group.description}</div>
                </div>
                <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                  {group.prospects.length} player{group.prospects.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {group.prospects.map((prospect) => (
                  <div key={prospect.playerId} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-heading text-sm text-dynasty-text">{prospect.playerName}</div>
                        <div className="mt-1 font-data text-xs text-dynasty-muted">
                          {prospect.position} | {minorLevelLabel(prospect.level)} | Age {prospect.age}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-data text-sm text-dynasty-text">{prospect.overallRating}</span>
                        <div className="font-data text-[10px] uppercase tracking-wide text-dynasty-muted">Ceil {prospect.ceiling}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-accent-info/40 bg-accent-info/10 px-2 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-accent-info">
                        {prospect.eta}
                      </span>
                      <span className="rounded-full border border-dynasty-border bg-dynasty-surface px-2 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                        {humanizeLabel(prospect.prospectTier)}
                      </span>
                      <span className={`rounded-full border px-2 py-1 font-data text-[10px] uppercase tracking-[0.16em] ${trendTone(prospect.trend)}`}>
                        {humanizeLabel(prospect.trend)}
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
            </section>
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
