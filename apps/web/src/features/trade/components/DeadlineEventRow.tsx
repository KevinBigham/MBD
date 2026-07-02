export type DeadlineEventType =
  | 'rumor_surfaces'
  | 'bidding_war'
  | 'asking_price_drops'
  | 'deal_falls_through'
  | 'last_minute_offer'
  | 'buzzer_beater_trade'
  | 'surprise_seller'
  | 'deadline_passes_quietly';

export interface DeadlineEvent {
  id: string;
  type: DeadlineEventType;
  day: number;
  description: string;
  involvedTeamIds: string[];
  involvedPlayerIds: string[];
  urgency: 1 | 2 | 3 | 4 | 5;
  isPublic: boolean;
}

interface DeadlineEventRowProps {
  event: DeadlineEvent;
}

const EVENT_BADGE_STYLES: Record<DeadlineEventType, string> = {
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

const EVENT_LABELS: Record<DeadlineEventType, string> = {
  rumor_surfaces: 'Rumor',
  bidding_war: 'Bidding War',
  asking_price_drops: 'Price Drop',
  deal_falls_through: 'Deal Collapses',
  last_minute_offer: 'Last Minute',
  buzzer_beater_trade: 'Buzzer Beater',
  surprise_seller: 'Surprise Seller',
  deadline_passes_quietly: 'Quiet Deadline',
};

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

  return (
    <span className="relative inline-block h-4 w-4 shrink-0">
      <span className="absolute inset-0 animate-ping rounded-full bg-accent-danger/30" />
      <span className="absolute inset-0 rounded-full bg-accent-danger/20 shadow-[0_0_8px_2px_rgba(239,68,68,0.35)]" />
      <span className="absolute inset-1 rounded-full bg-accent-danger" />
    </span>
  );
}

export default function DeadlineEventRow({ event }: DeadlineEventRowProps) {
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
