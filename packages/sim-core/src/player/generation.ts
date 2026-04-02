/**
 * @module generation
 * Player generation: creates full rosters of deterministic, varied players.
 * Uses GameRNG for all randomness — Math.random() is NEVER used.
 */

import type { GameRNG } from '../math/prng.js';
import { clampRating } from './attributes.js';
import type { HitterAttributes, PitcherAttributes } from './attributes.js';
import { calculateRule5EligibleAfterSeason } from '../roster/rule5.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Positions by category */
export const HITTER_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const;
export const PITCHER_POSITIONS = ['SP', 'RP', 'CL'] as const;
export const ALL_POSITIONS = [...HITTER_POSITIONS, ...PITCHER_POSITIONS] as const;

export type Position = (typeof ALL_POSITIONS)[number];

/** Roster level definitions */
export const ROSTER_LEVELS = ['MLB', 'AAA', 'AA', 'A_PLUS', 'A', 'ROOKIE', 'INTERNATIONAL'] as const;
export type RosterLevel = (typeof ROSTER_LEVELS)[number];

/** Development phases */
export const DEV_PHASES = ['Prospect', 'Ascent', 'Prime', 'Decline', 'Retirement'] as const;
export type DevPhase = (typeof DEV_PHASES)[number];

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
    noTradeClause: boolean;
    playerOption: boolean;
    teamOption: boolean;
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
    return { years: 0, annualSalary: 0.5, noTradeClause: false, playerOption: false, teamOption: false };
  }

  const baseSalary = (overallRating / 550) * 25 + rng.nextGaussian(3, 5);
  const salary = Math.max(0.7, Math.round(baseSalary * 10) / 10);
  const years = rng.nextInt(1, 6);

  return {
    years,
    annualSalary: salary,
    noTradeClause: salary > 20 && rng.nextFloat() > 0.5,
    playerOption: rng.nextFloat() > 0.85,
    teamOption: rng.nextFloat() > 0.8,
  };
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

  return {
    id: generateId(rng),
    firstName,
    lastName,
    age,
    position,
    hitterAttributes,
    pitcherAttributes,
    personality: generatePersonality(rng),
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

  return players;
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
