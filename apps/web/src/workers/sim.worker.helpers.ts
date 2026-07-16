/**
 * Shared types, state, and helper functions for the sim worker.
 * Extracted to keep the main worker file under 500 lines.
 */
import {
  GameRNG,
  TEAMS,
  COACH_ROLES,
  DRAFT_CLASS_SIZE,
  DRAFT_ROUNDS,
  FORTY_MAN_LIMIT,
  MLB_ROSTER_LIMIT,
  LEAGUE_MINIMUM_SALARY,
  MAX_CONTRACT_YEARS,
  OFFSEASON_PHASES,
  aiSelectPick,
  buildPlayoffPreview,
  buildDraftPickSlots,
  advanceContractForOffseason,
  calculateExtensionOffer as calculateExtensionOfferCore,
  calculateMarketValue,
  calculateQualifyingOfferSalary as calculateQualifyingOfferSalaryCore,
  createDefaultDraftPickOwnership,
  deriveTeamBuildingArchetype,
  createInternationalScoutingState as createInternationalScoutingStateCore,
  evaluateExtensionWillingness,
  extensionNegotiationContractSignature,
  fireCoach as fireCoachCore,
  type Coach,
  type ExtensionContractTerms,
  type ExtensionNegotiationSession,
  type ExtensionResult,
  type ExtensionTeamContext,
  type InternationalScoutingState,
  determinePlayoffSeeds,
  determineDraftOrder,
  planDraftPickCompensation,
  generateDraftClass,
  generateScoutConflict,
  getDaysUntilTradeDeadline,
  getTeamById,
  getTradeDeadlineDay,
  getOffseasonLength,
  getActiveRosterLimit,
  getQualifyingOfferEligiblePlayers,
  getRegularSeasonMonthForDay,
  resolveDraftSigning,
  resolveQualifyingOffer as resolveQualifyingOfferCore,
  shouldIssueQualifyingOffer,
  scoutDraftProspect,
  serviceDaysToYears,
  SERVICE_TIME_DAYS_PER_YEAR,
  SUPER_TWO_COHORT_SHARE,
  toDisplayRating,
  toLetterGrade,
  resolveScoutConflicts,
  advanceInjury,
  describeInjury,
  processInjuries,
  generateNews,
  getRelationship,
  deduplicateNews,
  createOffseasonState,
  createRule5Session,
  estimateBackfilledRule5EligibilityAfterSeason,
  advanceOffseasonDay,
  skipCurrentPhase,
  autoResolveTenderNonTender,
  applyMoraleEvent,
  assignPlayerToTeam,
  buildRookieOfTheYearVotingEntries,
  buildRosterState,
  buildWaiverPriority,
  claimOffWaivers as claimOffWaiversCore,
  consumeOptionYear,
  createFreeAgencyMarket,
  createMinorLeagueState as createMinorLeagueStateCore,
  evaluateTeamNeeds,
  evaluateHoldout,
  generateArbitrationCase,
  gmExtensionPriorityAdjustment,
  getArbEligiblePlayers,
  hasActiveTradeFinancialObligationForPlayer,
  getAvailableIFAProspects,
  getPromotionCandidates as getPromotionCandidatesCore,
  getRosterComplianceIssues as getRosterComplianceIssuesCore,
  getInternationalScoutAccuracy,
  getRemainingIFABudget,
  getRule5TargetingBonus,
  shouldPassOnWaiverClaim,
  getTeamBudget,
  qualifiesForSuperTwo,
  hireCoach as hireCoachCore,
  issueQualifyingOffer as issueQualifyingOfferCore,
  negotiateExtension as negotiateExtensionCore,
  placeOnWaivers as placeOnWaiversCore,
  recordArbitration,
  recordCoachChange,
  recordDraftPicks,
  recordExtensionResults,
  recordFASigning,
  recordIFASigning,
  recordStarDefectionRivalry,
  recordQualifyingOfferResults,
  recordTenderDecisions,
  resolveArbitration,
  scoutIFAProspect,
  signIFAProspect as signIFAProspectCore,
  simulateAffiliateDay as simulateAffiliateDayCore,
  simulateFADay,
  processTeamExtensions,
  teamBuildingExtensionPriorityAdjustment,
  teamBuildingPromotionScoreAdjustment,
  pruneTickerFeed,
  MAX_MOMENTS_PER_PLAYER,
  tradeIFABonusPool as tradeIFABonusPoolCore,
  accrueServiceTimeDay as accrueServiceTimeDayCore,
  accrueServiceTimeDays as accrueServiceTimeDaysCore,
  lockRule5ProtectionAudit as lockRule5ProtectionAuditCore,
  makeRule5Selection as makeRule5SelectionCore,
  passRule5DraftTurn as passRule5DraftTurnCore,
  releasePlayerFromTeam,
  retirePlayerFromTeam,
  toggleRule5Protection as toggleRule5ProtectionCore,
  type DraftPickResult,
  type DraftPickSlot,
  type DraftScoutingReport,
  type FASigningResult,
  type IFAScoutingHistoryEntry,
  type InternationalProspect,
  type InternationalScoutingReport,
  type PromotionCandidate,
  type RelationshipBidContext,
  type RetirementResult,
  type ArbitrationDocketEntry,
  type TeamBuildingArchetype,
  type RosterComplianceIssue,
  type Rule5EligiblePlayer,
  type Rule5Obligation,
  type Rule5OfferBackState,
  type Rule5Selection,
  type Rule5SessionState,
  type OwnerPayrollPolicy,
  type MarketRevenueStatement,
  type FreeAgencyOfferAcceptanceReceipt,
  type FreeAgencyOfferDecision,
} from '@mbd/sim-core';
import { calculateStateTeamPayroll } from './sim.worker.tradeFinance.js';
import {
  detectArbitrationMoments,
  detectHoldoutResolutions,
} from '../../../../packages/sim-core/src/moments/arbitrationMoments.js';
import {
  generateHoldoutBriefing,
  generateHoldoutResolutionBriefing,
} from '../../../../packages/sim-core/src/narrative/holdoutCoverage.js';
import type {
  GeneratedPlayer,
  PlayoffPreviewSeries as CorePlayoffPreviewSeries,
  ScheduledGame,
  SeasonState,
  PlayoffBracket,
  PlayerGameStats,
  Injury,
  Scout,
  DraftClass,
  DraftProspect,
  RosterState,
  OffseasonState,
  FreeAgencyMarket,
  NewsItem,
  GMPersonality,
} from '@mbd/sim-core';
import type {
  AchievementState,
  ArchivedGameBoxScore,
  ArchivedSeason,
  AwardHistoryEntry,
  BriefingItem,
  CareerStatsLedger,
  CeremonyState,
  ChallengeState,
  ConsequenceWatcher,
  DebutFlashback,
  DynastyCard,
  FanSentiment,
  FrontOfficeState,
  DraftCompensatoryPick,
  DraftPickOwnership,
  FranchiseState,
  FranchiseTimelineEntry,
  GMRelationship,
  GMCareer,
  HallOfFameBallotEntry,
  HallOfFameEntry,
  HistoricalPlayer,
  JobMarket,
  LeagueEvent,
  DraftSignability,
  MentorRelationship,
  DraftState as PersistentDraftState,
  MinorLeagueState,
  MonthlyPulseState,
  OwnerState,
  PerformanceDiagnostics,
  PlayoffSeriesHistoryEntry,
  PlayerNicknameState,
  PlayerOrigin,
  PlayerMorale,
  PlayerStoryArc,
  ProspectBond,
  RecordBookEntry,
  RecordWatchEntry,
  Rivalry,
  RookieOfTheYearVotingEntry,
  ScoutConflict,
  SeasonArchiveEntry,
  SeasonHistoryEntry,
  SignatureMoment,
  TeamChemistry,
  TickerEntry,
  TradeState,
  WhatIfBranchMeta,
} from '@mbd/contracts';
import type { PlayerAdvancedStatsDTO } from './sim.worker.stats.js';
import { queueCareerMilestoneMoments } from './sim.worker.ceremony.js';
import { buildCareerMilestoneEvents } from './sim.worker.milestones.js';
// Imported directly from ./sim.worker.budget.js (rather than ./sim.worker.setup.js,
// which re-exports them) so loading helpers.ts does not statically pull in
// setup.ts. setup.ts imports `createEmpty*` factories back from helpers.ts; the
// previous `helpers → setup` edge closed a runtime cycle.
import { getDifficultyAdjustedBudget, getTeamIFABonusPool, getTeamPayrollCap } from './sim.worker.budget.js';
import {
  registerDraftedProspectAcquisition,
  registerInternationalProspectAcquisition,
  syncMinorLeagueStatHistory,
} from './sim.worker.farm.js';
import {
  adjustPromotionCandidateForIdentity,
  getEffectiveScoutingAccuracy,
} from './sim.worker.frontOfficeIdentity.js';
import {
  buildOwnerPayrollPolicy,
  reconcileCompletedOffseasonOwnerPayrollPressure,
} from './sim.worker.ownerPayrollPressure.js';
import {
  getSettledMarketRevenueStatement,
  reconcileCompletedSeasonMarketRevenue,
} from './sim.worker.marketRevenue.js';
import {
  applyVirtualFreeAgencySigning,
  buildFreeAgencyDecisionContext,
} from './sim.worker.freeAgencyDecision.js';

// ---------------------------------------------------------------------------
// Full game state
// ---------------------------------------------------------------------------

export interface FullGameState {
  rng: GameRNG;
  season: number;
  day: number;
  phase: 'preseason' | 'regular' | 'playoffs' | 'offseason';
  players: GeneratedPlayer[];
  schedule: ScheduledGame[];
  seasonState: SeasonState;
  userTeamId: string;
  playoffBracket: PlayoffBracket | null;
  // Phase 2 state
  injuries: Map<string, Injury>;
  serviceTime: Map<string, number>;
  scoutingStaffs: Map<string, Scout[]>;
  gmPersonalities: Map<string, GMPersonality>;
  coachingStaffs: Map<string, Coach[]>;
  coachFreeAgentPool: Coach[];
  pendingExtensionNegotiations: Map<string, ExtensionNegotiationSession>;
  offseasonState: OffseasonState | null;
  rule5Session: Rule5SessionState | null;
  rule5Obligations: Rule5Obligation[];
  rule5OfferBackStates: Rule5OfferBackState[];
  draftClass: DraftSessionState | null;
  freeAgencyMarket: FreeAgencyMarket | null;
  news: NewsItem[];
  rosterStates: Map<string, RosterState>;
  internationalScoutingState: InternationalScoutingState;
  draftState: PersistentDraftState;
  minorLeagueState: MinorLeagueState;
  monthlyPulse: MonthlyPulseState;
  playerMorale: Map<string, PlayerMorale>;
  teamChemistry: Map<string, TeamChemistry>;
  ownerState: Map<string, OwnerState>;
  briefingQueue: BriefingItem[];
  storyFlags: Map<string, string[]>;
  rivalries: Map<string, Rivalry>;
  tickerFeed: TickerEntry[];
  playerMoments: Map<string, SignatureMoment[]>;
  teamMoments: Map<string, SignatureMoment[]>;
  playerNicknames: Map<string, PlayerNicknameState>;
  playerStoryArcs: PlayerStoryArc[];
  prospectBonds: ProspectBond[];
  gmRelationships: Map<string, GMRelationship>;
  leagueEvents: LeagueEvent[];
  playerOrigins: Map<string, PlayerOrigin>;
  debutFlashbacks: DebutFlashback[];
  awardHistory: AwardHistoryEntry[];
  hallOfFame: HallOfFameEntry[];
  hallOfFameBallot: HallOfFameBallotEntry[];
  franchiseTimeline: FranchiseTimelineEntry[];
  careerStats: CareerStatsLedger[];
  playoffSeriesHistory: PlayoffSeriesHistoryEntry[];
  recordBook: RecordBookEntry[];
  recordWatch: RecordWatchEntry[];
  rookieOfTheYearVoting: RookieOfTheYearVotingEntry[];
  seasonArchive: SeasonArchiveEntry[];
  archivedSeasons: ArchivedSeason[];
  archivedGames: ArchivedGameBoxScore[];
  historicalPlayers: HistoricalPlayer[];
  mentorRelationships: MentorRelationship[];
  frontOfficeState: Map<string, FrontOfficeState>;
  whatIfBranches: WhatIfBranchMeta[];
  seasonHistory: SeasonHistoryEntry[];
  gmCareer: GMCareer;
  jobMarket: JobMarket;
  consequenceWatchers: ConsequenceWatcher[];
  fanSentiment: FanSentiment;
  scoutConflicts: ScoutConflict[];
  dynastyCards: DynastyCard[];
  challengeState: ChallengeState | null;
  tradeState: TradeState;
  franchise: FranchiseState;
  ceremony: CeremonyState;
  achievements: AchievementState;
  performanceDiagnostics: PerformanceDiagnostics;
}

export let state: FullGameState | null = null;

export function setState(s: FullGameState | null): void {
  state = s;
}

export function updatePlayerTeamAssignment(
  player: GeneratedPlayer,
  teamId: string,
  season: number,
): void {
  Object.assign(player, assignPlayerToTeam(player, teamId, season));
}

export function releasePlayerAssignment(
  player: GeneratedPlayer,
  season: number,
): void {
  Object.assign(player, releasePlayerFromTeam(player, season));
}

export function retirePlayerAssignment(
  player: GeneratedPlayer,
  season: number,
): void {
  Object.assign(player, retirePlayerFromTeam(player, season));
}

// ---------------------------------------------------------------------------
// DTO types for the UI
// ---------------------------------------------------------------------------

export interface TeamStandingsDTO {
  teamId: string;
  teamName: string;
  city: string;
  abbreviation: string;
  division: string;
  wins: number;
  losses: number;
  pct: string;
  gamesBack: number;
  streak: string;
  runDifferential: number;
}

export interface PlayerDTO {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  position: string;
  overallRating: number;
  displayRating: number;
  letterGrade: string;
  rosterStatus: string;
  teamId: string;
  serviceTimeDays: number;
  optionYearsUsed: number;
  isOutOfOptions: boolean;
  minorLeagueLevel: string | null;
  contract: {
    years: number;
    annualSalary: number;
    totalValue: number;
    noTradeClause: boolean;
    noTradeClauseType: string;
    playerOption: boolean;
    teamOption: boolean;
    optOutYears: number[];
    signingBonus: number;
    buyoutAmount: number;
    deferredMoney: Array<{
      yearOffset: number;
      amount: number;
    }>;
  };
  ceiling: number | null;
  floor: number | null;
  developmentProgram: string | null;
  developmentTrajectory: string;
  personalityTraits?: string[];
  extensionHistory: Array<{
    season: number;
    teamId: string;
    years: number;
    annualSalary: number;
    totalValue: number;
    outcome: string;
  }>;
  stats: {
    pa: number;
    ab: number;
    hits: number;
    doubles: number;
    triples: number;
    hr: number;
    rbi: number;
    bb: number;
    k: number;
    runs: number;
    hbp: number;
    sacFlies: number;
    avg: string;
    ip: number;
    earnedRuns: number;
    strikeouts: number;
    walks: number;
    hitsAllowed: number;
    homeRunsAllowed: number;
    hitBatters: number;
    flyBallsAllowed: number;
    wins: number;
    losses: number;
    era: string;
  } | null;
  advanced: PlayerAdvancedStatsDTO | null;
  historical?: boolean;
  historicalSummary?: {
    playerId: string;
    fullName: string;
    position: string;
    lastKnownTeamId: string;
    active: boolean;
    retiredSeason: number | null;
    seasonsPlayed: number;
    personalityTraits: string[];
  } | null;
  activeStory?: {
    arcType: string;
    phase: PlayerStoryArc['phase'];
    startSeason: number;
    startDay: number;
    latestMilestone: string | null;
  } | null;
  storyHistory?: Array<{
    arcType: string;
    phase: PlayerStoryArc['phase'];
    startSeason: number;
    startDay: number;
    resolvedSeason: number | null;
    milestones: string[];
  }>;
}

export interface SimResultDTO {
  day: number;
  season: number;
  phase: string;
  gamesPlayed: number;
  seasonComplete: boolean;
  flowStateChanged?: boolean;
}

export interface OffseasonProgressResult {
  aiSignings: Array<{
    playerId: string;
    teamId: string;
    years: number;
    annualSalary: number;
    marketValue: number;
    decision?: FreeAgencyOfferDecision;
    payrollBeforeSigning?: number;
    independentlyDerivedPayrollBeforeSigning?: number;
    spendingLimit?: number;
    mlbRosterPlayerIdsBeforeSigning?: string[];
  }>;
  error?: string;
  flowStateChanged?: boolean;
}

export type OffseasonTransactionTone = 'user' | 'division_rival' | 'neutral';

export interface OffseasonTransactionRow {
  id: string;
  phase: string;
  tone: OffseasonTransactionTone;
  summary: string;
}

export interface OffseasonTransactionGroup {
  phase: string;
  label: string;
  rows: OffseasonTransactionRow[];
}

export interface OffseasonMarketDaySummary {
  id: string;
  day: number;
  category: 'signing' | 'trade';
  tone: OffseasonTransactionTone;
  headline: string;
  detail: string;
  teamIds: string[];
  playerIds: string[];
  valueLabel?: string;
}

export type OffseasonCommandStatus = 'complete' | 'attention' | 'blocked' | 'upcoming';

export interface OffseasonCommandChecklistItem {
  id: 'arbitration' | 'qualifying_offers' | 'rule5' | 'free_agency' | 'staff' | 'roster' | 'budget';
  label: string;
  status: OffseasonCommandStatus;
  detail: string;
  actionLabel?: string;
}

export interface OffseasonCommandWarning {
  id: string;
  severity: 'warning' | 'danger';
  title: string;
  detail: string;
  playerId?: string;
  teamId?: string;
}

export interface OffseasonOpeningDayProjection {
  activeRosterCount: number;
  activeRosterLimit: number;
  fortyManCount: number;
  fortyManLimit: number;
  payroll: number;
  budget: number;
  payrollCap: number;
  payrollSpace: number;
  capSpace: number;
  ownerPayrollPolicy?: OwnerPayrollPolicy;
  marketRevenueStatement?: MarketRevenueStatement | null;
  rosterHoleCount: number;
}

export interface OffseasonCommandCenterView {
  checklist: OffseasonCommandChecklistItem[];
  warnings: OffseasonCommandWarning[];
  projectedOpeningDay: OffseasonOpeningDayProjection;
}

export interface OffseasonStateView extends OffseasonState {
  arbitrationCases: OffseasonArbitrationCaseView[];
  transactionGroups: OffseasonTransactionGroup[];
  marketDaySummaries: OffseasonMarketDaySummary[];
  commandCenter: OffseasonCommandCenterView;
  rule5?: Rule5StateView;
  flowStateChanged?: boolean;
  error?: string;
}

export type OffseasonArbitrationStage = 'filing' | 'exchange' | 'hearing' | 'resolved';

export interface OffseasonArbitrationCaseView {
  playerId: string;
  playerName: string;
  teamId: string;
  serviceClass: string;
  previousSalary: number;
  teamOffer: number;
  playerAsk: number;
  projectedSalary: number;
  awardedSalary: number | null;
  winner: 'club' | 'player' | null;
  stage: OffseasonArbitrationStage;
}

export interface Rule5StateView {
  phase: Rule5SessionState['phase'];
  currentTeamId: string | null;
  draftOrder: string[];
  consecutivePasses: number;
  protectedCount: number;
  protectedLimit: number;
  protectedPlayers: Rule5EligiblePlayer[];
  eligiblePlayers: Rule5EligiblePlayer[];
  selections: Rule5Selection[];
  obligations: Rule5Obligation[];
  offerBackStates: Rule5OfferBackState[];
}

export type DraftRoomStatus = 'available' | 'in_progress' | 'complete';

export interface DraftDecisionInputSignal {
  label: string;
  value: number;
  detail: string;
}

export interface DraftProspectDecisionInputs {
  scoutAccuracy: DraftDecisionInputSignal;
  disagreement: DraftDecisionInputSignal;
  makeup: DraftDecisionInputSignal;
  signability: DraftDecisionInputSignal;
  risk: DraftDecisionInputSignal;
  whyThisPick: string;
}

export interface DraftRoomProspect {
  id: string;
  playerId: string;
  name: string;
  firstName: string;
  lastName: string;
  position: string;
  scoutingGrade: number;
  consensusGrade: number;
  looks: number;
  slotValue: number;
  askBonus: number;
  background: string;
  bigBoardRank: number | null;
  age: number;
  origin: string;
  scoutConflict: ScoutConflict | null;
  decisionInputs: DraftProspectDecisionInputs;
}

export interface DraftCompensationContext {
  compensationForPlayerId: string;
  compensationForPlayerName: string;
  compensationFromTeamId: string | null;
  compensationFromTeamName: string | null;
}

export interface DraftRoomPick {
  slotId: string;
  round: number;
  pickNumber: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  playerId: string;
  playerName: string;
  position: string;
  scoutingGrade: number;
  origin: string;
  slotKind?: 'standard' | 'compensatory';
  compensation?: DraftCompensationContext | null;
  tone: OffseasonTransactionTone;
}

export interface DraftBoardTeam {
  teamId: string;
  teamName: string;
  abbreviation: string;
  tone: OffseasonTransactionTone;
}

export interface DraftBoardCell {
  slotId: string;
  round: number;
  pickInRound: number;
  teamId: string;
  teamAbbreviation: string;
  tone: OffseasonTransactionTone;
  compensation?: DraftCompensationContext | null;
  pick: DraftRoomPick | null;
}

export interface DraftBoardRow {
  round: number;
  cells: DraftBoardCell[];
}

export interface IFAProspectView {
  id: string;
  playerName: string;
  age: number;
  position: string;
  region: string;
  country: string;
  expectedBonus: number;
  status: 'available' | 'signed';
  signedTeamId: string | null;
  signedBonus: number | null;
  looks: number;
  overall: number | null;
  confidence: number | null;
  ceiling: number | null;
  floor: number | null;
  notes: string | null;
  scoutConflict: ScoutConflict | null;
}

export interface IFAPoolView {
  season: number;
  currentPhase: string | null;
  signingWindowOpen: boolean;
  budget: {
    baseAllocation: number;
    tradedIn: number;
    tradedOut: number;
    committed: number;
    remaining: number;
  };
  staffAccuracy: number;
  prospects: IFAProspectView[];
}

export interface IFAReportView {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  region: string;
  country: string;
  expectedBonus: number;
  looks: number;
  grades: Record<string, number>;
  overall: number;
  confidence: number;
  ceiling: number;
  floor: number;
  notes: string;
  reliability: number;
  scoutConflict?: ScoutConflict | null;
}

export type SeasonFlowStatus =
  | 'preseason'
  | 'regular'
  | 'regular_season_complete'
  | 'playoff_preview'
  | 'playoffs_complete'
  | 'offseason'
  | 'offseason_complete';

export interface SeasonFlowStanding {
  teamId: string;
  teamName: string;
  abbreviation: string;
  wins: number;
  losses: number;
  division: string;
}

export interface SeasonFlowPreviewTeam {
  teamId: string | null;
  teamName: string;
  abbreviation: string;
  seed: number | null;
  placeholder: string | null;
}

export interface SeasonFlowPreviewSeries {
  id: string;
  round: string;
  bestOf: number;
  home: SeasonFlowPreviewTeam;
  away: SeasonFlowPreviewTeam;
}

export interface SeasonFlowChampionSummary {
  championTeamId: string | null;
  championTeamName: string;
  runnerUpTeamName: string;
  seriesRecord: string;
}

export interface SeasonFlowSeasonSummary {
  record: string;
  divisionFinish: string;
  playoffStatus: string;
  teamLeaders: string[];
  awardFavorites: string[];
}

export interface SeasonFlowOffseasonSummary {
  nextSeason: number;
  moves: string[];
}

export interface SeasonFlowStateView {
  status: SeasonFlowStatus;
  season: number;
  phaseLabel: string;
  detailLabel: string;
  progress: number;
  canUseRegularSimControls: boolean;
  action: 'proceed_to_playoffs' | 'sim_playoffs' | 'watch_playoffs' | 'skip_to_offseason' | 'proceed_to_offseason' | 'start_next_season' | null;
  actionLabel: string | null;
  secondaryAction: 'watch_playoffs' | 'skip_to_offseason' | null;
  secondaryActionLabel: string | null;
  daysUntilTradeDeadline: number | null;
  standingsSnapshot: SeasonFlowStanding[];
  playoffPreview: SeasonFlowPreviewSeries[];
  seasonSummary: SeasonFlowSeasonSummary | null;
  championSummary: SeasonFlowChampionSummary | null;
  offseasonSummary: SeasonFlowOffseasonSummary | null;
}

export interface DraftCurrentPick {
  slotId: string;
  round: number;
  pickNumber: number;
  pickInRound: number;
  totalPicks: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  userOnClock: boolean;
}

export interface DraftClassSummaryPick {
  playerId: string;
  playerName: string;
  position: string;
  scoutingGrade: number;
  origin: string;
  slotValue: number;
  askBonus: number;
  signed: boolean | null;
  agreedBonus: number | null;
  assessment: string;
}

export interface DraftClassSummary {
  picks: DraftClassSummaryPick[];
  overallGrade: string;
  averageScoutingGrade: number;
}

export interface DraftRoomView {
  status: DraftRoomStatus;
  availableProspects: DraftRoomProspect[];
  udfaProspects: DraftRoomProspect[];
  completedPicks: DraftRoomPick[];
  currentPick: DraftCurrentPick | null;
  board: {
    teams: DraftBoardTeam[];
    rounds: DraftBoardRow[];
  };
  counts: {
    totalRounds: number;
    totalPicks: number;
    picksMade: number;
    picksRemaining: number;
  };
  userDraftClass: DraftClassSummary | null;
  userBigBoard: string[];
  flowStateChanged?: boolean;
}

export interface DraftActionResult {
  success: boolean;
  draft: DraftRoomView | null;
  newPicks: DraftRoomPick[];
  error?: string;
  flowStateChanged?: boolean;
}

export interface DraftSessionState extends DraftClass {
  draftOrder: string[];
  pickSlots: DraftPickSlot[];
  completedPicks: DraftRoomPick[];
  status: DraftRoomStatus;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function requireState(): FullGameState {
  if (!state) throw new Error('No game initialized');
  return state;
}

export function timestamp(): string {
  const s = requireState();
  return `S${s.season}D${s.day}`;
}

function isOffseasonPhaseActive(s: FullGameState, phase: OffseasonState['currentPhase']): boolean {
  return s.phase === 'offseason'
    && s.offseasonState?.currentPhase === phase
    && s.offseasonState.completed !== true;
}

export function getTeamPlayers(teamId: string): GeneratedPlayer[] {
  return requireState().players.filter(p => p.teamId === teamId);
}

export function createEmptyTradeState(): TradeState {
  return {
    pendingOffers: [],
    tradeHistory: [],
    negotiations: [],
    multiTeamPendingTrades: [],
  };
}

export function createEmptyInternationalScoutingState(season: number): InternationalScoutingState {
  return {
    season,
    ifaPool: [],
    budgets: new Map(),
    scoutingHistory: new Map(),
  };
}

export function createEmptyDraftState(): PersistentDraftState {
  return {
    scoutingReports: [],
    signability: [],
    qualifyingOffers: [],
    compensatoryPicks: [],
    pickOwnership: [],
    bigBoards: [],
    signingDecisions: [],
  };
}

export function createEmptyMinorLeagueState(season = 1): MinorLeagueState {
  return createMinorLeagueStateCore(
    TEAMS.map((team) => team.id),
    season,
  );
}

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const TEAM_BUILDING_CORE_PLAYER_COUNT = 8;
const TEAM_BUILDING_PROSPECT_COUNT = 8;

function ratingToIdentityScore(value: number): number {
  return clampValue(value / 5, 0, 100);
}

function averageTopIdentityScores(scores: number[], fallback: number, limit: number): number {
  if (scores.length === 0) return fallback;
  const selected = [...scores]
    .sort((left, right) => right - left)
    .slice(0, limit);
  const total = selected.reduce((sum, score) => sum + score, 0);
  return total / selected.length;
}

function prospectIdentityScore(player: GeneratedPlayer): number {
  return ratingToIdentityScore(Math.max(
    player.potentialRating ?? player.ceiling ?? player.overallRating,
    player.overallRating,
  ));
}

function currentAbilityIdentityScore(player: GeneratedPlayer): number {
  return ratingToIdentityScore(player.overallRating);
}

function deriveWorkerTeamBuildingArchetypeWithProspectScore(
  s: FullGameState,
  teamId: string,
  prospectScoreForPlayer: (player: GeneratedPlayer) => number,
): TeamBuildingArchetype {
  const teamPlayers = s.players.filter((player) => player.teamId === teamId);
  const record = s.seasonState.standings.getRecord(teamId);
  const totalGames = (record?.wins ?? 0) + (record?.losses ?? 0);
  const winPercentage = totalGames > 0 ? (record?.wins ?? 0) / totalGames : 0.5;
  const payroll = calculateStateTeamPayroll(s, teamId).totalPayroll;
  const payrollCap = getTeamPayrollCap(s, teamId);
  const payrollRatio = payrollCap > 0 ? payroll / payrollCap : 0;
  const majorLeagueCoreScore = averageTopIdentityScores(
    teamPlayers
      .filter((player) => player.rosterStatus === 'MLB')
      .map((player) => ratingToIdentityScore(player.overallRating)),
    50,
    TEAM_BUILDING_CORE_PLAYER_COUNT,
  );
  const prospectScore = averageTopIdentityScores(
    teamPlayers
      .filter((player) => player.rosterStatus !== 'MLB' && player.age <= 25)
      .map(prospectScoreForPlayer),
    50,
    TEAM_BUILDING_PROSPECT_COUNT,
  );

  return deriveTeamBuildingArchetype({
    winPercentage,
    payrollRatio,
    prospectScore,
    majorLeagueCoreScore,
    frontOfficeReputation: s.frontOfficeState.get(teamId)?.reputation ?? 50,
  });
}

export function deriveWorkerTeamBuildingArchetype(
  s: FullGameState,
  teamId: string,
): TeamBuildingArchetype {
  return deriveWorkerTeamBuildingArchetypeWithProspectScore(
    s,
    teamId,
    prospectIdentityScore,
  );
}

function deriveExtensionTeamBuildingArchetype(
  s: FullGameState,
  teamId: string,
): TeamBuildingArchetype {
  // Extensions may use current organizational ability, but never hidden
  // potential/ceiling truth. Keep the shared archetype semantics unchanged for
  // promotion, roster, trade, and free-agent consumers.
  return deriveWorkerTeamBuildingArchetypeWithProspectScore(
    s,
    teamId,
    currentAbilityIdentityScore,
  );
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function absoluteDay(season: number, day: number): number {
  return (season * 1000) + day;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash * 31) + value.charCodeAt(index)) | 0;
  }
  return hash;
}

export function createStableWorkerRng(
  s: FullGameState,
  scope: string,
): GameRNG {
  return new GameRNG((s.rng.getSeed() ^ hashString(scope) ^ s.season) | 0);
}

