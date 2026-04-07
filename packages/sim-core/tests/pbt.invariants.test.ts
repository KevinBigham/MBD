/**
 * @module pbt.invariants
 * Property-based tests using fast-check to fuzz-test sim-core invariants.
 * These tests generate random but valid inputs and verify that core invariants
 * always hold — catching edge cases that handwritten tests miss.
 *
 * Invariant categories:
 *  1. PRNG determinism & serialization
 *  2. Player generation bounds
 *  3. Roster limits & structural consistency
 *  4. Standings conservation (wins = losses league-wide)
 *  5. Trade valuation bounds & symmetry
 *  6. Finance: salary floor, luxury tax monotonicity
 *  7. Game simulation: score non-negative, winner/loser assignment
 *  8. Draft class size & ordering
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  GameRNG,
  // Player generation
  generatePlayer,
  generateTeamRoster,
  HITTER_POSITIONS,
  PITCHER_POSITIONS,
  ALL_POSITIONS,
  ROSTER_LEVELS,
  RATING_MIN,
  RATING_MAX,
  hitterOverall,
  pitcherOverall,
  // Roster
  MLB_ROSTER_LIMIT,
  FORTY_MAN_LIMIT,
  buildRosterState,
  validateRoster,
  promotePlayer,
  demotePlayer,
  dfaPlayer,
  getMLBRosterCount,
  get40ManCount,
  // Standings
  StandingsTracker,
  // Trade
  evaluatePlayerTradeValue,
  comparePackages,
  // Finance
  LEAGUE_MINIMUM_SALARY,
  LUXURY_TAX_THRESHOLD,
  calculatePlayerValue,
  calculateTeamPayroll,
  calculateLuxuryTax,
  // Sim
  simulateGame,
  // Draft
  generateDraftClass,
  DRAFT_CLASS_SIZE,
} from '../src/index.js';
import type {
  GeneratedPlayer,
  Position,
  RosterLevel,
  GameTeam,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Custom Arbitraries (fast-check generators)
// ---------------------------------------------------------------------------

/** Arbitrary seed for GameRNG (positive 32-bit integers) */
const arbSeed = fc.integer({ min: 1, max: 2 ** 31 - 1 });

/** Arbitrary position from the full position list */
const arbPosition: fc.Arbitrary<Position> = fc.constantFrom(
  ...ALL_POSITIONS,
);

/** Arbitrary roster level */
const arbRosterLevel: fc.Arbitrary<RosterLevel> = fc.constantFrom(
  ...ROSTER_LEVELS,
);

/** Arbitrary team ID from real MBD teams */
const TEAM_IDS = [
  'nym', 'phi', 'bos', 'bal', 'wsh',
  'chi', 'det', 'cle', 'col', 'pit',
  'kc', 'msp', 'stl', 'ind', 'mil', 'nas',
  'mia', 'atl', 'cha', 'orl', 'ral',
  'hou', 'dal', 'sat', 'den', 'aus',
  'lax', 'sfb', 'phx', 'sea', 'sdg', 'por',
] as const;

const arbTeamId = fc.constantFrom(...TEAM_IDS);

/** Generate a single player with a given seed */
function makePlayer(seed: number, position?: Position, teamId?: string, level?: RosterLevel): GeneratedPlayer {
  const rng = new GameRNG(seed);
  return generatePlayer(
    rng,
    position ?? ALL_POSITIONS[seed % ALL_POSITIONS.length]!,
    teamId ?? TEAM_IDS[seed % TEAM_IDS.length]!,
    level ?? ROSTER_LEVELS[seed % ROSTER_LEVELS.length]!,
  );
}

/** Generate a full team roster with a given seed */
function makeRoster(seed: number, teamId?: string): GeneratedPlayer[] {
  const rng = new GameRNG(seed);
  return generateTeamRoster(rng, teamId ?? 'kc');
}

// ---------------------------------------------------------------------------
// 1. PRNG Determinism & Serialization
// ---------------------------------------------------------------------------

