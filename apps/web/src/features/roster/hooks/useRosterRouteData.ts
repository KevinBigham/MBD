import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { DayOneOpeningPlan, TeamChemistry } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { ExtensionCandidateView } from '../components/ExtensionCommandCenter';
import type { AffiliateOverviewView, PromotionCandidateView } from '../components/RosterMinorLeaguesPanel';
import type { RosterComplianceView } from '../components/RosterCompliancePanel';

export type RosterPlanView = DayOneOpeningPlan;

interface RosterDataView {
  mlb?: PlayerDTO[];
  minors?: Record<string, PlayerDTO[]>;
}

interface UseRosterRouteDataOptions {
  day: number;
  getAffiliateOverview: (teamId: string) => Promise<unknown>;
  getExtensionCandidates: (teamId: string) => Promise<unknown>;
  getFullRoster: (teamId: string) => Promise<unknown>;
  getPromotionCandidates: (teamId: string) => Promise<unknown>;
  getRosterComplianceIssues: (teamId: string) => Promise<unknown>;
  getRosterPlan?: () => Promise<unknown>;
  getTeamChemistry: (teamId: string) => Promise<unknown>;
  isInitialized: boolean;
  phase: string;
  season: number;
  userTeamId: string;
  workerReady: boolean;
}

interface UseRosterRouteDataResult {
  affiliateOverview: AffiliateOverviewView | null;
  chemistry: TeamChemistry | null;
  compliance: RosterComplianceView | null;
  extensionCandidates: ExtensionCandidateView[];
  fetchRoster: () => Promise<void>;
  minors: Record<string, PlayerDTO[]>;
  mlbRoster: PlayerDTO[];
  promotionCandidates: PromotionCandidateView[];
  rosterPlan: RosterPlanView | null;
  setRosterPlan: Dispatch<SetStateAction<RosterPlanView | null>>;
}

export function useRosterRouteData({
  day,
  getAffiliateOverview,
  getExtensionCandidates,
  getFullRoster,
  getPromotionCandidates,
  getRosterComplianceIssues,
  getRosterPlan,
  getTeamChemistry,
  isInitialized,
  phase,
  season,
  userTeamId,
  workerReady,
}: UseRosterRouteDataOptions): UseRosterRouteDataResult {
  const [mlbRoster, setMlbRoster] = useState<PlayerDTO[]>([]);
  const [minors, setMinors] = useState<Record<string, PlayerDTO[]>>({});
  const [chemistry, setChemistry] = useState<TeamChemistry | null>(null);
  const [rosterPlan, setRosterPlan] = useState<RosterPlanView | null>(null);
  const [promotionCandidates, setPromotionCandidates] = useState<PromotionCandidateView[]>([]);
  const [compliance, setCompliance] = useState<RosterComplianceView | null>(null);
  const [affiliateOverview, setAffiliateOverview] = useState<AffiliateOverviewView | null>(null);
  const [extensionCandidates, setExtensionCandidates] = useState<ExtensionCandidateView[]>([]);

  const fetchRoster = useCallback(async () => {
    if (!isInitialized || !workerReady) return;

    const [
      rosterData,
      chemistryData,
      promotionData,
      complianceData,
      affiliateData,
      extensionData,
      planData,
    ] = await Promise.all([
      getFullRoster(userTeamId),
      getTeamChemistry(userTeamId),
      getPromotionCandidates(userTeamId),
      getRosterComplianceIssues(userTeamId),
      getAffiliateOverview(userTeamId),
      getExtensionCandidates(userTeamId),
      getRosterPlan ? getRosterPlan() : Promise.resolve(null),
    ]);

    if (rosterData) {
      const nextRoster = rosterData as RosterDataView;
      setMlbRoster((nextRoster.mlb ?? []) as PlayerDTO[]);
      setMinors((nextRoster.minors ?? {}) as Record<string, PlayerDTO[]>);
    }

    setChemistry((chemistryData ?? null) as TeamChemistry | null);
    setPromotionCandidates((promotionData ?? []) as PromotionCandidateView[]);
    setCompliance((complianceData ?? null) as RosterComplianceView | null);
    setAffiliateOverview((affiliateData ?? null) as AffiliateOverviewView | null);
    setExtensionCandidates((extensionData ?? []) as ExtensionCandidateView[]);
    setRosterPlan((planData ?? null) as RosterPlanView | null);
  }, [
    getAffiliateOverview,
    getExtensionCandidates,
    getFullRoster,
    getPromotionCandidates,
    getRosterComplianceIssues,
    getRosterPlan,
    getTeamChemistry,
    isInitialized,
    userTeamId,
    workerReady,
  ]);

  useEffect(() => {
    void fetchRoster();
  }, [fetchRoster, day, season, phase]);

  return {
    affiliateOverview,
    chemistry,
    compliance,
    extensionCandidates,
    fetchRoster,
    minors,
    mlbRoster,
    promotionCandidates,
    rosterPlan,
    setRosterPlan,
  };
}
