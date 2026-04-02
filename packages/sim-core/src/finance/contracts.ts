/**
 * @module contracts
 * Contract, arbitration, payroll, and team finance system.
 * Uses GameRNG for all randomness — Math.random() is NEVER used.
 */

import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { PITCHER_POSITIONS } from '../player/generation.js';
import { hitterOverall, pitcherOverall } from '../player/attributes.js';

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
export const ARB_LAST_YEAR = 6;

/** Max salary the arbitration base formula can produce (millions) */
export const ARB_MAX_BASE_SALARY = 20;

/** Divisor in arbitration base formula: (overall / ARB_DIVISOR) * ARB_MAX_BASE_SALARY */
export const ARB_DIVISOR = 550;

/** Arbitration year multipliers (service year -> multiplier) */
export const ARB_YEAR_MULTIPLIERS: Record<number, number> = {
  3: 0.4,
  4: 0.6,
  5: 0.8,
  6: 1.0,
};

/** Performance variance cap for arbitration (+/- this fraction) */
export const ARB_PERFORMANCE_VARIANCE = 0.20;

/** Probability that the team wins an arbitration hearing (0-1) */
export const ARB_TEAM_WIN_PROBABILITY = 0.60;

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
  tbr: 'tb',
  kcr: 'kc',
  sdp: 'sd',
  sfg: 'sf',
  ana: 'laa',
  mon: 'mtl',
};

/** Team-to-market-config mapping */
export const TEAM_MARKETS: Record<string, MarketConfig> = {
  // Large markets
  nyy: LARGE_MARKET,
  lad: LARGE_MARKET,
  nym: LARGE_MARKET,
  chc: LARGE_MARKET,
  bos: LARGE_MARKET,
  sf:  LARGE_MARKET,
  phi: LARGE_MARKET,
  hou: LARGE_MARKET,
  // Medium markets
  atl: MEDIUM_MARKET,
  stl: MEDIUM_MARKET,
  tex: MEDIUM_MARKET,
  sd:  MEDIUM_MARKET,
  sea: MEDIUM_MARKET,
  laa: MEDIUM_MARKET,
  tor: MEDIUM_MARKET,
  wsh: MEDIUM_MARKET,
  min: MEDIUM_MARKET,
  cle: MEDIUM_MARKET,
  det: MEDIUM_MARKET,
  ari: MEDIUM_MARKET,
  col: MEDIUM_MARKET,
  // Small markets
  mil: SMALL_MARKET,
  pit: SMALL_MARKET,
  cin: SMALL_MARKET,
  tb:  SMALL_MARKET,
  oak: SMALL_MARKET,
  kc:  SMALL_MARKET,
  bal: SMALL_MARKET,
  mia: SMALL_MARKET,
  cws: SMALL_MARKET,
  por: SMALL_MARKET,
  // Special
  mtl: { size: 'small', budgetMin: 155, budgetMax: 165 },
};

function normalizeTeamMarketKey(teamId: string): string {
  const normalized = teamId.trim().toLowerCase();
  return TEAM_MARKET_ALIASES[normalized] ?? normalized;
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

export interface ArbitrationCase {
  playerId: string;
  currentSalary: number;
  teamOffer: number;
  playerAsk: number;
  projectedSalary: number;
  yearsOfService: number;
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

export function serviceDaysToYears(serviceTimeDays: number): number {
  return Math.floor(Math.max(0, serviceTimeDays) / 172);
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
  const scaled = base * multiplier;

  // Performance variance: +/- 20% determined by RNG
  const varianceFactor = 1 + (rng.nextFloat() * 2 - 1) * ARB_PERFORMANCE_VARIANCE;
  const projectedSalary = Math.round(Math.max(LEAGUE_MINIMUM_SALARY, scaled * varianceFactor) * 100) / 100;

  // Team offers below projected, player asks above
  const spreadFraction = 0.10 + rng.nextFloat() * 0.10; // 10-20% spread each way
  const teamOffer = Math.round(projectedSalary * (1 - spreadFraction) * 100) / 100;
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
  const market = TEAM_MARKETS[normalizeTeamMarketKey(teamId)];
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
 * Arb eligibility: 3-6 years of service, on the given team.
 */
export function getArbEligiblePlayers(
  players: GeneratedPlayer[],
  teamId: string,
  serviceTime: Map<string, number>,
): GeneratedPlayer[] {
  return players.filter((p) => {
    if (p.teamId !== teamId) return false;
    const years = serviceTime.get(p.id) ?? serviceDaysToYears(p.serviceTimeDays);
    return years >= ARB_FIRST_YEAR && years <= ARB_LAST_YEAR;
  });
}
