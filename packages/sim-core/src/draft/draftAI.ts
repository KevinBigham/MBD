/**
 * @module draftAI
 * AI draft selection logic: determines draft order, evaluates team needs,
 * and runs the full 20-round draft for all 32 teams.
 * Uses GameRNG for all randomness; the JS global random API is never used.
 */

import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer, Position } from '../player/generation.js';
import { HITTER_POSITIONS, PITCHER_POSITIONS } from '../player/generation.js';
import type { DraftProspect, DraftClass } from './draftPool.js';
import { DRAFT_ROUNDS, NUM_TEAMS } from './draftPool.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Pick score formula weights. */
const WEIGHT_BPA = 0.60;
const WEIGHT_NEED = 0.25;
const WEIGHT_SIGNABILITY = 0.15;

/** Need bonus values. */
const PRIMARY_NEED_BONUS = 10;
const SECONDARY_NEED_BONUS = 5;

/** Signability multiplier to put it on comparable scale to scouting grade. */
const SIGNABILITY_SCALE = 20;

/** Visible risk/upside proxy multiplier to keep it on the scouting-grade scale. */
const UPSIDE_SCALE = 20;
const MAX_DRAFT_PROFILE_ADJUSTMENT = 8;

/** Minimum roster count at a position before it becomes a need. */
const MIN_POSITION_DEPTH: Record<string, number> = {
  C: 2, '1B': 2, '2B': 2, '3B': 2, SS: 2,
  LF: 2, CF: 2, RF: 2, DH: 1,
  SP: 5, RP: 4, CL: 1,
};

/** Need score thresholds. */
const NEED_SCORE_CRITICAL = 90;
const NEED_SCORE_HIGH = 70;
const NEED_SCORE_MODERATE = 50;
const NEED_SCORE_LOW = 25;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DraftPick {
  round: number;
  pickNumber: number;   // Overall pick number (1-640)
  teamId: string;
  prospect: DraftProspect;
}

export interface DraftResult {
  picks: DraftPick[];
  undrafted: DraftProspect[];
}

const DRAFT_STRATEGY_IDS = ['balanced', 'board', 'college_secure', 'need_first', 'pitching', 'premium_athletes', 'upside'] as const;
type DraftStrategyArchetype = (typeof DRAFT_STRATEGY_IDS)[number];
type DraftStrategyIndex = number;

const ORG_DRAFT_PROFILE_VERSION = 1 as const;

export interface OrganizationDraftProfileV1 {
  readonly version: 1;
  readonly id: string;
  readonly bpaWeight: number;
  readonly needWeight: number;
  readonly signabilityWeight: number;
  readonly upsideOrRiskWeight: number;
  readonly ageOrBackgroundLean: number;
  readonly pitchingLean: number;
  readonly premiumPositionLean: number;
}

export interface DraftCandidateVisibleInput {
  readonly playerId: string;
  readonly position: Position;
  readonly age: number;
  readonly scoutingGrade: number;
  readonly signability: number;
  readonly background: DraftProspect['background'];
  readonly commitmentStrength?: number;
  readonly consensusRank?: number;
  readonly projectedRound?: number;
  readonly positionRank?: number;
}

export interface DraftCandidateScoreBreakdown {
  readonly profileVersion: 1;
  readonly profileId: string;
  readonly playerId: string;
  readonly bpa: number;
  readonly need: number;
  readonly signability: number;
  readonly riskOrUpside: number;
  readonly backgroundOrAge: number;
  readonly positionBias: number;
  readonly profileAdjustment: number;
  readonly scoreBeforeTiebreak: number;
}

type ProfileWeights = readonly [number, number, number, number, number, number, number];
const DRAFT_STRATEGY_PROFILES: Record<DraftStrategyArchetype, ProfileWeights> = {
  balanced: [WEIGHT_BPA, WEIGHT_NEED, WEIGHT_SIGNABILITY, 0.04, 0, 0, 0],
  board: [0.64, 0.18, 0.12, 0.06, 0, 0, 1.5],
  college_secure: [0.56, 0.22, 0.22, 0.02, -2, 0, 0],
  need_first: [0.50, 0.36, 0.10, 0.04, 0, 0, 0],
  pitching: [0.54, 0.22, 0.12, 0.06, 0, 4, 0],
  premium_athletes: [0.54, 0.20, 0.11, 0.10, 1, 0, 4],
  upside: [0.56, 0.18, 0.06, 0.20, 2, 0, 2],
};

const TEAM_DRAFT_STRATEGY: Record<string, DraftStrategyIndex> = {
  nym: 1, phi: 2, bos: 1, bal: 5, wsh: 2, chi: 1, det: 3, cle: 4,
  col: 0, pit: 6, kc: 5, msp: 4, stl: 2, ind: 5, mil: 0, nas: 6,
  mia: 6, atl: 5, cha: 0, orl: 6, ral: 2, hou: 1, dal: 3, sat: 4,
  den: 5, aus: 6, lax: 1, sfb: 2, phx: 3, sea: 4, sdg: 0, por: 5,
};