function buildExtensionContextForTeam(
  s: FullGameState,
  teamId: string,
): ExtensionTeamContext {
  const payroll = calculateStateTeamPayroll(s, teamId);
  const record = s.seasonState.standings.getRecord(teamId);
  const teamWinPct = record ? record.wins / Math.max(1, record.wins + record.losses) : 0.5;
  const controlYearsByPlayer = new Map<string, number>();
  const serviceYearsByPlayer = new Map<string, number>();
  const moraleByPlayer = new Map<string, number>();

  for (const player of s.players) {
    const serviceYears = serviceDaysToYears(player.serviceTimeDays);
    const controlYears = Math.max(player.contract.years, Math.max(0, 6 - serviceYears));
    controlYearsByPlayer.set(player.id, controlYears);
    serviceYearsByPlayer.set(player.id, serviceYears);
    moraleByPlayer.set(player.id, s.playerMorale.get(player.id)?.score ?? 50);
  }

  return {
    season: s.season,
    teamId,
    teamWinPct,
    teamBudget: getDifficultyAdjustedBudget(s, teamId),
    currentPayroll: payroll.totalPayroll,
    futureCommitments: payroll.futureCommitments,
    controlYearsByPlayer,
    serviceYearsByPlayer,
    moraleByPlayer,
    teamBuildingArchetype: deriveExtensionTeamBuildingArchetype(s, teamId),
    gmPersonality: s.gmPersonalities.get(teamId) ?? 'analytical',
  };
}

function hasTerminalExtensionOutcome(player: GeneratedPlayer, season: number): boolean {
  return (player.extensionHistory ?? []).some((entry) =>
    entry.season === season && (entry.outcome === 'accepted' || entry.outcome === 'rejected'),
  );
}

function applyAcceptedExtensionToPlayer(
  player: GeneratedPlayer,
  teamId: string,
  season: number,
  contract: ExtensionContractTerms,
): GeneratedPlayer {
  return {
    ...player,
    contract: {
      ...player.contract,
      years: contract.years,
      annualSalary: contract.annualSalary,
      totalValue: contract.totalValue,
      noTradeClause: contract.noTradeClause,
      noTradeClauseType: contract.noTradeClauseType,
      playerOption: contract.playerOption,
      teamOption: contract.teamOption,
      optOutYears: contract.optOutYears,
      signingBonus: contract.signingBonus,
      buyoutAmount: contract.buyoutAmount,
      deferredMoney: contract.deferredMoney,
    },
    extensionHistory: [
      ...(player.extensionHistory ?? []),
      {
        season,
        teamId,
        years: contract.years,
        annualSalary: contract.annualSalary,
        totalValue: contract.totalValue,
        outcome: 'accepted',
      },
    ],
  };
}

function applyRejectedExtensionToPlayer(
  player: GeneratedPlayer,
  teamId: string,
  season: number,
  offer: ExtensionContractTerms,
): GeneratedPlayer {
  return {
    ...player,
    extensionHistory: [
      ...(player.extensionHistory ?? []),
      {
        season,
        teamId,
        years: offer.years,
        annualSalary: offer.annualSalary,
        totalValue: offer.totalValue,
        outcome: 'rejected',
      },
    ],
  };
}

function isLegalExtensionOffer(offer: unknown): offer is ExtensionContractTerms {
  if (offer == null || typeof offer !== 'object' || Array.isArray(offer)) {
    return false;
  }
  const candidate = offer as Record<string, unknown>;
  const years = candidate.years;
  const noTradeClauseType = candidate.noTradeClauseType;
  const optOutYears = candidate.optOutYears;
  const deferredMoney = candidate.deferredMoney;
  if (
    !Number.isInteger(years)
    || (years as number) < 1
    || (years as number) > MAX_CONTRACT_YEARS
    || !Number.isFinite(candidate.annualSalary)
    || (candidate.annualSalary as number) < LEAGUE_MINIMUM_SALARY
    || !Number.isFinite(candidate.totalValue)
    || (candidate.totalValue as number) < 0
    || typeof candidate.noTradeClause !== 'boolean'
    || (noTradeClauseType !== 'none' && noTradeClauseType !== 'partial' && noTradeClauseType !== 'full')
    || (candidate.noTradeClause === false && noTradeClauseType !== 'none')
    || typeof candidate.playerOption !== 'boolean'
    || typeof candidate.teamOption !== 'boolean'
    || !Number.isFinite(candidate.signingBonus)
    || (candidate.signingBonus as number) < 0
    || !Number.isFinite(candidate.buyoutAmount)
    || (candidate.buyoutAmount as number) < 0
    || !Array.isArray(optOutYears)
    || !Array.isArray(deferredMoney)
  ) {
    return false;
  }
  return optOutYears.every((year) =>
    Number.isInteger(year) && (year as number) >= 1 && (year as number) <= (years as number))
    && deferredMoney.every((entry) => {
      if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
        return false;
      }
      const installment = entry as Record<string, unknown>;
      return Number.isInteger(installment.yearOffset)
        && (installment.yearOffset as number) >= 0
        && Number.isFinite(installment.amount)
        && (installment.amount as number) >= 0;
    });
}

function buildWaiverPriorityForState(s: FullGameState): string[] {
  return buildWaiverPriority(
    TEAMS.map((team) => {
      const record = s.seasonState.standings.getRecord(team.id);
      return {
        teamId: team.id,
        wins: record?.wins ?? 0,
        losses: record?.losses ?? 0,
      };
    }),
  );
}

export function accrueMinorLeagueServiceTimeDays(s: FullGameState, days: number) {
  const accrued = accrueServiceTimeDaysCore(s.players, s.minorLeagueState, days);
  s.players = accrued.players;
  s.minorLeagueState = accrued.state;
}

export function advanceMinorLeagueDay(
  s: FullGameState,
  day: number = s.day,
  options: { accrueServiceTime?: boolean; syncStatHistory?: boolean } = {},
) {
  if (options.accrueServiceTime !== false) {
    const accrued = accrueServiceTimeDayCore(s.players, s.minorLeagueState);
    s.players = accrued.players;
    s.minorLeagueState = accrued.state;
  }
  s.minorLeagueState = simulateAffiliateDayCore(
    createStableWorkerRng(s, `affiliate-day:${day}`),
    s.minorLeagueState,
    s.players,
    day,
    s.season,
    TEAMS.map((team) => team.id),
  );
  if (options.syncStatHistory !== false) {
    syncMinorLeagueStatHistory(s);
  }
}

function adjustPromotionCandidateForTeamBuilding(
  s: FullGameState,
  candidate: PromotionCandidate,
): PromotionCandidate {
  const player = s.players.find((entry) => entry.id === candidate.playerId);
  if (!player) {
    return candidate;
  }

  const archetype = deriveWorkerTeamBuildingArchetype(s, candidate.teamId);
  const baseAdjustment = teamBuildingPromotionScoreAdjustment(archetype, {
    age: player.age,
    overallRating: player.overallRating,
    potentialRating: player.potentialRating ?? player.ceiling ?? player.overallRating,
  });
  const rosterState = s.rosterStates.get(candidate.teamId);
  const activeRosterFull = candidate.targetLevel === 'MLB'
    && rosterState != null
    && rosterState.mlbRoster.length >= getActiveRosterLimit(s.day);
  const fortyManFull = candidate.targetLevel === 'MLB'
    && rosterState != null
    && !rosterState.fortyManRoster.includes(candidate.playerId)
    && rosterState.fortyManRoster.length >= FORTY_MAN_LIMIT;
  const constraintAdjustment = (activeRosterFull ? -12 : 0) + (fortyManFull ? -10 : 0);
  const totalAdjustment = baseAdjustment + constraintAdjustment;

  if (totalAdjustment === 0) {
    return candidate;
  }

  const notes: string[] = [];
  if (baseAdjustment > 0) {
    notes.push(`${archetype.replace(/_/g, ' ')} team plan pushes this promotion earlier.`);
  } else if (baseAdjustment < 0) {
    notes.push(`${archetype.replace(/_/g, ' ')} team plan slows this promotion.`);
  }
  if (activeRosterFull) {
    notes.push('Active roster space must clear first.');
  }
  if (fortyManFull) {
    notes.push('40-man roster space must clear first.');
  }

  return {
    ...candidate,
    score: Math.max(0, candidate.score + totalAdjustment),
    reason: `${candidate.reason} ${notes.join(' ')}`.trim(),
  };
}

export function getPromotionCandidatesForTeam(
  s: FullGameState,
  teamId: string,
): PromotionCandidate[] {
  const candidates = getPromotionCandidatesCore(s.players, s.minorLeagueState, teamId)
    .map((candidate) => adjustPromotionCandidateForTeamBuilding(s, candidate));
  const adjustedCandidates = teamId === s.userTeamId
    ? candidates.map((candidate) => adjustPromotionCandidateForIdentity(s, candidate))
    : candidates;
  return adjustedCandidates
    .sort((left, right) => right.score - left.score || left.playerId.localeCompare(right.playerId));
}

export function getRosterComplianceIssuesForTeam(
  s: FullGameState,
  teamId: string,
): RosterComplianceIssue[] {
  const rosterState = s.rosterStates.get(teamId);
  if (!rosterState) {
    return [];
  }
  const teamPlayers = s.players.filter((player) => player.teamId === teamId);
  return getRosterComplianceIssuesCore(teamPlayers, rosterState, s.day);
}

export function getExtensionCandidatesForTeam(
  s: FullGameState,
  teamId: string = s.userTeamId,
) {
  const context = buildExtensionContextForTeam(s, teamId);
  return s.players
    .filter((player) =>
      player.teamId === teamId
      && player.rosterStatus === 'MLB'
      && !hasTerminalExtensionOutcome(player, s.season),
    )
    .map((player) => {
      const willingness = evaluateExtensionWillingness(
        player,
        context,
        createStableWorkerRng(s, `extension-candidate:${teamId}:${player.id}`),
      );
      const controlYears = context.controlYearsByPlayer.get(player.id) ?? Math.max(1, player.contract.years);
      const identityContext = {
        age: player.age,
        overallRating: player.overallRating,
        controlYears,
        annualSalary: player.contract.annualSalary,
      };
      const teamPriority = (willingness.willingness * 100)
        + teamBuildingExtensionPriorityAdjustment(
          context.teamBuildingArchetype ?? 'balanced',
          identityContext,
        )
        + (teamId === s.userTeamId
          ? 0
          : gmExtensionPriorityAdjustment(context.gmPersonality ?? 'analytical', identityContext));
      return {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        teamId,
        yearsRemaining: player.contract.years,
        currentSalary: player.contract.annualSalary,
        willingness: willingness.willingness,
        demandMultiplier: willingness.demandMultiplier,
        walkAwayThreshold: willingness.walkAwayThreshold,
        teamPriority,
      };
    })
    .sort((left, right) =>
      right.teamPriority - left.teamPriority
      || right.willingness - left.willingness
      || right.demandMultiplier - left.demandMultiplier
      || left.playerName.localeCompare(right.playerName),
    )
    .map(({ teamPriority: _teamPriority, ...candidate }) => candidate);
}

export function getExtensionOfferForPlayer(
  s: FullGameState,
  playerId: string,
  years: number,
): ExtensionContractTerms | null {
  const player = s.players.find((candidate) => candidate.id === playerId);
  if (
    !player
    || player.teamId !== s.userTeamId
    || player.rosterStatus !== 'MLB'
    || hasTerminalExtensionOutcome(player, s.season)
  ) {
    return null;
  }

  return calculateExtensionOfferCore(
    player,
    buildExtensionContextForTeam(s, player.teamId),
    years,
    createStableWorkerRng(s, `extension-offer:${playerId}:${years}`),
  );
}

export interface ExtensionNegotiationReview {
  status: ExtensionResult['status'];
  riskLevel: 'low' | 'medium' | 'high';
  offerGapPct: number;
  teamOfferAav: number;
  playerDemandAav: number;
  evidence: string[];
}

function roundReviewNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildExtensionNegotiationReview(result: ExtensionResult): ExtensionNegotiationReview | null {
  const latestRound = result.rounds.at(-1);
  if (!latestRound) {
    return null;
  }

  const offerGapPct = Math.round(latestRound.gap * 1000) / 10;
  const riskLevel: ExtensionNegotiationReview['riskLevel'] = result.status === 'rejected' || latestRound.gap >= 0.18
    ? 'high'
    : latestRound.gap >= 0.08
      ? 'medium'
      : 'low';
  const teamOfferAav = roundReviewNumber(latestRound.teamOffer.annualSalary);
  const playerDemandAav = roundReviewNumber(latestRound.playerDemand.annualSalary);

  return {
    status: result.status,
    riskLevel,
    offerGapPct,
    teamOfferAav,
    playerDemandAav,
    evidence: [
      `Team offer is ${offerGapPct.toFixed(1)}% below current ask.`,
      `Team AAV $${teamOfferAav.toFixed(1)}M vs player ask $${playerDemandAav.toFixed(1)}M.`,
      `Walk-away roll ${latestRound.walkAwayRoll.toFixed(3)} for this round.`,
    ],
  };
}

export function negotiatePlayerExtension(
  s: FullGameState,
  playerId: string,
  offer: ExtensionContractTerms,
) {
  const playerIndex = s.players.findIndex((candidate) => candidate.id === playerId);
  if (playerIndex < 0) {
    return null;
  }

  const player = s.players[playerIndex]!;
  if (
    player.teamId !== s.userTeamId
    || player.rosterStatus !== 'MLB'
    || hasTerminalExtensionOutcome(player, s.season)
    || !isLegalExtensionOffer(offer)
  ) {
    return null;
  }
  const context = buildExtensionContextForTeam(s, player.teamId);
  const session = s.pendingExtensionNegotiations.get(playerId);
  if (
    session
    && (
      session.teamId !== player.teamId
      || session.season !== s.season
      || session.baselineContractSignature !== extensionNegotiationContractSignature(player)
    )
  ) {
    return null;
  }
  const result = negotiateExtensionCore(player, context, offer, s.rng.fork(), session);

  if (result.status === 'countered') {
    s.pendingExtensionNegotiations.set(playerId, result.session);
    return {
      ...result,
      review: buildExtensionNegotiationReview(result),
    };
  }

  s.pendingExtensionNegotiations.delete(playerId);
  const finalOffer = result.finalContract ?? result.rounds.at(-1)?.teamOffer ?? offer;

  if (result.status === 'accepted' && result.finalContract) {
    s.players[playerIndex] = applyAcceptedExtensionToPlayer(
      player,
      player.teamId,
      s.season,
      result.finalContract,
    );
  } else {
    s.players[playerIndex] = applyRejectedExtensionToPlayer(
      player,
      player.teamId,
      s.season,
      finalOffer,
    );
  }

  if (s.offseasonState) {
    s.offseasonState = recordExtensionResults(s.offseasonState, [{
      playerId: player.id,
      teamId: player.teamId,
      status: result.status,
      years: finalOffer.years,
      annualSalary: finalOffer.annualSalary,
      totalValue: finalOffer.totalValue,
    }]);
  }

  s.news.unshift(...generateNews(s.rng.fork(), {
    type: 'extension',
    season: s.season,
    day: s.day,
    data: {
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      teamId: player.teamId,
      teamName: getTeamById(player.teamId)?.name ?? player.teamId.toUpperCase(),
      years: finalOffer.years,
      annualSalary: finalOffer.annualSalary,
      totalValue: finalOffer.totalValue,
      outcome: result.status,
      record: `${s.seasonState.standings.getRecord(player.teamId)?.wins ?? 0}-${s.seasonState.standings.getRecord(player.teamId)?.losses ?? 0}`,
    },
  }, s.players, s.season, s.day));

  return {
    ...result,
    review: buildExtensionNegotiationReview(result),
  };
}

export function getQualifyingOfferEligibleForTeam(
  s: FullGameState,
  teamId: string = s.userTeamId,
) {
  const offeredPlayerIds = new Set(
    s.draftState.qualifyingOffers
      .filter((record) => record.season === s.season)
      .map((record) => record.playerId),
  );
  const salary = getQualifyingOfferSalaryForState(s);

  return getQualifyingOfferEligiblePlayers(s.players, teamId, s.serviceTime, salary)
    .filter((player) => !offeredPlayerIds.has(player.id))
    .map((player) => ({
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      teamId,
      qualifyingOfferSalary: salary,
      projectedMarketValue: roundMoney(calculateMarketValue(player)),
      serviceYears: serviceDaysToYears(player.serviceTimeDays),
    }));
}

export function getQualifyingOfferSalaryForState(s: FullGameState): number {
  return s.offseasonState?.phaseResults.qualifyingOfferSalary
    ?? calculateQualifyingOfferSalaryCore(s.players);
}

function ensureQualifyingOfferSalaryForState(s: FullGameState): number {
  const amount = getQualifyingOfferSalaryForState(s);
  if (s.offseasonState && s.offseasonState.phaseResults.qualifyingOfferSalary == null) {
    s.offseasonState = {
      ...s.offseasonState,
      phaseResults: {
        ...s.offseasonState.phaseResults,
        qualifyingOfferSalary: amount,
      },
    };
  }
  return amount;
}

export function issueTeamQualifyingOffer(
  s: FullGameState,
  playerId: string,
  teamId: string = s.userTeamId,
) {
  if (!isOffseasonPhaseActive(s, 'qualifying_offers')) {
    return { success: false as const, error: 'Qualifying offers phase is not active.', flowStateChanged: false as const };
  }

  const integrityError = validateQualifyingOfferCompensationState(s);
  if (integrityError) {
    return { success: false as const, error: integrityError, flowStateChanged: false as const };
  }

  const player = s.players.find((candidate) => candidate.id === playerId);
  if (!player || player.teamId !== teamId) {
    return { success: false as const, error: 'That club does not control this qualifying-offer decision.', flowStateChanged: false as const };
  }

  const amount = getQualifyingOfferSalaryForState(s);
  const eligible = getQualifyingOfferEligiblePlayers(s.players, teamId, s.serviceTime, amount)
    .some((candidate) => candidate.id === playerId);
  if (!eligible) {
    return { success: false as const, flowStateChanged: false as const };
  }

  const existing = s.draftState.qualifyingOffers.find((record) =>
    record.playerId === playerId && record.season === s.season,
  );
  if (existing) {
    return { success: false as const, record: existing, error: 'A qualifying offer is already recorded for this player.', flowStateChanged: false as const };
  }

  ensureQualifyingOfferSalaryForState(s);

  const record = issueQualifyingOfferCore(player, teamId, s.season, amount);
  s.draftState = {
    ...s.draftState,
    qualifyingOffers: [...s.draftState.qualifyingOffers, record],
  };

  if (s.offseasonState) {
    s.offseasonState = recordQualifyingOfferResults(s.offseasonState, [{
      playerId: record.playerId,
      teamId: record.teamId,
      amount: record.amount,
      status: record.status,
      signingTeamId: record.signingTeamId,
      compensationPickId: record.compensationPickId,
      compensationTier: null,
      forfeitedPick: null,
    }]);
  }

  s.news.unshift(...generateNews(s.rng.fork(), {
    type: 'qualifying_offer',
    season: s.season,
    day: s.day,
    data: {
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      teamId: player.teamId,
      teamName: getTeamById(player.teamId)?.name ?? player.teamId.toUpperCase(),
      amount: record.amount,
      outcome: 'issued',
    },
  }, s.players, s.season, s.day));

  return { success: true as const, record, flowStateChanged: true as const };
}

export function resolveOutstandingQualifyingOffers(s: FullGameState) {
  const integrityError = validateQualifyingOfferCompensationState(s);
  if (integrityError) {
    return { resolved: [], error: integrityError, flowStateChanged: false as const };
  }
  const offeredRecords = s.draftState.qualifyingOffers
    .filter((record) => record.season === s.season && record.status === 'offered')
    .sort((left, right) => left.teamId.localeCompare(right.teamId) || left.playerId.localeCompare(right.playerId));
  if (offeredRecords.length === 0) {
    return { resolved: [], flowStateChanged: false as const };
  }
  const missingPlayer = offeredRecords.find((record) => !s.players.some((player) => player.id === record.playerId));
  if (missingPlayer) {
    return {
      resolved: [],
      error: `Qualifying-offer state is inconsistent for player ${missingPlayer.playerId}.`,
      flowStateChanged: false as const,
    };
  }
  const amount = ensureQualifyingOfferSalaryForState(s);
  const playerIndex = new Map(s.players.map((player, index) => [player.id, index] as const));
  const resolved: Array<{
    playerId: string;
    status: string;
  }> = [];
  let flowStateChanged = false;

  for (const record of offeredRecords) {
    const index = playerIndex.get(record.playerId);
    if (index == null) {
      continue;
    }

    const player = s.players[index]!;
    const remainsEligible = player.teamId === record.teamId
      && getQualifyingOfferEligiblePlayers(s.players, record.teamId, s.serviceTime, amount)
        .some((candidate) => candidate.id === player.id);
    if (!remainsEligible) {
      const expiredRecord = { ...record, status: 'expired' as const };
      s.draftState = {
        ...s.draftState,
        qualifyingOffers: s.draftState.qualifyingOffers.map((entry) =>
          entry.playerId === record.playerId && entry.season === record.season ? expiredRecord : entry),
      };
      flowStateChanged = true;
      if (s.offseasonState) {
        s.offseasonState = recordQualifyingOfferResults(s.offseasonState, [{
          playerId: expiredRecord.playerId,
          teamId: expiredRecord.teamId,
          amount: expiredRecord.amount,
          status: expiredRecord.status,
          signingTeamId: expiredRecord.signingTeamId,
          compensationPickId: expiredRecord.compensationPickId,
          compensationTier: null,
          forfeitedPick: null,
        }]);
      }
      continue;
    }

    const result = resolveQualifyingOfferCore(player, record, s.rng.fork());
    flowStateChanged = true;
    s.players[index] = result.player;
    s.draftState = {
      ...s.draftState,
      qualifyingOffers: s.draftState.qualifyingOffers.map((entry) =>
        entry.playerId === result.record.playerId && entry.season === result.record.season
          ? result.record
          : entry),
    };
    if (s.offseasonState) {
      s.offseasonState = recordQualifyingOfferResults(s.offseasonState, [{
        playerId: result.record.playerId,
        teamId: result.record.teamId,
        amount: result.record.amount,
        status: result.record.status,
        signingTeamId: result.record.signingTeamId,
        compensationPickId: result.record.compensationPickId,
        compensationTier: null,
        forfeitedPick: null,
      }]);
    }
    resolved.push({
      playerId: result.record.playerId,
      status: result.record.status,
    });

    s.news.unshift(...generateNews(s.rng.fork(), {
      type: 'qualifying_offer',
      season: s.season,
      day: s.day,
      data: {
        playerId: result.record.playerId,
        playerName: `${result.player.firstName} ${result.player.lastName}`,
        teamId: result.record.teamId,
        teamName: getTeamById(result.record.teamId)?.name ?? result.record.teamId.toUpperCase(),
        amount: result.record.amount,
        outcome: result.record.status,
      },
    }, s.players, s.season, s.day));
  }

  return { resolved, flowStateChanged };
}

export function hireCoachForUserTeam(s: FullGameState, coachId: string) {
  if (!isOffseasonPhaseActive(s, 'coaching_changes')) {
    return { success: false as const, error: 'Coaching changes phase is not active.' };
  }

  const result = hireCoachCore(s.coachingStaffs, s.coachFreeAgentPool, s.userTeamId, coachId);
  if (!result.hiredCoach) {
    return { success: false as const };
  }

  s.coachingStaffs = result.coachingStaffs;
  s.coachFreeAgentPool = result.coachFreeAgentPool;

  if (s.offseasonState) {
    s.offseasonState = recordCoachChange(s.offseasonState, {
      teamId: s.userTeamId,
      coachId: result.hiredCoach.id,
      coachName: `${result.hiredCoach.firstName} ${result.hiredCoach.lastName}`,
      role: result.hiredCoach.role,
      action: 'hired',
      salary: result.hiredCoach.annualSalary,
    });
  }

  s.news.unshift(...generateNews(s.rng.fork(), {
    type: 'coaching',
    season: s.season,
    day: s.day,
    data: {
      teamId: s.userTeamId,
      teamName: getTeamById(s.userTeamId)?.name ?? s.userTeamId.toUpperCase(),
      coachName: `${result.hiredCoach.firstName} ${result.hiredCoach.lastName}`,
      role: result.hiredCoach.role,
    },
  }, s.players, s.season, s.day));

  return { success: true as const, coach: result.hiredCoach };
}

export function fireCoachForUserTeam(s: FullGameState, coachId: string) {
  if (!isOffseasonPhaseActive(s, 'coaching_changes')) {
    return { success: false as const, error: 'Coaching changes phase is not active.' };
  }

  const result = fireCoachCore(s.coachingStaffs, s.coachFreeAgentPool, s.userTeamId, coachId);
  if (!result.firedCoach) {
    return { success: false as const };
  }

  s.coachingStaffs = result.coachingStaffs;
  s.coachFreeAgentPool = result.coachFreeAgentPool;

  if (s.offseasonState) {
    s.offseasonState = recordCoachChange(s.offseasonState, {
      teamId: s.userTeamId,
      coachId: result.firedCoach.id,
      coachName: `${result.firedCoach.firstName} ${result.firedCoach.lastName}`,
      role: result.firedCoach.role,
      action: 'fired',
      salary: result.firedCoach.annualSalary,
    });
  }

  s.news.unshift(...generateNews(s.rng.fork(), {
    type: 'coaching',
    season: s.season,
    day: s.day,
    data: {
      teamId: s.userTeamId,
      teamName: getTeamById(s.userTeamId)?.name ?? s.userTeamId.toUpperCase(),
      coachName: `${result.firedCoach.firstName} ${result.firedCoach.lastName}`,
      role: result.firedCoach.role,
      record: `${s.seasonState.standings.getRecord(s.userTeamId)?.wins ?? 0}-${s.seasonState.standings.getRecord(s.userTeamId)?.losses ?? 0}`,
    },
  }, s.players, s.season, s.day));

  return { success: true as const, coach: result.firedCoach };
}

export function claimPlayerOffWaivers(
  s: FullGameState,
  playerId: string,
  claimingTeamId: string,
) {
  const previousMinorLeagueState = s.minorLeagueState;
  maybeAdvanceWaiverPriorityForClaim(s, playerId, claimingTeamId);

  const result = claimOffWaiversCore(s.players, s.minorLeagueState, playerId, claimingTeamId);
  if (!result.success) {
    // Priority simulation is part of the claim attempt, not an independent
    // gameplay mutation. A rejected claim must be snapshot-atomic.
    s.minorLeagueState = previousMinorLeagueState;
    return result;
  }

  s.players = result.players;
  s.minorLeagueState = result.state;

  const affectedTeams = new Set<string>([claimingTeamId]);
  for (const claim of s.minorLeagueState.waiverClaims) {
    if (claim.playerId === playerId) {
      affectedTeams.add(claim.fromTeamId);
    }
  }
  for (const teamId of affectedTeams) {
    s.rosterStates.set(teamId, buildRosterState(teamId, s.players));
  }

  return result;
}

function maybeAdvanceWaiverPriorityForClaim(
  s: FullGameState,
  playerId: string,
  claimingTeamId: string,
): void {
  const pendingClaim = s.minorLeagueState.waiverClaims.find((claim) =>
    claim.playerId === playerId && claim.status === 'pending',
  );
  if (!pendingClaim) {
    return;
  }

  const claimingPriorityIndex = pendingClaim.priorityTeamIds.indexOf(claimingTeamId);
  if (claimingPriorityIndex <= 0) {
    return;
  }

  const player = s.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    return;
  }

  const nextPriorityTeamIds: string[] = [];
  let blockingTeamId: string | null = null;
  const teamsAheadOfClaimant = pendingClaim.priorityTeamIds.slice(0, claimingPriorityIndex);
  for (const teamId of teamsAheadOfClaimant) {
    if (teamId === pendingClaim.fromTeamId) {
      continue;
    }

    const relationship = getRelationship(s.gmRelationships, teamId);
    const passRng = createStableWorkerRng(
      s,
      `waiver-pass:${pendingClaim.season}:${pendingClaim.day}:${playerId}:${claimingTeamId}:${teamId}`,
    );
    const shouldPass = shouldPassOnWaiverClaim(
      passRng,
      relationship,
      player.overallRating,
      claimingTeamId === s.userTeamId,
    );
    if (shouldPass) {
      continue;
    }

    blockingTeamId = teamId;
    nextPriorityTeamIds.push(teamId);
    break;
  }

  const suffixStartIndex = blockingTeamId == null
    ? claimingPriorityIndex
    : pendingClaim.priorityTeamIds.indexOf(blockingTeamId) + 1;
  nextPriorityTeamIds.push(...pendingClaim.priorityTeamIds.slice(suffixStartIndex));

  if (nextPriorityTeamIds.length === pendingClaim.priorityTeamIds.length) {
    return;
  }

  s.minorLeagueState = {
    ...s.minorLeagueState,
    waiverClaims: s.minorLeagueState.waiverClaims.map((claim) =>
      claim.playerId === playerId && claim.status === 'pending'
        ? {
          ...claim,
          priorityTeamIds: nextPriorityTeamIds,
        }
        : claim,
    ),
  };
}

export function placePlayerOnWaivers(
  s: FullGameState,
  player: GeneratedPlayer,
) {
  s.minorLeagueState = placeOnWaiversCore(
    s.minorLeagueState,
    player,
    buildWaiverPriorityForState(s),
    s.season,
    s.day,
  );
}

function ensureDraftPickOwnershipForSeason(s: FullGameState) {
  const pickOwnership = buildDraftPickOwnershipForSeason(s);
  if (pickOwnership === s.draftState.pickOwnership) {
    return;
  }
  s.draftState = {
    ...s.draftState,
    pickOwnership,
  };
}

function buildDraftPickOwnershipForSeason(s: FullGameState) {
  const requiredSeasons = new Set([s.season, s.season + 1]);
  const teamIds = TEAMS.map((team) => team.id);

  if (s.draftState.pickOwnership.length === 0) {
    return createDefaultDraftPickOwnership(teamIds, s.season);
  }

  const existingSeasonKeys = new Set(s.draftState.pickOwnership.map((pick) => pick.season));
  if ([...requiredSeasons].every((season) => existingSeasonKeys.has(season))) {
    return s.draftState.pickOwnership;
  }

  const supplemental = createDefaultDraftPickOwnership(teamIds, s.season)
    .filter((pick) => !s.draftState.pickOwnership.some((existing) =>
      existing.season === pick.season
      && existing.round === pick.round
      && existing.originalTeamId === pick.originalTeamId,
    ));
  return [...s.draftState.pickOwnership, ...supplemental];
}

function getTeamDraftScoutingReports(
  s: FullGameState,
  teamId: string,
): DraftScoutingReport[] {
  return s.draftState.scoutingReports.find(([candidateTeamId]) => candidateTeamId === teamId)?.[1] ?? [];
}

function upsertTeamDraftScoutingReport(
  s: FullGameState,
  teamId: string,
  report: DraftScoutingReport,
) {
  const nextReports = getTeamDraftScoutingReports(s, teamId);
  const updated = nextReports.some((entry) => entry.playerId === report.playerId)
    ? nextReports.map((entry) => (entry.playerId === report.playerId ? report : entry))
    : [...nextReports, report];

  s.draftState = {
    ...s.draftState,
    scoutingReports: s.draftState.scoutingReports.some(([candidateTeamId]) => candidateTeamId === teamId)
      ? s.draftState.scoutingReports.map(([candidateTeamId, reports]) => (
        candidateTeamId === teamId ? [candidateTeamId, updated] : [candidateTeamId, reports]
      ))
      : [...s.draftState.scoutingReports, [teamId, updated]],
  };
}

function getDraftSignabilityEntry(
  s: FullGameState,
  playerId: string,
): DraftSignability | null {
  return s.draftState.signability.find(([candidatePlayerId]) => candidatePlayerId === playerId)?.[1] ?? null;
}

function ensureDraftMetadataForSession(s: FullGameState, session: DraftClass) {
  const signabilityEntries = [...s.draftState.signability];
  let changed = false;

  for (const prospect of session.prospects) {
    if (signabilityEntries.some(([playerId]) => playerId === prospect.player.id)) {
      continue;
    }

    signabilityEntries.push([prospect.player.id, {
      playerId: prospect.player.id,
      background: prospect.background as DraftSignability['background'],
      commitmentStrength: prospect.commitmentStrength,
      signability: prospect.signability,
      slotValue: prospect.slotValue,
      askBonus: prospect.askBonus,
    }]);
    changed = true;
  }

  if (changed) {
    s.draftState = {
      ...s.draftState,
      signability: signabilityEntries,
    };
  }
}

