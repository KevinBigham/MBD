import { Suspense, lazy } from 'react';
import { Skeleton } from '@mbd/ui';
import { DensePanel } from '@/shared/components/DensePanel';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import type { GameRecapView } from './gameDayBroadcast';

const GameRecapCard = lazy(() => import('./GameRecapCard'));

interface RecentBroadcastRecapsPanelProps {
  recaps: GameRecapView[];
  selectedGameIndex: number | null;
  onSelectGame: (gameIndex: number) => void;
}

function RecapCardFallback(): JSX.Element {
  return (
    <div className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-4 h-4 w-44" />
      <Skeleton className="mt-4 h-6 w-full" />
    </div>
  );
}

export default function RecentBroadcastRecapsPanel({
  recaps,
  selectedGameIndex,
  onSelectGame,
}: RecentBroadcastRecapsPanelProps): JSX.Element {
  return (
    <DensePanel
      title="Recent Broadcast Recaps"
      subtitle="Game Day"
      subtitleClassName="text-accent-info"
      titleClassName="text-dynasty-textBright"
      meta={
        <span className="rounded-full border border-dynasty-border px-3 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
          Last {recaps.length}
        </span>
      }
    >
      {recaps.length > 0 ? (
        <div className="grid gap-3">
          {recaps.map((recap) => (
            <Suspense key={recap.gameIndex} fallback={<RecapCardFallback />}>
              <GameRecapCard
                recap={recap}
                selected={recap.gameIndex === selectedGameIndex}
                onSelect={onSelectGame}
              />
            </Suspense>
          ))}
        </div>
      ) : (
        <EmptyStatePanel
          className="border-dynasty-border/60 bg-dynasty-elevated"
          title="No recent user-team games"
          description="Sim a few regular-season days and the broadcast booth will start collecting fresh recaps and highlight reels."
          actionLabel="View Roster"
          actionHref="/roster"
        />
      )}
    </DensePanel>
  );
}
