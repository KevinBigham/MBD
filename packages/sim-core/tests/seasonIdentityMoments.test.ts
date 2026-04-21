import { describe, expect, it } from 'vitest';
import {
  CHAMPIONSHIP_RUN_IMPACT,
  CONTENTION_COLLAPSE_IMPACT,
  CONTENTION_COLLAPSE_WINS_THRESHOLD,
  FIRST_DYNASTY_PEAK_IMPACT,
  LOSING_SEASON_STREAK_IMPACT,
  detectChampionshipRun,
  detectContentionCollapse,
  detectFirstDynastyPeak,
  detectLosingSeasonStreak,
  detectSeasonIdentityMoments,
  type TeamSeasonSummary,
} from '../src/moments/seasonIdentityMoments.js';

function summary(overrides: Partial<TeamSeasonSummary> & { teamId: string }): TeamSeasonSummary {
  return {
    wins: 81,
    losses: 81,
    madePlayoffs: false,
    isChampion: false,
    ...overrides,
  };
}

describe('detectChampionshipRun', () => {
  it('emits a championship_run moment for the champion', () => {
    const result = detectChampionshipRun(
      summary({ teamId: 'nym', wins: 98, losses: 64, madePlayoffs: true, isChampion: true }),
      7,
      182,
    );
    expect(result).not.toBeNull();
    expect(result?.teamId).toBe('nym');
    expect(result?.moment.type).toBe('championship_run');
    expect(result?.moment.impact).toBe(CHAMPIONSHIP_RUN_IMPACT);
    expect(result?.moment.relevance).toBe(1.0);
    expect(result?.moment.season).toBe(7);
    expect(result?.moment.day).toBe(182);
    expect(result?.moment.timestamp).toBe('S7D182');
    expect(result?.moment.description).toContain('98-64');
  });

  it('returns null for non-champions', () => {
    const result = detectChampionshipRun(
      summary({ teamId: 'bos', wins: 95, losses: 67, madePlayoffs: true, isChampion: false }),
      7,
      182,
    );
    expect(result).toBeNull();
  });
});

describe('detectContentionCollapse', () => {
  it('emits a contention_collapse moment for a non-playoff team at or above the threshold', () => {
    const result = detectContentionCollapse(
      summary({
        teamId: 'det',
        wins: CONTENTION_COLLAPSE_WINS_THRESHOLD,
        losses: 77,
        madePlayoffs: false,
      }),
      7,
      182,
    );
    expect(result).not.toBeNull();
    expect(result?.moment.type).toBe('contention_collapse');
    expect(result?.moment.impact).toBe(CONTENTION_COLLAPSE_IMPACT);
    expect(result?.moment.relevance).toBe(0.8);
    expect(result?.moment.description).toContain(`${CONTENTION_COLLAPSE_WINS_THRESHOLD}-77`);
  });

  it('returns null when the team made the playoffs', () => {
    const result = detectContentionCollapse(
      summary({ teamId: 'nym', wins: 95, losses: 67, madePlayoffs: true }),
      7,
      182,
    );
    expect(result).toBeNull();
  });

  it('returns null when the team is below the wins threshold', () => {
    const result = detectContentionCollapse(
      summary({
        teamId: 'mia',
        wins: CONTENTION_COLLAPSE_WINS_THRESHOLD - 1,
        losses: 78,
        madePlayoffs: false,
      }),
      7,
      182,
    );
    expect(result).toBeNull();
  });
});

