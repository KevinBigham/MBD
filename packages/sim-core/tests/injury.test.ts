import { describe, it, expect } from 'vitest';
import {
  GameRNG,
  generatePlayer,
  generateTeamRoster,
  checkInjury,
  advanceInjury,
  getInjuryMultiplier,
  generateInjury,
  describeInjury,
  processInjuries,
} from '../src/index.js';
import type { Injury, GeneratedPlayer } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDurableHitter(seed: number): GeneratedPlayer {
  const rng = new GameRNG(seed);
  const player = generatePlayer(rng, 'CF', 'NYT', 'MLB');
  return {
    ...player,
    age: 25,
    hitterAttributes: { ...player.hitterAttributes, durability: 450 },
  };
}

function makeFragileHitter(seed: number): GeneratedPlayer {
  const rng = new GameRNG(seed);
  const player = generatePlayer(rng, 'SS', 'BOS', 'MLB');
  return {
    ...player,
    age: 25,
    hitterAttributes: { ...player.hitterAttributes, durability: 50 },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkInjury', () => {
  it('returns null most of the time (low base rate)', () => {
    const player = makeDurableHitter(42);
    let injuryCount = 0;
    for (let seed = 1; seed <= 500; seed++) {
      const rng = new GameRNG(seed);
      if (checkInjury(rng, player) !== null) injuryCount++;
    }
    // Base rate ~0.3% * 0.5 (high durability) = ~0.15%, out of 500 checks: ~0-3
    expect(injuryCount).toBeLessThan(20);
  });

  it('injury rate increases for low durability players', () => {
    const durablePlayer = makeDurableHitter(42);
    const fragilePlayer = makeFragileHitter(42);
    let durableInjuries = 0;
    let fragileInjuries = 0;
    // Use a large sample to overcome the low base rate
    for (let seed = 1; seed <= 10000; seed++) {
      const rng1 = new GameRNG(seed);
      const rng2 = new GameRNG(seed);
      if (checkInjury(rng1, durablePlayer) !== null) durableInjuries++;
      if (checkInjury(rng2, fragilePlayer) !== null) fragileInjuries++;
    }
    // Fragile player (durability 50 => very low => 3x multiplier) should get hurt more
    expect(fragileInjuries).toBeGreaterThan(durableInjuries);
  });
});

describe('generateInjury', () => {
  it('returns valid injury for day_to_day severity', () => {
    const rng = new GameRNG(42);
    const injury = generateInjury(rng, 'SS', 'day_to_day');
    expect(injury.severity).toBe('day_to_day');
    expect(injury.daysRemaining).toBeGreaterThanOrEqual(1);
    expect(injury.daysRemaining).toBeLessThanOrEqual(3);
    expect(injury.type).toBeTruthy();
  });

  it('returns valid injury for il_60 severity', () => {
    const rng = new GameRNG(99);
    const injury = generateInjury(rng, 'SP', 'il_60');
    expect(injury.severity).toBe('il_60');
    expect(injury.daysRemaining).toBeGreaterThanOrEqual(60);
    expect(injury.daysRemaining).toBeLessThanOrEqual(90);
  });

  it('returns valid injury for season_ending severity', () => {
    const rng = new GameRNG(77);
    const injury = generateInjury(rng, '1B', 'season_ending');
    expect(injury.severity).toBe('season_ending');
    expect(injury.daysRemaining).toBe(200);
  });
});

describe('advanceInjury', () => {
  it('decrements daysRemaining', () => {
    const injury: Injury = {
      type: 'hamstring_strain',
      severity: 'il_10',
      daysRemaining: 10,
      totalDays: 10,
      attributePenalty: 0.07,
      reinjuryRisk: 0.1,
    };
    const advanced = advanceInjury(injury);
    expect(advanced).not.toBeNull();
    expect(advanced!.daysRemaining).toBe(9);
  });

  it('returns null when fully recovered (no lingering effects)', () => {
    const injury: Injury = {
      type: 'hamstring_strain',
      severity: 'day_to_day',
      daysRemaining: 1,
      totalDays: 1,
      attributePenalty: 0,
      reinjuryRisk: 0,
    };
    const result = advanceInjury(injury);
    expect(result).toBeNull();
  });
});

describe('getInjuryMultiplier', () => {
  it('returns 1.0 for no injury', () => {
    expect(getInjuryMultiplier(undefined)).toBe(1.0);
  });

  it('returns 0 for active injury (on IL)', () => {
    const injury: Injury = {
      type: 'knee_sprain',
      severity: 'il_15',
      daysRemaining: 5,
      totalDays: 15,
      attributePenalty: 0.1,
      reinjuryRisk: 0.1,
    };
    expect(getInjuryMultiplier(injury)).toBe(0);
  });

  it('returns < 1.0 for recovering player (returned but penalty remains)', () => {
    const injury: Injury = {
      type: 'knee_sprain',
      severity: 'il_15',
      daysRemaining: 0,
      totalDays: 15,
      attributePenalty: 0.1,
      reinjuryRisk: 0.05,
    };
    const mult = getInjuryMultiplier(injury);
    expect(mult).toBeLessThan(1.0);
    expect(mult).toBeGreaterThan(0);
  });
});

describe('describeInjury', () => {
  it('returns non-empty string with injury name', () => {
    const injury: Injury = {
      type: 'hamstring_strain',
      severity: 'il_10',
      daysRemaining: 8,
      totalDays: 10,
      attributePenalty: 0.07,
      reinjuryRisk: 0.1,
    };
    const desc = describeInjury(injury);
    expect(desc.length).toBeGreaterThan(0);
    expect(desc).toContain('Hamstring Strain');
  });
});

describe('processInjuries', () => {
  it('returns a map of injuries for a roster', () => {
    const rng1 = new GameRNG(42);
    const roster = generateTeamRoster(rng1, 'NYT');
    const mlbPlayers = roster.filter((p) => p.rosterStatus === 'MLB');
    const rng2 = new GameRNG(99);
    const injuries = processInjuries(rng2, mlbPlayers);
    expect(injuries).toBeInstanceOf(Map);
    // Some or no players may be injured; just verify the type
    for (const [id, injury] of injuries) {
      expect(typeof id).toBe('string');
      expect(injury.type).toBeTruthy();
      expect(injury.daysRemaining).toBeGreaterThan(0);
    }
  });
});

describe('injury determinism', () => {
  it('same seed produces same injury results', () => {
    const player = makeDurableHitter(42);
    const rng1 = new GameRNG(777);
    const rng2 = new GameRNG(777);
    const result1 = checkInjury(rng1, player);
    const result2 = checkInjury(rng2, player);
    if (result1 === null) {
      expect(result2).toBeNull();
    } else {
      expect(result2).not.toBeNull();
      expect(result1.type).toBe(result2!.type);
      expect(result1.severity).toBe(result2!.severity);
      expect(result1.daysRemaining).toBe(result2!.daysRemaining);
    }
  });
});
