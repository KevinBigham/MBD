import { ArrowRight, RotateCcw, Scale } from 'lucide-react';
import { ProgressFill } from '@/shared/components/ProgressFill';

export interface TradePackageSummaryItem {
  key: string;
  label: string;
}

interface TradePackageEvaluationCardProps {
  activeCounterOfferId: string | null;
  activeNegotiation: boolean;
  disabledReason: string;
  fairnessRatio: number;
  hasOfferingAssets: boolean;
  hasRequestingAssets: boolean;
  offerTotal: number;
  offeringSummary: TradePackageSummaryItem[];
  onClear: () => void;
  onSubmit: () => void;
  packageFairness: { text: string; color: string };
  proposing: boolean;
  requestTotal: number;
  requestingSummary: TradePackageSummaryItem[];
  selectedTeam: string;
  tradeMarketOpen: boolean;
}

function packageFairnessTone(fairnessRatio: number): string {
  if (fairnessRatio >= 0.4 && fairnessRatio <= 0.6) {
    return 'bg-accent-success';
  }
  if (fairnessRatio >= 0.3 && fairnessRatio <= 0.7) {
    return 'bg-accent-warning';
  }
  return 'bg-accent-danger';
}

export default function TradePackageEvaluationCard({
  activeCounterOfferId,
  activeNegotiation,
  disabledReason,
  fairnessRatio,
  hasOfferingAssets,
  hasRequestingAssets,
  offerTotal,
  offeringSummary,
  onClear,
  onSubmit,
  packageFairness,
  proposing,
  requestTotal,
  requestingSummary,
  selectedTeam,
  tradeMarketOpen,
}: TradePackageEvaluationCardProps) {
  const hasAnyAssets = hasOfferingAssets || hasRequestingAssets;
  const submitDisabled = !tradeMarketOpen || !selectedTeam || !hasOfferingAssets || !hasRequestingAssets || proposing;
  const submitTitle = !tradeMarketOpen
    ? disabledReason
    : !selectedTeam
      ? 'Select a target club first.'
      : !hasOfferingAssets || !hasRequestingAssets
        ? 'Select at least one outgoing and one incoming asset.'
        : 'Send this package to the other GM.';
  const submitLabel = activeCounterOfferId
    ? 'Send Counter Offer'
    : activeNegotiation
      ? 'Send Negotiation Counter'
      : 'Start Negotiation';

  return (
    <div className="mt-4 rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-dynasty-muted" />
        <h3 className="font-heading text-sm font-semibold text-dynasty-text">Package Evaluation</h3>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div>
          <p className="mb-2 font-heading text-[11px] uppercase tracking-[0.18em] text-accent-primary">Offering</p>
          <div className="flex flex-wrap gap-1.5">
            {offeringSummary.length === 0 ? (
              <span className="font-heading text-xs text-dynasty-muted">Select players, picks, or pool space from your side</span>
            ) : (
              offeringSummary.map((asset) => (
                <span
                  key={asset.key}
                  className="rounded border border-dynasty-border bg-dynasty-surface px-2 py-1 font-data text-xs text-dynasty-text"
                >
                  {asset.label}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="hidden items-center justify-center md:flex">
          <ArrowRight className="h-5 w-5 text-dynasty-muted" />
        </div>

        <div>
          <p className="mb-2 font-heading text-[11px] uppercase tracking-[0.18em] text-accent-info">Requesting</p>
          <div className="flex flex-wrap gap-1.5">
            {requestingSummary.length === 0 ? (
              <span className="font-heading text-xs text-dynasty-muted">Select players, picks, or pool space from the target club</span>
            ) : (
              requestingSummary.map((asset) => (
                <span
                  key={asset.key}
                  className="rounded border border-dynasty-border bg-dynasty-surface px-2 py-1 font-data text-xs text-dynasty-text"
                >
                  {asset.label}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {hasAnyAssets ? (
        <div className="mt-4 space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">You Send Value</div>
              <div className="mt-1 font-data text-lg text-dynasty-textBright">{offerTotal.toFixed(1)}</div>
            </div>
            <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">You Receive Value</div>
              <div className="mt-1 font-data text-lg text-dynasty-textBright">{requestTotal.toFixed(1)}</div>
            </div>
          </div>
          <ProgressFill
            toneClassName={packageFairnessTone(fairnessRatio)}
            value={Math.round(fairnessRatio * 100)}
          />
          <div className="flex items-center justify-between font-data text-xs">
            <span className="text-dynasty-muted">Favors you</span>
            <span className={packageFairness.color}>{packageFairness.text}</span>
            <span className="text-dynasty-muted">Favors them</span>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-mobile-critical-control="trade-package-submit"
          onClick={onSubmit}
          disabled={submitDisabled}
          title={submitTitle}
          className="mobile-critical-control inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowRight className="h-4 w-4" />
          {submitLabel}
        </button>
        {hasAnyAssets || activeCounterOfferId || activeNegotiation ? (
          <button
            type="button"
            data-mobile-critical-control="trade-package-clear"
            onClick={onClear}
            className="mobile-critical-control inline-flex items-center gap-2 rounded-md border border-dynasty-border px-4 py-2 font-heading text-sm text-dynasty-muted transition-colors hover:text-dynasty-text"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
