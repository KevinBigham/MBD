import { useCallback, useEffect, useState } from 'react';
import {
  Clock,
  Flame,
  AlertTriangle,
  Trophy,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventType =
  | 'rumor_surfaces'
  | 'bidding_war'
  | 'asking_price_drops'
  | 'deal_falls_through'
  | 'last_minute_offer'
  | 'buzzer_beater_trade'
  | 'surprise_seller'
  | 'deadline_passes_quietly';

interface DeadlineEvent {
  id: string;
  type: EventType;
  day: number;
  description: string;
  involvedTeamIds: string[];
  involvedPlayerIds: string[];
  urgency: 1 | 2 | 3 | 4 | 5;
  isPublic: boolean;
}

interface BiddingWarRound {
  teamId: string;
  offerDescription: string;
  round: number;
}

interface ActiveBiddingWar {
  targetPlayerId: string;
  targetPlayerName: string;
  rounds: BiddingWarRound[];
  winnerId: string | null;
  settled: boolean;
}

interface TradeDeadlineDrama {
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_BADGE_STYLES: Record<EventType, string> = {
  rumor_surfaces:
    'border-accent-info/40 bg-accent-info/10 text-accent-info',
  bidding_war:
    'border-accent-warning/40 bg-accent-warning/10 text-accent-warning',
  asking_price_drops:
    'border-accent-info/40 bg-accent-info/10 text-accent-info',
  deal_falls_through:
    'border-accent-danger/40 bg-accent-danger/10 text-accent-danger',
  last_minute_offer:
    'border-accent-warning/40 bg-accent-warning/10 text-accent-warning',
  buzzer_beater_trade:
    'border-accent-success/40 bg-accent-success/10 text-accent-success',
  surprise_seller:
    'border-accent-primary/40 bg-accent-primary/10 text-accent-primary',
  deadline_passes_quietly:
    'border-dynasty-border bg-dynasty-elevated text-dynasty-muted',
};

const EVENT_LABELS: Record<EventType, string> = {
  rumor_surfaces: 'Rumor',
  bidding_war: 'Bidding War',
  asking_price_drops: 'Price Drop',
  deal_falls_through: 'Deal Collapses',
  last_minute_offer: 'Last Minute',
  buzzer_beater_trade: 'Buzzer Beater',
  surprise_seller: 'Surprise Seller',
  deadline_passes_quietly: 'Quiet Deadline',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UrgencyIndicator({ urgency }: { urgency: 1 | 2 | 3 | 4 | 5 }) {
  if (urgency <= 2) {
    return (
      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-dynasty-muted" />
    );
  }

  if (urgency === 3) {
    return (
      <span className="relative inline-block h-3 w-3 shrink-0">
        <span className="absolute inset-0 animate-ping rounded-full bg-accent-warning/40" />
        <span className="absolute inset-0.5 rounded-full bg-accent-warning" />
      </span>
    );
  }

  // urgency 4 or 5
  return (
    <span className="relative inline-block h-4 w-4 shrink-0">
      <span className="absolute inset-0 animate-ping rounded-full bg-accent-danger/30" />
      <span className="absolute inset-0 rounded-full bg-accent-danger/20 shadow-[0_0_8px_2px_rgba(239,68,68,0.35)]" />
      <span className="absolute inset-1 rounded-full bg-accent-danger" />
    </span>
  );
}

function EventRow({ event }: { event: DeadlineEvent }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dynasty-border bg-dynasty-elevated px-3 py-2.5">
      <div className="mt-1">
        <UrgencyIndicator urgency={event.urgency} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.16em] ${EVENT_BADGE_STYLES[event.type]}`}
          >
            {EVENT_LABELS[event.type]}
          </span>
          <span className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
            Day {event.day}
          </span>
        </div>
        <div className="mt-1.5 font-heading text-sm text-dynasty-text">
          {event.description}
        </div>
      </div>
      <div className="mt-0.5 shrink-0 font-data text-xs text-dynasty-muted">
        {event.urgency}/5
      </div>
    </div>
  );
}

function BiddingWarCard({ war }: { war: ActiveBiddingWar }) {
  const sortedRounds = [...war.rounds].sort((a, b) => a.round - b.round);

  return (
    <div className="rounded-xl border border-accent-warning/30 bg-accent-warning/5 p-4">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-accent-warning" />
        <h3 className="font-heading text-sm font-semibold text-dynasty-textBright">
          Active Bidding War
        </h3>
        {war.settled && (
          <span className="rounded-full border border-accent-success/40 bg-accent-success/10 px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.16em] text-accent-success">
            Settled
          </span>
        )}
      </div>
      <div className="mt-3 font-heading text-base font-semibold text-accent-warning">
        {war.targetPlayerName}
      </div>
      <div className="mt-3 space-y-2">
        {sortedRounds.map((round) => {
          const isWinner = war.settled && war.winnerId === round.teamId;
          return (
            <div
              key={`${round.teamId}-${round.round}`}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                isWinner
                  ? 'border-accent-success/40 bg-accent-success/10'
                  : 'border-dynasty-border bg-dynasty-surface'
              }`}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dynasty-border bg-dynasty-elevated font-data text-[10px] text-dynasty-muted">
                {round.round}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-heading text-sm text-dynasty-text">
                  {round.offerDescription}
                </div>
              </div>
              {isWinner && (
                <Trophy className="h-4 w-4 shrink-0 text-accent-success" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DeadlineDramaPanel() {
  const { getTradeDeadlineDrama, isReady } = useWorker();
  const [drama, setDrama] = useState<TradeDeadlineDrama | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(false);

  const fetchDrama = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getTradeDeadlineDrama();
      setDrama(result as TradeDeadlineDrama | null);
    } catch {
      setDrama(null);
    } finally {
      setLoading(false);
    }
  }, [getTradeDeadlineDrama]);

  useEffect(() => {
    if (isReady) {
      fetchDrama();
    }
  }, [isReady, fetchDrama]);

  const toggleTimeline = useCallback(() => {
    setTimelineExpanded((prev) => !prev);
  }, []);

  // ---- Loading state ----
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

  // ---- Empty / wrong phase state ----
  if (drama == null) {
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
              Trade deadline drama heats up during the regular season
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
      {/* ---- Header with countdown ---- */}
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
        {/* ---- Market overview bar ---- */}
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

        {/* ---- Today's Events ---- */}
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
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}

        {drama.todayEvents.length === 0 && !drama.isPastDeadline && (
          <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-elevated p-3 text-center font-heading text-sm text-dynasty-muted">
            No deadline activity today. The market is quiet.
          </div>
        )}

        {/* ---- Active Bidding War ---- */}
        {drama.activeBiddingWar != null && (
          <BiddingWarCard war={drama.activeBiddingWar} />
        )}

        {/* ---- Full Timeline (collapsible) ---- */}
        {sortedTimeline.length > 0 && (
          <div>
            <button
              type="button"
              className="focus-ring flex w-full items-center justify-between rounded-lg border border-dynasty-border/70 bg-dynasty-elevated px-3 py-2 text-left transition-colors hover:border-accent-primary/40"
              onClick={toggleTimeline}
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
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
