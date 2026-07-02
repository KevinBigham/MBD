import { Badge } from '@mbd/ui';
import { AlertTriangle, CheckCircle2, Lightbulb, Target, Trophy } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { ProgressFill } from '@/shared/components/ProgressFill';
import { humanizeLabel } from '@/shared/lib/labels';

export interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  maxSeasons: number;
  requiresCareerMode: boolean;
  startingTeamId: string | null;
}

export interface ScenarioProgress {
  scenarioId: string;
  status: string;
  currentSeason: number;
  objectivesCompleted: number;
  objectivesTotal: number;
  summary: string;
}

export interface ObjectiveItem {
  id: string;
  label: string;
  description: string;
  targetValue: number;
  currentValue: number;
  completed: boolean;
  category: 'wins' | 'playoffs' | 'development' | 'finance' | 'roster' | 'narrative';
}

export interface ObjectivesView {
  scenarioId: string;
  objectives: ObjectiveItem[];
  completionPercentage: number;
  strategyTips: string[];
  difficultyExplanation: string;
}

interface ScenarioCatalogContentPanelProps {
  activeScenarioId: string | null;
  catalog: Scenario[];
  objectivesView: ObjectivesView | null;
  progress: ScenarioProgress | null;
}

function difficultyTone(difficulty: string): string {
  switch (difficulty) {
    case 'rookie': return 'text-accent-success bg-accent-success/10 border-accent-success/30';
    case 'standard': return 'text-accent-warning bg-accent-warning/10 border-accent-warning/30';
    case 'hard': return 'text-accent-primary bg-accent-primary/10 border-accent-primary/30';
    case 'legendary': return 'text-accent-danger bg-accent-danger/10 border-accent-danger/30';
    default: return 'text-dynasty-muted bg-dynasty-elevated border-dynasty-border';
  }
}

function teamDisplayName(teamId: string | null): string {
  if (!teamId) return 'Any Team';
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId;
}

function scenarioStrategicHook(scenario: Scenario): string {
  if (/rebuild|farm|prospect/i.test(`${scenario.name} ${scenario.description}`)) {
    return 'Protect the pipeline and let the window arrive on your terms.';
  }
  if (/budget|payroll|small/i.test(`${scenario.name} ${scenario.description}`)) {
    return 'Create surplus value before the budget ceiling starts making the decisions for you.';
  }
  if (/title|championship|contend|window/i.test(`${scenario.name} ${scenario.description}`)) {
    return 'Spend the present window wisely before attrition closes it.';
  }
  return 'Turn the opening constraint into a front-office identity.';
}

function scenarioObjectivePreview(scenario: Scenario): string[] {
  return [
    scenario.description,
    `Complete the challenge within ${scenario.maxSeasons} season${scenario.maxSeasons === 1 ? '' : 's'}.`,
    scenario.requiresCareerMode
      ? 'Career mode required; job-market survival is part of the challenge.'
      : 'Career mode optional; standard dynasty rules can apply.',
  ];
}

