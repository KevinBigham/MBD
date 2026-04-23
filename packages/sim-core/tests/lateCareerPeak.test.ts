import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { detectLateCareerPeak } from '../src/moments/signatureMoments.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import type { PlayerGameStats } from '../src/sim/gameSimulator.js';

function makePlayer(
  seed: number,
  overrides: Partial<GeneratedPlayer> = {},
  position: GeneratedPlayer['position'] = 'DH',
): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), position, 'nym', 'MLB'),
    serviceTimeDays: 10 * 172,
    age: 37,
    ...overrides,
  };
}

function stats(overrides: Partial<PlayerGameStats> = {}): PlayerGameStats {
  return {
    playerId: 'p1',
    teamId: 'nym',
    gamesPlayed: 126,
    pa: 552,
    ab: 489,
    hits: 168,
    doubles: 33,
    triples: 1,
    hr: 27,
    rbi: 102,
    bb: 68,
    k: 103,
    runs: 88,
    hbp: 2,
    sacFlies: 4,
    ip: 0,
    earnedRuns: 0,
    strikeouts: 0,
    walks: 0,
    hitsAllowed: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    flyBallsAllowed: 0,
    wins: 0,
    saves: 0,
    losses: 0,
    gamesMissedToInjury: 0,
    ...overrides,
  };
}

describe('detectLateCareerPeak', () => {
  it('fires for an age-36+ player with 40+ prior career WAR who still posts a 3+ WAR season', () => {
    const player = makePlayer(3);
    const result = detectLateCareerPeak(player, stats({ playerId: player.id }), 44.8, 8, 181);

    expect(result).not.toBeNull();
    expect(result?.playerId).toBe(player.id);
    expect(result?.moment.type).toBe('late_career_peak');
    expect(result?.moment.description).toContain(String(player.age));
  });

  it('skips players who have not yet cleared the late-career résumé floor', () => {
    const player = makePlayer(4);
    const result = detectLateCareerPeak(player, stats({ playerId: player.id }), 39.9, 8, 181);

    expect(result).toBeNull();
  });
});
