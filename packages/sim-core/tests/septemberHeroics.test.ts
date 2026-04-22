import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  TEAMS,
  createSeasonState,
  detectSeptemberHeroics,
  generateLeaguePlayers,
  generateSchedule,
  getRegularSeasonMonthForDay,
  simulateDay,
  type SeasonIdentityMomentDetectionContext,
  type TeamSeasonSummary,
} from '../src/index.js';

function summary(overrides: Partial<TeamSeasonSummary> & { teamId: string }): TeamSeasonSummary {
  return {
    teamId: overrides.teamId,
    wins: 81,
    losses: 81,
    madePlayoffs: false,
    isChampion: false,
    divisionRank: null,
    priorSeasonsSummary: [],
    ...overrides,
  };
}

function context(
  overrides: Partial<SeasonIdentityMomentDetectionContext> = {},
): SeasonIdentityMomentDetectionContext {
  return {
    season: 8,
    day: 1,
    teams: [],
    ...overrides,
  };
}

describe('monthly record splits', () => {
  it('accumulates September results under month 9', () => {
    const rng = new GameRNG(91);
    const teamIds = TEAMS.map((team) => team.id);
    const players = generateLeaguePlayers(rng.fork(), teamIds);
    const schedule = generateSchedule(rng.fork());
    const seasonState = {
      ...createSeasonState(8, teamIds),
      currentDay: 154,
    };

    const { newState, result } = simulateDay(
      rng.fork(),
      seasonState,
      schedule,
      players,
    );

    const firstBoxScore = result.games[0];
    expect(firstBoxScore).toBeTruthy();

    const winnerId = firstBoxScore!.homeScore > firstBoxScore!.awayScore ? firstBoxScore!.homeTeamId : firstBoxScore!.awayTeamId;
    const loserId = winnerId === firstBoxScore!.homeTeamId ? firstBoxScore!.awayTeamId : firstBoxScore!.homeTeamId;

    expect(newState.monthlyRecordSplits[winnerId]?.['9']).toEqual({ wins: 1, losses: 0 });
    expect(newState.monthlyRecordSplits[loserId]?.['9']).toEqual({ wins: 0, losses: 1 });
  });

  it('maps the regular-season calendar day 154 to September', () => {
    expect(getRegularSeasonMonthForDay(154).month).toBe(9);
  });
});

describe('detectSeptemberHeroics', () => {
  it('fires for a playoff team with at least 20 September wins', () => {
    const result = detectSeptemberHeroics(
      summary({ teamId: 'nym', madePlayoffs: true }),
      context({
        monthlyRecordSplits: {
          nym: {
            9: { wins: 22, losses: 6 },
          },
        },
      }),
    );

    expect(result).not.toBeNull();
    expect(result?.moment.type).toBe('september_heroics');
  });

  it('skips non-playoff teams even with a dominant September', () => {
    const result = detectSeptemberHeroics(
      summary({ teamId: 'nym', madePlayoffs: false }),
      context({
        monthlyRecordSplits: {
          nym: {
            9: { wins: 22, losses: 6 },
          },
        },
      }),
    );

    expect(result).toBeNull();
  });

  it('skips playoff teams that fell short of 20 September wins', () => {
    const result = detectSeptemberHeroics(
      summary({ teamId: 'nym', madePlayoffs: true }),
      context({
        monthlyRecordSplits: {
          nym: {
            9: { wins: 15, losses: 12 },
          },
        },
      }),
    );

    expect(result).toBeNull();
  });
});