function ScenarioCard({ scenario, isActive }: { scenario: Scenario; isActive: boolean }) {
  return (
    <div
      className={[
        'rounded-lg border p-4',
        isActive
          ? 'border-accent-primary/40 bg-dynasty-elevated ring-1 ring-accent-primary/20'
          : 'border-dynasty-border bg-dynasty-surface',
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-heading text-sm text-dynasty-textBright">{scenario.name}</h3>
        <Badge className={difficultyTone(scenario.difficulty)}>{humanizeLabel(scenario.difficulty)}</Badge>
      </div>
      <p className="mt-1.5 font-data text-xs text-dynasty-muted">{scenario.description}</p>
      <div className="mt-3 rounded border border-dynasty-border bg-dynasty-base px-3 py-2">
        <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Strategic Hook</div>
        <div className="mt-1 font-heading text-xs text-dynasty-text">{scenarioStrategicHook(scenario)}</div>
      </div>
      <div className="mt-3 space-y-1">
        {scenarioObjectivePreview(scenario).map((objective) => (
          <div key={objective} className="font-heading text-xs text-dynasty-muted">
            {objective}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded border border-dynasty-border bg-dynasty-base px-2 py-0.5 font-data text-[10px] text-dynasty-muted">
          {scenario.maxSeasons} seasons
        </span>
        <span className="rounded border border-dynasty-border bg-dynasty-base px-2 py-0.5 font-data text-[10px] text-dynasty-muted">
          {teamDisplayName(scenario.startingTeamId)}
        </span>
        {scenario.requiresCareerMode && (
          <Badge className="border-accent-info/30 bg-accent-info/10 text-accent-info">Career Mode</Badge>
        )}
        {isActive && (
          <Badge className="border-accent-primary/40 bg-accent-primary/10 text-accent-primary">ACTIVE</Badge>
        )}
      </div>
    </div>
  );
}

export default function ScenarioCatalogContentPanel({
  activeScenarioId,
  catalog,
  objectivesView,
  progress,
}: ScenarioCatalogContentPanelProps) {
  const pct = progress
    ? Math.round((progress.objectivesCompleted / Math.max(1, progress.objectivesTotal)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-brand text-3xl tracking-wide text-dynasty-textBright">Challenge Mode</h1>
        <p className="mt-1 font-data text-sm text-dynasty-muted">
          {catalog.length} scenarios available
        </p>
      </div>

      {progress && (
        <div className="rounded-lg border border-accent-primary/30 bg-dynasty-elevated p-4 ring-1 ring-accent-primary/10">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent-primary" />
            <h2 className="font-heading text-sm text-dynasty-textBright">Active Challenge</h2>
            <Badge className="ml-auto border-accent-primary/40 bg-accent-primary/10 text-accent-primary">
              {humanizeLabel(progress.status)}
            </Badge>
          </div>
          <p className="mt-1 font-data text-xs text-dynasty-muted">{progress.summary}</p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between font-data text-[10px] text-dynasty-muted">
              <span>Season {progress.currentSeason}</span>
              <span>{progress.objectivesCompleted}/{progress.objectivesTotal} objectives ({pct}%)</span>
            </div>
            <ProgressFill value={pct} />
          </div>
        </div>
      )}

      {progress && objectivesView && objectivesView.objectives.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent-primary" />
            <h2 className="font-heading text-sm text-dynasty-textBright">Objectives</h2>
            <span className="ml-auto font-data text-xs text-dynasty-muted">
              {objectivesView.completionPercentage}% complete
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {objectivesView.objectives.map((obj) => {
              const objPct = obj.targetValue > 0
                ? Math.round((obj.currentValue / obj.targetValue) * 100)
                : 0;
              return (
                <div
                  key={obj.id}
                  className={[
                    'rounded-lg border p-3',
                    obj.completed
                      ? 'border-accent-success/30 bg-accent-success/5'
                      : 'border-dynasty-border bg-dynasty-surface',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading text-xs text-dynasty-textBright">{obj.label}</h3>
                      <p className="mt-0.5 font-data text-[10px] text-dynasty-muted">{obj.description}</p>
                    </div>
                    {obj.completed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-success" />
                    ) : (
                      <span className="shrink-0 font-data text-[10px] text-accent-primary">
                        {obj.currentValue}/{obj.targetValue}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <ProgressFill
                      value={obj.completed ? 100 : objPct}
                      toneClassName={obj.completed ? 'bg-accent-success' : 'bg-accent-primary'}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {progress && objectivesView && objectivesView.strategyTips.length > 0 && (
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-accent-primary" />
            <h2 className="font-heading text-sm text-dynasty-textBright">Strategy Tips</h2>
          </div>
          <ul className="mt-2 space-y-1.5">
            {objectivesView.strategyTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 font-data text-xs text-dynasty-muted">
                <span className="mt-0.5 block h-1 w-1 shrink-0 rounded-full bg-accent-primary" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {progress && objectivesView && objectivesView.difficultyExplanation && (
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-accent-warning" />
            <h2 className="font-heading text-sm text-dynasty-textBright">Difficulty</h2>
          </div>
          <p className="mt-1.5 font-data text-xs text-dynasty-muted">
            {objectivesView.difficultyExplanation}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalog.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            isActive={scenario.id === activeScenarioId}
          />
        ))}
      </div>
    </div>
  );
}
