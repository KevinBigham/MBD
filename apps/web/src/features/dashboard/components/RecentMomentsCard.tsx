import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';

interface RecentMomentView {
  playerId: string;
  playerName: string;
  teamId: string;
  moment: {
    season: number;
    day?: number;
    description: string;
    type: string;
    isPlayoff: boolean;
  };
}

const MAX_VISIBLE = 5;

export default function RecentMomentsCard() {
  const worker = useWorker();
  const { day, season } = useGameStore();
  const [moments, setMoments] = useState<RecentMomentView[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMoments = useCallback(async () => {
    if (!worker.isReady || typeof worker.getRecentLeagueMoments !== 'function') {
      setMoments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await worker.getRecentLeagueMoments(Math.max(1, day - 7));
      setMoments((data as RecentMomentView[]).slice(0, MAX_VISIBLE));
    } finally {
      setLoading(false);
    }
  }, [day, worker]);

  useEffect(() => {
    void fetchMoments();
  }, [fetchMoments, season]);

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent-warning" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Signature Moments</h2>
      </div>

      {loading ? (
        <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>
      ) : moments.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
          No recent league-wide moments in the last seven sim days.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {moments.map((entry) => (
            <Link
              key={`${entry.playerId}-${entry.moment.type}-${entry.moment.season}-${entry.moment.day ?? 0}`}
              to={`/players/${entry.playerId}?tab=moments`}
              className="block rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 transition-colors hover:border-accent-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {entry.teamId ? <TeamLogo teamId={entry.teamId} size="xs" /> : null}
                    <span className="truncate font-heading text-sm text-dynasty-textBright">{entry.playerName}</span>
                  </div>
                  <div className="mt-2 font-heading text-sm text-dynasty-text">
                    {entry.moment.description}
                  </div>
                  <div className="mt-2 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                    Season {entry.moment.season}
                    {entry.moment.day != null ? ` · Day ${entry.moment.day}` : ''}
                    {entry.moment.isPlayoff ? ' · Playoffs' : ''}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
