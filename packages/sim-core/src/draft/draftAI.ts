/**
 * @module draftAI
 * AI draft selection logic: determines draft order, evaluates team needs,
 * and runs the full 20-round draft for all 32 teams.
 * Uses GameRNG for all randomness; the JS global random API is never used.
 */

import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer, Position } from '../player/generation.js';
import { HITTER_POSITIONS, PITCHER_POSITIONS } from '../player/generation.js';
import { toDisplayRating } from '../player/attributes.js';
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

/** Ceiling-gap multiplier to put upside on comparable scale to scouting grade. */
const UPSIDE_SCALE = 20;

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

type DraftStrategyArchetype =
  | 'balanced'
  | 'board'
  | 'college_secure'
  | 'need_first'
  | 'pitching'
  | 'premium_athletes'
  | 'upside';

interface AIDraftStrategyProfile {
  readonly bpaWeight: number;
  readonly needWeight: number;
  readonly signabilityWeight: number;
  readonly upsideWeight: number;
  readonly collegeSecurityBonus: number;
  readonly prepUpsideBonus: number;
  readonly pitcherBonus: number;
  readonly upTheMiddleBonus: number;
}

const DRAFT_STRATEGY_PROFILES: Record<DraftStrategyArchetype, AIDraftStrategyProfile> = {
  balanced: {
    bpaWeight: WEIGHT_BPA,
    needWeight: WEIGHT_NEED,
    signabilityWeight: WEIGHT_SIGNABILITY,
    upsideWeight: 0.04,
    collegeSecurityBonus: 0,
    prepUpsideBonus: 0,
    pitcherBonus: 0,
    upTheMiddleBonus: 0,
  },
  board: {
    bpaWeight: 0.64,
    needWeight: 0.18,
    signabilityWeight: 0.12,
    upsideWeight: 0.06,
    collegeSecurityBonus: 0,
    prepUpsideBonus: 0,
    pitcherBonus: 0,
    upTheMiddleBonus: 1.5,
  },
  college_secure: {
    bpaWeight: 0.56,
    needWeight: 0.22,
    signabilityWeight: 0.22,
    upsideWeight: 0.02,
    collegeSecurityBonus: 3,
    prepUpsideBonus: -4,
    pitcherBonus: 0,
    upTheMiddleBonus: 0,
  },
  need_first: {
    bpaWeight: 0.50,
    needWeight: 0.36,
    signabilityWeight: 0.10,
    upsideWeight: 0.04,
    collegeSecurityBonus: 0,
    prepUpsideBonus: 0,
    pitcherBonus: 0,
    upTheMiddleBonus: 0,
  },
  pitching: {
    bpaWeight: 0.54,
    needWeight: 0.22,
    signabilityWeight: 0.12,
    upsideWeight: 0.06,
    collegeSecurityBonus: 0,
    prepUpsideBonus: 0,
    pitcherBonus: 4,
    upTheMiddleBonus: 0,
  },
  premium_athletes: {
    bpaWeight: 0.54,
    needWeight: 0.20,
    signabilityWeight: 0.11,
    upsideWeight: 0.10,
    collegeSecurityBonus: 0,
    prepUpsideBonus: 1.5,
    pitcherBonus: 0,
    upTheMiddleBonus: 4,
  },
  upside: {
    bpaWeight: 0.56,
    needWeight: 0.18,
    signabilityWeight: 0.06,
    upsideWeight: 0.20,
    collegeSecurityBonus: 0,
    prepUpsideBonus: 4,
    pitcherBonus: 0,
    upTheMiddleBonus: 2,
  },
};

