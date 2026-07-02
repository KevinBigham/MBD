import { ArrowLeftRight } from 'lucide-react';
import type { SeasonRecapData } from './SeasonRecapModalBody';

interface SeasonRecapTransactionsSlideProps {
  data: SeasonRecapData;
}

export default function SeasonRecapTransactionsSlide({ data }: SeasonRecapTransactionsSlideProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="font-data text-[11px] uppercase tracking-[0.2em] text-dynasty-muted">Key Moves</div>
      </div>
      <div className="mx-auto max-w-md space-y-2">
        {data.keyTransactions.slice(0, 8).map((tx, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-dynasty-border bg-dynasty-elevated p-3"
          >
            <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-accent-info" />
            <span className="font-heading text-sm leading-relaxed text-dynasty-text">{tx.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
