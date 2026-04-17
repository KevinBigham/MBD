/**
 * @module freeAgency
 * Free agency market simulation: competitive bidding, contract generation,
 * and AI team decision-making for off-season player signings.
 *
 * All randomness flows through GameRNG; the JS global random API is never used.
 */

import type { QualifyingOfferRecord } from '@mbd/contracts';
import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer, Position } from '../player/generation.js';
import { PITCHER_POSITIONS } from '../player/generation.js';
import { hitterOverall, pitcherOverall, toDisplayRating } from '../player/attributes.js';
import { RATING_MAX } from '../player/attributes.js';
import { serviceDaysToYears } from '../finance/contracts.js';
import { adjustFABidForRelationship, type GMRelationship } from '../league/index.js';
import type { GMPersonality } from '../trade/tradeAI.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum AAV a player can earn (in millions). */
const MAX_AAV_MILLIONS = 42;

/** Total days the free agency market runs. */
const MARKET_DURATION_DAYS = 60;

/** Day ranges for each demand tier to sign. */
const SIGNING_WINDOWS: Record<FreeAgent['demandLevel'], [number, number]> = {
  elite: [1, 15],
  high: [16, 30],
  moderate: [31, 45],
  low: [46, 55],
  fringe: [56, 60],
};

/** Demand level thresholds (AAV in millions). */
const DEMAND_ELITE_THRESHOLD = 25;
const DEMAND_HIGH_THRESHOLD = 15;
const DEMAND_MODERATE_THRESHOLD = 8;
const DEMAND_LOW_THRESHOLD = 3;

/** Age bracket boundaries. */
const AGE_YOUNG_PRIME = 25;
const AGE_PEAK_START = 29;
const AGE_DECLINE_START = 32;
const AGE_VETERAN_START = 35;

/** Age multipliers for market value. */
const AGE_MULTIPLIER_YOUNG = 1.1;
const AGE_MULTIPLIER_PEAK = 1.0;
const AGE_MULTIPLIER_DECLINE = 0.7;
const AGE_MULTIPLIER_VETERAN = 0.4;

/** Position multipliers for market value. */
const POSITION_MULTIPLIERS: Partial<Record<Position, number>> = {
  SP: 1.2,
  CL: 1.1,
  C: 1.05,
  SS: 1.05,
  DH: 0.8,
  RP: 0.85,
};
const DEFAULT_POSITION_MULTIPLIER = 1.0;

/** Need bonus when a team badly needs a position. */
const NEED_BONUS_FACTOR = 0.38;

/** Price inflation range when multiple teams compete. */
const COMPETITION_INFLATION_MIN = 0.15;
const COMPETITION_INFLATION_MAX = 0.28;

/** Rating thresholds for contract-year projection. */
const ELITE_RATING_THRESHOLD = 400;
const GOOD_RATING_THRESHOLD = 300;

/** Minor league deal AAV floor (in millions). */
const MINOR_LEAGUE_DEAL_AAV = 0.75;
const MINOR_LEAGUE_DEAL_YEARS = 1;

/** Minimum number of interested teams to trigger competition inflation. */
const COMPETITION_TEAM_THRESHOLD = 3;
const USER_TARGET_NEED_THRESHOLD = 55;

/** AI offer jitter range (percentage of base salary). */
const OFFER_JITTER_MIN = -10;
const OFFER_JITTER_MAX = 15;

/** Signing bonus as fraction of annual salary. */
const SIGNING_BONUS_FRACTION = 0.10;

/** NTC probability threshold (rating / RATING_MAX). */
const NTC_RATING_THRESHOLD = 0.7;

/** Player/team option probability thresholds. */
const PLAYER_OPTION_CHANCE = 0.3;
const TEAM_OPTION_CHANCE = 0.25;

const QUALIFYING_OFFER_SALARY_PLAYER_COUNT = 125;
const QUALIFYING_OFFER_MIN_SERVICE_YEARS = 3;
const QUALIFYING_OFFER_MARKET_VALUE_FRACTION = 0.75;
const SMALL_MARKET_BUDGET_THRESHOLD = 145;
const MID_MARKET_BUDGET_THRESHOLD = 175;
const LOW_NEED_THRESHOLD = 35;
const MODERATE_NEED_THRESHOLD = 55;
const ELITE_FA_MARKET_VALUE = 20;
const MINOR_LEAGUE_FA_OVERALL_THRESHOLD = 340;
const MINOR_LEAGUE_FA_VETERAN_THRESHOLD = 290;
const MINOR_LEAGUE_FA_VETERAN_AGE = 29;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FreeAgent {
  player: GeneratedPlayer;
  marketValue: number;
  demandLevel: 'elite' | 'high' | 'moderate' | 'low' | 'fringe';
  interestedTeams: string[];
  signedWith: string | null;
  contract: ContractOffer | null;
}

