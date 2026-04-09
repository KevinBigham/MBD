import type { GameRNG } from '../math/prng.js';
import { clampRating } from './attributes.js';
import type { Coach } from './coaching.js';
import { getCoachingDevelopmentModifier } from './coaching.js';
import type { GeneratedPlayer } from './generation.js';
import { getPlayerArchetype } from './similarity.js';

export interface BreakoutSeasonHistoryEntry {
  prevRating: number;
  currRating: number;
}

export interface BreakoutFactor {
  name: string;
  weight: number;
  contribution: number;
  description: string;
}

export type BreakoutRiskLevel = 'low' | 'moderate' | 'high' | 'imminent';

export interface BreakoutAssessment {
  playerId: string;
  probability: number;
  factors: BreakoutFactor[];
  riskLevel: BreakoutRiskLevel;
  narrativeHook: string;
}

export type RegressionRiskLevel = 'stable' | 'concerning' | 'declining';

export interface RegressionAssessment {
  playerId: string;
  riskLevel: RegressionRiskLevel;
  declineRate: number;
  projectedFloor: number;
  warningSignals: string[];
}

export type CeilingConfidenceLevel = 'low' | 'medium' | 'high';

export interface CeilingProjection {
  playerId: string;
  projectedPeak: number;
  confidenceLevel: CeilingConfidenceLevel;
  comparisonArchetype: string;
  timelineSeasons: number;
}

export type BreakoutDevelopmentTrajectory =
  | 'rocket'
  | 'steady_climb'
  | 'plateau'
  | 'stalled'
  | 'declining'
  | 'volatile';

const FACTOR_WEIGHTS = {
  velocity: 30,
  agePhase: 25,
  ceilingGap: 20,
  coaching: 15,
  scarcity: 10,
} as const;

const MAX_FACTOR_SCORE = 100;
const MIN_PROBABILITY = 0;
const MAX_PROBABILITY = 100;
const PRIME_VETERAN_SOFT_CAP_AGE = 35;
const HARD_VETERAN_CUTOFF_AGE = 38;
const EMPTY_HISTORY_SCORE = 40;
const VOLATILE_SWING_THRESHOLD = 30;
const PLATEAU_DELTA_THRESHOLD = 2;
const STALLED_AVERAGE_THRESHOLD = 4;
const STEADY_CLIMB_AVERAGE = 5;
const ROCKET_AVERAGE = 18;
const DECLINING_AVERAGE = -5;
const MAX_CEILING_BONUS = 24;
const MAX_RATING_GAP = 130;
const MAX_DECLINE_FLOOR_DROP = 28;
const COACHING_MIN = 0.82;
const COACHING_MAX = 1.45;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function getAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getRecentDeltas(history: BreakoutSeasonHistoryEntry[]): number[] {
  return history.slice(-3).map((entry) => entry.currRating - entry.prevRating);
}

function normalizeScore(value: number, min: number, max: number): number {
  if (max <= min) {
    return 0;
  }

  return clamp(((value - min) / (max - min)) * MAX_FACTOR_SCORE, 0, MAX_FACTOR_SCORE);
}

function buildVelocityScore(history: BreakoutSeasonHistoryEntry[]): { score: number; description: string } {
  if (history.length === 0) {
    return {
      score: EMPTY_HISTORY_SCORE,
      description: 'No multi-season velocity history yet, so the growth signal stays neutral.',
    };
  }

  const deltas = getRecentDeltas(history);
  const averageDelta = getAverage(deltas);
  const score = normalizeScore(averageDelta, -5, 20);
  const descriptor = averageDelta >= 12
    ? 'Recent rating gains are accelerating quickly.'
    : averageDelta >= 5
      ? 'Recent gains point to steady forward progress.'
      : averageDelta >= 0
        ? 'Recent movement is modest and still needs confirmation.'
        : 'Recent movement has trended backward.';

  return {
    score,
    description: descriptor,
  };
}

