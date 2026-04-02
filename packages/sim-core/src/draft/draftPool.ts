/**
 * @module draftPool
 * Draft class generation: creates a full amateur draft + UDFA pool each season.
 * Uses GameRNG for all randomness — Math.random() is NEVER used.
 */

import type { GameRNG } from '../math/prng.js';
import {
  generatePlayer,
  HITTER_POSITIONS,
  PITCHER_POSITIONS,
  ALL_POSITIONS,
} from '../player/generation.js';
import type { GeneratedPlayer, Position } from '../player/generation.js';
import { toDisplayRating, clampRating } from '../player/attributes.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Total number of prospects generated per draft class. */
export const DRAFT_CLASS_SIZE = 750;

/** Number of draft rounds. */
export const DRAFT_ROUNDS = 20;

/** Number of teams in the league. */
export const NUM_TEAMS = 32;

/** Talent tier boundaries (pick ranges and internal overall ranges). */
const TALENT_TIERS = [
  { maxPick: 10,  overallMin: 250, overallMax: 400 },
  { maxPick: 30,  overallMin: 200, overallMax: 300 },
  { maxPick: 80,  overallMin: 175, overallMax: 280 },
  { maxPick: 160, overallMin: 150, overallMax: 250 }, // rounds 3-5
  { maxPick: 320, overallMin: 100, overallMax: 210 }, // rounds 6-10
  { maxPick: 640, overallMin: 60,  overallMax: 160 }, // rounds 11-20
  { maxPick: 750, overallMin: 40,  overallMax: 130 }, // udfa pool
] as const;

/** Scouting grade noise standard deviations by tier (top picks = more variance). */
const SCOUTING_NOISE_BY_TIER = [14, 12, 10, 8, 7, 6] as const;

/** Background type weights: college underclassmen lead, then seniors, then prep. */
const BACKGROUND_WEIGHTS = {
  college_senior: 30,
  college_underclass: 42,
  high_school: 30,
} as const;

export type DraftProspectBackground = 'college_senior' | 'college_underclass' | 'high_school';
const BACKGROUNDS: DraftProspectBackground[] = ['college_senior', 'college_underclass', 'high_school'];
const BG_WEIGHTS: number[] = [
  BACKGROUND_WEIGHTS.college_senior,
  BACKGROUND_WEIGHTS.college_underclass,
  BACKGROUND_WEIGHTS.high_school,
];

