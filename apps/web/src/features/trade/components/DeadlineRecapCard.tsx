import { DensePanel } from '@/shared/components/DensePanel';
import { humanizeLabel } from '@/shared/lib/labels';
import type { TradeDeadlineRecapView } from '@/workers/sim.worker.trade';

export default function DeadlineRecapCard({
  recap,
}: {
  recap: TradeDeadlineRecapView;
}) {
  return (
    <DensePanel
      title={recap.analysisHeadline}
      bodyClassName="p-4"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="space-y-2">
            {recap.yourTrades.map((item) => (
              <div key={item.id} className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`rounded border px-2 py-0.5 font-heading text-[10px] uppercase tracking-[0.18em] ${
                    item.outcome === 'completed'
                      ? 'border-accent-success/40 text-accent-success'
                      : 'border-accent-warning/40 text-accent-warning'
                  }`}>
                    {humanizeLabel(item.outcome)}
                  </span>
                </div>
                <p className="mt-2 font-heading text-sm text-dynasty-text">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 xl:w-[22rem]">
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Major Moves</div>
            <div className="mt-2 space-y-2">
              {recap.majorMoves.map((move) => (
                <p key={move.id} className="font-heading text-xs text-dynasty-text">{move.summary}</p>
              ))}
            </div>
          </div>
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Winners</div>
            <p className="mt-2 font-heading text-sm text-dynasty-text">{recap.winners.join(', ') || 'None'}</p>
          </div>
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Losers</div>
            <p className="mt-2 font-heading text-sm text-dynasty-text">{recap.losers.join(', ') || 'None'}</p>
          </div>
        </div>
      </div>
    </DensePanel>
  );
}
