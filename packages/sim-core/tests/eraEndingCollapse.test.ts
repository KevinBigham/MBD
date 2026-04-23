import { describe, expect, it } from 'vitest';
import type { PlayoffSeriesHistoryEntry } from '@mbd/contracts';
import {
  detectEraEndingCollapse,
  type SeasonIdentityMomentDetectionContext,
  type TeamSeasonSummary,
} from '../src/moments/seasonIdentityMoments.js';

function summary(overrides: Partial<TeamSeasonSummary> & { teamId: string }): TeamSeasonSummary {
  return {
    teamId: overrides.teamId,
    wins: 80,
    losses: 82,
    madePlayoffs: false,
    isChampion: false,
    priorSeasonsSummary: [],
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
    day: 1,
    playoffSeriesHistory: [],
    ...overrides,
  };
}

describe('detectEraEndingCollapse', () => {
  it('emits an era_ending_collapse moment after a playoff club drops to 80 wins or fewer', () => {
    const team = summary({
      teamId: 'bos',
      wins: 80,
      losses: 82,
      priorSeasonsSummary: [{ season: 9, wins: 94, losses: 68, divisionRank: 2 }],
    });

    const result = detectEraEndingCollapse(team, context({
      teams: [team],
      playoffSeriesHistory: [playoffSeriesEntry(9, 'bos', 'nym', 'nym')],
    }));

    expect(result).not.toBeNull();
    expect(result?.teamId).toBe('bos');
    expect(result?.moment.type).toBe('era_ending_collapse');
  });

  it('returns null when prior-season standings data is missing', () => {
    const team = summary({ teamId: 'bos', priorSeasonsSummary: [] });

    const result = detectEraEndingCollapse(team, context({
      teams: [team],
      playoffSeriesHistory: [playoffSeriesEntry(9, 'bos', 'nym', 'nym')],
    }));

    expect(result).toBeNull();
  });

  it('returns null when the team did not make the prior postseason', () => {
    const team = summary({
      teamId: 'bos',
      priorSeasonsSummary: [{ season: 9, wins: 91, losses: 71, divisionRank: 2 }],
    });

    const result = detectEraEndingCollapse(team, context({
      teams: [team],
      playoffSeriesHistory: [playoffSeriesEntry(9, 'nym', 'tor', 'nym')],
    }));

    expect(result).toBeNull();
  });

  it('returns null when the current club still finishes above .500', () => {
    const team = summary({
      teamId: 'bos',
      wins: 81,
      losses: 81,
      priorSeasonsSummary: [{ season: 9, wins: 92, losses: 70, divisionRank: 1 }],
    });

    const result = detectEraEndingCollapse(team, context({
      teams: [team],
      playoffSeriesHistory: [playoffSeriesEntry(9, 'bos', 'nym', 'bos')],
    }));

    expect(result).toBeNull();
  });
});