function buildAgePhaseScore(player: GeneratedPlayer): { score: number; description: string } {
  if (player.developmentPhase === 'Decline' || player.developmentPhase === 'Retirement') {
    return {
      score: 0,
      description: 'The player is beyond the normal breakout window.',
    };
  }

  const age = player.age;
  let score = 0;

  switch (player.developmentPhase) {
    case 'Prospect':
      score = age <= 20 ? 100 : age <= 22 ? 90 : age <= 24 ? 70 : 45;
      break;
    case 'Ascent':
      score = age <= 24 ? 95 : age <= 26 ? 85 : age <= 28 ? 65 : 35;
      break;
    case 'Prime':
    default:
      score = age <= 27 ? 60 : age <= 30 ? 45 : age <= 33 ? 25 : 10;
      break;
  }

  if (age >= HARD_VETERAN_CUTOFF_AGE) {
    score = 0;
  }

  return {
    score,
    description: score >= 75
      ? 'Age and development phase are aligned with a typical breakout window.'
      : score >= 40
        ? 'The breakout window is still open but narrowing.'
        : 'Age-phase alignment is working against a major leap.',
  };
}

function getProjectedCeiling(player: GeneratedPlayer): number {
  return player.ceiling ?? player.potentialRating ?? clampRating(player.overallRating + 40);
}

function buildCeilingGapScore(player: GeneratedPlayer): { score: number; description: string } {
  const gap = Math.max(0, getProjectedCeiling(player) - player.overallRating);
  const score = normalizeScore(gap, 0, MAX_RATING_GAP);

  return {
    score,
    description: gap >= 70
      ? 'There is still major untapped projection left in the profile.'
      : gap >= 35
        ? 'There is enough ceiling left for another growth spurt.'
        : 'The current profile is already close to its likely peak.',
  };
}

function buildCoachingScore(
  player: GeneratedPlayer,
  coachingStaff: Coach[] | undefined,
): { score: number; description: string } {
  const modifier = getCoachingDevelopmentModifier(
    player,
    coachingStaff ?? [],
    player.minorLeagueLevel ?? player.rosterStatus,
  );
  const score = clamp(
    normalizeScore(modifier, COACHING_MIN, COACHING_MAX) + (coachingStaff != null && coachingStaff.length > 0 ? 10 : 0),
    0,
    MAX_FACTOR_SCORE,
  );

  return {
    score,
    description: modifier >= 1.1
      ? 'Coaching support is reinforcing the player’s growth path.'
      : modifier >= 0.98
        ? 'Coaching support is broadly neutral.'
        : 'Coaching support is not adding much developmental lift.',
  };
}

function getPositionalScarcityScore(position: GeneratedPlayer['position']): number {
  switch (position) {
    case 'C':
      return 100;
    case 'CF':
      return 70;
    case 'SS':
      return 80;
    case 'SP':
      return 72;
    case 'CL':
      return 65;
    case '2B':
    case '3B':
      return 58;
    case 'LF':
    case 'RF':
      return 45;
    case '1B':
    case 'RP':
      return 32;
    case 'DH':
    default:
      return 20;
  }
}

function buildScarcityScore(position: GeneratedPlayer['position']): { score: number; description: string } {
  const score = getPositionalScarcityScore(position);

  return {
    score,
    description: score >= 80
      ? 'A breakout at this defensive spot carries extra value because the role is scarce.'
      : score >= 50
        ? 'The position offers some scarcity lift.'
        : 'The position does not add much scarcity-driven breakout value.',
  };
}

function toContribution(score: number, weight: number): number {
  return roundToTenth((score / MAX_FACTOR_SCORE) * weight);
}

function sortFactors(factors: BreakoutFactor[]): BreakoutFactor[] {
  return [...factors].sort((left, right) => {
    if (right.contribution !== left.contribution) {
      return right.contribution - left.contribution;
    }

    return left.name.localeCompare(right.name);
  });
}

