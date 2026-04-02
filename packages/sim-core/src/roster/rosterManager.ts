/**
 * @module rosterManager
 * Roster management: MLB 26-man and 40-man roster enforcement, promotions,
 * demotions, DFA, options, and auto-fill logic.
 * Pure engine code — no React, no DOM, no ambient randomness.
 */

import type { GeneratedPlayer, RosterLevel } from '../player/generation.js';
import { ROSTER_LEVELS, PITCHER_POSITIONS } from '../player/generation.js';
import { hitterOverall, pitcherOverall } from '../player/attributes.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MLB_ROSTER_LIMIT = 26;
export const FORTY_MAN_LIMIT = 40;
export const MIN_PITCHERS = 8;
export const MIN_POSITION_PLAYERS = 13;
export const MAX_MINOR_LEAGUE_OPTIONS = 3;

/** Ordered from highest to lowest for level math. */
const LEVEL_ORDER: readonly RosterLevel[] = [
  'MLB', 'AAA', 'AA', 'A_PLUS', 'A', 'ROOKIE', 'INTERNATIONAL',
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RosterAction =
  | 'promote'
  | 'demote'
  | 'dfa'
  | 'release'
  | 'waiver_claim'
  | 'option'
  | 'recall'
  | 'add_40man'
  | 'remove_40man';

export interface RosterTransaction {
  action: RosterAction;
  playerId: string;
  teamId: string;
  fromLevel: RosterLevel;
  toLevel: RosterLevel;
  timestamp: string; // "S3D45" format
}

export interface RosterState {
  teamId: string;
  mlbRoster: string[];      // player IDs (max 26)
  fortyManRoster: string[]; // player IDs (max 40)
  transactions: RosterTransaction[];
}

export interface RosterValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Standard result returned by roster mutation functions. */
export interface RosterActionResult {
  players: GeneratedPlayer[];
  rosterState: RosterState;
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function levelIndex(level: RosterLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

function isPitcher(player: GeneratedPlayer): boolean {
  return (PITCHER_POSITIONS as readonly string[]).includes(player.position);
}

function playerOverall(player: GeneratedPlayer): number {
  if (isPitcher(player) && player.pitcherAttributes) {
    return pitcherOverall(player.pitcherAttributes);
  }
  return hitterOverall(player.hitterAttributes);
}

function findPlayer(players: GeneratedPlayer[], id: string): GeneratedPlayer | undefined {
  return players.find((p) => p.id === id);
}

/**
 * Return a shallow copy of the players array with a single player replaced.
 * Immutable-friendly: never mutates the original array or player.
 */
function replacePlayer(
  players: GeneratedPlayer[],
  updated: GeneratedPlayer,
): GeneratedPlayer[] {
  return players.map((p) => (p.id === updated.id ? updated : p));
}

function cloneRosterState(state: RosterState): RosterState {
  return {
    teamId: state.teamId,
    mlbRoster: [...state.mlbRoster],
    fortyManRoster: [...state.fortyManRoster],
    transactions: [...state.transactions],
  };
}

// ---------------------------------------------------------------------------
// Level navigation
// ---------------------------------------------------------------------------

/** Get the next valid roster level above or below the current one. */
export function getNextLevel(
  current: RosterLevel,
  direction: 'up' | 'down',
): RosterLevel | null {
  const idx = levelIndex(current);
  if (idx === -1) return null;
  const target = direction === 'up' ? idx - 1 : idx + 1;
  return target >= 0 && target < LEVEL_ORDER.length ? LEVEL_ORDER[target]! : null;
}

// ---------------------------------------------------------------------------
// Roster counts
// ---------------------------------------------------------------------------

/** Get the number of players on the 26-man MLB roster. */
export function getMLBRosterCount(rosterState: RosterState): number {
  return rosterState.mlbRoster.length;
}

/** Get the number of players on the 40-man roster. */
export function get40ManCount(rosterState: RosterState): number {
  return rosterState.fortyManRoster.length;
}

/** True if the team exceeds either the 26-man or 40-man limit. */
export function needsRosterMove(rosterState: RosterState): boolean {
  return (
    rosterState.mlbRoster.length > MLB_ROSTER_LIMIT ||
    rosterState.fortyManRoster.length > FORTY_MAN_LIMIT
  );
}

// ---------------------------------------------------------------------------
// Build roster state from player list
// ---------------------------------------------------------------------------

/** Build a RosterState from a full player list for a given team. */
export function buildRosterState(
  teamId: string,
  players: GeneratedPlayer[],
): RosterState {
  const teamPlayers = players.filter((p) => p.teamId === teamId);
  const mlbRoster = teamPlayers
    .filter((p) => p.rosterStatus === 'MLB')
    .map((p) => p.id);
  const fortyManRoster = teamPlayers
    .filter(
      (p) =>
        p.rosterStatus === 'MLB' ||
        p.rosterStatus === 'AAA' ||
        p.rosterStatus === 'AA',
    )
    .map((p) => p.id);

  return {
    teamId,
    mlbRoster,
    fortyManRoster,
    transactions: [],
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Validate a team's roster against MLB rules, returning errors and warnings. */
export function validateRoster(
  state: RosterState,
  players: GeneratedPlayer[],
): RosterValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- Hard limits ---
  if (state.mlbRoster.length > MLB_ROSTER_LIMIT) {
    errors.push(
      `MLB roster has ${state.mlbRoster.length} players (limit ${MLB_ROSTER_LIMIT}).`,
    );
  }
  if (state.fortyManRoster.length > FORTY_MAN_LIMIT) {
    errors.push(
      `40-man roster has ${state.fortyManRoster.length} players (limit ${FORTY_MAN_LIMIT}).`,
    );
  }

  // --- All MLB players must be on the 40-man ---
  const fortySet = new Set(state.fortyManRoster);
  for (const id of state.mlbRoster) {
    if (!fortySet.has(id)) {
      errors.push(`MLB player ${id} is not on the 40-man roster.`);
    }
  }

  // --- Position coverage (MLB only) ---
  const mlbPlayers = state.mlbRoster
    .map((id) => findPlayer(players, id))
    .filter((p): p is GeneratedPlayer => p != null);

  const pitchers = mlbPlayers.filter(isPitcher);
  const positionPlayers = mlbPlayers.filter((p) => !isPitcher(p));

  // Minimum SP count
  const spCount = mlbPlayers.filter((p) => p.position === 'SP').length;
  if (spCount < 5) {
    warnings.push(`Only ${spCount} starting pitchers on MLB roster (recommend 5).`);
  }

  // Minimum RP/CL count
  const relieverCount = mlbPlayers.filter(
    (p) => p.position === 'RP' || p.position === 'CL',
  ).length;
  if (relieverCount < 3) {
    warnings.push(
      `Only ${relieverCount} relievers/closers on MLB roster (recommend at least 3).`,
    );
  }

  // Overall pitcher / position player minimums
  if (pitchers.length < MIN_PITCHERS) {
    warnings.push(
      `Only ${pitchers.length} pitchers on MLB roster (recommend at least ${MIN_PITCHERS}).`,
    );
  }
  if (positionPlayers.length < MIN_POSITION_PLAYERS && state.mlbRoster.length >= MLB_ROSTER_LIMIT) {
    warnings.push(
      `Only ${positionPlayers.length} position players on MLB roster (recommend at least ${MIN_POSITION_PLAYERS}).`,
    );
  }

  // Check each position has at least one player
  const positionSet = new Set(positionPlayers.map((p) => p.position));
  const requiredPositions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const;
  for (const pos of requiredPositions) {
    if (!positionSet.has(pos)) {
      warnings.push(`No ${pos} on MLB roster.`);
    }
  }

  // Backup catcher warning
  const catcherCount = positionPlayers.filter((p) => p.position === 'C').length;
  if (catcherCount === 1) {
    warnings.push('Only 1 catcher on MLB roster — no backup C.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ---------------------------------------------------------------------------
// Promote / Demote / DFA
// ---------------------------------------------------------------------------

/** Promote a player one roster level. */
export function promotePlayer(
  playerId: string,
  players: GeneratedPlayer[],
  rosterState: RosterState,
  timestamp: string,
): RosterActionResult {
  const player = findPlayer(players, playerId);
  if (!player) {
    return { players, rosterState, success: false, error: `Player ${playerId} not found.` };
  }

  const nextLevel = getNextLevel(player.rosterStatus, 'up');
  if (!nextLevel) {
    return {
      players,
      rosterState,
      success: false,
      error: `${player.firstName} ${player.lastName} is already at the highest level.`,
    };
  }

  // Check MLB roster space
  const newState = cloneRosterState(rosterState);

  if (nextLevel === 'MLB') {
    if (newState.mlbRoster.length >= MLB_ROSTER_LIMIT) {
      return {
        players,
        rosterState,
        success: false,
        error: `MLB roster is full (${MLB_ROSTER_LIMIT}).`,
      };
    }
    newState.mlbRoster.push(playerId);

    // Auto-add to 40-man if not already there
    if (!newState.fortyManRoster.includes(playerId)) {
      if (newState.fortyManRoster.length >= FORTY_MAN_LIMIT) {
        return {
          players,
          rosterState,
          success: false,
          error: `40-man roster is full (${FORTY_MAN_LIMIT}). Must clear a spot first.`,
        };
      }
      newState.fortyManRoster.push(playerId);
    }
  }

  const updatedPlayer: GeneratedPlayer = { ...player, rosterStatus: nextLevel };
  const updatedPlayers = replacePlayer(players, updatedPlayer);

  newState.transactions.push({
    action: 'promote',
    playerId,
    teamId: rosterState.teamId,
    fromLevel: player.rosterStatus,
    toLevel: nextLevel,
    timestamp,
  });

  return { players: updatedPlayers, rosterState: newState, success: true };
}

/** Demote a player one roster level. */
export function demotePlayer(
  playerId: string,
  players: GeneratedPlayer[],
  rosterState: RosterState,
  timestamp: string,
): RosterActionResult {
  const player = findPlayer(players, playerId);
  if (!player) {
    return { players, rosterState, success: false, error: `Player ${playerId} not found.` };
  }

  const nextLevel = getNextLevel(player.rosterStatus, 'down');
  if (!nextLevel) {
    return {
      players,
      rosterState,
      success: false,
      error: `${player.firstName} ${player.lastName} is already at the lowest level.`,
    };
  }

  const newState = cloneRosterState(rosterState);

  // Remove from MLB roster if demoting from MLB
  if (player.rosterStatus === 'MLB') {
    newState.mlbRoster = newState.mlbRoster.filter((id) => id !== playerId);
  }

  const updatedPlayer: GeneratedPlayer = { ...player, rosterStatus: nextLevel };
  const updatedPlayers = replacePlayer(players, updatedPlayer);

  newState.transactions.push({
    action: 'demote',
    playerId,
    teamId: rosterState.teamId,
    fromLevel: player.rosterStatus,
    toLevel: nextLevel,
    timestamp,
  });

  return { players: updatedPlayers, rosterState: newState, success: true };
}

/** Designate a player for assignment (remove from 40-man). */
export function dfaPlayer(
  playerId: string,
  players: GeneratedPlayer[],
  rosterState: RosterState,
  timestamp: string,
): RosterActionResult {
  const player = findPlayer(players, playerId);
  if (!player) {
    return { players, rosterState, success: false, error: `Player ${playerId} not found.` };
  }

  const newState = cloneRosterState(rosterState);

  // Remove from MLB roster
  newState.mlbRoster = newState.mlbRoster.filter((id) => id !== playerId);

  // Remove from 40-man roster
  newState.fortyManRoster = newState.fortyManRoster.filter((id) => id !== playerId);

  // Player goes to AAA pending waivers
  const updatedPlayer: GeneratedPlayer = { ...player, rosterStatus: 'AAA' };
  const updatedPlayers = replacePlayer(players, updatedPlayer);

  newState.transactions.push({
    action: 'dfa',
    playerId,
    teamId: rosterState.teamId,
    fromLevel: player.rosterStatus,
    toLevel: 'AAA',
    timestamp,
  });

  return { players: updatedPlayers, rosterState: newState, success: true };
}

// ---------------------------------------------------------------------------
// Dispatch for any RosterAction
// ---------------------------------------------------------------------------

/** Execute any roster action by name. */
export function executeRosterAction(
  action: RosterAction,
  playerId: string,
  players: GeneratedPlayer[],
  rosterState: RosterState,
  timestamp: string,
): RosterActionResult {
  switch (action) {
    case 'promote':
      return promotePlayer(playerId, players, rosterState, timestamp);

    case 'demote':
      return demotePlayer(playerId, players, rosterState, timestamp);

    case 'dfa':
      return dfaPlayer(playerId, players, rosterState, timestamp);

    case 'release': {
      const player = findPlayer(players, playerId);
      if (!player) {
        return { players, rosterState, success: false, error: `Player ${playerId} not found.` };
      }
      const newState = cloneRosterState(rosterState);
      newState.mlbRoster = newState.mlbRoster.filter((id) => id !== playerId);
      newState.fortyManRoster = newState.fortyManRoster.filter((id) => id !== playerId);
      const released: GeneratedPlayer = { ...player, teamId: '', rosterStatus: 'INTERNATIONAL' };
      newState.transactions.push({
        action: 'release',
        playerId,
        teamId: rosterState.teamId,
        fromLevel: player.rosterStatus,
        toLevel: 'INTERNATIONAL',
        timestamp,
      });
      return { players: replacePlayer(players, released), rosterState: newState, success: true };
    }

    case 'option': {
      // Option to minors (MLB -> AAA). Simplified: always sends to AAA.
      const player = findPlayer(players, playerId);
      if (!player) {
        return { players, rosterState, success: false, error: `Player ${playerId} not found.` };
      }
      if (player.rosterStatus !== 'MLB') {
        return { players, rosterState, success: false, error: 'Player is not on the MLB roster.' };
      }
      const newState = cloneRosterState(rosterState);
      newState.mlbRoster = newState.mlbRoster.filter((id) => id !== playerId);
      // Stays on 40-man
      const optioned: GeneratedPlayer = { ...player, rosterStatus: 'AAA' };
      newState.transactions.push({
        action: 'option',
        playerId,
        teamId: rosterState.teamId,
        fromLevel: 'MLB',
        toLevel: 'AAA',
        timestamp,
      });
      return { players: replacePlayer(players, optioned), rosterState: newState, success: true };
    }

    case 'recall': {
      // Recall from AAA to MLB
      const player = findPlayer(players, playerId);
      if (!player) {
        return { players, rosterState, success: false, error: `Player ${playerId} not found.` };
      }
      if (player.rosterStatus !== 'AAA') {
        return {
          players,
          rosterState,
          success: false,
          error: 'Player must be in AAA to be recalled.',
        };
      }
      const newState = cloneRosterState(rosterState);
      if (newState.mlbRoster.length >= MLB_ROSTER_LIMIT) {
        return {
          players,
          rosterState,
          success: false,
          error: `MLB roster is full (${MLB_ROSTER_LIMIT}).`,
        };
      }
      newState.mlbRoster.push(playerId);
      if (!newState.fortyManRoster.includes(playerId)) {
        if (newState.fortyManRoster.length >= FORTY_MAN_LIMIT) {
          return {
            players,
            rosterState,
            success: false,
            error: `40-man roster is full (${FORTY_MAN_LIMIT}).`,
          };
        }
        newState.fortyManRoster.push(playerId);
      }
      const recalled: GeneratedPlayer = { ...player, rosterStatus: 'MLB' };
      newState.transactions.push({
        action: 'recall',
        playerId,
        teamId: rosterState.teamId,
        fromLevel: 'AAA',
        toLevel: 'MLB',
        timestamp,
      });
      return { players: replacePlayer(players, recalled), rosterState: newState, success: true };
    }

    case 'waiver_claim': {
      // Claim a DFA'd player — adds to 40-man and AAA
      const player = findPlayer(players, playerId);
      if (!player) {
        return { players, rosterState, success: false, error: `Player ${playerId} not found.` };
      }
      const newState = cloneRosterState(rosterState);
      if (newState.fortyManRoster.length >= FORTY_MAN_LIMIT) {
        return {
          players,
          rosterState,
          success: false,
          error: `40-man roster is full (${FORTY_MAN_LIMIT}).`,
        };
      }
      newState.fortyManRoster.push(playerId);
      const claimed: GeneratedPlayer = {
        ...player,
        teamId: rosterState.teamId,
        rosterStatus: 'AAA',
      };
      newState.transactions.push({
        action: 'waiver_claim',
        playerId,
        teamId: rosterState.teamId,
        fromLevel: player.rosterStatus,
        toLevel: 'AAA',
        timestamp,
      });
      return { players: replacePlayer(players, claimed), rosterState: newState, success: true };
    }

    case 'add_40man': {
      const player = findPlayer(players, playerId);
      if (!player) {
        return { players, rosterState, success: false, error: `Player ${playerId} not found.` };
      }
      const newState = cloneRosterState(rosterState);
      if (newState.fortyManRoster.includes(playerId)) {
        return { players, rosterState, success: false, error: 'Player is already on the 40-man.' };
      }
      if (newState.fortyManRoster.length >= FORTY_MAN_LIMIT) {
        return {
          players,
          rosterState,
          success: false,
          error: `40-man roster is full (${FORTY_MAN_LIMIT}).`,
        };
      }
      newState.fortyManRoster.push(playerId);
      newState.transactions.push({
        action: 'add_40man',
        playerId,
        teamId: rosterState.teamId,
        fromLevel: player.rosterStatus,
        toLevel: player.rosterStatus,
        timestamp,
      });
      return { players, rosterState: newState, success: true };
    }

    case 'remove_40man': {
      const player = findPlayer(players, playerId);
      if (!player) {
        return { players, rosterState, success: false, error: `Player ${playerId} not found.` };
      }
      const newState = cloneRosterState(rosterState);
      if (!newState.fortyManRoster.includes(playerId)) {
        return { players, rosterState, success: false, error: 'Player is not on the 40-man.' };
      }
      // Cannot remove from 40-man if on MLB roster
      if (newState.mlbRoster.includes(playerId)) {
        return {
          players,
          rosterState,
          success: false,
          error: 'Cannot remove MLB player from 40-man. Demote or DFA first.',
        };
      }
      newState.fortyManRoster = newState.fortyManRoster.filter((id) => id !== playerId);
      newState.transactions.push({
        action: 'remove_40man',
        playerId,
        teamId: rosterState.teamId,
        fromLevel: player.rosterStatus,
        toLevel: player.rosterStatus,
        timestamp,
      });
      return { players, rosterState: newState, success: true };
    }

    default: {
      const _exhaustive: never = action;
      return {
        players,
        rosterState,
        success: false,
        error: `Unknown roster action: ${_exhaustive}`,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Auto-fill MLB roster from AAA (AI helper)
// ---------------------------------------------------------------------------

/**
 * Fill empty MLB roster spots by promoting the best available AAA players.
 * Tries to respect positional needs — fills gaps at missing positions first,
 * then fills remaining spots by overall rating.
 */
export function autoFillMLBRoster(
  teamId: string,
  players: GeneratedPlayer[],
  rosterState: RosterState,
): { players: GeneratedPlayer[]; rosterState: RosterState } {
  let currentPlayers = players;
  let currentState = cloneRosterState(rosterState);

  const getAAAPlayers = () =>
    currentPlayers.filter(
      (p) =>
        p.teamId === teamId &&
        p.rosterStatus === 'AAA' &&
        !currentState.mlbRoster.includes(p.id),
    );

  // Determine which positions are missing on the MLB roster
  const getMissingPositions = (): Set<string> => {
    const mlbPlayers = currentState.mlbRoster
      .map((id) => findPlayer(currentPlayers, id))
      .filter((p): p is GeneratedPlayer => p != null);
    const covered = new Set(mlbPlayers.map((p) => p.position));

    const needed = new Set<string>();
    const requiredPositions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'RP'] as const;
    for (const pos of requiredPositions) {
      if (!covered.has(pos)) {
        needed.add(pos);
      }
    }
    return needed;
  };

  // Phase 1: Fill missing positions
  const missingPositions = getMissingPositions();
  for (const pos of missingPositions) {
    if (currentState.mlbRoster.length >= MLB_ROSTER_LIMIT) break;

    const candidates = getAAAPlayers()
      .filter((p) => p.position === pos)
      .sort((a, b) => playerOverall(b) - playerOverall(a));

    if (candidates.length > 0) {
      const best = candidates[0]!;
      const result = promotePlayer(best.id, currentPlayers, currentState, 'AUTO');
      if (result.success) {
        currentPlayers = result.players;
        currentState = result.rosterState;
      }
    }
  }

  // Phase 2: Fill remaining spots by overall rating
  while (currentState.mlbRoster.length < MLB_ROSTER_LIMIT) {
    const candidates = getAAAPlayers().sort(
      (a, b) => playerOverall(b) - playerOverall(a),
    );
    if (candidates.length === 0) break;

    const best = candidates[0]!;
    const result = promotePlayer(best.id, currentPlayers, currentState, 'AUTO');
    if (result.success) {
      currentPlayers = result.players;
      currentState = result.rosterState;
    } else {
      // Cannot promote (40-man full, etc.) — stop
      break;
    }
  }

  return { players: currentPlayers, rosterState: currentState };
}
