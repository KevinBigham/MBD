import {
  ArrowRight,
  Inbox,
  Scale,
} from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type {
  TradeHistoryView,
  TradeNegotiationView,
  TradeTickerItem,
} from '@/workers/sim.worker.trade';
import type { HotTradeOfferView } from './tradePresentation';
import TradeHistoryLedgerPanel from './TradeHistoryLedgerPanel';
import TradeNegotiationSummaryCard from './TradeNegotiationSummaryCard';
import TradeOfferCard from './TradeOfferCard';

export type { HotTradeOfferView, TradeDialogueView } from './tradePresentation';

interface TradeActivityColumnProps {
  activeNegotiationId: string | null;
  incomingOffers: HotTradeOfferView[];
  onAcceptOffer: (offerId: string) => void;
  onCounterOffer: (offer: HotTradeOfferView) => void;
  onDeclineOffer: (offerId: string) => void;
  onResumeNegotiation: (negotiation: TradeNegotiationView) => void;
  openNegotiations: TradeNegotiationView[];
  openNegotiationsLoading: boolean;
  playerById: (playerId: string) => PlayerDTO | undefined;
  season: number;
  ticker: TradeTickerItem[];
  tradeHistory: TradeHistoryView[];
}

export default function TradeActivityColumn({
  activeNegotiationId,
  incomingOffers,
  onAcceptOffer,
  onCounterOffer,
  onDeclineOffer,
  onResumeNegotiation,
  openNegotiations,
  openNegotiationsLoading,
  playerById,
  season,
  ticker,
  tradeHistory,
}: TradeActivityColumnProps) {
  const activeTalksSubtitle = openNegotiationsLoading
    ? 'Refreshing room'
    : `${openNegotiations.length} open negotiation${openNegotiations.length === 1 ? '' : 's'}`;

  return (
    <div className="space-y-4 xl:col-span-4">
      <DensePanel
        title="Hot Offers"
        subtitle={`${incomingOffers.length} active conversations`}
        icon={<Inbox className="h-4 w-4 text-dynasty-muted" />}
        headerClassName="flex-row items-center justify-start sm:justify-start"
        bodyClassName="space-y-3 px-3 py-3"
      >
        {incomingOffers.length === 0 ? (
          <EmptyStatePanel
            description="The phones are quiet right now. Sim a few days or revisit the builder to spark fresh offers."
            title="No trade offers right now"
          />
        ) : (
          incomingOffers.map((offer) => (
            <TradeOfferCard
              key={offer.id}
              offer={offer}
              onAccept={() => onAcceptOffer(offer.id)}
              onCounter={() => onCounterOffer(offer)}
              onDecline={() => onDeclineOffer(offer.id)}
            />
          ))
        )}
      </DensePanel>

      <DensePanel
        title="Active Talks"
        subtitle={activeTalksSubtitle}
        icon={<Scale className="h-4 w-4 text-dynasty-muted" />}
        headerClassName="flex-row items-center justify-start sm:justify-start"
        bodyClassName="space-y-3 px-3 py-3"
      >
        {openNegotiations.length === 0 ? (
          <EmptyStatePanel
            description="Open multi-round talks will stay here after a reload so you can pick the call back up."
            title="No active talks"
          />
        ) : (
          openNegotiations.map((negotiation) => (
            <TradeNegotiationSummaryCard
              key={negotiation.id}
              active={activeNegotiationId === negotiation.id}
              negotiation={negotiation}
              onResume={() => onResumeNegotiation(negotiation)}
              playerById={playerById}
            />
          ))
        )}
      </DensePanel>

      <DensePanel
        title="League Trade Ticker"
        subtitle="Deadline wire"
        icon={<ArrowRight className="h-4 w-4 text-dynasty-muted" />}
        headerClassName="flex-row items-center justify-start sm:justify-start"
        bodyClassName="space-y-3 px-3 py-3"
      >
        {ticker.length === 0 ? (
          <EmptyStatePanel
            description="No ticker moves are active right now. Major trades will start scrolling here as the league reacts."
            title="No ticker moves are active right now"
          />
        ) : (
          ticker.map((item) => (
            <div key={item.id} className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
              <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">{item.timestamp}</div>
              <p className="mt-2 font-heading text-sm text-dynasty-text">{item.summary}</p>
            </div>
          ))
        )}
      </DensePanel>

      <TradeHistoryLedgerPanel season={season} tradeHistory={tradeHistory} />
    </div>
  );
}
