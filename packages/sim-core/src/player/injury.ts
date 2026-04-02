/**
 * @module injury
 * Injury system: deterministic injury checks, recovery, and attribute penalties.
 * Uses GameRNG for all randomness; the JS global random API is never used.
 */

import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer, Position } from './generation.js';
import { clampRating } from './attributes.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base probability of injury per player per game day (~0.3%). */
const BASE_INJURY_RATE = 0.003;

/** Durability / stamina thresholds for risk multipliers. */
const DURABILITY_LOW = 200;
const DURABILITY_VERY_LOW = 100;
const DURABILITY_HIGH = 400;

/** Durability risk multipliers. */
const RISK_MULT_VERY_LOW = 3.0;
const RISK_MULT_LOW = 2.0;
const RISK_MULT_HIGH = 0.5;

/** Age thresholds for increased injury risk. */
const AGE_ELEVATED = 32;
const AGE_HIGH = 36;
const AGE_ELEVATED_MULT = 1.5;
const AGE_HIGH_MULT = 2.0;

/** Position-specific risk multipliers. */
const POSITION_RISK: Partial<Record<Position, number>> = {
  C: 1.3,
  SP: 1.2,
  RP: 1.2,
  CL: 1.2,
  LF: 0.9,
  CF: 0.9,
  RF: 0.9,
  DH: 0.7,
};

/** Default position risk when not specified above. */
const DEFAULT_POSITION_RISK = 1.0;

/** Days to fade attribute penalty after return. */
const PENALTY_FADE_DAYS = 30;

/** Re-injury risk fade rate per day. */
const REINJURY_FADE_PER_DAY = 0.01;

/** Season-ending placeholder duration. */
const SEASON_ENDING_DAYS = 200;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InjuryType =
  | 'hamstring_strain' | 'oblique_strain' | 'shoulder_inflammation'
  | 'elbow_soreness' | 'back_spasm' | 'knee_sprain' | 'ankle_sprain'
  | 'wrist_inflammation' | 'groin_strain' | 'hip_flexor'
  | 'ucl_tear' | 'acl_tear' | 'rotator_cuff_tear' | 'tommy_john'
  | 'concussion' | 'broken_hand' | 'broken_foot'
  | 'quad_strain' | 'calf_strain' | 'forearm_strain';

export type InjurySeverity = 'day_to_day' | 'il_10' | 'il_15' | 'il_60' | 'season_ending';

export interface Injury {
  type: InjuryType;
  severity: InjurySeverity;
  daysRemaining: number;
  totalDays: number;
  attributePenalty: number; // 0-1 scale, applied to all attributes on return
  reinjuryRisk: number;    // 0-1 scale, elevated chance of same injury
}

// ---------------------------------------------------------------------------
// Injury pools by category
// ---------------------------------------------------------------------------

/** Minor injuries (day_to_day, il_10, il_15). */
const MINOR_INJURIES: InjuryType[] = [
  'hamstring_strain', 'oblique_strain', 'shoulder_inflammation',
  'elbow_soreness', 'back_spasm', 'knee_sprain', 'ankle_sprain',
  'wrist_inflammation', 'groin_strain', 'hip_flexor',
  'quad_strain', 'calf_strain', 'forearm_strain',
];

/** Severe pitcher injuries (il_60, season_ending). */
const SEVERE_PITCHER_INJURIES: InjuryType[] = [
  'ucl_tear', 'rotator_cuff_tear', 'tommy_john',
  'shoulder_inflammation', 'elbow_soreness', 'forearm_strain',
];

/** Severe hitter injuries (il_60, season_ending). */
const SEVERE_HITTER_INJURIES: InjuryType[] = [
  'acl_tear', 'knee_sprain', 'ankle_sprain',
  'broken_hand', 'broken_foot', 'concussion',
  'hamstring_strain', 'hip_flexor',
];

// ---------------------------------------------------------------------------
// Severity distribution (cumulative thresholds on 0-1 scale)
// ---------------------------------------------------------------------------

interface SeverityBand {
  threshold: number;
  severity: InjurySeverity;
}

const SEVERITY_DISTRIBUTION: SeverityBand[] = [
  { threshold: 0.40, severity: 'day_to_day' },
  { threshold: 0.65, severity: 'il_10' },
  { threshold: 0.85, severity: 'il_15' },
  { threshold: 0.95, severity: 'il_60' },
  { threshold: 1.00, severity: 'season_ending' },
];

// ---------------------------------------------------------------------------
// Duration ranges by severity
// ---------------------------------------------------------------------------

const DURATION_RANGES: Record<InjurySeverity, [number, number]> = {
  day_to_day: [1, 3],
  il_10: [10, 20],
  il_15: [15, 35],
  il_60: [60, 90],
  season_ending: [SEASON_ENDING_DAYS, SEASON_ENDING_DAYS],
};

// ---------------------------------------------------------------------------
// Attribute penalty by severity (initial value)
// ---------------------------------------------------------------------------

const INITIAL_PENALTY: Record<InjurySeverity, number> = {
  day_to_day: 0.05,
  il_10: 0.07,
  il_15: 0.10,
  il_60: 0.12,
  season_ending: 0.15,
};

