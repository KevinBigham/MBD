import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import type { PlayerGameStats } from '../src/sim/gameSimulator.js';
import {
  detectLineupOfEra,
  type SeasonIdentityMomentDetectionContext,
  type TeamSeasonSummary,
} from '../src/moments/seasonIdentityMoments.js';

function player(seed: number, id: string, teamId: string, position: GeneratedPlayer['position']): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), position, teamId, 'MLB'),
    id,
    firstName: id === 'nym-star' ? 'Mason' : 'Role',
    lastName: id === 'nym-star' ? 'Vale' : `${seed}`,
    teamId,
    position,
  };
}

function stats(playerId: string, teamId: string, overrides: Partial<PlayerGameStats>): PlayerGameStats {
  return {
    playerId,
    teamId,
    gamesPlayed: 0,
    gamesMissedToInjury: 0,
    pa: 0,
    ab: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    bb: 0,
    k: 0,
    runs: 0,
    hbp: 0,
    sacFlies: 0,
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
    ...overrides,
  };
}

function summary(teamId: string): TeamSeasonSummary {
  return {
    teamId,
    wins: 101,
    losses: 61,
    madePlayoffs: true,
    isChampion: false,
  };
}

function context(
  players: readonly GeneratedPlayer[],
  seasonStats: readonly PlayerGameStats[],
  teamIds: readonly string[],
  overrides: Partial<SeasonIdentityMomentDetectionContext> = {},
): SeasonIdentityMomentDetectionContext {
  return {
    season: 12,
    day: 182,
    teams: teamIds.map(summary),
    players,
    playerSeasonStats: new Map(seasonStats.map((entry) => [entry.playerId, entry] as const)),
    ...overrides,
  };
}

function strongLine(playerId: string, teamId: string): PlayerGameStats {
  return stats(playerId, teamId, {
    pa: 650,
    ab: 560,
    hits: 190,
    doubles: 42,
    triples: 4,
    hr: 42,
    bb: 82,
    hbp: 5,
    sacFlies: 3,
    runs: 120,
  });
}

function leadingLine(playerId: string, teamId: string): PlayerGameStats {
  return stats(playerId, teamId, {
    pa: 650,
    ab: 555,
    hits: 210,
    doubles: 46,
    triples: 5,
    hr: 52,
    bb: 88,
    hbp: 5,
    sacFlies: 2,
    runs: 132,
  });
}

function weakLine(playerId: string, teamId: string): PlayerGameStats {
  return stats(playerId, teamId, {
    pa: 620,
    ab: 570,
    hits: 112,
    doubles: 18,
    triples: 1,
    hr: 8,
    bb: 42,
    hbp: 4,
    sacFlies: 4,
    runs: 48,
  });
}

describe('detectLineupOfEra', () => {
  it('emits for a top-five lineup with team wRC+ of at least 115', () => {
    const nymHitters = [
      player(1, 'nym-star', 'nym', 'SS'),
      ...Array.from({ length: 8 }, (_, index) => player(index + 2, `nym-h-${index}`, 'nym', 'CF')),
    ];
    const bosHitters = Array.from({ length: 9 }, (_, index) => player(index + 20, `bos-h-${index}`, 'bos', 'LF'));
    const seasonStats = [
      leadingLine('nym-star', 'nym'),
      ...nymHitters.slice(1).map((hitter) => strongLine(hitter.id, 'nym')),
      ...bosHitters.map((hitter) => weakLine(hitter.id, 'bos')),
    ];

    const result = detectLineupOfEra(
      summary('nym'),
      context([...nymHitters, ...bosHitters], seasonStats, ['nym', 'bos']),
    );

    expect(result).not.toBeNull();
    expect(result?.teamId).toBe('nym');
    expect(result?.moment.type).toBe('lineup_of_era');
    expect(result?.moment.description).toContain('lineup');
    expect(result?.moment.description).toContain('Mason Vale');
  });

  it('returns null when the team offense does not clear the wRC+ threshold', () => {
    const nymHitters = Array.from({ length: 9 }, (_, index) => player(index + 2, `nym-h-${index}`, 'nym', 'CF'));
    const bosHitters = Array.from({ length: 9 }, (_, index) => player(index + 20, `bos-h-${index}`, 'bos', 'LF'));
    const seasonStats = [
      ...nymHitters.map((hitter) => weakLine(hitter.id, 'nym')),
      ...bosHitters.map((hitter) => strongLine(hitter.id, 'bos')),
    ];

    expect(detectLineupOfEra(
      summary('nym'),
      context([...nymHitters, ...bosHitters], seasonStats, ['nym', 'bos']),
    )).toBeNull();
  });

  it('stays idempotent when the current-season lineup moment already exists', () => {
    const nymHitters = [
      player(1, 'nym-star', 'nym', 'SS'),
      ...Array.from({ length: 8 }, (_, index) => player(index + 2, `nym-h-${index}`, 'nym', 'CF')),
    ];
    const bosHitters = Array.from({ length: 9 }, (_, index) => player(index + 20, `bos-h-${index}`, 'bos', 'LF'));
    const seasonStats = [
      leadingLine('nym-star', 'nym'),
      ...nymHitters.slice(1).map((hitter) => strongLine(hitter.id, 'nym')),
      ...bosHitters.map((hitter) => weakLine(hitter.id, 'bos')),
    ];

    const result = detectLineupOfEra(
      summary('nym'),
      context([...nymHitters, ...bosHitters], seasonStats, ['nym', 'bos'], {
        teamMoments: new Map([
          ['nym', [{
            season: 12,
            day: 182,
            timestamp: 'S12D182',
            type: 'lineup_of_era',
            description: 'Already recorded.',
            impact: 50,
            relevance: 0.86,
            isPlayoff: false,
            isEliminationGame: false,
            worldSeriesClincher: false,
            round: null,
          }]],
        ]),
      }),
    );

    expect(result).toBeNull();
  });
});
