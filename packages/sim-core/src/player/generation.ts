/**
 * @module generation
 * Player generation: creates full rosters of deterministic, varied players.
 * Uses GameRNG for all randomness; the JS global random API is never used.
 */

import type { TeamTenureEntry } from '@mbd/contracts';
import { GameRNG } from '../math/prng.js';
import { clampRating } from './attributes.js';
import type { HitterAttributes, PitcherAttributes } from './attributes.js';
import { calculateRule5EligibleAfterSeason } from '../roster/rule5.js';
import { assignPersonalityTraits } from './personalityTraits.js';
import { PITCHER_POSITIONS, ROSTER_LEVELS } from './enums.js';
import type { RosterLevel } from './enums.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Positions by category */
export const HITTER_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const;
export const ALL_POSITIONS = [...HITTER_POSITIONS, ...PITCHER_POSITIONS] as const;

export type Position = (typeof ALL_POSITIONS)[number];

// Re-exported from ./enums.js to break runtime cycle with ../roster/.
// Public surface unchanged — consumers can still import these from generation.ts.
export { PITCHER_POSITIONS, ROSTER_LEVELS };
export type { RosterLevel };

/** Development phases */
export const DEV_PHASES = ['Prospect', 'Ascent', 'Prime', 'Decline', 'Retirement'] as const;
export type DevPhase = (typeof DEV_PHASES)[number];
export const DEVELOPMENT_PROGRAMS = [
  'tools',
  'fundamentals',
  'refinement',
  'mlb_prep',
  'power',
  'contact',
  'speed',
  'defense',
  'control',
  'velocity',
  'breaking',
  'stamina',
] as const;
export type DevelopmentProgram = (typeof DEVELOPMENT_PROGRAMS)[number];

export const DEVELOPMENT_TRAJECTORIES = [
  'ahead_of_curve',
  'on_track',
  'below_expectations',
  'bust_risk',
] as const;
export type DevelopmentTrajectory = (typeof DEVELOPMENT_TRAJECTORIES)[number];

export const NO_TRADE_CLAUSE_TYPES = ['none', 'partial', 'full'] as const;
export type NoTradeClauseType = (typeof NO_TRADE_CLAUSE_TYPES)[number];

export interface DeferredMoneyInstallment {
  yearOffset: number;
  amount: number;
}

export interface ExtensionHistoryEntry {
  season: number;
  teamId: string;
  years: number;
  annualSalary: number;
  totalValue: number;
  outcome: 'accepted' | 'rejected' | 'countered';
}

export interface ArbitrationHistoryEntry {
  season: number;
  teamId: string;
  yearsOfService: number;
  teamOffer: number;
  playerAsk: number;
  projectedSalary: number;
  awardedSalary: number;
  teamWon: boolean;
}

export interface HoldoutState {
  season: number;
  teamId: string;
  salaryGap: number;
  holdoutDays: number;
  moraleHit: number;
}

/** Position distribution per team (target counts for a ~40-player active roster) */
const POSITION_TEMPLATE: Record<string, number> = {
  C: 2, '1B': 2, '2B': 2, '3B': 2, SS: 2,
  LF: 2, CF: 2, RF: 2, DH: 1,
  SP: 5, RP: 5, CL: 1,
};

/** Number of players per minor league level (per team) */
const MINOR_LEAGUE_SIZE: Record<string, number> = {
  AAA: 28,
  AA: 28,
  A_PLUS: 25,
  A: 25,
  ROOKIE: 20,
  INTERNATIONAL: 15,
};

/** Attribute baselines by position (center point for generation) */
const HITTER_BASELINES: Record<string, Partial<HitterAttributes>> = {
  C:   { contact: 260, power: 220, eye: 240, speed: 180, defense: 300, durability: 260 },
  '1B': { contact: 280, power: 320, eye: 260, speed: 160, defense: 200, durability: 280 },
  '2B': { contact: 300, power: 200, eye: 280, speed: 280, defense: 280, durability: 260 },
  '3B': { contact: 280, power: 300, eye: 260, speed: 200, defense: 260, durability: 280 },
  SS:  { contact: 280, power: 220, eye: 260, speed: 300, defense: 320, durability: 260 },
  LF:  { contact: 290, power: 300, eye: 260, speed: 260, defense: 220, durability: 270 },
  CF:  { contact: 280, power: 240, eye: 260, speed: 340, defense: 300, durability: 260 },
  RF:  { contact: 290, power: 310, eye: 260, speed: 240, defense: 240, durability: 270 },
  DH:  { contact: 300, power: 340, eye: 280, speed: 160, defense: 120, durability: 240 },
};

