import { Badge } from '@mbd/ui';
import { humanizeLabel } from '@/shared/lib/labels';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type {
  TradeNegotiationView,
  TradePlayerFinancialProjectionView,
} from '@/workers/sim.worker.trade';
import { buildTradeAssetLabel } from './tradePresentation';

interface TradeNegotiationSummaryCardProps {
  active: boolean;
  financialProjectionByPlayerId?: (playerId: string) => TradePlayerFinancialProjectionView | undefined;
  negotiation: TradeNegotiationView;
  onResume: () => void;
  playerById: (id: string) => PlayerDTO | undefined;
  userTeamId?: string;
}

export default function TradeNegotiationSummaryCard({
  active,
  financialProjectionByPlayerId = () => undefined,
  negotiation,
  onResume,
  playerById,
  userTeamId = '',
}: TradeNegotiationSummaryCardProps) {
  const lastLine = negotiation.dialogue.at(-1)?.text ?? 'The front office is waiting on your next move.';
  const offeringLabels = negotiation.proposal.offeringAssets
    .map((asset) => buildTradeAssetLabel(asset, playerById, financialProjectionByPlayerId, negotiation.teamId))
    .slice(0, 3);
  const requestingLabels = negotiation.proposal.requestingAssets
    .map((asset) => buildTradeAssetLabel(asset, playerById, financialProjectionByPlayerId, userTeamId))
    .slice(0, 3);

  return (
    <div
      className={[
        'rounded-lg border px-3 py-3 transition-colors',
        active
          ? 'border-accent-info/50 bg-accent-info/10'
          : 'border-dynasty-border bg-dynasty-elevated',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-heading text-sm font-semibold text-dynasty-textBright">
            {negotiation.teamAbbreviation} · Round {Math.max(1, negotiation.roundsCompleted)}
          </div>
          <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            {humanizeLabel(negotiation.phase)} · expires D{negotiation.expiresAtDay}
          </div>
        </div>
        <Badge className={active ? 'border-accent-info/40 bg-accent-info/10 text-accent-info' : 'border-dynasty-border text-dynasty-muted'}>
          {active ? 'Loaded' : 'Open'}
        </Badge>
      </div>

      <p className="mt-3 font-heading text-xs text-dynasty-text">{lastLine}</p>

      <div className="mt-3 grid gap-2">
        <div className="rounded border border-dynasty-border/70 bg-dynasty-surface/70 px-2 py-2">
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">You Send</div>
          <div className="mt-1 font-heading text-xs text-dynasty-text">
            {offeringLabels.join(', ') || 'No outgoing assets'}
          </div>
        </div>
        <div className="rounded border border-dynasty-border/70 bg-dynasty-surface/70 px-2 py-2">
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">You Receive</div>
          <div className="mt-1 font-heading text-xs text-dynasty-text">
            {requestingLabels.join(', ') || 'No incoming assets'}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onResume}
        className="focus-ring mt-3 w-full rounded-md border border-accent-info/40 bg-accent-info/10 px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-accent-info transition-colors hover:bg-accent-info/20"
      >
        Resume Talk
      </button>
    </div>
  );
}
