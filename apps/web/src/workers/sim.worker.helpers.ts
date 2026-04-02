/**
 * Shared types, state, and helper functions for the sim worker.
 * Extracted to keep the main worker file under 500 lines.
 */
import {
  GameRNG,
  TEAMS,
  DRAFT_CLASS_SIZE,
  DRAFT_ROUNDS,
  FORTY_MAN_LIMIT,
  aiSelectPick,
  awardCompensatoryPick,
  buildPlayoffPreview,
  buildDraftPickSlots,
  calculateMarketValue,
  createDefaultDraftPickOwnership,
  createInternationalScoutingState as createInternationalScoutingStateCore,
  type InternationalScoutingState,
  determinePlayoffSeeds,
  determineDraftOrder,
  forfeitHighestEligiblePick,
  generateDraftClass,
  getTeamById,
  getOffseasonLength,
  resolveDraftSigning,
  scoutDraftProspect,
  serviceDaysToYears,
  toDisplayRating,
  toLetterGrade,
  advanceInjury,
  describeInjury,
  processInjuries,
  checkMilestones,
  generateNews,
  deduplicateNews,
  createOffseasonState,
  createRule5Session,
  estimateBackfilledRule5EligibilityAfterSeason,
  advanceOffseasonDay,
  skipCurrentPhase,
  autoResolveTenderNonTender,
  buildRosterState,
  buildWaiverPriority,
  calculateTeamPayroll,
  claimOffWaivers as claimOffWaiversCore,
  consumeOptionYear,
  createFreeAgencyMarket,
  createMinorLeagueState as createMinorLeagueStateCore,
  evaluateTeamNeeds,
  generateArbitrationCase,
  getArbEligiblePlayers,
  getAvailableIFAProspects,
  getPromotionCandidates as getPromotionCandidatesCore,
  getRosterComplianceIssues as getRosterComplianceIssuesCore,
  getInternationalScoutAccuracy,
  getRemainingIFABudget,
  getTeamBudget,
  placeOnWaivers as placeOnWaiversCore,
  recordArbitration,
  recordDraftPicks,
  recordFASigning,
  recordIFASigning,
  recordTenderDecisions,
  resolveArbitration,
  scoutIFAProspect,
  signIFAProspect as signIFAProspectCore,
  simulateAffiliateDay as simulateAffiliateDayCore,
  simulateFADay,
  tradeIFABonusPool as tradeIFABonusPoolCore,
  accrueServiceTimeDay as accrueServiceTimeDayCore,
  lockRule5ProtectionAudit as lockRule5ProtectionAuditCore,
  makeRule5Selection as makeRule5SelectionCore,
  passRule5DraftTurn as passRule5DraftTurnCore,
  toggleRule5Protection as toggleRule5ProtectionCore,
  type DraftPickResult,
  type DraftPickSlot,
  type DraftScoutingReport,
  type FASigningResult,
  type IFAScoutingHistoryEntry,
  type InternationalProspect,
  type InternationalScoutingReport,
  type PromotionCandidate,
  type RetirementResult,
  type RosterComplianceIssue,
  type Rule5EligiblePlayer,
  type Rule5Obligation,
  type Rule5OfferBackState,
  type Rule5Selection,
  type Rule5SessionState,
} from '@mbd/sim-core';
import { applyMoraleEvent } from '../../../../packages/sim-core/src/league/narrativeState';
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
  AwardHistoryEntry,
  BriefingItem,
  CareerStatsLedger,
  DraftCompensatoryPick,
  DraftPickOwnership,
  FranchiseTimelineEntry,
  HallOfFameBallotEntry,
  HallOfFameEntry,
  DraftSignability,
  DraftState as PersistentDraftState,
  MinorLeagueState,
  OwnerState,
  PlayerMorale,
  Rivalry,
  SeasonHistoryEntry,
  TeamChemistry,
  TradeState,
} from '@mbd/contracts';

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
  playerMorale: Map<string, PlayerMorale>;
  teamChemistry: Map<string, TeamChemistry>;
  ownerState: Map<string, OwnerState>;
  briefingQueue: BriefingItem[];
  storyFlags: Map<string, string[]>;
  rivalries: Map<string, Rivalry>;
  awardHistory: AwardHistoryEntry[];
  hallOfFame: HallOfFameEntry[];
  hallOfFameBallot: HallOfFameBallotEntry[];
  franchiseTimeline: FranchiseTimelineEntry[];
  careerStats: CareerStatsLedger[];
  seasonHistory: SeasonHistoryEntry[];
  tradeState: TradeState;
}