function getUserBigBoard(s: FullGameState): string[] {
  return s.draftState.bigBoards.find(([teamId]) => teamId === s.userTeamId)?.[1] ?? [];
}

function upsertUserBigBoard(s: FullGameState, board: string[]) {
  s.draftState = {
    ...s.draftState,
    bigBoards: s.draftState.bigBoards.some(([teamId]) => teamId === s.userTeamId)
      ? s.draftState.bigBoards.map(([teamId, entries]) => (
        teamId === s.userTeamId ? [teamId, board] : [teamId, entries]
      ))
      : [...s.draftState.bigBoards, [s.userTeamId, board]],
  };
}

function ensureInternationalScoutingStateForSeason(
  s: FullGameState,
  rng: GameRNG = s.rng,
): InternationalScoutingState {
  const currentState = s.internationalScoutingState;
  if (
    currentState.season === s.season &&
    currentState.budgets.size === TEAMS.length
  ) {
    return currentState;
  }

  const nextState = createInternationalScoutingStateCore(
    rng.fork(),
    TEAMS.map((team) => team.id),
    s.season,
  );
  for (const team of TEAMS) {
    nextState.budgets.set(team.id, {
      baseAllocation: getTeamIFABonusPool(s, team.id),
      tradedIn: 0,
      tradedOut: 0,
      committed: 0,
    });
  }
  s.internationalScoutingState = nextState;
  return nextState;
}

function getTeamIFAScoutingHistory(
  s: FullGameState,
  teamId: string,
): IFAScoutingHistoryEntry[] {
  return s.internationalScoutingState.scoutingHistory.get(teamId) ?? [];
}

function upsertIFAScoutingHistory(
  s: FullGameState,
  teamId: string,
  nextEntry: IFAScoutingHistoryEntry,
) {
  const history = getTeamIFAScoutingHistory(s, teamId);
  const nextHistory = history.some((entry) => entry.playerId === nextEntry.playerId)
    ? history.map((entry) => (entry.playerId === nextEntry.playerId ? nextEntry : entry))
    : [...history, nextEntry];
  s.internationalScoutingState.scoutingHistory.set(teamId, nextHistory);
}

function applyIFASigningToLeague(
  s: FullGameState,
  prospect: InternationalProspect,
  teamId: string,
  bonusAmount: number,
) {
  const signingResult = signIFAProspectCore(
    s.internationalScoutingState,
    teamId,
    prospect.id,
    bonusAmount,
  );
  s.internationalScoutingState = signingResult.state;
  s.players.push(signingResult.signedPlayer);
  s.rosterStates.set(teamId, buildRosterState(teamId, s.players));
  registerInternationalProspectAcquisition(s, prospect.id, teamId, bonusAmount);

  if (s.offseasonState) {
    s.offseasonState = recordIFASigning(s.offseasonState, {
      playerId: prospect.id,
      teamId,
      playerName: `${prospect.firstName} ${prospect.lastName}`,
      position: prospect.position,
      country: prospect.country,
      bonusAmount,
    });
  }
}

function simulateInternationalSigningDay(s: FullGameState) {
  ensureInternationalScoutingStateForSeason(s);

  for (const teamId of TEAMS.map((team) => team.id)) {
    if (teamId === s.userTeamId) continue;
    if (s.rng.nextFloat() > 0.18) continue;

    const budget = s.internationalScoutingState.budgets.get(teamId);
    if (!budget || getRemainingIFABudget(budget) < 0.2) continue;

    const affordableProspects = getAvailableIFAProspects(s.internationalScoutingState)
      .filter((prospect) => prospect.expectedBonus <= getRemainingIFABudget(budget) * 1.1)
      .sort((left, right) => right.potentialRating - left.potentialRating)
      .slice(0, 8);

    if (affordableProspects.length === 0) continue;

    const selectionIndex = Math.min(
      affordableProspects.length - 1,
      Math.floor(s.rng.nextFloat() * Math.min(3, affordableProspects.length)),
    );
    const prospect = affordableProspects[selectionIndex]!;
    const bonusAmount = Math.min(
      getRemainingIFABudget(budget),
      Math.max(0.15, Math.round((prospect.expectedBonus * (0.92 + (s.rng.nextFloat() * 0.18))) * 100) / 100),
    );

    applyIFASigningToLeague(s, prospect, teamId, bonusAmount);
  }
}

function playerLabel(player: GeneratedPlayer | null | undefined): string {
  return player ? `${player.firstName} ${player.lastName}` : 'Unknown player';
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function sameDivision(teamA: string, teamB: string): boolean {
  const left = getTeamById(teamA);
  const right = getTeamById(teamB);
  return Boolean(left && right && left.division === right.division);
}

export function transactionToneForTeam(s: FullGameState, teamId: string): OffseasonTransactionTone {
  if (teamId === s.userTeamId) return 'user';
  return sameDivision(teamId, s.userTeamId) ? 'division_rival' : 'neutral';
}

function formatMoneyPerYear(value: number): string {
  return `$${value.toFixed(1)}M/yr`;
}

function formatTickerMoney(value: number): string {
  return `$${roundMoney(value).toFixed(1)}M`;
}

function appendArbitrationTickerEntries(
  s: FullGameState,
  entries: TickerEntry[],
) {
  if (entries.length === 0) {
    return;
  }

  s.tickerFeed = pruneTickerFeed(
    [...entries, ...s.tickerFeed],
    200,
    absoluteDay(s.season, s.day),
  );
}

function absoluteMomentDay(moment: Pick<SignatureMoment, 'season' | 'day' | 'timestamp'>): number {
  if (typeof moment.day === 'number') {
    return (moment.season * 1000) + moment.day;
  }

  if (typeof moment.timestamp === 'string') {
    const match = /^S(\d+)D(\d+)$/.exec(moment.timestamp);
    if (match) {
      return (Number(match[1]) * 1000) + Number(match[2]);
    }
  }

  return moment.season * 1000;
}

function compareSignatureMomentRecency(left: SignatureMoment, right: SignatureMoment): number {
  return absoluteMomentDay(right) - absoluteMomentDay(left)
    || right.relevance - left.relevance
    || left.type.localeCompare(right.type);
}

export function appendArbitrationMoments(
  s: FullGameState,
  playerId: string,
  nextMoments: SignatureMoment[],
) {
  if (nextMoments.length === 0) {
    return;
  }

  const merged = [...(s.playerMoments.get(playerId) ?? []), ...nextMoments]
    .sort(compareSignatureMomentRecency)
    .slice(0, MAX_MOMENTS_PER_PLAYER);
  s.playerMoments.set(playerId, merged);
}

export function appendPlayerMoments(
  s: FullGameState,
  playerId: string,
  nextMoments: SignatureMoment[],
) {
  appendArbitrationMoments(s, playerId, nextMoments);
}

export function appendTeamMoments(
  s: FullGameState,
  teamId: string,
  nextMoments: SignatureMoment[],
) {
  if (nextMoments.length === 0) {
    return;
  }

  const merged = [...(s.teamMoments.get(teamId) ?? []), ...nextMoments]
    .sort(compareSignatureMomentRecency)
    .slice(0, MAX_MOMENTS_PER_PLAYER);
  s.teamMoments.set(teamId, merged);
}

function formatYears(years: number): string {
  return `(${years} year${years === 1 ? '' : 's'})`;
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'season_review': return 'Season Review';
    case 'arbitration': return 'Arbitration';
    case 'tender_nontender': return 'Tender / Non-Tender';
    case 'extensions': return 'Extensions';
    case 'qualifying_offers': return 'Qualifying Offers';
    case 'free_agency': return 'Free Agency';
    case 'draft': return 'Amateur Draft';
    case 'protection_audit': return 'Protection Audit';
    case 'rule5_draft': return 'Rule 5 Draft';
    case 'international_signing': return 'International Signing';
    case 'coaching_changes': return 'Coaching Changes';
    case 'spring_training': return 'Spring Training';
    default: return phase;
  }
}

function buildDraftOrderFromStandings(seasonState: SeasonState): string[] {
  const records = new Map<string, { teamId: string; wins: number; losses: number }>();
  for (const entries of Object.values(seasonState.standings.getFullStandings())) {
    for (const entry of entries) {
      records.set(entry.teamId, { teamId: entry.teamId, wins: entry.wins, losses: entry.losses });
    }
  }

  for (const team of TEAMS) {
    if (!records.has(team.id)) {
      records.set(team.id, { teamId: team.id, wins: 0, losses: 0 });
    }
  }

  return determineDraftOrder(Array.from(records.values()));
}

function originLabel(origin: string): string {
  switch (origin) {
    case 'college':
    case 'college_senior':
      return 'College Senior';
    case 'college_underclass':
      return 'College Underclass';
    case 'high_school':
      return 'HS';
    case 'international':
      return 'International';
    default:
      return origin || 'Unknown';
  }
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function labelByBands(value: number, bands: Array<[number, string]>, fallback: string): string {
  for (const [threshold, label] of bands) {
    if (value >= threshold) {
      return label;
    }
  }
  return fallback;
}

function buildDraftProspectDecisionInputs(
  prospect: DraftProspect,
  report: DraftScoutingReport | undefined,
  scoutConflict: ScoutConflict | null,
  staffAccuracy: number,
): DraftProspectDecisionInputs {
  const displayedGrade = report?.overallGrade ?? prospect.scoutingGrade;
  const gradeGap = displayedGrade - prospect.scoutingGrade;
  const disagreementValue = scoutConflict?.divergence ?? Math.abs(gradeGap);
  const accuracyPct = clampPercent((report?.accuracy ?? staffAccuracy) * 100);
  const looks = report?.looks ?? 0;
  const makeupScore = clampPercent(
    (prospect.player.personality.workEthic * 0.45)
    + (prospect.player.personality.mentalToughness * 0.35)
    + (prospect.player.personality.leadership * 0.2),
  );
  const signabilityPct = clampPercent(prospect.signability * 100);
  const backgroundRisk = prospect.background === 'high_school'
    ? 12
    : prospect.background === 'college_underclass'
      ? 6
      : 0;
  const riskValue = clampPercent(
    ((1 - (report?.accuracy ?? staffAccuracy)) * 32)
    + Math.max(0, 3 - looks) * 5
    + ((1 - prospect.signability) * 24)
    + (prospect.commitmentStrength * 20)
    + backgroundRisk
    + Math.min(12, disagreementValue * 1.25),
  );
  const premiumPosition = prospect.player.position === 'C'
    || prospect.player.position === 'SS'
    || prospect.player.position === 'CF'
    || prospect.player.position === 'SP';
  const edge = gradeGap >= 3
    ? `a +${gradeGap} internal grade edge`
    : gradeGap <= -3
      ? `a ${gradeGap} internal grade warning`
      : 'a board grade close to consensus';
  const signabilityRead = signabilityPct >= 70
    ? 'signability is clean'
    : signabilityPct >= 50
      ? 'signability is workable'
      : 'signability needs attention';

  return {
    scoutAccuracy: {
      label: `Draft focus ${accuracyPct}%`,
      value: accuracyPct,
      detail: `${looks} look${looks === 1 ? '' : 's'} with the draft staff confidence model.`,
    },
    disagreement: {
      label: disagreementValue >= 8 ? 'Board fight' : disagreementValue >= 4 ? 'Meaningful gap' : 'Small gap',
      value: clampPercent(disagreementValue),
      detail: scoutConflict
        ? `Scout room divergence is ${scoutConflict.divergence}.`
        : gradeGap === 0
          ? 'Your room matches the consensus board.'
          : `Your room is ${Math.abs(gradeGap)} point${Math.abs(gradeGap) === 1 ? '' : 's'} ${gradeGap > 0 ? 'above' : 'below'} consensus.`,
    },
    makeup: {
      label: labelByBands(makeupScore, [[75, 'Strong makeup'], [58, 'Solid makeup'], [42, 'Mixed makeup']], 'Makeup concern'),
      value: makeupScore,
      detail: `Work ethic ${prospect.player.personality.workEthic}, mental toughness ${prospect.player.personality.mentalToughness}, leadership ${prospect.player.personality.leadership}.`,
    },
    signability: {
      label: labelByBands(signabilityPct, [[75, 'Clean sign'], [55, 'Workable sign'], [40, 'Difficult sign']], 'Hard sign'),
      value: signabilityPct,
      detail: `Ask $${prospect.askBonus.toFixed(2)}M against $${prospect.slotValue.toFixed(2)}M slot; commitment ${(prospect.commitmentStrength * 100).toFixed(0)}%.`,
    },
    risk: {
      label: labelByBands(100 - riskValue, [[68, 'Low risk'], [43, 'Moderate risk']], 'High risk'),
      value: riskValue,
      detail: `${originLabel(prospect.background)} profile, ${looks} look${looks === 1 ? '' : 's'}, and signability ${signabilityPct}%.`,
    },
    whyThisPick: `${premiumPosition ? 'Premium-position' : 'Board'} upside with ${edge}; ${signabilityRead}.`,
  };
}

function stableProspectSeed(baseSeed: number, scope: string, prospectId: string): number {
  let hash = baseSeed;
  const key = `${scope}:${prospectId}`;
  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash * 31) + key.charCodeAt(index)) | 0;
  }
  return hash === 0 ? baseSeed + 97 : hash;
}

function ensureDraftScoutConflicts(s: FullGameState, prospects: DraftProspect[]): Map<string, ScoutConflict> {
  const existing = new Map(
    s.scoutConflicts
      .filter((entry) => entry.prospectType === 'draft' && entry.teamId === s.userTeamId)
      .map((entry) => [entry.prospectId, entry] as const),
  );
  const staff = s.scoutingStaffs.get(s.userTeamId) ?? [];
  const topProspects = [...prospects]
    .sort((left, right) => right.scoutingGrade - left.scoutingGrade || left.player.id.localeCompare(right.player.id))
    .slice(0, 50);
  const generated: ScoutConflict[] = [];

  for (const prospect of topProspects) {
    if (existing.has(prospect.player.id)) {
      continue;
    }

    const conflict = generateScoutConflict(
      new GameRNG(stableProspectSeed(s.rng.getSeed(), `draft-${s.season}`, prospect.player.id)),
      prospect,
      staff,
      s.season,
      s.userTeamId,
    );
    existing.set(conflict.prospectId, conflict);
    generated.push(conflict);
  }

  if (generated.length > 0) {
    s.scoutConflicts = [...s.scoutConflicts, ...generated];
  }

  return existing;
}

function ensureIFAScoutConflicts(s: FullGameState, prospects: InternationalProspect[]): Map<string, ScoutConflict> {
  const existing = new Map(
    s.scoutConflicts
      .filter((entry) => entry.prospectType === 'ifa' && entry.teamId === s.userTeamId)
      .map((entry) => [entry.prospectId, entry] as const),
  );
  const staff = s.scoutingStaffs.get(s.userTeamId) ?? [];
  const generated: ScoutConflict[] = [];

  for (const prospect of prospects) {
    if (existing.has(prospect.id)) {
      continue;
    }

    const conflict = generateScoutConflict(
      new GameRNG(stableProspectSeed(s.rng.getSeed(), `ifa-${s.season}`, prospect.id)),
      prospect,
      staff,
      s.season,
      s.userTeamId,
    );
    existing.set(conflict.prospectId, conflict);
    generated.push(conflict);
  }

  if (generated.length > 0) {
    s.scoutConflicts = [...s.scoutConflicts, ...generated];
  }

  return existing;
}

export function resolvePersistedScoutConflicts(s: FullGameState) {
  if (s.scoutConflicts.length === 0) {
    return;
  }

  const outcomes = s.players
    .map((player) => ({
      prospectId: player.id,
      actualGrade: toDisplayRating(player.overallRating),
      mlbSeasons: Math.floor((s.serviceTime.get(player.id) ?? player.serviceTimeDays ?? 0) / 172),
    }))
    .filter((entry) => entry.mlbSeasons >= 2);

  s.scoutConflicts = resolveScoutConflicts(
    new GameRNG(stableProspectSeed(s.rng.getSeed(), `resolve-${s.season}`, s.userTeamId)),
    s.scoutConflicts,
    outcomes,
    s.season,
  );
}

function isDraftSessionState(value: DraftClass | DraftSessionState): value is DraftSessionState {
  return Array.isArray((value as DraftSessionState).draftOrder)
    && Array.isArray((value as DraftSessionState).pickSlots)
    && Array.isArray((value as DraftSessionState).completedPicks);
}

function getDraftStatus(session: DraftSessionState): DraftRoomStatus {
  const totalSlots = session.pickSlots.length;
  if (session.prospects.length === 0 || session.completedPicks.length >= totalSlots) {
    return 'complete';
  }
  if (session.completedPicks.length === 0) {
    return session.status === 'in_progress' ? 'in_progress' : 'available';
  }
  return 'in_progress';
}

function normalizeDraftRoomPick(
  userTeamId: string,
  entry: Partial<DraftRoomPick>,
): DraftRoomPick {
  const teamId = entry.teamId ?? '';
  const team = getTeamById(teamId);
  const tone = teamId === userTeamId
    ? 'user'
    : sameDivision(teamId, userTeamId)
      ? 'division_rival'
      : 'neutral';

  return {
    slotId: entry.slotId ?? `pick-${entry.pickNumber ?? 1}`,
    round: entry.round ?? 1,
    pickNumber: entry.pickNumber ?? 1,
    teamId,
    teamName: entry.teamName ?? (team ? `${team.city} ${team.name}` : teamId.toUpperCase()),
    teamAbbreviation: entry.teamAbbreviation ?? (team?.abbreviation ?? teamId.toUpperCase()),
    playerId: entry.playerId ?? '',
    playerName: entry.playerName ?? 'Unknown Prospect',
    position: entry.position ?? 'UNK',
    scoutingGrade: entry.scoutingGrade ?? 0,
    origin: originLabel(entry.origin ?? 'Unknown'),
    slotKind: entry.slotKind ?? 'standard',
    compensation: entry.compensation ?? null,
    tone,
  };
}

function buildDraftCompensationContext(
  s: FullGameState,
  slotId: string,
  compensationForPlayerId: string | null,
): DraftCompensationContext | null {
  if (!compensationForPlayerId) {
    return null;
  }

  const compensationPick = s.draftState.compensatoryPicks.find((entry) => entry.id === slotId) ?? null;
  const player = s.players.find((entry) => entry.id === compensationForPlayerId) ?? null;
  const playerName = player ? `${player.firstName} ${player.lastName}` : compensationForPlayerId;
  const fromTeamId = compensationPick?.compensationFromTeamId ?? null;

  return {
    compensationForPlayerId,
    compensationForPlayerName: playerName,
    compensationFromTeamId: fromTeamId,
    compensationFromTeamName: fromTeamId ? teamLabel(fromTeamId) : null,
  };
}

export function createDraftSessionState(
  draftClass: DraftClass,
  seasonState: SeasonState,
  draftState: PersistentDraftState,
): DraftSessionState {
  const draftOrder = buildDraftOrderFromStandings(seasonState);
  return {
    ...draftClass,
    draftOrder,
    pickSlots: buildDraftPickSlots(draftOrder, draftState.pickOwnership, draftState.compensatoryPicks, draftClass.season),
    completedPicks: [],
    status: 'available',
  };
}

export function normalizeDraftSessionState(
  draftClass: DraftSessionState | DraftClass | null,
  seasonState: SeasonState,
  draftState: PersistentDraftState,
  userTeamId: string,
): DraftSessionState | null {
  if (!draftClass) {
    return null;
  }

  const normalized = isDraftSessionState(draftClass)
    ? {
      ...draftClass,
      draftOrder: draftClass.draftOrder.length > 0
        ? [...draftClass.draftOrder]
        : buildDraftOrderFromStandings(seasonState),
      pickSlots: draftClass.pickSlots.length > 0
        ? [...draftClass.pickSlots]
        : buildDraftPickSlots(
          buildDraftOrderFromStandings(seasonState),
          draftState.pickOwnership,
          draftState.compensatoryPicks,
          draftClass.season,
        ),
      completedPicks: draftClass.completedPicks.map((pick) => normalizeDraftRoomPick(userTeamId, pick)),
    }
    : createDraftSessionState(draftClass, seasonState, draftState);

  return {
    ...normalized,
    status: getDraftStatus(normalized),
  };
}

function getCurrentDraftSlot(session: DraftSessionState) {
  if (session.prospects.length === 0) {
    return null;
  }

  const totalSlots = session.pickSlots.length;
  if (session.completedPicks.length >= totalSlots) {
    return null;
  }

  const currentSlot = session.pickSlots[session.completedPicks.length];
  if (!currentSlot) {
    return null;
  }

  const pickInRound = session.pickSlots
    .filter((slot) => slot.round === currentSlot.round && slot.pickNumber <= currentSlot.pickNumber)
    .length;

  return {
    slotId: currentSlot.slotId,
    round: currentSlot.round,
    pickNumber: currentSlot.pickNumber,
    pickInRound,
    teamId: currentSlot.teamId,
    slotKind: currentSlot.kind,
    compensationForPlayerId: currentSlot.compensationForPlayerId,
  };
}

function ensureDraftSession(s: FullGameState): DraftSessionState | null {
  ensureDraftPickOwnershipForSeason(s);
  const normalized = normalizeDraftSessionState(s.draftClass, s.seasonState, s.draftState, s.userTeamId);
  s.draftClass = normalized;
  if (normalized) {
    ensureDraftMetadataForSession(s, normalized);
  }
  return normalized;
}

function draftSlotIdentity(slot: DraftPickSlot): string {
  return [
    slot.slotId,
    slot.season,
    slot.round,
    slot.pickNumber,
    slot.teamId,
    slot.originalTeamId ?? '',
    slot.kind,
    slot.compensationForPlayerId ?? '',
    slot.compensationFromTeamId ?? '',
    slot.compensationPriority ?? '',
  ].join('|');
}

export function validateQualifyingOfferCompensationState(s: FullGameState): string | null {
  const seasonRecords = s.draftState.qualifyingOffers.filter((record) => record.season === s.season);
  const seasonAwards = s.draftState.compensatoryPicks.filter((pick) => pick.season === s.season);
  const seasonOwnership = s.draftState.pickOwnership.filter((pick) => pick.season === s.season);
  const seasonResults = s.offseasonState?.season === s.season
    ? s.offseasonState.phaseResults.qualifyingOffers
    : [];
  const compensationResults = seasonResults.filter((result) => result.status === 'compensated');
  const fixedSalary = s.offseasonState?.season === s.season
    ? s.offseasonState.phaseResults.qualifyingOfferSalary
    : null;
  const playersById = new Map(s.players.map((player) => [player.id, player] as const));

  const recordIds = new Set<string>();
  for (const record of seasonRecords) {
    if (recordIds.has(record.playerId)) {
      return `Qualifying-offer compensation is inconsistent: duplicate record for player ${record.playerId}.`;
    }
    recordIds.add(record.playerId);
    if (!playersById.has(record.playerId)) {
      return `Qualifying-offer compensation is inconsistent: player ${record.playerId} is missing.`;
    }
    if (fixedSalary == null || record.amount !== fixedSalary) {
      return `Qualifying-offer compensation has an inconsistent frozen salary for player ${record.playerId}.`;
    }

    const lifecycle = seasonResults.filter((result) => result.playerId === record.playerId);
    if (lifecycle.some((result) => result.teamId !== record.teamId || result.amount !== record.amount)) {
      return `Qualifying-offer lifecycle facts are inconsistent for player ${record.playerId}.`;
    }
    const count = (status: OffseasonState['phaseResults']['qualifyingOffers'][number]['status']) => (
      lifecycle.filter((result) => result.status === status).length
    );
    if (count('offered') !== 1) {
      return `Qualifying-offer lifecycle is missing or duplicating issuance for player ${record.playerId}.`;
    }
    const lifecycleMatchesStatus = (() => {
      switch (record.status) {
        case 'offered':
          return lifecycle.length === 1;
        case 'accepted':
          return count('accepted') === 1 && lifecycle.length === 2;
        case 'rejected':
          return count('rejected') === 1 && lifecycle.length === 2;
        case 'compensated':
          return count('rejected') === 1 && count('compensated') === 1 && lifecycle.length === 3;
        case 'expired':
          return count('expired') === 1
            && count('accepted') === 0
            && count('compensated') === 0
            && count('rejected') <= 1
            && lifecycle.length === 2 + count('rejected');
      }
    })();
    if (!lifecycleMatchesStatus) {
      return `Qualifying-offer lifecycle status is inconsistent for player ${record.playerId}.`;
    }
  }

  const ownershipIds = new Set<string>();
  for (const pick of seasonOwnership) {
    const descriptor = `${pick.season}:${pick.round}:${pick.originalTeamId}`;
    if (ownershipIds.has(descriptor)) {
      return `Qualifying-offer compensation is inconsistent: duplicate draft-pick ownership ${descriptor}.`;
    }
    ownershipIds.add(descriptor);
  }

  const awardIds = new Set<string>();
  for (const award of seasonAwards) {
    if (awardIds.has(award.id)) {
      return `Qualifying-offer compensation is inconsistent: duplicate award ${award.id}.`;
    }
    awardIds.add(award.id);
  }

  for (const record of seasonRecords) {
    if (record.status !== 'compensated') {
      if (record.compensationPickId !== null) {
        return `Qualifying-offer compensation is inconsistent for player ${record.playerId}.`;
      }
      continue;
    }

    if (!record.signingTeamId || !record.compensationPickId) {
      return `Qualifying-offer compensation is incomplete for player ${record.playerId}.`;
    }
    const player = playersById.get(record.playerId)!;
    if (player.teamId !== record.signingTeamId) {
      return `Qualifying-offer signing assignment is inconsistent for player ${record.playerId}.`;
    }
    const signingReceipts = s.offseasonState?.season === s.season
      ? s.offseasonState.phaseResults.freeAgentSignings.filter((signing) => (
        signing.playerId === record.playerId
        && signing.teamId === record.signingTeamId
        && signing.years === player.contract.years
        && signing.annualSalary === player.contract.annualSalary
        && signing.totalValue === player.contract.totalValue
      ))
      : [];
    if (signingReceipts.length !== 1) {
      return `Qualifying-offer free-agent signing receipt is inconsistent for player ${record.playerId}.`;
    }
    if (s.freeAgencyMarket) {
      const signedRows = s.freeAgencyMarket.signedPlayers.filter((entry) => (
        entry.player.id === record.playerId
        && entry.signedWith === record.signingTeamId
        && entry.contract?.playerId === record.playerId
        && entry.contract.teamId === record.signingTeamId
        && entry.contract.years === player.contract.years
        && entry.contract.annualSalary === player.contract.annualSalary
        && entry.contract.totalValue === player.contract.totalValue
      ));
      if (signedRows.length !== 1) {
        return `Qualifying-offer signed-market fact is inconsistent for player ${record.playerId}.`;
      }
    }
    const awards = seasonAwards.filter((award) => (
      award.id === record.compensationPickId
      && award.compensationForPlayerId === record.playerId
      && award.awardedToTeamId === record.teamId
      && award.compensationFromTeamId === record.signingTeamId
    ));
    if (awards.length !== 1) {
      return `Qualifying-offer compensation award is inconsistent for player ${record.playerId}.`;
    }
    const award = awards[0]!;
    const awardTier = award.order < 100 ? 'premium' : 'standard';

    const results = compensationResults.filter((result) => (
      result.playerId === record.playerId
      && result.teamId === record.teamId
      && result.signingTeamId === record.signingTeamId
      && result.compensationPickId === record.compensationPickId
      && result.amount === record.amount
      && result.compensationTier === awardTier
      && result.forfeitedPick !== null
      && result.forfeitedPick.season === s.season
    ));
    if (results.length !== 1) {
      return `Qualifying-offer compensation receipt is inconsistent for player ${record.playerId}.`;
    }
    const result = results[0]!;
    const losses = seasonOwnership.filter((pick) => (
      pick.round === result.forfeitedPick!.round
      && pick.originalTeamId === result.forfeitedPick!.originalTeamId
      && pick.currentTeamId === record.signingTeamId
      && pick.forfeited
    ));
    if (losses.length !== 1) {
      return `Qualifying-offer pick forfeiture is inconsistent for player ${record.playerId}.`;
    }
  }

  for (const award of seasonAwards) {
    const records = seasonRecords.filter((record) => (
      record.status === 'compensated'
      && record.playerId === award.compensationForPlayerId
      && record.teamId === award.awardedToTeamId
      && record.signingTeamId === award.compensationFromTeamId
      && record.compensationPickId === award.id
    ));
    if (records.length !== 1) {
      return `Qualifying-offer compensation award ${award.id} is orphaned or duplicated.`;
    }
  }

  for (const result of compensationResults) {
    const records = seasonRecords.filter((record) => (
      record.status === 'compensated'
      && record.playerId === result.playerId
      && record.teamId === result.teamId
      && record.signingTeamId === result.signingTeamId
      && record.compensationPickId === result.compensationPickId
    ));
    if (records.length !== 1 || !result.signingTeamId || !result.forfeitedPick) {
      return `Qualifying-offer compensation receipt is orphaned or duplicated for player ${result.playerId}.`;
    }
  }

  for (const loss of seasonOwnership.filter((pick) => pick.forfeited)) {
    const results = compensationResults.filter((result) => (
      result.signingTeamId === loss.currentTeamId
      && result.forfeitedPick?.season === loss.season
      && result.forfeitedPick.round === loss.round
      && result.forfeitedPick.originalTeamId === loss.originalTeamId
    ));
    if (results.length !== 1) {
      return `Qualifying-offer forfeiture ${loss.season}:${loss.round}:${loss.originalTeamId} is orphaned or duplicated.`;
    }
  }

  return null;
}

