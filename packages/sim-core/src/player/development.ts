/**
 * @module development
 * Ornstein-Uhlenbeck aging curves for player development.
 * Each attribute evolves per-season via mean reversion, drift, and stochastic noise.
 * Uses GameRNG for all randomness; the JS global random API is never used.
 */

import type { GameRNG } from '../math/prng.js';
import { clampRating, hitterOverall, pitcherOverall } from './attributes.js';
import type { HitterAttributes, PitcherAttributes } from './attributes.js';
import type { GeneratedPlayer, DevPhase, Position } from './generation.js';
import { PITCHER_POSITIONS } from './generation.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Mean reversion strength (theta) per dev phase */
const THETA: Record<DevPhase, number> = {
  Prospect: 0.10,
  Ascent: 0.12,
  Prime: 0.08,
  Decline: 0.10,
  Retirement: 0.15,
};

/** Base drift per dev phase (added each season, internal scale units) */
const BASE_DRIFT: Record<DevPhase, number> = {
  Prospect: 12,
  Ascent: 20,
  Prime: 0,
  Decline: -15,
  Retirement: -35,
};

/** Noise standard deviation per dev phase */
const VOLATILITY: Record<DevPhase, number> = {
  Prospect: 30,
  Ascent: 18,
  Prime: 10,
  Decline: 16,
  Retirement: 22,
};

/** Peak age ranges per hitter attribute: [startPeak, endPeak] */
const HITTER_PEAK_AGES: Record<keyof HitterAttributes, [number, number]> = {
  contact: [27, 29],
  power: [28, 31],
  eye: [28, 32],
  speed: [23, 26],
  defense: [26, 30],
  durability: [25, 28],
};

/** Peak age ranges per pitcher attribute */
const PITCHER_PEAK_AGES: Record<keyof PitcherAttributes, [number, number]> = {
  stuff: [26, 30],
  control: [29, 33],
  stamina: [25, 28],
  velocity: [24, 27],
  movement: [28, 32],
};

/** Work ethic scaling range for positive development */
const WORK_ETHIC_FLOOR = 0.7;
const WORK_ETHIC_RANGE = 0.6;

/** Mental toughness decline reduction cap */
const MENTAL_TOUGHNESS_DECLINE_REDUCTION = 0.2;

// -- Retirement constants --

/** Minimum age for normal retirement consideration */
const RETIREMENT_MIN_AGE = 32;

/** Age at which base retirement chance begins */
const RETIREMENT_BASE_AGE = 38;

/** Base retirement probability at RETIREMENT_BASE_AGE */
const RETIREMENT_BASE_CHANCE = 0.20;

/** Additional retirement probability per year over RETIREMENT_BASE_AGE */
const RETIREMENT_YEAR_INCREMENT = 0.15;

/** Rating threshold that adds retirement chance regardless of age */
const RETIREMENT_LOW_RATING = 100;

/** Extra retirement chance when rating is below RETIREMENT_LOW_RATING */
const RETIREMENT_LOW_RATING_BONUS = 0.30;

/** Durability/stamina threshold that adds retirement chance */
const RETIREMENT_FRAGILITY_THRESHOLD = 80;

/** Extra retirement chance when durability/stamina is below threshold */
const RETIREMENT_FRAGILITY_BONUS = 0.10;

/** Rating below which even young players can retire */
const RETIREMENT_CATASTROPHIC_RATING = 60;

// -- Mental toughness growth constants --

/** Asymptotic ceiling for mental toughness */
const MT_CEILING = 100;

/** Base growth rate per season for mental toughness */
const MT_GROWTH_RATE = 0.08;

/** Noise stddev for mental toughness growth */
const MT_NOISE_STDDEV = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A targeted development program boosting one attribute */
export interface DevProgram {
  targetAttribute: string;
  intensity: number; // 0.5 - 2.0
  seasonsRemaining: number;
}

// ---------------------------------------------------------------------------
// Phase determination
// ---------------------------------------------------------------------------

/** Determine the development phase for a given age. */
export function updateDevPhase(age: number): DevPhase {
  if (age <= 22) return 'Prospect';
  if (age <= 26) return 'Ascent';
  if (age <= 31) return 'Prime';
  if (age <= 37) return 'Decline';
  return 'Retirement';
}

// ---------------------------------------------------------------------------
// OU step helpers
// ---------------------------------------------------------------------------

/**
 * Compute the "peak target" for an attribute given the player's age
 * and the attribute's peak age range. Before the peak window the target
 * is the player's current value scaled upward; during peak it equals
 * the current value (stable); after peak it decays.
 */
