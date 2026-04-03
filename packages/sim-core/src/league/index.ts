export {
  TEAMS,
  DIVISIONS,
  getTeamsByDivision,
  getTeamById,
} from './teams.js';
export type {
  Division,
  OwnerArchetype,
  TeamDef,
} from './teams.js';

export {
  StandingsTracker,
} from './standings.js';
export type {
  TeamRecord,
  StandingsEntry,
} from './standings.js';

export {
  generateSchedule,
  getGamesForDay,
  getSeasonLength,
  isDivisionGame,
} from './schedule.js';
export type {
  ScheduledGame,
} from './schedule.js';

export {
  getPersonalityArchetype,
  createInitialPlayerMorale,
  applyMoraleEvent,
  calculateTeamChemistry,
  chemistryScoreToModifier,
  createOwnerState,
  evaluateOwnerState,
  applyOwnerDecisionDelta,
  buildFrontOfficeBriefing,
} from './narrativeState.js';
export type {
  PersonalityArchetype,
  MoraleEvent,
  OwnerEvaluationContext,
  BriefingContext,
  TeamChemistryContext,
} from './narrativeState.js';

export {
  createFrontOfficeState,
  evaluateFrontOfficeState,
  frontOfficeTradeModifier,
  frontOfficeFreeAgencyAppeal,
} from './frontOffice.js';
export type {
  FrontOfficeEvaluationContext,
} from './frontOffice.js';

export {
  calculateAwardRaces,
  finalizeAwardResults,
} from './awards.js';
export type {
  AwardRaceEntry,
  AwardRaces,
} from './awards.js';

export {
  upsertRivalry,
  deriveRivalriesFromStandings,
} from './rivalries.js';

export {
  backfillLegacyRecordBook,
  getRecordWatchList,
  updateRecordBook,
} from './records.js';
export type {
  BrokenRecord,
  LegacyRecordBookArgs,
  PlayerSeasonRecord,
  RecordWatchArgs,
  TeamStandingRecord,
  UpdateRecordBookArgs,
} from './records.js';

export {
  evaluateHOFCandidate,
  processHOFInductions,
  calculateDynastyScore,
} from './hallOfFame.js';
export type {
  CareerBattingTotals,
  CareerPitchingTotals,
  CareerStatsLedger,
  HallOfFameCandidate,
  HallOfFameEvaluation,
  HallOfFameEntry,
  HallOfFameBallotEntry,
  ProcessHOFInductionsArgs,
  ProcessHOFInductionsResult,
  FranchiseTimelineEntry,
  DynastyScoreSummary,
} from './hallOfFame.js';

export {
  ACHIEVEMENT_DEFINITIONS,
  checkAchievements,
} from './achievements.js';
export type {
  AchievementCategory,
  AchievementDefinition,
  AchievementMetricMap,
  AchievementProgressValue,
  AchievementUnlockResult,
  CheckAchievementsArgs,
  CheckAchievementsResult,
} from './achievements.js';
