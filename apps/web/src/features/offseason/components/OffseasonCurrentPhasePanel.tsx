import { ChevronRight, SkipForward, type LucideIcon } from 'lucide-react';

export function OffseasonCurrentPhasePanel({
  label,
  description,
  icon: Icon,
  phaseDay,
  advancing,
  onAdvance,
  onSkip,
}: {
  label: string;
  description: string;
  icon: LucideIcon;
  phaseDay: number | null;
  advancing: boolean;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="rounded-lg border-2 border-accent-primary/50 bg-dynasty-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-accent-primary" />
            <h2 className="font-heading text-lg font-semibold text-dynasty-textBright">
              {label}
            </h2>
            {phaseDay != null && (
              <span className="font-data text-xs text-dynasty-muted">
                Day {phaseDay}
              </span>
            )}
          </div>
          <p className="mt-2 max-w-2xl font-heading text-sm text-dynasty-muted">
            {description}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            data-mobile-critical-control="offseason-advance-day"
            onClick={onAdvance}
            disabled={advancing}
            className="mobile-critical-control flex items-center gap-1 rounded bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
            Advance Day
          </button>
          <button
            type="button"
            data-mobile-critical-control="offseason-skip-phase"
            onClick={onSkip}
            disabled={advancing}
            className="mobile-critical-control flex items-center gap-1 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-sm text-dynasty-muted transition-colors hover:text-dynasty-text disabled:opacity-50"
          >
            <SkipForward className="h-4 w-4" />
            Skip Phase
          </button>
        </div>
      </div>
    </div>
  );
}
