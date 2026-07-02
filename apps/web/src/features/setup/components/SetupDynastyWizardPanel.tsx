import { humanizeLabel } from '@/shared/lib/labels';
import SetupTeamPickerPanel, {
  type SetupPreview,
  type SetupTeamOption,
  type SetupTeamPickerFilters,
} from './SetupTeamPickerPanel';

export type SetupDifficulty = 'easy' | 'standard' | 'hard';
export type SetupPlayMode = 'standard' | 'career';
export type SetupWizardMode = 'dynasty' | 'scenario';
export type SetupDayOneExperience = 'full' | 'quick';

export interface ScenarioCatalogEntry {
  id: string;
  name: string;
  description: string;
  difficulty: 'rookie' | 'standard' | 'hard' | 'legendary';
  maxSeasons: number;
  requiresCareerMode: boolean;
  startingTeamId?: string;
}

export interface SetupDynastyWizardPanelProps {
  busySlot: number | null;
  dayOneExperience: SetupDayOneExperience;
  difficulty: SetupDifficulty;
  filters: SetupTeamPickerFilters;
  gmName: string;
  onBack: () => void;
  onBeginDynasty: () => void;
  onChangeDayOneExperience: (experience: SetupDayOneExperience) => void;
  onChangeDifficulty: (difficulty: SetupDifficulty) => void;
  onChangeFilter: (filter: keyof SetupTeamPickerFilters, value: string) => void;
  onChangeGmName: (gmName: string) => void;
  onChangePlayMode: (mode: SetupPlayMode) => void;
  onChangeWizardMode: (mode: SetupWizardMode) => void;
  onSelectScenario: (scenarioId: string) => void;
  onSelectTeam: (teamId: string) => void;
  playMode: SetupPlayMode;
  previewMap: Record<string, SetupPreview>;
  scenarioCatalog: readonly ScenarioCatalogEntry[];
  selectedScenario: ScenarioCatalogEntry | null;
  selectedScenarioId: string | null;
  selectedSlot: number;
  selectedTeamId: string;
  teamOptions: readonly SetupTeamOption[];
  wizardMode: SetupWizardMode;
  workerIsReady: boolean;
  workerStatus: string;
}

