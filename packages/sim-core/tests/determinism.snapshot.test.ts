import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  TEAMS,
  createSeasonState,
  generateLeaguePlayers,
  generateSchedule,
  simulateDay,
} from '../src/index.js';

/**
 * Determinism snapshot — guards against iteration-order regressions that the
 * rest of the test suite can miss. Same seed + same inputs must always produce
 * the same stateful output.
 *
 * Added during the cleanup sweep (chore/cleanup-sweep). If a refactor changes
 * this hash, either the refactor silently broke determinism (fix it) or the
 * behavior change was intentional (update the snapshot and call it out in the
 * commit message). Do NOT casually regenerate the snapshot.
 */

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (value instanceof Map) {
    const entries = Array.from(value.entries()).sort(([a], [b]) =>
      String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0,
    );
    return (
      '{'
      + entries.map(([k, v]) => JSON.stringify(String(k)) + ':' + stableStringify(v)).join(',')
      + '}'
    );
  }
  const keys = Object.keys(value as object).sort();
  return (
    '{'
    + keys
      .map(
        (k) =>
          JSON.stringify(k) + ':' + stableStringify((value as Record<string, unknown>)[k]),
      )
      .join(',')
    + '}'
  );
}

function hashState(state: unknown): string {
  return createHash('sha256').update(stableStringify(state)).digest('hex');
}

function simulateMonthForSeed(seed: number, days: number) {
  const rng = new GameRNG(seed);
  const teamIds = TEAMS.map((t) => t.id);
  const players = generateLeaguePlayers(rng.fork(), teamIds);
  const schedule = generateSchedule(rng.fork());
  let state = createSeasonState(1, teamIds);

  for (let day = 1; day <= days; day++) {
    if (state.completed) break;
    const { newState } = simulateDay(rng, state, schedule, players);
    state = newState;
  }

  return {
    currentDay: state.currentDay,
    completed: state.completed,
    standings: state.standings.serialize(),
    playerSeasonStats: Array.from(state.playerSeasonStats.entries()),
    gameLogLength: state.gameLog.length,
  };
}

describe('sim-core determinism snapshot', () => {
  it('produces identical hashes for two runs with the same seed', () => {
    const a = simulateMonthForSeed(42, 30);
    const b = simulateMonthForSeed(42, 30);
    expect(hashState(a)).toBe(hashState(b));
  });

  it('produces different hashes for different seeds', () => {
    const a = simulateMonthForSeed(42, 30);
    const b = simulateMonthForSeed(43, 30);
    expect(hashState(a)).not.toBe(hashState(b));
  });

  it('matches baseline hash for seed=42, 30 days (regression guard)', () => {
    const result = simulateMonthForSeed(42, 30);
    expect(hashState(result)).toMatchSnapshot();
  });
});
