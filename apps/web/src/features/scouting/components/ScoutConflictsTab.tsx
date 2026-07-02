import { useState } from 'react';
import { Scale } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import ScoutConflictCard from './ScoutConflictCard';
import { useScoutConflictsData } from '../hooks/useScoutConflictsData';

export function ScoutConflictsTab() {
  const { getScoutConflicts, isReady: workerReady } = useWorker();
  const { isInitialized, season, day, phase } = useGameStore();
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const { conflicts, loading } = useScoutConflictsData({
    day,
    getScoutConflicts,
    isInitialized,
    phase,
    season,
    workerReady,
  });

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
          <ScoutConflictCard key={c.prospectId} conflict={c} />
        ))}
      </div>
    </div>
  );
}