export interface ContractOffer {
  teamId: string;
  playerId: string;
  years: number;
  annualSalary: number;
  totalValue: number;
  noTradeClause: boolean;
  playerOption: boolean;
  teamOption: boolean;
  signingBonus: number;
}

export interface RelationshipBidContext {
  relationship: GMRelationship;
  personality: GMPersonality;
}

export interface FreeAgencyMarket {
  season: number;
  freeAgents: FreeAgent[];
  signedPlayers: FreeAgent[];
  day: number;
}

export type FreeAgencyAttractiveness =
  | Map<string, number>
  | ((teamId: string, playerId: string) => number);

export interface QualifyingOfferResolution {
  player: GeneratedPlayer;
  record: QualifyingOfferRecord;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the overall rating for any player, dispatching to hitter or pitcher calc. */
function getOverall(player: GeneratedPlayer): number {
  if (
    (PITCHER_POSITIONS as readonly string[]).includes(player.position) &&
    player.pitcherAttributes !== null
  ) {
    return pitcherOverall(player.pitcherAttributes);
  }
  return hitterOverall(player.hitterAttributes);
}

/** Look up the age multiplier for market value calculation. */
function ageMultiplier(age: number): number {
  if (age < AGE_YOUNG_PRIME) return AGE_MULTIPLIER_YOUNG;
  if (age < AGE_PEAK_START) return AGE_MULTIPLIER_YOUNG;
  if (age < AGE_DECLINE_START) return AGE_MULTIPLIER_PEAK;
  if (age < AGE_VETERAN_START) return AGE_MULTIPLIER_DECLINE;
  return AGE_MULTIPLIER_VETERAN;
}

/** Look up the position multiplier for market value calculation. */
function positionMultiplier(position: Position): number {
  return POSITION_MULTIPLIERS[position] ?? DEFAULT_POSITION_MULTIPLIER;
}

/** Check if a player's contract has expired (0 years remaining). */
function isExpiring(player: GeneratedPlayer): boolean {
  return player.contract.years <= 0;
}

function shouldEnterFreeAgency(player: GeneratedPlayer): boolean {
  if (!isExpiring(player)) {
    return false;
  }

  if (player.rosterStatus === 'MLB') {
    return true;
  }

  const overall = getOverall(player);
  return overall >= MINOR_LEAGUE_FA_OVERALL_THRESHOLD
    || (player.age >= MINOR_LEAGUE_FA_VETERAN_AGE && overall >= MINOR_LEAGUE_FA_VETERAN_THRESHOLD);
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function capAnnualSalary(value: number): number {
  return roundCurrency(clamp(value, MINOR_LEAGUE_DEAL_AAV, MAX_AAV_MILLIONS));
}

function playerDurability(player: GeneratedPlayer): number {
  return player.pitcherAttributes?.stamina ?? player.hitterAttributes.durability;
}

function spendingComfortFactor(teamBudget: number): number {
  if (teamBudget <= SMALL_MARKET_BUDGET_THRESHOLD) {
    return 0.84;
  }
  if (teamBudget <= MID_MARKET_BUDGET_THRESHOLD) {
    return 0.9;
  }
  return 0.96;
}

function marketAggressionFactor(teamBudget: number): number {
  if (teamBudget <= SMALL_MARKET_BUDGET_THRESHOLD) {
    return 0.92;
  }
  if (teamBudget <= MID_MARKET_BUDGET_THRESHOLD) {
    return 1.03;
  }
  return 1.12;
}

function requiresStrongRosterFit(player: GeneratedPlayer, marketValue: number): boolean {
  return player.position !== 'SP' && marketValue < ELITE_FA_MARKET_VALUE;
}

function offerAppealScore(offer: ContractOffer, attractiveness: number): number {
  const chemistryBoost = 1 + ((clamp(attractiveness, 0, 100) - 50) / 100) * 0.08;
  const yearsBonus = Math.min(0.35, offer.years * 0.04);
  return offer.annualSalary * chemistryBoost + yearsBonus;
}

function resolveAttractiveness(
  source: FreeAgencyAttractiveness,
  teamId: string,
  playerId: string,
): number {
  if (source instanceof Map) {
    return source.get(teamId) ?? 50;
  }
  return source(teamId, playerId);
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Calculate the expected annual market value (AAV in millions) for a player.
 */
export function calculateMarketValue(player: GeneratedPlayer): number {
  const overall = getOverall(player);
  const baseValue = (overall / RATING_MAX) * MAX_AAV_MILLIONS;
  const ageMult = ageMultiplier(player.age);
  const posMult = positionMultiplier(player.position);
  const value = baseValue * ageMult * posMult;
  return Math.round(value * 100) / 100; // round to cents
}

/**
 * Determine the demand level for a given market value.
 */
export function getDemandLevel(marketValue: number): FreeAgent['demandLevel'] {
  if (marketValue >= DEMAND_ELITE_THRESHOLD) return 'elite';
  if (marketValue >= DEMAND_HIGH_THRESHOLD) return 'high';
  if (marketValue >= DEMAND_MODERATE_THRESHOLD) return 'moderate';
  if (marketValue >= DEMAND_LOW_THRESHOLD) return 'low';
  return 'fringe';
}

/**
 * Project contract years based on player age and rating.
 * Uses RNG to pick within the valid range.
 */
export function projectContractYears(rng: GameRNG, player: GeneratedPlayer): number {
  const overall = getOverall(player);
  const age = player.age;

  let min: number;
  let max: number;

  if (age <= 28 && overall > ELITE_RATING_THRESHOLD) {
    min = 6; max = 8;
  } else if (age <= 28 && overall > GOOD_RATING_THRESHOLD) {
    min = 4; max = 6;
  } else if (age >= AGE_PEAK_START && age < AGE_DECLINE_START) {
    min = 3; max = 5;
  } else if (age >= AGE_DECLINE_START && age < AGE_VETERAN_START) {
    min = 1; max = 3;
  } else if (age >= AGE_VETERAN_START) {
    min = 1; max = 2;
  } else {
    // age < 25, not elite or good -- short prove-it deals
    min = 1; max = 3;
  }

  return rng.nextInt(min, max);
}

/**
 * Create the free agency market from all players with expiring contracts.
 */
export function createFreeAgencyMarket(
  season: number,
  allPlayers: GeneratedPlayer[],
): FreeAgencyMarket {
  const freeAgents: FreeAgent[] = allPlayers
    .filter(shouldEnterFreeAgency)
    .map((player) => {
      const marketValue = calculateMarketValue(player);
      return {
        player,
        marketValue,
        demandLevel: getDemandLevel(marketValue),
        interestedTeams: [],
        signedWith: null,
        contract: null,
      };
    })
    .sort((a, b) => b.marketValue - a.marketValue);

  return {
    season,
    freeAgents,
    signedPlayers: [],
    day: 0,
  };
}

export function calculateQualifyingOfferSalary(players: GeneratedPlayer[]): number {
  const salaries = players
    .filter((player) => player.teamId !== '' && player.rosterStatus === 'MLB')
    .map((player) => player.contract.annualSalary)
    .sort((left, right) => right - left);

  if (salaries.length === 0) {
    return 20;
  }

  const topSalaries = salaries.slice(0, Math.min(QUALIFYING_OFFER_SALARY_PLAYER_COUNT, salaries.length));
  const average = topSalaries.reduce((total, salary) => total + salary, 0) / topSalaries.length;
  return roundCurrency(average);
}

export function getQualifyingOfferEligiblePlayers(
  players: GeneratedPlayer[],
  teamId: string,
  serviceTime: Map<string, number>,
): GeneratedPlayer[] {
  const qualifyingOfferSalary = calculateQualifyingOfferSalary(players);
  return players
    .filter((player) =>
      player.teamId === teamId
      && player.rosterStatus === 'MLB'
      && player.contract.years <= 1
      && (serviceTime.get(player.id) ?? serviceDaysToYears(player.serviceTimeDays)) >= QUALIFYING_OFFER_MIN_SERVICE_YEARS
      && calculateMarketValue(player) >= qualifyingOfferSalary * QUALIFYING_OFFER_MARKET_VALUE_FRACTION,
    )
    .sort((left, right) => calculateMarketValue(right) - calculateMarketValue(left));
}

export function issueQualifyingOffer(
  player: GeneratedPlayer,
  teamId: string,
  season: number,
  amount: number,
): QualifyingOfferRecord {
  return {
    playerId: player.id,
    teamId,
    season,
    marketValue: calculateMarketValue(player),
    amount: roundCurrency(amount),
    status: 'offered',
    signingTeamId: null,
    compensationPickId: null,
  };
}

export function shouldIssueQualifyingOffer(
  player: GeneratedPlayer,
  amount: number,
): boolean {
  const marketValue = calculateMarketValue(player);
  const durability = playerDurability(player);
  const leverage = marketValue - amount;
  const agePenalty = player.age >= 35 ? 4 : player.age >= 33 ? 2.25 : 0;
  const injuryPenalty = durability < 220 ? 3.5 : durability < 280 ? 1.5 : 0;
  const starBonus = getOverall(player) >= 380 ? 2.5 : 0;
  const youthBonus = player.age <= 30 ? 1.25 : 0;
  const trajectoryBonus = player.developmentTrajectory === 'ahead_of_curve'
    ? 0.75
    : player.developmentTrajectory === 'below_expectations' || player.developmentTrajectory === 'bust_risk'
      ? -1
      : 0;

  return leverage + starBonus + youthBonus + trajectoryBonus - agePenalty - injuryPenalty >= 1.5;
}

export function resolveQualifyingOffer(
  player: GeneratedPlayer,
  record: QualifyingOfferRecord,
  rng: GameRNG,
): QualifyingOfferResolution {
  const leverage = record.marketValue - record.amount;
  const durability = playerDurability(player);
  const marketRatio = record.marketValue / Math.max(record.amount, 0.1);
  const ageAdjustment = player.age >= 35 ? 0.26 : player.age >= 32 ? 0.12 : player.age <= 28 ? -0.12 : 0;
  const trajectoryAdjustment = player.developmentTrajectory === 'bust_risk'
    ? 0.16
    : player.developmentTrajectory === 'below_expectations'
      ? 0.08
      : player.developmentTrajectory === 'ahead_of_curve'
        ? -0.10
        : 0;
  const durabilityAdjustment = durability < 220
    ? 0.16
    : durability < 280
      ? 0.08
      : durability >= 360
        ? -0.04
        : 0;
  const marketAdjustment = marketRatio >= 1.35
    ? -0.12
    : marketRatio <= 1.05
      ? 0.1
      : 0;
  const acceptChance = clamp(
    0.52
      - (leverage * 0.05)
      + ageAdjustment
      + trajectoryAdjustment
      + durabilityAdjustment
      + marketAdjustment
      + (record.amount >= player.contract.annualSalary * 1.5 ? 0.05 : 0),
    0.08,
    0.88,
  );
  const accepted = rng.nextFloat() < acceptChance;

  if (!accepted) {
    return {
      player,
      record: {
        ...record,
        status: 'rejected',
      },
    };
  }

  return {
    player: {
      ...player,
      contract: {
        ...player.contract,
        years: 1,
        annualSalary: roundCurrency(record.amount),
        totalValue: roundCurrency(record.amount),
        noTradeClause: false,
        noTradeClauseType: 'none',
        playerOption: false,
        teamOption: false,
        optOutYears: [],
        signingBonus: 0,
        buyoutAmount: 0,
        deferredMoney: [],
      },
    },
    record: {
      ...record,
      status: 'accepted',
      signingTeamId: record.teamId,
    },
  };
}

/**
 * AI team generates a contract offer for a free agent.
 * Returns null if the team cannot afford the player or has no interest.
 */
export function generateAIOffer(
  rng: GameRNG,
  teamId: string,
  player: GeneratedPlayer,
  teamBudget: number,
  currentPayroll: number,
  teamNeed: number,
  relationshipContext?: {
    relationship: GMRelationship;
    personality: GMPersonality;
    isTargetedByUser: boolean;
  },
): ContractOffer | null {
  const baseValue = calculateMarketValue(player);
  const availableBudget = teamBudget * spendingComfortFactor(teamBudget) - currentPayroll;

  if (availableBudget < baseValue * 0.45) return null;

  if (requiresStrongRosterFit(player, baseValue) && teamNeed < MODERATE_NEED_THRESHOLD) {
    return null;
  }

  if (teamBudget <= SMALL_MARKET_BUDGET_THRESHOLD && baseValue >= ELITE_FA_MARKET_VALUE && teamNeed < 80) {
    return null;
  }

  if (teamNeed < 25 && baseValue < ELITE_FA_MARKET_VALUE) {
    return null;
  }

  // Need adjustment: teams that need this position bid higher.
  const needMultiplier = 0.92 + (teamNeed / 100) * NEED_BONUS_FACTOR;
  const budgetMultiplier = marketAggressionFactor(teamBudget);

  // Jitter: each team's valuation varies slightly
  const jitterPct = rng.nextInt(OFFER_JITTER_MIN, OFFER_JITTER_MAX) / 100;
  let offeredAAV = Math.max(
    MINOR_LEAGUE_DEAL_AAV,
    Math.round(baseValue * needMultiplier * budgetMultiplier * (1 + jitterPct) * 100) / 100,
  );

  if (relationshipContext) {
    offeredAAV = adjustFABidForRelationship(
      offeredAAV,
      relationshipContext.relationship,
      relationshipContext.personality,
      relationshipContext.isTargetedByUser,
    );
  }

  offeredAAV = capAnnualSalary(offeredAAV);

  // If offered AAV exceeds what team can spend, reduce or bail
  if (offeredAAV > availableBudget) return null;

  const years = projectContractYears(rng, player);
  const totalValue = Math.round(offeredAAV * years * 100) / 100;
  const signingBonus = Math.round(offeredAAV * SIGNING_BONUS_FRACTION * 100) / 100;

  // Contract clauses based on player quality
  const ratingRatio = getOverall(player) / RATING_MAX;
  const noTradeClause = ratingRatio >= NTC_RATING_THRESHOLD;
  const playerOption = rng.nextFloat() < PLAYER_OPTION_CHANCE;
  const teamOption = !playerOption && rng.nextFloat() < TEAM_OPTION_CHANCE;

  return {
    teamId,
    playerId: player.id,
    years,
    annualSalary: offeredAAV,
    totalValue,
    noTradeClause,
    playerOption,
    teamOption,
    signingBonus,
  };
}

/**
 * Simulate one day of free agency. Players within their signing window
 * may receive and accept offers.
 */
export function simulateFADay(
  rng: GameRNG,
  market: FreeAgencyMarket,
  teamBudgets: Map<string, number>,
  teamPayrolls: Map<string, number>,
  teamNeeds: Map<string, Map<string, number>>,
  teamAttractiveness: FreeAgencyAttractiveness = new Map(),
  relationshipContexts: Map<string, RelationshipBidContext> = new Map(),
  userTeamNeeds: Map<string, number> = new Map(),
): FreeAgencyMarket {
  const nextDay = market.day + 1;
  const stillAvailable: FreeAgent[] = [];
  const newlySigned: FreeAgent[] = [...market.signedPlayers];

  // Mutable copy of payrolls for this day (signings affect remaining budget)
  const dayPayrolls = new Map(teamPayrolls);

  for (const fa of market.freeAgents) {
    // Already signed -- shouldn't happen but guard
    if (fa.signedWith !== null) {
      newlySigned.push(fa);
      continue;
    }

    const [windowStart, windowEnd] = SIGNING_WINDOWS[fa.demandLevel];

    // Not yet in signing window
    if (nextDay < windowStart) {
      stillAvailable.push(fa);
      continue;
    }

    // Past the market entirely -- force minor league deal
    if (nextDay > MARKET_DURATION_DAYS) {
      const teamIds = [...teamBudgets.keys()];
      const randomTeam = teamIds[rng.nextInt(0, teamIds.length - 1)]!;
      const minorDeal: ContractOffer = {
        teamId: randomTeam,
        playerId: fa.player.id,
        years: MINOR_LEAGUE_DEAL_YEARS,
        annualSalary: MINOR_LEAGUE_DEAL_AAV,
        totalValue: MINOR_LEAGUE_DEAL_AAV,
        noTradeClause: false,
        playerOption: false,
        teamOption: true,
        signingBonus: 0,
      };
      newlySigned.push({
        ...fa,
        signedWith: randomTeam,
        contract: minorDeal,
      });
      continue;
    }

    // In the signing window -- collect AI offers
    const offers: ContractOffer[] = [];

    for (const [teamId, budget] of teamBudgets) {
      const payroll = dayPayrolls.get(teamId) ?? 0;
      const posNeeds = teamNeeds.get(teamId);
      const need = posNeeds?.get(fa.player.position) ?? 50; // default moderate need
      const relationshipContext = relationshipContexts.get(teamId);

      const offer = generateAIOffer(
        rng,
        teamId,
        fa.player,
        budget,
        payroll,
        need,
        relationshipContext
          ? {
            ...relationshipContext,
            isTargetedByUser: (userTeamNeeds.get(fa.player.position) ?? 0) >= USER_TARGET_NEED_THRESHOLD,
          }
          : undefined,
      );
      if (offer !== null) {
        offers.push(offer);
      }
    }

    if (offers.length === 0) {
      // No offers yet -- stays on the market
      stillAvailable.push(fa);
      continue;
    }

    // Competition inflation: more bidders drive price up
    if (offers.length >= COMPETITION_TEAM_THRESHOLD) {
      const inflationPct =
        COMPETITION_INFLATION_MIN +
        rng.nextFloat() * (COMPETITION_INFLATION_MAX - COMPETITION_INFLATION_MIN);
      for (const offer of offers) {
        offer.annualSalary = capAnnualSalary(offer.annualSalary * (1 + inflationPct));
        offer.totalValue = Math.round(offer.annualSalary * offer.years * 100) / 100;
      }
    }

    // Signing probability ramps up through the window
    const windowLength = windowEnd - windowStart + 1;
    const daysIntoWindow = nextDay - windowStart;
    const signProbability = Math.min(1.0, (daysIntoWindow + 1) / windowLength);

    if (rng.nextFloat() > signProbability) {
      // Player decides to wait for a better offer
      stillAvailable.push({
        ...fa,
        interestedTeams: offers.map((o) => o.teamId),
      });
      continue;
    }

    // Players will take a slight discount for a better clubhouse situation.
    offers.sort((left, right) => {
      const rightAppeal = offerAppealScore(
        right,
        resolveAttractiveness(teamAttractiveness, right.teamId, fa.player.id),
      );
      const leftAppeal = offerAppealScore(
        left,
        resolveAttractiveness(teamAttractiveness, left.teamId, fa.player.id),
      );
      if (rightAppeal !== leftAppeal) {
        return rightAppeal - leftAppeal;
      }
      return right.annualSalary - left.annualSalary;
    });
    const bestOffer = offers[0]!;

    // Update day payrolls so the next signing accounts for this spend
    const currentTeamPayroll = dayPayrolls.get(bestOffer.teamId) ?? 0;
    dayPayrolls.set(bestOffer.teamId, currentTeamPayroll + bestOffer.annualSalary);

    newlySigned.push({
      ...fa,
      signedWith: bestOffer.teamId,
      contract: bestOffer,
      interestedTeams: offers.map((o) => o.teamId),
    });
  }

  return {
    season: market.season,
    freeAgents: stillAvailable,
    signedPlayers: newlySigned,
    day: nextDay,
  };
}

/**
 * Run the full free agency period (~60 days).
 * User offers (if any) are applied on day 1 before simulation begins.
 */
export function simulateFullFreeAgency(
  rng: GameRNG,
  market: FreeAgencyMarket,
  teamBudgets: Map<string, number>,
  teamPayrolls: Map<string, number>,
  teamNeeds: Map<string, Map<string, number>>,
  userTeamId: string,
  userOffers?: ContractOffer[],
  teamAttractiveness: FreeAgencyAttractiveness = new Map(),
): FreeAgencyMarket {
  let current = { ...market, day: 0, freeAgents: [...market.freeAgents], signedPlayers: [...market.signedPlayers] };
  const workingPayrolls = new Map(teamPayrolls);

  // Apply user offers first -- these are guaranteed attempts on day 0
  if (userOffers && userOffers.length > 0) {
    for (const offer of userOffers) {
      const result = makeUserOffer(current, offer, resolveAttractiveness(teamAttractiveness, userTeamId, offer.playerId));
      if (result.accepted) {
        // Find the FA and move to signed
        const idx = current.freeAgents.findIndex((fa) => fa.player.id === offer.playerId);
        if (idx !== -1) {
          const fa = current.freeAgents[idx]!;
          current.signedPlayers.push({
            ...fa,
            signedWith: userTeamId,
            contract: offer,
          });
          current.freeAgents.splice(idx, 1);

          // Update user's payroll
          const userPayroll = workingPayrolls.get(userTeamId) ?? 0;
          workingPayrolls.set(userTeamId, userPayroll + offer.annualSalary);
        }
      }
    }
  }

  // Remove user team from AI bidding pool
  const aiBudgets = new Map(teamBudgets);
  aiBudgets.delete(userTeamId);
  const aiNeeds = new Map(teamNeeds);
  aiNeeds.delete(userTeamId);
  const aiAttractiveness: FreeAgencyAttractiveness = typeof teamAttractiveness === 'function'
    ? (teamId: string, playerId: string) =>
      teamId === userTeamId ? 0 : teamAttractiveness(teamId, playerId)
    : new Map(
      Array.from(teamAttractiveness.entries()).filter(([teamId]) => teamId !== userTeamId),
    );

  // Simulate each day
  for (let day = 0; day < MARKET_DURATION_DAYS; day++) {
    current = simulateFADay(rng, current, aiBudgets, workingPayrolls, aiNeeds, aiAttractiveness);
  }

  // Force-sign anyone still unsigned with minor league deals
  const finalUnsigned = current.freeAgents.filter((fa) => fa.signedWith === null);
  for (const fa of finalUnsigned) {
    const teamIds = [...teamBudgets.keys()];
    const randomTeam = teamIds[rng.nextInt(0, teamIds.length - 1)]!;
    current.signedPlayers.push({
      ...fa,
      signedWith: randomTeam,
      contract: {
        teamId: randomTeam,
        playerId: fa.player.id,
        years: MINOR_LEAGUE_DEAL_YEARS,
        annualSalary: MINOR_LEAGUE_DEAL_AAV,
        totalValue: MINOR_LEAGUE_DEAL_AAV,
        noTradeClause: false,
        playerOption: false,
        teamOption: true,
        signingBonus: 0,
      },
    });
  }

  return {
    season: current.season,
    freeAgents: [],
    signedPlayers: current.signedPlayers,
    day: MARKET_DURATION_DAYS,
  };
}

/**
 * User makes an offer to a free agent.
 * Returns whether the player accepted and a reason string.
 */
export function makeUserOffer(
  market: FreeAgencyMarket,
  offer: ContractOffer,
  teamAttractiveness: number = 50,
): { accepted: boolean; reason: string } {
  const fa = market.freeAgents.find((f) => f.player.id === offer.playerId);
  if (!fa) {
    return { accepted: false, reason: 'Player is not available in the free agent market.' };
  }

  if (fa.signedWith !== null) {
    return { accepted: false, reason: 'Player has already signed with another team.' };
  }

  // Player evaluates offer vs their market value
  const expectedAAV = fa.marketValue;

  // Must meet at least 80% of expected value
  const MINIMUM_OFFER_RATIO = teamAttractiveness >= 80
    ? 0.76
    : teamAttractiveness >= 65
      ? 0.78
      : 0.8;
  if (offer.annualSalary < expectedAAV * MINIMUM_OFFER_RATIO) {
    return {
      accepted: false,
      reason: `Offer of $${offer.annualSalary.toFixed(2)}M is below the player's minimum ($${(expectedAAV * MINIMUM_OFFER_RATIO).toFixed(2)}M).`,
    };
  }

  // Years must be at least 1
  if (offer.years < 1) {
    return { accepted: false, reason: 'Contract must be at least 1 year.' };
  }

  // If the offer meets or exceeds market value, auto-accept
  if (offer.annualSalary >= expectedAAV) {
    return { accepted: true, reason: 'Player accepted the offer.' };
  }

  // Between 80-100% of market value: accept but note it was a discount
  if (teamAttractiveness >= 70) {
    return {
      accepted: true,
      reason: 'Player accepted a below-market offer because the clubhouse fit feels right.',
    };
  }

  return {
    accepted: true,
    reason: 'Player accepted a below-market offer, hoping to prove their worth.',
  };
}

/**
 * Get the top available free agents, optionally filtered by position.
 */
export function getTopFreeAgents(
  market: FreeAgencyMarket,
  position?: Position,
  limit: number = 25,
): FreeAgent[] {
  let available = market.freeAgents.filter((fa) => fa.signedWith === null);

  if (position !== undefined) {
    available = available.filter((fa) => fa.player.position === position);
  }

  return available
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, limit);
}
