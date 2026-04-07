/**
 * @module invariants.test
 * Tests for the runtime invariant checker.
 */

import { describe, it, expect } from 'vitest';
import {
  checkUniquePlayerAssignment,
  checkRosterLimits,
  checkStandingsConsistency,
  checkRatingBounds,
  runInvariantChecks,
  GameRNG,
  generatePlayer,
  MLB_ROSTER_LIMIT,
  FORTY_MAN_LIMIT,
} from '../src/index.js';
import type {
  GeneratedPlayer,
  RosterState,
  TeamRecord,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTestPlayer(overrides?: Partial<GeneratedPlayer>): GeneratedPlayer {
  const rng = new GameRNG(42);
  const base = generatePlayer(rng, 'SS', 'kc', 'MLB');
  return { ...base, ...overrides };
}

function makeTeamRecord(overrides?: Partial<TeamRecord>): TeamRecord {
  return {
    teamId: 'kc',
    wins: 0,
    losses: 0,
    runsScored: 0,
    runsAllowed: 0,
    streak: 0,
    last10: [0, 0],
    divisionWins: 0,
    divisionLosses: 0,
    ...overrides,
  };
}

function makeRosterState(overrides?: Partial<RosterState>): RosterState {
  return {
    teamId: 'kc',
    mlbRoster: [],
    fortyManRoster: [],
    transactions: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// checkUniquePlayerAssignment
// ---------------------------------------------------------------------------

describe('checkUniquePlayerAssignment', () => {
  it('returns empty for players on different teams', () => {
    const players = [
      makeTestPlayer({ id: 'p1', teamId: 'kc', rosterStatus: 'MLB' }),
      makeTestPlayer({ id: 'p2', teamId: 'nym', rosterStatus: 'MLB' }),
    ];
    expect(checkUniquePlayerAssignment(players)).toEqual([]);
  });

  it('detects duplicate player on multiple teams', () => {
    const players = [
      makeTestPlayer({ id: 'p1', teamId: 'kc', rosterStatus: 'MLB' }),
      makeTestPlayer({ id: 'p1', teamId: 'nym', rosterStatus: 'MLB' }),
    ];
    const violations = checkUniquePlayerAssignment(players);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.type).toBe('duplicate_player_assignment');
    expect(violations[0]!.severity).toBe('critical');
  });

  it('ignores non-MLB players', () => {
    const players = [
      makeTestPlayer({ id: 'p1', teamId: 'kc', rosterStatus: 'AAA' }),
      makeTestPlayer({ id: 'p1', teamId: 'nym', rosterStatus: 'AAA' }),
    ];
    expect(checkUniquePlayerAssignment(players)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// checkRosterLimits
// ---------------------------------------------------------------------------

describe('checkRosterLimits', () => {
  it('returns empty for valid roster', () => {
    const ids = Array.from({ length: 26 }, (_, i) => `p${i}`);
    const state = makeRosterState({
      mlbRoster: ids,
      fortyManRoster: ids,
    });
    expect(checkRosterLimits(state)).toEqual([]);
  });

  it('detects MLB roster over limit', () => {
    const ids = Array.from({ length: 30 }, (_, i) => `p${i}`);
    const state = makeRosterState({
      mlbRoster: ids,
      fortyManRoster: ids,
    });
    const violations = checkRosterLimits(state);
    expect(violations.some(v => v.type === 'roster_size_exceeded')).toBe(true);
  });

  it('detects 40-man over limit', () => {
    const ids = Array.from({ length: 45 }, (_, i) => `p${i}`);
    const state = makeRosterState({
      mlbRoster: ids.slice(0, 26),
      fortyManRoster: ids,
    });
    const violations = checkRosterLimits(state);
    expect(violations.some(v => v.type === 'forty_man_exceeded')).toBe(true);
  });

  it('detects MLB player not on 40-man', () => {
    const state = makeRosterState({
      mlbRoster: ['p1', 'p2'],
      fortyManRoster: ['p1'], // p2 missing
    });
    const violations = checkRosterLimits(state);
    expect(violations.some(v => v.type === 'mlb_not_on_forty_man')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkStandingsConsistency
// ---------------------------------------------------------------------------

describe('checkStandingsConsistency', () => {
  it('returns empty when wins equal losses', () => {
    const records = [
      makeTeamRecord({ teamId: 'kc', wins: 10, losses: 5 }),
      makeTeamRecord({ teamId: 'nym', wins: 5, losses: 10 }),
    ];
    expect(checkStandingsConsistency(records)).toEqual([]);
  });

  it('detects wins/losses mismatch', () => {
    const records = [
      makeTeamRecord({ teamId: 'kc', wins: 10, losses: 5 }),
      makeTeamRecord({ teamId: 'nym', wins: 8, losses: 10 }),
    ];
    const violations = checkStandingsConsistency(records);
    expect(violations.some(v => v.type === 'standings_mismatch')).toBe(true);
  });

  it('detects negative wins', () => {
    const records = [
      makeTeamRecord({ teamId: 'kc', wins: -1, losses: 5 }),
      makeTeamRecord({ teamId: 'nym', wins: 5, losses: -1 }),
    ];
    const violations = checkStandingsConsistency(records);
    expect(violations.some(v => v.type === 'negative_wins')).toBe(true);
    expect(violations.some(v => v.type === 'negative_losses')).toBe(true);
  });

  it('detects division wins exceeding total wins', () => {
    const records = [
      makeTeamRecord({ teamId: 'kc', wins: 10, losses: 10, divisionWins: 15 }),
      makeTeamRecord({ teamId: 'nym', wins: 10, losses: 10 }),
    ];
    const violations = checkStandingsConsistency(records);
    expect(violations.some(v => v.type === 'division_wins_exceed_total')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkRatingBounds
// ---------------------------------------------------------------------------

describe('checkRatingBounds', () => {
  it('returns empty for normal player', () => {
    const player = makeTestPlayer();
    expect(checkRatingBounds([player])).toEqual([]);
  });

  it('detects out-of-bounds hitter attribute', () => {
    const player = makeTestPlayer({
      hitterAttributes: {
        contact: 600, // over 550 max
        power: 200,
        eye: 200,
        speed: 200,
        defense: 200,
        durability: 200,
      },
    });
    const violations = checkRatingBounds([player]);
    expect(violations.some(v => v.type === 'rating_out_of_bounds')).toBe(true);
  });

  it('detects negative salary', () => {
    const player = makeTestPlayer({
      contract: {
        years: 1,
        annualSalary: -5,
        noTradeClause: false,
        playerOption: false,
        teamOption: false,
      },
    });
    const violations = checkRatingBounds([player]);
    expect(violations.some(v => v.type === 'negative_salary')).toBe(true);
  });

  it('detects unrealistic age', () => {
    const player = makeTestPlayer({ age: 10 });
    const violations = checkRatingBounds([player]);
    expect(violations.some(v => v.type === 'age_out_of_bounds')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// runInvariantChecks (composite)
// ---------------------------------------------------------------------------

describe('runInvariantChecks', () => {
  it('returns clean result for valid state', () => {
    const player = makeTestPlayer({ rosterStatus: 'AAA' });
    const result = runInvariantChecks({ players: [player] });
    expect(result.violations).toEqual([]);
    expect(result.hasCritical).toBe(false);
    expect(result.hasHigh).toBe(false);
    expect(result.summary).toBe('All invariants OK');
  });

  it('aggregates violations from multiple checks', () => {
    const players = [
      makeTestPlayer({ id: 'dup', teamId: 'kc', rosterStatus: 'MLB' }),
      makeTestPlayer({ id: 'dup', teamId: 'nym', rosterStatus: 'MLB' }),
    ];
    const records = [
      makeTeamRecord({ teamId: 'kc', wins: 10, losses: 5 }),
      makeTeamRecord({ teamId: 'nym', wins: 8, losses: 10 }),
    ];
    const result = runInvariantChecks({
      players,
      standingsRecords: records,
    });
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.hasCritical).toBe(true); // duplicate player
    expect(result.hasHigh).toBe(true); // standings mismatch
  });

  it('handles empty state gracefully', () => {
    const result = runInvariantChecks({});
    expect(result.violations).toEqual([]);
    expect(result.summary).toBe('All invariants OK');
  });
});
