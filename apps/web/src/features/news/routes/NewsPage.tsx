import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronRight, Inbox, Search } from 'lucide-react';
import { Badge, Skeleton } from '@mbd/ui';
import { getTeamById } from '@mbd/sim-core';
import { NewsCategoryEnum, type NewsCategory, type NewsItem } from '@mbd/contracts';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import { PageShell } from '@/shared/components/PageShell';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import { logger } from '@/shared/lib/logger';
import { loadGameById, saveGame, saveGameById } from '@/shared/lib/saveSystem';
import { dispatchNewsRead } from '../lib/newsEvents';

type ReadFilter = 'all' | 'unread';

const NEWS_LIMIT = 100;
const BODY_EXCERPT_LENGTH = 180;
const ALL_CATEGORY = 'all';
const PLAYER_CHIP_CLASS = 'max-w-full truncate rounded border border-dynasty-border px-2 py-1 font-data text-[10px] text-dynasty-muted hover:border-accent-primary hover:text-accent-primary';

function parseTimestampRank(timestamp: string): number {
  if (timestamp === 'NOW') return Number.MAX_SAFE_INTEGER;
  const match = /^S(\d+)D(\d+)$/.exec(timestamp);
  if (!match) return 0;
  return Number(match[1]) * 1000 + Number(match[2]);
}

function compareNewsForInbox(left: NewsItem, right: NewsItem): number {
  const timestampDelta = parseTimestampRank(right.timestamp) - parseTimestampRank(left.timestamp);
  if (timestampDelta !== 0) return timestampDelta;

  if (left.priority !== right.priority) {
    return right.priority - left.priority;
  }

  return left.id.localeCompare(right.id);
}

function formatTimestamp(timestamp: string): string {
  if (timestamp === 'NOW') return 'Now';
  const match = /^S(\d+)D(\d+)$/.exec(timestamp);
  if (!match) return timestamp;
  return `Season ${match[1]} · Day ${match[2]}`;
}

