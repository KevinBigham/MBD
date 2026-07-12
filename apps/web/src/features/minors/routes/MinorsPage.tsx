import { Suspense, lazy, useCallback, useState } from 'react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import AffiliateResultsPanel from '../components/AffiliateResultsPanel';
import AffiliateStandingsPanel from '../components/AffiliateStandingsPanel';
import DevelopmentFocusBoard, { type DevelopmentFocusPriority } from '../components/DevelopmentFocusBoard';
import FarmReportPanel from '../components/FarmReportPanel';
import PipelineHealthPanel from '../components/PipelineHealthPanel';
import PipelineView from '../components/PipelineView';
import PipelineTriageColumn from '../components/PipelineTriageColumn';
import WaiverTrafficPanel from '../components/WaiverTrafficPanel';
import { useMinorsRouteData } from '../hooks/useMinorsRouteData';

const ProspectBreakoutTracker = lazy(() => import('../components/ProspectBreakoutTracker'));

function formatDevelopmentProgramLabel(program: string | null | undefined): string {
  return (program ?? 'development').replaceAll('_', ' ');
}

function snapshotSaved(value: unknown): value is { saved: true } {
  return typeof value === 'object'
    && value !== null
    && 'saved' in value
    && (value as { saved?: unknown }).saved === true;
}

export default function MinorsPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const autosaveActiveGame = useActiveSaveAutosave();
  const { day, season, phase, userTeamId, isInitialized } = useGameStore();
  const [developmentPlanBusyPlayerId, setDevelopmentPlanBusyPlayerId] = useState<string | null>(null);
  const [developmentPlanMessage, setDevelopmentPlanMessage] = useState<string | null>(null);
  const {
    fetchOverview,
    overview,
    pipeline,
    pipelineTriage,
    selectedBoxScore,
    selectedBoxScoreId,
    setSelectedBoxScoreId,
  } = useMinorsRouteData({
    day,
    getAffiliateBoxScore: worker.getAffiliateBoxScore,
    getAffiliateOverview: worker.getAffiliateOverview,
    getProspectPipeline: worker.getProspectPipeline,
    isInitialized,
    phase,
    season,
    userTeamId,
    workerReady,
  });
  const handleApplyDevelopmentFocusPlan = useCallback(async (priority: DevelopmentFocusPriority) => {
    setDevelopmentPlanBusyPlayerId(priority.playerId);
    setDevelopmentPlanMessage(null);
    try {
      const result = await worker.applyDevelopmentFocusPlan(priority.playerId, priority.category);
      if (!result.success) {
        setDevelopmentPlanMessage(result.error ?? 'Development plan could not be applied.');
        return;
      }
      // Persist the applied plan before refreshing the overview so a refresh
      // failure cannot drop the durable post-mutation snapshot.
      if (!snapshotSaved(await autosaveActiveGame({ season }))) {
        setDevelopmentPlanMessage(
          'The development plan changed in memory. Save status is the authority for durability.',
        );
        return;
      }
      try {
        await fetchOverview();
      } catch {
        // The overview refresh is display-only; the applied plan is already persisted.
      }
      setDevelopmentPlanMessage(
        `${priority.playerName}: ${formatDevelopmentProgramLabel(result.developmentProgram)} plan applied.`,
      );
    } finally {
      setDevelopmentPlanBusyPlayerId(null);
    }
  }, [autosaveActiveGame, fetchOverview, season, worker]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-dynasty-text">Minor League Hub</h1>
        <p className="font-data text-sm text-dynasty-muted">
          Affiliate standings, recent results, and waiver traffic for the player development pipeline.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <AffiliateStandingsPanel affiliates={overview?.affiliates ?? []} />
        <WaiverTrafficPanel waiverClaims={overview?.waiverClaims ?? []} />
        <PipelineHealthPanel health={pipeline?.health ?? null} />
      </div>

      <DevelopmentFocusBoard
        actionMessage={developmentPlanMessage}
        busyPlayerId={developmentPlanBusyPlayerId}
        focus={pipeline?.developmentFocus}
        onApplyPlan={(priority) => {
          void handleApplyDevelopmentFocusPlan(priority);
        }}
      />

      <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-heading text-xs uppercase text-dynasty-muted">Prospect Pipeline Triage</div>
            <div className="mt-1 font-data text-sm text-dynasty-muted">
              Risers, fallers, ready-now names, next wave, and long-view bets before the full list.
            </div>
          </div>
          <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            {pipeline?.health.organizationalDepth ?? 0} depth profiles separated
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
          <PipelineTriageColumn title="Risers" empty="No clear risers this cycle." prospects={pipelineTriage.risers} />
          <PipelineTriageColumn title="Fallers" empty="No active setback flags." prospects={pipelineTriage.fallers} />
          <PipelineTriageColumn title="Ready Now" empty="No prospect is ready right now." prospects={pipelineTriage.readyNow} />
          <PipelineTriageColumn title="Next Wave" empty="No next-wave group is separated yet." prospects={pipelineTriage.nextWave} />
          <PipelineTriageColumn title="Long View" empty="No long-view upside group yet." prospects={pipelineTriage.longView} />
        </div>
      </section>

      <FarmReportPanel farmReport={overview?.farmReport ?? null} />

      <Suspense fallback={null}>
        <ProspectBreakoutTracker />
      </Suspense>

      <PipelineView pipeline={pipeline} />

      <AffiliateResultsPanel
        recentBoxScores={overview?.recentBoxScores ?? []}
        selectedBoxScore={selectedBoxScore}
        selectedBoxScoreId={selectedBoxScoreId}
        onSelectBoxScore={setSelectedBoxScoreId}
      />
    </div>
  );
}