const PITCHER_BASELINES: Record<string, Partial<PitcherAttributes>> = {
  SP: { stuff: 280, control: 280, stamina: 320, velocity: 280, movement: 260 },
  RP: { stuff: 300, control: 260, stamina: 200, velocity: 300, movement: 280 },
  CL: { stuff: 320, control: 280, stamina: 180, velocity: 320, movement: 300 },
};

const SERVICE_TIME_DAYS_PER_YEAR = 172;
const PRE_ARB_SERVICE_YEARS_MAX = 2;
const ARB_SERVICE_YEARS_MAX = 6;
const PRE_ARB_OPENING_DAY_SALARY_MIN = 0.7;
const PRE_ARB_OPENING_DAY_SALARY_MAX = 2.0;
const ARB_OPENING_DAY_SALARY_MIN = 1.8;
const ARB_OPENING_DAY_SALARY_MAX = 19;
const FA_OPENING_DAY_SALARY_MIN = 2.7;
const FA_OPENING_DAY_SALARY_MAX = 34;
const OPENING_DAY_YOUNG_FA_DISCOUNT = 0.9;
const OPENING_DAY_ELITE_OVERALL_THRESHOLD = 395;
const OPENING_DAY_EXTENSION_CANDIDATE_THRESHOLD = 360;
const OPENING_DAY_WEAK_REGULAR_THRESHOLD = 255;
const OPENING_DAY_ARB_EXTENSION_CHANCE = 0.2;
const OPENING_DAY_PARTIAL_NTC_SALARY = 16;
const OPENING_DAY_FULL_NTC_SALARY = 22;
const OPENING_DAY_PLAYER_OPTION_SALARY = 18;
const OPENING_DAY_TEAM_OPTION_SALARY = 10;
const OPENING_DAY_FA_LONG_DEAL_THRESHOLD = 12;
const OPENING_DAY_FA_LONG_DEAL_YEARS_MIN = 2;
const OPENING_DAY_FA_LONG_DEAL_YEARS_MAX = 4;
const OPENING_DAY_ELITE_DEAL_YEARS_MIN = 5;
const OPENING_DAY_ELITE_DEAL_YEARS_MAX = 7;
const OPENING_DAY_CORE_DEAL_YEARS_MIN = 3;
const OPENING_DAY_CORE_DEAL_YEARS_MAX = 5;
const OPENING_DAY_SHORT_DEAL_YEARS_MIN = 1;
const OPENING_DAY_SHORT_DEAL_YEARS_MAX = 3;
const OPENING_DAY_VETERAN_RENTAL_AGE = 34;
const OPENING_DAY_VETERAN_RENTAL_YEARS_MIN = 1;
const OPENING_DAY_VETERAN_RENTAL_YEARS_MAX = 2;
const OPENING_DAY_AGING_VETERAN_AGE = 32;
const OPENING_DAY_AGING_VETERAN_YEARS_MIN = 1;
const OPENING_DAY_AGING_VETERAN_YEARS_MAX = 3;

const OPENING_DAY_ARB_SALARY_MULTIPLIERS: Record<number, number> = {
  3: 0.43,
  4: 0.6,
  5: 0.76,
  6: 0.92,
};

const OPENING_DAY_SERVICE_YEAR_RANGES = [
  { maxAge: 25, minYears: 0, maxYears: 2 },
  { maxAge: 27, minYears: 1, maxYears: 4 },
  { maxAge: 30, minYears: 3, maxYears: 7 },
  { maxAge: 33, minYears: 5, maxYears: 9 },
  { maxAge: Infinity, minYears: 7, maxYears: 11 },
] as const;

const OPENING_DAY_POSITION_VALUE_MULTIPLIERS: Partial<Record<Position, number>> = {
  SP: 1.14,
  CL: 1.08,
  C: 1.04,
  SS: 1.04,
  DH: 0.93,
};

// ---------------------------------------------------------------------------
// Name generation (nationality-aware)
// ---------------------------------------------------------------------------

const FIRST_NAMES_AMERICAN = [
  'James', 'John', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Thomas',
  'Daniel', 'Matthew', 'Anthony', 'Mark', 'Steven', 'Andrew', 'Joshua', 'Christopher',
  'Ryan', 'Brandon', 'Kevin', 'Jason', 'Justin', 'Tyler', 'Jake', 'Cody',
  'Austin', 'Bryce', 'Chase', 'Cole', 'Dylan', 'Ethan', 'Garrett', 'Hunter',
  'Logan', 'Luke', 'Mason', 'Nathan', 'Owen', 'Parker', 'Quinn', 'Riley',
  'Seth', 'Travis', 'Zach', 'Brett', 'Colby', 'Dalton', 'Eli', 'Finn',
];

