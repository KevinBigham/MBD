import type { FarmAssessment } from '@mbd/sim-core';
import { GradeBadge } from '../shared';

interface Props {
  data: FarmAssessment;
}

export function FarmAssessmentView({ data }: Props) {
  return (
    <div className="space-y-5">
      <p className="font-heading text-sm text-dynasty-text">{data.farmNarrative}</p>

      {/* Pipeline health */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Pipeline Health
        </h4>
        <div className="mt-3 flex items-center gap-4">
          <div className="text-center">
            <span className="block font-data text-[10px] uppercase text-dynasty-muted">Grade</span>
            <GradeBadge grade={data.pipeline.grade} className="mt-1" size="lg" />
          </div>
          <div className="flex-1 space-y-1">
            <PipelineStat label="MLB-Ready" value={data.pipeline.readyCount} color="text-accent-success" />
            <PipelineStat label="Developing" value={data.pipeline.developingCount} color="text-accent-primary" />
            <PipelineStat label="Raw" value={data.pipeline.rawCount} color="text-dynasty-muted" />
          </div>
        </div>
        <p className="mt-2 font-data text-xs capitalize text-dynasty-muted">
          Balance: {data.pipeline.positionBalance.replace(/_/g, ' ')}
        </p>
      </div>

      {/* Top prospects */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Top Prospects
        </h4>
        <div className="mt-3 space-y-2">
          {data.topProspects.map((prospect) => (
            <div
              key={prospect.playerId}
              className="rounded border border-dynasty-border/50 bg-dynasty-bg/40 px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-heading text-sm font-medium text-dynasty-text">
                    {prospect.name}
                  </span>
                  <span className="ml-2 font-data text-xs text-dynasty-muted">
                    {prospect.position} &middot; {prospect.level} &middot; Age {prospect.age}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <GradeBadge grade={prospect.ceilingGrade} />
                  <ReadinessBadge readiness={prospect.readiness} />
                </div>
              </div>
              <p className="mt-1 font-data text-[11px] text-dynasty-muted">{prospect.spotlight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PipelineStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-data text-xs text-dynasty-muted">{label}</span>
      <span className={`font-data text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function ReadinessBadge({ readiness }: { readiness: string }) {
  const styles: Record<string, string> = {
    ready_now: 'bg-accent-success/15 text-accent-success',
    one_year: 'bg-accent-primary/15 text-accent-primary',
    developing: 'bg-accent-warning/15 text-accent-warning',
    raw: 'bg-dynasty-muted/15 text-dynasty-muted',
  };
  const labels: Record<string, string> = {
    ready_now: 'Ready',
    one_year: '1 Year',
    developing: 'Dev',
    raw: 'Raw',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 font-data text-[10px] uppercase ${styles[readiness] ?? ''}`}>
      {labels[readiness] ?? readiness}
    </span>
  );
}