function validateDraftSessionTopology(s: FullGameState, session: DraftSessionState): string | null {
  const compensationError = validateQualifyingOfferCompensationState(s);
  if (compensationError) {
    return compensationError;
  }
  if (session.season !== s.season) {
    return 'Draft session belongs to a different season.';
  }

  const expectedOrder = buildDraftOrderFromStandings(s.seasonState);
  const expectedSlots = buildDraftPickSlots(
    expectedOrder,
    buildDraftPickOwnershipForSeason(s),
    s.draftState.compensatoryPicks,
    session.season,
  );
  if (
    session.draftOrder.length !== expectedOrder.length
    || session.draftOrder.some((teamId, index) => teamId !== expectedOrder[index])
    || session.pickSlots.length !== expectedSlots.length
    || session.pickSlots.some((slot, index) => draftSlotIdentity(slot) !== draftSlotIdentity(expectedSlots[index]!))
  ) {
    return 'Draft session pick order does not match current pick ownership and compensation.';
  }

  if (session.completedPicks.length > expectedSlots.length) {
    return 'Draft session completed picks exceed the canonical draft slots.';
  }
  const completedSlotIds = new Set<string>();
  const completedPlayerIds = new Set<string>();
  const availableProspectIds = new Set(session.prospects.map((prospect) => prospect.player.id));
  const draftReceipts = s.offseasonState?.season === s.season
    ? s.offseasonState.phaseResults.draftPicks
    : [];
  for (const [index, pick] of session.completedPicks.entries()) {
    const expectedSlot = expectedSlots[index]!;
    if (
      pick.slotId !== expectedSlot.slotId
      || pick.round !== expectedSlot.round
      || pick.pickNumber !== expectedSlot.pickNumber
      || pick.teamId !== expectedSlot.teamId
      || (pick.slotKind ?? 'standard') !== expectedSlot.kind
      || (pick.compensation?.compensationForPlayerId ?? null) !== expectedSlot.compensationForPlayerId
      || (pick.compensation?.compensationFromTeamId ?? null) !== expectedSlot.compensationFromTeamId
    ) {
      return 'Draft session completed picks do not match the canonical slot prefix.';
    }
    if (completedSlotIds.has(pick.slotId) || completedPlayerIds.has(pick.playerId)) {
      return 'Draft session completed picks contain a duplicate slot or player.';
    }
    if (!pick.playerId || availableProspectIds.has(pick.playerId)) {
      return 'Draft session completed picks conflict with the available prospect pool.';
    }
    const player = s.players.find((candidate) => candidate.id === pick.playerId);
    if (!player) {
      return 'Draft session completed picks conflict with canonical player assignment.';
    }
    const signingDecisions = s.draftState.signingDecisions.filter((decision) => (
      decision.playerId === pick.playerId
      && decision.season === s.season
    ));
    if (signingDecisions.length > 1 || signingDecisions.some((decision) => decision.teamId !== pick.teamId)) {
      return 'Draft session completed picks conflict with canonical signing decisions.';
    }
    const signingDecision = signingDecisions[0] ?? null;
    const playerOrigin = s.playerOrigins.get(pick.playerId) ?? null;
    if (!signingDecision && player.teamId !== pick.teamId) {
      return 'Draft session completed picks conflict with canonical player assignment.';
    }
    if (signingDecision?.signed && (
      player.teamId !== pick.teamId
      || playerOrigin?.acquisitionType !== 'draft'
      || playerOrigin.originTeamId !== pick.teamId
      || playerOrigin.draftSeason !== s.season
      || playerOrigin.draftRound !== pick.round
      || playerOrigin.draftPickNumber !== pick.pickNumber
    )) {
      return 'Draft session completed picks conflict with canonical acquisition facts.';
    }
    if (signingDecision?.signed === false && player.teamId !== '') {
      return 'Draft session completed picks conflict with canonical unsigned-player assignment.';
    }
    const matchingReceipts = draftReceipts.filter((receipt) => (
      receipt.round === pick.round
      && receipt.pickNumber === pick.pickNumber
      && receipt.teamId === pick.teamId
      && receipt.playerId === pick.playerId
      && receipt.playerName === pick.playerName
      && receipt.position === pick.position
      && receipt.scoutingGrade === pick.scoutingGrade
      && receipt.origin === pick.origin
    ));
    if (matchingReceipts.length !== 1) {
      return 'Draft session completed picks conflict with canonical draft receipts.';
    }
    completedSlotIds.add(pick.slotId);
    completedPlayerIds.add(pick.playerId);
  }
  for (const receipt of draftReceipts) {
    const matchingPicks = session.completedPicks.filter((pick) => (
      pick.round === receipt.round
      && pick.pickNumber === receipt.pickNumber
      && pick.teamId === receipt.teamId
      && pick.playerId === receipt.playerId
      && pick.playerName === receipt.playerName
      && pick.position === receipt.position
      && pick.scoutingGrade === receipt.scoutingGrade
      && pick.origin === receipt.origin
    ));
    if (matchingPicks.length !== 1) {
      return 'Draft session contains an orphaned or duplicate canonical draft receipt.';
    }
  }
  return null;
}

function captureDraftMutationCheckpoint(s: FullGameState) {
  return {
    rng: s.rng.getState(),
    draftState: s.draftState,
    draftClass: s.draftClass,
    scoutConflicts: s.scoutConflicts,
  };
}

function restoreDraftMutationCheckpoint(
  s: FullGameState,
  checkpoint: ReturnType<typeof captureDraftMutationCheckpoint>,
) {
  s.rng = GameRNG.fromState(checkpoint.rng);
  s.draftState = checkpoint.draftState;
  s.draftClass = checkpoint.draftClass;
  s.scoutConflicts = checkpoint.scoutConflicts;
}

function captureIFAMutationCheckpoint(s: FullGameState) {
  return {
    rng: s.rng.getState(),
    internationalScoutingState: s.internationalScoutingState,
    scoutConflicts: s.scoutConflicts,
  };
}

function restoreIFAMutationCheckpoint(
  s: FullGameState,
  checkpoint: ReturnType<typeof captureIFAMutationCheckpoint>,
) {
  s.rng = GameRNG.fromState(checkpoint.rng);
  s.internationalScoutingState = checkpoint.internationalScoutingState;
  s.scoutConflicts = checkpoint.scoutConflicts;
}

function recordDraftPickForState(
  s: FullGameState,
  session: DraftSessionState,
  slot: NonNullable<ReturnType<typeof getCurrentDraftSlot>>,
  prospect: DraftProspect,
): DraftRoomPick | null {
  const teamId = slot.teamId;
  const team = getTeamById(teamId);
  const pick: DraftRoomPick = {
    slotId: slot.slotId,
    round: slot.round,
    pickNumber: slot.pickNumber,
    teamId,
    teamName: team ? `${team.city} ${team.name}` : teamId.toUpperCase(),
    teamAbbreviation: team?.abbreviation ?? teamId.toUpperCase(),
    playerId: prospect.player.id,
    playerName: `${prospect.player.firstName} ${prospect.player.lastName}`,
    position: prospect.player.position,
    scoutingGrade: prospect.scoutingGrade,
    origin: originLabel(prospect.collegeOrHS),
    slotKind: slot.slotKind,
    compensation: buildDraftCompensationContext(s, slot.slotId, slot.compensationForPlayerId),
    tone: transactionToneForTeam(s, teamId),
  };

  // Draft creation is an alternate offseason entry point. Establish the
  // once-only contract-clock receipt before a drafted player, session, or
  // roster can change; an out-of-phase null state is an exact no-op.
  if (!ensureOffseasonState(s)) return null;

  updatePlayerTeamAssignment(prospect.player, teamId, s.season);
  if (!s.players.some((player) => player.id === prospect.player.id)) {
    s.players.push(prospect.player);
  }

  session.prospects = session.prospects.filter((candidate) => candidate.player.id !== prospect.player.id);
  session.completedPicks = [...session.completedPicks, pick];
  session.status = getDraftStatus(session);
  s.rosterStates.set(teamId, buildRosterState(teamId, s.players));

  const offseasonState = s.offseasonState;
  if (!offseasonState) return null;
  s.offseasonState = recordDraftPicks(offseasonState, [{
    round: pick.round,
    pickNumber: pick.pickNumber,
    teamId: pick.teamId,
    playerId: pick.playerId,
    playerName: pick.playerName,
    position: pick.position,
    scoutingGrade: pick.scoutingGrade,
    origin: pick.origin,
  }]);

  return pick;
}

function advanceDraftToUserTurn(s: FullGameState): DraftRoomPick[] {
  const session = ensureDraftSession(s);
  if (!session) {
    return [];
  }

  const newPicks: DraftRoomPick[] = [];
  let currentSlot = getCurrentDraftSlot(session);
  while (currentSlot && session.prospects.length > 0 && currentSlot.teamId !== s.userTeamId) {
    const teamRoster = s.players.filter((player) => player.teamId === currentSlot?.teamId);
    const selection = aiSelectPick(s.rng.fork(), currentSlot.teamId, session.prospects, teamRoster);
    const pick = recordDraftPickForState(s, session, currentSlot, selection);
    if (!pick) break;
    newPicks.push(pick);
    currentSlot = getCurrentDraftSlot(session);
  }

  session.status = getDraftStatus(session);
  return newPicks;
}

function assessmentForDraftPick(pick: DraftRoomPick, totalPicks: number): string {
  const expectedGrade = 66 - ((pick.pickNumber - 1) / Math.max(1, totalPicks - 1)) * 28;
  const delta = pick.scoutingGrade - expectedGrade;

  if (delta >= 8) return 'Clear value pick with impact upside.';
  if (delta >= 3) return 'Strong value with a realistic path to contributing.';
  if (delta >= -2) return 'On-slot selection with balanced risk and upside.';
  if (delta >= -7) return 'Development bet that may need patience.';
  return 'Longer-term project relative to the slot.';
}

function overallDraftGrade(picks: DraftRoomPick[], totalPicks: number): string {
  if (picks.length === 0) {
    return 'Incomplete';
  }

  const averageDelta = picks.reduce((sum, pick) => {
    const expectedGrade = 66 - ((pick.pickNumber - 1) / Math.max(1, totalPicks - 1)) * 28;
    return sum + (pick.scoutingGrade - expectedGrade);
  }, 0) / picks.length;

  if (averageDelta >= 8) return 'A';
  if (averageDelta >= 4) return 'B';
  if (averageDelta >= 0) return 'C';
  if (averageDelta >= -4) return 'D';
  return 'F';
}

function buildDraftBoard(s: FullGameState, session: DraftSessionState | null) {
  ensureDraftPickOwnershipForSeason(s);
  const draftOrder = session?.draftOrder ?? buildDraftOrderFromStandings(s.seasonState);
  const pickSlots = session?.pickSlots ?? buildDraftPickSlots(
    draftOrder,
    s.draftState.pickOwnership,
    s.draftState.compensatoryPicks,
    s.season,
  );
  const teams = (pickSlots.length > 0 ? pickSlots.filter((slot) => slot.round === 1) : draftOrder.map((teamId, index) => ({
    slotId: `fallback-${index + 1}`,
    teamId,
  }))).map((slot) => {
    const teamId = 'teamId' in slot ? slot.teamId : slot;
    const team = getTeamById(teamId);
    return {
      teamId,
      teamName: team ? `${team.city} ${team.name}` : teamId.toUpperCase(),
      abbreviation: team?.abbreviation ?? teamId.toUpperCase(),
      tone: transactionToneForTeam(s, teamId),
    };
  });

  const picksByKey = new Map(
    (session?.completedPicks ?? []).map((pick) => [pick.slotId, pick] as const),
  );

  const rounds: DraftBoardRow[] = [];
  for (let round = 1; round <= DRAFT_ROUNDS; round++) {
    const roundSlots = pickSlots.filter((slot) => slot.round === round);
    rounds.push({
      round,
      cells: roundSlots.map((slot, index) => ({
        slotId: slot.slotId,
        round,
        pickInRound: index + 1,
        teamId: slot.teamId,
        teamAbbreviation: getTeamById(slot.teamId)?.abbreviation ?? slot.teamId.toUpperCase(),
        tone: transactionToneForTeam(s, slot.teamId),
        compensation: buildDraftCompensationContext(s, slot.slotId, slot.compensationForPlayerId),
        pick: picksByKey.get(slot.slotId) ?? null,
      })),
    });
  }

  return { teams, rounds };
}

export function buildDraftRoomView(s: FullGameState): DraftRoomView | null {
  const previousDraftState = s.draftState;
  const previousDraftClass = s.draftClass;
  const previousScoutConflicts = s.scoutConflicts;
  try {
  const session = ensureDraftSession(s);
  const userReports = new Map(
    getTeamDraftScoutingReports(s, s.userTeamId).map((report) => [report.playerId, report] as const),
  );
  const userBigBoard = getUserBigBoard(s);
  const bigBoardIndex = new Map(userBigBoard.map((playerId, index) => [playerId, index] as const));
  if (!session) {
    if (s.phase !== 'offseason') {
      return null;
    }

    return {
      status: 'available',
      availableProspects: [],
      udfaProspects: [],
      completedPicks: [],
      currentPick: null,
      board: buildDraftBoard(s, null),
      counts: {
        totalRounds: DRAFT_ROUNDS,
        totalPicks: 0,
        picksMade: 0,
        picksRemaining: 0,
      },
      userDraftClass: null,
      userBigBoard,
    };
  }

  const scoutConflicts = ensureDraftScoutConflicts(s, session.prospects);
  const baseDraftAccuracy = getInternationalScoutAccuracy(s.scoutingStaffs.get(s.userTeamId) ?? []);
  const draftStaffAccuracy = getEffectiveScoutingAccuracy(s, 'draft', baseDraftAccuracy).effectiveAccuracy;
  const sortedProspects = [...session.prospects].sort((left, right) => {
    const leftBoardRank = bigBoardIndex.get(left.player.id);
    const rightBoardRank = bigBoardIndex.get(right.player.id);
    if (leftBoardRank != null || rightBoardRank != null) {
      if (leftBoardRank == null) return 1;
      if (rightBoardRank == null) return -1;
      if (leftBoardRank !== rightBoardRank) return leftBoardRank - rightBoardRank;
    }

    const leftReport = userReports.get(left.player.id);
    const rightReport = userReports.get(right.player.id);
    const leftGrade = leftReport?.overallGrade ?? left.scoutingGrade;
    const rightGrade = rightReport?.overallGrade ?? right.scoutingGrade;
    if (rightGrade !== leftGrade) {
      return rightGrade - leftGrade;
    }
    return `${left.player.lastName}${left.player.firstName}`.localeCompare(
      `${right.player.lastName}${right.player.firstName}`,
    );
  });
  const availableProspects = sortedProspects.map((prospect) => {
    const report = userReports.get(prospect.player.id);
    const scoutConflict = scoutConflicts.get(prospect.player.id) ?? null;
    return {
      id: prospect.player.id,
      playerId: prospect.player.id,
      name: `${prospect.player.firstName} ${prospect.player.lastName}`,
      firstName: prospect.player.firstName,
      lastName: prospect.player.lastName,
      position: prospect.player.position,
      scoutingGrade: report?.overallGrade ?? prospect.scoutingGrade,
      consensusGrade: prospect.scoutingGrade,
      looks: report?.looks ?? 0,
      slotValue: prospect.slotValue,
      askBonus: prospect.askBonus,
      background: originLabel(prospect.background),
      bigBoardRank: bigBoardIndex.get(prospect.player.id) != null ? (bigBoardIndex.get(prospect.player.id)! + 1) : null,
      age: prospect.player.age,
      origin: originLabel(prospect.collegeOrHS),
      scoutConflict,
      decisionInputs: buildDraftProspectDecisionInputs(prospect, report, scoutConflict, draftStaffAccuracy),
    };
  });

  const currentSlot = session.status === 'complete' ? null : getCurrentDraftSlot(session);
  const totalPicks = session.pickSlots.length;
  const currentTeam = currentSlot ? getTeamById(currentSlot.teamId) : null;
  const slotsById = new Map(session.pickSlots.map((slot) => [slot.slotId, slot] as const));
  const userPicks = session.completedPicks.filter((pick) => pick.teamId === s.userTeamId);
  const signingDecisions = new Map(s.draftState.signingDecisions.map((entry) => [entry.playerId, entry] as const));

  return {
    status: session.status,
    availableProspects,
    udfaProspects: session.status === 'complete'
      ? availableProspects.slice(0, Math.max(0, DRAFT_CLASS_SIZE - totalPicks))
      : [],
    completedPicks: session.completedPicks.map((pick) => {
      const slot = slotsById.get(pick.slotId);
      return {
        ...pick,
        compensation: pick.compensation ?? (slot ? buildDraftCompensationContext(s, slot.slotId, slot.compensationForPlayerId) : null),
      };
    }),
    currentPick: currentSlot ? {
      slotId: currentSlot.slotId,
      round: currentSlot.round,
      pickNumber: currentSlot.pickNumber,
      pickInRound: currentSlot.pickInRound,
      totalPicks,
      teamId: currentSlot.teamId,
      teamName: currentTeam ? `${currentTeam.city} ${currentTeam.name}` : currentSlot.teamId.toUpperCase(),
      teamAbbreviation: currentTeam?.abbreviation ?? currentSlot.teamId.toUpperCase(),
      userOnClock: currentSlot.teamId === s.userTeamId,
    } : null,
    board: buildDraftBoard(s, session),
    counts: {
      totalRounds: DRAFT_ROUNDS,
      totalPicks,
      picksMade: session.completedPicks.length,
      picksRemaining: session.prospects.length,
    },
    userDraftClass: userPicks.length > 0 ? {
      picks: userPicks.map((pick) => ({
        playerId: pick.playerId,
        playerName: pick.playerName,
        position: pick.position,
        scoutingGrade: pick.scoutingGrade,
        origin: pick.origin,
        slotValue: getDraftSignabilityEntry(s, pick.playerId)?.slotValue ?? 0,
        askBonus: getDraftSignabilityEntry(s, pick.playerId)?.askBonus ?? 0,
        signed: signingDecisions.get(pick.playerId)?.signed ?? null,
        agreedBonus: signingDecisions.get(pick.playerId)?.agreedBonus ?? null,
        assessment: assessmentForDraftPick(pick, totalPicks),
      })),
      overallGrade: overallDraftGrade(userPicks, totalPicks),
      averageScoutingGrade: Number(
        (userPicks.reduce((sum, pick) => sum + pick.scoutingGrade, 0) / userPicks.length).toFixed(1),
      ),
    } : null,
    userBigBoard,
  };
  } finally {
    // A route query may normalize missing legacy/fresh-save scaffolding to
    // build its deterministic view, but it must never mutate canonical worker
    // state merely because the player opened Draft.
    s.draftState = previousDraftState;
    s.draftClass = previousDraftClass;
    s.scoutConflicts = previousScoutConflicts;
  }
}

export function buildIFAPoolView(s: FullGameState): IFAPoolView {
  const previousInternationalState = s.internationalScoutingState;
  const previousScoutConflicts = s.scoutConflicts;
  try {
  const internationalState = ensureInternationalScoutingStateForSeason(
    s,
    GameRNG.fromState(s.rng.getState()),
  );
  const userBudget = internationalState.budgets.get(s.userTeamId) ?? {
    baseAllocation: 0,
    tradedIn: 0,
    tradedOut: 0,
    committed: 0,
  };
  const scoutingHistory = getTeamIFAScoutingHistory(s, s.userTeamId);
  const reportsByPlayerId = new Map(
    scoutingHistory.map((entry) => [entry.playerId, entry] as const),
  );
  const baseStaffAccuracy = getInternationalScoutAccuracy(
    s.scoutingStaffs.get(s.userTeamId) ?? [],
  );
  const staffAccuracy = getEffectiveScoutingAccuracy(s, 'international', baseStaffAccuracy).effectiveAccuracy;
  const scoutConflicts = ensureIFAScoutConflicts(s, internationalState.ifaPool);

  return {
    season: internationalState.season,
    currentPhase: s.offseasonState?.currentPhase ?? null,
    signingWindowOpen: s.phase === 'offseason' && s.offseasonState?.currentPhase === 'international_signing',
    budget: {
      baseAllocation: userBudget.baseAllocation,
      tradedIn: userBudget.tradedIn,
      tradedOut: userBudget.tradedOut,
      committed: userBudget.committed,
      remaining: getRemainingIFABudget(userBudget),
    },
    staffAccuracy,
    prospects: [...internationalState.ifaPool]
      .sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === 'available' ? -1 : 1;
        }
        return right.potentialRating - left.potentialRating;
      })
      .map((prospect) => {
        const historyEntry = reportsByPlayerId.get(prospect.id);
        const report = historyEntry?.report;
        return {
          id: prospect.id,
          playerName: `${prospect.firstName} ${prospect.lastName}`,
          age: prospect.age,
          position: prospect.position,
          region: prospect.region,
          country: prospect.country,
          expectedBonus: prospect.expectedBonus,
          status: prospect.status,
          signedTeamId: prospect.signedTeamId,
          signedBonus: prospect.signedBonus,
          looks: historyEntry?.looks ?? 0,
          overall: report?.overallGrade ?? null,
          confidence: report?.confidence ?? null,
          ceiling: report?.ceiling ?? null,
          floor: report?.floor ?? null,
          notes: report?.notes ?? null,
          scoutConflict: scoutConflicts.get(prospect.id) ?? null,
        };
      }),
  };
  } finally {
    // Deterministic pool/conflict previews are derived for presentation. Only
    // an accepted scouting/signing/pool mutation may install them canonically.
    s.internationalScoutingState = previousInternationalState;
    s.scoutConflicts = previousScoutConflicts;
  }
}

export function scoutUserIFAPlayer(
  s: FullGameState,
  playerId: string,
): { success: true; report: IFAReportView } | { success: false; error: string } {
  if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'international_signing') {
    return { success: false, error: 'International signing is not active.' };
  }

  const checkpoint = captureIFAMutationCheckpoint(s);
  ensureInternationalScoutingStateForSeason(s);
  const prospect = s.internationalScoutingState.ifaPool.find((entry) => entry.id === playerId);
  if (!prospect) {
    restoreIFAMutationCheckpoint(s, checkpoint);
    return { success: false, error: 'International prospect not found.' };
  }
  if (prospect.status !== 'available') {
    restoreIFAMutationCheckpoint(s, checkpoint);
    return { success: false, error: 'This prospect has already signed.' };
  }

  const historyEntry = getTeamIFAScoutingHistory(s, s.userTeamId)
    .find((entry) => entry.playerId === playerId);
  const looks = (historyEntry?.looks ?? 0) + 1;
  const baseAccuracy = getInternationalScoutAccuracy(
    s.scoutingStaffs.get(s.userTeamId) ?? [],
  );
  const accuracy = getEffectiveScoutingAccuracy(s, 'international', baseAccuracy).effectiveAccuracy;
  const report = scoutIFAProspect(
    s.rng.fork(),
    prospect,
    accuracy,
    looks,
  );

  upsertIFAScoutingHistory(s, s.userTeamId, {
    playerId,
    looks,
    report,
  });

  return {
    success: true,
    report: {
      playerId,
      playerName: `${prospect.firstName} ${prospect.lastName}`,
      position: prospect.position,
      age: prospect.age,
      region: prospect.region,
      country: prospect.country,
      expectedBonus: prospect.expectedBonus,
      looks,
      grades: report.observedRatings,
      overall: report.overallGrade,
      confidence: report.confidence,
      ceiling: report.ceiling,
      floor: report.floor,
      notes: report.notes,
      reliability: Math.max(1, Math.min(5, Math.round(report.reliability * 5))),
      scoutConflict: ensureIFAScoutConflicts(s, [prospect]).get(playerId) ?? null,
    },
  };
}

export function signUserIFAPlayer(
  s: FullGameState,
  playerId: string,
  bonusAmount: number,
): { success: true; remainingBudget: number } | { success: false; error: string } {
  if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'international_signing') {
    return { success: false, error: 'International signing is not active.' };
  }

  const checkpoint = captureIFAMutationCheckpoint(s);
  ensureInternationalScoutingStateForSeason(s);
  const prospect = s.internationalScoutingState.ifaPool.find((entry) => entry.id === playerId);
  if (!prospect) {
    restoreIFAMutationCheckpoint(s, checkpoint);
    return { success: false, error: 'International prospect not found.' };
  }

  try {
    applyIFASigningToLeague(s, prospect, s.userTeamId, bonusAmount);
  } catch (error) {
    restoreIFAMutationCheckpoint(s, checkpoint);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to complete IFA signing.',
    };
  }

  return {
    success: true,
    remainingBudget: getRemainingIFABudget(
      s.internationalScoutingState.budgets.get(s.userTeamId)!,
    ),
  };
}

export function tradeUserIFABonusPool(
  s: FullGameState,
  toTeamId: string,
  amount: number,
): { success: true; remainingBudget: number } | { success: false; error: string } {
  if (!isOffseasonPhaseActive(s, 'international_signing')) {
    return { success: false, error: 'International signing phase is not active.' };
  }

  const checkpoint = captureIFAMutationCheckpoint(s);
  ensureInternationalScoutingStateForSeason(s);

  try {
    s.internationalScoutingState = tradeIFABonusPoolCore(
      s.internationalScoutingState,
      s.userTeamId,
      toTeamId,
      amount,
    );
  } catch (error) {
    restoreIFAMutationCheckpoint(s, checkpoint);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to trade IFA pool space.',
    };
  }

  return {
    success: true,
    remainingBudget: getRemainingIFABudget(
      s.internationalScoutingState.budgets.get(s.userTeamId)!,
    ),
  };
}

export function scoutUserDraftPlayer(
  s: FullGameState,
  playerId: string,
): { success: true; report: DraftScoutingReport } | { success: false; error: string } {
  if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'draft') {
    return { success: false, error: 'Draft actions are available only during the draft phase.' };
  }
  const compensationError = validateQualifyingOfferCompensationState(s);
  if (compensationError) {
    return { success: false, error: compensationError };
  }
  const checkpoint = captureDraftMutationCheckpoint(s);
  const session = ensureDraftSession(s);
  const topologyError = session ? validateDraftSessionTopology(s, session) : null;
  if (topologyError) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, error: topologyError };
  }
  const prospect = session?.prospects.find((candidate) => candidate.player.id === playerId);
  if (!session || !prospect) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, error: 'Draft prospect not available.' };
  }

  const staff = s.scoutingStaffs.get(s.userTeamId) ?? [];
  const baseAccuracy = getInternationalScoutAccuracy(staff);
  const accuracy = getEffectiveScoutingAccuracy(s, 'draft', baseAccuracy).effectiveAccuracy;
  const previousReport = getTeamDraftScoutingReports(s, s.userTeamId)
    .find((report) => report.playerId === playerId);
  const nextLook = (previousReport?.looks ?? 0) + 1;
  const scoutRng = new GameRNG(stableProspectSeed(
    s.rng.getSeed(),
    `draft-scout-${s.season}-look-${nextLook}`,
    playerId,
  ));
  const report = scoutDraftProspect(scoutRng, prospect, accuracy, previousReport);
  upsertTeamDraftScoutingReport(s, s.userTeamId, report);
  ensureDraftScoutConflicts(s, [prospect]);
  return { success: true, report };
}

export function toggleUserDraftBigBoardPlayer(
  s: FullGameState,
  playerId: string,
): { success: true; board: string[] } | { success: false; error: string } {
  if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'draft') {
    return { success: false, error: 'Draft actions are available only during the draft phase.' };
  }
  const compensationError = validateQualifyingOfferCompensationState(s);
  if (compensationError) {
    return { success: false, error: compensationError };
  }
  const checkpoint = captureDraftMutationCheckpoint(s);
  const session = ensureDraftSession(s);
  const topologyError = session ? validateDraftSessionTopology(s, session) : null;
  if (topologyError) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, error: topologyError };
  }
  if (!session || !session.prospects.some((prospect) => prospect.player.id === playerId)) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, error: 'Draft prospect not available.' };
  }

  const currentBoard = getUserBigBoard(s);
  const nextBoard = currentBoard.includes(playerId)
    ? currentBoard.filter((entry) => entry !== playerId)
    : [...currentBoard, playerId];
  upsertUserBigBoard(s, nextBoard);
  return { success: true, board: nextBoard };
}

function recordDraftSigningDecision(
  s: FullGameState,
  playerId: string,
  teamId: string,
  signed: boolean,
  offeredBonus: number,
  agreedBonus: number | null,
  returnPath: 'organization' | 'college',
) {
  const decision = {
    playerId,
    teamId,
    season: s.season,
    signed,
    offeredBonus,
    agreedBonus,
    returnPath,
  } as const;

  s.draftState = {
    ...s.draftState,
    signingDecisions: s.draftState.signingDecisions.some((entry) => entry.playerId === playerId)
      ? s.draftState.signingDecisions.map((entry) => (entry.playerId === playerId ? decision : entry))
      : [...s.draftState.signingDecisions, decision],
  };
}

function applyUnsignedDraftOutcome(
  s: FullGameState,
  playerId: string,
  teamId: string,
) {
  const player = s.players.find((candidate) => candidate.id === playerId);
  if (!player) return;

  releasePlayerAssignment(player, s.season);
  player.rosterStatus = 'INTERNATIONAL';
  player.minorLeagueLevel = 'INTERNATIONAL';
  s.rosterStates.set(teamId, buildRosterState(teamId, s.players));
}

function buildDraftProspectFromState(
  s: FullGameState,
  playerId: string,
  scoutingGrade: number,
  round: number,
  pickNumber: number,
): DraftProspect | null {
  const player = s.players.find((candidate) => candidate.id === playerId);
  const signabilityEntry = getDraftSignabilityEntry(s, playerId);
  if (!player || !signabilityEntry) {
    return null;
  }

  return {
    player,
    scoutingGrade,
    signability: signabilityEntry.signability,
    collegeOrHS: signabilityEntry.background,
    background: signabilityEntry.background,
    commitmentStrength: signabilityEntry.commitmentStrength,
    draftRound: round,
    positionRank: 0,
    slotValue: signabilityEntry.slotValue,
    askBonus: signabilityEntry.askBonus,
    consensusRank: pickNumber,
  };
}

export function signUserDraftPick(
  s: FullGameState,
  playerId: string,
  bonusAmount: number,
): { success: true; signed: boolean; message: string } | { success: false; error: string } {
  if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'draft') {
    return { success: false, error: 'Draft actions are available only during the draft phase.' };
  }
  const compensationError = validateQualifyingOfferCompensationState(s);
  if (compensationError) {
    return { success: false, error: compensationError };
  }
  const checkpoint = captureDraftMutationCheckpoint(s);
  const session = ensureDraftSession(s);
  const topologyError = session ? validateDraftSessionTopology(s, session) : null;
  if (topologyError) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, error: topologyError };
  }
  const pick = session?.completedPicks.find((entry) => entry.playerId === playerId && entry.teamId === s.userTeamId);
  if (!pick) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, error: 'Drafted player not found.' };
  }
  if (s.draftState.signingDecisions.some((entry) => entry.playerId === playerId)) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, error: 'Signing decision already recorded.' };
  }

  const prospect = buildDraftProspectFromState(s, playerId, pick.scoutingGrade, pick.round, pick.pickNumber);
  if (!prospect) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, error: 'Draft metadata unavailable.' };
  }

  const outcome = resolveDraftSigning(s.rng.fork(), prospect, bonusAmount);
  recordDraftSigningDecision(
    s,
    playerId,
    s.userTeamId,
    outcome.signed,
    outcome.offeredBonus,
    outcome.signed ? outcome.offeredBonus : null,
    outcome.returnPath,
  );

  if (!outcome.signed) {
    applyUnsignedDraftOutcome(s, playerId, s.userTeamId);
    return { success: true, signed: false, message: 'Player declined and will head to school.' };
  }

  registerDraftedProspectAcquisition(
    s,
    playerId,
    s.userTeamId,
    pick.round,
    pick.pickNumber,
    prospect.scoutingGrade,
    outcome.offeredBonus,
  );

  return { success: true, signed: true, message: 'Player signed and joined the organization.' };
}

function autoResolveAIDraftSignings(s: FullGameState) {
  const session = ensureDraftSession(s);
  if (!session || session.status !== 'complete') {
    return;
  }

  for (const pick of session.completedPicks) {
    if (pick.teamId === s.userTeamId) continue;
    if (s.draftState.signingDecisions.some((entry) => entry.playerId === pick.playerId)) continue;

    const prospect = buildDraftProspectFromState(s, pick.playerId, pick.scoutingGrade, pick.round, pick.pickNumber);
    if (!prospect) continue;

    const offer = Math.max(0.05, Math.round(prospect.askBonus * (0.95 + s.rng.nextFloat() * 0.12) * 100) / 100);
    const outcome = resolveDraftSigning(s.rng.fork(), prospect, offer);
    recordDraftSigningDecision(
      s,
      pick.playerId,
      pick.teamId,
      outcome.signed,
      outcome.offeredBonus,
      outcome.signed ? outcome.offeredBonus : null,
      outcome.returnPath,
    );

    if (!outcome.signed) {
      applyUnsignedDraftOutcome(s, pick.playerId, pick.teamId);
      continue;
    }

    registerDraftedProspectAcquisition(
      s,
      pick.playerId,
      pick.teamId,
      pick.round,
      pick.pickNumber,
      prospect.scoutingGrade,
      outcome.offeredBonus,
    );
  }
}

