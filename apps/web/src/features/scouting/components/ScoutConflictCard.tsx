import { Badge, GradeBar } from '@mbd/ui';
import { AlertTriangle, CheckCircle, Scale } from 'lucide-react';
import type { ScoutConflict, ScoutOpinion } from '../hooks/useScoutConflictsData';

interface ScoutConflictCardProps {
  conflict: ScoutConflict;
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'scout_director': return 'Scout Director';
    case 'analytics_head': return 'Analytics';
    case 'manager': return 'Manager';
    default: return source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function gradeColor(grade: number): string {
  if (grade >= 65) return 'text-accent-success';
  if (grade >= 50) return 'text-accent-primary';
  if (grade >= 35) return 'text-accent-warning';
  return 'text-accent-danger';
}

function OpinionColumn({ opinion, isWinner }: { opinion: ScoutOpinion; isWinner: boolean }) {
  const floorPct = ((opinion.floor - 20) / 60) * 100;
  const ceilingPct = ((opinion.ceiling - 20) / 60) * 100;
  const gradePct = ((opinion.overallGrade - 20) / 60) * 100;

  return (
    <div className={[
      'rounded-lg border p-3',
      isWinner ? 'border-accent-success/40 bg-accent-success/5 ring-1 ring-accent-success/10' : 'border-dynasty-border bg-dynasty-base',
    ].join(' ')}>
      <div className="flex items-center justify-between">
        <span className="font-heading text-xs text-dynasty-muted">{sourceLabel(opinion.source)}</span>
        {isWinner && (
          <Badge className="border-accent-success/30 bg-accent-success/10 text-accent-success">
            <CheckCircle className="mr-0.5 inline h-2.5 w-2.5" />VINDICATED
          </Badge>
        )}
      </div>

      <div className={`mt-2 text-center font-data text-3xl ${gradeColor(opinion.overallGrade)}`}>
        {opinion.overallGrade}
      </div>

      <div className="relative mt-2 h-3 w-full overflow-hidden rounded-full bg-dynasty-border">
        <div
          className="absolute h-full rounded-full bg-dynasty-muted/30"
          style={{
            left: `${Math.max(0, floorPct)}%`,
            width: `${Math.max(1, ceilingPct - floorPct)}%`,
          }}
        />
        <div
          className="absolute top-0 h-full w-1.5 rounded-full bg-accent-primary"
          style={{ left: `${Math.max(0, Math.min(98, gradePct))}%` }}
        />
      </div>
      <div className="mt-0.5 flex justify-between font-data text-[9px] text-dynasty-muted">
        <span>Floor {opinion.floor}</span>
        <span>Ceil {opinion.ceiling}</span>
      </div>

      <div className="mt-2">
        <div className="mb-0.5 flex justify-between font-data text-[10px] text-dynasty-muted">
          <span>Confidence</span><span>{opinion.confidence}</span>
        </div>
        <GradeBar grade={opinion.confidence} />
      </div>

      <p className="mt-2 font-data text-[10px] italic leading-relaxed text-dynasty-muted">{opinion.summary}</p>
    </div>
  );
}

export default function ScoutConflictCard({ conflict }: ScoutConflictCardProps) {
  const isDivided = conflict.divergence >= 10;

  return (
    <div
      className={[
        'rounded-lg border p-4',
        conflict.resolved
          ? 'border-dynasty-border bg-dynasty-surface/70 opacity-80'
          : isDivided
            ? 'border-accent-danger/30 bg-dynasty-elevated ring-1 ring-accent-danger/10'
            : 'border-dynasty-border bg-dynasty-surface',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-dynasty-muted" />
        <h3 className="font-heading text-sm text-dynasty-textBright">{conflict.headline}</h3>
        <div className="ml-auto flex items-center gap-2">
          {isDivided && !conflict.resolved && (
            <Badge className="border-accent-danger/40 bg-accent-danger/10 text-accent-danger">
              <AlertTriangle className="mr-0.5 inline h-2.5 w-2.5" />DIVIDED
            </Badge>
          )}
          <Badge className="border-dynasty-border bg-dynasty-elevated text-dynasty-muted">
            Gap: {conflict.divergence}
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {conflict.opinions.map((opinion) => (
          <OpinionColumn
            key={opinion.source}
            opinion={opinion}
            isWinner={conflict.resolved && conflict.winningSource === opinion.source}
          />
        ))}
      </div>

      {conflict.resolved && conflict.resolution && (
        <div className="mt-3 rounded-md border border-accent-success/30 bg-accent-success/5 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-accent-success" />
            <span className="font-heading text-xs text-accent-success">Resolved - Season {conflict.resolution.season}</span>
            <span className="ml-auto font-data text-sm text-dynasty-textBright">Actual Grade: {conflict.resolution.actualGrade}</span>
          </div>
          {conflict.outcomeSummary && (
            <p className="mt-1 font-data text-xs text-dynasty-muted">{conflict.outcomeSummary}</p>
          )}
        </div>
      )}
    </div>
  );
}
