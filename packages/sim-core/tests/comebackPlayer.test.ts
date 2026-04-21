import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import { detectComebackPlayer } from '../src/moments/signatureMoments.js';
import type { PlayerGameStats } from '../src/sim/gameSimulator.js';

function makePlayer(
  seed: number,
  overrides: Partial<GeneratedPlayer> = {},
  position: GeneratedPlayer['position'] = 'LF',
): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), position, 'nym', 'MLB'),
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

describe('detectComebackPlayer', () => {
  it('fires for a player who missed 60 games last season and posts a comeback-caliber year', () => {
    const player = makePlayer(1, { priorSeasonGamesMissed: 60 });
    const result = detectComebackPlayer(player, stats({ playerId: player.id }), 8, 1);

    expect(result).not.toBeNull();
    expect(result?.playerId).toBe(player.id);
    expect(result?.moment.type).toBe('comeback_player');
  });

  it('skips players who missed fewer than 50 games the prior season', () => {
    const player = makePlayer(2, { priorSeasonGamesMissed: 30 });
    const result = detectComebackPlayer(player, stats({ playerId: player.id }), 8, 1);

    expect(result).toBeNull();
  });

  it('skips players whose current season is not impactful enough', () => {
    const player = makePlayer(3, { priorSeasonGamesMissed: 60 });
    const result = detectComebackPlayer(
      player,
      stats({
        playerId: player.id,
        hits: 70,
        hr: 5,
        rbi: 25,
        runs: 20,
        bb: 10,
        ab: 400,
        pa: 430,
      }),
      8,
      1,
    );

    expect(result).toBeNull();
  });

  it('skips rookies without a prior-season injury burden', () => {
    const player = makePlayer(4, { priorSeasonGamesMissed: 0, serviceTimeDays: 40 });
    const result = detectComebackPlayer(player, stats({ playerId: player.id }), 8, 1);

    expect(result).toBeNull();
  });
});
