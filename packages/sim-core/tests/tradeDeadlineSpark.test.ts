import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { detectTradeDeadlineSpark } from '../src/moments/signatureMoments.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import type { GameBoxScore, PlayerGameStats } from '../src/sim/gameSimulator.js';
import type { PAOutcome, PAResult } from '../src/sim/plateAppearance.js';

function makePlayer(seed: number, overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), 'CF', 'bos', 'MLB'),
    ...overrides,
  };
}

function makeStats(overrides: Partial<PlayerGameStats> = {}): PlayerGameStats {
  return {
    playerId: 'player',
    teamId: 'bos',
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
    homeTeamId: 'bos',
    awayTeamId: 'nym',
    homeScore: 6,
    awayScore: 4,
    innings: 9,
    homeHits: 11,
    awayHits: 7,
    paResults,
    date: `S8D${day}`,
    isPlayoff: false,
  };
}

function hotWindow(playerId: string, pitcherId: string): GameBoxScore[] {
  const outcomes = [
    ...Array<PAOutcome>(25).fill('HR'),
    ...Array<PAOutcome>(25).fill('SINGLE'),
    ...Array<PAOutcome>(25).fill('BB'),
  ];
  return outcomes.map((outcome, index) => game(118 + Math.floor(index / 5), [pa(outcome, playerId, pitcherId)]));
}

describe('detectTradeDeadlineSpark', () => {
  it('fires for a deadline acquisition who posts a 130 OPS+ in the first 30 days with the new team', () => {
    const player = makePlayer(1);
    const pitcher = makePlayer(2, { position: 'SP', pitcherAttributes: { stuff: 250, control: 250, stamina: 250, velocity: 250, movement: 250 } });
    const leagueAverage = makePlayer(3);
    const result = detectTradeDeadlineSpark(player, {
      season: 8,
      detectionDay: 181,
      tradeDay: 118,
      acquiringTeamId: 'bos',
      priorTeamId: 'nym',
      players: [player, pitcher, leagueAverage],
      playerSeasonStats: new Map([
        [player.id, makeStats({ playerId: player.id, pa: 610, ab: 530, hits: 188, hr: 39, bb: 72 })],
        [leagueAverage.id, makeStats({ playerId: leagueAverage.id, pa: 600, ab: 540, hits: 135, doubles: 25, hr: 18, bb: 45 })],
      ]),
      gameLog: hotWindow(player.id, pitcher.id),
      playerMoments: new Map(),
    });

    expect(result?.moment.type).toBe('trade_deadline_spark');
    expect(result?.moment.day).toBe(118);
    expect(result?.moment.description).toContain('Boston');
    expect(result?.moment.description).toContain('New York');
  });

  it('skips trades before July', () => {
    const player = makePlayer(4);
    const result = detectTradeDeadlineSpark(player, {
      season: 8,
      detectionDay: 181,
      tradeDay: 80,
      acquiringTeamId: 'bos',
      priorTeamId: 'nym',
      players: [player],
      playerSeasonStats: new Map(),
      gameLog: [],
      playerMoments: new Map(),
    });

    expect(result).toBeNull();
  });
});
