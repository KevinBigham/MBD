/**
 * @module invariants/checker
 * Runtime invariant checker for development mode.
 * Call after state mutations to catch impossible states early.
 *
 * All checks are pure functions that read state and return violations.
 * No side effects, no throws — callers decide how to handle violations.
 */

import type { GeneratedPlayer } from '../player/generation.js';
import type { RosterState } from '../roster/rosterManager.js';
import { MLB_ROSTER_LIMIT, FORTY_MAN_LIMIT } from '../roster/rosterManager.js';
import { RATING_MIN, RATING_MAX } from '../player/attributes.js';
import { hitterOverall, pitcherOverall } from '../player/attributes.js';
import { PITCHER_POSITIONS } from '../player/generation.js';
import type { TeamRecord } from '../league/standings.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InvariantSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface InvariantViolation {
  /** Machine-readable invariant name */
  type: string;
  /** Human-readable description */
  message: string;
  /** How urgently this needs attention */
  severity: InvariantSeverity;
  /** Context for debugging (entity IDs, values, etc.) */
  context: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Individual Invariant Checks
// ---------------------------------------------------------------------------

/**
 * Check that no player appears on multiple teams' active rosters.
 * Severity: critical — a player on two teams breaks the entire sim.
 */
export function checkUniquePlayerAssignment(
  players: GeneratedPlayer[],
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const mlbAssignments = new Map<string, string[]>();

  for (const player of players) {
    if (player.rosterStatus !== 'MLB' || !player.teamId) continue;
    const teams = mlbAssignments.get(player.id) ?? [];
    teams.push(player.teamId);
    mlbAssignments.set(player.id, teams);
  }

  for (const [playerId, teams] of mlbAssignments) {
    if (teams.length > 1) {
      violations.push({
        type: 'duplicate_player_assignment',
        message: `Player ${playerId} is on ${teams.length} active rosters: ${teams.join(', ')}`,
        severity: 'critical',
        context: { playerId, teams },
      });
    }
  }

  return violations;
}

/**
 * Check that roster limits are respected for a specific team.
 * Severity: high — over-limit rosters break game rules.
 */
export function checkRosterLimits(
  rosterState: RosterState,
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  if (rosterState.mlbRoster.length > MLB_ROSTER_LIMIT) {
    violations.push({
      type: 'roster_size_exceeded',
      message: `Team ${rosterState.teamId} MLB roster has ${rosterState.mlbRoster.length} players (limit ${MLB_ROSTER_LIMIT})`,
      severity: 'high',
      context: {
        teamId: rosterState.teamId,
        actual: rosterState.mlbRoster.length,
        max: MLB_ROSTER_LIMIT,
      },
    });
  }

  if (rosterState.fortyManRoster.length > FORTY_MAN_LIMIT) {
    violations.push({
      type: 'forty_man_exceeded',
      message: `Team ${rosterState.teamId} 40-man roster has ${rosterState.fortyManRoster.length} players (limit ${FORTY_MAN_LIMIT})`,
      severity: 'high',
      context: {
        teamId: rosterState.teamId,
        actual: rosterState.fortyManRoster.length,
        max: FORTY_MAN_LIMIT,
      },
    });
  }

  // MLB players must be on 40-man
  const fortySet = new Set(rosterState.fortyManRoster);
  for (const id of rosterState.mlbRoster) {
    if (!fortySet.has(id)) {
      violations.push({
        type: 'mlb_not_on_forty_man',
        message: `MLB player ${id} on team ${rosterState.teamId} is not on the 40-man roster`,
        severity: 'high',
        context: { teamId: rosterState.teamId, playerId: id },
      });
    }
  }

  return violations;
}

/**
 * Check that standings records are internally consistent.
 * Severity: high — broken standings corrupt playoff seeding.
 */
export function checkStandingsConsistency(
  records: TeamRecord[],
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // League-wide wins must equal league-wide losses
  let totalWins = 0;
  let totalLosses = 0;

  for (const record of records) {
    totalWins += record.wins;
    totalLosses += record.losses;

    // Individual record checks
    if (record.wins < 0) {
      violations.push({
        type: 'negative_wins',
        message: `Team ${record.teamId} has negative wins: ${record.wins}`,
        severity: 'high',
        context: { teamId: record.teamId, wins: record.wins },
      });
    }
    if (record.losses < 0) {
      violations.push({
        type: 'negative_losses',
        message: `Team ${record.teamId} has negative losses: ${record.losses}`,
        severity: 'high',
        context: { teamId: record.teamId, losses: record.losses },
      });
    }

    // Division record can't exceed total record
    if (record.divisionWins > record.wins) {
      violations.push({
        type: 'division_wins_exceed_total',
        message: `Team ${record.teamId} has more division wins (${record.divisionWins}) than total wins (${record.wins})`,
        severity: 'medium',
        context: { teamId: record.teamId, divisionWins: record.divisionWins, totalWins: record.wins },
      });
    }
    if (record.divisionLosses > record.losses) {
      violations.push({
        type: 'division_losses_exceed_total',
        message: `Team ${record.teamId} has more division losses (${record.divisionLosses}) than total losses (${record.losses})`,
        severity: 'medium',
        context: { teamId: record.teamId, divisionLosses: record.divisionLosses, totalLosses: record.losses },
      });
    }
  }

  if (totalWins !== totalLosses) {
    violations.push({
      type: 'standings_mismatch',
      message: `League-wide wins (${totalWins}) != losses (${totalLosses})`,
      severity: 'high',
      context: { totalWins, totalLosses },
    });
  }

  return violations;
}

