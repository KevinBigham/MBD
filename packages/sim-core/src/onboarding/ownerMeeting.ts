import { getTeamById } from '../league/teams.js';
import type { GameRNG } from '../math/prng.js';
import { calculateLuxuryTax, getTeamBudget } from '../finance/contracts.js';
import { pickTemplate } from './shared.js';

export interface OwnerMeetingContext {
  teamId: string;
  teamName: string;
  gmName: string;
  ownerPatience: number;
  ownerConfidence: number;
  marketSize: 'small' | 'medium' | 'large';
  payroll: number;
  budget: number;
  luxuryTaxThreshold: number;
  lastSeasonWins: number | null;
  lastSeasonPlayoffResult: string | null;
  divisionRivals: string[];
  difficulty: string;
}

export interface OwnerPersonality {
  archetype: 'patient_builder' | 'win_now_mogul' | 'budget_hawk' | 'hands_off';
  expectationLevel: 'low' | 'moderate' | 'high' | 'championship';
  personalityDescription: string;
}

export interface BudgetOverview {
  totalBudget: number;
  currentPayroll: number;
  availableSpace: number;
  luxuryTaxDistance: number;
  spendingGrade: 'A' | 'B' | 'C' | 'D';
  narrativeSummary: string;
}

export interface OwnerMeetingBriefing {
  ownerGreeting: string;
  ownerPersonality: OwnerPersonality;
  expectations: string;
  budgetOverview: BudgetOverview;
  marketContext: string;
  divisionOutlook: string;
  seasonGoalOptions: Array<{ id: string; label: string; description: string }>;
}

const OWNER_GREETING_TEMPLATES = [
  'Welcome to {teamName}, {gmName}. This franchise expects a clear operating plan from day one.',
  '{gmName}, you are in the chair now. The {teamName} need a decisive first read on where this club stands.',
  '{gmName}, this is your first look at the {teamName}. Ownership expects conviction and discipline immediately.',
] as const;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function fillTemplate(template: string, context: Pick<OwnerMeetingContext, 'gmName' | 'teamName'>): string {
  return template
    .replaceAll('{gmName}', context.gmName)
    .replaceAll('{teamName}', context.teamName);
}

function spendingGrade(payroll: number, budget: number): BudgetOverview['spendingGrade'] {
  if (payroll > budget) return 'D';
  const ratio = budget > 0 ? (budget - payroll) / budget : 0;
  if (ratio >= 0.25) return 'A';
  if (ratio >= 0.15) return 'B';
  if (ratio >= 0.05) return 'C';
  return 'D';
}

export function getOwnerPersonalityProfile(
  ownerPatience: number,
  ownerConfidence: number,
  marketSize: OwnerMeetingContext['marketSize'],
): OwnerPersonality {
  if (ownerPatience <= 35 && ownerConfidence >= 75 && marketSize === 'large') {
    return {
      archetype: 'win_now_mogul',
      expectationLevel: 'championship',
      personalityDescription: 'Ownership sees this club as a flagship asset and expects an October-caliber operation immediately.',
    };
  }

  if (ownerPatience <= 40 && ownerConfidence <= 45) {
    return {
      archetype: 'budget_hawk',
      expectationLevel: 'low',
      personalityDescription: 'Ownership is sensitive to payroll risk and will judge the front office on efficiency before flash.',
    };
  }

  if (ownerPatience >= 65 && ownerConfidence <= 55) {
    return {
      archetype: 'patient_builder',
      expectationLevel: 'moderate',
      personalityDescription: 'Ownership will tolerate deliberate roster-building if the long-term plan is coherent and disciplined.',
    };
  }

  return {
    archetype: 'hands_off',
    expectationLevel: ownerConfidence >= 65 ? 'high' : 'moderate',
    personalityDescription: 'Ownership prefers periodic results over daily interference, but the expectation to justify decisions remains.',
  };
}

