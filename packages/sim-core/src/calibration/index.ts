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
import {
  buildLeagueAdvancedContext,
  calculateAdvancedStatLine,
} from '../stats/advanced.js';

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
  readonly teamMlbPayrollMin: number;
  readonly teamMlbPayrollMax: number;
  readonly teamMlbPayrollSpread: number;
  readonly battingTotals: SeasonCalibrationBattingTotals;
  readonly battingAverage: number;
  readonly onBasePercentage: number;
  readonly sluggingPercentage: number;
  readonly ops: number;
  readonly leagueEra: number;
  readonly warDistribution: SeasonCalibrationWarDistribution;
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
  readonly averageMlbPayrollSpread: number;
  readonly battingAverage: number;
  readonly onBasePercentage: number;
  readonly sluggingPercentage: number;
  readonly ops: number;
  readonly leagueHomeRuns: number;
  readonly averageLeagueEra: number;
  readonly fiveWarPlayers: number;
  readonly eightWarPlayers: number;
  readonly topWar: number;
  readonly positiveWarPlayers: number;
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
  readonly mlbPayrollSpread: number;
  readonly leagueHomeRuns: number;
  readonly leagueEra: number;
  readonly fiveWarPlayers: number;
  readonly eightWarPlayers: number;
  readonly topWar: number;
}

export interface SeasonCalibrationWarDistribution {
  readonly positiveWarPlayers: number;
  readonly fiveWarPlayers: number;
  readonly eightWarPlayers: number;
  readonly topWar: number;
}

export type CalibrationBandStatus = 'pass' | 'fail';
export type CalibrationFollowUpStatus = 'unmeasured';

export interface CalibrationTargetBand {
  readonly key: string;
  readonly label: string;
  readonly category: string;
  readonly min: number;
  readonly max: number;
  readonly unit: string;
  readonly source: string;
}

export interface CalibrationBandResult extends CalibrationTargetBand {
  readonly value: number;
  readonly status: CalibrationBandStatus;
}

export interface CalibrationFollowUpMetric {
  readonly key: string;
  readonly label: string;
  readonly status: CalibrationFollowUpStatus;
  readonly reason: string;
  readonly nextStep: string;
}

export interface CalibrationWorkerSeasonMetrics {
  readonly seed?: number;
  readonly season: number;
  readonly activeInjuriesAtPlayoffStart: number;
  readonly injuredPlayers: number;
  readonly gamesMissedToInjury: number;
  readonly regularSeasonTrades: number;
  readonly deadlineTrades: number;
  readonly freeAgentSignings: number;
  readonly meaningfulFreeAgentSignings: number;
  readonly topFreeAgentAav: number;
  /** Goal-11: market size at the QO→FA capture boundary. */
  readonly freeAgencyMarketSize: number;
  /** Goal-11 report-only natural expiries observed by the worker sample. */
  readonly naturalContractExpiries: number;
  /** Goal-11 report-only ownership changes across the offseason. */
  readonly offseasonAssignmentChurn: number;
  readonly acceptedExtensions: number;
  readonly rejectedExtensions: number;
  readonly averageProspectProgress: number;
  readonly aheadOfCurveReports: number;
  readonly bustRiskReports: number;
  readonly activeDevelopmentSetbacks: number;
  readonly playoffTeams: number;
  readonly championSeed: number | null;
  readonly lowerSeedSeriesWins: number;
}

export interface CalibrationWorkerSample {
  readonly seed: number;
  readonly seeds?: readonly number[];
  readonly seasonCount: number;
  readonly seasonsPerSeed?: number;
  readonly seasons: readonly CalibrationWorkerSeasonMetrics[];
}

export interface CalibrationReportOptions {
  readonly workerSample?: CalibrationWorkerSample | null;
  readonly onboardingBalanceSample?: CalibrationOnboardingBalanceSample | null;
}

export interface CalibrationReport {
  readonly config: {
    readonly seed: number;
    readonly seasonCount: number;
    readonly teamCount: number;
  };
  readonly summary: SeasonCalibrationSummary;
  readonly bandResults: readonly CalibrationBandResult[];
  readonly workerBandResults: readonly CalibrationBandResult[];
  readonly followUps: readonly CalibrationFollowUpMetric[];
  readonly workerSample?: CalibrationWorkerSample;
  readonly onboardingBalanceSample?: CalibrationOnboardingBalanceSample;
  readonly onboardingBalanceSummary?: CalibrationOnboardingBalanceSummary;
}

export interface CalibrationOnboardingBalanceMetrics {
  readonly ownerTrust: number;
  readonly ownerPressure: number;
  readonly fanSentiment: number;
  readonly frontOfficeReputation: number;
  readonly frontOfficeTrade: number;
  readonly frontOfficeDraft: number;
  readonly freeAgentAppeal: number;
  readonly avgProspectProgress: number;
  readonly aheadOfCurveReports: number;
  readonly bustRiskReports: number;
  readonly activeDevelopmentSetbacks: number;
  readonly draftAccuracy: number;
  readonly internationalAccuracy: number;
  readonly proAccuracy: number;
  readonly focusedScoutingAccuracy: number;
  readonly offLaneScoutingAccuracy: number;
  readonly monthlyConsequenceCount: number;
}

