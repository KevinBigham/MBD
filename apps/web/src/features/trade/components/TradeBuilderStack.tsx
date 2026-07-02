import type { ComponentProps } from 'react';
import MultiTeamTradeModal from './MultiTeamTradeModal';
import TradeBuilderPanel from './TradeBuilderPanel';
import TradeResultBanner, { type TradeResultView } from './TradeResultBanner';

interface TradeBuilderStackProps {
  builderProps: ComponentProps<typeof TradeBuilderPanel>;
  multiTeamModalProps: ComponentProps<typeof MultiTeamTradeModal> | null;
  result: TradeResultView | null;
}

export default function TradeBuilderStack({
  builderProps,
  multiTeamModalProps,
  result,
}: TradeBuilderStackProps) {
  return (
    <div className="space-y-4 xl:col-span-8">
      <TradeBuilderPanel {...builderProps} />

      {result ? <TradeResultBanner result={result} /> : null}

      {multiTeamModalProps ? <MultiTeamTradeModal {...multiTeamModalProps} /> : null}
    </div>
  );
}
