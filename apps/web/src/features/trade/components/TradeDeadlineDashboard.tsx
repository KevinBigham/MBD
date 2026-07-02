import type { ReactNode } from 'react';
import type { TradeDeadlineStateView } from '@/workers/sim.worker.trade';
import DeadlineRecapCard from './DeadlineRecapCard';
import DeadlineTheatreCard from './DeadlineTheatreCard';
import TradeMarketStatusPanel from './TradeMarketStatusPanel';

interface TradeDeadlineDashboardProps {
  deadlineDramaSlot: ReactNode;
  deadlineState: TradeDeadlineStateView | null;
  detail: string;
  headline: string;
  tradeMarketOpen: boolean;
}

export default function TradeDeadlineDashboard({
  deadlineDramaSlot,
  deadlineState,
  detail,
  headline,
  tradeMarketOpen,
}: TradeDeadlineDashboardProps) {
  return (
    <>
      <TradeMarketStatusPanel
        detail={detail}
        headline={headline}
        tradeMarketOpen={tradeMarketOpen}
      />

      <DeadlineTheatreCard deadlineState={deadlineState} />
      {deadlineDramaSlot}

      {deadlineState?.recap ? <DeadlineRecapCard recap={deadlineState.recap} /> : null}
    </>
  );
}
