import { useCallback, useEffect, useState } from 'react';
import { Badge, GradeBar } from '@mbd/ui';
import { AlertTriangle, CheckCircle, Scale } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';

interface ScoutOpinion {
  source: string;
  overallGrade: number;
  ceiling: number;
  floor: number;
  confidence: number;
  summary: string;
}

interface ScoutConflict {
  prospectId: string;
  headline: string;
  opinions: ScoutOpinion[];
  divergence: number;
  resolved: boolean;
  resolution: {
    season: number;
    actualGrade: number;
    closestSource: string;
  } | null;
  winningSource: string | null;
  outcomeSummary: string | null;
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

      {/* Grade */}
      <div className={`mt-2 text-center font-data text-3xl ${gradeColor(opinion.overallGrade)}`}>
        {opinion.overallGrade}
      </div>

      {/* Range bar: floor to ceiling with grade marker */}
      <div className="relative mt-2 h-3 w-full overflow-hidden rounded-full bg-dynasty-border">
        <div
          className="absolute h-full bg-dynasty-muted/30 rounded-full"
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

      {/* Confidence */}
      <div className="mt-2">
        <div className="mb-0.5 flex justify-between font-data text-[10px] text-dynasty-muted">
          <span>Confidence</span><span>{opinion.confidence}</span>
        </div>
        <GradeBar grade={opinion.confidence} />
      </div>

      {/* Summary */}
      <p className="mt-2 font-data text-[10px] italic text-dynasty-muted leading-relaxed">{opinion.summary}</p>
    </div>
  );
}

function ConflictCard({ conflict }: { conflict: ScoutConflict }) {
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
      {/* Header */}
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

      {/* Three-column opinions */}
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {conflict.opinions.map((op) => (
          <OpinionColumn
            key={op.source}
            opinion={op}
            isWinner={conflict.resolved && conflict.winningSource === op.source}
          />
        ))}
      </div>

      {/* Resolution */}
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

export function ScoutConflictsTab() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, season, day, phase } = useGameStore();
  const [conflicts, setConflicts] = useState<ScoutConflict[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    const data = await worker.getScoutConflicts();
    setConflicts((data ?? []) as ScoutConflict[]);
    setLoading(false);
  }, [isInitialized, worker, workerReady]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, season, day, phase]);

  const filtered = filter === 'all'
    ? conflicts
    : filter === 'active'
      ? conflicts.filter((c) => !c.resolved)
      : conflicts.filter((c) => c.resolved);

  const activeCount = conflicts.filter((c) => !c.resolved).length;
  const resolvedCount = conflicts.filter((c) => c.resolved).length;

  if (loading) {
    return <div className="py-8 text-center font-data text-sm text-dynasty-muted">Loading conflicts...</div>;
  }

  if (conflicts.length === 0) {
    return (
      <EmptyStatePanel
        icon={Scale}
        title="No scout conflicts"
        description="When your scouts disagree on a prospect's evaluation, conflicts will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'active', 'resolved'] as const).map((f) => {
          const count = f === 'all' ? conflicts.length : f === 'active' ? activeCount : resolvedCount;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={[
                'focus-ring rounded-md border px-3 py-1.5 font-heading text-xs capitalize transition-colors',
                filter === f
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                  : 'border-dynasty-border bg-dynasty-surface text-dynasty-muted hover:text-dynasty-text',
              ].join(' ')}
            >
              {f} <span className="ml-1 font-data text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {filtered.map((c) => (
          <ConflictCard key={c.prospectId} conflict={c} />
        ))}
      </div>
    </div>
  );
}
