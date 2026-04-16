/**
 * @module calibration
 * Deterministic season-level calibration harness for broad baseball plausibility
 * checks. This module collects metrics only; it does not mutate save schemas or
 * browser-facing state.
 */

import { calculateTeamPayroll } from '../finance/index.js';
import { generateSchedule } from '../league/schedule.js';
import { TEAMS } from '../league/teams.js';
import { GameRNG } from '../math/prng.js';
import { generateLeaguePlayers } from '../player/generation.js';
import type { GeneratedPlayer } from '../player/generation.js';
import type { PlayerGameStats } from '../sim/gameSimulator.js';
import { createSeasonState, simulateDay } from '../sim/seasonSimulator.js';
import type { SeasonState } from '../sim/seasonSimulator.js';

export interface SeasonCalibrationConfig {
  readonly seed: number;
  readonly seasonCount: number;
  readonly teamIds?: readonly string[];
}

export interface SeasonCalibrationTeamRecord {
  readonly teamId: string;
  readonly wins: number;
  readonly losses: number;
  readonly runsScored: number;
  readonly runsAllowed: number;
  readonly runDifferential: number;
}

export interface SeasonCalibrationBattingTotals {
  readonly pa: number;
  readonly ab: number;
  readonly hits: number;
  readonly doubles: number;
  readonly triples: number;
  readonly homeRuns: number;
  readonly walks: number;
  readonly hitByPitch: number;
  readonly sacrificeFlies: number;
}

export interface SeasonCalibrationSeason {
  readonly season: number;
  readonly scheduleGames: number;
  readonly gamesPlayed: number;
  readonly totalWins: number;
  readonly totalLosses: number;
  readonly totalRuns: number;
  readonly averageRunsPerGame: number;
  readonly averageTeamWins: number;
  readonly teamWinMin: number;
  readonly teamWinMax: number;
  readonly teamWinSpread: number;
  readonly totalMlbPayroll: number;
  readonly averageMlbPayroll: number;
  readonly averageMlbSalary: number;
  readonly battingTotals: SeasonCalibrationBattingTotals;
  readonly battingAverage: number;
  readonly onBasePercentage: number;
  readonly sluggingPercentage: number;
  readonly ops: number;
  readonly teamRecords: readonly SeasonCalibrationTeamRecord[];
}

export interface SeasonCalibrationResult {
  readonly seed: number;
  readonly seasonCount: number;
  readonly teamIds: readonly string[];
  readonly seasons: readonly SeasonCalibrationSeason[];
}

export interface SeasonCalibrationSummary {
  readonly seed: number;
  readonly seasonCount: number;
  readonly totalGames: number;
  readonly averageRunsPerGame: number;
  readonly averageTeamWins: number;
  readonly teamWinMin: number;
  readonly teamWinMax: number;
  readonly teamWinSpread: number;
  readonly averageTotalMlbPayroll: number;
  readonly averageMlbPayroll: number;
  readonly averageMlbSalary: number;
  readonly battingAverage: number;
  readonly onBasePercentage: number;
  readonly sluggingPercentage: number;
  readonly ops: number;
  readonly seasons: readonly SeasonCalibrationSeasonSummary[];
}

export interface SeasonCalibrationSeasonSummary {
  readonly season: number;
  readonly gamesPlayed: number;
  readonly averageRunsPerGame: number;
  readonly averageTeamWins: number;
  readonly teamWinSpread: number;
  readonly totalMlbPayroll: number;
  readonly averageMlbSalary: number;
}

