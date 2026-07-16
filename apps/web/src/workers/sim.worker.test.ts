// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseGameSnapshot, type AwardHistoryEntry, type GameSnapshot } from '@mbd/contracts';
import {
  buildRosterState,
  createDefaultDraftPickOwnership,
  createFreeAgencyMarket,
  createOffseasonState,
  evaluatePlayerTradeValue,
  MAX_CONTRACT_YEARS,
  OFFSEASON_PHASES,
  type GameBoxScore,
  type GeneratedPlayer,
  type OffseasonPhase,
  type PAOutcome,
  type PAResult,
  type PlayerGameStats,
  materializeSimulationImportDefaults,
  TEAMS,
} from '@mbd/sim-core';

vi.mock('comlink', () => ({
  expose: () => {},
}));

vi.mock('../shared/lib/saveSystem.js', () => ({
  listBranches: vi.fn(),
  loadGameById: vi.fn(),
  saveGameById: vi.fn(),
}));

import { api } from './sim.worker';
import {
  advanceMinorLeagueDay,
  applyNewFreeAgencySignings,
  getAvailableMlbSigningSlots,
  hasCanonicalFreeAgencyMarket,
  prepareQualifyingOfferCompensation,
  processDayInjuriesAndNews,
  requireState,
  setState,
} from './sim.worker.helpers';
import { processTradeMarketActivity } from './sim.worker.trade';
import { refreshTickerFeed } from './sim.worker.ticker';
import {
  applyOffseasonNarrativeHooks,
  applyRegularSeasonPositionGroupMoments,
  applyRegularSeasonPlayerMicroArcMoments,
  applyRegularSeasonTeamDynastyMarkers,
  applySeasonEndPlayerMicroArcMoments,
  applySeasonEndTeamDynastyMarkers,
  applySeasonEndPlayerArcMoments,
  applyWeeklyMomentsForCompletedRange,
  getWeeklyMomentCheckpointDays,
} from './sim.worker.narrativeFarm';
import {
  listBranches,
  loadGameById,
  saveGameById,
} from '../shared/lib/saveSystem.js';
import v17SnapshotFixture from '../../../../packages/contracts/tests/fixtures/save/v17/core.json';
import v34SnapshotFixture from '../../../../packages/contracts/tests/fixtures/save/v34/core.json';

const mockedListBranches = vi.mocked(listBranches);
const mockedLoadGameById = vi.mocked(loadGameById);
const mockedSaveGameById = vi.mocked(saveGameById);

function startGame(seed: number, userTeamId: string = 'nym') {
  return api.newGame({
    seed,
    userTeamId,
    gmName: 'General Manager',
    difficulty: 'standard',
    saveSlot: 1,
  });
}

function startGameWithOptions(
  options: Partial<{
    seed: number;
    userTeamId: string;
    gmName: string;
    difficulty: 'easy' | 'standard' | 'hard';
    saveSlot: number;
    playMode: 'standard' | 'career' | 'scenario';
  }> = {},
) {
  return api.newGame({
    seed: options.seed ?? 123,
    userTeamId: options.userTeamId ?? 'nym',
    gmName: options.gmName ?? 'General Manager',
    difficulty: options.difficulty ?? 'standard',
    saveSlot: options.saveSlot ?? 1,
    ...(options.playMode ? { playMode: options.playMode } : {}),
  });
}

interface WorkerPlayerView {
  id: string;
  teamId: string;
  rosterStatus: string;
  serviceTimeDays: number;
}

interface PromotionCandidateView {
  playerId: string;
  playerName: string;
  score: number;
}

interface RosterComplianceIssueView {
  code: string;
  severity: 'error' | 'warning';
  message: string;
}

interface DFACandidateView {
  playerId: string;
  playerName: string;
  score: number;
}

interface AffiliateOverviewView {
  affiliates: Array<{
    teamId: string;
    level: string;
    label: string;
    shortName?: string;
    identityNote?: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
  }>;
  recentBoxScores: Array<{
    id: string;
    teamId: string;
    level: string;
    label: string;
    shortName?: string;
    summary: string;
  }>;
  waiverClaims: Array<{
    playerId: string;
    status: string;
  }>;
  farmReport?: {
    bondedProspects: number;
    activeSetbackCount: number;
    topProspects: Array<{
      playerId: string;
      bondStrength: number;
      latestLineSummary: string | null;
      activeSetback: {
        type: string;
        summary: string;
      } | null;
    }>;
  };
}

interface AffiliateBoxScoreView {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeShortName?: string;
  awayShortName?: string;
  summary: string;
}

interface ProspectPipelineView {
  health: {
    score: number;
    label: string;
    readyNow: number;
    nextWave: number;
    longTerm: number;
  };
  developmentFocus: {
    priorities: Array<{
      playerId: string;
      category: string;
      label: string;
      action: string;
      reason: string;
      evidence: string[];
    }>;
  };
  prospects: Array<{
    playerId: string;
    playerName: string;
    eta: string;
    trend: string;
    role?: string;
    scoutingNote?: string;
  }>;
}

interface RecentGameRecapView {
  gameIndex: number;
  recap: string;
  highlights: Array<{
    type: string;
    text: string;
  }>;
  playByPlay: Array<{
    inning: number;
    halfInning: 'top' | 'bottom';
    text: string;
    isHighlight: boolean;
  }>;
  boxScore: {
    homeTeamId: string;
    awayTeamId: string;
    innings: number;
  };
}

interface GamePlayByPlayView {
  recap: string;
  highlights: Array<{
    type: string;
    text: string;
  }>;
  plays: Array<{
    inning: number;
    halfInning: 'top' | 'bottom';
    text: string;
    isHighlight: boolean;
  }>;
  boxScore: {
    homeTeamId: string;
    awayTeamId: string;
    innings: number;
  };
}

interface SeasonRecapView {
  season: number;
  recap: string;
  storylines: string[];
}

interface OffseasonHeadlineView {
  season: number;
  headline: string;
}

interface OffseasonCommandCenterView {
  checklist: Array<{
    id: string;
    label: string;
    status: 'complete' | 'attention' | 'blocked' | 'upcoming';
    detail: string;
  }>;
  warnings: Array<{
    id: string;
    severity: 'warning' | 'danger';
    title: string;
    detail: string;
  }>;
  projectedOpeningDay: {
    activeRosterCount: number;
    activeRosterLimit: number;
    fortyManCount: number;
    fortyManLimit: number;
    payroll: number;
    budget: number;
    payrollSpace: number;
    rosterHoleCount: number;
  };
}

interface OffseasonMarketDaySummaryView {
  id: string;
  day: number;
  category: 'signing' | 'trade';
  tone: 'user' | 'division_rival' | 'neutral';
  headline: string;
  detail: string;
  teamIds: string[];
  playerIds: string[];
  valueLabel?: string;
}

interface DraftCommentaryView {
  heartbeat: string | null;
  entries: Array<{
    id: string;
    headline: string;
    detail: string;
  }>;
  buzz: Array<{
    id: string;
    label: string;
    summary: string;
  }>;
}

interface DraftProspectReactionView {
  playerId: string;
  headline: string;
  summary: string;
  recommendation: 'sprint' | 'hover' | 'pass';
}

interface DraftPostDraftGradesView {
  userTeamId: string;
  userTeamGrade: {
    teamId: string;
    grade: string;
    summary: string;
  } | null;
  grades: Array<{
    teamId: string;
    teamName: string;
    grade: string;
  }>;
}

interface TestExtensionOffer {
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
  deferredMoney: Array<{ yearOffset: number; amount: number }>;
}

interface MinorLeagueWorkerApi {
  getSetupPreview: (options: {
    seed: number;
    userTeamId: string;
    difficulty: 'easy' | 'standard' | 'hard';
  }) => {
    teamId: string;
    teamName: string;
    division: string;
    payrollTier: string;
    farmSystemRating: string;
    projectedRecord: string;
    topPlayers: Array<{
      playerId: string;
      name: string;
      position: string;
      overall: number;
    }>;
    divisionRivals: Array<{
      teamId: string;
      teamName: string;
    }>;
  };
  getPromotionCandidates: (teamId?: string) => PromotionCandidateView[];
  getRosterComplianceIssues: (teamId?: string) => {
    issues: RosterComplianceIssueView[];
    dfaRecommendations: DFACandidateView[];
  };
  getAffiliateOverview: (teamId?: string) => AffiliateOverviewView;
  getAffiliateBoxScore: (boxScoreId: string) => AffiliateBoxScoreView | null;
  applyDevelopmentFocusPlan: (
    playerId: string,
    category: ProspectPipelineView['developmentFocus']['priorities'][number]['category'],
  ) => { success: boolean; developmentProgram?: string; error?: string };
  getCoachingStaff: (teamId?: string) => Array<{ id: string; role: string; specialty: string }>;
  getCoachFreeAgents: () => Array<{ id: string; role: string }>;
  getCoachMarket: () => Array<{ id: string; role: string }>;
  getDevelopmentReport: (playerId: string) => {
    playerId: string;
    history: Array<{ month: number; trajectory: string }>;
  } | null;
  getDevelopmentReports: (playerId: string) => {
    playerId: string;
    history: Array<{ month: number; trajectory: string }>;
    minorLeagueProgression: Array<{ level: string; hr: number; avg: number }>;
    prospectBond: { bondStrength: number; currentLevel: string } | null;
    activeSetback: { type: string; summary: string } | null;
  } | null;
  getPlayerProfileView: (playerId: string) => {
    player: { id: string; teamId: string; historical?: boolean } | null;
    personalityProfile: { playerId: string } | null;
    developmentReports: { playerId: string } | null;
    careerStats: { playerId: string } | null;
    scoutConflict: { prospectId: string } | null;
    scoutingReport: { overall: number; scoutName: string } | null;
    scoutingHistoryNote: string;
  } | null;
  getExtensionCandidates: (teamId?: string) => Array<{
    playerId: string;
    willingness: number;
  }>;
  getExtensionOffer: (playerId: string, years: number) => TestExtensionOffer | null;
  negotiateExtension: (
    playerId: string,
    offer: TestExtensionOffer,
  ) => {
    status: 'accepted' | 'rejected' | 'countered';
    rounds: Array<{ round: number; status: string }>;
    review?: {
      status: 'accepted' | 'rejected' | 'countered';
      riskLevel: 'low' | 'medium' | 'high';
      offerGapPct: number;
      teamOfferAav: number;
      playerDemandAav: number;
      evidence: string[];
    };
  };
  getQualifyingOfferEligible: (teamId?: string) => Array<{ playerId: string }>;
  getQualifyingOfferSalary: () => number;
  issueQualifyingOffer: (playerId: string) => { success: boolean; error?: string };
  resolveQualifyingOffers: () => {
    resolved: Array<{ playerId: string; status: string }>;
    error?: string;
  };
  hireCoach: (coachId: string) => { success: boolean; error?: string };
  fireCoach: (coachId: string) => { success: boolean; error?: string };
  tradeIFAPoolSpace: (toTeamId: string, amount: number) => { success: boolean; error?: string };
  getMonthlyPulse: () => {
    pendingReport: {
      id: string;
      monthLabel: string;
      teamRecord: string;
      overallRecord: string;
    } | null;
    decisionQueue: Array<{
      id: string;
      urgency: 'red' | 'yellow' | 'blue';
      route: string;
    }>;
  };
  getFrontOfficeState: (teamId?: string) => {
    teamId: string;
    reputation: number;
    draftScore: number;
    tradeScore: number;
    freeAgencyScore: number;
    playoffScore: number;
    summary: string;
  } | null;
  getGMCareer: () => {
    currentTeamId: string;
    reputation: number;
    overallRecord: { wins: number; losses: number };
    careerHistory: Array<{ teamId: string; firedSeason: number | null }>;
  } | null;
  getJobMarket: () => {
    availableJobs: Array<{ teamId: string; attractiveness: number }>;
  } | null;
  applyForJob: (teamId: string) => { success: boolean; teamId?: string; error?: string };
  acknowledgeMonthlyReport: (reportId: string) => { success: boolean };
  dismissDecisionSpotlight: (decisionId: string) => { success: boolean };
  getPerformanceDiagnostics: () => {
    totals: {
      totalSeasons: number;
      snapshotSizeBytes: number;
      liveArchiveSeasons: number;
      archivedSeasons: number;
    };
    queues: {
      newsItems: number;
      briefingItems: number;
      tickerEntries: number;
      staleTickerEntries: number;
      activeWatchers: number;
      resolvedWatchers: number;
      scoutConflicts: number;
    };
    runtime: {
      lastSimDayMs: number | null;
      lastSaveMs: number | null;
      lastLoadMs: number | null;
    };
  };
  archiveOldSeasons: () => Promise<{
    success: boolean;
    archivedCount: number;
    diagnostics: ReturnType<MinorLeagueWorkerApi['getPerformanceDiagnostics']>;
  }>;
  pruneStaleData: () => Promise<{
    success: boolean;
    prunedCount: number;
    diagnostics: ReturnType<MinorLeagueWorkerApi['getPerformanceDiagnostics']>;
  }>;
  getBranches: (parentSaveId: string) => Promise<Array<{
    id: string;
    parentSaveId: string | null;
    isRootSave: boolean;
    branchMeta: {
      description: string;
    } | null;
  }>>;
  compareWithBranch: (parentSaveId: string, branchSaveId: string) => Promise<{
    branchMeta: {
      id: string;
      saveId: string;
      branchedAtSeason: number;
      branchedAtDay: number;
      description: string;
      createdAt: string;
    };
    recordDelta: {
      parent: { wins: number; losses: number; pct: number };
      branch: { wins: number; losses: number; pct: number };
      delta: number;
    };
    standingsDelta: {
      parent: { divisionRank: number; gamesBack: number };
      branch: { divisionRank: number; gamesBack: number };
      delta: number;
    };
    rosterDelta: {
      parent: string[];
      branch: string[];
      added: string[];
      lost: string[];
      delta: number;
    };
    championshipsDelta: { parent: number; branch: number; delta: number };
    tradesDelta: { parent: number; branch: number; delta: number };
  } | null>;
}

function parseProjectedWins(record: string): number {
  const match = /^(\d+)-(\d+)$/.exec(record);
  expect(match).not.toBeNull();
  const wins = Number(match?.[1] ?? 0);
  const losses = Number(match?.[2] ?? 0);
  expect(wins + losses).toBe(162);
  return wins;
}

function createPlayerStats(overrides: Partial<PlayerGameStats>): PlayerGameStats {
  return {
    playerId: 'player',
    teamId: 'nym',
    gamesPlayed: 0,
    pa: 0,
    ab: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    bb: 0,
    k: 0,
    runs: 0,
    hbp: 0,
    sacFlies: 0,
    ip: 0,
    earnedRuns: 0,
    strikeouts: 0,
    walks: 0,
    hitsAllowed: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    flyBallsAllowed: 0,
    wins: 0,
    saves: 0,
    losses: 0,
    gamesMissedToInjury: 0,
    ...overrides,
  };
}

function microArcPa(outcome: PAOutcome, batterId: string, pitcherId: string): PAResult {
  return {
    outcome,
    batterId,
    pitcherId,
    inning: 1,
    halfInning: 'top',
    outs: 0,
    runnersOn: 0,
    scoreBefore: [0, 0],
    scoreAfter: [0, outcome === 'HR' ? 1 : 0],
    rbiOnPlay: outcome === 'HR' ? 1 : 0,
    isWalkOff: false,
  };
}

function microArcBoxScore(day: number, paResults: PAResult[]): GameBoxScore {
  return {
    homeTeamId: 'nym',
    awayTeamId: 'bos',
    homeScore: 7,
    awayScore: 3,
    innings: 9,
    homeHits: 12,
    awayHits: 7,
    paResults,
    date: `S1D${day}`,
    isPlayoff: false,
  };
}

function weeklyTeamBoxScore(day: number): GameBoxScore {
  return {
    homeTeamId: 'nym',
    awayTeamId: 'bos',
    homeScore: 7,
    awayScore: 3,
    innings: 9,
    homeHits: 12,
    awayHits: 7,
    paResults: [],
    date: `S1D${day}`,
    isPlayoff: false,
  };
}

function setHitterProfile(
  player: GeneratedPlayer,
  position: GeneratedPlayer['position'],
  rating: number,
  age: number,
  annualSalary: number,
) {
  if (player.pitcherAttributes) {
    throw new Error(`Expected hitter for ${player.id}`);
  }

  player.position = position;
  player.age = age;
  player.contract.noTradeClause = false;
  player.contract.annualSalary = annualSalary;
  player.hitterAttributes = {
    contact: rating,
    power: rating,
    eye: rating,
    speed: Math.max(80, rating - 40),
    defense: Math.max(80, rating - 30),
    durability: Math.max(80, rating - 20),
  };
}

function setCanonicalMlbCount(teamId: string, count: number) {
  const state = requireState();
  const teamPlayers = state.players.filter((player) => player.teamId === teamId);
  const active = teamPlayers.filter((player) => player.rosterStatus === 'MLB');
  for (const player of active.slice(count)) {
    player.rosterStatus = 'AAA';
    player.minorLeagueLevel = 'AAA';
  }
  const current = teamPlayers.filter((player) => player.rosterStatus === 'MLB');
  for (const player of teamPlayers.filter((candidate) => candidate.rosterStatus !== 'MLB').slice(0, Math.max(0, count - current.length))) {
    player.rosterStatus = 'MLB';
    player.minorLeagueLevel = null;
  }
  state.rosterStates.set(teamId, buildRosterState(teamId, state.players));
}

function configureSingleFreeAgent(player: GeneratedPlayer) {
  const state = requireState();
  player.contract = { ...player.contract, years: 0, teamOption: false };
  // Capture under the source market predicate while this is still an MLB
  // expiry, then model the released canonical entrant used by Goal 11.
  state.freeAgencyMarket = createFreeAgencyMarket(state.season, [player]);
  player.teamId = '';
  player.rosterStatus = 'INTERNATIONAL';
  player.minorLeagueLevel = 'INTERNATIONAL';
  state.freeAgencyMarket.day = 54;
  state.freeAgencyMarket.freeAgents[0]!.demandLevel = 'low';
  state.phase = 'offseason';
  state.offseasonState = {
    ...createOffseasonState(state.season),
    currentPhase: 'free_agency',
    phaseDay: 1,
    totalDay: 21,
  };
}

function addRejectedQualifyingOffer(
  player: GeneratedPlayer,
  formerTeamId: string,
  amount: number = 20,
) {
  const state = requireState();
  if (!state.offseasonState) throw new Error('Offseason state is required for a qualifying-offer fixture.');
  state.offseasonState = {
    ...state.offseasonState,
    phaseResults: {
      ...state.offseasonState.phaseResults,
      qualifyingOfferSalary: state.offseasonState.phaseResults.qualifyingOfferSalary ?? amount,
      qualifyingOffers: [
        ...state.offseasonState.phaseResults.qualifyingOffers,
        {
          playerId: player.id,
          teamId: formerTeamId,
          amount,
          status: 'offered',
          signingTeamId: null,
          compensationPickId: null,
          compensationTier: null,
          forfeitedPick: null,
        },
        {
          playerId: player.id,
          teamId: formerTeamId,
          amount,
          status: 'rejected',
          signingTeamId: null,
          compensationPickId: null,
          compensationTier: null,
          forfeitedPick: null,
        },
      ],
    },
  };
  state.draftState = {
    ...state.draftState,
    qualifyingOffers: [
      ...state.draftState.qualifyingOffers,
      {
        playerId: player.id,
        teamId: formerTeamId,
        season: state.season,
        marketValue: 30,
        amount,
        status: 'rejected',
        signingTeamId: null,
        compensationPickId: null,
      },
    ],
  };
}

function buildIncomingOffer(offerId: string) {
  const state = requireState();
  const requested = state.players.find(
    (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
  )!;
  const offered = state.players.find(
    (player) => player.teamId === 'bos' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
  )!;

  requested.contract.noTradeClause = false;
  offered.contract.noTradeClause = false;

  return {
    requested,
    offered,
    offer: {
      id: offerId,
      fromTeamId: 'bos',
      toTeamId: 'nym',
      offeringAssets: [{ type: 'player' as const, playerId: offered.id }],
      requestingAssets: [{ type: 'player' as const, playerId: requested.id }],
      fairnessScore: -4,
      message: 'Boston wants to discuss a one-for-one swap.',
      createdAt: 'S1D60',
    },
  };
}

function configureMonthlyTradeScenario() {
  const state = requireState();
  const userBatters = state.players.filter(
    (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
  );
  const partnerBatters = state.players.filter(
    (player) => player.teamId === 'bos' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
  );

  const target = userBatters[0]!;
  const weakShortstop = partnerBatters[0]!;
  const sweetenerOne = partnerBatters[1]!;
  const sweetenerTwo = partnerBatters[2]!;

  for (const player of state.players) {
    if (player.pitcherAttributes != null) continue;
    if (player.id !== target.id && player.position === 'SS') {
      player.position = '2B';
    }
  }

  setHitterProfile(target, 'SS', 520, 26, 4);
  setHitterProfile(weakShortstop, 'SS', 120, 28, 8);
  setHitterProfile(sweetenerOne, '1B', 420, 29, 3);
  setHitterProfile(sweetenerTwo, 'LF', 410, 30, 2);
  state.gmPersonalities.set('bos', 'aggressive');

  return { target };
}

describe('sim worker narrative APIs', () => {
  beforeEach(() => {
    mockedListBranches.mockReset();
    mockedLoadGameById.mockReset();
  });

  afterEach(() => {
    setState(null);
  });

  it('hydrates briefing, chemistry, and owner state for a new game', () => {
    startGame(123, 'nym');

    const chemistry = api.getTeamChemistry('nym');
    const owner = api.getOwnerState('nym');
    const frontOffice = (api as typeof api & MinorLeagueWorkerApi).getFrontOfficeState('nym');
    const briefing = api.getBriefing(10);

    expect(chemistry?.teamId).toBe('nym');
    expect(chemistry?.score).toBeGreaterThanOrEqual(0);
    expect(owner?.teamId).toBe('nym');
    expect(typeof owner?.summary).toBe('string');
    expect(frontOffice?.teamId).toBe('nym');
    expect(briefing.length).toBeGreaterThan(0);
  });

  it('surfaces rivalry intel through dashboard and history queries', () => {
    startGame(1234, 'nym');
    const state = requireState();
    state.rivalries.set('bos:nym', {
      id: 'bos:nym',
      teamA: 'nym',
      teamB: 'bos',
      intensity: 86,
      summary: 'Every series is carrying real postseason weight.',
      reasons: ['historic feud', 'recent playoffs'],
      origin: 'historical',
      active: true,
      currentSeasonWinsA: 8,
      currentSeasonWinsB: 5,
      historicalWinsA: 144,
      historicalWinsB: 132,
      lastMetSeason: state.season,
      closeRaceStreak: 3,
      playoffSeriesStreak: 1,
      lastTradeSeason: 0,
      lastDefectionSeason: 0,
      eventHistory: [],
    });

    const summary = api.getDashboardSummary();
    const rivalries = api.getRivalries('nym');

    expect(summary?.intel.rivalries[0]).toMatchObject({
      id: 'bos:nym',
      opponentTeamId: 'bos',
      intensity: 86,
      currentSeasonRecord: 'NYT 8-5 BOS',
      historicalRecord: 'NYT 144-132 BOS',
    });
    expect(rivalries[0]).toMatchObject({
      id: 'bos:nym',
      origin: 'historical',
      currentSeasonWinsA: 8,
      currentSeasonWinsB: 5,
      historicalWinsA: 144,
      historicalWinsB: 132,
    });
  });

  it('surfaces active storylines on the dashboard and player query', () => {
    startGame(4321, 'nym');
    const state = requireState();
    const userPlayer = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB');
    const rivalPlayer = state.players.find((player) => player.teamId === 'bos' && player.rosterStatus === 'MLB');
    const prospect = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus !== 'MLB');
    if (!userPlayer || !rivalPlayer || !prospect) {
      throw new Error('Expected baseline players for story arc query test.');
    }

    state.playerStoryArcs = [
      {
        playerId: rivalPlayer.id,
        arcType: 'trade_saga',
        startSeason: state.season,
        startDay: 80,
        phase: 'setup',
        milestones: ['Trade saga setup milestone.'],
        resolvedSeason: null,
      },
      {
        playerId: userPlayer.id,
        arcType: 'dynasty_cornerstone',
        startSeason: state.season,
        startDay: 70,
        phase: 'climax',
        milestones: ['Dynasty cornerstone climax milestone.'],
        resolvedSeason: null,
      },
      {
        playerId: prospect.id,
        arcType: 'prospect_rise',
        startSeason: state.season,
        startDay: 82,
        phase: 'rising',
        milestones: ['Prospect rise momentum milestone.'],
        resolvedSeason: null,
      },
      {
        playerId: userPlayer.id,
        arcType: 'breakout_campaign',
        startSeason: state.season - 1,
        startDay: 40,
        phase: 'resolution',
        milestones: ['Breakout campaign resolved milestone.'],
        resolvedSeason: state.season - 1,
      },
    ];

    const summary = api.getDashboardSummary();
    const player = api.getPlayer(userPlayer.id) as unknown as {
      activeStory: { arcType: string; phase: string; latestMilestone: string | null } | null;
      storyHistory: Array<{ arcType: string; resolvedSeason: number | null }>;
    };

    expect(summary?.storylinesToWatch).toHaveLength(3);
    expect(summary?.storylinesToWatch[0]).toMatchObject({
      playerId: userPlayer.id,
      arcType: 'dynasty_cornerstone',
      phase: 'climax',
    });
    expect(player.activeStory).toMatchObject({
      arcType: 'dynasty_cornerstone',
      phase: 'climax',
      latestMilestone: 'Dynasty cornerstone climax milestone.',
    });
    expect(player.storyHistory[0]).toMatchObject({
      arcType: 'breakout_campaign',
      resolvedSeason: state.season - 1,
    });
  });

  it('surfaces nicknames, signature moments, story arcs, and milestone alerts through player queries', () => {
    startGame(4455, 'nym');
    const state = requireState();
    const player = state.players.find((candidate) =>
      candidate.teamId === 'nym'
      && candidate.rosterStatus === 'MLB'
      && candidate.pitcherAttributes == null);
    if (!player) {
      throw new Error('Expected a user-team MLB hitter for profile query wiring test.');
    }

    state.careerStats.push({
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      seasonsPlayed: 9,
      teamIds: ['nym'],
      peakOverall: player.overallRating,
      championshipRings: 1,
      allStarSelections: 3,
      gamesPlayed: 1180,
      saves: 0,
      war: 39.4,
      batting: {
        hits: 2986,
        hr: 244,
        rbi: 1211,
      },
      pitching: null,
    });
    state.playerNicknames.set(player.id, {
      seasonHistory: [],
      earnedNicknames: [{
        id: 'the_kid',
        displayText: 'The Kid',
        priority: 2,
        triggerData: {},
      }],
      primaryNickname: {
        id: 'the_kid',
        displayText: 'The Kid',
        priority: 2,
        triggerData: {},
      },
      badgeNicknames: [{
        id: 'the_kid',
        displayText: 'The Kid',
        priority: 2,
        triggerData: {},
      }],
    });
    state.playerMoments.set(player.id, [{
      season: state.season,
      day: 1,
      timestamp: `S${state.season}D1`,
      type: 'walk_off_hr',
      description: `${player.firstName} ${player.lastName} delivered a walk-off blast.`,
      impact: 12,
      relevance: 0.96,
      isPlayoff: false,
      isEliminationGame: false,
      worldSeriesClincher: false,
      round: null,
    }]);
    state.playerStoryArcs = [{
      playerId: player.id,
      arcType: 'breakout_campaign',
      startSeason: state.season,
      startDay: 1,
      phase: 'rising',
      milestones: ['Breakout campaign momentum is building.'],
      resolvedSeason: null,
    }];

    const profile = (api as typeof api & {
      getPlayerProfileView: (playerId: string) => {
        nicknames: { primaryNickname: { displayText: string } | null } | null;
        moments: Array<{ type: string }>;
        storyArcs: Array<{ arcType: string }>;
        milestoneAlerts: Array<{ remaining: number; threshold: number }>;
      } | null;
      getRecentLeagueMoments: (sinceDay: number) => Array<{
        playerId: string;
        moment: { type: string };
      }>;
    }).getPlayerProfileView(player.id);
    const searchResults = api.searchPlayers('kid', 10);
    const recentMoments = (api as typeof api & {
      getRecentLeagueMoments: (sinceDay: number) => Array<{
        playerId: string;
        moment: { type: string };
      }>;
    }).getRecentLeagueMoments(1);

    expect(profile?.nicknames?.primaryNickname?.displayText).toBe('The Kid');
    expect(profile?.moments[0]).toMatchObject({ type: 'walk_off_hr' });
    expect(profile?.storyArcs[0]).toMatchObject({ arcType: 'breakout_campaign' });
    expect(profile?.milestoneAlerts[0]).toMatchObject({ remaining: 14, threshold: 3000 });
    expect(searchResults.some((entry) => entry.id === player.id)).toBe(true);
    expect(recentMoments[0]).toMatchObject({
      playerId: player.id,
      moment: { type: 'walk_off_hr' },
    });
  });

  it('surfaces GM relationship tiers and tooltip text through worker queries', () => {
    startGame(806, 'nym');
    const state = requireState();

    state.gmRelationships.set('bos', {
      targetTeamId: 'bos',
      score: 36,
      tradeHistory: [{
        season: state.season,
        surplusValue: 8,
        permanentMemory: false,
        description: 'a trade both sides could justify',
      }],
      lastInteractionSeason: state.season,
    });

    const relationships = (api as typeof api & {
      getRelationships: () => Array<{
        teamId: string;
        tier: string;
        tooltip: string;
      }>;
      getRelationshipWith: (teamId: string) => {
        teamId: string;
        tier: string;
        latestMemoryDescription: string | null;
      };
    }).getRelationships();
    const relationship = (api as typeof api & {
      getRelationshipWith: (teamId: string) => {
        teamId: string;
        tier: string;
        latestMemoryDescription: string | null;
      };
    }).getRelationshipWith('bos');

    expect(relationships.find((entry) => entry.teamId === 'bos')).toMatchObject({
      teamId: 'bos',
      tier: 'friendly',
    });
    expect(relationships.find((entry) => entry.teamId === 'bos')?.tooltip).toContain('Current relationship is friendly');
    expect(relationship).toMatchObject({
      teamId: 'bos',
      tier: 'friendly',
      latestMemoryDescription: 'a trade both sides could justify',
    });
  });

  it('opens and resolves a persisted trade negotiation session', () => {
    startGame(1806, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 75;
    state.gmPersonalities.set('bos', 'aggressive');
    const userPlayers = state.players
      .filter((player) => player.teamId === state.userTeamId && player.rosterStatus === 'MLB')
      .sort((left, right) =>
        evaluatePlayerTradeValue(right).overall - evaluatePlayerTradeValue(left).overall
        || left.id.localeCompare(right.id),
      );
    const counterpartPlayers = state.players
      .filter((player) => player.teamId === 'bos' && player.rosterStatus === 'MLB')
      .sort((left, right) =>
        evaluatePlayerTradeValue(right).overall - evaluatePlayerTradeValue(left).overall
        || left.id.localeCompare(right.id),
      );

    const viablePair = userPlayers.flatMap((offered) =>
      counterpartPlayers.map((requested) => {
        const offerValue = evaluatePlayerTradeValue(offered).overall;
        const requestValue = evaluatePlayerTradeValue(requested).overall;
        return {
          offered,
          requested,
          ratio: offerValue / Math.max(1, requestValue),
        };
      }),
    ).find((candidate) => candidate.ratio >= 0.62 && candidate.ratio < 0.88);

    expect(viablePair).toBeTruthy();

    const startResult = (api as typeof api & {
      startNegotiation: (
        offeringAssets: Array<{ type: 'player'; playerId: string }>,
        requestingAssets: Array<{ type: 'player'; playerId: string }>,
        toTeamId: string,
      ) => {
        decision: string;
        review: {
          fairnessScore: number | null;
          rosterValid: boolean;
          rosterIssues: string[];
          narrative: string;
        };
        negotiation: {
          id: string;
          gmPersonality: string;
          personalityLabel: string;
          negotiationPosture: string;
          counterOfferSummary: string | null;
        } | null;
      };
      resolveNegotiation: (negotiationId: string, action: 'accept' | 'reject') => {
        success: boolean;
        decision: string;
        tradeExecuted: boolean;
        review: {
          fairnessScore: number | null;
          rosterValid: boolean;
          rosterIssues: string[];
          narrative: string;
        };
      };
    }).startNegotiation(
      [{ type: 'player', playerId: viablePair!.offered.id }],
      [{ type: 'player', playerId: viablePair!.requested.id }],
      'bos',
    );

    expect(startResult.negotiation).not.toBeNull();
    expect(startResult.decision).toBe('countered');
    expect(startResult.negotiation).toMatchObject({
      gmPersonality: 'aggressive',
      personalityLabel: 'Aggressive',
    });
    expect(startResult.negotiation?.negotiationPosture).toContain('Aggressive');
    expect(startResult.negotiation?.counterOfferSummary).toContain('Aggressive');
    const startReview = startResult.review;
    expect(startReview).not.toBeNull();
    expect(startReview!).toMatchObject({
      rosterValid: true,
      rosterIssues: [],
    });
    expect(startReview!.fairnessScore).toEqual(expect.any(Number));
    expect(startReview!.narrative).toContain('returned a counter');
    expect(requireState().tradeState.negotiations).toHaveLength(1);

    const resolveResult = (api as typeof api & {
      resolveNegotiation: (negotiationId: string, action: 'accept' | 'reject') => {
        success: boolean;
        decision: string;
        tradeExecuted: boolean;
        review: {
          fairnessScore: number | null;
          rosterValid: boolean;
          rosterIssues: string[];
          narrative: string;
        };
      };
    }).resolveNegotiation(startResult.negotiation!.id, 'accept');

    expect(resolveResult).toMatchObject({
      success: true,
      decision: 'accepted',
      tradeExecuted: true,
    });
    const resolveReview = resolveResult.review;
    expect(resolveReview).not.toBeNull();
    expect(resolveReview!).toMatchObject({
      rosterValid: true,
      rosterIssues: [],
    });
    expect(resolveReview!.fairnessScore).toEqual(expect.any(Number));
    expect(resolveReview!.narrative).toContain('accepted');
    expect(requireState().tradeState.negotiations).toHaveLength(0);
    expect(requireState().tradeState.tradeHistory.length).toBeGreaterThan(0);
  });

  it('returns negotiation review evidence for rejected invalid roster packages', () => {
    startGame(1807, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 75;

    const bosPlayer = state.players.find((player) => player.teamId === 'bos' && player.rosterStatus === 'MLB');
    const bosOther = state.players.find((player) =>
      player.teamId === 'bos'
      && player.rosterStatus === 'MLB'
      && player.id !== bosPlayer?.id,
    );

    expect(bosPlayer).toBeTruthy();
    expect(bosOther).toBeTruthy();

    const result = (api as typeof api & {
      startNegotiation: (
        offeringAssets: Array<{ type: 'player'; playerId: string }>,
        requestingAssets: Array<{ type: 'player'; playerId: string }>,
        toTeamId: string,
      ) => {
        success: boolean;
        decision: string;
        tradeExecuted: boolean;
        review: {
          fairnessScore: number | null;
          rosterValid: boolean;
          rosterIssues: string[];
          narrative: string;
        };
      };
    }).startNegotiation(
      [{ type: 'player', playerId: bosPlayer!.id }],
      [{ type: 'player', playerId: bosOther!.id }],
      'bos',
    );

    expect(result).toMatchObject({
      success: false,
      decision: 'rejected',
      tradeExecuted: false,
    });
    const review = result.review;
    expect(review).not.toBeNull();
    expect(review!.rosterValid).toBe(false);
    expect(review!.rosterIssues[0]).toContain('not controlled');
    expect(review!.fairnessScore).toBeNull();
    expect(review!.narrative).toContain('Roster validation blocked');
  });

  it('keeps an immediately rejected player-only negotiation snapshot-exact', () => {
    startGame(1808, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 75;
    state.gmPersonalities.set('bos', 'aggressive');
    const offered = state.players
      .filter((player) => player.teamId === state.userTeamId && player.rosterStatus === 'MLB')
      .sort((left, right) =>
        evaluatePlayerTradeValue(left).overall - evaluatePlayerTradeValue(right).overall
        || left.id.localeCompare(right.id),
      )[0]!;
    const requested = state.players
      .filter((player) => player.teamId === 'bos' && player.rosterStatus === 'MLB')
      .sort((left, right) =>
        evaluatePlayerTradeValue(right).overall - evaluatePlayerTradeValue(left).overall
        || left.id.localeCompare(right.id),
      )[0]!;
    const before = JSON.stringify(api.exportSnapshot());

    const result = api.startNegotiation(
      [{ type: 'player', playerId: offered.id }],
      [{ type: 'player', playerId: requested.id }],
      'bos',
    );

    expect(result).toMatchObject({
      success: false,
      decision: 'rejected',
      tradeExecuted: false,
      flowStateChanged: false,
    });
    expect(JSON.stringify(api.exportSnapshot()) === before).toBe(true);
  });

  it('evaluates and executes a multi-team framework with a persisted conditional clause', () => {
    startGame(1906, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 95;

    const selectPlayer = (teamId: string) =>
      state.players
        .filter((player) => player.teamId === teamId && player.rosterStatus === 'MLB')
        .sort((left, right) =>
          Math.abs(evaluatePlayerTradeValue(left).overall - 70) - Math.abs(evaluatePlayerTradeValue(right).overall - 70)
          || left.id.localeCompare(right.id),
        )[0];

    const userPlayer = selectPlayer('nym');
    const bosPlayer = selectPlayer('bos');
    const seaPlayer = selectPlayer('sea');

    expect(userPlayer).toBeTruthy();
    expect(bosPlayer).toBeTruthy();
    expect(seaPlayer).toBeTruthy();

    const conditionResult = (api as typeof api & {
      generateConditionalClause: (playerId: string) => {
        success: boolean;
        condition: { playerId: string; description: string } | null;
      };
      evaluateMultiTeamFairness: (proposal: {
        teams: Array<{
          teamId: string;
          role: 'initiator' | 'partner' | 'facilitator';
          sendingPlayerIds: string[];
          receivingPlayerIds: string[];
        }>;
        conditions: Array<{ playerId: string; description: string }>;
      }) => { success: boolean; fairness: { fairnessScore: number } | null };
      proposeMultiTeam: (proposal: {
        teams: Array<{
          teamId: string;
          role: 'initiator' | 'partner' | 'facilitator';
          sendingPlayerIds: string[];
          receivingPlayerIds: string[];
        }>;
        conditions: Array<{ playerId: string; description: string }>;
      }) => { accepted: boolean; fairness: { fairnessScore: number } | null };
      executeMultiTeamTrade: (proposal: {
        teams: Array<{
          teamId: string;
          role: 'initiator' | 'partner' | 'facilitator';
          sendingPlayerIds: string[];
          receivingPlayerIds: string[];
        }>;
        conditions: Array<{ playerId: string; description: string }>;
      }) => {
        success: boolean;
        accepted: boolean;
        pendingTrades: Array<{ requiredPlayerId?: string }>;
      };
    }).generateConditionalClause(userPlayer!.id);

    expect(conditionResult.success).toBe(true);
    expect(conditionResult.condition?.playerId).toBe(userPlayer!.id);

    const proposal = {
      teams: [
        {
          teamId: 'nym',
          role: 'initiator' as const,
          sendingPlayerIds: [userPlayer!.id],
          receivingPlayerIds: [seaPlayer!.id],
        },
        {
          teamId: 'bos',
          role: 'partner' as const,
          sendingPlayerIds: [bosPlayer!.id],
          receivingPlayerIds: [userPlayer!.id],
        },
        {
          teamId: 'sea',
          role: 'facilitator' as const,
          sendingPlayerIds: [seaPlayer!.id],
          receivingPlayerIds: [bosPlayer!.id],
        },
      ],
      conditions: [conditionResult.condition!],
    };
    type MultiTeamTestProposal = typeof proposal;

    const fairnessResult = (api as typeof api & {
      evaluateMultiTeamFairness: (proposal: MultiTeamTestProposal) => {
        success: boolean;
        fairness: { fairnessScore: number } | null;
      };
    }).evaluateMultiTeamFairness(proposal);
    expect(fairnessResult.success).toBe(true);
    expect(fairnessResult.fairness?.fairnessScore).toBeGreaterThan(0);

    const proposalResult = (api as typeof api & {
      proposeMultiTeam: (proposal: MultiTeamTestProposal) => {
        accepted: boolean;
        fairness: { fairnessScore: number } | null;
      };
    }).proposeMultiTeam(proposal);
    expect(proposalResult.accepted).toBe(true);
    expect(proposalResult.fairness?.fairnessScore).toBeGreaterThan(0);

    const executionResult = (api as typeof api & {
      executeMultiTeamTrade: (proposal: MultiTeamTestProposal) => {
        success: boolean;
        accepted: boolean;
        pendingTrades: Array<{ requiredPlayerId?: string }>;
      };
    }).executeMultiTeamTrade(proposal);

    expect(executionResult).toMatchObject({
      success: true,
      accepted: true,
    });
    expect(requireState().players.find((player) => player.id === userPlayer!.id)?.teamId).toBe('bos');
    expect(requireState().players.find((player) => player.id === bosPlayer!.id)?.teamId).toBe('sea');
    expect(requireState().players.find((player) => player.id === seaPlayer!.id)?.teamId).toBe('nym');
    expect(executionResult.pendingTrades).toHaveLength(1);
    expect(executionResult.pendingTrades[0]?.requiredPlayerId).toBe(userPlayer!.id);
    expect(requireState().tradeState.multiTeamPendingTrades).toHaveLength(1);
    expect(requireState().tradeState.tradeHistory.length).toBeGreaterThan(0);
  });

  it('accepts object-based new game options and persists franchise identity settings', () => {
    const result = startGameWithOptions({
      seed: 123,
      userTeamId: 'ral',
      gmName: 'Alex Rivera',
      difficulty: 'hard',
      saveSlot: 4,
    });
    const state = requireState();

    expect(result).toMatchObject({
      season: 1,
      day: 1,
      phase: 'preseason',
    });
    expect(state.userTeamId).toBe('ral');
    expect(state.franchise).toMatchObject({
      gmName: 'Alex Rivera',
      difficulty: 'hard',
      teamId: 'ral',
      onboarding: {
        welcomeBriefingSeen: false,
        firstMonthlyPulseSeen: false,
      },
    });
  });

  it('uses round-three dialogue so AGM voices diverge for the same revised onboarding chapter', () => {
    startGameWithOptions({
      seed: 2244,
      userTeamId: 'nym',
      gmName: 'Alex Rivera',
    });

    const marcus = (api as typeof api & {
      getRevisedOnboardingData: (agmId: 'marcus_chen' | 'elena_vargas' | 'walt_kowalski') => {
        script: {
          chapters: Record<'owners_office', {
            intro: Array<{ text: string }>;
          }>;
        };
      };
    }).getRevisedOnboardingData('marcus_chen');
    const elena = (api as typeof api & {
      getRevisedOnboardingData: (agmId: 'marcus_chen' | 'elena_vargas' | 'walt_kowalski') => {
        script: {
          chapters: Record<'owners_office', {
            intro: Array<{ text: string }>;
          }>;
        };
      };
    }).getRevisedOnboardingData('elena_vargas');
    const walt = (api as typeof api & {
      getRevisedOnboardingData: (agmId: 'marcus_chen' | 'elena_vargas' | 'walt_kowalski') => {
        script: {
          chapters: Record<'owners_office', {
            intro: Array<{ text: string }>;
          }>;
        };
      };
    }).getRevisedOnboardingData('walt_kowalski');

    const marcusIntro = marcus.script.chapters.owners_office.intro.map((line) => line.text).join(' ');
    const elenaIntro = elena.script.chapters.owners_office.intro.map((line) => line.text).join(' ');
    const waltIntro = walt.script.chapters.owners_office.intro.map((line) => line.text).join(' ');

    expect(marcusIntro).toContain("Spending pattern: payroll correlates");
    expect(elenaIntro).toContain('The owner asks family before baseball.');
    expect(waltIntro).toContain("Doesn't know every detail of baseball, knows plenty about winning.");
    expect(new Set([marcusIntro, elenaIntro, waltIntro]).size).toBe(3);
  });

  it('builds deterministic setup previews from the same seeded options', () => {
    const options = {
      seed: 2124,
      userTeamId: 'por',
      difficulty: 'easy' as const,
    };

    const previewA = (api as typeof api & MinorLeagueWorkerApi).getSetupPreview(options);
    const previewB = (api as typeof api & MinorLeagueWorkerApi).getSetupPreview(options);
    const creation = api.newGame({
      ...options,
      gmName: 'Jamie Porter',
      saveSlot: 2,
    });
    const teamRoster = api.getFullRoster('por');

    expect(previewA).toEqual(previewB);
    expect(previewA.teamId).toBe('por');
    expect(previewA.teamName).toContain('Portland');
    expect(previewA.topPlayers.length).toBeGreaterThan(0);
    expect(teamRoster.mlb.some((player) => player.id === previewA.topPlayers[0]?.playerId)).toBe(true);
    expect(creation.userTeamId).toBe('por');
  });

  it('surfaces a realistic league-wide spread of setup preview records', () => {
    const workerApi = api as typeof api & MinorLeagueWorkerApi;
    const wins = TEAMS.map((team) => parseProjectedWins(workerApi.getSetupPreview({
      seed: 2124,
      userTeamId: team.id,
      difficulty: 'standard',
    }).projectedRecord));

    expect(wins.reduce((sum, value) => sum + value, 0)).toBe(TEAMS.length * 81);
    expect(Math.max(...wins)).toBeGreaterThanOrEqual(94);
    expect(Math.min(...wins)).toBeLessThanOrEqual(70);
    expect(wins.filter((winTotal) => winTotal > 81).length).toBeGreaterThanOrEqual(10);
    expect(wins.filter((winTotal) => winTotal < 81).length).toBeGreaterThanOrEqual(10);
  });

  it('keeps setup preview projections conservative instead of clustering at 97 wins', () => {
    const workerApi = api as typeof api & MinorLeagueWorkerApi;
    const wins = TEAMS.map((team) => parseProjectedWins(workerApi.getSetupPreview({
      seed: 2124,
      userTeamId: team.id,
      difficulty: 'standard',
    }).projectedRecord));

    expect(Math.max(...wins)).toBeLessThanOrEqual(95);
    expect(wins.filter((winTotal) => winTotal >= 95)).toHaveLength(1);
    expect(wins.filter((winTotal) => winTotal >= 90).length).toBeLessThanOrEqual(6);
    expect(wins.filter((winTotal) => winTotal >= 97)).toHaveLength(0);
  });

  it('surfaces a usable league-wide spread of setup preview farm grades', () => {
    const workerApi = api as typeof api & MinorLeagueWorkerApi;
    const farmGrades = TEAMS.map((team) => workerApi.getSetupPreview({
      seed: 2124,
      userTeamId: team.id,
      difficulty: 'standard',
    }).farmSystemRating);
    const uniqueFarmGrades = new Set(farmGrades);

    expect(uniqueFarmGrades.size).toBeGreaterThanOrEqual(4);
    expect(farmGrades.some((grade) => grade.startsWith('A'))).toBe(true);
    expect(farmGrades.some((grade) => grade === 'B' || grade === 'B+')).toBe(true);
    expect(farmGrades.some((grade) => grade === 'C' || grade === 'C+')).toBe(true);
  });

  it('initializes career mode and exposes the GM career ledger', () => {
    startGameWithOptions({
      seed: 919,
      userTeamId: 'nym',
      gmName: 'Alex Rivera',
      playMode: 'career',
    });
    const state = requireState();
    const career = (api as typeof api & MinorLeagueWorkerApi).getGMCareer();

    expect(state.franchise.playMode).toBe('career');
    expect(career).toMatchObject({
      currentTeamId: 'nym',
      reputation: 50,
      overallRecord: { wins: 0, losses: 0 },
    });
    expect(career?.careerHistory).toHaveLength(1);
  });

  it('seeds coaching staffs and a coach free-agent market for a new game', () => {
    startGame(124, 'nym');

    const staff = (api as typeof api & MinorLeagueWorkerApi).getCoachingStaff('nym');
    const pool = (api as typeof api & MinorLeagueWorkerApi).getCoachFreeAgents();
    const market = (api as typeof api & MinorLeagueWorkerApi).getCoachMarket();

    expect(staff).toHaveLength(12);
    expect(pool.length).toBeGreaterThan(0);
    expect(market).toHaveLength(pool.length);
  });

  it('creates monthly development report history when the season advances', () => {
    startGame(125, 'nym');
    api.simMonth();

    const prospect = api.getFullRoster('nym').minors.AA?.[0];
    expect(prospect).toBeTruthy();
    const report = (api as typeof api & MinorLeagueWorkerApi).getDevelopmentReport(prospect!.id);
    const reports = (api as typeof api & MinorLeagueWorkerApi).getDevelopmentReports(prospect!.id);

    expect(report?.playerId).toBe(prospect!.id);
    expect(report?.history.length).toBeGreaterThan(0);
    expect(reports?.history).toEqual(report?.history);
  });

  it('applies active mentor relationships to monthly development checkpoints', () => {
    function runCheckpoint(mentored: boolean) {
      startGame(12501, 'nym');
      const state = requireState();
      const prospect = state.players.find((player) =>
        player.teamId === 'nym'
        && player.rosterStatus === 'AA'
        && player.pitcherAttributes == null,
      )!;
      const veteran = state.players.find((player) =>
        player.teamId === 'nym'
        && player.rosterStatus === 'MLB'
        && player.pitcherAttributes == null,
      )!;

      prospect.developmentProgram = 'mlb_prep';
      prospect.personality.workEthic = 78;
      prospect.personality.mentalToughness = 70;
      state.coachingStaffs.set('nym', [{
        id: 'coach-nym-aa-mentor-test',
        firstName: 'Dale',
        lastName: 'Briggs',
        role: 'aa_coordinator',
        specialty: 'mlb_prep',
        teachingAbility: 0.84,
        developmentBonus: 0.18,
        personalityFit: 0.8,
        experienceYears: 11,
        contractYears: 2,
        annualSalary: 2.1,
        teamId: 'nym',
      }]);
      state.mentorRelationships = mentored
        ? [{
          veteranPlayerId: veteran.id,
          rookiePlayerId: prospect.id,
          teamId: 'nym',
          startedSeason: state.season,
          summary: 'Mentorship quality 100; development bonus 0.15; factors: Same team context.',
        }]
        : [];
      state.phase = 'regular';
      state.day = 31;
      state.seasonState = {
        ...state.seasonState,
        currentDay: 31,
      };

      api.simMonth();
      return requireState().minorLeagueState.developmentLedger.find((entry) =>
        entry.playerId === prospect.id,
      )!;
    }

    const baseline = runCheckpoint(false);
    const mentored = runCheckpoint(true);

    expect(mentored.progressScore).toBeGreaterThan(baseline.progressScore);
    expect(mentored.breakoutProbability).toBeGreaterThan(baseline.breakoutProbability);
    expect(mentored.bustRisk).toBeLessThan(baseline.bustRisk);
  });

  it('exposes development path, bond, and setback data through worker queries', () => {
    startGame(126, 'nym');
    const state = requireState();
    const workerApi = api as typeof api & MinorLeagueWorkerApi;
    const prospect = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'AA')!;
    prospect.overallRating = 74;
    prospect.ceiling = 82;

    state.minorLeagueState.minorLeagueStatHistory = [[prospect.id, [{
      season: state.season,
      level: 'AA',
      gamesPlayed: 44,
      pa: 181,
      hits: 59,
      hr: 11,
      rbi: 37,
      avg: 0.326,
      ip: 0,
      era: 0,
      k: 0,
      bb: 22,
    }]]];
    state.prospectBonds = [{
      prospectId: prospect.id,
      draftedSeason: state.season,
      debutSeason: null,
      currentLevel: 'AA',
      bondStrength: 28,
      milestones: ['Drafted Round 2, 1'],
      loyaltyModifier: 0.28,
    }];
    state.minorLeagueState.activeDevelopmentSetbacks = [{
      playerId: prospect.id,
      type: 'hot_streak',
      overallModifier: 6,
      startSeason: state.season,
      startMonth: 4,
      endSeason: state.season,
      endMonth: 5,
      summary: `${prospect.firstName} ${prospect.lastName} is tearing through Double-A pitching.`,
      active: true,
    }];

    const reports = workerApi.getDevelopmentReports(prospect.id);
    const overview = workerApi.getAffiliateOverview('nym');

    expect(reports?.minorLeagueProgression[0]?.level).toBe('AA');
    expect(reports?.prospectBond?.bondStrength).toBe(28);
    expect(reports?.activeSetback?.type).toBe('hot_streak');
    expect(overview.farmReport?.bondedProspects).toBeGreaterThan(0);
    expect(overview.farmReport?.activeSetbackCount).toBeGreaterThan(0);
    expect((overview.farmReport?.topProspects.length ?? 0)).toBeGreaterThan(0);
  });

  it('surfaces authored affiliate identities and prospect notes from the minor-league content pack', () => {
    startGame(12602, 'nym');
    const state = requireState();
    const workerApi = api as typeof api & MinorLeagueWorkerApi;

    const overview = workerApi.getAffiliateOverview('nym');
    const pipeline = workerApi.getProspectPipeline('nym');
    const aaa = overview.affiliates.find((affiliate) => affiliate.level === 'AAA');
    const ari = pipeline.prospects.find((prospect) => prospect.playerName === 'Ari Abarca');
    const authoredParentPlayer = state.players.find((player) => player.id === 'auth-nym-mlb-001');
    const authoredAri = state.players.find((player) => player.firstName === 'Ari' && player.lastName === 'Abarca');

    expect(state.players).toHaveLength(5408);
    expect(authoredParentPlayer).toMatchObject({
      teamId: 'nym',
      rosterStatus: 'MLB',
      minorLeagueLevel: null,
    });
    expect(authoredAri?.id).toMatch(/^auth-nym-aa-\d{3}$/);
    expect(aaa).toMatchObject({
      teamId: 'nym',
      label: 'Newark Market Makers',
      shortName: 'Market Makers',
      identityNote: expect.stringContaining('Near-ready bats'),
    });
    expect(ari).toMatchObject({
      role: 'Top ranked prospect / potential impact regular',
      scoutingNote: expect.stringContaining('Up-the-middle athlete'),
    });
  });

  it('derives a player development decision brief from plan, risk, coach fit, mentorship, and milestones', () => {
    startGame(12601, 'nym');
    const state = requireState();
    const workerApi = api as typeof api & MinorLeagueWorkerApi;
    const prospect = state.players.find((player) =>
      player.teamId === 'nym'
      && player.rosterStatus === 'AA'
      && player.pitcherAttributes == null,
    )!;
    const veteran = state.players.find((player) =>
      player.teamId === 'nym'
      && player.rosterStatus === 'MLB'
      && player.pitcherAttributes == null,
    )!;

    prospect.developmentProgram = 'mlb_prep';
    prospect.developmentTrajectory = 'below_expectations';
    prospect.overallRating = 320;
    prospect.ceiling = 430;
    prospect.floor = 270;
    prospect.personality.workEthic = 82;
    prospect.personalityTraits = ['Hard Worker'];
    veteran.firstName = 'Elias';
    veteran.lastName = 'Anchor';
    veteran.personalityTraits = ['Leader', 'Mentor'];

    state.coachingStaffs.set('nym', [{
      id: 'coach-nym-aa-dev',
      firstName: 'Mina',
      lastName: 'Torres',
      role: 'aa_coordinator',
      specialty: 'mlb_prep',
      teachingAbility: 0.91,
      developmentBonus: 0.24,
      personalityFit: 0.86,
      experienceYears: 14,
      contractYears: 2,
      annualSalary: 2.4,
      teamId: 'nym',
    }]);
    state.mentorRelationships = [{
      veteranPlayerId: veteran.id,
      rookiePlayerId: prospect.id,
      teamId: 'nym',
      startedSeason: state.season,
      summary: `${veteran.firstName} ${veteran.lastName} is guiding ${prospect.firstName} ${prospect.lastName} through the next checkpoint.`,
    }];
    state.minorLeagueState.developmentReports.push({
      playerId: prospect.id,
      teamId: 'nym',
      season: state.season,
      month: 4,
      trajectory: 'below_expectations',
      summary: `${prospect.firstName} ${prospect.lastName} needs cleaner swing decisions before a promotion.`,
      overallRating: prospect.overallRating,
    });
    state.minorLeagueState.activeDevelopmentSetbacks = [{
      playerId: prospect.id,
      type: 'mental_block',
      overallModifier: -5,
      startSeason: state.season,
      startMonth: 4,
      endSeason: state.season,
      endMonth: 5,
      summary: `${prospect.firstName} ${prospect.lastName} is pressing through a swing-change mental block.`,
      active: true,
    }];
    state.prospectBonds = [{
      prospectId: prospect.id,
      draftedSeason: state.season - 1,
      debutSeason: null,
      currentLevel: 'AA',
      bondStrength: 31,
      milestones: ['Drafted Round 2, 4', 'Earned everyday AA reps, 5'],
      loyaltyModifier: 0.31,
    }];

    const profile = workerApi.getPlayerProfileView(prospect.id);
    const decision = (profile?.developmentReports as {
      developmentDecision?: {
        plan: { label: string; summary: string };
        risk: { level: string; summary: string };
        coachFit: { coachName: string | null; summary: string };
        mentorship: {
          mentorName: string | null;
          partnerName: string | null;
          partnerPlayerId: string | null;
          relationshipRole: 'mentor' | 'protegee' | null;
          summary: string;
        };
        nextMilestone: { label: string; summary: string };
        evidence: string[];
      };
    } | null)?.developmentDecision;

    expect(decision?.plan.label).toBe('Mlb Prep');
    expect(decision?.plan.summary).toContain('below expectations');
    expect(decision?.risk.level).toBe('high');
    expect(decision?.risk.summary).toContain('mental block');
    expect(decision?.coachFit.coachName).toBe('Mina Torres');
    expect(decision?.coachFit.summary).toContain('AA coordinator');
    expect(decision?.mentorship.mentorName).toBe('Elias Anchor');
    expect(decision?.mentorship.partnerName).toBe('Elias Anchor');
    expect(decision?.mentorship.partnerPlayerId).toBe(veteran.id);
    expect(decision?.mentorship.relationshipRole).toBe('protegee');
    expect(decision?.mentorship.summary).toContain('guiding');
    expect(decision?.nextMilestone.label).toBe('Push to AAA');
    expect(decision?.evidence).toContain('Earned everyday AA reps, 5');

    const veteranProfile = workerApi.getPlayerProfileView(veteran.id);
    const veteranDecision = (veteranProfile?.developmentReports as {
      developmentDecision?: {
        mentorship: {
          mentorName: string | null;
          partnerName: string | null;
          partnerPlayerId: string | null;
          relationshipRole: 'mentor' | 'protegee' | null;
          summary: string;
        };
      };
    } | null)?.developmentDecision;
    expect(veteranDecision?.mentorship.mentorName).toBe('Elias Anchor');
    expect(veteranDecision?.mentorship.partnerName).toBe(`${prospect.firstName} ${prospect.lastName}`);
    expect(veteranDecision?.mentorship.partnerPlayerId).toBe(prospect.id);
    expect(veteranDecision?.mentorship.relationshipRole).toBe('mentor');
  });

  it('builds a unified player profile view with career, development, and scout conflict data', () => {
    startGame(1261, 'nym');
    const state = requireState();
    const workerApi = api as typeof api & MinorLeagueWorkerApi;
    const prospect = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'AA')!;

    state.careerStats.push({
      playerId: prospect.id,
      playerName: `${prospect.firstName} ${prospect.lastName}`,
      position: prospect.position,
      seasonsPlayed: 2,
      teamIds: ['nym'],
      peakOverall: 61,
      championshipRings: 0,
      allStarSelections: 0,
      gamesPlayed: 102,
      saves: 0,
      war: 3.4,
      batting: prospect.pitcherAttributes ? null : {
        hits: 111,
        hr: 16,
        rbi: 58,
      },
      pitching: prospect.pitcherAttributes ? {
        wins: 8,
        strikeouts: 118,
        inningsPitched: 132.1,
        earnedRuns: 41,
        shutouts: 0,
      } : null,
    });
    state.scoutConflicts.push({
      prospectId: prospect.id,
      teamId: 'nym',
      prospectType: 'draft',
      createdSeason: state.season,
      resolutionSeason: state.season + 2,
      resolved: false,
      headline: `${prospect.firstName} ${prospect.lastName} split the room.`,
      opinions: [
        {
          source: 'scout_director',
          overallGrade: 62,
          ceiling: 70,
          floor: 54,
          summary: 'Director trusts the bat path.',
          confidence: 13,
        },
        {
          source: 'analytics_head',
          overallGrade: 56,
          ceiling: 64,
          floor: 50,
          summary: 'Models want more proof of contact quality.',
          confidence: 11,
        },
        {
          source: 'manager',
          overallGrade: 59,
          ceiling: 67,
          floor: 53,
          summary: 'Manager likes the makeup but wants more polish.',
          confidence: 12,
        },
      ],
      divergence: 6,
      debateGenerated: true,
      resolution: null,
      winningSource: null,
      outcomeSummary: null,
    });
    state.minorLeagueState.developmentReports.push({
      playerId: prospect.id,
      teamId: 'nym',
      season: state.season,
      month: 4,
      trajectory: 'ahead_of_curve',
      summary: `${prospect.firstName} ${prospect.lastName} tightened the approach this month.`,
      overallRating: prospect.overallRating,
    });
    state.playerOrigins.set(prospect.id, {
      playerId: prospect.id,
      originTeamId: 'nym',
      acquisitionType: 'draft',
      acquiredSeason: state.season,
      draftSeason: state.season,
      draftRound: 1,
      draftPickNumber: 18,
      originalGrade: 63,
      bonusAmount: 3.6,
    });
    state.draftState.signingDecisions.push({
      season: state.season,
      playerId: prospect.id,
      teamId: 'nym',
      signed: true,
      offeredBonus: 3.6,
      agreedBonus: 3.6,
      returnPath: 'organization',
    });
    state.prospectBonds.push({
      prospectId: prospect.id,
      draftedSeason: state.season - 1,
      debutSeason: null,
      currentLevel: 'AA',
      bondStrength: 42,
      milestones: ['Drafted Round 1, 4', 'Promoted to AA, 5'],
      loyaltyModifier: 0.42,
    });
    state.minorLeagueState.minorLeagueStatHistory = [[prospect.id, [{
      season: state.season,
      level: 'AA',
      gamesPlayed: 44,
      pa: 181,
      hits: 59,
      hr: 11,
      rbi: 37,
      avg: 0.326,
      ip: 0,
      era: 0,
      k: 0,
      bb: 22,
    }]]];

    const profile = workerApi.getPlayerProfileView(prospect.id);

    expect(profile?.player?.id).toBe(prospect.id);
    expect(profile?.personalityProfile?.playerId).toBe(prospect.id);
    expect(profile?.developmentReports?.playerId).toBe(prospect.id);
    expect(profile?.developmentReports?.draftOutcome).toMatchObject({
      acquisitionType: 'draft',
      teamId: 'nym',
      season: state.season,
      round: 1,
      pickNumber: 18,
      originalGrade: 63,
      signed: true,
      bonusAmount: 3.6,
      currentStatus: 'AA',
      currentLevel: 'AA',
      bondStrength: 42,
      summary: expect.stringContaining('Round 1'),
    });
    expect(profile?.developmentReports?.draftOutcome?.milestones).toEqual([
      'Drafted Round 1, 4',
      'Promoted to AA, 5',
    ]);
    expect(profile?.careerStats?.playerId).toBe(prospect.id);
    expect(profile?.scoutConflict?.prospectId).toBe(prospect.id);
    expect(profile?.scoutingReport).toBeNull();
    expect(profile?.scoutingHistoryNote).toContain('v15');
  });

  it('returns a deterministic scouting fallback in the player profile view when no conflict exists', () => {
    startGame(1262, 'nym');
    const workerApi = api as typeof api & MinorLeagueWorkerApi;
    const player = requireState().players.find((candidate) => candidate.teamId === 'nym' && candidate.rosterStatus === 'MLB')!;

    const first = workerApi.getPlayerProfileView(player.id);
    const second = workerApi.getPlayerProfileView(player.id);

    expect(first?.scoutConflict).toBeNull();
    expect(first?.scoutingReport).toEqual(second?.scoutingReport);
    expect(first?.scoutingReport?.overall).toBeGreaterThan(0);
    expect(typeof first?.scoutingReport?.scoutName).toBe('string');
  });

  it('advances to calendar month boundaries and creates a pending monthly pulse report', () => {
    startGame(1251, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 31;
    state.seasonState = {
      ...state.seasonState,
      currentDay: 31,
    };

    const result = api.simMonth();
    const monthlyPulse = (api as typeof api & MinorLeagueWorkerApi).getMonthlyPulse();
    expect(monthlyPulse).not.toBeNull();
    if (!monthlyPulse) {
      throw new Error('Expected monthly pulse state after simulating a month.');
    }

    expect(result.day).toBe(62);
    expect(monthlyPulse.pendingReport).toMatchObject({
      monthLabel: 'May',
    });
    expect(monthlyPulse.pendingReport?.teamRecord).toMatch(/^\d+-\d+$/);
    expect(monthlyPulse.pendingReport?.overallRecord).toMatch(/^\d+-\d+$/);
  });

  it('builds red, yellow, and blue monthly spotlight items and supports acknowledgement flow', () => {
    startGame(1252, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 92;
    state.seasonState = {
      ...state.seasonState,
      currentDay: 92,
    };

    const extraMlb = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus !== 'MLB',
    )!;
    const prospect = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus !== 'MLB' && player.id !== extraMlb.id,
    )!;
    extraMlb.rosterStatus = 'MLB';
    extraMlb.minorLeagueLevel = null;
    prospect.rosterStatus = 'AAA';
    prospect.minorLeagueLevel = 'AAA';
    state.rosterStates.set('nym', buildRosterState('nym', state.players));
    state.tradeState.pendingOffers = [buildIncomingOffer('monthly-pulse-offer').offer];
    state.minorLeagueState.affiliateStates = [
      {
        teamId: 'nym',
        level: 'AAA',
        season: state.season,
        gamesPlayed: 48,
        wins: 31,
        losses: 17,
        runsScored: 241,
        runsAllowed: 188,
        playerStats: [[prospect.id, {
          playerId: prospect.id,
          games: 31,
          pa: 132,
          hits: 41,
          hr: 8,
          rbi: 27,
          bb: 16,
          k: 19,
          ipOuts: 0,
          earnedRuns: 0,
          strikeouts: 0,
          walks: 0,
          wins: 0,
          losses: 0,
        }]],
      },
    ];

    api.simMonth();

    const monthlyApi = api as typeof api & MinorLeagueWorkerApi;
    const pulse = monthlyApi.getMonthlyPulse();
    expect(pulse).not.toBeNull();
    if (!pulse) {
      throw new Error('Expected monthly pulse state after simulating a month.');
    }
    const urgencies = pulse.decisionQueue.map((item) => item.urgency);

    expect(urgencies).toEqual(expect.arrayContaining(['red', 'yellow', 'blue']));
    expect(pulse.decisionQueue[0]?.urgency).toBe('red');

    const reportId = pulse.pendingReport?.id;
    expect(reportId).toBeTruthy();
    expect(monthlyApi.acknowledgeMonthlyReport(reportId!)).toEqual({ success: true });
    expect(monthlyApi.getMonthlyPulse()?.pendingReport).toBeNull();

    const firstDecisionId = monthlyApi.getMonthlyPulse()?.decisionQueue[0]?.id;
    expect(firstDecisionId).toBeTruthy();
    expect(monthlyApi.dismissDecisionSpotlight(firstDecisionId!)).toEqual({ success: true });
    expect(monthlyApi.getMonthlyPulse()?.decisionQueue.some((item) => item.id === firstDecisionId)).toBe(false);
  });

  it('adds an owner ultimatum to the monthly spotlight when satisfaction collapses', () => {
    startGame(5151, 'nym');
    const state = requireState();
    const monthlyApi = api as typeof api & MinorLeagueWorkerApi;
    state.phase = 'regular';
    state.day = 31;
    const owner = state.ownerState.get('nym');
    if (!owner) {
      throw new Error('Expected owner state');
    }
    state.ownerState.set('nym', {
      ...owner,
      satisfaction: 24,
      patience: 28,
      confidence: 24,
      hotSeat: true,
      summary: 'Owner demands immediate progress.',
    });

    api.simMonth();

    const ownerSpotlight = monthlyApi.getMonthlyPulse()?.decisionQueue.find((item) => item.id.includes('spotlight-owner'));
    expect(ownerSpotlight).toBeTruthy();
    expect(ownerSpotlight?.urgency).toBe('red');
    expect(ownerSpotlight?.route).toBe('/dashboard');
  });

  it('fires the GM after an ultimatum remains unresolved and blocks gameplay actions', () => {
    startGame(6161, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 120;
    (state.seasonState as typeof state.seasonState & { currentDay: number }).currentDay = 120;
    const standingsRecord = state.seasonState.standings.getRecord('nym');
    if (!standingsRecord) {
      throw new Error('Expected user standings record');
    }
    standingsRecord.wins = 24;
    standingsRecord.losses = 89;
    standingsRecord.streak = -6;
    standingsRecord.last10 = [2, 8];
    state.storyFlags.set('nym', [`owner_meeting_${state.season}`]);
    const owner = state.ownerState.get('nym');
    if (!owner) {
      throw new Error('Expected owner state');
    }
    state.ownerState.set('nym', {
      ...owner,
      satisfaction: 8,
      patience: 12,
      confidence: 10,
      hotSeat: true,
      summary: 'Ownership is ready to make a change.',
    });

    const result = api.simWeek();

    expect(requireState().franchise.status).toBe('fired');
    expect(result.gamesPlayed).toBeGreaterThan(0);
    expect(api.proposeTrade([], [], 'bos').decision).toBe('rejected');
  });

  it('opens a job market instead of ending the save for career-mode dynasties', () => {
    startGameWithOptions({
      seed: 6262,
      userTeamId: 'nym',
      playMode: 'career',
    });
    const state = requireState();
    state.phase = 'regular';
    state.day = 120;
    (state.seasonState as typeof state.seasonState & { currentDay: number }).currentDay = 120;
    const standingsRecord = state.seasonState.standings.getRecord('nym');
    if (!standingsRecord) {
      throw new Error('Expected user standings record');
    }
    standingsRecord.wins = 24;
    standingsRecord.losses = 89;
    standingsRecord.streak = -6;
    standingsRecord.last10 = [2, 8];
    state.storyFlags.set('nym', [`owner_meeting_${state.season}`]);
    const owner = state.ownerState.get('nym');
    if (!owner) {
      throw new Error('Expected owner state');
    }
    state.ownerState.set('nym', {
      ...owner,
      satisfaction: 8,
      patience: 12,
      confidence: 10,
      hotSeat: true,
      summary: 'Ownership is ready to make a change.',
    });

    api.simWeek();

    const career = (api as typeof api & MinorLeagueWorkerApi).getGMCareer();
    const jobMarket = (api as typeof api & MinorLeagueWorkerApi).getJobMarket();

    expect(requireState().franchise.status).toBe('active');
    expect(jobMarket?.availableJobs.length).toBeGreaterThanOrEqual(3);
    expect(career?.careerHistory[0]?.firedSeason).toBe(state.season);

    const selectedTeamId = jobMarket?.availableJobs.find((job) => job.teamId !== 'nym')?.teamId;
    expect(selectedTeamId).toBeTruthy();

    const selectedOwner = state.ownerState.get(selectedTeamId!);
    expect(selectedOwner).toBeTruthy();
    state.ownerState.set(selectedTeamId!, {
      ...selectedOwner!,
      annualBudget: 321.09,
      payrollCap: 295.4,
      expectations: {
        ...selectedOwner!.expectations,
        payrollTarget: 295.4,
      },
    });

    const result = (api as typeof api & MinorLeagueWorkerApi).applyForJob(selectedTeamId!);
    expect(result.success).toBe(true);
    expect(requireState().userTeamId).toBe(selectedTeamId);
    expect(requireState().ownerState.get(selectedTeamId!)).toMatchObject({
      annualBudget: 321.09,
      payrollCap: 295.4,
      expectations: { payrollTarget: 295.4 },
    });
  });

  it('publishes record watch stories after monthly sim when a user player is on pace', () => {
    startGame(1253, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 31;
    state.seasonState = {
      ...state.seasonState,
      currentDay: 31,
    };

    const hitter = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const hrEntry = state.recordBook.find((entry) => entry.id === 'franchise:nym:individual_single_season:hr')!;
    hrEntry.holders = [{
      playerId: 'historic-hr-holder',
      playerName: 'Historic Slugger',
      teamId: 'nym',
      season: 1,
      value: 44,
      displayValue: '44',
    }];
    hrEntry.trackingFromSeason = null;
    state.seasonState.playerSeasonStats.set(hitter.id, createPlayerStats({
      playerId: hitter.id,
      teamId: 'nym',
      gamesPlayed: 31,
      pa: 140,
      ab: 120,
      hits: 48,
      hr: 16,
      rbi: 42,
    }));

    api.simMonth();

    const watches = (api as typeof api & {
      getRecordWatchList: (teamId?: string) => Array<{ playerId: string; recordLabel: string }>;
    }).getRecordWatchList('nym');
    const news = requireState().news;

    expect(watches.some((entry) => entry.playerId === hitter.id && entry.recordLabel === 'Most Home Runs')).toBe(true);
    expect(news.some((item) => item.category === 'record' && item.tag === 'WATCH')).toBe(true);
  });

  it('tracks injured MLB absences and monthly splits during regular-season month sims', () => {
    startGame(1401, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 31;
    state.seasonState = {
      ...state.seasonState,
      currentDay: 31,
    };
    const hitter = state.players
      .filter((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null)
      .sort((left, right) => right.overallRating - left.overallRating)[0]!;

    state.injuries.set(hitter.id, {
      type: 'hamstring_strain',
      severity: 'il_10',
      daysRemaining: 7,
      totalDays: 7,
      attributePenalty: 0,
      reinjuryRisk: 0,
    });

    api.simMonth();
    const updated = requireState();
    const stats = updated.seasonState.playerSeasonStats.get(hitter.id);

    expect(stats?.gamesMissedToInjury ?? 0).toBeGreaterThan(0);
    expect(stats?.gamesPlayed ?? 0).toBe(0);
    expect(updated.seasonState.monthlyRecordSplits.nym).toBeTruthy();
  });

  it('queues a record broken ceremony when the user club passes a tracked mark', () => {
    startGame(1254, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 31;
    state.seasonState = {
      ...state.seasonState,
      currentDay: 31,
    };

    const hitter = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const hrEntry = state.recordBook.find((entry) => entry.id === 'franchise:nym:individual_single_season:hr')!;
    hrEntry.holders = [{
      playerId: 'historic-hr-holder',
      playerName: 'Historic Slugger',
      teamId: 'nym',
      season: 1,
      value: 10,
      displayValue: '10',
    }];
    hrEntry.trackingFromSeason = null;
    state.seasonState.playerSeasonStats.set(hitter.id, createPlayerStats({
      playerId: hitter.id,
      teamId: 'nym',
      gamesPlayed: 31,
      pa: 140,
      ab: 120,
      hits: 48,
      hr: 12,
      rbi: 39,
    }));

    api.simMonth();

    expect(requireState().ceremony.pendingMoments.some((moment) => moment.type === 'record_broken')).toBe(true);
    const recordBook = (api as typeof api & {
      getRecordBook: (teamId?: string) => {
        franchise: Array<{ id: string; holders: Array<{ playerId: string | null; value: number }> }>;
      };
    }).getRecordBook('nym');
    expect(recordBook.franchise.find((entry) => entry.id === 'franchise:nym:individual_single_season:hr')?.holders[0]?.playerId).toBe(hitter.id);
  });

  it('returns historical player data after a retired player leaves the live pool', () => {
    startGame(1255, 'nym');
    const state = requireState();
    const player = state.players.find((candidate) => candidate.teamId === 'nym' && candidate.rosterStatus === 'MLB')!;

    state.historicalPlayers = [{
      playerId: player.id,
      fullName: `${player.firstName} ${player.lastName}`,
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      lastKnownTeamId: player.teamId,
      active: false,
      retiredSeason: state.season,
      seasonsPlayed: 14,
      peakOverall: 71,
      personalityTraits: ['Leader'],
    }];
    state.players = state.players.filter((candidate) => candidate.id !== player.id);

    const historicalPlayer = (api as typeof api & {
      getPlayer: (playerId: string) => {
        historical?: boolean;
        personalityTraits?: string[];
        historicalSummary?: { retiredSeason: number | null };
      } | null;
    }).getPlayer(player.id);

    expect(historicalPlayer?.historical).toBe(true);
    expect(historicalPlayer?.personalityTraits).toContain('Leader');
    expect(historicalPlayer?.historicalSummary?.retiredSeason).toBe(state.season);
  });

  it('routes offseason progression through extensions before qualifying offers', () => {
    startGame(126, 'nym');
    const state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'tender_nontender',
      phaseDay: 5,
      totalDay: 15,
    };

    const enteredExtensions = api.advanceOffseason();
    const enteredQualifyingOffers = api.skipOffseasonPhase();

    expect(enteredExtensions?.currentPhase).toBe('extensions');
    expect(enteredQualifyingOffers?.currentPhase).toBe('qualifying_offers');
  });

  it('keeps extension offer queries pure without erasing an active negotiation', () => {
    startGame(127, 'nym');
    const state = requireState();
    const candidate = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;

    setHitterProfile(candidate, 'SS', 500, 27, 4);
    candidate.contract.years = 1;
    candidate.contract.totalValue = 4;
    candidate.developmentTrajectory = 'on_track';
    state.serviceTime.set(candidate.id, 5);
    candidate.serviceTimeDays = 5 * 172;
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'extensions',
      phaseDay: 1,
      totalDay: 13,
    };

    const extensionApi = api as unknown as MinorLeagueWorkerApi;
    const candidates = extensionApi.getExtensionCandidates('nym');
    const entry = candidates.find((player) => player.playerId === candidate.id);
    const openingOffer = extensionApi.getExtensionOffer(candidate.id, 5);

    expect(entry?.willingness).toBeGreaterThan(0);
    expect(openingOffer?.years).toBe(5);

    const lowballOffer = {
      ...openingOffer!,
      annualSalary: Number((openingOffer!.annualSalary * 0.74).toFixed(2)),
      totalValue: Number((openingOffer!.annualSalary * 0.74 * openingOffer!.years).toFixed(2)),
    };

    const firstResponse = extensionApi.negotiateExtension(candidate.id, lowballOffer);
    const beforeOfferQuery = JSON.stringify(api.exportSnapshot());
    const resetOffer = extensionApi.getExtensionOffer(candidate.id, 5);
    expect(JSON.stringify(api.exportSnapshot())).toBe(beforeOfferQuery);
    const secondResponse = extensionApi.negotiateExtension(candidate.id, lowballOffer);

    expect(firstResponse).toBeTruthy();
    expect(secondResponse).toBeTruthy();
    expect(firstResponse!.status).toBe('countered');
    expect(firstResponse!.rounds).toHaveLength(1);
    expect(firstResponse!.review).toMatchObject({
      status: 'countered',
      riskLevel: 'high',
    });
    expect(firstResponse!.review!.offerGapPct).toBeGreaterThan(20);
    expect(firstResponse!.review!.teamOfferAav).toBe(lowballOffer.annualSalary);
    expect(firstResponse!.review!.playerDemandAav).toBeGreaterThan(lowballOffer.annualSalary);
    expect(firstResponse!.review!.evidence.join(' ')).toContain('below current ask');
    expect(resetOffer?.annualSalary).toBe(openingOffer?.annualSalary);
    expect(secondResponse!.status).toBe('countered');
    expect(secondResponse!.rounds).toHaveLength(2);
  });

  it('applies runtime team-building identity to promotion and extension candidate priorities', () => {
    startGame(1271, 'nym');
    const state = requireState();
    const workerApi = api as typeof api & MinorLeagueWorkerApi;
    const standing = state.seasonState.standings.getRecord('bos');
    if (!standing) {
      throw new Error('Missing BOS standing.');
    }

    const bosPlayers = state.players.filter((player) => player.teamId === 'bos');
    for (const player of bosPlayers) {
      if (player.rosterStatus === 'MLB') {
        player.overallRating = 250;
      }
    }

    standing.wins = 35;
    standing.losses = 75;

    const [currentReady, upsideProspect] = state.players
      .filter((player) => player.teamId === 'bos' && player.rosterStatus === 'AAA' && player.pitcherAttributes == null)
      .slice(0, 2);
    if (!currentReady || !upsideProspect) {
      throw new Error('Expected two BOS AAA hitters.');
    }

    setHitterProfile(currentReady, 'RF', 340, 31, 1);
    currentReady.id = 'bos-current-ready-promotion';
    currentReady.overallRating = 340;
    currentReady.potentialRating = 345;
    currentReady.minorLeagueLevel = 'AAA';

    setHitterProfile(upsideProspect, 'RF', 320, 22, 1);
    upsideProspect.id = 'bos-upside-promotion';
    upsideProspect.overallRating = 320;
    upsideProspect.potentialRating = 430;
    upsideProspect.minorLeagueLevel = 'AAA';

    const aaaState = state.minorLeagueState.affiliateStates.find(
      (entry) => entry.teamId === 'bos' && entry.level === 'AAA',
    );
    if (!aaaState) {
      throw new Error('Missing BOS AAA affiliate state.');
    }
    aaaState.playerStats = [currentReady, upsideProspect].map((player) => [player.id, {
      playerId: player.id,
      games: 24,
      pa: 118,
      hits: 38,
      hr: 7,
      rbi: 29,
      bb: 18,
      k: 17,
      ipOuts: 0,
      earnedRuns: 0,
      strikeouts: 0,
      walks: 0,
      wins: 0,
      losses: 0,
    }]);

    expect(workerApi.getPromotionCandidates('bos')[0]?.playerId).toBe(upsideProspect.id);

    const [winNowStar, youngCornerstone] = state.players
      .filter((player) => player.teamId === 'bos' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null)
      .slice(0, 2);
    if (!winNowStar || !youngCornerstone) {
      throw new Error('Expected two BOS MLB hitters.');
    }

    setHitterProfile(winNowStar, '3B', 420, 31, 24);
    winNowStar.id = 'bos-current-extension-star';
    winNowStar.overallRating = 420;
    winNowStar.contract.years = 1;
    winNowStar.contract.totalValue = 24;
    state.serviceTime.set(winNowStar.id, 6);

    setHitterProfile(youngCornerstone, 'SS', 360, 24, 7);
    youngCornerstone.id = 'bos-young-extension-core';
    youngCornerstone.overallRating = 360;
    youngCornerstone.contract.years = 3;
    youngCornerstone.contract.totalValue = 21;
    youngCornerstone.developmentTrajectory = 'ahead_of_curve';
    state.serviceTime.set(youngCornerstone.id, 2);

    for (const player of bosPlayers) {
      if (
        player.rosterStatus !== 'MLB'
        || player.id === winNowStar.id
        || player.id === youngCornerstone.id
      ) {
        continue;
      }
      player.extensionHistory = [{
        season: state.season,
        teamId: 'bos',
        years: 2,
        annualSalary: player.contract.annualSalary,
        totalValue: player.contract.annualSalary * 2,
        outcome: 'accepted',
      }];
    }

    state.gmPersonalities.set('bos', 'prospect_hugger');
    const rebuildingExtensions = workerApi.getExtensionCandidates('bos');
    expect(rebuildingExtensions[0]?.playerId).toBe(youngCornerstone.id);

    state.gmPersonalities.set('bos', 'win_now');
    standing.wins = 96;
    standing.losses = 48;
    for (const player of bosPlayers) {
      if (player.rosterStatus === 'MLB') {
        player.overallRating = Math.max(player.overallRating, 410);
      }
    }

    const winNowExtensions = workerApi.getExtensionCandidates('bos');
    const winNowPromotions = workerApi.getPromotionCandidates('bos');

    expect(winNowExtensions[0]?.playerId).toBe(winNowStar.id);
    expect(winNowPromotions[0]?.playerId).toBe(currentReady.id);
  });

  it('binds CPU extension outcomes to persisted GM identity and stable team-scoped RNG', () => {
    startGame(1272, 'nym');
    const state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'tender_nontender',
      phaseDay: 5,
      totalDay: 15,
    };
    const owner = state.ownerState.get('bos');
    if (!owner) throw new Error('Missing BOS owner state.');
    state.ownerState.set('bos', { ...owner, annualBudget: 1_000 });
    state.gmPersonalities.set('bos', 'prospect_hugger');
    const standing = state.seasonState.standings.getRecord('bos');
    if (!standing) throw new Error('Missing BOS standing.');
    standing.wins = 35;
    standing.losses = 75;

    for (const player of state.players) {
      player.extensionHistory = [{
        season: state.season,
        teamId: player.teamId || 'free-agent',
        years: Math.max(1, player.contract.years),
        annualSalary: player.contract.annualSalary,
        totalValue: Math.max(
          player.contract.totalValue ?? player.contract.annualSalary,
          player.contract.annualSalary,
        ),
        outcome: 'accepted',
      }];
    }

    const [currentStar, youngCore] = state.players
      .filter((player) => player.teamId === 'bos' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null)
      .slice(0, 2);
    if (!currentStar || !youngCore) throw new Error('Expected two BOS extension candidates.');
    setHitterProfile(currentStar, '3B', 420, 31, 24);
    currentStar.overallRating = 420;
    currentStar.contract.years = 1;
    currentStar.contract.totalValue = 24;
    currentStar.serviceTimeDays = 6 * 172;
    currentStar.ceiling = 500;
    currentStar.extensionHistory = [];
    setHitterProfile(youngCore, 'SS', 360, 24, 7);
    youngCore.overallRating = 360;
    youngCore.contract.years = 3;
    youngCore.contract.totalValue = 21;
    youngCore.serviceTimeDays = 2 * 172;
    youngCore.ceiling = 100;
    youngCore.extensionHistory = [];
    for (const player of state.players) {
      if (
        player.teamId === 'bos'
        && player.rosterStatus === 'MLB'
        && player.id !== currentStar.id
        && player.id !== youngCore.id
      ) {
        player.rosterStatus = 'AAA';
        player.minorLeagueLevel = 'AAA';
      }
    }
    state.serviceTime.set(currentStar.id, 0);
    state.serviceTime.set(youngCore.id, 99);

    const baseline = api.exportSnapshot() as GameSnapshot;
    const run = (
      userTeamId: string,
      hiddenPotential: number,
      contradictoryLegacyYears: number,
    ) => {
      const snapshot = structuredClone(baseline);
      snapshot.userTeamId = userTeamId;
      const candidate = snapshot.players.find((player) => player.id === youngCore.id)!;
      candidate.ceiling = hiddenPotential;
      snapshot.serviceTime = snapshot.serviceTime.map(([playerId, years]) =>
        playerId === youngCore.id ? [playerId, contradictoryLegacyYears] : [playerId, years]);
      expect(api.importSnapshot(snapshot).success).toBe(true);
      const rngBefore = api.exportSnapshot().rng;

      const entered = api.advanceOffseason();
      expect(entered?.currentPhase).toBe('extensions');
      expect(entered?.flowStateChanged).toBe(true);
      const after = api.exportSnapshot() as GameSnapshot;
      const offseason = after.offseasonState as ReturnType<typeof createOffseasonState>;
      const results = offseason.phaseResults.extensions.filter((entry) => entry.teamId === 'bos');
      const histories = after.players
        .filter((player) => player.id === currentStar.id || player.id === youngCore.id)
        .flatMap((player) => (player.extensionHistory ?? [])
          .filter((entry) => entry.season === after.season)
          .map((entry) => ({ playerId: player.id, ...entry })));
      const news = after.news
        .filter((entry) => entry.category === 'extension' && entry.relatedTeamIds.includes('bos'))
        .map((entry) => ({ id: entry.id, headline: entry.headline, body: entry.body }));
      expect(after.rng).toEqual(rngBefore);
      expect(results[0]?.playerId).toBe(youngCore.id);
      return { results, histories, news, rng: after.rng };
    };

    const canonical = run('nym', 100, 99);
    expect(run('chi', 100, 99)).toEqual(canonical);
    expect(run('nym', 500, 99)).toEqual(canonical);
    expect(run('nym', 100, 0)).toEqual(canonical);
  });

  it('rejects forged, invalid, stale, and duplicate public extension mutations without RNG or snapshot changes', () => {
    startGame(1273, 'nym');
    const state = requireState();
    const userPlayer = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const cpuPlayer = state.players.find(
      (player) => player.teamId === 'bos' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    setHitterProfile(userPlayer, 'SS', 420, 27, 8);
    userPlayer.contract.years = 1;
    userPlayer.contract.totalValue = 8;
    userPlayer.extensionHistory = [];
    const offer = (api as typeof api & MinorLeagueWorkerApi).getExtensionOffer(userPlayer.id, 5)!;

    const assertRejectedUnchanged = (playerId: string, attemptedOffer: typeof offer) => {
      const before = JSON.stringify(api.exportSnapshot());
      const rngBefore = api.exportSnapshot().rng;
      const pendingBefore = structuredClone(Array.from(state.pendingExtensionNegotiations.entries()));
      expect((api as typeof api & MinorLeagueWorkerApi).negotiateExtension(playerId, attemptedOffer)).toBeNull();
      expect(JSON.stringify(api.exportSnapshot())).toBe(before);
      expect(api.exportSnapshot().rng).toEqual(rngBefore);
      expect(Array.from(state.pendingExtensionNegotiations.entries())).toEqual(pendingBefore);
    };

    assertRejectedUnchanged(cpuPlayer.id, offer);
    assertRejectedUnchanged(userPlayer.id, { ...offer, annualSalary: Number.POSITIVE_INFINITY });
    for (const malformed of [
      { ...offer, noTradeClauseType: 'invalid-clause' },
      { ...offer, playerOption: 'yes' },
      { ...offer, optOutYears: null },
      { ...offer, deferredMoney: [null] },
    ]) {
      assertRejectedUnchanged(userPlayer.id, malformed as unknown as typeof offer);
    }
    userPlayer.extensionHistory = [{
      season: state.season,
      teamId: 'nym',
      years: 5,
      annualSalary: offer.annualSalary,
      totalValue: offer.totalValue,
      outcome: 'accepted',
    }];
    assertRejectedUnchanged(userPlayer.id, offer);

    userPlayer.extensionHistory = [];
    const opening = {
      ...offer,
      annualSalary: 1,
      totalValue: offer.years,
    };
    const response = (api as typeof api & MinorLeagueWorkerApi).negotiateExtension(
      userPlayer.id,
      opening,
    );
    expect(response?.status).toBe('countered');
    const staleCounter = response && 'counterOffer' in response
      ? response.counterOffer
      : undefined;
    if (!staleCounter) throw new Error('Expected a live extension counteroffer.');
    userPlayer.contract.years += 1;
    assertRejectedUnchanged(userPlayer.id, staleCounter);
  });

  it('fails malformed imported extension aggregates before phase mutation or RNG', () => {
    const corruptionCases = [
      {
        label: 'missing player',
        build: () => [{
          playerId: 'missing-extension-player',
          teamId: 'bos',
          status: 'accepted' as const,
          years: 5,
          annualSalary: 20,
          totalValue: 100,
        }],
        error: 'missing player',
      },
      {
        label: 'empty identity',
        build: () => [{
          playerId: '',
          teamId: 'bos',
          status: 'accepted' as const,
          years: 5,
          annualSalary: 20,
          totalValue: 100,
        }],
        error: 'malformed or duplicated',
      },
      {
        label: 'illegal term',
        build: (player: GeneratedPlayer) => [{
          playerId: player.id,
          teamId: player.teamId,
          status: 'accepted' as const,
          years: 0,
          annualSalary: player.contract.annualSalary,
          totalValue: player.contract.totalValue ?? player.contract.annualSalary,
        }],
        error: 'malformed or duplicated',
      },
      {
        label: 'nonterminal status',
        build: (player: GeneratedPlayer) => [{
          playerId: player.id,
          teamId: player.teamId,
          status: 'countered' as never,
          years: player.contract.years,
          annualSalary: player.contract.annualSalary,
          totalValue: player.contract.totalValue ?? player.contract.annualSalary,
        }],
        error: 'malformed or duplicated',
      },
      {
        label: 'wrong team',
        build: (player: GeneratedPlayer) => [{
          playerId: player.id,
          teamId: player.teamId === 'bos' ? 'nym' : 'bos',
          status: 'accepted' as const,
          years: player.contract.years,
          annualSalary: player.contract.annualSalary,
          totalValue: player.contract.totalValue ?? player.contract.annualSalary,
        }],
        error: 'current player ownership',
      },
      {
        label: 'duplicate player',
        build: (player: GeneratedPlayer) => {
          const entry = {
            playerId: player.id,
            teamId: player.teamId,
            status: 'accepted' as const,
            years: player.contract.years,
            annualSalary: player.contract.annualSalary,
            totalValue: player.contract.totalValue ?? player.contract.annualSalary,
          };
          return [entry, { ...entry }];
        },
        error: 'malformed or duplicated',
      },
      {
        label: 'accepted contract mismatch',
        build: (player: GeneratedPlayer) => {
          const years = Math.min(MAX_CONTRACT_YEARS, Math.max(1, player.contract.years + 1));
          const totalValue = player.contract.annualSalary * years;
          player.extensionHistory = [{
            season: requireState().season,
            teamId: player.teamId,
            years,
            annualSalary: player.contract.annualSalary,
            totalValue,
            outcome: 'accepted',
          }];
          return [{
            playerId: player.id,
            teamId: player.teamId,
            status: 'accepted' as const,
            years,
            annualSalary: player.contract.annualSalary,
            totalValue,
          }];
        },
        error: 'canonical contract',
      },
      {
        label: 'accepted history mismatch',
        build: (player: GeneratedPlayer) => [{
          playerId: player.id,
          teamId: player.teamId,
          status: 'accepted' as const,
          years: player.contract.years,
          annualSalary: player.contract.annualSalary + 1,
          totalValue: (player.contract.annualSalary + 1) * player.contract.years,
        }],
        error: 'player history',
      },
    ];

    corruptionCases.forEach((corruption, index) => {
      startGame(1274 + index, 'nym');
      const state = requireState();
      const player = state.players.find((candidate) =>
        candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB')!;
      player.extensionHistory = [{
        season: state.season,
        teamId: player.teamId,
        years: player.contract.years,
        annualSalary: player.contract.annualSalary,
        totalValue: player.contract.totalValue ?? player.contract.annualSalary,
        outcome: 'accepted',
      }];
      state.phase = 'offseason';
      state.offseasonState = {
        ...createOffseasonState(state.season),
        currentPhase: 'tender_nontender',
        phaseDay: 5,
        totalDay: 15,
        phaseResults: {
          ...createOffseasonState(state.season).phaseResults,
          extensions: corruption.build(player),
        },
      };
      const before = JSON.stringify(api.exportSnapshot());
      const rngBefore = api.exportSnapshot().rng;

      const result = api.advanceOffseason();

      expect(result?.flowStateChanged, corruption.label).toBe(false);
      expect(result?.error, corruption.label).toContain(corruption.error);
      expect(JSON.stringify(api.exportSnapshot()), corruption.label).toBe(before);
      expect(api.exportSnapshot().rng, corruption.label).toEqual(rngBefore);
    });
  });

  it('issues and resolves qualifying offers through worker APIs', () => {
    startGame(128, 'nym');
    const state = requireState();
    const candidate = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;

    setHitterProfile(candidate, 'RF', 480, 34, 18);
    candidate.contract.years = 0;
    candidate.contract.totalValue = 18;
    candidate.developmentTrajectory = 'on_track';
    state.serviceTime.set(candidate.id, 6);
    candidate.serviceTimeDays = 6 * 172;
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'qualifying_offers',
      phaseDay: 1,
      totalDay: 18,
    };

    const extensionApi = api as unknown as MinorLeagueWorkerApi;
    const salary = extensionApi.getQualifyingOfferSalary();
    const eligible = extensionApi.getQualifyingOfferEligible('nym');
    const issued = extensionApi.issueQualifyingOffer(candidate.id);

    expect(salary).toBeGreaterThan(0);
    expect(eligible.some((player) => player.playerId === candidate.id)).toBe(true);
    expect(issued.success).toBe(true);
    expect(requireState().draftState.qualifyingOffers.some((record) => record.playerId === candidate.id)).toBe(true);

    const resolved = extensionApi.resolveQualifyingOffers();
    const record = requireState().draftState.qualifyingOffers.find((entry) => entry.playerId === candidate.id);
    const qualifyingOfferGroup = api.getOffseasonState()?.transactionGroups.find(
      (group) => group.phase === 'qualifying_offers',
    );

    expect(resolved.resolved.some((entry) => entry.playerId === candidate.id)).toBe(true);
    expect(['accepted', 'rejected']).toContain(record?.status);
    expect(qualifyingOfferGroup?.rows.some((row) => row.summary.includes(candidate.firstName))).toBe(true);
  });

  it('freezes one QO salary for the phase and rejects forged CPU-team issuance unchanged', () => {
    startGame(1281, 'nym');
    const state = requireState();
    const userCandidates = state.players.filter(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    ).slice(0, 2);
    const cpuCandidate = state.players.find(
      (player) => player.teamId === 'bos' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const salaryMover = state.players.find(
      (player) => player.teamId === 'lax' && player.rosterStatus === 'MLB',
    )!;

    for (const [index, player] of [...userCandidates, cpuCandidate].entries()) {
      setHitterProfile(player, 'RF', 480, 28 + index, 18);
      player.contract.years = 0;
      player.contract.totalValue = 18;
      player.serviceTimeDays = 6 * 172;
      state.serviceTime.set(player.id, 6);
    }
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'qualifying_offers',
      phaseDay: 1,
      totalDay: 18,
    };

    const workerApi = api as unknown as MinorLeagueWorkerApi;
    const fixedSalary = workerApi.getQualifyingOfferSalary();
    expect(workerApi.issueQualifyingOffer(userCandidates[0]!.id).success).toBe(true);
    salaryMover.contract.annualSalary = 1_000;
    salaryMover.contract.totalValue = 1_000;

    expect(workerApi.getQualifyingOfferSalary()).toBe(fixedSalary);
    expect(workerApi.issueQualifyingOffer(userCandidates[1]!.id).success).toBe(true);
    expect(state.draftState.qualifyingOffers
      .filter((record) => userCandidates.some((player) => player.id === record.playerId))
      .map((record) => record.amount)).toEqual([fixedSalary, fixedSalary]);

    const beforeForgedIssue = JSON.stringify(api.exportSnapshot());
    const rngBeforeForgedIssue = state.rng.getState();
    const forged = workerApi.issueQualifyingOffer(cpuCandidate.id);

    expect(forged.success).toBe(false);
    expect(JSON.stringify(api.exportSnapshot())).toBe(beforeForgedIssue);
    expect(state.rng.getState()).toEqual(rngBeforeForgedIssue);
  });

  it('resolves QOs in stable order independent of persisted record order and never rerolls terminal records', () => {
    startGame(12811, 'nym');
    const state = requireState();
    const candidates = state.players.filter(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    ).slice(0, 2);
    for (const [index, player] of candidates.entries()) {
      setHitterProfile(player, 'RF', 450 + index * 10, 30 + index, 18);
      player.contract.years = 0;
      player.serviceTimeDays = 6 * 172;
      state.serviceTime.set(player.id, 6);
    }
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'qualifying_offers',
      phaseDay: 1,
      totalDay: 18,
    };
    const workerApi = api as unknown as MinorLeagueWorkerApi;
    for (const player of candidates) {
      expect(workerApi.issueQualifyingOffer(player.id).success).toBe(true);
    }
    const issued = api.exportSnapshot() as ReturnType<typeof api.exportSnapshot> & {
      draftState: { qualifyingOffers: unknown[] };
    };

    expect(api.importSnapshot(structuredClone(issued)).success).toBe(true);
    const canonicalResult = workerApi.resolveQualifyingOffers();
    const canonicalState = requireState();
    const canonicalDigest = {
      resolved: [...canonicalResult.resolved].sort((left, right) => left.playerId.localeCompare(right.playerId)),
      records: canonicalState.draftState.qualifyingOffers
        .map((record) => ({ playerId: record.playerId, status: record.status }))
        .sort((left, right) => left.playerId.localeCompare(right.playerId)),
      rng: canonicalState.rng.getState(),
    };
    const terminalSnapshot = JSON.stringify(api.exportSnapshot());
    const terminalRng = canonicalState.rng.getState();
    expect(workerApi.resolveQualifyingOffers()).toMatchObject({ resolved: [], flowStateChanged: false });
    expect(JSON.stringify(api.exportSnapshot())).toBe(terminalSnapshot);
    expect(canonicalState.rng.getState()).toEqual(terminalRng);

    const permuted = structuredClone(issued);
    permuted.draftState.qualifyingOffers.reverse();
    expect(api.importSnapshot(permuted).success).toBe(true);
    const permutedResult = workerApi.resolveQualifyingOffers();
    const permutedState = requireState();
    expect({
      resolved: [...permutedResult.resolved].sort((left, right) => left.playerId.localeCompare(right.playerId)),
      records: permutedState.draftState.qualifyingOffers
        .map((record) => ({ playerId: record.playerId, status: record.status }))
        .sort((left, right) => left.playerId.localeCompare(right.playerId)),
      rng: permutedState.rng.getState(),
    }).toEqual(canonicalDigest);
  });

  it('fails an inconsistent offered QO with a missing player byte-identically', () => {
    startGame(12812, 'nym');
    const state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'qualifying_offers',
      phaseDay: 1,
      totalDay: 18,
    };
    state.draftState = {
      ...state.draftState,
      qualifyingOffers: [{
        playerId: 'missing-qo-player',
        teamId: 'nym',
        season: state.season,
        marketValue: 30,
        amount: 20,
        status: 'offered',
        signingTeamId: null,
        compensationPickId: null,
      }],
    };
    const before = JSON.stringify(api.exportSnapshot());
    const rngBefore = state.rng.getState();
    const result = (api as unknown as MinorLeagueWorkerApi).resolveQualifyingOffers();
    expect(result).toMatchObject({ resolved: [], flowStateChanged: false });
    expect(result.error).toContain('inconsistent');
    expect(JSON.stringify(api.exportSnapshot())).toBe(before);
    expect(state.rng.getState()).toEqual(rngBefore);
  });

  it('rejects early draft start before RNG or snapshot mutation', () => {
    startGame(1282, 'nym');
    const state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'qualifying_offers',
      phaseDay: 1,
      totalDay: 18,
    };
    const before = JSON.stringify(api.exportSnapshot());
    const rngBefore = state.rng.getState();

    const result = api.startDraft() as { success: boolean; error?: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('draft phase');
    expect(JSON.stringify(api.exportSnapshot())).toBe(before);
    expect(state.rng.getState()).toEqual(rngBefore);
  });

  it('atomically links one outside QO signing to one award and one eligible pick loss', () => {
    startGame(1283, 'nym');
    const state = requireState();
    const player = state.players.find(
      (candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
    )!;
    const formerTeamId = player.teamId;
    configureSingleFreeAgent(player);
    setCanonicalMlbCount('nym', 25);
    addRejectedQualifyingOffer(player, formerTeamId);

    const result = api.makeContractOffer(player.id, 4, 100);
    const record = state.draftState.qualifyingOffers.find((entry) => entry.playerId === player.id);
    const award = state.draftState.compensatoryPicks.find(
      (entry) => entry.compensationForPlayerId === player.id,
    );
    const lostPicks = state.draftState.pickOwnership.filter(
      (entry) => entry.season === state.season && entry.currentTeamId === 'nym' && entry.forfeited,
    );
    const receipt = state.offseasonState?.phaseResults.qualifyingOffers.find(
      (entry) => entry.playerId === player.id && entry.status === 'compensated',
    );

    expect(result).toMatchObject({
      accepted: true,
      qualifyingOfferCompensation: {
        tier: 'premium',
        forfeitedRound: lostPicks[0]?.round,
        forfeitedOriginalTeamId: lostPicks[0]?.originalTeamId,
      },
    });
    expect(record).toMatchObject({
      status: 'compensated',
      signingTeamId: 'nym',
      compensationPickId: award?.id,
    });
    expect(award).toMatchObject({
      awardedToTeamId: formerTeamId,
      compensationFromTeamId: 'nym',
    });
    expect(lostPicks).toHaveLength(1);
    expect(receipt).toMatchObject({
      compensationPickId: award?.id,
      forfeitedPick: {
        season: state.season,
        round: lostPicks[0]?.round,
        originalTeamId: lostPicks[0]?.originalTeamId,
      },
    });
  });

  it('fails closed and byte-identical on malformed imported QO compensation aggregates', () => {
    startGame(12830, 'nym');
    const state = requireState();
    const player = state.players.find(
      (candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
    )!;
    configureSingleFreeAgent(player);
    setCanonicalMlbCount('nym', 25);
    addRejectedQualifyingOffer(player, 'bos');
    expect(api.makeContractOffer(player.id, 4, 100).accepted).toBe(true);

    type CompensationSnapshot = ReturnType<typeof api.exportSnapshot> & {
      phase: string;
      players: Array<{ id: string; teamId: string }>;
      freeAgencyMarket: {
        signedPlayers: Array<{
          player: { id: string };
          signedWith: string | null;
          contract: { playerId: string; teamId: string } | null;
        }>;
      };
      offseasonState: {
        currentPhase: string;
        phaseDay: number;
        phaseResults: {
          qualifyingOfferSalary: number | null;
          qualifyingOffers: Array<{
            playerId: string;
            teamId: string;
            status: string;
            amount: number;
            compensationTier: 'premium' | 'standard' | null;
            forfeitedPick: { season: number; round: number; originalTeamId: string } | null;
          }>;
          freeAgentSignings: Array<{
            playerId: string;
            teamId: string;
            years: number;
            annualSalary: number;
            totalValue: number;
          }>;
        };
      };
      draftState: {
        qualifyingOffers: Array<{
          playerId: string;
          teamId: string;
          season: number;
          amount: number;
          status: string;
          signingTeamId: string | null;
          compensationPickId: string | null;
        }>;
        compensatoryPicks: Array<{
          id: string;
          season: number;
          awardedToTeamId: string;
          compensationForPlayerId: string;
          compensationFromTeamId: string;
          order: number;
        }>;
        pickOwnership: Array<{
          season: number;
          round: number;
          originalTeamId: string;
          currentTeamId: string;
          forfeited: boolean;
        }>;
      };
    };
    const valid = structuredClone(api.exportSnapshot()) as CompensationSnapshot;
    valid.phase = 'offseason';
    valid.offseasonState.currentPhase = 'draft';
    const compensated = valid.draftState.qualifyingOffers.find((record) => record.playerId === player.id)!;
    const award = valid.draftState.compensatoryPicks.find((pick) => pick.id === compensated.compensationPickId)!;
    const receipt = valid.offseasonState.phaseResults.qualifyingOffers.find((result) => (
      result.playerId === player.id && result.status === 'compensated'
    ))!;
    const loss = valid.draftState.pickOwnership.find((pick) => (
      pick.season === receipt.forfeitedPick?.season
      && pick.round === receipt.forfeitedPick.round
      && pick.originalTeamId === receipt.forfeitedPick.originalTeamId
    ))!;

    const corruptions: Array<{
      name: string;
      mutate: (snapshot: CompensationSnapshot) => void;
    }> = [
      {
        name: 'orphan award',
        mutate: (snapshot) => snapshot.draftState.compensatoryPicks.push({
          ...award,
          id: `${award.id}-orphan`,
          compensationForPlayerId: 'orphan-player',
          order: award.order + 1,
        }),
      },
      {
        name: 'missing award',
        mutate: (snapshot) => {
          snapshot.draftState.compensatoryPicks = snapshot.draftState.compensatoryPicks
            .filter((pick) => pick.id !== award.id);
        },
      },
      {
        name: 'award without loss',
        mutate: (snapshot) => {
          const target = snapshot.draftState.pickOwnership.find((pick) => (
            pick.season === loss.season
            && pick.round === loss.round
            && pick.originalTeamId === loss.originalTeamId
          ));
          if (target) target.forfeited = false;
        },
      },
      {
        name: 'duplicate QO player',
        mutate: (snapshot) => snapshot.draftState.qualifyingOffers.push({ ...compensated }),
      },
      {
        name: 'duplicate ownership descriptor',
        mutate: (snapshot) => snapshot.draftState.pickOwnership.push({ ...loss }),
      },
      {
        name: 'wrong compensation receipt amount',
        mutate: (snapshot) => {
          const target = snapshot.offseasonState.phaseResults.qualifyingOffers.find((result) => (
            result.playerId === player.id && result.status === 'compensated'
          ));
          if (target) target.amount += 1;
        },
      },
      {
        name: 'contradictory compensation receipt tier',
        mutate: (snapshot) => {
          const target = snapshot.offseasonState.phaseResults.qualifyingOffers.find((result) => (
            result.playerId === player.id && result.status === 'compensated'
          ));
          if (target) target.compensationTier = target.compensationTier === 'premium' ? 'standard' : 'premium';
        },
      },
      {
        name: 'missing free-agent signing receipt',
        mutate: (snapshot) => {
          snapshot.offseasonState.phaseResults.freeAgentSignings = snapshot.offseasonState.phaseResults.freeAgentSignings
            .filter((signing) => signing.playerId !== player.id);
        },
      },
      {
        name: 'duplicate free-agent signing receipt',
        mutate: (snapshot) => {
          const signing = snapshot.offseasonState.phaseResults.freeAgentSignings.find((entry) => entry.playerId === player.id)!;
          snapshot.offseasonState.phaseResults.freeAgentSignings.push({ ...signing });
        },
      },
      {
        name: 'player reassigned away from signing club',
        mutate: (snapshot) => {
          snapshot.players.find((entry) => entry.id === player.id)!.teamId = 'chi';
        },
      },
      {
        name: 'coordinated terminal amount rewrite',
        mutate: (snapshot) => {
          snapshot.draftState.qualifyingOffers.find((entry) => entry.playerId === player.id)!.amount += 1;
          snapshot.offseasonState.phaseResults.qualifyingOffers.find((result) => (
            result.playerId === player.id && result.status === 'compensated'
          ))!.amount += 1;
        },
      },
      {
        name: 'coordinated former-team rewrite',
        mutate: (snapshot) => {
          snapshot.draftState.qualifyingOffers.find((entry) => entry.playerId === player.id)!.teamId = 'chi';
          snapshot.draftState.compensatoryPicks.find((entry) => entry.id === award.id)!.awardedToTeamId = 'chi';
          snapshot.offseasonState.phaseResults.qualifyingOffers.find((result) => (
            result.playerId === player.id && result.status === 'compensated'
          ))!.teamId = 'chi';
        },
      },
      {
        name: 'missing signed-market fact',
        mutate: (snapshot) => {
          snapshot.freeAgencyMarket.signedPlayers = snapshot.freeAgencyMarket.signedPlayers
            .filter((entry) => entry.player.id !== player.id);
        },
      },
    ];

    for (const corruption of corruptions) {
      const snapshot = structuredClone(valid);
      corruption.mutate(snapshot);
      expect(api.importSnapshot(snapshot).success, corruption.name).toBe(true);
      const imported = requireState();
      const before = JSON.stringify(api.exportSnapshot());
      const rngBefore = imported.rng.getState();
      const plan = prepareQualifyingOfferCompensation(imported, player.id, 'chi', {
        years: 3,
        annualSalary: 30,
        totalValue: 90,
      });
      const draftResult = api.startDraft() as { success: boolean; error?: string };

      expect(plan.kind, corruption.name).toBe('blocked');
      expect(draftResult.success, corruption.name).toBe(false);
      expect(draftResult.error, corruption.name).toContain('Qualifying-offer');
      expect(JSON.stringify(api.exportSnapshot()), corruption.name).toBe(before);
      expect(imported.rng.getState(), corruption.name).toEqual(rngBefore);

      const skipped = api.skipOffseasonPhase();
      expect(skipped?.currentPhase, `${corruption.name} skip`).toBe('draft');
      expect(skipped?.flowStateChanged, `${corruption.name} skip`).toBe(false);
      expect(JSON.stringify(api.exportSnapshot()), `${corruption.name} skip`).toBe(before);
      expect(imported.rng.getState(), `${corruption.name} skip`).toEqual(rngBefore);

      const advanceSnapshot = structuredClone(snapshot);
      advanceSnapshot.offseasonState.phaseDay = 3;
      expect(api.importSnapshot(advanceSnapshot).success, `${corruption.name} advance import`).toBe(true);
      const advanceState = requireState();
      const advanceBefore = JSON.stringify(api.exportSnapshot());
      const advanceRngBefore = advanceState.rng.getState();
      const advanced = api.advanceOffseason();
      expect(advanced?.currentPhase, `${corruption.name} advance`).toBe('draft');
      expect(advanced?.flowStateChanged, `${corruption.name} advance`).toBe(false);
      expect(JSON.stringify(api.exportSnapshot()), `${corruption.name} advance`).toBe(advanceBefore);
      expect(advanceState.rng.getState(), `${corruption.name} advance`).toEqual(advanceRngBefore);
    }
  });

  it('blocks issue, resolve, and QO-to-FA transition on a contradictory imported compensation receipt', () => {
    startGame(128301, 'nym');
    const state = requireState();
    const player = state.players.find(
      (candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
    )!;
    configureSingleFreeAgent(player);
    setCanonicalMlbCount('nym', 25);
    addRejectedQualifyingOffer(player, 'bos');
    expect(api.makeContractOffer(player.id, 4, 100).accepted).toBe(true);

    const malformed = structuredClone(api.exportSnapshot()) as ReturnType<typeof api.exportSnapshot> & {
      offseasonState: {
        currentPhase: string;
        phaseDay: number;
        phaseResults: {
          qualifyingOffers: Array<{
            playerId: string;
            status: string;
            amount: number;
          }>;
        };
      };
    };
    malformed.offseasonState.currentPhase = 'qualifying_offers';
    malformed.offseasonState.phaseDay = 4;
    malformed.offseasonState.phaseResults.qualifyingOffers.find((result) => (
      result.playerId === player.id && result.status === 'compensated'
    ))!.amount += 1;

    const assertRejectedUnchanged = (
      action: () => unknown,
      label: string,
    ) => {
      expect(api.importSnapshot(structuredClone(malformed)).success, label).toBe(true);
      const imported = requireState();
      const before = JSON.stringify(api.exportSnapshot());
      const rngBefore = imported.rng.getState();
      action();
      expect(JSON.stringify(api.exportSnapshot()), label).toBe(before);
      expect(imported.rng.getState(), label).toEqual(rngBefore);
    };

    assertRejectedUnchanged(() => {
      const result = (api as unknown as MinorLeagueWorkerApi).issueQualifyingOffer(player.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Qualifying-offer');
    }, 'issue');
    assertRejectedUnchanged(() => {
      const result = (api as unknown as MinorLeagueWorkerApi).resolveQualifyingOffers();
      expect(result.resolved).toEqual([]);
      expect(result.error).toContain('Qualifying-offer');
    }, 'resolve');
    assertRejectedUnchanged(() => {
      expect(api.skipOffseasonPhase()?.currentPhase).toBe('qualifying_offers');
    }, 'skip transition');
    assertRejectedUnchanged(() => {
      expect(api.advanceOffseason()?.currentPhase).toBe('qualifying_offers');
    }, 'advance transition');
  });

  it('projects the exact QO pick cost on the free-agent board before an offer', () => {
    startGame(12831, 'nym');
    const state = requireState();
    const player = state.players.find(
      (candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
    )!;
    configureSingleFreeAgent(player);
    addRejectedQualifyingOffer(player, 'bos');

    const row = (api.getFreeAgents(200) as Array<{
      player: { id: string };
      qualifyingOffer: {
        formerTeamName: string;
        requiresCompensation: boolean;
        forfeitedPick: { round: number; originalTeamId: string } | null;
      } | null;
    }>).find((entry) => entry.player.id === player.id);

    expect(row?.qualifyingOffer).toMatchObject({
      formerTeamName: 'Boston Noreasters',
      requiresCompensation: true,
      forfeitedPick: { round: 1, originalTeamId: 'nym' },
    });
  });

  it('fails closed on an imported draft session whose slots conflict with current compensation', () => {
    startGame(12832, 'nym');
    const state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'draft',
      phaseDay: 1,
      totalDay: 50,
    };
    const draftStart = api.startDraft();
    expect(draftStart.success, draftStart.error).toBe(true);
    const exported = api.exportSnapshot() as ReturnType<typeof api.exportSnapshot> & {
      draftClass: { pickSlots: Array<{ slotId: string }>; prospects: Array<{ player: { id: string } }> };
    };
    exported.draftClass.pickSlots = exported.draftClass.pickSlots.slice(1);
    expect(api.importSnapshot(exported).success).toBe(true);
    const imported = requireState();
    const prospectId = (imported.draftClass as { prospects: Array<{ player: { id: string } }> }).prospects[0]!.player.id;
    const before = JSON.stringify(api.exportSnapshot());
    const rngBefore = imported.rng.getState();

    const restarted = api.startDraft() as { success: boolean; error?: string };
    expect(restarted.success).toBe(false);
    expect(restarted.error).toContain('pick order does not match');
    expect(JSON.stringify(api.exportSnapshot())).toBe(before);
    expect(imported.rng.getState()).toEqual(rngBefore);

    const result = api.makeDraftPick(prospectId) as { success: boolean; error?: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('pick order does not match');
    expect(JSON.stringify(api.exportSnapshot())).toBe(before);
    expect(imported.rng.getState()).toEqual(rngBefore);
  });

  it('rejects malformed imported completed-pick progress before advancing entitlement', () => {
    startGame(12833, 'nym');
    const state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'draft',
      phaseDay: 1,
      totalDay: 50,
    };
    expect(api.startDraft().success).toBe(true);
    expect(api.simulateRemainingDraft().success).toBe(true);

    type DraftProgressSnapshot = ReturnType<typeof api.exportSnapshot> & {
      offseasonState: {
        phaseDay: number;
        phaseResults: {
          draftPicks: Array<{
            playerId: string;
          }>;
        };
      };
      draftClass: {
        completedPicks: Array<{
          slotId: string;
          round: number;
          pickNumber: number;
          teamId: string;
          playerId: string;
          slotKind?: string;
        }>;
        pickSlots: Array<{
          slotId: string;
          round: number;
          pickNumber: number;
          teamId: string;
          kind: string;
        }>;
      };
    };
    const valid = structuredClone(api.exportSnapshot()) as DraftProgressSnapshot;
    expect(valid.draftClass.completedPicks.length).toBeGreaterThan(1);

    const corruptions: Array<{
      name: string;
      mutate: (snapshot: DraftProgressSnapshot) => void;
    }> = [
      {
        name: 'wrong prefix team',
        mutate: (snapshot) => {
          snapshot.draftClass.completedPicks[0]!.teamId = 'forged-team';
        },
      },
      {
        name: 'duplicate completed player',
        mutate: (snapshot) => {
          snapshot.draftClass.completedPicks[1]!.playerId = snapshot.draftClass.completedPicks[0]!.playerId;
        },
      },
      {
        name: 'completed picks beyond slots',
        mutate: (snapshot) => {
          snapshot.draftClass.completedPicks.push({ ...snapshot.draftClass.completedPicks[0]! });
        },
      },
      {
        name: 'fabricated completed player',
        mutate: (snapshot) => {
          snapshot.draftClass.completedPicks[0]!.playerId = 'fabricated-draft-player';
        },
      },
      {
        name: 'mismatched draft receipt',
        mutate: (snapshot) => {
          snapshot.offseasonState.phaseResults.draftPicks[0]!.playerId = 'receipt-for-different-player';
        },
      },
    ];

    for (const corruption of corruptions) {
      const snapshot = structuredClone(valid);
      corruption.mutate(snapshot);
      expect(api.importSnapshot(snapshot).success, corruption.name).toBe(true);
      const imported = requireState();
      const before = JSON.stringify(api.exportSnapshot());
      const rngBefore = imported.rng.getState();
      const result = api.startDraft() as { success: boolean; error?: string };

      expect(result.success, corruption.name).toBe(false);
      expect(result.error, corruption.name).toContain('Draft session');
      expect(JSON.stringify(api.exportSnapshot()), corruption.name).toBe(before);
      expect(imported.rng.getState(), corruption.name).toEqual(rngBefore);

      expect(api.skipOffseasonPhase()?.currentPhase, `${corruption.name} skip`).toBe('draft');
      expect(JSON.stringify(api.exportSnapshot()), `${corruption.name} skip`).toBe(before);
      expect(imported.rng.getState(), `${corruption.name} skip`).toEqual(rngBefore);

      const advanceSnapshot = structuredClone(snapshot);
      advanceSnapshot.offseasonState.phaseDay = 3;
      expect(api.importSnapshot(advanceSnapshot).success, `${corruption.name} advance import`).toBe(true);
      const advanceState = requireState();
      const advanceBefore = JSON.stringify(api.exportSnapshot());
      const advanceRngBefore = advanceState.rng.getState();
      expect(api.advanceOffseason()?.currentPhase, `${corruption.name} advance`).toBe('draft');
      expect(JSON.stringify(api.exportSnapshot()), `${corruption.name} advance`).toBe(advanceBefore);
      expect(advanceState.rng.getState(), `${corruption.name} advance`).toEqual(advanceRngBefore);
    }
  });

  it('rejects a compensated outside signing unchanged when no eligible signing-team pick exists', () => {
    startGame(1284, 'nym');
    const state = requireState();
    const player = state.players.find(
      (candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
    )!;
    const formerTeamId = player.teamId;
    configureSingleFreeAgent(player);
    setCanonicalMlbCount('nym', 25);
    addRejectedQualifyingOffer(player, formerTeamId);
    state.draftState = {
      ...state.draftState,
      pickOwnership: createDefaultDraftPickOwnership(TEAMS.map((team) => team.id), state.season).map((pick) => (
        pick.season === state.season && pick.currentTeamId === 'nym'
          ? { ...pick, currentTeamId: 'bos' }
          : pick
      )),
    };
    const before = JSON.stringify(api.exportSnapshot());
    const rngBefore = state.rng.getState();

    const result = api.makeContractOffer(player.id, 4, 100);

    expect(result).toEqual({
      accepted: false,
      reason: 'No eligible draft pick is available for qualifying-offer compensation.',
    });
    expect(JSON.stringify(api.exportSnapshot())).toBe(before);
    expect(state.rng.getState()).toEqual(rngBefore);
  });

  it('re-signs a rejected QO player with the former club without an award or pick loss', () => {
    startGame(12840, 'nym');
    const state = requireState();
    const player = state.players.find(
      (candidate) => candidate.teamId === 'nym' && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
    )!;
    configureSingleFreeAgent(player);
    setCanonicalMlbCount('nym', 25);
    addRejectedQualifyingOffer(player, 'nym');

    const result = api.makeContractOffer(player.id, 4, 100);
    const record = state.draftState.qualifyingOffers.find((entry) => entry.playerId === player.id);

    expect(result.accepted).toBe(true);
    expect(record).toMatchObject({ status: 'expired', signingTeamId: 'nym', compensationPickId: null });
    expect(state.draftState.compensatoryPicks).toEqual([]);
    expect(state.draftState.pickOwnership.filter((pick) => pick.forfeited)).toEqual([]);
  });

  it('uses the same atomic award/loss law for a CPU signing', () => {
    startGame(12841, 'nym');
    const state = requireState();
    const player = state.players.find(
      (candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
    )!;
    const formerTeamId = player.teamId;
    configureSingleFreeAgent(player);
    const signingTeamId = 'chi';
    const available = state.freeAgencyMarket!.freeAgents.shift()!;
    const contract = {
      teamId: signingTeamId,
      playerId: player.id,
      years: 4,
      annualSalary: 30,
      totalValue: 120,
      noTradeClause: false,
      playerOption: false,
      teamOption: false,
      signingBonus: 0,
    };
    state.freeAgencyMarket!.signedPlayers.push({
      ...available,
      signedWith: signingTeamId,
      contract,
    });
    addRejectedQualifyingOffer(player, formerTeamId);

    const progress = applyNewFreeAgencySignings(state, new Set());
    const award = state.draftState.compensatoryPicks.find((entry) => entry.compensationForPlayerId === player.id);
    const losses = state.draftState.pickOwnership.filter((entry) => (
      entry.season === state.season && entry.currentTeamId === signingTeamId && entry.forfeited
    ));

    expect(progress).toHaveLength(1);
    expect(award).toMatchObject({
      awardedToTeamId: formerTeamId,
      compensationFromTeamId: signingTeamId,
    });
    expect(losses).toHaveLength(1);
  });

  it('admits an eligible CPU runner-up before an ineligible no-pick bidder can suppress the signing', () => {
    startGame(128411, 'nym');
    const state = requireState();
    const player = state.players.find(
      (candidate) => candidate.teamId === 'chi' && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
    )!;
    setHitterProfile(player, 'RF', 440, 29, 20);
    configureSingleFreeAgent(player);
    for (const team of TEAMS) {
      if (team.id !== 'nym') setCanonicalMlbCount(team.id, 26);
    }
    setCanonicalMlbCount('por', 25);
    setCanonicalMlbCount('bos', 25);
    for (const teamId of ['por', 'bos']) {
      const owner = state.ownerState.get(teamId)!;
      owner.annualBudget = 500;
      owner.payrollCap = 500;
    }
    for (const porPlayer of state.players.filter((candidate) => candidate.teamId === 'por' && candidate.rosterStatus === 'MLB')) {
      porPlayer.position = 'C';
    }
    addRejectedQualifyingOffer(player, 'chi');
    state.draftState = {
      ...state.draftState,
      pickOwnership: createDefaultDraftPickOwnership(TEAMS.map((team) => team.id), state.season).map((pick) => (
        pick.season === state.season && pick.currentTeamId === 'por'
          ? { ...pick, currentTeamId: 'nym' }
          : pick
      )),
    };

    api.advanceOffseason();

    const signed = state.freeAgencyMarket?.signedPlayers.find((entry) => entry.player.id === player.id);
    const award = state.draftState.compensatoryPicks.find((entry) => entry.compensationForPlayerId === player.id);
    const losses = state.draftState.pickOwnership.filter((pick) => (
      pick.season === state.season && pick.currentTeamId === 'bos' && pick.forfeited
    ));
    expect(signed?.signedWith).toBe('bos');
    expect(signed?.interestedTeams).toEqual(['bos']);
    expect(award).toMatchObject({ awardedToTeamId: 'chi', compensationFromTeamId: 'bos' });
    expect(losses).toHaveLength(1);
  });

  it('forfeits deterministic distinct picks for multiple QO signings', () => {
    startGame(12842, 'nym');
    const state = requireState();
    const players = ['bos', 'chi'].map((teamId) => state.players.find(
      (candidate) => candidate.teamId === teamId && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
    )!);
    for (const player of players) {
      player.contract = { ...player.contract, years: 0, teamOption: false };
    }
    state.freeAgencyMarket = createFreeAgencyMarket(state.season, players);
    for (const player of players) {
      player.teamId = '';
      player.rosterStatus = 'INTERNATIONAL';
      player.minorLeagueLevel = 'INTERNATIONAL';
    }
    state.freeAgencyMarket.day = 54;
    for (const freeAgent of state.freeAgencyMarket.freeAgents) {
      freeAgent.demandLevel = 'low';
    }
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'free_agency',
      phaseDay: 1,
      totalDay: 21,
    };
    addRejectedQualifyingOffer(players[0]!, 'bos');
    addRejectedQualifyingOffer(players[1]!, 'chi');
    setCanonicalMlbCount('nym', 24);

    expect(api.makeContractOffer(players[0]!.id, 4, 100).accepted).toBe(true);
    expect(api.makeContractOffer(players[1]!.id, 4, 100).accepted).toBe(true);

    const awards = state.draftState.compensatoryPicks.filter((entry) => (
      players.some((player) => player.id === entry.compensationForPlayerId)
    ));
    const losses = state.draftState.pickOwnership
      .filter((entry) => entry.season === state.season && entry.currentTeamId === 'nym' && entry.forfeited)
      .sort((left, right) => left.round - right.round);
    expect(awards).toHaveLength(2);
    expect(new Set(awards.map((entry) => entry.compensationForPlayerId)).size).toBe(2);
    expect(losses.map((entry) => entry.round)).toEqual([1, 2]);
    expect(new Set(losses.map((entry) => `${entry.round}:${entry.originalTeamId}`)).size).toBe(2);
  });

  it('round-trips and consumes the exact supplemental draft slot once', () => {
    startGame(12843, 'nym');
    const state = requireState();
    const player = state.players.find(
      (candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
    )!;
    configureSingleFreeAgent(player);
    setCanonicalMlbCount('nym', 25);
    addRejectedQualifyingOffer(player, 'bos');
    expect(api.makeContractOffer(player.id, 4, 100).accepted).toBe(true);
    const award = state.draftState.compensatoryPicks.find((entry) => entry.compensationForPlayerId === player.id)!;
    const nonemptySnapshot = api.exportSnapshot();
    expect(api.importSnapshot(structuredClone(nonemptySnapshot)).success).toBe(true);
    expect(api.exportSnapshot()).toEqual(nonemptySnapshot);

    const imported = requireState();
    imported.phase = 'offseason';
    imported.offseasonState = {
      ...imported.offseasonState!,
      currentPhase: 'draft',
      phaseDay: 1,
      totalDay: 50,
    };
    const draftStart = api.startDraft();
    expect(draftStart.success, draftStart.error).toBe(true);
    const session = requireState().draftClass as {
      pickSlots: Array<{ slotId: string; kind: string; round: number }>;
      completedPicks: Array<{ slotId: string }>;
    };
    const supplementalIndex = session.pickSlots.findIndex((slot) => slot.slotId === award.id);
    const firstRoundStandardCount = session.pickSlots.filter((slot) => slot.round === 1 && slot.kind === 'standard').length;
    expect(supplementalIndex).toBe(firstRoundStandardCount);

    const completed = api.simulateRemainingDraft();
    expect(completed.success).toBe(true);
    expect((requireState().draftClass as typeof session).completedPicks.filter((pick) => pick.slotId === award.id)).toHaveLength(1);
    const completedSnapshot = api.exportSnapshot();
    expect(api.importSnapshot(structuredClone(completedSnapshot)).success).toBe(true);
    const rngBeforeRepeat = requireState().rng.getState();
    const repeated = api.simulateRemainingDraft();
    expect(repeated, repeated.error).toMatchObject({ success: true, newPicks: [] });
    expect((requireState().draftClass as typeof session).completedPicks.filter((pick) => pick.slotId === award.id)).toHaveLength(1);
    expect(requireState().rng.getState()).toEqual(rngBeforeRepeat);
  });

  it.each([12851, 12852, 12853])('conserves one award, loss, and unique slot across seed %i', (seed) => {
    startGame(seed, 'nym');
    const state = requireState();
    const player = state.players.find(
      (candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
    )!;
    configureSingleFreeAgent(player);
    const available = state.freeAgencyMarket!.freeAgents.shift()!;
    const contract = {
      teamId: 'chi',
      playerId: player.id,
      years: 3,
      annualSalary: 30,
      totalValue: 90,
      noTradeClause: false,
      playerOption: false,
      teamOption: false,
      signingBonus: 0,
    };
    state.freeAgencyMarket!.signedPlayers.push({ ...available, signedWith: 'chi', contract });
    addRejectedQualifyingOffer(player, 'bos');

    applyNewFreeAgencySignings(state, new Set());
    const awards = state.draftState.compensatoryPicks.filter((entry) => entry.compensationForPlayerId === player.id);
    const losses = state.draftState.pickOwnership.filter((entry) => (
      entry.season === state.season && entry.currentTeamId === 'chi' && entry.forfeited
    ));
    expect(awards).toHaveLength(1);
    expect(losses).toHaveLength(1);
    expect(new Set(awards.map((entry) => entry.id)).size).toBe(1);
    expect(awards[0]).toMatchObject({ compensationFromTeamId: 'chi', awardedToTeamId: 'bos' });
  });

  it('keeps CPU compensation and terminal RNG invariant when only userTeamId changes', () => {
    const run = (userTeamId: string) => {
      startGame(12854, userTeamId);
      const state = requireState();
      const player = state.players.find(
        (candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
      )!;
      configureSingleFreeAgent(player);
      const available = state.freeAgencyMarket!.freeAgents.shift()!;
      const contract = {
        teamId: 'chi',
        playerId: player.id,
        years: 3,
        annualSalary: 30,
        totalValue: 90,
        noTradeClause: false,
        playerOption: false,
        teamOption: false,
        signingBonus: 0,
      };
      state.freeAgencyMarket!.signedPlayers.push({ ...available, signedWith: 'chi', contract });
      addRejectedQualifyingOffer(player, 'bos');
      applyNewFreeAgencySignings(state, new Set());
      return {
        awards: state.draftState.compensatoryPicks,
        losses: state.draftState.pickOwnership.filter((entry) => entry.forfeited),
        rng: state.rng.getState(),
      };
    };
    expect(run('nym')).toEqual(run('sea'));
  });

  it('supports hiring and firing coaches through the worker market APIs', () => {
    startGame(129, 'nym');
    const state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'coaching_changes',
      phaseDay: 1,
      totalDay: 45,
    };

    const workerApi = api as typeof api & MinorLeagueWorkerApi;
    const currentStaff = workerApi.getCoachingStaff('nym');
    const firedCoach = currentStaff[0]!;
    const fireResult = workerApi.fireCoach(firedCoach.id);
    const marketAfterFire = workerApi.getCoachMarket();
    const replacement = marketAfterFire.find((coach) => coach.role === firedCoach.role) ?? marketAfterFire[0]!;
    const hireResult = workerApi.hireCoach(replacement.id);
    const finalStaff = workerApi.getCoachingStaff('nym');
    const coachingGroup = api.getOffseasonState()?.transactionGroups.find(
      (group) => group.phase === 'coaching_changes',
    );

    expect(fireResult.success).toBe(true);
    expect(marketAfterFire.some((coach) => coach.id === firedCoach.id)).toBe(true);
    expect(hireResult.success).toBe(true);
    expect(finalStaff).toHaveLength(12);
    expect(finalStaff.some((coach) => coach.id === replacement.id)).toBe(true);
    expect(coachingGroup?.rows.length).toBeGreaterThan(0);
  });

  it('returns personality profiles and award races after the season starts', () => {
    startGame(456, 'nym');
    api.simDay();
    api.simDay();

    const roster = api.getTeamRoster('nym');
    const profile = api.getPersonalityProfile(roster[0]!.id);
    const awardRaces = api.getAwardRaces();

    expect(profile?.playerId).toBe(roster[0]!.id);
    expect(typeof profile?.archetype).toBe('string');
    expect(profile?.morale.score).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(awardRaces.mvp)).toBe(true);
    expect(Array.isArray(awardRaces.cyYoung)).toBe(true);
    expect(Array.isArray(awardRaces.roy)).toBe(true);
  });

  it('forms mentor relationships and publishes a clubhouse mentor story', () => {
    startGame(458, 'nym');
    const state = requireState();
    const veteran = state.players.find(
      (player) =>
        player.teamId === 'nym'
        && player.rosterStatus === 'MLB'
        && player.position === 'SS',
    )!;
    const rookie = state.players.find(
      (player) =>
        player.teamId === 'nym'
        && player.rosterStatus === 'AAA'
        && player.pitcherAttributes == null
        && player.position === 'SS',
    )!;

    veteran.age = 34;
    veteran.personality.leadership = 92;
    veteran.personalityTraits = ['Leader', 'Mentor', 'Team First'];
    rookie.age = 21;
    rookie.rosterStatus = 'MLB';
    rookie.minorLeagueLevel = null;
    rookie.personalityTraits = ['Quiet Professional', 'Hard Worker'];

    api.simDay();

    expect(state.mentorRelationships.some((relationship) =>
      relationship.veteranPlayerId === veteran.id && relationship.rookiePlayerId === rookie.id,
    )).toBe(true);
    expect(state.news.some((item) =>
      /under wing|takes rookie/i.test(item.headline) || /under wing|takes rookie/i.test(item.body),
    )).toBe(true);
  });

  it('resolves history display names from live worker state', () => {
    startGame(457, 'nym');

    const player = api.getTeamRoster('nym')[0]!;
    const names = api.resolveHistoryDisplayNames([player.id], ['nym', 'bos']);

    expect(names.players[player.id]).toBe(`${player.firstName} ${player.lastName}`);
    expect(names.teams.nym).toBe('New York Tycoons');
    expect(names.teams.bos).toBe('Boston Noreasters');
  });

  it('restores narrative state through snapshot import', () => {
    startGame(789, 'nym');
    api.simDay();
    api.simDay();

    const beforeChemistry = api.getTeamChemistry('nym');
    const beforeBriefing = api.getBriefing(10);
    const snapshot = api.exportSnapshot();

    startGame(999, 'bos');
    api.importSnapshot(snapshot);

    expect(api.getTeamChemistry('nym')).toEqual(beforeChemistry);
    expect(api.getBriefing(10)).toEqual(beforeBriefing);
  });

  it('imports a current scenario snapshot repeatedly without changing canonical state or RNG', () => {
    api.newGame({
      seed: 1_783_849_480_775,
      userTeamId: 'sea',
      gmName: 'Journal Browser GM',
      difficulty: 'hard',
      saveSlot: 1,
      scenarioId: 'trade_shark',
    });
    const baseline = api.exportSnapshot();

    expect(api.importSnapshot(structuredClone(baseline)).success).toBe(true);
    expect(api.exportSnapshot()).toEqual(baseline);
    expect(api.getAchievements()).toHaveLength(42);
    expect(api.exportSnapshot()).toEqual(baseline);
    expect(api.importSnapshot(structuredClone(baseline)).success).toBe(true);
    expect(api.exportSnapshot()).toEqual(baseline);
  });

  it.each([
    ['current v34', () => parseGameSnapshot(v34SnapshotFixture)],
    ['normalized deep v17', () => parseGameSnapshot(v17SnapshotFixture)],
  ])('imports and exports an exact %s snapshot', (_label, snapshot) => {
    const accepted = snapshot();
    const canonical = materializeSimulationImportDefaults(accepted);

    expect(api.importSnapshot(structuredClone(accepted)).success).toBe(true);
    expect(api.exportSnapshot()).toEqual(canonical);
    expect(api.importSnapshot(structuredClone(canonical)).success).toBe(true);
    expect(api.exportSnapshot()).toEqual(canonical);
  });

  it('exposes minor league management queries and affiliate box scores', () => {
    startGame(111, 'nym');
    api.simDay();

    const workerApi = api as unknown as MinorLeagueWorkerApi;
    const state = requireState();
    const mlbPlayer = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB')!;
    const beforeServiceTime = (api.getPlayer(mlbPlayer.id) as unknown as WorkerPlayerView).serviceTimeDays;

    api.simDay();

    const afterServiceTime = (api.getPlayer(mlbPlayer.id) as unknown as WorkerPlayerView).serviceTimeDays;

    const promotionTarget = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'AA')!;
    const affiliateState = state.minorLeagueState.affiliateStates.find(
      (entry) => entry.teamId === 'nym' && entry.level === 'AA',
    )!;
    affiliateState.playerStats = [[promotionTarget.id, {
      playerId: promotionTarget.id,
      games: 24,
      pa: 118,
      hits: 38,
      hr: 7,
      rbi: 29,
      bb: 18,
      k: 17,
      ipOuts: 0,
      earnedRuns: 0,
      strikeouts: 0,
      walks: 0,
      wins: 0,
      losses: 0,
    }]];

    const rosterState = state.rosterStates.get('nym')!;
    rosterState.fortyManRoster = state.players
      .filter((player) => player.teamId === 'nym')
      .map((player) => player.id);

    const promotionCandidates = workerApi.getPromotionCandidates('nym');
    const compliance = workerApi.getRosterComplianceIssues('nym');
    const affiliateOverview = workerApi.getAffiliateOverview('nym');
    const latestBoxScore = workerApi.getAffiliateBoxScore(affiliateOverview.recentBoxScores[0]!.id);

    expect(afterServiceTime).toBe(beforeServiceTime + 1);
    expect(promotionCandidates[0]?.playerId).toBe(promotionTarget.id);
    expect(compliance.issues.some((issue) => issue.code === 'forty_man_over_limit')).toBe(true);
    expect(compliance.dfaRecommendations.length).toBeGreaterThan(0);
    expect(affiliateOverview.affiliates.some((affiliate) => affiliate.level === 'AAA' && affiliate.gamesPlayed > 0)).toBe(true);
    expect(affiliateOverview.recentBoxScores.length).toBeGreaterThan(0);
    expect(affiliateOverview.recentBoxScores[0]).toMatchObject({
      teamId: 'nym',
      label: expect.any(String),
      shortName: expect.any(String),
    });
    expect(latestBoxScore?.id).toBe(affiliateOverview.recentBoxScores[0]!.id);
    expect(latestBoxScore).toMatchObject({
      homeTeamId: expect.any(String),
      awayTeamId: expect.any(String),
      homeShortName: expect.any(String),
      awayShortName: expect.any(String),
    });
  });

  it('accrues service time and affiliate games for every day advanced by week and month sims', () => {
    startGame(113, 'nym');
    api.simDay();

    const workerApi = api as unknown as MinorLeagueWorkerApi;
    const state = requireState();
    const player = state.players.find((candidate) => candidate.teamId === 'nym' && candidate.rosterStatus === 'MLB')!;

    const beforeWeekDay = requireState().day;
    const beforeWeekService = (api.getPlayer(player.id) as unknown as WorkerPlayerView).serviceTimeDays;
    const beforeWeekAffiliateGames = workerApi.getAffiliateOverview('nym').affiliates
      .find((affiliate) => affiliate.level === 'AAA')!.gamesPlayed;

    api.simWeek();

    const afterWeekDay = requireState().day;
    const weekDayDelta = afterWeekDay - beforeWeekDay;
    const afterWeekService = (api.getPlayer(player.id) as unknown as WorkerPlayerView).serviceTimeDays;
    const afterWeekAffiliateGames = workerApi.getAffiliateOverview('nym').affiliates
      .find((affiliate) => affiliate.level === 'AAA')!.gamesPlayed;

    expect(afterWeekService).toBe(beforeWeekService + weekDayDelta);
    expect(afterWeekAffiliateGames).toBe(beforeWeekAffiliateGames + weekDayDelta);

    const beforeMonthDay = requireState().day;
    const beforeMonthService = afterWeekService;
    const beforeMonthAffiliateGames = afterWeekAffiliateGames;

    api.simMonth();

    const afterMonthDay = requireState().day;
    const monthDayDelta = afterMonthDay - beforeMonthDay;
    const afterMonthService = (api.getPlayer(player.id) as unknown as WorkerPlayerView).serviceTimeDays;
    const afterMonthAffiliateGames = workerApi.getAffiliateOverview('nym').affiliates
      .find((affiliate) => affiliate.level === 'AAA')!.gamesPlayed;

    expect(afterMonthService).toBe(beforeMonthService + monthDayDelta);
    expect(afterMonthAffiliateGames).toBe(beforeMonthAffiliateGames + monthDayDelta);

    const afterMonthState = requireState();
    const aaaAffiliateState = afterMonthState.minorLeagueState.affiliateStates
      .find((affiliate) => affiliate.teamId === 'nym' && affiliate.level === 'AAA')!;
    const [trackedPlayerId, trackedStats] = aaaAffiliateState.playerStats[0]!;
    const historyLine = afterMonthState.minorLeagueState.minorLeagueStatHistory
      .find(([playerId]) => playerId === trackedPlayerId)?.[1]
      .find((line) => line.season === afterMonthState.season && line.level === 'AAA');

    expect(historyLine?.gamesPlayed).toBe(trackedStats.games);
  });

  it('advances affiliate games without consuming the parent worker rng', () => {
    startGame(114, 'nym');

    const workerApi = api as unknown as MinorLeagueWorkerApi;
    const beforeRng = requireState().rng.getState();
    const beforeAffiliateGames = workerApi.getAffiliateOverview('nym').affiliates
      .find((affiliate) => affiliate.level === 'AAA')!.gamesPlayed;
    const state = requireState();

    advanceMinorLeagueDay(state, state.day);

    const afterRng = requireState().rng.getState();
    const afterAffiliateGames = workerApi.getAffiliateOverview('nym').affiliates
      .find((affiliate) => affiliate.level === 'AAA')!.gamesPlayed;

    expect(afterRng).toEqual(beforeRng);
    expect(afterAffiliateGames).toBe(beforeAffiliateGames + 1);
  });

  it('persists user roster plans in the existing opening-day plan field', () => {
    startGame(111, 'nym');
    const hitters = api.getTeamRoster('nym')
      .filter((player) => !['SP', 'RP', 'CL'].includes(player.position))
      .slice(0, 9);
    const starters = api.getTeamRoster('nym')
      .filter((player) => player.position === 'SP')
      .slice(0, 5);

    const lineupPlayerIds = hitters.map((player) => player.id).reverse();
    const rotationPlayerIds = starters.map((player) => player.id).reverse();
    const result = api.updateRosterPlan({
      lineupPlayerIds,
      rotationPlayerIds,
      bullpen: {
        closerId: null,
        setupIds: [],
        longReliefId: null,
      },
    });
    const snapshot = api.exportSnapshot();

    expect(result.success).toBe(true);
    expect(api.getRosterPlan().lineupPlayerIds.slice(0, lineupPlayerIds.length)).toEqual(lineupPlayerIds);
    expect(api.getRosterPlan().rotationPlayerIds.slice(0, rotationPlayerIds.length)).toEqual(rotationPlayerIds);
    expect(snapshot.schemaVersion).toBe(34);
    expect(snapshot.franchise.dayOne.openingDayPlan?.lineupPlayerIds.slice(0, lineupPlayerIds.length)).toEqual(lineupPlayerIds);
    expect(snapshot.franchise.dayOne.openingDayPlan?.rotationPlayerIds.slice(0, rotationPlayerIds.length)).toEqual(rotationPlayerIds);
  });

  it('routes out-of-options demotions through waivers and allows the priority team to claim the player', () => {
    startGame(112, 'phx');
    const workerApi = api as unknown as MinorLeagueWorkerApi;
    const state = requireState();
    // Ensure user team has the worst record so it gets waiver priority
    for (const team of TEAMS) {
      const record = state.seasonState.standings.getRecord(team.id);
      if (record) {
        if (team.id === 'phx') {
          record.wins = 0;
          record.losses = 20;
        } else {
          record.wins = 10;
          record.losses = 10;
        }
      }
    }
    const player = state.players.find((candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB')!;
    player.optionYearsUsed = 3;
    player.isOutOfOptions = true;

    const demotionResult = api.demotePlayer(player.id);
    const overviewBeforeClaim = workerApi.getAffiliateOverview('phx');

    expect(demotionResult.success).toBe(true);
    expect(overviewBeforeClaim.waiverClaims.some((claim) => claim.playerId === player.id && claim.status === 'pending')).toBe(true);

    const claimResult = api.claimOffWaivers(player.id);
    const claimedPlayer = api.getPlayer(player.id) as unknown as WorkerPlayerView;
    const overviewAfterClaim = workerApi.getAffiliateOverview('phx');

    expect(claimResult.success).toBe(true);
    expect(claimedPlayer.teamId).toBe('phx');
    expect(claimedPlayer.rosterStatus).toBe('AAA');
    expect(overviewAfterClaim.waiverClaims.some((claim) => claim.playerId === player.id && claim.status === 'claimed')).toBe(true);
  });

  it('does not route a legal third option-year demotion through waivers', () => {
    startGame(112, 'phx');
    const state = requireState();
    const player = state.players.find((candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB')!;
    player.optionYearsUsed = 2;
    player.isOutOfOptions = false;
    state.minorLeagueState.optionUsage = [[player.id, [state.season - 2, state.season - 1]]];

    const demotionResult = api.demotePlayer(player.id);
    const updatedPlayer = requireState().players.find((candidate) => candidate.id === player.id)!;

    expect(demotionResult.success).toBe(true);
    expect(updatedPlayer.rosterStatus).toBe('AAA');
    expect(updatedPlayer.optionYearsUsed).toBe(3);
    expect(updatedPlayer.isOutOfOptions).toBe(true);
    expect(requireState().minorLeagueState.optionUsage).toContainEqual([
      player.id,
      [state.season - 2, state.season - 1, state.season],
    ]);
    expect(requireState().minorLeagueState.waiverClaims.some((claim) => claim.playerId === player.id)).toBe(false);
  });

  it('does not route an out-of-options player through waivers when this season option is already active', () => {
    startGame(112, 'phx');
    const state = requireState();
    const player = state.players.find((candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB')!;
    player.optionYearsUsed = 3;
    player.isOutOfOptions = true;
    state.minorLeagueState.optionUsage = [[player.id, [state.season - 2, state.season - 1, state.season]]];

    const demotionResult = api.demotePlayer(player.id);
    const updatedPlayer = requireState().players.find((candidate) => candidate.id === player.id)!;

    expect(demotionResult.success).toBe(true);
    expect(updatedPlayer.rosterStatus).toBe('AAA');
    expect(updatedPlayer.optionYearsUsed).toBe(3);
    expect(updatedPlayer.isOutOfOptions).toBe(true);
    expect(requireState().minorLeagueState.optionUsage).toContainEqual([
      player.id,
      [state.season - 2, state.season - 1, state.season],
    ]);
    expect(requireState().minorLeagueState.waiverClaims.some((claim) => claim.playerId === player.id)).toBe(false);
  });

  it('lets a friendly higher-priority team pass on a marginal waiver claim so the user can claim the player', () => {
    startGame(112, 'phx');
    const state = requireState();
    for (const team of TEAMS) {
      const record = state.seasonState.standings.getRecord(team.id);
      if (!record) {
        continue;
      }
      if (team.id === 'nym') {
        record.wins = 0;
        record.losses = 20;
      } else if (team.id === 'phx') {
        record.wins = 5;
        record.losses = 15;
      } else {
        record.wins = 10;
        record.losses = 10;
      }
    }

    const relationship = state.gmRelationships.get('nym');
    if (relationship) {
      relationship.score = 70;
    }

    const player = state.players.find((candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB')!;
    player.optionYearsUsed = 3;
    player.isOutOfOptions = true;
    player.overallRating = 150;

    const demotionResult = api.demotePlayer(player.id);
    const claimResult = api.claimOffWaivers(player.id);
    const claimedPlayer = api.getPlayer(player.id) as unknown as WorkerPlayerView;
    const pendingClaim = requireState().minorLeagueState.waiverClaims.find((claim) => claim.playerId === player.id);

    expect(demotionResult.success).toBe(true);
    expect(claimResult.success).toBe(true);
    expect(claimedPlayer.teamId).toBe('phx');
    expect(pendingClaim?.status).toBe('claimed');
    expect(pendingClaim?.toTeamId).toBe('phx');
  });

  it('does not let friendly teams pass on premium waiver claims', () => {
    startGame(112, 'phx');
    const state = requireState();
    for (const team of TEAMS) {
      const record = state.seasonState.standings.getRecord(team.id);
      if (!record) {
        continue;
      }
      if (team.id === 'nym') {
        record.wins = 0;
        record.losses = 20;
      } else if (team.id === 'phx') {
        record.wins = 5;
        record.losses = 15;
      } else {
        record.wins = 10;
        record.losses = 10;
      }
    }

    const relationship = state.gmRelationships.get('nym');
    if (relationship) {
      relationship.score = 70;
    }

    const player = state.players.find((candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB')!;
    player.optionYearsUsed = 3;
    player.isOutOfOptions = true;
    player.overallRating = 240;

    const demotionResult = api.demotePlayer(player.id);
    const beforeRejectedClaim = JSON.stringify(api.exportSnapshot());
    const claimResult = api.claimOffWaivers(player.id);
    const pendingClaim = requireState().minorLeagueState.waiverClaims.find((claim) => claim.playerId === player.id);

    expect(demotionResult.success).toBe(true);
    expect(claimResult.success).toBe(false);
    expect(claimResult.error).toContain('priority');
    expect(pendingClaim?.status).toBe('pending');
    expect(pendingClaim?.toTeamId).toBeNull();
    expect(JSON.stringify(api.exportSnapshot())).toBe(beforeRejectedClaim);
  });

  it('adds trade consequences after an accepted user trade', () => {
    startGame(321, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 60;
    const userPlayers = state.players
      .filter((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && !player.contract.noTradeClause)
      .sort((left, right) => evaluatePlayerTradeValue(right).overall - evaluatePlayerTradeValue(left).overall);
    const partnerPlayers = state.players
      .filter((player) => player.teamId === 'bos' && player.rosterStatus === 'MLB' && !player.contract.noTradeClause)
      .sort((left, right) => evaluatePlayerTradeValue(left).overall - evaluatePlayerTradeValue(right).overall);

    const offered = userPlayers[0]!;
    const requested = partnerPlayers[0]!;
    const baselineAcquiredMorale = state.playerMorale.get(requested.id)?.score ?? 0;
    const baselineOutgoingMorale = state.playerMorale.get(offered.id)?.score ?? 0;
    const beforeOwner = api.getOwnerState('nym');

    const result = api.proposeTrade(
      [{ type: 'player', playerId: offered.id }],
      [{ type: 'player', playerId: requested.id }],
      'bos',
    );

    expect(result.decision).toBe('accepted');

    const afterState = requireState();
    const tradeNews = api.getNews(25).find((item) => item.category === 'trade');
    const tradeBriefing = api.getBriefing(25).find((item) => item.category === 'news' && item.relatedPlayerIds.includes(requested.id));
    const afterOwner = api.getOwnerState('nym');

    expect(tradeNews).toBeTruthy();
    expect(tradeBriefing).toBeTruthy();
    expect(afterState.playerMorale.get(requested.id)?.score).toBeGreaterThan(baselineAcquiredMorale);
    expect(afterState.playerMorale.get(offered.id)?.score).toBeLessThan(baselineOutgoingMorale);
    expect(afterOwner?.summary).not.toBe(beforeOwner?.summary);
  });

  it('adds signing consequences after a successful user offer', () => {
    startGame(654, 'nym');
    const state = requireState();
    const expiring = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null)!;
    setHitterProfile(expiring, 'RF', 100, 31, 0.7);
    expiring.contract = { ...expiring.contract, years: 0, teamOption: false };
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'qualifying_offers',
      phaseDay: 1,
      totalDay: 18,
    };
    api.skipOffseasonPhase();
    setCanonicalMlbCount('nym', 25);
    const target = api.getFreeAgents(200).find((entry) => entry.player.id === expiring.id)!;
    expect(target).toBeTruthy();
    expect(requireState().players.find((player) => player.id === target.player.id)?.teamId).toBe('');
    const releasedTenures = structuredClone(requireState().players.find((player) => player.id === target.player.id)?.teamTenures ?? []);
    const teammate = requireState().players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB')!;
    const baselineTeammateMorale = requireState().playerMorale.get(teammate.id)?.score ?? 0;
    const beforeOwner = api.getOwnerState('nym');

    const result = api.makeContractOffer(target.player.id, 4, 100);

    expect(result.accepted).toBe(true);
    expect('flowStateChanged' in result).toBe(false);

    const afterState = requireState();
    const signingNews = api.getNews(25).find((item) => item.category === 'signing' && item.relatedPlayerIds.includes(target.player.id));
    const signingBriefing = api.getBriefing(25).find((item) => item.category === 'news' && item.relatedPlayerIds.includes(target.player.id));
    const afterOwner = api.getOwnerState('nym');
    const signedPlayer = afterState.players.find((player) => player.id === target.player.id);

    expect(signedPlayer?.teamId).toBe('nym');
    expect(afterState.rosterStates.has('')).toBe(false);
    expect(signedPlayer?.teamTenures?.slice(0, -1)).toEqual(releasedTenures);
    expect(signedPlayer?.teamTenures?.at(-1)).toMatchObject({ teamId: 'nym', startSeason: afterState.season, endSeason: null });
    expect(afterState.freeAgencyMarket?.freeAgents.some((entry) => entry.player.id === target.player.id)).toBe(false);
    expect(signingNews).toBeTruthy();
    expect(signingBriefing).toBeTruthy();
    expect(afterState.playerMorale.get(target.player.id)?.score).toBeGreaterThan(0);
    expect(afterState.playerMorale.get(teammate.id)?.score).toBeGreaterThan(baselineTeammateMorale);
    expect(afterOwner?.summary).not.toBe(beforeOwner?.summary);
    expect(afterState.achievements.unlocked.some((achievement) => achievement.id === 'first_signing')).toBe(true);
    expect(api.getCeremonyState()).toMatchObject({
      activeMoment: {
        id: 'achievement-first_signing',
        subtitle: 'Open for Business',
      },
    });

    const exported = api.exportSnapshot();
    expect(api.importSnapshot(exported).success).toBe(true);
    expect(requireState().rosterStates.has('')).toBe(false);
    expect(requireState().players.find((player) => player.id === target.player.id)?.teamId).toBe('nym');
  });

  it('keeps free-agent listing and offers fail-closed before canonical market entry', () => {
    startGame(654, 'nym');
    requireState().freeAgencyMarket = null;
    const before = api.exportSnapshot() as GameSnapshot;

    const first = api.getFreeAgents(50);
    const second = api.getFreeAgents(50);
    const afterQueries = api.exportSnapshot() as GameSnapshot;

    expect(first).toEqual(second);
    expect(first).toEqual([]);
    expect(before.freeAgencyMarket).toBeNull();
    expect(afterQueries.freeAgencyMarket).toBeNull();

    const result = api.makeContractOffer('not-in-a-market', 4, 10);

    expect(result.accepted).toBe(false);
    expect(JSON.stringify(api.exportSnapshot())).toBe(JSON.stringify(afterQueries));
    expect(requireState().freeAgencyMarket).toBeNull();
  });

  it('keeps a rejected first offer from installing a hidden free-agent market', () => {
    startGame(654, 'nym');
    requireState().freeAgencyMarket = null;
    const before = JSON.stringify(api.exportSnapshot());

    const rejected = api.makeContractOffer('not-in-a-market', 1, 0.01);

    expect(rejected.accepted).toBe(false);
    expect(JSON.stringify(api.exportSnapshot())).toBe(before);
    expect(requireState().freeAgencyMarket).toBeNull();
  });

  it('fails closed for an assigned pre-release market on query, offer, and free-agency simulation', () => {
    startGame(655, 'nym');
    const state = requireState();
    const assigned = state.players.find((player) => player.teamId === 'bos' && player.rosterStatus === 'MLB')!;
    assigned.contract = { ...assigned.contract, years: 0 };
    state.freeAgencyMarket = createFreeAgencyMarket(state.season, state.players);
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'free_agency',
      phaseDay: 1,
      totalDay: 21,
    };
    const before = JSON.stringify(api.exportSnapshot());
    const rngBefore = state.rng.getState();

    expect(api.getFreeAgents()).toEqual([]);
    expect(api.makeContractOffer(assigned.id, 2, 20).accepted).toBe(false);
    expect(api.advanceOffseason()?.currentPhase).toBe('free_agency');
    expect(JSON.stringify(api.exportSnapshot())).toBe(before);
    expect(state.rng.getState()).toEqual(rngBefore);
  });

  it('rejects every corrupted available/signed market union without query, offer, transition, or RNG mutation', () => {
    const corruptions = [
      'duplicate-cross-set',
      'duplicate-signed',
      'stale-available-player',
      'wrong-signed-team',
      'mismatched-signed-player',
      'mismatched-signed-contract',
      'wrong-signed-contract-player',
      'wrong-signed-contract-team',
      'wrong-market-season',
    ] as const;

    for (const corruption of corruptions) {
      startGame(6557, 'nym');
      const state = requireState();
      const player = state.players.find((candidate) => candidate.teamId === 'chi' && candidate.rosterStatus === 'MLB')!;
      configureSingleFreeAgent(player);
      const market = state.freeAgencyMarket!;
      const available = market.freeAgents[0]!;

      if (corruption === 'duplicate-cross-set') {
        market.signedPlayers.push({ ...available });
      } else if (corruption === 'stale-available-player') {
        available.player = { ...available.player, firstName: 'Stale' };
      } else if (corruption === 'wrong-market-season') {
        market.season += 1;
      } else {
        player.teamId = 'bos';
        player.rosterStatus = 'MLB';
        player.minorLeagueLevel = null;
        const signedContract = {
          teamId: 'bos',
          playerId: player.id,
          years: player.contract.years,
          annualSalary: player.contract.annualSalary,
          totalValue: player.contract.totalValue ?? player.contract.years * player.contract.annualSalary,
          noTradeClause: player.contract.noTradeClause,
          playerOption: player.contract.playerOption,
          teamOption: player.contract.teamOption,
          signingBonus: player.contract.signingBonus ?? 0,
        };
        const signed = {
          ...available,
          player,
          signedWith: 'bos',
          contract: signedContract,
        };
        market.freeAgents = [];
        market.signedPlayers = [signed];
        if (corruption === 'duplicate-signed') {
          market.signedPlayers.push({ ...signed });
        } else if (corruption === 'wrong-signed-team') {
          signed.signedWith = 'chi';
        } else if (corruption === 'mismatched-signed-player') {
          signed.player = { ...player, lastName: 'Mismatch' };
        } else if (corruption === 'mismatched-signed-contract') {
          signed.contract = { ...signedContract, annualSalary: signedContract.annualSalary + 1 };
        } else if (corruption === 'wrong-signed-contract-player') {
          signed.contract = { ...signedContract, playerId: 'wrong-player' };
        } else if (corruption === 'wrong-signed-contract-team') {
          signed.contract = { ...signedContract, teamId: 'chi' };
        }
      }

      const before = JSON.stringify(api.exportSnapshot());
      const rngBefore = state.rng.getState();
      expect(hasCanonicalFreeAgencyMarket(state), corruption).toBe(false);
      expect(api.getFreeAgents(), corruption).toEqual([]);
      expect(api.makeContractOffer(player.id, 2, 20).accepted, corruption).toBe(false);
      expect(api.advanceOffseason()?.currentPhase, corruption).toBe('free_agency');
      expect(JSON.stringify(api.exportSnapshot()), corruption).toBe(before);
      expect(state.rng.getState(), corruption).toEqual(rngBefore);
    }
  });

  it('fails closed atomically when an invalid imported market tries to leave free agency for draft', () => {
    startGame(6551, 'nym');
    const state = requireState();
    const assigned = state.players.find((player) => player.teamId === 'bos' && player.rosterStatus === 'MLB')!;
    assigned.contract = { ...assigned.contract, years: 0 };
    state.freeAgencyMarket = createFreeAgencyMarket(state.season, state.players);
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'free_agency',
      phaseDay: 60,
      totalDay: 80,
    };
    const before = JSON.stringify(api.exportSnapshot());
    const rngBefore = state.rng.getState();

    expect(api.skipOffseasonPhase()?.currentPhase).toBe('free_agency');
    expect(JSON.stringify(api.exportSnapshot())).toBe(before);
    expect(state.rng.getState()).toEqual(rngBefore);
  });

  it('rejects a full user roster offer before any market or persistence-worthy mutation', () => {
    startGame(6552, 'nym');
    const state = requireState();
    const player = state.players.find((candidate) => candidate.teamId === 'chi' && candidate.rosterStatus === 'MLB')!;
    configureSingleFreeAgent(player);
    setCanonicalMlbCount('nym', 26);
    const before = JSON.stringify(api.exportSnapshot());
    const rngBefore = state.rng.getState();

    const result = api.makeContractOffer(player.id, 3, 100);

    expect(result).toEqual({ accepted: false, reason: 'No active roster slots are available.' });
    expect(JSON.stringify(api.exportSnapshot())).toBe(before);
    expect(state.rng.getState()).toEqual(rngBefore);
    expect(state.freeAgencyMarket?.freeAgents.map((entry) => entry.player.id)).toContain(player.id);
    expect(state.offseasonState?.phaseResults.freeAgentSignings).toEqual([]);
  });

  it('uses the same MLB placement admission for one user and one CPU vacancy', () => {
    startGame(6553, 'nym');
    const state = requireState();
    const userPlayer = state.players.find((candidate) => candidate.teamId === 'chi' && candidate.rosterStatus === 'MLB')!;
    configureSingleFreeAgent(userPlayer);
    setCanonicalMlbCount('nym', 25);

    expect(api.makeContractOffer(userPlayer.id, 3, 100).accepted).toBe(true);
    expect(userPlayer).toMatchObject({ teamId: 'nym', rosterStatus: 'MLB', minorLeagueLevel: null });
    expect(getAvailableMlbSigningSlots(state, 'nym')).toBe(0);
    expect(state.offseasonState?.phaseResults.freeAgentSignings.filter((entry) => entry.playerId === userPlayer.id)).toHaveLength(1);

    startGame(6554, 'nym');
    const cpuState = requireState();
    const cpuPlayer = cpuState.players.find((candidate) => candidate.teamId === 'chi' && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null)!;
    setHitterProfile(cpuPlayer, 'RF', 500, 27, 0.1);
    configureSingleFreeAgent(cpuPlayer);
    for (const team of TEAMS) {
      if (team.id !== 'nym' && team.id !== 'bos') setCanonicalMlbCount(team.id, 26);
    }
    setCanonicalMlbCount('bos', 25);
    const bosOwner = cpuState.ownerState.get('bos')!;
    cpuState.ownerState.set('bos', {
      ...bosOwner,
      annualBudget: 500,
      payrollCap: 460,
      expectations: { ...bosOwner.expectations, payrollTarget: 460 },
    });

    api.advanceOffseason();

    expect(cpuPlayer).toMatchObject({ teamId: 'bos', rosterStatus: 'MLB', minorLeagueLevel: null });
    expect(getAvailableMlbSigningSlots(cpuState, 'bos')).toBe(0);
    expect(cpuState.offseasonState?.phaseResults.freeAgentSignings.filter((entry) => entry.playerId === cpuPlayer.id)).toHaveLength(1);
  });

  it('does not admit Goal-11 FA signings over 26 or repair a pre-existing 28-player roster', () => {
    startGame(6555, 'nym');
    const state = requireState();
    const player = state.players.find((candidate) => candidate.teamId === 'chi' && candidate.rosterStatus === 'MLB')!;
    configureSingleFreeAgent(player);
    for (const team of TEAMS) {
      if (team.id !== 'nym') setCanonicalMlbCount(team.id, 26);
    }

    api.advanceOffseason();

    expect(TEAMS.filter((team) => team.id !== 'nym').every((team) => getAvailableMlbSigningSlots(state, team.id) === 0)).toBe(true);
    expect(state.freeAgencyMarket?.freeAgents.map((entry) => entry.player.id)).toContain(player.id);
    expect(state.offseasonState?.phaseResults.freeAgentSignings).toEqual([]);

    startGame(6556, 'nym');
    const overageState = requireState();
    const overagePlayer = overageState.players.find((candidate) => candidate.teamId === 'chi' && candidate.rosterStatus === 'MLB')!;
    configureSingleFreeAgent(overagePlayer);
    for (const team of TEAMS) {
      if (team.id !== 'nym' && team.id !== 'sfb') setCanonicalMlbCount(team.id, 26);
    }
    setCanonicalMlbCount('sfb', 28);

    api.advanceOffseason();

    expect(overageState.players.filter((candidate) => candidate.teamId === 'sfb' && candidate.rosterStatus === 'MLB')).toHaveLength(28);
    expect(getAvailableMlbSigningSlots(overageState, 'sfb')).toBe(0);
    expect(overageState.offseasonState?.phaseResults.freeAgentSignings.some((entry) => entry.teamId === 'sfb')).toBe(false);
  });

  it('clocks contracts exactly once at the null-to-live offseason boundary and keeps the activation beat once-only', () => {
    startGame(656, 'nym');
    const state = requireState();
    const active = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB')!;
    const optionPlayer = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.id !== active.id)!;
    const zeroYear = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'AAA')!;
    active.contract = { ...active.contract, years: 3, teamOption: false };
    optionPlayer.contract = { ...optionPlayer.contract, years: 1, annualSalary: 0.01, teamOption: true };
    zeroYear.contract = { ...zeroYear.contract, years: 0 };
    const zeroYearBefore = structuredClone(zeroYear);
    const activeId = active.id;
    const optionPlayerId = optionPlayer.id;
    const zeroYearId = zeroYear.id;
    state.phase = 'offseason';
    state.offseasonState = null;
    const rngBefore = state.rng.getState();

    expect(api.getFinanceOverview().contracts.find((contract) => contract.playerId === optionPlayerId)).toMatchObject({
      yearsRemaining: 1,
      teamOption: true,
    });

    const enteredOffseason = api.advanceOffseason();
    expect(enteredOffseason?.flowStateChanged).toBe(true);
    expect(state.players.find((player) => player.id === activeId)?.contract.years).toBe(2);
    expect(state.players.find((player) => player.id === optionPlayerId)?.contract).toMatchObject({ years: 1, teamOption: false });
    expect(api.getNews(50).some((item) => item.id === `contract-option-${state.season}-${optionPlayerId}`)).toBe(true);
    const optionLedger = api.getOffseasonState()?.transactionGroups
      .find((group) => group.phase === 'extensions');
    expect(optionLedger?.rows.some((row) => row.id === `contract-option-${state.season}-${optionPlayerId}`)).toBe(true);
    expect(state.players.find((player) => player.id === zeroYearId)).toEqual(zeroYearBefore);
    expect(state.rng.getState()).toEqual(rngBefore);
    expect(state.news.filter((item) => item.id === `contract-clock-live-${state.season}`)).toHaveLength(1);

    api.advanceOffseason();
    expect(state.players.find((player) => player.id === activeId)?.contract.years).toBe(2);
    expect(state.news.filter((item) => item.id === `contract-clock-live-${state.season}`)).toHaveLength(1);
  });

  it('keeps a declined option under canonical retention before free-agency capture', () => {
    startGame(6561, 'nym');
    const state = requireState();
    const optionPlayer = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB')!;
    setHitterProfile(optionPlayer, 'RF', 1, 31, 0.1);
    optionPlayer.overallRating = 1;
    optionPlayer.contract = {
      ...optionPlayer.contract,
      years: 1,
      annualSalary: 100,
      teamOption: true,
    };
    state.phase = 'offseason';
    state.offseasonState = null;

    api.advanceOffseason();

    expect(optionPlayer.teamId).toBe('nym');
    expect(state.freeAgencyMarket).toBeNull();
    const optionLedger = api.getOffseasonState()?.transactionGroups
      .find((group) => group.phase === 'extensions');
    const summary = optionLedger?.rows.find((row) => row.id === `contract-option-${state.season}-${optionPlayer.id}`)?.summary;
    expect(summary).toContain('had a team option declined; contract expired pending retention or free-agency entry.');
    expect(summary).not.toContain('reached free agency');
  });

  it('captures and releases natural expiry at free-agency entry without an empty-team roster key', () => {
    startGame(657, 'nym');
    const state = requireState();
    const expiring = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB')!;
    expiring.contract = { ...expiring.contract, years: 0 };
    setHitterProfile(expiring, 'RF', 420, 28, 1);
    expiring.overallRating = 400;
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'qualifying_offers',
      phaseDay: 1,
      totalDay: 18,
    };

    api.skipOffseasonPhase();

    const marketEntry = requireState().freeAgencyMarket?.freeAgents.find((entry) => entry.player.id === expiring.id);
    const canonical = requireState().players.find((player) => player.id === expiring.id);
    expect(marketEntry?.player).toEqual(canonical);
    expect(marketEntry?.player).toBe(canonical);
    expect(canonical?.teamId).toBe('');
    expect(api.getFreeAgents(200).some((entry) => entry.player.id === expiring.id)).toBe(true);
    expect(requireState().rosterStates.has('')).toBe(false);
    expect(new Set(requireState().freeAgencyMarket?.freeAgents.map((entry) => entry.player.id)).size)
      .toBe(requireState().freeAgencyMarket?.freeAgents.length);
    expect(requireState().news.filter((item) => item.id === `contract-expiry-departure-${state.season}-${expiring.id}`)).toHaveLength(1);
    expect(requireState().news.find((item) => item.id === `contract-expiry-departure-${state.season}-${expiring.id}`)?.headline)
      .toBe(`${expiring.firstName} ${expiring.lastName} enters free agency`);

    api.advanceOffseason();
    expect(requireState().news.filter((item) => item.id === `contract-expiry-departure-${state.season}-${expiring.id}`)).toHaveLength(1);
  });

  it('keeps contract-clock activation and advance/skip exact no-ops outside the offseason', () => {
    for (const phase of ['regular', 'preseason', 'playoffs'] as const) {
      startGame(6571, 'nym');
      const state = requireState();
      state.phase = phase;
      state.offseasonState = null;
      const before = JSON.stringify(api.exportSnapshot());
      const rngBefore = state.rng.getState();

      expect(api.advanceOffseason(), phase).toBeNull();
      expect(api.skipOffseasonPhase(), phase).toBeNull();
      expect(JSON.stringify(api.exportSnapshot()), phase).toBe(before);
      expect(state.rng.getState(), phase).toEqual(rngBefore);
      expect(state.offseasonState, phase).toBeNull();
      expect(state.news.some((item) => item.id === `contract-clock-live-${state.season}`), phase).toBe(false);
    }
  });

  it('does not publish a departure beat below the bounded user-star rating threshold', () => {
    startGame(65715, 'nym');
    const state = requireState();
    const expiring = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB')!;
    expiring.contract = { ...expiring.contract, years: 0 };
    setHitterProfile(expiring, 'RF', 420, 28, 1);
    expiring.overallRating = 399;
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'qualifying_offers',
      phaseDay: 1,
      totalDay: 18,
    };

    api.skipOffseasonPhase();

    expect(state.freeAgencyMarket?.freeAgents.some((entry) => entry.player.id === expiring.id)).toBe(true);
    expect(state.news.some((item) => item.id === `contract-expiry-departure-${state.season}-${expiring.id}`)).toBe(false);
  });

  it('rejects an imported null-state draft call before contract, RNG, or snapshot mutation', () => {
    startGame(6572, 'nym');
    const state = requireState();
    const incumbent = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB')!;
    incumbent.contract = { ...incumbent.contract, years: 3, teamOption: false };
    state.phase = 'offseason';
    state.offseasonState = null;
    const before = JSON.stringify(api.exportSnapshot());
    const rngBefore = state.rng.getState();
    const result = api.startDraft() as { success: boolean; error?: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('draft phase');
    expect(requireState().players.find((player) => player.id === incumbent.id)?.contract.years).toBe(3);
    expect(requireState().offseasonState).toBeNull();
    expect(JSON.stringify(api.exportSnapshot())).toBe(before);
    expect(state.rng.getState()).toEqual(rngBefore);
  });

  it('fails closed atomically at the QO-to-FA boundary for an invalid imported market', () => {
    startGame(658, 'nym');
    const state = requireState();
    const player = state.players.find((candidate) => candidate.teamId === 'nym' && candidate.rosterStatus === 'MLB')!;
    player.contract = { ...player.contract, years: 2 };
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'qualifying_offers',
      phaseDay: 1,
      totalDay: 18,
    };
    state.freeAgencyMarket = createFreeAgencyMarket(state.season, state.players);
    const before = JSON.stringify(api.exportSnapshot());
    const rngBefore = state.rng.getState();

    expect(api.getFreeAgents()).toEqual([]);
    expect(api.makeContractOffer(player.id, 1, 1).accepted).toBe(false);
    expect(api.skipOffseasonPhase()?.currentPhase).toBe('qualifying_offers');

    expect(player.contract.years).toBe(2);
    expect(JSON.stringify(api.exportSnapshot())).toBe(before);
    expect(state.rng.getState()).toEqual(rngBefore);
  });

  it('keeps a valid imported unassigned market authoritative at the QO-to-FA boundary', () => {
    startGame(659, 'nym');
    const state = requireState();
    const player = state.players.find((candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB')!;
    player.contract = { ...player.contract, years: 0 };
    player.teamId = '';
    player.rosterStatus = 'INTERNATIONAL';
    player.minorLeagueLevel = 'INTERNATIONAL';
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'qualifying_offers',
      phaseDay: 1,
      totalDay: 18,
    };
    state.freeAgencyMarket = createFreeAgencyMarket(state.season, state.players);
    const originalMarket = state.freeAgencyMarket;

    api.skipOffseasonPhase();

    expect(requireState().freeAgencyMarket).toBe(originalMarket);
    expect(requireState().rosterStates.has('')).toBe(false);
  });

  it('migrates the authentic compact v33 Season 10 fixture through one clocked offseason and save/reload without fabricated history', () => {
    const fixture = JSON.parse(readFileSync(
      new URL('../../../../packages/contracts/tests/fixtures/save/v33/season10.json', import.meta.url),
      'utf8',
    )) as unknown;
    expect(api.importSnapshot(fixture).success).toBe(true);
    const state = requireState();
    const player = state.players[0]!;
    const playerId = player.id;
    const playerName = `${player.firstName} ${player.lastName}`;
    expect(state.season).toBe(10);
    expect(player.contract.years).toBe(1);

    state.phase = 'offseason';
    state.day = 1;
    state.offseasonState = null;
    api.advanceOffseason();

    expect(requireState().players.find((candidate) => candidate.id === playerId)?.contract.years).toBe(0);
    expect(`${requireState().players[0]!.firstName} ${requireState().players[0]!.lastName}`).toBe(playerName);
    expect(requireState().news.filter((item) => item.id === 'contract-clock-live-10')).toHaveLength(1);

    const saved = api.exportSnapshot();
    expect(api.importSnapshot(saved).success).toBe(true);
    api.advanceOffseason();
    expect(requireState().players.find((candidate) => candidate.id === playerId)?.contract.years).toBe(0);
    expect(requireState().news.filter((item) => item.id === 'contract-clock-live-10')).toHaveLength(1);
  });

  it('keeps Draft and IFA route views pure when fresh-save scaffolding is missing', () => {
    startGame(655, 'nym');
    const state = requireState();
    state.draftState = {
      ...state.draftState,
      pickOwnership: [],
      signability: [],
      scoutingReports: [],
      bigBoards: [],
    };
    state.internationalScoutingState = {
      ...state.internationalScoutingState,
      season: state.season,
      budgets: new Map(),
      ifaPool: [],
      scoutingHistory: new Map(),
    };
    state.scoutConflicts = [];
    const before = JSON.stringify(api.exportSnapshot());

    const draft = api.getDraftClass();
    const ifa = api.getIFAPool();
    const tradeInventory = api.getTradeAssetInventory('nym');

    expect(draft).toBeNull();
    expect(ifa.prospects.length).toBeGreaterThan(0);
    expect(tradeInventory.draftPicks.length).toBeGreaterThan(0);
    expect(JSON.stringify(api.exportSnapshot()) === before).toBe(true);
    expect(requireState().draftState.pickOwnership).toEqual([]);
    expect(requireState().internationalScoutingState.budgets.size).toBe(0);
    expect(requireState().scoutConflicts).toEqual([]);
  });

  it('rolls back lazy Draft and IFA initialization for rejected actions', () => {
    startGame(656, 'nym');
    let state = requireState();
    state.draftState = {
      ...state.draftState,
      pickOwnership: [],
      signability: [],
      scoutingReports: [],
      bigBoards: [],
    };
    const beforeDraftRejects = JSON.stringify(api.exportSnapshot());

    expect(api.scoutDraftPlayer('missing-prospect').success).toBe(false);
    expect(api.toggleDraftBigBoard('missing-prospect').success).toBe(false);
    expect(api.signDraftPick('missing-prospect', 1).success).toBe(false);
    expect(api.makeDraftPick('missing-prospect').success).toBe(false);
    expect(JSON.stringify(api.exportSnapshot())).toBe(beforeDraftRejects);

    state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'international_signing',
    };
    state.internationalScoutingState = {
      ...state.internationalScoutingState,
      season: state.season,
      budgets: new Map(),
      ifaPool: [],
      scoutingHistory: new Map(),
    };
    const beforeIFARejects = JSON.stringify(api.exportSnapshot());

    expect(api.scoutIFAPlayer('missing-prospect').success).toBe(false);
    expect(JSON.stringify(api.exportSnapshot()) === beforeIFARejects).toBe(true);
    expect(api.signIFAPlayer('missing-prospect', 1).success).toBe(false);
    expect(JSON.stringify(api.exportSnapshot()) === beforeIFARejects).toBe(true);
    expect(api.tradeIFAPoolSpace('missing-team', -1).success).toBe(false);
    expect(JSON.stringify(api.exportSnapshot()) === beforeIFARejects).toBe(true);
  });

  it('adds postseason consequences before recording season history', () => {
    startGame(987, 'nym');
    const state = requireState();
    state.phase = 'playoffs';
    state.news = [];
    state.briefingQueue = [];
    state.seasonHistory = [];
    state.playoffBracket = {
      seeds: [
        { teamId: 'nym', seed: 1, wins: 101, losses: 61, league: 'AL', divisionWinner: true },
        { teamId: 'lax', seed: 1, wins: 98, losses: 64, league: 'NL', divisionWinner: true },
      ],
      currentRound: 'WORLD_SERIES',
      currentRoundSeries: [
        {
          id: 'WS-1',
          round: 'WORLD_SERIES',
          league: 'MLB',
          bestOf: 7,
          higherSeed: { teamId: 'nym', seed: 1, wins: 101, losses: 61, league: 'AL', divisionWinner: true },
          lowerSeed: { teamId: 'lax', seed: 1, wins: 98, losses: 64, league: 'NL', divisionWinner: true },
          games: [],
          higherSeedWins: 4,
          lowerSeedWins: 2,
          leaderSummary: 'NYT won 4-2',
          status: 'complete',
          deficitReached: null,
          deficitTeamId: null,
          winnerId: 'nym',
          loserId: 'lax',
        },
      ],
      completedRounds: [{
        round: 'WORLD_SERIES',
        series: [{
          id: 'WS-1',
          round: 'WORLD_SERIES',
          league: 'MLB',
          bestOf: 7,
          higherSeed: { teamId: 'nym', seed: 1, wins: 101, losses: 61, league: 'AL', divisionWinner: true },
          lowerSeed: { teamId: 'lax', seed: 1, wins: 98, losses: 64, league: 'NL', divisionWinner: true },
          games: [],
          higherSeedWins: 4,
          lowerSeedWins: 2,
          leaderSummary: 'NYT won 4-2',
          status: 'complete',
          deficitReached: null,
          deficitTeamId: null,
          winnerId: 'nym',
          loserId: 'lax',
        }],
      }],
      series: [
        { winnerId: 'nym', loserId: 'lax', winnerWins: 4, loserWins: 2, games: [], round: 'WORLD_SERIES' },
      ],
      champion: 'nym',
      runnerUp: 'lax',
    };
    const beforeOwner = api.getOwnerState('nym');

    api.simDay();

    const afterOwner = api.getOwnerState('nym');
    const briefing = api.getBriefing(25).find((item) => item.category === 'news');
    const history = api.getSeasonHistory();
    const playoffNews = api.getNews(25).find((item) => item.category === 'playoff');

    expect(playoffNews).toBeTruthy();
    expect(briefing).toBeTruthy();
    expect(history[0]?.keyMoments.length).toBeGreaterThan(0);
    expect(afterOwner?.patience).toBeGreaterThan(beforeOwner?.patience ?? 0);
  });

  it('emits retirement consequences before offseason rollover removes players', () => {
    startGame(222, 'nym');
    const state = requireState();
    const userVeterans = state.players
      .filter((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB');
    for (const veteran of userVeterans) {
      veteran.age = 45;
      veteran.overallRating = 390;
      veteran.personality.leadership = 88;
      if (veteran.pitcherAttributes) {
        veteran.pitcherAttributes.stamina = 40;
      } else {
        veteran.hitterAttributes.durability = 40;
      }
    }

    state.phase = 'offseason';
    state.news = [];
    state.briefingQueue = [];
    state.offseasonState = {
      ...createOffseasonState(state.season),
      completed: true,
    };
    api.startNextSeason();

    const retirementNews = api.getNews(25).find((item) => item.category === 'roster_move');
    const retirementBriefing = api.getBriefing(25).find((item) => item.category === 'news' && item.relatedTeamIds.includes('nym'));

    expect(retirementNews).toBeTruthy();
    expect(retirementBriefing).toBeTruthy();
  });

  it('records AI tender decisions once and removes non-tendered players from team control', () => {
    startGame(333, 'nym');
    const state = requireState();
    const [cutCandidate, keepCandidate] = state.players
      .filter((player) => player.teamId === 'bos' && player.rosterStatus === 'MLB')
      .slice(0, 2);

    expect(cutCandidate).toBeTruthy();
    expect(keepCandidate).toBeTruthy();

    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'arbitration',
      phaseDay: 7,
      totalDay: 10,
    };

    state.serviceTime.set(cutCandidate!.id, 4);
    state.serviceTime.set(keepCandidate!.id, 4);
    cutCandidate!.serviceTimeDays = 4 * 172;
    keepCandidate!.serviceTimeDays = 4 * 172;
    cutCandidate!.overallRating = 120;
    cutCandidate!.contract.annualSalary = 20;
    keepCandidate!.overallRating = 320;
    keepCandidate!.contract.annualSalary = 2;

    const afterEntry = api.advanceOffseason();
    expect(afterEntry?.currentPhase).toBe('tender_nontender');

    const nonTendered = requireState().offseasonState?.phaseResults.nonTenderedPlayers ?? [];
    const tendered = requireState().offseasonState?.phaseResults.tenderedPlayers ?? [];
    expect(nonTendered).toContain(cutCandidate!.id);
    expect(tendered).toContain(keepCandidate!.id);

    const releasedPlayer = requireState().players.find((player) => player.id === cutCandidate!.id);
    expect(releasedPlayer?.teamId).toBe('');
    expect(releasedPlayer?.rosterStatus).toBe('INTERNATIONAL');
    expect(releasedPlayer?.contract.years).toBe(0);
    expect(requireState().rosterStates.get('bos')?.mlbRoster).not.toContain(cutCandidate!.id);
    expect(requireState().rosterStates.get('bos')?.fortyManRoster).not.toContain(cutCandidate!.id);

    api.advanceOffseason();
    expect(requireState().offseasonState?.phaseResults.nonTenderedPlayers).toEqual(nonTendered);
    expect(requireState().offseasonState?.phaseResults.tenderedPlayers).toEqual(tendered);
  });

  it('records arbitration results and exposes formatted transaction groups for the offseason ledger', () => {
    startGame(336, 'nym');
    const state = requireState();
    const [arbCandidate] = state.players
      .filter((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB')
      .slice(0, 1);

    expect(arbCandidate).toBeTruthy();

    arbCandidate!.firstName = 'Juan';
    arbCandidate!.lastName = 'Soto';
    arbCandidate!.contract.annualSalary = 9.4;
    state.serviceTime.set(arbCandidate!.id, 4);
    arbCandidate!.serviceTimeDays = 4 * 172;

    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'arbitration',
      phaseDay: 7,
      totalDay: 10,
    };

    const result = api.advanceOffseason();
    const formatted = api.getOffseasonState() as {
      phaseResults: { arbitrationResolved: Array<{ playerId: string; newSalary: number }> };
      transactionGroups: Array<{ phase: string; rows: Array<{ summary: string; tone: string }> }>;
    };
    const arbitrationResult = formatted.phaseResults.arbitrationResolved.find(
      (entry) => entry.playerId === arbCandidate!.id,
    );
    const arbitrationGroup = formatted.transactionGroups.find((group) => group.phase === 'arbitration');
    const userRow = arbitrationGroup?.rows.find((row) => row.summary.includes('Juan Soto'));
    const updatedCandidate = requireState().players.find((player) => player.id === arbCandidate!.id);

    expect(result?.currentPhase).toBe('tender_nontender');
    expect(formatted.phaseResults.arbitrationResolved.length).toBeGreaterThan(0);
    expect(arbitrationResult?.playerId).toBe(arbCandidate!.id);
    expect(arbitrationResult?.newSalary).toBeGreaterThan(0);
    expect(updatedCandidate?.arbitrationHistory).toHaveLength(1);
    expect(updatedCandidate?.arbitrationHistory[0]?.awardedSalary).toBe(arbitrationResult?.newSalary);
    expect(userRow?.summary).toContain('Juan Soto');
    expect(userRow?.tone).toBe('user');
  });

  it('caps completed-season MLB service at 172 days and synchronizes the years mirror exactly once', () => {
    startGame(3371, 'nym');
    const state = requireState();
    const mlbPlayer = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB')!;
    const careerMinor = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'AAA')!;
    mlbPlayer.serviceTimeDays = (2 * 172) + 186;
    careerMinor.serviceTimeDays = 0;
    state.serviceTime.set(mlbPlayer.id, 99);
    state.serviceTime.set(careerMinor.id, 4);
    state.minorLeagueState.serviceTimeLedger = [[mlbPlayer.id, 186]];
    state.phase = 'offseason';
    state.offseasonState = null;

    api.advanceOffseason();
    const first = requireState().players.find((player) => player.id === mlbPlayer.id)!;
    expect(first.serviceTimeDays).toBe((2 * 172) + 172);
    expect(requireState().serviceTime.get(first.id)).toBe(3);
    expect(requireState().serviceTime.get(careerMinor.id)).toBe(0);
    expect(requireState().offseasonState?.serviceTimeReconciled).toBe(true);

    api.advanceOffseason();
    expect(requireState().players.find((player) => player.id === mlbPlayer.id)?.serviceTimeDays)
      .toBe((2 * 172) + 172);
  });

  it('persists one filing and exchange docket before applying the retained hearing award', () => {
    startGame(3372, 'nym');
    const state = requireState();
    const candidate = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB')!;
    candidate.firstName = 'Docket';
    candidate.lastName = 'Proof';
    candidate.serviceTimeDays = 4 * 172;
    state.serviceTime.set(candidate.id, 1);
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'arbitration',
      phaseDay: 1,
      totalDay: 4,
    };
    const priorSalary = candidate.contract.annualSalary;

    const filing = api.advanceOffseason()!;
    const filed = filing.phaseResults.arbitrationDocket.find((entry) => entry.playerId === candidate.id)!;
    expect(filing.phaseDay).toBe(2);
    expect(filed).toMatchObject({ resolved: false, yearsOfService: 4 });
    expect(api.getOffseasonState()?.arbitrationCases.find((entry) => entry.playerId === candidate.id)?.stage)
      .toBe('filing');
    expect(requireState().players.find((player) => player.id === candidate.id)?.contract.annualSalary).toBe(priorSalary);

    const filingSnapshot = structuredClone(api.exportSnapshot());
    api.advanceOffseason();
    expect(api.getOffseasonState()?.arbitrationCases.find((entry) => entry.playerId === candidate.id)?.stage)
      .toBe('exchange');
    api.advanceOffseason();
    api.advanceOffseason();
    const hearing = api.advanceOffseason()!;
    expect(hearing.phaseResults.arbitrationResolved).toEqual([]);
    expect(api.getOffseasonState()?.arbitrationCases.find((entry) => entry.playerId === candidate.id)?.stage)
      .toBe('hearing');

    const resolved = api.advanceOffseason()!;
    const result = resolved.phaseResults.arbitrationResolved.find((entry) => entry.playerId === candidate.id)!;
    const resolvedDocket = resolved.phaseResults.arbitrationDocket.find((entry) => entry.playerId === candidate.id)!;
    expect(resolvedDocket.resolved).toBe(true);
    expect(result.newSalary).toBe(resolvedDocket.awardedSalary);
    expect(result.newSalary).toBeGreaterThanOrEqual(priorSalary);
    expect(requireState().players.find((player) => player.id === candidate.id)?.contract)
      .toMatchObject({ years: 1, annualSalary: result.newSalary, totalValue: result.newSalary });

    expect(api.importSnapshot(filingSnapshot).success).toBe(true);
    api.advanceOffseason();
    api.advanceOffseason();
    api.advanceOffseason();
    api.advanceOffseason();
    expect(api.advanceOffseason()?.phaseResults.arbitrationDocket.find((entry) => entry.playerId === candidate.id))
      .toEqual(resolvedDocket);
  });

  it('keeps arbitration docket and RNG identical when only the user-team designation changes', () => {
    startGame(3373, 'nym');
    const state = requireState();
    for (const teamId of ['nym', 'bos']) {
      const candidate = state.players.find((player) => player.teamId === teamId && player.rosterStatus === 'MLB')!;
      candidate.serviceTimeDays = 4 * 172;
      state.serviceTime.set(candidate.id, 0);
    }
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'arbitration',
      phaseDay: 1,
      totalDay: 4,
    };
    const baseline = structuredClone(api.exportSnapshot()) as ReturnType<typeof api.exportSnapshot> & { userTeamId: string };

    api.advanceOffseason();
    const userDocket = structuredClone(requireState().offseasonState?.phaseResults.arbitrationDocket);
    const userRng = requireState().rng.getState();

    const cpuDesignation = structuredClone(baseline);
    cpuDesignation.userTeamId = 'bos';
    expect(api.importSnapshot(cpuDesignation).success).toBe(true);
    api.advanceOffseason();
    expect(requireState().offseasonState?.phaseResults.arbitrationDocket).toEqual(userDocket);
    expect(requireState().rng.getState()).toEqual(userRng);
  });

  it('normalizes a legacy mid-arbitration save without fabricating earlier docket beats', () => {
    startGame(3374, 'nym');
    const state = requireState();
    const candidate = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB')!;
    candidate.serviceTimeDays = 4 * 172;
    state.serviceTime.set(candidate.id, 4);
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'arbitration',
      phaseDay: 3,
      totalDay: 6,
    };
    const legacy = structuredClone(api.exportSnapshot()) as ReturnType<typeof api.exportSnapshot> & {
      offseasonState: {
        serviceTimeReconciled?: boolean;
        phaseResults: {
          arbitrationPrepared?: boolean;
          arbitrationDocket?: unknown[];
          arbitrationResolved: unknown[];
        };
      };
    };
    delete legacy.offseasonState.serviceTimeReconciled;
    delete legacy.offseasonState.phaseResults.arbitrationPrepared;
    delete legacy.offseasonState.phaseResults.arbitrationDocket;

    expect(api.importSnapshot(legacy).success).toBe(true);
    expect(requireState().offseasonState?.phaseResults.arbitrationPrepared).toBe(false);
    expect(requireState().offseasonState?.phaseResults.arbitrationDocket).toEqual([]);
    expect(requireState().offseasonState?.phaseResults.arbitrationResolved).toEqual([]);

    api.advanceOffseason();
    expect(requireState().offseasonState?.phaseResults.arbitrationPrepared).toBe(true);
    expect(requireState().offseasonState?.phaseResults.arbitrationDocket.some((entry) => entry.playerId === candidate.id)).toBe(true);
    expect(requireState().offseasonState?.phaseResults.arbitrationResolved).toEqual([]);
  });

  it('derives an offseason command center checklist with roster and budget warnings', () => {
    startGame(337, 'nym');
    const state = requireState();
    const rosterState = state.rosterStates.get('nym')!;
    const owner = state.ownerState.get('nym')!;
    const userPlayers = state.players.filter((player) => player.teamId === 'nym');

    rosterState.mlbRoster = rosterState.mlbRoster.slice(0, 24);
    owner.annualBudget = 12;
    owner.payrollCap = 10;

    for (const player of userPlayers) {
      if (player.rosterStatus === 'MLB') {
        player.contract.annualSalary = 2;
      }
    }

    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'free_agency',
      phaseDay: 2,
      totalDay: 22,
    };

    const view = api.getOffseasonState() as {
      commandCenter: OffseasonCommandCenterView;
    } | null;

    expect(view?.commandCenter.checklist.map((item) => item.id)).toEqual([
      'arbitration',
      'qualifying_offers',
      'rule5',
      'free_agency',
      'staff',
      'roster',
      'budget',
    ]);
    expect(view?.commandCenter.checklist.find((item) => item.id === 'free_agency')?.status).toBe('attention');
    expect(view?.commandCenter.checklist.find((item) => item.id === 'roster')?.status).toBe('attention');
    expect(view?.commandCenter.checklist.find((item) => item.id === 'budget')?.status).toBe('blocked');
    expect(view?.commandCenter.warnings.some((warning) => warning.id === 'roster-active_roster_under_limit')).toBe(true);
    expect(view?.commandCenter.warnings.some((warning) => warning.id === 'budget-over-cap')).toBe(true);
    expect(view?.commandCenter.projectedOpeningDay.activeRosterCount).toBe(24);
    expect(view?.commandCenter.projectedOpeningDay.activeRosterLimit).toBe(26);
    expect(view?.commandCenter.projectedOpeningDay.rosterHoleCount).toBe(2);
    expect(view?.commandCenter.projectedOpeningDay.payrollSpace).toBeLessThan(0);
  });

  it('uses the frozen phase salary for the command-center QO eligibility projection', () => {
    startGame(3371, 'nym');
    const state = requireState();
    const candidate = state.players.find((player) => (
      player.teamId === 'nym'
      && player.rosterStatus === 'MLB'
      && player.pitcherAttributes == null
    ))!;
    candidate.contract.years = 0;
    candidate.serviceTimeDays = 6 * 172;
    state.serviceTime.set(candidate.id, candidate.serviceTimeDays);
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'free_agency',
      phaseDay: 1,
      totalDay: 20,
      phaseResults: {
        ...createOffseasonState(state.season).phaseResults,
        qualifyingOfferSalary: 1_000,
      },
    };

    const view = api.getOffseasonState() as { commandCenter: OffseasonCommandCenterView } | null;
    const qoChecklist = view?.commandCenter.checklist.find((item) => item.id === 'qualifying_offers');

    expect(api.getQualifyingOfferEligible()).toEqual([]);
    expect(qoChecklist?.detail).toBe('No qualifying-offer decisions remain.');
  });

  it('derives offseason market day summaries from major signings and trades', () => {
    startGame(338, 'nym');
    const state = requireState();
    const userStar = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const incomingStar = state.players.find(
      (player) => player.teamId === 'bos' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;

    userStar.firstName = 'Juan';
    userStar.lastName = 'Soto';
    incomingStar.firstName = 'Rafael';
    incomingStar.lastName = 'Devers';
    setHitterProfile(userStar, 'RF', 520, 28, 32);
    setHitterProfile(incomingStar, '3B', 500, 29, 28);

    state.phase = 'offseason';
    state.day = 12;
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'free_agency',
      phaseDay: 4,
      totalDay: 18,
      phaseResults: {
        ...createOffseasonState(state.season).phaseResults,
        freeAgentSignings: [
          {
            playerId: userStar.id,
            teamId: 'nym',
            years: 6,
            annualSalary: 31,
            totalValue: 186,
          },
        ],
      },
    };
    state.tradeState.tradeHistory = [
      {
        id: 'offseason-market-trade',
        fromTeamId: 'bos',
        toTeamId: 'nym',
        offeringAssets: [{ type: 'player', playerId: incomingStar.id }],
        requestingAssets: [{ type: 'player', playerId: userStar.id }],
        fairnessScore: 22,
        summary: 'Boston Noreasters sent Rafael Devers to New York Tycoons for Juan Soto.',
        timestamp: `S${state.season}D11`,
      },
    ];

    const view = api.getOffseasonState() as {
      marketDaySummaries: OffseasonMarketDaySummaryView[];
    } | null;

    expect(view?.marketDaySummaries).toHaveLength(2);
    expect(view?.marketDaySummaries[0]?.category).toBe('signing');
    expect(view?.marketDaySummaries[0]?.headline).toContain('New York Tycoons');
    expect(view?.marketDaySummaries[0]?.detail).toContain('Juan Soto');
    expect(view?.marketDaySummaries[0]?.valueLabel).toBe('$186.0M');
    expect(view?.marketDaySummaries[0]?.tone).toBe('user');
    expect(view?.marketDaySummaries[1]?.category).toBe('trade');
    expect(view?.marketDaySummaries[1]?.headline).toContain('Boston Noreasters');
    expect(view?.marketDaySummaries[1]?.detail).toContain('Rafael Devers');
    expect(view?.marketDaySummaries[1]?.teamIds).toEqual(['bos', 'nym']);
    expect(view?.marketDaySummaries[1]?.playerIds).toEqual([incomingStar.id, userStar.id]);
  });

  it('round-trips every offseason phase through snapshot import without persisting derived views', () => {
    startGame(339, 'nym');

    for (const [index, phaseName] of OFFSEASON_PHASES.entries()) {
      const state = requireState();
      const totalDay = index * 10 + 2;
      state.phase = 'offseason';
      state.day = totalDay;
      state.offseasonState = {
        ...createOffseasonState(state.season),
        currentPhase: phaseName as OffseasonPhase,
        phaseDay: 2,
        totalDay,
      };

      const liveView = api.getOffseasonState();
      const snapshot = api.exportSnapshot() as GameSnapshot;
      const savedOffseasonState = snapshot.offseasonState as Record<string, unknown>;

      expect(liveView?.currentPhase).toBe(phaseName);
      expect(liveView?.commandCenter).toBeTruthy();
      expect(liveView?.marketDaySummaries).toEqual(expect.any(Array));
      expect(savedOffseasonState.currentPhase).toBe(phaseName);
      expect(savedOffseasonState.phaseDay).toBe(2);
      expect(savedOffseasonState.totalDay).toBe(totalDay);
      expect('commandCenter' in savedOffseasonState).toBe(false);
      expect('marketDaySummaries' in savedOffseasonState).toBe(false);

      const imported = api.importSnapshot(snapshot);
      const restoredState = requireState();
      const restoredView = api.getOffseasonState();

      expect(imported.success).toBe(true);
      expect(restoredState.phase).toBe('offseason');
      expect(restoredState.day).toBe(totalDay);
      expect(restoredState.offseasonState?.currentPhase).toBe(phaseName);
      expect(restoredState.offseasonState?.phaseDay).toBe(2);
      expect(restoredState.offseasonState?.totalDay).toBe(totalDay);
      expect(restoredView?.commandCenter).toBeTruthy();
      expect(restoredView?.marketDaySummaries).toEqual(expect.any(Array));
    }
  });

  it('blocks phase-specific offseason actions outside their active phases', () => {
    startGame(340, 'nym');
    const state = requireState();
    const workerApi = api as typeof api & MinorLeagueWorkerApi;
    const candidate = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;

    setHitterProfile(candidate, 'RF', 480, 34, 18);
    candidate.contract.years = 1;
    candidate.developmentTrajectory = 'on_track';
    state.serviceTime.set(candidate.id, 6);
    candidate.serviceTimeDays = 6 * 172;
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'season_review',
      phaseDay: 1,
      totalDay: 1,
    };

    const qualifyingOffersBefore = state.draftState.qualifyingOffers.length;
    const blockedQualifyingOffer = workerApi.issueQualifyingOffer(candidate.id);

    expect(blockedQualifyingOffer.success).toBe(false);
    expect(blockedQualifyingOffer.error).toContain('Qualifying offers phase');
    expect(requireState().draftState.qualifyingOffers).toHaveLength(qualifyingOffersBefore);
    expect(requireState().offseasonState?.phaseResults.qualifyingOffers).toHaveLength(0);

    const blockedQualifyingOfferResolve = workerApi.resolveQualifyingOffers();

    expect(blockedQualifyingOfferResolve.resolved).toHaveLength(0);
    expect((blockedQualifyingOfferResolve as { error?: string }).error).toContain('Qualifying offers phase');

    const coachMarketTarget = workerApi.getCoachMarket()[0]!;
    const staffBefore = workerApi.getCoachingStaff('nym').map((coach) => coach.id);
    requireState().offseasonState = {
      ...requireState().offseasonState!,
      currentPhase: 'free_agency',
      phaseDay: 1,
      totalDay: 18,
    };

    const blockedCoachHire = workerApi.hireCoach(coachMarketTarget.id);

    expect(blockedCoachHire.success).toBe(false);
    expect(blockedCoachHire.error).toContain('Coaching changes phase');
    expect(workerApi.getCoachingStaff('nym').map((coach) => coach.id)).toEqual(staffBefore);
    expect(requireState().offseasonState?.phaseResults.coachChanges).toHaveLength(0);

    const ifaBudgetBefore = { ...requireState().internationalScoutingState.budgets.get('nym')! };
    const blockedIFATrade = workerApi.tradeIFAPoolSpace('bos', 0.25);

    expect(blockedIFATrade.success).toBe(false);
    expect(blockedIFATrade.error).toContain('International signing phase');
    expect(requireState().internationalScoutingState.budgets.get('nym')).toMatchObject(ifaBudgetBefore);
  });

  it('applies holdout service-time, morale, and ticker effects when an arbitration holdout triggers', () => {
    let observed:
      | {
          holdoutDays: number;
          moraleHit: number;
          serviceTimeDays: number;
          mappedServiceTime: number | undefined;
          moraleScore: number | undefined;
          holdoutTicker: string | undefined;
        }
      | null = null;

    for (let seed = 500; seed < 520; seed += 1) {
      startGame(seed, 'nym');
      const state = requireState();
      const arbCandidate = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB');
      const baselineMorale = state.playerMorale.get(arbCandidate!.id);

      expect(arbCandidate).toBeTruthy();
      expect(baselineMorale).toBeTruthy();

      arbCandidate!.firstName = 'Rafael';
      arbCandidate!.lastName = 'Devers';
      arbCandidate!.contract.annualSalary = 7.8;
      arbCandidate!.serviceTimeDays = 690;
      state.serviceTime.set(arbCandidate!.id, 4);
      state.playerMorale.set(arbCandidate!.id, {
        ...baselineMorale!,
        score: 20,
        trend: 'falling',
        summary: 'Contract tension is building.',
      });

      state.phase = 'offseason';
      state.offseasonState = {
        ...createOffseasonState(state.season),
        currentPhase: 'arbitration',
        phaseDay: 7,
        totalDay: 10,
      };

      api.advanceOffseason();

      const updatedState = requireState();
      const updatedCandidate = updatedState.players.find((player) => player.id === arbCandidate!.id)!;
      const holdoutTicker = updatedState.tickerFeed.find((entry) =>
        entry.category === 'arbitration' && entry.text.includes('spring reporting') && entry.text.includes('Rafael Devers'),
      );

      if (updatedCandidate.holdoutState) {
        observed = {
          holdoutDays: updatedCandidate.holdoutState.holdoutDays,
          moraleHit: updatedCandidate.holdoutState.moraleHit,
          serviceTimeDays: updatedCandidate.serviceTimeDays,
          mappedServiceTime: updatedState.serviceTime.get(updatedCandidate.id),
          moraleScore: updatedState.playerMorale.get(updatedCandidate.id)?.score,
          holdoutTicker: holdoutTicker?.text,
        };
        break;
      }
    }

    expect(observed).toBeTruthy();
    expect(observed?.serviceTimeDays).toBe(690);
    expect(observed?.mappedServiceTime).toBe(4);
    expect(observed?.moraleScore).toBe(20 - observed!.moraleHit);
    expect(observed?.holdoutTicker).toContain('Rafael Devers');

    const heldPlayer = requireState().players.find((player) => player.firstName === 'Rafael' && player.lastName === 'Devers')!;
    requireState().offseasonState = {
      ...requireState().offseasonState!,
      currentPhase: 'spring_training',
      phaseDay: 1,
    };
    api.advanceOffseason();
    expect(heldPlayer.serviceTimeDays).toBe(690 - observed!.holdoutDays);
    expect(heldPlayer.holdoutState).toBeNull();
  });

  it('publishes arbitration broadcast news and signature moments when hearings resolve', () => {
    startGame(433, 'nym');
    const state = requireState();
    const arbCandidate = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB');

    expect(arbCandidate).toBeTruthy();

    arbCandidate!.firstName = 'Juan';
    arbCandidate!.lastName = 'Soto';
    arbCandidate!.contract.annualSalary = 7.8;
    arbCandidate!.serviceTimeDays = 690;
    state.serviceTime.set(arbCandidate!.id, 4);
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'arbitration',
      phaseDay: 7,
      totalDay: 10,
    };
    state.news = [];

    api.advanceOffseason();

    const updatedState = requireState();
    const moments = updatedState.playerMoments.get(arbCandidate!.id) ?? [];
    const pressConference = updatedState.news.find((item) =>
      item.id === `arbitration-result-${updatedState.season}-${arbCandidate!.id}`
      && item.category === 'arbitration',
    );

    expect(moments.some((moment) =>
      ['arbitration_win', 'arbitration_loss'].includes(moment.type),
    )).toBe(true);
    expect(pressConference).toBeTruthy();
    expect(pressConference?.headline).toContain('Juan Soto');
  });

  it('fast-forwards AI free agency, records rival signings, and emits press coverage', () => {
    startGame(334, 'nym');
    const state = requireState();
    const target = state.players.find(
      (player) => player.teamId === 'por' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;

    state.phase = 'offseason';
    state.news = [];
    state.briefingQueue = [];
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'free_agency',
      phaseDay: 1,
      totalDay: 16,
    };

    for (const player of state.players) {
      player.contract.years = 2;
      player.contract.annualSalary = player.teamId === 'bos' ? 0.5 : 200;
    }

    target.teamId = '';
    target.contract.years = 0;
    target.contract.annualSalary = 0.5;
    target.age = 27;
    target.overallRating = 430;
    target.hitterAttributes = {
      contact: 420,
      power: 430,
      eye: 390,
      speed: 250,
      defense: 300,
      durability: 360,
    };
    // The test begins after free-agency entry, so provide the persisted
    // canonical market that entry would have created.
    state.freeAgencyMarket = createFreeAgencyMarket(state.season, state.players);
    for (const team of TEAMS) {
      if (team.id !== 'nym' && team.id !== 'bos') setCanonicalMlbCount(team.id, 26);
    }
    setCanonicalMlbCount('bos', 25);

    const afterSkip = api.skipOffseasonPhase();
    const signing = requireState().offseasonState?.phaseResults.freeAgentSignings.find(
      (entry) => entry.playerId === target.id,
    );

    expect(afterSkip?.currentPhase).toBe('draft');
    expect(requireState().freeAgencyMarket?.day).toBe(60);
    expect(signing?.teamId).toBe('bos');
    expect(requireState().players.find((player) => player.id === target.id)?.teamId).toBe('bos');

    const signingNews = api.getNews(25).find(
      (item) => item.category === 'signing' && item.relatedPlayerIds.includes(target.id),
    );
    const signingBriefing = api.getBriefing(25).find(
      (item) => item.category === 'news' && item.relatedPlayerIds.includes(target.id),
    );
    expect(signingNews).toBeTruthy();
    expect(signingBriefing).toBeTruthy();
  });

  it('records rich season recaps and finalizes retirements into the same history entry', () => {
    startGame(335, 'nym');
    const state = requireState();
    const standingsRecords = (state.seasonState.standings as unknown as {
      records: Map<string, {
        teamId: string;
        wins: number;
        losses: number;
        runsScored: number;
        runsAllowed: number;
        streak: number;
        last10: [number, number];
        divisionWins: number;
        divisionLosses: number;
      }>;
    }).records;
    const alMvp = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const alRbi = state.players.find(
      (player) => player.teamId === 'orl' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const alAvg = state.players.find(
      (player) => player.teamId === 'cha' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const nlMvp = state.players.find(
      (player) => player.teamId === 'lax' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const nlHr = state.players.find(
      (player) => player.teamId === 'atl' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const nlAvg = state.players.find(
      (player) => player.teamId === 'phi' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const alCy = state.players.find(
      (player) => player.teamId === 'bos' && player.rosterStatus === 'MLB' && player.pitcherAttributes != null,
    )!;
    const alK = state.players.find(
      (player) => player.teamId === 'cle' && player.rosterStatus === 'MLB' && player.pitcherAttributes != null,
    )!;
    const alW = state.players.find(
      (player) => player.teamId === 'sea' && player.rosterStatus === 'MLB' && player.pitcherAttributes != null,
    )!;
    const nlCy = state.players.find(
      (player) => player.teamId === 'sdg' && player.rosterStatus === 'MLB' && player.pitcherAttributes != null,
    )!;
    const nlK = state.players.find(
      (player) => player.teamId === 'mil' && player.rosterStatus === 'MLB' && player.pitcherAttributes != null,
    )!;
    const nlW = state.players.find(
      (player) => player.teamId === 'sfb' && player.rosterStatus === 'MLB' && player.pitcherAttributes != null,
    )!;
    const alRoy = state.players.find(
      (player) => player.teamId === 'bal' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const nlRoy = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;

    alRoy.age = 22;
    nlRoy.age = 22;
    alMvp.overallRating = 430;
    standingsRecords.set('nym', {
      teamId: 'nym',
      wins: 99,
      losses: 63,
      runsScored: 845,
      runsAllowed: 699,
      streak: 4,
      last10: [7, 3],
      divisionWins: 52,
      divisionLosses: 24,
    });
    standingsRecords.set('lax', {
      teamId: 'lax',
      wins: 98,
      losses: 64,
      runsScored: 832,
      runsAllowed: 708,
      streak: 2,
      last10: [6, 4],
      divisionWins: 49,
      divisionLosses: 27,
    });
    standingsRecords.set('bos', {
      teamId: 'bos',
      wins: 92,
      losses: 70,
      runsScored: 801,
      runsAllowed: 733,
      streak: 1,
      last10: [5, 5],
      divisionWins: 46,
      divisionLosses: 30,
    });

    state.phase = 'playoffs';
    state.news = [{
      id: 'trade-blockbuster',
      headline: 'Deadline blockbuster reshaped the race',
      body: 'A franchise-caliber player moved in a pennant-race swing.',
      priority: 1,
      category: 'trade',
      timestamp: 'S1D120',
      relatedPlayerIds: [alMvp.id],
      relatedTeamIds: ['nym', 'lax'],
      read: false,
    }];
    state.briefingQueue = [];
    state.seasonHistory = [];
    state.playoffBracket = {
      seeds: [
        { teamId: 'nym', seed: 1, wins: 99, losses: 63, league: 'AL', divisionWinner: true },
        { teamId: 'lax', seed: 1, wins: 98, losses: 64, league: 'NL', divisionWinner: true },
      ],
      currentRound: 'WORLD_SERIES',
      currentRoundSeries: [
        {
          id: 'WS-1',
          round: 'WORLD_SERIES',
          league: 'MLB',
          bestOf: 7,
          higherSeed: { teamId: 'nym', seed: 1, wins: 99, losses: 63, league: 'AL', divisionWinner: true },
          lowerSeed: { teamId: 'lax', seed: 1, wins: 98, losses: 64, league: 'NL', divisionWinner: true },
          games: [],
          higherSeedWins: 4,
          lowerSeedWins: 2,
          leaderSummary: 'NYT won 4-2',
          status: 'complete',
          deficitReached: null,
          deficitTeamId: null,
          winnerId: 'nym',
          loserId: 'lax',
        },
      ],
      completedRounds: [{
        round: 'WORLD_SERIES',
        series: [{
          id: 'WS-1',
          round: 'WORLD_SERIES',
          league: 'MLB',
          bestOf: 7,
          higherSeed: { teamId: 'nym', seed: 1, wins: 99, losses: 63, league: 'AL', divisionWinner: true },
          lowerSeed: { teamId: 'lax', seed: 1, wins: 98, losses: 64, league: 'NL', divisionWinner: true },
          games: [],
          higherSeedWins: 4,
          lowerSeedWins: 2,
          leaderSummary: 'NYT won 4-2',
          status: 'complete',
          deficitReached: null,
          deficitTeamId: null,
          winnerId: 'nym',
          loserId: 'lax',
        }],
      }],
      series: [
        { winnerId: 'nym', loserId: 'lax', winnerWins: 4, loserWins: 2, games: [], round: 'WORLD_SERIES' },
      ],
      champion: 'nym',
      runnerUp: 'lax',
    };
    state.seasonState.playerSeasonStats.clear();
    for (const [playerId, stats] of new Map([
      [alMvp.id, createPlayerStats({ playerId: alMvp.id, teamId: 'nym', pa: 680, ab: 600, hits: 198, hr: 44, rbi: 131, bb: 70, runs: 118 })],
      [alRbi.id, createPlayerStats({ playerId: alRbi.id, teamId: 'orl', pa: 650, ab: 590, hits: 177, hr: 35, rbi: 122, bb: 58, runs: 99 })],
      [alAvg.id, createPlayerStats({ playerId: alAvg.id, teamId: 'cha', pa: 620, ab: 540, hits: 189, hr: 18, rbi: 84, bb: 63, runs: 95 })],
      [nlMvp.id, createPlayerStats({ playerId: nlMvp.id, teamId: 'lax', pa: 670, ab: 595, hits: 191, hr: 39, rbi: 121, bb: 72, runs: 117 })],
      [nlHr.id, createPlayerStats({ playerId: nlHr.id, teamId: 'atl', pa: 640, ab: 580, hits: 171, hr: 41, rbi: 111, bb: 60, runs: 101 })],
      [nlAvg.id, createPlayerStats({ playerId: nlAvg.id, teamId: 'phi', pa: 610, ab: 530, hits: 183, hr: 21, rbi: 76, bb: 64, runs: 92 })],
      [alCy.id, createPlayerStats({ playerId: alCy.id, teamId: 'bos', ip: 650, earnedRuns: 68, strikeouts: 236, walks: 47, hitsAllowed: 144, wins: 18, losses: 6 })],
      [alK.id, createPlayerStats({ playerId: alK.id, teamId: 'cle', ip: 620, earnedRuns: 73, strikeouts: 251, walks: 54, hitsAllowed: 150, wins: 16, losses: 7 })],
      [alW.id, createPlayerStats({ playerId: alW.id, teamId: 'sea', ip: 640, earnedRuns: 79, strikeouts: 218, walks: 52, hitsAllowed: 156, wins: 20, losses: 5 })],
      [nlCy.id, createPlayerStats({ playerId: nlCy.id, teamId: 'sdg', ip: 660, earnedRuns: 66, strikeouts: 244, walks: 45, hitsAllowed: 140, wins: 19, losses: 4 })],
      [nlK.id, createPlayerStats({ playerId: nlK.id, teamId: 'mil', ip: 625, earnedRuns: 71, strikeouts: 246, walks: 50, hitsAllowed: 148, wins: 17, losses: 6 })],
      [nlW.id, createPlayerStats({ playerId: nlW.id, teamId: 'sfb', ip: 635, earnedRuns: 74, strikeouts: 221, walks: 55, hitsAllowed: 152, wins: 21, losses: 5 })],
      [alRoy.id, createPlayerStats({ playerId: alRoy.id, teamId: 'bal', pa: 570, ab: 510, hits: 158, hr: 24, rbi: 82, bb: 48, runs: 77 })],
      [nlRoy.id, createPlayerStats({ playerId: nlRoy.id, teamId: 'nym', pa: 560, ab: 500, hits: 152, hr: 20, rbi: 74, bb: 45, runs: 71 })],
    ])) {
      state.seasonState.playerSeasonStats.set(playerId, stats);
    }

    api.simDay();

    const recap = api.getSeasonHistory()[0]!;
    const archive = api.getSeasonArchive(1)!;
    expect(recap.championTeamId).toBe('nym');
    expect(recap.runnerUpTeamId).toBe('lax');
    expect(recap.worldSeriesRecord).toBe('4-2');
    expect(recap.awards).toHaveLength(10);
    expect(recap.statLeaders.hr.length).toBe(3);
    expect(recap.statLeaders.w[0]?.playerId).toBe(nlW.id);
    expect(recap.blockbusterTrades[0]?.headline).toBe('Deadline blockbuster reshaped the race');
    expect(recap.userSeason?.teamId).toBe('nym');
    expect(recap.userSeason?.playoffResult).toContain('Champion');
    expect(archive.awards).toHaveLength(10);
    expect(archive.standings.find((entry) => entry.teamId === 'nym')?.wins).toBe(99);
    expect(archive.playoffSeries[0]?.winnerTeamId).toBe('nym');
    expect(archive.transactions[0]?.headline).toBe('Deadline blockbuster reshaped the race');
    expect(archive.financials.some((entry) => entry.teamId === 'nym')).toBe(true);

    for (const veteran of state.players.filter((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB').slice(0, 4)) {
      veteran.age = 45;
      veteran.overallRating = 390;
      state.serviceTime.set(veteran.id, 12);
      if (veteran.pitcherAttributes) {
        veteran.pitcherAttributes.stamina = 40;
      } else {
        veteran.hitterAttributes.durability = 40;
      }
    }

    state.offseasonState = {
      ...createOffseasonState(state.season),
      phaseResults: {
        ...createOffseasonState(state.season).phaseResults,
        freeAgentSignings: [{
          playerId: alMvp.id,
          teamId: 'nym',
          years: 7,
          annualSalary: 32,
          totalValue: 224,
        }],
        draftPicks: [{
          round: 1,
          pickNumber: 8,
          teamId: 'nym',
          playerId: 'draft-1',
          playerName: 'Calvin Velez',
          position: 'SS',
          scoutingGrade: 71,
          origin: 'college',
        }],
        ifaSignings: [{
          playerId: 'ifa-1',
          teamId: 'nym',
          playerName: 'Luis Encarnacion',
          position: 'CF',
          country: 'Dominican Republic',
          bonusAmount: 4.2,
        }],
        retiredPlayers: [],
      },
      completed: true,
    };

    api.proceedToOffseason();
    api.startNextSeason();

    const finalized = api.getSeasonHistory().find((entry) => entry.season === 1)!;
    const finalizedArchive = api.getSeasonArchive(1)!;
    expect(finalized.notableRetirements.length).toBeGreaterThan(0);
    expect(finalized.notableRetirements[0]?.seasonsPlayed).toBeGreaterThanOrEqual(10);
    expect(finalizedArchive.draftClass[0]?.playerName).toBe('Calvin Velez');
    expect(finalizedArchive.transactions.some((entry) => entry.playerIds.includes(alMvp.id))).toBe(true);
    expect(finalizedArchive.timelineEvents).toContain('Won the World Series');
  });

  it('compares archived seasons with user-team deltas', () => {
    startGame(336, 'nym');
    const state = requireState();
    state.seasonArchive = [
      {
        season: 1,
        standings: [
          { teamId: 'nym', wins: 88, losses: 74, divisionRank: 2, gamesBack: 5 },
        ],
        playoffSeries: [
          { round: 'CHAMPIONSHIP_SERIES', winnerTeamId: 'hou', loserTeamId: 'nym', result: '4-2' },
        ],
        awards: [],
        statLeaders: {
          hr: [],
          rbi: [],
          avg: [],
          era: [],
          k: [],
          w: [],
        },
        transactions: [],
        draftClass: [],
        financials: [
          { teamId: 'nym', payroll: 210, budget: 228 },
        ],
        userSummary: {
          teamId: 'nym',
          record: '88-74',
          playoffResult: 'Championship Series exit',
          storylines: ['Came up short in October.'],
        },
        timelineEvents: ['Reached the ALCS'],
      },
      {
        season: 2,
        standings: [
          { teamId: 'nym', wins: 97, losses: 65, divisionRank: 1, gamesBack: 0 },
        ],
        playoffSeries: [
          { round: 'WORLD_SERIES', winnerTeamId: 'nym', loserTeamId: 'lax', result: '4-2' },
        ],
        awards: [],
        statLeaders: {
          hr: [],
          rbi: [],
          avg: [],
          era: [],
          k: [],
          w: [],
        },
        transactions: [],
        draftClass: [],
        financials: [
          { teamId: 'nym', payroll: 235, budget: 248 },
        ],
        userSummary: {
          teamId: 'nym',
          record: '97-65',
          playoffResult: 'Champion',
          storylines: ['Closed the season with a title.'],
        },
        timelineEvents: ['Won the World Series'],
      },
    ];

    const comparison = api.compareSeasons(1, 2);

    expect(comparison?.left?.season).toBe(1);
    expect(comparison?.right?.season).toBe(2);
    expect(comparison?.userTeamId).toBe('nym');
    expect(comparison?.deltas.wins).toBe(9);
    expect(comparison?.deltas.payroll).toBe(25);
    expect(comparison?.deltas.budget).toBe(20);
    if (comparison?.right && 'userSummary' in comparison.right) {
      expect(comparison.right.userSummary?.playoffResult).toBe('Champion');
    }
  });

  it('records draft picks with structured detail and auto-advances to the next user turn', () => {
    startGame(338, 'nym');
    const state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'draft',
      phaseDay: 1,
      totalDay: 40,
    };

    const start = api.startDraft() as {
      success: boolean;
      draft: {
        currentPick: { teamId: string; userOnClock: boolean } | null;
        completedPicks: Array<{ playerId: string }>;
        availableProspects: Array<{
          id: string;
          decisionInputs: {
            scoutAccuracy: { label: string; value: number; detail: string };
            disagreement: { label: string; value: number; detail: string };
            makeup: { label: string; value: number; detail: string };
            signability: { label: string; value: number; detail: string };
            risk: { label: string; value: number; detail: string };
            whyThisPick: string;
          };
        }>;
      } | null;
      newPicks: Array<{ playerId: string }>;
    };

    expect(start.success).toBe(true);
    expect(start.draft?.currentPick?.teamId).toBe('nym');
    expect(start.draft?.currentPick?.userOnClock).toBe(true);
    expect(start.draft?.completedPicks.length).toBe(start.newPicks.length);

    const selectedProspectId = start.draft?.availableProspects[0]?.id;
    expect(selectedProspectId).toBeTruthy();
    const decisionInputs = start.draft?.availableProspects[0]?.decisionInputs;
    expect(decisionInputs).toMatchObject({
      scoutAccuracy: { label: expect.any(String), value: expect.any(Number), detail: expect.stringContaining('look') },
      disagreement: { label: expect.any(String), value: expect.any(Number), detail: expect.any(String) },
      makeup: { label: expect.any(String), value: expect.any(Number), detail: expect.any(String) },
      signability: { label: expect.any(String), value: expect.any(Number), detail: expect.any(String) },
      risk: { label: expect.any(String), value: expect.any(Number), detail: expect.any(String) },
      whyThisPick: expect.any(String),
    });
    expect(decisionInputs!.whyThisPick.length).toBeGreaterThan(20);

    const result = api.makeDraftPick(selectedProspectId!) as {
      success: boolean;
      draft: {
        completedPicks: Array<{ playerId: string; playerName: string }>;
      } | null;
      newPicks: Array<{
        teamId: string;
        playerId: string;
        playerName: string;
        position: string;
        scoutingGrade: number;
        origin: string;
      }>;
    };

    expect(result.success).toBe(true);
    expect(result.newPicks[0]?.teamId).toBe('nym');
    expect(requireState().players.find((player) => player.id === result.newPicks[0]?.playerId)?.teamId).toBe('nym');

    const offseasonPick = requireState().offseasonState?.phaseResults.draftPicks.find(
      (entry) => entry.playerId === result.newPicks[0]?.playerId,
    );
    expect(offseasonPick?.position).toBe(result.newPicks[0]?.position);
    expect(offseasonPick?.scoutingGrade).toBe(result.newPicks[0]?.scoutingGrade);
    expect(offseasonPick?.origin).toBe(result.newPicks[0]?.origin);

    const draftGroup = api.getOffseasonState()?.transactionGroups.find((group) => group.phase === 'draft');
    expect(draftGroup?.rows.some((row) => row.summary.includes(result.newPicks[0]!.playerName))).toBe(true);
  });

  it('simulates the remaining draft deterministically and builds a user draft summary', () => {
    startGame(339, 'nym');
    let state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'draft',
      phaseDay: 1,
      totalDay: 40,
    };

    api.startDraft();
    const firstRun = api.simulateRemainingDraft() as {
      success: boolean;
      draft: {
        status: string;
        completedPicks: Array<{ pickNumber: number; teamId: string; playerId: string; scoutingGrade: number }>;
        userDraftClass: { overallGrade: string; picks: Array<{ playerId: string }> } | null;
      } | null;
    };

    const firstSequence = firstRun.draft?.completedPicks.map(
      (pick) => `${pick.pickNumber}:${pick.teamId}:${pick.playerId}:${pick.scoutingGrade}`,
    );

    setState(null);

    startGame(339, 'nym');
    state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'draft',
      phaseDay: 1,
      totalDay: 40,
    };

    api.startDraft();
    const secondRun = api.simulateRemainingDraft() as {
      success: boolean;
      draft: {
        status: string;
        completedPicks: Array<{ pickNumber: number; teamId: string; playerId: string; scoutingGrade: number }>;
        userDraftClass: { overallGrade: string; picks: Array<{ playerId: string }> } | null;
      } | null;
    };

    const secondSequence = secondRun.draft?.completedPicks.map(
      (pick) => `${pick.pickNumber}:${pick.teamId}:${pick.playerId}:${pick.scoutingGrade}`,
    );

    expect(firstRun.success).toBe(true);
    expect(secondRun.success).toBe(true);
    expect(firstSequence).toEqual(secondSequence);
    expect(secondRun.draft?.status).toBe('complete');
    expect(secondRun.draft?.userDraftClass?.overallGrade).toMatch(/^[A-F]/);
    expect(secondRun.draft?.userDraftClass?.picks.length).toBeGreaterThan(0);
  });

  it('keeps remaining draft AI picks stable after user scouting looks', () => {
    startGame(340, 'nym');
    let state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'draft',
      phaseDay: 1,
      totalDay: 40,
    };

    const unscoutedStart = api.startDraft() as {
      success: boolean;
      draft: { availableProspects: Array<{ id: string }> } | null;
    };
    expect(unscoutedStart.success).toBe(true);
    const unscoutedRun = api.simulateRemainingDraft() as {
      success: boolean;
      draft: {
        completedPicks: Array<{ pickNumber: number; teamId: string; playerId: string; scoutingGrade: number }>;
      } | null;
    };
    const unscoutedSequence = unscoutedRun.draft?.completedPicks.map(
      (pick) => `${pick.pickNumber}:${pick.teamId}:${pick.playerId}:${pick.scoutingGrade}`,
    );

    setState(null);

    startGame(340, 'nym');
    state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'draft',
      phaseDay: 1,
      totalDay: 40,
    };

    const scoutedStart = api.startDraft() as {
      success: boolean;
      draft: { availableProspects: Array<{ id: string }> } | null;
    };
    const scoutedProspectId = scoutedStart.draft?.availableProspects[0]?.id;
    expect(scoutedProspectId).toBeTruthy();
    const callCountBeforeScouting = requireState().rng.getState().callCount;
    expect(api.scoutDraftPlayer(scoutedProspectId!)).toMatchObject({ success: true });
    expect(api.scoutDraftPlayer(scoutedProspectId!)).toMatchObject({ success: true });
    expect(requireState().rng.getState().callCount).toBe(callCountBeforeScouting);

    const scoutedRun = api.simulateRemainingDraft() as {
      success: boolean;
      draft: {
        completedPicks: Array<{ pickNumber: number; teamId: string; playerId: string; scoutingGrade: number }>;
      } | null;
    };
    const scoutedSequence = scoutedRun.draft?.completedPicks.map(
      (pick) => `${pick.pickNumber}:${pick.teamId}:${pick.playerId}:${pick.scoutingGrade}`,
    );

    expect(unscoutedRun.success).toBe(true);
    expect(scoutedRun.success).toBe(true);
    expect(scoutedSequence).toEqual(unscoutedSequence);
  });

  it('builds deterministic draft commentary, preview, and post-draft grades without advancing rng state', () => {
    startGame(341, 'nym');
    const state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'draft',
      phaseDay: 1,
      totalDay: 40,
    };

    const workerApi = api as typeof api & {
      getDraftCommentary: (visiblePickCount?: number) => DraftCommentaryView | null;
      getDraftProspectReaction: (prospectId: string) => DraftProspectReactionView | null;
      getDraftPostDraftGrades: () => DraftPostDraftGradesView | null;
      getDraftClass: () => {
        completedPicks: Array<{ id?: string }>;
        availableProspects: Array<{ id: string }>;
      } | null;
    };

    api.startDraft();
    const draft = workerApi.getDraftClass();
    const prospectId = draft?.availableProspects[0]?.id;
    expect(prospectId).toBeTruthy();

    const commentaryCallsBefore = requireState().rng.getState().callCount;
    const firstCommentary = workerApi.getDraftCommentary(draft?.completedPicks.length ?? 0);
    const secondCommentary = workerApi.getDraftCommentary(draft?.completedPicks.length ?? 0);

    expect(secondCommentary).toEqual(firstCommentary);
    expect(requireState().rng.getState().callCount).toBe(commentaryCallsBefore);
    expect(firstCommentary?.entries.length).toBeGreaterThan(0);
    expect(firstCommentary?.buzz.length).toBeGreaterThan(0);

    const previewCallsBefore = requireState().rng.getState().callCount;
    const firstPreview = workerApi.getDraftProspectReaction(prospectId!);
    const secondPreview = workerApi.getDraftProspectReaction(prospectId!);

    expect(secondPreview).toEqual(firstPreview);
    expect(requireState().rng.getState().callCount).toBe(previewCallsBefore);
    expect(firstPreview?.playerId).toBe(prospectId);
    expect(firstPreview?.recommendation).toMatch(/^(sprint|hover|pass)$/);

    api.simulateRemainingDraft();

    const gradesCallsBefore = requireState().rng.getState().callCount;
    const firstGrades = workerApi.getDraftPostDraftGrades();
    const secondGrades = workerApi.getDraftPostDraftGrades();

    expect(secondGrades).toEqual(firstGrades);
    expect(requireState().rng.getState().callCount).toBe(gradesCallsBefore);
    expect(firstGrades?.grades.length).toBeGreaterThan(0);
    expect(firstGrades?.userTeamGrade?.grade).toMatch(/^[A-F]/);
  });

  it('publishes post-draft grades into news and the press room when the draft completes', () => {
    startGame(3412, 'nym');
    const state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'draft',
      phaseDay: 1,
      totalDay: 40,
    };

    api.startDraft();
    const result = api.simulateRemainingDraft() as { success: boolean };
    const news = api.getNews(25);
    const pressRoom = (api as typeof api & {
      getPressRoomFeed: (limit?: number) => Array<{ headline: string; category: string }>;
    }).getPressRoomFeed(25);
    const draftStory = news.find((item) => item.category === 'draft');

    expect(result.success).toBe(true);
    expect(draftStory).toBeDefined();
    expect(draftStory?.headline.toLowerCase()).toContain('draft');
    expect(draftStory?.body.toLowerCase()).toContain('grade');
    expect(pressRoom.some((entry) =>
      entry.category === 'draft' && entry.headline === draftStory?.headline,
    )).toBe(true);
  });

  it('creates a rule 5 protection audit after the amateur draft and lets the user protect an exposed prospect', () => {
    startGame(340, 'nym');
    const state = requireState();
    const candidate = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'AA',
    )!;

    candidate.rule5EligibleAfterSeason = state.season;
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'draft',
      phaseDay: 3,
      totalDay: 40,
    };
    state.rosterStates.set('nym', {
      ...state.rosterStates.get('nym')!,
      fortyManRoster: [],
    });

    const entered = api.advanceOffseason() as {
      currentPhase: string;
      rule5?: { phase: string; eligiblePlayers: Array<{ playerId: string }> };
    } | null;

    expect(entered?.currentPhase).toBe('protection_audit');
    expect(entered?.rule5?.phase).toBe('protection_audit');
    expect(entered?.rule5?.eligiblePlayers.some((player) => player.playerId === candidate.id)).toBe(true);

    const protectedResult = (api as typeof api & {
      toggleRule5Protection: (playerId: string) => { success: boolean };
    }).toggleRule5Protection(candidate.id);
    const protectedView = api.getOffseasonState() as {
      currentPhase: string;
      rule5?: { eligiblePlayers: Array<{ playerId: string }> };
    } | null;

    expect(protectedResult.success).toBe(true);
    expect(protectedView?.rule5?.eligiblePlayers.some((player) => player.playerId === candidate.id)).toBe(false);

    const locked = (api as typeof api & {
      lockRule5Protection: () => { currentPhase: string; rule5?: { phase: string } } | null;
    }).lockRule5Protection();

    expect(locked?.currentPhase).toBe('rule5_draft');
    expect(locked?.rule5?.phase).toBe('rule5_draft');
  });

  it('rolls back lazy Rule 5 draft creation for a rejected pick', () => {
    startGame(3401, 'nym');
    const state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'rule5_draft',
    };
    state.rule5Session = null;
    state.rule5Obligations = [];
    const beforeDraftReject = JSON.stringify(api.exportSnapshot());
    expect(api.makeRule5Pick('missing-player').success).toBe(false);
    expect(JSON.stringify(api.exportSnapshot()) === beforeDraftReject).toBe(true);
  });

  it('blocks demoting active rule 5 players until the offer-back flow resolves', () => {
    startGame(341, 'nym');
    const state = requireState();
    const player = state.players.find(
      (candidate) => candidate.teamId === 'nym' && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
    )!;

    state.rule5Obligations = [
      {
        playerId: player.id,
        originalTeamId: 'bos',
        draftingTeamId: 'nym',
        draftedAfterSeason: state.season,
        status: 'active',
      },
    ];

    const blocked = api.demotePlayerAction(player.id);

    expect(blocked.success).toBe(false);
    expect(blocked.error).toMatch(/rule 5/i);
    expect('flowStateChanged' in blocked && blocked.flowStateChanged).toBe(true);
    expect(state.rule5OfferBackStates[0]).toEqual(expect.objectContaining({
      playerId: player.id,
      originalTeamId: 'bos',
      draftingTeamId: 'nym',
      status: 'pending',
    }));
    const afterFirstBlock = JSON.stringify(api.exportSnapshot());
    const repeatedBlock = api.demotePlayerAction(player.id);
    expect('flowStateChanged' in repeatedBlock && repeatedBlock.flowStateChanged).toBe(false);
    expect(JSON.stringify(api.exportSnapshot())).toBe(afterFirstBlock);

    const resolved = (api as typeof api & {
      resolveRule5OfferBack: (playerId: string, acceptReturn: boolean) => { success: boolean };
    }).resolveRule5OfferBack(player.id, true);

    expect(resolved.success).toBe(true);
    expect(state.rule5Obligations[0]?.status).toBe('returned');
    expect(state.players.find((candidate) => candidate.id === player.id)?.teamId).toBe('bos');
  });

  it('keeps active Rule 5 players on the MLB roster during AI overflow normalization', () => {
    startGame(343, 'nym');
    const state = requireState();
    const teamId = 'bos';
    state.phase = 'regular';
    state.day = 1;

    const rule5Player = state.players.find(
      (candidate) => candidate.teamId === teamId && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
    )!;
    rule5Player.id = 'bos-active-rule5-overflow';
    rule5Player.overallRating = 40;
    rule5Player.serviceTimeDays = 0;
    setHitterProfile(rule5Player, 'RF', 90, 23, 1);

    const extraPlayers = state.players
      .filter((candidate) => candidate.teamId === teamId && candidate.rosterStatus !== 'MLB')
      .slice(0, 31 - state.players.filter((candidate) => candidate.teamId === teamId && candidate.rosterStatus === 'MLB').length);
    expect(extraPlayers.length).toBeGreaterThan(0);
    for (const [index, player] of extraPlayers.entries()) {
      player.rosterStatus = 'MLB';
      player.minorLeagueLevel = null;
      player.overallRating = 100 + index;
    }

    state.rule5Obligations = [{
      playerId: rule5Player.id,
      originalTeamId: 'nym',
      draftingTeamId: teamId,
      draftedAfterSeason: state.season - 1,
      status: 'active',
    }];
    state.rosterStates.set(teamId, buildRosterState(teamId, state.players));

    const beforeCount = state.players.filter((candidate) => candidate.teamId === teamId && candidate.rosterStatus === 'MLB').length;
    expect(beforeCount).toBeGreaterThan(30);

    api.simWeek();

    const protectedPlayer = requireState().players.find((candidate) => candidate.id === rule5Player.id);
    const afterCount = requireState().players.filter((candidate) => candidate.teamId === teamId && candidate.rosterStatus === 'MLB').length;

    expect(protectedPlayer?.rosterStatus).toBe('MLB');
    expect(afterCount).toBeLessThanOrEqual(30);
    expect(requireState().rule5Obligations[0]?.status).toBe('active');
  });

  it('consumes an AI overflow demotion option year before trimming an overfull MLB roster', () => {
    startGame(344, 'nym');
    const state = requireState();
    const teamId = 'bos';
    state.phase = 'regular';
    state.day = 1;

    const candidate = state.players.find(
      (player) => player.teamId === teamId && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    candidate.id = 'bos-ai-option-overflow';
    candidate.overallRating = 35;
    candidate.optionYearsUsed = 2;
    candidate.isOutOfOptions = false;
    state.minorLeagueState.optionUsage = [[candidate.id, [state.season - 2, state.season - 1]]];
    setHitterProfile(candidate, 'RF', 90, 23, 1);

    for (const [index, player] of state.players
      .filter((player) => player.teamId === teamId && player.rosterStatus === 'MLB' && player.id !== candidate.id)
      .entries()) {
      player.overallRating = 500 + index;
    }

    const extraPlayers = state.players
      .filter((player) => player.teamId === teamId && player.rosterStatus !== 'MLB')
      .slice(0, 31 - state.players.filter((player) => player.teamId === teamId && player.rosterStatus === 'MLB').length);
    expect(extraPlayers.length).toBeGreaterThan(0);
    for (const [index, player] of extraPlayers.entries()) {
      player.rosterStatus = 'MLB';
      player.minorLeagueLevel = null;
      player.overallRating = 600 + index;
    }

    state.rosterStates.set(teamId, buildRosterState(teamId, state.players));

    api.simWeek();

    const updatedPlayer = requireState().players.find((player) => player.id === candidate.id)!;

    expect(updatedPlayer.rosterStatus).toBe('AAA');
    expect(updatedPlayer.optionYearsUsed).toBe(3);
    expect(updatedPlayer.isOutOfOptions).toBe(true);
    expect(requireState().minorLeagueState.optionUsage).toContainEqual([
      candidate.id,
      [state.season - 2, state.season - 1, state.season],
    ]);
    expect(requireState().minorLeagueState.waiverClaims.some((claim) => claim.playerId === candidate.id)).toBe(false);
  });

  it('routes AI overflow demotions through waivers when no option year is available', () => {
    startGame(345, 'nym');
    const state = requireState();
    const teamId = 'bos';
    state.phase = 'regular';
    state.day = 1;

    const candidate = state.players.find(
      (player) => player.teamId === teamId && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    candidate.id = 'bos-ai-waiver-overflow';
    candidate.overallRating = 35;
    candidate.optionYearsUsed = 3;
    candidate.isOutOfOptions = true;
    state.minorLeagueState.optionUsage = [[candidate.id, [state.season - 3, state.season - 2, state.season - 1]]];
    setHitterProfile(candidate, 'RF', 90, 23, 1);

    for (const [index, player] of state.players
      .filter((player) => player.teamId === teamId && player.rosterStatus === 'MLB' && player.id !== candidate.id)
      .entries()) {
      player.overallRating = 500 + index;
    }

    const extraPlayers = state.players
      .filter((player) => player.teamId === teamId && player.rosterStatus !== 'MLB')
      .slice(0, 31 - state.players.filter((player) => player.teamId === teamId && player.rosterStatus === 'MLB').length);
    expect(extraPlayers.length).toBeGreaterThan(0);
    for (const [index, player] of extraPlayers.entries()) {
      player.rosterStatus = 'MLB';
      player.minorLeagueLevel = null;
      player.overallRating = 600 + index;
    }

    state.rosterStates.set(teamId, buildRosterState(teamId, state.players));

    api.simWeek();

    const updatedPlayer = requireState().players.find((player) => player.id === candidate.id)!;
    const waiverClaim = requireState().minorLeagueState.waiverClaims.find((claim) => claim.playerId === candidate.id);

    expect(updatedPlayer.rosterStatus).toBe('AAA');
    expect(updatedPlayer.optionYearsUsed).toBe(3);
    expect(updatedPlayer.isOutOfOptions).toBe(true);
    expect(waiverClaim).toEqual(expect.objectContaining({
      playerId: candidate.id,
      fromTeamId: teamId,
      status: 'pending',
    }));
  });

  it('opens the international signing phase after the Rule 5 draft and seeds the IFA pool', () => {
    startGame(342, 'nym');
    const state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'rule5_draft',
      phaseDay: 3,
      totalDay: 43,
    };

    const entered = api.advanceOffseason() as { currentPhase: string } | null;
    const pool = (api as typeof api & {
      getIFAPool: () => { signingWindowOpen: boolean; prospects: Array<{ id: string }> };
    }).getIFAPool();

    expect(entered?.currentPhase).toBe('international_signing');
    expect(pool.signingWindowOpen).toBe(true);
    expect(pool.prospects.length).toBeGreaterThanOrEqual(80);
  });

  it('scouts, signs, and trades IFA pool space during the international signing window', () => {
    startGame(343, 'nym');
    const state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'international_signing',
      phaseDay: 1,
      totalDay: 44,
    };

    const poolBefore = (api as typeof api & {
      getIFAPool: () => {
        budget: { remaining: number };
        prospects: Array<{ id: string; expectedBonus: number; status: string }>;
      };
    }).getIFAPool();
    const target = poolBefore.prospects.find((prospect) => prospect.status === 'available')!;

    const reportResult = (api as typeof api & {
      scoutIFAPlayer: (playerId: string) => { success: boolean; report?: { looks: number; overall: number } };
    }).scoutIFAPlayer(target.id);

    expect(reportResult.success).toBe(true);
    if (!reportResult.success) {
      throw new Error(reportResult.error);
    }
    const report = (reportResult as { report: { looks: number; overall: number } }).report;
    expect(report).toBeDefined();
    expect(report.looks).toBe(1);
    expect(report.overall).toBeGreaterThan(20);

    const signResult = (api as typeof api & {
      signIFAPlayer: (playerId: string, bonusAmount: number) => { success: boolean; remainingBudget?: number };
    }).signIFAPlayer(target.id, target.expectedBonus);

    expect(signResult.success).toBe(true);
    if (!signResult.success) {
      throw new Error(signResult.error);
    }
    const remainingBudgetAfterSigning = (signResult as { remainingBudget: number }).remainingBudget;
    expect(remainingBudgetAfterSigning).toBeDefined();
    expect(remainingBudgetAfterSigning).toBeLessThan(poolBefore.budget.remaining);
    expect(state.players.some((player) => player.id === target.id && player.teamId === 'nym' && player.rosterStatus === 'ROOKIE')).toBe(true);
    expect(state.playerOrigins.get(target.id)).toMatchObject({
      playerId: target.id,
      originTeamId: 'nym',
      acquisitionType: 'ifa',
      acquiredSeason: state.season,
    });
    expect(state.prospectBonds.find((bond) => bond.prospectId === target.id)).toMatchObject({
      prospectId: target.id,
      draftedSeason: state.season,
      currentLevel: 'ROOKIE',
    });

    const tradeResult = (api as typeof api & {
      tradeIFAPoolSpace: (toTeamId: string, amount: number) => { success: boolean; remainingBudget?: number };
    }).tradeIFAPoolSpace('bos', 0.25);

    expect(tradeResult.success).toBe(true);
    if (!tradeResult.success) {
      throw new Error(tradeResult.error);
    }
    const remainingBudgetAfterTrade = (tradeResult as { remainingBudget: number }).remainingBudget;
    expect(remainingBudgetAfterTrade).toBeDefined();
    expect(remainingBudgetAfterTrade).toBeLessThan(remainingBudgetAfterSigning);
  });

  it('closes the trade market after the deadline day and clears pending offers', () => {
    startGame(340, 'nym');
    const state = requireState();
    state.phase = 'regular';

    const { offer, requested, offered } = buildIncomingOffer('deadline-offer');
    state.tradeState.pendingOffers = [offer];

    processTradeMarketActivity(state, 122, 123);
    state.day = 123;

    expect(api.getTradeOffers()).toEqual([]);

    const closedResult = api.proposeTrade(
      [{ type: 'player', playerId: requested.id }],
      [{ type: 'player', playerId: offered.id }],
      'bos',
    );
    expect(closedResult.decision).toBe('rejected');
    expect(closedResult.reason).toContain('Trade market closed');
  });

  it('builds deadline state with urgency tags, bidding wars, and a trade ticker', () => {
    startGame(3401, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 118;
    state.gmPersonalities.set('bos', 'aggressive');
    state.gmRelationships.set('bos', {
      targetTeamId: 'bos',
      score: 32,
      lastInteractionSeason: state.season,
      tradeHistory: [
        {
          season: state.season,
          surplusValue: 8,
          description: 'a trade both sides could justify',
          permanentMemory: false,
        },
      ],
    });

    const first = buildIncomingOffer('deadline-hot-1');
    const second = buildIncomingOffer('deadline-hot-2');
    second.offer.fromTeamId = 'orl';
    second.offer.id = 'deadline-hot-2';
    second.offer.message = 'Tampa Bay is circling with a final framework.';

    state.tradeState.pendingOffers = [first.offer, second.offer];
    state.tradeState.tradeHistory = [
      {
        id: 'ticker-trade-1',
        fromTeamId: 'sea',
        toTeamId: 'sdg',
        offeringAssets: [{ type: 'player', playerId: first.offered.id }],
        requestingAssets: [{ type: 'player', playerId: first.requested.id }],
        fairnessScore: 18,
        summary: 'Seattle Drizzle sent Drew Heater to San Diego Surf Hounds for Miguel Prospect.',
        timestamp: 'S1D117',
      },
    ];

    const deadlineState = (api as typeof api & {
      getTradeDeadlineState: () => {
        deadlineMode: boolean;
        teamMode: string;
        modeSummary: string;
        countdownLabel: string;
        chatter: Array<{ headline: string }>;
        hotOffers: Array<{ urgencyTag: string; bidderCount: number; biddingSummary: string | null; dialogue: { headline: string; lines: string[] } }>;
        ticker: Array<{ summary: string }>;
        marketIntel: Array<{
          teamId: string;
          teamName: string;
          teamAbbreviation: string;
          mode: string;
          gmPersonality: string;
          personalityLabel: string;
          posture: string;
          pressureScore: number;
          pressureLabel: string;
          budgetPressure: string;
          needs: string[];
          surplus: string[];
          activeOfferCount: number;
          relationshipTier: string;
          relationshipSummary: string | null;
        }>;
        warRoom: {
          headline: string;
          detail: string;
          currentCheckpointDay: number | null;
          nextCheckpointDay: number | null;
          completedCheckpoints: number;
          totalCheckpoints: number;
          callsToAction: string[];
        };
      };
    }).getTradeDeadlineState();

    expect(deadlineState.deadlineMode).toBe(true);
    expect(deadlineState.teamMode).toBe('buyer');
    expect(deadlineState.modeSummary.length).toBeGreaterThan(0);
    expect(deadlineState.countdownLabel).toContain('days');
    expect(deadlineState.chatter.length).toBeGreaterThan(0);
    expect(deadlineState.hotOffers).toHaveLength(2);
    expect(deadlineState.hotOffers[0]?.urgencyTag).toBe('EXPIRING SOON');
    expect(deadlineState.hotOffers.some((offer) => offer.bidderCount > 1)).toBe(true);
    expect(deadlineState.hotOffers.some((offer) => offer.biddingSummary?.includes('clubs'))).toBe(true);
    expect(deadlineState.hotOffers[0]?.dialogue.lines.length).toBe(3);
    expect(deadlineState.ticker[0]?.summary).toContain('Seattle Drizzle');
    expect(deadlineState.marketIntel.length).toBeGreaterThan(0);

    const bostonIntel = deadlineState.marketIntel.find((team) => team.teamId === 'bos');
    expect(bostonIntel).toMatchObject({
      teamName: 'Boston Noreasters',
      teamAbbreviation: 'BOS',
      gmPersonality: 'aggressive',
      personalityLabel: 'Aggressive',
      activeOfferCount: 1,
      relationshipTier: 'friendly',
      relationshipSummary: 'a trade both sides could justify',
    });
    expect(bostonIntel?.posture).toContain('Aggressive');
    expect(bostonIntel?.needs.length).toBeGreaterThan(0);
    expect(bostonIntel?.surplus.length).toBeGreaterThan(0);
    expect(bostonIntel?.pressureScore).toBeGreaterThan(0);
    expect(['low', 'medium', 'high']).toContain(bostonIntel?.budgetPressure);
    expect(deadlineState.warRoom.headline).toContain('Final');
    expect(deadlineState.warRoom.currentCheckpointDay).toBe(117);
    expect(deadlineState.warRoom.nextCheckpointDay).toBe(120);
    expect(deadlineState.warRoom.completedCheckpoints).toBe(6);
    expect(deadlineState.warRoom.totalCheckpoints).toBe(8);
    expect(deadlineState.warRoom.callsToAction.some((action) => action.includes('hottest incoming offers'))).toBe(true);

    state.day = 91;
    const earlyDeadlineState = (api as typeof api & {
      getTradeDeadlineState: () => {
        warRoom: {
          headline: string;
          currentCheckpointDay: number | null;
          nextCheckpointDay: number | null;
          completedCheckpoints: number;
        };
      };
    }).getTradeDeadlineState();

    expect(earlyDeadlineState.warRoom.headline).toContain('Set the board');
    expect(earlyDeadlineState.warRoom.currentCheckpointDay).toBeNull();
    expect(earlyDeadlineState.warRoom.nextCheckpointDay).toBe(92);
    expect(earlyDeadlineState.warRoom.completedCheckpoints).toBe(0);
  });

  it('builds deterministic trade dialogue without advancing rng state', () => {
    startGame(34015, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 118;

    const workerApi = api as typeof api & {
      getTradeDialogue: (
        teamId: string,
        offerValue: number,
        requestValue: number,
        negotiationType?: 'proposal' | 'counter' | 'offer',
      ) => {
        headline: string;
        lines: string[];
        mode: string;
      };
    };

    const rngCallsBefore = requireState().rng.getState().callCount;
    const first = workerApi.getTradeDialogue('bos', 48, 61, 'proposal');
    const second = workerApi.getTradeDialogue('bos', 48, 61, 'proposal');

    expect(second).toEqual(first);
    expect(requireState().rng.getState().callCount).toBe(rngCallsBefore);
    expect(first.headline).toContain('Boston Noreasters');
    expect(first.lines.length).toBe(3);
    expect(first.mode).toMatch(/^(buyer|seller|standing_pat)$/);
  });

  it('creates a deadline recap and analysis when the market closes', () => {
    startGame(3402, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 122;

    const { offer, requested, offered } = buildIncomingOffer('deadline-missed');
    state.tradeState.pendingOffers = [offer];
    state.tradeState.tradeHistory = [
      {
        id: 'deadline-user-trade',
        fromTeamId: 'nym',
        toTeamId: 'bos',
        offeringAssets: [{ type: 'player', playerId: requested.id }],
        requestingAssets: [{ type: 'player', playerId: offered.id }],
        fairnessScore: 14,
        summary: 'New York Tycoons sent Anthony Volpe to Boston Noreasters for Roman Anthony.',
        timestamp: 'S1D121',
      },
      {
        id: 'deadline-ai-trade',
        fromTeamId: 'sea',
        toTeamId: 'lax',
        offeringAssets: [{ type: 'player', playerId: offered.id }],
        requestingAssets: [{ type: 'player', playerId: requested.id }],
        fairnessScore: -8,
        summary: 'Seattle Drizzle sent Drew Heater to Los Angeles Sunset Strip for Miguel Prospect.',
        timestamp: 'S1D121',
      },
    ];

    processTradeMarketActivity(state, 122, 123);
    state.day = 123;

    const deadlineState = (api as typeof api & {
      getTradeDeadlineState: () => {
        recap: {
          yourTrades: Array<{ outcome: 'completed' | 'missed'; summary: string }>;
          analysisHeadline: string;
        } | null;
      };
      getPressRoomFeed: (limit?: number) => Array<{ headline: string; tag: string }>;
    }).getTradeDeadlineState();

    expect(api.getTradeOffers()).toEqual([]);
    expect(deadlineState.recap).not.toBeNull();
    expect(deadlineState.recap?.yourTrades.some((trade) => trade.outcome === 'completed')).toBe(true);
    expect(deadlineState.recap?.yourTrades.some((trade) => trade.outcome === 'missed')).toBe(true);
    expect(deadlineState.recap?.analysisHeadline).toContain('Deadline winners and losers');
    expect((api as typeof api & {
      getPressRoomFeed: (limit?: number) => Array<{ headline: string; tag: string }>;
    }).getPressRoomFeed(25).some((entry) =>
      entry.tag === 'ANALYSIS' && entry.headline.includes('Deadline winners and losers'),
    )).toBe(true);
  });

  it('generates deterministic deadline trade bursts with the same seed', () => {
    startGame(3403, 'nym');
    let state = requireState();
    state.phase = 'regular';
    state.day = 114;
    configureMonthlyTradeScenario();

    processTradeMarketActivity(state, 91, 114);
    const firstRun = {
      offers: api.getTradeOffers(),
      history: api.getTradeHistory(),
    };

    startGame(3403, 'nym');
    state = requireState();
    state.phase = 'regular';
    state.day = 114;
    configureMonthlyTradeScenario();

    processTradeMarketActivity(state, 91, 114);
    const secondRun = {
      offers: api.getTradeOffers(),
      history: api.getTradeHistory(),
    };

    expect(firstRun.offers.length + firstRun.history.length).toBeGreaterThan(0);
    expect(secondRun).toEqual(firstRun);
  });

  it('generates deterministic monthly AI trade offers for the user inbox', () => {
    startGame(341, 'nym');
    let state = requireState();
    state.phase = 'regular';
    state.day = 114;
    configureMonthlyTradeScenario();

    processTradeMarketActivity(state, 91, 114);
    const firstRun = api.getTradeOffers();

    expect(firstRun.length).toBeGreaterThan(0);
    expect(firstRun.every((offer) => offer.toTeamId === 'nym')).toBe(true);
    expect(firstRun.some((offer) => offer.requestingAssets.some((asset) => asset.type === 'player'))).toBe(true);

    startGame(341, 'nym');
    state = requireState();
    state.phase = 'regular';
    state.day = 114;
    configureMonthlyTradeScenario();

    processTradeMarketActivity(state, 91, 114);
    const secondRun = api.getTradeOffers();

    expect(secondRun).toEqual(firstRun);
  });

  it('accepts AI trade offers and records history, news, briefing, and morale updates', () => {
    startGame(342, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 60;

    const { offer, requested, offered } = buildIncomingOffer('accept-offer');
    const baselineIncomingMorale = state.playerMorale.get(offered.id)?.score ?? 0;
    const baselineOutgoingMorale = state.playerMorale.get(requested.id)?.score ?? 0;

    state.tradeState.pendingOffers = [offer];

    const result = api.respondToTradeOffer(offer.id, 'accept');

    expect(result.success).toBe(true);
    expect(result.decision).toBe('accepted');
    expect(api.getTradeOffers()).toEqual([]);
    expect(api.getTradeHistory()[0]?.id).toBe(offer.id);
    expect(requireState().players.find((player) => player.id === offered.id)?.teamId).toBe('nym');
    expect(requireState().players.find((player) => player.id === requested.id)?.teamId).toBe('bos');
    expect(api.getNews(25).some((item) => item.category === 'trade' && item.relatedPlayerIds.includes(offered.id))).toBe(true);
    expect(api.getBriefing(25).some((item) => item.category === 'news' && item.relatedPlayerIds.includes(offered.id))).toBe(true);
    expect(requireState().playerMorale.get(offered.id)?.score).toBeGreaterThan(baselineIncomingMorale);
    expect(requireState().playerMorale.get(requested.id)?.score).toBeLessThan(baselineOutgoingMorale);
  });

  it('carries accepted trade dialogue into consequence stories and the press room', () => {
    startGame(3421, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 60;

    const { offer, requested, offered } = buildIncomingOffer('accept-dialogue-offer');
    state.tradeState.pendingOffers = [offer];

    const workerApi = api as typeof api & {
      getTradeDialogue: (
        teamId: string,
        offerValue: number,
        requestValue: number,
        negotiationType?: 'proposal' | 'counter' | 'offer',
      ) => {
        headline: string;
        lines: string[];
      };
      getPressRoomFeed: (limit?: number) => Array<{ headline: string; category: string; body: string }>;
    };
    const expectedDialogue = workerApi.getTradeDialogue(
      'bos',
      evaluatePlayerTradeValue(offered).overall,
      evaluatePlayerTradeValue(requested).overall,
      'offer',
    );

    const result = api.respondToTradeOffer(offer.id, 'accept');
    const news = api.getNews(25);
    const pressRoom = workerApi.getPressRoomFeed(25);

    expect(result.success).toBe(true);
    expect(news.some((item) =>
      item.category === 'trade'
      && (
        item.headline === expectedDialogue.headline
        || item.body.includes(expectedDialogue.lines.at(-1) ?? expectedDialogue.headline)
      ),
    )).toBe(true);
    expect(pressRoom.some((entry) =>
      entry.category === 'trade' && entry.headline === expectedDialogue.headline,
    )).toBe(true);
  });

  it('emits deadline blockbuster trade moments and press coverage when a trade is accepted', () => {
    startGame(34215, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 122;
    state.news = [];

    const { offer, requested, offered } = buildIncomingOffer('accept-deadline-blockbuster');
    offered.firstName = 'Juan';
    offered.lastName = 'Soto';
    offered.overallRating = 405;
    offered.contract.totalValue = 28;
    requested.firstName = 'Leo';
    requested.lastName = 'De Vries';
    requested.overallRating = 286;
    requested.contract.totalValue = 12;
    state.tradeState.pendingOffers = [offer];

    const result = api.respondToTradeOffer(offer.id, 'accept');
    const updatedState = requireState();
    const outgoingMoments = updatedState.playerMoments.get(offered.id) ?? [];
    const incomingMoments = updatedState.playerMoments.get(requested.id) ?? [];
    const pressConference = updatedState.news.find((item) =>
      item.id.startsWith('press-conference-trade-deadline-')
      && item.category === 'trade'
      && item.relatedPlayerIds.includes(offered.id),
    );

    expect(result.success).toBe(true);
    expect(outgoingMoments.some((moment) => moment.type === 'blockbuster_trade_moved')).toBe(true);
    expect(incomingMoments.some((moment) => moment.type === 'blockbuster_trade_acquired')).toBe(true);
    expect(pressConference?.headline).toContain('Juan Soto');
    expect(pressConference?.priority).toBe(1);
  });

  it('emits a routine trade press conference without blockbuster moments for moderate swaps', () => {
    startGame(34216, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 60;
    state.news = [];

    const { offer, requested, offered } = buildIncomingOffer('accept-routine-swap');
    offered.overallRating = 274;
    offered.contract.totalValue = 16;
    requested.overallRating = 276;
    requested.contract.totalValue = 15;
    state.tradeState.pendingOffers = [offer];

    const result = api.respondToTradeOffer(offer.id, 'accept');
    const updatedState = requireState();
    const outgoingMoments = updatedState.playerMoments.get(offered.id) ?? [];
    const incomingMoments = updatedState.playerMoments.get(requested.id) ?? [];
    const pressConference = updatedState.news.find((item) =>
      item.id.startsWith('press-conference-trade-deadline-')
      && item.category === 'trade'
      && item.relatedPlayerIds.includes(offered.id),
    );

    expect(result.success).toBe(true);
    expect(outgoingMoments.some((moment) => moment.type === 'blockbuster_trade_moved')).toBe(false);
    expect(incomingMoments.some((moment) => moment.type === 'blockbuster_trade_acquired')).toBe(false);
    expect(pressConference?.priority).toBe(3);
  });

  it('advances trade sagas and annotates homegrown aftermath when a bonded player is moved', () => {
    startGame(3422, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 60;

    const { offer, requested } = buildIncomingOffer('accept-story-offer');
    state.playerStoryArcs = [{
      playerId: requested.id,
      arcType: 'trade_saga',
      startSeason: state.season,
      startDay: 45,
      phase: 'rising',
      milestones: ['Trade calls are getting louder.'],
      resolvedSeason: null,
    }];
    state.prospectBonds = [{
      prospectId: requested.id,
      draftedSeason: 1,
      debutSeason: 2,
      currentLevel: 'MLB',
      bondStrength: 64,
      milestones: ['Drafted Round 1, 1', 'MLB Debut, 2'],
      loyaltyModifier: 0.64,
    }];
    state.playerOrigins.set(requested.id, {
      playerId: requested.id,
      originTeamId: 'nym',
      acquisitionType: 'draft',
      acquiredSeason: 1,
      draftSeason: 1,
      draftRound: 1,
      draftPickNumber: 7,
      originalGrade: 66,
      bonusAmount: 5.2,
    });
    state.tradeState.pendingOffers = [offer];

    const result = api.respondToTradeOffer(offer.id, 'accept');
    const movedArc = requireState().playerStoryArcs.find((arc) => arc.playerId === requested.id);
    const aftermathWatcher = requireState().consequenceWatchers.find((watcher) =>
      watcher.type === 'trade_aftermath' && watcher.context.tradedPlayerId === requested.id,
    );

    expect(result.success).toBe(true);
    expect(movedArc).toMatchObject({
      phase: 'climax',
      resolvedSeason: null,
    });
    expect(movedArc?.milestones.at(-1)).toContain('trade');
    expect(requireState().news.some((item) => item.headline.includes(requested.lastName) && item.body.toLowerCase().includes('trade saga'))).toBe(true);
    expect(requireState().tickerFeed.some((entry) => entry.relatedPlayerIds.includes(requested.id) && entry.category === 'trade')).toBe(true);
    expect(aftermathWatcher?.context.homegrownDraftSeason).toBe(1);
  });

  it('declines AI trade offers and records the response in morale, news, and briefing', () => {
    startGame(343, 'nym');
    const state = requireState();
    state.phase = 'regular';
    state.day = 60;

    const { offer, requested } = buildIncomingOffer('decline-offer');
    const baselineMorale = state.playerMorale.get(requested.id)?.score ?? 0;
    state.tradeState.pendingOffers = [offer];

    const result = api.respondToTradeOffer(offer.id, 'decline');

    expect(result.success).toBe(true);
    expect(result.decision).toBe('declined');
    expect(api.getTradeOffers()).toEqual([]);
    expect(api.getTradeHistory()).toEqual([]);
    expect(api.getNews(25).some((item) => item.category === 'trade' && item.headline.includes('declined'))).toBe(true);
    expect(api.getBriefing(25).some((item) => item.category === 'news' && item.headline.includes('declined'))).toBe(true);
    expect(requireState().playerMorale.get(requested.id)?.score).toBeGreaterThan(baselineMorale);
  });

  it('returns ceremony moments in queue order and dismisses them sequentially', () => {
    startGame(3431, 'nym');
    const state = requireState();
    state.ceremony.pendingMoments = [
      {
        id: 'moment-a',
        type: 'playoff_clinch',
        title: 'POSTSEASON BOUND',
        subtitle: 'New York Tycoons',
        detailLines: ['Clinched a playoff berth.'],
        soundEffect: 'playoff_clinch',
        autoDismissMs: 5000,
        createdAt: 'S1D150',
        theme: 'celebration',
        relatedTeamIds: ['nym'],
        relatedPlayerIds: [],
      },
      {
        id: 'moment-b',
        type: 'prospect_debut',
        title: 'THE FUTURE IS NOW',
        subtitle: 'Jasson Dominguez',
        detailLines: ['Called up from AAA.'],
        soundEffect: 'prospect_callup',
        autoDismissMs: 5000,
        createdAt: 'S1D151',
        theme: 'future',
        relatedTeamIds: ['nym'],
        relatedPlayerIds: ['prospect-1'],
      },
    ];

    const workerApi = api as typeof api & {
      getCeremonyState: () => {
        activeMoment: { id: string } | null;
        queueLength: number;
      };
      dismissCeremonyMoment: (momentId: string) => { success: boolean };
    };

    expect(workerApi.getCeremonyState().activeMoment?.id).toBe('moment-a');
    expect(workerApi.getCeremonyState().queueLength).toBe(2);

    expect(workerApi.dismissCeremonyMoment('moment-a').success).toBe(true);
    expect(workerApi.getCeremonyState().activeMoment?.id).toBe('moment-b');
    expect(requireState().ceremony.seenMomentIds).toContain('moment-a');
  });

  it('queues a playoff clinch moment when the regular season rolls into the playoffs', () => {
    startGame(344, 'nym');
    const state = requireState();
    const finalRegularSeasonDay = Math.max(...state.schedule.map((game) => game.day));

    state.phase = 'regular';
    state.day = finalRegularSeasonDay;
    state.seasonState = {
      ...state.seasonState,
      currentDay: finalRegularSeasonDay,
    };

    for (let win = 0; win < 140; win += 1) {
      state.seasonState.standings.recordGame('nym', 'bos', 5, 1, true);
    }

    api.simDay();

    const playoffClinchMoment = requireState().ceremony.pendingMoments.find(
      (moment) => moment.type === 'playoff_clinch',
    );

    expect(playoffClinchMoment?.title).toContain('POSTSEASON BOUND');
  });

  it('queues a prospect debut flashback on a homegrown player first MLB game', () => {
    startGame(3441, 'nym');
    api.simDay();
    api.simDay();
    const state = requireState();
    const promotionTarget = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'AAA')!;
    const rosterState = state.rosterStates.get('nym')!;
    rosterState.mlbRoster = rosterState.mlbRoster.slice(0, 25);
    rosterState.fortyManRoster = [
      ...rosterState.fortyManRoster.filter((playerId) => playerId !== promotionTarget.id).slice(0, 39),
      promotionTarget.id,
    ];
    state.prospectBonds = [{
      prospectId: promotionTarget.id,
      draftedSeason: state.season,
      debutSeason: null,
      currentLevel: 'AAA',
      bondStrength: 32,
      milestones: ['Drafted Round 1, 1', 'Promoted to AAA, 1'],
      loyaltyModifier: 0.32,
    }];
    state.playerOrigins.set(promotionTarget.id, {
      playerId: promotionTarget.id,
      originTeamId: 'nym',
      acquisitionType: 'draft',
      acquiredSeason: state.season,
      draftSeason: state.season,
      draftRound: 1,
      draftPickNumber: 8,
      originalGrade: 63,
      bonusAmount: 4.9,
    });

    const result = api.promotePlayer(promotionTarget.id);
    state.seasonState.playerSeasonStats.set(promotionTarget.id, createPlayerStats({
      playerId: promotionTarget.id,
      teamId: 'nym',
      pa: 4,
      ab: 4,
      hits: 2,
    }));

    api.simDay();

    const ceremonyState = (api as typeof api & {
      getCeremonyState: () => {
        activeMoment: { type: string; title: string; subtitle: string; detailLines: string[] } | null;
      };
    }).getCeremonyState();
    const flashback = requireState().debutFlashbacks.find((entry) => entry.playerId === promotionTarget.id);
    const debutMoment = requireState().ceremony.pendingMoments.find((moment) => moment.type === 'prospect_debut');

    expect(result.success).toBe(true);
    expect(flashback).toMatchObject({
      playerId: promotionTarget.id,
      draftRound: 1,
      debutSeason: state.season,
    });
    expect(ceremonyState.queueLength).toBeGreaterThan(0);
    expect(debutMoment?.type).toBe('prospect_debut');
    expect(debutMoment?.title).toContain('THE FUTURE IS NOW');
    expect(debutMoment?.subtitle).toContain(promotionTarget.lastName);
    expect(debutMoment?.detailLines[0]).toContain('Round 1');
    expect(requireState().debutFlashbacks.filter((entry) => entry.playerId === promotionTarget.id)).toHaveLength(1);
  });

  it('combines a prospect debut with a same-day record watch into one ticker entry', () => {
    startGame(3442, 'nym');
    api.simDay();
    api.simDay();
    const state = requireState();
    const promotionTarget = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'AAA')!;
    const rosterState = state.rosterStates.get('nym')!;
    rosterState.mlbRoster = rosterState.mlbRoster.slice(0, 25);
    rosterState.fortyManRoster = [
      ...rosterState.fortyManRoster.filter((playerId) => playerId !== promotionTarget.id).slice(0, 39),
      promotionTarget.id,
    ];
    state.prospectBonds = [{
      prospectId: promotionTarget.id,
      draftedSeason: state.season,
      debutSeason: null,
      currentLevel: 'AAA',
      bondStrength: 29,
      milestones: ['Drafted Round 1, 1', 'Promoted to AAA, 1'],
      loyaltyModifier: 0.29,
    }];
    state.playerOrigins.set(promotionTarget.id, {
      playerId: promotionTarget.id,
      originTeamId: 'nym',
      acquisitionType: 'draft',
      acquiredSeason: state.season,
      draftSeason: state.season,
      draftRound: 1,
      draftPickNumber: 11,
      originalGrade: 61,
      bonusAmount: 4.4,
    });

    const hitsRecord = state.recordBook.find((entry) => entry.id === 'franchise:nym:individual_single_season:hits');
    if (!hitsRecord) {
      throw new Error('Expected franchise hits record to exist.');
    }
    hitsRecord.holders = [{
      playerId: 'historic-hits-holder',
      playerName: 'Historic Contact Bat',
      teamId: 'nym',
      season: 1,
      value: 95,
      displayValue: '95',
    }];

    api.promotePlayer(promotionTarget.id);
    state.seasonState.playerSeasonStats.set(promotionTarget.id, createPlayerStats({
      playerId: promotionTarget.id,
      teamId: 'nym',
      gamesPlayed: 1,
      pa: 4,
      ab: 4,
      hits: 2,
      hr: 0,
      rbi: 1,
    }));

    api.simDay();

    const combinedEntry = (api as typeof api & {
      getTickerFeed: (limit?: number) => Array<{ text: string; relatedPlayerIds: string[] }>;
    }).getTickerFeed(20).find((entry) =>
      entry.relatedPlayerIds.includes(promotionTarget.id)
      && entry.text.includes('debuts and is on pace'),
    );

    expect(combinedEntry?.text).toContain('debuts and is on pace');
    expect((api as typeof api & { getTickerFeed: (limit?: number) => Array<{ category: string; relatedPlayerIds: string[] }> }).getTickerFeed(20)
      .filter((entry) => entry.relatedPlayerIds.includes(promotionTarget.id) && entry.category === 'record')).toHaveLength(0);
  });

  it('publishes monthly history, scenario, and anniversary ticker hooks', () => {
    startGame(3555, 'nym');
    const state = requireState();
    state.season = 6;
    state.phase = 'regular';
    state.day = 30;
    state.seasonState = {
      ...state.seasonState,
      currentDay: 30,
    };
    for (let win = 0; win < 68; win += 1) {
      state.seasonState.standings.recordGame('nym', 'bos', 5, 3, true);
    }
    for (let loss = 0; loss < 22; loss += 1) {
      state.seasonState.standings.recordGame('bos', 'nym', 5, 3, true);
    }
    state.challengeState = {
      scenarioId: 'rebuild',
      startSeason: 4,
      maxSeasons: 3,
      progress: 0.78,
      completed: false,
      completedSeason: null,
      failed: false,
      summary: 'Push for a playoff berth.',
    };
    state.seasonArchive = [
      {
        season: 2,
        standings: [],
        playoffSeries: [],
        awards: [],
        statLeaders: { hr: [], rbi: [], avg: [], era: [], k: [], w: [] },
        transactions: [],
        draftClass: [],
        financials: [],
        userSummary: null,
        timelineEvents: ['Won the World Series'],
      },
      {
        season: 3,
        standings: [],
        playoffSeries: [],
        awards: [],
        statLeaders: { hr: [], rbi: [], avg: [], era: [], k: [], w: [] },
        transactions: [],
        draftClass: [],
        financials: [],
        userSummary: null,
        timelineEvents: ['A walk-off clinched the division'],
      },
    ];
    const veteran = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB')!;
    state.playerOrigins.set(veteran.id, {
      playerId: veteran.id,
      originTeamId: 'nym',
      acquisitionType: 'draft',
      acquiredSeason: 1,
      draftSeason: 1,
      draftRound: 2,
      draftPickNumber: 42,
      originalGrade: 58,
      bonusAmount: 1.6,
    });

    api.simMonth();

    const feed = (api as typeof api & {
      getTickerFeed: (limit?: number) => Array<{ text: string }>;
    }).getTickerFeed(40).map((entry) => entry.text);

    expect(feed.some((text) => text.includes('The Rebuild') && text.includes('progress'))).toBe(true);
    expect(feed.some((text) => text.includes('On this day'))).toBe(true);
    expect(feed.some((text) => text.includes(veteran.lastName) && text.includes('5 seasons with the franchise'))).toBe(true);
  });

  it('publishes a where-are-they-now offseason note for a traded-away player', () => {
    startGame(3556, 'nym');
    const state = requireState();
    const tradedPlayer = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    tradedPlayer.teamId = 'bos';
    state.seasonState.playerSeasonStats.set(tradedPlayer.id, createPlayerStats({
      playerId: tradedPlayer.id,
      teamId: 'bos',
      gamesPlayed: 148,
      pa: 612,
      ab: 557,
      hits: 171,
      hr: 26,
      rbi: 91,
    }));
    state.tradeState.tradeHistory = [{
      id: 'where-are-they-now-trade',
      fromTeamId: 'nym',
      toTeamId: 'bos',
      offeringAssets: [{ type: 'player', playerId: tradedPlayer.id }],
      requestingAssets: [],
      fairnessScore: 6,
      summary: 'New York Tycoons sent a homegrown bat to Boston Noreasters.',
      timestamp: `S${state.season}D118`,
    }];
    state.phase = 'offseason';
    state.day = 1;
    state.offseasonState = {
      ...createOffseasonState(state.season),
      completed: true,
    };

    applyOffseasonNarrativeHooks(state);

    expect(api.getNews(100).some((item) =>
      item.headline.includes('Where Are They Now')
      && item.body.includes(tradedPlayer.lastName),
    )).toBe(true);
  });

  it('builds recent game recaps and play-by-play views without advancing rng state', () => {
    startGame(3557, 'nym');

    const workerApi = api as typeof api & {
      getRecentGameRecaps: (count?: number) => RecentGameRecapView[];
      getGamePlayByPlay: (gameIndex: number) => GamePlayByPlayView | null;
    };

    let recaps = workerApi.getRecentGameRecaps(3);
    while (recaps.length === 0 && requireState().phase === 'preseason') {
      api.simDay();
      recaps = workerApi.getRecentGameRecaps(3);
    }
    while (recaps.length === 0 && requireState().phase === 'regular' && requireState().day < 25) {
      api.simDay();
      recaps = workerApi.getRecentGameRecaps(3);
    }

    expect(recaps.length).toBeGreaterThan(0);

    const rngCallsBefore = requireState().rng.getState().callCount;
    const firstRecaps = workerApi.getRecentGameRecaps(3);
    const secondRecaps = workerApi.getRecentGameRecaps(3);

    expect(secondRecaps).toEqual(firstRecaps);
    expect(requireState().rng.getState().callCount).toBe(rngCallsBefore);
    expect(firstRecaps[0]?.recap.length).toBeGreaterThan(0);
    expect(firstRecaps[0]?.playByPlay.length).toBeGreaterThan(0);

    const detailFirst = workerApi.getGamePlayByPlay(firstRecaps[0]!.gameIndex);
    const detailSecond = workerApi.getGamePlayByPlay(firstRecaps[0]!.gameIndex);

    expect(detailSecond).toEqual(detailFirst);
    expect(requireState().rng.getState().callCount).toBe(rngCallsBefore);
    expect(detailFirst?.highlights.length).toBeGreaterThan(0);
    expect(detailFirst?.boxScore.innings).toBeGreaterThanOrEqual(9);
  });

  it('builds prospect pipeline ETA buckets plus offseason narrative reads without advancing rng state', () => {
    startGame(3558, 'nym');
    const state = requireState();
    const workerApi = api as typeof api & {
      getProspectPipeline: (teamId?: string) => ProspectPipelineView;
      getSeasonRecap: (season?: number) => SeasonRecapView | null;
      getOffseasonHeadline: (season?: number) => OffseasonHeadlineView | null;
    };

    const readyProspect = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'AAA')!;
    const nextWaveProspect = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'AA')!;
    const longViewProspect = state.players.find((player) => player.teamId === 'nym' && player.rosterStatus === 'A')!;

    readyProspect.overallRating = 62;
    readyProspect.ceiling = 70;
    nextWaveProspect.overallRating = 55;
    nextWaveProspect.ceiling = 67;
    longViewProspect.age = 20;
    longViewProspect.overallRating = 47;
    longViewProspect.ceiling = 72;

    state.prospectBonds.push({
      prospectId: readyProspect.id,
      draftedSeason: state.season - 1,
      debutSeason: null,
      currentLevel: 'AAA',
      bondStrength: 41,
      milestones: ['Drafted Round 1, 4'],
      loyaltyModifier: 0.41,
    });
    state.minorLeagueState.minorLeagueStatHistory = [[readyProspect.id, [{
      season: state.season,
      level: 'AAA',
      gamesPlayed: 70,
      pa: 282,
      hits: 88,
      hr: 18,
      rbi: 54,
      avg: 0.314,
      ip: 0,
      era: 0,
      k: 0,
      bb: 31,
    }]]];
    state.seasonHistory.push({
      season: state.season,
      championTeamId: 'nym',
      runnerUpTeamId: 'lax',
      worldSeriesRecord: '4-2',
      summary: 'The Tycoons finished the job and closed the season on top.',
      awards: [],
      keyMoments: ['Deadline blockbuster reshaped the bullpen'],
      statLeaders: {
        hr: [],
        rbi: [],
        avg: [],
        era: [],
        k: [],
        w: [],
      },
      notableRetirements: [],
      blockbusterTrades: [],
      userSeason: {
        teamId: 'nym',
        record: '97-65',
        playoffResult: 'Won the World Series',
        storylines: ['Judge delivered in the postseason'],
      },
    });
    state.seasonArchive.push({
      season: state.season,
      standings: [],
      playoffSeries: [],
      awards: [],
      statLeaders: {
        hr: [],
        rbi: [],
        avg: [],
        era: [],
        k: [],
        w: [],
      },
      transactions: [{
        headline: 'Deadline blockbuster reshaped the bullpen',
        summary: 'New York added Jordan Reliever and stabilized the late innings.',
        playerIds: ['Jordan Reliever'],
        teamIds: ['nym', 'sea'],
        impactScore: 88,
      }],
      draftClass: [],
      financials: [],
      userSummary: {
        teamId: 'nym',
        record: '97-65',
        playoffResult: 'Won the World Series',
        storylines: ['Judge delivered in the postseason'],
      },
      timelineEvents: ['Judge delivered in the postseason'],
    });

    const rngCallsBefore = requireState().rng.getState().callCount;
    const firstPipeline = workerApi.getProspectPipeline('nym');
    const secondPipeline = workerApi.getProspectPipeline('nym');
    const firstRecap = workerApi.getSeasonRecap(state.season);
    const secondRecap = workerApi.getSeasonRecap(state.season);
    const firstHeadline = workerApi.getOffseasonHeadline(state.season);
    const secondHeadline = workerApi.getOffseasonHeadline(state.season);

    expect(secondPipeline).toEqual(firstPipeline);
    expect(secondRecap).toEqual(firstRecap);
    expect(secondHeadline).toEqual(firstHeadline);
    expect(requireState().rng.getState().callCount).toBe(rngCallsBefore);
    expect(firstPipeline.health.label.length).toBeGreaterThan(0);
    expect(firstPipeline.prospects.find((prospect) => prospect.playerId === readyProspect.id)?.eta).toBe('Ready now');
    expect(firstPipeline.prospects.find((prospect) => prospect.playerId === nextWaveProspect.id)?.eta).toBe('Next season');
    expect(firstPipeline.prospects.find((prospect) => prospect.playerId === longViewProspect.id)?.eta).toBe('2 seasons');
    expect(firstRecap?.recap).toContain('97-65');
    expect(firstHeadline?.headline).toContain('World Series');
  });

  it('derives a deterministic farm development focus board from reports, ETA, setbacks, and runway', () => {
    startGame(3559, 'nym');
    const state = requireState();
    const workerApi = api as typeof api & {
      getProspectPipeline: (teamId?: string) => ProspectPipelineView;
    };

    const readyProspect = state.players.find((player) =>
      player.teamId === 'nym' && player.rosterStatus === 'AAA' && player.pitcherAttributes == null,
    )!;
    const stallingProspect = state.players.find((player) =>
      player.teamId === 'nym' && player.rosterStatus === 'AA' && player.id !== readyProspect.id,
    )!;
    const longViewProspect = state.players.find((player) =>
      player.teamId === 'nym' && player.rosterStatus === 'A' && player.id !== readyProspect.id,
    )!;

    for (const player of state.players) {
      if (
        player.teamId === 'nym'
        && ['ROOKIE', 'A', 'A_PLUS', 'AA', 'AAA'].includes(player.rosterStatus)
        && player.id !== readyProspect.id
        && player.id !== stallingProspect.id
        && player.id !== longViewProspect.id
      ) {
        player.age = 24;
        player.overallRating = 44;
        player.ceiling = 62;
        player.developmentTrajectory = 'on_track';
      }
    }

    readyProspect.overallRating = 64;
    readyProspect.ceiling = 72;
    readyProspect.developmentTrajectory = 'ahead_of_curve';
    stallingProspect.overallRating = 52;
    stallingProspect.ceiling = 70;
    stallingProspect.developmentTrajectory = 'below_expectations';
    longViewProspect.age = 19;
    longViewProspect.overallRating = 45;
    longViewProspect.ceiling = 76;
    longViewProspect.developmentTrajectory = 'on_track';

    state.minorLeagueState.minorLeagueStatHistory = [[readyProspect.id, [{
      season: state.season,
      level: 'AAA',
      gamesPlayed: 66,
      pa: 240,
      hits: 78,
      hr: 13,
      rbi: 44,
      avg: 0.325,
      ip: 0,
      era: 0,
      k: 0,
      bb: 28,
    }]]];
    state.minorLeagueState.developmentReports.push({
      playerId: stallingProspect.id,
      teamId: 'nym',
      season: state.season,
      month: 4,
      trajectory: 'below_expectations',
      summary: `${stallingProspect.firstName} ${stallingProspect.lastName} is chasing spin and needs tighter swing decisions.`,
      overallRating: stallingProspect.overallRating,
    });
    state.minorLeagueState.activeDevelopmentSetbacks = [{
      playerId: stallingProspect.id,
      type: 'mental_block',
      overallModifier: -4,
      startSeason: state.season,
      startMonth: 4,
      endSeason: state.season,
      endMonth: 5,
      summary: `${stallingProspect.firstName} ${stallingProspect.lastName} is fighting a lower-half timing leak.`,
      active: true,
    }];
    state.prospectBonds.push({
      prospectId: longViewProspect.id,
      draftedSeason: state.season - 1,
      debutSeason: null,
      currentLevel: 'A',
      bondStrength: 36,
      milestones: ['Drafted Round 2, 4', 'Assigned to A-ball, 5'],
      loyaltyModifier: 0.36,
    });

    const rngCallsBefore = state.rng.getState().callCount;
    const firstPipeline = workerApi.getProspectPipeline('nym');
    const secondPipeline = workerApi.getProspectPipeline('nym');

    expect(secondPipeline.developmentFocus).toEqual(firstPipeline.developmentFocus);
    expect(state.rng.getState().callCount).toBe(rngCallsBefore);

    const readyPriority = firstPipeline.developmentFocus.priorities.find((priority) => priority.playerId === readyProspect.id);
    const stallingPriority = firstPipeline.developmentFocus.priorities.find((priority) => priority.playerId === stallingProspect.id);
    const longViewPriority = firstPipeline.developmentFocus.priorities.find((priority) => priority.playerId === longViewProspect.id);

    expect(readyPriority).toMatchObject({
      category: 'promotion_window',
      label: 'Promotion Window',
    });
    expect(readyPriority?.action).toContain('Evaluate MLB fit');
    expect(readyPriority?.evidence.some((item) => item.includes('.325 AVG'))).toBe(true);
    expect(stallingPriority).toMatchObject({
      category: 'recalibrate_plan',
      label: 'Recalibrate Plan',
    });
    expect(stallingPriority?.reason).toContain('below expectations');
    expect(stallingPriority?.evidence).toContain(`${stallingProspect.firstName} ${stallingProspect.lastName} is fighting a lower-half timing leak.`);
    expect(longViewPriority).toMatchObject({
      category: 'protect_runway',
      label: 'Protect Runway',
    });
    expect(longViewPriority?.action).toContain('Protect the development lane');
  });

  it('applies development focus plans to the existing persisted player program', () => {
    startGame(3560, 'nym');
    const state = requireState();
    const workerApi = api as typeof api & MinorLeagueWorkerApi;
    const prospect = state.players.find((player) =>
      player.teamId === 'nym'
      && player.rosterStatus === 'AA'
      && player.pitcherAttributes == null,
    )!;
    const otherTeamProspect = state.players.find((player) =>
      player.teamId !== 'nym'
      && player.rosterStatus === 'AA'
    )!;

    prospect.developmentProgram = 'tools';
    const rngCallsBefore = state.rng.getState().callCount;

    const result = workerApi.applyDevelopmentFocusPlan(prospect.id, 'recalibrate_plan');
    const exported = api.exportSnapshot() as GameSnapshot;

    expect(result).toEqual({ success: true, developmentProgram: 'refinement' });
    expect(requireState().players.find((player) => player.id === prospect.id)?.developmentProgram).toBe('refinement');
    expect(exported.players.find((player) => player.id === prospect.id)?.developmentProgram).toBe('refinement');
    expect(requireState().rng.getState().callCount).toBe(rngCallsBefore);
    expect(workerApi.applyDevelopmentFocusPlan(otherTeamProspect.id, 'promotion_window')).toMatchObject({
      success: false,
      error: 'Player is not controlled by the user team',
    });
  });

  it('fast-forwards to the playoff intro ceremony without simming the bracket', () => {
    startGame(344, 'nym');

    const result = api.simToPlayoffs();
    const flow = api.getSeasonFlowState() as { status: string; action: string | null };

    expect(result.phase).toBe('playoffs');
    expect(requireState().playoffBracket).toBeNull();
    expect(flow.status).toBe('regular_season_complete');
    expect(flow.action).toBe('watch_playoffs');
  }, 60_000);

  it.each([
    ['simDay', 'playoffs'],
    ['simWeek', 'playoffs'],
    ['simMonth', 'playoffs'],
    ['simDay', 'offseason'],
    ['simWeek', 'offseason'],
    ['simMonth', 'offseason'],
  ] as const)('routes exact legacy %s only from authorized %s phase', (operation, expectedPhase) => {
    startGame(10_000 + operation.length + expectedPhase.length, 'nym');
    const state = requireState();
    state.phase = expectedPhase;
    state.day = 1;
    if (expectedPhase === 'playoffs') {
      state.playoffBracket = null;
    } else {
      state.offseasonState = createOffseasonState(state.season);
    }
    const before = JSON.stringify(api.exportSnapshot());
    const legacyApi = api as typeof api & {
      simLegacyAdvance: (
        requested: 'simDay' | 'simWeek' | 'simMonth',
        phase: 'playoffs' | 'offseason',
      ) => { season: number; day: number; phase: string };
    };

    const result = legacyApi.simLegacyAdvance(operation, expectedPhase);

    expect(result).toEqual(expect.objectContaining({ season: expect.any(Number), day: expect.any(Number), phase: expect.any(String) }));
    expect(JSON.stringify(api.exportSnapshot())).not.toBe(before);
  }, 60_000);

  it('rejects wrong phase and unsupported legacy operations before any mutation or RNG use', () => {
    startGame(10_021, 'nym');
    const legacyApi = api as typeof api & {
      simLegacyAdvance: (operation: string, phase: string) => unknown;
    };
    const assertRejectedWithoutMutation = (operation: string, expectedPhase: string) => {
      const before = JSON.stringify(api.exportSnapshot());
      const rngCalls = requireState().rng.getState().callCount;
      expect(() => legacyApi.simLegacyAdvance(operation, expectedPhase)).toThrow(
        'Legacy simulation phase authorization failed before mutation.',
      );
      expect(JSON.stringify(api.exportSnapshot())).toBe(before);
      expect(requireState().rng.getState().callCount).toBe(rngCalls);
    };

    assertRejectedWithoutMutation('simDay', 'playoffs');
    requireState().phase = 'playoffs';
    assertRejectedWithoutMutation('simDay', 'offseason');
    assertRejectedWithoutMutation('simYear', 'playoffs');
    assertRejectedWithoutMutation('simDay', 'regular');
  }, 60_000);

  it('preserves playoff and offseason ceremony states until explicit proceed actions', () => {
    startGame(345, 'nym');
    const state = requireState();
    state.phase = 'playoffs';
    state.day = 1;
    state.news = [];
    state.briefingQueue = [];
    state.seasonHistory = [];

    const preview = api.simDay();
    let flow = api.getSeasonFlowState() as { status: string; action: string | null };

    expect(preview.phase).toBe('playoffs');
    expect(requireState().playoffBracket?.champion).toBeNull();
    expect(flow.status).toBe('playoff_preview');
    expect(flow.action).toBe('watch_playoffs');

    const completed = api.simDay();
    flow = api.getSeasonFlowState() as { status: string; action: string | null };

    expect(completed.phase).toBe('playoffs');
    expect(requireState().playoffBracket?.champion).toBeTruthy();
    expect(flow.status).toBe('playoffs_complete');
    expect(flow.action).toBe('proceed_to_offseason');
    expect(api.getSeasonHistory().length).toBeGreaterThan(0);

    const offseasonStart = api.proceedToOffseason();
    expect(offseasonStart.phase).toBe('offseason');

    requireState().offseasonState = {
      ...createOffseasonState(requireState().season),
      completed: true,
    };

    const stalled = api.simDay();
    flow = api.getSeasonFlowState() as { status: string; action: string | null };

    expect(stalled.phase).toBe('offseason');
    expect(flow.status).toBe('offseason_complete');
    expect(flow.action).toBe('start_next_season');

    const nextSeason = api.startNextSeason();

    expect(nextSeason.phase).toBe('preseason');
    expect(requireState().season).toBe(2);
    expect(requireState().playoffBracket).toBeNull();
    expect(requireState().offseasonState).toBeNull();
  }, 60_000);

  it('supports interactive playoff progression through game, series, round, and remaining-bracket APIs', () => {
    startGame(512, 'nym');
    const state = requireState();
    state.phase = 'playoffs';
    state.day = 1;
    state.playoffBracket = null;

    const preview = api.simDay();
    expect(preview.phase).toBe('playoffs');
    expect(requireState().playoffBracket?.currentRound).toBe('WILD_CARD');
    expect(requireState().playoffBracket?.champion).toBeNull();

    const afterGame = (api as typeof api & { simPlayoffGame: () => { phase: string } }).simPlayoffGame();
    expect(afterGame.phase).toBe('playoffs');
    expect(requireState().playoffBracket?.currentRoundSeries[0]?.games.length).toBe(1);

    (api as typeof api & { simPlayoffSeries: () => { phase: string } }).simPlayoffSeries();
    expect(requireState().playoffBracket?.series.length).toBeGreaterThanOrEqual(1);

    (api as typeof api & { simPlayoffRound: () => { phase: string } }).simPlayoffRound();
    expect(requireState().playoffBracket?.currentRound).toBe('DIVISION_SERIES');

    (api as typeof api & { simRemainingPlayoffs: () => { phase: string } }).simRemainingPlayoffs();
    expect(requireState().playoffBracket?.champion).toBeTruthy();
  });

  it('processes hall of fame inductions and updates the franchise timeline across rollover', () => {
    startGame(513, 'nym');
    const state = requireState();
    const icon = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;

    icon.firstName = 'Derek';
    icon.lastName = 'Monroe';
    icon.age = 45;
    icon.overallRating = 550;
    icon.hitterAttributes.durability = 40;
    state.serviceTime.set(icon.id, 12);
    state.awardHistory.push({
      season: state.season,
      award: 'MVP',
      league: 'AL',
      playerId: icon.id,
      teamId: 'nym',
      summary: `${icon.firstName} ${icon.lastName} won AL MVP.`,
    } satisfies AwardHistoryEntry);
    state.seasonState.playerSeasonStats.set(icon.id, createPlayerStats({
      playerId: icon.id,
      teamId: 'nym',
      pa: 780,
      ab: 680,
      hits: 320,
      hr: 105,
      rbi: 180,
      bb: 95,
      runs: 140,
    }));

    state.phase = 'playoffs';
    state.playoffBracket = {
      seeds: [
        { teamId: 'nym', seed: 1, wins: 103, losses: 59, league: 'AL', divisionWinner: true },
        { teamId: 'lax', seed: 1, wins: 97, losses: 65, league: 'NL', divisionWinner: true },
      ],
      currentRound: 'WORLD_SERIES',
      currentRoundSeries: [{
        id: 'WS-1',
        round: 'WORLD_SERIES',
        league: 'MLB',
        bestOf: 7,
        higherSeed: { teamId: 'nym', seed: 1, wins: 103, losses: 59, league: 'AL', divisionWinner: true },
        lowerSeed: { teamId: 'lax', seed: 1, wins: 97, losses: 65, league: 'NL', divisionWinner: true },
        games: [],
        higherSeedWins: 4,
        lowerSeedWins: 1,
        leaderSummary: 'NYT won 4-1',
        status: 'complete',
        deficitReached: null,
        deficitTeamId: null,
        winnerId: 'nym',
        loserId: 'lax',
      }],
      completedRounds: [{
        round: 'WORLD_SERIES',
        series: [{
          id: 'WS-1',
          round: 'WORLD_SERIES',
          league: 'MLB',
          bestOf: 7,
          higherSeed: { teamId: 'nym', seed: 1, wins: 103, losses: 59, league: 'AL', divisionWinner: true },
          lowerSeed: { teamId: 'lax', seed: 1, wins: 97, losses: 65, league: 'NL', divisionWinner: true },
          games: [],
          higherSeedWins: 4,
          lowerSeedWins: 1,
          leaderSummary: 'NYT won 4-1',
          status: 'complete',
          deficitReached: null,
          deficitTeamId: null,
          winnerId: 'nym',
          loserId: 'lax',
        }],
      }],
      series: [
        { winnerId: 'nym', loserId: 'lax', winnerWins: 4, loserWins: 1, games: [], round: 'WORLD_SERIES' },
      ],
      champion: 'nym',
      runnerUp: 'lax',
    };

    api.simDay();
    api.proceedToOffseason();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      completed: true,
    };

    state.hallOfFameBallot = [{
      playerId: icon.id,
      playerName: `${icon.firstName} ${icon.lastName}`,
      position: icon.position,
      careerStats: {
        playerId: icon.id,
        playerName: `${icon.firstName} ${icon.lastName}`,
        position: icon.position,
        seasonsPlayed: 13,
        teamIds: ['nym'],
        peakOverall: 80,
        championshipRings: 1,
        allStarSelections: 0,
        batting: {
          hits: 320,
          hr: 105,
          rbi: 180,
        },
        pitching: null,
      },
      score: 78,
      enteredBallotSeason: state.season,
      inductionSeason: state.season + 1,
    }];
    api.startNextSeason();

    const hallOfFame = (api as typeof api & { getHallOfFame: () => Array<{ playerId: string }> }).getHallOfFame();
    const timeline = (api as typeof api & { getFranchiseTimeline: () => Array<{ championship: boolean; playoffResult: string; dynastyScore: number }> }).getFranchiseTimeline();
    const dynasty = (api as typeof api & { getDynastyScore: () => { score: number; grade: string } | null }).getDynastyScore();

    expect(hallOfFame.some((entry) => entry.playerId === icon.id)).toBe(true);
    expect(timeline[0]?.championship).toBe(true);
    expect(timeline[0]?.playoffResult).toContain('Champion');
    expect(timeline[0]?.dynastyScore).toBeGreaterThan(0);
    expect(dynasty?.grade).not.toBe('F');
    expect(requireState().careerStats.find((entry) => entry.playerId === icon.id)?.seasonsPlayed).toBeGreaterThanOrEqual(13);
  });

  it('links current-season team timeline moments to matching box scores without advancing rng state', () => {
    startGame(14011, 'nym');
    const state = requireState();
    const gameIndex = 0;
    state.franchiseTimeline = [{
      season: state.season,
      teamId: 'nym',
      record: '88-74',
      winTotal: 88,
      playoffResult: 'Won Division Series',
      championship: false,
      worldSeriesAppearance: false,
      playoffAppearance: true,
      divisionTitle: true,
      awardWinnerCount: 0,
      keyAcquisitions: [],
      keyDepartures: [],
      dynastyScore: 144,
    }];
    state.seasonState.gameLog.length = 0;
    state.seasonState.gameLog.push({
      homeTeamId: 'nym',
      awayTeamId: 'bos',
      homeScore: 6,
      awayScore: 4,
      innings: 9,
      homeHits: 10,
      awayHits: 7,
      paResults: [],
      date: `S${state.season}D88`,
      isPlayoff: false,
    });
    state.teamMoments.set('nym', [{
      season: state.season,
      day: 88,
      timestamp: `S${state.season}D88`,
      type: 'lineup_of_era',
      description: 'The lineup announced itself with a defining win over Boston.',
      impact: 7,
      relevance: 0.92,
      isPlayoff: false,
      isEliminationGame: false,
      worldSeriesClincher: false,
      round: null,
    }]);

    const workerApi = api as typeof api & {
      getFranchiseTimeline: () => Array<{
        teamMomentBeats?: Array<{ label: string; summary: string; gameIndex?: number }>;
      }>;
    };
    const rngCallsBefore = state.rng.getState().callCount;
    const firstTimeline = workerApi.getFranchiseTimeline();
    const secondTimeline = workerApi.getFranchiseTimeline();

    expect(secondTimeline).toEqual(firstTimeline);
    expect(state.rng.getState().callCount).toBe(rngCallsBefore);
    expect(firstTimeline[0]?.teamMomentBeats?.[0]).toMatchObject({
      label: 'Lineup of Era',
      summary: 'The lineup announced itself with a defining win over Boston.',
      gameIndex,
    });
  });

  it('rolls games missed to injury into prior-season history when starting the next season', () => {
    startGame(1402, 'nym');
    const state = requireState();
    const hitter = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;

    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      completed: true,
    };
    state.seasonState.playerSeasonStats.set(hitter.id, createPlayerStats({
      playerId: hitter.id,
      teamId: hitter.teamId,
      gamesMissedToInjury: 61,
    }));

    api.startNextSeason();

    const updated = requireState().players.find((player) => player.id === hitter.id)!;
    expect(updated.priorSeasonGamesMissed).toBe(61);
    expect(requireState().seasonState.playerSeasonStats.get(hitter.id)?.gamesMissedToInjury ?? 0).toBe(0);
  });

  it('records playoff comeback history and gauntlet moments when a comeback series completes', () => {
    startGame(1403, 'nym');
    const state = requireState();
    state.phase = 'playoffs';
    state.day = 1;
    state.playoffSeriesHistory = [];
    state.teamMoments.set('lax', []);
    state.playoffBracket = {
      seeds: [
        { teamId: 'nym', seed: 1, wins: 101, losses: 61, league: 'AL', divisionWinner: true },
        { teamId: 'lax', seed: 4, wins: 90, losses: 72, league: 'AL', divisionWinner: false },
      ],
      currentRound: 'DIVISION_SERIES',
      currentRoundSeries: [{
        id: 'DS-1',
        round: 'DIVISION_SERIES',
        league: 'AL',
        bestOf: 5,
        higherSeed: { teamId: 'nym', seed: 1, wins: 101, losses: 61, league: 'AL', divisionWinner: true },
        lowerSeed: { teamId: 'lax', seed: 4, wins: 90, losses: 72, league: 'AL', divisionWinner: false },
        games: [],
        higherSeedWins: 2,
        lowerSeedWins: 2,
        leaderSummary: 'Series tied 2-2',
        status: 'in_progress',
        deficitReached: '0-2',
        deficitTeamId: 'lax',
        winnerId: null,
        loserId: null,
      }],
      completedRounds: [],
      series: [],
      champion: null,
      runnerUp: null,
    };

    for (const player of state.players) {
      if (player.teamId === 'nym' && player.rosterStatus === 'MLB') {
        player.rosterStatus = 'AAA';
      }
    }

    (api as typeof api & { simPlayoffGame: () => { phase: string } }).simPlayoffGame();

    expect(requireState().playoffSeriesHistory[0]).toMatchObject({
      deficitReached: '0-2',
      deficitTeamId: 'lax',
      winnerTeamId: 'lax',
    });
    expect(requireState().teamMoments.get('lax')?.some((moment) => moment.type === 'playoff_gauntlet')).toBe(true);
  });

  it('appends rivalry_renewed moments during offseason narrative processing for heated playoff rivals', () => {
    startGame(1404, 'nym');
    const state = requireState();
    state.phase = 'offseason';
    state.day = 182;
    state.offseasonState = {
      ...createOffseasonState(state.season),
      completed: true,
    };
    state.teamMoments.set('nym', []);
    state.teamMoments.set('bos', []);
    state.rivalries = new Map([[
      'bos:nym',
      {
        id: 'bos:nym',
        teamA: 'nym',
        teamB: 'bos',
        intensity: 85,
        summary: 'The race keeps dragging both clubs back into the same frame.',
        reasons: ['Standings pressure', 'October carryover'],
        origin: 'historical',
        active: true,
        currentSeasonWinsA: 6,
        currentSeasonWinsB: 5,
        closeRaceStreak: 1,
        playoffSeriesStreak: 2,
        eventHistory: [
          { season: state.season, type: 'playoff', summary: 'October brought them together again.' },
          { season: state.season, type: 'division_race', summary: 'The race stayed tight into the final month.' },
        ],
      },
    ]]);
    state.playoffSeriesHistory = [{
      season: state.season,
      round: 'DIVISION_SERIES',
      higherSeedTeamId: 'nym',
      lowerSeedTeamId: 'bos',
      bestOf: 5,
      deficitReached: null,
      deficitTeamId: null,
      winnerTeamId: 'nym',
    }];
    state.playoffBracket = {
      seeds: [
        { teamId: 'nym', seed: 1, wins: 98, losses: 64, league: 'AL', divisionWinner: true },
        { teamId: 'bos', seed: 4, wins: 91, losses: 71, league: 'AL', divisionWinner: false },
      ],
      currentRound: 'DIVISION_SERIES',
      currentRoundSeries: [],
      completedRounds: [],
      series: [],
      champion: null,
      runnerUp: null,
    };

    applyOffseasonNarrativeHooks(state);

    expect(state.teamMoments.get('nym')?.some((moment) => moment.type === 'rivalry_renewed')).toBe(true);
    expect(state.teamMoments.get('bos')?.some((moment) => moment.type === 'rivalry_renewed')).toBe(true);
  });

  it('appends player-arc signature moments at season end without suppressing rookie_sensation', () => {
    startGame(1505, 'nym');
    const state = requireState();
    state.day = 182;

    const rookie = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const redemption = state.players.find(
      (player) => player.teamId === 'bos' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const veteran = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.id !== rookie.id && player.pitcherAttributes == null,
    )!;

    rookie.serviceTimeDays = 60;
    rookie.priorSeasonEstimatedWar = null;
    state.playerMoments.set(rookie.id, [{
      season: state.season,
      day: state.day,
      timestamp: `S${state.season}D${state.day}`,
      type: 'rookie_sensation',
      description: 'Existing rookie spotlight.',
      impact: 52,
      relevance: 0.82,
      isPlayoff: false,
      isEliminationGame: false,
      worldSeriesClincher: false,
      round: null,
    }]);

    redemption.priorSeasonEstimatedWar = 0.3;
    veteran.age = 37;
    veteran.serviceTimeDays = 10 * 172;

    state.seasonState.playerSeasonStats.set(rookie.id, createPlayerStats({
      playerId: rookie.id,
      teamId: rookie.teamId,
      gamesPlayed: 131,
      pa: 560,
      ab: 500,
      hits: 162,
      doubles: 28,
      triples: 4,
      hr: 24,
      rbi: 84,
      bb: 58,
      runs: 93,
    }));
    state.seasonState.playerSeasonStats.set(redemption.id, createPlayerStats({
      playerId: redemption.id,
      teamId: redemption.teamId,
      gamesPlayed: 128,
      pa: 548,
      ab: 486,
      hits: 166,
      doubles: 31,
      triples: 1,
      hr: 26,
      rbi: 101,
      bb: 67,
      runs: 90,
    }));
    state.seasonState.playerSeasonStats.set(veteran.id, createPlayerStats({
      playerId: veteran.id,
      teamId: veteran.teamId,
      gamesPlayed: 124,
      pa: 544,
      ab: 482,
      hits: 165,
      doubles: 30,
      triples: 2,
      hr: 25,
      rbi: 98,
      bb: 70,
      runs: 87,
    }));

    state.careerStats = [{
      playerId: veteran.id,
      playerName: `${veteran.firstName} ${veteran.lastName}`,
      position: veteran.position,
      seasonsPlayed: 10,
      teamIds: [veteran.teamId],
      peakOverall: 78,
      championshipRings: 0,
      allStarSelections: 4,
      gamesPlayed: 1400,
      saves: 0,
      war: 45.1,
      batting: {
        hits: 1500,
        hr: 260,
        rbi: 920,
      },
      pitching: null,
    }];

    applySeasonEndPlayerArcMoments(state);
    applySeasonEndPlayerArcMoments(state);

    expect(state.playerMoments.get(rookie.id)?.map((moment) => moment.type)).toEqual(
      expect.arrayContaining(['rookie_sensation', 'rookie_breakout']),
    );
    expect(state.playerMoments.get(rookie.id)?.filter((moment) => moment.type === 'rookie_breakout')).toHaveLength(1);
    expect(state.playerMoments.get(redemption.id)?.some((moment) => moment.type === 'redemption_arc')).toBe(true);
    expect(state.playerMoments.get(veteran.id)?.some((moment) => moment.type === 'late_career_peak')).toBe(true);
  });

  it('plumbs player micro-arc sources through regular-season and season-end passes without duplicates', () => {
    startGame(1508, 'nym');
    const state = requireState();
    state.season = 1;
    state.day = 186;
    state.phase = 'regular';

    const hitters = state.players.filter((player) => player.rosterStatus === 'MLB' && player.pitcherAttributes == null);
    const injuryHero = hitters[0]!;
    const tradeHero = hitters[1]!;
    const callupHero = hitters[2]!;
    const leagueAverage = hitters[3]!;
    const pitcher = state.players.find((player) => player.rosterStatus === 'MLB' && player.pitcherAttributes != null)!;

    injuryHero.teamId = 'nym';
    tradeHero.teamId = 'bos';
    callupHero.teamId = 'nym';
    callupHero.age = 22;
    for (const player of [injuryHero, tradeHero, callupHero, leagueAverage, pitcher]) {
      player.rosterStatus = 'MLB';
    }

    state.injuries.set(injuryHero.id, {
      type: 'hamstring_strain',
      severity: 'il_15',
      daysRemaining: 0,
      totalDays: 34,
      attributePenalty: 0.03,
      reinjuryRisk: 0.05,
    });
    state.news.unshift(
      {
        id: 'micro-arc-injury-start',
        headline: 'Injury watch',
        body: 'Hamstring strain.',
        priority: 3,
        category: 'injury',
        timestamp: 'S1D66',
        relatedPlayerIds: [injuryHero.id],
        relatedTeamIds: ['nym'],
        read: false,
      },
      {
        id: 'micro-arc-callup',
        headline: 'Prospect promoted',
        body: 'call-up watch.',
        priority: 3,
        category: 'development',
        timestamp: 'S1D154',
        relatedPlayerIds: [callupHero.id],
        relatedTeamIds: ['nym'],
        read: false,
      },
    );
    state.tradeState.tradeHistory = [
      {
        id: 'micro-arc-trade',
        fromTeamId: 'nym',
        toTeamId: 'bos',
        offeringAssets: [{ type: 'player', playerId: tradeHero.id }],
        requestingAssets: [],
        fairnessScore: 12,
        summary: 'New York Tycoons sent a bat to Boston Noreasters.',
        timestamp: 'S1D118',
      },
    ];

    const injuryOutcomes = [
      ...Array<PAOutcome>(20).fill('HR'),
      ...Array<PAOutcome>(20).fill('SINGLE'),
      ...Array<PAOutcome>(20).fill('BB'),
    ];
    const tradeOutcomes = [
      ...Array<PAOutcome>(25).fill('HR'),
      ...Array<PAOutcome>(25).fill('SINGLE'),
      ...Array<PAOutcome>(25).fill('BB'),
    ];
    const callupOutcomes = [
      ...Array<PAOutcome>(15).fill('HR'),
      ...Array<PAOutcome>(15).fill('SINGLE'),
      ...Array<PAOutcome>(10).fill('BB'),
    ];
    state.seasonState.gameLog.splice(0, state.seasonState.gameLog.length, ...[
      ...injuryOutcomes.map((outcome, index) =>
        microArcBoxScore(100 + Math.floor(index / 4), [microArcPa(outcome, injuryHero.id, pitcher.id)])
      ),
      ...tradeOutcomes.map((outcome, index) =>
        microArcBoxScore(118 + Math.floor(index / 5), [microArcPa(outcome, tradeHero.id, pitcher.id)])
      ),
      ...callupOutcomes.map((outcome, index) =>
        microArcBoxScore(154 + Math.floor(index / 4), [microArcPa(outcome, callupHero.id, pitcher.id)])
      ),
    ]);
    state.seasonState.playerSeasonStats.set(injuryHero.id, createPlayerStats({
      playerId: injuryHero.id,
      teamId: injuryHero.teamId,
      pa: 220,
      ab: 170,
      hits: 70,
      hr: 22,
      bb: 45,
    }));
    state.seasonState.playerSeasonStats.set(tradeHero.id, createPlayerStats({
      playerId: tradeHero.id,
      teamId: tradeHero.teamId,
      pa: 220,
      ab: 170,
      hits: 70,
      hr: 24,
      bb: 45,
    }));
    state.seasonState.playerSeasonStats.set(callupHero.id, createPlayerStats({
      playerId: callupHero.id,
      teamId: callupHero.teamId,
      pa: 160,
      ab: 122,
      hits: 52,
      hr: 15,
      bb: 35,
    }));
    state.seasonState.playerSeasonStats.set(leagueAverage.id, createPlayerStats({
      playerId: leagueAverage.id,
      teamId: leagueAverage.teamId,
      pa: 6000,
      ab: 5400,
      hits: 1350,
      doubles: 250,
      hr: 120,
      bb: 450,
      runs: 620,
    }));

    applyRegularSeasonPlayerMicroArcMoments(state);
    applySeasonEndPlayerMicroArcMoments(state);
    applySeasonEndPlayerMicroArcMoments(state);

    expect(state.playerMoments.get(injuryHero.id)?.filter((moment) => moment.type === 'injury_return_hero')).toHaveLength(1);
    expect(state.playerMoments.get(tradeHero.id)?.filter((moment) => moment.type === 'trade_deadline_spark')).toHaveLength(1);
    expect(state.playerMoments.get(callupHero.id)?.filter((moment) => moment.type === 'september_callup_hero')).toHaveLength(1);
  });

  it('appends dynasty-marker team moments across regular-season and season-end passes without duplicates', () => {
    startGame(1606, 'nym');
    const state = requireState();
    state.season = 5;
    state.day = 182;
    state.teamMoments.set('nym', []);
    state.teamMoments.set('bos', []);
    state.seasonHistory = [
      {
        season: 3,
        championTeamId: 'nym',
        runnerUpTeamId: 'hou',
        worldSeriesRecord: '4-2',
        summary: 'New York finished on top.',
        awards: [],
        keyMoments: [],
        statLeaders: { hr: [], rbi: [], avg: [], era: [], k: [], w: [] },
        notableRetirements: [],
        blockbusterTrades: [],
        userSeason: null,
      },
      {
        season: 4,
        championTeamId: 'nym',
        runnerUpTeamId: 'bos',
        worldSeriesRecord: '4-3',
        summary: 'New York repeated.',
        awards: [],
        keyMoments: [],
        statLeaders: { hr: [], rbi: [], avg: [], era: [], k: [], w: [] },
        notableRetirements: [],
        blockbusterTrades: [],
        userSeason: null,
      },
    ];
    state.playoffSeriesHistory = [
      {
        season: 1,
        round: 'DIVISION_SERIES',
        higherSeedTeamId: 'nym',
        lowerSeedTeamId: 'tor',
        bestOf: 5,
        deficitReached: null,
        deficitTeamId: null,
        winnerTeamId: 'nym',
      },
      {
        season: 2,
        round: 'DIVISION_SERIES',
        higherSeedTeamId: 'nym',
        lowerSeedTeamId: 'bal',
        bestOf: 5,
        deficitReached: null,
        deficitTeamId: null,
        winnerTeamId: 'bal',
      },
      {
        season: 3,
        round: 'DIVISION_SERIES',
        higherSeedTeamId: 'nym',
        lowerSeedTeamId: 'hou',
        bestOf: 5,
        deficitReached: null,
        deficitTeamId: null,
        winnerTeamId: 'nym',
      },
      {
        season: 4,
        round: 'DIVISION_SERIES',
        higherSeedTeamId: 'nym',
        lowerSeedTeamId: 'bos',
        bestOf: 5,
        deficitReached: null,
        deficitTeamId: null,
        winnerTeamId: 'nym',
      },
    ];
    state.seasonArchive = [{
      season: 4,
      standings: [
        { teamId: 'bos', wins: 92, losses: 70, gamesBack: 6, divisionRank: 2 },
        { teamId: 'nym', wins: 98, losses: 64, gamesBack: 0, divisionRank: 1 },
      ],
      playoffSeries: [],
      awards: [],
      statLeaders: { hr: [], rbi: [], avg: [], era: [], k: [], w: [] },
      transactions: [],
      draftClass: [],
      financials: [],
      userSummary: null,
      timelineEvents: [],
    }];
    state.archivedSeasons = [];
    state.seasonState = {
      ...state.seasonState,
      standings: {
        getLeagueStandings: () => [
          {
            teamId: 'nym',
            wins: 99,
            losses: 63,
            pct: 0.611,
            gamesBack: 0,
            runsScored: 810,
            runsAllowed: 640,
            runDifferential: 170,
            streak: 'W3',
            last10Wins: 7,
            last10Losses: 3,
          },
          {
            teamId: 'bos',
            wins: 79,
            losses: 83,
            pct: 0.488,
            gamesBack: 13,
            runsScored: 690,
            runsAllowed: 740,
            runDifferential: -50,
            streak: 'L2',
            last10Wins: 4,
            last10Losses: 6,
          },
        ],
        getFullStandings: () => ({
          'AL East': [
            {
              teamId: 'nym',
              wins: 99,
              losses: 63,
              pct: 0.611,
              gamesBack: 0,
              runsScored: 810,
              runsAllowed: 640,
              runDifferential: 170,
              streak: 'W3',
              last10Wins: 7,
              last10Losses: 3,
            },
            {
              teamId: 'bos',
              wins: 79,
              losses: 83,
              pct: 0.488,
              gamesBack: 20,
              runsScored: 690,
              runsAllowed: 740,
              runDifferential: -50,
              streak: 'L2',
              last10Wins: 4,
              last10Losses: 6,
            },
          ],
        }),
      } as unknown as typeof state.seasonState.standings,
    };
    state.playoffBracket = {
      seeds: [
        { teamId: 'nym', seed: 1, wins: 99, losses: 63, league: 'AL', divisionWinner: true },
        { teamId: 'hou', seed: 2, wins: 95, losses: 67, league: 'AL', divisionWinner: true },
      ],
      currentRound: 'WORLD_SERIES',
      currentRoundSeries: [],
      completedRounds: [],
      series: [],
      champion: 'nym',
      runnerUp: 'hou',
    };

    applyRegularSeasonTeamDynastyMarkers(state);
    applyRegularSeasonTeamDynastyMarkers(state);
    applySeasonEndTeamDynastyMarkers(state);
    applySeasonEndTeamDynastyMarkers(state);

    expect(state.teamMoments.get('bos')?.filter((moment) => moment.type === 'era_ending_collapse')).toHaveLength(1);
    expect(state.teamMoments.get('nym')?.filter((moment) => moment.type === 'three_peat')).toHaveLength(1);
    expect(state.teamMoments.get('nym')?.filter((moment) => moment.type === 'perennial_contender')).toHaveLength(1);
  });

  it('applies regular-season position group moments idempotently', () => {
    startGame(1420, 'nym');
    const state = requireState();
    const nymStarters = state.players
      .filter((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.position === 'SP')
      .slice(0, 5);
    const nymRelievers = state.players
      .filter((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && (player.position === 'RP' || player.position === 'CL'))
      .slice(0, 3);
    const nymHitters = state.players
      .filter((player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null)
      .slice(0, 9);
    const bosPitcher = state.players.find((player) => player.teamId === 'bos' && player.rosterStatus === 'MLB' && player.position === 'SP')!;
    const bosHitters = state.players
      .filter((player) => player.teamId === 'bos' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null)
      .slice(0, 9);

    state.seasonState.playerSeasonStats.clear();
    for (const starter of nymStarters) {
      state.seasonState.playerSeasonStats.set(starter.id, createPlayerStats({
        playerId: starter.id,
        teamId: 'nym',
        ip: 330,
        earnedRuns: 36,
        strikeouts: 155,
      }));
    }
    for (const reliever of nymRelievers) {
      state.seasonState.playerSeasonStats.set(reliever.id, createPlayerStats({
        playerId: reliever.id,
        teamId: 'nym',
        ip: 405,
        earnedRuns: 155,
      }));
    }
    for (const hitter of nymHitters) {
      state.seasonState.playerSeasonStats.set(hitter.id, createPlayerStats({
        playerId: hitter.id,
        teamId: 'nym',
        pa: 650,
        ab: 560,
        hits: 190,
        doubles: 42,
        triples: 4,
        hr: 42,
        bb: 82,
        hbp: 5,
        sacFlies: 3,
        runs: 120,
      }));
    }
    state.seasonState.playerSeasonStats.set(bosPitcher.id, createPlayerStats({
      playerId: bosPitcher.id,
      teamId: 'bos',
      ip: 2_700,
      earnedRuns: 300,
    }));
    for (const hitter of bosHitters) {
      state.seasonState.playerSeasonStats.set(hitter.id, createPlayerStats({
        playerId: hitter.id,
        teamId: 'bos',
        pa: 620,
        ab: 570,
        hits: 112,
        doubles: 18,
        triples: 1,
        hr: 8,
        bb: 42,
        hbp: 4,
        sacFlies: 4,
        runs: 48,
      }));
    }

    applyRegularSeasonPositionGroupMoments(state);
    applyRegularSeasonPositionGroupMoments(state);

    expect(state.teamMoments.get('nym')?.filter((moment) => moment.type === 'dominant_rotation')).toHaveLength(1);
    expect(state.teamMoments.get('nym')?.filter((moment) => moment.type === 'bullpen_collapse')).toHaveLength(1);
    expect(state.teamMoments.get('nym')?.filter((moment) => moment.type === 'lineup_of_era')).toHaveLength(1);
  });

  it('computes weekly moment checkpoints across day, week, month, and season-complete passes', () => {
    expect(getWeeklyMomentCheckpointDays(7, 8, false)).toEqual([7]);
    expect(getWeeklyMomentCheckpointDays(1, 8, false)).toEqual([7]);
    expect(getWeeklyMomentCheckpointDays(1, 31, false)).toEqual([7, 14, 21, 28]);
    expect(getWeeklyMomentCheckpointDays(155, 163, true)).toEqual([161, 162]);
  });

  it('applies weekly moments idempotently across crossed regular-season checkpoints', () => {
    startGame(1709, 'nym');
    const state = requireState();
    state.season = 1;
    state.day = 31;
    state.phase = 'regular';
    state.teamMoments.set('nym', []);
    state.seasonState.gameLog.splice(0, state.seasonState.gameLog.length, ...[
      ...[1, 2, 3, 4, 5].map((day) => weeklyTeamBoxScore(day)),
      ...[22, 23, 24, 25, 26].map((day) => weeklyTeamBoxScore(day)),
    ]);

    applyWeeklyMomentsForCompletedRange(state, 1, 31, false);
    applyWeeklyMomentsForCompletedRange(state, 1, 31, false);

    expect(state.teamMoments.get('nym')?.filter((moment) => moment.type === 'hot_streak_week')).toHaveLength(2);
    expect(state.teamMoments.get('nym')?.filter((moment) => moment.type === 'hot_streak_week').map((moment) => moment.day)).toEqual([28, 7]);
  });

  it('builds a unified press room feed with duplicate news wrappers removed and deterministic ordering', () => {
    startGame(777, 'nym');
    const state = requireState();
    state.news = [
      {
        id: 'news-read-feature',
        headline: 'Read feature still belongs in the archive',
        body: 'Previously read items should remain visible in Press Room.',
        priority: 2,
        category: 'performance',
        timestamp: 'S1D9',
        relatedPlayerIds: [],
        relatedTeamIds: ['nym'],
        read: true,
      },
      {
        id: 'news-breaker',
        headline: 'Breaking trade headline',
        body: 'This should sort behind same-timestamp briefing items.',
        priority: 2,
        category: 'trade',
        timestamp: 'S1D10',
        relatedPlayerIds: [],
        relatedTeamIds: ['nym', 'bos'],
        read: false,
      },
      {
        id: 'press-conference-1',
        headline: 'Press Conference: New York Tycoons',
        body: 'The room carried a sharper edge: Why should fans stay patient?',
        priority: 3,
        category: 'press_conference',
        tag: 'ANALYSIS',
        timestamp: 'S1D10',
        relatedPlayerIds: [],
        relatedTeamIds: ['nym'],
        read: false,
      },
    ];
    state.briefingQueue = [
      {
        id: 'brief-news-breaker',
        priority: 1,
        category: 'news',
        headline: 'Duplicate wrapper should be suppressed',
        body: 'This wrapper should not survive when the underlying news item exists.',
        relatedTeamIds: ['nym'],
        relatedPlayerIds: [],
        timestamp: 'S1D10',
        acknowledged: false,
      },
      {
        id: 'brief-owner-heat',
        priority: 2,
        category: 'owner',
        headline: 'Owner pressure is rising.',
        body: 'Ownership wants a stronger response after a rough week.',
        relatedTeamIds: ['nym'],
        relatedPlayerIds: [],
        timestamp: 'S1D10',
        acknowledged: false,
      },
      {
        id: 'brief-rivalry',
        priority: 2,
        category: 'rivalry',
        headline: 'The rivalry is escalating.',
        body: 'Boston keeps showing up in the biggest spots.',
        relatedTeamIds: ['nym', 'bos'],
        relatedPlayerIds: [],
        timestamp: 'S1D10',
        acknowledged: false,
      },
    ];

    const feed = api.getPressRoomFeed();

    expect(feed).toEqual([
      expect.objectContaining({
        id: 'brief-owner-heat',
        source: 'briefing',
        category: 'owner',
        headline: 'Owner pressure is rising.',
        timestamp: 'S1D10',
      }),
      expect.objectContaining({
        id: 'brief-rivalry',
        source: 'briefing',
        category: 'rivalry',
        headline: 'The rivalry is escalating.',
        timestamp: 'S1D10',
      }),
      expect.objectContaining({
        id: 'news-breaker',
        source: 'league_wire',
        category: 'trade',
        headline: 'Breaking trade headline',
        timestamp: 'S1D10',
      }),
      expect.objectContaining({
        id: 'press-conference-1',
        source: 'press_conference',
        category: 'press_conference',
        headline: 'Press Conference: New York Tycoons',
        timestamp: 'S1D10',
      }),
      expect.objectContaining({
        id: 'news-read-feature',
        source: 'league_wire',
        category: 'performance',
        headline: 'Read feature still belongs in the archive',
        timestamp: 'S1D9',
      }),
      expect.objectContaining({
        id: 'synthetic-rivalry-bos:nym-1-1',
        source: 'league_wire',
        category: 'rivalry',
        headline: 'Rivalry watch: NYT vs BOS',
        timestamp: 'S1D1',
      }),
    ]);
    expect(feed.some((entry) => entry.id === 'brief-news-breaker')).toBe(false);
  });

  it('projects arbitration pressers and holdout briefings into the correct press room desks', () => {
    startGame(7811, 'nym');
    const state = requireState();
    state.news = [
      {
        id: 'press-conference-arbitration-player-1-5-12',
        headline: 'Juan Soto arbitration fallout sets the room on edge',
        body: 'The GM defended the filing while the agent pushed back on the public framing.',
        priority: 2,
        category: 'arbitration',
        timestamp: 'S5D12',
        relatedPlayerIds: ['player-1'],
        relatedTeamIds: ['nym'],
        read: false,
      },
      {
        id: 'briefing-holdout-player-2-5-12',
        headline: 'Rafael Devers holdout pressure is climbing in Boston',
        body: 'Clubhouse frustration is starting to leak into the daily briefings.',
        priority: 2,
        category: 'holdout',
        timestamp: 'S5D12',
        relatedPlayerIds: ['player-2'],
        relatedTeamIds: ['bos'],
        read: false,
      },
    ];
    state.briefingQueue = [];

    const feed = api.getPressRoomFeed();

    expect(feed).toContainEqual(expect.objectContaining({
      id: 'press-conference-arbitration-player-1-5-12',
      source: 'press_conference',
      category: 'arbitration',
    }));
    expect(feed).toContainEqual(expect.objectContaining({
      id: 'briefing-holdout-player-2-5-12',
      source: 'briefing',
      category: 'holdout',
    }));
  });

  it('defaults press room feed to the newest 100 entries', () => {
    startGame(778, 'nym');
    const state = requireState();
    state.news = Array.from({ length: 120 }, (_, index) => ({
      id: `news-${index + 1}`,
      headline: `Headline ${index + 1}`,
      body: `Body ${index + 1}`,
      priority: 3,
      category: 'performance' as const,
      timestamp: `S1D${index + 1}`,
      relatedPlayerIds: [],
      relatedTeamIds: ['nym'],
      read: index % 2 === 0,
    }));
    state.briefingQueue = [];

    const feed = api.getPressRoomFeed();

    expect(feed).toHaveLength(100);
    expect(feed[0]?.id).toBe('news-120');
    expect(feed.at(-1)?.id).toBe('news-21');
  });

  it('injects synthetic rumor, development, rivalry, and hot-stove entries with derived tags', () => {
    startGame(779, 'nym');
    const state = requireState();
    const prospect = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus !== 'MLB',
    )!;
    const freeAgentTarget = state.players.find(
      (player) => player.teamId === 'por' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;

    state.day = 100;
    state.tradeState.pendingOffers = [buildIncomingOffer('offer-synthetic').offer];
    state.minorLeagueState.developmentReports = [
      {
        playerId: prospect.id,
        teamId: 'nym',
        season: state.season,
        month: 6,
        trajectory: 'ahead_of_curve',
        summary: 'The player development group is pushing for a promotion.',
        overallRating: prospect.overallRating,
      },
    ];
    state.rivalries.set('bos:nym', {
      id: 'bos:nym',
      teamA: 'nym',
      teamB: 'bos',
      intensity: 74,
      summary: 'The division race is getting personal again.',
      reasons: ['Playoff chase', 'Three heated series'],
    });
    state.freeAgencyMarket = {
      season: state.season,
      day: 8,
      freeAgents: [
        {
          player: {
            ...freeAgentTarget,
            teamId: '',
            contract: {
              ...freeAgentTarget.contract,
              years: 0,
              annualSalary: 0,
              totalValue: 0,
            },
          },
          marketValue: 27.5,
          demandLevel: 'elite',
          interestedTeams: ['bos', 'lax', 'chi'],
          signedWith: null,
          contract: null,
        },
      ],
      signedPlayers: [],
    };

    const feed = api.getPressRoomFeed();
    const deadlineRumor = feed.find((entry) => entry.id === `synthetic-rumor-${state.season}-${state.day}`);
    const hotStoveRumor = feed.find((entry) => entry.id === `synthetic-fa-rumor-${freeAgentTarget.id}-${state.season}-${state.day}`);
    const development = feed.find((entry) => entry.category === 'development');
    const rivalry = feed.find((entry) => entry.id.startsWith('synthetic-rivalry-'));

    expect(deadlineRumor).toMatchObject({
      category: 'rumor',
      tag: 'RUMOR',
      relatedTeamIds: ['nym'],
    });
    expect(deadlineRumor?.headline).toContain('Deadline buzz');

    expect(hotStoveRumor).toMatchObject({
      category: 'rumor',
      tag: 'RUMOR',
      relatedPlayerIds: [freeAgentTarget.id],
      relatedTeamIds: ['bos', 'lax', 'chi'],
    });
    expect(hotStoveRumor?.headline).toContain(freeAgentTarget.firstName);

    expect(development).toMatchObject({
      category: 'development',
      tag: 'ANALYSIS',
      relatedPlayerIds: [prospect.id],
      relatedTeamIds: ['nym'],
    });
    expect(development?.headline).toContain(`${prospect.firstName} ${prospect.lastName}`);
    expect(development?.body).toContain('promotion');

    expect(rivalry).toMatchObject({
      category: 'rivalry',
      tag: 'WATCH',
      relatedTeamIds: ['nym', 'bos'],
    });
    expect(rivalry?.headline).toContain('NYT');
    expect(rivalry?.headline).toContain('BOS');
  });

  it('derives debate and watch tags from category and keywords instead of passthrough tags', () => {
    startGame(7800, 'nym');
    const state = requireState();
    state.news = [
      {
        id: 'press-1',
        headline: 'Press Conference: New York Tycoons',
        body: 'The room turned into a live debate over the deadline posture.',
        priority: 3,
        category: 'press_conference',
        tag: 'BREAKING',
        timestamp: 'S1D12',
        relatedPlayerIds: [],
        relatedTeamIds: ['nym'],
        read: false,
      },
    ];
    state.briefingQueue = [
      {
        id: 'brief-watch-1',
        priority: 3,
        category: 'development',
        headline: 'Prospect watch: the next promotion call is getting louder',
        body: 'Scouts want another look after a strong week.',
        relatedTeamIds: ['nym'],
        relatedPlayerIds: [],
        timestamp: 'S1D12',
        acknowledged: false,
      },
    ];

    const feed = api.getPressRoomFeed();

    expect(feed.find((entry) => entry.id === 'press-1')?.tag).toBe('DEBATE');
    expect(feed.find((entry) => entry.id === 'brief-watch-1')?.tag).toBe('WATCH');
  });

  it('adds rivalry-flavored ticker text for heated score lines', () => {
    startGame(7801, 'nym');
    const state = requireState();
    state.rivalries.set('bos:nym', {
      id: 'bos:nym',
      teamA: 'nym',
      teamB: 'bos',
      intensity: 88,
      active: true,
      summary: 'The latest chapter is boiling over.',
      origin: 'historical',
      reasons: ['Division race'],
      currentSeasonWinsA: 3,
      currentSeasonWinsB: 1,
      historicalWinsA: 140,
      historicalWinsB: 133,
      lastMetSeason: state.season,
      closeRaceStreak: 2,
      playoffSeriesStreak: 0,
      lastTradeSeason: 0,
      lastDefectionSeason: 0,
      eventHistory: [],
    });

    refreshTickerFeed(state, {
      simDay: state.day,
      games: [{
        homeTeamId: 'nym',
        awayTeamId: 'bos',
        homeScore: 5,
        awayScore: 3,
        innings: 9,
        homeHits: 9,
        awayHits: 7,
        paResults: [],
        date: 'S1D1',
        isPlayoff: false,
      }],
      previousStandings: state.seasonState.standings.serialize(),
      previousInjuryIds: new Set(),
      previousTradeCount: state.tradeState.tradeHistory.length,
    });

    expect(state.tickerFeed[0]?.text).toContain('The rivalry intensifies as');
    expect(state.tickerFeed[0]?.text).toContain('3-1');
  });

  it('feeds dramatic game highlights into the ticker and league news', () => {
    startGame(7802, 'nym');
    const state = requireState();
    const hitter = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const pitcher = state.players.find(
      (player) => player.teamId === 'bos' && player.rosterStatus === 'MLB' && player.pitcherAttributes != null,
    )!;

    refreshTickerFeed(state, {
      simDay: state.day,
      games: [{
        homeTeamId: 'nym',
        awayTeamId: 'bos',
        homeScore: 6,
        awayScore: 5,
        innings: 9,
        homeHits: 9,
        awayHits: 8,
        paResults: [{
          outcome: 'HR',
          batterId: hitter.id,
          pitcherId: pitcher.id,
          inning: 9,
          halfInning: 'bottom',
          outs: 1,
          runnersOn: 1,
          scoreBefore: [5, 4],
          scoreAfter: [5, 6],
          rbiOnPlay: 2,
          isWalkOff: true,
        }],
        date: 'S1D1',
        isPlayoff: false,
      }],
      previousStandings: state.seasonState.standings.serialize(),
      previousInjuryIds: new Set(),
      previousTradeCount: state.tradeState.tradeHistory.length,
    });

    const highlightNews = state.news.find((item) =>
      item.category === 'performance'
      && item.relatedTeamIds.includes('nym')
      && item.relatedTeamIds.includes('bos'),
    );
    const walkoffTicker = state.tickerFeed.find((entry) =>
      entry.relatedPlayerIds.includes(hitter.id) && /walk-off/i.test(entry.text),
    );

    expect(walkoffTicker?.relatedPlayerIds).toContain(hitter.id);
    expect(highlightNews?.headline.toLowerCase()).toContain('walk-off');
    expect(highlightNews?.body).toMatch(/walk-off/i);
  });

  it('publishes career milestone news with structured cumulative totals', () => {
    startGame(7803, 'nym');
    const state = requireState();
    state.day = 72;
    const hitter = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const playerName = `${hitter.firstName} ${hitter.lastName}`;

    state.careerStats.push({
      playerId: hitter.id,
      playerName,
      position: hitter.position,
      seasonsPlayed: 8,
      teamIds: [hitter.teamId],
      peakOverall: 78,
      championshipRings: 0,
      allStarSelections: 4,
      gamesPlayed: 1100,
      saves: 0,
      war: 36.4,
      batting: {
        hits: 1400,
        hr: 400,
        rbi: 940,
      },
      pitching: null,
    });
    state.seasonState.playerSeasonStats.set(hitter.id, createPlayerStats({
      playerId: hitter.id,
      teamId: hitter.teamId,
      gamesPlayed: 72,
      pa: 310,
      ab: 276,
      hits: 100,
      hr: 100,
      rbi: 128,
    }));

    processDayInjuriesAndNews(state);

    const milestoneText = state.news
      .filter((item) => item.category === 'milestone')
      .map((item) => `${item.headline} ${item.body}`)
      .join('\n');

    expect(milestoneText).toContain(playerName);
    expect(milestoneText).toContain('500');
    expect(milestoneText).not.toMatch(/Unknown|#0|0th|undefined/);
  });

  it('feeds ticker milestone entries from career totals instead of season totals', () => {
    startGame(7804, 'nym');
    const state = requireState();
    state.day = 72;
    const hitter = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const playerName = `${hitter.firstName} ${hitter.lastName}`;

    state.careerStats.push({
      playerId: hitter.id,
      playerName,
      position: hitter.position,
      seasonsPlayed: 8,
      teamIds: [hitter.teamId],
      peakOverall: 78,
      championshipRings: 0,
      allStarSelections: 4,
      gamesPlayed: 1100,
      saves: 0,
      war: 36.4,
      batting: {
        hits: 1400,
        hr: 400,
        rbi: 940,
      },
      pitching: null,
    });
    state.seasonState.playerSeasonStats.set(hitter.id, createPlayerStats({
      playerId: hitter.id,
      teamId: hitter.teamId,
      gamesPlayed: 72,
      pa: 310,
      ab: 276,
      hits: 100,
      hr: 100,
      rbi: 128,
    }));

    refreshTickerFeed(state, {
      simDay: state.day,
      games: [],
      previousStandings: state.seasonState.standings.serialize(),
      previousInjuryIds: new Set(),
      previousTradeCount: state.tradeState.tradeHistory.length,
    });

    const milestoneTickerText = state.tickerFeed
      .filter((entry) => entry.category === 'milestone')
      .map((entry) => entry.text)
      .join('\n');

    expect(milestoneTickerText).toContain(playerName);
    expect(milestoneTickerText).toContain('#500');
    expect(milestoneTickerText).not.toContain('#100');
    expect(milestoneTickerText).not.toMatch(/Unknown|#0|0th|undefined/);
  });

  it('returns advanced stat lines and advanced leaderboard results', () => {
    startGame(780, 'nym');
    const state = requireState();
    const hitter = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const pitcher = state.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes != null,
    )!;

    state.seasonState.playerSeasonStats.set(hitter.id, createPlayerStats({
      playerId: hitter.id,
      teamId: hitter.teamId,
      pa: 640,
      ab: 555,
      hits: 182,
      doubles: 38,
      triples: 4,
      hr: 34,
      rbi: 112,
      bb: 74,
      hbp: 6,
      sacFlies: 5,
      runs: 101,
    }));
    state.seasonState.playerSeasonStats.set(pitcher.id, createPlayerStats({
      playerId: pitcher.id,
      teamId: pitcher.teamId,
      ip: 585,
      earnedRuns: 64,
      strikeouts: 201,
      walks: 42,
      hitsAllowed: 141,
      homeRunsAllowed: 18,
      hitBatters: 4,
      flyBallsAllowed: 177,
      wins: 16,
      losses: 6,
    }));

    const hitterAdvanced = api.getAdvancedStats(hitter.id);
    const pitcherAdvanced = api.getAdvancedStats(pitcher.id);
    const wobaLeader = api.getLeagueLeaders('woba', 1)[0];
    const fipLeader = api.getLeagueLeaders('fip', 1)[0];

    expect(hitterAdvanced?.woba).toBeGreaterThan(0.35);
    expect(hitterAdvanced?.war).toBeGreaterThan(0);
    expect(pitcherAdvanced?.fip).toBeGreaterThan(0);
    expect(pitcherAdvanced?.war).toBeGreaterThan(0);

    expect(wobaLeader?.id).toBe(hitter.id);
    expect(wobaLeader?.advanced?.woba).toBeCloseTo(hitterAdvanced?.woba ?? 0, 3);
    expect(fipLeader?.id).toBe(pitcher.id);
    expect(fipLeader?.advanced?.fip).toBeCloseTo(pitcherAdvanced?.fip ?? 0, 3);
  });

  it('reports runtime diagnostics while archive and prune maintenance mutate worker state only', async () => {
    startGame(654, 'nym');
    const workerApi = api as typeof api & MinorLeagueWorkerApi;
    const snapshot = workerApi.exportSnapshot();

    workerApi.importSnapshot(snapshot);
    workerApi.simDay();

    const state = requireState();
    state.season = 13;
    state.performanceDiagnostics = {
      totalSeasons: 13,
      // A persisted legacy size is deliberately not evidence of the current
      // snapshot. The diagnostics query must recompute without writing it.
      snapshotSizeBytes: 9_999_999,
    };
    state.seasonArchive = Array.from({ length: 12 }, (_, index) => ({
      season: index + 1,
      standings: [{
        teamId: 'nym',
        wins: 80 + index,
        losses: 82 - Math.min(index, 10),
        divisionRank: 1,
        gamesBack: 0,
      }],
      playoffSeries: [],
      awards: [],
      statLeaders: {
        hr: [],
        rbi: [],
        avg: [],
        era: [],
        k: [],
        w: [],
      },
      transactions: [],
      draftClass: [],
      financials: [],
      userSummary: {
        teamId: 'nym',
        record: `${80 + index}-${82 - Math.min(index, 10)}`,
        playoffResult: 'Missed playoffs',
        storylines: [`Season ${index + 1}`],
      },
      timelineEvents: [],
    }));
    state.archivedSeasons = [];
    state.tickerFeed = [
      {
        id: 'ticker-old-same-season',
        timestamp: 'S13D1',
        category: 'rumor',
        text: 'Old same-season ticker',
        priority: 4,
        relatedTeamIds: ['nym'],
        relatedPlayerIds: [],
        expiresDay: 13003,
      },
      {
        id: 'ticker-old-prior-season',
        timestamp: 'S12D50',
        category: 'rumor',
        text: 'Old prior-season ticker',
        priority: 4,
        relatedTeamIds: ['nym'],
        relatedPlayerIds: [],
        expiresDay: 12050,
      },
      {
        id: 'ticker-live',
        timestamp: 'S13D10',
        category: 'score',
        text: 'Fresh ticker',
        priority: 2,
        relatedTeamIds: ['nym'],
        relatedPlayerIds: [],
        expiresDay: 13030,
      },
    ];
    state.consequenceWatchers = [
      {
        id: 'watcher-expired',
        type: 'fan_reaction',
        createdSeason: 12,
        createdDay: 20,
        expiresSeason: 13,
        expiresDay: 5,
        context: {},
        resolved: false,
      },
      {
        id: 'watcher-resolved',
        type: 'contract_reaction',
        createdSeason: 13,
        createdDay: 8,
        expiresSeason: 13,
        expiresDay: 12,
        context: {},
        resolved: true,
      },
      {
        id: 'watcher-active',
        type: 'trade_aftermath',
        createdSeason: 13,
        createdDay: 9,
        expiresSeason: 13,
        expiresDay: 20,
        context: {},
        resolved: false,
      },
    ];
    const narrativePlayer = state.players.find((player) => player.teamId === 'nym')!;
    state.playerStoryArcs = [{
      playerId: narrativePlayer.id,
      arcType: 'protected_narrative_memory',
      startSeason: 12,
      startDay: 1,
      phase: 'rising',
      milestones: ['This unrelated arc must survive stale presentation pruning.'],
      resolvedSeason: null,
    }];
    state.day = 10;

    const snapshotBeforeDiagnostics = workerApi.exportSnapshot();
    const rngBeforeDiagnostics = state.rng.getState();
    const persistedSizeBeforeDiagnostics = state.performanceDiagnostics.snapshotSizeBytes;
    const diagnosticsBefore = workerApi.getPerformanceDiagnostics();
    expect(diagnosticsBefore).not.toBeNull();
    if (!diagnosticsBefore) {
      throw new Error('Expected diagnostics after the worker was initialized.');
    }
    expect(diagnosticsBefore.runtime.lastLoadMs).not.toBeNull();
    expect(diagnosticsBefore.runtime.lastSimDayMs).not.toBeNull();
    expect(diagnosticsBefore.totals.snapshotSizeBytes).toBe(
      new TextEncoder().encode(JSON.stringify(snapshotBeforeDiagnostics)).byteLength,
    );
    expect(state.performanceDiagnostics.snapshotSizeBytes).toBe(persistedSizeBeforeDiagnostics);
    expect(workerApi.exportSnapshot()).toEqual(snapshotBeforeDiagnostics);
    expect(state.rng.getState()).toEqual(rngBeforeDiagnostics);
    expect(diagnosticsBefore.queues.staleTickerEntries).toBe(2);
    expect(diagnosticsBefore.queues.resolvedWatchers).toBe(1);
    expect(diagnosticsBefore.queues.staleWatchers).toBe(2);
    expect(diagnosticsBefore.queues.activeWatchers).toBe(1);

    const archived = await workerApi.archiveOldSeasons();
    expect(archived.success).toBe(true);
    expect(archived.archivedCount).toBe(2);
    expect(archived.diagnostics.totals.liveArchiveSeasons).toBe(10);
    expect(archived.diagnostics.totals.archivedSeasons).toBe(2);

    state.performanceDiagnostics.totalSeasons = 1;
    const snapshotBeforeNoOpArchive = workerApi.exportSnapshot();
    const rngBeforeNoOpArchive = state.rng.getState();
    const noOpArchive = await workerApi.archiveOldSeasons();
    expect(noOpArchive.archivedCount).toBe(0);
    expect(workerApi.exportSnapshot()).toEqual(snapshotBeforeNoOpArchive);
    expect(state.rng.getState()).toEqual(rngBeforeNoOpArchive);

    const pruned = await workerApi.pruneStaleData();
    expect(pruned.success).toBe(true);
    expect(pruned.prunedCount).toBe(4);
    expect(pruned.diagnostics.queues.tickerEntries).toBe(1);
    expect(pruned.diagnostics.queues.activeWatchers).toBe(1);
    expect(pruned.diagnostics.queues.staleTickerEntries).toBe(0);
    expect(pruned.diagnostics.queues.staleWatchers).toBe(0);
    expect(pruned.diagnostics.runtime.lastSaveMs).toBe(diagnosticsBefore.runtime.lastSaveMs);
    expect(state.playerStoryArcs).toEqual([{
      playerId: narrativePlayer.id,
      arcType: 'protected_narrative_memory',
      startSeason: 12,
      startDay: 1,
      phase: 'rising',
      milestones: ['This unrelated arc must survive stale presentation pruning.'],
      resolvedSeason: null,
    }]);
    const rngAfterPrune = state.rng.getState();
    const snapshotAfterPrune = workerApi.exportSnapshot();
    const noOp = await workerApi.pruneStaleData();
    expect(noOp.prunedCount).toBe(0);
    expect(workerApi.exportSnapshot()).toEqual(snapshotAfterPrune);
    expect(state.rng.getState()).toEqual(rngAfterPrune);
    expect(mockedLoadGameById).not.toHaveBeenCalled();
    expect(mockedSaveGameById).not.toHaveBeenCalled();
  });
});
