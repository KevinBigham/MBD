import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { detectWeeklyMoments } from '../src/moments/weeklyMoments.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import type { GameBoxScore } from '../src/sim/gameSimulator.js';
import type { PAResult } from '../src/sim/plateAppearance.js';

function pitcher(seed: number, id: string, teamId: string): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), 'RP', teamId, 'MLB'),
    id,
    teamId,
    position: 'RP',
    rosterStatus: 'MLB',
  };
}

function pa(pitcherId: string): PAResult {
  return {
    outcome: 'K',
    batterId: 'batter',
    pitcherId,
    inning: 7,
    halfInning: 'top',
    outs: 0,
    runnersOn: 0,
    scoreBefore: [1, 4],
    scoreAfter: [1, 4],
    rbiOnPlay: 0,
    isWalkOff: false,
  };
}

function game(day: number, teamId: string, paResults: PAResult[]): GameBoxScore {
  return {
    homeTeamId: teamId,
    awayTeamId: 'bos',
    homeScore: 4,
    awayScore: 2,
    innings: 9,
    homeHits: 8,
    awayHits: 6,
    paResults,
    date: `S6D${day}`,
    isPlayoff: false,
  };
}

describe('detectWeeklyMoments bullpen overwork', () => {
  it('emits a team warning when relievers combine for at least twenty-five innings in seven days', () => {
    const reliever = pitcher(1, 'rp-1', 'nym');
    const heavyOuts = Array.from({ length: 75 }, () => pa(reliever.id));

    const detected = detectWeeklyMoments({
      season: 6,
      weekEndDay: 91,
      players: [reliever],
      gameLog: [game(88, 'nym', heavyOuts)],
      teamMoments: new Map(),
      playerMoments: new Map(),
    });

    expect(detected.filter((entry) => entry.scope === 'team').map((entry) => entry.moment.type)).toEqual(['bullpen_overwork_warning']);
  });

  it('throttles bullpen overwork warnings for thirty days per team', () => {
    const reliever = pitcher(2, 'rp-2', 'nym');
    const heavyOuts = Array.from({ length: 75 }, () => pa(reliever.id));

    const detected = detectWeeklyMoments({
      season: 6,
      weekEndDay: 91,
      players: [reliever],
      gameLog: [game(88, 'nym', heavyOuts)],
      teamMoments: new Map([[
        'nym',
        [{
          season: 6,
          day: 70,
          timestamp: 'S6D70',
          type: 'bullpen_overwork_warning',
          description: 'Already warned.',
          impact: -32,
          relevance: 0.72,
          isPlayoff: false,
          isEliminationGame: false,
          worldSeriesClincher: false,
          round: null,
        }],
      ]]),
      playerMoments: new Map(),
    });

    expect(detected).toEqual([]);
  });
});
