/**
 * @module seasonSimulator
 * 162-game season simulation with schedule execution and stat accumulation.
 */

import type { MonthlyRecordSplits } from '@mbd/contracts';
import type { GameRNG } from '../math/prng.js';
import type { DayOneOpeningPlan } from '../onboarding/dayOne.js';
import type { GeneratedPlayer } from '../player/generation.js';
import type { ScheduledGame } from '../league/schedule.js';
import { isDivisionGame } from '../league/schedule.js';
import { StandingsTracker } from '../league/standings.js';
import type { GameBoxScore, PlayerGameStats, GameTeam } from './gameSimulator.js';
import { simulateGame } from './gameSimulator.js';
import { HITTER_POSITIONS, PITCHER_POSITIONS } from '../player/generation.js';
import {
  getNextMonthStartDay,
  getRegularSeasonMonthForDay,
  REGULAR_SEASON_DAYS,
} from './calendar.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeasonState {
  readonly season: number;
  readonly currentDay: number;
  readonly standings: StandingsTracker;
  readonly playerSeasonStats: Map<string, PlayerGameStats>;
  readonly gameLog: GameBoxScore[];
  readonly completed: boolean;
  readonly monthlyRecordSplits: MonthlyRecordSplits;
}

export interface DaySimResult {
  readonly day: number;
  readonly games: GameBoxScore[];
  readonly seasonComplete: boolean;
}

export interface SeasonSimulationOptions {
  readonly teamModifiers?: Map<string, number>;
  readonly openingDayPlans?: Map<string, DayOneOpeningPlan>;
  readonly unavailablePlayerIds?: ReadonlySet<string>;
}

function clonePlayerGameStats(stats: PlayerGameStats): PlayerGameStats {
  return { ...stats };
}

function clonePlayerSeasonStats(
  stats: Map<string, PlayerGameStats>,
): Map<string, PlayerGameStats> {
  return new Map(
    Array.from(stats.entries(), ([playerId, playerStats]) => [playerId, clonePlayerGameStats(playerStats)]),
  );
}

function cloneMonthlyRecordSplits(
  monthlyRecordSplits: MonthlyRecordSplits,
): MonthlyRecordSplits {
  return Object.fromEntries(
    Object.entries(monthlyRecordSplits).map(([teamId, monthlySplits]) => [
      teamId,
      Object.fromEntries(
        Object.entries(monthlySplits).map(([month, record]) => [month, { ...record }]),
      ),
    ]),
  );
}

