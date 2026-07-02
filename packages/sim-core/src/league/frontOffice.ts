import type { FrontOfficeState } from '@mbd/contracts';

export interface FrontOfficeEvaluationContext {
  draftDelta: number;
  tradeDelta: number;
  freeAgencyDelta: number;
  playoffDelta: number;
}

export const TEAM_BUILDING_ARCHETYPES = [
  'rebuilding',
  'budget_constrained',
  'balanced',
  'contending',
  'win_now',
] as const;

export type TeamBuildingArchetype = (typeof TEAM_BUILDING_ARCHETYPES)[number];

export interface TeamBuildingIdentityContext {
  winPercentage: number;
  payrollRatio: number;
  prospectScore: number;
  majorLeagueCoreScore: number;
  frontOfficeReputation?: number;
}

export interface TeamBuildingPromotionContext {
  age: number;
  overallRating: number;
  potentialRating?: number | null;
}

export interface TeamBuildingExtensionPriorityContext {
  age: number;
  overallRating: number;
  controlYears: number;
  annualSalary?: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampComponent(value: number): number {
  return Number(clamp(value, -40, 40).toFixed(2));
}

function clampReputation(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function frontOfficeSummary(reputation: number): string {
  if (reputation >= 75) {
    return 'The league sees this front office as a destination operation with real leverage.';
  }
  if (reputation >= 60) {
    return 'The front office has built real credibility around the league.';
  }
  if (reputation >= 40) {
    return 'The front office is viewed as competent but still proving itself.';
  }
  if (reputation >= 25) {
    return 'Rival clubs have started pressing this front office for extra value.';
  }
  return 'The front office is fighting a credibility deficit in every negotiation.';
}

function reputationFromScores(state: Pick<FrontOfficeState, 'draftScore' | 'tradeScore' | 'freeAgencyScore' | 'playoffScore'>): number {
  return clampReputation(
    50
      + (state.draftScore * 0.5)
      + (state.tradeScore * 0.85)
      + (state.freeAgencyScore * 0.6)
      + (state.playoffScore * 0.7),
  );
}

export function createFrontOfficeState(teamId: string): FrontOfficeState {
  return {
    teamId,
    reputation: 50,
    draftScore: 0,
    tradeScore: 0,
    freeAgencyScore: 0,
    playoffScore: 0,
    summary: frontOfficeSummary(50),
  };
}

export function evaluateFrontOfficeState(
  current: FrontOfficeState,
  context: FrontOfficeEvaluationContext,
): FrontOfficeState {
  const draftScore = clampComponent((current.draftScore * 0.65) + context.draftDelta);
  const tradeScore = clampComponent((current.tradeScore * 0.65) + context.tradeDelta);
  const freeAgencyScore = clampComponent((current.freeAgencyScore * 0.65) + context.freeAgencyDelta);
  const playoffScore = clampComponent((current.playoffScore * 0.65) + context.playoffDelta);
  const reputation = reputationFromScores({
    draftScore,
    tradeScore,
    freeAgencyScore,
    playoffScore,
  });

  return {
    ...current,
    reputation,
    draftScore,
    tradeScore,
    freeAgencyScore,
    playoffScore,
    summary: frontOfficeSummary(reputation),
  };
}

export function frontOfficeTradeModifier(reputation: number): number {
  const normalized = (clamp(reputation, 0, 100) - 50) / 50;
  return Number((normalized * 8).toFixed(2));
}

export function frontOfficeFreeAgencyAppeal(reputation: number): number {
  return Number((50 + (((clamp(reputation, 0, 100) - 50) / 50) * 12)).toFixed(2));
}

export function deriveTeamBuildingArchetype(context: TeamBuildingIdentityContext): TeamBuildingArchetype {
  const winPercentage = clamp(context.winPercentage, 0, 1);
  const payrollRatio = clamp(context.payrollRatio, 0, 2);
  const prospectScore = clamp(context.prospectScore, 0, 100);
  const coreScore = clamp(context.majorLeagueCoreScore, 0, 100);
  const reputation = clamp(context.frontOfficeReputation ?? 50, 0, 100);
  const reputationCoreLift = reputation >= 70 ? 3 : reputation <= 35 ? -3 : 0;
  const currentWindowScore = coreScore + reputationCoreLift;

  if (payrollRatio >= 0.94 && currentWindowScore < 68 && winPercentage < 0.58) {
    return 'budget_constrained';
  }

  if (
    (winPercentage <= 0.43 && prospectScore >= currentWindowScore + 8)
    || (winPercentage < 0.5 && prospectScore >= 70 && currentWindowScore < 64)
  ) {
    return 'rebuilding';
  }

  if (winPercentage >= 0.62 && currentWindowScore >= 78) {
    return 'win_now';
  }

  if ((winPercentage >= 0.54 && currentWindowScore >= 68) || (winPercentage >= 0.5 && currentWindowScore >= 74)) {
    return 'contending';
  }

  return 'balanced';
}

export function teamBuildingFreeAgencyAggression(archetype: TeamBuildingArchetype): number {
  switch (archetype) {
    case 'win_now':
      return 1.12;
    case 'contending':
      return 1.06;
    case 'balanced':
      return 1;
    case 'rebuilding':
      return 0.9;
    case 'budget_constrained':
      return 0.78;
  }
}

function ratingGapScore(context: Pick<TeamBuildingPromotionContext, 'overallRating' | 'potentialRating'>): number {
  const overall = clamp(context.overallRating, 0, 550);
  const potential = clamp(context.potentialRating ?? overall, 0, 550);
  return clamp((potential - overall) / 20, 0, 10);
}

function currentReadinessScore(overallRating: number): number {
  const overall = clamp(overallRating, 0, 550);
  if (overall >= 370) return 8;
  if (overall >= 330) return 6;
  if (overall >= 305) return 3;
  if (overall < 285) return -5;
  return 0;
}

export function teamBuildingPromotionScoreAdjustment(
  archetype: TeamBuildingArchetype,
  context: TeamBuildingPromotionContext,
): number {
  const age = clamp(context.age, 16, 45);
  const upside = ratingGapScore(context);
  const readiness = currentReadinessScore(context.overallRating);
  const youngBonus = age <= 22 ? 7 : age <= 24 ? 5 : age <= 26 ? 2 : 0;
  const agePenalty = age >= 32 ? 7 : age >= 29 ? 4 : 0;

  switch (archetype) {
    case 'rebuilding':
      return Math.round(youngBonus + upside + Math.max(0, readiness) - agePenalty);
    case 'budget_constrained':
      return Math.round((youngBonus * 0.8) + (upside * 0.7) + Math.max(0, readiness * 0.5) - (agePenalty * 0.8));
    case 'contending':
      return Math.round((readiness * 1.25) + (age <= 24 && context.overallRating < 320 ? -4 : 0) - Math.max(0, upside - 5));
    case 'win_now':
      return Math.round((readiness * 1.6) + (context.overallRating >= 390 ? 4 : 0) - (context.overallRating < 320 ? 7 : 0) - (age <= 23 && upside >= 5 ? 3 : 0));
    case 'balanced':
      return Math.round((readiness * 0.4) + (youngBonus * 0.3) + (upside * 0.3) - (agePenalty * 0.4));
  }
}

export function teamBuildingExtensionPriorityAdjustment(
  archetype: TeamBuildingArchetype,
  context: TeamBuildingExtensionPriorityContext,
): number {
  const age = clamp(context.age, 16, 45);
  const overall = clamp(context.overallRating, 0, 550);
  const controlYears = clamp(context.controlYears, 0, 10);
  const annualSalary = Math.max(0, context.annualSalary ?? 0);
  const youngCore = age <= 27 && overall >= 340;
  const currentCore = overall >= 370;
  const premiumCore = overall >= 405;
  const shortControl = controlYears <= 1;
  const expensive = annualSalary >= 20;
  const agingPenalty = age >= 34 ? 55 : age >= 32 ? 30 : age >= 30 ? 12 : 0;

  switch (archetype) {
    case 'rebuilding':
      return Math.round(
        (youngCore ? 78 : 0)
        + (age <= 25 ? 18 : 0)
        + (controlYears >= 2 && controlYears <= 4 ? 28 : 0)
        - agingPenalty
        - (expensive ? 18 : 0),
      );
    case 'budget_constrained':
      return Math.round(
        (youngCore ? 42 : 0)
        + (controlYears >= 2 && annualSalary <= 12 ? 26 : 0)
        - (expensive ? 72 : 0)
        - agingPenalty,
      );
    case 'contending':
      return Math.round(
        (currentCore ? 45 : 0)
        + (premiumCore ? 18 : 0)
        + (shortControl ? 28 : 0)
        + (youngCore ? 16 : 0)
        - (overall < 320 ? 28 : 0),
      );
    case 'win_now':
      return Math.round(
        (currentCore ? 62 : 0)
        + (premiumCore ? 28 : 0)
        + (shortControl ? 38 : 0)
        + (youngCore ? 10 : 0)
        - (overall < 330 ? 34 : 0),
      );
    case 'balanced':
      return Math.round(
        (currentCore ? 24 : 0)
        + (youngCore ? 24 : 0)
        + (shortControl ? 18 : 0)
        - (agingPenalty * 0.35),
      );
  }
}
