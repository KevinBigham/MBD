import type { FrontOfficeState } from '@mbd/contracts';

export interface FrontOfficeEvaluationContext {
  draftDelta: number;
  tradeDelta: number;
  freeAgencyDelta: number;
  playoffDelta: number;
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
