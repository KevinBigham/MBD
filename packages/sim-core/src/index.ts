// Math
export {
  GameRNG,
  computeLog5Probabilities,
} from './math/index.js';
export type {
  GameRNGState,
  Log5Input,
  Log5Modifiers,
  OutcomeRates,
} from './math/index.js';

// Player
export {
  toDisplayRating,
  toInternalRating,
  toLetterGrade,
  hitterOverall,
  pitcherOverall,
  clampRating,
  RATING_MIN,
  RATING_MAX,
  DISPLAY_MIN,
  DISPLAY_MAX,
  GRADE_THRESHOLDS,
  HITTER_WEIGHTS,
  PITCHER_WEIGHTS,
  generatePlayer,
  generateTeamRoster,
  generateLeaguePlayers,
  HITTER_POSITIONS,
  PITCHER_POSITIONS,
  ALL_POSITIONS,
  ROSTER_LEVELS,
  DEV_PHASES,
} from './player/index.js';
export type {
  HitterAttributes,
  PitcherAttributes,
  LetterGrade,
  Position,
  RosterLevel,
  DevPhase,
  GeneratedPlayer,
} from './player/index.js';
export {
  detectProspectBreakouts,
} from './player/index.js';
export type {
  BreakoutEvent,
} from './player/index.js';

// League
export {
  TEAMS,
  DIVISIONS,
  getTeamsByDivision,
  getTeamById,
  StandingsTracker,
  generateSchedule,
  getGamesForDay,
  getSeasonLength,
  isDivisionGame,
} from './league/index.js';
export type {
  Division,
  OwnerArchetype,
  TeamDef,
  TeamRecord,
  StandingsEntry,
  ScheduledGame,
} from './league/index.js';
export {
  getPersonalityArchetype,
  createInitialPlayerMorale,
  applyMoraleEvent,
  calculateTeamChemistry,
  createOwnerState,
  evaluateOwnerState,
  applyOwnerDecisionDelta,
  buildFrontOfficeBriefing,
  calculateAwardRaces,
  finalizeAwardResults,
  upsertRivalry,
  deriveRivalriesFromStandings,
  evaluateHOFCandidate,
  processHOFInductions,
  calculateDynastyScore,
} from './league/index.js';
export type {
  PersonalityArchetype,
  MoraleEvent,
  OwnerEvaluationContext,
  BriefingContext,
  AwardRaceEntry,
  AwardRaces,
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
} from './league/index.js';

// Sim
export {
  resolvePlateAppearance,
  advanceRunners,
  freshRunnerState,
  simulateGame,
  createSeasonState,
  simulateDay,
  simulateWeek,
  simulateMonth,
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
} from './sim/index.js';
export type {
  PAOutcome,
  PAContext,
  PAResult,
  BaseState,
  RunnerState,
  MarkovResult,
  GameTeam,
  GameBoxScore,
  PlayerGameStats,
  SeasonState,
  DaySimResult,
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
} from './sim/index.js';

// Player Development
export {
  developPlayer,
  developAllPlayers,
  updateDevPhase,
  shouldRetire,
  growMentalToughness,
} from './player/index.js';
export type { DevProgram } from './player/index.js';

// Injuries
export {
  checkInjury,
  advanceInjury,
  getInjuryMultiplier,
  generateInjury,
  describeInjury,
  processInjuries,
} from './player/index.js';
export type {
  InjuryType,
  InjurySeverity,
  Injury,
} from './player/index.js';

// Finance
export {
  LEAGUE_MINIMUM_SALARY,
  LUXURY_TAX_THRESHOLD,
  TEAM_MARKETS,
  calculatePlayerValue,
  generateArbitrationCase,
  resolveArbitration,
  calculateTeamPayroll,
  calculateLuxuryTax,
  getTeamBudget,
  advanceContracts,
  generateContractOffer,
  getArbEligiblePlayers,
  serviceDaysToYears,
} from './finance/index.js';
export type {
  ContractDetail,
  ArbitrationCase,
  TeamPayroll,
} from './finance/index.js';

// Scouting
export {
  generateScout,
  generateScoutingStaff,
  scoutPlayer,
  combineReports,
  getTeamScoutingAccuracy,
  generateScoutNotes,
  DEFAULT_IFA_BONUS_POOL,
  IFA_POOL_MIN,
  IFA_POOL_MAX,
  scoutQualityToAccuracy,
  getInternationalScoutAccuracy,
  generateIFAPool,
  createInternationalScoutingState,
  getAvailableIFAProspects,
  getRemainingIFABudget,
  scoutIFAProspect,
  tradeIFABonusPool,
  convertIFAProspectToPlayer,
  signIFAProspect,
} from './scouting/index.js';
export type {
  ScoutBias,
  Scout,
  ScoutReport,
  InternationalRegion,
  InternationalNationality,
  IFAProspectStatus,
  InternationalProspect,
  IFATeamBudget,
  InternationalScoutingReport,
  IFAScoutingHistoryEntry,
  InternationalScoutingState,
  SignIFAProspectResult,
} from './scouting/index.js';

