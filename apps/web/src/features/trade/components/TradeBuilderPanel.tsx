import type { ComponentProps } from 'react';
import TradeAssetSelectionGrid from './TradeAssetSelectionGrid';
import TradeBuilderContextPanel from './TradeBuilderContextPanel';
import TradeNegotiationPanel from './TradeNegotiationPanel';
import TradePackageEvaluationCard from './TradePackageEvaluationCard';
import type { TradeNegotiationView } from '@/workers/sim.worker.trade';

type TradeBuilderContextPanelProps = ComponentProps<typeof TradeBuilderContextPanel>;
type TradeAssetSelectionGridProps = ComponentProps<typeof TradeAssetSelectionGrid>;
type TradeNegotiationPanelProps = Omit<ComponentProps<typeof TradeNegotiationPanel>, 'negotiation'>;
type TradePackageEvaluationCardProps = ComponentProps<typeof TradePackageEvaluationCard>;

interface TradeBuilderPanelProps {
  activeNegotiation: TradeNegotiationView | null;
  assetGridProps: TradeAssetSelectionGridProps;
  contextProps: TradeBuilderContextPanelProps;
  negotiationProps: TradeNegotiationPanelProps;
  packageEvaluationProps: TradePackageEvaluationCardProps;
}

export default function TradeBuilderPanel({
  activeNegotiation,
  assetGridProps,
  contextProps,
  negotiationProps,
  packageEvaluationProps,
}: TradeBuilderPanelProps) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4" data-testid="trade-builder-panel">
      <TradeBuilderContextPanel {...contextProps} />

      {activeNegotiation ? (
        <TradeNegotiationPanel
          {...negotiationProps}
          negotiation={activeNegotiation}
        />
      ) : null}

      <TradeAssetSelectionGrid {...assetGridProps} />

      <TradePackageEvaluationCard {...packageEvaluationProps} />
    </div>
  );
}