export function startDraftSession(s: FullGameState, draftClass?: DraftClass): DraftActionResult {
  if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'draft') {
    return { success: false, draft: null, newPicks: [], error: 'Draft is only available during the draft phase' };
  }
  const compensationError = validateQualifyingOfferCompensationState(s);
  if (compensationError) {
    return { success: false, draft: null, newPicks: [], error: compensationError };
  }
  const checkpoint = captureDraftMutationCheckpoint(s);
  if (draftClass) {
    ensureDraftPickOwnershipForSeason(s);
    ensureDraftMetadataForSession(s, draftClass);
    s.draftClass = createDraftSessionState(draftClass, s.seasonState, s.draftState);
  }

  const session = ensureDraftSession(s);
  if (!session) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, draft: null, newPicks: [], error: 'Draft class unavailable' };
  }
  const topologyError = validateDraftSessionTopology(s, session);
  if (topologyError) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, draft: null, newPicks: [], error: topologyError };
  }

  if (session.status === 'complete') {
    return { success: true, draft: buildDraftRoomView(s), newPicks: [], flowStateChanged: false };
  }

  session.status = 'in_progress';
  const newPicks = advanceDraftToUserTurn(s);
  session.status = getDraftStatus(session);
  return {
    success: true,
    draft: buildDraftRoomView(s),
    newPicks,
    flowStateChanged: true,
  };
}

export function makeUserDraftSelection(s: FullGameState, prospectId: string): DraftActionResult {
  if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'draft') {
    return { success: false, draft: null, newPicks: [], error: 'Draft is only available during the draft phase' };
  }
  const compensationError = validateQualifyingOfferCompensationState(s);
  if (compensationError) {
    return { success: false, draft: null, newPicks: [], error: compensationError };
  }
  const checkpoint = captureDraftMutationCheckpoint(s);
  const session = ensureDraftSession(s);
  const topologyError = session ? validateDraftSessionTopology(s, session) : null;
  if (topologyError) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, draft: null, newPicks: [], error: topologyError };
  }
  const currentSlot = session ? getCurrentDraftSlot(session) : null;
  if (!session || !currentSlot) {
    const draft = buildDraftRoomView(s);
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, draft, newPicks: [], error: 'Draft is not active' };
  }
  if (currentSlot.teamId !== s.userTeamId) {
    const draft = buildDraftRoomView(s);
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, draft, newPicks: [], error: 'You are not on the clock' };
  }

  const prospect = session.prospects.find((candidate) => candidate.player.id === prospectId);
  if (!prospect) {
    const draft = buildDraftRoomView(s);
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, draft, newPicks: [], error: 'Prospect not available' };
  }

  const selectedPick = recordDraftPickForState(s, session, currentSlot, prospect);
  if (!selectedPick) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, draft: null, newPicks: [], error: 'Offseason state is unavailable' };
  }
  const newPicks = [selectedPick, ...advanceDraftToUserTurn(s)];
  session.status = getDraftStatus(session);
  if (session.status === 'complete') {
    autoResolveAIDraftSignings(s);
  }
  return {
    success: true,
    draft: buildDraftRoomView(s),
    newPicks,
  };
}

export function simulateRemainingDraftSession(s: FullGameState): DraftActionResult {
  if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'draft') {
    return { success: false, draft: null, newPicks: [], error: 'Draft is only available during the draft phase' };
  }
  const compensationError = validateQualifyingOfferCompensationState(s);
  if (compensationError) {
    return { success: false, draft: null, newPicks: [], error: compensationError };
  }
  const checkpoint = captureDraftMutationCheckpoint(s);
  const session = ensureDraftSession(s);
  if (!session) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, draft: null, newPicks: [], error: 'Draft class unavailable' };
  }
  const topologyError = validateDraftSessionTopology(s, session);
  if (topologyError) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, draft: null, newPicks: [], error: topologyError };
  }

  const signingDecisionCountBefore = s.draftState.signingDecisions.length;
  session.status = 'in_progress';
  const newPicks: DraftRoomPick[] = [];
  let currentSlot = getCurrentDraftSlot(session);

  while (currentSlot && session.prospects.length > 0) {
    const teamRoster = s.players.filter((player) => player.teamId === currentSlot?.teamId);
    const selection = aiSelectPick(s.rng.fork(), currentSlot.teamId, session.prospects, teamRoster);
    const pick = recordDraftPickForState(s, session, currentSlot, selection);
    if (!pick) break;
    newPicks.push(pick);
    currentSlot = getCurrentDraftSlot(session);
  }

  session.status = getDraftStatus(session);
  if (session.status === 'complete') {
    autoResolveAIDraftSignings(s);
  }
  return {
    success: true,
    draft: buildDraftRoomView(s),
    newPicks,
    flowStateChanged: newPicks.length > 0 || s.draftState.signingDecisions.length !== signingDecisionCountBefore,
  };
}

function normalizeDraftPickResult(entry: Partial<DraftPickResult> & { playerName?: string }): DraftPickResult {
  return {
    round: entry.round ?? 1,
    pickNumber: entry.pickNumber ?? 1,
    teamId: entry.teamId ?? '',
    playerId: entry.playerId ?? '',
    playerName: entry.playerName ?? 'Unknown Prospect',
    position: entry.position ?? 'UNK',
    scoutingGrade: entry.scoutingGrade ?? 0,
    origin: entry.origin ?? 'Unknown',
  };
}

function normalizeRetirementResult(
  entry: RetirementResult | string,
  players: GeneratedPlayer[],
  serviceTime: Map<string, number>,
): RetirementResult {
  if (typeof entry !== 'string') {
    return {
      playerId: entry.playerId,
      teamId: entry.teamId,
      playerName: entry.playerName,
      seasonsPlayed: entry.seasonsPlayed,
      summary: entry.summary,
    };
  }

  const player = players.find((candidate) => candidate.id === entry);
  const seasonsPlayed = serviceTime.get(entry) ?? 0;
  const name = playerLabel(player);
  return {
    playerId: entry,
    teamId: player?.teamId ?? '',
    playerName: name,
    seasonsPlayed,
    summary: `${name} retired after ${seasonsPlayed} seasons.`,
  };
}

export function normalizeOffseasonState(
  offseasonState: OffseasonState | null,
  players: GeneratedPlayer[],
  serviceTime: Map<string, number>,
): OffseasonState | null {
  if (!offseasonState) return null;

  const phaseResults = offseasonState.phaseResults as Partial<OffseasonState['phaseResults']> & {
    draftPicks?: Array<Partial<DraftPickResult>>;
    extensions?: Array<{
      playerId?: string;
      teamId?: string;
      status?: 'accepted' | 'rejected';
      years?: number;
      annualSalary?: number;
      totalValue?: number;
    }>;
    qualifyingOffers?: Array<{
      playerId?: string;
      teamId?: string;
      amount?: number;
      status?: 'offered' | 'accepted' | 'rejected' | 'compensated' | 'expired';
      signingTeamId?: string | null;
      compensationPickId?: string | null;
      compensationTier?: 'premium' | 'standard' | null;
      forfeitedPick?: {
        season?: number;
        round?: number;
        originalTeamId?: string;
      } | null;
    }>;
    coachChanges?: Array<{
      teamId?: string;
      coachId?: string;
      coachName?: string;
      role?: string;
      action?: 'hired' | 'fired';
      salary?: number;
    }>;
    ifaSignings?: Array<{
      playerId?: string;
      teamId?: string;
      playerName?: string;
      position?: string;
      country?: string;
      bonusAmount?: number;
    }>;
    retiredPlayers?: Array<RetirementResult | string>;
  };
  const qualifyingOfferResults = (phaseResults.qualifyingOffers ?? []).map((entry) => ({
    playerId: entry.playerId ?? '',
    teamId: entry.teamId ?? '',
    amount: entry.amount ?? 0,
    status: entry.status ?? 'offered',
    signingTeamId: entry.signingTeamId ?? null,
    compensationPickId: entry.compensationPickId ?? null,
    compensationTier: entry.compensationTier ?? null,
    forfeitedPick: entry.forfeitedPick
      ? {
        season: entry.forfeitedPick.season ?? offseasonState.season,
        round: entry.forfeitedPick.round ?? 0,
        originalTeamId: entry.forfeitedPick.originalTeamId ?? '',
      }
      : null,
  }));
  const factualQualifyingOfferSalary = qualifyingOfferResults.find((entry) => entry.status === 'offered')?.amount
    ?? qualifyingOfferResults[0]?.amount
    ?? null;

  return {
    ...offseasonState,
    serviceTimeReconciled: offseasonState.serviceTimeReconciled ?? false,
    phaseResults: {
      arbitrationPrepared: phaseResults.arbitrationPrepared ?? false,
      arbitrationDocket: phaseResults.arbitrationDocket ?? [],
      arbitrationResolved: phaseResults.arbitrationResolved ?? [],
      tenderedPlayers: phaseResults.tenderedPlayers ?? [],
      nonTenderedPlayers: phaseResults.nonTenderedPlayers ?? [],
      extensions: (phaseResults.extensions ?? []).map((entry) => ({
        playerId: entry.playerId ?? '',
        teamId: entry.teamId ?? '',
        status: entry.status ?? 'rejected',
        years: entry.years ?? 0,
        annualSalary: entry.annualSalary ?? 0,
        totalValue: entry.totalValue ?? 0,
      })),
      qualifyingOfferSalary: phaseResults.qualifyingOfferSalary ?? factualQualifyingOfferSalary,
      qualifyingOffers: qualifyingOfferResults,
      coachChanges: (phaseResults.coachChanges ?? []).map((entry) => ({
        teamId: entry.teamId ?? '',
        coachId: entry.coachId ?? '',
        coachName: entry.coachName ?? 'Unknown coach',
        role: entry.role ?? 'coach',
        action: entry.action ?? 'hired',
        salary: entry.salary ?? 0,
      })),
      freeAgentSignings: phaseResults.freeAgentSignings ?? [],
      draftPicks: (phaseResults.draftPicks ?? []).map((entry) => normalizeDraftPickResult(entry)),
      ifaSignings: (phaseResults.ifaSignings ?? []).map((entry) => ({
        playerId: entry.playerId ?? '',
        teamId: entry.teamId ?? '',
        playerName: entry.playerName ?? 'Unknown prospect',
        position: entry.position ?? 'UNK',
        country: entry.country ?? 'Unknown',
        bonusAmount: entry.bonusAmount ?? 0,
      })),
      retiredPlayers: (phaseResults.retiredPlayers ?? []).map((entry) =>
        normalizeRetirementResult(entry, players, serviceTime)),
    },
  };
}

function currentRule5TeamId(session: Rule5SessionState | null): string | null {
  if (!session || session.phase === 'complete') return null;
  return session.draftOrder[session.currentTeamIndex] ?? null;
}

function buildRule5StateView(s: FullGameState): Rule5StateView | undefined {
  if (!s.rule5Session) return undefined;
  const protectedIds = new Set(s.rule5Session.protectedPlayerIdsByTeam[s.userTeamId] ?? []);

  return {
    phase: s.rule5Session.phase,
    currentTeamId: currentRule5TeamId(s.rule5Session),
    draftOrder: [...s.rule5Session.draftOrder],
    consecutivePasses: s.rule5Session.consecutivePasses,
    protectedCount: s.rule5Session.protectedPlayerIdsByTeam[s.userTeamId]?.length ?? 0,
    protectedLimit: FORTY_MAN_LIMIT,
    protectedPlayers: s.rule5Session.candidatePlayers
      .filter((player) => protectedIds.has(player.playerId))
      .map((player) => ({ ...player })),
    eligiblePlayers: s.rule5Session.eligiblePlayers.map((player) => ({ ...player })),
    selections: s.rule5Session.selections.map((selection) => ({ ...selection })),
    obligations: s.rule5Obligations.map((obligation) => ({ ...obligation })),
    offerBackStates: s.rule5OfferBackStates.map((entry) => ({ ...entry })),
  };
}

function offseasonPhaseIndex(phase: string): number {
  return OFFSEASON_PHASES.indexOf(phase as (typeof OFFSEASON_PHASES)[number]);
}

function phaseCommandStatus(
  currentPhase: string,
  targetPhase: string,
  hasAttention: boolean,
): OffseasonCommandStatus {
  const currentIndex = offseasonPhaseIndex(currentPhase);
  const targetIndex = offseasonPhaseIndex(targetPhase);

  if (currentIndex > targetIndex) return 'complete';
  if (currentIndex < targetIndex) return 'upcoming';
  return hasAttention ? 'attention' : 'complete';
}

function rosterWarningTitle(issue: RosterComplianceIssue): string {
  switch (issue.code) {
    case 'active_roster_under_limit':
      return 'Roster hole';
    case 'active_roster_over_limit':
      return 'Roster over limit';
    case 'forty_man_over_limit':
      return '40-man overflow';
    case 'mlb_not_on_40_man':
      return '40-man mismatch';
    default:
      return 'Roster warning';
  }
}

function buildOffseasonCommandCenter(s: FullGameState): OffseasonCommandCenterView {
  const teamId = s.userTeamId;
  const currentPhase = s.offseasonState?.currentPhase ?? 'season_review';
  const rosterState = s.rosterStates.get(teamId);
  const teamPlayers = s.players.filter((player) => player.teamId === teamId);
  const activeRosterLimit = getActiveRosterLimit(1);
  const activeRosterCount = rosterState?.mlbRoster.length ?? 0;
  const fortyManCount = rosterState?.fortyManRoster.length ?? 0;
  const rosterHoleCount = Math.max(0, activeRosterLimit - activeRosterCount);
  const rosterIssues = rosterState
    ? getRosterComplianceIssuesCore(teamPlayers, rosterState, 1)
    : [];
  const payroll = calculateStateTeamPayroll(s, teamId).totalPayroll;
  const ownerPayrollPolicy = buildOwnerPayrollPolicy(s, teamId);
  const budget = getDifficultyAdjustedBudget(s, teamId);
  const payrollCap = getTeamPayrollCap(s, teamId);
  const payrollSpace = roundMoney(budget - payroll);
  const capSpace = roundMoney(payrollCap - payroll);
  const arbitrationEligible = getArbEligiblePlayers(s.players, teamId, s.serviceTime);
  const arbitrationResolvedIds = new Set(
    s.offseasonState?.phaseResults.arbitrationResolved
      .filter((entry) => entry.teamId === teamId)
      .map((entry) => entry.playerId) ?? [],
  );
  const arbitrationRemaining = arbitrationEligible.filter((player) => !arbitrationResolvedIds.has(player.id)).length;
  const qualifyingOfferEligible = getQualifyingOfferEligiblePlayers(
    s.players,
    teamId,
    s.serviceTime,
    getQualifyingOfferSalaryForState(s),
  );
  const activeQualifyingOffers = s.draftState.qualifyingOffers.filter((record) =>
    record.teamId === teamId
    && record.season === s.season
    && record.status === 'offered',
  ).length;
  const rule5AtRisk = s.rule5Session?.eligiblePlayers.filter((player) => player.teamId === teamId).length ?? 0;
  const rule5PendingOffers = s.rule5OfferBackStates.filter((entry) =>
    entry.draftingTeamId === teamId && entry.status === 'pending',
  ).length;
  const coachingStaffCount = s.coachingStaffs.get(teamId)?.length ?? 0;
  const missingStaffCount = Math.max(0, COACH_ROLES.length - coachingStaffCount);
  const budgetOverage = Math.max(0, payroll - Math.min(budget, payrollCap));
  const lowPayrollSpace = budgetOverage === 0 && payrollSpace < Math.max(5, budget * 0.03);

  const projectedOpeningDay: OffseasonOpeningDayProjection = {
    activeRosterCount,
    activeRosterLimit,
    fortyManCount,
    fortyManLimit: FORTY_MAN_LIMIT,
    payroll,
    budget,
    payrollCap,
    payrollSpace,
    capSpace,
    ownerPayrollPolicy,
    marketRevenueStatement: getSettledMarketRevenueStatement(s, teamId),
    rosterHoleCount,
  };

  const warnings: OffseasonCommandWarning[] = rosterIssues.map((issue) => ({
    id: `roster-${issue.code}${issue.playerId ? `-${issue.playerId}` : ''}`,
    severity: issue.severity === 'error' ? 'danger' : 'warning',
    title: rosterWarningTitle(issue),
    detail: issue.message,
    playerId: issue.playerId,
    teamId,
  }));

  if (budgetOverage > 0) {
    warnings.push({
      id: 'budget-over-cap',
      severity: 'danger',
      title: 'Budget overage',
      detail: `Projected payroll is ${formatTickerMoney(budgetOverage)} above the tighter owner budget/payroll cap line.`,
      teamId,
    });
  } else if (lowPayrollSpace) {
    warnings.push({
      id: 'budget-low-space',
      severity: 'warning',
      title: 'Limited payroll space',
      detail: `Only ${formatTickerMoney(Math.max(0, payrollSpace))} remains before the owner budget line.`,
      teamId,
    });
  }

  if (ownerPayrollPolicy.ownerBand === 'below_floor') {
    warnings.push({
      id: 'owner-payroll-floor',
      severity: 'warning',
      title: 'Advisory owner payroll floor',
      detail: `Current payroll is $${ownerPayrollPolicy.floorShortfall.toFixed(1)}M below the $${ownerPayrollPolicy.floor.toFixed(1)}M owner floor. Final pressure is reconciled only when the offseason completes.`,
      teamId,
    });
  } else if (ownerPayrollPolicy.ownerBand === 'above_soft_ceiling') {
    warnings.push({
      id: 'owner-payroll-soft-ceiling',
      severity: 'warning',
      title: 'Above the owner soft ceiling',
      detail: `Current payroll is $${ownerPayrollPolicy.softCeilingOverage.toFixed(1)}M above the advisory $${ownerPayrollPolicy.softCeiling.toFixed(1)}M owner line. Legal roster moves remain available.`,
      teamId,
    });
  }

  if (ownerPayrollPolicy.taxBand === 'taxpayer') {
    warnings.push({
      id: 'owner-payroll-tax-exposure',
      severity: 'warning',
      title: 'Projected tax exposure',
      detail: `Tax payroll is $${ownerPayrollPolicy.taxOverage.toFixed(1)}M above the $${ownerPayrollPolicy.taxThreshold.toFixed(1)}M league line, projecting $${ownerPayrollPolicy.projectedTax.toFixed(1)}M in exposure.`,
      teamId,
    });
  }

  const rule5Status = (() => {
    const baseStatus = phaseCommandStatus(
      currentPhase,
      currentPhase === 'rule5_draft' ? 'rule5_draft' : 'protection_audit',
      rule5AtRisk > 0 || rule5PendingOffers > 0 || currentPhase === 'rule5_draft',
    );
    if (currentPhase === 'rule5_draft') return 'attention';
    return baseStatus;
  })();
  const staffStatus = missingStaffCount > 0
    ? 'attention'
    : phaseCommandStatus(currentPhase, 'coaching_changes', currentPhase === 'coaching_changes');
  const rosterStatus: OffseasonCommandStatus = rosterIssues.length > 0 ? 'attention' : 'complete';
  const budgetStatus: OffseasonCommandStatus = budgetOverage > 0 ? 'blocked' : lowPayrollSpace ? 'attention' : 'complete';

  return {
    checklist: [
      {
        id: 'arbitration',
        label: 'Arbitration',
        status: phaseCommandStatus(currentPhase, 'arbitration', arbitrationRemaining > 0),
        detail: arbitrationRemaining > 0
          ? `${arbitrationRemaining} arbitration file${arbitrationRemaining === 1 ? '' : 's'} need resolution.`
          : 'No active arbitration files.',
        actionLabel: 'Review arb files',
      },
      {
        id: 'qualifying_offers',
        label: 'Qualifying Offers',
        status: phaseCommandStatus(currentPhase, 'qualifying_offers', qualifyingOfferEligible.length > 0 || activeQualifyingOffers > 0),
        detail: activeQualifyingOffers > 0
          ? `${activeQualifyingOffers} issued qualifying offer${activeQualifyingOffers === 1 ? '' : 's'} need resolution.`
          : qualifyingOfferEligible.length > 0
            ? `${qualifyingOfferEligible.length} player${qualifyingOfferEligible.length === 1 ? '' : 's'} eligible for a qualifying offer.`
            : 'No qualifying-offer decisions remain.',
        actionLabel: 'Check QOs',
      },
      {
        id: 'rule5',
        label: 'Rule 5',
        status: rule5Status,
        detail: rule5PendingOffers > 0
          ? `${rule5PendingOffers} Rule 5 offer-back decision${rule5PendingOffers === 1 ? '' : 's'} pending.`
          : rule5AtRisk > 0
            ? `${rule5AtRisk} exposed player${rule5AtRisk === 1 ? '' : 's'} on the protection board.`
            : 'Protection audit opens after the draft.',
        actionLabel: 'Audit 40-man',
      },
      {
        id: 'free_agency',
        label: 'Free Agency',
        status: phaseCommandStatus(currentPhase, 'free_agency', currentPhase === 'free_agency'),
        detail: rosterHoleCount > 0
          ? `Market is open; fill ${rosterHoleCount} projected roster spot${rosterHoleCount === 1 ? '' : 's'}.`
          : 'Market is open; roster projection is full.',
        actionLabel: 'Review market',
      },
      {
        id: 'staff',
        label: 'Staff',
        status: staffStatus,
        detail: missingStaffCount > 0
          ? `${missingStaffCount} staff role${missingStaffCount === 1 ? '' : 's'} need coverage.`
          : 'Coaching staff coverage is set.',
        actionLabel: 'Review staff',
      },
      {
        id: 'roster',
        label: 'Roster',
        status: rosterStatus,
        detail: rosterHoleCount > 0
          ? `Projected Opening Day roster has ${rosterHoleCount} open spot${rosterHoleCount === 1 ? '' : 's'}.`
          : rosterIssues.length > 0
            ? `${rosterIssues.length} roster compliance issue${rosterIssues.length === 1 ? '' : 's'} detected.`
            : 'Projected Opening Day roster is compliant.',
        actionLabel: 'Fix roster',
      },
      {
        id: 'budget',
        label: 'Budget',
        status: budgetStatus,
        detail: budgetOverage > 0
          ? `Payroll projects ${formatTickerMoney(budgetOverage)} above the tighter owner budget/payroll cap line.`
          : `Payroll space projects at ${formatTickerMoney(payrollSpace)}.`,
        actionLabel: 'Check payroll',
      },
    ],
    warnings,
    projectedOpeningDay,
  };
}

function transactionToneForTeams(s: FullGameState, teamIds: string[]): OffseasonTransactionTone {
  if (teamIds.includes(s.userTeamId)) return 'user';
  return teamIds.some((teamId) => transactionToneForTeam(s, teamId) === 'division_rival')
    ? 'division_rival'
    : 'neutral';
}

function parseMarketTimestampDay(timestampValue: string): { season: number; day: number } | null {
  const match = /^S(\d+)D(\d+)$/.exec(timestampValue);
  if (!match) return null;
  return {
    season: Number(match[1]),
    day: Number(match[2]),
  };
}

function playerIdsFromTradeAssets(
  assets: FullGameState['tradeState']['tradeHistory'][number]['offeringAssets'],
): string[] {
  return assets
    .filter((asset): asset is Extract<typeof asset, { type: 'player' }> => asset.type === 'player')
    .map((asset) => asset.playerId);
}

function isMajorSigning(
  s: FullGameState,
  signing: FASigningResult,
  player: GeneratedPlayer | undefined,
): boolean {
  return signing.totalValue >= 75
    || signing.annualSalary >= 18
    || (player?.overallRating ?? 0) >= 420
    || transactionToneForTeam(s, signing.teamId) !== 'neutral';
}

function isMajorTrade(
  s: FullGameState,
  trade: FullGameState['tradeState']['tradeHistory'][number],
  playerIds: string[],
): boolean {
  const highestPlayerRating = playerIds.reduce((highest, playerId) => {
    const player = s.players.find((candidate) => candidate.id === playerId);
    return Math.max(highest, player?.overallRating ?? 0);
  }, 0);

  return Math.abs(trade.fairnessScore) >= 15
    || highestPlayerRating >= 390
    || transactionToneForTeams(s, [trade.fromTeamId, trade.toTeamId]) !== 'neutral';
}

function buildOffseasonMarketDaySummaries(
  s: FullGameState,
  offseasonState: OffseasonState,
): OffseasonMarketDaySummary[] {
  const summaries: OffseasonMarketDaySummary[] = [];

  for (const signing of offseasonState.phaseResults.freeAgentSignings) {
    const player = s.players.find((candidate) => candidate.id === signing.playerId);
    if (!isMajorSigning(s, signing, player)) continue;

    summaries.push({
      id: `market-fa-${signing.playerId}-${signing.teamId}`,
      day: offseasonState.totalDay,
      category: 'signing',
      tone: transactionToneForTeam(s, signing.teamId),
      headline: `${teamLabel(signing.teamId)} commit ${formatTickerMoney(signing.totalValue)}`,
      detail: `${playerLabel(player)} signed a ${signing.years}-year deal at ${formatMoneyPerYear(signing.annualSalary)}, giving the roster a major offseason anchor.`,
      teamIds: [signing.teamId],
      playerIds: [signing.playerId],
      valueLabel: formatTickerMoney(signing.totalValue),
    });
  }

  for (const trade of s.tradeState.tradeHistory) {
    const parsedTimestamp = parseMarketTimestampDay(trade.timestamp);
    if (!parsedTimestamp || parsedTimestamp.season !== s.season) continue;

    const playerIds = [
      ...playerIdsFromTradeAssets(trade.offeringAssets),
      ...playerIdsFromTradeAssets(trade.requestingAssets),
    ];
    if (!isMajorTrade(s, trade, playerIds)) continue;

    summaries.push({
      id: `market-trade-${trade.id}`,
      day: parsedTimestamp.day,
      category: 'trade',
      tone: transactionToneForTeams(s, [trade.fromTeamId, trade.toTeamId]),
      headline: `${teamLabel(trade.fromTeamId)} and ${teamLabel(trade.toTeamId)} reshaped the market`,
      detail: trade.summary,
      teamIds: [trade.fromTeamId, trade.toTeamId],
      playerIds,
      valueLabel: `Trade value ${trade.fairnessScore >= 0 ? '+' : ''}${trade.fairnessScore}`,
    });
  }

  return summaries
    .sort((left, right) =>
      right.day - left.day
      || left.category.localeCompare(right.category)
      || left.id.localeCompare(right.id),
    )
    .slice(0, 8);
}

export function buildOffseasonStateView(s: FullGameState): OffseasonStateView | null {
  const offseasonState = normalizeOffseasonState(s.offseasonState, s.players, s.serviceTime);
  if (!offseasonState) return null;

  const rowsByPhase = new Map<string, OffseasonTransactionRow[]>();
  const pushRow = (phase: string, row: OffseasonTransactionRow) => {
    const existing = rowsByPhase.get(phase) ?? [];
    existing.push(row);
    rowsByPhase.set(phase, existing);
  };

  for (const result of offseasonState.phaseResults.arbitrationResolved) {
    const player = s.players.find((candidate) => candidate.id === result.playerId);
    const summary = result.teamWon
      ? `${teamLabel(result.teamId)} won the hearing; ${playerLabel(player)} was awarded ${formatMoneyPerYear(result.newSalary)}`
      : `${playerLabel(player)} won the hearing and was awarded ${formatMoneyPerYear(result.newSalary)}`;
    pushRow('arbitration', {
      id: `arb-${result.playerId}`,
      phase: 'arbitration',
      tone: transactionToneForTeam(s, result.teamId),
      summary,
    });
  }

  for (const playerId of offseasonState.phaseResults.tenderedPlayers) {
    const player = s.players.find((candidate) => candidate.id === playerId);
    if (!player) continue;
    pushRow('tender_nontender', {
      id: `tender-${playerId}`,
      phase: 'tender_nontender',
      tone: transactionToneForTeam(s, player.teamId),
      summary: `${teamLabel(player.teamId)} tendered ${playerLabel(player)}`,
    });
  }

  for (const playerId of offseasonState.phaseResults.nonTenderedPlayers) {
    const player = s.players.find((candidate) => candidate.id === playerId);
    const teamId = player?.teamId ?? '';
    pushRow('tender_nontender', {
      id: `nontender-${playerId}`,
      phase: 'tender_nontender',
      tone: transactionToneForTeam(s, teamId),
      summary: `${teamLabel(teamId)} non-tendered ${playerLabel(player)} (now free agent)`,
    });
  }

  for (const result of offseasonState.phaseResults.extensions) {
    const player = s.players.find((candidate) => candidate.id === result.playerId);
    const summary = result.status === 'accepted'
      ? `${playerLabel(player)} signed an extension with ${teamLabel(result.teamId)} for ${formatMoneyPerYear(result.annualSalary)} ${formatYears(result.years)}`
      : `${teamLabel(result.teamId)} could not reach an extension with ${playerLabel(player)}`;
    pushRow('extensions', {
      id: `extension-${result.playerId}-${result.status}`,
      phase: 'extensions',
      tone: transactionToneForTeam(s, result.teamId),
      summary,
    });
  }

  // Option decisions are persisted factual news generated by the once-only
  // contract clock. Project them into the existing ledger rather than adding
  // a parallel save field or a decision surface.
  const optionNewsPrefix = `contract-option-${s.season}-`;
  for (const item of s.news
    .filter((news) => news.id.startsWith(optionNewsPrefix))
    .sort((left, right) => left.id.localeCompare(right.id))) {
    const playerId = item.relatedPlayerIds[0] ?? item.id.slice(optionNewsPrefix.length);
    const player = s.players.find((candidate) => candidate.id === playerId);
    const exercised = item.headline.endsWith('team option exercised');
    pushRow('extensions', {
      id: item.id,
      phase: 'extensions',
      tone: transactionToneForTeam(s, item.relatedTeamIds[0] ?? player?.teamId ?? ''),
      summary: exercised
        ? `${playerLabel(player)} had a team option exercised for the coming season.`
        : `${playerLabel(player)} had a team option declined; contract expired pending retention or free-agency entry.`,
    });
  }

  for (const result of offseasonState.phaseResults.qualifyingOffers) {
    const player = s.players.find((candidate) => candidate.id === result.playerId);
    const summary = (() => {
      switch (result.status) {
        case 'accepted':
          return `${playerLabel(player)} accepted a qualifying offer from ${teamLabel(result.teamId)} for ${formatMoneyPerYear(result.amount)}.`;
        case 'rejected':
          return `${playerLabel(player)} rejected a qualifying offer from ${teamLabel(result.teamId)}.`;
        case 'compensated':
          return `${teamLabel(result.teamId)} received compensation after ${playerLabel(player)} departed in free agency.`;
        case 'expired':
          return `${playerLabel(player)} returned to ${teamLabel(result.signingTeamId ?? result.teamId)} without triggering compensation.`;
        case 'offered':
        default:
          return `${teamLabel(result.teamId)} issued a qualifying offer to ${playerLabel(player)} for ${formatMoneyPerYear(result.amount)}.`;
      }
    })();
    pushRow('qualifying_offers', {
      id: `qualifying-offer-${result.playerId}-${result.status}`,
      phase: 'qualifying_offers',
      tone: transactionToneForTeam(s, result.teamId),
      summary,
    });
  }

  for (const signing of offseasonState.phaseResults.freeAgentSignings) {
    const player = s.players.find((candidate) => candidate.id === signing.playerId);
    pushRow('free_agency', {
      id: `fa-${signing.playerId}-${signing.teamId}`,
      phase: 'free_agency',
      tone: transactionToneForTeam(s, signing.teamId),
      summary: `${playerLabel(player)} signed with ${teamLabel(signing.teamId)} for ${formatMoneyPerYear(signing.annualSalary)} ${formatYears(signing.years)}`,
    });
  }

  for (const pick of offseasonState.phaseResults.draftPicks) {
    pushRow('draft', {
      id: `draft-${pick.pickNumber}`,
      phase: 'draft',
      tone: transactionToneForTeam(s, pick.teamId),
      summary: `Round ${pick.round}, Pick ${pick.pickNumber}: ${teamLabel(pick.teamId)} selected ${pick.playerName} (${pick.position}, ${pick.origin})`,
    });
  }

  for (const signing of offseasonState.phaseResults.ifaSignings) {
    pushRow('international_signing', {
      id: `ifa-${signing.playerId}-${signing.teamId}`,
      phase: 'international_signing',
      tone: transactionToneForTeam(s, signing.teamId),
      summary: `${signing.playerName} signed with ${teamLabel(signing.teamId)} for $${signing.bonusAmount.toFixed(2)}M`,
    });
  }

  for (const change of offseasonState.phaseResults.coachChanges) {
    pushRow('coaching_changes', {
      id: `coach-${change.action}-${change.coachId}`,
      phase: 'coaching_changes',
      tone: transactionToneForTeam(s, change.teamId),
      summary: `${teamLabel(change.teamId)} ${change.action === 'hired' ? 'hired' : 'fired'} ${change.coachName} (${change.role.replaceAll('_', ' ')}) at $${change.salary.toFixed(2)}M.`,
    });
  }

  if (s.rule5Session) {
    for (const [teamId, protectedIds] of Object.entries(s.rule5Session.protectedPlayerIdsByTeam)) {
      for (const playerId of protectedIds) {
        const player = s.players.find((candidate) => candidate.id === playerId);
        if (!player || player.rosterStatus === 'MLB') continue;
        pushRow('protection_audit', {
          id: `rule5-protect-${teamId}-${playerId}`,
          phase: 'protection_audit',
          tone: transactionToneForTeam(s, teamId),
          summary: `${teamLabel(teamId)} protected ${playerLabel(player)} on the 40-man roster`,
        });
      }
    }

    for (const selection of s.rule5Session.selections) {
      pushRow('rule5_draft', {
        id: `rule5-pick-${selection.overallPick}-${selection.playerId}`,
        phase: 'rule5_draft',
        tone: transactionToneForTeam(s, selection.draftingTeamId),
        summary: `Rule 5 Pick ${selection.overallPick}: ${teamLabel(selection.draftingTeamId)} selected ${selection.playerName} from ${teamLabel(selection.originalTeamId)}`,
      });
    }
  }

  for (const offerBack of s.rule5OfferBackStates) {
    const player = s.players.find((candidate) => candidate.id === offerBack.playerId);
    const playerName = playerLabel(player);
    const summary = offerBack.status === 'accepted'
      ? `${teamLabel(offerBack.originalTeamId)} reclaimed ${playerName} after the Rule 5 offer-back`
      : offerBack.status === 'declined'
        ? `${teamLabel(offerBack.originalTeamId)} declined the return of ${playerName}`
        : `${teamLabel(offerBack.draftingTeamId)} must offer ${playerName} back to ${teamLabel(offerBack.originalTeamId)}`;
    pushRow('rule5_draft', {
      id: `rule5-offer-back-${offerBack.playerId}`,
      phase: 'rule5_draft',
      tone: transactionToneForTeam(
        s,
        offerBack.status === 'accepted' ? offerBack.originalTeamId : offerBack.draftingTeamId,
      ),
      summary,
    });
  }

  for (const retirement of offseasonState.phaseResults.retiredPlayers) {
    pushRow('spring_training', {
      id: `retire-${retirement.playerId}`,
      phase: 'spring_training',
      tone: transactionToneForTeam(s, retirement.teamId),
      summary: retirement.summary,
    });
  }

  const transactionGroups = [
    'arbitration',
    'tender_nontender',
    'extensions',
    'qualifying_offers',
    'free_agency',
    'draft',
    'protection_audit',
    'rule5_draft',
    'international_signing',
    'coaching_changes',
    'spring_training',
  ]
    .map((phase) => ({
      phase,
      label: phaseLabel(phase),
      rows: rowsByPhase.get(phase) ?? [],
    }))
    .filter((group) => group.rows.length > 0);

  const arbitrationStage = (entry: ArbitrationDocketEntry): OffseasonArbitrationStage => {
    if (entry.resolved) return 'resolved';
    if (offseasonState.currentPhase !== 'arbitration') return 'filing';
    if (offseasonState.phaseDay <= 2) return 'filing';
    if (offseasonState.phaseDay <= 5) return 'exchange';
    return 'hearing';
  };
  const arbitrationCases = offseasonState.phaseResults.arbitrationDocket
    .filter((entry) => entry.teamId === s.userTeamId)
    .map((entry) => {
      const player = s.players.find((candidate) => candidate.id === entry.playerId);
      return {
        playerId: entry.playerId,
        playerName: playerLabel(player),
        teamId: entry.teamId,
        serviceClass: entry.yearsOfService === 2
          ? 'Super Two'
          : `Year ${entry.yearsOfService}`,
        previousSalary: entry.previousSalary,
        teamOffer: entry.teamOffer,
        playerAsk: entry.playerAsk,
        projectedSalary: entry.projectedSalary,
        awardedSalary: entry.resolved ? entry.awardedSalary : null,
        winner: entry.resolved ? (entry.teamWon ? 'club' : 'player') : null,
        stage: arbitrationStage(entry),
      } satisfies OffseasonArbitrationCaseView;
    })
    .sort((left, right) => left.playerName.localeCompare(right.playerName) || left.playerId.localeCompare(right.playerId));

  return {
    ...offseasonState,
    phaseResults: {
      ...offseasonState.phaseResults,
      qualifyingOffers: offseasonState.phaseResults.qualifyingOffers.map((entry) => {
        const player = s.players.find((candidate) => candidate.id === entry.playerId);
        return {
          ...entry,
          playerName: player ? `${player.firstName} ${player.lastName}` : entry.playerId,
        };
      }),
    },
    arbitrationCases,
    transactionGroups,
    marketDaySummaries: buildOffseasonMarketDaySummaries(s, offseasonState),
    commandCenter: buildOffseasonCommandCenter(s),
    rule5: buildRule5StateView(s),
  };
}

