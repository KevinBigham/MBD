import { AlertTriangle, Inbox, Search } from 'lucide-react';
import type { NewsCategory, NewsItem } from '@mbd/contracts';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import NewsItemCard, { newsCategoryLabel } from './NewsItemCard';

export type NewsReadFilter = 'all' | 'unread';

const ALL_CATEGORY = 'all';

interface NewsInboxPanelProps {
  categoryFilter: typeof ALL_CATEGORY | NewsCategory;
  categoryOptions: NewsCategory[];
  error: string | null;
  expandedIds: Set<string>;
  filteredItems: NewsItem[];
  items: NewsItem[];
  markingIds: Set<string>;
  onCategoryFilterChange: (filter: typeof ALL_CATEGORY | NewsCategory) => void;
  onOpenItem: (item: NewsItem) => void;
  onReadFilterChange: (filter: NewsReadFilter) => void;
  onRetry: () => void;
  readFilter: NewsReadFilter;
  unreadCount: number;
}

export function NewsInboxPanel({
  categoryFilter,
  categoryOptions,
  error,
  expandedIds,
  filteredItems,
  items,
  markingIds,
  onCategoryFilterChange,
  onOpenItem,
  onReadFilterChange,
  onRetry,
  readFilter,
  unreadCount,
}: NewsInboxPanelProps) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
          News Inbox
        </h1>
        <p className="mt-1 max-w-3xl font-heading text-sm leading-6 text-dynasty-muted">
          Worker-backed league headlines queued for the front office desk.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="flex items-center gap-2 font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">
            <Inbox className="h-4 w-4" />
            Inbox
          </div>
          <div className="mt-2 font-data text-3xl text-dynasty-textBright">{items.length}</div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">loaded stories</div>
        </div>
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">Unread</div>
          <div className="mt-2 font-data text-3xl text-accent-info">{unreadCount}</div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">waiting for review</div>
        </div>
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">Categories</div>
          <div className="mt-2 font-data text-3xl text-accent-primary">{categoryOptions.length}</div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">represented in queue</div>
        </div>
      </div>

      <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="flex flex-col gap-3 border-b border-dynasty-border pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-dynasty-textBright">
              <Search className="h-4 w-4" />
              Wire Filters
            </h2>
            <p className="mt-1 font-heading text-xs text-dynasty-muted">
              Client-side filters over the current worker news queue.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="inline-flex rounded-md border border-dynasty-border bg-dynasty-elevated p-1">
              {(['all', 'unread'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={readFilter === filter}
                  onClick={() => onReadFilterChange(filter)}
                  className={[
                    'rounded px-3 py-1.5 font-heading text-xs uppercase tracking-[0.14em] transition-colors',
                    readFilter === filter
                      ? 'bg-accent-primary/15 text-accent-primary'
                      : 'text-dynasty-muted hover:text-dynasty-text',
                  ].join(' ')}
                >
                  {filter === 'all' ? 'All' : 'Unread'}
                </button>
              ))}
            </div>
            <label className="grid gap-1">
              <span className="font-heading text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                Category
              </span>
              <select
                aria-label="Category filter"
                value={categoryFilter}
                onChange={(event) => onCategoryFilterChange(event.target.value as typeof ALL_CATEGORY | NewsCategory)}
                className="min-h-10 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs text-dynasty-text outline-none focus:border-accent-primary"
              >
                <option value={ALL_CATEGORY}>All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {newsCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <div className="mt-4">
            <EmptyStatePanel
              icon={AlertTriangle}
              title={error}
              description="The worker did not return the news queue. Try again after the simulation worker is ready."
              actionLabel="Retry"
              onAction={onRetry}
            />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-4">
            <EmptyStatePanel
              icon={Inbox}
              title={items.length === 0 ? 'No unread news in the queue' : 'No news matches those filters'}
              description={items.length === 0
                ? 'Sim forward to let league headlines accumulate.'
                : 'Clear the category or unread filter to widen the inbox.'}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredItems.map((item) => (
              <NewsItemCard
                key={item.id}
                item={item}
                expanded={expandedIds.has(item.id)}
                marking={markingIds.has(item.id)}
                onOpen={onOpenItem}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