export let state: FullGameState | null = null;

export function setState(s: FullGameState | null): void {
  state = s;
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
  stats: {
    pa: number;
    ab: number;
    hits: number;
    hr: number;
    rbi: number;
    bb: number;
    k: number;
    avg: string;
    ip: number;
    earnedRuns: number;
    strikeouts: number;
    walks: number;
    era: string;
  } | null;
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
  }>;
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

export interface OffseasonStateView extends OffseasonState {
  transactionGroups: OffseasonTransactionGroup[];
  rule5?: Rule5StateView;
  flowStateChanged?: boolean;
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

export function getTeamPlayers(teamId: string): GeneratedPlayer[] {
  return requireState().players.filter(p => p.teamId === teamId);
}

export function createEmptyTradeState(): TradeState {
  return {
    pendingOffers: [],
    tradeHistory: [],
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

const QUALIFYING_OFFER_AMOUNT = 20;
const QUALIFYING_OFFER_MIN_MARKET_VALUE = 15;
const QUALIFYING_OFFER_MIN_SERVICE_YEARS = 3;

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

export function advanceMinorLeagueDay(s: FullGameState) {
  const accrued = accrueServiceTimeDayCore(s.players, s.minorLeagueState);
  s.players = accrued.players;
  s.minorLeagueState = simulateAffiliateDayCore(
    s.rng.fork(),
    accrued.state,
    s.players,
    s.day,
    s.season,
    TEAMS.map((team) => team.id),
  );
}

export function getPromotionCandidatesForTeam(
  s: FullGameState,
  teamId: string,
): PromotionCandidate[] {
  return getPromotionCandidatesCore(s.players, s.minorLeagueState, teamId);
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

export function claimPlayerOffWaivers(
  s: FullGameState,
  playerId: string,
  claimingTeamId: string,
) {
  const result = claimOffWaiversCore(s.players, s.minorLeagueState, playerId, claimingTeamId);
  if (!result.success) {
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
  const requiredSeasons = new Set([s.season, s.season + 1]);
  const teamIds = TEAMS.map((team) => team.id);

  if (s.draftState.pickOwnership.length === 0) {
    s.draftState = {
      ...s.draftState,
      pickOwnership: createDefaultDraftPickOwnership(teamIds, s.season),
    };
    return;
  }

  const existingSeasonKeys = new Set(s.draftState.pickOwnership.map((pick) => pick.season));
  if ([...requiredSeasons].every((season) => existingSeasonKeys.has(season))) {
    return;
  }

  const supplemental = createDefaultDraftPickOwnership(teamIds, s.season)
    .filter((pick) => !s.draftState.pickOwnership.some((existing) =>
      existing.season === pick.season
      && existing.round === pick.round
      && existing.originalTeamId === pick.originalTeamId,
    ));
  s.draftState = {
    ...s.draftState,
    pickOwnership: [...s.draftState.pickOwnership, ...supplemental],
  };
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

function ensureInternationalScoutingStateForSeason(s: FullGameState): InternationalScoutingState {
  const currentState = s.internationalScoutingState;
  if (
    currentState.season === s.season &&
    currentState.budgets.size === TEAMS.length
  ) {
    return currentState;
  }

  const nextState = createInternationalScoutingStateCore(
    s.rng.fork(),
    TEAMS.map((team) => team.id),
    s.season,
  );
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

function formatYears(years: number): string {
  return `(${years} year${years === 1 ? '' : 's'})`;
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'season_review': return 'Season Review';
    case 'arbitration': return 'Arbitration';
    case 'tender_nontender': return 'Tender / Non-Tender';
    case 'qualifying_offers': return 'Qualifying Offers';
    case 'free_agency': return 'Free Agency';
    case 'draft': return 'Amateur Draft';
    case 'protection_audit': return 'Protection Audit';
    case 'rule5_draft': return 'Rule 5 Draft';
    case 'international_signing': return 'International Signing';
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
    tone,
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

function recordDraftPickForState(
  s: FullGameState,
  session: DraftSessionState,
  slot: NonNullable<ReturnType<typeof getCurrentDraftSlot>>,
  prospect: DraftProspect,
): DraftRoomPick {
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
    tone: transactionToneForTeam(s, teamId),
  };

  (prospect.player as { teamId: string }).teamId = teamId;
  if (!s.players.some((player) => player.id === prospect.player.id)) {
    s.players.push(prospect.player);
  }

  session.prospects = session.prospects.filter((candidate) => candidate.player.id !== prospect.player.id);
  session.completedPicks = [...session.completedPicks, pick];
  session.status = getDraftStatus(session);
  s.rosterStates.set(teamId, buildRosterState(teamId, s.players));

  if (!s.offseasonState) {
    s.offseasonState = createOffseasonState(s.season);
  }
  s.offseasonState = recordDraftPicks(s.offseasonState, [{
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
    newPicks.push(recordDraftPickForState(s, session, currentSlot, selection));
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
        pick: picksByKey.get(slot.slotId) ?? null,
      })),
    });
  }

  return { teams, rounds };
}

export function buildDraftRoomView(s: FullGameState): DraftRoomView | null {
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
  const availableProspects = sortedProspects.map((prospect) => ({
    id: prospect.player.id,
    playerId: prospect.player.id,
    name: `${prospect.player.firstName} ${prospect.player.lastName}`,
    firstName: prospect.player.firstName,
    lastName: prospect.player.lastName,
    position: prospect.player.position,
    scoutingGrade: userReports.get(prospect.player.id)?.overallGrade ?? prospect.scoutingGrade,
    consensusGrade: prospect.scoutingGrade,
    looks: userReports.get(prospect.player.id)?.looks ?? 0,
    slotValue: prospect.slotValue,
    askBonus: prospect.askBonus,
    background: originLabel(prospect.background),
    bigBoardRank: bigBoardIndex.get(prospect.player.id) != null ? (bigBoardIndex.get(prospect.player.id)! + 1) : null,
    age: prospect.player.age,
    origin: originLabel(prospect.collegeOrHS),
  }));

  const currentSlot = session.status === 'complete' ? null : getCurrentDraftSlot(session);
  const totalPicks = session.pickSlots.length;
  const currentTeam = currentSlot ? getTeamById(currentSlot.teamId) : null;
  const userPicks = session.completedPicks.filter((pick) => pick.teamId === s.userTeamId);
  const signingDecisions = new Map(s.draftState.signingDecisions.map((entry) => [entry.playerId, entry] as const));

  return {
    status: session.status,
    availableProspects,
    udfaProspects: session.status === 'complete'
      ? availableProspects.slice(0, Math.max(0, DRAFT_CLASS_SIZE - totalPicks))
      : [],
    completedPicks: session.completedPicks,
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
}

export function buildIFAPoolView(s: FullGameState): IFAPoolView {
  const internationalState = ensureInternationalScoutingStateForSeason(s);
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
  const staffAccuracy = getInternationalScoutAccuracy(
    s.scoutingStaffs.get(s.userTeamId) ?? [],
  );

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
        };
      }),
  };
}

export function scoutUserIFAPlayer(
  s: FullGameState,
  playerId: string,
): { success: true; report: IFAReportView } | { success: false; error: string } {
  if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'international_signing') {
    return { success: false, error: 'International signing is not active.' };
  }

