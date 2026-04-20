import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  TEAMS,
  generateSchedule,
  getSeasonLength,
} from '../src/index.js';

const REGULAR_SEASON_DAYS = 186;
const REGULAR_SEASON_GAME_DAYS = 162;
const TEAMS_PER_GAME_DAY = 16;

function buildPairKey(teamAId: string, teamBId: string): string {
  return [teamAId, teamBId].sort((left, right) => left.localeCompare(right)).join(':');
}

describe('generateSchedule', () => {
  it('builds a 162-game schedule for every team across a 186-day calendar', () => {
    const schedule = generateSchedule(new GameRNG(44_001));
    const teamGames = new Map(TEAMS.map((team) => [team.id, 0]));
    const gamesByDay = new Map<number, number>();
    const teamsByDay = new Map<number, Set<string>>();

    for (const game of schedule) {
      teamGames.set(game.homeTeamId, (teamGames.get(game.homeTeamId) ?? 0) + 1);
      teamGames.set(game.awayTeamId, (teamGames.get(game.awayTeamId) ?? 0) + 1);
      gamesByDay.set(game.day, (gamesByDay.get(game.day) ?? 0) + 1);

      const scheduledTeams = teamsByDay.get(game.day) ?? new Set<string>();
      scheduledTeams.add(game.homeTeamId);
      scheduledTeams.add(game.awayTeamId);
      teamsByDay.set(game.day, scheduledTeams);
    }

    expect(schedule).toHaveLength(2_592);
    expect(getSeasonLength(schedule)).toBe(REGULAR_SEASON_DAYS);
    expect(gamesByDay.size).toBe(REGULAR_SEASON_GAME_DAYS);

    for (const totalGames of teamGames.values()) {
      expect(totalGames).toBe(REGULAR_SEASON_GAME_DAYS);
    }

    for (const totalGames of gamesByDay.values()) {
      expect(totalGames).toBe(TEAMS_PER_GAME_DAY);
    }

    for (const scheduledTeams of teamsByDay.values()) {
      expect(scheduledTeams.size).toBe(TEAMS.length);
    }

    const offDays = Array.from({ length: REGULAR_SEASON_DAYS }, (_, index) => index + 1)
      .filter((day) => !gamesByDay.has(day));
    expect(offDays).toHaveLength(REGULAR_SEASON_DAYS - REGULAR_SEASON_GAME_DAYS);
  });

  it('keeps cross-league pairs at three games and same-league pairs at seven or eight', () => {
    const schedule = generateSchedule(new GameRNG(44_001));
    const teamsById = new Map(TEAMS.map((team) => [team.id, team]));
    const pairCounts = new Map<string, number>();

    for (const game of schedule) {
      const key = buildPairKey(game.homeTeamId, game.awayTeamId);
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    }

    for (let leftIndex = 0; leftIndex < TEAMS.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < TEAMS.length; rightIndex += 1) {
        const leftTeam = TEAMS[leftIndex]!;
        const rightTeam = TEAMS[rightIndex]!;
        const pairKey = buildPairKey(leftTeam.id, rightTeam.id);
        const pairCount = pairCounts.get(pairKey);
        const sameLeague = leftTeam.division.startsWith('AL') === rightTeam.division.startsWith('AL');

        expect(pairCount).toBeDefined();
        if (sameLeague) {
          expect(pairCount === 7 || pairCount === 8).toBe(true);
        } else {
          expect(pairCount).toBe(3);
        }
      }
    }

    const distinctDivisionCounts = new Set<number>();
    for (const [pairKey, pairCount] of pairCounts) {
      const [teamAId, teamBId] = pairKey.split(':');
      const teamA = teamsById.get(teamAId)!;
      const teamB = teamsById.get(teamBId)!;
      if (teamA.division === teamB.division) {
        distinctDivisionCounts.add(pairCount);
      }
    }

    expect(Array.from(distinctDivisionCounts).every((count) => count === 7 || count === 8)).toBe(true);
  });
});
