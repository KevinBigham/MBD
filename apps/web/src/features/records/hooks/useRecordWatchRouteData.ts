import { useCallback, useEffect, useState } from 'react';
import type { RecordBookEntry, RecordWatchEntry } from '@mbd/contracts';

export interface RecordBookGroups {
  franchise: RecordBookEntry[];
  league: RecordBookEntry[];
}

const EMPTY_RECORD_BOOK: RecordBookGroups = { franchise: [], league: [] };

interface UseRecordWatchRouteDataOptions {
  day: number;
  getRecordBook: (teamId?: string) => Promise<RecordBookGroups | null | undefined>;
  getRecordWatchList: (teamId?: string) => Promise<RecordWatchEntry[] | null | undefined>;
  isInitialized: boolean;
  phase: string;
  season: number;
  workerReady: boolean;
}

export function useRecordWatchRouteData({
  day,
  getRecordBook,
  getRecordWatchList,
  isInitialized,
  phase,
  season,
  workerReady,
}: UseRecordWatchRouteDataOptions) {
  const [watchList, setWatchList] = useState<RecordWatchEntry[]>([]);
  const [recordBook, setRecordBook] = useState<RecordBookGroups>(EMPTY_RECORD_BOOK);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    try {
      const [watch, book] = await Promise.all([
        getRecordWatchList(),
        getRecordBook(),
      ]);
      setWatchList(watch ?? []);
      setRecordBook(book ?? EMPTY_RECORD_BOOK);
    } catch {
      // Keep the route usable with the previous data if a transient worker query fails.
    }
    setLoading(false);
  }, [getRecordBook, getRecordWatchList, isInitialized, workerReady]);

  useEffect(() => {
    void fetchData();
  }, [day, fetchData, phase, season]);

  return {
    fetchData,
    loading,
    recordBook,
    watchList,
  };
}
