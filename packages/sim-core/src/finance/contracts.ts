/**
 * @module contracts
 * Contract, arbitration, payroll, and team finance system.
 * Uses GameRNG for all randomness; the JS global random API is never used.
 */

import { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { PITCHER_POSITIONS } from '../player/generation.js';
import { hitterOverall, pitcherOverall } from '../player/attributes.js';
import {
  teamBuildingExtensionPriorityAdjustment,
  type TeamBuildingArchetype,
  type TeamBuildingExtensionPriorityContext,
} from '../league/frontOffice.js';
import type { GMPersonality } from '../trade/tradeAI.js';

// ---------------------------------------------------------------------------
// Financial Constants
// ---------------------------------------------------------------------------

/** League minimum salary in millions */
export const LEAGUE_MINIMUM_SALARY = 0.7;

/** Luxury tax threshold in millions */
export const LUXURY_TAX_THRESHOLD = 230;

/** Luxury tax penalty tiers (overage range to rate) */
export const LUXURY_TAX_TIERS = [
  { overageMax: 20, rate: 0.20 },
  { overageMax: 40, rate: 0.32 },
  { overageMax: Infinity, rate: 0.50 },
] as const;

/** Pre-arbitration service time ceiling (years) */
export const PRE_ARB_MAX_YEARS = 2;

/** First year of arbitration eligibility */
export const ARB_FIRST_YEAR = 3;

/** Last year of arbitration eligibility */
export const ARB_LAST_YEAR = 5;

/** Credited MLB service days in one completed service year. */
export const SERVICE_TIME_DAYS_PER_YEAR = 172;

/** Max salary the arbitration base formula can produce (millions) */
export const ARB_MAX_BASE_SALARY = 20;

/** Divisor in arbitration base formula: (overall / ARB_DIVISOR) * ARB_MAX_BASE_SALARY */
export const ARB_DIVISOR = 550;

/** Arbitration year multipliers (service year -> multiplier) */
export const ARB_YEAR_MULTIPLIERS: Record<number, number> = {
  2: 0.4,
  3: 0.4,
  4: 0.6,
  5: 0.8,
  6: 1.0,
};

/** Performance variance cap for arbitration (+/- this fraction) */
export const ARB_PERFORMANCE_VARIANCE = 0.20;

/** Probability that the team wins an arbitration hearing (0-1) */
export const ARB_TEAM_WIN_PROBABILITY = 0.60;

/** Portion of the two-year cohort that qualifies for Super Two arbitration. */
export const SUPER_TWO_COHORT_SHARE = 0.22;

/** Salary inflation applied after each player arbitration win. */
export const ARB_ESCALATOR_PER_WIN = 0.08;

/** Cap on total year-over-year arbitration inflation. */
export const ARB_ESCALATOR_CAP = 0.32;

/** Max contract years for free agent offers */
export const MAX_CONTRACT_YEARS = 10;

/** No-trade-clause overall rating threshold (internal 0-550 scale) */
export const NTC_RATING_THRESHOLD = 400;

/** Player option overall rating threshold (internal 0-550 scale) */
export const PLAYER_OPTION_RATING_THRESHOLD = 380;

/** Future commitment projection window (years) */
export const FUTURE_COMMITMENT_YEARS = 5;

// ---------------------------------------------------------------------------
// Market Size Configuration
// ---------------------------------------------------------------------------

export type MarketSize = 'large' | 'medium' | 'small';

export interface MarketConfig {
  size: MarketSize;
  budgetMin: number;
  budgetMax: number;
}

const LARGE_MARKET: MarketConfig = { size: 'large', budgetMin: 280, budgetMax: 350 };
const MEDIUM_MARKET: MarketConfig = { size: 'medium', budgetMin: 200, budgetMax: 280 };
const SMALL_MARKET: MarketConfig = { size: 'small', budgetMin: 150, budgetMax: 200 };

const TEAM_MARKET_ALIASES: Record<string, string> = {
  kcf: 'kc',
  nyt: 'nym',
};

/** Team-to-market-config mapping */
export const TEAM_MARKETS: Record<string, MarketConfig> = {
  // Large markets
  nym: LARGE_MARKET,   // New York Tycoons
  chi: LARGE_MARKET,   // Chicago Deep Dish
  lax: LARGE_MARKET,   // Los Angeles Sunset Strip
  hou: LARGE_MARKET,   // Houston Starliners
  dal: LARGE_MARKET,   // Dallas Lone Stars
  phi: LARGE_MARKET,   // Philadelphia Liberty Bells
  bos: LARGE_MARKET,   // Boston Noreasters
  sfb: LARGE_MARKET,   // San Francisco Sourdoughs
  // Medium markets
  wsh: MEDIUM_MARKET,  // Washington Monuments
  mia: MEDIUM_MARKET,  // Miami Palms
  atl: MEDIUM_MARKET,  // Atlanta Peach Kings
  det: MEDIUM_MARKET,  // Detroit Motor Kings
  cle: MEDIUM_MARKET,  // Cleveland Forge
  msp: MEDIUM_MARKET,  // Minneapolis Frost Giants
  stl: MEDIUM_MARKET,  // St. Louis Archers
  sea: MEDIUM_MARKET,  // Seattle Drizzle
  den: MEDIUM_MARKET,  // Denver Altitude
  phx: MEDIUM_MARKET,  // Phoenix Copperbirds
  sdg: MEDIUM_MARKET,  // San Diego Surf Hounds
  kc:  MEDIUM_MARKET,  // Kansas City BBQ Fountains
  nas: MEDIUM_MARKET,  // Nashville Honky Tonks
  sat: MEDIUM_MARKET,  // San Antonio Riverwalk
  // Small markets
  bal: SMALL_MARKET,   // Baltimore Crab Cakes
  pit: SMALL_MARKET,   // Pittsburgh Smokestack
  col: SMALL_MARKET,   // Columbus Wayfinders
  mil: SMALL_MARKET,   // Milwaukee Suds
  ind: SMALL_MARKET,   // Indianapolis Speedsters
  cha: SMALL_MARKET,   // Charlotte Weavers
  orl: SMALL_MARKET,   // Orlando Sunbursts
  ral: SMALL_MARKET,   // Raleigh Pines
  aus: SMALL_MARKET,   // Austin Bat Colony
  por: SMALL_MARKET,   // Portland Sasquatch
};

function normalizeTeamMarketKey(teamId: string): string {
  const normalized = teamId.trim().toLowerCase();
  return TEAM_MARKET_ALIASES[normalized] ?? normalized;
}

/** Resolve an explicit team market without the legacy unknown-team fallback. */
export function getTeamMarketConfig(teamId: string): MarketConfig | null {
  return TEAM_MARKETS[normalizeTeamMarketKey(teamId)] ?? null;
}

// ---------------------------------------------------------------------------
// Contract Types
// ---------------------------------------------------------------------------

export interface ContractDetail {
  playerId: string;
  teamId: string;
  years: number;
  yearsRemaining: number;
  annualSalary: number;
  totalValue: number;
  noTradeClause: boolean;
  playerOption: boolean;
  teamOption: boolean;
  signingBonus: number;
  yearSalaries: number[];
  status: 'active' | 'expiring' | 'expired' | 'bought_out';
}

/** The factual outcome of advancing one canonical player contract into an offseason. */
export type ContractOffseasonAdvanceOutcome =
  | 'unchanged_zero'
  | 'advanced'
  | 'expired'
  | 'team_option_exercised'
  | 'team_option_declined';

/**
 * Pure canonical contract-clock result. The runtime player is returned rather
 * than mutated so the worker can precompute a complete, exception-safe
 * offseason snapshot before committing it.
 */
export interface ContractOffseasonAdvanceResult {
  player: GeneratedPlayer;
  previousYears: number;
  nextYears: number;
  outcome: ContractOffseasonAdvanceOutcome;
}

export interface ArbitrationCase {
  playerId: string;
  currentSalary: number;
  teamOffer: number;
  playerAsk: number;
  projectedSalary: number;
  yearsOfService: number;
}

export interface HoldoutEvaluation {
  holdoutDays: number;
  moraleHit: number;
}

export interface TeamPayroll {
  teamId: string;
  totalPayroll: number;
  luxuryTaxPayroll: number;
  mlbPayroll: number;
  minorsPayroll: number;
  deadMoney: number;
  futureCommitments: number[];
  capSpace: number;
}

export interface ExtensionTeamContext {
  season: number;
  teamId: string;
  teamWinPct: number;
  teamBudget: number;
  currentPayroll: number;
  futureCommitments: number[];
  controlYearsByPlayer: Map<string, number>;
  serviceYearsByPlayer: Map<string, number>;
  moraleByPlayer: Map<string, number>;
  teamBuildingArchetype?: TeamBuildingArchetype;
  gmPersonality?: GMPersonality;
}

export interface ExtensionContractTerms {
  years: number;
  annualSalary: number;
  totalValue: number;
  noTradeClause: boolean;
  noTradeClauseType: 'none' | 'partial' | 'full';
  playerOption: boolean;
  teamOption: boolean;
  optOutYears: number[];
  signingBonus: number;
  buyoutAmount: number;
  deferredMoney: Array<{
    yearOffset: number;
    amount: number;
  }>;
}

export interface ExtensionWillingness {
  willingness: number;
  demandMultiplier: number;
  walkAwayThreshold: number;
}

export interface NegotiationRound {
  round: number;
  status: 'accepted' | 'rejected' | 'countered';
  gap: number;
  teamOffer: ExtensionContractTerms;
  playerDemand: ExtensionContractTerms;
  walkAwayRoll: number;
}

export interface ExtensionNegotiationSession {
  playerId: string;
  teamId: string;
  season: number;
  baselineContractSignature: string;
  targetContract: ExtensionContractTerms;
  counterOffer: ExtensionContractTerms | null;
  rounds: NegotiationRound[];
}

export interface ExtensionResult {
  status: 'accepted' | 'rejected' | 'countered';
  finalContract?: ExtensionContractTerms;
  counterOffer?: ExtensionContractTerms;
  rounds: NegotiationRound[];
  session: ExtensionNegotiationSession;
}

export interface TeamExtensionProcessResult {
  players: GeneratedPlayer[];
  results: Array<{
    playerId: string;
    result: ExtensionResult;
  }>;
}

export interface ExtensionGmDecisionPolicy {
  candidateLimit: 1 | 2;
  firstCounterAggression: number;
  laterCounterAggression: number;
  openingOfferRatio: number;
  termAdjustment: number;
}

function extensionGmCandidateLimit(personality: GMPersonality): 1 | 2 {
  return personality === 'conservative' ? 1 : 2;
}

function hashExtensionDecisionScope(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash * 31) + value.charCodeAt(index)) | 0;
  }
  return hash;
}

