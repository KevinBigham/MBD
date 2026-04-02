export {
  resolvePlateAppearance,
} from './plateAppearance.js';
export type {
  PAOutcome,
  PAContext,
  PAResult,
} from './plateAppearance.js';

export {
  advanceRunners,
  freshRunnerState,
} from './markov.js';
export type {
  BaseState,
  RunnerState,
  MarkovResult,
} from './markov.js';

export {
  simulateGame,
} from './gameSimulator.js';
export type {
  GameTeam,
  GameBoxScore,
  PlayerGameStats,
} from './gameSimulator.js';

export {
  REGULAR_SEASON_MONTHS,
  getDaysUntilTradeDeadline,
  getRegularSeasonMonthForDay,
  getTradeDeadlineDay,
  getNextMonthStartDay,
  isTradeDeadlineModeDay,
} from './calendar.js';
export type {
  RegularSeasonMonth,
} from './calendar.js';

export {
  createSeasonState,
  simulateDay,
  simulateWeek,
  simulateMonth,
} from './seasonSimulator.js';
export type {
  SeasonState,
  DaySimResult,
} from './seasonSimulator.js';

export {
  buildPlayoffPreview,
  determinePlayoffSeeds,
  initializePlayoffBracket,
  simPlayoffGame,
  simNextPlayoffGame,
  simPlayoffSeries,
  simPlayoffRound,
  advancePlayoffRound,
  isPlayoffComplete,
  simulateSeries,
  simulatePlayoffs,
} from './playoffSimulator.js';
export type {
  LeagueId,
  PlayoffSeed,
  PlayoffKeyPerformer,
  PlayoffGameResult,
  PlayoffSeriesState,
  CompletedRoundResult,
  PlayoffPreviewSeries,
  PlayoffPreviewTeamSlot,
  SeriesResult,
  PlayoffRound,
  PlayoffBracket,
} from './playoffSimulator.js';
