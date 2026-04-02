/**
 * @module plateAppearance
 * Core PA resolution using Log5 probabilities.
 * Returns a typed PAOutcome based on batter/pitcher matchup.
 */

import type { GameRNG } from '../math/prng.js';
import { computeLog5Probabilities } from '../math/log5.js';
import type { Log5Modifiers } from '../math/log5.js';
import type { HitterAttributes, PitcherAttributes } from '../player/attributes.js';
import { RATING_MAX } from '../player/attributes.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PAOutcome =
  | 'BB' | 'K' | 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HR'
  | 'GB_OUT' | 'FB_OUT' | 'LD_OUT'
  | 'HBP' | 'DOUBLE_PLAY' | 'SAC_FLY';

export interface PAContext {
  readonly batterAttrs: HitterAttributes;
  readonly pitcherAttrs: PitcherAttributes;
  readonly modifiers?: Log5Modifiers;
}

export interface PAResult {
  readonly outcome: PAOutcome;
  readonly batterId: string;
  readonly pitcherId: string;
}

// ---------------------------------------------------------------------------
// Attribute-to-rate conversion
// ---------------------------------------------------------------------------

/** League average rates (approximate MLB averages) */
const LEAGUE_AVG = {
  bb: 0.085,
  hbp: 0.008,
  k: 0.220,
  hr: 0.030,
  single: 0.155,
  double: 0.045,
  triple: 0.005,
  gb: 0.212,
  fb: 0.140,
  ld: 0.100,
};

/**
 * Convert hitter attributes to outcome rates.
 * Higher attributes produce rates that deviate from league average.
 */
function hitterToRates(attrs: HitterAttributes) {
  const norm = (val: number) => val / RATING_MAX; // 0.0 to 1.0

  const contactN = norm(attrs.contact);
  const powerN = norm(attrs.power);
  const eyeN = norm(attrs.eye);
  const speedN = norm(attrs.speed);

  return {
    bb: LEAGUE_AVG.bb * (0.5 + eyeN),
    hbp: LEAGUE_AVG.hbp * (0.75 + ((eyeN + speedN) * 0.35)),
    k: LEAGUE_AVG.k * (1.5 - contactN),
    hr: LEAGUE_AVG.hr * (0.3 + powerN * 1.4),
    single: LEAGUE_AVG.single * (0.5 + contactN * 0.8),
    double: LEAGUE_AVG.double * (0.5 + (contactN + powerN) * 0.5),
    triple: LEAGUE_AVG.triple * (0.3 + speedN * 1.4),
    gb: LEAGUE_AVG.gb,
    fb: LEAGUE_AVG.fb,
    ld: LEAGUE_AVG.ld * (0.7 + contactN * 0.6),
  };
}

/**
 * Convert pitcher attributes to outcome rates.
 * Better pitchers reduce hit rates and increase strikeouts.
 */
function pitcherToRates(attrs: PitcherAttributes) {
  const norm = (val: number) => val / RATING_MAX;

  const stuffN = norm(attrs.stuff);
  const controlN = norm(attrs.control);
  const movementN = norm(attrs.movement);

  return {
    bb: LEAGUE_AVG.bb * (1.5 - controlN),
    hbp: LEAGUE_AVG.hbp * (1.4 - controlN),
    k: LEAGUE_AVG.k * (0.5 + stuffN),
    hr: LEAGUE_AVG.hr * (1.3 - movementN * 0.6),
    single: LEAGUE_AVG.single * (1.3 - stuffN * 0.6),
    double: LEAGUE_AVG.double * (1.2 - movementN * 0.4),
    triple: LEAGUE_AVG.triple,
    gb: LEAGUE_AVG.gb * (0.7 + movementN * 0.6),
    fb: LEAGUE_AVG.fb * (1.3 - movementN * 0.6),
    ld: LEAGUE_AVG.ld * (1.2 - stuffN * 0.4),
  };
}

// ---------------------------------------------------------------------------
// PA resolution
// ---------------------------------------------------------------------------

/** Outcome mapping from Log5 keys to PAOutcome enum */
const KEY_TO_OUTCOME: Record<string, PAOutcome> = {
  bb: 'BB',
  hbp: 'HBP',
  k: 'K',
  hr: 'HR',
  single: 'SINGLE',
  double: 'DOUBLE',
  triple: 'TRIPLE',
  gb: 'GB_OUT',
  fb: 'FB_OUT',
  ld: 'LD_OUT',
};

const OUTCOME_KEYS = ['bb', 'hbp', 'k', 'hr', 'single', 'double', 'triple', 'gb', 'fb', 'ld'] as const;

/**
 * Resolve a single plate appearance.
 * Uses Log5 to blend batter/pitcher rates, then rolls against cumulative distribution.
 */
export function resolvePlateAppearance(
  rng: GameRNG,
  context: PAContext,
  batterId: string,
  pitcherId: string,
): PAResult {
  const batterRates = hitterToRates(context.batterAttrs);
  const pitcherRates = pitcherToRates(context.pitcherAttrs);

  const probs = computeLog5Probabilities({
    batterRates,
    pitcherRates,
    leagueRates: LEAGUE_AVG,
    modifiers: context.modifiers,
  });

  // Roll against cumulative distribution
  const roll = rng.nextFloat();
  let cumulative = 0;

  for (const key of OUTCOME_KEYS) {
    cumulative += probs[key] ?? 0;
    if (roll <= cumulative) {
      let outcome = KEY_TO_OUTCOME[key]!;

      // Special case: GB_OUT can become DOUBLE_PLAY with runners on
      // (handled by the Markov FSM, but we flag it here at a base rate)
      if (outcome === 'GB_OUT' && rng.nextFloat() < 0.12) {
        outcome = 'DOUBLE_PLAY';
      }

      return { outcome, batterId, pitcherId };
    }
  }

  // Fallback (floating point guard)
  return { outcome: 'FB_OUT', batterId, pitcherId };
}