export function generateBudgetOverview(
  payroll: number,
  budget: number,
  luxuryTaxThreshold: number,
  difficulty: string,
): BudgetOverview {
  const availableSpace = roundMoney(budget - payroll);
  const luxuryTaxDistance = roundMoney(luxuryTaxThreshold - payroll);
  const grade = spendingGrade(payroll, budget);
  const taxOwed = payroll > luxuryTaxThreshold ? calculateLuxuryTax(payroll) : 0;
  const tone = difficulty === 'hard' ? 'tight' : 'manageable';

  return {
    totalBudget: roundMoney(budget),
    currentPayroll: roundMoney(payroll),
    availableSpace,
    luxuryTaxDistance,
    spendingGrade: grade,
    narrativeSummary:
      taxOwed > 0
        ? `The payroll is already through the tax line, and ownership is carrying an estimated ${taxOwed.toFixed(2)} million tax bill.`
        : `The budget picture is ${tone}, with ${availableSpace.toFixed(2)} million available before ownership cap and ${luxuryTaxDistance.toFixed(2)} million before the tax line.`,
  };
}

function buildExpectations(
  personality: OwnerPersonality,
  context: OwnerMeetingContext,
): string {
  if (context.lastSeasonWins != null && context.lastSeasonWins >= 90) {
    return `After a ${context.lastSeasonWins}-win season${context.lastSeasonPlayoffResult ? ` and a ${context.lastSeasonPlayoffResult}` : ''}, ownership expects the club to stay on a playoff pace.`;
  }

  if (personality.expectationLevel === 'championship') {
    return 'Ownership is not interested in a soft launch. The standard is a credible championship push right away.';
  }

  if (personality.expectationLevel === 'low') {
    return 'Ownership will accept short-term pain if the roster is managed with discipline and the books stay under control.';
  }

  return 'Ownership expects a credible plan, visible progress, and disciplined resource management over the full season.';
}

function buildMarketContext(context: OwnerMeetingContext): string {
  const baselineBudget = getTeamBudget(context.teamId);

  switch (context.marketSize) {
    case 'small':
      return `This is a small-market operation. Every dollar has to compound, and the club needs to beat richer rivals with precision rather than brute force. A neutral market budget here would sit around ${baselineBudget.toFixed(0)} million.`;
    case 'medium':
      return `This market can support competitive spending, but not careless spending. Ownership can back a winning plan, provided the front office shows discipline and timing.`;
    case 'large':
    default:
      return `This is a large-market franchise operating under a permanent spotlight. Revenue can support bold action, but the expectation level rises with every dollar committed.`;
  }
}

function buildDivisionOutlook(context: OwnerMeetingContext): string {
  const leadRival = context.divisionRivals
    .map((rivalId) => getTeamById(rivalId))
    .find((team): team is NonNullable<typeof team> => team != null);

  if (!leadRival) {
    return 'The division does not present a clear benchmark yet, so the first task is establishing one internally.';
  }

  return `${leadRival.city} ${leadRival.name} profile as the immediate division benchmark. Closing that gap starts with matching their roster quality while exploiting every inefficiency they leave behind.`;
}

function buildSeasonGoalOptions(): OwnerMeetingBriefing['seasonGoalOptions'] {
  return [
    {
      id: 'championship',
      label: 'Championship',
      description: 'Operate as a title contender and accept the short-term cost of a real push.',
    },
    {
      id: 'playoff',
      label: 'Playoff Berth',
      description: 'Build a club that should reach October while preserving enough flexibility to adjust in-season.',
    },
    {
      id: 'compete',
      label: 'Compete',
      description: 'Stay relevant deep into the season and let the roster force the deadline decision.',
    },
    {
      id: 'rebuild',
      label: 'Rebuild',
      description: 'Trade present certainty for long-term control, talent accumulation, and payroll flexibility.',
    },
  ];
}

export function generateOwnerMeeting(
  rng: GameRNG,
  context: OwnerMeetingContext,
): OwnerMeetingBriefing {
  const ownerPersonality = getOwnerPersonalityProfile(
    context.ownerPatience,
    context.ownerConfidence,
    context.marketSize,
  );
  const budgetOverview = generateBudgetOverview(
    context.payroll,
    context.budget,
    context.luxuryTaxThreshold,
    context.difficulty,
  );

  return {
    ownerGreeting: fillTemplate(pickTemplate(rng, OWNER_GREETING_TEMPLATES), context),
    ownerPersonality,
    expectations: buildExpectations(ownerPersonality, context),
    budgetOverview,
    marketContext: buildMarketContext(context),
    divisionOutlook: buildDivisionOutlook(context),
    seasonGoalOptions: buildSeasonGoalOptions(),
  };
}
