import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { TeamLogo } from '@/shared/components/TeamLogo';

interface ScheduleGameEntry {
  day: number;
  opponentId: string;
  opponentName: string;
  opponentAbbr: string;
  isHome: boolean;
  isCompleted: boolean;
  userScore?: number;
  opponentScore?: number;
  result?: 'W' | 'L';
  gameIndex?: number;
}

export default function SchedulePage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { day, season, phase, isInitialized } = useGameStore();
  const [schedule, setSchedule] = useState<ScheduleGameEntry[]>([]);
  const currentDayRef = useRef<HTMLTableRowElement | null>(null);
  const navigate = useNavigate();

  const fetchSchedule = useCallback(async () => {
    if (!isInitialized || !worker.isReady) return;
    const data = await worker.getScheduleView();
    if (data) setSchedule(data);
  }, [isInitialized, workerReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule, day, season, phase]);

  useEffect(() => {
    if (currentDayRef.current) {
      currentDayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [schedule]);

  const wins = schedule.filter((g) => g.result === 'W').length;
  const losses = schedule.filter((g) => g.result === 'L').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-dynasty-text">SEASON SCHEDULE</h1>
        <p className="font-data text-sm text-dynasty-muted">
          162 games from opening day to the final series.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface px-4 py-2">
          <span className="font-heading text-sm text-dynasty-muted">Record</span>
          <span className="ml-2 font-data text-lg font-bold text-dynasty-text">
            {wins}-{losses}
          </span>
        </div>
        <div className="font-data text-sm text-dynasty-muted">
          Season {season} | Day {day}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-dynasty-border bg-dynasty-surface">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-dynasty-surface">
              <tr className="border-b border-dynasty-border text-xs text-dynasty-muted">
                <th className="px-4 py-2 text-left font-heading">Day</th>
                <th className="px-4 py-2 text-left font-heading">Opponent</th>
                <th className="px-2 py-2 text-center font-heading">H/A</th>
                <th className="px-2 py-2 text-center font-heading">Result</th>
                <th className="px-4 py-2 text-right font-heading">Score</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((game) => {
                const isCurrent = game.day === day;
                const isClickable = game.isCompleted && game.gameIndex != null;

                return (
                  <tr
                    key={game.day}
                    ref={isCurrent ? currentDayRef : undefined}
                    onClick={isClickable ? () => navigate(`/games/${game.gameIndex}`) : undefined}
                    className={[
                      'border-b border-dynasty-border/50 text-sm transition-colors',
                      isCurrent ? 'bg-accent-primary/10' : '',
                      isClickable ? 'cursor-pointer hover:bg-dynasty-elevated' : '',
                    ].join(' ')}
                  >
                    <td className="px-4 py-2 font-data text-dynasty-muted">{game.day}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <TeamLogo teamId={game.opponentId} size="sm" />
                        <div>
                          <div className="font-heading font-medium text-dynasty-text">
                            {game.opponentAbbr}
                          </div>
                          <div className="font-heading text-xs text-dynasty-muted">
                            {game.opponentName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center font-data text-dynasty-muted">
                      {game.isHome ? 'vs' : '@'}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {game.isCompleted && game.result ? (
                        <span
                          className={[
                            'inline-block rounded px-2 py-0.5 font-data text-xs font-bold',
                            game.result === 'W'
                              ? 'bg-accent-success/20 text-accent-success'
                              : 'bg-accent-danger/20 text-accent-danger',
                          ].join(' ')}
                        >
                          {game.result}
                        </span>
                      ) : (
                        <span className="font-data text-xs text-dynasty-muted">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-data text-dynasty-text">
                      {game.isCompleted
                        ? `${game.userScore}-${game.opponentScore}`
                        : '\u2014'}
                    </td>
                  </tr>
                );
              })}
              {schedule.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center font-heading text-sm text-dynasty-muted">
                    Sim games to see your schedule
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