// Draft
export {
  generateDraftClass,
  rankProspects,
  DRAFT_CLASS_SIZE,
  DRAFT_ROUNDS,
  NUM_TEAMS,
  determineDraftOrder,
  aiSelectPick,
  evaluateTeamNeeds,
  simulateFullDraft,
  scoutDraftProspect,
  resolveDraftSigning,
  PROTECTED_TOP_TEN_PICK_COUNT,
  createDefaultDraftPickOwnership,
  tradeDraftPickOwnership,
  awardCompensatoryPick,
  forfeitHighestEligiblePick,
  buildDraftPickSlots,
} from './draft/index.js';
export type {
  DraftProspect,
  DraftProspectBackground,
  DraftClass,
  DraftPick,
  DraftResult,
  DraftScoutingReport,
  DraftSigningOutcome,
  DraftPickOwnership,
  DraftPickDescriptor,
  DraftCompensatoryPick,
  DraftPickSlot,
} from './draft/index.js';

// Trade
export {
  evaluatePlayerTradeValue,
  comparePackages,
  assignGMPersonality,
  evaluateTradeProposal,
  generateAITradeOffers,
  executeTrade,
  generateTradeId,
} from './trade/index.js';
export type {
  PlayerTradeValue,
  PackageComparison,
  GMPersonality,
  TradeStatus,
  TradeProposal,
  TradeResult,
} from './trade/index.js';

// Roster Management
export {
  MLB_ROSTER_LIMIT,
  FORTY_MAN_LIMIT,
  MIN_PITCHERS,
  MIN_POSITION_PLAYERS,
  buildRosterState,
  validateRoster,
  executeRosterAction,
  promotePlayer,
  demotePlayer,
  dfaPlayer,
  getMLBRosterCount,
  get40ManCount,
  needsRosterMove,
  getNextLevel,
  autoFillMLBRoster,
} from './roster/index.js';
export type {
  RosterAction,
  RosterTransaction,
  RosterState,
  RosterValidation,
} from './roster/index.js';

// Offseason
export {
  OFFSEASON_PHASES,
  createOffseasonState,
  getOffseasonLength,
  advanceOffseasonDay,
  skipCurrentPhase,
  recordArbitration,
  recordTenderDecisions,
  recordFASigning,
  recordDraftPicks,
  recordIFASigning,
  recordRetirements,
  autoResolveTenderNonTender,
  determineRetirements,
  summarizeOffseason,
} from './roster/index.js';
export type {
  OffseasonPhase,
  OffseasonState,
  PhaseResults,
  ArbitrationResult,
  FASigningResult,
  DraftPickResult,
  IFASigningResult,
  RetirementResult,
  OffseasonSummary,
} from './roster/index.js';

// Free Agency
export {
  calculateMarketValue,
  getDemandLevel,
  projectContractYears,
  createFreeAgencyMarket,
  generateAIOffer,
  simulateFADay,
  simulateFullFreeAgency,
  makeUserOffer,
  getTopFreeAgents,
} from './roster/index.js';
export type {
  FreeAgent,
  ContractOffer,
  FreeAgencyMarket,
} from './roster/index.js';
export {
  AFFILIATE_LEVELS,
  AFFILIATE_SCHEDULE_LENGTHS,
  EXPANDED_MLB_ROSTER_LIMIT,
  SEPTEMBER_EXPANDED_ROSTER_DAYS,
  ROOKIE_AFFILIATE_START_DAY,
  createMinorLeagueState,
  accrueServiceTimeDay,
  consumeOptionYear,
  buildWaiverPriority,
  placeOnWaivers,
  claimOffWaivers,
  isExpandedRosterWindow,
  getActiveRosterLimit,
  getRosterComplianceIssues,
  getPromotionCandidates,
  simulateAffiliateDay,
} from './roster/index.js';
export type {
  AffiliateLevel,
  AffiliatePlayerStats,
  AffiliateState,
  WaiverClaim,
  AffiliateBoxScore,
  MinorLeagueState,
  MinorLeagueMutationResult,
  WaiverClaimResult,
  RosterComplianceIssue,
  PromotionCandidate,
} from './roster/index.js';
export {
  calculateRule5EligibleAfterSeason,
  createRule5Session,
  estimateBackfilledRule5EligibilityAfterSeason,
  lockRule5ProtectionAudit,
  makeRule5Selection,
  passRule5DraftTurn,
  toggleRule5Protection,
} from './roster/index.js';
export type {
  Rule5ActionResult,
  Rule5EligiblePlayer,
  Rule5Obligation,
  Rule5OfferBackState,
  Rule5Selection,
  Rule5SessionState,
} from './roster/index.js';

// Narrative
export {
  generateNews,
  generateNewsId,
  checkMilestones,
  generateStandingsNews,
  getUnreadNews,
  markAsRead,
  deduplicateNews,
  generateSeasonRecap,
  generateRetirementNews,
  buildTradeConsequenceBundle,
  buildSigningConsequenceBundle,
  buildPostseasonConsequenceBundle,
  buildRetirementConsequenceBundle,
} from './narrative/index.js';
export type {
  NewsPriority,
  NewsCategory,
  NewsItem,
  MomentType,
  Moment,
  GameEvent,
  OwnerDecisionDelta,
  PlayerMoraleDelta,
  ConsequenceBundle,
  TradeConsequenceContext,
  SigningConsequenceContext,
  PostseasonConsequenceContext,
  RetirementConsequenceContext,
  UserPostseasonOutcome,
} from './narrative/index.js';
