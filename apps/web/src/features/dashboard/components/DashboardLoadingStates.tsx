import { Skeleton } from '@mbd/ui';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" data-testid="dashboard-loading">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-72 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Skeleton className="h-72 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function DashboardCardFallback({ title }: { title: string }) {
  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="font-heading text-sm text-dynasty-textBright">{title}</div>
      <div className="mt-4 space-y-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    </section>
  );
}