  ensureInternationalScoutingStateForSeason(s);
  const prospect = s.internationalScoutingState.ifaPool.find((entry) => entry.id === playerId);
  if (!prospect) {
    return { success: false, error: 'International prospect not found.' };
  }
  if (prospect.status !== 'available') {
    return { success: false, error: 'This prospect has already signed.' };
  }

  const historyEntry = getTeamIFAScoutingHistory(s, s.userTeamId)
    .find((entry) => entry.playerId === playerId);
  const looks = (historyEntry?.looks ?? 0) + 1;
  const accuracy = getInternationalScoutAccuracy(
    s.scoutingStaffs.get(s.userTeamId) ?? [],
  );
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

  ensureInternationalScoutingStateForSeason(s);
  const prospect = s.internationalScoutingState.ifaPool.find((entry) => entry.id === playerId);
  if (!prospect) {
    return { success: false, error: 'International prospect not found.' };
  }

  try {
    applyIFASigningToLeague(s, prospect, s.userTeamId, bonusAmount);
  } catch (error) {
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
  ensureInternationalScoutingStateForSeason(s);

  try {
    s.internationalScoutingState = tradeIFABonusPoolCore(
      s.internationalScoutingState,
      s.userTeamId,
      toTeamId,
      amount,
    );
  } catch (error) {
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
  const session = ensureDraftSession(s);
  const prospect = session?.prospects.find((candidate) => candidate.player.id === playerId);
  if (!session || !prospect) {
    return { success: false, error: 'Draft prospect not available.' };
  }

  const staff = s.scoutingStaffs.get(s.userTeamId) ?? [];
  const accuracy = getInternationalScoutAccuracy(staff);
  const previousReport = getTeamDraftScoutingReports(s, s.userTeamId)
    .find((report) => report.playerId === playerId);
  const report = scoutDraftProspect(s.rng.fork(), prospect, accuracy, previousReport);
  upsertTeamDraftScoutingReport(s, s.userTeamId, report);
  return { success: true, report };
}

export function toggleUserDraftBigBoardPlayer(
  s: FullGameState,
  playerId: string,
): { success: true; board: string[] } | { success: false; error: string } {
  const session = ensureDraftSession(s);
  if (!session || !session.prospects.some((prospect) => prospect.player.id === playerId)) {
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

  player.teamId = '';
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
  const pick = ensureDraftSession(s)?.completedPicks.find((entry) => entry.playerId === playerId && entry.teamId === s.userTeamId);
  if (!pick) {
    return { success: false, error: 'Drafted player not found.' };
  }
  if (s.draftState.signingDecisions.some((entry) => entry.playerId === playerId)) {
    return { success: false, error: 'Signing decision already recorded.' };
  }

  const prospect = buildDraftProspectFromState(s, playerId, pick.scoutingGrade, pick.round, pick.pickNumber);
  if (!prospect) {
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
    }
  }
}

export function startDraftSession(s: FullGameState, draftClass?: DraftClass): DraftActionResult {
  if (draftClass) {
    ensureDraftPickOwnershipForSeason(s);
    ensureDraftMetadataForSession(s, draftClass);
    s.draftClass = createDraftSessionState(draftClass, s.seasonState, s.draftState);
  }

  const session = ensureDraftSession(s);
  if (!session) {
    return { success: false, draft: null, newPicks: [], error: 'Draft class unavailable' };
  }

  if (session.status === 'complete') {
    return { success: true, draft: buildDraftRoomView(s), newPicks: [] };
  }

  session.status = 'in_progress';
  const newPicks = advanceDraftToUserTurn(s);
  session.status = getDraftStatus(session);
  return {
    success: true,
    draft: buildDraftRoomView(s),
    newPicks,
  };
}

export function makeUserDraftSelection(s: FullGameState, prospectId: string): DraftActionResult {
  const session = ensureDraftSession(s);
  const currentSlot = session ? getCurrentDraftSlot(session) : null;
  if (!session || !currentSlot) {
    return { success: false, draft: buildDraftRoomView(s), newPicks: [], error: 'Draft is not active' };
  }
  if (currentSlot.teamId !== s.userTeamId) {
    return { success: false, draft: buildDraftRoomView(s), newPicks: [], error: 'You are not on the clock' };
  }

  const prospect = session.prospects.find((candidate) => candidate.player.id === prospectId);
  if (!prospect) {
    return { success: false, draft: buildDraftRoomView(s), newPicks: [], error: 'Prospect not available' };
  }

  const newPicks = [recordDraftPickForState(s, session, currentSlot, prospect), ...advanceDraftToUserTurn(s)];
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
  const session = ensureDraftSession(s);
  if (!session) {
    return { success: false, draft: null, newPicks: [], error: 'Draft class unavailable' };
  }

  session.status = 'in_progress';
  const newPicks: DraftRoomPick[] = [];
  let currentSlot = getCurrentDraftSlot(session);

  while (currentSlot && session.prospects.length > 0) {
    const teamRoster = s.players.filter((player) => player.teamId === currentSlot?.teamId);
    const selection = aiSelectPick(s.rng.fork(), currentSlot.teamId, session.prospects, teamRoster);
    newPicks.push(recordDraftPickForState(s, session, currentSlot, selection));
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

  return {
    ...offseasonState,
    phaseResults: {
      arbitrationResolved: phaseResults.arbitrationResolved ?? [],
      tenderedPlayers: phaseResults.tenderedPlayers ?? [],
      nonTenderedPlayers: phaseResults.nonTenderedPlayers ?? [],
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
      ? `${playerLabel(player)} signed for ${formatMoneyPerYear(result.newSalary)} ${formatYears(1)}`
      : `${playerLabel(player)} lost arbitration case`;
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
    'free_agency',
    'draft',
    'protection_audit',
    'rule5_draft',
    'spring_training',
  ]
    .map((phase) => ({
      phase,
      label: phaseLabel(phase),
      rows: rowsByPhase.get(phase) ?? [],
    }))
    .filter((group) => group.rows.length > 0);

  return {
    ...offseasonState,
    transactionGroups,
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
    return {
      status: 'regular',
      season: s.season,
      phaseLabel: `Season ${s.season} — Day ${s.day}/162`,
      detailLabel: 'Regular Season',
      progress: clampProgress(s.day / 162),
      canUseRegularSimControls: true,
      action: null,
      actionLabel: null,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: Math.max(0, 120 - s.day),
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

export function toPlayerDTO(player: GeneratedPlayer, stats?: PlayerGameStats): PlayerDTO {
  const seasonStats = stats ?? (state ? state.seasonState.playerSeasonStats.get(player.id) : undefined);
  let statBlock: PlayerDTO['stats'] = null;
  if (seasonStats && (seasonStats.pa > 0 || seasonStats.strikeouts > 0)) {
    const avg = seasonStats.ab > 0
      ? (seasonStats.hits / seasonStats.ab).toFixed(3).replace(/^0/, '')
      : '.000';
    const era = seasonStats.ip > 0
      ? ((seasonStats.earnedRuns / (seasonStats.ip / 3)) * 9).toFixed(2)
      : '0.00';
    statBlock = {
      pa: seasonStats.pa, ab: seasonStats.ab, hits: seasonStats.hits,
      hr: seasonStats.hr, rbi: seasonStats.rbi, bb: seasonStats.bb,
      k: seasonStats.k, avg,
      ip: seasonStats.ip, earnedRuns: seasonStats.earnedRuns,
      strikeouts: seasonStats.strikeouts, walks: seasonStats.walks, era,
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
    stats: statBlock,
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

  // Check milestones
  const milestones = checkMilestones(s.seasonState.playerSeasonStats, s.players, s.season, s.day);
  for (const m of milestones) {
    const mNews = generateNews(s.rng.fork(), {
      type: 'milestone', season: s.season, day: s.day,
      data: m as unknown as Record<string, unknown>,
    }, s.players, s.season, s.day);
    s.news.push(...mNews);
  }

  s.news = deduplicateNews(s.news);
}

function ensureOffseasonState(s: FullGameState) {
  if (!s.offseasonState) {
    s.offseasonState = createOffseasonState(s.season);
  }
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
      score: player.overallRating + (needs.get(player.position) ?? 0) * 2 - Math.max(0, player.age - 26) * 4,
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
  player.teamId = selection.draftingTeamId;
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
): { success: false; error: string } {
  const obligation = s.rule5Obligations.find((entry) => entry.playerId === playerId && entry.status === 'active');
  if (!obligation) {
    return { success: false, error: 'No active Rule 5 obligation.' };
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

  return { success: false, error: 'Rule 5 player must clear the offer-back flow before leaving the MLB roster.' };
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
    player.teamId = offer.originalTeamId;
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

function applyArbitrationResultsOnce(s: FullGameState) {
  if (!s.offseasonState) return;

  const resolvedIds = new Set(
    s.offseasonState.phaseResults.arbitrationResolved.map((entry) => entry.playerId),
  );

  for (const teamId of TEAMS.map((team) => team.id)) {
    const eligiblePlayers = getArbEligiblePlayers(s.players, teamId, s.serviceTime)
      .filter((player) => player.rosterStatus === 'MLB');

    for (const player of eligiblePlayers) {
      if (resolvedIds.has(player.id)) continue;

      const yearsOfService = s.serviceTime.get(player.id) ?? 0;
      const arbitrationRng = s.rng.fork();
      const arbitrationCase = generateArbitrationCase(
        arbitrationRng,
        player,
        yearsOfService,
        player.contract.annualSalary,
      );
      const awardedSalary = resolveArbitration(arbitrationRng, arbitrationCase);

      player.contract.annualSalary = awardedSalary;
      player.contract.years = Math.max(1, player.contract.years);
      s.offseasonState = recordArbitration(s.offseasonState, {
        playerId: player.id,
        teamId,
        previousSalary: arbitrationCase.currentSalary,
        newSalary: awardedSalary,
        teamWon: awardedSalary === arbitrationCase.teamOffer,
      });
      resolvedIds.add(player.id);
    }
  }
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
    const tendered = decisions.tendered
      .filter((playerId) => eligibleIds.has(playerId) && !existingTendered.has(playerId) && !existingNonTendered.has(playerId));
    const nonTendered = decisions.nonTendered
      .filter((playerId) => eligibleIds.has(playerId) && !existingTendered.has(playerId) && !existingNonTendered.has(playerId));

    if (tendered.length === 0 && nonTendered.length === 0) continue;

    s.offseasonState = recordTenderDecisions(s.offseasonState, tendered, nonTendered);
    for (const playerId of tendered) existingTendered.add(playerId);
    for (const playerId of nonTendered) existingNonTendered.add(playerId);

    for (const playerId of nonTendered) {
      const player = s.players.find((candidate) => candidate.id === playerId);
      if (!player) continue;
      const previousTeamId = player.teamId;
      player.teamId = '';
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

function processQualifyingOffersOnce(s: FullGameState) {
  if (s.draftState.qualifyingOffers.some((entry) => entry.season === s.season)) {
    return;
  }

  const records = [];
  for (const player of s.players) {
    if (player.teamId === '' || player.rosterStatus !== 'MLB' || player.contract.years > 0) {
      continue;
    }

    const marketValue = calculateMarketValue(player);
    const serviceYears = serviceDaysToYears(player.serviceTimeDays);
    if (serviceYears < QUALIFYING_OFFER_MIN_SERVICE_YEARS || marketValue < QUALIFYING_OFFER_MIN_MARKET_VALUE) {
      continue;
    }

    const ageModifier = player.age >= 33 ? 0.14 : 0;
    const acceptChance = Math.max(0.08, Math.min(0.82, 0.72 - Math.max(0, marketValue - QUALIFYING_OFFER_AMOUNT) * 0.08 + ageModifier));
    const accepted = s.rng.nextFloat() < acceptChance;

    if (accepted) {
      player.contract.years = 1;
      player.contract.annualSalary = QUALIFYING_OFFER_AMOUNT;
    }

    records.push({
      playerId: player.id,
      teamId: player.teamId,
      season: s.season,
      marketValue,
      amount: QUALIFYING_OFFER_AMOUNT,
      status: accepted ? 'accepted' : 'rejected',
      signingTeamId: accepted ? player.teamId : null,
      compensationPickId: null,
    } as const);
  }

  if (records.length > 0) {
    s.draftState = {
      ...s.draftState,
      qualifyingOffers: [...s.draftState.qualifyingOffers, ...records],
    };
  }
}

function applyQualifyingOfferCompensationIfNeeded(
  s: FullGameState,
  playerId: string,
  signingTeamId: string,
) {
  const record = s.draftState.qualifyingOffers.find((entry) => entry.playerId === playerId && entry.season === s.season);
  if (!record || record.status !== 'rejected') {
    return;
  }

  if (record.teamId === signingTeamId) {
    s.draftState = {
      ...s.draftState,
      qualifyingOffers: s.draftState.qualifyingOffers.map((entry) => (
        entry.playerId === playerId && entry.season === s.season
          ? { ...entry, status: 'expired', signingTeamId }
          : entry
      )),
    };
    return;
  }

  ensureDraftPickOwnershipForSeason(s);
  const compensationOrder = s.draftState.compensatoryPicks.filter((entry) => entry.season === s.season).length + 1;
  const compensatoryPicks = awardCompensatoryPick(s.draftState.compensatoryPicks, {
    season: s.season,
    awardedToTeamId: record.teamId,
    compensationForPlayerId: playerId,
    compensationFromTeamId: signingTeamId,
    order: compensationOrder,
  });
  const forfeiture = forfeitHighestEligiblePick(
    s.draftState.pickOwnership,
    buildDraftOrderFromStandings(s.seasonState),
    signingTeamId,
    s.season,
  );
  const awardedPick = compensatoryPicks.find((entry) =>
    entry.season === s.season
    && entry.compensationForPlayerId === playerId
    && entry.awardedToTeamId === record.teamId,
  ) ?? null;

  s.draftState = {
    ...s.draftState,
    compensatoryPicks,
    pickOwnership: forfeiture.pickOwnership,
    qualifyingOffers: s.draftState.qualifyingOffers.map((entry) => (
      entry.playerId === playerId && entry.season === s.season
        ? {
          ...entry,
          status: 'compensated',
          signingTeamId,
          compensationPickId: awardedPick?.id ?? null,
        }
        : entry
    )),
  };
}

function ensureFreeAgencyMarket(s: FullGameState) {
  if (!s.freeAgencyMarket) {
    s.freeAgencyMarket = createFreeAgencyMarket(s.season, s.players);
  }
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
        return [team.id, calculateTeamPayroll(team.id, teamPlayers).totalPayroll] as const;
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

function applyNewFreeAgencySignings(
  s: FullGameState,
  previousSignedIds: Set<string>,
): OffseasonProgressResult['aiSignings'] {
  if (!s.freeAgencyMarket || !s.offseasonState) return [];

  const progress: OffseasonProgressResult['aiSignings'] = [];
  const currentSigningIds = new Set(s.offseasonState.phaseResults.freeAgentSignings.map((entry) => entry.playerId));

  for (const signedPlayer of s.freeAgencyMarket.signedPlayers) {
    const contract = signedPlayer.contract;
    const teamId = signedPlayer.signedWith;
    if (!contract || !teamId || previousSignedIds.has(signedPlayer.player.id) || currentSigningIds.has(signedPlayer.player.id)) {
      continue;
    }

    const player = s.players.find((candidate) => candidate.id === signedPlayer.player.id);
    if (!player) continue;

    const previousTeamId = player.teamId;
    player.teamId = teamId;
    player.rosterStatus = 'MLB';
    player.contract = {
      years: contract.years,
      annualSalary: contract.annualSalary,
      noTradeClause: contract.noTradeClause,
      playerOption: contract.playerOption,
      teamOption: contract.teamOption,
    };

    if (previousTeamId) {
      s.rosterStates.set(previousTeamId, buildRosterState(previousTeamId, s.players));
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
    applyQualifyingOfferCompensationIfNeeded(s, player.id, teamId);
    currentSigningIds.add(player.id);
    progress.push({
      playerId: player.id,
      teamId,
      years: contract.years,
      annualSalary: contract.annualSalary,
      marketValue: signedPlayer.marketValue,
    });
  }

  return progress;
}

function simulateFreeAgencyDays(
  s: FullGameState,
  daysToSimulate: number,
): OffseasonProgressResult['aiSignings'] {
  ensureFreeAgencyMarket(s);
  const aiSignings: OffseasonProgressResult['aiSignings'] = [];

  for (let day = 0; day < daysToSimulate; day++) {
    if (!s.freeAgencyMarket) break;
    const previousSignedIds = new Set(s.freeAgencyMarket.signedPlayers.map((entry) => entry.player.id));
    const teamBudgets = new Map(
      TEAMS
        .filter((team) => team.id !== s.userTeamId)
        .map((team) => [team.id, getTeamBudget(team.id)] as const),
    );
    const teamPayrolls = buildFreeAgencyPayrolls(s);
    const teamNeeds = buildFreeAgencyNeeds(s);
    s.freeAgencyMarket = simulateFADay(
      s.rng.fork(),
      s.freeAgencyMarket,
      teamBudgets,
      teamPayrolls,
      teamNeeds,
    );
    aiSignings.push(...applyNewFreeAgencySignings(s, previousSignedIds));
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

  if (currentPhase === 'tender_nontender' && enteredPhase) {
    applyArbitrationResultsOnce(s);
    applyTenderDecisionsOnce(s);
    return { aiSignings: [] };
  }

  if (currentPhase === 'qualifying_offers' && enteredPhase) {
    processQualifyingOffersOnce(s);
    return { aiSignings: [] };
  }

  if (currentPhase === 'free_agency') {
    const advancedWithinPhase = previousPhase === currentPhase && previousPhaseDay !== s.offseasonState.phaseDay;
    if (enteredPhase || advancedWithinPhase) {
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

  ensureFreeAgencyMarket(s);
  const remainingDays = s.freeAgencyMarket ? Math.max(0, 60 - s.freeAgencyMarket.day) : 0;
  return simulateFreeAgencyDays(s, remainingDays);
}

function finalizeDraftIfNeeded(
  s: FullGameState,
  previousPhase: OffseasonState['currentPhase'],
  nextPhase: OffseasonState['currentPhase'] | null,
) {
  if (previousPhase !== 'draft' || nextPhase === 'draft') {
    return;
  }

  if (!s.draftClass) {
    ensureDraftPickOwnershipForSeason(s);
    const generatedDraftClass = generateDraftClass(s.rng.fork(), s.season);
    ensureDraftMetadataForSession(s, generatedDraftClass);
    s.draftClass = createDraftSessionState(generatedDraftClass, s.seasonState, s.draftState);
  }

  const session = ensureDraftSession(s);
  if (!session || session.status === 'complete') {
    return;
  }

  simulateRemainingDraftSession(s);
  autoResolveAIDraftSignings(s);
}

function applyOffseasonTransition(
  s: FullGameState,
  previousState: OffseasonState,
  nextState: OffseasonState,
): OffseasonProgressResult {
  const aiSignings = finalizeFreeAgencyIfNeeded(s, previousState.currentPhase, nextState.currentPhase);
  finalizeDraftIfNeeded(s, previousState.currentPhase, nextState.currentPhase);
  s.offseasonState = {
    ...nextState,
    phaseResults: s.offseasonState?.phaseResults ?? previousState.phaseResults,
  };
  updateOffseasonClock(s);
  const currentProgress = processCurrentOffseasonPhase(s, previousState.currentPhase, previousState.phaseDay);
  return {
    aiSignings: [...aiSignings, ...currentProgress.aiSignings],
  };
}

/** Handle one offseason day with AI auto-resolution. */
export function advanceOffseasonOnce(s: FullGameState): OffseasonProgressResult {
  ensureOffseasonState(s);
  if (!s.offseasonState || s.offseasonState.completed) return { aiSignings: [] };

  const previousState = s.offseasonState;
  const nextState = advanceOffseasonDay(previousState);
  return applyOffseasonTransition(s, previousState, nextState);
}

export function skipOffseasonPhaseWithAI(s: FullGameState): OffseasonProgressResult {
  ensureOffseasonState(s);
  if (!s.offseasonState || s.offseasonState.completed) return { aiSignings: [] };

  const previousState = s.offseasonState;
  const nextState = skipCurrentPhase(previousState);
  return applyOffseasonTransition(s, previousState, nextState);
}

export function toggleUserRule5Protection(
  s: FullGameState,
  playerId: string,
): { success: boolean; error?: string } {
  ensureRule5SessionForCurrentPhase(s);
  if (!s.offseasonState || s.offseasonState.currentPhase !== 'protection_audit' || !s.rule5Session) {
    return { success: false, error: 'Protection audit is not active.' };
  }

  const result = toggleRule5ProtectionCore(s.rule5Session, s.userTeamId, playerId);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  s.rule5Session = result.session;
  syncRule5ProtectionToRosterState(s, s.userTeamId, s.rule5Session.protectedPlayerIdsByTeam[s.userTeamId] ?? []);
  return { success: true };
}

export function lockUserRule5Protection(
  s: FullGameState,
): { success: boolean; error?: string } {
  ensureRule5SessionForCurrentPhase(s);
  if (!s.offseasonState || !s.rule5Session) {
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
  ensureRule5SessionForCurrentPhase(s);
  if (!s.rule5Session || s.rule5Session.phase !== 'rule5_draft') {
    return { success: false, error: 'Rule 5 draft is not active.' };
  }

  const result = makeRule5SelectionCore(s.rule5Session, s.userTeamId, playerId);
  if (!result.success) {
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
  ensureRule5SessionForCurrentPhase(s);
  if (!s.rule5Session || s.rule5Session.phase !== 'rule5_draft') {
    return { success: false, error: 'Rule 5 draft is not active.' };
  }

  const result = passRule5DraftTurnCore(s.rule5Session, s.userTeamId);
  if (!result.success) {
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
): { success: true } | { success: false; error: string } {
  const obligation = s.rule5Obligations.find((entry) => entry.playerId === playerId && entry.status === 'active');
  if (!obligation) {
    return { success: true };
  }

  return requestRule5OfferBack(s, playerId);
}