// ---------------------------------------------------------------------------
// Draft order
// ---------------------------------------------------------------------------

/**
 * Determine draft order from standings. Worst record picks first.
 * Ties are broken by fewer wins, then alphabetically by teamId.
 */
export function determineDraftOrder(
  teamRecords: Array<{ teamId: string; wins: number; losses: number }>,
): string[] {
  const sorted = [...teamRecords].sort((a, b) => {
    const wpctA = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0.5;
    const wpctB = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0.5;
    if (wpctA !== wpctB) return wpctA - wpctB; // worst first
    if (a.wins !== b.wins) return a.wins - b.wins; // fewer wins first
    return a.teamId.localeCompare(b.teamId);       // alphabetical tiebreaker
  });

  return sorted.map((r) => r.teamId);
}

// ---------------------------------------------------------------------------
// Team needs evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate positional needs for a team. Returns a Map of position -> need score (0-100).
 * Higher score = greater need at that position.
 */
export function evaluateTeamNeeds(teamRoster: GeneratedPlayer[]): Map<string, number> {
  const needs = new Map<string, number>();

  // Count players at each position
  const positionCounts = new Map<string, number>();
  for (const player of teamRoster) {
    const count = positionCounts.get(player.position) ?? 0;
    positionCounts.set(player.position, count + 1);
  }

  // Calculate quality at each position (average overall of top N players)
  const positionQuality = new Map<string, number>();
  for (const pos of [...HITTER_POSITIONS, ...PITCHER_POSITIONS]) {
    const players = teamRoster
      .filter((p) => p.position === pos)
      .sort((a, b) => b.overallRating - a.overallRating);

    const topN = Math.min(players.length, MIN_POSITION_DEPTH[pos] ?? 2);
    if (topN === 0) {
      positionQuality.set(pos, 0);
    } else {
      const avgRating = players.slice(0, topN).reduce((sum, p) => sum + p.overallRating, 0) / topN;
      positionQuality.set(pos, avgRating);
    }
  }

  // Compute need scores
  for (const pos of [...HITTER_POSITIONS, ...PITCHER_POSITIONS]) {
    const count = positionCounts.get(pos) ?? 0;
    const minDepth = MIN_POSITION_DEPTH[pos] ?? 2;
    const quality = positionQuality.get(pos) ?? 0;

    let needScore = 0;

    // Depth component: missing starters is critical
    if (count === 0) {
      needScore = NEED_SCORE_CRITICAL;
    } else if (count < minDepth) {
      needScore = NEED_SCORE_HIGH;
    } else if (count === minDepth) {
      needScore = NEED_SCORE_MODERATE;
    } else {
      needScore = NEED_SCORE_LOW;
    }

    // Quality component: low quality increases need even if depth is fine
    // Convert internal rating (0-550) to a 0-100 quality score
    const qualityPct = Math.min(100, (quality / 550) * 100);
    const qualityPenalty = Math.max(0, 50 - qualityPct) * 0.6;
    needScore = Math.min(100, needScore + qualityPenalty);

    needs.set(pos, Math.round(needScore));
  }

  return needs;
}

// ---------------------------------------------------------------------------
// AI pick selection
// ---------------------------------------------------------------------------

export function getOrganizationDraftProfile(teamId: string): Readonly<OrganizationDraftProfileV1> {
  const strategyIndex = TEAM_DRAFT_STRATEGY[teamId] ?? 0;
  const archetype = DRAFT_STRATEGY_IDS[strategyIndex] ?? DRAFT_STRATEGY_IDS[0];
  const [bpaWeight, needWeight, signabilityWeight, upsideOrRiskWeight, ageOrBackgroundLean, pitchingLean, premiumPositionLean] = DRAFT_STRATEGY_PROFILES[archetype];
  return Object.freeze({ version: ORG_DRAFT_PROFILE_VERSION, id: archetype, bpaWeight, needWeight, signabilityWeight, upsideOrRiskWeight, ageOrBackgroundLean, pitchingLean, premiumPositionLean });
}

export function toDraftCandidateVisibleInput(prospect: DraftProspect): DraftCandidateVisibleInput {
  return Object.freeze({
    playerId: prospect.player.id,
    position: prospect.player.position,
    age: prospect.player.age,
    scoutingGrade: prospect.scoutingGrade,
    signability: prospect.signability,
    background: prospect.background,
  });
}

function visibleRiskOrUpside(candidate: DraftCandidateVisibleInput): number {
  const youth = Math.max(0, Math.min(1, (21 - candidate.age) / 4));
  const prep = candidate.background === 'high_school' ? 1 : candidate.background === 'college_underclass' ? 0.5 : 0;
  return Math.min(UPSIDE_SCALE, (candidate.scoutingGrade / 80) * 8 + youth * 6 + prep * 6);
}

