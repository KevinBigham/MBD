import { ChevronDown, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';

export type SettingsPreferenceSectionKey = 'audio' | 'simulation' | 'display' | 'accessibility';
export type SettingsSimSpeed = 'fast' | 'normal' | 'detailed';
export type SettingsDefaultStatView = 'sabermetric' | 'traditional';
export type SettingsTableDensity = 'standard' | 'compact';

export interface SettingsPreferencesPanelProps {
  ambientVolumePercent: number;
  autoAdvance: boolean;
  defaultStatView: SettingsDefaultStatView;
  effectVolumePercent: number;
  highContrast: boolean;
  muted: boolean;
  openSections: Record<SettingsPreferenceSectionKey, boolean>;
  reducedMotion: boolean;
  simSpeed: SettingsSimSpeed;
  tableDensity: SettingsTableDensity;
  volumePercent: number;
  onAmbientVolumeChange: (nextVolume: number) => void;
  onAutoAdvanceToggle: () => void;
  onDefaultStatViewChange: (nextView: SettingsDefaultStatView) => void;
  onEffectVolumeChange: (nextVolume: number) => void;
  onHighContrastToggle: () => void;
  onMuteToggle: () => void;
  onReducedMotionToggle: () => void;
  onSimSpeedChange: (nextSpeed: SettingsSimSpeed) => void;
  onTableDensityChange: (nextDensity: SettingsTableDensity) => void;
  onToggleSection: (section: SettingsPreferenceSectionKey) => void;
  onVolumeChange: (nextVolume: number) => void;
}

function PreferenceSection({
  children,
  description,
  onToggle,
  open,
  title,
}: {
  children: ReactNode;
  description: string;
  onToggle: () => void;
  open: boolean;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left"
      >
        <div>
          <h2 className="font-heading text-lg font-semibold text-dynasty-textBright">
            {title}
          </h2>
          <p className="mt-2 font-heading text-sm text-dynasty-muted">
            {description}
          </p>
        </div>
        {open ? (
          <ChevronDown className="mt-1 h-4 w-4 text-dynasty-muted" />
        ) : (
          <ChevronRight className="mt-1 h-4 w-4 text-dynasty-muted" />
        )}
      </button>
      {open ? (
        <div className="border-t border-dynasty-border px-6 py-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function SettingsPreferencesPanel({
  ambientVolumePercent,
  autoAdvance,
  defaultStatView,
  effectVolumePercent,
  highContrast,
  muted,
  openSections,
  reducedMotion,
  simSpeed,
  tableDensity,
  volumePercent,
  onAmbientVolumeChange,
  onAutoAdvanceToggle,
  onDefaultStatViewChange,
  onEffectVolumeChange,
  onHighContrastToggle,
  onMuteToggle,
  onReducedMotionToggle,
  onSimSpeedChange,
  onTableDensityChange,
  onToggleSection,
  onVolumeChange,
}: SettingsPreferencesPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <PreferenceSection
        title="Audio"
        description="Procedural effects and ambient beds. Audio starts muted until you opt in."
        open={openSections.audio}
        onToggle={() => onToggleSection('audio')}
      >
        <div className="flex items-start justify-between gap-4">
          <div />
          <button
            type="button"
            onClick={onMuteToggle}
            aria-label={muted ? 'Enable sound effects and ambience' : 'Mute all audio'}
            className={`inline-flex items-center gap-2 rounded border px-3 py-2 font-heading text-xs uppercase tracking-wide transition-colors ${
              muted
                ? 'border-dynasty-border text-dynasty-text hover:bg-dynasty-elevated'
                : 'border-accent-success/40 text-accent-success hover:bg-accent-success/10'
            }`}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {muted ? 'Muted' : 'Sound On'}
          </button>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <label htmlFor="audio-volume" className="font-heading text-sm text-dynasty-textBright">
              Master Volume
            </label>
            <span className="font-data text-xs text-dynasty-muted">{volumePercent}%</span>
          </div>
          <input
            id="audio-volume"
            type="range"
            min={0}
            max={100}
            step={1}
            value={volumePercent}
            onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
            className="mt-3 w-full accent-accent-primary"
          />
          <p className="mt-3 font-heading text-xs text-dynasty-muted">
            Ambient beds stay disabled when the browser requests reduced motion.
          </p>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <label htmlFor="audio-effect-volume" className="font-heading text-sm text-dynasty-textBright">
                Effects Volume
              </label>
              <span className="font-data text-xs text-dynasty-muted">{effectVolumePercent}%</span>
            </div>
            <input
              id="audio-effect-volume"
              type="range"
              min={0}
              max={100}
              step={1}
              value={effectVolumePercent}
              onChange={(event) => onEffectVolumeChange(Number(event.target.value) / 100)}
              className="mt-3 w-full accent-accent-primary"
            />
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <label htmlFor="audio-ambient-volume" className="font-heading text-sm text-dynasty-textBright">
                Ambient Volume
              </label>
              <span className="font-data text-xs text-dynasty-muted">{ambientVolumePercent}%</span>
            </div>
            <input
              id="audio-ambient-volume"
              type="range"
              min={0}
              max={100}
              step={1}
              value={ambientVolumePercent}
              onChange={(event) => onAmbientVolumeChange(Number(event.target.value) / 100)}
              className="mt-3 w-full accent-accent-primary"
            />
          </div>
        </div>
      </PreferenceSection>

      <PreferenceSection
        title="Simulation"
        description="Pace the calendar flow and decide how much intervention the sim takes between checkpoints."
        open={openSections.simulation}
        onToggle={() => onToggleSection('simulation')}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="font-heading text-sm text-dynasty-textBright">Sim Speed</span>
            <select
              aria-label="Sim Speed"
              className="mt-2 w-full rounded border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
              value={simSpeed}
              onChange={(event) => onSimSpeedChange(event.target.value as SettingsSimSpeed)}
            >
              <option value="fast">Fast</option>
              <option value="normal">Normal</option>
              <option value="detailed">Detailed</option>
            </select>
          </label>
          <button
            type="button"
            onClick={onAutoAdvanceToggle}
            aria-pressed={autoAdvance}
            className={`rounded border px-3 py-2 font-heading text-xs uppercase tracking-wide ${autoAdvance ? 'border-accent-success/40 text-accent-success' : 'border-dynasty-border text-dynasty-text'}`}
          >
            Auto Advance {autoAdvance ? 'On' : 'Off'}
          </button>
        </div>
      </PreferenceSection>

      <PreferenceSection
        title="Display"
        description="Information density, stat display preferences, and table defaults."
        open={openSections.display}
        onToggle={() => onToggleSection('display')}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="font-heading text-sm text-dynasty-textBright">Default Stat View</span>
            <select
              aria-label="Default Stat View"
              className="mt-2 w-full rounded border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
              value={defaultStatView}
              onChange={(event) => onDefaultStatViewChange(event.target.value as SettingsDefaultStatView)}
            >
              <option value="sabermetric">Sabermetric</option>
              <option value="traditional">Traditional</option>
            </select>
          </label>
          <label className="block">
            <span className="font-heading text-sm text-dynasty-textBright">Table Density</span>
            <select
              aria-label="Table Density"
              className="mt-2 w-full rounded border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
              value={tableDensity}
              onChange={(event) => onTableDensityChange(event.target.value as SettingsTableDensity)}
            >
              <option value="standard">Standard</option>
              <option value="compact">Compact</option>
            </select>
          </label>
        </div>
      </PreferenceSection>

      <PreferenceSection
        title="Accessibility"
        description="Reduce motion, raise contrast, and keep the app readable in longer sessions."
        open={openSections.accessibility}
        onToggle={() => onToggleSection('accessibility')}
      >
        <div className="flex flex-wrap gap-3">
          <button
            aria-pressed={reducedMotion}
            type="button"
            onClick={onReducedMotionToggle}
            className={`rounded border px-3 py-2 font-heading text-xs uppercase tracking-wide ${reducedMotion ? 'border-accent-info/40 text-accent-info' : 'border-dynasty-border text-dynasty-text'}`}
          >
            Reduced Motion {reducedMotion ? 'On' : 'Off'}
          </button>
          <button
            aria-pressed={highContrast}
            type="button"
            onClick={onHighContrastToggle}
            className={`rounded border px-3 py-2 font-heading text-xs uppercase tracking-wide ${highContrast ? 'border-accent-warning/40 text-accent-warning' : 'border-dynasty-border text-dynasty-text'}`}
          >
            High Contrast {highContrast ? 'On' : 'Off'}
          </button>
        </div>
      </PreferenceSection>
    </div>
  );
}
