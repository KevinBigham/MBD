import { Check, type LucideIcon } from 'lucide-react';

export interface OffseasonPhaseStepView {
  id: string;
  label: string;
  icon: LucideIcon;
}

export function OffseasonPhaseTrackerPanel({
  phases,
  currentPhaseIndex,
}: {
  phases: OffseasonPhaseStepView[];
  currentPhaseIndex: number;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="flex items-center gap-1">
        {phases.map((phase, idx) => {
          const Icon = phase.icon;
          const isActive = idx === currentPhaseIndex;
          const isDone = idx < currentPhaseIndex;
          return (
            <div key={phase.id} className="flex flex-1 items-center">
              <div
                className={`flex flex-col items-center gap-1 ${
                  isActive
                    ? 'text-accent-primary'
                    : isDone
                      ? 'text-accent-success'
                      : 'text-dynasty-muted'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    isActive
                      ? 'border-accent-primary bg-accent-primary/20'
                      : isDone
                        ? 'border-accent-success bg-accent-success/20'
                        : 'border-dynasty-border bg-dynasty-elevated'
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="hidden text-center font-heading text-[10px] sm:block">
                  {phase.label}
                </span>
              </div>
              {idx < phases.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 ${idx < currentPhaseIndex ? 'bg-accent-success' : 'bg-dynasty-border'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