function roundLabel(round: string): string {
  switch (round) {
    case 'WILD_CARD':
      return 'Wild Card';
    case 'DIVISION_SERIES':
      return 'Division Series';
    case 'CHAMPIONSHIP_SERIES':
      return 'Championship Series';
    case 'WORLD_SERIES':
      return 'World Series';
    default:
      return round;
  }
}

function previewTeamView(
  slot: CorePlayoffPreviewSeries['home'],
): SeasonFlowPreviewTeam {
  if (slot.teamId) {
    const team = getTeamById(slot.teamId);
    return {
      teamId: slot.teamId,
      teamName: team ? `${team.city} ${team.name}` : slot.teamId.toUpperCase(),
      abbreviation: team?.abbreviation ?? slot.teamId.toUpperCase(),
      seed: slot.seed,
      placeholder: null,
    };
  }

  return {
    teamId: null,
    teamName: slot.placeholder ?? 'TBD',
    abbreviation: 'TBD',
    seed: null,
    placeholder: slot.placeholder,
  };
}

function buildStandingsSnapshot(s: FullGameState): SeasonFlowStanding[] {
  return Object.entries(s.seasonState.standings.getFullStandings())
    .flatMap(([division, entries]) =>
      entries.map((entry) => {
        const team = getTeamById(entry.teamId);
        return {
          teamId: entry.teamId,
          teamName: team ? `${team.city} ${team.name}` : entry.teamId.toUpperCase(),
          abbreviation: team?.abbreviation ?? entry.teamId.toUpperCase(),
          wins: entry.wins,
          losses: entry.losses,
          division,
        };
      }),
    )
    .sort((left, right) => {
      if (right.wins !== left.wins) return right.wins - left.wins;
      return left.losses - right.losses;
    });
}

function buildChampionSummary(s: FullGameState): SeasonFlowChampionSummary | null {
  if (!s.playoffBracket?.champion) return null;

  const championTeam = getTeamById(s.playoffBracket.champion);
  const worldSeries = s.playoffBracket.series.find((series) => series.round === 'WORLD_SERIES');
  const runnerUpTeam = worldSeries ? getTeamById(worldSeries.loserId) : null;

  return {
    championTeamId: s.playoffBracket.champion,
    championTeamName: championTeam ? `${championTeam.city} ${championTeam.name}` : s.playoffBracket.champion.toUpperCase(),
    runnerUpTeamName: runnerUpTeam
      ? `${runnerUpTeam.city} ${runnerUpTeam.name}`
      : (worldSeries?.loserId ? teamLabel(worldSeries.loserId) : 'Runner-up'),
    seriesRecord: worldSeries ? `${worldSeries.winnerWins}-${worldSeries.loserWins}` : '4-0',
  };
}