function getRiskLevel(probability: number): BreakoutRiskLevel {
  if (probability >= 80) {
    return 'imminent';
  }
  if (probability >= 60) {
    return 'high';
  }
  if (probability >= 35) {
    return 'moderate';
  }
  return 'low';
}

function buildNarrativeHook(
  player: GeneratedPlayer,
  probability: number,
  topFactor: BreakoutFactor,
): string {
  const playerName = `${player.firstName} ${player.lastName}`;

  if (probability >= 80) {
    return `${playerName} is showing breakout-ready growth, led by ${topFactor.name.toLowerCase()}.`;
  }
  if (probability >= 60) {
    return `${playerName} has a live breakout surge building around ${topFactor.name.toLowerCase()}.`;
  }
  if (probability >= 35) {
    return `${playerName} is still on the watch list because ${topFactor.name.toLowerCase()} is trending well.`;
  }

  return `${playerName} has some growth markers, but ${topFactor.name.toLowerCase()} is not enough to signal a breakout yet.`;
}

function hasAlternatingSwings(deltas: number[]): boolean {
  if (deltas.length < 3) {
    return false;
  }

  for (let index = 1; index < deltas.length; index += 1) {
    const previous = deltas[index - 1]!;
    const current = deltas[index]!;
    if (Math.abs(previous) < VOLATILE_SWING_THRESHOLD || Math.abs(current) < VOLATILE_SWING_THRESHOLD) {
      return false;
    }
    if (Math.sign(previous) === Math.sign(current)) {
      return false;
    }
  }

  return true;
}

