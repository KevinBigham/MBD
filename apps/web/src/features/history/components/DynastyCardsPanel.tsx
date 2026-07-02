import { Flame } from 'lucide-react';
import type { DynastyCard } from '@mbd/contracts';
import { DensePanel } from '@/shared/components/DensePanel';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';

interface DynastyCardsPanelProps {
  dynastyCards: DynastyCard[];
  onCopyLatestSummary: (textSummary: string) => void;
}

export default function DynastyCardsPanel({
  dynastyCards,
  onCopyLatestSummary,
}: DynastyCardsPanelProps) {
  const latestCard = dynastyCards[0] ?? null;

  return (
    <DensePanel
      title="Dynasty Cards"
      icon={<Flame className="h-4 w-4 text-accent-warning" />}
      meta={latestCard ? (
        <button
          type="button"
          onClick={() => onCopyLatestSummary(latestCard.textSummary)}
          className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-[0.16em] text-dynasty-text hover:bg-dynasty-elevated"
        >
          Copy Latest Summary
        </button>
      ) : null}
      titleClassName="text-dynasty-textBright"
      bodyClassName="space-y-3"
    >
      {dynastyCards.length > 0 ? dynastyCards.map((card) => (
        <div key={card.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-heading text-sm text-dynasty-textBright">{card.title}</div>
              <div className="mt-1 font-data text-xs text-dynasty-muted">{card.subtitle}</div>
            </div>
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              {card.generatedAt}
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {card.stats.map((stat) => (
              <div key={`${card.id}-${stat.label}`} className="font-heading text-xs text-dynasty-muted">
                {stat.label}: <span className="text-dynasty-text">{stat.value}</span>
              </div>
            ))}
          </div>
          {card.highlights.length > 0 ? (
            <div className="mt-3 font-heading text-xs text-dynasty-muted">
              {card.highlights.join(' | ')}
            </div>
          ) : null}
        </div>
      )) : (
        <EmptyStatePanel
          title="No legacy cards yet"
          description="Season recaps, championships, and career-overview cards appear here once those moments are recorded."
        />
      )}
    </DensePanel>
  );
}