const LAST_NAMES_AMERICAN = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson',
  'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin',
  'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee',
  'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott', 'Green',
  'Baker', 'Adams', 'Nelson', 'Hill', 'Ramirez', 'Campbell', 'Mitchell', 'Roberts',
  'Carter', 'Phillips', 'Evans', 'Turner', 'Torres', 'Parker', 'Collins', 'Edwards',
];

const FIRST_NAMES_LATIN = [
  'Carlos', 'Miguel', 'Jose', 'Luis', 'Pedro', 'Juan', 'Rafael', 'Fernando',
  'Roberto', 'Jorge', 'Alejandro', 'Ricardo', 'Francisco', 'Diego', 'Andres', 'Eduardo',
  'Pablo', 'Santiago', 'Adrian', 'Victor', 'Oscar', 'Hector', 'Manuel', 'Angel',
  'Enrique', 'Raul', 'Sergio', 'Ivan', 'Marco', 'Elvis', 'Yoenis', 'Yasmani',
  'Yoan', 'Vladimir', 'Wander', 'Ronald', 'Gleyber', 'Adalberto', 'Amed', 'Cristian',
];

const LAST_NAMES_LATIN = [
  'Rodriguez', 'Hernandez', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez',
  'Torres', 'Rivera', 'Gomez', 'Diaz', 'Cruz', 'Morales', 'Reyes', 'Gutierrez',
  'Ortiz', 'Ramos', 'Mendez', 'Flores', 'Alvarez', 'Castillo', 'Jimenez', 'Romero',
  'Vargas', 'Castro', 'Moreno', 'Nunez', 'Soto', 'Acuna', 'Devers', 'Abreu',
  'Cabrera', 'Pujols', 'Machado', 'Guerrero', 'Luzardo', 'Valdez', 'Contreras', 'Alonso',
];

const FIRST_NAMES_ASIAN = [
  'Shohei', 'Yu', 'Masahiro', 'Koji', 'Hideo', 'Ichiro', 'Hideki', 'Daisuke',
  'Kenta', 'Yoshinobu', 'Kodai', 'Roki', 'Shota', 'Yusei', 'Seiya', 'Yuki',
  'Hyun-jin', 'Shin-soo', 'Jung-ho', 'Ha-seong', 'Ji-man', 'Kwang-hyun',
  'Wei-Yin', 'Chien-Ming', 'Bruce', 'Kolten',
];

const LAST_NAMES_ASIAN = [
  'Ohtani', 'Darvish', 'Tanaka', 'Uehara', 'Nomo', 'Suzuki', 'Matsui', 'Matsuzaka',
  'Maeda', 'Yamamoto', 'Senga', 'Sasaki', 'Imanaga', 'Kikuchi', 'Fujinami', 'Yoshida',
  'Ryu', 'Choo', 'Kang', 'Kim', 'Choi', 'Park',
  'Chen', 'Wang', 'Lee', 'Wong',
];

type Nationality = 'american' | 'latin' | 'asian';

const NAME_POOLS: Record<Nationality, { first: readonly string[]; last: readonly string[] }> = {
  american: { first: FIRST_NAMES_AMERICAN, last: LAST_NAMES_AMERICAN },
  latin: { first: FIRST_NAMES_LATIN, last: LAST_NAMES_LATIN },
  asian: { first: FIRST_NAMES_ASIAN, last: LAST_NAMES_ASIAN },
};

const NATIONALITY_WEIGHTS: readonly Nationality[] = ['american', 'american', 'american', 'latin', 'latin', 'asian'];

// ---------------------------------------------------------------------------
// Player type
// ---------------------------------------------------------------------------

