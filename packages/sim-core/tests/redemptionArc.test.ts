import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { detectRedemptionArc } from '../src/moments/signatureMoments.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import type { PlayerGameStats } from '../src/sim/gameSimulator.js';

function makePlayer(
  seed: number,
  overrides: Partial<GeneratedPlayer> = {},
  position: GeneratedPlayer['position'] = 'LF',
): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), position, 'nym', 'MLB'),
    serviceTimeDays: 2 * 172,
    ...overrides,
  };
}

function stats(overrides: Partial<PlayerGameStats> = {}): PlayerGameStats {
  return {
    playerId: 'p1',
    teamId: 'nym',
    gamesPlayed: 120,
    pa: 540,
    ab: 480,
    hits: 170,
    doubles: 30,
    triples: 2,
    hr: 29,
    rbi: 104,
    bb: 62,
    k: 110,
    runs: 92,
    hbp: 3,
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

describe('detectRedemptionArc', () => {
  it('fires for a veteran who rebounds from a sub-1 WAR prior season into a 3+ WAR year', () => {
    const player = makePlayer(1, { priorSeasonEstimatedWar: 0.4 });
    const result = detectRedemptionArc(player, stats({ playerId: player.id }), 8, 181);

    expect(result).not.toBeNull();
    expect(result?.playerId).toBe(player.id);
    expect(result?.moment.type).toBe('redemption_arc');
    expect(result?.moment.description).toContain(player.firstName);
  });

  it('skips players without a qualifying prior MLB season to redeem', () => {
    const player = makePlayer(2, { priorSeasonEstimatedWar: null });
    const result = detectRedemptionArc(player, stats({ playerId: player.id }), 8, 181);

    expect(result).toBeNull();
  });
});