function consecutiveNegativeCount(deltas: number[]): number {
  let longest = 0;
  let current = 0;

  for (const delta of deltas) {
    if (delta < 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

function buildTimelineSeasons(player: GeneratedPlayer): number {
  if (player.age <= 20) {
    return 4;
  }
  if (player.age <= 24) {
    return 3;
  }
  if (player.age <= 29) {
    return 2;
  }
  return 1;
}

function getConfidenceLevel(player: GeneratedPlayer): CeilingConfidenceLevel {
  if (player.age <= 21) {
    return 'high';
  }
  if (player.age <= 27) {
    return 'medium';
  }
  return 'low';
}

function trajectoryBias(player: GeneratedPlayer): number {
  switch (player.developmentTrajectory) {
    case 'ahead_of_curve':
      return 18;
    case 'on_track':
      return 8;
    case 'below_expectations':
      return 0;
    case 'bust_risk':
      return -12;
    default:
      return 4;
  }
}

export function calculateBreakoutProbability(
  player: GeneratedPlayer,
  seasonHistory: BreakoutSeasonHistoryEntry[] = [],
  coachingStaff: Coach[] = [],
): BreakoutAssessment {
  if (player.developmentPhase === 'Decline' || player.developmentPhase === 'Retirement') {
    return {
      playerId: player.id,
      probability: 0,
      factors: sortFactors([
        {
          name: 'Rating velocity',
          weight: FACTOR_WEIGHTS.velocity,
          contribution: 0,
          description: 'The player is beyond the normal breakout window.',
        },
        {
          name: 'Age-phase alignment',
          weight: FACTOR_WEIGHTS.agePhase,
          contribution: 0,
          description: 'The player is beyond the normal breakout window.',
        },
        {
          name: 'Ceiling gap',
          weight: FACTOR_WEIGHTS.ceilingGap,
          contribution: 0,
          description: 'The current profile is already close to its likely peak.',
        },
        {
          name: 'Coaching quality',
          weight: FACTOR_WEIGHTS.coaching,
          contribution: 0,
          description: 'Coaching support cannot reverse a late-phase aging curve.',
        },
        {
          name: 'Positional scarcity',
          weight: FACTOR_WEIGHTS.scarcity,
          contribution: 0,
          description: 'Positional value does not overcome the phase decline.',
        },
      ]),
      riskLevel: 'low',
      narrativeHook: `${player.firstName} ${player.lastName} is beyond the normal breakout phase.`,
    };
  }

  const velocity = buildVelocityScore(seasonHistory);
  const agePhase = buildAgePhaseScore(player);
  const ceilingGap = buildCeilingGapScore(player);
  const coaching = buildCoachingScore(player, coachingStaff);
  const scarcity = buildScarcityScore(player.position);

  let probability = roundToTenth(
    toContribution(velocity.score, FACTOR_WEIGHTS.velocity)
    + toContribution(agePhase.score, FACTOR_WEIGHTS.agePhase)
    + toContribution(ceilingGap.score, FACTOR_WEIGHTS.ceilingGap)
    + toContribution(coaching.score, FACTOR_WEIGHTS.coaching)
    + toContribution(scarcity.score, FACTOR_WEIGHTS.scarcity),
  );

  if (player.age >= PRIME_VETERAN_SOFT_CAP_AGE) {
    probability *= 0.35;
  }

  probability = clamp(Math.round(probability), MIN_PROBABILITY, MAX_PROBABILITY);

  const factors = sortFactors([
    {
      name: 'Rating velocity',
      weight: FACTOR_WEIGHTS.velocity,
      contribution: toContribution(velocity.score, FACTOR_WEIGHTS.velocity),
      description: velocity.description,
    },
    {
      name: 'Age-phase alignment',
      weight: FACTOR_WEIGHTS.agePhase,
      contribution: toContribution(agePhase.score, FACTOR_WEIGHTS.agePhase),
      description: agePhase.description,
    },
    {
      name: 'Ceiling gap',
      weight: FACTOR_WEIGHTS.ceilingGap,
      contribution: toContribution(ceilingGap.score, FACTOR_WEIGHTS.ceilingGap),
      description: ceilingGap.description,
    },
    {
      name: 'Coaching quality',
      weight: FACTOR_WEIGHTS.coaching,
      contribution: toContribution(coaching.score, FACTOR_WEIGHTS.coaching),
      description: coaching.description,
    },
    {
      name: 'Positional scarcity',
      weight: FACTOR_WEIGHTS.scarcity,
      contribution: toContribution(scarcity.score, FACTOR_WEIGHTS.scarcity),
      description: scarcity.description,
    },
  ]);

  const topFactor = factors[0]!;

  return {
    playerId: player.id,
    probability,
    factors,
    riskLevel: getRiskLevel(probability),
    narrativeHook: buildNarrativeHook(player, probability, topFactor),
  };
}

export function classifyDevelopmentTrajectory(deltas: number[]): BreakoutDevelopmentTrajectory {
  if (deltas.length === 0) {
    return 'stalled';
  }

  if (hasAlternatingSwings(deltas)) {
    return 'volatile';
  }

  const averageDelta = getAverage(deltas);
  const allNearZero = deltas.every((delta) => Math.abs(delta) <= PLATEAU_DELTA_THRESHOLD);
  const allMicroscopic = deltas.every((delta) => Math.abs(delta) <= 1);
  const nonZeroSigns = new Set(
    deltas
      .filter((delta) => delta !== 0)
      .map((delta) => Math.sign(delta)),
  );
  const allPositive = deltas.every((delta) => delta > 0);
  const mostlyNegative = deltas.filter((delta) => delta < 0).length >= Math.ceil(deltas.length * 0.67);

  if (allPositive && averageDelta >= ROCKET_AVERAGE) {
    return 'rocket';
  }
  if (averageDelta >= STEADY_CLIMB_AVERAGE && deltas.filter((delta) => delta > 0).length >= Math.ceil(deltas.length * 0.67)) {
    return 'steady_climb';
  }
  if (allMicroscopic || (allNearZero && nonZeroSigns.size <= 1)) {
    return 'plateau';
  }
  if (mostlyNegative && averageDelta <= DECLINING_AVERAGE) {
    return 'declining';
  }
  if (Math.abs(averageDelta) <= STALLED_AVERAGE_THRESHOLD) {
    return 'stalled';
  }

  return averageDelta > 0 ? 'steady_climb' : 'declining';
}

export function detectRegressionRisk(
  player: GeneratedPlayer,
  recentDeltas: number[],
): RegressionAssessment {
  const warningSignals: string[] = [];
  const averageDelta = getAverage(recentDeltas);
  const negativeRun = consecutiveNegativeCount(recentDeltas);
  const plateau = recentDeltas.length >= 2 && recentDeltas.every((delta) => Math.abs(delta) <= 1);
  const volatile = hasAlternatingSwings(recentDeltas);
  const declineRate = averageDelta < 0 ? Math.round(Math.abs(averageDelta)) : 0;

  let riskLevel: RegressionRiskLevel = 'stable';

  if (negativeRun >= 3 || averageDelta <= -8) {
    riskLevel = 'declining';
    warningSignals.push('Three consecutive decline checkpoints point to a real regression path.');
  }

  if (plateau) {
    riskLevel = riskLevel === 'declining' ? riskLevel : 'concerning';
    warningSignals.push('Progress has flattened into a plateau.');
  }

  if (volatile) {
    riskLevel = riskLevel === 'declining' ? riskLevel : 'concerning';
    warningSignals.push('Recent swings have been volatile and difficult to trust.');
  }

  const projectedFloor = Math.max(
    player.floor ?? clampRating(player.overallRating - MAX_DECLINE_FLOOR_DROP),
    clampRating(player.overallRating - Math.max(MAX_DECLINE_FLOOR_DROP, declineRate * 2)),
  );

  return {
    playerId: player.id,
    riskLevel,
    declineRate,
    projectedFloor,
    warningSignals,
  };
}

export function predictProspectCeiling(
  rng: GameRNG,
  player: GeneratedPlayer,
): CeilingProjection {
  const projectedCeiling = getProjectedCeiling(player);
  const gap = Math.max(0, projectedCeiling - player.overallRating);
  const weightedOffsets = [-8, -2, 4, 10, 16] as const;
  const weightedOffset = rng.weightedPick(
    weightedOffsets,
    [6, 14, 28, 30, 22],
  );
  const peak = clampRating(
    player.overallRating
    + Math.round(gap * 0.68)
    + trajectoryBias(player)
    + weightedOffset
    + Math.min(MAX_CEILING_BONUS, Math.round(gap * 0.12)),
  );

  return {
    playerId: player.id,
    projectedPeak: Math.max(player.overallRating, peak),
    confidenceLevel: getConfidenceLevel(player),
    comparisonArchetype: getPlayerArchetype(player).archetype,
    timelineSeasons: buildTimelineSeasons(player),
  };
}

function describeRiskLevel(riskLevel: BreakoutRiskLevel): string[] {
  switch (riskLevel) {
    case 'imminent':
      return [
        'Breakout indicators are arriving fast.',
        'The breakout wave looks ready to crest now.',
      ];
    case 'high':
      return [
        'This surge feels real and actionable.',
        'The current growth push is worth treating seriously.',
      ];
    case 'moderate':
      return [
        'The player is worth tracking closely on the watch list.',
        'Trend lines are positive, but more confirmation is needed.',
      ];
    case 'low':
    default:
      return [
        'Patience is still required before calling it a breakout.',
        'Monitor the profile, but the signals are still early.',
      ];
  }
}

export function generateBreakoutScoutReport(
  rng: GameRNG,
  player: GeneratedPlayer,
  assessment: BreakoutAssessment,
): string {
  const playerName = `${player.firstName} ${player.lastName}`;
  const topFactor = assessment.factors[0]?.name ?? 'Current trend';
  const riskLead = rng.weightedPick(describeRiskLevel(assessment.riskLevel), [1, 1]);

  return `${playerName}: ${riskLead} ${topFactor} is the leading signal, and the model is sitting at ${assessment.probability}%. ${assessment.narrativeHook}`;
}
