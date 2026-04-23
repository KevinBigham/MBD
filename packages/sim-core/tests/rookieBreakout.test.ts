import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { detectRookieBreakout } from '../src/moments/signatureMoments.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import type { PlayerGameStats } from '../src/sim/gameSimulator.js';

function makePlayer(
  seed: number,
  overrides: Partial<GeneratedPlayer> = {},
  position: GeneratedPlayer['position'] = 'CF',
): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), position, 'nym', 'MLB'),
    age: 22,
    serviceTimeDays: 90,
    ...overrides,
  };
}

function stats(overrides: Partial<PlayerGameStats> = {}): PlayerGameStats {
  return {
    playerId: 'p1',
    teamId: 'nym',
    gamesPlayed: 132,
    pa: 568,
    ab: 506,
    hits: 164,
    doubles: 29,
    triples: 4,
    hr: 24,
    rbi: 86,
    bb: 57,
    k: 118,
    runs: 94,
    hbp: 4,
    sacFlies: 5,
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

describe('detectRookieBreakout', () => {
  it('fires for a rookie-eligible player who clears the season-end WAR threshold', () => {
    const player = makePlayer(5);
    const result = detectRookieBreakout(player, stats({ playerId: player.id }), 8, 181);

    expect(result).not.toBeNull();
    expect(result?.playerId).toBe(player.id);
    expect(result?.moment.type).toBe('rookie_breakout');
  });

  it('skips players who were not rookie-eligible at the start of the season', () => {
    const player = makePlayer(6, { serviceTimeDays: 172 });
    const result = detectRookieBreakout(player, stats({ playerId: player.id }), 8, 181);

    expect(result).toBeNull();
  });
});
