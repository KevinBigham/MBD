import { describe, it, expect } from 'vitest';
import {
  GameRNG,
  generatePlayer,
  generateTeamRoster,
  buildRosterState,
  autoFillMLBRoster,
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

describe('autoFillMLBRoster', () => {
  it('skips blocked non-40-man candidates when a legal 40-man candidate can fill the MLB roster', () => {
    const roster = makeRoster(53);
    const mlbPlayers = roster.filter((player) => player.teamId === 'NYT' && player.rosterStatus === 'MLB');
    const aaaPlayers = roster.filter((player) => player.teamId === 'NYT' && player.rosterStatus === 'AAA');
    const blockedCandidate = aaaPlayers[0]!;
    const legalCandidate = aaaPlayers[1]!;
    expect(blockedCandidate).toBeTruthy();
    expect(legalCandidate).toBeTruthy();

    const activeRoster = mlbPlayers.slice(0, MLB_ROSTER_LIMIT - 1);
    (['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'RP'] as const).forEach((position, index) => {
      activeRoster[index]!.position = position;
    });

    for (const player of roster) {
      if (player.teamId === 'NYT' && player.rosterStatus === 'AAA') {
        player.overallRating = 200;
        player.potentialRating = 200;
        player.position = 'RF';
      }
    }

    blockedCandidate.id = 'blocked-high-score-fill';
    blockedCandidate.overallRating = 430;
    blockedCandidate.potentialRating = 430;
    blockedCandidate.hitterAttributes = {
      contact: 430,
      power: 430,
      eye: 430,
      speed: 320,
      defense: 320,
      durability: 320,
    };

    legalCandidate.id = 'legal-on-40-fill';
    legalCandidate.overallRating = 320;
    legalCandidate.potentialRating = 320;
    legalCandidate.hitterAttributes = {
      contact: 320,
      power: 320,
      eye: 320,
      speed: 300,
      defense: 300,
      durability: 320,
    };

    const fillerFortyManIds = roster
      .filter((player) =>
        player.teamId === 'NYT' &&
        player.rosterStatus !== 'MLB' &&
        player.id !== blockedCandidate.id &&
        player.id !== legalCandidate.id,
      )
      .slice(0, FORTY_MAN_LIMIT - activeRoster.length - 1)
      .map((player) => player.id);

    const baseState: RosterState = {
      teamId: 'NYT',
      mlbRoster: activeRoster.map((player) => player.id),
      fortyManRoster: [
        ...activeRoster.map((player) => player.id),
        legalCandidate.id,
        ...fillerFortyManIds,
      ],
      transactions: [],
    };
    expect(baseState.fortyManRoster).toHaveLength(FORTY_MAN_LIMIT);

    const result = autoFillMLBRoster('NYT', roster, baseState);

    expect(result.rosterState.mlbRoster).toHaveLength(MLB_ROSTER_LIMIT);
    expect(result.rosterState.mlbRoster).toContain(legalCandidate.id);
    expect(result.rosterState.mlbRoster).not.toContain(blockedCandidate.id);
    expect(result.rosterState.fortyManRoster).toHaveLength(FORTY_MAN_LIMIT);
    expect(validateRoster(result.rosterState, result.players).valid).toBe(true);
  });

  it('protects zero-service upside prospects from AI depth autofill when veteran depth can fill the spot', () => {
    const roster = makeRoster(54);
    const mlbPlayers = roster.filter((player) => player.teamId === 'NYT' && player.rosterStatus === 'MLB');
    const aaaPlayers = roster.filter((player) => player.teamId === 'NYT' && player.rosterStatus === 'AAA');
    const protectedProspect = aaaPlayers[0]!;
    const veteranDepth = aaaPlayers[1]!;
    expect(protectedProspect).toBeTruthy();
    expect(veteranDepth).toBeTruthy();

    const activeRoster = mlbPlayers.slice(0, MLB_ROSTER_LIMIT - 1);
    (['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'RP'] as const).forEach((position, index) => {
      activeRoster[index]!.position = position;
    });

    for (const player of roster) {
      if (
        player.teamId === 'NYT'
        && player.rosterStatus === 'AAA'
        && player.id !== protectedProspect.id
        && player.id !== veteranDepth.id
      ) {
        player.overallRating = 120;
        player.potentialRating = 120;
        player.serviceTimeDays = 0;
        player.position = 'RF';
        player.hitterAttributes = {
          contact: 120,
          power: 120,
          eye: 120,
          speed: 120,
          defense: 120,
          durability: 120,
        };
        player.pitcherAttributes = null;
      }
    }

    protectedProspect.id = 'zero-service-upside-fill';
    protectedProspect.age = 21;
    protectedProspect.overallRating = 430;
    protectedProspect.potentialRating = 500;
    protectedProspect.serviceTimeDays = 0;
    protectedProspect.position = 'RF';
    protectedProspect.hitterAttributes = {
      contact: 430,
      power: 430,
      eye: 430,
      speed: 360,
      defense: 350,
      durability: 330,
    };

    veteranDepth.id = 'veteran-depth-fill';
    veteranDepth.age = 29;
    veteranDepth.overallRating = 320;
    veteranDepth.potentialRating = 325;
    veteranDepth.serviceTimeDays = 480;
    veteranDepth.position = 'RF';
    veteranDepth.hitterAttributes = {
      contact: 320,
      power: 320,
      eye: 320,
      speed: 260,
      defense: 275,
      durability: 315,
    };

    const baseState: RosterState = {
      teamId: 'NYT',
      mlbRoster: activeRoster.map((player) => player.id),
      fortyManRoster: [
        ...activeRoster.map((player) => player.id),
        protectedProspect.id,
        veteranDepth.id,
      ],
      transactions: [],
    };

    const result = autoFillMLBRoster('NYT', roster, baseState, {
      protectServiceTimeProspects: true,
    });

    expect(result.rosterState.mlbRoster).toHaveLength(MLB_ROSTER_LIMIT);
    expect(result.rosterState.mlbRoster).toContain(veteranDepth.id);
    expect(result.rosterState.mlbRoster).not.toContain(protectedProspect.id);
    expect(validateRoster(result.rosterState, result.players).valid).toBe(true);
  });

  it('uses team-building identity while preserving roster limits', () => {
    const roster = makeRoster(52);
    const mlbPlayers = roster.filter((player) => player.teamId === 'NYT' && player.rosterStatus === 'MLB');
    const aaaPlayers = roster.filter((player) => player.teamId === 'NYT' && player.rosterStatus === 'AAA');
    const currentReady = aaaPlayers[0]!;
    const upsideProspect = aaaPlayers[1]!;
    expect(currentReady).toBeTruthy();
    expect(upsideProspect).toBeTruthy();

    const activeRoster = mlbPlayers.slice(0, MLB_ROSTER_LIMIT - 1);
    (['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'SP', 'RP'] as const).forEach((position, index) => {
      activeRoster[index]!.position = position;
    });

    currentReady.id = 'current-ready-fill';
    currentReady.age = 31;
    currentReady.overallRating = 340;
    currentReady.potentialRating = 345;
    currentReady.position = 'RF';
    currentReady.rosterStatus = 'AAA';
    currentReady.hitterAttributes = {
      contact: 340,
      power: 340,
      eye: 340,
      speed: 300,
      defense: 300,
      durability: 320,
    };

    upsideProspect.id = 'upside-prospect-fill';
    upsideProspect.age = 22;
    upsideProspect.overallRating = 320;
    upsideProspect.potentialRating = 430;
    upsideProspect.position = 'RF';
    upsideProspect.rosterStatus = 'AAA';
    upsideProspect.hitterAttributes = {
      contact: 320,
      power: 320,
      eye: 320,
      speed: 300,
      defense: 300,
      durability: 320,
    };

    const baseState: RosterState = {
      teamId: 'NYT',
      mlbRoster: activeRoster.map((player) => player.id),
      fortyManRoster: [
        ...activeRoster.map((player) => player.id),
        currentReady.id,
        upsideProspect.id,
      ],
      transactions: [],
    };

    const rebuilding = autoFillMLBRoster('NYT', roster, baseState, {
      teamBuildingArchetype: 'rebuilding',
    });
    const winNow = autoFillMLBRoster('NYT', roster, baseState, {
      teamBuildingArchetype: 'win_now',
    });

    expect(rebuilding.rosterState.mlbRoster).toContain(upsideProspect.id);
    expect(rebuilding.rosterState.mlbRoster).not.toContain(currentReady.id);
    expect(winNow.rosterState.mlbRoster).toContain(currentReady.id);
    expect(winNow.rosterState.mlbRoster).not.toContain(upsideProspect.id);
    expect(rebuilding.rosterState.mlbRoster).toHaveLength(MLB_ROSTER_LIMIT);
    expect(winNow.rosterState.mlbRoster).toHaveLength(MLB_ROSTER_LIMIT);
    expect(rebuilding.rosterState.fortyManRoster.length).toBeLessThanOrEqual(FORTY_MAN_LIMIT);
    expect(winNow.rosterState.fortyManRoster.length).toBeLessThanOrEqual(FORTY_MAN_LIMIT);
  });
});
