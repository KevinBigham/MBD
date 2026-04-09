import type { RosterAssessment } from '@mbd/sim-core';
import { GradeBadge } from '../shared';

interface Props {
  data: RosterAssessment;
}

export function RosterAssessmentView({ data }: Props) {
  return (
    <div className="space-y-5">
      {/* Narrative */}
      <p className="font-heading text-sm text-dynasty-text">{data.rosterNarrative}</p>

      {/* Lineup grades */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Lineup Analysis
        </h4>
        <div className="mt-3 flex gap-4">
          <div className="text-center">
            <span className="block font-data text-[10px] uppercase text-dynasty-muted">Overall</span>
            <GradeBadge grade={data.lineup.overallGrade} className="mt-1" size="lg" />
          </div>
          <div className="text-center">
            <span className="block font-data text-[10px] uppercase text-dynasty-muted">Hitting</span>
            <GradeBadge grade={data.lineup.hittersGrade} className="mt-1" size="lg" />
          </div>
          <div className="text-center">
            <span className="block font-data text-[10px] uppercase text-dynasty-muted">Pitching</span>
            <GradeBadge grade={data.lineup.pitchingGrade} className="mt-1" size="lg" />
          </div>
        </div>
        {data.lineup.topStrength && (
          <p className="mt-3 font-data text-xs text-accent-success">
            Strength: {data.lineup.topStrength}
          </p>
        )}
        {data.lineup.biggestWeakness && (
          <p className="mt-1 font-data text-xs text-accent-warning">
            Weakness: {data.lineup.biggestWeakness}
          </p>
        )}
      </div>

      {/* Star players */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Star Players
        </h4>
        <div className="mt-3 space-y-2">
          {data.stars.map((star) => (
            <div
              key={star.playerId}
              className="flex items-center justify-between rounded border border-dynasty-border/50 bg-dynasty-bg/40 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <span className="font-heading text-sm font-medium text-dynasty-text">{star.name}</span>
                <span className="ml-2 font-data text-xs text-dynasty-muted">
                  {star.position} &middot; Age {star.age}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <GradeBadge grade={star.letterGrade} />
                <span className="font-data text-xs text-dynasty-muted">
                  {star.contractYears}yr / ${star.annualSalary.toFixed(1)}M
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Position needs */}
      {data.needs.length > 0 && (
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
          <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
            Position Needs
          </h4>
          <div className="mt-3 space-y-1.5">
            {data.needs.map((need) => (
              <div key={need.position} className="flex items-center gap-2">
                <UrgencyDot urgency={need.urgency} />
                <span className="font-data text-xs font-medium text-dynasty-text">{need.position}</span>
                <span className="font-data text-[11px] text-dynasty-muted">{need.explanation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UrgencyDot({ urgency }: { urgency: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-accent-danger',
    moderate: 'bg-accent-warning',
    low: 'bg-accent-success',
  };
  return <div className={`h-2 w-2 rounded-full ${colors[urgency] ?? 'bg-dynasty-muted'}`} />;
}
