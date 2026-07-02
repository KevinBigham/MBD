import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MentorshipView } from '../components/StaffMentorshipPanel';
import type { CoachView, PlayerAffinityView, StaffBudgetView } from '../components/staffPresentation';

export interface CoachingImpactView {
  id: string;
  role: string;
  name: string;
  specialty: string;
  teachingAbility: number;
  developmentBonus: number;
  personalityFit: number;
}

interface SynergyEntry {
  coachAId: string;
  coachBId: string;
  synergyScore: number;
  factors: string[];
}

export interface ChemistryView {
  harmony: {
    overallScore: number;
    synergies: SynergyEntry[];
    weakestLink: SynergyEntry | null;
    strongestBond: SynergyEntry | null;
  };
  issues: Array<{ severity: 'low' | 'medium' | 'high'; description: string; involvedIds: string[] }>;
  playerAffinities: PlayerAffinityView[];
  coaches: Array<{ id: string; name: string; role: string; specialty: string; teaching: number; impact: number; fit: number; salary: number }>;
}

interface UseStaffRouteDataOptions {
  day: number;
  getCoachMarket: () => Promise<unknown>;
  getCoachingChemistry: () => Promise<unknown>;
  getCoachingImpact: (teamId: string) => Promise<unknown>;
  getCoachingStaff: (teamId: string) => Promise<unknown>;
  getMentorships: () => Promise<unknown>;
  getStaffBudget: (teamId: string) => Promise<unknown>;
  isInitialized: boolean;
  phase: string;
  season: number;
  userTeamId: string | null;
  workerReady: boolean;
}

interface UseStaffRouteDataResult {
  budget: StaffBudgetView | null;
  chemistry: ChemistryView | null;
  fetchStaffData: () => Promise<void>;
  impact: CoachingImpactView[];
  market: CoachView[];
  mentorship: MentorshipView | null;
  staff: CoachView[];
  topAffinities: PlayerAffinityView[];
}

export function useStaffRouteData({
  day,
  getCoachMarket,
  getCoachingChemistry,
  getCoachingImpact,
  getCoachingStaff,
  getMentorships,
  getStaffBudget,
  isInitialized,
  phase,
  season,
  userTeamId,
  workerReady,
}: UseStaffRouteDataOptions): UseStaffRouteDataResult {
  const [staff, setStaff] = useState<CoachView[]>([]);
  const [market, setMarket] = useState<CoachView[]>([]);
  const [impact, setImpact] = useState<CoachingImpactView[]>([]);
  const [budget, setBudget] = useState<StaffBudgetView | null>(null);
  const [chemistry, setChemistry] = useState<ChemistryView | null>(null);
  const [mentorship, setMentorship] = useState<MentorshipView | null>(null);

  const fetchStaffData = useCallback(async () => {
    if (!isInitialized || !workerReady || !userTeamId) return;

    const [staffData, marketData, impactData, budgetData, chemistryData, mentorshipData] = await Promise.all([
      getCoachingStaff(userTeamId),
      getCoachMarket(),
      getCoachingImpact(userTeamId),
      getStaffBudget(userTeamId),
      getCoachingChemistry(),
      getMentorships(),
    ]);

    setStaff((staffData ?? []) as CoachView[]);
    setMarket((marketData ?? []) as CoachView[]);
    setImpact((impactData ?? []) as CoachingImpactView[]);
    setBudget((budgetData ?? null) as StaffBudgetView | null);
    setChemistry((chemistryData ?? null) as ChemistryView | null);
    setMentorship((mentorshipData ?? null) as MentorshipView | null);
  }, [
    getCoachMarket,
    getCoachingChemistry,
    getCoachingImpact,
    getCoachingStaff,
    getMentorships,
    getStaffBudget,
    isInitialized,
    userTeamId,
    workerReady,
  ]);

  useEffect(() => {
    void fetchStaffData();
  }, [fetchStaffData, season, day, phase]);

  const topAffinities = useMemo(() => [...(chemistry?.playerAffinities ?? [])]
    .filter((entry) => entry.bestCoach != null)
    .sort((left, right) => (right.bestCoach?.affinityScore ?? 0) - (left.bestCoach?.affinityScore ?? 0))
    .slice(0, 3), [chemistry]);

  return {
    budget,
    chemistry,
    fetchStaffData,
    impact,
    market,
    mentorship,
    staff,
    topAffinities,
  };
}