describe('detectFirstDynastyPeak', () => {
  it('emits a first_dynasty_peak moment for a back-to-back division winner', () => {
    const result = detectFirstDynastyPeak(
      summary({
        teamId: 'nym',
        wins: 97,
        losses: 65,
        divisionRank: 1,
        priorSeasonsSummary: [
          { season: 5, wins: 84, losses: 78, divisionRank: 2 },
          { season: 6, wins: 93, losses: 69, divisionRank: 1 },
        ],
      }),
      7,
      182,
    );

    expect(result).not.toBeNull();
    expect(result?.moment.type).toBe('first_dynasty_peak');
    expect(result?.moment.impact).toBe(FIRST_DYNASTY_PEAK_IMPACT);
    expect(result?.moment.description).toContain('97-65');
    expect(result?.moment.description).toContain("93-69");
  });

  it('returns null for a single-year division champion', () => {
    const result = detectFirstDynastyPeak(
      summary({
        teamId: 'bos',
        wins: 92,
        losses: 70,
        divisionRank: 1,
        priorSeasonsSummary: [
          { season: 6, wins: 85, losses: 77, divisionRank: 2 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('returns null when the prior season did not finish first in the division', () => {
    const result = detectFirstDynastyPeak(
      summary({
        teamId: 'det',
        wins: 94,
        losses: 68,
        divisionRank: 1,
        priorSeasonsSummary: [
          { season: 6, wins: 90, losses: 72, divisionRank: 2 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('returns null when no prior seasons summary exists', () => {
    const result = detectFirstDynastyPeak(
      summary({ teamId: 'sd', wins: 91, losses: 71, divisionRank: 1, priorSeasonsSummary: [] }),
      7,
      182,
    );

    expect(result).toBeNull();
  });
});

describe('detectLosingSeasonStreak', () => {
  it('emits a losing_season_streak moment for three consecutive losing seasons', () => {
    const result = detectLosingSeasonStreak(
      summary({
        teamId: 'mia',
        wins: 71,
        losses: 91,
        priorSeasonsSummary: [
          { season: 4, wins: 84, losses: 78, divisionRank: 3 },
          { season: 5, wins: 74, losses: 88, divisionRank: 4 },
          { season: 6, wins: 69, losses: 93, divisionRank: 5 },
        ],
      }),
      7,
      182,
    );

    expect(result).not.toBeNull();
    expect(result?.moment.type).toBe('losing_season_streak');
    expect(result?.moment.impact).toBe(LOSING_SEASON_STREAK_IMPACT);
    expect(result?.moment.description).toContain('71-91');
  });

  it('returns null when one of the two immediately prior seasons was winning', () => {
    const result = detectLosingSeasonStreak(
      summary({
        teamId: 'oak',
        wins: 73,
        losses: 89,
        priorSeasonsSummary: [
          { season: 4, wins: 76, losses: 86, divisionRank: 4 },
          { season: 5, wins: 82, losses: 80, divisionRank: 3 },
          { season: 6, wins: 70, losses: 92, divisionRank: 5 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('returns null when the current season is winning', () => {
    const result = detectLosingSeasonStreak(
      summary({
        teamId: 'sea',
        wins: 84,
        losses: 78,
        priorSeasonsSummary: [
          { season: 4, wins: 73, losses: 89, divisionRank: 4 },
          { season: 5, wins: 75, losses: 87, divisionRank: 4 },
          { season: 6, wins: 74, losses: 88, divisionRank: 5 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('returns null when no prior seasons summary exists', () => {
    const result = detectLosingSeasonStreak(
      summary({ teamId: 'col', wins: 66, losses: 96, priorSeasonsSummary: [] }),
      7,
      182,
    );

    expect(result).toBeNull();
  });
});

describe('detectSeasonIdentityMoments', () => {
  it('emits moments deterministically sorted by teamId + canonical type order', () => {
    const result = detectSeasonIdentityMoments({
      season: 7,
      day: 182,
      teams: [
        summary({ teamId: 'bos', wins: 88, losses: 74, madePlayoffs: false }),
        summary({
          teamId: 'det',
          wins: 68,
          losses: 94,
          madePlayoffs: false,
          priorSeasonsSummary: [
            { season: 4, wins: 81, losses: 81, divisionRank: 4 },
            { season: 5, wins: 73, losses: 89, divisionRank: 4 },
            { season: 6, wins: 70, losses: 92, divisionRank: 5 },
          ],
        }),
        summary({
          teamId: 'nym',
          wins: 101,
          losses: 61,
          madePlayoffs: true,
          isChampion: true,
          divisionRank: 1,
          priorSeasonsSummary: [
            { season: 5, wins: 84, losses: 78, divisionRank: 2 },
            { season: 6, wins: 95, losses: 67, divisionRank: 1 },
          ],
        }),
      ],
    });

    expect(result.map((entry) => ({ teamId: entry.teamId, type: entry.moment.type })))
      .toEqual([
        { teamId: 'bos', type: 'contention_collapse' },
        { teamId: 'det', type: 'losing_season_streak' },
        { teamId: 'nym', type: 'championship_run' },
        { teamId: 'nym', type: 'first_dynasty_peak' },
      ]);
  });

  it('returns the same output for identical input (determinism)', () => {
    const context = {
      season: 11,
      day: 182,
      teams: [
        summary({ teamId: 'nym', wins: 99, losses: 63, madePlayoffs: true, isChampion: true }),
        summary({ teamId: 'bos', wins: 92, losses: 70, madePlayoffs: false }),
      ],
    };
    const first = detectSeasonIdentityMoments(context);
    const second = detectSeasonIdentityMoments(context);
    expect(first).toEqual(second);
  });

  it('returns an empty array when no team qualifies', () => {
    const result = detectSeasonIdentityMoments({
      season: 7,
      day: 182,
      teams: [
        summary({ teamId: 'sd', wins: 72, losses: 90, madePlayoffs: false }),
        summary({ teamId: 'mia', wins: 80, losses: 82, madePlayoffs: false }),
        summary({ teamId: 'oak', wins: 60, losses: 102, madePlayoffs: false }),
      ],
    });
    expect(result).toEqual([]);
  });
});