// ---------------------------------------------------------------------------
// Re-injury risk by severity class
// ---------------------------------------------------------------------------

const REINJURY_RISK_MINOR = 0.1;
const REINJURY_RISK_MAJOR = 0.3;

// ---------------------------------------------------------------------------
// Pitcher positions set (for quick lookup)
// ---------------------------------------------------------------------------

const PITCHER_POSITIONS: ReadonlySet<Position> = new Set(['SP', 'RP', 'CL']);

function isPitcher(position: Position): boolean {
  return PITCHER_POSITIONS.has(position);
}

// ---------------------------------------------------------------------------
// Human-readable labels
// ---------------------------------------------------------------------------

const INJURY_LABELS: Record<InjuryType, string> = {
  hamstring_strain: 'Hamstring Strain',
  oblique_strain: 'Oblique Strain',
  shoulder_inflammation: 'Shoulder Inflammation',
  elbow_soreness: 'Elbow Soreness',
  back_spasm: 'Back Spasm',
  knee_sprain: 'Knee Sprain',
  ankle_sprain: 'Ankle Sprain',
  wrist_inflammation: 'Wrist Inflammation',
  groin_strain: 'Groin Strain',
  hip_flexor: 'Hip Flexor Strain',
  ucl_tear: 'UCL Tear',
  acl_tear: 'ACL Tear',
  rotator_cuff_tear: 'Rotator Cuff Tear',
  tommy_john: 'Tommy John (UCL Reconstruction)',
  concussion: 'Concussion',
  broken_hand: 'Broken Hand',
  broken_foot: 'Broken Foot',
  quad_strain: 'Quad Strain',
  calf_strain: 'Calf Strain',
  forearm_strain: 'Forearm Strain',
};

const SEVERITY_LABELS: Record<InjurySeverity, string> = {
  day_to_day: 'Day-to-Day',
  il_10: '10-Day IL',
  il_15: '15-Day IL',
  il_60: '60-Day IL',
  season_ending: 'Season-Ending',
};

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Determine the durability/stamina rating to use for injury risk.
 * Hitters use `durability`; pitchers use `stamina`.
 */
function getDurabilityRating(player: GeneratedPlayer): number {
  if (isPitcher(player.position) && player.pitcherAttributes) {
    return player.pitcherAttributes.stamina;
  }
  return player.hitterAttributes.durability;
}

/**
 * Compute the injury risk multiplier for a player based on their attributes,
 * age, position, and any existing re-injury risk.
 */
function computeRiskMultiplier(player: GeneratedPlayer, existingReinjuryRisk: number): number {
  let multiplier = 1.0;

  // Durability / stamina modifier
  const durability = getDurabilityRating(player);
  if (durability < DURABILITY_VERY_LOW) {
    multiplier *= RISK_MULT_VERY_LOW;
  } else if (durability < DURABILITY_LOW) {
    multiplier *= RISK_MULT_LOW;
  } else if (durability > DURABILITY_HIGH) {
    multiplier *= RISK_MULT_HIGH;
  }

  // Age modifier
  if (player.age >= AGE_HIGH) {
    multiplier *= AGE_HIGH_MULT;
  } else if (player.age >= AGE_ELEVATED) {
    multiplier *= AGE_ELEVATED_MULT;
  }

  // Position modifier
  multiplier *= POSITION_RISK[player.position] ?? DEFAULT_POSITION_RISK;

  // Re-injury modifier (multiplicative: 1 + reinjuryRisk)
  if (existingReinjuryRisk > 0) {
    multiplier *= 1 + existingReinjuryRisk;
  }

  return multiplier;
}

/**
 * Roll a severity from the severity distribution table.
 */
function rollSeverity(rng: GameRNG): InjurySeverity {
  const roll = rng.nextFloat();
  for (const band of SEVERITY_DISTRIBUTION) {
    if (roll < band.threshold) {
      return band.severity;
    }
  }
  // Fallback (should not be reached due to 1.0 threshold)
  return 'day_to_day';
}

/**
 * Pick a random element from an array using the RNG.
 */
function pickRandom<T>(rng: GameRNG, arr: readonly T[]): T {
  return arr[rng.nextInt(0, arr.length - 1)]!;
}

/**
 * Generate a specific injury based on player position and severity.
 */
export function generateInjury(
  rng: GameRNG,
  position: Position,
  severity: InjurySeverity,
): Injury {
  // Pick injury type based on severity and position
  let injuryType: InjuryType;
  const isSevere = severity === 'il_60' || severity === 'season_ending';

  if (isSevere) {
    const pool = isPitcher(position) ? SEVERE_PITCHER_INJURIES : SEVERE_HITTER_INJURIES;
    injuryType = pickRandom(rng, pool);
  } else {
    injuryType = pickRandom(rng, MINOR_INJURIES);
  }

  // Roll duration within the severity band
  const [minDays, maxDays] = DURATION_RANGES[severity];
  const totalDays = minDays === maxDays ? minDays : rng.nextInt(minDays, maxDays);

  // Set attribute penalty and re-injury risk
  const attributePenalty = INITIAL_PENALTY[severity];
  const reinjuryRisk = isSevere ? REINJURY_RISK_MAJOR : REINJURY_RISK_MINOR;

  return {
    type: injuryType,
    severity,
    daysRemaining: totalDays,
    totalDays,
    attributePenalty,
    reinjuryRisk,
  };
}

