import { describe, expect, it } from 'vitest';
import {
  CHAMPIONSHIP_RUN_IMPACT,
  CONTENTION_COLLAPSE_IMPACT,
  CONTENTION_COLLAPSE_WINS_THRESHOLD,
  detectChampionshipRun,
  detectContentionCollapse,
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

describe('detectSeasonIdentityMoments', () => {
  it('emits moments deterministically sorted by teamId + type', () => {
    const result = detectSeasonIdentityMoments({
      season: 7,
      day: 182,
      teams: [
        summary({ teamId: 'det', wins: 86, losses: 76, madePlayoffs: false }),
        summary({ teamId: 'nym', wins: 101, losses: 61, madePlayoffs: true, isChampion: true }),
        summary({ teamId: 'bos', wins: 88, losses: 74, madePlayoffs: false }),
        summary({ teamId: 'sd', wins: 72, losses: 90, madePlayoffs: false }),
      ],
    });

    expect(result.map((entry) => ({ teamId: entry.teamId, type: entry.moment.type })))
      .toEqual([
        { teamId: 'bos', type: 'contention_collapse' },
        { teamId: 'det', type: 'contention_collapse' },
        { teamId: 'nym', type: 'championship_run' },
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
