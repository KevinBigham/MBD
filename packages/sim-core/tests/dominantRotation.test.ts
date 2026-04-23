import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import type { PlayerGameStats } from '../src/sim/gameSimulator.js';
import {
  detectDominantRotation,
  type SeasonIdentityMomentDetectionContext,
  type TeamSeasonSummary,
} from '../src/moments/seasonIdentityMoments.js';

function player(seed: number, id: string, teamId: string, position: GeneratedPlayer['position']): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), position, teamId, 'MLB'),
    id,
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
    wins: 96,
    losses: 66,
    madePlayoffs: true,
    isChampion: false,
  };
}

function context(
  players: readonly GeneratedPlayer[],
  seasonStats: readonly PlayerGameStats[],
  overrides: Partial<SeasonIdentityMomentDetectionContext> = {},
): SeasonIdentityMomentDetectionContext {
  const teams = [summary('nym')];
  return {
    season: 12,
    day: 182,
    teams,
    players,
    playerSeasonStats: new Map(seasonStats.map((entry) => [entry.playerId, entry] as const)),
    ...overrides,
  };
}

describe('detectDominantRotation', () => {
  it('emits when five primary starters all clear a 110 ERA+ floor with workload', () => {
    const starters = Array.from({ length: 5 }, (_, index) => player(index + 1, `nym-sp-${index}`, 'nym', 'SP'));
    const leagueDrag = player(20, 'bos-p', 'bos', 'SP');
    const seasonStats = [
      ...starters.map((starter) => stats(starter.id, 'nym', {
        ip: 330,
        earnedRuns: 42,
        strikeouts: 140,
      })),
      stats(leagueDrag.id, 'bos', {
        ip: 2_700,
        earnedRuns: 650,
      }),
    ];

    const result = detectDominantRotation(summary('nym'), context([...starters, leagueDrag], seasonStats));

    expect(result).not.toBeNull();
    expect(result?.teamId).toBe('nym');
    expect(result?.moment.type).toBe('dominant_rotation');
    expect(result?.moment.description).toContain('rotation');
  });

  it('returns null when one of the top five starters misses the innings gate', () => {
    const starters = Array.from({ length: 5 }, (_, index) => player(index + 1, `nym-sp-${index}`, 'nym', 'SP'));
    const leagueDrag = player(20, 'bos-p', 'bos', 'SP');
    const seasonStats = [
      ...starters.map((starter, index) => stats(starter.id, 'nym', {
        ip: index === 4 ? 240 : 330,
        earnedRuns: 30,
      })),
      stats(leagueDrag.id, 'bos', {
        ip: 2_700,
        earnedRuns: 650,
      }),
    ];

    expect(detectDominantRotation(summary('nym'), context([...starters, leagueDrag], seasonStats))).toBeNull();
  });

  it('stays idempotent when the current-season rotation moment already exists', () => {
    const starters = Array.from({ length: 5 }, (_, index) => player(index + 1, `nym-sp-${index}`, 'nym', 'SP'));
    const leagueDrag = player(20, 'bos-p', 'bos', 'SP');
    const seasonStats = [
      ...starters.map((starter) => stats(starter.id, 'nym', {
        ip: 330,
        earnedRuns: 42,
      })),
      stats(leagueDrag.id, 'bos', {
        ip: 2_700,
        earnedRuns: 650,
      }),
    ];

    const result = detectDominantRotation(summary('nym'), context([...starters, leagueDrag], seasonStats, {
      teamMoments: new Map([
        ['nym', [{
          season: 12,
          day: 182,
          timestamp: 'S12D182',
          type: 'dominant_rotation',
          description: 'Already recorded.',
          impact: 48,
          relevance: 0.84,
          isPlayoff: false,
          isEliminationGame: false,
          worldSeriesClincher: false,
          round: null,
        }]],
      ]),
    }));

    expect(result).toBeNull();
  });
});
