import type { GameRNG } from '../math/prng.js';
import { toDisplayRating } from '../player/attributes.js';
import type { DraftProspect } from './draftPool.js';

const DISPLAY_GRADE_MIN = 20;
const DISPLAY_GRADE_MAX = 80;

export interface DraftScoutingReport {
  playerId: string;
  looks: number;
  accuracy: number;
  observedRatings: Record<string, number>;
  overallGrade: number;
  confidence: number;
  ceiling: number;
  floor: number;
  notes: string;
  reliability: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampGrade(value: number): number {
  return clamp(Math.round(value), DISPLAY_GRADE_MIN, DISPLAY_GRADE_MAX);
}

function observedGrade(rng: GameRNG, trueRating: number, noiseStdDev: number): number {
  return clampGrade(toDisplayRating(trueRating) + rng.nextGaussian(0, noiseStdDev));
}

function refineGrade(
  candidate: number,
  trueGrade: number,
  previousGrade?: number,
): number {
  if (previousGrade == null) {
    return candidate;
  }

  const previousError = Math.abs(previousGrade - trueGrade);
  const candidateError = Math.abs(candidate - trueGrade);
  const nextError = Math.min(candidateError, Math.max(0, Math.floor(previousError * 0.75)));
  const direction = candidate === trueGrade
    ? 0
    : candidate > trueGrade ? 1 : -1;

  return clampGrade(trueGrade + direction * nextError);
}

export function scoutDraftProspect(
  rng: GameRNG,
  prospect: DraftProspect,
  accuracy: number,
  previousReport?: DraftScoutingReport,
): DraftScoutingReport {
  const normalizedAccuracy = clamp(accuracy, 0.5, 0.95);
  const looks = (previousReport?.looks ?? 0) + 1;
  const noiseStdDev = Math.max(1, 18 * (1 - normalizedAccuracy) / Math.sqrt(looks));
  const trueOverallGrade = toDisplayRating(prospect.player.overallRating);

  const observedRatings: Record<string, number> = {
    contact: observedGrade(rng, prospect.player.hitterAttributes.contact, noiseStdDev),
    power: observedGrade(rng, prospect.player.hitterAttributes.power, noiseStdDev),
    eye: observedGrade(rng, prospect.player.hitterAttributes.eye, noiseStdDev),
    speed: observedGrade(rng, prospect.player.hitterAttributes.speed, noiseStdDev),
    defense: observedGrade(rng, prospect.player.hitterAttributes.defense, noiseStdDev),
  };

  if (prospect.player.pitcherAttributes) {
    observedRatings.stuff = observedGrade(rng, prospect.player.pitcherAttributes.stuff, noiseStdDev);
    observedRatings.control = observedGrade(rng, prospect.player.pitcherAttributes.control, noiseStdDev);
    observedRatings.velocity = observedGrade(rng, prospect.player.pitcherAttributes.velocity, noiseStdDev);
    observedRatings.movement = observedGrade(rng, prospect.player.pitcherAttributes.movement, noiseStdDev);
    observedRatings.stamina = observedGrade(rng, prospect.player.pitcherAttributes.stamina, noiseStdDev);
  }

  const overallGrade = refineGrade(
    observedGrade(rng, prospect.player.overallRating, noiseStdDev),
    trueOverallGrade,
    previousReport?.overallGrade,
  );
  const confidence = clamp(Math.round(normalizedAccuracy * looks * 10), 1, 20);
  const spread = Math.max(2, Math.round(noiseStdDev * 0.7));

  return {
    playerId: prospect.player.id,
    looks,
    accuracy: normalizedAccuracy,
    observedRatings,
    overallGrade,
    confidence,
    ceiling: clampGrade(overallGrade + spread + Math.max(0, prospect.signability * 6)),
    floor: clampGrade(overallGrade - spread - Math.max(0, prospect.commitmentStrength * 4)),
    notes: looks >= 3
      ? 'Multiple looks narrowed the variance. The makeup read is cleaner now.'
      : 'Early look. Tools are visible, but the board needs another trip.',
    reliability: normalizedAccuracy,
  };
}