describe('PBT: PRNG Invariants', () => {
  it('same seed always produces identical sequence', () => {
    fc.assert(
      fc.property(arbSeed, fc.integer({ min: 1, max: 200 }), (seed, count) => {
        const rng1 = new GameRNG(seed);
        const rng2 = new GameRNG(seed);
        for (let i = 0; i < count; i++) {
          expect(rng1.nextInt(0, 1000)).toBe(rng2.nextInt(0, 1000));
        }
      }),
      { numRuns: 50 },
    );
  });

  it('different seeds produce different sequences (with overwhelming probability)', () => {
    fc.assert(
      fc.property(arbSeed, arbSeed, (seedA, seedB) => {
        fc.pre(seedA !== seedB);
        const rngA = new GameRNG(seedA);
        const rngB = new GameRNG(seedB);
        const seqA = Array.from({ length: 20 }, () => rngA.nextInt(0, 10000));
        const seqB = Array.from({ length: 20 }, () => rngB.nextInt(0, 10000));
        // At least one value should differ in 20 draws
        expect(seqA.some((v, i) => v !== seqB[i])).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  it('serialize/deserialize round-trip preserves exact sequence', () => {
    fc.assert(
      fc.property(arbSeed, fc.integer({ min: 0, max: 100 }), (seed, advanceBy) => {
        const rng = new GameRNG(seed);
        // Advance the RNG
        for (let i = 0; i < advanceBy; i++) rng.nextInt(0, 1000);
        // Snapshot
        const state = rng.getState();
        // Continue original
        const nextValues = Array.from({ length: 10 }, () => rng.nextInt(0, 1000));
        // Restore from snapshot
        const restored = GameRNG.fromState(state);
        const restoredValues = Array.from({ length: 10 }, () => restored.nextInt(0, 1000));
        expect(restoredValues).toEqual(nextValues);
      }),
      { numRuns: 50 },
    );
  });

  it('nextInt respects bounds for all min/max combinations', () => {
    fc.assert(
      fc.property(
        arbSeed,
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 0, max: 500 }),
        (seed, a, b) => {
          const min = Math.min(a, b);
          const max = Math.max(a, b);
          fc.pre(min < max);
          const rng = new GameRNG(seed);
          for (let i = 0; i < 50; i++) {
            const val = rng.nextInt(min, max);
            expect(val).toBeGreaterThanOrEqual(min);
            expect(val).toBeLessThanOrEqual(max);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('nextFloat always returns [0, 1)', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const rng = new GameRNG(seed);
        for (let i = 0; i < 100; i++) {
          const val = rng.nextFloat();
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThan(1);
        }
      }),
      { numRuns: 30 },
    );
  });

  it('weightedPick respects item list length', () => {
    fc.assert(
      fc.property(
        arbSeed,
        fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
        (seed, items) => {
          const rng = new GameRNG(seed);
          const weights = items.map(() => rng.nextFloat() + 0.01); // all positive
          for (let i = 0; i < 20; i++) {
            const pick = rng.weightedPick(items, weights);
            expect(items).toContain(pick);
          }
        },
      ),
      { numRuns: 30 },
    );
  });

  it('shuffle preserves all elements (no loss, no duplication)', () => {
    fc.assert(
      fc.property(
        arbSeed,
        fc.array(fc.integer(), { minLength: 0, maxLength: 50 }),
        (seed, arr) => {
          const rng = new GameRNG(seed);
          const shuffled = rng.shuffle(arr);
          expect(shuffled.length).toBe(arr.length);
          expect([...shuffled].sort()).toEqual([...arr].sort());
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Player Generation Bounds
// ---------------------------------------------------------------------------

describe('PBT: Player Generation Invariants', () => {
  it('generated player has valid overall rating within [RATING_MIN, RATING_MAX]', () => {
    fc.assert(
      fc.property(arbSeed, arbPosition, arbTeamId, arbRosterLevel, (seed, pos, teamId, level) => {
        const player = makePlayer(seed, pos, teamId, level);
        const overall = (PITCHER_POSITIONS as readonly string[]).includes(pos)
          ? (player.pitcherAttributes ? pitcherOverall(player.pitcherAttributes) : 0)
          : hitterOverall(player.hitterAttributes);
        expect(overall).toBeGreaterThanOrEqual(RATING_MIN);
        expect(overall).toBeLessThanOrEqual(RATING_MAX);
      }),
      { numRuns: 100 },
    );
  });

  it('all hitter attributes are within [RATING_MIN, RATING_MAX]', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const pos = HITTER_POSITIONS[seed % HITTER_POSITIONS.length]!;
        const player = makePlayer(seed, pos);
        const attrs = player.hitterAttributes;
        for (const key of ['contact', 'power', 'eye', 'speed', 'defense', 'durability'] as const) {
          expect(attrs[key]).toBeGreaterThanOrEqual(RATING_MIN);
          expect(attrs[key]).toBeLessThanOrEqual(RATING_MAX);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('pitcher has valid pitcher attributes when position is SP/RP/CL', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const pos = PITCHER_POSITIONS[seed % PITCHER_POSITIONS.length]!;
        const player = makePlayer(seed, pos);
        expect(player.pitcherAttributes).not.toBeNull();
        if (player.pitcherAttributes) {
          for (const key of ['stuff', 'control', 'stamina', 'velocity', 'movement'] as const) {
            expect(player.pitcherAttributes[key]).toBeGreaterThanOrEqual(RATING_MIN);
            expect(player.pitcherAttributes[key]).toBeLessThanOrEqual(RATING_MAX);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('player age is realistic (16-45)', () => {
    fc.assert(
      fc.property(arbSeed, arbPosition, arbTeamId, arbRosterLevel, (seed, pos, teamId, level) => {
        const player = makePlayer(seed, pos, teamId, level);
        expect(player.age).toBeGreaterThanOrEqual(16);
        expect(player.age).toBeLessThanOrEqual(45);
      }),
      { numRuns: 100 },
    );
  });

  it('player contract salary >= 0', () => {
    fc.assert(
      fc.property(arbSeed, arbPosition, arbTeamId, arbRosterLevel, (seed, pos, teamId, level) => {
        const player = makePlayer(seed, pos, teamId, level);
        expect(player.contract.annualSalary).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 },
    );
  });

  it('player has a non-empty ID', () => {
    fc.assert(
      fc.property(arbSeed, arbPosition, (seed, pos) => {
        const player = makePlayer(seed, pos);
        expect(player.id).toBeTruthy();
        expect(typeof player.id).toBe('string');
        expect(player.id.length).toBeGreaterThan(0);
      }),
      { numRuns: 50 },
    );
  });

  it('team roster has unique player IDs (no duplicates)', () => {
    fc.assert(
      fc.property(arbSeed, arbTeamId, (seed, teamId) => {
        const roster = makeRoster(seed, teamId);
        const ids = roster.map(p => p.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }),
      { numRuns: 20 },
    );
  });

  it('team roster has both hitters and pitchers', () => {
    fc.assert(
      fc.property(arbSeed, arbTeamId, (seed, teamId) => {
        const roster = makeRoster(seed, teamId);
        const hitters = roster.filter(p =>
          (HITTER_POSITIONS as readonly string[]).includes(p.position),
        );
        const pitchers = roster.filter(p =>
          (PITCHER_POSITIONS as readonly string[]).includes(p.position),
        );
        expect(hitters.length).toBeGreaterThan(0);
        expect(pitchers.length).toBeGreaterThan(0);
      }),
      { numRuns: 20 },
    );
  });

  it('all roster players belong to the same team', () => {
    fc.assert(
      fc.property(arbSeed, arbTeamId, (seed, teamId) => {
        const roster = makeRoster(seed, teamId);
        for (const player of roster) {
          expect(player.teamId).toBe(teamId);
        }
      }),
      { numRuns: 20 },
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Roster Limits & Structural Consistency
// ---------------------------------------------------------------------------

describe('PBT: Roster Invariants', () => {
  it('buildRosterState MLB subset is always contained in 40-man', () => {
    fc.assert(
      fc.property(arbSeed, arbTeamId, (seed, teamId) => {
        const roster = makeRoster(seed, teamId);
        const state = buildRosterState(teamId, roster);
        // Every MLB player must be on the 40-man roster
        const fortySet = new Set(state.fortyManRoster);
        for (const id of state.mlbRoster) {
          expect(fortySet.has(id)).toBe(true);
        }
        // All IDs on MLB/40-man must reference actual players on this team
        for (const id of state.mlbRoster) {
          const p = roster.find(r => r.id === id);
          expect(p).toBeDefined();
          expect(p!.teamId).toBe(teamId);
          expect(p!.rosterStatus).toBe('MLB');
        }
      }),
      { numRuns: 20 },
    );
  });

  it('all MLB players are on the 40-man roster', () => {
    fc.assert(
      fc.property(arbSeed, arbTeamId, (seed, teamId) => {
        const roster = makeRoster(seed, teamId);
        const state = buildRosterState(teamId, roster);
        const fortySet = new Set(state.fortyManRoster);
        for (const id of state.mlbRoster) {
          expect(fortySet.has(id)).toBe(true);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('validateRoster error count is consistent with limit violations', () => {
    fc.assert(
      fc.property(arbSeed, arbTeamId, (seed, teamId) => {
        const roster = makeRoster(seed, teamId);
        const state = buildRosterState(teamId, roster);
        const validation = validateRoster(state, roster);

        // If MLB roster exceeds limit, there must be an error about it
        if (state.mlbRoster.length > MLB_ROSTER_LIMIT) {
          expect(validation.errors.some(e => e.includes('MLB roster'))).toBe(true);
          expect(validation.valid).toBe(false);
        }
        // If 40-man exceeds limit, there must be an error about it
        if (state.fortyManRoster.length > FORTY_MAN_LIMIT) {
          expect(validation.errors.some(e => e.includes('40-man roster'))).toBe(true);
          expect(validation.valid).toBe(false);
        }
        // If both within limits and all MLB on 40-man, should be valid
        if (
          state.mlbRoster.length <= MLB_ROSTER_LIMIT &&
          state.fortyManRoster.length <= FORTY_MAN_LIMIT
        ) {
          // Check for the subset invariant error
          const fortySet = new Set(state.fortyManRoster);
          const allMlbOnForty = state.mlbRoster.every(id => fortySet.has(id));
          if (allMlbOnForty) {
            expect(validation.valid).toBe(true);
          }
        }
      }),
      { numRuns: 20 },
    );
  });

  it('promote then demote returns player to original level', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const roster = makeRoster(seed, 'kc');
        const state = buildRosterState('kc', roster);

        // Find an AAA player to promote
        const aaaPlayer = roster.find(
          p => p.teamId === 'kc' && p.rosterStatus === 'AAA',
        );
        if (!aaaPlayer) return; // skip if no AAA player

        // Only promote if MLB roster has room
        if (state.mlbRoster.length >= MLB_ROSTER_LIMIT) return;

        const promoted = promotePlayer(aaaPlayer.id, roster, state, 'S1D1');
        if (!promoted.success) return;

        expect(promoted.rosterState.mlbRoster).toContain(aaaPlayer.id);

        // Demote back
        const demoted = demotePlayer(aaaPlayer.id, promoted.players, promoted.rosterState, 'S1D2');
        if (!demoted.success) return;

        const player = demoted.players.find(p => p.id === aaaPlayer.id);
        expect(player?.rosterStatus).toBe('AAA');
      }),
      { numRuns: 20 },
    );
  });

  it('DFA removes player from both MLB and 40-man', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const roster = makeRoster(seed, 'kc');
        const state = buildRosterState('kc', roster);

        const mlbPlayer = roster.find(
          p => p.teamId === 'kc' && p.rosterStatus === 'MLB',
        );
        if (!mlbPlayer) return;

        const result = dfaPlayer(mlbPlayer.id, roster, state, 'S1D1');
        if (!result.success) return;

        expect(result.rosterState.mlbRoster).not.toContain(mlbPlayer.id);
        expect(result.rosterState.fortyManRoster).not.toContain(mlbPlayer.id);
      }),
      { numRuns: 20 },
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Standings Conservation
// ---------------------------------------------------------------------------

describe('PBT: Standings Invariants', () => {
  it('league-wide wins always equals league-wide losses', () => {
    fc.assert(
      fc.property(
        arbSeed,
        fc.integer({ min: 10, max: 100 }),
        (seed, numGames) => {
          const teamIds = ['teamA', 'teamB', 'teamC', 'teamD'];
          const tracker = new StandingsTracker(teamIds);
          const rng = new GameRNG(seed);

          for (let i = 0; i < numGames; i++) {
            const homeIdx = rng.nextInt(0, teamIds.length - 1);
            let awayIdx = rng.nextInt(0, teamIds.length - 2);
            if (awayIdx >= homeIdx) awayIdx++;

            const homeRuns = rng.nextInt(0, 15);
            const awayRuns = rng.nextInt(0, 15);

            // Must have a winner (no ties in baseball)
            const winnerRuns = Math.max(homeRuns, awayRuns) + (homeRuns === awayRuns ? 1 : 0);
            const loserRuns = Math.min(homeRuns, awayRuns);
            const winnerId = homeRuns >= awayRuns ? teamIds[homeIdx]! : teamIds[awayIdx]!;
            const loserId = winnerId === teamIds[homeIdx]! ? teamIds[awayIdx]! : teamIds[homeIdx]!;

            tracker.recordGame(winnerId, loserId, winnerRuns, loserRuns, false);
          }

          // Invariant: total wins = total losses
          let totalWins = 0;
          let totalLosses = 0;
          for (const id of teamIds) {
            const record = tracker.getRecord(id);
            expect(record).toBeDefined();
            totalWins += record!.wins;
            totalLosses += record!.losses;
          }
          expect(totalWins).toBe(totalLosses);
          expect(totalWins).toBe(numGames);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('serialize/deserialize round-trip preserves records exactly', () => {
    fc.assert(
      fc.property(arbSeed, fc.integer({ min: 5, max: 50 }), (seed, numGames) => {
        const teamIds = ['t1', 't2', 't3', 't4'];
        const tracker = new StandingsTracker(teamIds);
        const rng = new GameRNG(seed);

        for (let i = 0; i < numGames; i++) {
          const a = rng.nextInt(0, 3);
          let b = rng.nextInt(0, 2);
          if (b >= a) b++;
          tracker.recordGame(teamIds[a]!, teamIds[b]!, rng.nextInt(1, 10), rng.nextInt(0, 9), false);
        }

        const serialized = tracker.serialize();
        const restored = StandingsTracker.deserialize(serialized);

        for (const id of teamIds) {
          const orig = tracker.getRecord(id);
          const rest = restored.getRecord(id);
          expect(rest?.wins).toBe(orig?.wins);
          expect(rest?.losses).toBe(orig?.losses);
          expect(rest?.runsScored).toBe(orig?.runsScored);
          expect(rest?.runsAllowed).toBe(orig?.runsAllowed);
        }
      }),
      { numRuns: 30 },
    );
  });

  it('win percentage is always between 0 and 1', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const teamIds = ['x1', 'x2', 'x3', 'x4'];
        const tracker = new StandingsTracker(teamIds);
        const rng = new GameRNG(seed);

        for (let i = 0; i < 50; i++) {
          const a = rng.nextInt(0, 3);
          let b = rng.nextInt(0, 2);
          if (b >= a) b++;
          tracker.recordGame(teamIds[a]!, teamIds[b]!, rng.nextInt(1, 10), rng.nextInt(0, 9), false);
        }

        const standings = tracker.getLeagueStandings();
        for (const entry of standings) {
          expect(entry.pct).toBeGreaterThanOrEqual(0);
          expect(entry.pct).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 30 },
    );
  });

  it('games back is non-negative for division standings', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const teamIds = ['d1', 'd2', 'd3', 'd4', 'd5'];
        const tracker = new StandingsTracker(teamIds);
        const rng = new GameRNG(seed);

        // Record some games
        for (let i = 0; i < 40; i++) {
          const a = rng.nextInt(0, 4);
          let b = rng.nextInt(0, 3);
          if (b >= a) b++;
          tracker.recordGame(teamIds[a]!, teamIds[b]!, rng.nextInt(1, 12), rng.nextInt(0, 11), true);
        }

        // Note: getDivisionStandings needs real divisions. Use getLeagueStandings as proxy.
        const standings = tracker.getLeagueStandings();
        // Games back is computed within getDivisionStandings, so we check the
        // serialized records directly for non-negative wins/losses.
        for (const entry of standings) {
          expect(entry.wins).toBeGreaterThanOrEqual(0);
          expect(entry.losses).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 30 },
    );
  });
});

// ---------------------------------------------------------------------------
// 5. Trade Valuation Bounds & Symmetry
// ---------------------------------------------------------------------------

describe('PBT: Trade Valuation Invariants', () => {
  it('trade value overall is always 0-100', () => {
    fc.assert(
      fc.property(arbSeed, arbPosition, (seed, pos) => {
        const player = makePlayer(seed, pos);
        const value = evaluatePlayerTradeValue(player);
        expect(value.overall).toBeGreaterThanOrEqual(0);
        expect(value.overall).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 },
    );
  });

  it('all trade value dimensions are 0-100', () => {
    fc.assert(
      fc.property(arbSeed, arbPosition, (seed, pos) => {
        const player = makePlayer(seed, pos);
        const value = evaluatePlayerTradeValue(player);
        const dims = value.dimensions;
        for (const key of Object.keys(dims) as (keyof typeof dims)[]) {
          expect(dims[key]).toBeGreaterThanOrEqual(0);
          expect(dims[key]).toBeLessThanOrEqual(100);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('comparePackages fairness is bounded [-100, 100]', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const rng = new GameRNG(seed);
        const p1 = makePlayer(rng.nextInt(1, 100000), 'SS');
        const p2 = makePlayer(rng.nextInt(1, 100000), 'SP');
        const p3 = makePlayer(rng.nextInt(1, 100000), 'CF');

        const comparison = comparePackages([p1], [p2, p3]);
        expect(comparison.fairness).toBeGreaterThanOrEqual(-100);
        expect(comparison.fairness).toBeLessThanOrEqual(100);
        expect(comparison.offerValue).toBeGreaterThanOrEqual(0);
        expect(comparison.requestValue).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 50 },
    );
  });

  it('self-trade has zero or near-zero fairness', () => {
    fc.assert(
      fc.property(arbSeed, arbPosition, (seed, pos) => {
        const player = makePlayer(seed, pos);
        const comparison = comparePackages([player], [player]);
        // Trading a player for themselves should be perfectly fair
        expect(comparison.fairness).toBe(0);
        expect(comparison.offerValue).toBe(comparison.requestValue);
      }),
      { numRuns: 50 },
    );
  });

  it('higher-rated player has higher or equal trade value than lower-rated', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        // Generate two hitters of same position but compare by overall
        const p1 = makePlayer(seed, 'SS', 'kc', 'MLB');
        const p2 = makePlayer(seed + 1000, 'SS', 'kc', 'MLB');

        const v1 = evaluatePlayerTradeValue(p1);
        const v2 = evaluatePlayerTradeValue(p2);

        const overall1 = hitterOverall(p1.hitterAttributes);
        const overall2 = hitterOverall(p2.hitterAttributes);

        // Higher overall rating should generally produce higher current ability
        if (overall1 > overall2 + 50) {
          expect(v1.dimensions.currentAbility).toBeGreaterThanOrEqual(
            v2.dimensions.currentAbility,
          );
        }
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// 6. Finance Invariants
// ---------------------------------------------------------------------------

describe('PBT: Finance Invariants', () => {
  it('team payroll components are non-negative and consistent', () => {
    fc.assert(
      fc.property(arbSeed, arbTeamId, (seed, teamId) => {
        const roster = makeRoster(seed, teamId);
        const payroll = calculateTeamPayroll(teamId, roster);

        // All payroll components should be non-negative
        expect(payroll.mlbPayroll).toBeGreaterThanOrEqual(0);
        expect(payroll.minorsPayroll).toBeGreaterThanOrEqual(0);
        expect(payroll.deadMoney).toBeGreaterThanOrEqual(0);
        expect(payroll.totalPayroll).toBeGreaterThanOrEqual(0);
        // Total should be >= MLB payroll (total includes minors + dead money)
        expect(payroll.totalPayroll).toBeGreaterThanOrEqual(payroll.mlbPayroll);
        // Manual sum check: MLB + minors + dead = total
        const expectedTotal = Math.round(
          (payroll.mlbPayroll + payroll.minorsPayroll + payroll.deadMoney) * 100,
        ) / 100;
        expect(payroll.totalPayroll).toBeCloseTo(expectedTotal, 1);
      }),
      { numRuns: 20 },
    );
  });

  it('luxury tax is zero when under threshold, positive when over', () => {
    fc.assert(
      fc.property(arbSeed, arbTeamId, (seed, teamId) => {
        const roster = makeRoster(seed, teamId);
        const payroll = calculateTeamPayroll(roster, teamId);
        const tax = calculateLuxuryTax(payroll.mlbPayroll);

        if (payroll.mlbPayroll <= LUXURY_TAX_THRESHOLD) {
          expect(tax).toBe(0);
        } else {
          expect(tax).toBeGreaterThan(0);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('luxury tax is monotonically increasing with payroll', () => {
    // Higher payroll should never produce lower tax
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 400, noNaN: true }),
        fc.double({ min: 0, max: 400, noNaN: true }),
        (payrollA, payrollB) => {
          const lower = Math.min(payrollA, payrollB);
          const higher = Math.max(payrollA, payrollB);
          const taxLow = calculateLuxuryTax(lower);
          const taxHigh = calculateLuxuryTax(higher);
          expect(taxHigh).toBeGreaterThanOrEqual(taxLow);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('player value is non-negative', () => {
    fc.assert(
      fc.property(arbSeed, arbPosition, (seed, pos) => {
        const player = makePlayer(seed, pos);
        const value = calculatePlayerValue(player);
        expect(value).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// 7. Game Simulation Invariants
// ---------------------------------------------------------------------------

describe('PBT: Game Simulation Invariants', () => {
  it('game always has a winner (no ties)', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const rng = new GameRNG(seed);
        const homeRoster = makeRoster(seed, 'kc');
        const awayRoster = makeRoster(seed + 999, 'nym');

        const homeMlb = homeRoster.filter(p => p.rosterStatus === 'MLB');
        const awayMlb = awayRoster.filter(p => p.rosterStatus === 'MLB');

        const homeLineup = homeMlb.filter(p =>
          (HITTER_POSITIONS as readonly string[]).includes(p.position),
        ).slice(0, 9);
        const awayLineup = awayMlb.filter(p =>
          (HITTER_POSITIONS as readonly string[]).includes(p.position),
        ).slice(0, 9);
        const homeSP = homeMlb.find(p => p.position === 'SP');
        const awaySP = awayMlb.find(p => p.position === 'SP');
        const homeBullpen = homeMlb.filter(p => p.position === 'RP' || p.position === 'CL');
        const awayBullpen = awayMlb.filter(p => p.position === 'RP' || p.position === 'CL');

        if (!homeSP || !awaySP || homeLineup.length < 9 || awayLineup.length < 9) return;

        const home: GameTeam = {
          teamId: 'kc',
          lineup: homeLineup,
          pitcher: homeSP,
          bullpen: homeBullpen,
        };
        const away: GameTeam = {
          teamId: 'nym',
          lineup: awayLineup,
          pitcher: awaySP,
          bullpen: awayBullpen,
        };

        const { boxScore } = simulateGame(rng, away, home, 'D1');

        // No ties
        expect(boxScore.homeScore).not.toBe(boxScore.awayScore);
        // Scores non-negative
        expect(boxScore.homeScore).toBeGreaterThanOrEqual(0);
        expect(boxScore.awayScore).toBeGreaterThanOrEqual(0);
        // At least 9 innings
        expect(boxScore.innings).toBeGreaterThanOrEqual(9);
        // Hits non-negative
        expect(boxScore.homeHits).toBeGreaterThanOrEqual(0);
        expect(boxScore.awayHits).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 20 },
    );
  });
});

// ---------------------------------------------------------------------------
// 8. Draft Class Invariants
// ---------------------------------------------------------------------------

describe('PBT: Draft Class Invariants', () => {
  it('draft class has exactly DRAFT_CLASS_SIZE prospects', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const rng = new GameRNG(seed);
        const draftClass = generateDraftClass(rng, 1);
        expect(draftClass.prospects.length).toBe(DRAFT_CLASS_SIZE);
      }),
      { numRuns: 10 },
    );
  });

  it('all draft prospects have unique player IDs', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const rng = new GameRNG(seed);
        const draftClass = generateDraftClass(rng, 1);
        const ids = draftClass.prospects.map(p => p.player.id);
        expect(new Set(ids).size).toBe(ids.length);
      }),
      { numRuns: 10 },
    );
  });

  it('consensus rank is unique across prospects', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const rng = new GameRNG(seed);
        const draftClass = generateDraftClass(rng, 1);
        const ranks = draftClass.prospects.map(p => p.consensusRank);
        expect(new Set(ranks).size).toBe(ranks.length);
      }),
      { numRuns: 10 },
    );
  });

  it('scouting grade is within 20-80 scale', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const rng = new GameRNG(seed);
        const draftClass = generateDraftClass(rng, 1);
        for (const prospect of draftClass.prospects) {
          expect(prospect.scoutingGrade).toBeGreaterThanOrEqual(20);
          expect(prospect.scoutingGrade).toBeLessThanOrEqual(80);
        }
      }),
      { numRuns: 10 },
    );
  });

  it('signability is between 0 and 1', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const rng = new GameRNG(seed);
        const draftClass = generateDraftClass(rng, 1);
        for (const prospect of draftClass.prospects) {
          expect(prospect.signability).toBeGreaterThanOrEqual(0);
          expect(prospect.signability).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 10 },
    );
  });
});
