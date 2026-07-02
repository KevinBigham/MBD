import { Badge } from '@mbd/ui';
import { humanizeLabel } from '@/shared/lib/labels';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TradeNegotiationView } from '@/workers/sim.worker.trade';
import {
  buildTradeAssetLabel,
  modeBadgeClass,
  type TradeDialogueView,
} from './tradePresentation';

interface TradeNegotiationPanelProps {
  dialogueMode: TradeDialogueView['mode'];
  negotiation: TradeNegotiationView;
  onAccept: () => void;
  onCounter: () => void;
  onReject: () => void;
  playerById: (playerId: string) => PlayerDTO | undefined;
  proposing: boolean;
}

export default function TradeNegotiationPanel({
  dialogueMode,
  negotiation,
  onAccept,
  onCounter,
  onReject,
  playerById,
  proposing,
}: TradeNegotiationPanelProps) {
  return (
    <div className="mb-4 rounded-lg border border-accent-info/30 bg-accent-info/5 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">
          Negotiation Round
        </span>
        <Badge className="border-accent-info/40 bg-accent-info/10 text-accent-info">
          {Math.max(1, negotiation.roundsCompleted)}
        </Badge>
        <Badge className={modeBadgeClass(dialogueMode)}>
          {humanizeLabel(negotiation.phase)}
        </Badge>
        <Badge className="border-dynasty-border bg-dynasty-surface text-dynasty-muted">
          {negotiation.personalityLabel ?? humanizeLabel(negotiation.gmPersonality ?? 'analytical')}
        </Badge>
      </div>

      {negotiation.negotiationPosture || negotiation.counterOfferSummary ? (
        <div className="mt-3 rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
          {negotiation.negotiationPosture ? (
            <p className="font-heading text-xs font-semibold text-dynasty-textBright">
              {negotiation.negotiationPosture}
            </p>
          ) : null}
          {negotiation.counterOfferSummary ? (
            <p className="mt-1 font-heading text-xs text-dynasty-muted">
              {negotiation.counterOfferSummary}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {negotiation.dialogue.map((entry, index) => (
          <div
            key={`${entry.speaker}-${index}`}
            className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2"
          >
            <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
              {entry.speaker === 'rival_gm' ? negotiation.teamAbbreviation : 'AGM Advisor'}
            </div>
            <p className="mt-1 font-heading text-xs text-dynasty-text">{entry.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-3">
          <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">You Send</div>
          <div className="mt-2 space-y-1">
            {negotiation.proposal.offeringAssets.map((asset) => (
              <div key={`offer-${buildTradeAssetLabel(asset, playerById)}`} className="font-heading text-xs text-dynasty-text">
                {buildTradeAssetLabel(asset, playerById)}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-3">
          <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">You Receive</div>
          <div className="mt-2 space-y-1">
            {negotiation.proposal.requestingAssets.map((asset) => (
              <div key={`request-${buildTradeAssetLabel(asset, playerById)}`} className="font-heading text-xs text-dynasty-text">
                {buildTradeAssetLabel(asset, playerById)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAccept}
          disabled={proposing || !negotiation.canAccept}
          className="focus-ring rounded-md border border-accent-success/40 bg-accent-success/10 px-3 py-2 font-heading text-xs text-accent-success transition-colors hover:bg-accent-success/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={proposing || !negotiation.canReject}
          className="focus-ring rounded-md border border-accent-danger/40 bg-accent-danger/10 px-3 py-2 font-heading text-xs text-accent-danger transition-colors hover:bg-accent-danger/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={onCounter}
          disabled={proposing || !negotiation.canCounter}
          className="focus-ring rounded-md border border-accent-warning/40 bg-accent-warning/10 px-3 py-2 font-heading text-xs text-accent-warning transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          Counter
        </button>
      </div>
    </div>
  );
}
