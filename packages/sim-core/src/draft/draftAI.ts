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

  // Find the top two need positions for bonus calculation
  const sortedNeeds = [...needs.entries()].sort((a, b) => b[1] - a[1]);
  const primaryNeedPos = sortedNeeds[0]?.[0];
  const secondaryNeedPos = sortedNeeds[1]?.[0];

  // Score each available prospect
  let bestProspect = availableProspects[0]!;
  let bestScore = -Infinity;

  for (const prospect of availableProspects) {
    const pos = prospect.player.position;

    // Need bonus
    let needBonus = 0;
    if (pos === primaryNeedPos) {
      needBonus = PRIMARY_NEED_BONUS;
    } else if (pos === secondaryNeedPos) {
      needBonus = SECONDARY_NEED_BONUS;
    }

    const pickScore =
      prospect.scoutingGrade * WEIGHT_BPA +
      needBonus * WEIGHT_NEED +
      prospect.signability * SIGNABILITY_SCALE * WEIGHT_SIGNABILITY;

    // Add small random tiebreaker to prevent deterministic same-pick situations
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

      // Assign the prospect to the drafting team
      (selectedProspect.player as { teamId: string }).teamId = teamId;

      // Add to team's roster for future need calculations
      const teamRoster = rosters.get(teamId) ?? [];
      teamRoster.push(selectedProspect.player);
      rosters.set(teamId, teamRoster);

      picks.push({
        round,
        pickNumber: overallPickNumber,
        teamId,
        prospect: selectedProspect,
      });
    }

    if (available.length === 0) break;
  }

  return {
    picks,
    undrafted: available,
  };
}
