import { calculateCoachingPayroll, type Coach } from '../player/coaching.js';

export interface CoachProfile {
  coachId: string;
  name: string;
  role: string;
  teachingGrade: string;
  impactGrade: string;
  specialty: string | null;
  spotlight: string;
}

export interface StaffStrengths {
  overallGrade: string;
  bestArea: string;
  weakestArea: string;
  teachingAverage: number;
  budgetUtilization: number;
  narrativeSummary: string;
}

export interface StaffEvaluation {
  keyCoaches: CoachProfile[];
  strengths: StaffStrengths;
  staffBudget: number;
  staffPayroll: number;
  budgetRemaining: number;
}

function coachName(coach: Coach): string {
  return `${coach.firstName} ${coach.lastName}`;
}

function teachingGrade(teachingAbility: number): 'A' | 'B' | 'C' | 'D' {
  if (teachingAbility >= 0.8) return 'A';
  if (teachingAbility >= 0.65) return 'B';
  if (teachingAbility >= 0.45) return 'C';
  return 'D';
}

function impactGrade(coach: Coach): 'A' | 'B' | 'C' | 'D' {
  const impactScore = coach.teachingAbility * 0.55 + coach.developmentBonus + coach.personalityFit * 0.15;
  if (impactScore >= 0.72) return 'A';
  if (impactScore >= 0.58) return 'B';
  if (impactScore >= 0.42) return 'C';
  return 'D';
}

function overallGrade(value: number): 'A' | 'B' | 'C' | 'D' {
  if (value >= 0.8) return 'A';
  if (value >= 0.65) return 'B';
  if (value >= 0.45) return 'C';
  return 'D';
}

function areaForCoach(role: Coach['role']): string {
  switch (role) {
    case 'pitching_coach':
    case 'bullpen_coach':
      return 'pitching instruction';
    case 'hitting_coach':
    case 'bench_coach':
      return 'hitting instruction';
    case 'farm_director':
    case 'rookie_coordinator':
    case 'a_coordinator':
    case 'aa_coordinator':
    case 'aaa_coordinator':
      return 'player development';
    case 'manager':
    case 'first_base_coach':
    case 'third_base_coach':
    default:
      return 'leadership and game management';
  }
}

function areaAverages(coaches: Coach[]): Array<{ area: string; average: number }> {
  const areaMap = new Map<string, number[]>();

  for (const coach of coaches) {
    const area = areaForCoach(coach.role);
    areaMap.set(area, [...(areaMap.get(area) ?? []), coach.teachingAbility]);
  }

  return [...areaMap.entries()].map(([area, values]) => ({
    area,
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
  }));
}

export function profileKeyCoaches(coaches: Coach[]): CoachProfile[] {
  const sorted = [...coaches].sort((left, right) => {
    if (right.teachingAbility !== left.teachingAbility) {
      return right.teachingAbility - left.teachingAbility;
    }
    return left.id.localeCompare(right.id);
  });
  const manager = coaches.find((coach) => coach.role === 'manager') ?? null;
  const others = sorted.filter((coach) => coach.role !== 'manager').slice(0, 3);
  const selected = manager == null ? others : [manager, ...others];

  return selected.map((coach) => ({
    coachId: coach.id,
    name: coachName(coach),
    role: coach.role,
    teachingGrade: teachingGrade(coach.teachingAbility),
    impactGrade: impactGrade(coach),
    specialty: coach.specialty ?? null,
    spotlight: `${coachName(coach)} sets the tone for ${areaForCoach(coach.role)} with a ${teachingGrade(coach.teachingAbility)} teaching profile.`,
  }));
}

export function assessStaffStrengths(coaches: Coach[], staffBudget: number): StaffStrengths {
  const teachingAverage = coaches.length === 0
    ? 0
    : coaches.reduce((sum, coach) => sum + coach.teachingAbility, 0) / coaches.length;
  const payroll = calculateCoachingPayroll(coaches);
  const budgetUtilization = staffBudget > 0 ? payroll / staffBudget : 0;
  const areas = areaAverages(coaches).sort((left, right) => {
    if (right.average !== left.average) {
      return right.average - left.average;
    }
    return left.area.localeCompare(right.area);
  });
  const bestArea = areas[0]?.area ?? 'no defined strength';
  const weakestArea = areas[areas.length - 1]?.area ?? 'no defined weakness';

  return {
    overallGrade: overallGrade(teachingAverage),
    bestArea,
    weakestArea,
    teachingAverage: Math.round(teachingAverage * 1000) / 1000,
    budgetUtilization: Math.round(budgetUtilization * 1000) / 1000,
    narrativeSummary:
      coaches.length === 0
        ? 'There is no established coaching staff in place yet.'
        : `The staff is strongest in ${bestArea} and most vulnerable in ${weakestArea}. Budget utilization sits at ${(budgetUtilization * 100).toFixed(1)}%.`,
  };
}

export function evaluateCoachingStaff(coaches: Coach[], staffBudget: number): StaffEvaluation {
  const staffPayroll = calculateCoachingPayroll(coaches);

  return {
    keyCoaches: profileKeyCoaches(coaches),
    strengths: assessStaffStrengths(coaches, staffBudget),
    staffBudget,
    staffPayroll,
    budgetRemaining: Math.round((staffBudget - staffPayroll) * 100) / 100,
  };
}
