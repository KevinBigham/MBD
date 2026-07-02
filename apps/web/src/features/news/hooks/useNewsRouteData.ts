import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  NewsCategoryEnum,
  type GameSnapshot,
  type NewsCategory,
  type NewsItem,
} from '@mbd/contracts';
import { logger } from '@/shared/lib/logger';
import { persistActiveSaveSnapshot } from '@/shared/lib/activeSavePersistence';
import { dispatchNewsRead } from '../lib/newsEvents';

export type NewsReadFilter = 'all' | 'unread';

export const NEWS_LIMIT = 100;
export const ALL_NEWS_CATEGORY = 'all';

export type NewsCategoryFilter = typeof ALL_NEWS_CATEGORY | NewsCategory;

export interface UseNewsRouteDataOptions {
  activeSaveId: string | null | undefined;
  activeSaveSlot: number | null | undefined;
  day: number;
  exportSnapshot: () => Promise<GameSnapshot>;
  getNews: (limit?: number) => Promise<NewsItem[]>;
  gmName: string;
  isInitialized: boolean;
  markNewsRead: (newsId: string) => Promise<void>;
  phase: string;
  season: number;
  teamName: string;
  workerReady: boolean;
}

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

export function useNewsRouteData({
  activeSaveId,
  activeSaveSlot,
  day,
  exportSnapshot,
  getNews,
  gmName,
  isInitialized,
  markNewsRead,
  phase,
  season,
  teamName,
  workerReady,
}: UseNewsRouteDataOptions) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readFilter, setReadFilter] = useState<NewsReadFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<NewsCategoryFilter>(ALL_NEWS_CATEGORY);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [markingIds, setMarkingIds] = useState<Set<string>>(() => new Set());

  const fetchNews = useCallback(async () => {
    if (!isInitialized || !workerReady) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextNews = await getNews(NEWS_LIMIT);
      setItems([...(nextNews ?? [])].sort(compareNewsForInbox));
    } catch (err) {
      logger.error('Failed to fetch news inbox:', err);
      setError('News feed unavailable.');
    } finally {
      setLoading(false);
    }
  }, [getNews, isInitialized, workerReady]);

  useEffect(() => {
    void fetchNews();
  }, [day, fetchNews, season, phase]);

  const persistActiveSave = useCallback(async () => {
    if (activeSaveId == null) return;

    await persistActiveSaveSnapshot({
      activeSaveId,
      activeSaveSlot,
      gmName,
      teamName,
      season,
      exportSnapshot,
    });
  }, [activeSaveId, activeSaveSlot, exportSnapshot, gmName, season, teamName]);

  const categoryOptions = useMemo(() => {
    const present = new Set(items.map((item) => item.category));
    return NewsCategoryEnum.options.filter((category) => present.has(category));
  }, [items]);

  const unreadCount = items.filter((item) => !item.read).length;
  const filteredItems = useMemo(() => items.filter((item) => {
    const readMatch = readFilter === 'all' || !item.read;
    const categoryMatch = categoryFilter === ALL_NEWS_CATEGORY || item.category === categoryFilter;
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
      await markNewsRead(item.id);
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
  }, [markNewsRead, markingIds, persistActiveSave]);

  return {
    categoryFilter,
    categoryOptions,
    error,
    expandedIds,
    fetchNews,
    filteredItems,
    items,
    loading,
    markItemRead,
    markingIds,
    readFilter,
    setCategoryFilter,
    setReadFilter,
    unreadCount,
  };
}
