/**
 * @module seasonSimulator
 * 162-game season simulation with schedule execution and stat accumulation.
 */

import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import type { ScheduledGame } from '../league/schedule.js';
import { isDivisionGame } from '../league/schedule.js';
import { StandingsTracker } from '../league/standings.js';
import type { GameBoxScore, PlayerGameStats, GameTeam } from './gameSimulator.js';
import { simulateGame } from './gameSimulator.js';
import { HITTER_POSITIONS, PITCHER_POSITIONS } from '../player/generation.js';
import { getNextMonthStartDay } from './calendar.js';

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
}

export interface DaySimResult {
  readonly day: number;
  readonly games: GameBoxScore[];
  readonly seasonComplete: boolean;
}

export interface SeasonSimulationOptions {
  readonly teamModifiers?: Map<string, number>;
}

// ---------------------------------------------------------------------------
// Lineup builder
// ---------------------------------------------------------------------------

/** Build a GameTeam from a team's player list. Uses MLB-level players. */
function buildGameTeam(teamId: string, players: GeneratedPlayer[]): GameTeam {
  const mlbPlayers = players.filter(p => p.teamId === teamId && p.rosterStatus === 'MLB');

  const hitters = mlbPlayers
    .filter(p => (HITTER_POSITIONS as readonly string[]).includes(p.position))
    .sort((a, b) => b.overallRating - a.overallRating);

  const pitchers = mlbPlayers
    .filter(p => (PITCHER_POSITIONS as readonly string[]).includes(p.position))
    .sort((a, b) => b.overallRating - a.overallRating);

  // Build 9-player lineup (fill with best available)
  const lineup = hitters.slice(0, 9);

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

  const starter = pitchers.find(p => p.position === 'SP') ?? pitchers[0];
  const bullpen = pitchers.filter(p => p !== starter);

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

  for (const game of dayGames) {
    const homeTeam = buildGameTeam(game.homeTeamId, allPlayers);
    const awayTeam = buildGameTeam(game.awayTeamId, allPlayers);

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

    state.standings.recordGame(
      winnerId,
      loserId,
      winnerScore,
      loserScore,
      isDivisionGame(game.homeTeamId, game.awayTeamId),
    );

    // Accumulate player season stats
    for (const [playerId, gameStats] of playerStats) {
      const existing = state.playerSeasonStats.get(playerId);
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
        state.playerSeasonStats.set(playerId, { ...gameStats });
      }
    }
  }

  // Check if season is complete
  const maxDay = schedule.length > 0
    ? schedule[schedule.length - 1]!.day
    : 162;
  const nextDay = state.currentDay + 1;
  const seasonComplete = nextDay > maxDay;

  const newState: SeasonState = {
    ...state,
    currentDay: nextDay,
    gameLog: [...state.gameLog, ...boxScores],
    completed: seasonComplete,
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
