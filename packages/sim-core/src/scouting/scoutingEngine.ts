/**
 * @module scoutingEngine
 * Scouting system: "The Fog of War IS the Game"
 *
 * Users never see raw truth. They see their scouting department's OPINION
 * of the truth. Elite scouts produce precise grades; mediocre scouts produce
 * noisy estimates with wide confidence intervals.
 *
 * All randomness flows through GameRNG; the JS global random API is never used.
 */

import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer, Position } from '../player/generation.js';
import { PITCHER_POSITIONS } from '../player/generation.js';
import type { HitterAttributes, PitcherAttributes } from '../player/attributes.js';
import { toDisplayRating, DISPLAY_MIN, DISPLAY_MAX } from '../player/attributes.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base noise standard deviation on 20-80 display scale. Even bad scouts aren't fully random. */
const BASE_NOISE = 15;

/** Specialty bonus: noise reduction when scout specialty matches player position */
const SPECIALTY_NOISE_REDUCTION = 0.30;

/** Specialty bonus: confidence improvement */
const SPECIALTY_CONFIDENCE_BOOST = 0.20;

/** Confidence multiplier applied to noise stddev to get confidence band width */
const CONFIDENCE_MULTIPLIER = 1.5;

/** Min/max confidence interval width (in display-scale grades) */
const CONFIDENCE_MIN = 1;
const CONFIDENCE_MAX = 20;

/** Number of scouts on a standard scouting staff */
const STAFF_SIZE = 5;

/** Salary range for generated scouts (millions) */
const SCOUT_SALARY_MIN = 0.3;
const SCOUT_SALARY_MAX = 2.5;

/** Min/max scout quality */
const SCOUT_QUALITY_MIN = 15;
const SCOUT_QUALITY_MAX = 95;

/** Age brackets for ceiling/floor projection */
const YOUNG_AGE_THRESHOLD = 23;
const VETERAN_AGE_THRESHOLD = 31;

/** Ceiling/floor spread factors by age bracket */
const CEILING_YOUNG_BONUS = 12;
const CEILING_MID_BONUS = 6;
const CEILING_VETERAN_BONUS = 2;

const FLOOR_YOUNG_RISK = 10;
const FLOOR_MID_RISK = 4;
const FLOOR_VETERAN_RISK = 2;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScoutBias = 'tools_lover' | 'stat_head' | 'makeup_guy' | 'neutral';

export interface Scout {
  id: string;
  name: string;
  quality: number;          // 1-100 (determines accuracy)
  specialty: Position | 'all';
  bias: ScoutBias;
  salary: number;           // Annual cost in millions
}

export interface ScoutReport {
  playerId: string;
  scoutId: string;
  reportDate: string;       // "S3D45" format

  /** Observed ratings (with noise applied) on 20-80 display scale */
  observedRatings: Record<string, number>;

  /** Confidence interval width: smaller = more confident (1-20 grades) */
  confidence: number;

  /** Overall grade (scout's opinion), 20-80 */
  overallGrade: number;

  /** Ceiling projection, 20-80 */
  ceiling: number;

  /** Floor projection, 20-80 */
  floor: number;

  /** Flavor text notes */
  notes: string;

  /** Reliability of this report: 0-1, derived from scout quality + position match */
  reliability: number;
}

// ---------------------------------------------------------------------------
// Scout name pools
// ---------------------------------------------------------------------------

const SCOUT_FIRST_NAMES = [
  'Bill', 'Tom', 'Jim', 'Frank', 'Ray', 'George', 'Larry', 'Bob',
  'Mike', 'Dave', 'Steve', 'Al', 'Hank', 'Eddie', 'Pete', 'Joe',
  'Sal', 'Vince', 'Tony', 'Lou', 'Manny', 'Pat', 'Gary', 'Artie',
] as const;

const SCOUT_LAST_NAMES = [
  'McGraw', 'Dalton', 'Rickey', 'Weaver', 'Whitfield', 'Campanella',
  'DeMacio', 'O\'Brien', 'Hernandez', 'Tanaka', 'Kowalski', 'Bergman',
  'Sweeney', 'Fontaine', 'Greer', 'Rosario', 'Hammond', 'Whitaker',
  'Chen', 'Baptiste', 'Collier', 'Montoya', 'Jensen', 'Rourke',
] as const;

