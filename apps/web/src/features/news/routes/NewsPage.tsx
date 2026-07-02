import { Skeleton } from '@mbd/ui';
import { PageShell } from '@/shared/components/PageShell';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import { NewsInboxPanel } from '../components/NewsInboxPanel';
import { useNewsRouteData } from '../hooks/useNewsRouteData';

function NewsSkeleton() {
  return (
    <div className="space-y-5" data-testid="news-page-skeleton">
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-56 rounded-lg" />
      <Skeleton className="h-56 rounded-lg" />
    </div>
  );
}

export default function NewsPage() {
  const worker = useWorker();
  const {
    activeSaveId,
    activeSaveSlot,
    gmName,
    isInitialized,
    season,
    day,
    phase,
    teamName,
  } = useGameStore();
  const routeData = useNewsRouteData({
    activeSaveId,
    activeSaveSlot,
    day,
    exportSnapshot: worker.exportSnapshot,
    getNews: worker.getNews,
    gmName,
    isInitialized,
    markNewsRead: worker.markNewsRead,
    phase,
    season,
    teamName,
    workerReady: worker.isReady,
  });

  return (
    <PageShell loading={routeData.loading} skeleton={<NewsSkeleton />}>
      <NewsInboxPanel
        categoryFilter={routeData.categoryFilter}
        categoryOptions={routeData.categoryOptions}
        error={routeData.error}
        expandedIds={routeData.expandedIds}
        filteredItems={routeData.filteredItems}
        items={routeData.items}
        markingIds={routeData.markingIds}
        onCategoryFilterChange={routeData.setCategoryFilter}
        onOpenItem={(selected) => void routeData.markItemRead(selected)}
        onReadFilterChange={routeData.setReadFilter}
        onRetry={() => void routeData.fetchNews()}
        readFilter={routeData.readFilter}
        unreadCount={routeData.unreadCount}
      />
    </PageShell>
  );
}