export interface GeneratedPlayer {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  position: Position;
  hitterAttributes: HitterAttributes;
  pitcherAttributes: PitcherAttributes | null;
  personality: {
    workEthic: number;
    mentalToughness: number;
    leadership: number;
    competitiveness: number;
  };
  contract: {
    years: number;
    annualSalary: number;
    totalValue?: number;
    noTradeClause: boolean;
    noTradeClauseType?: NoTradeClauseType;
    playerOption: boolean;
    teamOption: boolean;
    optOutYears?: number[];
    signingBonus?: number;
    buyoutAmount?: number;
    deferredMoney?: DeferredMoneyInstallment[];
  };
  rosterStatus: RosterLevel;
  developmentPhase: DevPhase;
  teamId: string;
  nationality: Nationality;
  overallRating: number;
  rule5EligibleAfterSeason: number;
  serviceTimeDays: number;
  optionYearsUsed: number;
  isOutOfOptions: boolean;
  minorLeagueLevel: Exclude<RosterLevel, 'MLB'> | null;
  ceiling?: number;
  floor?: number;
  developmentProgram?: DevelopmentProgram;
  developmentTrajectory?: DevelopmentTrajectory;
  extensionHistory?: ExtensionHistoryEntry[];
  arbitrationHistory: ArbitrationHistoryEntry[];
  holdoutState: HoldoutState | null;
  superTwoQualified: boolean;
  teamTenures: TeamTenureEntry[];
  priorSeasonGamesMissed: number;
  priorSeasonEstimatedWar: number | null;
  careerShutouts: number;
  personalityTraits?: string[];
  potentialRating?: number;
}

// ---------------------------------------------------------------------------
// ID generation (deterministic UUID-like from RNG)
// ---------------------------------------------------------------------------

