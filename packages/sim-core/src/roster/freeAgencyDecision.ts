/**
 * Pure, player-side free-agent offer evaluation.
 *
 * The caller owns factual context construction and all market RNG. This module
 * only normalizes those facts, applies the frozen Goal-16 weights, and returns
 * a deterministic decision artifact suitable for user and CPU offers alike.
 */

import { MAX_CONTRACT_YEARS } from '../finance/contracts.js';

export type FreeAgencyCareerStage = 'rising' | 'prime' | 'veteran';

export type FreeAgencyProjectedOpportunity = 'featured' | 'regular' | 'depth';

export type FreeAgencyContenderStatus =
  | 'champion'
  | 'playoff'
  | 'contender'
  | 'competitive'
  | 'developing'
  | 'unknown';

export type FreeAgencyLoyaltySource =
  | 'homegrown_and_tenure'
  | 'homegrown'
  | 'tenure'
  | 'none';

export type FreeAgencyDecisionFactor =
  | 'term_security'
  | 'projected_opportunity'
  | 'contender_status'
  | 'loyalty'
  | 'clubhouse';

export type FreeAgencyDecisionReason =
  | 'financial_terms'
  | FreeAgencyDecisionFactor
  | 'below_minimum'
  | 'invalid_contract'
  | 'market_exhausted';

export interface FreeAgencyDecisionContext {
  /** Canonical positional need on the 0–100 team-needs scale. */
  teamNeed: number;
  /** Derived only from completed standings and playoff facts. */
  contenderStatus: FreeAgencyContenderStatus;
  /** Longest persisted tenure with the offering team. */
  tenureSeasons: number;
  /** Persisted bond fraction, only when origin matches the offering team. */
  homegrownBond: number;
  /** Symmetric 70% chemistry / 30% front-office reputation score. */
  clubhouseScore: number;
}

export interface FreeAgencyDecisionOffer {
  teamId: string;
  playerId: string;
  years: number;
  annualSalary: number;
}

export interface FreeAgencyDecisionFactorResult {
  input: number;
  weight: number;
  contribution: number;
}

export interface NormalizedFreeAgencyDecisionContext {
  teamNeed: number;
  projectedOpportunity: FreeAgencyProjectedOpportunity;
  contenderStatus: FreeAgencyContenderStatus;
  contenderFactor: number;
  tenureSeasons: number;
  homegrownBond: number;
  loyaltyFactor: number;
  loyaltySource: FreeAgencyLoyaltySource;
  clubhouseScore: number;
  clubhouseFactor: number;
}

export interface FreeAgencyOfferDecision {
  kind: 'competitive' | 'market_exhausted';
  accepted: boolean;
  teamId: string;
  playerId: string;
  playerAge: number;
  careerStage: FreeAgencyCareerStage;
  actualAav: number;
  marketValue: number;
  equivalentAav: number;
  minimumEquivalentAav: number;
  context: NormalizedFreeAgencyDecisionContext;
  factors: Record<FreeAgencyDecisionFactor, FreeAgencyDecisionFactorResult>;
  reasonCodes: FreeAgencyDecisionReason[];
  primaryPreference: FreeAgencyDecisionFactor | null;
  summary: string;
}

export interface FreeAgencyOfferEvaluation {
  offer: FreeAgencyDecisionOffer;
  decision: FreeAgencyOfferDecision;
}

const ACCEPTANCE_FLOOR = 0.9;

const FACTOR_ORDER: readonly FreeAgencyDecisionFactor[] = [
  'term_security',
  'projected_opportunity',
  'contender_status',
  'loyalty',
  'clubhouse',
];

const CAREER_STAGE_WEIGHTS: Record<
  FreeAgencyCareerStage,
  Record<FreeAgencyDecisionFactor, number>
> = {
  rising: {
    term_security: 0.035,
    projected_opportunity: 0.035,
    contender_status: 0.015,
    loyalty: 0.02,
    clubhouse: 0.015,
  },
  prime: {
    term_security: 0.025,
    projected_opportunity: 0.025,
    contender_status: 0.03,
    loyalty: 0.025,
    clubhouse: 0.015,
  },
  veteran: {
    term_security: 0.015,
    projected_opportunity: 0.015,
    contender_status: 0.055,
    loyalty: 0.02,
    clubhouse: 0.015,
  },
};

const OPPORTUNITY_FACTORS: Record<FreeAgencyProjectedOpportunity, number> = {
  featured: 1,
  regular: 0.65,
  depth: 0.25,
};

