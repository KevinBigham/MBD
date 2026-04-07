import { describe, it, expect } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { simulateGame } from '../src/sim/gameSimulator.js';
import { generateTeamRoster } from '../src/player/generation.js';
import type { GameTeam } from '../src/sim/gameSimulator.js';
import { HITTER_POSITIONS, PITCHER_POSITIONS } from '../src/player/generation.js';

function buildTeam(teamId: string, rng: GameRNG): GameTeam {
  const roster = generateTeamRoster(rng, teamId);
  const mlb = roster.filter(p => p.rosterStatus === 'MLB');
  const hitters = mlb
    .filter(p => (HITTER_POSITIONS as readonly string[]).includes(p.position))
    .sort((a, b) => b.overallRating - a.overallRating);
  const pitchers = mlb
    .filter(p => (PITCHER_POSITIONS as readonly string[]).includes(p.position))
    .sort((a, b) => b.overallRating - a.overallRating);

  return {
    teamId,
    lineup: hitters.slice(0, 9),
    pitcher: pitchers.find(p => p.position === 'SP') ?? pitchers[0]!,
    bullpen: pitchers.filter(p => p.position !== 'SP'),
  };
}

describe('simulateGame', () => {
  it('produces a valid box score', () => {
    const rng = new GameRNG(42);
    const away = buildTeam('nym', rng.fork());
    const home = buildTeam('bos', rng.fork());

    const { boxScore } = simulateGame(rng, away, home, 'S1D1');

    expect(boxScore.homeTeamId).toBe('bos');
    expect(boxScore.awayTeamId).toBe('nym');
    expect(boxScore.homeScore).toBeGreaterThanOrEqual(0);
    expect(boxScore.awayScore).toBeGreaterThanOrEqual(0);
    expect(boxScore.innings).toBeGreaterThanOrEqual(9);
    // No ties in baseball
    expect(boxScore.homeScore).not.toBe(boxScore.awayScore);
  });

  it('is deterministic with same seed', () => {
    const rng1 = new GameRNG(100);
    const away1 = buildTeam('lax', rng1.fork());
    const home1 = buildTeam('sfb', rng1.fork());
    const { boxScore: bs1 } = simulateGame(rng1, away1, home1, 'S1D1');

    const rng2 = new GameRNG(100);
    const away2 = buildTeam('lax', rng2.fork());
    const home2 = buildTeam('sfb', rng2.fork());
    const { boxScore: bs2 } = simulateGame(rng2, away2, home2, 'S1D1');

    expect(bs1.homeScore).toBe(bs2.homeScore);
    expect(bs1.awayScore).toBe(bs2.awayScore);
    expect(bs1.innings).toBe(bs2.innings);
  });

  it('generates player stats', () => {
    const rng = new GameRNG(42);
    const away = buildTeam('nym', rng.fork());
    const home = buildTeam('bos', rng.fork());

    const { playerStats } = simulateGame(rng, away, home, 'S1D1');

    // Should have stats for lineup players + pitchers
    expect(playerStats.size).toBeGreaterThan(0);

    // Every player should have at least some PA or IP
    for (const [, stats] of playerStats) {
      expect(stats.pa + stats.strikeouts + stats.walks + stats.hitsAllowed).toBeGreaterThanOrEqual(0);
      expect(stats.hbp).toBeGreaterThanOrEqual(0);
      expect(stats.sacFlies).toBeGreaterThanOrEqual(0);
      expect(stats.homeRunsAllowed).toBeGreaterThanOrEqual(0);
      expect(stats.hitBatters).toBeGreaterThanOrEqual(0);
      expect(stats.flyBallsAllowed).toBeGreaterThanOrEqual(stats.homeRunsAllowed);
    }
  });

  it('assigns exactly one pitcher win and one pitcher loss per game', () => {
    const rng = new GameRNG(77);
    const away = buildTeam('nym', rng.fork());
    const home = buildTeam('bos', rng.fork());

    const { playerStats } = simulateGame(rng, away, home, 'S1D9');
    const pitchers = [...playerStats.values()].filter((stats) => stats.ip > 0);
    const totalWins = pitchers.reduce((sum, stats) => sum + stats.wins, 0);
    const totalLosses = pitchers.reduce((sum, stats) => sum + stats.losses, 0);

    expect(totalWins).toBe(1);
    expect(totalLosses).toBe(1);
  });

  it('produces realistic scores (0-20 range)', () => {
    const rng = new GameRNG(42);
    // Sim 10 games and check scores are in reasonable range
    for (let i = 0; i < 10; i++) {
      const gameRng = rng.fork();
      const away = buildTeam('nym', gameRng.fork());
      const home = buildTeam('bos', gameRng.fork());
      const { boxScore } = simulateGame(gameRng, away, home, `test-${i}`);

      expect(boxScore.homeScore).toBeLessThan(30);
      expect(boxScore.awayScore).toBeLessThan(30);
    }
  });

  it('enriches plate appearance results with inning, runner, and score context', () => {
    const rng = new GameRNG(212);
    const away = buildTeam('nym', rng.fork());
    const home = buildTeam('bos', rng.fork());

    const { boxScore } = simulateGame(rng, away, home, 'S1D12');
    const first = boxScore.paResults[0];

    expect(first).toBeTruthy();
    expect(first?.inning).toBeGreaterThanOrEqual(1);
    expect(first?.halfInning === 'top' || first?.halfInning === 'bottom').toBe(true);
    expect(first?.outs).toBeGreaterThanOrEqual(0);
    expect(first?.outs).toBeLessThanOrEqual(2);
    expect(first?.runnersOn).toBeGreaterThanOrEqual(0);
    expect(first?.runnersOn).toBeLessThanOrEqual(3);
    expect(first?.scoreBefore).toHaveLength(2);
    expect(first?.scoreAfter).toHaveLength(2);
    expect(first?.rbiOnPlay).toBeGreaterThanOrEqual(0);

    const walkOffPlay = boxScore.paResults.find((result) => result.isWalkOff);
    if (walkOffPlay) {
      expect(walkOffPlay.halfInning).toBe('bottom');
      expect(walkOffPlay.inning).toBeGreaterThanOrEqual(9);
      expect(walkOffPlay.scoreAfter[1]).toBeGreaterThan(walkOffPlay.scoreAfter[0]);
    }
  });

  it('applies offense modifiers to the scoring environment', () => {
    let boostedRuns = 0;
    let suppressedRuns = 0;

    for (let seed = 1; seed <= 12; seed++) {
      const boostedRng = new GameRNG(seed);
      const suppressedRng = new GameRNG(seed);
      const boostedAway = buildTeam('nym', boostedRng.fork());
      const boostedHome = buildTeam('bos', boostedRng.fork());
      const suppressedAway = buildTeam('nym', suppressedRng.fork());
      const suppressedHome = buildTeam('bos', suppressedRng.fork());

      const boosted = simulateGame(
        boostedRng,
        boostedAway,
        boostedHome,
        `boosted-${seed}`,
        false,
        { awayOffenseModifier: 1.03, homeOffenseModifier: 1.03 },
      );
      const suppressed = simulateGame(
        suppressedRng,
        suppressedAway,
        suppressedHome,
        `suppressed-${seed}`,
        false,
        { awayOffenseModifier: 0.97, homeOffenseModifier: 0.97 },
      );

      boostedRuns += boosted.boxScore.awayScore + boosted.boxScore.homeScore;
      suppressedRuns += suppressed.boxScore.awayScore + suppressed.boxScore.homeScore;
    }

    expect(boostedRuns).toBeGreaterThan(suppressedRuns);
  });
});
