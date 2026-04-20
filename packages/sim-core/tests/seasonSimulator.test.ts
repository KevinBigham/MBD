import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  TEAMS,
  createSeasonState,
  generateLeaguePlayers,
  generateSchedule,
  getNextMonthStartDay,
  getRegularSeasonMonthForDay,
  simulateDay,
  simulateMonth,
} from '../src/index.js';

function buildSeasonInputs(day: number) {
  const rng = new GameRNG(901 + day);
  const teamIds = TEAMS.map((team) => team.id);
  const players = generateLeaguePlayers(rng.fork(), teamIds);
  const schedule = generateSchedule(rng.fork());
  const seasonState = {
    ...createSeasonState(1, teamIds),
    currentDay: day,
  };

  return { rng, players, schedule, seasonState };
}

describe('regular-season calendar helpers', () => {
  it('maps day ranges to baseball calendar months', () => {
    expect(getRegularSeasonMonthForDay(1)).toMatchObject({ label: 'April', startDay: 1, endDay: 30 });
    expect(getRegularSeasonMonthForDay(31)).toMatchObject({ label: 'May', startDay: 31, endDay: 61 });
    expect(getRegularSeasonMonthForDay(62)).toMatchObject({ label: 'June', startDay: 62, endDay: 91 });
    expect(getRegularSeasonMonthForDay(92)).toMatchObject({ label: 'July', startDay: 92, endDay: 122 });
    expect(getRegularSeasonMonthForDay(123)).toMatchObject({ label: 'August', startDay: 123, endDay: 153 });
    expect(getRegularSeasonMonthForDay(154)).toMatchObject({ label: 'September', startDay: 154, endDay: 186 });
    expect(getRegularSeasonMonthForDay(186)).toMatchObject({ label: 'September', startDay: 154, endDay: 186 });
  });

  it('returns the next calendar checkpoint day for simMonth', () => {
    expect(getNextMonthStartDay(1)).toBe(31);
    expect(getNextMonthStartDay(31)).toBe(62);
    expect(getNextMonthStartDay(62)).toBe(92);
    expect(getNextMonthStartDay(92)).toBe(123);
    expect(getNextMonthStartDay(123)).toBe(154);
    expect(getNextMonthStartDay(154)).toBe(187);
  });
});

describe('simulateMonth', () => {
  it('does not mutate the supplied season state when simulating a day', () => {
    const openingDay = buildSeasonInputs(1);
    const standingsBefore = structuredClone(openingDay.seasonState.standings.serialize());
    const statsBefore = Array.from(openingDay.seasonState.playerSeasonStats.entries()).map(([playerId, stats]) => [
      playerId,
      { ...stats },
    ]);

    simulateDay(openingDay.rng, openingDay.seasonState, openingDay.schedule, openingDay.players);

    expect(openingDay.seasonState.currentDay).toBe(1);
    expect(openingDay.seasonState.standings.serialize()).toEqual(standingsBefore);
    expect(Array.from(openingDay.seasonState.playerSeasonStats.entries())).toEqual(statsBefore);
  });

  it('advances only to the next calendar month boundary', () => {
    const april = buildSeasonInputs(1);
    const may = buildSeasonInputs(31);

    const aprilResult = simulateMonth(april.rng, april.seasonState, april.schedule, april.players);
    const mayResult = simulateMonth(may.rng, may.seasonState, may.schedule, may.players);

    expect(aprilResult.newState.currentDay).toBe(31);
    expect(mayResult.newState.currentDay).toBe(62);
  });

  it('finishes the season when September is advanced', () => {
    const september = buildSeasonInputs(154);

    const result = simulateMonth(september.rng, september.seasonState, september.schedule, september.players);

    expect(result.newState.currentDay).toBe(187);
    expect(result.newState.currentDay).not.toBeGreaterThan(187);
    expect(result.newState.completed).toBe(true);
  });

  it('skips games cleanly when a team cannot field a pitcher', () => {
    const openingDay = buildSeasonInputs(1);
    const strippedPlayers = openingDay.players.filter((player) =>
      !(player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes != null),
    );

    expect(() =>
      simulateDay(openingDay.rng, openingDay.seasonState, openingDay.schedule, strippedPlayers),
    ).not.toThrow();
  });
});