function buildOffseasonSummary(s: FullGameState): SeasonFlowOffseasonSummary | null {
  const offseasonView = buildOffseasonStateView(s);
  if (!offseasonView) return null;

  return {
    nextSeason: s.season + 1,
    moves: offseasonView.transactionGroups
      .flatMap((group) => group.rows.map((row) => row.summary))
      .slice(0, 4),
  };
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function ordinalPlace(value: number): string {
  if (value % 100 >= 11 && value % 100 <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function buildSeasonSummaryView(s: FullGameState): SeasonFlowSeasonSummary | null {
  const team = getTeamById(s.userTeamId);
  const record = s.seasonState.standings.getRecord(s.userTeamId);
  if (!team || !record) {
    return null;
  }

  const fullStandings = s.seasonState.standings.getFullStandings();
  const divisionStandings = fullStandings[team.division] ?? [];
  const divisionFinish = Math.max(1, divisionStandings.findIndex((entry) => entry.teamId === s.userTeamId) + 1);
  const playoffSeed = determinePlayoffSeeds(fullStandings).find((entry) => entry.teamId === s.userTeamId);
  const userPlayers = s.players.filter((player) => player.teamId === s.userTeamId && player.rosterStatus === 'MLB');
  const hitterLeaders = userPlayers
    .filter((player) => player.pitcherAttributes == null)
    .map((player) => ({
      player,
      stats: s.seasonState.playerSeasonStats.get(player.id),
    }))
    .filter((entry): entry is { player: GeneratedPlayer; stats: PlayerGameStats } => entry.stats != null && entry.stats.pa > 0)
    .sort((left, right) => (right.stats.hr * 6 + right.stats.rbi * 2 + right.stats.hits) - (left.stats.hr * 6 + left.stats.rbi * 2 + left.stats.hits))
    .slice(0, 2)
    .map(({ player, stats }) => `${player.firstName} ${player.lastName}: ${stats.hr} HR, ${stats.rbi} RBI`);
  const pitcherLeader = userPlayers
    .filter((player) => player.pitcherAttributes != null)
    .map((player) => ({
      player,
      stats: s.seasonState.playerSeasonStats.get(player.id),
    }))
    .filter((entry): entry is { player: GeneratedPlayer; stats: PlayerGameStats } => entry.stats != null && entry.stats.ip > 0)
    .sort((left, right) => ((left.stats.earnedRuns / Math.max(1, left.stats.ip / 3)) * 9) - ((right.stats.earnedRuns / Math.max(1, right.stats.ip / 3)) * 9))
    .slice(0, 1)
    .map(({ player, stats }) => `${player.firstName} ${player.lastName}: ${((stats.earnedRuns / Math.max(1, stats.ip / 3)) * 9).toFixed(2)} ERA`);
  const awardHitters = s.players
    .filter((player) => player.rosterStatus === 'MLB' && player.pitcherAttributes == null)
    .map((player) => ({
      player,
      stats: s.seasonState.playerSeasonStats.get(player.id),
    }))
    .filter((entry): entry is { player: GeneratedPlayer; stats: PlayerGameStats } => entry.stats != null && entry.stats.pa > 0)
    .sort((left, right) => (right.stats.hr * 6 + right.stats.rbi * 2 + right.stats.hits) - (left.stats.hr * 6 + left.stats.rbi * 2 + left.stats.hits))
    .slice(0, 1)
    .map(({ player }) => `MVP pace: ${player.firstName} ${player.lastName}`);
  const awardPitchers = s.players
    .filter((player) => player.rosterStatus === 'MLB' && player.pitcherAttributes != null)
    .map((player) => ({
      player,
      stats: s.seasonState.playerSeasonStats.get(player.id),
    }))
    .filter((entry): entry is { player: GeneratedPlayer; stats: PlayerGameStats } => entry.stats != null && entry.stats.ip > 0)
    .sort((left, right) => ((left.stats.earnedRuns / Math.max(1, left.stats.ip / 3)) * 9) - ((right.stats.earnedRuns / Math.max(1, right.stats.ip / 3)) * 9))
    .slice(0, 1)
    .map(({ player }) => `Cy Young pace: ${player.firstName} ${player.lastName}`);

  return {
    record: `${record.wins}-${record.losses}`,
    divisionFinish: `${ordinalPlace(divisionFinish)} in ${team.division.replace('_', ' ')}`,
    playoffStatus: playoffSeed
      ? `${teamLabel(s.userTeamId)} clinched the No. ${playoffSeed.seed} seed in the ${playoffSeed.league}.`
      : `${teamLabel(s.userTeamId)} missed the postseason cut.`,
    teamLeaders: [...hitterLeaders, ...pitcherLeader].slice(0, 3),
    awardFavorites: [...awardHitters, ...awardPitchers],
  };
}

export function buildSeasonFlowStateView(s: FullGameState): SeasonFlowStateView {
  const standingsSnapshot = buildStandingsSnapshot(s);
  const userRecord = standingsSnapshot.find((entry) => entry.teamId === s.userTeamId);
  const seasonSummary = buildSeasonSummaryView(s);
  const playoffPreview = s.playoffBracket
    ? buildPlayoffPreview(s.playoffBracket.seeds).map((series) => ({
      id: series.id,
      round: roundLabel(series.round),
      bestOf: series.bestOf,
      home: previewTeamView(series.home),
      away: previewTeamView(series.away),
    }))
    : [];

  if (s.phase === 'preseason') {
    return {
      status: 'preseason',
      season: s.season,
      phaseLabel: `Season ${s.season} — Spring Training`,
      detailLabel: 'Spring Training begins',
      progress: 0,
      canUseRegularSimControls: true,
      action: null,
      actionLabel: null,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: null,
      standingsSnapshot,
      playoffPreview: [],
      seasonSummary: null,
      championSummary: null,
      offseasonSummary: null,
    };
  }

  if (s.phase === 'regular') {
    const currentMonth = getRegularSeasonMonthForDay(s.day);
    const tradeDeadlineDay = getTradeDeadlineDay();
    const daysUntilTradeDeadline = s.day <= tradeDeadlineDay
      ? getDaysUntilTradeDeadline(s.day)
      : 0;
    return {
      status: 'regular',
      season: s.season,
      phaseLabel: `Season ${s.season} — Day ${s.day}/162`,
      detailLabel: daysUntilTradeDeadline <= 14
        ? `${currentMonth.label} pulse · ${daysUntilTradeDeadline} days to deadline`
        : `${currentMonth.label} pulse`,
      progress: clampProgress(s.day / 162),
      canUseRegularSimControls: true,
      action: null,
      actionLabel: null,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline,
      standingsSnapshot,
      playoffPreview: [],
      seasonSummary: null,
      championSummary: null,
      offseasonSummary: null,
    };
  }

  if (s.phase === 'playoffs' && !s.playoffBracket) {
    const madePlayoffs = determinePlayoffSeeds(s.seasonState.standings.getFullStandings()).some((entry) => entry.teamId === s.userTeamId);
    return {
      status: 'regular_season_complete',
      season: s.season,
      phaseLabel: `Season ${s.season} — Regular Season Complete`,
      detailLabel: userRecord
        ? `${teamLabel(s.userTeamId)} finished ${userRecord.wins}-${userRecord.losses}`
        : 'The regular season has ended.',
      progress: 1,
      canUseRegularSimControls: false,
      action: 'watch_playoffs',
      actionLabel: madePlayoffs ? 'Go to Playoffs' : 'Watch Playoffs',
      secondaryAction: madePlayoffs ? null : 'skip_to_offseason',
      secondaryActionLabel: madePlayoffs ? null : 'Skip to Offseason',
      daysUntilTradeDeadline: null,
      standingsSnapshot: standingsSnapshot.slice(0, 6),
      playoffPreview: [],
      seasonSummary,
      championSummary: null,
      offseasonSummary: null,
    };
  }

  if (s.phase === 'playoffs' && s.playoffBracket && !s.playoffBracket.champion) {
    return {
      status: 'playoff_preview',
      season: s.season,
      phaseLabel: `Season ${s.season} — Playoff Bracket`,
      detailLabel: 'Bracket is set. Twelve teams remain.',
      progress: 0,
      canUseRegularSimControls: false,
      action: 'watch_playoffs',
      actionLabel: 'Open Playoffs',
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: null,
      standingsSnapshot: standingsSnapshot.slice(0, 6),
      playoffPreview,
      seasonSummary,
      championSummary: null,
      offseasonSummary: null,
    };
  }

  if (s.phase === 'playoffs') {
    const championSummary = buildChampionSummary(s);
    return {
      status: 'playoffs_complete',
      season: s.season,
      phaseLabel: `Season ${s.season} — World Series Final`,
      detailLabel: championSummary
        ? `${championSummary.championTeamName} defeated ${championSummary.runnerUpTeamName} ${championSummary.seriesRecord}`
        : 'The postseason has concluded.',
      progress: 1,
      canUseRegularSimControls: false,
      action: 'proceed_to_offseason',
      actionLabel: 'Proceed to Offseason',
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: null,
      standingsSnapshot: standingsSnapshot.slice(0, 6),
      playoffPreview,
      seasonSummary,
      championSummary,
      offseasonSummary: null,
    };
  }

  if (s.offseasonState?.completed) {
    return {
      status: 'offseason_complete',
      season: s.season,
      phaseLabel: `Welcome to Season ${s.season + 1}`,
      detailLabel: 'Spring Training begins',
      progress: 1,
      canUseRegularSimControls: false,
      action: 'start_next_season',
      actionLabel: `Start Season ${s.season + 1}`,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: null,
      standingsSnapshot,
      playoffPreview: [],
      seasonSummary: null,
      championSummary: null,
      offseasonSummary: buildOffseasonSummary(s),
    };
  }

  const offseasonView = buildOffseasonStateView(s);
  const offseasonLength = getOffseasonLength();
  const offseasonDay = offseasonView?.totalDay ?? 1;
  const offseasonPhase = offseasonView?.currentPhase ?? 'season_review';

  return {
    status: 'offseason',
    season: s.season,
    phaseLabel: `Season ${s.season} — Offseason: ${phaseLabel(offseasonPhase)}`,
    detailLabel: `Day ${Math.min(offseasonDay, offseasonLength)}/${offseasonLength}`,
    progress: clampProgress(offseasonDay / offseasonLength),
    canUseRegularSimControls: false,
    action: null,
    actionLabel: null,
    secondaryAction: null,
    secondaryActionLabel: null,
    daysUntilTradeDeadline: null,
    standingsSnapshot,
    playoffPreview: [],
    seasonSummary: null,
    championSummary: null,
    offseasonSummary: null,
  };
}

export function toPlayerDTO(
  player: GeneratedPlayer,
  stats?: PlayerGameStats,
  advanced?: PlayerAdvancedStatsDTO | null,
): PlayerDTO {
  const storyArcs = state
    ? state.playerStoryArcs
      .filter((arc) => arc.playerId === player.id)
      .sort((left, right) =>
        Number(right.resolvedSeason == null) - Number(left.resolvedSeason == null)
        || (right.resolvedSeason ?? 0) - (left.resolvedSeason ?? 0)
        || right.startSeason - left.startSeason
        || right.startDay - left.startDay,
      )
    : [];
  const activeStory = storyArcs.find((arc) => arc.resolvedSeason == null) ?? null;
  const storyHistory = storyArcs.filter((arc) => arc.resolvedSeason != null);
  const seasonStats = stats ?? (state ? state.seasonState.playerSeasonStats.get(player.id) : undefined);
  let statBlock: PlayerDTO['stats'] = null;
  if (seasonStats && (seasonStats.pa > 0 || seasonStats.ip > 0)) {
    const avg = seasonStats.ab > 0
      ? (seasonStats.hits / seasonStats.ab).toFixed(3).replace(/^0/, '')
      : '.000';
    const era = seasonStats.ip > 0
      ? ((seasonStats.earnedRuns / (seasonStats.ip / 3)) * 9).toFixed(2)
      : '0.00';
    statBlock = {
      pa: seasonStats.pa,
      ab: seasonStats.ab,
      hits: seasonStats.hits,
      doubles: seasonStats.doubles,
      triples: seasonStats.triples,
      hr: seasonStats.hr,
      rbi: seasonStats.rbi,
      bb: seasonStats.bb,
      k: seasonStats.k,
      runs: seasonStats.runs,
      hbp: seasonStats.hbp,
      sacFlies: seasonStats.sacFlies,
      avg,
      ip: seasonStats.ip,
      earnedRuns: seasonStats.earnedRuns,
      strikeouts: seasonStats.strikeouts,
      walks: seasonStats.walks,
      hitsAllowed: seasonStats.hitsAllowed,
      homeRunsAllowed: seasonStats.homeRunsAllowed,
      hitBatters: seasonStats.hitBatters,
      flyBallsAllowed: seasonStats.flyBallsAllowed,
      wins: seasonStats.wins,
      losses: seasonStats.losses,
      era,
    };
  }
  return {
    id: player.id, firstName: player.firstName, lastName: player.lastName,
    age: player.age, position: player.position,
    overallRating: player.overallRating,
    displayRating: toDisplayRating(player.overallRating),
    letterGrade: toLetterGrade(player.overallRating),
    rosterStatus: player.rosterStatus, teamId: player.teamId,
    serviceTimeDays: player.serviceTimeDays,
    optionYearsUsed: player.optionYearsUsed,
    isOutOfOptions: player.isOutOfOptions,
    minorLeagueLevel: player.minorLeagueLevel,
    contract: {
      years: player.contract.years,
      annualSalary: player.contract.annualSalary,
      totalValue: player.contract.totalValue ?? roundMoney(player.contract.annualSalary * player.contract.years),
      noTradeClause: player.contract.noTradeClause,
      noTradeClauseType: player.contract.noTradeClauseType ?? 'none',
      playerOption: player.contract.playerOption,
      teamOption: player.contract.teamOption,
      optOutYears: [...(player.contract.optOutYears ?? [])],
      signingBonus: player.contract.signingBonus ?? 0,
      buyoutAmount: player.contract.buyoutAmount ?? 0,
      deferredMoney: [...(player.contract.deferredMoney ?? [])],
    },
    ceiling: player.ceiling ?? null,
    floor: player.floor ?? null,
    developmentProgram: player.developmentProgram ?? null,
    developmentTrajectory: player.developmentTrajectory ?? 'on_track',
    personalityTraits: [...(player.personalityTraits ?? [])],
    extensionHistory: [...(player.extensionHistory ?? [])],
    stats: statBlock,
    advanced: advanced ?? null,
    historical: false,
    historicalSummary: null,
    activeStory: activeStory
      ? {
        arcType: activeStory.arcType,
        phase: activeStory.phase,
        startSeason: activeStory.startSeason,
        startDay: activeStory.startDay,
        latestMilestone: activeStory.milestones.at(-1) ?? null,
      }
      : null,
    storyHistory: storyHistory.map((arc) => ({
      arcType: arc.arcType,
      phase: arc.phase,
      startSeason: arc.startSeason,
      startDay: arc.startDay,
      resolvedSeason: arc.resolvedSeason,
      milestones: [...arc.milestones],
    })),
  };
}

/** Post-day injury processing and news generation. */
export function processDayInjuriesAndNews(s: FullGameState): void {
  // Advance existing injuries by 1 day
  for (const [pid, injury] of s.injuries) {
    const advanced = advanceInjury(injury);
    if (advanced) {
      s.injuries.set(pid, advanced);
    } else {
      s.injuries.delete(pid);
    }
  }

  // Check new injuries on MLB players
  const mlbPlayers = s.players.filter(p => p.rosterStatus === 'MLB');
  const newInjuries = processInjuries(s.rng.fork(), mlbPlayers, s.injuries);
  for (const [pid, injury] of newInjuries) {
    if (!s.injuries.has(pid)) {
      s.injuries.set(pid, injury);
      const player = s.players.find(p => p.id === pid);
      if (player) {
        const currentMorale = s.playerMorale.get(pid);
        if (currentMorale) {
          s.playerMorale.set(pid, applyMoraleEvent(player, currentMorale, {
            type: 'injury',
            impact: -14,
            summary: describeInjury(injury),
            timestamp: timestamp(),
          }));
        }
        const newsItems = generateNews(s.rng.fork(), {
          type: 'injury', season: s.season, day: s.day, data: {
            playerId: pid, playerName: `${player.firstName} ${player.lastName}`,
            teamId: player.teamId, description: describeInjury(injury),
          },
        }, s.players, s.season, s.day);
        s.news.push(...newsItems);
      }
    }
  }

  // Check career milestones using cumulative career totals, not current-season lines.
  const milestones = buildCareerMilestoneEvents(s, s.day);
  for (const milestone of milestones) {
    const alreadyPublished = s.news.some((item) => (
      item.category === 'milestone'
      && item.relatedPlayerIds.includes(milestone.playerId)
      && item.headline.includes(String(milestone.count))
    ));
    if (alreadyPublished) {
      continue;
    }
    const mNews = generateNews(s.rng.fork(), {
      type: 'milestone', season: s.season, day: s.day,
      data: {
        playerId: milestone.playerId,
        milestoneType: milestone.milestoneType,
        count: milestone.count,
        teamId: milestone.teamId,
        context: milestone.moment.description,
      },
    }, s.players, s.season, s.day);
    s.news.push(...mNews);
  }
  queueCareerMilestoneMoments(s);

  s.news = deduplicateNews(s.news);
}

function reconcileCompletedSeasonService(
  players: GeneratedPlayer[],
  serviceLedger: MinorLeagueState['serviceTimeLedger'],
): { players: GeneratedPlayer[]; serviceTime: Map<string, number> } {
  const creditedThisSeason = new Map(serviceLedger);
  const playersWithExactService = players.map((player) => {
    const creditedDays = Math.max(0, creditedThisSeason.get(player.id) ?? 0);
    const overCredit = Math.max(0, creditedDays - SERVICE_TIME_DAYS_PER_YEAR);
    if (overCredit === 0) return player;
    return {
      ...player,
      serviceTimeDays: Math.max(0, player.serviceTimeDays - overCredit),
    };
  });
  return {
    players: playersWithExactService,
    serviceTime: new Map(playersWithExactService.map((player) => [
      player.id,
      serviceDaysToYears(player.serviceTimeDays),
    ])),
  };
}

function reconcileExistingOffseasonServiceOnce(s: FullGameState) {
  if (!s.offseasonState || s.offseasonState.serviceTimeReconciled) return;
  const reconciled = reconcileCompletedSeasonService(
    s.players,
    s.minorLeagueState.serviceTimeLedger,
  );
  s.players = reconciled.players;
  s.serviceTime = reconciled.serviceTime;
  s.offseasonState = {
    ...s.offseasonState,
    serviceTimeReconciled: true,
  };
}

function ensureOffseasonState(s: FullGameState): boolean {
  if (s.offseasonState) return true;
  if (s.phase !== 'offseason') return false;

  // Precompute everything before committing a non-null offseason marker. This
  // makes the marker a once-only clock receipt, not a partial mutation flag.
  const reconciled = reconcileCompletedSeasonService(
    s.players,
    s.minorLeagueState.serviceTimeLedger,
  );
  const advances = reconciled.players.map((player) => advanceContractForOffseason(
    player,
    serviceDaysToYears(player.serviceTimeDays),
  ));
  const nextPlayers = advances.map((advance) => advance.player);
  const nextOffseasonState = {
    ...createOffseasonState(s.season),
    serviceTimeReconciled: true,
  };
  const activationFlag = 'contract_clock_live';
  const existingFlags = s.storyFlags.get(s.userTeamId) ?? [];
  const shouldPublishActivation = !existingFlags.includes(activationFlag);
  const nextStoryFlags = shouldPublishActivation
    ? new Map(s.storyFlags).set(s.userTeamId, [...existingFlags, activationFlag].sort((left, right) => left.localeCompare(right)))
    : s.storyFlags;
  const optionNews = advances
    .filter((advance) => (
      advance.player.teamId === s.userTeamId
      && (advance.outcome === 'team_option_exercised' || advance.outcome === 'team_option_declined')
    ))
    .map((advance) => ({
      id: `contract-option-${s.season}-${advance.player.id}`,
      headline: advance.outcome === 'team_option_exercised'
        ? `${advance.player.firstName} ${advance.player.lastName}'s team option exercised`
        : `${advance.player.firstName} ${advance.player.lastName}'s team option declined`,
      body: advance.outcome === 'team_option_exercised'
        ? `${advance.player.firstName} ${advance.player.lastName} remains under contract for one more season.`
        : `${advance.player.firstName} ${advance.player.lastName} has reached the end of the club option.`,
      priority: 2 as const,
      category: 'roster_move' as const,
      tag: 'ANALYSIS' as const,
      timestamp: `S${s.season}D${s.day}`,
      relatedPlayerIds: [advance.player.id],
      relatedTeamIds: [s.userTeamId],
      read: false,
    }));
  const activationNews = shouldPublishActivation
    ? [{
      id: `contract-clock-live-${s.season}`,
      headline: 'Contract clock is now live',
      body: 'Contracts will now advance at each completed season and eligible expirations will enter free agency.',
      priority: 3 as const,
      category: 'league_event' as const,
      tag: 'ANALYSIS' as const,
      timestamp: `S${s.season}D${s.day}`,
      relatedPlayerIds: [],
      relatedTeamIds: [s.userTeamId],
      read: false,
    }]
    : [];
  // `deduplicateNews` is part of precompute too: no fallible calculation may
  // run after canonical player/story mutations begin.
  const nextNews = deduplicateNews([...optionNews, ...activationNews, ...s.news]);

  s.players = nextPlayers;
  s.serviceTime = new Map(nextPlayers.map((player) => [
    player.id,
    serviceDaysToYears(player.serviceTimeDays),
  ]));
  s.storyFlags = nextStoryFlags;
  s.news = nextNews;
  s.offseasonState = nextOffseasonState;
  return true;
}

function updateOffseasonClock(s: FullGameState) {
  if (s.offseasonState) {
    s.day = s.offseasonState.totalDay;
  }
}

function syncRule5ObligationsFromSession(s: FullGameState) {
  s.rule5Obligations = s.rule5Session?.obligations.map((obligation) => ({ ...obligation })) ?? [];
}

function buildRule5DraftOrder(s: FullGameState): string[] {
  const teamRecords = Array.from(
    new Map(
      Object.values(s.seasonState.standings.getFullStandings())
        .flatMap((entries) => entries.map((entry) => [entry.teamId, { teamId: entry.teamId, wins: entry.wins, losses: entry.losses }] as const)),
    ).values(),
  );
  return determineDraftOrder(teamRecords);
}

function syncRule5ProtectionToRosterState(
  s: FullGameState,
  teamId: string,
  protectedPlayerIds: string[],
) {
  const rosterState = s.rosterStates.get(teamId);
  if (!rosterState) return;

  const nextFortyMan = Array.from(new Set([
    ...rosterState.fortyManRoster.filter((playerId) => !s.players.some((player) => player.id === playerId && player.teamId === teamId)),
    ...protectedPlayerIds,
    ...rosterState.mlbRoster,
  ]));

  s.rosterStates.set(teamId, {
    ...rosterState,
    fortyManRoster: nextFortyMan,
  });
}

function autoProtectAITeams(s: FullGameState) {
  if (!s.rule5Session) return;

  let session = s.rule5Session;
  for (const teamId of session.draftOrder) {
    if (teamId === s.userTeamId) continue;

    const currentProtected = session.protectedPlayerIdsByTeam[teamId] ?? [];
    const availableSlots = Math.max(0, FORTY_MAN_LIMIT - currentProtected.length);
    if (availableSlots === 0) continue;

    const candidates = session.candidatePlayers
      .filter((player) => player.teamId === teamId)
      .sort((left, right) => right.overallRating - left.overallRating);

    let protectedCount = 0;
    for (const candidate of candidates) {
      if (protectedCount >= availableSlots) break;
      if (candidate.overallRating < 250) break;
      const result = toggleRule5ProtectionCore(session, teamId, candidate.playerId);
      if (!result.success) break;
      session = result.session;
      protectedCount += 1;
    }

    syncRule5ProtectionToRosterState(s, teamId, session.protectedPlayerIdsByTeam[teamId] ?? []);
  }

  s.rule5Session = session;
}

function ensureRule5SessionForCurrentPhase(s: FullGameState) {
  if (!s.offseasonState) return;
  if (s.offseasonState.currentPhase !== 'protection_audit' && s.offseasonState.currentPhase !== 'rule5_draft') {
    return;
  }

  if (!s.rule5Session) {
    s.rule5Session = createRule5Session({
      season: s.season,
      draftOrder: buildRule5DraftOrder(s),
      players: s.players,
      rosterStates: s.rosterStates,
    });
    autoProtectAITeams(s);
  }

  if (s.offseasonState.currentPhase === 'rule5_draft' && s.rule5Session.phase === 'protection_audit') {
    s.rule5Session = lockRule5ProtectionAuditCore(s.rule5Session);
  }

  syncRule5ObligationsFromSession(s);
}

function captureRule5MutationCheckpoint(s: FullGameState) {
  return {
    rule5Session: s.rule5Session,
    rule5Obligations: s.rule5Obligations,
    rosterStates: new Map(s.rosterStates),
  };
}

function restoreRule5MutationCheckpoint(
  s: FullGameState,
  checkpoint: ReturnType<typeof captureRule5MutationCheckpoint>,
) {
  s.rule5Session = checkpoint.rule5Session;
  s.rule5Obligations = checkpoint.rule5Obligations;
  s.rosterStates = checkpoint.rosterStates;
}

function chooseRule5TargetForTeam(
  s: FullGameState,
  teamId: string,
): Rule5EligiblePlayer | null {
  if (!s.rule5Session) return null;

  const rosterState = s.rosterStates.get(teamId);
  if (rosterState && rosterState.fortyManRoster.length >= FORTY_MAN_LIMIT) {
    return null;
  }

  const teamRoster = s.players.filter((player) => player.teamId === teamId && player.rosterStatus === 'MLB');
  const needs = evaluateTeamNeeds(teamRoster);
  const ranked = s.rule5Session.eligiblePlayers
    .filter((player) => player.teamId !== teamId)
    .map((player) => ({
      player,
      score:
        player.overallRating
        + (needs.get(player.position) ?? 0) * 2
        - Math.max(0, player.age - 26) * 4
        + (
          player.teamId === s.userTeamId
            ? getRule5TargetingBonus(getRelationship(s.gmRelationships, teamId)) * 550
            : 0
        ),
    }))
    .sort((left, right) => right.score - left.score || left.player.playerId.localeCompare(right.player.playerId));

  const best = ranked[0];
  if (!best || best.score < 260) {
    return null;
  }

  return best.player;
}

function applyRule5SelectionToLeague(s: FullGameState, selection: Rule5Selection) {
  const player = s.players.find((candidate) => candidate.id === selection.playerId);
  if (!player) return;

  const previousTeamId = player.teamId;
  updatePlayerTeamAssignment(player, selection.draftingTeamId, s.season);
  player.rosterStatus = 'MLB';
  player.contract.years = Math.max(1, player.contract.years);

  if (previousTeamId) {
    s.rosterStates.set(previousTeamId, buildRosterState(previousTeamId, s.players));
  }
  s.rosterStates.set(selection.draftingTeamId, buildRosterState(selection.draftingTeamId, s.players));
}

function advanceRule5DraftToUserTurn(s: FullGameState) {
  ensureRule5SessionForCurrentPhase(s);
  if (!s.rule5Session || s.rule5Session.phase !== 'rule5_draft') return;

  while (s.rule5Session.phase === 'rule5_draft') {
    const teamId = currentRule5TeamId(s.rule5Session);
    if (!teamId || teamId === s.userTeamId) {
      return;
    }

    const target = chooseRule5TargetForTeam(s, teamId);
    if (target) {
      const result = makeRule5SelectionCore(s.rule5Session, teamId, target.playerId);
      if (!result.success) {
        break;
      }
      s.rule5Session = result.session;
      const selection = s.rule5Session.selections[s.rule5Session.selections.length - 1];
      if (selection) {
        applyRule5SelectionToLeague(s, selection);
      }
      syncRule5ObligationsFromSession(s);
      continue;
    }

    const passResult = passRule5DraftTurnCore(s.rule5Session, teamId);
    if (!passResult.success) {
      break;
    }
    s.rule5Session = passResult.session;
  }
}

function requestRule5OfferBack(
  s: FullGameState,
  playerId: string,
): { success: false; error: string; flowStateChanged: boolean } {
  const obligation = s.rule5Obligations.find((entry) => entry.playerId === playerId && entry.status === 'active');
  if (!obligation) {
    return { success: false, error: 'No active Rule 5 obligation.', flowStateChanged: false };
  }

  const existing = s.rule5OfferBackStates.find((entry) => entry.playerId === playerId && entry.status === 'pending');
  if (!existing) {
    s.rule5OfferBackStates.push({
      playerId,
      originalTeamId: obligation.originalTeamId,
      draftingTeamId: obligation.draftingTeamId,
      status: 'pending',
    });
  }

  return {
    success: false,
    error: 'Rule 5 player must clear the offer-back flow before leaving the MLB roster.',
    flowStateChanged: !existing,
  };
}

export function resolveRule5OfferBackDecision(
  s: FullGameState,
  playerId: string,
  acceptReturn: boolean,
): { success: boolean; error?: string } {
  const offer = s.rule5OfferBackStates.find((entry) => entry.playerId === playerId && entry.status === 'pending');
  const obligation = s.rule5Obligations.find((entry) => entry.playerId === playerId && entry.status === 'active');
  const player = s.players.find((candidate) => candidate.id === playerId);

  if (!offer || !obligation || !player) {
    return { success: false, error: 'No pending Rule 5 offer-back state.' };
  }

  const previousTeamId = player.teamId;
  if (acceptReturn) {
    updatePlayerTeamAssignment(player, offer.originalTeamId, s.season);
    player.rosterStatus = 'AAA';
    obligation.status = 'returned';
    offer.status = 'accepted';
  } else {
    player.rosterStatus = 'AAA';
    obligation.status = 'cleared';
    offer.status = 'declined';
  }

  if (previousTeamId) {
    s.rosterStates.set(previousTeamId, buildRosterState(previousTeamId, s.players));
  }
  s.rosterStates.set(player.teamId, buildRosterState(player.teamId, s.players));

  return { success: true };
}

function prepareArbitrationDocketOnce(s: FullGameState) {
  if (!s.offseasonState || s.offseasonState.phaseResults.arbitrationPrepared) return;

  const activeTwoYearPlayers = s.players
    .filter((player) => (
      player.teamId.length > 0
      && player.rosterStatus === 'MLB'
      && serviceDaysToYears(player.serviceTimeDays) === 2
    ))
    .sort((left, right) => (
      right.serviceTimeDays - left.serviceTimeDays
      || left.id.localeCompare(right.id)
    ));
  const qualifiedCount = activeTwoYearPlayers.length === 0
    ? 0
    : Math.max(1, Math.ceil(activeTwoYearPlayers.length * SUPER_TWO_COHORT_SHARE));
  const qualifiedIds = new Set(activeTwoYearPlayers.slice(0, qualifiedCount).map((player) => player.id));
  const nextPlayers = s.players.map((player) => ({
    ...player,
    superTwoQualified: qualifiedIds.has(player.id),
  }));
  const alreadyResolved = new Set([
    ...s.offseasonState.phaseResults.arbitrationResolved.map((entry) => entry.playerId),
    ...nextPlayers
      .filter((player) => player.arbitrationHistory.some((entry) => entry.season === s.season))
      .map((player) => player.id),
  ]);
  const nextRng = GameRNG.fromState(s.rng.getState());
  const docket: ArbitrationDocketEntry[] = [];

  for (const teamId of TEAMS.map((team) => team.id).sort((left, right) => left.localeCompare(right))) {
    const eligiblePlayers = getArbEligiblePlayers(nextPlayers, teamId, s.serviceTime)
      .filter((player) => !alreadyResolved.has(player.id))
      .filter((player) => !hasActiveTradeFinancialObligationForPlayer(
        nextPlayers,
        s.tradeState.tradeHistory,
        player.id,
        s.season + (s.offseasonState ? 1 : 0),
      ))
      .sort((left, right) => left.id.localeCompare(right.id));
    for (const player of eligiblePlayers) {
      const yearsOfService = serviceDaysToYears(player.serviceTimeDays);
      const arbitrationRng = nextRng.fork();
      const arbitrationCase = generateArbitrationCase(
        arbitrationRng,
        player,
        yearsOfService,
        player.contract.annualSalary,
      );
      const awardedSalary = resolveArbitration(arbitrationRng, arbitrationCase);
      const teamWon = awardedSalary === arbitrationCase.teamOffer;
      const holdout = teamWon && player.holdoutState == null
        ? evaluateHoldout(
            arbitrationCase,
            s.playerMorale.get(player.id)?.score ?? 50,
            arbitrationRng,
          )
        : null;
      docket.push({
        playerId: player.id,
        teamId,
        season: s.season,
        yearsOfService,
        previousSalary: arbitrationCase.currentSalary,
        teamOffer: arbitrationCase.teamOffer,
        playerAsk: arbitrationCase.playerAsk,
        projectedSalary: arbitrationCase.projectedSalary,
        awardedSalary,
        teamWon,
        holdoutDays: holdout?.holdoutDays ?? null,
        moraleHit: holdout?.moraleHit ?? null,
        resolved: false,
      });
    }
  }

  s.players = nextPlayers;
  s.rng = nextRng;
  s.offseasonState = {
    ...s.offseasonState,
    phaseResults: {
      ...s.offseasonState.phaseResults,
      arbitrationPrepared: true,
      arbitrationDocket: docket,
    },
  };
}

function resolveArbitrationDocketOnce(s: FullGameState) {
  if (!s.offseasonState) return;
  prepareArbitrationDocketOnce(s);
  const pending = s.offseasonState.phaseResults.arbitrationDocket.filter((entry) => !entry.resolved);
  if (pending.length === 0) return;

  const timestamp = `S${s.season}D${s.day}`;
  const nextPlayers = [...s.players];
  const nextMorale = new Map(s.playerMorale);
  const nextResults = [...s.offseasonState.phaseResults.arbitrationResolved];
  const nextDocket = s.offseasonState.phaseResults.arbitrationDocket.map((entry) => ({ ...entry }));
  const tickerEntries: TickerEntry[] = [];
  const newsEntries: NewsItem[] = [];
  const momentsByPlayer = new Map<string, SignatureMoment[]>();

  for (const entry of pending) {
    const playerIndex = nextPlayers.findIndex((player) => player.id === entry.playerId);
    const sourcePlayer = nextPlayers[playerIndex];
    if (playerIndex < 0 || !sourcePlayer) continue;
    if (sourcePlayer.arbitrationHistory.some((history) => history.season === s.season)) {
      const docketEntry = nextDocket.find((candidate) => candidate.playerId === entry.playerId);
      if (docketEntry) docketEntry.resolved = true;
      continue;
    }

    const player = {
      ...sourcePlayer,
      contract: {
        ...sourcePlayer.contract,
        years: 1,
        annualSalary: entry.awardedSalary,
        totalValue: entry.awardedSalary,
      },
      arbitrationHistory: [
        ...sourcePlayer.arbitrationHistory,
        {
          season: s.season,
          teamId: entry.teamId,
          yearsOfService: entry.yearsOfService,
          teamOffer: entry.teamOffer,
          playerAsk: entry.playerAsk,
          projectedSalary: entry.projectedSalary,
          awardedSalary: entry.awardedSalary,
          teamWon: entry.teamWon,
        },
      ],
    };
    const teamName = teamLabel(entry.teamId);
    const playerName = playerLabel(player);

    if (entry.holdoutDays != null && entry.moraleHit != null) {
      const salaryGap = roundMoney(entry.playerAsk - entry.teamOffer);
      player.holdoutState = {
        season: s.season,
        teamId: entry.teamId,
        salaryGap,
        holdoutDays: entry.holdoutDays,
        moraleHit: entry.moraleHit,
      };
      const currentMorale = nextMorale.get(player.id);
      nextMorale.set(player.id, {
        playerId: player.id,
        score: Math.max(0, (currentMorale?.score ?? 50) - entry.moraleHit),
        trend: 'falling',
        summary: `Reporting to spring camp is delayed after an arbitration dispute with ${teamName}.`,
        lastUpdated: timestamp,
      });
      const holdoutBriefing = generateHoldoutBriefing({
        player,
        season: s.season,
        day: s.day,
        teamName,
        moraleScore: nextMorale.get(player.id)?.score ?? 50,
      });
      if (holdoutBriefing) {
        newsEntries.push({
          id: holdoutBriefing.id,
          headline: holdoutBriefing.headline,
          body: holdoutBriefing.body,
          priority: holdoutBriefing.priority,
          category: 'holdout',
          timestamp,
          relatedPlayerIds: [player.id],
          relatedTeamIds: [entry.teamId],
          read: false,
        });
      }
      tickerEntries.push({
        id: `ticker-arbitration-holdout-${s.season}-${s.day}-${player.id}`,
        timestamp,
        category: 'arbitration',
        text: `${playerName}'s spring reporting is delayed ${entry.holdoutDays} days after the arbitration dispute with ${teamName}`,
        priority: 4,
        relatedTeamIds: [entry.teamId],
        relatedPlayerIds: [player.id],
        expiresDay: absoluteDay(s.season, s.day) + 21,
      });
    }

    nextPlayers[playerIndex] = player;
    nextResults.push({
      playerId: player.id,
      teamId: entry.teamId,
      previousSalary: entry.previousSalary,
      newSalary: entry.awardedSalary,
      teamWon: entry.teamWon,
    });
    const docketEntry = nextDocket.find((candidate) => candidate.playerId === entry.playerId);
    if (docketEntry) docketEntry.resolved = true;

    tickerEntries.push({
      id: `ticker-arbitration-${s.season}-${s.day}-${player.id}`,
      timestamp,
      category: 'arbitration',
      text: entry.teamWon
        ? `${teamName} wins arbitration — ${playerName} awarded ${formatTickerMoney(entry.awardedSalary)}`
        : `${playerName} wins arbitration and receives ${formatTickerMoney(entry.awardedSalary)}`,
      priority: 3,
      relatedTeamIds: [entry.teamId],
      relatedPlayerIds: [player.id],
      expiresDay: absoluteDay(s.season, s.day) + 21,
    });
    momentsByPlayer.set(
      player.id,
      detectArbitrationMoments([player], { season: s.season, day: s.day })
        .map(({ moment }) => moment),
    );
    newsEntries.push({
      id: `arbitration-result-${s.season}-${player.id}`,
      headline: entry.teamWon
        ? `${teamName} prevail in ${playerName}'s arbitration hearing`
        : `${playerName} prevails in arbitration against ${teamName}`,
      body: `The club filed at ${formatTickerMoney(entry.teamOffer)}, the player filed at ${formatTickerMoney(entry.playerAsk)}, and the panel selected ${formatTickerMoney(entry.awardedSalary)} for one season.`,
      priority: 3,
      category: 'arbitration',
      timestamp,
      relatedPlayerIds: [player.id],
      relatedTeamIds: [entry.teamId],
      read: false,
    });
  }

  s.players = nextPlayers;
  s.playerMorale = nextMorale;
  s.offseasonState = {
    ...s.offseasonState,
    phaseResults: {
      ...s.offseasonState.phaseResults,
      arbitrationDocket: nextDocket,
      arbitrationResolved: nextResults,
    },
  };
  for (const [playerId, moments] of momentsByPlayer) {
    appendArbitrationMoments(s, playerId, moments);
  }
  appendArbitrationTickerEntries(s, tickerEntries);
  if (newsEntries.length > 0) s.news = deduplicateNews([...newsEntries, ...s.news]);
}

function resolveHoldoutsForSpringTrainingOnce(s: FullGameState) {
  const resolving = detectHoldoutResolutions(s.players, { season: s.season, day: s.day });
  if (resolving.length === 0) return;
  const timestamp = `S${s.season}D${s.day}`;
  const newsEntries: NewsItem[] = [];

  for (const { playerId, moment } of resolving) {
    const player = s.players.find((candidate) => candidate.id === playerId);
    if (!player?.holdoutState) continue;
    const holdout = player.holdoutState;
    const teamName = teamLabel(holdout.teamId);
    const resolutionBriefing = generateHoldoutResolutionBriefing({
      player,
      season: s.season,
      day: s.day,
      teamName,
      moraleScore: s.playerMorale.get(player.id)?.score ?? 50,
    });
    appendArbitrationMoments(s, player.id, [moment]);
    player.serviceTimeDays = Math.max(0, player.serviceTimeDays - holdout.holdoutDays);
    s.serviceTime.set(player.id, serviceDaysToYears(player.serviceTimeDays));
    player.holdoutState = null;
    if (resolutionBriefing) {
      newsEntries.push({
        id: resolutionBriefing.id,
        headline: resolutionBriefing.headline,
        body: resolutionBriefing.body,
        priority: resolutionBriefing.priority,
        category: 'holdout',
        timestamp,
        relatedPlayerIds: [player.id],
        relatedTeamIds: [holdout.teamId],
        read: false,
      });
    }
  }
  if (newsEntries.length > 0) s.news = deduplicateNews([...newsEntries, ...s.news]);
}

function applyTenderDecisionsOnce(s: FullGameState) {
  if (!s.offseasonState) return;

  const existingTendered = new Set(s.offseasonState.phaseResults.tenderedPlayers);
  const existingNonTendered = new Set(s.offseasonState.phaseResults.nonTenderedPlayers);
  const affectedTeams = new Set<string>();

  for (const teamId of TEAMS.map((team) => team.id)) {
    if (teamId === s.userTeamId) continue;

    const arbEligiblePlayers = getArbEligiblePlayers(s.players, teamId, s.serviceTime)
      .filter((player) => player.rosterStatus === 'MLB');
    if (arbEligiblePlayers.length === 0) continue;

    const eligibleIds = new Set(arbEligiblePlayers.map((player) => player.id));
    const decisions = autoResolveTenderNonTender(s.rng.fork(), teamId, s.players, s.serviceTime);
    const protectedFromNonTender = decisions.nonTendered.filter((playerId) =>
      hasActiveTradeFinancialObligationForPlayer(
        s.players,
        s.tradeState.tradeHistory,
        playerId,
        s.season + (s.offseasonState ? 1 : 0),
      ));
    const tendered = [...decisions.tendered, ...protectedFromNonTender]
      .filter((playerId) => eligibleIds.has(playerId) && !existingTendered.has(playerId) && !existingNonTendered.has(playerId));
    const nonTendered = decisions.nonTendered
      .filter((playerId) => !protectedFromNonTender.includes(playerId))
      .filter((playerId) => eligibleIds.has(playerId) && !existingTendered.has(playerId) && !existingNonTendered.has(playerId));

    if (tendered.length === 0 && nonTendered.length === 0) continue;

    s.offseasonState = recordTenderDecisions(s.offseasonState, tendered, nonTendered);
    for (const playerId of tendered) existingTendered.add(playerId);
    for (const playerId of nonTendered) existingNonTendered.add(playerId);

    for (const playerId of nonTendered) {
      const player = s.players.find((candidate) => candidate.id === playerId);
      if (!player) continue;
      const previousTeamId = player.teamId;
      releasePlayerAssignment(player, s.season);
      player.rosterStatus = 'INTERNATIONAL';
      player.contract = {
        ...player.contract,
        years: 0,
      };
      affectedTeams.add(previousTeamId);
    }
  }

  for (const teamId of affectedTeams) {
    s.rosterStates.set(teamId, buildRosterState(teamId, s.players));
  }
}

function validateCurrentExtensionAggregate(s: FullGameState): string | null {
  if (!s.offseasonState) return null;

  const playerIds = new Set<string>();
  for (const rawEntry of s.offseasonState.phaseResults.extensions) {
    if (rawEntry == null || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
      return 'Extension phase aggregate is malformed or duplicated.';
    }
    const runtimeEntry = rawEntry as unknown as Record<string, unknown>;
    if (
      typeof runtimeEntry.playerId !== 'string'
      || runtimeEntry.playerId.trim().length === 0
      || typeof runtimeEntry.teamId !== 'string'
      || runtimeEntry.teamId.trim().length === 0
      || (runtimeEntry.status !== 'accepted' && runtimeEntry.status !== 'rejected')
      || playerIds.has(runtimeEntry.playerId)
      || !Number.isInteger(runtimeEntry.years)
      || (runtimeEntry.years as number) < 1
      || (runtimeEntry.years as number) > MAX_CONTRACT_YEARS
      || !Number.isFinite(runtimeEntry.annualSalary)
      || (runtimeEntry.annualSalary as number) < LEAGUE_MINIMUM_SALARY
      || !Number.isFinite(runtimeEntry.totalValue)
      || (runtimeEntry.totalValue as number) < 0
    ) {
      return 'Extension phase aggregate is malformed or duplicated.';
    }
    const entry = rawEntry;
    playerIds.add(entry.playerId);

    const player = s.players.find((candidate) => candidate.id === entry.playerId);
    if (!player) {
      return 'Extension phase aggregate references a missing player.';
    }
    if (player.teamId !== entry.teamId || player.rosterStatus !== 'MLB') {
      return 'Extension phase aggregate conflicts with current player ownership.';
    }
    const matchingHistory = (player.extensionHistory ?? []).filter((history) =>
      history.season === s.season
      && history.teamId === entry.teamId
      && history.outcome === entry.status);
    const contradictoryHistory = (player.extensionHistory ?? []).filter((history) =>
      history.season === s.season
      && (
        history.teamId !== entry.teamId
        || history.outcome !== entry.status
        || history.years !== entry.years
        || history.annualSalary !== entry.annualSalary
        || history.totalValue !== entry.totalValue
      ));
    if (matchingHistory.length > 1 || contradictoryHistory.length > 0) {
      return 'Extension phase aggregate conflicts with player history.';
    }
    // Historical CPU rejections did not retain player history. Keep that
    // absence honest, while requiring every accepted result to bind the exact
    // canonical contract/history tuple it has always owned.
    if (entry.status === 'accepted') {
      if (
        matchingHistory.length !== 1
        || player.contract.years !== entry.years
        || player.contract.annualSalary !== entry.annualSalary
        || player.contract.totalValue !== entry.totalValue
      ) {
        return 'Accepted extension aggregate conflicts with the canonical contract.';
      }
    } else if (matchingHistory.length === 1) {
      const history = matchingHistory[0]!;
      if (
        history.years !== entry.years
        || history.annualSalary !== entry.annualSalary
        || history.totalValue !== entry.totalValue
      ) {
        return 'Rejected extension aggregate conflicts with player history.';
      }
    }
  }
  return null;
}

function processTeamExtensionsOnce(s: FullGameState): string | null {
  if (!s.offseasonState) {
    return null;
  }

  const existingError = validateCurrentExtensionAggregate(s);
  if (existingError) return existingError;

  const recordedTeamIds = new Set(
    s.offseasonState.phaseResults.extensions.map((entry) => entry.teamId),
  );

  for (const teamId of TEAMS.map((team) => team.id)) {
    if (teamId === s.userTeamId || recordedTeamIds.has(teamId)) {
      continue;
    }

    const result = processTeamExtensions(
      buildExtensionContextForTeam(s, teamId),
      s.players,
      createStableWorkerRng(s, `cpu-extension-plan:v2:${s.season}:${teamId}`),
    );
    s.players = result.players;

    const finalized = result.results.flatMap((entry) => {
      if (entry.result.status !== 'accepted' && entry.result.status !== 'rejected') {
        return [];
      }
      const player = s.players.find((candidate) => candidate.id === entry.playerId);
      const finalContract = entry.result.finalContract ?? entry.result.rounds.at(-1)?.teamOffer;
      return [{
        playerId: entry.playerId,
        teamId,
        status: entry.result.status,
        years: finalContract?.years ?? player?.contract.years ?? 0,
        annualSalary: finalContract?.annualSalary ?? player?.contract.annualSalary ?? 0,
        totalValue: finalContract?.totalValue ?? player?.contract.totalValue ?? 0,
      }];
    });

    if (finalized.length > 0) {
      s.offseasonState = recordExtensionResults(s.offseasonState, finalized);
      recordedTeamIds.add(teamId);

      for (const extension of finalized) {
        const player = s.players.find((candidate) => candidate.id === extension.playerId);
        if (!player) continue;
        s.news.unshift(...generateNews(createStableWorkerRng(
          s,
          `cpu-extension-news:v1:${s.season}:${teamId}:${extension.playerId}:${extension.status}`,
        ), {
          type: 'extension',
          season: s.season,
          day: s.day,
          data: {
            playerId: player.id,
            playerName: `${player.firstName} ${player.lastName}`,
            teamId,
            teamName: getTeamById(teamId)?.name ?? teamId.toUpperCase(),
            years: extension.years,
            annualSalary: extension.annualSalary,
            totalValue: extension.totalValue,
            outcome: extension.status,
            record: `${s.seasonState.standings.getRecord(teamId)?.wins ?? 0}-${s.seasonState.standings.getRecord(teamId)?.losses ?? 0}`,
          },
        }, s.players, s.season, s.day));
      }
    }
  }

  return validateCurrentExtensionAggregate(s);
}

function processQualifyingOfferIssuanceOnce(s: FullGameState) {
  const amount = ensureQualifyingOfferSalaryForState(s);
  const existingPlayerIds = new Set(
    s.draftState.qualifyingOffers
      .filter((entry) => entry.season === s.season)
      .map((entry) => entry.playerId),
  );

  for (const teamId of TEAMS.map((team) => team.id)) {
    if (teamId === s.userTeamId) {
      continue;
    }

    for (const player of getQualifyingOfferEligiblePlayers(s.players, teamId, s.serviceTime, amount)) {
      if (existingPlayerIds.has(player.id)) {
        continue;
      }
      if (!shouldIssueQualifyingOffer(player, amount)) {
        continue;
      }

      const issued = issueTeamQualifyingOffer(s, player.id, teamId);
      if (issued.success) {
        existingPlayerIds.add(player.id);
      }
    }
  }
}

export type QualifyingOfferCompensationPlan =
  | { kind: 'none' }
  | { kind: 'former_team' }
  | { kind: 'blocked'; reason: string }
  | {
    kind: 'compensate';
    priorityGroup: 'premium' | 'standard';
    compensatoryPicks: DraftCompensatoryPick[];
    pickOwnership: DraftPickOwnership[];
    awardedPick: DraftCompensatoryPick;
    forfeitedPick: DraftPickOwnership;
  };

function getQualifyingOfferCompensationPriority(
  amount: number,
  contract: { years: number; annualSalary: number; totalValue?: number | null },
): 'premium' | 'standard' {
  const totalValue = contract.totalValue ?? contract.annualSalary * contract.years;
  return totalValue >= amount * 3 || contract.annualSalary >= amount * 1.25
    ? 'premium'
    : 'standard';
}

export function prepareQualifyingOfferCompensation(
  s: FullGameState,
  playerId: string,
  signingTeamId: string,
  contract: { years: number; annualSalary: number; totalValue?: number | null },
): QualifyingOfferCompensationPlan {
  const integrityError = validateQualifyingOfferCompensationState(s);
  if (integrityError) {
    return { kind: 'blocked', reason: integrityError };
  }
  const record = s.draftState.qualifyingOffers.find((entry) => entry.playerId === playerId && entry.season === s.season);
  if (!record || record.status !== 'rejected') {
    return { kind: 'none' };
  }

  if (record.teamId === signingTeamId) {
    return { kind: 'former_team' };
  }

  const priorityGroup = getQualifyingOfferCompensationPriority(record.amount, contract);
  const plan = planDraftPickCompensation(
    s.draftState.compensatoryPicks,
    buildDraftPickOwnershipForSeason(s),
    buildDraftOrderFromStandings(s.seasonState),
    {
      season: s.season,
      awardedToTeamId: record.teamId,
      compensationForPlayerId: playerId,
      compensationFromTeamId: signingTeamId,
      priorityGroup,
    },
  );
  if (!plan.success) {
    return {
      kind: 'blocked',
      reason: plan.reason === 'no_eligible_pick'
        ? 'No eligible draft pick is available for qualifying-offer compensation.'
        : 'Qualifying-offer compensation is already present or inconsistent.',
    };
  }

  return {
    kind: 'compensate',
    priorityGroup,
    compensatoryPicks: plan.compensatoryPicks,
    pickOwnership: plan.pickOwnership,
    awardedPick: plan.awardedPick,
    forfeitedPick: plan.forfeitedPick,
  };
}

export function commitQualifyingOfferCompensation(
  s: FullGameState,
  playerId: string,
  signingTeamId: string,
  plan: Exclude<QualifyingOfferCompensationPlan, { kind: 'blocked' }>,
): boolean {
  const record = s.draftState.qualifyingOffers.find((entry) => entry.playerId === playerId && entry.season === s.season);
  if (!record || record.status !== 'rejected' || plan.kind === 'none') {
    return plan.kind === 'none';
  }

  if (plan.kind === 'former_team') {
    s.draftState = {
      ...s.draftState,
      qualifyingOffers: s.draftState.qualifyingOffers.map((entry) => (
        entry.playerId === playerId && entry.season === s.season
          ? { ...entry, status: 'expired', signingTeamId }
          : entry
      )),
    };
    if (s.offseasonState) {
      s.offseasonState = recordQualifyingOfferResults(s.offseasonState, [{
        playerId,
        teamId: record.teamId,
        amount: record.amount,
        status: 'expired',
        signingTeamId,
        compensationPickId: null,
        compensationTier: null,
        forfeitedPick: null,
      }]);
    }
    return true;
  }

  s.draftState = {
    ...s.draftState,
    compensatoryPicks: plan.compensatoryPicks,
    pickOwnership: plan.pickOwnership,
    qualifyingOffers: s.draftState.qualifyingOffers.map((entry) => (
      entry.playerId === playerId && entry.season === s.season
        ? {
          ...entry,
          status: 'compensated',
          signingTeamId,
          compensationPickId: plan.awardedPick.id,
        }
        : entry
    )),
  };

  if (s.offseasonState) {
    s.offseasonState = recordQualifyingOfferResults(s.offseasonState, [{
      playerId,
      teamId: record.teamId,
      amount: record.amount,
      status: 'compensated',
      signingTeamId,
      compensationPickId: plan.awardedPick.id,
      compensationTier: plan.priorityGroup,
      forfeitedPick: {
        season: plan.forfeitedPick.season,
        round: plan.forfeitedPick.round,
        originalTeamId: plan.forfeitedPick.originalTeamId,
      },
    }]);
  }

  const player = s.players.find((entry) => entry.id === playerId) ?? null;
  const formerTeamName = getTeamById(record.teamId)?.name ?? record.teamId.toUpperCase();
  const signingTeamName = getTeamById(signingTeamId)?.name ?? signingTeamId.toUpperCase();
  s.news = [
    {
      id: `qualifying-offer-compensation-${s.season}-${playerId}`,
      headline: `${formerTeamName} awarded a qualifying-offer pick`,
      body: `${player ? `${player.firstName} ${player.lastName}` : playerId} signed with ${signingTeamName}. ${formerTeamName} received ${plan.priorityGroup} compensation while ${signingTeamName} forfeited its round ${plan.forfeitedPick.round} pick (${plan.forfeitedPick.originalTeamId.toUpperCase()} origin).`,
      priority: 4,
      category: 'signing',
      tag: 'BREAKING',
      timestamp: `S${s.season}D${s.day}`,
      relatedPlayerIds: [playerId],
      relatedTeamIds: [record.teamId, signingTeamId],
      read: false,
    },
    ...s.news.filter((entry) => entry.id !== `qualifying-offer-compensation-${s.season}-${playerId}`),
  ];
  return true;
}

export function applyQualifyingOfferCompensationIfNeeded(
  s: FullGameState,
  playerId: string,
  signingTeamId: string,
): boolean {
  const signedPlayer = s.players.find((entry) => entry.id === playerId);
  if (!signedPlayer) return false;
  const plan = prepareQualifyingOfferCompensation(s, playerId, signingTeamId, signedPlayer.contract);
  if (plan.kind === 'blocked') return false;
  return commitQualifyingOfferCompensation(s, playerId, signingTeamId, plan);
}

export function hasCanonicalFreeAgencyMarket(s: FullGameState): boolean {
  const market = s.freeAgencyMarket;
  if (!market
    || market.season !== s.season
    || !Array.isArray(market.freeAgents)
    || !Array.isArray(market.signedPlayers)) return false;

  const canonicalById = new Map(s.players.map((player) => [player.id, player] as const));
  const marketIds = new Set<string>();
  const hasExactCanonicalPlayer = (entry: FreeAgencyMarket['freeAgents'][number]) => {
    const playerId = entry?.player?.id;
    if (!playerId || marketIds.has(playerId)) return false;
    marketIds.add(playerId);
    const canonical = canonicalById.get(playerId);
    // Imported snapshots legitimately rehydrate separate-but-equal player
    // objects, so value equality (not object identity) is the canonical
    // persistence contract for both available and signed rows.
    return canonical != null && JSON.stringify(canonical) === JSON.stringify(entry.player);
  };
  const hasExactSignedContract = (
    canonical: GeneratedPlayer,
    contract: NonNullable<FreeAgencyMarket['signedPlayers'][number]['contract']>,
  ) => (
    contract.playerId === canonical.id
    && contract.teamId === canonical.teamId
    && canonical.contract.years === contract.years
    && canonical.contract.annualSalary === contract.annualSalary
    && canonical.contract.totalValue === contract.totalValue
    && canonical.contract.noTradeClause === contract.noTradeClause
    && canonical.contract.playerOption === contract.playerOption
    && canonical.contract.teamOption === contract.teamOption
    && canonical.contract.signingBonus === contract.signingBonus
  );

  for (const freeAgent of market.freeAgents) {
    if (!hasExactCanonicalPlayer(freeAgent)
      || freeAgent.signedWith !== null
      || freeAgent.contract !== null
      || canonicalById.get(freeAgent.player.id)?.teamId !== '') {
      return false;
    }
  }

  for (const signedPlayer of market.signedPlayers) {
    if (!hasExactCanonicalPlayer(signedPlayer)) return false;
    const canonical = canonicalById.get(signedPlayer.player.id);
    if (!canonical
      || !canonical.teamId
      || signedPlayer.signedWith !== canonical.teamId
      || !signedPlayer.contract
      || !hasExactSignedContract(canonical, signedPlayer.contract)) {
      return false;
    }
  }

  return true;
}

/** Exact Goal-11 FA admission capacity; never repairs an existing overage. */
export function getAvailableMlbSigningSlots(s: FullGameState, teamId: string): number {
  const activeCount = s.players.filter((player) => (
    player.teamId === teamId && player.rosterStatus === 'MLB'
  )).length;
  return Math.max(0, MLB_ROSTER_LIMIT - activeCount);
}

function ensureFreeAgencyMarket(s: FullGameState): boolean {
  if (s.freeAgencyMarket) {
    return hasCanonicalFreeAgencyMarket(s);
  }

  // Capture while assignment-based eligibility still holds, then release only
  // that exact captured set. Existing unassigned free agents remain unassigned;
  // no empty-team roster state is ever created.
  const market = createFreeAgencyMarket(s.season, s.players);
  const userStarDepartures = market.freeAgents
    .map((freeAgent) => s.players.find((player) => player.id === freeAgent.player.id))
    .filter((player): player is GeneratedPlayer => player != null)
    .filter((player) => (
      player.teamId === s.userTeamId
      && player.overallRating >= 400
      && calculateMarketValue(player) >= 15
    ))
    .map((player) => ({
      id: `contract-expiry-departure-${s.season}-${player.id}`,
      headline: `${player.firstName} ${player.lastName} enters free agency`,
      body: `${player.firstName} ${player.lastName}'s contract expired and the club did not retain the player before free agency opened.`,
      priority: 2 as const,
      category: 'roster_move' as const,
      tag: 'ANALYSIS' as const,
      timestamp: `S${s.season}D${s.day}`,
      relatedPlayerIds: [player.id],
      relatedTeamIds: [s.userTeamId],
      read: false,
    }));
  const affectedTeamIds = new Set<string>();
  for (const freeAgent of market.freeAgents) {
    const player = s.players.find((candidate) => candidate.id === freeAgent.player.id);
    if (!player || !player.teamId) continue;
    affectedTeamIds.add(player.teamId);
    releasePlayerAssignment(player, s.season);
    player.rosterStatus = 'INTERNATIONAL';
    player.minorLeagueLevel = 'INTERNATIONAL';
  }
  for (const teamId of affectedTeamIds) {
    s.rosterStates.set(teamId, buildRosterState(teamId, s.players));
  }
  const canonicalById = new Map(s.players.map((player) => [player.id, player] as const));
  market.freeAgents = market.freeAgents.map((freeAgent) => ({
    ...freeAgent,
    // `createFreeAgencyMarket` captures eligibility before release. Persist
    // the released canonical representation, never the pre-release snapshot.
    player: canonicalById.get(freeAgent.player.id) ?? freeAgent.player,
  }));
  s.news = deduplicateNews([...userStarDepartures, ...s.news]);
  s.freeAgencyMarket = market;
  return true;
}

function buildFreeAgencyPayrolls(s: FullGameState) {
  const freeAgentIds = new Set(s.freeAgencyMarket?.freeAgents.map((freeAgent) => freeAgent.player.id) ?? []);
  return new Map(
    TEAMS
      .filter((team) => team.id !== s.userTeamId)
      .map((team) => {
        const teamPlayers = s.players.filter(
          (player) => player.teamId === team.id && !freeAgentIds.has(player.id),
        );
        return [team.id, calculateStateTeamPayroll(s, team.id).totalPayroll] as const;
      }),
  );
}

function buildFreeAgencyNeeds(s: FullGameState) {
  const freeAgentIds = new Set(s.freeAgencyMarket?.freeAgents.map((freeAgent) => freeAgent.player.id) ?? []);
  return new Map(
    TEAMS
      .filter((team) => team.id !== s.userTeamId)
      .map((team) => {
        const teamRoster = s.players.filter(
          (player) => player.teamId === team.id && player.rosterStatus === 'MLB' && !freeAgentIds.has(player.id),
        );
        return [team.id, evaluateTeamNeeds(teamRoster)] as const;
      }),
  );
}

interface FreeAgencyBidCompensationReservations {
  compensatoryPicks: DraftCompensatoryPick[];
  pickOwnership: DraftPickOwnership[];
}

function planReservedFreeAgencyBidCompensation(
  s: FullGameState,
  reservations: FreeAgencyBidCompensationReservations,
  teamId: string,
  playerId: string,
  contract: { years: number; annualSalary: number; totalValue?: number | null },
) {
  const record = s.draftState.qualifyingOffers.find((entry) => (
    entry.playerId === playerId
    && entry.season === s.season
    && entry.status === 'rejected'
  ));
  if (!record || record.teamId === teamId) {
    return { kind: 'none' as const };
  }
  const plan = planDraftPickCompensation(
    reservations.compensatoryPicks,
    reservations.pickOwnership,
    buildDraftOrderFromStandings(s.seasonState),
    {
      season: s.season,
      awardedToTeamId: record.teamId,
      compensationForPlayerId: playerId,
      compensationFromTeamId: teamId,
      priorityGroup: getQualifyingOfferCompensationPriority(record.amount, contract),
    },
  );
  return plan.success
    ? { kind: 'reserve' as const, plan }
    : { kind: 'blocked' as const };
}

export function applyNewFreeAgencySignings(
  s: FullGameState,
  previousSignedIds: Set<string>,
  acceptedDecisions: ReadonlyMap<string, {
    decision: FreeAgencyOfferDecision;
    receipt: FreeAgencyOfferAcceptanceReceipt & {
      independentlyDerivedPayrollBeforeSigning?: number;
      mlbRosterPlayerIdsBeforeSigning?: string[];
    };
  }> = new Map(),
): OffseasonProgressResult['aiSignings'] {
  if (!s.freeAgencyMarket || !s.offseasonState) return [];

  const progress: OffseasonProgressResult['aiSignings'] = [];
  const currentSigningIds = new Set(s.offseasonState.phaseResults.freeAgentSignings.map((entry) => entry.playerId));

  for (const signedPlayer of s.freeAgencyMarket.signedPlayers) {
    const contract = signedPlayer.contract;
    const teamId = signedPlayer.signedWith;
    const acceptedDecision = acceptedDecisions.get(signedPlayer.player.id);
    const decision = acceptedDecision?.decision;
    if (!contract || !teamId || previousSignedIds.has(signedPlayer.player.id) || currentSigningIds.has(signedPlayer.player.id)) {
      continue;
    }

    const player = s.players.find((candidate) => candidate.id === signedPlayer.player.id);
    if (!player) continue;

    const compensationPlan = prepareQualifyingOfferCompensation(
      s,
      player.id,
      teamId,
      contract,
    );
    if (compensationPlan.kind === 'blocked') {
      s.freeAgencyMarket = {
        ...s.freeAgencyMarket,
        signedPlayers: s.freeAgencyMarket.signedPlayers.filter((entry) => entry.player.id !== player.id),
        freeAgents: [
          ...s.freeAgencyMarket.freeAgents,
          {
            ...signedPlayer,
            player,
            signedWith: null,
            contract: null,
          },
        ].sort((left, right) => right.marketValue - left.marketValue || left.player.id.localeCompare(right.player.id)),
      };
      continue;
    }

    const previousTeamId = player.teamId;
    updatePlayerTeamAssignment(player, teamId, s.season);
    player.rosterStatus = 'MLB';
    player.minorLeagueLevel = null;
    player.contract = {
      years: contract.years,
      annualSalary: contract.annualSalary,
      totalValue: contract.totalValue,
      noTradeClause: contract.noTradeClause,
      noTradeClauseType: contract.noTradeClause ? 'partial' : 'none',
      playerOption: contract.playerOption,
      teamOption: contract.teamOption,
      optOutYears: [],
      signingBonus: contract.signingBonus ?? 0,
      buyoutAmount: 0,
      deferredMoney: [],
    };
    // Imported markets rehydrate a value-equal detached player object. Once
    // the canonical player mutates, rebind the persisted market row so the
    // next query/day and save reload still see one coherent market identity.
    signedPlayer.player = player;

    if (previousTeamId) {
      s.rosterStates.set(previousTeamId, buildRosterState(previousTeamId, s.players));
      s.rivalries = recordStarDefectionRivalry(s.rivalries, {
        season: s.season,
        fromTeamId: previousTeamId,
        toTeamId: teamId,
        playerName: `${player.firstName} ${player.lastName}`,
        starScore: player.overallRating,
      });
    }
    s.rosterStates.set(teamId, buildRosterState(teamId, s.players));

    const signingResult: FASigningResult = {
      playerId: player.id,
      teamId,
      years: contract.years,
      annualSalary: contract.annualSalary,
      totalValue: contract.totalValue,
    };
    s.offseasonState = recordFASigning(s.offseasonState, signingResult);
    commitQualifyingOfferCompensation(s, player.id, teamId, compensationPlan);
    currentSigningIds.add(player.id);
    s.news.unshift(...generateNews(s.rng.fork(), {
      type: 'signing',
      season: s.season,
      day: s.day,
      data: {
        playerId: player.id,
        teamId,
        teamName: getTeamById(teamId)?.name ?? teamId.toUpperCase(),
        years: contract.years,
        annualSalary: contract.annualSalary,
        totalValue: contract.totalValue,
        ...(decision ? { decisionExplanation: decision.summary } : {}),
      },
    }, s.players, s.season, s.day));
    progress.push({
      playerId: player.id,
      teamId,
      years: contract.years,
      annualSalary: contract.annualSalary,
      marketValue: signedPlayer.marketValue,
      ...(decision ? { decision } : {}),
      ...(acceptedDecision ? acceptedDecision.receipt : {}),
    });
  }

  return progress;
}

function simulateFreeAgencyDays(
  s: FullGameState,
  daysToSimulate: number,
): OffseasonProgressResult['aiSignings'] {
  if (!hasCanonicalFreeAgencyMarket(s)) return [];
  const aiSignings: OffseasonProgressResult['aiSignings'] = [];
  const userTeamNeeds = evaluateTeamNeeds(
    s.players.filter((player) => player.teamId === s.userTeamId && player.rosterStatus === 'MLB'),
  );
  const relationshipContexts = new Map<string, RelationshipBidContext>(
    TEAMS
      .filter((team) => team.id !== s.userTeamId)
      .map((team) => {
        const relationship = s.gmRelationships.get(team.id);
        if (!relationship) {
          return null;
        }
        return [
          team.id,
          {
            relationship,
            personality: s.gmPersonalities.get(team.id) ?? 'analytical',
          },
        ] as const;
      })
      .filter((entry): entry is readonly [string, RelationshipBidContext] => entry !== null),
  );

  for (let day = 0; day < daysToSimulate; day++) {
    if (!s.freeAgencyMarket) break;
    const bidReservations: FreeAgencyBidCompensationReservations = {
      compensatoryPicks: [...s.draftState.compensatoryPicks],
      pickOwnership: [...buildDraftPickOwnershipForSeason(s)],
    };
    const previousSignedIds = new Set(s.freeAgencyMarket.signedPlayers.map((entry) => entry.player.id));
    const acceptedDecisions = new Map<string, {
      decision: FreeAgencyOfferDecision;
      receipt: FreeAgencyOfferAcceptanceReceipt & {
        independentlyDerivedPayrollBeforeSigning?: number;
        mlbRosterPlayerIdsBeforeSigning?: string[];
      };
    }>();
    const teamBudgets = new Map(
      TEAMS
        .filter((team) => team.id !== s.userTeamId)
        .map((team) => [team.id, getTeamPayrollCap(s, team.id)] as const),
    );
    const teamPayrolls = buildFreeAgencyPayrolls(s);
    const independentlyDerivedDayPayrolls = new Map(teamPayrolls);
    const teamNeeds = buildFreeAgencyNeeds(s);
    const freeAgentIds = new Set(
      s.freeAgencyMarket.freeAgents.map((freeAgent) => freeAgent.player.id),
    );
    const virtualMlbRosters = new Map(
      TEAMS
        .filter((team) => team.id !== s.userTeamId)
        .map((team) => [team.id, s.players.filter((player) => (
          player.teamId === team.id
          && player.rosterStatus === 'MLB'
          && !freeAgentIds.has(player.id)
        ))] as const),
    );
    const teamMlbSigningSlots = new Map(
      TEAMS
        .filter((team) => team.id !== s.userTeamId)
        .map((team) => [team.id, getAvailableMlbSigningSlots(s, team.id)] as const),
    );
    const teamBuildingArchetypes = new Map(
      TEAMS
        .filter((team) => team.id !== s.userTeamId)
        .map((team) => [team.id, deriveWorkerTeamBuildingArchetype(s, team.id)] as const),
    );
    s.freeAgencyMarket = simulateFADay(
      s.rng.fork(),
      s.freeAgencyMarket,
      teamBudgets,
      teamPayrolls,
      teamNeeds,
      teamMlbSigningSlots,
      new Map(),
      relationshipContexts,
      userTeamNeeds,
      teamBuildingArchetypes,
      (teamId, playerId) => planReservedFreeAgencyBidCompensation(
        s,
        bidReservations,
        teamId,
        playerId,
        { years: 1, annualSalary: 0, totalValue: 0 },
      ).kind !== 'blocked',
      (offer, decision, receipt) => {
        const reservation = planReservedFreeAgencyBidCompensation(
          s,
          bidReservations,
          offer.teamId,
          offer.playerId,
          offer,
        );
        if (reservation.kind === 'reserve') {
          bidReservations.compensatoryPicks = reservation.plan.compensatoryPicks;
          bidReservations.pickOwnership = reservation.plan.pickOwnership;
        }
        acceptedDecisions.set(offer.playerId, {
          decision,
          receipt: {
            ...receipt,
            independentlyDerivedPayrollBeforeSigning:
              independentlyDerivedDayPayrolls.get(offer.teamId) ?? 0,
            mlbRosterPlayerIdsBeforeSigning: (virtualMlbRosters.get(offer.teamId) ?? [])
              .map((player) => player.id),
          },
        });
        independentlyDerivedDayPayrolls.set(
          offer.teamId,
          (independentlyDerivedDayPayrolls.get(offer.teamId) ?? 0) + offer.annualSalary,
        );
        const acceptedPlayer = s.players.find((candidate) => candidate.id === offer.playerId);
        if (acceptedPlayer) {
          applyVirtualFreeAgencySigning(
            virtualMlbRosters,
            teamNeeds,
            offer.teamId,
            acceptedPlayer,
          );
        }
      },
      (teamId, playerId, teamNeed) => {
        const player = s.players.find((candidate) => candidate.id === playerId);
        if (!player) {
          return {
            teamNeed,
            contenderStatus: 'unknown',
            tenureSeasons: 0,
            homegrownBond: 0,
            clubhouseScore: 0,
          };
        }
        return buildFreeAgencyDecisionContext(s, teamId, player, teamNeed);
      },
    );
    aiSignings.push(...applyNewFreeAgencySignings(s, previousSignedIds, acceptedDecisions));
  }

  return aiSignings;
}

function processCurrentOffseasonPhase(
  s: FullGameState,
  previousPhase: OffseasonState['currentPhase'] | null,
  previousPhaseDay: number | null,
): OffseasonProgressResult {
  if (!s.offseasonState) return { aiSignings: [] };

  const currentPhase = s.offseasonState.currentPhase;
  const enteredPhase = previousPhase !== currentPhase;

  if (currentPhase === 'arbitration') {
    prepareArbitrationDocketOnce(s);
    // Day 6 is the visible hearing checkpoint. The retained award is applied
    // on day 7 so a durable save can exist at filing, exchange, hearing, and
    // resolution rather than collapsing the final two beats into one write.
    if (s.offseasonState.phaseDay >= 7) {
      resolveArbitrationDocketOnce(s);
    }
    return { aiSignings: [] };
  }

  if (currentPhase === 'tender_nontender' && enteredPhase) {
    applyTenderDecisionsOnce(s);
    return { aiSignings: [] };
  }

  if (currentPhase === 'extensions' && enteredPhase) {
    const error = processTeamExtensionsOnce(s);
    if (error) {
      return { aiSignings: [], error, flowStateChanged: false };
    }
    return { aiSignings: [] };
  }

  if (currentPhase === 'qualifying_offers' && enteredPhase) {
    processQualifyingOfferIssuanceOnce(s);
    return { aiSignings: [] };
  }

  if (currentPhase === 'free_agency') {
    const advancedWithinPhase = previousPhase === currentPhase && previousPhaseDay !== s.offseasonState.phaseDay;
    if (enteredPhase || advancedWithinPhase) {
      if (enteredPhase) {
        const resolution = resolveOutstandingQualifyingOffers(s);
        if (resolution.error) {
          return { aiSignings: [], error: resolution.error };
        }
        // This is the only production null-market creation seam. Later
        // simulation, queries, offers, and phase finalization consume the
        // persisted market or fail closed.
        if (!ensureFreeAgencyMarket(s)) {
          return { aiSignings: [] };
        }
      }
      return {
        aiSignings: simulateFreeAgencyDays(s, 1),
      };
    }
  }

  if (currentPhase === 'protection_audit') {
    ensureRule5SessionForCurrentPhase(s);
    return { aiSignings: [] };
  }

  if (currentPhase === 'rule5_draft') {
    ensureRule5SessionForCurrentPhase(s);
    if (enteredPhase) {
      advanceRule5DraftToUserTurn(s);
    }
    return { aiSignings: [] };
  }

  if (currentPhase === 'international_signing') {
    const advancedWithinPhase = previousPhase === currentPhase && previousPhaseDay !== s.offseasonState.phaseDay;
    if (enteredPhase || advancedWithinPhase) {
      simulateInternationalSigningDay(s);
    }
    return { aiSignings: [] };
  }

  if (currentPhase === 'spring_training') {
    resolveHoldoutsForSpringTrainingOnce(s);
    return { aiSignings: [] };
  }

  return { aiSignings: [] };
}

function finalizeFreeAgencyIfNeeded(
  s: FullGameState,
  previousPhase: OffseasonState['currentPhase'],
  nextPhase: OffseasonState['currentPhase'] | null,
): OffseasonProgressResult['aiSignings'] {
  if (previousPhase !== 'free_agency' || nextPhase === 'free_agency') {
    return [];
  }

  if (!hasCanonicalFreeAgencyMarket(s)) return [];
  const remainingDays = s.freeAgencyMarket ? Math.max(0, 60 - s.freeAgencyMarket.day) : 0;
  return simulateFreeAgencyDays(s, remainingDays);
}

function finalizeDraftIfNeeded(
  s: FullGameState,
  previousPhase: OffseasonState['currentPhase'],
  nextPhase: OffseasonState['currentPhase'] | null,
): { success: true } | { success: false; error: string } {
  if (previousPhase !== 'draft' || nextPhase === 'draft') {
    return { success: true };
  }

  const integrityError = validateQualifyingOfferCompensationState(s);
  if (integrityError) {
    return { success: false, error: integrityError };
  }

  const checkpoint = captureDraftMutationCheckpoint(s);
  if (!s.draftClass) {
    ensureDraftPickOwnershipForSeason(s);
    const generatedDraftClass = generateDraftClass(s.rng.fork(), s.season);
    ensureDraftMetadataForSession(s, generatedDraftClass);
    s.draftClass = createDraftSessionState(generatedDraftClass, s.seasonState, s.draftState);
  }

  const session = ensureDraftSession(s);
  if (!session) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, error: 'Draft class unavailable.' };
  }
  const topologyError = validateDraftSessionTopology(s, session);
  if (topologyError) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, error: topologyError };
  }
  if (session.status === 'complete') {
    return { success: true };
  }

  const result = simulateRemainingDraftSession(s);
  if (!result.success) {
    restoreDraftMutationCheckpoint(s, checkpoint);
    return { success: false, error: result.error ?? 'Draft could not be completed.' };
  }
  autoResolveAIDraftSignings(s);
  return { success: true };
}

