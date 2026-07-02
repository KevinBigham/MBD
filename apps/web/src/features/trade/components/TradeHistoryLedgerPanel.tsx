import { ArrowLeftRight } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import type { TradeHistoryView } from '@/workers/sim.worker.trade';
import { fairnessText } from './tradePresentation';

interface TradeHistoryLedgerPanelProps {
  season: number;
  tradeHistory: TradeHistoryView[];
}

function TradeHistoryCard({ trade }: { trade: TradeHistoryView }) {
  const evaluation = fairnessText(
    trade.fairnessScore,
    trade.fromTeamAbbreviation,
    trade.toTeamAbbreviation,
  );

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-sm font-semibold text-dynasty-textBright">
            {trade.fromTeamAbbreviation} ↔ {trade.toTeamAbbreviation}
          </p>
          <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            {trade.timestamp} · {evaluation}
          </p>
        </div>
        <span className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
          {trade.offeringAssets.length + trade.requestingAssets.length} assets
        </span>
      </div>
      <p className="mt-3 font-heading text-sm text-dynasty-text">{trade.summary}</p>
    </div>
  );
}

export default function TradeHistoryLedgerPanel({
  season,
  tradeHistory,
}: TradeHistoryLedgerPanelProps) {
  return (
    <DensePanel
      title="Trade History"
      subtitle={`Season ${season} ledger`}
      icon={<ArrowLeftRight className="h-4 w-4 text-dynasty-muted" />}
      headerClassName="flex-row items-center justify-start sm:justify-start"
      bodyClassName="space-y-3 px-3 py-3"
    >
      {tradeHistory.length === 0 ? (
        <p className="rounded border border-dynasty-border bg-dynasty-elevated px-4 py-6 text-center font-heading text-sm text-dynasty-muted">
          No trades completed yet this season.
        </p>
      ) : (
        tradeHistory.map((trade) => (
          <TradeHistoryCard key={trade.id} trade={trade} />
        ))
      )}
    </DensePanel>
  );
}