function generateId(rng: GameRNG): string {
  const hex = () => rng.nextInt(0, 0xffff).toString(16).padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-${hex()}-${hex()}${hex()}${hex()}`;
}

// ---------------------------------------------------------------------------
// Core generation functions
// ---------------------------------------------------------------------------

function pickNationality(rng: GameRNG): Nationality {
  const idx = rng.nextInt(0, NATIONALITY_WEIGHTS.length - 1);
  return NATIONALITY_WEIGHTS[idx]!;
}

function generateName(rng: GameRNG, nationality: Nationality): { firstName: string; lastName: string } {
  const pool = NAME_POOLS[nationality];
  const firstName = pool.first[rng.nextInt(0, pool.first.length - 1)]!;
  const lastName = pool.last[rng.nextInt(0, pool.last.length - 1)]!;
  return { firstName, lastName };
}

function generateAge(rng: GameRNG, rosterLevel: RosterLevel): number {
  const ageRanges: Record<RosterLevel, [number, number]> = {
    MLB: [24, 38],
    AAA: [23, 32],
    AA: [21, 27],
    A_PLUS: [20, 25],
    A: [19, 23],
    ROOKIE: [18, 21],
    INTERNATIONAL: [17, 20],
  };
  const [min, max] = ageRanges[rosterLevel];
  return rng.nextInt(min, max);
}

function getDevPhase(age: number): DevPhase {
  if (age <= 22) return 'Prospect';
  if (age <= 26) return 'Ascent';
  if (age <= 31) return 'Prime';
  if (age <= 37) return 'Decline';
  return 'Retirement';
}

function generateHitterAttributes(
  rng: GameRNG,
  position: string,
  talentMultiplier: number,
): HitterAttributes {
  const baseline = HITTER_BASELINES[position] ?? HITTER_BASELINES['DH']!;

  const attr = (key: keyof HitterAttributes): number => {
    const base = (baseline[key] ?? 250) * talentMultiplier;
    const variance = rng.nextGaussian(0, 50);
    return clampRating(base + variance);
  };

  return {
    contact: attr('contact'),
    power: attr('power'),
    eye: attr('eye'),
    speed: attr('speed'),
    defense: attr('defense'),
    durability: attr('durability'),
  };
}

function generatePitcherAttributes(
  rng: GameRNG,
  position: string,
  talentMultiplier: number,
): PitcherAttributes {
  const baseline = PITCHER_BASELINES[position] ?? PITCHER_BASELINES['RP']!;

  const attr = (key: keyof PitcherAttributes): number => {
    const base = (baseline[key] ?? 250) * talentMultiplier;
    const variance = rng.nextGaussian(0, 50);
    return clampRating(base + variance);
  };

  return {
    stuff: attr('stuff'),
    control: attr('control'),
    stamina: attr('stamina'),
    velocity: attr('velocity'),
    movement: attr('movement'),
  };
}

function generatePersonality(rng: GameRNG) {
  return {
    workEthic: rng.nextInt(20, 100),
    mentalToughness: rng.nextInt(20, 100),
    leadership: rng.nextInt(10, 100),
    competitiveness: rng.nextInt(20, 100),
  };
}

function generateContract(rng: GameRNG, rosterLevel: RosterLevel, overallRating: number) {
  if (rosterLevel !== 'MLB') {
    return {
      years: 0,
      annualSalary: 0.5,
      totalValue: 0.5,
      noTradeClause: false,
      noTradeClauseType: 'none' as const,
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    };
  }

  const starBonus = Math.max(0, overallRating - 380) / 40;
  const baseSalary = (overallRating / 550) * 15 + starBonus + rng.nextGaussian(0.7, 2.4);
  const salary = Math.max(0.7, Math.round(baseSalary * 10) / 10);
  const years = overallRating >= 390
    ? rng.nextInt(1, 4)
    : overallRating >= 330
      ? rng.nextInt(1, 3)
      : rng.nextInt(1, 3);
  const noTradeClause = salary > 20 && rng.nextFloat() > 0.5;
  const noTradeClauseType: NoTradeClauseType = noTradeClause
    ? (salary > 28 ? 'full' : 'partial')
    : 'none';

  return {
    years,
    annualSalary: salary,
    totalValue: Math.round(salary * years * 10) / 10,
    noTradeClause,
    noTradeClauseType,
    playerOption: rng.nextFloat() > 0.85,
    teamOption: rng.nextFloat() > 0.8,
    optOutYears: [],
    signingBonus: 0,
    buyoutAmount: 0,
    deferredMoney: [],
  };
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function deriveStableSeed(baseSeed: number, key: string): number {
  let hash = baseSeed | 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 1_664_525) + 1_013_904_223;
    hash |= 0;
  }

  if (hash === 0) {
    return 1;
  }

  return hash;
}

function openingDayServiceYearRange(age: number) {
  return OPENING_DAY_SERVICE_YEAR_RANGES.find((range) => age <= range.maxAge)
    ?? OPENING_DAY_SERVICE_YEAR_RANGES[OPENING_DAY_SERVICE_YEAR_RANGES.length - 1]!;
}

function projectOpeningDayServiceYears(rng: GameRNG, player: GeneratedPlayer): number {
  const range = openingDayServiceYearRange(player.age);
  let serviceYears = rng.nextInt(range.minYears, range.maxYears);

  if (player.overallRating >= OPENING_DAY_ELITE_OVERALL_THRESHOLD) {
    serviceYears += 1;
  } else if (player.overallRating <= OPENING_DAY_WEAK_REGULAR_THRESHOLD) {
    serviceYears -= 1;
  }

  return Math.max(0, Math.min(12, serviceYears));
}

function openingDayAgeValueMultiplier(age: number): number {
  if (age <= 29) return 1.02;
  if (age <= 32) return 0.965;
  if (age <= 35) return 0.83;
  return 0.7;
}

function openingDayPositionValueMultiplier(position: Position): number {
  return OPENING_DAY_POSITION_VALUE_MULTIPLIERS[position] ?? 1;
}

function calculateOpeningDayFreeAgentAav(player: GeneratedPlayer): number {
  const ratingBand = Math.max(0, Math.min(1.18, (player.overallRating - 248) / 168));
  const baseValue = 4.8 + (ratingBand * 28.2);

  return baseValue
    * openingDayAgeValueMultiplier(player.age)
    * openingDayPositionValueMultiplier(player.position);
}

function calculateOpeningDayAnnualSalary(
  rng: GameRNG,
  player: GeneratedPlayer,
  serviceYears: number,
): number {
  const jitter = 0.9 + (rng.nextFloat() * 0.2);
  const freeAgentAav = calculateOpeningDayFreeAgentAav(player);

  if (serviceYears <= PRE_ARB_SERVICE_YEARS_MAX) {
    const growth = Math.max(0, Math.min(1, (player.overallRating - 248) / 210));
    return roundCurrency(
      Math.max(
        PRE_ARB_OPENING_DAY_SALARY_MIN,
        Math.min(
          PRE_ARB_OPENING_DAY_SALARY_MAX,
          (0.74 + (growth * 1.15)) * jitter,
        ),
      ),
    );
  }

  if (serviceYears <= ARB_SERVICE_YEARS_MAX) {
    const arbYear = Math.min(serviceYears, ARB_SERVICE_YEARS_MAX);
    const fallbackArbMultiplier = OPENING_DAY_ARB_SALARY_MULTIPLIERS[ARB_SERVICE_YEARS_MAX]!;
    const arbMultiplier = OPENING_DAY_ARB_SALARY_MULTIPLIERS[arbYear] ?? fallbackArbMultiplier;
    return roundCurrency(
      Math.max(
        ARB_OPENING_DAY_SALARY_MIN,
        Math.min(ARB_OPENING_DAY_SALARY_MAX, freeAgentAav * arbMultiplier * jitter),
      ),
    );
  }

  const discountedAav = player.age <= 29 && player.overallRating >= 350
    ? freeAgentAav * OPENING_DAY_YOUNG_FA_DISCOUNT
    : freeAgentAav;

  return roundCurrency(
    Math.max(
      FA_OPENING_DAY_SALARY_MIN,
      Math.min(FA_OPENING_DAY_SALARY_MAX, discountedAav * jitter),
    ),
  );
}

function calculateOpeningDayContractYears(
  rng: GameRNG,
  player: GeneratedPlayer,
  serviceYears: number,
  annualSalary: number,
): number {
  if (serviceYears <= PRE_ARB_SERVICE_YEARS_MAX) {
    return 1;
  }

  if (serviceYears <= ARB_SERVICE_YEARS_MAX) {
    const youngCorePlayer = player.age <= 29
      && player.overallRating >= OPENING_DAY_EXTENSION_CANDIDATE_THRESHOLD;
    if (youngCorePlayer && rng.nextFloat() < OPENING_DAY_ARB_EXTENSION_CHANCE) {
      return rng.nextInt(4, 6);
    }
    return 1;
  }

  if (player.age <= 29 && player.overallRating >= OPENING_DAY_ELITE_OVERALL_THRESHOLD) {
    return rng.nextInt(OPENING_DAY_ELITE_DEAL_YEARS_MIN, OPENING_DAY_ELITE_DEAL_YEARS_MAX);
  }

  if (player.age <= 31 && player.overallRating >= 350) {
    return rng.nextInt(OPENING_DAY_CORE_DEAL_YEARS_MIN, OPENING_DAY_CORE_DEAL_YEARS_MAX);
  }

  if (player.age >= OPENING_DAY_VETERAN_RENTAL_AGE) {
    return rng.nextInt(OPENING_DAY_VETERAN_RENTAL_YEARS_MIN, OPENING_DAY_VETERAN_RENTAL_YEARS_MAX);
  }

  if (player.age >= OPENING_DAY_AGING_VETERAN_AGE) {
    return rng.nextInt(OPENING_DAY_AGING_VETERAN_YEARS_MIN, OPENING_DAY_AGING_VETERAN_YEARS_MAX);
  }

  if (annualSalary >= OPENING_DAY_FA_LONG_DEAL_THRESHOLD) {
    return rng.nextInt(OPENING_DAY_FA_LONG_DEAL_YEARS_MIN, OPENING_DAY_FA_LONG_DEAL_YEARS_MAX);
  }

  return rng.nextInt(OPENING_DAY_SHORT_DEAL_YEARS_MIN, OPENING_DAY_SHORT_DEAL_YEARS_MAX);
}

function buildOpeningDayMlbContract(
  rng: GameRNG,
  player: GeneratedPlayer,
): Pick<GeneratedPlayer, 'serviceTimeDays' | 'contract'> {
  const serviceYears = projectOpeningDayServiceYears(rng, player);
  const annualSalary = calculateOpeningDayAnnualSalary(rng, player, serviceYears);
  const years = calculateOpeningDayContractYears(rng, player, serviceYears, annualSalary);
  const serviceTimeDays = (serviceYears * SERVICE_TIME_DAYS_PER_YEAR) + rng.nextInt(0, SERVICE_TIME_DAYS_PER_YEAR - 1);
  const noTradeClause = serviceYears > ARB_SERVICE_YEARS_MAX
    && annualSalary >= OPENING_DAY_PARTIAL_NTC_SALARY
    && player.overallRating >= 360
    && rng.nextFloat() > 0.45;
  const noTradeClauseType: NoTradeClauseType = !noTradeClause
    ? 'none'
    : annualSalary >= OPENING_DAY_FULL_NTC_SALARY
      ? 'full'
      : 'partial';
  const playerOption = serviceYears > ARB_SERVICE_YEARS_MAX
    && annualSalary >= OPENING_DAY_PLAYER_OPTION_SALARY
    && rng.nextFloat() > 0.72;
  const teamOption = !playerOption
    && serviceYears > ARB_SERVICE_YEARS_MAX
    && annualSalary >= OPENING_DAY_TEAM_OPTION_SALARY
    && rng.nextFloat() > 0.76;

  return {
    serviceTimeDays,
    contract: {
      years,
      annualSalary,
      totalValue: roundCurrency(annualSalary * years),
      noTradeClause,
      noTradeClauseType,
      playerOption,
      teamOption,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
  };
}

function seedOpeningDayMlbContracts(
  baseSeed: number,
  teamId: string,
  players: GeneratedPlayer[],
): GeneratedPlayer[] {
  const contractRng = new GameRNG(deriveStableSeed(baseSeed, `${teamId}:opening-day-contracts`));

  return players.map((player) => {
    if (player.rosterStatus !== 'MLB') {
      return player;
    }

    const contractState = buildOpeningDayMlbContract(contractRng.fork(), player);
    return {
      ...player,
      serviceTimeDays: contractState.serviceTimeDays,
      contract: contractState.contract,
    };
  });
}

// ---------------------------------------------------------------------------
// Talent multiplier by roster level
// ---------------------------------------------------------------------------

const TALENT_MULTIPLIERS: Record<RosterLevel, [number, number]> = {
  MLB: [0.85, 1.15],
  AAA: [0.70, 1.00],
  AA: [0.55, 0.85],
  A_PLUS: [0.45, 0.75],
  A: [0.35, 0.65],
  ROOKIE: [0.25, 0.55],
  INTERNATIONAL: [0.20, 0.50],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Generate a single player for a given position, team, and roster level. */
export function generatePlayer(
  rng: GameRNG,
  position: Position,
  teamId: string,
  rosterLevel: RosterLevel,
): GeneratedPlayer {
  const nationality = pickNationality(rng);
  const { firstName, lastName } = generateName(rng, nationality);
  const age = generateAge(rng, rosterLevel);
  const devPhase = getDevPhase(age);

  const [tMin, tMax] = TALENT_MULTIPLIERS[rosterLevel];
  const talentMultiplier = tMin + rng.nextFloat() * (tMax - tMin);

  const isPitcher = (PITCHER_POSITIONS as readonly string[]).includes(position);
  const hitterAttributes = generateHitterAttributes(rng, position, isPitcher ? 0.5 : talentMultiplier);
  const pitcherAttributes = isPitcher ? generatePitcherAttributes(rng, position, talentMultiplier) : null;

  // Calculate overall rating
  let overallRating: number;
  if (isPitcher && pitcherAttributes) {
    const { stuff, control, stamina, velocity, movement } = pitcherAttributes;
    overallRating = Math.round(stuff * 0.30 + control * 0.25 + stamina * 0.15 + velocity * 0.15 + movement * 0.15);
  } else {
    const { contact, power, eye, speed, defense, durability } = hitterAttributes;
    overallRating = Math.round(
      contact * 0.25 + power * 0.20 + eye * 0.15 + speed * 0.15 + defense * 0.15 + durability * 0.10
    );
  }

  const contract = generateContract(rng, rosterLevel, overallRating);
  const minorLeagueLevel = rosterLevel === 'MLB' ? null : rosterLevel;
  const personality = generatePersonality(rng);
  const personalityTraits = assignPersonalityTraits(rng, {
    age,
    position,
    rosterStatus: rosterLevel,
    personality,
  });

  return {
    id: generateId(rng),
    firstName,
    lastName,
    age,
    position,
    hitterAttributes,
    pitcherAttributes,
    personality,
    contract,
    rosterStatus: rosterLevel,
    developmentPhase: devPhase,
    teamId,
    nationality,
    overallRating,
    rule5EligibleAfterSeason: calculateRule5EligibleAfterSeason(1, age),
    serviceTimeDays: 0,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel,
    arbitrationHistory: [],
    holdoutState: null,
    superTwoQualified: false,
    teamTenures: [],
    priorSeasonGamesMissed: 0,
    priorSeasonEstimatedWar: null,
    careerShutouts: 0,
    personalityTraits,
  };
}

/**
 * Generate a full roster for a team: MLB active roster + full minor league system.
 * Returns ~170 players per team.
 */
export function generateTeamRoster(rng: GameRNG, teamId: string): GeneratedPlayer[] {
  const players: GeneratedPlayer[] = [];

  // MLB roster: use position template
  for (const [pos, count] of Object.entries(POSITION_TEMPLATE)) {
    for (let i = 0; i < count; i++) {
      players.push(generatePlayer(rng, pos as Position, teamId, 'MLB'));
    }
  }

  // Minor leagues
  for (const [level, size] of Object.entries(MINOR_LEAGUE_SIZE)) {
    const positions = [...HITTER_POSITIONS, ...PITCHER_POSITIONS];
    for (let i = 0; i < size; i++) {
      const pos = positions[i % positions.length]!;
      players.push(generatePlayer(rng, pos as Position, teamId, level as RosterLevel));
    }
  }

  // KC BBQ Fountains special overrides — slightly overpowered franchise
  if (teamId === 'kc') {
    applyKCOverrides(players);
  }

  return seedOpeningDayMlbContracts(rng.getSeed(), teamId, players);
}

// ---------------------------------------------------------------------------
// Kansas City BBQ Fountains — franchise cornerstone overrides
// ---------------------------------------------------------------------------

const KC_SP_DH_OVERALL = 504;    // ~75 display
const KC_SP_DH_CEILING = 550;    // ~80 display
const KC_SS_OVERALL = 458;       // ~70 display
const KC_SS_CEILING = 550;       // ~80 display
const KC_PITCHING_BOOST = 40;    // +5-8 display points to SP staff
const KC_DEFENSE_BOOST = 35;     // +5-6 display points to infield defense

function applyKCOverrides(players: GeneratedPlayer[]): void {
  // Find the first SP on the MLB roster — make them the 23yo SP/DH phenom
  const mlbSP = players.find(p => p.position === 'SP' && p.rosterStatus === 'MLB');
  if (mlbSP) {
    mlbSP.age = 23;
    mlbSP.firstName = 'Marcus';
    mlbSP.lastName = 'Fontaine';
    mlbSP.overallRating = KC_SP_DH_OVERALL;
    mlbSP.ceiling = KC_SP_DH_CEILING;
    mlbSP.developmentPhase = 'Ascent';
    if (mlbSP.pitcherAttributes) {
      mlbSP.pitcherAttributes.stuff = 78;
      mlbSP.pitcherAttributes.control = 72;
      mlbSP.pitcherAttributes.stamina = 70;
      mlbSP.pitcherAttributes.velocity = 76;
      mlbSP.pitcherAttributes.movement = 74;
    }
    // Also a DH-caliber bat
    mlbSP.hitterAttributes.contact = 65;
    mlbSP.hitterAttributes.power = 70;
    mlbSP.hitterAttributes.eye = 60;
  }

  // Find the first SS on the MLB roster — make them the 25yo A-Rod archetype
  const mlbSS = players.find(p => p.position === 'SS' && p.rosterStatus === 'MLB');
  if (mlbSS) {
    mlbSS.age = 25;
    mlbSS.firstName = 'Alejandro';
    mlbSS.lastName = 'Fuentes';
    mlbSS.overallRating = KC_SS_OVERALL;
    mlbSS.ceiling = KC_SS_CEILING;
    mlbSS.developmentPhase = 'Ascent';
    mlbSS.hitterAttributes.contact = 72;
    mlbSS.hitterAttributes.power = 74;
    mlbSS.hitterAttributes.eye = 68;
    mlbSS.hitterAttributes.speed = 70;
    mlbSS.hitterAttributes.defense = 75;
    mlbSS.hitterAttributes.durability = 72;
  }

  // Boost all MLB starting pitchers
  for (const p of players) {
    if (p.rosterStatus === 'MLB' && p.position === 'SP' && p.pitcherAttributes && p !== mlbSP) {
      p.pitcherAttributes.stuff = Math.min(80, p.pitcherAttributes.stuff + Math.round(KC_PITCHING_BOOST / 8));
      p.pitcherAttributes.control = Math.min(80, p.pitcherAttributes.control + Math.round(KC_PITCHING_BOOST / 8));
      p.pitcherAttributes.velocity = Math.min(80, p.pitcherAttributes.velocity + Math.round(KC_PITCHING_BOOST / 8));
      p.pitcherAttributes.movement = Math.min(80, p.pitcherAttributes.movement + Math.round(KC_PITCHING_BOOST / 8));
      p.overallRating = Math.min(550, p.overallRating + KC_PITCHING_BOOST);
    }
  }

  // Boost infield defense across the board
  const infieldPositions = new Set(['SS', '2B', '3B', '1B', 'C']);
  for (const p of players) {
    if (p.rosterStatus === 'MLB' && infieldPositions.has(p.position)) {
      p.hitterAttributes.defense = Math.min(80, p.hitterAttributes.defense + Math.round(KC_DEFENSE_BOOST / 6));
    }
  }
}

/**
 * Generate all players for the entire league (32 teams).
 * Returns ~5,400 total players.
 */
export function generateLeaguePlayers(rng: GameRNG, teamIds: string[]): GeneratedPlayer[] {
  const allPlayers: GeneratedPlayer[] = [];
  for (const teamId of teamIds) {
    const roster = generateTeamRoster(rng, teamId);
    allPlayers.push(...roster);
  }
  return allPlayers;
}