function recordMonthlyResult(
  monthlyRecordSplits: MonthlyRecordSplits,
  teamId: string,
  month: number,
  result: 'win' | 'loss',
): void {
  const monthKey = String(month);
  const teamSplits = monthlyRecordSplits[teamId] ?? {};
  const monthRecord = teamSplits[monthKey] ?? { wins: 0, losses: 0 };
  monthlyRecordSplits[teamId] = {
    ...teamSplits,
    [monthKey]: {
      wins: monthRecord.wins + (result === 'win' ? 1 : 0),
      losses: monthRecord.losses + (result === 'loss' ? 1 : 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Lineup builder
// ---------------------------------------------------------------------------

/** Build a GameTeam from a team's player list. Uses MLB-level players. */
function buildGameTeam(
  teamId: string,
  players: GeneratedPlayer[],
  currentDay: number,
  openingPlan?: DayOneOpeningPlan,
  unavailablePlayerIds: ReadonlySet<string> = new Set(),
): GameTeam {
  const mlbPlayers = players.filter((player) =>
    player.teamId === teamId
    && player.rosterStatus === 'MLB'
    && !unavailablePlayerIds.has(player.id),
  );
  const playerById = new Map(mlbPlayers.map((player) => [player.id, player]));

  const hitters = mlbPlayers
    .filter(p => (HITTER_POSITIONS as readonly string[]).includes(p.position))
    .sort((a, b) => b.overallRating - a.overallRating);

  const pitchers = mlbPlayers
    .filter(p => (PITCHER_POSITIONS as readonly string[]).includes(p.position))
    .sort((a, b) => b.overallRating - a.overallRating);

  const plannedLineup = openingPlan?.lineupPlayerIds
    .map((playerId) => playerById.get(playerId))
    .filter((player): player is GeneratedPlayer => player != null && (HITTER_POSITIONS as readonly string[]).includes(player.position));
  const lineup = Array.from(new Map((plannedLineup ?? []).map((player) => [player.id, player])).values());

  for (const hitter of hitters) {
    if (lineup.length >= 9) {
      break;
    }
    if (lineup.some((player) => player.id === hitter.id)) {
      continue;
    }
    lineup.push(hitter);
  }

  // If we don't have 9 hitters, fill from pitchers (they bat too in NL-style)
  while (lineup.length < 9 && pitchers.length > lineup.length - 9 + pitchers.length) {
    const filler = mlbPlayers.find(p => !lineup.includes(p));
    if (filler) lineup.push(filler);
    else break;
  }

  // Ensure we have at least 9 by duplicating if needed (shouldn't happen with proper generation)
  while (lineup.length < 9 && lineup.length > 0) {
    lineup.push(lineup[0]!);
  }

  let starter = pitchers.find(p => p.position === 'SP') ?? pitchers[0];
  let bullpen = pitchers.filter((pitcher) => pitcher !== starter);

  if (openingPlan) {
    const plannedRotation = openingPlan.rotationPlayerIds
      .map((playerId) => playerById.get(playerId))
      .filter((player): player is GeneratedPlayer => player != null && player.position === 'SP');
    if (plannedRotation.length > 0) {
      const starterIndex = (Math.max(1, currentDay) - 1) % plannedRotation.length;
      starter = plannedRotation[starterIndex] ?? starter;
    }

    const plannedBullpenIds = openingPlan.bullpen == null
      ? []
      : [
        openingPlan.bullpen.longReliefId,
        ...openingPlan.bullpen.setupIds,
        openingPlan.bullpen.closerId,
      ].filter((playerId): playerId is string => Boolean(playerId));
    bullpen = [];
    for (const playerId of plannedBullpenIds) {
      const player = playerById.get(playerId);
      if (!player || player.id === starter?.id || bullpen.some((entry) => entry.id === player.id)) {
        continue;
      }
      bullpen.push(player);
    }
    for (const pitcher of pitchers) {
      if (pitcher.id === starter?.id || bullpen.some((entry) => entry.id === pitcher.id)) {
        continue;
      }
      bullpen.push(pitcher);
    }
  }

  return {
    teamId,
    lineup,
    pitcher: starter ?? lineup[0]!, // fallback: shouldn't happen
    bullpen,
  };
}

// ---------------------------------------------------------------------------
// Season simulation
// ---------------------------------------------------------------------------

/** Create a fresh season state. */
export function createSeasonState(
  season: number,
  teamIds: string[],
): SeasonState {
  return {
    season,
    currentDay: 1,
    standings: new StandingsTracker(teamIds),
    playerSeasonStats: new Map(),
    gameLog: [],
    completed: false,
    monthlyRecordSplits: {},
  };
}

/**
 * Simulate a single day of the season.
 * Plays all scheduled games for that day.
 */
export function simulateDay(
  rng: GameRNG,
  state: SeasonState,
  schedule: ScheduledGame[],
  allPlayers: GeneratedPlayer[],
  options: SeasonSimulationOptions = {},
): { newState: SeasonState; result: DaySimResult } {
  const dayGames = schedule.filter(g => g.day === state.currentDay);

  const boxScores: GameBoxScore[] = [];
  const nextStandings = StandingsTracker.deserialize(state.standings.serialize());
  const nextPlayerSeasonStats = clonePlayerSeasonStats(state.playerSeasonStats);
  const nextMonthlyRecordSplits = cloneMonthlyRecordSplits(state.monthlyRecordSplits);
  const currentMonth = getRegularSeasonMonthForDay(state.currentDay).month;

  for (const game of dayGames) {
    const homeTeam = buildGameTeam(
      game.homeTeamId,
      allPlayers,
      state.currentDay,
      options.openingDayPlans?.get(game.homeTeamId),
      options.unavailablePlayerIds,
    );
    const awayTeam = buildGameTeam(
      game.awayTeamId,
      allPlayers,
      state.currentDay,
      options.openingDayPlans?.get(game.awayTeamId),
      options.unavailablePlayerIds,
    );

    // Skip if either team can't field a lineup
    if (
      homeTeam.lineup.length < 9
      || awayTeam.lineup.length < 9
      || !homeTeam.pitcher
      || !awayTeam.pitcher
    ) continue;

    const gameRng = rng.fork(); // Fork RNG for each game
    const { boxScore, playerStats } = simulateGame(
      gameRng,
      awayTeam,
      homeTeam,
      `S${state.season}D${state.currentDay}`,
      false,
      {
        awayOffenseModifier: options.teamModifiers?.get(game.awayTeamId),
        homeOffenseModifier: options.teamModifiers?.get(game.homeTeamId),
      },
    );

    boxScores.push(boxScore);

    // Record in standings
    const winnerId = boxScore.homeScore > boxScore.awayScore
      ? boxScore.homeTeamId
      : boxScore.awayTeamId;
    const loserId = winnerId === boxScore.homeTeamId
      ? boxScore.awayTeamId
      : boxScore.homeTeamId;
    const winnerScore = Math.max(boxScore.homeScore, boxScore.awayScore);
    const loserScore = Math.min(boxScore.homeScore, boxScore.awayScore);

    nextStandings.recordGame(
      winnerId,
      loserId,
      winnerScore,
      loserScore,
      isDivisionGame(game.homeTeamId, game.awayTeamId),
    );
    recordMonthlyResult(nextMonthlyRecordSplits, winnerId, currentMonth, 'win');
    recordMonthlyResult(nextMonthlyRecordSplits, loserId, currentMonth, 'loss');

    // Accumulate player season stats
    for (const [playerId, gameStats] of playerStats) {
      const existing = nextPlayerSeasonStats.get(playerId);
      if (existing) {
        existing.pa += gameStats.pa;
        existing.ab += gameStats.ab;
        existing.hits += gameStats.hits;
        existing.doubles += gameStats.doubles;
        existing.triples += gameStats.triples;
        existing.hr += gameStats.hr;
        existing.rbi += gameStats.rbi;
        existing.bb += gameStats.bb;
        existing.k += gameStats.k;
        existing.runs += gameStats.runs;
        existing.hbp += gameStats.hbp;
        existing.sacFlies += gameStats.sacFlies;
        existing.ip += gameStats.ip;
        existing.earnedRuns += gameStats.earnedRuns;
        existing.strikeouts += gameStats.strikeouts;
        existing.walks += gameStats.walks;
        existing.hitsAllowed += gameStats.hitsAllowed;
        existing.homeRunsAllowed += gameStats.homeRunsAllowed;
        existing.hitBatters += gameStats.hitBatters;
        existing.flyBallsAllowed += gameStats.flyBallsAllowed;
        existing.wins += gameStats.wins;
        existing.losses += gameStats.losses;
      } else {
        nextPlayerSeasonStats.set(playerId, clonePlayerGameStats(gameStats));
      }
    }
  }

  // Check if season is complete
  const maxDay = schedule.length > 0
    ? schedule[schedule.length - 1]!.day
    : REGULAR_SEASON_DAYS;
  const nextDay = state.currentDay + 1;
  const seasonComplete = nextDay > maxDay;

  const newState: SeasonState = {
    ...state,
    currentDay: nextDay,
    standings: nextStandings,
    playerSeasonStats: nextPlayerSeasonStats,
    gameLog: [...state.gameLog, ...boxScores],
    completed: seasonComplete,
    monthlyRecordSplits: nextMonthlyRecordSplits,
  };

  return {
    newState,
    result: {
      day: state.currentDay,
      games: boxScores,
      seasonComplete,
    },
  };
}

/**
 * Simulate a full week (7 days) of the season.
 */
export function simulateWeek(
  rng: GameRNG,
  state: SeasonState,
  schedule: ScheduledGame[],
  allPlayers: GeneratedPlayer[],
  options: SeasonSimulationOptions = {},
): { newState: SeasonState; result: DaySimResult } {
  let current = state;
  let lastResult: DaySimResult = { day: state.currentDay, games: [], seasonComplete: false };

  for (let i = 0; i < 7; i++) {
    if (current.completed) break;
    const { newState, result } = simulateDay(rng, current, schedule, allPlayers, options);
    current = newState;
    lastResult = result;
  }

  return { newState: current, result: lastResult };
}

/**
 * Simulate a full month (~30 days) of the season.
 */
export function simulateMonth(
  rng: GameRNG,
  state: SeasonState,
  schedule: ScheduledGame[],
  allPlayers: GeneratedPlayer[],
  options: SeasonSimulationOptions = {},
): { newState: SeasonState; result: DaySimResult } {
  let current = state;
  let lastResult: DaySimResult = { day: state.currentDay, games: [], seasonComplete: false };
  const targetDay = getNextMonthStartDay(state.currentDay);

  while (current.currentDay < targetDay) {
    if (current.completed) break;
    const { newState, result } = simulateDay(rng, current, schedule, allPlayers, options);
    current = newState;
    lastResult = result;
  }

  return { newState: current, result: lastResult };
}
