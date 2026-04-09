import { ArrowRight, Star } from 'lucide-react';
import type { OnboardingHighlight, QuickReferenceCard, DialogueLine } from '@mbd/sim-core';
import { TypewriterText } from './TypewriterText';

interface OnboardingCompleteProps {
  highlights: OnboardingHighlight[];
  quickReference: QuickReferenceCard;
  farewellLines: DialogueLine[];
  onEnterFrontOffice: () => void;
}

export function OnboardingComplete({
  highlights,
  quickReference,
  farewellLines,
  onEnterFrontOffice,
}: OnboardingCompleteProps) {
  return (
    <div className="space-y-6">
      {/* Farewell */}
      <div className="rounded-lg border border-accent-primary/20 bg-accent-primary/5 p-5">
        <TypewriterText lines={farewellLines} />
      </div>

      {/* Highlights */}
      <div>
        <h3 className="font-heading text-sm font-medium uppercase tracking-wider text-dynasty-muted">
          Key Takeaways
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {highlights.map((hl) => (
            <div
              key={hl.rank}
              className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-3"
            >
              <div className="flex items-center gap-2">
                {hl.actionRequired && <Star className="h-3.5 w-3.5 text-accent-warning" />}
                <span className="font-data text-[10px] uppercase tracking-wider text-dynasty-muted">
                  {hl.category}
                </span>
              </div>
              <p className="mt-1 font-heading text-sm font-medium text-dynasty-text">
                {hl.headline}
              </p>
              <p className="mt-1 font-data text-[11px] text-dynasty-muted">{hl.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick reference card */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-5">
        <h3 className="font-heading text-sm font-medium uppercase tracking-wider text-dynasty-muted">
          Quick Reference
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
          <RefRow label="Team Grade" value={quickReference.teamGrade} />
          <RefRow label="Window" value={quickReference.windowStatus} />
          <RefRow label="Top Strength" value={quickReference.topStrength} />
          <RefRow label="Biggest Need" value={quickReference.biggestNeed} />
          <RefRow label="Key Decision" value={quickReference.keyDecision} />
          <RefRow label="Financials" value={quickReference.financialStatus} />
          <RefRow label="Top Prospect" value={quickReference.topProspect} />
          <RefRow label="Dangerous Rival" value={quickReference.dangerousRival} />
        </div>
        <div className="mt-4 border-t border-dynasty-border pt-3">
          <p className="font-data text-xs text-dynasty-muted">
            <span className="font-medium text-accent-primary">Recommended Path: </span>
            {quickReference.recommendedPath}
          </p>
          <p className="mt-1 font-data text-xs italic text-dynasty-muted">
            {quickReference.assistantAdvice}
          </p>
        </div>
      </div>

      {/* Enter button */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onEnterFrontOffice}
          className="flex items-center gap-2 rounded-lg bg-accent-primary px-6 py-3 font-heading text-sm font-semibold text-dynasty-bg transition-colors hover:bg-accent-primary/90"
        >
          Enter the Front Office
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function RefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="font-data text-[11px] text-dynasty-muted">{label}</span>
      <span className="font-data text-xs font-medium text-dynasty-text">{value}</span>
    </div>
  );
}