function peakTarget(
  current: number,
  age: number,
  peakStart: number,
  peakEnd: number,
): number {
  if (age < peakStart) {
    // Pre-peak: target is moderately above current (room to grow)
    const yearsUntilPeak = peakStart - age;
    const growthFactor = Math.min(1.3, 1.0 + yearsUntilPeak * 0.04);
    return Math.min(550, current * growthFactor);
  }
  if (age <= peakEnd) {
    // In peak window: stable around current
    return current;
  }
  // Post-peak: target below current (mean reversion pulls down)
  const yearsPostPeak = age - peakEnd;
  const decayFactor = Math.max(0.5, 1.0 - yearsPostPeak * 0.05);
  return current * decayFactor;
}

/**
 * One OU step for a single attribute.
 * Returns the new attribute value, clamped to [0, 550].
 */
function ouStep(
  rng: GameRNG,
  current: number,
  age: number,
  phase: DevPhase,
  peakStart: number,
  peakEnd: number,
  workEthicMult: number,
  mentalToughnessMult: number,
  devBoost: number,
): number {
  const theta = THETA[phase];
  const target = peakTarget(current, age, peakStart, peakEnd);
  const meanReversion = theta * (target - current);

  let drift = BASE_DRIFT[phase];

  // Apply work ethic multiplier only to positive drift
  if (drift > 0) {
    drift *= workEthicMult;
  }

  // Apply mental toughness to reduce negative drift
  if (drift < 0) {
    drift *= mentalToughnessMult;
  }

  // Dev program boost adds to drift
  drift += devBoost;

  const noise = rng.nextGaussian(0, VOLATILITY[phase]);

  const newValue = current + meanReversion + drift + noise;
  return clampRating(newValue);
}

// ---------------------------------------------------------------------------
// Personality-based multipliers
// ---------------------------------------------------------------------------

function workEthicMultiplier(workEthic: number): number {
  return WORK_ETHIC_FLOOR + (workEthic / 100) * WORK_ETHIC_RANGE;
}

function mentalToughnessDeclineMultiplier(mentalToughness: number): number {
  return 1.0 - (mentalToughness / 100) * MENTAL_TOUGHNESS_DECLINE_REDUCTION;
}

// ---------------------------------------------------------------------------
// Mental toughness growth
// ---------------------------------------------------------------------------

/**
 * Grow mental toughness asymptotically toward MT_CEILING with experience.
 * Older players gain mental toughness faster (experience effect).
 */
export function growMentalToughness(
  rng: GameRNG,
  current: number,
  age: number,
): number {
  const gap = MT_CEILING - current;
  if (gap <= 0) return current;

  // Experience factor: older players gain more (up to 1.5x at age 35+)
  const experienceFactor = Math.min(1.5, 0.8 + (age - 20) * 0.04);
  const growth = gap * MT_GROWTH_RATE * experienceFactor;
  const noise = rng.nextGaussian(0, MT_NOISE_STDDEV);

  return Math.max(0, Math.min(MT_CEILING, Math.round(current + growth + noise)));
}

// ---------------------------------------------------------------------------
// Retirement logic
// ---------------------------------------------------------------------------

/**
 * Determine whether a player should retire.
 * - Age 38+: 20% base, +15% per year over 38
 * - Overall < 100: +30% regardless of age
 * - Low durability/stamina: +10%
 * - Never before 32 unless rating < 60
 */
export function shouldRetire(rng: GameRNG, player: GeneratedPlayer): boolean {
  const { age, overallRating } = player;

  // Young players only retire if catastrophically bad
  if (age < RETIREMENT_MIN_AGE) {
    return overallRating < RETIREMENT_CATASTROPHIC_RATING && rng.nextFloat() < 0.5;
  }

  let chance = 0;

  // Age-based retirement
  if (age >= RETIREMENT_BASE_AGE) {
    const yearsOver = age - RETIREMENT_BASE_AGE;
    chance += RETIREMENT_BASE_CHANCE + yearsOver * RETIREMENT_YEAR_INCREMENT;
  }

  // Low overall rating
  if (overallRating < RETIREMENT_LOW_RATING) {
    chance += RETIREMENT_LOW_RATING_BONUS;
  }

  // Fragility check
  const isPitcher = (PITCHER_POSITIONS as readonly string[]).includes(player.position);
  if (isPitcher && player.pitcherAttributes) {
    if (player.pitcherAttributes.stamina < RETIREMENT_FRAGILITY_THRESHOLD) {
      chance += RETIREMENT_FRAGILITY_BONUS;
    }
  } else {
    if (player.hitterAttributes.durability < RETIREMENT_FRAGILITY_THRESHOLD) {
      chance += RETIREMENT_FRAGILITY_BONUS;
    }
  }

  // Cap at 95% so there's always a tiny miracle chance
  chance = Math.min(0.95, chance);

  return rng.nextFloat() < chance;
}

// ---------------------------------------------------------------------------
// Core development function
// ---------------------------------------------------------------------------

/**
 * Age a player by one season, evolving all attributes via OU process.
 * Returns a new GeneratedPlayer (does not mutate the input).
 */