function formatCategory(category: string): string {
  return category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function bodyExcerpt(body: string): string {
  if (body.length <= BODY_EXCERPT_LENGTH) return body;
  return `${body.slice(0, BODY_EXCERPT_LENGTH - 3).trim()}...`;
}

function priorityVariant(priority: NewsItem['priority']): 'danger' | 'warning' | 'info' | 'outline' {
  if (priority <= 1) return 'danger';
  if (priority === 2) return 'warning';
  if (priority === 3) return 'info';
  return 'outline';
}

function tagVariant(tag: NewsItem['tag']): 'danger' | 'warning' | 'success' | 'info' | 'default' | 'outline' {
  switch (tag) {
    case 'BREAKING':
      return 'danger';
    case 'RUMOR':
      return 'warning';
    case 'WATCH':
      return 'success';
    case 'ANALYSIS':
      return 'info';
    case 'DEBATE':
      return 'default';
    default:
      return 'outline';
  }
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team?.abbreviation ?? teamId.toUpperCase();
}

function playerProfilePath(playerId: string): string {
  return `/players/${playerId}`;
}

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

function NewsItemCard({
  item,
  expanded,
  marking,
  playerLabels,
  onOpen,
}: {
  item: NewsItem;
  expanded: boolean;
  marking: boolean;
  playerLabels: Record<string, string>;
  onOpen: (item: NewsItem) => void;
}) {
  const isUnread = !item.read;
  const hasRelatedEntities = item.relatedTeamIds.length > 0 || item.relatedPlayerIds.length > 0;

  return (
    <article
      data-news-id={item.id}
      className={[
        'rounded-lg border bg-dynasty-surface transition-colors',
        isUnread ? 'border-accent-info/50 shadow-[inset_3px_0_0_rgba(20,184,166,0.55)]' : 'border-dynasty-border/80 opacity-80',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-expanded={expanded}
        className="focus-ring flex w-full flex-col gap-3 rounded-lg px-4 py-4 text-left sm:px-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-heading text-[10px] uppercase tracking-[0.14em]">
            {formatCategory(item.category)}
          </Badge>
          <Badge variant={priorityVariant(item.priority)} className="font-data text-[10px] uppercase tracking-[0.14em]">
            Priority {item.priority}
          </Badge>
          {item.tag ? (
            <Badge variant={tagVariant(item.tag)} className="font-heading text-[10px] uppercase tracking-[0.14em]">
              {item.tag}
            </Badge>
          ) : null}
          <Badge variant={isUnread ? 'info' : 'outline'} className="font-heading text-[10px] uppercase tracking-[0.14em]">
            {isUnread ? 'Unread' : 'Read'}
          </Badge>
          <span className="ml-auto font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            {formatTimestamp(item.timestamp)}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold leading-6 text-dynasty-textBright">
              {item.headline}
            </h2>
            <p className="mt-2 max-w-4xl font-heading text-sm leading-6 text-dynasty-text">
              {expanded ? item.body : bodyExcerpt(item.body)}
            </p>
          </div>
          <span className="mt-1 shrink-0 text-dynasty-muted">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        </div>

      </button>

      {hasRelatedEntities ? (
        <div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-5">
          {item.relatedTeamIds.map((teamId) => (
            <span
              key={`team-${item.id}-${teamId}`}
              className="rounded border border-accent-primary/30 bg-accent-primary/10 px-2 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-accent-primary"
            >
              {teamLabel(teamId)}
            </span>
          ))}
          {item.relatedPlayerIds.map((playerId) => (
            <Link
              key={`player-${item.id}-${playerId}`}
              to={playerProfilePath(playerId)}
              className={PLAYER_CHIP_CLASS}
            >
              {playerLabels[playerId] ?? playerId}
            </Link>
          ))}
        </div>
      ) : null}

      {marking ? (
        <div className="px-4 pb-4 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted sm:px-5">
          Saving read state...
        </div>
      ) : null}
    </article>
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
  const [items, setItems] = useState<NewsItem[]>([]);
  const [playerLabels, setPlayerLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<typeof ALL_CATEGORY | NewsCategory>(ALL_CATEGORY);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [markingIds, setMarkingIds] = useState<Set<string>>(() => new Set());

  const fetchNews = useCallback(async () => {
    if (!isInitialized || !worker.isReady) {
      setItems([]);
      setPlayerLabels({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextNews = await worker.getNews(NEWS_LIMIT);
      const sortedNews = [...(nextNews ?? [])].sort(compareNewsForInbox);
      setItems(sortedNews);

      const playerIds = Array.from(new Set(sortedNews.flatMap((item) => item.relatedPlayerIds)));
      if (playerIds.length === 0) {
        setPlayerLabels({});
      } else {
        const labels = await Promise.all(playerIds.map(async (playerId) => {
          try {
            const player = await worker.getPlayer(playerId);
            return [
              playerId,
              player ? `${player.firstName} ${player.lastName}` : playerId,
            ] as const;
          } catch (err) {
            logger.error('Failed to resolve news player label:', err);
            return [playerId, playerId] as const;
          }
        }));
        setPlayerLabels(Object.fromEntries(labels));
      }
    } catch (err) {
      logger.error('Failed to fetch news inbox:', err);
      setError('News feed unavailable.');
      setPlayerLabels({});
    } finally {
      setLoading(false);
    }
  }, [isInitialized, worker]);

  useEffect(() => {
    void fetchNews();
  }, [fetchNews, season, day, phase]);

  const persistActiveSave = useCallback(async () => {
    if (activeSaveId == null) return;

    const snapshot = await worker.exportSnapshot();
    const saveName = `${gmName} • ${teamName} • Season ${snapshot.season ?? season}`;

    if (activeSaveSlot != null) {
      await saveGame(activeSaveSlot, saveName, snapshot);
      return;
    }

    const existing = await loadGameById(activeSaveId);
    await saveGameById(activeSaveId, saveName, snapshot, {
      slotNumber: existing?.slotNumber ?? null,
      parentSaveId: existing?.parentSaveId ?? null,
      isRootSave: existing?.isRootSave ?? false,
      branchMeta: existing?.branchMeta ?? null,
    });
  }, [activeSaveId, activeSaveSlot, gmName, season, teamName, worker]);

  const categoryOptions = useMemo(() => {
    const present = new Set(items.map((item) => item.category));
    return NewsCategoryEnum.options.filter((category) => present.has(category));
  }, [items]);

  const unreadCount = items.filter((item) => !item.read).length;
  const filteredItems = useMemo(() => items.filter((item) => {
    const readMatch = readFilter === 'all' || !item.read;
    const categoryMatch = categoryFilter === ALL_CATEGORY || item.category === categoryFilter;
    return readMatch && categoryMatch;
  }), [categoryFilter, items, readFilter]);

  const markItemRead = useCallback(async (item: NewsItem) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      next.add(item.id);
      return next;
    });

    if (item.read || markingIds.has(item.id)) return;

    setItems((current) => current.map((entry) =>
      entry.id === item.id ? { ...entry, read: true } : entry,
    ));
    setMarkingIds((current) => new Set(current).add(item.id));

    try {
      await worker.markNewsRead(item.id);
      try {
        await persistActiveSave();
      } catch (persistErr) {
        logger.error('Failed to persist news read state:', persistErr);
        setError('Read state saved for this session, but the save file could not be updated.');
      }
      dispatchNewsRead(item.id);
    } catch (err) {
      logger.error('Failed to mark news item read:', err);
      setError('Could not save read state. Try opening the item again.');
      setItems((current) => current.map((entry) =>
        entry.id === item.id ? { ...entry, read: false } : entry,
      ));
    } finally {
      setMarkingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }, [markingIds, persistActiveSave, worker]);

  return (
    <PageShell loading={loading} skeleton={<NewsSkeleton />}>
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
                    onClick={() => setReadFilter(filter)}
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
                  onChange={(event) => setCategoryFilter(event.target.value as typeof ALL_CATEGORY | NewsCategory)}
                  className="min-h-10 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs text-dynasty-text outline-none focus:border-accent-primary"
                >
                  <option value={ALL_CATEGORY}>All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {formatCategory(category)}
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
                onAction={() => void fetchNews()}
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
                  playerLabels={playerLabels}
                  onOpen={(selected) => void markItemRead(selected)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
