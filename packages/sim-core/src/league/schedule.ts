/**
 * @module schedule
 * Season schedule generator: 162-game season for 32 teams.
 * Generates a deterministic schedule over a 186-day regular-season calendar.
 */

import type { GameRNG } from '../math/prng.js';
import { getRegularSeasonGameDays } from '../sim/calendar.js';
import { TEAMS } from './teams.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduledGame {
  readonly day: number;      // regular-season calendar day
  readonly homeTeamId: string;
  readonly awayTeamId: string;
}

interface ScheduledMatchup {
  readonly homeTeamId: string;
  readonly awayTeamId: string;
}

type Pairing = readonly [string, string];
type PairingRound = readonly Pairing[];

const FULL_LEAGUE_REPEAT_CYCLES = 3;
const LEAGUE_REPEAT_CYCLES = 4;
const PREMIUM_ROUND_COUNT = 9;

function buildCircleMethodRounds(teamIds: readonly string[], rng: GameRNG): PairingRound[] {
  const rotation = rng.shuffle(teamIds);
  const rounds: PairingRound[] = [];
  const halfSize = rotation.length / 2;

  for (let roundIndex = 0; roundIndex < rotation.length - 1; roundIndex += 1) {
    const round: Pairing[] = [];

    for (let pairIndex = 0; pairIndex < halfSize; pairIndex += 1) {
      round.push([
        rotation[pairIndex]!,
        rotation[rotation.length - 1 - pairIndex]!,
      ]);
    }

    rounds.push(round);

    const fixedTeamId = rotation[0]!;
    const movedTeamId = rotation.pop()!;
    rotation.splice(1, 0, movedTeamId);
    rotation[0] = fixedTeamId;
  }

  return rounds;
}

function orientRound(
  round: PairingRound,
  variantIndex: number,
  roundIndex: number,
): ScheduledMatchup[] {
  return round.map(([leftTeamId, rightTeamId], pairIndex) => {
    const flipHomeField = (variantIndex + roundIndex + pairIndex) % 2 === 1;
    return flipHomeField
      ? { homeTeamId: rightTeamId, awayTeamId: leftTeamId }
      : { homeTeamId: leftTeamId, awayTeamId: rightTeamId };
  });
}

function repeatRounds(baseRounds: readonly PairingRound[], repeatCount: number): ScheduledMatchup[][] {
  const rounds: ScheduledMatchup[][] = [];

  for (let repeatIndex = 0; repeatIndex < repeatCount; repeatIndex += 1) {
    for (let roundIndex = 0; roundIndex < baseRounds.length; roundIndex += 1) {
      rounds.push(orientRound(baseRounds[roundIndex]!, repeatIndex, roundIndex));
    }
  }

  return rounds;
}

function zipLeagueRounds(leftRounds: readonly PairingRound[], rightRounds: readonly PairingRound[]): PairingRound[] {
  return leftRounds.map((leftRound, roundIndex) => [
    ...leftRound,
    ...rightRounds[roundIndex]!,
  ]);
}

function countDivisionGames(round: PairingRound, teamDivisions: ReadonlyMap<string, string>): number {
  return round.reduce((total, [leftTeamId, rightTeamId]) => (
    teamDivisions.get(leftTeamId) === teamDivisions.get(rightTeamId)
      ? total + 1
      : total
  ), 0);
}

function selectPremiumRounds(
  leagueRounds: readonly PairingRound[],
  teamDivisions: ReadonlyMap<string, string>,
): ScheduledMatchup[][] {
  const rankedRounds = leagueRounds
    .map((round, roundIndex) => ({
      round,
      roundIndex,
      divisionGames: countDivisionGames(round, teamDivisions),
    }))
    .sort((left, right) => (
      right.divisionGames - left.divisionGames
      || left.roundIndex - right.roundIndex
    ))
    .slice(0, PREMIUM_ROUND_COUNT)
    .sort((left, right) => left.roundIndex - right.roundIndex);

  return rankedRounds.map(({ round, roundIndex }, premiumIndex) =>
    orientRound(round, LEAGUE_REPEAT_CYCLES + premiumIndex, roundIndex),
  );
}

// ---------------------------------------------------------------------------
// Schedule generator
// ---------------------------------------------------------------------------

/**
 * Generate a 162-game schedule for all 32 teams.
 *
 * Distribution approach:
 * - three full-league round-robin cycles for 93 game days
 * - four league-only round-robin cycles for 60 game days
 * - nine premium league-only rounds weighted toward division matchups
 * - game days mapped onto a fixed 186-day calendar with league-wide off-days
 */
export function generateSchedule(rng: GameRNG): ScheduledGame[] {
  const allTeamIds = TEAMS.map((team) => team.id);
  const alTeamIds = TEAMS
    .filter((team) => team.division.startsWith('AL'))
    .map((team) => team.id);
  const nlTeamIds = TEAMS
    .filter((team) => team.division.startsWith('NL'))
    .map((team) => team.id);
  const teamDivisions = new Map(TEAMS.map((team) => [team.id, team.division]));
  const fullLeagueRounds = buildCircleMethodRounds(allTeamIds, rng.fork());
  const alRounds = buildCircleMethodRounds(alTeamIds, rng.fork());
  const nlRounds = buildCircleMethodRounds(nlTeamIds, rng.fork());
  const uniqueLeagueRounds = zipLeagueRounds(alRounds, nlRounds);
  const seasonRounds = rng.fork().shuffle([
    ...repeatRounds(fullLeagueRounds, FULL_LEAGUE_REPEAT_CYCLES),
    ...repeatRounds(uniqueLeagueRounds, LEAGUE_REPEAT_CYCLES),
    ...selectPremiumRounds(uniqueLeagueRounds, teamDivisions),
  ]);
  const gameDays = getRegularSeasonGameDays();

  return seasonRounds.flatMap((round, roundIndex) =>
    round.map((matchup) => ({
      day: gameDays[roundIndex]!,
      homeTeamId: matchup.homeTeamId,
      awayTeamId: matchup.awayTeamId,
    })),
  );
}

/** Get all games for a specific day. */
export function getGamesForDay(schedule: ScheduledGame[], day: number): ScheduledGame[] {
  return schedule.filter(g => g.day === day);
}

/** Get the total number of calendar days in the schedule. */
export function getSeasonLength(schedule: ScheduledGame[]): number {
  if (schedule.length === 0) return 0;
  return schedule[schedule.length - 1]!.day;
}

/** Check if two teams are in the same division. */
export function isDivisionGame(teamAId: string, teamBId: string): boolean {
  const teamA = TEAMS.find(t => t.id === teamAId);
  const teamB = TEAMS.find(t => t.id === teamBId);
  if (!teamA || !teamB) return false;
  return teamA.division === teamB.division;
}