/** Age ranges by background. */
const AGE_RANGES: Record<DraftProspectBackground, [number, number]> = {
  college_senior: [21, 23],
  college_underclass: [18, 21],
  high_school: [17, 18],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DraftProspect {
  player: GeneratedPlayer;
  scoutingGrade: number;     // 20-80 perceived grade (may differ from true rating)
  signability: number;       // 0-1, higher = easier to sign
  collegeOrHS: DraftProspectBackground;
  background: DraftProspectBackground;
  commitmentStrength: number;
  draftRound: number;        // Projected round (1-20)
  positionRank: number;      // Rank among same-position prospects
  slotValue: number;
  askBonus: number;
  consensusRank: number;
}

export interface DraftClass {
  season: number;
  prospects: DraftProspect[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Determine which talent tier a prospect index falls into. */
function getTierIndex(prospectIndex: number): number {
  for (let i = 0; i < TALENT_TIERS.length; i++) {
    if (prospectIndex < TALENT_TIERS[i]!.maxPick) return i;
  }
  return TALENT_TIERS.length - 1;
}

/** Convert internal overall (0-550) to scouting grade (20-80) with noise. */
function scoutingGradeFromOverall(
  rng: GameRNG,
  trueOverall: number,
  noiseStddev: number,
): number {
  const safeOverall = Number.isFinite(trueOverall) ? trueOverall : 275;
  const safeNoiseStddev = Number.isFinite(noiseStddev) ? noiseStddev : 8;
  const baseGrade = toDisplayRating(safeOverall);
  const noise = rng.nextGaussian(0, safeNoiseStddev);
  const blended = baseGrade + noise;
  if (!Number.isFinite(blended)) {
    return 50;
  }
  return Math.max(20, Math.min(80, Math.round(blended)));
}

/** Determine projected draft round from a prospect's rank in the class. */
function projectedRound(prospectIndex: number): number {
  const picksPerRound = NUM_TEAMS;
  return Math.min(DRAFT_ROUNDS, Math.floor(prospectIndex / picksPerRound) + 1);
}

/** Pick a random position with realistic draft distribution. */
function pickDraftPosition(rng: GameRNG): Position {
  // Draft classes skew toward pitchers (~55%) and premium defensive spots.
  const positions = [...ALL_POSITIONS] as Position[];
  const weights = positions.map((pos) => {
    if (pos === 'SP') return 30;
    if (pos === 'RP') return 14;
    if (pos === 'CL') return 10;
    if (pos === 'SS' || pos === 'CF') return 8;
    if (pos === 'C') return 6;
    if (pos === 'DH') return 1;
    return 4; // remaining hitter positions
  });
  return rng.weightedPick(positions, weights);
}

function slotValueForIndex(prospectIndex: number): number {
  const totalDraftSlots = DRAFT_ROUNDS * NUM_TEAMS;
  const normalized = Math.min(1, prospectIndex / Math.max(1, totalDraftSlots - 1));
  const rawValue = 9 * Math.exp(-normalized * 3.1);
  return Math.max(0.15, Math.round(rawValue * 100) / 100);
}

function computeCommitmentStrength(
  rng: GameRNG,
  background: DraftProspectBackground,
): number {
  if (background === 'college_senior') {
    return 0;
  }
  if (background === 'college_underclass') {
    return Math.max(0, Math.min(1, rng.nextGaussian(0.45, 0.15)));
  }
  return Math.max(0, Math.min(1, rng.nextGaussian(0.62, 0.18)));
}

function computeAskBonus(
  rng: GameRNG,
  slotValue: number,
  background: DraftProspectBackground,
  commitmentStrength: number,
  tierIdx: number,
): number {
  const baseMultiplier =
    background === 'college_senior' ? 0.82
      : background === 'college_underclass' ? 0.92 + commitmentStrength * 0.28
        : 1.02 + commitmentStrength * 0.38;
  const tierPremium = Math.max(0, (5 - Math.min(tierIdx, 5)) * 0.04);
  const noise = rng.nextGaussian(0, 0.04);
  return Math.max(0.05, Math.round(slotValue * (baseMultiplier + tierPremium + noise) * 100) / 100);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a full draft class of ~300 amateur prospects for a given season.
 * Prospects are created with realistic talent distribution and scouting variance.
 */
export function generateDraftClass(rng: GameRNG, season: number): DraftClass {
  const prospects: DraftProspect[] = [];

  for (let i = 0; i < DRAFT_CLASS_SIZE; i++) {
    const tierIdx = getTierIndex(i);
    const tier = TALENT_TIERS[tierIdx]!;
    const noiseStddev = SCOUTING_NOISE_BY_TIER[tierIdx]!;

    // Pick background
    const background = rng.weightedPick(BACKGROUNDS, BG_WEIGHTS);
    const [ageMin, ageMax] = AGE_RANGES[background];
    const commitmentStrength = computeCommitmentStrength(rng, background);
    const slotValue = slotValueForIndex(i);

    // Pick position
    const position = pickDraftPosition(rng);

    // Generate the player as a draft prospect in rookie ball.
    const player = generatePlayer(rng, position, 'draft_pool', 'ROOKIE');

    // Override age to match background
    (player as { age: number }).age = rng.nextInt(ageMin, ageMax);
    (player as { developmentPhase: string }).developmentPhase = 'Prospect';

    // Scale overall to match talent tier expectations
    const targetOverall = rng.nextInt(tier.overallMin, tier.overallMax);
    const currentOverall = player.overallRating;
    if (currentOverall > 0) {
      const scaleFactor = targetOverall / currentOverall;
      // Scale the relevant attributes to hit the target overall
      scalePlayerAttributes(player, scaleFactor);
      (player as { overallRating: number }).overallRating = normalizeOverallRating(
        recomputeOverall(player),
        targetOverall,
      );
    }

    (player as { overallRating: number }).overallRating = normalizeOverallRating(player.overallRating, targetOverall);
    const scoutingGrade = scoutingGradeFromOverall(rng, player.overallRating, noiseStddev);
    const signability = computeSignability(rng, background, tierIdx, commitmentStrength);
    const askBonus = computeAskBonus(rng, slotValue, background, commitmentStrength, tierIdx);

    prospects.push({
      player,
      scoutingGrade,
      signability,
      collegeOrHS: background,
      background,
      commitmentStrength,
      draftRound: projectedRound(i),
      positionRank: 0, // filled by rankProspects
      slotValue,
      askBonus,
      consensusRank: i + 1,
    });
  }

  // Assign position ranks
  const ranked = rankProspects(prospects);

  return { season, prospects: ranked };
}

/**
 * Rank prospects by scouting grade (descending) and assign positionRank
 * within each position group.
 */
export function rankProspects(prospects: DraftProspect[]): DraftProspect[] {
  // Sort by scouting grade descending
  const sorted = [...prospects].sort((a, b) => b.scoutingGrade - a.scoutingGrade);

  // Assign position ranks
  const positionCounters = new Map<string, number>();

  for (const prospect of sorted) {
    const pos = prospect.player.position;
    const rank = (positionCounters.get(pos) ?? 0) + 1;
    positionCounters.set(pos, rank);
    prospect.positionRank = rank;
  }

  // Re-assign projected round based on overall ranking
  for (let i = 0; i < sorted.length; i++) {
    sorted[i]!.draftRound = projectedRound(i);
    sorted[i]!.consensusRank = i + 1;
  }

  return sorted;
}

// ---------------------------------------------------------------------------
// Attribute scaling helpers
// ---------------------------------------------------------------------------

function scalePlayerAttributes(player: GeneratedPlayer, factor: number): void {
  const ha = player.hitterAttributes;
  ha.contact = clampRating(ha.contact * factor);
  ha.power = clampRating(ha.power * factor);
  ha.eye = clampRating(ha.eye * factor);
  ha.speed = clampRating(ha.speed * factor);
  ha.defense = clampRating(ha.defense * factor);
  ha.durability = clampRating(ha.durability * factor);

  if (player.pitcherAttributes) {
    const pa = player.pitcherAttributes;
    pa.stuff = clampRating(pa.stuff * factor);
    pa.control = clampRating(pa.control * factor);
    pa.stamina = clampRating(pa.stamina * factor);
    pa.velocity = clampRating(pa.velocity * factor);
    pa.movement = clampRating(pa.movement * factor);
  }
}

function recomputeOverall(player: GeneratedPlayer): number {
  const isPitcher = player.pitcherAttributes !== null;
  if (isPitcher) {
    const pa = player.pitcherAttributes!;
    return Math.round(
      pa.stuff * 0.30 + pa.control * 0.25 + pa.stamina * 0.15 +
      pa.velocity * 0.15 + pa.movement * 0.15,
    );
  }
  const ha = player.hitterAttributes;
  return Math.round(
    ha.contact * 0.25 + ha.power * 0.20 + ha.eye * 0.15 +
    ha.speed * 0.15 + ha.defense * 0.15 + ha.durability * 0.10,
  );
}

function normalizeOverallRating(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(550, Math.round(value)));
}

function computeSignability(
  rng: GameRNG,
  background: DraftProspectBackground,
  tierIdx: number,
  commitmentStrength: number,
): number {
  // Seniors are extremely signable; prep bats/arms carry the most leverage.
  const baseSignability =
    background === 'college_senior' ? 0.98 :
    background === 'college_underclass' ? 0.78 :
    0.52;

  // Higher tier (lower index) = harder to sign (they have leverage).
  const tierPenalty = Math.max(0, (5 - Math.min(tierIdx, 5)) * 0.03);
  const commitmentPenalty = commitmentStrength * (background === 'high_school' ? 0.32 : 0.18);
  const noise = rng.nextGaussian(0, 0.05);

  return Math.max(0, Math.min(1, baseSignability - tierPenalty - commitmentPenalty + noise));
}
