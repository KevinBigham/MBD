import { useCallback, useEffect, useState } from 'react';
import type { ScheduleGameEntry } from '../components/ScheduleContentPanel';

interface UseScheduleRouteDataOptions {
  day: number;
  getScheduleView: () => Promise<ScheduleGameEntry[] | null | undefined>;
  isInitialized: boolean;
  phase: string;
  season: number;
  workerReady: boolean;
}

export function useScheduleRouteData({
  day,
  getScheduleView,
  isInitialized,
  phase,
  season,
  workerReady,
}: UseScheduleRouteDataOptions) {
  const [schedule, setSchedule] = useState<ScheduleGameEntry[]>([]);

  const fetchSchedule = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const data = await getScheduleView();
    setSchedule(data ?? []);
  }, [getScheduleView, isInitialized, workerReady]);

  useEffect(() => {
    void fetchSchedule();
  }, [day, fetchSchedule, phase, season]);

  return { schedule };
}
