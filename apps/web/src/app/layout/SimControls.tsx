import { Play, FastForward, SkipForward, Zap } from 'lucide-react';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { getAudioEngine } from '@/shared/lib/audio';
import type { SeasonFlowState } from './seasonFlow';

interface SimControlsProps {
  onSimDay: () => void;
  onSimWeek: () => void;
  onSimMonth: () => void;
  onSimToPlayoffs: () => void;
  onFlowAction: () => void;
  disabled?: boolean;
  statusLabel?: string;
  flow: SeasonFlowState | null;
}

interface SimButtonProps {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  tooltip?: string;
}

function SimButton({ onClick, disabled, icon, label, shortLabel, tooltip }: SimButtonProps) {
  return (
    <button
      onClick={() => {
        getAudioEngine().playEffect('button_click');
        onClick();
      }}
      disabled={disabled}
      title={tooltip}
      className="focus-ring flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primaryHover disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={tooltip ?? label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel}</span>
    </button>
  );
}

export function SimControls({
  onSimDay,
  onSimWeek,
  onSimMonth,
  onSimToPlayoffs,
  onFlowAction,
  disabled = false,
  statusLabel,
  flow,
}: SimControlsProps) {
  const { isSimulating, season } = useGameStore();
  const progress = Math.round((flow?.progress ?? 0) * 100);
  const showRegularControls = flow?.canUseRegularSimControls ?? true;
  const controlsDisabled = disabled || isSimulating;

  return (
    <footer
      data-tour="sim-controls"
      aria-busy={controlsDisabled}
      className="mb-[calc(3.5rem+env(safe-area-inset-bottom))] border-t border-dynasty-border bg-dynasty-surface px-3 py-2 pb-2 md:mb-0 md:px-4 md:pb-2"
    >
      <div className="flex items-center gap-2 md:gap-3">
        {/* Status display */}
        <div className="hidden min-w-[140px] md:block" aria-live="polite">
          <div className="font-data text-xs text-dynasty-muted">{flow?.phaseLabel ?? `Season ${season}`}</div>
          <div className="font-data text-xs uppercase text-accent-info">
            {statusLabel ?? (disabled ? 'Preparing simulation' : (flow?.detailLabel ?? 'Simulation ready'))}
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-dynasty-border">
            <div
              className="h-full bg-accent-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {showRegularControls ? (
          <div className="grid flex-1 grid-cols-2 gap-1.5 sm:flex sm:gap-2">
            <SimButton
              onClick={onSimDay}
              disabled={controlsDisabled}
              icon={<Play className="h-4 w-4" />}
              label="Sim Day"
              shortLabel="Day"
              tooltip="Sim Day (Space)"
            />
            <SimButton
              onClick={onSimWeek}
              disabled={controlsDisabled}
              icon={<FastForward className="h-4 w-4" />}
              label="Sim Week"
              shortLabel="Week"
              tooltip="Sim Week (Shift+Space)"
            />
            <SimButton
              onClick={onSimMonth}
              disabled={controlsDisabled}
              icon={<SkipForward className="h-4 w-4" />}
              label="Next Month"
              shortLabel="Month"
              tooltip="Next Month (Ctrl+Space)"
            />
            <SimButton
              onClick={onSimToPlayoffs}
              disabled={controlsDisabled}
              icon={<Zap className="h-4 w-4" />}
              label="Sim to Playoffs"
              shortLabel="Playoffs"
              tooltip="Fast-forward to the playoff cutoff"
            />
          </div>
        ) : (
          <div className="flex flex-1">
            <button
              onClick={() => {
                getAudioEngine().playEffect('button_click');
                onFlowAction();
              }}
              disabled={controlsDisabled || !flow?.actionLabel}
              className="focus-ring flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primaryHover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Zap className="h-4 w-4" />
              {flow?.actionLabel ?? 'Continue'}
            </button>
          </div>
        )}
      </div>
    </footer>
  );
}
