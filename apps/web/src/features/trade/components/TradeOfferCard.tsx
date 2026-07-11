import {
  ArrowLeftRight,
  Check,
  X,
} from 'lucide-react';
import { humanizeLabel } from '@/shared/lib/labels';
import {
  dialogueUrgencyClass,
  fairnessText,
  modeBadgeClass,
  modeLabel,
  type HotTradeOfferView,
} from './tradePresentation';
import TradeExplanationFactors from './TradeExplanationFactors';

interface TradeOfferCardProps {
  offer: HotTradeOfferView;
  onAccept: () => void;
  onCounter: () => void;
  onDecline: () => void;
}

export default function TradeOfferCard({
  offer,
  onAccept,
  onCounter,
  onDecline,
}: TradeOfferCardProps) {
  const evaluation = fairnessText(-offer.fairnessScore, 'Them', 'You');
  const urgencyTone = offer.urgencyTag === 'FINAL OFFER'
    ? 'border-accent-danger/50 bg-accent-danger/10 text-accent-danger'
    : offer.urgencyTag === 'EXPIRING SOON'
      ? 'border-accent-warning/50 bg-accent-warning/10 text-accent-warning'
      : 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';

  return (
    <article
      aria-label={`Trade offer from ${offer.fromTeamName}`}
      data-testid="trade-offer-card"
      data-from-team-abbreviation={offer.fromTeamAbbreviation}
      className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-sm font-semibold text-dynasty-textBright">{offer.fromTeamName}</p>
          <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            {offer.createdAt} · {evaluation}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded border px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${urgencyTone}`}>
            {offer.urgencyTag}
          </span>
          <span className={`rounded border px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${modeBadgeClass(offer.dialogue.mode)}`}>
            {modeLabel(offer.dialogue.mode)}
          </span>
          <span className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            {offer.fromTeamAbbreviation}
          </span>
        </div>
      </div>

      <p className="mt-3 font-heading text-sm text-dynasty-text">{offer.message}</p>
      {offer.biddingSummary ? (
        <p className="mt-2 rounded border border-accent-warning/30 bg-accent-warning/10 px-3 py-2 font-heading text-xs text-accent-warning">
          {offer.biddingSummary}
        </p>
      ) : null}
      <TradeExplanationFactors
        title="Why they called"
        fairnessScore={-offer.fairnessScore}
        gmSignal={`${modeLabel(offer.dialogue.mode)} posture with ${humanizeLabel(offer.dialogue.urgency)} urgency.`}
        marketSignal={`${offer.urgencyTag} changes leverage and response timing.`}
      />
      <div className={`mt-3 rounded border px-3 py-3 ${dialogueUrgencyClass(offer.dialogue.urgency)}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">GM Dialogue</p>
          <span className={`rounded border px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${modeBadgeClass(offer.dialogue.mode)}`}>
            {humanizeLabel(offer.dialogue.urgency)}
          </span>
        </div>
        <p className="mt-2 font-heading text-sm font-semibold text-dynasty-textBright">{offer.dialogue.headline}</p>
        <div className="mt-2 space-y-2">
          {offer.dialogue.lines.map((line) => (
            <p key={`${offer.id}-${line}`} className="rounded border border-dynasty-border bg-dynasty-surface/70 px-3 py-2 font-heading text-xs text-dynasty-text">
              {line}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
          <p className="font-heading text-[11px] uppercase tracking-[0.18em] text-accent-success">They Offer</p>
          <div className="mt-2 space-y-1">
            {offer.offeringAssets.map((asset) => (
              <p
                key={asset.key}
                data-testid="trade-offering-asset"
                data-asset-type={asset.type}
                data-player-id={asset.playerId}
                className="font-data text-xs text-dynasty-text"
              >
                {asset.label} · {asset.detail}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
          <p className="font-heading text-[11px] uppercase tracking-[0.18em] text-accent-warning">They Want</p>
          <div className="mt-2 space-y-1">
            {offer.requestingAssets.map((asset) => (
              <p
                key={asset.key}
                data-testid="trade-requesting-asset"
                data-asset-type={asset.type}
                data-player-id={asset.playerId}
                className="font-data text-xs text-dynasty-text"
              >
                {asset.label} · {asset.detail}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onAccept}
          className="inline-flex items-center gap-2 rounded-md bg-accent-success px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-accent-success/80"
        >
          <Check className="h-4 w-4" /> Accept
        </button>
        <button
          onClick={onCounter}
          className="inline-flex items-center gap-2 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-dynasty-text transition-colors hover:border-accent-info hover:text-accent-info"
        >
          <ArrowLeftRight className="h-4 w-4" /> Counter
        </button>
        <button
          onClick={onDecline}
          className="inline-flex items-center gap-2 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-dynasty-muted transition-colors hover:border-accent-danger hover:text-accent-danger"
        >
          <X className="h-4 w-4" /> Decline
        </button>
      </div>
    </article>
  );
}
