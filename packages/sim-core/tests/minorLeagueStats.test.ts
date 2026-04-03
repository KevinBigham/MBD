import { describe, expect, it } from 'vitest';
import type { AffiliatePlayerStats } from '../src/index.js';
import {
  getMinorLeagueProgression,
  recordMinorLeagueStats,
} from '../src/index.js';

function makeStats(overrides: Partial<AffiliatePlayerStats>): AffiliatePlayerStats {
  return {
    playerId: 'prospect-1',
    games: 0,
    pa: 0,
    hits: 0,
    hr: 0,
    rbi: 0,
    bb: 0,
    k: 0,
    ipOuts: 0,
    earnedRuns: 0,
    strikeouts: 0,
    walks: 0,
    wins: 0,
    losses: 0,
    ...overrides,
  };
}

describe('minor league stat history', () => {
  it('replaces the current season and level aggregate instead of double counting', () => {
    let history = new Map<string, ReturnType<typeof getMinorLeagueProgression>>();
    history = recordMinorLeagueStats(history, 'prospect-1', 5, 'AA', makeStats({
      games: 44,
      pa: 180,
      hits: 58,
      hr: 11,
      rbi: 41,
      bb: 22,
    }));
    history = recordMinorLeagueStats(history, 'prospect-1', 5, 'AA', makeStats({
      games: 50,
      pa: 210,
      hits: 66,
      hr: 13,
      rbi: 47,
      bb: 24,
    }));

    const progression = getMinorLeagueProgression(history, 'prospect-1');
    expect(progression).toHaveLength(1);
    expect(progression[0]).toMatchObject({
      season: 5,
      level: 'AA',
      gamesPlayed: 50,
      pa: 210,
      hits: 66,
      hr: 13,
      rbi: 47,
    });
  });

  it('keeps chronological lines across levels', () => {
    let history = new Map<string, ReturnType<typeof getMinorLeagueProgression>>();
    history = recordMinorLeagueStats(history, 'prospect-2', 4, 'A', makeStats({ games: 60, pa: 240, hits: 70 }));
    history = recordMinorLeagueStats(history, 'prospect-2', 5, 'AA', makeStats({ games: 52, pa: 208, hits: 61 }));
    history = recordMinorLeagueStats(history, 'prospect-2', 5, 'AAA', makeStats({ games: 33, pa: 126, hits: 39 }));

    expect(getMinorLeagueProgression(history, 'prospect-2').map((line) => `${line.season}-${line.level}`)).toEqual([
      '4-A',
      '5-AA',
      '5-AAA',
    ]);
  });
});
