import { beforeAll, describe, expect, it } from 'vitest';
import {
  GameRNG,
  TEAMS,
  advanceOffseasonDay,
  createOffseasonState,
  createSeasonState,
  determinePlayoffSeeds,
  generateLeaguePlayers,
  generateSchedule,
  getOffseasonLength,
  simulateMonth,
  type PlayoffSeed,
  type SeasonState,
} from '../src/index.js';

interface DirectMonthResult {
  playoffSeeds: PlayoffSeed[];
  seasonState: SeasonState;
}

function runDirectMonth(seed: number): DirectMonthResult {
  const rng = new GameRNG(seed);
  const teamIds = TEAMS.map((team) => team.id);
  const players = generateLeaguePlayers(rng.fork(), teamIds);
  const schedule = generateSchedule(rng.fork());
  const initialState = createSeasonState(1, teamIds);
  const seasonState = simulateMonth(rng, initialState, schedule, players).newState;

  return {
    playoffSeeds: determinePlayoffSeeds(seasonState.standings.getFullStandings()),
    seasonState,
  };
}

function flattenStandings(seasonState: SeasonState) {
  return Object.values(seasonState.standings.getFullStandings())
    .flat()
    .map((entry) => ({
      teamId: entry.teamId,
      wins: entry.wins,
      losses: entry.losses,
      runDifferential: entry.runDifferential,
    }))
    .sort((left, right) => left.teamId.localeCompare(right.teamId));
}

function statSnapshot(seasonState: SeasonState) {
  return Array.from(seasonState.playerSeasonStats.entries())
    .map(([playerId, stats]) => ({
      playerId,
      hr: stats.hr,
      wins: stats.wins,
      losses: stats.losses,
      era: stats.ip > 0 ? Number(((stats.earnedRuns * 27) / stats.ip).toFixed(3)) : null,
    }))
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
}

function runOffseasonCalendar() {
  let offseason = createOffseasonState(1);
  const offseasonPhases = [offseason.currentPhase];
  while (!offseason.completed) {
    offseason = advanceOffseasonDay(offseason);
    offseasonPhases.push(offseason.currentPhase);
  }

  return offseasonPhases;
}

describe('direct lifecycle integration', () => {
  let baselineMonth: DirectMonthResult;

  beforeAll(() => {
    baselineMonth = runDirectMonth(2_601);
  }, 30_000);

  it('advances a seeded opening month and accumulates a populated game log', () => {
    expect(baselineMonth.seasonState.completed).toBe(false);
    expect(baselineMonth.seasonState.currentDay).toBeGreaterThan(1);
    expect(baselineMonth.seasonState.gameLog.length).toBeGreaterThan(0);
  });

  it('keeps league wins and losses balanced after the first simulated month', () => {
    const totals = flattenStandings(baselineMonth.seasonState).reduce(
      (summary, entry) => ({
        wins: summary.wins + entry.wins,
        losses: summary.losses + entry.losses,
      }),
      { wins: 0, losses: 0 },
    );

    expect(totals.wins).toBeGreaterThan(0);
    expect(totals.wins).toBe(totals.losses);
  });

  it('keeps first-month stat outputs inside sane upper bounds', () => {
    const stats = statSnapshot(baselineMonth.seasonState);
    const maxHomeRuns = Math.max(...stats.map((entry) => entry.hr));
    const worstEra = Math.max(...stats.map((entry) => entry.era ?? 0));
    const bestEra = Math.min(...stats.filter((entry) => entry.era != null).map((entry) => entry.era ?? 0));

    expect(maxHomeRuns).toBeLessThan(35);
    expect(worstEra).toBeLessThan(25);
    expect(bestEra).toBeGreaterThanOrEqual(0);
  });

  it('keeps playoff seeding bounded and league-balanced during the season', () => {
    const leagueCounts = baselineMonth.playoffSeeds.reduce<Record<string, number>>((summary, seed) => {
      summary[seed.league] = (summary[seed.league] ?? 0) + 1;
      return summary;
    }, {});

    expect(leagueCounts.AL).toBe(6);
    expect(leagueCounts.NL).toBe(6);
    expect(baselineMonth.playoffSeeds.every((seed) => seed.seed >= 1 && seed.seed <= 6)).toBe(true);
  });

  it('replays the same seeded month identically', () => {
    const second = runDirectMonth(2_601);

    expect({
      seeds: baselineMonth.playoffSeeds,
      standings: flattenStandings(baselineMonth.seasonState),
      stats: statSnapshot(baselineMonth.seasonState),
      currentDay: baselineMonth.seasonState.currentDay,
    }).toEqual({
      seeds: second.playoffSeeds,
      standings: flattenStandings(second.seasonState),
      stats: statSnapshot(second.seasonState),
      currentDay: second.seasonState.currentDay,
    });
  }, 30_000);

  it('advances the offseason calendar through every major phase and completes it', () => {
    const offseasonPhases = runOffseasonCalendar();
    const uniquePhases = new Set(offseasonPhases);

    expect(uniquePhases.has('season_review')).toBe(true);
    expect(uniquePhases.has('free_agency')).toBe(true);
    expect(uniquePhases.has('draft')).toBe(true);
    expect(uniquePhases.has('international_signing')).toBe(true);
    expect(offseasonPhases.length).toBeGreaterThan(getOffseasonLength() - 3);
  });
});
