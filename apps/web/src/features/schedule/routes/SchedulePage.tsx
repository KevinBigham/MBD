import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import ScheduleContentPanel from '../components/ScheduleContentPanel';
import { useScheduleRouteData } from '../hooks/useScheduleRouteData';

export default function SchedulePage() {
  const worker = useWorker();
  const { day, season, phase, isInitialized } = useGameStore();
  const { schedule } = useScheduleRouteData({
    day,
    getScheduleView: worker.getScheduleView,
    isInitialized,
    phase,
    season,
    workerReady: worker.isReady,
  });
  const currentDayRef = useRef<HTMLTableRowElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentDayRef.current) {
      currentDayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [schedule]);

  return (
    <ScheduleContentPanel
      currentDayRowRef={currentDayRef}
      day={day}
      schedule={schedule}
      season={season}
      onOpenGame={(gameIndex) => navigate(`/games/${gameIndex}`)}
    />
  );
}
