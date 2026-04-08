import { useEffect, useRef } from 'react';
import { ArrowRight, Award, Sparkles, Star, Trophy, X } from 'lucide-react';
import type { CeremonyMoment } from '@mbd/contracts';
import { useEffectiveReducedMotion } from '@/shared/hooks/useEffectiveReducedMotion';
import { getAudioEngine } from '@/shared/lib/audio';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';

interface MomentCardOverlayProps {
  moment: CeremonyMoment | null;
  busy: boolean;
  onDismiss: (momentId: string) => void;
}

function toneForTheme(theme: CeremonyMoment['theme'] | undefined): string {
  switch (theme) {
    case 'future':
      return 'from-accent-info/30 via-transparent to-accent-success/10';
    case 'historic':
      return 'from-accent-warning/30 via-transparent to-accent-danger/10';
    case 'celebration':
    default:
      return 'from-accent-primary/30 via-transparent to-accent-warning/10';
  }
}

function isAwardMoment(moment: CeremonyMoment): boolean {
  return moment.type === 'award';
}

function AwardIcon({ className }: { className?: string }) {
  return <Trophy className={className} />;
}

export function MomentCardOverlay({ moment, busy, onDismiss }: MomentCardOverlayProps) {
  const dismissRef = useRef(onDismiss);
  const reducedMotion = useEffectiveReducedMotion();
  const trapRef = useFocusTrap<HTMLDivElement>(moment != null);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!moment) {
      return;
    }

    getAudioEngine().playEffect(moment.soundEffect);
  }, [moment]);

  useEffect(() => {
    if (!moment) {
      return;
    }

    let remainingMs = moment.autoDismissMs;
    let startedAt = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const clearScheduledDismiss = () => {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const scheduleDismiss = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      startedAt = Date.now();
      timeoutId = setTimeout(() => {
        dismissRef.current(moment.id);
      }, remainingMs);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearScheduledDismiss();
        if (startedAt > 0) {
          remainingMs = Math.max(0, remainingMs - (Date.now() - startedAt));
          startedAt = 0;
        }
        return;
      }

      clearScheduledDismiss();
      scheduleDismiss();
    };

    scheduleDismiss();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearScheduledDismiss();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [moment]);

  if (!moment) {
    return null;
  }

  return (
    <div ref={trapRef} data-overlay="moment-card" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Dismiss moment card"
        className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm"
        disabled={busy}
        onClick={() => onDismiss(moment.id)}
        type="button"
      />

      <section
        className={`relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-dynasty-border bg-[linear-gradient(180deg,rgba(14,18,22,0.98),rgba(10,13,16,0.98))] shadow-2xl ${reducedMotion ? '' : 'animate-ceremony-scale-up'}`}
        data-motion={reducedMotion ? 'reduced' : 'animated'}
      >
        <div className={`absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_38%)]`} aria-hidden="true" />
        <div className={`absolute inset-0 bg-gradient-to-br ${toneForTheme(moment.theme)}`} aria-hidden="true" />

        <div className="relative p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${isAwardMoment(moment) ? 'border-amber-400/30 bg-amber-400/10 text-amber-400' : 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning'}`}>
              {isAwardMoment(moment) ? <Award className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {isAwardMoment(moment) ? 'Award Ceremony' : 'Moment'}
            </div>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dynasty-border bg-dynasty-surface text-dynasty-muted transition-colors hover:border-accent-primary hover:text-accent-primary"
              disabled={busy}
              onClick={() => onDismiss(moment.id)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isAwardMoment(moment) ? (
            <div className="mt-8 flex flex-col items-center gap-5 text-center">
              <div className={`inline-flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-400/40 bg-amber-400/10 text-amber-400 ${reducedMotion ? '' : 'motion-safe:animate-ceremony-scale-up'}`}>
                <AwardIcon className="h-10 w-10" />
              </div>
              <div>
                <h2 className={`font-brand text-3xl tracking-[0.06em] text-amber-300 sm:text-4xl ${reducedMotion ? '' : 'motion-safe:animate-ceremony-fade-in'}`}>
                  {moment.title}
                </h2>
                <p className={`mt-2 font-heading text-base text-dynasty-muted ${reducedMotion ? '' : 'motion-safe:animate-ceremony-fade-in'}`}>{moment.subtitle}</p>
              </div>
              <div className="flex items-center gap-2 text-amber-400/60">
                <Star className="h-3 w-3" />
                <div className="h-px w-16 bg-amber-400/20" />
                <Star className="h-3 w-3" />
                <div className="h-px w-16 bg-amber-400/20" />
                <Star className="h-3 w-3" />
              </div>
              <div className="grid w-full gap-3">
                {moment.detailLines.map((detail, index) => (
                  <div
                    key={detail}
                    className={`rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-3 font-heading text-sm text-dynasty-text ${index === 0 ? 'font-semibold text-dynasty-textBright' : ''}`}
                  >
                    {detail}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-5">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-primary/25 bg-accent-primary/10 text-accent-primary">
                <Trophy className="h-7 w-7" />
              </div>
              <div>
                <h2 className="font-brand text-4xl tracking-[0.06em] text-dynasty-textBright sm:text-5xl">
                  {moment.title}
                </h2>
                <p className="mt-3 font-heading text-lg text-dynasty-text">{moment.subtitle}</p>
              </div>
              <div className="grid gap-3">
                {moment.detailLines.map((detail) => (
                  <div key={detail} className="rounded-xl border border-dynasty-border bg-dynasty-elevated/90 px-4 py-3 font-heading text-sm text-dynasty-text">
                    {detail}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={busy}
              onClick={() => onDismiss(moment.id)}
              type="button"
            >
              Keep Going
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