const TEAM_DRAFT_STRATEGY: Record<string, DraftStrategyArchetype> = {
  nym: 'board',
  phi: 'college_secure',
  bos: 'board',
  bal: 'premium_athletes',
  wsh: 'college_secure',
  chi: 'board',
  det: 'need_first',
  cle: 'pitching',
  col: 'balanced',
  pit: 'upside',
  kc: 'premium_athletes',
  msp: 'pitching',
  stl: 'college_secure',
  ind: 'premium_athletes',
  mil: 'balanced',
  nas: 'upside',
  mia: 'upside',
  atl: 'premium_athletes',
  cha: 'balanced',
  orl: 'upside',
  ral: 'college_secure',
  hou: 'board',
  dal: 'need_first',
  sat: 'pitching',
  den: 'premium_athletes',
  aus: 'upside',
  lax: 'board',
  sfb: 'college_secure',
  phx: 'need_first',
  sea: 'pitching',
  sdg: 'balanced',
  por: 'premium_athletes',
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

function draftStrategyProfileForTeam(teamId: string): AIDraftStrategyProfile {
  return DRAFT_STRATEGY_PROFILES[TEAM_DRAFT_STRATEGY[teamId] ?? 'balanced'];
}

function prospectUpsideScore(prospect: DraftProspect): number {
  const projectedCeiling = prospect.player.ceiling ?? prospect.player.potentialRating ?? prospect.player.overallRating;
  const gap = Math.max(0, projectedCeiling - prospect.player.overallRating);
  return Math.min(UPSIDE_SCALE, (gap / 170) * UPSIDE_SCALE);
}

function profileBackgroundBonus(profile: AIDraftStrategyProfile, prospect: DraftProspect): number {
  if (prospect.background === 'college_senior') {
    return profile.collegeSecurityBonus;
  }
  if (prospect.background === 'high_school') {
    return profile.prepUpsideBonus;
  }
  return profile.collegeSecurityBonus / 2;
}

function profilePositionBonus(profile: AIDraftStrategyProfile, position: Position): number {
  const isPitcher = position === 'SP' || position === 'RP' || position === 'CL';
  const isUpTheMiddle = position === 'C' || position === 'SS' || position === 'CF';
  return (isPitcher ? profile.pitcherBonus : 0) + (isUpTheMiddle ? profile.upTheMiddleBonus : 0);
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
  if (availableProspects.length === 0) {
    throw new Error(`aiSelectPick: no available prospects for team ${teamId}`);
  }

  if (availableProspects.length === 1) {
    return availableProspects[0]!;
  }

  const needs = evaluateTeamNeeds(teamRoster);
  const profile = draftStrategyProfileForTeam(teamId);

  // Find the top two need positions for bonus calculation
  const sortedNeeds = [...needs.entries()].sort((a, b) => b[1] - a[1]);
  const primaryNeedPos = sortedNeeds[0]?.[0];
  const secondaryNeedPos = sortedNeeds[1]?.[0];

  // Score each available prospect in stable order so the RNG tiebreaker is
  // assigned to the same player regardless of caller-provided array order.
  const candidates = [...availableProspects].sort((left, right) =>
    left.player.id.localeCompare(right.player.id),
  );
  let bestProspect = candidates[0]!;
  let bestScore = -Infinity;

  for (const prospect of candidates) {
    const pos = prospect.player.position;

    // Need bonus
    let needBonus = 0;
    if (pos === primaryNeedPos) {
      needBonus = PRIMARY_NEED_BONUS;
    } else if (pos === secondaryNeedPos) {
      needBonus = SECONDARY_NEED_BONUS;
    }

    const pickScore =
      prospect.scoutingGrade * profile.bpaWeight +
      needBonus * profile.needWeight +
      prospect.signability * SIGNABILITY_SCALE * profile.signabilityWeight +
      prospectUpsideScore(prospect) * profile.upsideWeight +
      profileBackgroundBonus(profile, prospect) +
      profilePositionBonus(profile, pos);

    // Add a small seeded tiebreaker so equal-scored players still vary by draft seed.
    const tiebreaker = rng.nextFloat() * 0.5;

    const totalScore = pickScore + tiebreaker;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestProspect = prospect;
    }
  }

  return bestProspect;
}

// ---------------------------------------------------------------------------
// Full draft simulation
// ---------------------------------------------------------------------------

/**
 * Run the full draft: 20 rounds, 32 teams per round = up to 640 picks.
 *
 * When it is the user's team's turn:
 * - If `userPicks` contains a pick for that round, it is used automatically.
 * - Otherwise the AI picks on behalf of the user (for simulated/instant drafts).
 *
 * For interactive draft-room pausing, the worker layer handles pause/resume
 * by calling this function with pre-populated userPicks.
 */
export function simulateFullDraft(
  rng: GameRNG,
  draftClass: DraftClass,
  draftOrder: string[],
  teamRosters: Map<string, GeneratedPlayer[]>,
  userTeamId: string,
  userPicks?: Map<number, DraftProspect>,
): DraftResult {
  const picks: DraftPick[] = [];
  const available = [...draftClass.prospects];
  let overallPickNumber = 0;

  // Mutable copy of rosters so drafted players get added
  const rosters = new Map<string, GeneratedPlayer[]>();
  for (const [teamId, roster] of teamRosters) {
    rosters.set(teamId, [...roster]);
  }

  for (let round = 1; round <= DRAFT_ROUNDS; round++) {
    for (const teamId of draftOrder) {
      if (available.length === 0) break;

      overallPickNumber++;
      let selectedProspect: DraftProspect;

      if (teamId === userTeamId && userPicks?.has(round)) {
        // User has pre-selected a pick for this round
        selectedProspect = userPicks.get(round)!;

        // Remove from available pool
        const idx = available.findIndex((p) => p.player.id === selectedProspect.player.id);
        if (idx >= 0) {
          available.splice(idx, 1);
        }
      } else {
        // AI selection (also used for user team if no pre-selected pick)
        const teamRoster = rosters.get(teamId) ?? [];
        selectedProspect = aiSelectPick(rng, teamId, available, teamRoster);

        // Remove from available pool
        const idx = available.indexOf(selectedProspect);
        if (idx >= 0) {
          available.splice(idx, 1);
        }
      }

      // Preserve the original draft pool entry; the drafted copy carries team assignment.
      const draftedProspect: DraftProspect = {
        ...selectedProspect,
        player: {
          ...selectedProspect.player,
          teamId,
        },
      };

      // Add to team's roster for future need calculations
      const teamRoster = rosters.get(teamId) ?? [];
      teamRoster.push(draftedProspect.player);
      rosters.set(teamId, teamRoster);

      picks.push({
        round,
        pickNumber: overallPickNumber,
        teamId,
        prospect: draftedProspect,
      });
    }

    if (available.length === 0) break;
  }

  return {
    picks,
    undrafted: available,
  };
}
