import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import type { PlayerGameStats } from '../src/sim/gameSimulator.js';
import {
  detectBullpenCollapse,
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
    wins: 79,
    losses: 83,
    madePlayoffs: false,
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

describe('detectBullpenCollapse', () => {
  it('emits when relievers throw at least 400 innings with an ERA+ of 80 or worse', () => {
    const relievers = [
      player(1, 'nym-rp-1', 'nym', 'RP'),
      player(2, 'nym-rp-2', 'nym', 'RP'),
      player(3, 'nym-cl', 'nym', 'CL'),
    ];
    const leagueAnchor = player(4, 'bos-sp', 'bos', 'SP');
    const seasonStats = [
      ...relievers.map((reliever) => stats(reliever.id, 'nym', {
        ip: 405,
        earnedRuns: 155,
      })),
      stats(leagueAnchor.id, 'bos', {
        ip: 2_700,
        earnedRuns: 300,
      }),
    ];

    const result = detectBullpenCollapse(summary('nym'), context([...relievers, leagueAnchor], seasonStats));

    expect(result).not.toBeNull();
    expect(result?.teamId).toBe('nym');
    expect(result?.moment.type).toBe('bullpen_collapse');
    expect(result?.moment.description).toContain('bullpen');
  });

  it('returns null when the bullpen does not meet the 400 inning workload gate', () => {
    const relievers = [
      player(1, 'nym-rp-1', 'nym', 'RP'),
      player(2, 'nym-rp-2', 'nym', 'RP'),
      player(3, 'nym-cl', 'nym', 'CL'),
    ];
    const leagueAnchor = player(4, 'bos-sp', 'bos', 'SP');
    const seasonStats = [
      ...relievers.map((reliever) => stats(reliever.id, 'nym', {
        ip: 390,
        earnedRuns: 150,
      })),
      stats(leagueAnchor.id, 'bos', {
        ip: 2_700,
        earnedRuns: 300,
      }),
    ];

    expect(detectBullpenCollapse(summary('nym'), context([...relievers, leagueAnchor], seasonStats))).toBeNull();
  });

  it('stays idempotent when the current-season bullpen collapse is already recorded', () => {
    const relievers = [
      player(1, 'nym-rp-1', 'nym', 'RP'),
      player(2, 'nym-rp-2', 'nym', 'RP'),
      player(3, 'nym-cl', 'nym', 'CL'),
    ];
    const leagueAnchor = player(4, 'bos-sp', 'bos', 'SP');
    const seasonStats = [
      ...relievers.map((reliever) => stats(reliever.id, 'nym', {
        ip: 405,
        earnedRuns: 155,
      })),
      stats(leagueAnchor.id, 'bos', {
        ip: 2_700,
        earnedRuns: 300,
      }),
    ];

    const result = detectBullpenCollapse(summary('nym'), context([...relievers, leagueAnchor], seasonStats, {
      teamMoments: new Map([
        ['nym', [{
          season: 12,
          day: 182,
          timestamp: 'S12D182',
          type: 'bullpen_collapse',
          description: 'Already recorded.',
          impact: -44,
          relevance: 0.83,
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