function createExtensionCandidateRng(
  baseSeed: number,
  context: ExtensionTeamContext,
  player: GeneratedPlayer,
  controlYears: number,
  workingPayroll: number,
  lane: 'offer' | 'negotiation',
): GameRNG {
  const scope = [
    'cpu-extension-candidate:v2',
    context.season,
    context.teamId,
    player.id,
    player.age,
    getPlayerOverall(player),
    controlYears,
    context.serviceYearsByPlayer.get(player.id) ?? 0,
    context.moraleByPlayer.get(player.id) ?? 50,
    context.teamWinPct,
    workingPayroll,
    extensionNegotiationContractSignature(player),
    lane,
  ].join('|');
  return new GameRNG((baseSeed ^ hashExtensionDecisionScope(scope)) | 0);
}

// ---------------------------------------------------------------------------
// Helper: get overall rating for any player
// ---------------------------------------------------------------------------

function getPlayerOverall(player: GeneratedPlayer): number {
  const pos = player.position;
  if ((PITCHER_POSITIONS as readonly string[]).includes(pos) && player.pitcherAttributes) {
    return pitcherOverall(player.pitcherAttributes);
  }
  return hitterOverall(player.hitterAttributes);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function controlYearsForPlayer(player: GeneratedPlayer, context: ExtensionTeamContext): number {
  return Math.max(1, context.controlYearsByPlayer.get(player.id) ?? Math.max(1, player.contract.years));
}

function serviceYearsForPlayer(player: GeneratedPlayer, context: ExtensionTeamContext): number {
  return Math.max(
    0,
    context.serviceYearsByPlayer.get(player.id) ?? serviceDaysToYears(player.serviceTimeDays),
  );
}

function moraleForPlayer(player: GeneratedPlayer, context: ExtensionTeamContext): number {
  return clamp(context.moraleByPlayer.get(player.id) ?? 55, 0, 100);
}

function trajectoryDemandAdjustment(player: GeneratedPlayer): number {
  switch (player.developmentTrajectory) {
    case 'ahead_of_curve':
      return 0.16;
    case 'below_expectations':
      return -0.08;
    case 'bust_risk':
      return -0.16;
    case 'on_track':
    default:
      return 0;
  }
}

function normalizeExtensionTerms(offer: ExtensionContractTerms): ExtensionContractTerms {
  return {
    ...offer,
    years: Math.max(1, Math.round(offer.years)),
    annualSalary: roundCurrency(Math.max(LEAGUE_MINIMUM_SALARY, offer.annualSalary)),
    totalValue: roundCurrency(Math.max(0, offer.totalValue)),
    noTradeClauseType: offer.noTradeClause ? offer.noTradeClauseType : 'none',
    optOutYears: [...new Set(offer.optOutYears.filter((year) => year >= 1 && year <= offer.years))].sort((left, right) => left - right),
    signingBonus: roundCurrency(Math.max(0, offer.signingBonus)),
    buyoutAmount: roundCurrency(Math.max(0, offer.buyoutAmount)),
    deferredMoney: offer.deferredMoney.map((installment) => ({
      yearOffset: Math.max(0, Math.round(installment.yearOffset)),
      amount: roundCurrency(Math.max(0, installment.amount)),
    })),
  };
}

function recalculateExtensionTotals(offer: ExtensionContractTerms): ExtensionContractTerms {
  const normalized = normalizeExtensionTerms(offer);
  const deferredTotal = normalized.deferredMoney.reduce((total, installment) => total + installment.amount, 0);
  return {
    ...normalized,
    totalValue: roundCurrency(
      (normalized.annualSalary * normalized.years)
      + normalized.signingBonus
      + normalized.buyoutAmount
      + deferredTotal,
    ),
  };
}

export function extensionNegotiationContractSignature(
  player: Pick<GeneratedPlayer, 'teamId' | 'contract'>,
): string {
  const contract = player.contract;
  return [
    player.teamId,
    contract.years,
    contract.annualSalary,
    contract.totalValue,
    contract.noTradeClause ? 1 : 0,
    contract.noTradeClauseType ?? 'none',
    contract.playerOption ? 1 : 0,
    contract.teamOption ? 1 : 0,
    (contract.optOutYears ?? []).join(','),
    contract.signingBonus ?? 0,
    contract.buyoutAmount ?? 0,
    JSON.stringify(contract.deferredMoney ?? []),
  ].join('|');
}

function buildNegotiationCounter(
  demand: ExtensionContractTerms,
  willingness: ExtensionWillingness,
  round: number,
  minimumAnnualSalary: number,
): ExtensionContractTerms {
  const concessionRate = clamp(0.09 + (willingness.willingness * 0.10) + ((round - 1) * 0.04), 0.09, 0.24);
  return recalculateExtensionTotals({
    ...demand,
    annualSalary: Math.max(minimumAnnualSalary, roundCurrency(demand.annualSalary * (1 - concessionRate))),
    signingBonus: roundCurrency(demand.signingBonus * (1 - concessionRate / 2)),
    buyoutAmount: roundCurrency(demand.buyoutAmount * (1 - concessionRate / 2)),
    deferredMoney: demand.deferredMoney.map((installment) => ({
      ...installment,
      amount: roundCurrency(installment.amount * (1 - concessionRate / 2)),
    })),
  });
}

function blendOffers(
  teamOffer: ExtensionContractTerms,
  counterOffer: ExtensionContractTerms,
  aggression: number,
): ExtensionContractTerms {
  return recalculateExtensionTotals({
    ...counterOffer,
    years: Math.max(teamOffer.years, counterOffer.years),
    annualSalary: roundCurrency(
      teamOffer.annualSalary + ((counterOffer.annualSalary - teamOffer.annualSalary) * aggression),
    ),
    signingBonus: roundCurrency(
      teamOffer.signingBonus + ((counterOffer.signingBonus - teamOffer.signingBonus) * aggression),
    ),
    buyoutAmount: roundCurrency(
      teamOffer.buyoutAmount + ((counterOffer.buyoutAmount - teamOffer.buyoutAmount) * aggression),
    ),
    deferredMoney: counterOffer.deferredMoney.map((installment, index) => ({
      yearOffset: installment.yearOffset,
      amount: roundCurrency(
        (teamOffer.deferredMoney[index]?.amount ?? 0)
        + ((installment.amount - (teamOffer.deferredMoney[index]?.amount ?? 0)) * aggression),
      ),
    })),
  });
}

function isFranchiseExtensionTarget(
  player: GeneratedPlayer,
  teamPlayers: GeneratedPlayer[],
): boolean {
  const ranked = [...teamPlayers]
    .sort((left, right) => getPlayerOverall(right) - getPlayerOverall(left) || left.id.localeCompare(right.id));
  const rank = ranked.findIndex((candidate) => candidate.id === player.id);
  return rank >= 0 && rank < 3;
}

/**
 * Current-GM posture changes only the club's extension preference. It never
 * changes player demand, acceptance thresholds, ratings, value, or budget.
 */
export function gmExtensionPriorityAdjustment(
  personality: GMPersonality,
  context: TeamBuildingExtensionPriorityContext,
): number {
  const youngCore = context.age <= 27 && context.overallRating >= 340;
  const currentCore = context.overallRating >= 370;
  const premiumCore = context.overallRating >= 405;
  const shortControl = context.controlYears <= 1;
  const expensive = (context.annualSalary ?? 0) >= 20;

  switch (personality) {
    case 'aggressive':
      return (currentCore ? 42 : 0) + (premiumCore ? 18 : 0) + (shortControl ? 32 : 0);
    case 'conservative':
      return (youngCore ? 34 : 0)
        + (context.controlYears >= 2 ? 22 : 0)
        - (expensive ? 58 : 0)
        - (context.age >= 31 ? 34 : 0);
    case 'analytical':
      return (youngCore ? 30 : 0)
        + (currentCore && !expensive ? 24 : 0)
        + (context.age >= 33 ? -24 : 0);
    case 'prospect_hugger':
      return (youngCore ? 82 : 0)
        + (context.controlYears >= 2 && context.controlYears <= 4 ? 34 : 0)
        - (context.age >= 30 ? 42 : 0);
    case 'win_now':
      return (currentCore ? 64 : 0)
        + (premiumCore ? 32 : 0)
        + (shortControl ? 44 : 0)
        - (context.overallRating < 330 ? 34 : 0);
  }
}

export function getExtensionGmDecisionPolicy(
  personality: GMPersonality,
  player: Pick<GeneratedPlayer, 'age' | 'overallRating'>,
  controlYears: number,
): ExtensionGmDecisionPolicy {
  switch (personality) {
    case 'aggressive':
      return {
        candidateLimit: extensionGmCandidateLimit(personality),
        firstCounterAggression: 0.66,
        laterCounterAggression: 0.9,
        openingOfferRatio: 0.98,
        termAdjustment: player.age <= 30 ? 1 : 0,
      };
    case 'conservative':
      return {
        candidateLimit: extensionGmCandidateLimit(personality),
        firstCounterAggression: 0.15,
        laterCounterAggression: 0.3,
        openingOfferRatio: 0.65,
        termAdjustment: player.age >= 30 ? -1 : 0,
      };
    case 'prospect_hugger':
      return {
        candidateLimit: extensionGmCandidateLimit(personality),
        firstCounterAggression: player.age <= 27 ? 0.6 : 0.48,
        laterCounterAggression: player.age <= 27 ? 0.84 : 0.76,
        openingOfferRatio: player.age <= 27 ? 0.95 : 0.9,
        termAdjustment: player.age <= 27 && controlYears >= 2 ? 1 : 0,
      };
    case 'win_now':
      return {
        candidateLimit: extensionGmCandidateLimit(personality),
        firstCounterAggression: 0.68,
        laterCounterAggression: 0.92,
        openingOfferRatio: 0.99,
        termAdjustment: controlYears <= 1 && player.age <= 32 ? 1 : 0,
      };
    case 'analytical':
      return {
        candidateLimit: extensionGmCandidateLimit(personality),
        firstCounterAggression: 0.55,
        laterCounterAggression: 0.82,
        openingOfferRatio: 0.94,
        termAdjustment: 0,
      };
  }
}

function shouldPursueExtensionCandidate(
  player: GeneratedPlayer,
  context: ExtensionTeamContext,
  teamPlayers: GeneratedPlayer[],
): boolean {
  const controlYears = controlYearsForPlayer(player, context);
  const overall = getPlayerOverall(player);
  const franchiseTarget = isFranchiseExtensionTarget(player, teamPlayers);
  const teamBuildingAdjustment = teamBuildingExtensionPriorityAdjustment(
    context.teamBuildingArchetype ?? 'balanced',
    {
      age: player.age,
      overallRating: overall,
      controlYears,
      annualSalary: player.contract.annualSalary,
    },
  );

  if (overall < 270 && !franchiseTarget) {
    return false;
  }

  if (context.teamBuildingArchetype === 'budget_constrained' && teamBuildingAdjustment < -20) {
    return false;
  }

  if (player.age >= 34 && overall < 330) {
    return false;
  }

  if (
    (player.developmentTrajectory === 'below_expectations' || player.developmentTrajectory === 'bust_risk')
    && player.age >= 31
  ) {
    return false;
  }

  if (controlYears >= 2 && !franchiseTarget) {
    return false;
  }

  return true;
}

function extensionCandidateScore(
  player: GeneratedPlayer,
  context: ExtensionTeamContext,
  teamPlayers: GeneratedPlayer[],
): number {
  const controlYears = controlYearsForPlayer(player, context);
  const overall = getPlayerOverall(player);
  const franchiseTarget = isFranchiseExtensionTarget(player, teamPlayers);
  const identityContext = {
    age: player.age,
    overallRating: overall,
    controlYears,
    annualSalary: player.contract.annualSalary,
  };
  return overall
    + (franchiseTarget ? 120 : 0)
    + (controlYears <= 1 ? 60 : controlYears <= 3 && franchiseTarget && player.age <= 29 ? 95 : controlYears === 2 ? 25 : 0)
    + (player.age <= 27 ? 25 : player.age <= 29 ? 12 : 0)
    + (player.position === 'SP' ? 18 : 0)
    + teamBuildingExtensionPriorityAdjustment(context.teamBuildingArchetype ?? 'balanced', identityContext)
    + gmExtensionPriorityAdjustment(context.gmPersonality ?? 'analytical', identityContext)
    - Math.max(0, player.age - 32) * 28
    - (overall < 295 ? 35 : 0);
}

export function serviceDaysToYears(serviceTimeDays: number): number {
  return Math.floor(Math.max(0, serviceTimeDays) / SERVICE_TIME_DAYS_PER_YEAR);
}

function priorPlayerArbitrationWins(player: GeneratedPlayer): number {
  return player.arbitrationHistory.reduce(
    (count, entry) => count + (entry.teamWon ? 0 : 1),
    0,
  );
}

export function qualifiesForSuperTwo(
  player: GeneratedPlayer,
  leaguePlayersWithServiceTime: GeneratedPlayer[],
): boolean {
  const isActiveMlbPlayer = (candidate: GeneratedPlayer) => (
    candidate.teamId.trim().length > 0
    && candidate.rosterStatus === 'MLB'
  );

  if (!isActiveMlbPlayer(player)
    || serviceDaysToYears(player.serviceTimeDays) !== PRE_ARB_MAX_YEARS) {
    return false;
  }

  const cohort = leaguePlayersWithServiceTime
    .filter((candidate) => (
      isActiveMlbPlayer(candidate)
      && serviceDaysToYears(candidate.serviceTimeDays) === PRE_ARB_MAX_YEARS
    ))
    .sort((left, right) =>
      right.serviceTimeDays - left.serviceTimeDays
      || left.id.localeCompare(right.id));

  if (cohort.length === 0) {
    return false;
  }

  const qualifiedCount = Math.max(1, Math.ceil(cohort.length * SUPER_TWO_COHORT_SHARE));
  return cohort.slice(0, qualifiedCount).some((candidate) => candidate.id === player.id);
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Calculate a player's market value in millions based on overall rating,
 * years of service, and age.
 */
export function calculatePlayerValue(
  player: GeneratedPlayer,
  yearsOfService: number,
): number {
  // Pre-arb players get league minimum
  if (yearsOfService <= PRE_ARB_MAX_YEARS) {
    return LEAGUE_MINIMUM_SALARY;
  }

  const overall = getPlayerOverall(player);

  // Arb-eligible: scale between $2M and $15M based on rating
  if (yearsOfService <= ARB_LAST_YEAR) {
    const ratingFraction = Math.min(overall / ARB_DIVISOR, 1);
    const arbBase = 2 + ratingFraction * 13; // $2M to $15M
    const multiplier = ARB_YEAR_MULTIPLIERS[yearsOfService] ?? 1.0;
    return Math.round(arbBase * multiplier * 100) / 100;
  }

  // Free agent: full market value
  const ratingFraction = Math.min(overall / ARB_DIVISOR, 1);
  const baseValue = ratingFraction * 40; // up to $40M AAV for elite players

  // Age discount: peak value at 27, -5% per year away from 27
  const ageDelta = Math.abs(player.age - 27);
  const ageMultiplier = Math.max(0.5, 1 - ageDelta * 0.05);

  const value = baseValue * ageMultiplier;
  return Math.round(Math.max(LEAGUE_MINIMUM_SALARY, value) * 100) / 100;
}

/**
 * Advance one canonical player contract by exactly one completed season.
 *
 * The only source-supported option rule is a one-year team option: it is
 * exercised when the player's deterministic value is at least the persisted
 * annual salary. Player options, opt-outs, and historical total value are not
 * interpreted or changed here.
 */
export function advanceContractForOffseason(
  player: GeneratedPlayer,
  yearsOfService: number,
): ContractOffseasonAdvanceResult {
  const previousYears = player.contract.years;

  // Existing zero-year players are intentionally byte-identical. They may be
  // retained minors or have been made eligible by a prior workflow; the clock
  // must never rewrite their ownership or contract facts.
  if (previousYears <= 0) {
    return {
      player,
      previousYears,
      nextYears: previousYears,
      outcome: 'unchanged_zero',
    };
  }

  if (previousYears === 1 && player.contract.teamOption) {
    const exercised = calculatePlayerValue(player, yearsOfService) >= player.contract.annualSalary;
    const nextYears = exercised ? 1 : 0;
    return {
      player: {
        ...player,
        contract: {
          ...player.contract,
          years: nextYears,
          teamOption: false,
        },
      },
      previousYears,
      nextYears,
      outcome: exercised ? 'team_option_exercised' : 'team_option_declined',
    };
  }

  const nextYears = Math.max(0, previousYears - 1);
  return {
    player: {
      ...player,
      contract: {
        ...player.contract,
        years: nextYears,
      },
    },
    previousYears,
    nextYears,
    outcome: nextYears === 0 ? 'expired' : 'advanced',
  };
}

/**
 * Generate an arbitration case for an eligible player.
 */
export function generateArbitrationCase(
  rng: GameRNG,
  player: GeneratedPlayer,
  yearsOfService: number,
  currentSalary: number,
): ArbitrationCase {
  const overall = getPlayerOverall(player);

  // Base salary from formula
  const base = (Math.min(overall, ARB_DIVISOR) / ARB_DIVISOR) * ARB_MAX_BASE_SALARY;
  const multiplier = ARB_YEAR_MULTIPLIERS[yearsOfService] ?? 1.0;
  const escalationMultiplier = 1 + Math.min(
    priorPlayerArbitrationWins(player) * ARB_ESCALATOR_PER_WIN,
    ARB_ESCALATOR_CAP,
  );
  const scaled = base * multiplier * escalationMultiplier;

  // Performance variance: +/- 20% determined by RNG
  const varianceFactor = 1 + (rng.nextFloat() * 2 - 1) * ARB_PERFORMANCE_VARIANCE;
  const projectedSalary = Math.round(Math.max(
    LEAGUE_MINIMUM_SALARY,
    currentSalary,
    scaled * varianceFactor,
  ) * 100) / 100;

  // Team offers below projected, player asks above
  const spreadFraction = 0.10 + rng.nextFloat() * 0.10; // 10-20% spread each way
  const teamOffer = Math.round(Math.max(
    currentSalary,
    projectedSalary * (1 - spreadFraction),
  ) * 100) / 100;
  const playerAsk = Math.round(projectedSalary * (1 + spreadFraction) * 100) / 100;

  return {
    playerId: player.id,
    currentSalary,
    teamOffer: Math.max(LEAGUE_MINIMUM_SALARY, teamOffer),
    playerAsk,
    projectedSalary,
    yearsOfService,
  };
}

/**
 * Resolve an arbitration hearing. Returns the awarded salary.
 * 60% chance team wins (lower offer), 40% player wins (higher ask).
 */
export function resolveArbitration(rng: GameRNG, arbCase: ArbitrationCase): number {
  const roll = rng.nextFloat();
  return roll < ARB_TEAM_WIN_PROBABILITY ? arbCase.teamOffer : arbCase.playerAsk;
}

export function evaluateHoldout(
  arbCase: ArbitrationCase,
  playerMorale: number,
  rng: GameRNG,
): HoldoutEvaluation | null {
  const morale = clamp(playerMorale, 0, 100);
  const salaryGapRatio = arbCase.teamOffer <= 0
    ? 0
    : (arbCase.playerAsk - arbCase.teamOffer) / arbCase.teamOffer;

  if (salaryGapRatio <= 0.18 || morale >= 45) {
    return null;
  }

  const triggerThreshold = 0.30 + ((45 - morale) / 100);
  if (rng.nextFloat() >= triggerThreshold) {
    return null;
  }

  return {
    holdoutDays: rng.nextInt(7, 21),
    moraleHit: rng.nextInt(8, 15),
  };
}

/**
 * Calculate team payroll from a list of players and optional dead money.
 */
export function calculateTeamPayroll(
  teamId: string,
  players: GeneratedPlayer[],
  deadMoney = 0,
): TeamPayroll {
  let mlbPayroll = 0;
  let minorsPayroll = 0;

  for (const player of players) {
    if (player.teamId !== teamId) continue;
    const salary = player.contract.annualSalary;
    if (player.rosterStatus === 'MLB') {
      mlbPayroll += salary;
    } else {
      minorsPayroll += salary;
    }
  }

  mlbPayroll = Math.round(mlbPayroll * 100) / 100;
  minorsPayroll = Math.round(minorsPayroll * 100) / 100;

  const totalPayroll = Math.round((mlbPayroll + minorsPayroll + deadMoney) * 100) / 100;
  const luxuryTaxPayroll = Math.round((mlbPayroll + deadMoney) * 100) / 100;

  // Future commitments: project based on current contracts
  const futureCommitments: number[] = [];
  for (let y = 1; y <= FUTURE_COMMITMENT_YEARS; y++) {
    let committed = 0;
    for (const player of players) {
      if (player.teamId !== teamId) continue;
      if (player.contract.years > y) {
        committed += player.contract.annualSalary;
      }
    }
    futureCommitments.push(Math.round(committed * 100) / 100);
  }

  const capSpace = Math.round((LUXURY_TAX_THRESHOLD - luxuryTaxPayroll) * 100) / 100;

  return {
    teamId,
    totalPayroll,
    luxuryTaxPayroll,
    mlbPayroll,
    minorsPayroll,
    deadMoney,
    futureCommitments,
    capSpace,
  };
}

/**
 * Calculate luxury tax owed for a given payroll amount (in millions).
 * Uses tiered penalty rates on overage above the threshold.
 */
export function calculateLuxuryTax(payroll: number): number {
  const overage = payroll - LUXURY_TAX_THRESHOLD;
  if (overage <= 0) return 0;

  let tax = 0;
  let remaining = overage;
  let prevMax = 0;

  for (const tier of LUXURY_TAX_TIERS) {
    const tierWidth = tier.overageMax === Infinity
      ? remaining
      : tier.overageMax - prevMax;
    const taxable = Math.min(remaining, tierWidth);
    tax += taxable * tier.rate;
    remaining -= taxable;
    prevMax = tier.overageMax === Infinity ? prevMax : tier.overageMax;
    if (remaining <= 0) break;
  }

  return Math.round(tax * 100) / 100;
}

/**
 * Get team budget based on market size. Returns the midpoint of the
 * market's budget range in millions.
 */
export function getTeamBudget(teamId: string): number {
  const market = getTeamMarketConfig(teamId);
  if (!market) {
    // Unknown team defaults to small-market midpoint
    return (SMALL_MARKET.budgetMin + SMALL_MARKET.budgetMax) / 2;
  }
  return (market.budgetMin + market.budgetMax) / 2;
}

/**
 * Advance all contracts by one year: decrement yearsRemaining,
 * mark expiring or expired as appropriate.
 */
export function advanceContracts(contracts: ContractDetail[]): ContractDetail[] {
  return contracts.map((c) => {
    if (c.status === 'expired' || c.status === 'bought_out') {
      return c;
    }

    const yearsRemaining = c.yearsRemaining - 1;

    if (yearsRemaining <= 0) {
      return { ...c, yearsRemaining: 0, status: 'expired' as const };
    }
    if (yearsRemaining === 1) {
      return { ...c, yearsRemaining, status: 'expiring' as const };
    }
    return { ...c, yearsRemaining, status: 'active' as const };
  });
}

/**
 * Generate a contract offer for a free agent based on player value,
 * team budget, and current payroll.
 */
export function generateContractOffer(
  rng: GameRNG,
  player: GeneratedPlayer,
  teamBudget: number,
  currentPayroll: number,
): ContractDetail {
  const overall = getPlayerOverall(player);
  const ratingFraction = Math.min(overall / ARB_DIVISOR, 1);

  // Base AAV from market value
  const baseAAV = calculatePlayerValue(player, ARB_LAST_YEAR + 1);

  // Spending willingness: how much room the team has
  const availableBudget = Math.max(0, teamBudget - currentPayroll);
  const willingness = Math.min(1, availableBudget / (baseAAV * 3));

  // Adjust AAV by willingness (teams near cap offer less)
  const adjustedAAV = Math.round(Math.max(LEAGUE_MINIMUM_SALARY, baseAAV * willingness) * 100) / 100;

  // Contract years: better players get longer deals, capped by age
  const maxYearsByAge = Math.max(1, Math.min(MAX_CONTRACT_YEARS, 40 - player.age));
  const targetYears = Math.max(1, Math.round(ratingFraction * 7));
  const years = Math.min(targetYears, maxYearsByAge);

  // Year-by-year salaries with slight escalation
  const yearSalaries: number[] = [];
  for (let y = 0; y < years; y++) {
    const escalation = 1 + y * 0.03; // 3% annual escalation
    yearSalaries.push(Math.round(adjustedAAV * escalation * 100) / 100);
  }

  const totalValue = Math.round(yearSalaries.reduce((a, b) => a + b, 0) * 100) / 100;

  // Signing bonus: elite players get up to 10% of total value
  const signingBonus = ratingFraction > 0.7
    ? Math.round(totalValue * 0.05 * rng.nextFloat() * 2 * 100) / 100
    : 0;

  // No-trade clause for elite players
  const noTradeClause = overall >= NTC_RATING_THRESHOLD && years >= 3;

  // Player option on final year for high-value players
  const playerOption = overall >= PLAYER_OPTION_RATING_THRESHOLD && years >= 4;

  // Team option: sometimes on mid-tier deals
  const teamOption = !playerOption && years >= 3 && rng.nextFloat() < 0.3;

  return {
    playerId: player.id,
    teamId: '', // caller assigns team
    years,
    yearsRemaining: years,
    annualSalary: adjustedAAV,
    totalValue,
    noTradeClause,
    playerOption,
    teamOption,
    signingBonus,
    yearSalaries,
    status: 'active',
  };
}

/**
 * Get all arbitration-eligible players for a team.
 * Arb eligibility: qualified Super Two players or 3-5 completed service years,
 * on an active MLB roster. `serviceTimeDays` is canonical; the legacy years
 * map remains an accepted argument for call-site compatibility but cannot
 * override exact credited service.
 */
export function getArbEligiblePlayers(
  players: GeneratedPlayer[],
  teamId: string,
  _serviceTime?: ReadonlyMap<string, number>,
): GeneratedPlayer[] {
  return players.filter((p) => {
    if (p.teamId !== teamId || p.rosterStatus !== 'MLB') return false;
    const years = serviceDaysToYears(p.serviceTimeDays);
    if (years === PRE_ARB_MAX_YEARS) {
      return p.superTwoQualified;
    }
    return years >= ARB_FIRST_YEAR && years <= ARB_LAST_YEAR;
  });
}

export function evaluateExtensionWillingness(
  player: GeneratedPlayer,
  context: ExtensionTeamContext,
  rng: GameRNG,
): ExtensionWillingness {
  const controlYears = controlYearsForPlayer(player, context);
  const serviceYears = serviceYearsForPlayer(player, context);
  const morale = moraleForPlayer(player, context);
  const trajectoryAdjustment = trajectoryDemandAdjustment(player);
  const ageDemandAdjustment = player.age <= 25 ? 0.10 : player.age >= 32 ? -0.12 : player.age >= 29 ? -0.03 : 0;
  const ageWillingnessAdjustment = player.age >= 32 ? 0.14 : player.age <= 25 ? -0.08 : 0;
  const urgencyAdjustment = controlYears <= 1 ? 0.24 : controlYears === 2 ? 0.12 : -0.04;
  const competitivenessAdjustment = (context.teamWinPct - 0.5) * 0.35;
  const moraleAdjustment = ((morale - 50) / 50) * 0.12;
  const payrollPressure = context.teamBudget > 0
    ? clamp(context.currentPayroll / context.teamBudget, 0, 1.4)
    : 1;
  const demandMultiplier = clamp(
    1.02
      + trajectoryAdjustment
      + ageDemandAdjustment
      - Math.max(0, competitivenessAdjustment * 0.20)
      - (controlYears <= 1 ? 0.05 : 0)
      + (serviceYears >= 6 ? 0.04 : 0)
      + ((rng.nextFloat() - 0.5) * 0.04),
    0.78,
    1.55,
  );
  const willingness = clamp(
    0.44
      + urgencyAdjustment
      + competitivenessAdjustment
      + moraleAdjustment
      + ageWillingnessAdjustment
      - trajectoryAdjustment
      - Math.max(0, payrollPressure - 0.9) * 0.10,
    0.08,
    0.95,
  );
  const walkAwayThreshold = clamp(
    0.11
      + ((demandMultiplier - 1) * 0.18)
      + ((0.55 - willingness) * 0.10),
    0.08,
    0.28,
  );

  return {
    willingness: Math.round(willingness * 1000) / 1000,
    demandMultiplier: Math.round(demandMultiplier * 1000) / 1000,
    walkAwayThreshold: Math.round(walkAwayThreshold * 1000) / 1000,
  };
}

export function calculateExtensionOffer(
  player: GeneratedPlayer,
  context: ExtensionTeamContext,
  years: number,
  rng: GameRNG,
): ExtensionContractTerms {
  const requestedYears = clamp(
    Math.round(years),
    1,
    Math.min(MAX_CONTRACT_YEARS, Math.max(1, 40 - player.age + (player.age <= 27 ? 1 : 0))),
  );
  const willingness = evaluateExtensionWillingness(player, context, rng.fork());
  const serviceYears = serviceYearsForPlayer(player, context);
  const projectedValue = Math.max(
    calculatePlayerValue(player, Math.max(ARB_FIRST_YEAR, serviceYears)),
    calculatePlayerValue(player, ARB_LAST_YEAR + 1) * 0.72,
  );
  const budgetPressure = context.teamBudget > 0
    ? clamp(context.currentPayroll / context.teamBudget, 0, 1.4)
    : 1;
  const averageFutureCommitment = context.futureCommitments.length > 0
    ? context.futureCommitments
      .slice(0, Math.min(context.futureCommitments.length, requestedYears))
      .reduce((total, value) => total + value, 0) / Math.min(context.futureCommitments.length, requestedYears)
    : 0;
  const futurePressure = context.teamBudget > 0
    ? clamp(averageFutureCommitment / context.teamBudget, 0, 1.5)
    : 0;
  const budgetAdjustment = clamp(
    1
      - (Math.max(0, budgetPressure - 0.72) * 0.40)
      - (Math.max(0, futurePressure - 0.55) * 0.15),
    0.78,
    1.08,
  );
  const annualSalary = roundCurrency(
    Math.max(
      LEAGUE_MINIMUM_SALARY,
      projectedValue * willingness.demandMultiplier * budgetAdjustment,
    ),
  );
  const overall = getPlayerOverall(player);
  const noTradeClause = overall >= NTC_RATING_THRESHOLD || annualSalary >= 18;
  const noTradeClauseType = noTradeClause
    ? (overall >= 450 || requestedYears >= 6 ? 'full' : 'partial')
    : 'none';
  const playerOption = requestedYears >= 4
    && player.age <= 31
    && overall >= PLAYER_OPTION_RATING_THRESHOLD
    && rng.nextFloat() < 0.32;
  const teamOption = !playerOption
    && requestedYears >= 3
    && budgetPressure > 0.78
    && rng.nextFloat() < 0.28;
  const optOutYears = playerOption
    ? [Math.max(2, requestedYears - 1)]
    : requestedYears >= 6 && willingness.demandMultiplier >= 1.18
      ? [3]
      : [];
  const signingBonus = roundCurrency(
    annualSalary * clamp(0.05 + ((1 - willingness.willingness) * 0.10), 0.05, 0.13),
  );
  const buyoutAmount = teamOption ? roundCurrency(annualSalary * 0.18) : 0;
  const deferredMoney = annualSalary * requestedYears >= 60 && budgetPressure > 0.8
    ? [{
      yearOffset: requestedYears,
      amount: roundCurrency(annualSalary * 0.15),
    }]
    : [];

  return recalculateExtensionTotals({
    years: requestedYears,
    annualSalary,
    totalValue: 0,
    noTradeClause,
    noTradeClauseType,
    playerOption,
    teamOption,
    optOutYears,
    signingBonus,
    buyoutAmount,
    deferredMoney,
  });
}

export function negotiateExtension(
  player: GeneratedPlayer,
  context: ExtensionTeamContext,
  offer: ExtensionContractTerms,
  rng: GameRNG,
  session?: ExtensionNegotiationSession,
): ExtensionResult {
  const normalizedOffer = recalculateExtensionTotals(offer);
  const demandProfile = evaluateExtensionWillingness(player, context, rng.fork());
  const baselineContractSignature = extensionNegotiationContractSignature(player);
  const nextSession = session?.playerId === player.id
    && session.teamId === context.teamId
    && session.season === context.season
    && session.baselineContractSignature === baselineContractSignature
    ? {
      ...session,
      rounds: [...session.rounds],
    }
    : {
      playerId: player.id,
      teamId: context.teamId,
      season: context.season,
      baselineContractSignature,
      targetContract: calculateExtensionOffer(player, context, normalizedOffer.years, rng.fork()),
      counterOffer: null,
      rounds: [],
    };
  const currentDemand = nextSession.counterOffer ?? nextSession.targetContract;
  const gap = clamp(
    (currentDemand.annualSalary - normalizedOffer.annualSalary) / Math.max(currentDemand.annualSalary, 0.01),
    0,
    1,
  );
  const acceptGap = clamp(0.05 + (demandProfile.willingness * 0.06), 0.05, 0.11);
  const walkAwayRoll = Math.round(rng.nextFloat() * 1000) / 1000;
  const roundNumber = nextSession.rounds.length + 1;

  if (gap <= acceptGap) {
    const rounds = [
      ...nextSession.rounds,
      {
        round: roundNumber,
        status: 'accepted' as const,
        gap: Math.round(gap * 1000) / 1000,
        teamOffer: normalizedOffer,
        playerDemand: currentDemand,
        walkAwayRoll,
      },
    ];
    const acceptedSession: ExtensionNegotiationSession = {
      ...nextSession,
      rounds,
      counterOffer: null,
    };
    return {
      status: 'accepted',
      finalContract: normalizedOffer,
      rounds,
      session: acceptedSession,
    };
  }

  const shouldReject = roundNumber >= 3
    || (
      roundNumber >= 2
      && gap > demandProfile.walkAwayThreshold * 1.6
      && walkAwayRoll < clamp(gap - demandProfile.walkAwayThreshold, 0.08, 0.65)
    );

  if (shouldReject) {
    const rounds = [
      ...nextSession.rounds,
      {
        round: roundNumber,
        status: 'rejected' as const,
        gap: Math.round(gap * 1000) / 1000,
        teamOffer: normalizedOffer,
        playerDemand: currentDemand,
        walkAwayRoll,
      },
    ];
    return {
      status: 'rejected',
      rounds,
      session: {
        ...nextSession,
        rounds,
        counterOffer: null,
      },
    };
  }

  const counterOffer = buildNegotiationCounter(
    currentDemand,
    demandProfile,
    roundNumber,
    roundCurrency(normalizedOffer.annualSalary + 0.25),
  );
  const rounds = [
    ...nextSession.rounds,
    {
      round: roundNumber,
      status: 'countered' as const,
      gap: Math.round(gap * 1000) / 1000,
      teamOffer: normalizedOffer,
      playerDemand: counterOffer,
      walkAwayRoll,
    },
  ];
  return {
    status: 'countered',
    counterOffer,
    rounds,
    session: {
      ...nextSession,
      rounds,
      counterOffer,
    },
  };
}

export function processTeamExtensions(
  context: ExtensionTeamContext,
  players: GeneratedPlayer[],
  rng: GameRNG,
): TeamExtensionProcessResult {
  if (context.currentPayroll > context.teamBudget) {
    return {
      players,
      results: [],
    };
  }

  const playerIndex = new Map(players.map((player, index) => [player.id, index] as const));
  const nextPlayers = [...players];
  const results: TeamExtensionProcessResult['results'] = [];
  let workingPayroll = context.currentPayroll;
  const teamPlayers = players.filter((player) => player.teamId === context.teamId && player.rosterStatus === 'MLB');
  const identityCandidateLimit = extensionGmCandidateLimit(
    context.gmPersonality ?? 'analytical',
  );
  const candidateLimit = context.teamBuildingArchetype === 'budget_constrained'
    ? 1
    : identityCandidateLimit;

  const candidates = players
    .filter((player) =>
      player.teamId === context.teamId
      && player.rosterStatus === 'MLB'
      && getPlayerOverall(player) >= 245
      && shouldPursueExtensionCandidate(player, context, teamPlayers)
      && !(player.contract.noTradeClause && player.contract.noTradeClauseType === 'full' && player.contract.years >= 2)
      && !player.extensionHistory?.some((entry) =>
        entry.season === context.season
        && (entry.outcome === 'accepted' || entry.outcome === 'rejected')),
    )
    .sort((left, right) => {
      const scoreDelta = extensionCandidateScore(right, context, teamPlayers) - extensionCandidateScore(left, context, teamPlayers);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return left.id.localeCompare(right.id);
    })
    .slice(0, candidateLimit);

  for (const player of candidates) {
    const controlYears = controlYearsForPlayer(player, context);
    const offerRng = createExtensionCandidateRng(
      rng.getSeed(),
      context,
      player,
      controlYears,
      workingPayroll,
      'offer',
    );
    const negotiationRng = createExtensionCandidateRng(
      rng.getSeed(),
      context,
      player,
      controlYears,
      workingPayroll,
      'negotiation',
    );
    const policy = getExtensionGmDecisionPolicy(
      context.gmPersonality ?? 'analytical',
      player,
      controlYears,
    );
    const baseDesiredYears = controlYears <= 1 ? (player.age <= 30 ? 5 : 3) : (player.age <= 27 ? 6 : 4);
    const desiredYears = clamp(baseDesiredYears + policy.termAdjustment, 1, MAX_CONTRACT_YEARS);
    const marketOffer = calculateExtensionOffer(player, {
      ...context,
      currentPayroll: workingPayroll,
    }, desiredYears, offerRng);
    const openingOffer = recalculateExtensionTotals({
      ...marketOffer,
      annualSalary: roundCurrency(marketOffer.annualSalary * policy.openingOfferRatio),
    });

    const projectedPayroll = roundCurrency(
      workingPayroll - player.contract.annualSalary + openingOffer.annualSalary,
    );
    if (projectedPayroll > context.teamBudget) {
      continue;
    }

    let result = negotiateExtension(player, {
      ...context,
      currentPayroll: workingPayroll,
    }, openingOffer, negotiationRng.fork());
    let latestOffer = openingOffer;

    while (result.status === 'countered' && result.counterOffer) {
      const aggression = result.rounds.length === 1
        ? policy.firstCounterAggression
        : policy.laterCounterAggression;
      latestOffer = blendOffers(latestOffer, result.counterOffer, aggression);
      result = negotiateExtension(player, {
        ...context,
        currentPayroll: workingPayroll,
      }, latestOffer, negotiationRng.fork(), result.session);
    }

    const acceptedProjectedPayroll = result.status === 'accepted' && result.finalContract
      ? roundCurrency(
        workingPayroll - player.contract.annualSalary + result.finalContract.annualSalary,
      )
      : null;
    // The opening offer is only an admission estimate. Later team concessions
    // may raise AAV, so the terminal accepted contract must independently fit
    // the same real owner budget before it can become a factual result.
    if (acceptedProjectedPayroll != null && acceptedProjectedPayroll > context.teamBudget) {
      continue;
    }

    results.push({
      playerId: player.id,
      result,
    });

    if (result.status === 'accepted' && result.finalContract) {
      const index = playerIndex.get(player.id);
      if (index == null) {
        continue;
      }

      nextPlayers[index] = {
        ...player,
        contract: {
          ...player.contract,
          years: result.finalContract.years,
          annualSalary: result.finalContract.annualSalary,
          totalValue: result.finalContract.totalValue,
          noTradeClause: result.finalContract.noTradeClause,
          noTradeClauseType: result.finalContract.noTradeClauseType,
          playerOption: result.finalContract.playerOption,
          teamOption: result.finalContract.teamOption,
          optOutYears: result.finalContract.optOutYears,
          signingBonus: result.finalContract.signingBonus,
          buyoutAmount: result.finalContract.buyoutAmount,
          deferredMoney: result.finalContract.deferredMoney,
        },
        extensionHistory: [
          ...(player.extensionHistory ?? []),
          {
            season: context.season,
            teamId: context.teamId,
            years: result.finalContract.years,
            annualSalary: result.finalContract.annualSalary,
            totalValue: result.finalContract.totalValue,
            outcome: 'accepted',
          },
        ],
      };
      workingPayroll = acceptedProjectedPayroll ?? projectedPayroll;
    } else if (result.status === 'rejected') {
      const index = playerIndex.get(player.id);
      const rejectedOffer = result.rounds.at(-1)?.teamOffer;
      if (index == null || !rejectedOffer) {
        continue;
      }
      nextPlayers[index] = {
        ...player,
        extensionHistory: [
          ...(player.extensionHistory ?? []),
          {
            season: context.season,
            teamId: context.teamId,
            years: rejectedOffer.years,
            annualSalary: rejectedOffer.annualSalary,
            totalValue: rejectedOffer.totalValue,
            outcome: 'rejected',
          },
        ],
      };
    }
  }

  return {
    players: nextPlayers,
    results,
  };
}
