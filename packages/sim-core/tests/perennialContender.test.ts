import { describe, expect, it } from 'vitest';
import type { PlayoffSeriesHistoryEntry } from '@mbd/contracts';
import {
  detectPerennialContender,
  type SeasonIdentityMomentDetectionContext,
  type TeamSeasonSummary,
} from '../src/moments/seasonIdentityMoments.js';

function summary(overrides: Partial<TeamSeasonSummary> & { teamId: string }): TeamSeasonSummary {
  return {
    teamId: overrides.teamId,
    wins: 96,
    losses: 66,
    madePlayoffs: true,
    isChampion: false,
    ...overrides,
  };
}

function playoffSeriesEntry(
  season: number,
  higherSeedTeamId: string,
  lowerSeedTeamId: string,
  winnerTeamId: string,
): PlayoffSeriesHistoryEntry {
  return {
    season,
    round: 'DIVISION_SERIES',
    higherSeedTeamId,
    lowerSeedTeamId,
    bestOf: 5,
    deficitReached: null,
    deficitTeamId: null,
    winnerTeamId,
  };
}

function context(
  overrides: Partial<SeasonIdentityMomentDetectionContext> & { teams: readonly TeamSeasonSummary[] },
): SeasonIdentityMomentDetectionContext {
  return {
    season: 10,
    day: 21,
    playoffSeriesHistory: [],
    ...overrides,
  };
}

describe('detectPerennialContender', () => {
  it('emits a perennial_contender moment when the streak first reaches five', () => {
    const team = summary({ teamId: 'nym' });

    const result = detectPerennialContender(
      team,
      context({
        teams: [team],
        playoffSeriesHistory: [
          playoffSeriesEntry(6, 'nym', 'bos', 'nym'),
          playoffSeriesEntry(7, 'nym', 'tor', 'nym'),
          playoffSeriesEntry(8, 'nym', 'bal', 'nym'),
          playoffSeriesEntry(9, 'nym', 'bos', 'bos'),
        ],
      }),
      new Set(['nym']),
    );

    expect(result).not.toBeNull();
    expect(result?.teamId).toBe('nym');
    expect(result?.moment.type).toBe('perennial_contender');
  });

  it('returns null when a season in the five-year window misses October', () => {
    const team = summary({ teamId: 'nym' });

    const result = detectPerennialContender(
      team,
      context({
        teams: [team],
        playoffSeriesHistory: [
          playoffSeriesEntry(6, 'nym', 'bos', 'nym'),
          playoffSeriesEntry(8, 'nym', 'bal', 'nym'),
          playoffSeriesEntry(9, 'nym', 'bos', 'bos'),
        ],
      }),
      new Set(['nym']),
    );

    expect(result).toBeNull();
  });

  it('returns null when the current season would be year six of the same streak', () => {
    const team = summary({ teamId: 'nym' });

    const result = detectPerennialContender(
      team,
      context({
        season: 11,
        teams: [team],
        playoffSeriesHistory: [
          playoffSeriesEntry(6, 'nym', 'bos', 'nym'),
          playoffSeriesEntry(7, 'nym', 'tor', 'nym'),
          playoffSeriesEntry(8, 'nym', 'bal', 'nym'),
          playoffSeriesEntry(9, 'nym', 'bos', 'bos'),
          playoffSeriesEntry(10, 'nym', 'hou', 'nym'),
        ],
      }),
      new Set(['nym']),
    );

    expect(result).toBeNull();
  });

  it('stays idempotent when a current-season perennial_contender moment already exists', () => {
    const team = summary({ teamId: 'nym' });

    const result = detectPerennialContender(
      team,
      context({
        teams: [team],
        playoffSeriesHistory: [
          playoffSeriesEntry(6, 'nym', 'bos', 'nym'),
          playoffSeriesEntry(7, 'nym', 'tor', 'nym'),
          playoffSeriesEntry(8, 'nym', 'bal', 'nym'),
          playoffSeriesEntry(9, 'nym', 'bos', 'bos'),
        ],
        teamMoments: new Map([
          ['nym', [{
            season: 10,
            day: 21,
            timestamp: 'S10D21',
            type: 'perennial_contender',
            description: 'Already recorded.',
            impact: 55,
            relevance: 0.9,
            isPlayoff: true,
            isEliminationGame: false,
            worldSeriesClincher: false,
            round: 'CS',
          }]],
        ]),
      }),
      new Set(['nym']),
    );

    expect(result).toBeNull();
  });
});
