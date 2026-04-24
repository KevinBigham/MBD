import { describe, expect, it } from 'vitest';
import { detectWeeklyMoments } from '../src/moments/weeklyMoments.js';
import type { GameBoxScore } from '../src/sim/gameSimulator.js';

function game(day: number, homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number): GameBoxScore {
  return {
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    innings: 9,
    homeHits: homeScore + 3,
    awayHits: awayScore + 3,
    paResults: [],
    date: `S3D${day}`,
    isPlayoff: false,
  };
}

describe('detectWeeklyMoments hot/cold streaks', () => {
  it('emits hot and cold weekly team moments from the trailing seven-day game log', () => {
    const detected = detectWeeklyMoments({
      season: 3,
      weekEndDay: 14,
      players: [],
      gameLog: [
        game(8, 'nym', 'bos', 7, 2),
        game(9, 'nym', 'bos', 6, 3),
        game(10, 'bos', 'nym', 1, 5),
        game(11, 'nym', 'bos', 8, 4),
        game(12, 'bos', 'nym', 2, 7),
      ],
      teamMoments: new Map(),
      playerMoments: new Map(),
    });

    expect(detected.filter((entry) => entry.scope === 'team' && entry.teamId === 'nym').map((entry) => entry.moment.type)).toContain('hot_streak_week');
    expect(detected.filter((entry) => entry.scope === 'team' && entry.teamId === 'bos').map((entry) => entry.moment.type)).toContain('cold_snap_week');
  });

  it('throttles hot and cold team streaks for rolling fourteen-day windows', () => {
    const detected = detectWeeklyMoments({
      season: 3,
      weekEndDay: 14,
      players: [],
      gameLog: [
        game(8, 'nym', 'bos', 7, 2),
        game(9, 'nym', 'bos', 6, 3),
        game(10, 'bos', 'nym', 1, 5),
        game(11, 'nym', 'bos', 8, 4),
        game(12, 'bos', 'nym', 2, 7),
      ],
      teamMoments: new Map([
        ['nym', [{
          season: 3,
          day: 7,
          timestamp: 'S3D7',
          type: 'hot_streak_week',
          description: 'Already hot.',
          impact: 38,
          relevance: 0.76,
          isPlayoff: false,
          isEliminationGame: false,
          worldSeriesClincher: false,
          round: null,
        }]],
        ['bos', [{
          season: 3,
          day: 7,
          timestamp: 'S3D7',
          type: 'cold_snap_week',
          description: 'Already cold.',
          impact: -36,
          relevance: 0.74,
          isPlayoff: false,
          isEliminationGame: false,
          worldSeriesClincher: false,
          round: null,
        }]],
      ]),
      playerMoments: new Map(),
    });

    expect(detected.some((entry) => entry.moment.type === 'hot_streak_week')).toBe(false);
    expect(detected.some((entry) => entry.moment.type === 'cold_snap_week')).toBe(false);
  });
});
