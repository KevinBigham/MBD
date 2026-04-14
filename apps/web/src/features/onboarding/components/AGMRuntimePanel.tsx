import type { AGMCandidate } from '@mbd/sim-core';

interface AGMRuntimePanelProps {
  candidate: AGMCandidate;
  mode: 'chapter' | 'desk';
  expression: 'neutral' | 'focused' | 'confident' | 'concerned';
  eyebrow: string;
  headline: string;
  body: string;
}

const EXPRESSION_ACCENTS: Record<AGMRuntimePanelProps['expression'], string> = {
  neutral: 'from-accent-info/25 via-accent-primary/15 to-transparent',
  focused: 'from-accent-warning/30 via-accent-primary/15 to-transparent',
  confident: 'from-accent-success/30 via-accent-primary/15 to-transparent',
  concerned: 'from-accent-danger/30 via-accent-warning/15 to-transparent',
};

export function AGMRuntimePanel({
  candidate,
  mode,
  expression,
  eyebrow,
  headline,
  body,
}: AGMRuntimePanelProps) {
  const initials = candidate.name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className={`rounded-2xl border border-dynasty-border bg-dynasty-surface ${mode === 'chapter' ? 'p-6' : 'p-4'}`}>
      <div className={`rounded-2xl border border-dynasty-border/80 bg-gradient-to-br ${EXPRESSION_ACCENTS[expression]} p-4`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-data text-[10px] uppercase tracking-[0.24em] text-accent-warning">{eyebrow}</div>
            <div className="mt-2 font-heading text-lg font-semibold text-dynasty-textBright">{candidate.name}</div>
            <div className="mt-1 font-heading text-xs text-dynasty-muted">{candidate.nickname} · {candidate.background.replaceAll('_', ' ')}</div>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dynasty-border/80 bg-dynasty-base font-brand text-2xl text-dynasty-textBright shadow-[0_0_40px_rgba(10,17,28,0.35)]">
            {initials}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-accent-success motion-safe:animate-pulse" />
            <span className="font-data text-[10px] uppercase tracking-[0.22em] text-dynasty-muted">
              {mode === 'chapter' ? 'Chapter Lead' : 'Desk-Side AGM'}
            </span>
          </div>

          <div>
            <div className="font-heading text-base text-dynasty-textBright">{headline}</div>
            <p className="mt-2 font-heading text-sm leading-6 text-dynasty-muted">{body}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {candidate.strengths.slice(0, 2).map((strength) => (
              <div key={strength} className="rounded-xl border border-dynasty-border/70 bg-dynasty-base/60 px-3 py-2 font-heading text-xs text-dynasty-text">
                {strength}
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
