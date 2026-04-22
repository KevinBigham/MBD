import { describe, expect, it } from 'vitest';
import {
  CAREER_SHUTOUT_MILESTONE,
  GameRNG,
  generatePlayer,
  recordCareerShutout,
  type GameBoxScore,
  type GeneratedPlayer,
  type PlayerGameStats,
} from '../src/index.js';

function makePitcher(seed: number, overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), 'SP', 'nym', 'MLB'),
    ...overrides,
  };
}

function boxScore(overrides: Partial<GameBoxScore> = {}): GameBoxScore {
  return {
    homeTeamId: 'nym',
    awayTeamId: 'bos',
    homeScore: 4,
    awayScore: 0,
    innings: 9,
    homeHits: 7,
    awayHits: 3,
    paResults: [],
    winningPitcherId: 'p1',
    losingPitcherId: 'p2',
    savePitcherId: null,
    date: 'S8D140',
    isPlayoff: false,
    ...overrides,
  };
}

function stats(overrides: Partial<PlayerGameStats> = {}): PlayerGameStats {
  return {
    playerId: 'p1',
    teamId: 'nym',
    gamesPlayed: 1,
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
    ip: 27,
    earnedRuns: 0,
    strikeouts: 9,
    walks: 1,
    hitsAllowed: 3,
    homeRunsAllowed: 0,
    hitBatters: 0,
    flyBallsAllowed: 10,
    wins: 1,
    saves: 0,
    losses: 0,
    gamesMissedToInjury: 0,
    ...overrides,
  };
}

describe('career shutout tracking', () => {
  it('increments career shutouts for a complete-game shutout', () => {
    const pitcher = makePitcher(1, { careerShutouts: 12 });

    const result = recordCareerShutout(pitcher, boxScore(), stats({ playerId: pitcher.id }));

    expect(result.recorded).toBe(true);
    expect(result.player.careerShutouts).toBe(13);
  });

  it('does not increment on a team shutout with multiple pitchers', () => {
    const pitcher = makePitcher(2, { careerShutouts: 12 });

    const result = recordCareerShutout(
      pitcher,
      boxScore(),
      stats({ playerId: pitcher.id, ip: 24 }),
    );

    expect(result.recorded).toBe(false);
    expect(result.player.careerShutouts).toBe(12);
  });

  it('does not increment on a non-shutout complete game', () => {
    const pitcher = makePitcher(3, { careerShutouts: 12 });

    const result = recordCareerShutout(
      pitcher,
      boxScore({ awayScore: 1 }),
      stats({ playerId: pitcher.id, earnedRuns: 1 }),
    );

    expect(result.recorded).toBe(false);
    expect(result.player.careerShutouts).toBe(12);
  });

  it('flags the 100-shutout milestone exactly at the crossing', () => {
    const pitcher = makePitcher(4, { careerShutouts: CAREER_SHUTOUT_MILESTONE - 1 });

    const result = recordCareerShutout(pitcher, boxScore(), stats({ playerId: pitcher.id }));

    expect(result.recorded).toBe(true);
    expect(result.crossedMilestone).toBe(true);
    expect(result.player.careerShutouts).toBe(CAREER_SHUTOUT_MILESTONE);
  });

  it('does not re-fire the milestone once the pitcher is already past 100', () => {
    const pitcher = makePitcher(5, { careerShutouts: CAREER_SHUTOUT_MILESTONE });

    const result = recordCareerShutout(pitcher, boxScore(), stats({ playerId: pitcher.id }));

    expect(result.recorded).toBe(true);
    expect(result.crossedMilestone).toBe(false);
    expect(result.player.careerShutouts).toBe(CAREER_SHUTOUT_MILESTONE + 1);
  });
});
