import { TeamLogo } from '@/shared/components/TeamLogo';

type SetupSeasonPreviewMode = 'dynasty' | 'scenario';

interface SetupSeasonPreview {
  teamId: string;
  teamName: string;
  archetype: string;
  franchiseHook: string;
  whyNow: string;
  teamIdentityBlurb: string;
  projectedRecord: string;
  payrollTier: string;
  farmSystemRating: string;
  strengths: readonly string[];
  weaknesses: readonly string[];
  topPlayers: ReadonlyArray<{
    playerId: string;
    name: string;
    position: string;
    overall: number;
  }>;
  divisionRivals: ReadonlyArray<{
    teamId: string;
    teamName: string;
  }>;
}

interface SetupSeasonScenario {
  name: string;
  description: string;
  maxSeasons: number;
  requiresCareerMode: boolean;
  startingTeamId?: string;
}

export interface SetupSeasonPreviewPanelProps {
  wizardMode: SetupSeasonPreviewMode;
  activePreview: SetupSeasonPreview | null;
  selectedScenario: SetupSeasonScenario | null;
  teamId: string;
}

function scenarioStrategicHook(scenario: SetupSeasonScenario | null): string {
  if (!scenario) {
    return 'Pick the challenge, then review the opening club and constraints before launch.';
  }
  if (/rebuild|farm|prospect/i.test(`${scenario.name} ${scenario.description}`)) {
    return 'Win the long game: protect the pipeline, time promotions, and avoid buying short-term noise.';
  }
  if (/budget|payroll|small/i.test(`${scenario.name} ${scenario.description}`)) {
    return 'Every marginal dollar matters. Build surplus value before ownership runs out of patience.';
  }
  if (/title|championship|contend|window/i.test(`${scenario.name} ${scenario.description}`)) {
    return 'The window is open now. Convert present talent into a finish before the clock closes.';
  }
  return 'Read the constraint, choose the club posture, and turn the first season into leverage.';
}

function scenarioObjectives(scenario: SetupSeasonScenario | null): string[] {
  if (!scenario) {
    return ['Select a scenario to load objectives.'];
  }

  return [
    scenario.description,
    `Resolve the challenge inside ${scenario.maxSeasons} season${scenario.maxSeasons === 1 ? '' : 's'}.`,
    scenario.requiresCareerMode
      ? 'Career mode is required; firing routes you through the job market.'
      : 'Standard dynasty rules apply unless the scenario changes them.',
  ];
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-base/40 p-4">
      <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">{label}</div>
      <div className="mt-2 font-brand text-3xl text-dynasty-textBright">{value}</div>
    </div>
  );
}