/**
 * Check that player ratings are within valid bounds.
 * Severity: low — out-of-bounds ratings are usually clamp failures.
 */
export function checkRatingBounds(
  players: GeneratedPlayer[],
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  for (const player of players) {
    // Check hitter attributes
    const hAttrs = player.hitterAttributes;
    for (const [key, val] of Object.entries(hAttrs)) {
      if (typeof val === 'number' && (val < RATING_MIN || val > RATING_MAX)) {
        violations.push({
          type: 'rating_out_of_bounds',
          message: `Player ${player.id} hitter.${key} = ${val} (bounds: ${RATING_MIN}-${RATING_MAX})`,
          severity: 'low',
          context: { playerId: player.id, attribute: `hitter.${key}`, value: val },
        });
      }
    }

    // Check pitcher attributes if present
    if (player.pitcherAttributes) {
      const pAttrs = player.pitcherAttributes;
      for (const [key, val] of Object.entries(pAttrs)) {
        if (typeof val === 'number' && (val < RATING_MIN || val > RATING_MAX)) {
          violations.push({
            type: 'rating_out_of_bounds',
            message: `Player ${player.id} pitcher.${key} = ${val} (bounds: ${RATING_MIN}-${RATING_MAX})`,
            severity: 'low',
            context: { playerId: player.id, attribute: `pitcher.${key}`, value: val },
          });
        }
      }
    }

    // Overall rating check
    const isPitcher = (PITCHER_POSITIONS as readonly string[]).includes(player.position);
    const overall = isPitcher && player.pitcherAttributes
      ? pitcherOverall(player.pitcherAttributes)
      : hitterOverall(player.hitterAttributes);

    if (overall < RATING_MIN || overall > RATING_MAX) {
      violations.push({
        type: 'overall_rating_out_of_bounds',
        message: `Player ${player.id} overall = ${overall} (bounds: ${RATING_MIN}-${RATING_MAX})`,
        severity: 'low',
        context: { playerId: player.id, overall },
      });
    }

    // Age sanity check
    if (player.age < 16 || player.age > 50) {
      violations.push({
        type: 'age_out_of_bounds',
        message: `Player ${player.id} age = ${player.age}`,
        severity: 'medium',
        context: { playerId: player.id, age: player.age },
      });
    }

    // Salary sanity check
    if (player.contract.annualSalary < 0) {
      violations.push({
        type: 'negative_salary',
        message: `Player ${player.id} has negative salary: ${player.contract.annualSalary}`,
        severity: 'medium',
        context: { playerId: player.id, salary: player.contract.annualSalary },
      });
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Composite Checker
// ---------------------------------------------------------------------------

export interface InvariantCheckResult {
  violations: InvariantViolation[];
  hasCritical: boolean;
  hasHigh: boolean;
  summary: string;
}

/**
 * Run all invariant checks against the current game state.
 * Returns a structured result — callers decide whether to log, warn, or throw.
 *
 * Usage in dev mode:
 * ```ts
 * if (import.meta.env.DEV) {
 *   const result = runInvariantChecks({ players, rosterStates, standingsRecords });
 *   if (result.hasCritical) console.error('[INVARIANT]', result.summary, result.violations);
 *   else if (result.hasHigh) console.warn('[INVARIANT]', result.summary);
 * }
 * ```
 */
export function runInvariantChecks(state: {
  players?: GeneratedPlayer[];
  rosterStates?: RosterState[];
  standingsRecords?: TeamRecord[];
}): InvariantCheckResult {
  const violations: InvariantViolation[] = [];

  if (state.players) {
    violations.push(...checkUniquePlayerAssignment(state.players));
    violations.push(...checkRatingBounds(state.players));
  }

  if (state.rosterStates) {
    for (const rs of state.rosterStates) {
      violations.push(...checkRosterLimits(rs));
    }
  }

  if (state.standingsRecords) {
    violations.push(...checkStandingsConsistency(state.standingsRecords));
  }

  const hasCritical = violations.some(v => v.severity === 'critical');
  const hasHigh = violations.some(v => v.severity === 'high');

  const counts: Record<InvariantSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const v of violations) counts[v.severity]++;

  const summary = violations.length === 0
    ? 'All invariants OK'
    : `${violations.length} violations: ${counts.critical}C ${counts.high}H ${counts.medium}M ${counts.low}L`;

  return { violations, hasCritical, hasHigh, summary };
}
