export interface CoachView {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  specialty: string;
  teachingAbility: number;
  developmentBonus: number;
  personalityFit: number;
  annualSalary: number;
}

export interface StaffBudgetView {
  payroll: number;
  budget: number;
  remaining: number;
}

export interface PlayerAffinityView {
  playerId: string;
  playerName: string;
  position: string;
  bestCoach: {
    coachId: string;
    coachName: string;
    affinityScore: number;
    factors: string[];
    developmentBonus: number;
  } | null;
}

export function ratingFromFraction(value: number): number {
  return Math.round(20 + (value * 60));
}

export function moneyLabel(value: number): string {
  return `$${value.toFixed(2)}M`;
}
