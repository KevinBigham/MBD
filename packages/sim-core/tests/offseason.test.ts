import { describe, it, expect } from 'vitest';
import {
  GameRNG,
  generateTeamRoster,
  createOffseasonState,
  advanceOffseasonDay,
  skipCurrentPhase,
  OFFSEASON_PHASES,
  determineRetirements,
  autoResolveTenderNonTender,
  summarizeOffseason,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createOffseasonState', () => {
  it('starts at season_review phase', () => {
    const state = createOffseasonState(1);
    expect(state.season).toBe(1);
    expect(state.currentPhase).toBe('season_review');
    expect(state.phaseDay).toBe(1);
    expect(state.totalDay).toBe(1);
    expect(state.completed).toBe(false);
  });
});

describe('advanceOffseasonDay', () => {
  it('includes qualifying offers, rule 5, and international signing in the offseason flow', () => {
    expect(OFFSEASON_PHASES).toEqual([
      'season_review',
      'arbitration',
      'tender_nontender',
      'qualifying_offers',
      'free_agency',
      'draft',
      'protection_audit',
      'rule5_draft',
      'international_signing',
      'spring_training',
    ]);
  });

  it('progresses through phases', () => {
    let state = createOffseasonState(1);
    const seenPhases = new Set<string>();
    seenPhases.add(state.currentPhase);

    // Advance many days to traverse all phases
    for (let i = 0; i < 100; i++) {
      state = advanceOffseasonDay(state);
      seenPhases.add(state.currentPhase);
      if (state.completed) break;
    }

    // Should have seen all phases
    for (const phase of OFFSEASON_PHASES) {
      expect(seenPhases.has(phase)).toBe(true);
    }
  });

  it('does not advance past completion', () => {
    let state = createOffseasonState(1);
    for (let i = 0; i < 200; i++) {
      state = advanceOffseasonDay(state);
    }
    expect(state.completed).toBe(true);
    const prevDay = state.totalDay;
    state = advanceOffseasonDay(state);
    expect(state.totalDay).toBe(prevDay);
  });
});

describe('skipCurrentPhase', () => {
  it('jumps to next phase', () => {
    const state = createOffseasonState(1);
    expect(state.currentPhase).toBe('season_review');
    const skipped = skipCurrentPhase(state);
    expect(skipped.currentPhase).toBe('arbitration');
    expect(skipped.phaseDay).toBe(1);
  });

  it('all phases eventually complete via skipping', () => {
    let state = createOffseasonState(1);
    let iterations = 0;
    while (!state.completed && iterations < 20) {
      state = skipCurrentPhase(state);
      iterations++;
    }
    expect(state.completed).toBe(true);
  });
});

describe('determineRetirements', () => {
  it('retires some old players', () => {
    const rng1 = new GameRNG(42);
    const roster = generateTeamRoster(rng1, 'NYY');
    // Make some players old
    const oldRoster = roster.map((p) =>
      p.age >= 30 ? { ...p, age: 40, overallRating: 80 } : p,
    );
    const rng2 = new GameRNG(99);
    const retired = determineRetirements(rng2, oldRoster);
    expect(retired.length).toBeGreaterThan(0);
    // All retired IDs should belong to old players
    for (const id of retired) {
      const player = oldRoster.find((p) => p.id === id);
      expect(player).toBeTruthy();
      expect(player!.age).toBeGreaterThanOrEqual(32);
    }
  });
});

describe('autoResolveTenderNonTender', () => {
  it('produces valid decisions', () => {
    const rng1 = new GameRNG(42);
    const roster = generateTeamRoster(rng1, 'NYY');
    const mlbPlayers = roster.filter((p) => p.teamId === 'NYY' && p.rosterStatus === 'MLB');

    // Assign service times: some arb-eligible
    const serviceTime = new Map<string, number>();
    mlbPlayers.forEach((p, i) => {
      serviceTime.set(p.id, (i % 7) + 1); // 1-7 years
    });

    const rng2 = new GameRNG(99);
    const result = autoResolveTenderNonTender(rng2, 'NYY', roster, serviceTime);

    expect(Array.isArray(result.tendered)).toBe(true);
    expect(Array.isArray(result.nonTendered)).toBe(true);
    // Every MLB player should be in one list or the other
    for (const p of mlbPlayers) {
      const inTendered = result.tendered.includes(p.id);
      const inNonTendered = result.nonTendered.includes(p.id);
      expect(inTendered || inNonTendered).toBe(true);
    }
  });

  it('is deterministic for the same roster and service-time map', () => {
    const roster = generateTeamRoster(new GameRNG(77), 'NYY');
    const mlbPlayers = roster.filter((player) => player.teamId === 'NYY' && player.rosterStatus === 'MLB');
    const serviceTime = new Map<string, number>();

    mlbPlayers.forEach((player, index) => {
      serviceTime.set(player.id, index % 2 === 0 ? 4 : 2);
      if (index === 0) {
        player.overallRating = 120;
        player.contract.annualSalary = 18;
      }
    });

    const first = autoResolveTenderNonTender(new GameRNG(901), 'NYY', roster, serviceTime);
    const second = autoResolveTenderNonTender(new GameRNG(901), 'NYY', roster, serviceTime);

    expect(second).toEqual(first);
    expect(first.nonTendered.length).toBeGreaterThan(0);
  });
});

describe('summarizeOffseason', () => {
  it('produces non-null summary', () => {
    const state = createOffseasonState(1);
    const summary = summarizeOffseason(state);
    expect(summary).toBeTruthy();
    expect(summary.season).toBe(1);
    expect(typeof summary.totalArbitrations).toBe('number');
    expect(typeof summary.totalNonTendered).toBe('number');
    expect(typeof summary.totalSignings).toBe('number');
    expect(typeof summary.totalDraftPicks).toBe('number');
    expect(typeof summary.totalRetirements).toBe('number');
  });
});
