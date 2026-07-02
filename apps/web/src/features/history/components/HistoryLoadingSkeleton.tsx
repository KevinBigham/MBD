import { Skeleton } from '@mbd/ui';

export default function HistoryLoadingSkeleton() {
  return (
    <div className="space-y-6" data-testid="history-loading">
      <div className="space-y-3">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Skeleton className="h-44 rounded-lg" />
        <Skeleton className="h-44 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}