export function developPlayer(
  rng: GameRNG,
  player: GeneratedPlayer,
  devProgram?: DevProgram,
): GeneratedPlayer {
  const newAge = player.age + 1;
  const newPhase = updateDevPhase(newAge);

  const weMult = workEthicMultiplier(player.personality.workEthic);
  const mtMult = mentalToughnessDeclineMultiplier(player.personality.mentalToughness);

  const isPitcher = (PITCHER_POSITIONS as readonly string[]).includes(player.position);

  // Helper: compute dev program boost for a given attribute name
  const devBoost = (attrName: string): number => {
    if (!devProgram || devProgram.targetAttribute !== attrName) return 0;
    // Dev programs add a flat boost proportional to intensity (on top of normal drift)
    return devProgram.intensity * 15;
  };

  // Evolve hitter attributes
  const newHitter: HitterAttributes = {
    contact: ouStep(rng, player.hitterAttributes.contact, newAge, newPhase,
      HITTER_PEAK_AGES.contact[0], HITTER_PEAK_AGES.contact[1],
      weMult, mtMult, devBoost('contact')),
    power: ouStep(rng, player.hitterAttributes.power, newAge, newPhase,
      HITTER_PEAK_AGES.power[0], HITTER_PEAK_AGES.power[1],
      weMult, mtMult, devBoost('power')),
    eye: ouStep(rng, player.hitterAttributes.eye, newAge, newPhase,
      HITTER_PEAK_AGES.eye[0], HITTER_PEAK_AGES.eye[1],
      weMult, mtMult, devBoost('eye')),
    speed: ouStep(rng, player.hitterAttributes.speed, newAge, newPhase,
      HITTER_PEAK_AGES.speed[0], HITTER_PEAK_AGES.speed[1],
      weMult, mtMult, devBoost('speed')),
    defense: ouStep(rng, player.hitterAttributes.defense, newAge, newPhase,
      HITTER_PEAK_AGES.defense[0], HITTER_PEAK_AGES.defense[1],
      weMult, mtMult, devBoost('defense')),
    durability: ouStep(rng, player.hitterAttributes.durability, newAge, newPhase,
      HITTER_PEAK_AGES.durability[0], HITTER_PEAK_AGES.durability[1],
      weMult, mtMult, devBoost('durability')),
  };

  // Evolve pitcher attributes (if applicable)
  let newPitcher: PitcherAttributes | null = null;
  if (isPitcher && player.pitcherAttributes) {
    newPitcher = {
      stuff: ouStep(rng, player.pitcherAttributes.stuff, newAge, newPhase,
        PITCHER_PEAK_AGES.stuff[0], PITCHER_PEAK_AGES.stuff[1],
        weMult, mtMult, devBoost('stuff')),
      control: ouStep(rng, player.pitcherAttributes.control, newAge, newPhase,
        PITCHER_PEAK_AGES.control[0], PITCHER_PEAK_AGES.control[1],
        weMult, mtMult, devBoost('control')),
      stamina: ouStep(rng, player.pitcherAttributes.stamina, newAge, newPhase,
        PITCHER_PEAK_AGES.stamina[0], PITCHER_PEAK_AGES.stamina[1],
        weMult, mtMult, devBoost('stamina')),
      velocity: ouStep(rng, player.pitcherAttributes.velocity, newAge, newPhase,
        PITCHER_PEAK_AGES.velocity[0], PITCHER_PEAK_AGES.velocity[1],
        weMult, mtMult, devBoost('velocity')),
      movement: ouStep(rng, player.pitcherAttributes.movement, newAge, newPhase,
        PITCHER_PEAK_AGES.movement[0], PITCHER_PEAK_AGES.movement[1],
        weMult, mtMult, devBoost('movement')),
    };
  }

  // Grow mental toughness with experience
  const newMentalToughness = growMentalToughness(
    rng,
    player.personality.mentalToughness,
    newAge,
  );

  // Compute new overall
  const newOverall = isPitcher && newPitcher
    ? pitcherOverall(newPitcher)
    : hitterOverall(newHitter);

  return {
    ...player,
    age: newAge,
    developmentPhase: newPhase,
    hitterAttributes: newHitter,
    pitcherAttributes: newPitcher,
    personality: {
      ...player.personality,
      mentalToughness: newMentalToughness,
    },
    overallRating: newOverall,
  };
}

// ---------------------------------------------------------------------------
// Batch development
// ---------------------------------------------------------------------------

/**
 * Age all players in the league by one season.
 * Players who should retire are removed from the returned array.
 * Dev programs are looked up by player id.
 */
export function developAllPlayers(
  rng: GameRNG,
  players: GeneratedPlayer[],
  devPrograms?: Map<string, DevProgram>,
): GeneratedPlayer[] {
  const result: GeneratedPlayer[] = [];

  for (const player of players) {
    const program = devPrograms?.get(player.id);
    const developed = developPlayer(rng, player, program);

    if (!shouldRetire(rng, developed)) {
      result.push(developed);
    }
  }

  return result;
}