function validateDraftExitBeforeMutation(
  s: FullGameState,
  previousPhase: OffseasonState['currentPhase'],
  nextPhase: OffseasonState['currentPhase'] | null,
): string | null {
  if (previousPhase !== 'draft' || nextPhase === 'draft' || !s.draftClass) {
    return null;
  }

  // Normalization may fill compatibility defaults. Treat this as a pure
  // preflight by restoring the exact imported draft state on both success and
  // failure; finalization will normalize again only after the gate passes.
  const checkpoint = captureDraftMutationCheckpoint(s);
  const session = ensureDraftSession(s);
  const error = session
    ? validateDraftSessionTopology(s, session)
    : 'Draft class unavailable.';
  restoreDraftMutationCheckpoint(s, checkpoint);
  return error;
}

function applyOffseasonTransition(
  s: FullGameState,
  previousState: OffseasonState,
  nextState: OffseasonState,
): OffseasonProgressResult {
  if (previousState.currentPhase !== 'extensions' && nextState.currentPhase === 'extensions') {
    const extensionError = validateCurrentExtensionAggregate(s);
    if (extensionError) {
      return { aiSignings: [], error: extensionError, flowStateChanged: false };
    }
  }
  const compensationError = validateQualifyingOfferCompensationState(s);
  if (compensationError) {
    return { aiSignings: [], error: compensationError, flowStateChanged: false };
  }
  // An imported non-null market is authoritative only when it is canonical.
  // Validate before QO resolution, FA finalization, RNG forks, phase
  // advancement, or any player mutation. An invalid imported market freezes
  // entry, resumed FA days, and FA→Draft alike; otherwise a corrupt market
  // could be silently bypassed when leaving free agency.
  const touchesFreeAgency = previousState.currentPhase === 'free_agency'
    || nextState.currentPhase === 'free_agency';
  const requiresCanonicalMarket = previousState.currentPhase === 'free_agency'
    || s.freeAgencyMarket != null;
  if (touchesFreeAgency
    && requiresCanonicalMarket
    && !hasCanonicalFreeAgencyMarket(s)) {
    return { aiSignings: [], flowStateChanged: false };
  }

  const draftExitError = validateDraftExitBeforeMutation(
    s,
    previousState.currentPhase,
    nextState.currentPhase,
  );
  if (draftExitError) {
    return { aiSignings: [], error: draftExitError, flowStateChanged: false };
  }

  // Authentic compact old saves can reach the contract clock without a full
  // league or postseason artifact. Do not invent revenue facts or strand that
  // save: a wholly absent bracket defers settlement until the next factual
  // completed season. Once a bracket exists, validation is fail-closed.
  if (previousState.currentPhase === 'season_review' && s.playoffBracket) {
    reconcileCompletedSeasonMarketRevenue(s);
  }

  reconcileExistingOffseasonServiceOnce(s);

  const aiSignings = finalizeFreeAgencyIfNeeded(s, previousState.currentPhase, nextState.currentPhase);
  const draftFinalization = finalizeDraftIfNeeded(s, previousState.currentPhase, nextState.currentPhase);
  if (!draftFinalization.success) {
    return { aiSignings: [], error: draftFinalization.error, flowStateChanged: false };
  }
  if (previousState.currentPhase === 'arbitration' && nextState.currentPhase !== 'arbitration') {
    prepareArbitrationDocketOnce(s);
    resolveArbitrationDocketOnce(s);
  }
  s.offseasonState = {
    ...nextState,
    serviceTimeReconciled: s.offseasonState?.serviceTimeReconciled ?? nextState.serviceTimeReconciled,
    phaseResults: s.offseasonState?.phaseResults ?? previousState.phaseResults,
  };
  updateOffseasonClock(s);
  const currentProgress = processCurrentOffseasonPhase(s, previousState.currentPhase, previousState.phaseDay);
  if (currentProgress.error) {
    return { aiSignings: [], error: currentProgress.error, flowStateChanged: false };
  }
  if (nextState.completed && !previousState.completed) {
    reconcileCompletedOffseasonOwnerPayrollPressure(s);
  }
  return {
    aiSignings: [...aiSignings, ...currentProgress.aiSignings],
    flowStateChanged: true,
  };
}

/** Handle one offseason day with AI auto-resolution. */
export function advanceOffseasonOnce(s: FullGameState): OffseasonProgressResult {
  ensureOffseasonState(s);
  if (!s.offseasonState || s.offseasonState.completed) return { aiSignings: [], flowStateChanged: false };

  const previousState = s.offseasonState;
  const nextState = advanceOffseasonDay(previousState);
  return applyOffseasonTransition(s, previousState, nextState);
}

export function skipOffseasonPhaseWithAI(s: FullGameState): OffseasonProgressResult {
  ensureOffseasonState(s);
  if (!s.offseasonState || s.offseasonState.completed) return { aiSignings: [], flowStateChanged: false };

  const previousState = s.offseasonState;
  const nextState = skipCurrentPhase(previousState);
  return applyOffseasonTransition(s, previousState, nextState);
}

export function toggleUserRule5Protection(
  s: FullGameState,
  playerId: string,
): { success: boolean; error?: string } {
  const checkpoint = captureRule5MutationCheckpoint(s);
  ensureRule5SessionForCurrentPhase(s);
  if (!s.offseasonState || s.offseasonState.currentPhase !== 'protection_audit' || !s.rule5Session) {
    restoreRule5MutationCheckpoint(s, checkpoint);
    return { success: false, error: 'Protection audit is not active.' };
  }

  const result = toggleRule5ProtectionCore(s.rule5Session, s.userTeamId, playerId);
  if (!result.success) {
    restoreRule5MutationCheckpoint(s, checkpoint);
    return { success: false, error: result.error };
  }

  s.rule5Session = result.session;
  syncRule5ProtectionToRosterState(s, s.userTeamId, s.rule5Session.protectedPlayerIdsByTeam[s.userTeamId] ?? []);
  return { success: true };
}

export function lockUserRule5Protection(
  s: FullGameState,
): { success: boolean; error?: string } {
  const checkpoint = captureRule5MutationCheckpoint(s);
  ensureRule5SessionForCurrentPhase(s);
  if (!s.offseasonState || !s.rule5Session) {
    restoreRule5MutationCheckpoint(s, checkpoint);
    return { success: false, error: 'Protection audit is not active.' };
  }

  s.rule5Session = lockRule5ProtectionAuditCore(s.rule5Session);
  s.offseasonState = {
    ...s.offseasonState,
    currentPhase: 'rule5_draft',
    phaseDay: 1,
  };
  syncRule5ObligationsFromSession(s);
  advanceRule5DraftToUserTurn(s);
  return { success: true };
}

export function makeUserRule5Selection(
  s: FullGameState,
  playerId: string,
): { success: boolean; error?: string } {
  const checkpoint = captureRule5MutationCheckpoint(s);
  ensureRule5SessionForCurrentPhase(s);
  if (!s.rule5Session || s.rule5Session.phase !== 'rule5_draft') {
    restoreRule5MutationCheckpoint(s, checkpoint);
    return { success: false, error: 'Rule 5 draft is not active.' };
  }

  const result = makeRule5SelectionCore(s.rule5Session, s.userTeamId, playerId);
  if (!result.success) {
    restoreRule5MutationCheckpoint(s, checkpoint);
    return { success: false, error: result.error };
  }

  s.rule5Session = result.session;
  const selection = s.rule5Session.selections[s.rule5Session.selections.length - 1];
  if (selection) {
    applyRule5SelectionToLeague(s, selection);
  }
  syncRule5ObligationsFromSession(s);
  advanceRule5DraftToUserTurn(s);
  return { success: true };
}

export function passUserRule5Turn(
  s: FullGameState,
): { success: boolean; error?: string } {
  const checkpoint = captureRule5MutationCheckpoint(s);
  ensureRule5SessionForCurrentPhase(s);
  if (!s.rule5Session || s.rule5Session.phase !== 'rule5_draft') {
    restoreRule5MutationCheckpoint(s, checkpoint);
    return { success: false, error: 'Rule 5 draft is not active.' };
  }

  const result = passRule5DraftTurnCore(s.rule5Session, s.userTeamId);
  if (!result.success) {
    restoreRule5MutationCheckpoint(s, checkpoint);
    return { success: false, error: result.error };
  }

  s.rule5Session = result.session;
  advanceRule5DraftToUserTurn(s);
  return { success: true };
}

export function ensurePlayersHaveRule5Eligibility(
  players: GeneratedPlayer[],
  currentSeason: number,
) {
  for (const player of players) {
    if (!Number.isFinite(player.rule5EligibleAfterSeason) || player.rule5EligibleAfterSeason < 1) {
      player.rule5EligibleAfterSeason = estimateBackfilledRule5EligibilityAfterSeason(player, currentSeason);
    }
  }
}

export function enforceRule5RosterRestriction(
  s: FullGameState,
  playerId: string,
): { success: true } | { success: false; error: string; flowStateChanged: boolean } {
  const obligation = s.rule5Obligations.find((entry) => entry.playerId === playerId && entry.status === 'active');
  if (!obligation) {
    return { success: true };
  }

  return requestRule5OfferBack(s, playerId);
}
