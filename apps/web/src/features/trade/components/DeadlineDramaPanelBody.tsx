import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
  Zap,
} from 'lucide-react';
import DeadlineBiddingWarCard from './DeadlineBiddingWarCard';
import DeadlineEventRow from './DeadlineEventRow';
import type { DeadlineEvent } from './DeadlineEventRow';

export type { DeadlineEvent, DeadlineEventType } from './DeadlineEventRow';

export interface BiddingWarRound {
  teamId: string;
  offerDescription: string;
  round: number;
}

export interface ActiveBiddingWar {
  targetPlayerId: string;
  targetPlayerName: string;
  rounds: BiddingWarRound[];
  winnerId: string | null;
  settled: boolean;
}

export interface TradeDeadlineDrama {
  season: number;
  day: number;
  deadlineDay: number;
  daysUntilDeadline: number;
  isPastDeadline: boolean;
  todayEvents: DeadlineEvent[];
  fullTimeline: DeadlineEvent[];
  activeBiddingWar: ActiveBiddingWar | null;
  contenderCount: number;
  sellerCount: number;
}

interface DeadlineDramaPanelBodyProps {
  drama: TradeDeadlineDrama | null;
  loading: boolean;
  onToggleTimeline: () => void;
  phase: string;
  timelineExpanded: boolean;
}

export default function DeadlineDramaPanelBody({
  drama,
  loading,
  onToggleTimeline,
  phase,
  timelineExpanded,
}: DeadlineDramaPanelBodyProps) {
  if (loading && drama == null) {
    return (
      <section className="rounded-lg border border-dynasty-border bg-dynasty-surface overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-primary" />
            <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
              Trade Deadline
            </h2>
          </div>
          <div className="mt-4 font-heading text-sm text-dynasty-muted">
            Loading deadline intel...
          </div>
        </div>
      </section>
    );
  }

  if (drama == null) {
    const emptyCopy = phase === 'spring_training'
      ? 'Spring training is for scouting fits. Deadline drama starts once the regular-season market opens.'
      : phase === 'offseason'
        ? 'Offseason roster work lives in free agency. Deadline drama returns during the regular season.'
        : phase === 'playoffs'
          ? 'Postseason roster rules freeze trade drama until the offseason resets.'
          : 'Trade deadline drama heats up during the regular season.';

    return (
      <section className="rounded-lg border border-dynasty-border bg-dynasty-surface overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-primary" />
            <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
              Trade Deadline
            </h2>
          </div>
          <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-elevated p-4 text-center">
            <Zap className="mx-auto h-6 w-6 text-dynasty-muted" />
            <div className="mt-2 font-heading text-sm text-dynasty-muted">
              {emptyCopy}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const sortedTimeline = [...drama.fullTimeline].sort(
    (a, b) => b.day - a.day || b.urgency - a.urgency,
  );

  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-dynasty-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent-primary" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
            Trade Deadline
          </h2>
        </div>
        {drama.isPastDeadline ? (
          <span className="font-data text-lg font-bold tracking-tight text-accent-danger">
            DEADLINE PASSED
          </span>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className="font-data text-2xl font-bold tracking-tight text-accent-primary">
              {drama.daysUntilDeadline}
            </span>
            <span className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
              {drama.daysUntilDeadline === 1 ? 'Day' : 'Days'}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-center gap-4 rounded-lg border border-dynasty-border/70 bg-dynasty-elevated px-4 py-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-accent-success" />
            <span className="font-data text-sm text-dynasty-textBright">
              {drama.contenderCount}
            </span>
            <span className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
              Buyers
            </span>
          </div>
          <span className="font-data text-dynasty-muted">|</span>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-accent-warning" />
            <span className="font-data text-sm text-dynasty-textBright">
              {drama.sellerCount}
            </span>
            <span className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
              Sellers
            </span>
          </div>
        </div>

        {drama.todayEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent-primary" />
              <h3 className="font-heading text-sm font-semibold text-dynasty-textBright">
                Today's Events
              </h3>
              <span className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                Day {drama.day}
              </span>
            </div>
            <div className="mt-2 space-y-2">
              {drama.todayEvents.map((event) => (
                <DeadlineEventRow key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}

        {drama.todayEvents.length === 0 && !drama.isPastDeadline && (
          <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-elevated p-3 text-center font-heading text-sm text-dynasty-muted">
            No deadline activity today. The market is quiet.
          </div>
        )}

        {drama.activeBiddingWar != null && (
          <DeadlineBiddingWarCard war={drama.activeBiddingWar} />
        )}

        {sortedTimeline.length > 0 && (
          <div>
            <button
              type="button"
              className="focus-ring flex w-full items-center justify-between rounded-lg border border-dynasty-border/70 bg-dynasty-elevated px-3 py-2 text-left transition-colors hover:border-accent-primary/40"
              onClick={onToggleTimeline}
              aria-expanded={timelineExpanded}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-dynasty-muted" />
                <span className="font-heading text-sm font-semibold text-dynasty-textBright">
                  Full Timeline
                </span>
                <span className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                  {sortedTimeline.length} event{sortedTimeline.length === 1 ? '' : 's'}
                </span>
              </div>
              {timelineExpanded ? (
                <ChevronUp className="h-4 w-4 text-dynasty-muted" />
              ) : (
                <ChevronDown className="h-4 w-4 text-dynasty-muted" />
              )}
            </button>
            {timelineExpanded && (
              <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
                {sortedTimeline.map((event) => (
                  <DeadlineEventRow key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