/**
 * Check if a player gets injured on a given game day.
 * Returns an Injury if the player is hurt, or null if healthy.
 *
 * The optional `reinjuryRisk` parameter allows callers to pass in
 * a lingering re-injury risk from a previous injury.
 */
export function checkInjury(
  rng: GameRNG,
  player: GeneratedPlayer,
  reinjuryRisk: number = 0,
): Injury | null {
  const riskMult = computeRiskMultiplier(player, reinjuryRisk);
  const effectiveRate = BASE_INJURY_RATE * riskMult;

  const roll = rng.nextFloat();
  if (roll >= effectiveRate) {
    return null;
  }

  const severity = rollSeverity(rng);
  return generateInjury(rng, player.position, severity);
}

/**
 * Advance an injury by one day (recovery tick).
 *
 * - `daysRemaining` decreases by 1.
 * - When `daysRemaining` hits 0, the player has returned but still has a
 *   fading penalty. The returned Injury reflects this post-return state.
 * - `attributePenalty` fades linearly over PENALTY_FADE_DAYS after return.
 * - `reinjuryRisk` fades by REINJURY_FADE_PER_DAY each day.
 * - Returns `null` when both penalty and re-injury risk have fully faded
 *   (i.e., the player is fully recovered with no lingering effects).
 */
export function advanceInjury(injury: Injury): Injury | null {
  const nextDaysRemaining = Math.max(0, injury.daysRemaining - 1);

  // Fade re-injury risk every day (whether still injured or recovering)
  const nextReinjuryRisk = Math.max(0, injury.reinjuryRisk - REINJURY_FADE_PER_DAY);

  // Fade attribute penalty only after the player has returned (daysRemaining === 0)
  let nextPenalty = injury.attributePenalty;
  if (nextDaysRemaining === 0 && injury.attributePenalty > 0) {
    // Linear fade: reduce by (initial penalty / fade window) per day
    const fadeStep = INITIAL_PENALTY[injury.severity] / PENALTY_FADE_DAYS;
    nextPenalty = Math.max(0, injury.attributePenalty - fadeStep);
  }

  // Fully recovered: no days remaining, no penalty, no re-injury risk
  if (nextDaysRemaining === 0 && nextPenalty <= 0 && nextReinjuryRisk <= 0) {
    return null;
  }

  return {
    ...injury,
    daysRemaining: nextDaysRemaining,
    attributePenalty: nextPenalty,
    reinjuryRisk: nextReinjuryRisk,
  };
}

/**
 * Get the effective attribute multiplier for an injured or recovering player.
 *
 * - While on the IL (daysRemaining > 0): returns 0 (player cannot play).
 * - While recovering (daysRemaining === 0 but penalty remains): returns 1 - penalty.
 * - If no injury or undefined: returns 1.0 (full strength).
 */
export function getInjuryMultiplier(injury: Injury | undefined): number {
  if (!injury) return 1.0;
  if (injury.daysRemaining > 0) return 0;
  return 1.0 - injury.attributePenalty;
}

/**
 * Get a human-readable injury description.
 * Example: "Hamstring Strain (15-Day IL, 18 days remaining)"
 */
export function describeInjury(injury: Injury): string {
  const label = INJURY_LABELS[injury.type];
  const severityLabel = SEVERITY_LABELS[injury.severity];

  if (injury.daysRemaining > 0) {
    return `${label} (${severityLabel}, ${injury.daysRemaining} day${injury.daysRemaining === 1 ? '' : 's'} remaining)`;
  }

  // Player has returned but still recovering
  if (injury.attributePenalty > 0 || injury.reinjuryRisk > 0) {
    const penaltyPct = Math.round(injury.attributePenalty * 100);
    return `${label} (Recovering, -${penaltyPct}% attributes)`;
  }

  return `${label} (Fully recovered)`;
}

/**
 * Check multiple players for injuries after a game day.
 * Returns a Map of player ID to new Injury for each player who got hurt.
 *
 * The optional `existingInjuries` map allows passing in lingering re-injury
 * risk from previous injuries so that recently-recovered players have
 * elevated risk of re-injury.
 */
export function processInjuries(
  rng: GameRNG,
  players: GeneratedPlayer[],
  existingInjuries?: Map<string, Injury>,
): Map<string, Injury> {
  const newInjuries = new Map<string, Injury>();

  for (const player of players) {
    // Skip players already on the IL
    const existing = existingInjuries?.get(player.id);
    if (existing && existing.daysRemaining > 0) {
      continue;
    }

    // Use lingering re-injury risk if present
    const reinjuryRisk = existing?.reinjuryRisk ?? 0;
    const injury = checkInjury(rng, player, reinjuryRisk);

    if (injury) {
      newInjuries.set(player.id, injury);
    }
  }

  return newInjuries;
}