export default function SetupSeasonPreviewPanel({
  wizardMode,
  activePreview,
  selectedScenario,
  teamId,
}: SetupSeasonPreviewPanelProps) {
  return (
    <div className="rounded-2xl border border-dynasty-border bg-dynasty-surface p-6">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-warning">Season Preview</div>
      <div className="mt-3 flex items-center gap-3">
        <TeamLogo teamId={activePreview?.teamId ?? selectedScenario?.startingTeamId ?? teamId} size="xl" />
        <h2 className="font-brand text-3xl text-dynasty-textBright">
          {wizardMode === 'scenario'
            ? (selectedScenario?.name ?? 'Preparing Scenario')
            : (activePreview?.teamName ?? 'Preparing Preview')}
        </h2>
      </div>
      <p className="mt-3 font-heading text-sm leading-6 text-dynasty-muted">
        {wizardMode === 'scenario'
          ? (selectedScenario?.description ?? 'Loading the scenario framing and opening roster context.')
          : (activePreview?.teamIdentityBlurb ?? 'Running the numbers on your opening roster and division outlook.')}
      </p>

      {wizardMode === 'scenario' ? (
        <div className="mt-4 rounded-lg border border-accent-warning/30 bg-accent-warning/5 p-4">
          <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-warning">Challenge Preview</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded border border-dynasty-border bg-dynasty-base/40 px-3 py-2">
              <div className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">Starting Club</div>
              <div className="mt-1 font-heading text-sm text-dynasty-text">
                {activePreview?.teamName ?? selectedScenario?.startingTeamId?.toUpperCase() ?? 'TBD'}
              </div>
            </div>
            <div className="rounded border border-dynasty-border bg-dynasty-base/40 px-3 py-2">
              <div className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">Career Requirement</div>
              <div className="mt-1 font-heading text-sm text-dynasty-text">
                {selectedScenario?.requiresCareerMode ? 'Career mode required' : 'Not required'}
              </div>
            </div>
            <div className="rounded border border-dynasty-border bg-dynasty-base/40 px-3 py-2">
              <div className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">Max Seasons</div>
              <div className="mt-1 font-heading text-sm text-dynasty-text">
                {selectedScenario?.maxSeasons ?? '--'}
              </div>
            </div>
            <div className="rounded border border-dynasty-border bg-dynasty-base/40 px-3 py-2">
              <div className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">Strategic Hook</div>
              <div className="mt-1 font-heading text-sm text-dynasty-text">
                {scenarioStrategicHook(selectedScenario)}
              </div>
            </div>
          </div>
          <div className="mt-3 rounded border border-dynasty-border bg-dynasty-base/40 px-3 py-3">
            <div className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">Objectives</div>
            <div className="mt-2 space-y-2">
              {scenarioObjectives(selectedScenario).map((objective) => (
                <div key={objective} className="font-heading text-sm text-dynasty-text">
                  {objective}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {wizardMode === 'dynasty' && activePreview ? (
        <div className="mt-4 rounded-lg border border-dynasty-border bg-dynasty-base/40 p-4">
          <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-warning">
            {activePreview.archetype}
          </div>
          <div className="mt-2 font-heading text-sm leading-6 text-dynasty-text">
            {activePreview.franchiseHook}
          </div>
          <div className="mt-2 font-heading text-xs leading-5 text-dynasty-muted">
            {activePreview.whyNow}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <PreviewStat label="Projected Record" value={activePreview?.projectedRecord ?? '--'} />
        <PreviewStat label="Payroll Tier" value={activePreview?.payrollTier ?? '--'} />
        <PreviewStat label="Farm System" value={activePreview?.farmSystemRating ?? '--'} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-base/40 p-4">
          <div className="font-heading text-sm font-semibold text-dynasty-textBright">Key Players</div>
          <div className="mt-3 space-y-2">
            {(activePreview?.topPlayers ?? []).map((player) => (
              <div key={player.playerId} className="rounded border border-dynasty-border/60 px-3 py-2">
                <div className="font-heading text-sm text-dynasty-text">{player.name}</div>
                <div className="font-data text-xs text-dynasty-muted">{player.position} · {player.overall} OVR</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-base/40 p-4">
          <div className="font-heading text-sm font-semibold text-dynasty-textBright">Division Rivals</div>
          <div className="mt-3 space-y-2">
            {(activePreview?.divisionRivals ?? []).map((rival) => (
              <div key={rival.teamId} className="rounded border border-dynasty-border/60 px-3 py-2 font-heading text-sm text-dynasty-text">
                {rival.teamName}
              </div>
            ))}
          </div>
        </div>
      </div>

      {wizardMode === 'dynasty' && activePreview ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-dynasty-border bg-dynasty-base/40 p-4">
            <div className="font-heading text-sm font-semibold text-dynasty-textBright">Core Strengths</div>
            <div className="mt-3 space-y-2">
              {(activePreview.strengths ?? []).map((strength) => (
                <div key={strength} className="rounded border border-dynasty-border/60 px-3 py-2 font-heading text-sm text-dynasty-text">
                  {strength}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-dynasty-border bg-dynasty-base/40 p-4">
            <div className="font-heading text-sm font-semibold text-dynasty-textBright">Pressure Points</div>
            <div className="mt-3 space-y-2">
              {(activePreview.weaknesses ?? []).map((weakness) => (
                <div key={weakness} className="rounded border border-dynasty-border/60 px-3 py-2 font-heading text-sm text-dynasty-text">
                  {weakness}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
