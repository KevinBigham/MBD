import { describe, expect, it } from 'vitest';
import type { SeasonHistoryEntry } from '@mbd/contracts';
import {
  detectThreePeat,
  type SeasonIdentityMomentDetectionContext,
  type TeamSeasonSummary,
} from '../src/moments/seasonIdentityMoments.js';

function summary(overrides: Partial<TeamSeasonSummary> & { teamId: string }): TeamSeasonSummary {
  return {
    teamId: overrides.teamId,
    wins: 95,
    losses: 67,
    madePlayoffs: true,
    isChampion: true,
    ...overrides,
  };
}

function seasonHistoryEntry(season: number, championTeamId: string | null): SeasonHistoryEntry {
  return {
    season,
    championTeamId,
    runnerUpTeamId: null,
    worldSeriesRecord: null,
    summary: `Season ${season}`,
    awards: [],
    keyMoments: [],
    statLeaders: {
      hr: [],
      rbi: [],
      avg: [],
      era: [],
      k: [],
      w: [],
    },
    notableRetirements: [],
    blockbusterTrades: [],
    userSeason: null,
  };
}

function context(
  overrides: Partial<SeasonIdentityMomentDetectionContext> & { teams: readonly TeamSeasonSummary[] },
): SeasonIdentityMomentDetectionContext {
  return {
    season: 10,
    day: 21,
    seasonHistory: [],
    ...overrides,
  };
}

describe('detectThreePeat', () => {
  it('emits a three_peat moment for the first third straight title', () => {
    const team = summary({ teamId: 'nym' });

    const result = detectThreePeat(team, context({
      teams: [team],
      seasonHistory: [
        seasonHistoryEntry(8, 'nym'),
        seasonHistoryEntry(9, 'nym'),
      ],
    }));

    expect(result).not.toBeNull();
    expect(result?.teamId).toBe('nym');
    expect(result?.moment.type).toBe('three_peat');
  });

  it('returns null when the club did not win the previous two titles', () => {
    const team = summary({ teamId: 'nym' });

    const result = detectThreePeat(team, context({
      teams: [team],
      seasonHistory: [
        seasonHistoryEntry(8, 'bos'),
        seasonHistoryEntry(9, 'nym'),
      ],
    }));

    expect(result).toBeNull();
  });

  it('stays idempotent when a current-season three_peat moment already exists', () => {
    const team = summary({ teamId: 'nym' });

    const result = detectThreePeat(team, context({
      teams: [team],
      seasonHistory: [
        seasonHistoryEntry(8, 'nym'),
        seasonHistoryEntry(9, 'nym'),
      ],
      teamMoments: new Map([
        ['nym', [{
          season: 10,
          day: 21,
          timestamp: 'S10D21',
          type: 'three_peat',
          description: 'Already recorded.',
          impact: 70,
          relevance: 0.95,
          isPlayoff: true,
          isEliminationGame: false,
          worldSeriesClincher: true,
          round: 'WS',
        }]],
      ]),
    }));

    expect(result).toBeNull();
  });

  it('does not re-emit for a fourth straight title', () => {
    const team = summary({ teamId: 'nym' });

    const result = detectThreePeat(team, context({
      teams: [team],
      seasonHistory: [
        seasonHistoryEntry(7, 'nym'),
        seasonHistoryEntry(8, 'nym'),
        seasonHistoryEntry(9, 'nym'),
      ],
    }));

    expect(result).toBeNull();
  });
});
