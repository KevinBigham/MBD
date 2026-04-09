import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';

export interface ScoutObservation {
  scoutId: string;
  playerId: string;
  observedRating: number;
  confidence: number;
  timestamp: string;
  scoutSkill: number;
}

export type ConsensusAgreementLevel = 'unanimous' | 'majority' | 'split' | 'conflicted';

export interface ConsensusReport {
  playerId: string;
  consensusRating: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  agreementLevel: ConsensusAgreementLevel;
  outlierScoutIds: string[];
}

export type ScoutBiasDirection = 'optimistic' | 'pessimistic' | 'neutral';

export interface ScoutAccuracyProfile {
  scoutId: string;
  lifetimeMae: number;
  recentMae: number;
  biasDirection: ScoutBiasDirection;
  bestPositionGroup: string;
  worstPositionGroup: string;
}

export interface ScoutLearningEvent {
  scoutId: string;
  playerId: string;
  previousConfidence: number;
  newConfidence: number;
  insightGained: string;
}

export interface AttributeEstimate {
  pointEstimate: number;
  low: number;
  high: number;
  confidence: number;
}

export interface ScoutProfile {
  id: string;
  skill: number;
  experience: number;
  bias: number;
}

export interface ScoutPrediction {
  scoutId: string;
  playerId: string;
  predictedRating: number;
  season: number;
  positionGroup?: string;
}

export interface ActualOutcome {
  playerId: string;
  actualRating: number;
  season: number;
  positionGroup?: string;
}

const CONFIDENCE_CAP = 95;
const RECENT_SAMPLE_SIZE = 5;
const DEFAULT_POSITION_GROUP = 'overall';
const BASE_INTERVAL_WIDTH = 14;
const MIN_INTERVAL_WIDTH = 2;
const MAX_INTERVAL_WIDTH = 30;
const BIAS_THRESHOLD = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizePositionGroup(positionGroup?: string): string {
  return positionGroup ?? DEFAULT_POSITION_GROUP;
}

function ratingKey(
  playerId: string,
  season: number,
  positionGroup?: string,
): string {
  return `${playerId}:${season}:${normalizePositionGroup(positionGroup)}`;
}

function getAgreementLevel(stdDeviation: number): ConsensusAgreementLevel {
  if (stdDeviation < 5) {
    return 'unanimous';
  }
  if (stdDeviation < 10) {
    return 'majority';
  }
  if (stdDeviation < 20) {
    return 'split';
  }
  return 'conflicted';
}

function baseConfidenceFromScout(scout: ScoutProfile): number {
  return clamp(
    Math.round(40 + (scout.skill * 0.28) + (scout.experience * 1.7) - (Math.abs(scout.bias) * 1.5)),
    20,
    CONFIDENCE_CAP - 1,
  );
}

function buildErrorHistory(scout: ScoutProfile): number[] {
  const baselineError = clamp(16 - (scout.skill / 8) + (Math.abs(scout.bias) * 1.5), 1, 25);
  return [
    roundToTenth(baselineError),
    roundToTenth(clamp(baselineError + 1.5, 1, 25)),
    roundToTenth(clamp(baselineError - 1, 1, 25)),
  ];
}

export function updateScoutConfidence(
  currentConfidence: number,
  observationCount: number,
  accuracyHistory: number[],
): number {
  const boundedCurrent = clamp(currentConfidence, 0, CONFIDENCE_CAP);
  const meanError = average(accuracyHistory.map((entry) => Math.abs(entry)));
  const exposureFactor = 1 - (1 / (observationCount + 1));
  const accuracyModifier = clamp(1 - (meanError / 30), 0.2, 1.05);
  const learnedConfidence = boundedCurrent + ((CONFIDENCE_CAP - boundedCurrent) * exposureFactor * accuracyModifier);
  const penalty = meanError > 10 ? (meanError - 10) * 1.2 : 0;

  return Math.round(clamp(learnedConfidence - penalty, 0, CONFIDENCE_CAP));
}

export function buildMultiScoutConsensus(
  reports: ScoutObservation[],
): ConsensusReport {
  if (reports.length === 0) {
    throw new Error('buildMultiScoutConsensus: at least one report is required');
  }

  const totalWeight = reports.reduce(
    (sum, report) => sum + (report.confidence * report.scoutSkill),
    0,
  );
  const consensusRaw = reports.reduce(
    (sum, report) => sum + (report.observedRating * report.confidence * report.scoutSkill),
    0,
  ) / Math.max(totalWeight, 1);
  const consensusRating = Math.round(consensusRaw);
  const variance = reports.reduce((sum, report) => {
    const diff = report.observedRating - consensusRaw;
    return sum + ((report.confidence * report.scoutSkill) * diff * diff);
  }, 0) / Math.max(totalWeight, 1);
  const stdDeviation = Math.sqrt(variance);
  const agreementLevel = getAgreementLevel(stdDeviation);
  const averageConfidence = average(reports.map((report) => report.confidence));
  const intervalRadius = Math.max(
    1,
    Math.round(Math.max(stdDeviation, averageConfidence / Math.sqrt(reports.length * 6))),
  );
  const outlierThreshold = Math.max(7, stdDeviation);
  const outlierScoutIds = reports
    .filter((report) => Math.abs(report.observedRating - consensusRaw) > outlierThreshold)
    .map((report) => report.scoutId)
    .sort((left, right) => left.localeCompare(right));

  return {
    playerId: reports[0]!.playerId,
    consensusRating,
    confidenceInterval: {
      low: consensusRating - intervalRadius,
      high: consensusRating + intervalRadius,
    },
    agreementLevel,
    outlierScoutIds,
  };
}

