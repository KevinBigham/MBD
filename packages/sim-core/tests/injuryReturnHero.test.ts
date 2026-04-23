import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { detectInjuryReturnHero } from '../src/moments/signatureMoments.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import type { GameBoxScore, PlayerGameStats } from '../src/sim/gameSimulator.js';
import type { PAOutcome, PAResult } from '../src/sim/plateAppearance.js';
import type { Moment } from '../src/moments/momentDetector.js';

function makePlayer(seed: number, overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), 'LF', 'nym', 'MLB'),
    ...overrides,
  };
}

function makeStats(overrides: Partial<PlayerGameStats> = {}): PlayerGameStats {
  return {
    playerId: 'player',
    teamId: 'nym',
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

function pa(outcome: PAOutcome, batterId: string, pitcherId: string): PAResult {
  return {
    outcome,
    batterId,
    pitcherId,
    inning: 1,
    halfInning: 'top',
    outs: 0,
    runnersOn: 0,
    scoreBefore: [0, 0],
    scoreAfter: [0, outcome === 'HR' ? 1 : 0],
    rbiOnPlay: outcome === 'HR' ? 1 : 0,
    isWalkOff: false,
  };
}

function game(day: number, paResults: PAResult[]): GameBoxScore {
  return {
    homeTeamId: 'nym',
    awayTeamId: 'bos',
    homeScore: 5,
    awayScore: 3,
    innings: 9,
    homeHits: 10,
    awayHits: 8,
    paResults,
    date: `S8D${day}`,
    isPlayoff: false,
  };
}

function hotHitterGames(playerId: string, pitcherId: string): GameBoxScore[] {
  const outcomes = [
    ...Array<PAOutcome>(20).fill('HR'),
    ...Array<PAOutcome>(20).fill('SINGLE'),
    ...Array<PAOutcome>(20).fill('BB'),
  ];
  return outcomes.map((outcome, index) => game(100 + Math.floor(index / 4), [pa(outcome, playerId, pitcherId)]));
}

describe('detectInjuryReturnHero', () => {
  it('fires for a hitter who returns from the IL and posts a 130 OPS+ in the first 21 days back', () => {
    const player = makePlayer(1);
    const pitcher = makePlayer(2, { position: 'SP', pitcherAttributes: { stuff: 250, control: 250, stamina: 250, velocity: 250, movement: 250 } });
    const leagueAverage = makePlayer(3);
    const result = detectInjuryReturnHero(player, {
      season: 8,
      detectionDay: 121,
      returnDay: 100,
      injuryLabel: 'Hamstring Strain',
      daysOnIl: 34,
      teamId: 'nym',
      players: [player, pitcher, leagueAverage],
      playerSeasonStats: new Map([
        [player.id, makeStats({ playerId: player.id, pa: 600, ab: 520, hits: 180, hr: 34, bb: 70 })],
        [leagueAverage.id, makeStats({ playerId: leagueAverage.id, pa: 600, ab: 540, hits: 135, doubles: 25, hr: 18, bb: 45 })],
      ]),
      gameLog: hotHitterGames(player.id, pitcher.id),
      playerMoments: new Map(),
    });

    expect(result?.moment.type).toBe('injury_return_hero');
    expect(result?.moment.day).toBe(100);
    expect(result?.moment.description).toContain('Hamstring Strain');
  });

  it('does not duplicate an existing injury-return hero in the same season', () => {
    const player = makePlayer(4);
    const existing: Moment = {
      season: 8,
      type: 'injury_return_hero',
      description: 'Already recorded.',
      impact: 53,
      relevance: 0.83,
      isPlayoff: false,
      isEliminationGame: false,
      worldSeriesClincher: false,
      round: null,
    };

    const result = detectInjuryReturnHero(player, {
      season: 8,
      detectionDay: 121,
      returnDay: 100,
      injuryLabel: 'Hamstring Strain',
      daysOnIl: 34,
      teamId: 'nym',
      players: [player],
      playerSeasonStats: new Map(),
      gameLog: [],
      playerMoments: new Map([[player.id, [existing]]]),
    });

    expect(result).toBeNull();
  });
});
