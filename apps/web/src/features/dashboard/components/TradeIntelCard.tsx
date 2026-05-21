import { ArrowLeftRight } from 'lucide-react';

interface TradeTickerItemView {
  id: string;
  summary: string;
  timestamp: string;
}

interface TradeIntelCardProps {
  daysUntilDeadline: number | null;
  phase: string;
  activeTradeOffers: number;
  recentSummary: string | null;
  recentTrades: TradeTickerItemView[];
}

function deadlineCopy(daysUntilDeadline: number | null, phase: string): string {
  if (daysUntilDeadline != null) {
    return 'Days until the regular-season market locks.';
  }

  switch (phase) {
    case 'spring_training':
      return 'Spring training calls are mostly posture and scouting checks.';
    case 'offseason':
      return 'Offseason roster work runs through free agency before the deadline clock starts.';
    case 'playoffs':
      return 'Postseason roster rules have the trade desk frozen.';
    default:
      return 'No active regular-season deadline clock right now.';
  }
}

export default function TradeIntelCard({
  daysUntilDeadline,
  phase,
  activeTradeOffers,
  recentSummary,
  recentTrades,
}: TradeIntelCardProps) {
  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="h-4 w-4 text-accent-info" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Trade Intel</h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
          <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">Deadline</div>
          <div className="mt-2 font-data text-3xl text-dynasty-textBright">
            {daysUntilDeadline != null ? daysUntilDeadline : '--'}
          </div>
          <div className="mt-2 font-heading text-xs text-dynasty-muted">
            {deadlineCopy(daysUntilDeadline, phase)}
          </div>
        </div>
        <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
          <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">Active offers</div>
          <div className="mt-2 font-data text-3xl text-dynasty-textBright">{activeTradeOffers}</div>
          <div className="mt-2 font-heading text-xs text-dynasty-muted">
            Offers waiting in the inbox right now.
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
        <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">Recent summary</div>
        <div className="mt-2 font-heading text-sm text-dynasty-text">
          {recentSummary ?? 'No meaningful trade chatter has surfaced yet.'}
        </div>
      </div>

      <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
        {recentTrades.length > 0 ? recentTrades.map((item) => (
          <div key={item.id} className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
            <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">{item.timestamp}</div>
            <div className="mt-2 font-heading text-sm text-dynasty-text">{item.summary}</div>
          </div>
        )) : (
          <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
            No completed trades are on the league wire yet.
          </div>
        )}
      </div>
    </section>
  );
}