export function calculateScoutAccuracy(
  predictions: ScoutPrediction[],
  actuals: ActualOutcome[],
): ScoutAccuracyProfile {
  const actualByKey = new Map(
    actuals.map((outcome) => [ratingKey(outcome.playerId, outcome.season, outcome.positionGroup), outcome]),
  );
  const matched = predictions
    .map((prediction) => {
      const actual = actualByKey.get(ratingKey(prediction.playerId, prediction.season, prediction.positionGroup));
      if (!actual) {
        return null;
      }

      const signedError = prediction.predictedRating - actual.actualRating;
      return {
        season: prediction.season,
        positionGroup: normalizePositionGroup(prediction.positionGroup),
        absoluteError: Math.abs(signedError),
        signedError,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => left.season - right.season);

  const scoutId = predictions[0]?.scoutId ?? 'unknown';
  if (matched.length === 0) {
    return {
      scoutId,
      lifetimeMae: 0,
      recentMae: 0,
      biasDirection: 'neutral',
      bestPositionGroup: DEFAULT_POSITION_GROUP,
      worstPositionGroup: DEFAULT_POSITION_GROUP,
    };
  }

  const lifetimeMae = roundToTenth(average(matched.map((entry) => entry.absoluteError)));
  const recentMae = roundToTenth(average(matched.slice(-RECENT_SAMPLE_SIZE).map((entry) => entry.absoluteError)));
  const signedAverage = average(matched.map((entry) => entry.signedError));
  const perGroup = new Map<string, number[]>();
  for (const entry of matched) {
    const groupErrors = perGroup.get(entry.positionGroup) ?? [];
    groupErrors.push(entry.absoluteError);
    perGroup.set(entry.positionGroup, groupErrors);
  }

  const grouped = [...perGroup.entries()]
    .map(([positionGroup, errors]) => ({
      positionGroup,
      mae: average(errors),
    }))
    .sort((left, right) => left.mae - right.mae || left.positionGroup.localeCompare(right.positionGroup));

  return {
    scoutId,
    lifetimeMae,
    recentMae,
    biasDirection: signedAverage > BIAS_THRESHOLD
      ? 'optimistic'
      : signedAverage < -BIAS_THRESHOLD
        ? 'pessimistic'
        : 'neutral',
    bestPositionGroup: grouped[0]?.positionGroup ?? DEFAULT_POSITION_GROUP,
    worstPositionGroup: grouped[grouped.length - 1]?.positionGroup ?? DEFAULT_POSITION_GROUP,
  };
}

export function generateScoutLearningEvent(
  rng: GameRNG,
  scout: ScoutProfile,
  player: GeneratedPlayer,
  seasonsObserved: number,
): ScoutLearningEvent {
  const previousConfidence = baseConfidenceFromScout(scout);
  const newConfidence = updateScoutConfidence(
    previousConfidence,
    seasonsObserved * 4 + scout.experience,
    buildErrorHistory(scout),
  );
  const confidenceDelta = newConfidence - previousConfidence;
  const youngPlayerTemplates = [
    'Projection is clearer now, and the frame hints at more growth ahead.',
    'Growth markers are easier to trust, especially in how the body is still projecting.',
  ] as const;
  const olderPlayerTemplates = [
    'Refinement traits are standing out now, and the reads look more polished.',
    'Polish is easier to trust now, especially in the player’s refined game reads.',
  ] as const;
  const longExposureTemplates = [
    'Multiple seasons of looks have built an extended look history that is hard to dismiss.',
    'Extended look history across multiple seasons is sharpening the final read.',
  ] as const;
  const smallDeltaTemplates = [
    'The gain is steady, but it still reads like an incremental change from a small sample.',
    'Confidence moved only a little, so the takeaway stays steady and tied to a small sample.',
  ] as const;

  let insightGained = '';
  if (seasonsObserved >= 4) {
    insightGained = rng.weightedPick([...longExposureTemplates], [1, 1]);
  } else if (confidenceDelta <= 4 || seasonsObserved <= 1 || scout.experience <= 2) {
    insightGained = rng.weightedPick([...smallDeltaTemplates], [1, 1]);
  } else if (player.age <= 23) {
    insightGained = rng.weightedPick([...youngPlayerTemplates], [1, 1]);
  } else {
    insightGained = rng.weightedPick([...olderPlayerTemplates], [1, 1]);
  }

  return {
    scoutId: scout.id,
    playerId: player.id,
    previousConfidence,
    newConfidence,
    insightGained,
  };
}

export function estimateAttributeWithUncertainty(
  rng: GameRNG,
  trueValue: number,
  scoutSkill: number,
  observationCount: number,
): AttributeEstimate {
  const normalizedSkill = clamp(scoutSkill, 10, 100) / 100;
  const observationFactor = Math.sqrt(observationCount + 1);
  const intervalWidth = Math.round(clamp(
    BASE_INTERVAL_WIDTH * (1 / normalizedSkill) * (1 / observationFactor),
    MIN_INTERVAL_WIDTH,
    MAX_INTERVAL_WIDTH,
  ));
  const pointEstimate = Math.round(trueValue + rng.nextGaussian(0, intervalWidth / 3));
  const confidence = Math.round(clamp(
    (normalizedSkill * 60) + (Math.log2(observationCount + 1) * 12),
    0,
    CONFIDENCE_CAP,
  ));

  return {
    pointEstimate,
    low: pointEstimate - intervalWidth,
    high: pointEstimate + intervalWidth,
    confidence,
  };
}
