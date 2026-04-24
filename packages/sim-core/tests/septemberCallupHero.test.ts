import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { detectSeptemberCallupHero } from '../src/moments/signatureMoments.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import type { GameBoxScore, PlayerGameStats } from '../src/sim/gameSimulator.js';
import type { PAOutcome, PAResult } from '../src/sim/plateAppearance.js';

function makePlayer(seed: number, overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), 'SS', 'nym', 'MLB'),
    age: 22,
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
    homeScore: 7,
    awayScore: 2,
    innings: 9,
    homeHits: 12,
    awayHits: 5,
    paResults,
    date: `S8D${day}`,
    isPlayoff: false,
  };
}

function hotWindow(playerId: string, pitcherId: string): GameBoxScore[] {
  const outcomes = [
    ...Array<PAOutcome>(15).fill('HR'),
    ...Array<PAOutcome>(15).fill('SINGLE'),
    ...Array<PAOutcome>(10).fill('BB'),
  ];
  return outcomes.map((outcome, index) => game(154 + Math.floor(index / 4), [pa(outcome, playerId, pitcherId)]));
}

describe('detectSeptemberCallupHero', () => {
  it('fires for a September call-up who posts a 140 OPS+ in the first 30 days', () => {
    const player = makePlayer(1);
    const pitcher = makePlayer(2, { position: 'SP', pitcherAttributes: { stuff: 250, control: 250, stamina: 250, velocity: 250, movement: 250 } });
    const leagueAverage = makePlayer(3);
    const result = detectSeptemberCallupHero(player, {
      season: 8,
      detectionDay: 181,
      callupDay: 154,
      teamId: 'nym',
      players: [player, pitcher, leagueAverage],
      playerSeasonStats: new Map([
        [player.id, makeStats({ playerId: player.id, pa: 180, ab: 154, hits: 58, hr: 16, bb: 24 })],
        [leagueAverage.id, makeStats({ playerId: leagueAverage.id, pa: 600, ab: 540, hits: 135, doubles: 25, hr: 18, bb: 45 })],
      ]),
      gameLog: hotWindow(player.id, pitcher.id),
      playerMoments: new Map(),
    });

    expect(result?.moment.type).toBe('september_callup_hero');
    expect(result?.moment.day).toBe(154);
    expect(result?.moment.description).toContain('September');
    expect(result?.moment.description).toContain('22');
  });

  it('skips pre-September promotions', () => {
    const player = makePlayer(4);
    const result = detectSeptemberCallupHero(player, {
      season: 8,
      detectionDay: 181,
      callupDay: 120,
      teamId: 'nym',
      players: [player],
      playerSeasonStats: new Map(),
      gameLog: [],
      playerMoments: new Map(),
    });

    expect(result).toBeNull();
  });
});
