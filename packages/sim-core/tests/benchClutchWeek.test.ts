import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { detectWeeklyMoments } from '../src/moments/weeklyMoments.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import type { GameBoxScore } from '../src/sim/gameSimulator.js';
import type { PAOutcome, PAResult } from '../src/sim/plateAppearance.js';

function hitter(seed: number, id: string, overallRating: number): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), 'LF', 'nym', 'MLB'),
    id,
    teamId: 'nym',
    position: 'LF',
    rosterStatus: 'MLB',
    overallRating,
  };
}

function pa(outcome: PAOutcome, batterId: string, rbiOnPlay: number): PAResult {
  return {
    outcome,
    batterId,
    pitcherId: 'pitcher',
    inning: 7,
    halfInning: 'bottom',
    outs: 1,
    runnersOn: 2,
    scoreBefore: [2, 2],
    scoreAfter: [2, 2 + rbiOnPlay],
    rbiOnPlay,
    isWalkOff: false,
  };
}

function game(day: number, paResults: PAResult[]): GameBoxScore {
  return {
    homeTeamId: 'nym',
    awayTeamId: 'bos',
    homeScore: 6,
    awayScore: 3,
    innings: 9,
    homeHits: 10,
    awayHits: 7,
    paResults,
    date: `S5D${day}`,
    isPlayoff: false,
  };
}

describe('detectWeeklyMoments bench clutch week', () => {
  it('emits a team moment when projected bench hitters combine for five RBI', () => {
    const starters = Array.from({ length: 9 }, (_, index) => hitter(index + 1, `starter-${index}`, 500 - index));
    const bench = hitter(20, 'bench-bat', 240);

    const detected = detectWeeklyMoments({
      season: 5,
      weekEndDay: 70,
      players: [...starters, bench],
      gameLog: [
        game(65, [pa('DOUBLE', bench.id, 2)]),
        game(67, [pa('SINGLE', bench.id, 1)]),
        game(70, [pa('HR', bench.id, 2)]),
      ],
      teamMoments: new Map(),
      playerMoments: new Map(),
    });

    expect(detected.filter((entry) => entry.scope === 'team').map((entry) => entry.moment.type)).toContain('bench_clutch_week');
  });
});