export default function SetupDynastyWizardPanel({
  busySlot,
  dayOneExperience,
  difficulty,
  filters,
  gmName,
  onBack,
  onBeginDynasty,
  onChangeDayOneExperience,
  onChangeDifficulty,
  onChangeFilter,
  onChangeGmName,
  onChangePlayMode,
  onChangeWizardMode,
  onSelectScenario,
  onSelectTeam,
  playMode,
  previewMap,
  scenarioCatalog,
  selectedScenario,
  selectedScenarioId,
  selectedSlot,
  selectedTeamId,
  teamOptions,
  wizardMode,
  workerIsReady,
  workerStatus,
}: SetupDynastyWizardPanelProps) {
  return (
    <div className="rounded-2xl border border-dynasty-border bg-dynasty-surface p-6">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-success">New Dynasty</div>
      <h2 className="mt-3 font-brand text-3xl text-dynasty-textBright">Start in Slot {selectedSlot}</h2>
      <p className="mt-2 font-heading text-sm text-dynasty-muted">
        Pick a club, choose whether this save ends on firing or continues as a career, and enter the league with a GM identity that follows your legacy.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <span className="font-heading text-sm text-dynasty-textBright">Start Type</span>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              data-mobile-critical-control="setup-wizard-start-type"
              onClick={() => onChangeWizardMode('dynasty')}
              className={`mobile-critical-control focus-ring rounded-lg border px-4 py-3 text-left transition-colors ${
                wizardMode === 'dynasty'
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-dynasty-border bg-dynasty-base hover:bg-dynasty-elevated'
              }`}
            >
              <div className="font-heading text-sm text-dynasty-textBright">Open Dynasty</div>
              <div className="mt-1 font-heading text-xs text-dynasty-muted">
                Standard team selection with standard or career play modes.
              </div>
            </button>
            <button
              type="button"
              data-mobile-critical-control="setup-wizard-start-type"
              onClick={() => onChangeWizardMode('scenario')}
              className={`mobile-critical-control focus-ring rounded-lg border px-4 py-3 text-left transition-colors ${
                wizardMode === 'scenario'
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-dynasty-border bg-dynasty-base hover:bg-dynasty-elevated'
              }`}
            >
              <div className="font-heading text-sm text-dynasty-textBright">Challenge Scenario</div>
              <div className="mt-1 font-heading text-xs text-dynasty-muted">
                Fixed-club starts with explicit win conditions and local leaderboard tracking.
              </div>
            </button>
          </div>
        </div>

        {wizardMode === 'scenario' ? (
          <div>
            <span className="font-heading text-sm text-dynasty-textBright">Scenario</span>
            <div className="mt-2 space-y-2">
              {scenarioCatalog.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  data-mobile-critical-control="setup-wizard-scenario"
                  onClick={() => onSelectScenario(scenario.id)}
                  className={`mobile-critical-control focus-ring w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                    selectedScenarioId === scenario.id
                      ? 'border-accent-warning bg-accent-warning/10'
                      : 'border-dynasty-border bg-dynasty-base hover:bg-dynasty-elevated'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-heading text-sm text-dynasty-textBright">{scenario.name}</div>
                    <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                      {humanizeLabel(scenario.difficulty)} · {scenario.maxSeasons} seasons
                    </div>
                  </div>
                  <div className="mt-1 font-heading text-xs text-dynasty-muted">
                    {scenario.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <SetupTeamPickerPanel
            filters={filters}
            onChangeFilter={onChangeFilter}
            onSelectTeam={onSelectTeam}
            previewMap={previewMap}
            selectedTeamId={selectedTeamId}
            teamOptions={teamOptions}
          />
        )}

        <label className="block">
          <span className="font-heading text-sm text-dynasty-textBright">Difficulty</span>
          <select
            id="setup-difficulty"
            value={difficulty}
            data-mobile-critical-control="setup-wizard-difficulty"
            onChange={(event) => onChangeDifficulty(event.target.value as SetupDifficulty)}
            className="mobile-critical-control focus-ring mt-2 w-full rounded-md border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
          >
            <option value="easy">Easy</option>
            <option value="standard">Standard</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        {wizardMode === 'dynasty' ? (
          <div>
            <span className="font-heading text-sm text-dynasty-textBright">Mode</span>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                data-mobile-critical-control="setup-wizard-play-mode"
                onClick={() => onChangePlayMode('standard')}
                className={`mobile-critical-control focus-ring rounded-lg border px-4 py-3 text-left transition-colors ${
                  playMode === 'standard'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-dynasty-border bg-dynasty-base hover:bg-dynasty-elevated'
                }`}
              >
                <div className="font-heading text-sm text-dynasty-textBright">Standard Dynasty</div>
                <div className="mt-1 font-heading text-xs text-dynasty-muted">
                  Traditional save. If ownership fires you, the dynasty becomes read-only.
                </div>
              </button>
              <button
                type="button"
                data-mobile-critical-control="setup-wizard-play-mode"
                onClick={() => onChangePlayMode('career')}
                className={`mobile-critical-control focus-ring rounded-lg border px-4 py-3 text-left transition-colors ${
                  playMode === 'career'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-dynasty-border bg-dynasty-base hover:bg-dynasty-elevated'
                }`}
              >
                <div className="font-heading text-sm text-dynasty-textBright">GM Career</div>
                <div className="mt-1 font-heading text-xs text-dynasty-muted">
                  Firing opens the job market so the save continues with a new club.
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dynasty-border bg-dynasty-base p-4 font-heading text-xs text-dynasty-muted">
            {selectedScenario?.requiresCareerMode
              ? 'This scenario uses career-mode rules. Firing keeps the save alive through the job market.'
              : 'Scenario saves still follow standard firing rules unless the challenge explicitly says otherwise.'}
          </div>
        )}

        {wizardMode === 'dynasty' ? (
          <div>
            <span className="font-heading text-sm text-dynasty-textBright">Day One Experience</span>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                data-mobile-critical-control="setup-wizard-day-one"
                onClick={() => onChangeDayOneExperience('full')}
                className={`mobile-critical-control focus-ring rounded-lg border px-4 py-3 text-left transition-colors ${
                  dayOneExperience === 'full'
                    ? 'border-accent-success bg-accent-success/10'
                    : 'border-dynasty-border bg-dynasty-base hover:bg-dynasty-elevated'
                }`}
              >
                <div className="font-heading text-sm text-dynasty-textBright">Full Day One</div>
                <div className="mt-1 font-heading text-xs text-dynasty-muted">
                  Owner intro, AGM selection, org diagnosis, real Season 1 decisions, then a roster crisis.
                </div>
              </button>
              <button
                type="button"
                data-mobile-critical-control="setup-wizard-day-one"
                onClick={() => onChangeDayOneExperience('quick')}
                className={`mobile-critical-control focus-ring rounded-lg border px-4 py-3 text-left transition-colors ${
                  dayOneExperience === 'quick'
                    ? 'border-accent-success bg-accent-success/10'
                    : 'border-dynasty-border bg-dynasty-base hover:bg-dynasty-elevated'
                }`}
              >
                <div className="font-heading text-sm text-dynasty-textBright">Quick Start</div>
                <div className="mt-1 font-heading text-xs text-dynasty-muted">
                  Choose the team and AGM, then let the game auto-resolve the Day One setup with a recap.
                </div>
              </button>
            </div>
          </div>
        ) : null}

        <label className="block">
          <span className="font-heading text-sm text-dynasty-textBright">GM Name</span>
          <input
            id="setup-gm-name"
            value={gmName}
            data-mobile-critical-control="setup-wizard-gm-name"
            onInput={(event) => onChangeGmName((event.target as HTMLInputElement).value)}
            className="mobile-critical-control focus-ring mt-2 w-full rounded-md border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            data-mobile-critical-control="setup-wizard-back"
            onClick={onBack}
            className="mobile-critical-control focus-ring rounded border border-dynasty-border px-4 py-2 font-heading text-sm text-dynasty-text hover:bg-dynasty-elevated"
          >
            Back to Save Hub
          </button>
          <button
            type="button"
            disabled={busySlot != null || !workerIsReady}
            data-mobile-critical-control="setup-wizard-submit"
            onClick={onBeginDynasty}
            className="mobile-critical-control focus-ring rounded bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover disabled:cursor-not-allowed disabled:bg-dynasty-muted disabled:text-dynasty-border"
          >
            {busySlot != null
              ? 'Creating...'
              : !workerIsReady
                ? 'Loading Engine...'
                : wizardMode === 'scenario' ? 'Launch Scenario' : 'Begin Season 1'}
          </button>
        </div>
        {workerStatus === 'error' && (
          <p className="mt-2 text-right font-data text-xs text-accent-danger">
            Sim engine failed to load. Try refreshing the page.
          </p>
        )}
      </div>
    </div>
  );
}
