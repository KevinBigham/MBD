import { ArrowLeftRight } from 'lucide-react';
import TradeIntelCardBody, { type TradeTickerItemView } from './TradeIntelCardBody';

interface TradeIntelCardProps {
  daysUntilDeadline: number | null;
  phase: string;
  activeTradeOffers: number;
  recentSummary: string | null;
  recentTrades: TradeTickerItemView[];
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

      <TradeIntelCardBody
        activeTradeOffers={activeTradeOffers}
        daysUntilDeadline={daysUntilDeadline}
        phase={phase}
        recentSummary={recentSummary}
        recentTrades={recentTrades}
      />
    </section>
  );
}
