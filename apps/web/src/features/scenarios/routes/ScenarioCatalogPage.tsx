import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@mbd/ui';
import { Target, Trophy } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    const [catalogData, progressData] = await Promise.all([
      worker.getScenarioCatalog(),
      worker.getScenarioProgress(),
    ]);
    setCatalog((catalogData ?? []) as Scenario[]);
    setProgress((progressData ?? null) as ScenarioProgress | null);
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