export interface CalibrationOnboardingBalanceVariantSample {
  readonly variantId: string;
  readonly assistantGMId?: string;
  readonly developmentStyle: string;
  readonly scoutingFocus: string;
  readonly baseline: CalibrationOnboardingBalanceMetrics;
  readonly seasons: readonly CalibrationOnboardingBalanceMetrics[];
  readonly final: CalibrationOnboardingBalanceMetrics;
}

export interface CalibrationOnboardingBalanceSample {
  readonly seed: number;
  readonly seasonCount: number;
  readonly variants: readonly CalibrationOnboardingBalanceVariantSample[];
}

export interface CalibrationOnboardingBalanceSummary {
  readonly seed: number;
  readonly seasonCount: number;
  readonly variantCount: number;
  readonly baselineOwnerTrustRange: number;
  readonly baselineFanSentimentRange: number;
  readonly baselineFrontOfficeReputationRange: number;
  readonly baselineFreeAgentAppealRange: number;
  readonly finalOwnerTrustRange: number;
  readonly finalFanSentimentRange: number;
  readonly finalFrontOfficeReputationRange: number;
  readonly finalFreeAgentAppealRange: number;
  readonly finalAvgProspectProgressRange: number;
  readonly averageOwnerTrustDelta: number;
  readonly averageFanSentimentDelta: number;
  readonly averageFrontOfficeReputationDelta: number;
  readonly averageFreeAgentAppealDelta: number;
  readonly averageProspectProgressDelta: number;
  readonly averageFocusedScoutingLift: number;
  readonly aggressiveVsPatientProspectProgressDelta: number;
  readonly minMonthlyConsequenceCount: number;
  readonly maxMonthlyConsequenceCount: number;
}

export const CALIBRATION_TARGET_BANDS: readonly CalibrationTargetBand[] = [
  {
    key: 'schedule.average_team_wins',
    label: 'Average team wins',
    category: 'Schedule',
    min: 76,
    max: 86,
    unit: 'wins',
    source: 'Calibration guard / 162-game target',
  },
  {
    key: 'run_environment.average_runs_per_game',
    label: 'Average runs per game',
    category: 'Run environment',
    min: 7.4,
    max: 9.2,
    unit: 'runs',
    source: 'TUNING.md ERA band translated to both-team scoring',
  },
  {
    key: 'run_environment.batting_average',
    label: 'League batting average',
    category: 'Run environment',
    min: 0.235,
    max: 0.265,
    unit: 'rate',
    source: 'TUNING.md',
  },
  {
    key: 'run_environment.league_era',
    label: 'League ERA',
    category: 'Run environment',
    min: 3.7,
    max: 4.5,
    unit: 'ERA',
    source: 'TUNING.md',
  },
  {
    key: 'run_environment.league_home_runs',
    label: 'League home runs',
    category: 'Run environment',
    min: 5_000,
    max: 7_000,
    unit: 'HR',
    source: 'TUNING.md',
  },
  {
    key: 'finance.average_total_mlb_payroll',
    label: 'Average total MLB payroll',
    category: 'Finance',
    min: 3_800,
    max: 6_800,
    unit: '$M',
    source: 'TUNING.md',
  },
  {
    key: 'finance.average_mlb_salary',
    label: 'Average MLB salary',
    category: 'Finance',
    min: 2.5,
    max: 8.5,
    unit: '$M',
    source: 'TUNING.md',
  },
  {
    key: 'finance.average_mlb_payroll_spread',
    label: 'Average MLB payroll spread',
    category: 'Finance',
    min: 25,
    max: 350,
    unit: '$M',
    source: 'TUNING.md payroll variance guard',
  },
  {
    key: 'war_distribution.five_war_players',
    label: '5+ WAR players',
    category: 'WAR distribution',
    min: 4,
    max: 48,
    unit: 'players',
    source: 'TUNING.md selectivity note',
  },
  {
    key: 'war_distribution.eight_war_players',
    label: '8+ WAR players',
    category: 'WAR distribution',
    min: 0,
    max: 8,
    unit: 'players',
    source: 'TUNING.md rarity note',
  },
];

