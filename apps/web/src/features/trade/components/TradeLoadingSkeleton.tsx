import { Skeleton } from '@mbd/ui';

export default function TradeLoadingSkeleton() {
  return (
    <div className="space-y-4" data-testid="trade-loading">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-16 rounded-lg" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Skeleton className="h-[32rem] rounded-lg xl:col-span-4" />
        <Skeleton className="h-[32rem] rounded-lg xl:col-span-8" />
      </div>
    </div>
  );
}
