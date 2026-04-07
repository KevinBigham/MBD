import { describe, it, expect } from 'vitest';
import {
  GameRNG,
  generatePlayer,
  generateTeamRoster,
  developPlayer,
  developAllPlayers,
  updateDevPhase,
  shouldRetire,
  growMentalToughness,
} from '../src/index.js';
import type { DevProgram, GeneratedPlayer } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeYoungHitter(seed: number): GeneratedPlayer {
  const rng = new GameRNG(seed);
  const player = generatePlayer(rng, 'SS', 'NYT', 'MLB');
  return { ...player, age: 22, developmentPhase: 'Prospect' as const };
}

function makeOldHitter(seed: number): GeneratedPlayer {
  const rng = new GameRNG(seed);
  const player = generatePlayer(rng, '1B', 'NYT', 'MLB');
  return { ...player, age: 38, developmentPhase: 'Retirement' as const };
}

function makePrimeHitter(seed: number): GeneratedPlayer {
  const rng = new GameRNG(seed);
  const player = generatePlayer(rng, 'CF', 'NYT', 'MLB');
  return { ...player, age: 28, developmentPhase: 'Prime' as const };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('updateDevPhase', () => {
  it('returns Prospect for age <= 22', () => {
    expect(updateDevPhase(18)).toBe('Prospect');
    expect(updateDevPhase(22)).toBe('Prospect');
  });

  it('returns Ascent for age 23-26', () => {
    expect(updateDevPhase(23)).toBe('Ascent');
    expect(updateDevPhase(26)).toBe('Ascent');
  });

  it('returns Prime for age 27-31', () => {
    expect(updateDevPhase(27)).toBe('Prime');
    expect(updateDevPhase(31)).toBe('Prime');
  });

  it('returns Decline for age 32-37', () => {
    expect(updateDevPhase(32)).toBe('Decline');
    expect(updateDevPhase(37)).toBe('Decline');
  });

  it('returns Retirement for age 38+', () => {
    expect(updateDevPhase(38)).toBe('Retirement');
    expect(updateDevPhase(42)).toBe('Retirement');
  });
});

describe('developPlayer', () => {
  it('increases age by one', () => {
    const player = makeYoungHitter(100);
    const rng = new GameRNG(200);
    const developed = developPlayer(rng, player);
    expect(developed.age).toBe(player.age + 1);
  });

  it('young players (Prospect/Ascent) tend to improve on average', () => {
    // Run several iterations and check aggregate trend
    const improvements: number[] = [];
    for (let seed = 1; seed <= 30; seed++) {
      const player = makeYoungHitter(seed);
      const rng = new GameRNG(seed + 1000);
      const developed = developPlayer(rng, player);
      improvements.push(developed.overallRating - player.overallRating);
    }
    const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
    expect(avgImprovement).toBeGreaterThan(0);
  });

  it('old players (Retirement phase) tend to decline on average', () => {
    const declines: number[] = [];
    for (let seed = 1; seed <= 30; seed++) {
      const player = makeOldHitter(seed);
      const rng = new GameRNG(seed + 2000);
      const developed = developPlayer(rng, player);
      declines.push(developed.overallRating - player.overallRating);
    }
    const avgChange = declines.reduce((a, b) => a + b, 0) / declines.length;
    expect(avgChange).toBeLessThan(0);
  });

  it('respects dev programs (targeted attribute grows more)', () => {
    const boosts: number[] = [];
    const noBoosts: number[] = [];
    for (let seed = 1; seed <= 30; seed++) {
      const player = makePrimeHitter(seed);
      const program: DevProgram = { targetAttribute: 'power', intensity: 2.0, seasonsRemaining: 1 };
      const rng1 = new GameRNG(seed + 3000);
      const rng2 = new GameRNG(seed + 3000);
      const withProgram = developPlayer(rng1, player, program);
      const without = developPlayer(rng2, player);
      boosts.push(withProgram.hitterAttributes.power);
      noBoosts.push(without.hitterAttributes.power);
    }
    const avgBoost = boosts.reduce((a, b) => a + b, 0) / boosts.length;
    const avgNoBoost = noBoosts.reduce((a, b) => a + b, 0) / noBoosts.length;
    expect(avgBoost).toBeGreaterThan(avgNoBoost);
  });

  it('uses work ethic multiplier (high WE = more growth)', () => {
    const highWE: number[] = [];
    const lowWE: number[] = [];
    for (let seed = 1; seed <= 30; seed++) {
      const basePlayer = makeYoungHitter(seed);
      const playerHighWE = {
        ...basePlayer,
        personality: { ...basePlayer.personality, workEthic: 95 },
      };
      const playerLowWE = {
        ...basePlayer,
        personality: { ...basePlayer.personality, workEthic: 20 },
      };
      const rng1 = new GameRNG(seed + 4000);
      const rng2 = new GameRNG(seed + 4000);
      highWE.push(developPlayer(rng1, playerHighWE).overallRating - basePlayer.overallRating);
      lowWE.push(developPlayer(rng2, playerLowWE).overallRating - basePlayer.overallRating);
    }
    const avgHigh = highWE.reduce((a, b) => a + b, 0) / highWE.length;
    const avgLow = lowWE.reduce((a, b) => a + b, 0) / lowWE.length;
    expect(avgHigh).toBeGreaterThan(avgLow);
  });

  it('does not mutate the original player', () => {
    const player = makeYoungHitter(55);
    const originalAge = player.age;
    const rng = new GameRNG(55);
    developPlayer(rng, player);
    expect(player.age).toBe(originalAge);
  });
});

describe('developAllPlayers', () => {
  it('processes all players and returns developed roster', () => {
    const rng1 = new GameRNG(42);
    const roster = generateTeamRoster(rng1, 'NYT');
    const initialCount = roster.length;
    const rng2 = new GameRNG(99);
    const developed = developAllPlayers(rng2, roster);
    // Some may retire, so count should be <= initial but still substantial
    expect(developed.length).toBeGreaterThan(0);
    expect(developed.length).toBeLessThanOrEqual(initialCount);
    // All developed players should have age incremented
    for (const p of developed) {
      const original = roster.find((r) => r.id === p.id);
      if (original) {
        expect(p.age).toBe(original.age + 1);
      }
    }
  });
});

describe('shouldRetire', () => {
  it('never retires healthy players under 32 (unless very low rating)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const player = makeYoungHitter(seed);
      // Ensure decent rating so catastrophic clause does not apply
      const goodPlayer = { ...player, overallRating: 300 };
      const rng = new GameRNG(seed + 5000);
      expect(shouldRetire(rng, goodPlayer)).toBe(false);
    }
  });

  it('has high chance for 40+ year old players', () => {
    let retiredCount = 0;
    const trials = 100;
    for (let seed = 1; seed <= trials; seed++) {
      const player = makeOldHitter(seed);
      // Force old age and low ratings so retirement logic triggers strongly
      const ancient: GeneratedPlayer = {
        ...player,
        age: 42,
        overallRating: 80,
        hitterAttributes: { ...player.hitterAttributes, durability: 50 },
      };
      const rng = new GameRNG(seed + 6000);
      if (shouldRetire(rng, ancient)) retiredCount++;
    }
    // With age 42 + low rating + low durability, retirement rate should be very high
    // Chance = base 0.20 + (42-38)*0.15 = 0.80, + low rating 0.30 = capped at 0.95, + fragility 0.10 => 0.95
    expect(retiredCount).toBeGreaterThan(60);
  });
});

describe('growMentalToughness', () => {
  it('increases mental toughness with age', () => {
    const growths: number[] = [];
    for (let seed = 1; seed <= 20; seed++) {
      const rng = new GameRNG(seed + 7000);
      const result = growMentalToughness(rng, 50, 30);
      growths.push(result - 50);
    }
    const avgGrowth = growths.reduce((a, b) => a + b, 0) / growths.length;
    expect(avgGrowth).toBeGreaterThan(0);
  });

  it('never exceeds ceiling of 100', () => {
    const rng = new GameRNG(123);
    const result = growMentalToughness(rng, 99, 35);
    expect(result).toBeLessThanOrEqual(100);
  });
});

describe('development determinism', () => {
  it('same seed produces identical development results', () => {
    const player = makeYoungHitter(42);
    const rng1 = new GameRNG(999);
    const rng2 = new GameRNG(999);
    const result1 = developPlayer(rng1, player);
    const result2 = developPlayer(rng2, player);
    expect(result1.overallRating).toBe(result2.overallRating);
    expect(result1.hitterAttributes.contact).toBe(result2.hitterAttributes.contact);
    expect(result1.age).toBe(result2.age);
  });
});
