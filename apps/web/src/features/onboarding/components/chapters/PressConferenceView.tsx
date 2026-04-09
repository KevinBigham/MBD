import type { OnboardingPressConferenceBriefing } from '@mbd/sim-core';

interface Props {
  data: OnboardingPressConferenceBriefing;
}

export function PressConferenceView({ data }: Props) {
  return (
    <div className="space-y-5">
      <p className="font-heading text-sm text-dynasty-text">{data.finalNarrative}</p>

      {/* Recommended tone */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Media Strategy
        </h4>
        <p className="mt-2 font-data text-xs text-dynasty-muted">
          Recommended Tone:{' '}
          <span className="capitalize text-accent-primary">{data.recommendedTone}</span>
        </p>
      </div>

      {/* Likely questions */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Likely Press Questions
        </h4>
        <div className="mt-3 space-y-2">
          {data.likelyQuestions.map((question, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 rounded border border-dynasty-border/50 bg-dynasty-bg/40 px-3 py-2"
            >
              <span className="mt-0.5 font-data text-xs text-accent-primary">Q{idx + 1}</span>
              <p className="font-heading text-sm text-dynasty-text">{question}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Opening statement previews */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Opening Statement Preview
        </h4>
        <div className="mt-3 space-y-2">
          {data.openingStatementOptions.map((option) => (
            <div
              key={option.id}
              className="rounded border border-dynasty-border/50 bg-dynasty-bg/40 px-3 py-2"
            >
              <span className="font-heading text-xs font-medium capitalize text-accent-primary">
                {option.label}
              </span>
              <p className="mt-1 font-data text-[11px] text-dynasty-muted italic">
                &ldquo;{option.statement}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