const CONTENDER_FACTORS: Record<FreeAgencyContenderStatus, number> = {
  champion: 1,
  playoff: 0.85,
  contender: 0.7,
  competitive: 0.5,
  developing: 0.25,
  unknown: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

function money(value: number): string {
  return `$${value.toFixed(2)}M`;
}

export function getFreeAgencyCareerStage(age: number): FreeAgencyCareerStage {
  if (age <= 28) return 'rising';
  if (age <= 31) return 'prime';
  return 'veteran';
}

export function getFreeAgencyCareerStageWeights(
  age: number,
): Readonly<Record<FreeAgencyDecisionFactor, number>> {
  return CAREER_STAGE_WEIGHTS[getFreeAgencyCareerStage(age)];
}

export function deriveFreeAgencyProjectedOpportunity(
  teamNeed: number,
): FreeAgencyProjectedOpportunity {
  const normalizedNeed = clamp(Number.isFinite(teamNeed) ? teamNeed : 0, 0, 100);
  if (normalizedNeed >= 75) return 'featured';
  if (normalizedNeed >= 50) return 'regular';
  return 'depth';
}

export function normalizeFreeAgencyDecisionContext(
  context: FreeAgencyDecisionContext,
): NormalizedFreeAgencyDecisionContext {
  const teamNeed = clamp(Number.isFinite(context.teamNeed) ? context.teamNeed : 0, 0, 100);
  const projectedOpportunity = deriveFreeAgencyProjectedOpportunity(teamNeed);
  const tenureSeasons = Math.max(
    0,
    Math.floor(Number.isFinite(context.tenureSeasons) ? context.tenureSeasons : 0),
  );
  const homegrownBond = clamp(
    Number.isFinite(context.homegrownBond) ? context.homegrownBond : 0,
    0,
    1,
  );
  const loyaltyFactor = round4(Math.min(
    1,
    (Math.min(5, tenureSeasons) * 0.12) + (homegrownBond * 0.4),
  ));
  const clubhouseScore = Math.round(clamp(
    Number.isFinite(context.clubhouseScore) ? context.clubhouseScore : 0,
    0,
    100,
  ));
  const hasTenure = tenureSeasons > 0;
  const hasHomegrownBond = homegrownBond > 0;
  const loyaltySource: FreeAgencyLoyaltySource = hasTenure && hasHomegrownBond
    ? 'homegrown_and_tenure'
    : hasHomegrownBond
      ? 'homegrown'
      : hasTenure
        ? 'tenure'
        : 'none';

  return {
    teamNeed,
    projectedOpportunity,
    contenderStatus: context.contenderStatus,
    contenderFactor: CONTENDER_FACTORS[context.contenderStatus],
    tenureSeasons,
    homegrownBond: round4(homegrownBond),
    loyaltyFactor,
    loyaltySource,
    clubhouseScore,
    clubhouseFactor: round4(clubhouseScore / 100),
  };
}

function contribution(
  marketValue: number,
  weight: number,
  input: number,
): FreeAgencyDecisionFactorResult {
  return {
    input: round4(input),
    weight,
    contribution: round4(marketValue * weight * input),
  };
}

function rawContribution(marketValue: number, weight: number, input: number): number {
  return marketValue * weight * input;
}

function primaryPreference(
  marketValue: number,
  weights: Record<FreeAgencyDecisionFactor, number>,
  inputs: Record<FreeAgencyDecisionFactor, number>,
): FreeAgencyDecisionFactor | null {
  return [...FACTOR_ORDER]
    .filter((factor) => rawContribution(marketValue, weights[factor], inputs[factor]) > 0)
    .sort((left, right) => (
      rawContribution(marketValue, weights[right], inputs[right])
      - rawContribution(marketValue, weights[left], inputs[left])
      || FACTOR_ORDER.indexOf(left) - FACTOR_ORDER.indexOf(right)
    ))[0] ?? null;
}

function preferencePhrase(
  factor: FreeAgencyDecisionFactor | null,
  context: NormalizedFreeAgencyDecisionContext,
  years: number,
): string {
  switch (factor) {
    case 'term_security':
      return `${years}-year security`;
    case 'projected_opportunity':
      return `a ${context.projectedOpportunity} projected MLB opportunity`;
    case 'contender_status':
      if (context.contenderStatus === 'champion') return 'the club\'s defending-champion standing';
      if (context.contenderStatus === 'playoff') return 'the club\'s recent playoff standing';
      if (context.contenderStatus === 'contender') return 'the club\'s 90-win contender record';
      if (context.contenderStatus === 'competitive') return 'the club\'s winning record';
      return 'the club\'s current competitive position';
    case 'loyalty':
      if (context.loyaltySource === 'homegrown_and_tenure') {
        return 'his homegrown connection and prior tenure';
      }
      if (context.loyaltySource === 'homegrown') return 'his homegrown connection';
      return `${context.tenureSeasons}-season organizational tenure`;
    case 'clubhouse':
      return 'the club\'s chemistry and front-office reputation';
    default:
      return 'the contract terms';
  }
}

function emptyFactors(): Record<FreeAgencyDecisionFactor, FreeAgencyDecisionFactorResult> {
  return Object.fromEntries(FACTOR_ORDER.map((factor) => [
    factor,
    { input: 0, weight: 0, contribution: 0 },
  ])) as Record<FreeAgencyDecisionFactor, FreeAgencyDecisionFactorResult>;
}

export function evaluateFreeAgencyOffer(input: {
  playerAge: number;
  marketValue: number;
  offer: FreeAgencyDecisionOffer;
  context: FreeAgencyDecisionContext;
}): FreeAgencyOfferDecision {
  const careerStage = getFreeAgencyCareerStage(input.playerAge);
  const weights = CAREER_STAGE_WEIGHTS[careerStage];
  const context = normalizeFreeAgencyDecisionContext(input.context);
  const marketValue = round4(Math.max(0, input.marketValue));
  const actualAav = input.offer.annualSalary;
  const minimumEquivalentAav = round4(marketValue * ACCEPTANCE_FLOOR);
  const validContract = Number.isFinite(actualAav)
    && actualAav > 0
    && Number.isInteger(input.offer.years)
    && input.offer.years >= 1
    && input.offer.years <= MAX_CONTRACT_YEARS;
  const termSecurity = clamp((input.offer.years - 1) / 4, 0, 1);
  const factorInputs: Record<FreeAgencyDecisionFactor, number> = {
    term_security: termSecurity,
    projected_opportunity: OPPORTUNITY_FACTORS[context.projectedOpportunity],
    contender_status: context.contenderFactor,
    loyalty: context.loyaltyFactor,
    clubhouse: context.clubhouseFactor,
  };
  const factors: Record<FreeAgencyDecisionFactor, FreeAgencyDecisionFactorResult> = {
    term_security: contribution(marketValue, weights.term_security, factorInputs.term_security),
    projected_opportunity: contribution(
      marketValue,
      weights.projected_opportunity,
      factorInputs.projected_opportunity,
    ),
    contender_status: contribution(
      marketValue,
      weights.contender_status,
      factorInputs.contender_status,
    ),
    loyalty: contribution(marketValue, weights.loyalty, factorInputs.loyalty),
    clubhouse: contribution(marketValue, weights.clubhouse, factorInputs.clubhouse),
  };
  const equivalentAav = validContract
    ? round4(actualAav + FACTOR_ORDER.reduce(
      (sum, factor) => sum + rawContribution(
        marketValue,
        weights[factor],
        factorInputs[factor],
      ),
      0,
    ))
    : actualAav;
  const accepted = validContract
    && marketValue > 0
    && equivalentAav >= minimumEquivalentAav;
  const preference = primaryPreference(marketValue, weights, factorInputs);
  const reasonCodes: FreeAgencyDecisionReason[] = !validContract
    ? ['invalid_contract']
    : accepted
      ? ['financial_terms', ...(preference ? [preference] : [])]
      : ['below_minimum'];
  const summary = !validContract
    ? 'The offer is not a valid contract.'
    : accepted
      ? `At age ${input.playerAge}, the ${money(actualAav)} AAV and ${preferencePhrase(
        preference,
        context,
        input.offer.years,
      )} ${equivalentAav === minimumEquivalentAav ? 'met' : 'exceeded'} the ${money(
        minimumEquivalentAav,
      )} equivalent-AAV minimum.`
      : `The offer grades at ${money(equivalentAav)} equivalent AAV, below the ${money(
        minimumEquivalentAav,
      )} minimum.`;

  return {
    kind: 'competitive',
    accepted,
    teamId: input.offer.teamId,
    playerId: input.offer.playerId,
    playerAge: input.playerAge,
    careerStage,
    actualAav,
    marketValue,
    equivalentAav,
    minimumEquivalentAav,
    context,
    factors,
    reasonCodes,
    primaryPreference: preference,
    summary,
  };
}

export function createMarketExhaustedDecision(input: {
  playerAge: number;
  marketValue: number;
  offer: FreeAgencyDecisionOffer;
  context: FreeAgencyDecisionContext;
}): FreeAgencyOfferDecision {
  const context = normalizeFreeAgencyDecisionContext(input.context);
  const marketValue = round4(Math.max(0, input.marketValue));
  const actualAav = round4(input.offer.annualSalary);
  return {
    kind: 'market_exhausted',
    accepted: true,
    teamId: input.offer.teamId,
    playerId: input.offer.playerId,
    playerAge: input.playerAge,
    careerStage: getFreeAgencyCareerStage(input.playerAge),
    actualAav,
    marketValue,
    equivalentAav: actualAav,
    minimumEquivalentAav: round4(marketValue * ACCEPTANCE_FLOOR),
    context,
    factors: emptyFactors(),
    reasonCodes: ['market_exhausted'],
    primaryPreference: null,
    summary: `With the competitive market exhausted, the player accepted a ${input.offer.years}-year minor-league deal at ${money(actualAav)} AAV.`,
  };
}

export function compareFreeAgencyOfferEvaluations(
  left: FreeAgencyOfferEvaluation,
  right: FreeAgencyOfferEvaluation,
): number {
  return right.decision.equivalentAav - left.decision.equivalentAav
    || right.offer.annualSalary - left.offer.annualSalary
    || right.offer.years - left.offer.years
    || left.offer.teamId.localeCompare(right.offer.teamId);
}
