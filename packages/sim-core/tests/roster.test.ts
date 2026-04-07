import { describe, it, expect } from 'vitest';
import {
  GameRNG,
  generatePlayer,
  generateTeamRoster,
  buildRosterState,
  validateRoster,
  promotePlayer,
  demotePlayer,
  dfaPlayer,
  getNextLevel,
  needsRosterMove,
  MLB_ROSTER_LIMIT,
  FORTY_MAN_LIMIT,
} from '../src/index.js';
import type { RosterState, GeneratedPlayer } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRoster(seed: number): GeneratedPlayer[] {
  const rng = new GameRNG(seed);
  return generateTeamRoster(rng, 'NYT');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildRosterState', () => {
  it('creates valid state with mlb and 40-man rosters', () => {
    const roster = makeRoster(42);
    const state = buildRosterState('NYT', roster);
    expect(state.teamId).toBe('NYT');
    expect(state.mlbRoster.length).toBeGreaterThan(0);
    expect(state.fortyManRoster.length).toBeGreaterThanOrEqual(state.mlbRoster.length);
    expect(state.transactions).toEqual([]);
  });
});

describe('validateRoster', () => {
  it('passes for a controlled valid roster', () => {
    // Build a hand-crafted valid state rather than relying on generateTeamRoster
    const rng = new GameRNG(42);
    const players: GeneratedPlayer[] = [];
    // Create 26 MLB players
    const positions = ['C', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH',
      'SP', 'SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'RP', 'CL',
      '1B', '2B', '3B', 'LF', 'RF', 'SS'] as const;
    for (const pos of positions) {
      players.push(generatePlayer(rng, pos, 'NYT', 'MLB'));
    }
    const mlbIds = players.map((p) => p.id);
    const state: RosterState = {
      teamId: 'NYT',
      mlbRoster: mlbIds,
      fortyManRoster: [...mlbIds], // all MLB on 40-man
      transactions: [],
    };
    const validation = validateRoster(state, players);
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  it('fails if MLB roster exceeds 26 players', () => {
    const roster = makeRoster(42);
    const state = buildRosterState('NYT', roster);
    // Manually add extra players to exceed limit
    const extraIds: string[] = [];
    const aaaPlayers = roster.filter(
      (p) => p.teamId === 'NYT' && p.rosterStatus === 'AAA',
    );
    for (let i = 0; i < 10; i++) {
      if (aaaPlayers[i]) {
        extraIds.push(aaaPlayers[i]!.id);
      }
    }
    const bloatedState: RosterState = {
      ...state,
      mlbRoster: [...state.mlbRoster, ...extraIds],
      fortyManRoster: [...new Set([...state.fortyManRoster, ...extraIds])],
    };
    const validation = validateRoster(bloatedState, roster);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('MLB roster'))).toBe(true);
  });
});

describe('promotePlayer', () => {
  it('moves player up one level', () => {
    const roster = makeRoster(42);
    // Build a controlled state: put a few MLB and AAA players on the 40-man
    const mlbPlayers = roster.filter((p) => p.teamId === 'NYT' && p.rosterStatus === 'MLB');
    const aaaPlayers = roster.filter((p) => p.teamId === 'NYT' && p.rosterStatus === 'AAA');
    const aaaPlayer = aaaPlayers[0]!;
    expect(aaaPlayer).toBeTruthy();

    // Build a manageable state with room on both rosters
    const smallMlb = mlbPlayers.slice(0, 24).map((p) => p.id); // under 26 limit
    const smallFortyMan = [...smallMlb, aaaPlayer.id]; // under 40 limit

    const state: RosterState = {
      teamId: 'NYT',
      mlbRoster: smallMlb,
      fortyManRoster: smallFortyMan,
      transactions: [],
    };

    const result = promotePlayer(aaaPlayer.id, roster, state, 'S1D1');
    expect(result.success).toBe(true);
    const promoted = result.players.find((p) => p.id === aaaPlayer.id);
    expect(promoted!.rosterStatus).toBe('MLB');
    expect(result.rosterState.mlbRoster).toContain(aaaPlayer.id);
  });
});

describe('demotePlayer', () => {
  it('moves player down one level', () => {
    const roster = makeRoster(42);
    const state = buildRosterState('NYT', roster);
    const mlbPlayerId = state.mlbRoster[0]!;
    const result = demotePlayer(mlbPlayerId, roster, state, 'S1D1');
    expect(result.success).toBe(true);
    const demoted = result.players.find((p) => p.id === mlbPlayerId);
    expect(demoted!.rosterStatus).toBe('AAA');
    // Should be removed from MLB roster
    expect(result.rosterState.mlbRoster).not.toContain(mlbPlayerId);
  });
});

describe('dfaPlayer', () => {
  it('removes player from 40-man roster', () => {
    const roster = makeRoster(42);
    const state = buildRosterState('NYT', roster);
    const mlbPlayerId = state.mlbRoster[0]!;
    const result = dfaPlayer(mlbPlayerId, roster, state, 'S1D1');
    expect(result.success).toBe(true);
    expect(result.rosterState.mlbRoster).not.toContain(mlbPlayerId);
    expect(result.rosterState.fortyManRoster).not.toContain(mlbPlayerId);
    const dfaed = result.players.find((p) => p.id === mlbPlayerId);
    expect(dfaed!.rosterStatus).toBe('AAA');
  });
});

describe('getNextLevel', () => {
  it('returns correct level transitions upward', () => {
    expect(getNextLevel('AAA', 'up')).toBe('MLB');
    expect(getNextLevel('AA', 'up')).toBe('AAA');
    expect(getNextLevel('A_PLUS', 'up')).toBe('AA');
    expect(getNextLevel('A', 'up')).toBe('A_PLUS');
    expect(getNextLevel('ROOKIE', 'up')).toBe('A');
    expect(getNextLevel('INTERNATIONAL', 'up')).toBe('ROOKIE');
  });

  it('returns correct level transitions downward', () => {
    expect(getNextLevel('MLB', 'down')).toBe('AAA');
    expect(getNextLevel('AAA', 'down')).toBe('AA');
  });

  it('returns null at boundaries', () => {
    expect(getNextLevel('MLB', 'up')).toBeNull();
    expect(getNextLevel('INTERNATIONAL', 'down')).toBeNull();
  });
});

describe('needsRosterMove', () => {
  it('detects over-limit rosters', () => {
    const state: RosterState = {
      teamId: 'NYT',
      mlbRoster: Array.from({ length: 30 }, (_, i) => `p${i}`),
      fortyManRoster: Array.from({ length: 30 }, (_, i) => `p${i}`),
      transactions: [],
    };
    expect(needsRosterMove(state)).toBe(true);
  });

  it('returns false for within-limits roster', () => {
    const state: RosterState = {
      teamId: 'NYT',
      mlbRoster: Array.from({ length: 25 }, (_, i) => `p${i}`),
      fortyManRoster: Array.from({ length: 38 }, (_, i) => `p${i}`),
      transactions: [],
    };
    expect(needsRosterMove(state)).toBe(false);
  });
});
