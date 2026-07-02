interface TradeMarketStatusPanelProps {
  detail: string;
  headline: string;
  tradeMarketOpen: boolean;
}

export default function TradeMarketStatusPanel({
  detail,
  headline,
  tradeMarketOpen,
}: TradeMarketStatusPanelProps) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        tradeMarketOpen
          ? 'border-accent-warning/30 bg-accent-warning/10'
          : 'border-dynasty-border bg-dynasty-surface'
      }`}
      data-testid="trade-market-status-panel"
    >
      <p className={`font-heading text-sm ${tradeMarketOpen ? 'text-accent-warning' : 'text-dynasty-text'}`}>
        {headline}
      </p>
      <p className="mt-1 font-heading text-xs text-dynasty-muted">{detail}</p>
    </div>
  );
}
