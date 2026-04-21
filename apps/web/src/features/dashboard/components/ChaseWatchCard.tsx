import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Telescope, Trophy, TrendingUp } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';

interface CareerChase {
  playerId: string;
  playerName: string;
  teamId: string;
  milestoneLabel: string;
  currentValue: number;
  threshold: number;
  remaining: number;
  urgency: 'imminent' | 'close' | 'approaching';
}

interface PaceChase {
  playerId: string;
  playerName: string;
  teamId: string;
  category: string;
  projectedValue: string;
  benchmark: string;
  paceDescription: string;
  confidenceLevel: 'high' | 'medium' | 'low';
}

interface ChaseWatchView {
  season: number;
  day: number;
  careerChases: CareerChase[];
  paceChases: PaceChase[];
}

const URGENCY_ORDER: Record<CareerChase['urgency'], number> = {
  imminent: 0,
  close: 1,
  approaching: 2,
};

function urgencyBadgeClasses(urgency: CareerChase['urgency']): string {
  switch (urgency) {
    case 'imminent':
      return 'bg-accent-danger/20 text-accent-danger animate-pulse';
    case 'close':
      return 'bg-accent-warning/20 text-accent-warning';
    case 'approaching':
      return 'bg-accent-info/20 text-accent-info';
  }
}

function urgencyLabel(urgency: CareerChase['urgency']): string {
  switch (urgency) {
    case 'imminent':
      return 'Imminent';
    case 'close':
      return 'Close';
    case 'approaching':
      return 'Approaching';
  }
}

function confidenceBadgeClasses(level: PaceChase['confidenceLevel']): string {
  switch (level) {
    case 'high':
      return 'bg-accent-success/20 text-accent-success';
    case 'medium':
      return 'bg-accent-info/20 text-accent-info';
    case 'low':
      return 'bg-dynasty-border/50 text-dynasty-muted';
  }
}

function confidenceLabel(level: PaceChase['confidenceLevel']): string {
  switch (level) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
  }
}

export default function ChaseWatchCard() {
  const { getChaseWatch, isReady } = useWorker();
  const [view, setView] = useState<ChaseWatchView | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChases = useCallback(async () => {
    if (!isReady || typeof getChaseWatch !== 'function') {
      setView(null);
      setLoading(false);
      return;
    }

    try {
      const data = await getChaseWatch();
      const payload = data as ChaseWatchView;
      const careerChases = [...payload.careerChases].sort(
        (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency],
      );
      setView({ ...payload, careerChases });
    } catch {
      // Non-critical intel — swallow and show empty state.
    } finally {
      setLoading(false);
    }
  }, [getChaseWatch, isReady]);

  useEffect(() => {
    void fetchChases();
  }, [fetchChases]);

  const careerChases = view?.careerChases ?? [];
  const paceChases = view?.paceChases ?? [];
  const hasChases = careerChases.length > 0 || paceChases.length > 0;

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Telescope className="h-4 w-4 text-accent-primary" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Chase Watch</h2>
        <span className="ml-auto font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
          League-wide
        </span>
      </div>

      {loading ? (
        <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>
      ) : !hasChases ? (
        <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
          Chasers appear here as players approach career milestones and historic season marks.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {careerChases.length > 0 ? (
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-accent-warning" />
                <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                  Career Chases
                </div>
              </div>
              <div className="mt-2 space-y-2">
                {careerChases.map((chase) => (
                  <CareerChaseRow key={`${chase.playerId}-${chase.milestoneLabel}`} chase={chase} />
                ))}
              </div>
            </div>
          ) : null}

          {paceChases.length > 0 ? (
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-accent-success" />
                <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                  Season Pace
                </div>
              </div>
              <div className="mt-2 space-y-2">
                {paceChases.map((chase) => (
                  <PaceChaseRow key={`${chase.playerId}-${chase.category}`} chase={chase} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function CareerChaseRow({ chase }: { chase: CareerChase }) {
  const progress =
    chase.threshold > 0 ? Math.min((chase.currentValue / chase.threshold) * 100, 100) : 0;

  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <Link
            to={`/players/${chase.playerId}`}
            className="truncate font-heading text-sm text-dynasty-textBright hover:text-accent-primary"
          >
            {chase.playerName}
          </Link>
          <span className="shrink-0 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            {chase.milestoneLabel}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 font-data text-[10px] font-medium uppercase tracking-wider ${urgencyBadgeClasses(chase.urgency)}`}
        >
          {urgencyLabel(chase.urgency)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-dynasty-border/50">
            <div
              className="h-full rounded-full bg-accent-warning transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="shrink-0 font-data text-xs text-dynasty-textBright">
          {chase.currentValue.toLocaleString()} / {chase.threshold.toLocaleString()}
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="font-data text-[11px] text-dynasty-muted">
          {chase.remaining.toLocaleString()} to go
        </div>
        <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
          {chase.teamId.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function PaceChaseRow({ chase }: { chase: PaceChase }) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <Link
            to={`/players/${chase.playerId}`}
            className="truncate font-heading text-sm text-dynasty-textBright hover:text-accent-primary"
          >
            {chase.playerName}
          </Link>
          <span className="shrink-0 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            {chase.category}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 font-data text-[10px] font-medium uppercase tracking-wider ${confidenceBadgeClasses(chase.confidenceLevel)}`}
        >
          {confidenceLabel(chase.confidenceLevel)}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <div className="font-heading text-sm font-semibold text-dynasty-textBright">
          {chase.projectedValue}
        </div>
        <div className="font-data text-[11px] text-dynasty-muted">vs {chase.benchmark} benchmark</div>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="font-data text-[11px] text-dynasty-muted">{chase.paceDescription}</div>
        <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
          {chase.teamId.toUpperCase()}
        </div>
      </div>
    </div>
  );
}
