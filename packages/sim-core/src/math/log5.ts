/**
 * @module log5
 * Bill James Log5 probability model for plate appearance outcomes.
 *
 * Combines batter rates, pitcher rates, and league-average rates into
 * a single normalized probability distribution. Modifiers (fatigue,
 * times-through-order, platoon, park factor, chemistry) are applied
 * multiplicatively and clamped via a squash function.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OutcomeRates {
  readonly bb: number;
  readonly hbp: number;
  readonly k: number;
  readonly hr: number;
  readonly single: number;
  readonly double: number;
  readonly triple: number;
  readonly gb: number;
  readonly fb: number;
  readonly ld: number;
}

export interface Log5Modifiers {
  readonly fatigue?: number;        // 0.8 to 1.2
  readonly timesThrough?: number;   // 1.0 first time, increases
  readonly platoon?: number;        // advantage/disadvantage
  readonly parkFactor?: number;     // 0.9 to 1.1
  readonly chemistry?: number;      // 0.95 to 1.05
}

export interface Log5Input {
  readonly batterRates: OutcomeRates;
  readonly pitcherRates: OutcomeRates;
  readonly leagueRates: OutcomeRates;
  readonly modifiers?: Log5Modifiers;
}

// ---------------------------------------------------------------------------
// Outcome keys — typed array for iteration
// ---------------------------------------------------------------------------

const OUTCOME_KEYS = [
  'bb', 'hbp', 'k', 'hr', 'single', 'double', 'triple', 'gb', 'fb', 'ld',
] as const;

type OutcomeKey = (typeof OUTCOME_KEYS)[number];

// ---------------------------------------------------------------------------
// Influence weights per outcome
// ---------------------------------------------------------------------------

/**
 * How much each outcome is driven by the batter vs the pitcher.
 * Values represent the batter's weight; pitcher weight = 1 - batter weight.
 *
 * - K: pitcher-dominated (pitcher 0.75, batter 0.25)
 * - BB: batter-dominated (batter 0.65, pitcher 0.35)
 * - HR: neutral (0.50 / 0.50)
 * - All others: neutral (0.50 / 0.50)
 */
const BATTER_INFLUENCE: Record<OutcomeKey, number> = {
  bb: 0.65,
  hbp: 0.15,
  k: 0.25,
  hr: 0.50,
  single: 0.50,
  double: 0.50,
  triple: 0.50,
  gb: 0.50,
  fb: 0.50,
  ld: 0.50,
};

// ---------------------------------------------------------------------------
// Squash function
// ---------------------------------------------------------------------------

/**
 * Caps a combined modifier to the range [0.5, 2.0] to prevent runaway
 * probabilities. Values outside the range are hard-clamped.
 */
function squash(value: number): number {
  return Math.min(2.0, Math.max(0.5, value));
}

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

/**
 * Compute the combined modifier from optional modifier fields.
 * All present modifiers are multiplied together, then squashed.
 */
function combinedModifier(modifiers: Log5Modifiers | undefined): number {
  if (!modifiers) return 1.0;

  let m = 1.0;
  if (modifiers.fatigue !== undefined) m *= modifiers.fatigue;
  if (modifiers.timesThrough !== undefined) m *= modifiers.timesThrough;
  if (modifiers.platoon !== undefined) m *= modifiers.platoon;
  if (modifiers.parkFactor !== undefined) m *= modifiers.parkFactor;
  if (modifiers.chemistry !== undefined) m *= modifiers.chemistry;

  return squash(m);
}

function applyOutcomeModifier(key: OutcomeKey, probability: number, modifier: number): number {
  if (modifier === 1) return probability;

  switch (key) {
    case 'bb':
    case 'hbp':
    case 'hr':
    case 'single':
    case 'double':
    case 'triple':
    case 'ld':
      return probability * modifier;
    case 'k':
    case 'gb':
    case 'fb':
      return probability / modifier;
    default:
      return probability;
  }
}

/**
 * Log5 formula for a single outcome:
 *
 *   p = (batterRate * pitcherRate) / leagueRate
 *
 * The influence weights bias toward batter or pitcher by blending:
 *
 *   blended = batterWeight * batterRate + pitcherWeight * pitcherRate
 *   adjusted = (blended * blended) / leagueRate
 *
 * This preserves the Log5 spirit while allowing asymmetric influence.
 */
function log5Single(
  batterRate: number,
  pitcherRate: number,
  leagueRate: number,
  batterWeight: number,
): number {
  // Guard against division by zero or degenerate league rates.
  const safeLg = Math.max(leagueRate, 1e-10);
  const blended = batterWeight * batterRate + (1 - batterWeight) * pitcherRate;
  // Classic Log5-inspired: (blended^2) / leagueRate gives the right
  // regression behavior (league-avg vs league-avg => league-avg).
  return (blended * blended) / safeLg;
}

/**
 * Compute normalized Log5 probabilities for all plate appearance outcomes.
 *
 * @returns A record mapping each outcome key to its probability.
 *          All values are non-negative and sum to 1.0.
 */
export function computeLog5Probabilities(
  input: Log5Input,
): Record<string, number> {
  const mod = combinedModifier(input.modifiers);
  const raw: Record<string, number> = {};

  for (const key of OUTCOME_KEYS) {
    const batterRate = input.batterRates[key];
    const pitcherRate = input.pitcherRates[key];
    const leagueRate = input.leagueRates[key];
    const batterWeight = BATTER_INFLUENCE[key];

    let p = log5Single(batterRate, pitcherRate, leagueRate, batterWeight);

    // Positive modifiers are batter-friendly and negative modifiers suppress offense.
    p = applyOutcomeModifier(key, p, mod);

    // Floor at zero — probabilities cannot be negative.
    raw[key] = Math.max(0, p);
  }

  // Normalize so all probabilities sum to 1.0.
  let total = 0;
  for (const key of OUTCOME_KEYS) {
    total += raw[key]!;
  }

  const result: Record<string, number> = {};
  const safeTotal = Math.max(total, 1e-10);
  for (const key of OUTCOME_KEYS) {
    result[key] = raw[key]! / safeTotal;
  }

  return result;
}