export const CALIBRATION_WORKER_TARGET_BANDS: readonly CalibrationTargetBand[] = [
  {
    key: 'worker.injured_players',
    label: 'Injured players',
    category: 'Worker injuries',
    min: 50,
    max: 220,
    unit: 'players',
    source: 'TUNING.md worker/offseason sample guard',
  },
  {
    key: 'worker.games_missed_to_injury',
    label: 'Injury games missed',
    category: 'Worker injuries',
    min: 500,
    max: 3_500,
    unit: 'games',
    source: 'TUNING.md worker/offseason sample guard',
  },
  {
    key: 'worker.active_injuries_at_playoff_start',
    label: 'Active injuries at playoff start',
    category: 'Worker injuries',
    min: 30,
    max: 220,
    unit: 'injuries',
    source: 'TUNING.md worker/offseason sample guard',
  },
  {
    key: 'worker.regular_season_trades',
    label: 'Regular-season trades',
    category: 'Worker trades',
    min: 10,
    max: 30,
    unit: 'trades',
    source: 'TUNING.md',
  },
  {
    key: 'worker.deadline_trades',
    label: 'Deadline trades',
    category: 'Worker trades',
    min: 1,
    max: 18,
    unit: 'trades',
    source: 'TUNING.md worker/offseason sample guard',
  },
  {
    key: 'worker.free_agent_signings',
    label: 'FA signings',
    category: 'Worker free agency',
    min: 1,
    max: 40,
    unit: 'signings',
    source: 'TUNING.md',
  },
  {
    key: 'worker.meaningful_free_agent_signings',
    label: 'Meaningful FA signings',
    category: 'Worker free agency',
    min: 1,
    max: 20,
    unit: 'signings',
    source: 'TUNING.md impact-signing note',
  },
  {
    key: 'worker.top_free_agent_aav',
    label: 'Top FA AAV',
    category: 'Worker free agency',
    min: 20,
    max: 45,
    unit: '$M',
    source: 'TUNING.md',
  },
  {
    key: 'worker.free_agency_market_size',
    label: 'FA market at entry',
    category: 'Worker free agency',
    min: 1,
    max: 1089,
    unit: 'players',
    source: 'ECON-CLOCK-1 frozen market guard',
  },
  {
    key: 'worker.accepted_extensions',
    label: 'Accepted extensions',
    category: 'Worker extensions',
    min: 8,
    max: 80,
    unit: 'extensions',
    source: 'TUNING.md extension pressure note',
  },
  {
    key: 'worker.average_prospect_progress',
    label: 'Avg prospect progress',
    category: 'Worker prospects',
    min: 2,
    max: 18,
    unit: 'score',
    source: 'TUNING.md worker/offseason sample guard',
  },
  {
    key: 'worker.ahead_of_curve_reports',
    label: 'Ahead-of-curve reports',
    category: 'Worker prospects',
    min: 1,
    max: 20_000,
    unit: 'reports',
    source: 'TUNING.md worker/prospect sample guard',
  },
  {
    key: 'worker.bust_risk_reports',
    label: 'Bust-risk reports',
    category: 'Worker prospects',
    min: 0,
    max: 500,
    unit: 'reports',
    source: 'TUNING.md worker/prospect sample guard',
  },
  {
    key: 'worker.active_development_setbacks',
    label: 'Active development setbacks',
    category: 'Worker prospects',
    min: 0,
    max: 1_000,
    unit: 'setbacks',
    source: 'TUNING.md worker/prospect sample guard',
  },
  {
    key: 'worker.playoff_teams',
    label: 'Playoff teams',
    category: 'Worker playoffs',
    min: 12,
    max: 12,
    unit: 'teams',
    source: 'Current playoff format',
  },
  {
    key: 'worker.champion_seed',
    label: 'Champion seed',
    category: 'Worker playoffs',
    min: 1,
    max: 12,
    unit: 'seed',
    source: 'Current playoff format',
  },
  {
    key: 'worker.lower_seed_series_wins',
    label: 'Lower-seed series wins',
    category: 'Worker playoffs',
    min: 0,
    max: 12,
    unit: 'series',
    source: 'TUNING.md worker/offseason sample guard',
  },
];

export const CALIBRATION_FOLLOW_UP_METRICS: readonly CalibrationFollowUpMetric[] = [
  {
    key: 'injuries',
    label: 'Injuries',
    status: 'unmeasured',
    reason: 'The season calibration runner currently simulates games without the worker injury pipeline.',
    nextStep: 'Add an extended worker-backed sample that records injury count, IL days, and star-player injury rate.',
  },
  {
    key: 'trades',
    label: 'Trades',
    status: 'unmeasured',
    reason: 'The season calibration runner does not enter trade-deadline worker actions.',
    nextStep: 'Add trade-count and deadline-trade bands to an extended season/offseason sample.',
  },
  {
    key: 'free_agent_signings',
    label: 'Free-agent signings',
    status: 'unmeasured',
    reason: 'The current runner stops at regular-season completion and never processes free agency.',
    nextStep: 'Record impact signings, total signings, and top AAVs from an offseason calibration sample.',
  },
  {
    key: 'extensions',
    label: 'Extensions',
    status: 'unmeasured',
    reason: 'The current runner does not execute the extensions offseason phase.',
    nextStep: 'Track accepted extensions and extension spend in the offseason calibration sample.',
  },
  {
    key: 'prospects',
    label: 'Prospects',
    status: 'unmeasured',
    reason: 'The current runner does not advance minor-league development checkpoints.',
    nextStep: 'Add prospect growth, stagnation, and breakout bands from a multi-season worker sample.',
  },
  {
    key: 'playoff_variance',
    label: 'Playoff variance',
    status: 'unmeasured',
    reason: 'The current runner measures regular-season output only.',
    nextStep: 'Record playoff qualifiers, upset rate, champion seed, and repeat-champion frequency.',
  },
];

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

