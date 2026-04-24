import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { detectWeeklyMoments } from '../src/moments/weeklyMoments.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import type { GameBoxScore } from '../src/sim/gameSimulator.js';
import type { PAOutcome, PAResult } from '../src/sim/plateAppearance.js';

function player(seed: number, id: string, teamId: string, position: GeneratedPlayer['position']): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), position, teamId, 'MLB'),
    id,
    teamId,
    position,
    rosterStatus: 'MLB',
  };
}

function pa(outcome: PAOutcome, batterId: string, pitcherId: string, rbiOnPlay: number = 0): PAResult {
  return {
    outcome,
    batterId,
    pitcherId,
    inning: 8,
    halfInning: 'top',
    outs: 0,
    runnersOn: 0,
    scoreBefore: [2, 5],
    scoreAfter: [2 + rbiOnPlay, 5],
    rbiOnPlay,
    isWalkOff: false,
  };
}

function game(day: number, paResults: PAResult[], savePitcherId: string | null = null): GameBoxScore {
  return {
    homeTeamId: 'nym',
    awayTeamId: 'bos',
    homeScore: 5,
    awayScore: 3,
    innings: 9,
    homeHits: 9,
    awayHits: 7,
    paResults,
    savePitcherId,
    date: `S4D${day}`,
    isPlayoff: false,
  };
}

describe('detectWeeklyMoments closer weeks', () => {
  it('emits a lights-out closer moment for five saves with zero earned runs', () => {
    const closer = player(1, 'closer-1', 'nym', 'CL');
    const batter = player(2, 'batter-1', 'bos', 'LF');

    const detected = detectWeeklyMoments({
      season: 4,
      weekEndDay: 21,
      players: [closer, batter],
      gameLog: [15, 16, 17, 19, 21].map((day) => game(day, [pa('K', batter.id, closer.id)], closer.id)),
      teamMoments: new Map(),
      playerMoments: new Map(),
    });

    expect(detected.filter((entry) => entry.scope === 'player').map((entry) => entry.moment.type)).toEqual(['closer_lights_out']);
  });

  it('emits a closer meltdown moment when the closer allows four runs across three outings', () => {
    const closer = player(3, 'closer-2', 'nym', 'CL');
    const batter = player(4, 'batter-2', 'bos', 'RF');

    const detected = detectWeeklyMoments({
      season: 4,
      weekEndDay: 42,
      players: [closer, batter],
      gameLog: [
        game(36, [pa('HR', batter.id, closer.id, 2)]),
        game(38, [pa('DOUBLE', batter.id, closer.id, 1)]),
        game(41, [pa('SINGLE', batter.id, closer.id, 1)]),
      ],
      teamMoments: new Map(),
      playerMoments: new Map(),
    });

    expect(detected.filter((entry) => entry.scope === 'player').map((entry) => entry.moment.type)).toEqual(['closer_meltdown_week']);
  });
});