function assertInteger(value: number, name: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer.`);
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
}

function round(value: number, places = 3): number {
  const multiplier = 10 ** places;
  return Math.round(value * multiplier) / multiplier;
}

function rate(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : round(numerator / denominator);
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function singles(totals: SeasonCalibrationBattingTotals): number {
  return totals.hits - totals.doubles - totals.triples - totals.homeRuns;
}

function battingAverage(totals: SeasonCalibrationBattingTotals): number {
  return rate(totals.hits, totals.ab);
}

function onBasePercentage(totals: SeasonCalibrationBattingTotals): number {
  return rate(
    totals.hits + totals.walks + totals.hitByPitch,
    totals.ab + totals.walks + totals.hitByPitch + totals.sacrificeFlies,
  );
}

function sluggingPercentage(totals: SeasonCalibrationBattingTotals): number {
  return rate(
    singles(totals) + (2 * totals.doubles) + (3 * totals.triples) + (4 * totals.homeRuns),
    totals.ab,
  );
}

function ops(totals: SeasonCalibrationBattingTotals): number {
  return round(onBasePercentage(totals) + sluggingPercentage(totals));
}

function addBattingTotals(
  left: SeasonCalibrationBattingTotals,
  right: SeasonCalibrationBattingTotals,
): SeasonCalibrationBattingTotals {
  return {
    pa: left.pa + right.pa,
    ab: left.ab + right.ab,
    hits: left.hits + right.hits,
    doubles: left.doubles + right.doubles,
    triples: left.triples + right.triples,
    homeRuns: left.homeRuns + right.homeRuns,
    walks: left.walks + right.walks,
    hitByPitch: left.hitByPitch + right.hitByPitch,
    sacrificeFlies: left.sacrificeFlies + right.sacrificeFlies,
  };
}

function battingTotalsFromStats(stats: Iterable<PlayerGameStats>): SeasonCalibrationBattingTotals {
  let totals: SeasonCalibrationBattingTotals = {
    pa: 0,
    ab: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    walks: 0,
    hitByPitch: 0,
    sacrificeFlies: 0,
  };

  for (const statLine of stats) {
    totals = addBattingTotals(totals, {
      pa: statLine.pa,
      ab: statLine.ab,
      hits: statLine.hits,
      doubles: statLine.doubles,
      triples: statLine.triples,
      homeRuns: statLine.hr,
      walks: statLine.bb,
      hitByPitch: statLine.hbp,
      sacrificeFlies: statLine.sacFlies,
    });
  }

  return totals;
}

function createTeamRecords(state: SeasonState): SeasonCalibrationTeamRecord[] {
  return state.standings.serialize()
    .map((record) => ({
      teamId: record.teamId,
      wins: record.wins,
      losses: record.losses,
      runsScored: record.runsScored,
      runsAllowed: record.runsAllowed,
      runDifferential: record.runsScored - record.runsAllowed,
    }))
    .sort((left, right) => left.teamId.localeCompare(right.teamId));
}

function totalRuns(state: SeasonState): number {
  return state.gameLog.reduce(
    (sum, game) => sum + game.homeScore + game.awayScore,
    0,
  );
}

function payrollSummary(players: readonly GeneratedPlayer[], teamIds: readonly string[]) {
  const teamIdSet = new Set(teamIds);
  const payrolls = teamIds.map((teamId) => calculateTeamPayroll(teamId, [...players]));
  const mlbPlayers = players.filter((player) => teamIdSet.has(player.teamId) && player.rosterStatus === 'MLB');
  const totalMlbPayroll = round(payrolls.reduce((sum, payroll) => sum + payroll.mlbPayroll, 0), 2);
  const averageMlbPayroll = round(totalMlbPayroll / Math.max(teamIds.length, 1), 2);
  const averageMlbSalary = round(average(mlbPlayers.map((player) => player.contract.annualSalary)), 2);

  return {
    totalMlbPayroll,
    averageMlbPayroll,
    averageMlbSalary,
  };
}

function summarizeSeason(
  season: number,
  scheduleGames: number,
  state: SeasonState,
  players: readonly GeneratedPlayer[],
  teamIds: readonly string[],
): SeasonCalibrationSeason {
  const teamRecords = createTeamRecords(state);
  const wins = teamRecords.map((record) => record.wins);
  const totalWins = wins.reduce((sum, value) => sum + value, 0);
  const totalLosses = teamRecords.reduce((sum, record) => sum + record.losses, 0);
  const gamesPlayed = state.gameLog.length;
  const runs = totalRuns(state);
  const battingTotals = battingTotalsFromStats(state.playerSeasonStats.values());
  const payroll = payrollSummary(players, teamIds);
  const teamWinMin = Math.min(...wins);
  const teamWinMax = Math.max(...wins);

  return {
    season,
    scheduleGames,
    gamesPlayed,
    totalWins,
    totalLosses,
    totalRuns: runs,
    averageRunsPerGame: round(runs / Math.max(gamesPlayed, 1)),
    averageTeamWins: round(totalWins / Math.max(teamIds.length, 1)),
    teamWinMin,
    teamWinMax,
    teamWinSpread: teamWinMax - teamWinMin,
    totalMlbPayroll: payroll.totalMlbPayroll,
    averageMlbPayroll: payroll.averageMlbPayroll,
    averageMlbSalary: payroll.averageMlbSalary,
    battingTotals,
    battingAverage: battingAverage(battingTotals),
    onBasePercentage: onBasePercentage(battingTotals),
    sluggingPercentage: sluggingPercentage(battingTotals),
    ops: ops(battingTotals),
    teamRecords,
  };
}

function runOneSeason(
  season: number,
  rng: GameRNG,
  teamIds: readonly string[],
): SeasonCalibrationSeason {
  const teamIdSet = new Set(teamIds);
  const players = generateLeaguePlayers(rng.fork(), [...teamIds]);
  const schedule = generateSchedule(rng.fork())
    .filter((game) => teamIdSet.has(game.homeTeamId) && teamIdSet.has(game.awayTeamId));
  let state = createSeasonState(season, [...teamIds]);
  const simRng = rng.fork();

  while (!state.completed) {
    state = simulateDay(simRng, state, schedule, players).newState;
  }

  return summarizeSeason(season, schedule.length, state, players, teamIds);
}

export function runSeasonCalibration(config: SeasonCalibrationConfig): SeasonCalibrationResult {
  assertInteger(config.seed, 'seed');
  assertPositiveInteger(config.seasonCount, 'seasonCount');

  const teamIds = config.teamIds == null ? TEAMS.map((team) => team.id) : [...config.teamIds];
  if (teamIds.length < 2) {
    throw new Error('teamIds must include at least two teams.');
  }

  const rng = new GameRNG(config.seed);
  const seasons = Array.from({ length: config.seasonCount }, (_, index) =>
    runOneSeason(index + 1, rng.fork(), teamIds),
  );

  return {
    seed: config.seed,
    seasonCount: config.seasonCount,
    teamIds,
    seasons,
  };
}

export function summarizeSeasonCalibration(result: SeasonCalibrationResult): SeasonCalibrationSummary {
  const battingTotals = result.seasons.reduce(
    (totals, season) => addBattingTotals(totals, season.battingTotals),
    {
      pa: 0,
      ab: 0,
      hits: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      walks: 0,
      hitByPitch: 0,
      sacrificeFlies: 0,
    } satisfies SeasonCalibrationBattingTotals,
  );
  const allWinCounts = result.seasons.flatMap((season) =>
    season.teamRecords.map((record) => record.wins),
  );
  const teamWinMin = Math.min(...allWinCounts);
  const teamWinMax = Math.max(...allWinCounts);
  const totalRuns = result.seasons.reduce((sum, season) => sum + season.totalRuns, 0);
  const totalGames = result.seasons.reduce((sum, season) => sum + season.gamesPlayed, 0);

  return {
    seed: result.seed,
    seasonCount: result.seasonCount,
    totalGames,
    averageRunsPerGame: round(totalRuns / Math.max(totalGames, 1)),
    averageTeamWins: round(average(result.seasons.map((season) => season.averageTeamWins))),
    teamWinMin,
    teamWinMax,
    teamWinSpread: teamWinMax - teamWinMin,
    averageTotalMlbPayroll: round(average(result.seasons.map((season) => season.totalMlbPayroll)), 2),
    averageMlbPayroll: round(average(result.seasons.map((season) => season.averageMlbPayroll)), 2),
    averageMlbSalary: round(average(result.seasons.map((season) => season.averageMlbSalary)), 2),
    battingAverage: battingAverage(battingTotals),
    onBasePercentage: onBasePercentage(battingTotals),
    sluggingPercentage: sluggingPercentage(battingTotals),
    ops: ops(battingTotals),
    seasons: result.seasons.map((season) => ({
      season: season.season,
      gamesPlayed: season.gamesPlayed,
      averageRunsPerGame: season.averageRunsPerGame,
      averageTeamWins: season.averageTeamWins,
      teamWinSpread: season.teamWinSpread,
      totalMlbPayroll: season.totalMlbPayroll,
      averageMlbSalary: season.averageMlbSalary,
    })),
  };
}
