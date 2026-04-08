import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@mbd/ui';
import { CheckCircle2, Lightbulb, AlertTriangle, Target, Trophy } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { PageShell } from '@/shared/components/PageShell';
import { ProgressFill } from '@/shared/components/ProgressFill';

interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  maxSeasons: number;
  requiresCareerMode: boolean;
  startingTeamId: string | null;
}

interface ScenarioProgress {
  scenarioId: string;
  status: string;
  currentSeason: number;
  objectivesCompleted: number;
  objectivesTotal: number;
  summary: string;
}

interface ObjectiveItem {
  id: string;
  label: string;
  description: string;
  targetValue: number;
  currentValue: number;
  completed: boolean;
  category: 'wins' | 'playoffs' | 'development' | 'finance' | 'roster' | 'narrative';
}

interface ObjectivesView {
  scenarioId: string;
  objectives: ObjectiveItem[];
  completionPercentage: number;
  strategyTips: string[];
  difficultyExplanation: string;
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
        <Badge className={difficultyTone(scenario.difficulty)}>{scenario.difficulty}</Badge>
      </div>
      <p className="mt-1.5 font-data text-xs text-dynasty-muted">{scenario.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded border border-dynasty-border bg-dynasty-base px-2 py-0.5 font-data text-[10px] text-dynasty-muted">
          {scenario.maxSeasons} seasons
        </span>
        <span className="rounded border border-dynasty-border bg-dynasty-base px-2 py-0.5 font-data text-[10px] text-dynasty-muted">
          {teamDisplayName(scenario.startingTeamId)}
        </span>
        {scenario.requiresCareerMode && (
          <Badge className="border-purple-400/30 bg-purple-400/10 text-purple-400">Career Mode</Badge>
        )}
        {isActive && (
          <Badge className="border-accent-primary/40 bg-accent-primary/10 text-accent-primary">ACTIVE</Badge>
        )}
      </div>
    </div>
  );
}

export default function ScenarioCatalogPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, season, day, phase } = useGameStore();
  const [catalog, setCatalog] = useState<Scenario[]>([]);
  const [progress, setProgress] = useState<ScenarioProgress | null>(null);
  const [objectivesView, setObjectivesView] = useState<ObjectivesView | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    const [catalogData, progressData] = await Promise.all([
      worker.getScenarioCatalog(),
      worker.getScenarioProgress(),
    ]);
    setCatalog((catalogData ?? []) as Scenario[]);
    const prog = (progressData ?? null) as ScenarioProgress | null;
    setProgress(prog);

    if (prog?.scenarioId) {
      const objData = await worker.getScenarioObjectivesView(prog.scenarioId);
      setObjectivesView((objData ?? null) as ObjectivesView | null);
    } else {
      setObjectivesView(null);
    }

    setLoading(false);
  }, [isInitialized, worker, workerReady]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, season, day, phase]);

  const activeScenarioId = progress?.scenarioId ?? null;
  const pct = progress
    ? Math.round((progress.objectivesCompleted / Math.max(1, progress.objectivesTotal)) * 100)
    : 0;

  return (
    <PageShell loading={loading}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-brand text-3xl tracking-wide text-dynasty-textBright">Challenge Mode</h1>
          <p className="mt-1 font-data text-sm text-dynasty-muted">
            {catalog.length} scenarios available
          </p>
        </div>

        {/* Active Progress */}
        {progress && (
          <div className="rounded-lg border border-accent-primary/30 bg-dynasty-elevated p-4 ring-1 ring-accent-primary/10">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent-primary" />
              <h2 className="font-heading text-sm text-dynasty-textBright">Active Challenge</h2>
              <Badge className="ml-auto border-accent-primary/40 bg-accent-primary/10 text-accent-primary">
                {progress.status}
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

        {/* Objectives */}
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

        {/* Strategy Tips */}
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

        {/* Difficulty Explanation */}
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

        {/* Catalog Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {catalog.map((s) => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              isActive={s.id === activeScenarioId}
            />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
