import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AffiliateBoxScoreView,
  AffiliateResultView,
} from '../components/AffiliateResultsPanel';
import type { AffiliateStandingView } from '../components/AffiliateStandingsPanel';
import type { FarmReportView } from '../components/FarmReportPanel';
import type { ProspectPipelineView } from '../components/PipelineView';
import type { WaiverClaimView } from '../components/WaiverTrafficPanel';

export interface AffiliateOverviewView {
  affiliates: AffiliateStandingView[];
  recentBoxScores: AffiliateResultView[];
  waiverClaims: WaiverClaimView[];
  farmReport: FarmReportView;
}

export interface MinorsPipelineTriage {
  risers: ProspectPipelineView['prospects'];
  fallers: ProspectPipelineView['prospects'];
  readyNow: ProspectPipelineView['prospects'];
  nextWave: ProspectPipelineView['prospects'];
  longView: ProspectPipelineView['prospects'];
}

interface UseMinorsRouteDataOptions {
  day: number;
  getAffiliateBoxScore: (boxScoreId: string) => Promise<AffiliateBoxScoreView | null | undefined>;
  getAffiliateOverview: (teamId?: string) => Promise<AffiliateOverviewView | null | undefined>;
  getProspectPipeline: (teamId?: string) => Promise<ProspectPipelineView | null | undefined>;
  isInitialized: boolean;
  phase: string;
  season: number;
  userTeamId: string;
  workerReady: boolean;
}

export function useMinorsRouteData({
  day,
  getAffiliateBoxScore,
  getAffiliateOverview,
  getProspectPipeline,
  isInitialized,
  phase,
  season,
  userTeamId,
  workerReady,
}: UseMinorsRouteDataOptions) {
  const [overview, setOverview] = useState<AffiliateOverviewView | null>(null);
  const [pipeline, setPipeline] = useState<ProspectPipelineView | null>(null);
  const [selectedBoxScoreId, setSelectedBoxScoreId] = useState<string | null>(null);
  const [selectedBoxScore, setSelectedBoxScore] = useState<AffiliateBoxScoreView | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const [nextOverview, nextPipeline] = await Promise.all([
      getAffiliateOverview(userTeamId),
      getProspectPipeline(userTeamId),
    ]);
    const typedOverview = nextOverview ?? null;
    setOverview(typedOverview);
    setPipeline(nextPipeline ?? null);

    const defaultBoxScoreId = typedOverview?.recentBoxScores[0]?.id ?? null;
    setSelectedBoxScoreId((current) => current ?? defaultBoxScoreId);
  }, [getAffiliateOverview, getProspectPipeline, isInitialized, userTeamId, workerReady]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview, day, season, phase]);

  useEffect(() => {
    if (!workerReady || !isInitialized || !selectedBoxScoreId) {
      setSelectedBoxScore(null);
      return;
    }

    void getAffiliateBoxScore(selectedBoxScoreId).then((boxScore) => {
      setSelectedBoxScore(boxScore ?? null);
    });
  }, [getAffiliateBoxScore, isInitialized, selectedBoxScoreId, workerReady]);

  const pipelineTriage = useMemo<MinorsPipelineTriage>(() => {
    const prospects = pipeline?.prospects ?? [];
    return {
      risers: prospects.filter((prospect) => prospect.prospectTier !== 'organizational_depth' && prospect.trend === 'surging'),
      fallers: prospects.filter((prospect) => prospect.prospectTier !== 'organizational_depth' && prospect.trend === 'setback'),
      readyNow: prospects.filter((prospect) => prospect.prospectTier !== 'organizational_depth' && prospect.eta === 'Ready now'),
      nextWave: prospects.filter((prospect) =>
        prospect.prospectTier !== 'organizational_depth' && (prospect.eta === 'This season' || prospect.eta === 'Next season'),
      ),
      longView: prospects.filter((prospect) =>
        prospect.prospectTier !== 'organizational_depth' && prospect.eta !== 'Ready now' && prospect.eta !== 'This season' && prospect.eta !== 'Next season',
      ),
    };
  }, [pipeline]);

  return {
    fetchOverview,
    overview,
    pipeline,
    pipelineTriage,
    selectedBoxScore,
    selectedBoxScoreId,
    setSelectedBoxScoreId,
  };
}