function valueRange(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.max(...values) - Math.min(...values);
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

function safeInningsPitched(ipOuts: number): number {
  return ipOuts / 3;
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

function leagueEraFromStats(stats: Iterable<PlayerGameStats>): number {
  let earnedRuns = 0;
  let ipOuts = 0;

  for (const statLine of stats) {
    if (statLine.ip <= 0) {
      continue;
    }
    earnedRuns += statLine.earnedRuns;
    ipOuts += statLine.ip;
  }

  const innings = safeInningsPitched(ipOuts);
  return innings <= 0 ? 0 : round((earnedRuns / innings) * 9);
}

function warDistribution(
  players: readonly GeneratedPlayer[],
  playerSeasonStats: Map<string, PlayerGameStats>,
): SeasonCalibrationWarDistribution {
  const context = buildLeagueAdvancedContext([...players], playerSeasonStats);
  const warValues = players
    .map((player) => {
      const stats = playerSeasonStats.get(player.id);
      if (!stats) {
        return null;
      }
      return calculateAdvancedStatLine(player, stats, context).war;
    })
    .filter((war): war is number => war != null && Number.isFinite(war));
  const topWar = warValues.length === 0 ? 0 : round(Math.max(...warValues), 2);

  return {
    positiveWarPlayers: warValues.filter((war) => war > 0).length,
    fiveWarPlayers: warValues.filter((war) => war >= 5).length,
    eightWarPlayers: warValues.filter((war) => war >= 8).length,
    topWar,
  };
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
  const mlbPayrolls = payrolls.map((payroll) => payroll.mlbPayroll);
  const mlbPlayers = players.filter((player) => teamIdSet.has(player.teamId) && player.rosterStatus === 'MLB');
  const totalMlbPayroll = round(payrolls.reduce((sum, payroll) => sum + payroll.mlbPayroll, 0), 2);
  const averageMlbPayroll = round(totalMlbPayroll / Math.max(teamIds.length, 1), 2);
  const averageMlbSalary = round(average(mlbPlayers.map((player) => player.contract.annualSalary)), 2);
  const teamMlbPayrollMin = round(Math.min(...mlbPayrolls), 2);
  const teamMlbPayrollMax = round(Math.max(...mlbPayrolls), 2);

  return {
    totalMlbPayroll,
    averageMlbPayroll,
    averageMlbSalary,
    teamMlbPayrollMin,
    teamMlbPayrollMax,
    teamMlbPayrollSpread: round(teamMlbPayrollMax - teamMlbPayrollMin, 2),
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
  const leagueEra = leagueEraFromStats(state.playerSeasonStats.values());
  const seasonWarDistribution = warDistribution(players, state.playerSeasonStats);
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
    teamMlbPayrollMin: payroll.teamMlbPayrollMin,
    teamMlbPayrollMax: payroll.teamMlbPayrollMax,
    teamMlbPayrollSpread: payroll.teamMlbPayrollSpread,
    battingTotals,
    battingAverage: battingAverage(battingTotals),
    onBasePercentage: onBasePercentage(battingTotals),
    sluggingPercentage: sluggingPercentage(battingTotals),
    ops: ops(battingTotals),
    leagueEra,
    warDistribution: seasonWarDistribution,
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
  const leagueHomeRuns = Math.round(average(
    result.seasons.map((season) => season.battingTotals.homeRuns),
  ));

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
    averageMlbPayrollSpread: round(average(result.seasons.map((season) => season.teamMlbPayrollSpread)), 2),
    battingAverage: battingAverage(battingTotals),
    onBasePercentage: onBasePercentage(battingTotals),
    sluggingPercentage: sluggingPercentage(battingTotals),
    ops: ops(battingTotals),
    leagueHomeRuns,
    averageLeagueEra: round(average(result.seasons.map((season) => season.leagueEra))),
    fiveWarPlayers: Math.round(average(result.seasons.map((season) => season.warDistribution.fiveWarPlayers))),
    eightWarPlayers: Math.round(average(result.seasons.map((season) => season.warDistribution.eightWarPlayers))),
    topWar: round(average(result.seasons.map((season) => season.warDistribution.topWar)), 2),
    positiveWarPlayers: Math.round(average(result.seasons.map((season) => season.warDistribution.positiveWarPlayers))),
    seasons: result.seasons.map((season) => ({
      season: season.season,
      gamesPlayed: season.gamesPlayed,
      averageRunsPerGame: season.averageRunsPerGame,
      averageTeamWins: season.averageTeamWins,
      teamWinSpread: season.teamWinSpread,
      totalMlbPayroll: season.totalMlbPayroll,
      averageMlbSalary: season.averageMlbSalary,
      mlbPayrollSpread: season.teamMlbPayrollSpread,
      leagueHomeRuns: season.battingTotals.homeRuns,
      leagueEra: season.leagueEra,
      fiveWarPlayers: season.warDistribution.fiveWarPlayers,
      eightWarPlayers: season.warDistribution.eightWarPlayers,
      topWar: season.warDistribution.topWar,
    })),
  };
}

function valueForBand(summary: SeasonCalibrationSummary, key: string): number {
  switch (key) {
    case 'schedule.average_team_wins':
      return summary.averageTeamWins;
    case 'run_environment.average_runs_per_game':
      return summary.averageRunsPerGame;
    case 'run_environment.batting_average':
      return summary.battingAverage;
    case 'run_environment.league_era':
      return summary.averageLeagueEra;
    case 'run_environment.league_home_runs':
      return summary.leagueHomeRuns;
    case 'finance.average_total_mlb_payroll':
      return summary.averageTotalMlbPayroll;
    case 'finance.average_mlb_salary':
      return summary.averageMlbSalary;
    case 'finance.average_mlb_payroll_spread':
      return summary.averageMlbPayrollSpread;
    case 'war_distribution.five_war_players':
      return summary.fiveWarPlayers;
    case 'war_distribution.eight_war_players':
      return summary.eightWarPlayers;
    default:
      throw new Error(`Unknown calibration target band: ${key}`);
  }
}

function statusForBand(value: number, band: CalibrationTargetBand): CalibrationBandStatus {
  return value >= band.min && value <= band.max ? 'pass' : 'fail';
}

function valueForWorkerBand(sample: CalibrationWorkerSample, key: string): number {
  const seasons = sample.seasons;
  switch (key) {
    case 'worker.injured_players':
      return round(average(seasons.map((season) => season.injuredPlayers)), 2);
    case 'worker.games_missed_to_injury':
      return round(average(seasons.map((season) => season.gamesMissedToInjury)), 2);
    case 'worker.active_injuries_at_playoff_start':
      return round(average(seasons.map((season) => season.activeInjuriesAtPlayoffStart)), 2);
    case 'worker.regular_season_trades':
      return round(average(seasons.map((season) => season.regularSeasonTrades)), 2);
    case 'worker.deadline_trades':
      return round(average(seasons.map((season) => season.deadlineTrades)), 2);
    case 'worker.free_agent_signings':
      return round(average(seasons.map((season) => season.freeAgentSignings)), 2);
    case 'worker.meaningful_free_agent_signings':
      return round(average(seasons.map((season) => season.meaningfulFreeAgentSignings)), 2);
    case 'worker.top_free_agent_aav':
      return round(average(seasons.map((season) => season.topFreeAgentAav)), 2);
    case 'worker.free_agency_market_size':
      return round(average(seasons.map((season) => season.freeAgencyMarketSize)), 2);
    case 'worker.accepted_extensions':
      return round(average(seasons.map((season) => season.acceptedExtensions)), 2);
    case 'worker.average_prospect_progress':
      return round(average(seasons.map((season) => season.averageProspectProgress)), 2);
    case 'worker.ahead_of_curve_reports':
      return round(average(seasons.map((season) => season.aheadOfCurveReports)), 2);
    case 'worker.bust_risk_reports':
      return round(average(seasons.map((season) => season.bustRiskReports)), 2);
    case 'worker.active_development_setbacks':
      return round(average(seasons.map((season) => season.activeDevelopmentSetbacks)), 2);
    case 'worker.playoff_teams':
      return round(average(seasons.map((season) => season.playoffTeams)), 2);
    case 'worker.champion_seed':
      return round(average(seasons.map((season) => season.championSeed ?? 0)), 2);
    case 'worker.lower_seed_series_wins':
      return round(average(seasons.map((season) => season.lowerSeedSeriesWins)), 2);
    default:
      throw new Error(`Unknown worker calibration target band: ${key}`);
  }
}

function formatMetricValue(value: number, unit: string): string {
  if (unit === 'rate') {
    return value.toFixed(3);
  }
  if (unit === '$M') {
    return value.toFixed(2);
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(3);
}

function formatTargetRange(band: CalibrationTargetBand): string {
  return `${formatMetricValue(band.min, band.unit)}-${formatMetricValue(band.max, band.unit)} ${band.unit}`;
}

function describeWorkerSample(sample: CalibrationWorkerSample): string {
  const seeds = sample.seeds ?? [sample.seed];
  if (seeds.length <= 1) {
    return `Seed ${sample.seed}, ${sample.seasonCount} season${sample.seasonCount === 1 ? '' : 's'}.`;
  }

  const perSeed = sample.seasonsPerSeed == null
    ? ''
    : ` (${sample.seasonsPerSeed} per seed)`;
  return `Seeds ${seeds.join(', ')}, ${sample.seasonCount} total season${sample.seasonCount === 1 ? '' : 's'}${perSeed}.`;
}

export function summarizeOnboardingBalanceSample(
  sample: CalibrationOnboardingBalanceSample,
): CalibrationOnboardingBalanceSummary {
  if (sample.variants.length === 0) {
    throw new Error('Onboarding balance sample requires at least one variant.');
  }

  const baselines = sample.variants.map((variant) => variant.baseline);
  const finals = sample.variants.map((variant) => variant.final);
  const variantsByDevelopmentStyle = (developmentStyle: string) =>
    sample.variants.filter((variant) => variant.developmentStyle === developmentStyle);
  const averageFinalProgressForStyle = (developmentStyle: string) =>
    average(variantsByDevelopmentStyle(developmentStyle).map((variant) => variant.final.avgProspectProgress));
  const aggressiveProgress = averageFinalProgressForStyle('aggressive');
  const patientProgress = averageFinalProgressForStyle('patient');

  return {
    seed: sample.seed,
    seasonCount: sample.seasonCount,
    variantCount: sample.variants.length,
    baselineOwnerTrustRange: round(valueRange(baselines.map((entry) => entry.ownerTrust)), 2),
    baselineFanSentimentRange: round(valueRange(baselines.map((entry) => entry.fanSentiment)), 2),
    baselineFrontOfficeReputationRange: round(valueRange(baselines.map((entry) => entry.frontOfficeReputation)), 2),
    baselineFreeAgentAppealRange: round(valueRange(baselines.map((entry) => entry.freeAgentAppeal)), 2),
    finalOwnerTrustRange: round(valueRange(finals.map((entry) => entry.ownerTrust)), 2),
    finalFanSentimentRange: round(valueRange(finals.map((entry) => entry.fanSentiment)), 2),
    finalFrontOfficeReputationRange: round(valueRange(finals.map((entry) => entry.frontOfficeReputation)), 2),
    finalFreeAgentAppealRange: round(valueRange(finals.map((entry) => entry.freeAgentAppeal)), 2),
    finalAvgProspectProgressRange: round(valueRange(finals.map((entry) => entry.avgProspectProgress)), 2),
    averageOwnerTrustDelta: round(average(sample.variants.map((variant) =>
      variant.final.ownerTrust - variant.baseline.ownerTrust,
    )), 2),
    averageFanSentimentDelta: round(average(sample.variants.map((variant) =>
      variant.final.fanSentiment - variant.baseline.fanSentiment,
    )), 2),
    averageFrontOfficeReputationDelta: round(average(sample.variants.map((variant) =>
      variant.final.frontOfficeReputation - variant.baseline.frontOfficeReputation,
    )), 2),
    averageFreeAgentAppealDelta: round(average(sample.variants.map((variant) =>
      variant.final.freeAgentAppeal - variant.baseline.freeAgentAppeal,
    )), 2),
    averageProspectProgressDelta: round(average(sample.variants.map((variant) =>
      variant.final.avgProspectProgress - variant.baseline.avgProspectProgress,
    )), 2),
    averageFocusedScoutingLift: round(average(finals.map((entry) =>
      entry.focusedScoutingAccuracy - entry.offLaneScoutingAccuracy,
    )), 3),
    aggressiveVsPatientProspectProgressDelta: round(aggressiveProgress - patientProgress, 2),
    minMonthlyConsequenceCount: Math.min(...finals.map((entry) => entry.monthlyConsequenceCount)),
    maxMonthlyConsequenceCount: Math.max(...finals.map((entry) => entry.monthlyConsequenceCount)),
  };
}

export function buildCalibrationReport(
  config: SeasonCalibrationConfig,
  options: CalibrationReportOptions = {},
): CalibrationReport {
  const result = runSeasonCalibration(config);
  const summary = summarizeSeasonCalibration(result);
  const bandResults = CALIBRATION_TARGET_BANDS.map((band) => {
    const value = valueForBand(summary, band.key);
    return {
      ...band,
      value,
      status: statusForBand(value, band),
    };
  });
  const workerSample = options.workerSample ?? null;
  const onboardingBalanceSample = options.onboardingBalanceSample ?? null;
  const onboardingBalanceSummary = onboardingBalanceSample
    ? summarizeOnboardingBalanceSample(onboardingBalanceSample)
    : null;
  const workerBandResults = workerSample
    ? CALIBRATION_WORKER_TARGET_BANDS.map((band) => {
      const value = valueForWorkerBand(workerSample, band.key);
      return {
        ...band,
        value,
        status: statusForBand(value, band),
      };
    })
    : [];

  return {
    config: {
      seed: result.seed,
      seasonCount: result.seasonCount,
      teamCount: result.teamIds.length,
    },
    summary,
    bandResults,
    workerBandResults,
    followUps: workerSample ? [] : CALIBRATION_FOLLOW_UP_METRICS,
    ...(workerSample ? { workerSample } : {}),
    ...(onboardingBalanceSample && onboardingBalanceSummary
      ? { onboardingBalanceSample, onboardingBalanceSummary }
      : {}),
  };
}

export function renderCalibrationMarkdown(report: CalibrationReport): string {
  const lines: string[] = [];
  lines.push(`# Calibration Dump - seed ${report.config.seed}, ${report.config.seasonCount} season${report.config.seasonCount === 1 ? '' : 's'}`);
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| Total games | ${report.summary.totalGames} |`);
  lines.push(`| Avg runs per game | ${report.summary.averageRunsPerGame.toFixed(3)} |`);
  lines.push(`| Avg team wins | ${report.summary.averageTeamWins.toFixed(2)} |`);
  lines.push(`| Team win spread | ${report.summary.teamWinSpread} |`);
  lines.push(`| Avg total MLB payroll ($M) | ${report.summary.averageTotalMlbPayroll.toFixed(2)} |`);
  lines.push(`| Avg MLB salary ($M) | ${report.summary.averageMlbSalary.toFixed(2)} |`);
  lines.push(`| Avg MLB payroll spread ($M) | ${report.summary.averageMlbPayrollSpread.toFixed(2)} |`);
  lines.push(`| League batting average | ${report.summary.battingAverage.toFixed(3)} |`);
  lines.push(`| League ERA | ${report.summary.averageLeagueEra.toFixed(3)} |`);
  lines.push(`| League home runs | ${report.summary.leagueHomeRuns} |`);
  lines.push(`| 5+ WAR players | ${report.summary.fiveWarPlayers} |`);
  lines.push(`| 8+ WAR players | ${report.summary.eightWarPlayers} |`);
  lines.push(`| Top WAR | ${report.summary.topWar.toFixed(2)} |`);
  lines.push('');
  lines.push('## Target Bands');
  lines.push('');
  lines.push('| Metric | Value | Target | Status |');
  lines.push('| --- | ---: | ---: | --- |');
  for (const band of report.bandResults) {
    lines.push(`| ${band.label} | ${formatMetricValue(band.value, band.unit)} ${band.unit} | ${formatTargetRange(band)} | ${band.status.toUpperCase()} |`);
  }
  lines.push('');
  lines.push('## Seasons');
  lines.push('');
  lines.push('| Season | Games | R/G | Avg Wins | Spread | Payroll ($M) | Avg Salary ($M) | Payroll Spread ($M) | HR | ERA | 5+ WAR | 8+ WAR | Top WAR |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const season of report.summary.seasons) {
    lines.push(`| ${season.season} | ${season.gamesPlayed} | ${season.averageRunsPerGame.toFixed(3)} | ${season.averageTeamWins.toFixed(2)} | ${season.teamWinSpread} | ${season.totalMlbPayroll.toFixed(2)} | ${season.averageMlbSalary.toFixed(2)} | ${season.mlbPayrollSpread.toFixed(2)} | ${season.leagueHomeRuns} | ${season.leagueEra.toFixed(3)} | ${season.fiveWarPlayers} | ${season.eightWarPlayers} | ${season.topWar.toFixed(2)} |`);
  }
  lines.push('');

  if (report.workerSample) {
    lines.push('## Worker and Offseason Sample');
    lines.push('');
    lines.push(describeWorkerSample(report.workerSample));
    lines.push('');
    const showSeedColumn = report.workerSample.seasons.some((season) => season.seed != null) ||
      (report.workerSample.seeds?.length ?? 0) > 1;
    lines.push(showSeedColumn
      ? '| Seed | Season | Injured players | Injury games missed | Active injuries | Trades | Deadline trades | FA signings | Meaningful FA signings | Top FA AAV ($M) | Accepted extensions | Rejected extensions | Avg prospect progress | Ahead reports | Bust reports | Setbacks | Playoff teams | Champion seed | Lower-seed series wins |'
      : '| Season | Injured players | Injury games missed | Active injuries | Trades | Deadline trades | FA signings | Meaningful FA signings | Top FA AAV ($M) | Accepted extensions | Rejected extensions | Avg prospect progress | Ahead reports | Bust reports | Setbacks | Playoff teams | Champion seed | Lower-seed series wins |');
    lines.push(showSeedColumn
      ? '| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
      : '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const season of report.workerSample.seasons) {
      const row = `| ${season.season} | ${season.injuredPlayers} | ${season.gamesMissedToInjury} | ${season.activeInjuriesAtPlayoffStart} | ${season.regularSeasonTrades} | ${season.deadlineTrades} | ${season.freeAgentSignings} | ${season.meaningfulFreeAgentSignings} | ${season.topFreeAgentAav.toFixed(2)} | ${season.acceptedExtensions} | ${season.rejectedExtensions} | ${season.averageProspectProgress.toFixed(2)} | ${season.aheadOfCurveReports} | ${season.bustRiskReports} | ${season.activeDevelopmentSetbacks} | ${season.playoffTeams} | ${season.championSeed ?? 'n/a'} | ${season.lowerSeedSeriesWins} |`;
      lines.push(showSeedColumn ? `| ${season.seed ?? report.workerSample.seed} ${row}` : row);
    }
    lines.push('');
    lines.push('Goal-11 report-only metrics (relational invariants and exact attribution are enforced by the ECON-CLOCK-1 worker soak):');
    lines.push('');
    lines.push('| Metric | Average |');
    lines.push('| --- | ---: |');
    lines.push(`| Natural contract expiries | ${formatMetricValue(average(report.workerSample.seasons.map((season) => season.naturalContractExpiries)), 'players')} |`);
    lines.push(`| Offseason assignment churn | ${formatMetricValue(average(report.workerSample.seasons.map((season) => season.offseasonAssignmentChurn)), 'players')} |`);
    lines.push('');
  }

  if (report.workerBandResults.length > 0) {
    lines.push('## Worker Target Bands');
    lines.push('');
    lines.push('| Metric | Value | Target | Status |');
    lines.push('| --- | ---: | ---: | --- |');
    for (const band of report.workerBandResults) {
      lines.push(`| ${band.label} | ${formatMetricValue(band.value, band.unit)} ${band.unit} | ${formatTargetRange(band)} | ${band.status.toUpperCase()} |`);
    }
    lines.push('');
  }

  if (report.onboardingBalanceSample && report.onboardingBalanceSummary) {
    const summary = report.onboardingBalanceSummary;
    lines.push('## Onboarding Balance Sample');
    lines.push('');
    lines.push(`Seed ${summary.seed}, ${summary.variantCount} variants, ${summary.seasonCount} season${summary.seasonCount === 1 ? '' : 's'} per variant.`);
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('| --- | ---: |');
    lines.push(`| Day One baseline owner trust range | ${summary.baselineOwnerTrustRange.toFixed(2)} |`);
    lines.push(`| Day One baseline fan sentiment range | ${summary.baselineFanSentimentRange.toFixed(2)} |`);
    lines.push(`| Final owner trust range | ${summary.finalOwnerTrustRange.toFixed(2)} |`);
    lines.push(`| Final front-office reputation range | ${summary.finalFrontOfficeReputationRange.toFixed(2)} |`);
    lines.push(`| Final free-agent appeal range | ${summary.finalFreeAgentAppealRange.toFixed(2)} |`);
    lines.push(`| Final prospect progress range | ${summary.finalAvgProspectProgressRange.toFixed(2)} |`);
    lines.push(`| Average owner trust delta | ${summary.averageOwnerTrustDelta.toFixed(2)} |`);
    lines.push(`| Average fan sentiment delta | ${summary.averageFanSentimentDelta.toFixed(2)} |`);
    lines.push(`| Average front-office reputation delta | ${summary.averageFrontOfficeReputationDelta.toFixed(2)} |`);
    lines.push(`| Average free-agent appeal delta | ${summary.averageFreeAgentAppealDelta.toFixed(2)} |`);
    lines.push(`| Average prospect progress delta | ${summary.averageProspectProgressDelta.toFixed(2)} |`);
    lines.push(`| Average focused scouting lift | ${summary.averageFocusedScoutingLift.toFixed(3)} |`);
    lines.push(`| Aggressive vs patient prospect progress delta | ${summary.aggressiveVsPatientProspectProgressDelta.toFixed(2)} |`);
    lines.push(`| Monthly consequence count range | ${summary.minMonthlyConsequenceCount}-${summary.maxMonthlyConsequenceCount} |`);
    lines.push('');
    lines.push('| Variant | Development | Scouting focus | Baseline trust | Final trust | Final prospect progress | Monthly consequences |');
    lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: |');
    for (const variant of report.onboardingBalanceSample.variants) {
      lines.push(`| ${variant.variantId} | ${variant.developmentStyle} | ${variant.scoutingFocus} | ${variant.baseline.ownerTrust} | ${variant.final.ownerTrust} | ${variant.final.avgProspectProgress.toFixed(2)} | ${variant.final.monthlyConsequenceCount} |`);
    }
    lines.push('');
  }

  if (report.followUps.length > 0) {
    lines.push('## Follow-up Metrics Not Yet Measured');
    lines.push('');
    lines.push('| Metric | Reason | Next step |');
    lines.push('| --- | --- | --- |');
    for (const followUp of report.followUps) {
      lines.push(`| ${followUp.label} | ${followUp.reason} | ${followUp.nextStep} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function renderCalibrationJson(report: CalibrationReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
