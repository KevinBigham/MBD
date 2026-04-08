import { useEffect, useRef } from 'react';
import { AlertTriangle, ArrowRight, Clock3, Sparkles, X } from 'lucide-react';
import type { DecisionSpotlightItem, MonthlyReport } from '@mbd/contracts';
import { AnimatedNumber } from '@/shared/components/AnimatedNumber';
import { useEffectiveReducedMotion } from '@/shared/hooks/useEffectiveReducedMotion';
import { getAudioEngine } from '@/shared/lib/audio';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';

interface MonthlyPulseOverlayProps {
  report: MonthlyReport | null;
  decision: DecisionSpotlightItem | null;
  onboardingGuide?: string | null;
  busy: boolean;
  onContinue: () => void;
  onDecisionDismiss: () => void;
  onDecisionAction: () => void;
}

function urgencyTone(urgency: DecisionSpotlightItem['urgency']): string {
  switch (urgency) {
    case 'red':
      return 'border-accent-danger/40 bg-accent-danger/10 text-accent-danger';
    case 'yellow':
      return 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning';
    default:
      return 'border-accent-info/40 bg-accent-info/10 text-accent-info';
  }
}

export function MonthlyPulseOverlay({
  report,
  decision,
  onboardingGuide,
  busy,
  onContinue,
  onDecisionDismiss,
  onDecisionAction,
}: MonthlyPulseOverlayProps) {
  const visible = report != null || decision != null;
  const visibleRef = useRef<boolean | null>(null);
  const reducedMotion = useEffectiveReducedMotion();
  const trapRef = useFocusTrap<HTMLDivElement>(visible);

  useEffect(() => {
    if (visibleRef.current == null) {
      visibleRef.current = visible;
      return;
    }

    if (visibleRef.current !== visible) {
      getAudioEngine().playEffect(visible ? 'modal_open' : 'modal_close');
    }

    visibleRef.current = visible;
  }, [visible]);

  if (!report && !decision) {
    return null;
  }

  const scheduleDifficulty = report?.upcomingScheduleDifficulty ?? {
    label: 'Balanced',
    summary: 'Schedule difficulty will update after the next monthly advance.',
  };
  const keyInjuries = report?.keyInjuries ?? [];
  const keyReturns = report?.keyReturns ?? [];

  return (
    <div ref={trapRef} data-overlay="monthly-pulse" className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />

      <section className={`relative w-full max-w-3xl overflow-hidden rounded-2xl border border-dynasty-border bg-[radial-gradient(circle_at_top,rgba(181,166,114,0.1),transparent_42%),linear-gradient(180deg,rgba(20,24,28,0.98),rgba(13,16,19,0.98))] shadow-2xl ${reducedMotion ? '' : 'animate-ceremony-fade-in'}`}>
        {report ? (
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.2em] text-accent-warning">
                  <Clock3 className="h-4 w-4" />
                  Monthly Report
                </div>
                <h2 className="mt-2 font-brand text-3xl text-dynasty-textBright">{report.monthLabel}</h2>
                <p className="mt-1 font-heading text-sm text-dynasty-muted">
                  Month record {report.teamRecord}. Overall {report.overallRecord}.
                </p>
              </div>
              <div className="rounded-lg border border-dynasty-border bg-dynasty-surface px-4 py-3">
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Division Move</div>
                <div className="mt-2 font-brand text-3xl text-dynasty-textBright">
                  <AnimatedNumber
                    value={report.divisionMovement}
                    formatter={(value) => {
                      const rounded = Math.round(value);
                      return rounded > 0 ? `+${rounded}` : `${rounded}`;
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className={`rounded-lg border border-dynasty-border bg-dynasty-elevated p-4 ${reducedMotion ? '' : 'animate-ceremony-slide-up'}`}>
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Standing</div>
                <div className="mt-2 font-heading text-xl text-dynasty-textBright">#{report.divisionRank}</div>
              </div>
              <div className={`rounded-lg border border-dynasty-border bg-dynasty-elevated p-4 ${reducedMotion ? '' : 'animate-ceremony-slide-up'}`} style={reducedMotion ? undefined : { animationDelay: '40ms' }}>
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Player of the Month</div>
                <div className="mt-2 font-heading text-sm text-dynasty-textBright">
                  {report.playerOfTheMonth
                    ? `${report.playerOfTheMonth.playerName} • ${report.playerOfTheMonth.war.toFixed(1)} WAR`
                    : 'No clear standout'}
                </div>
              </div>
              <div className={`rounded-lg border border-dynasty-border bg-dynasty-elevated p-4 ${reducedMotion ? '' : 'animate-ceremony-slide-up'}`} style={reducedMotion ? undefined : { animationDelay: '80ms' }}>
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Trade Deadline</div>
                <div className="mt-2 font-heading text-sm text-dynasty-textBright">
                  {report.tradeDeadlineCountdown != null
                    ? `${report.tradeDeadlineCountdown} days left`
                    : 'No immediate deadline pressure'}
                </div>
              </div>
              <div className={`rounded-lg border border-dynasty-border bg-dynasty-elevated p-4 ${reducedMotion ? '' : 'animate-ceremony-slide-up'}`} style={reducedMotion ? undefined : { animationDelay: '120ms' }}>
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Next Month</div>
                <div className="mt-2 font-heading text-sm text-dynasty-textBright">
                  {scheduleDifficulty.label}
                </div>
                <div className="mt-1 font-heading text-xs text-dynasty-muted">
                  {scheduleDifficulty.summary}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {onboardingGuide ? (
                <div className="rounded-lg border border-accent-info/30 bg-accent-info/10 p-4 md:col-span-2">
                  <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-info">How to Read This</div>
                  <div className="mt-2 font-heading text-sm leading-6 text-dynasty-text">{onboardingGuide}</div>
                </div>
              ) : null}
              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Key Injuries</div>
                <div className="mt-2 space-y-2">
                  {keyInjuries.length > 0 ? keyInjuries.map((entry) => (
                    <p key={entry} className="font-heading text-sm text-dynasty-text">{entry}</p>
                  )) : (
                    <p className="font-heading text-sm text-dynasty-muted">No new major injuries this month.</p>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Returns</div>
                <div className="mt-2 space-y-2">
                  {keyReturns.length > 0 ? keyReturns.map((entry) => (
                    <p key={entry} className="font-heading text-sm text-dynasty-text">{entry}</p>
                  )) : (
                    <p className="font-heading text-sm text-dynasty-muted">No notable returns were logged.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onContinue}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : decision ? (
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.2em] text-accent-info">
                  <Sparkles className="h-4 w-4" />
                  Decision Spotlight
                </div>
                <h2 className="mt-2 font-brand text-3xl text-dynasty-textBright">{decision.title}</h2>
              </div>
              <span className={`rounded border px-3 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${urgencyTone(decision.urgency)}`}>
                {decision.urgency}
              </span>
            </div>

            <div className="mt-5 rounded-lg border border-dynasty-border bg-dynasty-elevated p-5">
                <div className={`flex items-start gap-3 ${reducedMotion ? '' : 'animate-ceremony-slide-up'}`}>
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-accent-warning" />
                  <p className="font-heading text-sm leading-6 text-dynasty-text">{decision.body}</p>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={onDecisionDismiss}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-md border border-dynasty-border px-4 py-2 font-heading text-sm font-semibold text-dynasty-text transition-colors hover:border-dynasty-muted hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X className="h-4 w-4" />
                Dismiss
              </button>
              <button
                onClick={onDecisionAction}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {decision.actionLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
