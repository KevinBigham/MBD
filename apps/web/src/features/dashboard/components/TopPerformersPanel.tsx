import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { Skeleton } from '@mbd/ui';
import { DensePanel } from '@/shared/components/DensePanel';

const Sparkline = lazy(() => import('@/shared/components/charts/Sparkline'));

export interface DashboardTopPerformer {
  playerId: string;
  name: string;
  position: string;
  label: string;
  sparklineValues: number[];
  statLine: string;
}

interface TopPerformersPanelProps {
  performers: DashboardTopPerformer[];
}

export default function TopPerformersPanel({ performers }: TopPerformersPanelProps): JSX.Element | null {
  if (performers.length === 0) {
    return null;
  }

  return (
    <DensePanel
      title="Top Performers"
      icon={<Flame className="h-4 w-4 text-accent-primary" />}
      titleClassName="text-dynasty-textBright"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {performers.map((performer) => (
          <Link
            key={performer.playerId}
            to={`/players/${performer.playerId}`}
            className="flex items-center gap-3 rounded-lg border border-dynasty-border/60 bg-dynasty-elevated p-3 transition-colors hover:border-accent-primary/40"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-heading text-sm text-dynasty-textBright">{performer.name}</div>
              <div className="mt-0.5 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                {performer.position} · {performer.label}
              </div>
              <div className="mt-1 font-data text-xs text-dynasty-text">{performer.statLine}</div>
            </div>
            {performer.sparklineValues.length > 1 ? (
              <Suspense fallback={<Skeleton className="h-6 w-20" />}>
                <Sparkline values={performer.sparklineValues} width={80} height={24} />
              </Suspense>
            ) : null}
          </Link>
        ))}
      </div>
    </DensePanel>
  );
}