function visibleBackgroundAge(candidate: DraftCandidateVisibleInput): number {
  return candidate.background === 'college_senior' ? -1 : candidate.background === 'high_school' ? 1 : 0;
}

function positionBias(candidate: DraftCandidateVisibleInput, profile: Readonly<OrganizationDraftProfileV1>): number {
  const pitcher = candidate.position === 'SP' || candidate.position === 'RP' || candidate.position === 'CL';
  const premium = candidate.position === 'C' || candidate.position === 'SS' || candidate.position === 'CF';
  return (pitcher ? profile.pitchingLean : 0) + (premium ? profile.premiumPositionLean : 0);
}

export function scoreDraftCandidate(
  profile: Readonly<OrganizationDraftProfileV1>,
  candidate: DraftCandidateVisibleInput,
  needs: ReadonlyMap<string, number>,
): DraftCandidateScoreBreakdown {
  const sortedNeeds = [...needs.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const need = candidate.position === sortedNeeds[0]?.[0] ? PRIMARY_NEED_BONUS : candidate.position === sortedNeeds[1]?.[0] ? SECONDARY_NEED_BONUS : 0;
  const bpa = candidate.scoutingGrade * profile.bpaWeight;
  const needComponent = need * profile.needWeight;
  const signability = candidate.signability * SIGNABILITY_SCALE * profile.signabilityWeight;
  const riskOrUpside = visibleRiskOrUpside(candidate) * profile.upsideOrRiskWeight;
  const backgroundOrAge = visibleBackgroundAge(candidate) * profile.ageOrBackgroundLean;
  const positionComponent = positionBias(candidate, profile);
  const rawAdjustment = needComponent + signability + riskOrUpside + backgroundOrAge + positionComponent - bpa * (1 - profile.bpaWeight);
  const adjustment = Math.max(-MAX_DRAFT_PROFILE_ADJUSTMENT, Math.min(MAX_DRAFT_PROFILE_ADJUSTMENT, rawAdjustment));
  return { profileVersion: 1, profileId: profile.id, playerId: candidate.playerId, bpa, need: needComponent, signability, riskOrUpside, backgroundOrAge, positionBias: positionComponent, profileAdjustment: adjustment, scoreBeforeTiebreak: bpa + adjustment };
}

/**
 * AI selects the best available prospect for a given team.
 * Blends best-player-available (BPA), team need, and signability.
 */
export function aiSelectPick(
  rng: GameRNG,
  teamId: string,
  availableProspects: DraftProspect[],
  teamRoster: GeneratedPlayer[],
): DraftProspect {
  return selectDraftProspect(rng, teamId, availableProspects, teamRoster).prospect;
}

export interface DraftSelectionCoreResult {
  readonly prospect: DraftProspect;
  readonly profile: Readonly<OrganizationDraftProfileV1>;
  readonly breakdown: DraftCandidateScoreBreakdown;
}

export function selectDraftProspect(
  rng: GameRNG,
  teamId: string,
  availableProspects: DraftProspect[],
  teamRoster: GeneratedPlayer[],
): DraftSelectionCoreResult {
  if (availableProspects.length === 0) {
    throw new Error(`aiSelectPick: no available prospects for team ${teamId}`);
  }

  if (availableProspects.length === 1) {
    const profile = getOrganizationDraftProfile(teamId);
    const candidate = toDraftCandidateVisibleInput(availableProspects[0]!);
    const breakdown = scoreDraftCandidate(profile, candidate, evaluateTeamNeeds(teamRoster));
    return { prospect: availableProspects[0]!, profile, breakdown };
  }

  const needs = evaluateTeamNeeds(teamRoster);
  const profile = getOrganizationDraftProfile(teamId);

  // Score each available prospect in stable order so the RNG tiebreaker is
  // assigned to the same player regardless of caller-provided array order.
  const candidates = [...availableProspects].sort((left, right) =>
    left.player.id.localeCompare(right.player.id),
  );
  let bestProspect = candidates[0]!;
  let bestScore = -Infinity;

  for (const prospect of candidates) {
    const breakdown = scoreDraftCandidate(profile, toDraftCandidateVisibleInput(prospect), needs);
    const pickScore = breakdown.scoreBeforeTiebreak;

    // Add a small seeded tiebreaker so equal-scored players still vary by draft seed.
    const tiebreaker = rng.nextFloat() * 0.5;

    const totalScore = pickScore + tiebreaker;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestProspect = prospect;
    }
  }

  const breakdown = scoreDraftCandidate(profile, toDraftCandidateVisibleInput(bestProspect), needs);
  return { prospect: bestProspect, profile, breakdown };
}