const ALL_BIASES: readonly ScoutBias[] = ['tools_lover', 'stat_head', 'makeup_guy', 'neutral', 'neutral'] as const;

const ALL_SPECIALTIES: readonly (Position | 'all')[] = [
  'all', 'all', 'all',
  'SP', 'RP', 'CL',
  'C', '1B', '2B', '3B', 'SS',
  'LF', 'CF', 'RF', 'DH',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampDisplay(value: number): number {
  return Math.max(DISPLAY_MIN, Math.min(DISPLAY_MAX, Math.round(value)));
}

function generateScoutId(rng: GameRNG): string {
  const hex = () => rng.nextInt(0, 0xffff).toString(16).padStart(4, '0');
  return `scout-${hex()}${hex()}`;
}

/**
 * Compute the noise standard deviation for a given scout evaluating a player.
 * Returns value on the 20-80 display scale.
 */
function computeNoiseStddev(scout: Scout, playerPosition: Position): number {
  let stddev = BASE_NOISE * (1 - scout.quality / 100);

  // Specialty bonus: reduce noise when the scout specializes in this position
  if (scout.specialty !== 'all' && scout.specialty === playerPosition) {
    stddev *= (1 - SPECIALTY_NOISE_REDUCTION);
  }

  return stddev;
}

/**
 * Compute reliability score (0-1) from scout quality and position match.
 */
function computeReliability(scout: Scout, playerPosition: Position): number {
  let reliability = scout.quality / 100;

  if (scout.specialty !== 'all' && scout.specialty === playerPosition) {
    reliability = Math.min(1, reliability + SPECIALTY_CONFIDENCE_BOOST);
  }

  return reliability;
}

/**
 * Determine if a player is a pitcher based on their position.
 */
function isPitcherPosition(position: Position): boolean {
  return (PITCHER_POSITIONS as readonly string[]).includes(position);
}

/**
 * Apply bias adjustments to an observed display-scale rating.
 */
function applyBias(
  bias: ScoutBias,
  attrName: string,
  observedValue: number,
): number {
  switch (bias) {
    case 'tools_lover': {
      const toolsAttrs = ['power', 'speed', 'stuff', 'velocity'];
      const contactAttrs = ['contact', 'control'];
      if (toolsAttrs.includes(attrName)) return observedValue + 5;
      if (contactAttrs.includes(attrName)) return observedValue - 3;
      return observedValue;
    }
    case 'stat_head': {
      // More accurate on measurable stats (less additional noise),
      // less accurate on "feel" attributes (more additional noise).
      // Implemented as a small bias shift rather than noise change
      // so it is visible in the output.
      const measurable = ['velocity', 'power', 'speed', 'stamina'];
      const feel = ['eye', 'movement', 'defense'];
      if (measurable.includes(attrName)) return observedValue + 2;
      if (feel.includes(attrName)) return observedValue - 2;
      return observedValue;
    }
    case 'makeup_guy': {
      // No direct attribute bias; personality traits handled in notes
      return observedValue;
    }
    case 'neutral':
      return observedValue;
  }
}

/**
 * Get the ceiling/floor bonus based on player age and dev phase.
 * Young players have wide spreads; veterans have narrow ones.
 */
function getProjectionSpread(age: number): { ceilingBonus: number; floorRisk: number } {
  if (age <= YOUNG_AGE_THRESHOLD) {
    return { ceilingBonus: CEILING_YOUNG_BONUS, floorRisk: FLOOR_YOUNG_RISK };
  }
  if (age <= VETERAN_AGE_THRESHOLD) {
    return { ceilingBonus: CEILING_MID_BONUS, floorRisk: FLOOR_MID_RISK };
  }
  return { ceilingBonus: CEILING_VETERAN_BONUS, floorRisk: FLOOR_VETERAN_RISK };
}

// ---------------------------------------------------------------------------
// Note generation templates
// ---------------------------------------------------------------------------

const HITTER_POSITIVE_NOTES: readonly string[] = [
  'Quick bat with natural loft. Could develop plus power as he matures.',
  'Advanced approach at the plate. Rarely chases outside the zone.',
  'Smooth, repeatable swing. The ball jumps off his bat in batting practice.',
  'Plus runner who covers ground in the outfield. Instincts are outstanding.',
  'Solid all-around defender. Hands, feet, and arm all grade out above average.',
  'Elite hand-eye coordination. Makes consistent hard contact.',
  'Rare combination of speed and power. Tools are exciting.',
  'Polished college bat. What you see is what you get — safe pick.',
  'Strong frame with room to add muscle. Power could play up.',
  'Switch-hitter with advanced pitch recognition from both sides.',
];

const HITTER_NEGATIVE_NOTES: readonly string[] = [
  'Quick bat, but questions about pitch recognition at the highest level.',
  'Swing gets long against quality breaking stuff. May struggle against elite arms.',
  'Below-average runner who is limited defensively. The bat has to carry him.',
  'Contact-oriented hitter without much over-the-fence pop. Limited ceiling.',
  'Aggressive approach leads to high strikeout numbers. Needs to tighten the zone.',
  'Defensive position may need to move. Arm strength is fringe at best.',
];

const PITCHER_POSITIVE_NOTES: readonly string[] = [
  'Plus arm strength with room to grow. Could develop into a front-of-rotation arm.',
  'Advanced feel for his changeup. Misses bats consistently with offspeed stuff.',
  'Repeatable delivery with easy velocity. Low effort, high output.',
  'Four-pitch mix with command of all offerings. Projects as a solid mid-rotation arm.',
  'Electric arm with plus fastball and wipeout slider. Swing-and-miss stuff.',
  'Poise on the mound beyond his years. Pounds the zone with strikes.',
  'Big, durable frame built for 200 innings a year.',
];

const PITCHER_NEGATIVE_NOTES: readonly string[] = [
  'Velocity plays up in short stints but stamina is a concern for starting.',
  'Command wavers under pressure. Walks too many hitters in big spots.',
  'Injury history clouds the outlook. The talent is there when healthy.',
  'Stuff is more average than special. Pitchability arm with a low margin for error.',
  'Delivery has some effort. Scouts question long-term durability.',
  'Secondary stuff needs significant refinement. Fastball-only at this point.',
];

const HIGH_CEILING_NOTES: readonly string[] = [
  'Tools are loud but raw. High ceiling if it clicks, low floor if it doesn\'t.',
  'Upside is tremendous. One of the highest ceilings in the class.',
  'If he puts it all together, this is an All-Star talent.',
];

const MAKEUP_POSITIVE_NOTES: readonly string[] = [
  'Makeup is outstanding. First one in, last one out. Leaders trust him.',
  'Competitive fire burns hot. Lives for the big moment.',
  'Work ethic grades well above average. Constantly looking to improve.',
];

const MAKEUP_NEGATIVE_NOTES: readonly string[] = [
  'Makeup concerns — work ethic grades below average. Needs the right environment.',
  'Maturity questions persist. Talent is undeniable if the mental side catches up.',
  'Inconsistent effort raises red flags. Scouts want to see more urgency.',
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a scout with random attributes.
 */
export function generateScout(rng: GameRNG, id?: string): Scout {
  const scoutId = id ?? generateScoutId(rng);
  const firstName = SCOUT_FIRST_NAMES[rng.nextInt(0, SCOUT_FIRST_NAMES.length - 1)]!;
  const lastName = SCOUT_LAST_NAMES[rng.nextInt(0, SCOUT_LAST_NAMES.length - 1)]!;

  const quality = rng.nextInt(SCOUT_QUALITY_MIN, SCOUT_QUALITY_MAX);
  const specialty = ALL_SPECIALTIES[rng.nextInt(0, ALL_SPECIALTIES.length - 1)]!;
  const bias = ALL_BIASES[rng.nextInt(0, ALL_BIASES.length - 1)]!;

  // Salary loosely correlated with quality
  const salaryBase = SCOUT_SALARY_MIN + (quality / 100) * (SCOUT_SALARY_MAX - SCOUT_SALARY_MIN);
  const salaryJitter = rng.nextGaussian(0, 0.2);
  const salary = Math.round(Math.max(SCOUT_SALARY_MIN, salaryBase + salaryJitter) * 10) / 10;

  return {
    id: scoutId,
    name: `${firstName} ${lastName}`,
    quality,
    specialty,
    bias,
    salary,
  };
}

/**
 * Generate a scouting staff (5 scouts) for a team.
 */
export function generateScoutingStaff(rng: GameRNG, teamId: string): Scout[] {
  const staff: Scout[] = [];
  for (let i = 0; i < STAFF_SIZE; i++) {
    const scout = generateScout(rng, `${teamId}-scout-${i}`);
    staff.push(scout);
  }
  return staff;
}

/**
 * Create a scout report for a player.
 * The scout's quality, specialty, and bias all affect the observed ratings.
 */
export function scoutPlayer(
  rng: GameRNG,
  scout: Scout,
  player: GeneratedPlayer,
  seasonDay: string,
): ScoutReport {
  const noiseStddev = computeNoiseStddev(scout, player.position);
  const reliability = computeReliability(scout, player.position);
  const isPitcher = isPitcherPosition(player.position);

  // Build observed ratings on display scale
  const observedRatings: Record<string, number> = {};
  let ratingSum = 0;
  let ratingCount = 0;

  if (isPitcher && player.pitcherAttributes) {
    const attrs = player.pitcherAttributes;
    for (const key of Object.keys(attrs) as (keyof PitcherAttributes)[]) {
      const trueDisplay = toDisplayRating(attrs[key]);
      const noise = rng.nextGaussian(0, noiseStddev);
      let observed = trueDisplay + noise;
      observed = applyBias(scout.bias, key, observed);
      observed = clampDisplay(observed);
      observedRatings[key] = observed;
      ratingSum += observed;
      ratingCount++;
    }
  } else {
    const attrs = player.hitterAttributes;
    for (const key of Object.keys(attrs) as (keyof HitterAttributes)[]) {
      const trueDisplay = toDisplayRating(attrs[key]);
      const noise = rng.nextGaussian(0, noiseStddev);
      let observed = trueDisplay + noise;
      observed = applyBias(scout.bias, key, observed);
      observed = clampDisplay(observed);
      observedRatings[key] = observed;
      ratingSum += observed;
      ratingCount++;
    }
  }

  // Overall grade: weighted average of observed ratings
  const overallGrade = clampDisplay(ratingCount > 0 ? ratingSum / ratingCount : DISPLAY_MIN);

  // Confidence interval
  let confidenceWidth = Math.ceil(noiseStddev * CONFIDENCE_MULTIPLIER);
  if (scout.specialty !== 'all' && scout.specialty === player.position) {
    confidenceWidth = Math.ceil(confidenceWidth * (1 - SPECIALTY_CONFIDENCE_BOOST));
  }
  const confidence = Math.max(CONFIDENCE_MIN, Math.min(CONFIDENCE_MAX, confidenceWidth));

  // Ceiling / floor projection
  const { ceilingBonus, floorRisk } = getProjectionSpread(player.age);
  // Add a little scout-noise to the projection itself
  const ceilingNoise = rng.nextGaussian(0, 2);
  const floorNoise = rng.nextGaussian(0, 2);

  const ceiling = clampDisplay(overallGrade + ceilingBonus + ceilingNoise);
  const floor = clampDisplay(overallGrade - floorRisk + floorNoise);

  // Generate notes
  const notes = generateScoutNotes(rng, scout, player, overallGrade);

  return {
    playerId: player.id,
    scoutId: scout.id,
    reportDate: seasonDay,
    observedRatings,
    confidence,
    overallGrade,
    ceiling,
    floor,
    notes,
    reliability,
  };
}

/**
 * Combine multiple scout reports for a player (consensus view).
 * Weighted average by reliability; confidence narrows with more reports.
 */
export function combineReports(reports: ScoutReport[]): ScoutReport {
  if (reports.length === 0) {
    throw new Error('combineReports: no reports to combine');
  }
  if (reports.length === 1) {
    return { ...reports[0]! };
  }

  const totalReliability = reports.reduce((sum, r) => sum + r.reliability, 0);

  // Weighted average of observed ratings
  const allKeys = new Set<string>();
  for (const r of reports) {
    for (const key of Object.keys(r.observedRatings)) {
      allKeys.add(key);
    }
  }

  const combinedRatings: Record<string, number> = {};
  for (const key of allKeys) {
    let weightedSum = 0;
    let weightSum = 0;
    for (const r of reports) {
      if (key in r.observedRatings) {
        weightedSum += r.observedRatings[key]! * r.reliability;
        weightSum += r.reliability;
      }
    }
    combinedRatings[key] = clampDisplay(weightSum > 0 ? weightedSum / weightSum : DISPLAY_MIN);
  }

  // Weighted average for overall, ceiling, floor
  const overallGrade = clampDisplay(
    reports.reduce((s, r) => s + r.overallGrade * r.reliability, 0) / totalReliability,
  );
  const ceiling = clampDisplay(
    reports.reduce((s, r) => s + r.ceiling * r.reliability, 0) / totalReliability,
  );
  const floor = clampDisplay(
    reports.reduce((s, r) => s + r.floor * r.reliability, 0) / totalReliability,
  );

  // Confidence narrows with more reports (diminishing returns)
  const avgConfidence = reports.reduce((s, r) => s + r.confidence, 0) / reports.length;
  const confidence = Math.max(
    CONFIDENCE_MIN,
    Math.min(CONFIDENCE_MAX, Math.round(avgConfidence / Math.sqrt(reports.length))),
  );

  // Average reliability
  const reliability = Math.min(1, totalReliability / reports.length);

  // Combine notes: take the most reliable report's notes
  const bestReport = reports.reduce((best, r) => (r.reliability > best.reliability ? r : best));

  return {
    playerId: reports[0]!.playerId,
    scoutId: 'consensus',
    reportDate: reports[reports.length - 1]!.reportDate,
    observedRatings: combinedRatings,
    confidence,
    overallGrade,
    ceiling,
    floor,
    notes: bestReport.notes,
    reliability,
  };
}

/**
 * Get how accurately a team can evaluate a player based on their best
 * scout for that position. Returns 0-100.
 */
export function getTeamScoutingAccuracy(
  scouts: Scout[],
  playerPosition: Position,
): number {
  if (scouts.length === 0) return 0;

  let bestAccuracy = 0;

  for (const scout of scouts) {
    let accuracy = scout.quality;

    // Specialty bonus
    if (scout.specialty !== 'all' && scout.specialty === playerPosition) {
      accuracy = Math.min(100, accuracy + SPECIALTY_CONFIDENCE_BOOST * 100);
    }

    if (accuracy > bestAccuracy) {
      bestAccuracy = accuracy;
    }
  }

  return Math.round(bestAccuracy);
}

/**
 * Generate flavor text notes for a scout report.
 * Notes are contextual based on scout bias, player attributes, and observed grade.
 */
export function generateScoutNotes(
  rng: GameRNG,
  scout: Scout,
  player: GeneratedPlayer,
  observedOverall: number,
): string {
  const isPitcher = isPitcherPosition(player.position);
  const parts: string[] = [];

  // Primary note based on whether the player grades well or poorly
  const isAboveAverage = observedOverall >= 55;
  if (isPitcher) {
    const pool = isAboveAverage ? PITCHER_POSITIVE_NOTES : PITCHER_NEGATIVE_NOTES;
    parts.push(pool[rng.nextInt(0, pool.length - 1)]!);
  } else {
    const pool = isAboveAverage ? HITTER_POSITIVE_NOTES : HITTER_NEGATIVE_NOTES;
    parts.push(pool[rng.nextInt(0, pool.length - 1)]!);
  }

  // Young players with high grades get ceiling note
  if (player.age <= YOUNG_AGE_THRESHOLD && observedOverall >= 50) {
    if (rng.nextFloat() > 0.5) {
      parts.push(HIGH_CEILING_NOTES[rng.nextInt(0, HIGH_CEILING_NOTES.length - 1)]!);
    }
  }

  // Makeup notes influenced by scout bias and player personality
  const personality = player.personality;
  if (scout.bias === 'makeup_guy') {
    // Makeup scouts always comment on character
    if (personality.workEthic >= 70 && personality.leadership >= 60) {
      parts.push(MAKEUP_POSITIVE_NOTES[rng.nextInt(0, MAKEUP_POSITIVE_NOTES.length - 1)]!);
    } else if (personality.workEthic < 45) {
      parts.push(MAKEUP_NEGATIVE_NOTES[rng.nextInt(0, MAKEUP_NEGATIVE_NOTES.length - 1)]!);
    }
  } else {
    // Other scouts occasionally comment on makeup extremes
    if (personality.workEthic < 30 && rng.nextFloat() > 0.4) {
      parts.push(MAKEUP_NEGATIVE_NOTES[rng.nextInt(0, MAKEUP_NEGATIVE_NOTES.length - 1)]!);
    } else if (personality.workEthic >= 85 && personality.leadership >= 80 && rng.nextFloat() > 0.5) {
      parts.push(MAKEUP_POSITIVE_NOTES[rng.nextInt(0, MAKEUP_POSITIVE_NOTES.length - 1)]!);
    }
  }

  return parts.join(' ');
}
