// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AwardHistoryEntry } from '@mbd/contracts';
import {
  buildRosterState,
  createOffseasonState,
  evaluatePlayerTradeValue,
  type GeneratedPlayer,
  type PlayerGameStats,
} from '@mbd/sim-core';

vi.mock('comlink', () => ({
  expose: () => {},
}));

vi.mock('../shared/lib/saveSystem.js', () => ({
  createBranchSave: vi.fn(),
  deleteSaveById: vi.fn(),
  listBranches: vi.fn(),
  loadGameById: vi.fn(),
}));

import { api } from './sim.worker';
import { requireState, setState } from './sim.worker.helpers';
import { processTradeMarketActivity } from './sim.worker.trade';
import { refreshTickerFeed } from './sim.worker.ticker';
import { applyOffseasonNarrativeHooks } from './sim.worker.narrativeFarm';
import {
  createBranchSave,
  deleteSaveById,
  listBranches,
  loadGameById,
} from '../shared/lib/saveSystem.js';

const mockedCreateBranchSave = vi.mocked(createBranchSave);
const mockedDeleteSaveById = vi.mocked(deleteSaveById);
const mockedListBranches = vi.mocked(listBranches);
const mockedLoadGameById = vi.mocked(loadGameById);

function startGame(seed: number, userTeamId: string = 'nyy') {
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
    userTeamId: options.userTeamId ?? 'nyy',
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
    level: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
  }>;
  recentBoxScores: Array<{
    id: string;
    level: string;
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
  summary: string;
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
  getExtensionCandidates: (teamId?: string) => Array<{
    playerId: string;
    willingness: number;
  }>;
  getExtensionOffer: (playerId: string, years: number) => {
    years: number;
    annualSalary: number;
    totalValue: number;
  } | null;
  negotiateExtension: (
    playerId: string,
    offer: {
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
    },
  ) => {
    status: 'accepted' | 'rejected' | 'countered';
    rounds: Array<{ round: number; status: string }>;
  };
  getQualifyingOfferEligible: (teamId?: string) => Array<{ playerId: string }>;
  getQualifyingOfferSalary: () => number;
  issueQualifyingOffer: (playerId: string) => { success: boolean };
  resolveQualifyingOffers: () => {
    resolved: Array<{ playerId: string; status: string }>;
  };
  hireCoach: (coachId: string) => { success: boolean };
  fireCoach: (coachId: string) => { success: boolean };
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
  getBranches: (parentSaveId: string) => Promise<Array<{
    id: string;
    parentSaveId: string | null;
    isRootSave: boolean;
    branchMeta: {
      description: string;
    } | null;
  }>>;
  createWhatIfBranch: (parentSaveId: string, description: string) => Promise<{
    id: string;
    parentSaveId: string | null;
    isRootSave: boolean;
    branchMeta: {
      description: string;
    } | null;
  }>;
  deleteWhatIfBranch: (branchSaveId: string) => Promise<{ success: boolean }>;
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

function createPlayerStats(overrides: Partial<PlayerGameStats>): PlayerGameStats {
  return {
    playerId: 'player',
    teamId: 'nyy',
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
    ...overrides,
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

function buildIncomingOffer(offerId: string) {
  const state = requireState();
  const requested = state.players.find(
    (player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
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
      toTeamId: 'nyy',
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
    (player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
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
    mockedCreateBranchSave.mockReset();
    mockedDeleteSaveById.mockReset();
    mockedListBranches.mockReset();
    mockedLoadGameById.mockReset();
  });

  afterEach(() => {
    setState(null);
  });

  it('hydrates briefing, chemistry, and owner state for a new game', () => {
    startGame(123, 'nyy');

    const chemistry = api.getTeamChemistry('nyy');
    const owner = api.getOwnerState('nyy');
    const frontOffice = (api as typeof api & MinorLeagueWorkerApi).getFrontOfficeState('nyy');
    const briefing = api.getBriefing(10);

    expect(chemistry?.teamId).toBe('nyy');
    expect(chemistry?.score).toBeGreaterThanOrEqual(0);
    expect(owner?.teamId).toBe('nyy');
    expect(typeof owner?.summary).toBe('string');
    expect(frontOffice?.teamId).toBe('nyy');
    expect(briefing.length).toBeGreaterThan(0);
  });

  it('surfaces rivalry intel through dashboard and history queries', () => {
    startGame(1234, 'nyy');
    const state = requireState();
    state.rivalries.set('bos:nyy', {
      id: 'bos:nyy',
      teamA: 'nyy',
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
    const rivalries = api.getRivalries('nyy');

    expect(summary?.intel.rivalries[0]).toMatchObject({
      id: 'bos:nyy',
      opponentTeamId: 'bos',
      intensity: 86,
      currentSeasonRecord: 'NYY 8-5 BOS',
      historicalRecord: 'NYY 144-132 BOS',
    });
    expect(rivalries[0]).toMatchObject({
      id: 'bos:nyy',
      origin: 'historical',
      currentSeasonWinsA: 8,
      currentSeasonWinsB: 5,
      historicalWinsA: 144,
      historicalWinsB: 132,
    });
  });

  it('surfaces active storylines on the dashboard and player query', () => {
    startGame(4321, 'nyy');
    const state = requireState();
    const userPlayer = state.players.find((player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB');
    const rivalPlayer = state.players.find((player) => player.teamId === 'bos' && player.rosterStatus === 'MLB');
    const prospect = state.players.find((player) => player.teamId === 'nyy' && player.rosterStatus !== 'MLB');
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

  it('accepts object-based new game options and persists franchise identity settings', () => {
    const result = startGameWithOptions({
      seed: 123,
      userTeamId: 'mtl',
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
    expect(state.userTeamId).toBe('mtl');
    expect(state.franchise).toMatchObject({
      gmName: 'Alex Rivera',
      difficulty: 'hard',
      teamId: 'mtl',
      onboarding: {
        welcomeBriefingSeen: false,
        firstMonthlyPulseSeen: false,
      },
    });
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

  it('initializes career mode and exposes the GM career ledger', () => {
    startGameWithOptions({
      seed: 919,
      userTeamId: 'nyy',
      gmName: 'Alex Rivera',
      playMode: 'career',
    });
    const state = requireState();
    const career = (api as typeof api & MinorLeagueWorkerApi).getGMCareer();

    expect(state.franchise.playMode).toBe('career');
    expect(career).toMatchObject({
      currentTeamId: 'nyy',
      reputation: 50,
      overallRecord: { wins: 0, losses: 0 },
    });
    expect(career?.careerHistory).toHaveLength(1);
  });

  it('seeds coaching staffs and a coach free-agent market for a new game', () => {
    startGame(124, 'nyy');

    const staff = (api as typeof api & MinorLeagueWorkerApi).getCoachingStaff('nyy');
    const pool = (api as typeof api & MinorLeagueWorkerApi).getCoachFreeAgents();
    const market = (api as typeof api & MinorLeagueWorkerApi).getCoachMarket();

    expect(staff).toHaveLength(12);
    expect(pool.length).toBeGreaterThan(0);
    expect(market).toHaveLength(pool.length);
  });

  it('creates monthly development report history when the season advances', () => {
    startGame(125, 'nyy');
    api.simMonth();

    const prospect = api.getFullRoster('nyy').minors.AA?.[0];
    expect(prospect).toBeTruthy();
    const report = (api as typeof api & MinorLeagueWorkerApi).getDevelopmentReport(prospect!.id);
    const reports = (api as typeof api & MinorLeagueWorkerApi).getDevelopmentReports(prospect!.id);

    expect(report?.playerId).toBe(prospect!.id);
    expect(report?.history.length).toBeGreaterThan(0);
    expect(reports?.history).toEqual(report?.history);
  });

  it('exposes development path, bond, and setback data through worker queries', () => {
    startGame(126, 'nyy');
    const state = requireState();
    const workerApi = api as typeof api & MinorLeagueWorkerApi;
    const prospect = state.players.find((player) => player.teamId === 'nyy' && player.rosterStatus === 'AA')!;
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
    const overview = workerApi.getAffiliateOverview('nyy');

    expect(reports?.minorLeagueProgression[0]?.level).toBe('AA');
    expect(reports?.prospectBond?.bondStrength).toBe(28);
    expect(reports?.activeSetback?.type).toBe('hot_streak');
    expect(overview.farmReport?.bondedProspects).toBeGreaterThan(0);
    expect(overview.farmReport?.activeSetbackCount).toBeGreaterThan(0);
    expect((overview.farmReport?.topProspects.length ?? 0)).toBeGreaterThan(0);
  });

  it('advances to calendar month boundaries and creates a pending monthly pulse report', () => {
    startGame(1251, 'nyy');
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
    startGame(1252, 'nyy');
    const state = requireState();
    state.phase = 'regular';
    state.day = 92;
    state.seasonState = {
      ...state.seasonState,
      currentDay: 92,
    };

    const extraMlb = state.players.find(
      (player) => player.teamId === 'nyy' && player.rosterStatus !== 'MLB',
    )!;
    const prospect = state.players.find(
      (player) => player.teamId === 'nyy' && player.rosterStatus !== 'MLB' && player.id !== extraMlb.id,
    )!;
    extraMlb.rosterStatus = 'MLB';
    extraMlb.minorLeagueLevel = null;
    prospect.rosterStatus = 'AAA';
    prospect.minorLeagueLevel = 'AAA';
    state.rosterStates.set('nyy', buildRosterState('nyy', state.players));
    state.tradeState.pendingOffers = [buildIncomingOffer('monthly-pulse-offer').offer];
    state.minorLeagueState.affiliateStates = [
      {
        teamId: 'nyy',
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
    startGame(5151, 'nyy');
    const state = requireState();
    const monthlyApi = api as typeof api & MinorLeagueWorkerApi;
    state.phase = 'regular';
    state.day = 31;
    const owner = state.ownerState.get('nyy');
    if (!owner) {
      throw new Error('Expected owner state');
    }
    state.ownerState.set('nyy', {
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
    startGame(6161, 'nyy');
    const state = requireState();
    state.phase = 'regular';
    state.day = 120;
    (state.seasonState as typeof state.seasonState & { currentDay: number }).currentDay = 120;
    const standingsRecord = state.seasonState.standings.getRecord('nyy');
    if (!standingsRecord) {
      throw new Error('Expected user standings record');
    }
    standingsRecord.wins = 24;
    standingsRecord.losses = 89;
    standingsRecord.streak = -6;
    standingsRecord.last10 = [2, 8];
    state.storyFlags.set('nyy', [`owner_meeting_${state.season}`]);
    const owner = state.ownerState.get('nyy');
    if (!owner) {
      throw new Error('Expected owner state');
    }
    state.ownerState.set('nyy', {
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
      userTeamId: 'nyy',
      playMode: 'career',
    });
    const state = requireState();
    state.phase = 'regular';
    state.day = 120;
    (state.seasonState as typeof state.seasonState & { currentDay: number }).currentDay = 120;
    const standingsRecord = state.seasonState.standings.getRecord('nyy');
    if (!standingsRecord) {
      throw new Error('Expected user standings record');
    }
    standingsRecord.wins = 24;
    standingsRecord.losses = 89;
    standingsRecord.streak = -6;
    standingsRecord.last10 = [2, 8];
    state.storyFlags.set('nyy', [`owner_meeting_${state.season}`]);
    const owner = state.ownerState.get('nyy');
    if (!owner) {
      throw new Error('Expected owner state');
    }
    state.ownerState.set('nyy', {
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

    const selectedTeamId = jobMarket?.availableJobs.find((job) => job.teamId !== 'nyy')?.teamId;
    expect(selectedTeamId).toBeTruthy();

    const result = (api as typeof api & MinorLeagueWorkerApi).applyForJob(selectedTeamId!);
    expect(result.success).toBe(true);
    expect(requireState().userTeamId).toBe(selectedTeamId);
  });

  it('publishes record watch stories after monthly sim when a user player is on pace', () => {
    startGame(1253, 'nyy');
    const state = requireState();
    state.phase = 'regular';
    state.day = 31;
    state.seasonState = {
      ...state.seasonState,
      currentDay: 31,
    };

    const hitter = state.players.find(
      (player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const hrEntry = state.recordBook.find((entry) => entry.id === 'franchise:nyy:individual_single_season:hr')!;
    hrEntry.holders = [{
      playerId: 'historic-hr-holder',
      playerName: 'Historic Slugger',
      teamId: 'nyy',
      season: 1,
      value: 44,
      displayValue: '44',
    }];
    hrEntry.trackingFromSeason = null;
    state.seasonState.playerSeasonStats.set(hitter.id, createPlayerStats({
      playerId: hitter.id,
      teamId: 'nyy',
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
    }).getRecordWatchList('nyy');
    const news = requireState().news;

    expect(watches.some((entry) => entry.playerId === hitter.id && entry.recordLabel === 'Most Home Runs')).toBe(true);
    expect(news.some((item) => item.category === 'record' && item.tag === 'WATCH')).toBe(true);
  });

  it('queues a record broken ceremony when the user club passes a tracked mark', () => {
    startGame(1254, 'nyy');
    const state = requireState();
    state.phase = 'regular';
    state.day = 31;
    state.seasonState = {
      ...state.seasonState,
      currentDay: 31,
    };

    const hitter = state.players.find(
      (player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const hrEntry = state.recordBook.find((entry) => entry.id === 'franchise:nyy:individual_single_season:hr')!;
    hrEntry.holders = [{
      playerId: 'historic-hr-holder',
      playerName: 'Historic Slugger',
      teamId: 'nyy',
      season: 1,
      value: 10,
      displayValue: '10',
    }];
    hrEntry.trackingFromSeason = null;
    state.seasonState.playerSeasonStats.set(hitter.id, createPlayerStats({
      playerId: hitter.id,
      teamId: 'nyy',
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
    }).getRecordBook('nyy');
    expect(recordBook.franchise.find((entry) => entry.id === 'franchise:nyy:individual_single_season:hr')?.holders[0]?.playerId).toBe(hitter.id);
  });

  it('returns historical player data after a retired player leaves the live pool', () => {
    startGame(1255, 'nyy');
    const state = requireState();
    const player = state.players.find((candidate) => candidate.teamId === 'nyy' && candidate.rosterStatus === 'MLB')!;

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
    startGame(126, 'nyy');
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

  it('resets extension negotiations when a fresh offer is requested', () => {
    startGame(127, 'nyy');
    const state = requireState();
    const candidate = state.players.find(
      (player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
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

    const extensionApi = api as typeof api & MinorLeagueWorkerApi;
    const candidates = extensionApi.getExtensionCandidates('nyy');
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
    const resetOffer = extensionApi.getExtensionOffer(candidate.id, 5);
    const secondResponse = extensionApi.negotiateExtension(candidate.id, lowballOffer);

    expect(firstResponse).toBeTruthy();
    expect(secondResponse).toBeTruthy();
    expect(firstResponse!.status).toBe('countered');
    expect(firstResponse!.rounds).toHaveLength(1);
    expect(resetOffer?.annualSalary).toBe(openingOffer?.annualSalary);
    expect(secondResponse!.status).toBe('countered');
    expect(secondResponse!.rounds).toHaveLength(1);
  });

  it('issues and resolves qualifying offers through worker APIs', () => {
    startGame(128, 'nyy');
    const state = requireState();
    const candidate = state.players.find(
      (player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;

    setHitterProfile(candidate, 'RF', 480, 34, 18);
    candidate.contract.years = 1;
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

    const extensionApi = api as typeof api & MinorLeagueWorkerApi;
    const salary = extensionApi.getQualifyingOfferSalary();
    const eligible = extensionApi.getQualifyingOfferEligible('nyy');
    const issued = extensionApi.issueQualifyingOffer(candidate.id);

    expect(salary).toBeGreaterThan(0);
    expect(eligible.some((player) => player.playerId === candidate.id)).toBe(true);
    expect(issued.success).toBe(true);
    expect(requireState().draftState.qualifyingOffers.some((record) => record.playerId === candidate.id)).toBe(true);

    requireState().offseasonState = {
      ...requireState().offseasonState!,
      currentPhase: 'free_agency',
      phaseDay: 1,
    };

    const resolved = extensionApi.resolveQualifyingOffers();
    const record = requireState().draftState.qualifyingOffers.find((entry) => entry.playerId === candidate.id);
    const qualifyingOfferGroup = api.getOffseasonState()?.transactionGroups.find(
      (group) => group.phase === 'qualifying_offers',
    );

    expect(resolved.resolved.some((entry) => entry.playerId === candidate.id)).toBe(true);
    expect(['accepted', 'rejected']).toContain(record?.status);
    expect(qualifyingOfferGroup?.rows.some((row) => row.summary.includes(candidate.firstName))).toBe(true);
  });

  it('supports hiring and firing coaches through the worker market APIs', () => {
    startGame(129, 'nyy');
    const state = requireState();
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'coaching_changes',
      phaseDay: 1,
      totalDay: 45,
    };

    const workerApi = api as typeof api & MinorLeagueWorkerApi;
    const currentStaff = workerApi.getCoachingStaff('nyy');
    const firedCoach = currentStaff[0]!;
    const fireResult = workerApi.fireCoach(firedCoach.id);
    const marketAfterFire = workerApi.getCoachMarket();
    const replacement = marketAfterFire.find((coach) => coach.role === firedCoach.role) ?? marketAfterFire[0]!;
    const hireResult = workerApi.hireCoach(replacement.id);
    const finalStaff = workerApi.getCoachingStaff('nyy');
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
    startGame(456, 'nyy');
    api.simDay();
    api.simDay();

    const roster = api.getTeamRoster('nyy');
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
    startGame(458, 'nyy');
    const state = requireState();
    const veteran = state.players.find(
      (player) =>
        player.teamId === 'nyy'
        && player.rosterStatus === 'MLB'
        && player.position === 'SS',
    )!;
    const rookie = state.players.find(
      (player) =>
        player.teamId === 'nyy'
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
    startGame(457, 'nyy');

    const player = api.getTeamRoster('nyy')[0]!;
    const names = api.resolveHistoryDisplayNames([player.id], ['nyy', 'bos']);

    expect(names.players[player.id]).toBe(`${player.firstName} ${player.lastName}`);
    expect(names.teams.nyy).toBe('New York Yankees');
    expect(names.teams.bos).toBe('Boston Red Sox');
  });

  it('restores narrative state through snapshot import', () => {
    startGame(789, 'nyy');
    api.simDay();
    api.simDay();

    const beforeChemistry = api.getTeamChemistry('nyy');
    const beforeBriefing = api.getBriefing(10);
    const snapshot = api.exportSnapshot();

    startGame(999, 'bos');
    api.importSnapshot(snapshot);

    expect(api.getTeamChemistry('nyy')).toEqual(beforeChemistry);
    expect(api.getBriefing(10)).toEqual(beforeBriefing);
  });

  it('exposes minor league management queries and affiliate box scores', () => {
    startGame(111, 'nyy');
    api.simDay();

    const workerApi = api as unknown as MinorLeagueWorkerApi;
    const state = requireState();
    const mlbPlayer = state.players.find((player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB')!;
    const beforeServiceTime = (api.getPlayer(mlbPlayer.id) as unknown as WorkerPlayerView).serviceTimeDays;

    api.simDay();

    const afterServiceTime = (api.getPlayer(mlbPlayer.id) as unknown as WorkerPlayerView).serviceTimeDays;

    const promotionTarget = state.players.find((player) => player.teamId === 'nyy' && player.rosterStatus === 'AA')!;
    const affiliateState = state.minorLeagueState.affiliateStates.find(
      (entry) => entry.teamId === 'nyy' && entry.level === 'AA',
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

    const rosterState = state.rosterStates.get('nyy')!;
    rosterState.fortyManRoster = state.players
      .filter((player) => player.teamId === 'nyy')
      .map((player) => player.id);

    const promotionCandidates = workerApi.getPromotionCandidates('nyy');
    const compliance = workerApi.getRosterComplianceIssues('nyy');
    const affiliateOverview = workerApi.getAffiliateOverview('nyy');
    const latestBoxScore = workerApi.getAffiliateBoxScore(affiliateOverview.recentBoxScores[0]!.id);

    expect(afterServiceTime).toBe(beforeServiceTime + 1);
    expect(promotionCandidates[0]?.playerId).toBe(promotionTarget.id);
    expect(compliance.issues.some((issue) => issue.code === 'forty_man_over_limit')).toBe(true);
    expect(compliance.dfaRecommendations.length).toBeGreaterThan(0);
    expect(affiliateOverview.affiliates.some((affiliate) => affiliate.level === 'AAA' && affiliate.gamesPlayed > 0)).toBe(true);
    expect(affiliateOverview.recentBoxScores.length).toBeGreaterThan(0);
    expect(latestBoxScore?.id).toBe(affiliateOverview.recentBoxScores[0]!.id);
  });

  it('routes out-of-options demotions through waivers and allows the priority team to claim the player', () => {
    startGame(112, 'ari');
    const workerApi = api as unknown as MinorLeagueWorkerApi;
    const state = requireState();
    const player = state.players.find((candidate) => candidate.teamId === 'bos' && candidate.rosterStatus === 'MLB')!;
    player.optionYearsUsed = 3;
    player.isOutOfOptions = true;

    const demotionResult = api.demotePlayer(player.id);
    const overviewBeforeClaim = workerApi.getAffiliateOverview('ari');

    expect(demotionResult.success).toBe(true);
    expect(overviewBeforeClaim.waiverClaims.some((claim) => claim.playerId === player.id && claim.status === 'pending')).toBe(true);

    const claimResult = api.claimOffWaivers(player.id);
    const claimedPlayer = api.getPlayer(player.id) as unknown as WorkerPlayerView;
    const overviewAfterClaim = workerApi.getAffiliateOverview('ari');

    expect(claimResult.success).toBe(true);
    expect(claimedPlayer.teamId).toBe('ari');
    expect(claimedPlayer.rosterStatus).toBe('AAA');
    expect(overviewAfterClaim.waiverClaims.some((claim) => claim.playerId === player.id && claim.status === 'claimed')).toBe(true);
  });

  it('adds trade consequences after an accepted user trade', () => {
    startGame(321, 'nyy');
    const state = requireState();
    state.phase = 'regular';
    state.day = 60;
    const userPlayers = state.players
      .filter((player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB' && !player.contract.noTradeClause)
      .sort((left, right) => evaluatePlayerTradeValue(right).overall - evaluatePlayerTradeValue(left).overall);
    const partnerPlayers = state.players
      .filter((player) => player.teamId === 'bos' && player.rosterStatus === 'MLB' && !player.contract.noTradeClause)
      .sort((left, right) => evaluatePlayerTradeValue(left).overall - evaluatePlayerTradeValue(right).overall);

    const offered = userPlayers[0]!;
    const requested = partnerPlayers[0]!;
    const baselineAcquiredMorale = state.playerMorale.get(requested.id)?.score ?? 0;
    const baselineOutgoingMorale = state.playerMorale.get(offered.id)?.score ?? 0;
    const beforeOwner = api.getOwnerState('nyy');

    const result = api.proposeTrade(
      [{ type: 'player', playerId: offered.id }],
      [{ type: 'player', playerId: requested.id }],
      'bos',
    );

    expect(result.decision).toBe('accepted');

    const afterState = requireState();
    const tradeNews = api.getNews(25).find((item) => item.category === 'trade');
    const tradeBriefing = api.getBriefing(25).find((item) => item.category === 'news' && item.relatedPlayerIds.includes(requested.id));
    const afterOwner = api.getOwnerState('nyy');

    expect(tradeNews).toBeTruthy();
    expect(tradeBriefing).toBeTruthy();
    expect(afterState.playerMorale.get(requested.id)?.score).toBeGreaterThan(baselineAcquiredMorale);
    expect(afterState.playerMorale.get(offered.id)?.score).toBeLessThan(baselineOutgoingMorale);
    expect(afterOwner?.summary).not.toBe(beforeOwner?.summary);
  });

  it('adds signing consequences after a successful user offer', () => {
    startGame(654, 'nyy');
    const market = api.getFreeAgents(50);
    const target = market[0]!;
    const teammate = requireState().players.find((player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB')!;
    const baselineTeammateMorale = requireState().playerMorale.get(teammate.id)?.score ?? 0;
    const beforeOwner = api.getOwnerState('nyy');

    const result = api.makeContractOffer(target.player.id, 4, Math.ceil(target.marketValue));

    expect(result.accepted).toBe(true);

    const afterState = requireState();
    const signingNews = api.getNews(25).find((item) => item.category === 'signing' && item.relatedPlayerIds.includes(target.player.id));
    const signingBriefing = api.getBriefing(25).find((item) => item.category === 'news' && item.relatedPlayerIds.includes(target.player.id));
    const afterOwner = api.getOwnerState('nyy');
    const signedPlayer = afterState.players.find((player) => player.id === target.player.id);

    expect(signedPlayer?.teamId).toBe('nyy');
    expect(signingNews).toBeTruthy();
    expect(signingBriefing).toBeTruthy();
    expect(afterState.playerMorale.get(target.player.id)?.score).toBeGreaterThan(0);
    expect(afterState.playerMorale.get(teammate.id)?.score).toBeGreaterThan(baselineTeammateMorale);
    expect(afterOwner?.summary).not.toBe(beforeOwner?.summary);
  });

  it('adds postseason consequences before recording season history', () => {
    startGame(987, 'nyy');
    const state = requireState();
    state.phase = 'playoffs';
    state.news = [];
    state.briefingQueue = [];
    state.seasonHistory = [];
    state.playoffBracket = {
      seeds: [
        { teamId: 'nyy', seed: 1, wins: 101, losses: 61, league: 'AL', divisionWinner: true },
        { teamId: 'lad', seed: 1, wins: 98, losses: 64, league: 'NL', divisionWinner: true },
      ],
      currentRound: 'WORLD_SERIES',
      currentRoundSeries: [
        {
          id: 'WS-1',
          round: 'WORLD_SERIES',
          league: 'MLB',
          bestOf: 7,
          higherSeed: { teamId: 'nyy', seed: 1, wins: 101, losses: 61, league: 'AL', divisionWinner: true },
          lowerSeed: { teamId: 'lad', seed: 1, wins: 98, losses: 64, league: 'NL', divisionWinner: true },
          games: [],
          higherSeedWins: 4,
          lowerSeedWins: 2,
          leaderSummary: 'NYY won 4-2',
          status: 'complete',
          winnerId: 'nyy',
          loserId: 'lad',
        },
      ],
      completedRounds: [{
        round: 'WORLD_SERIES',
        series: [{
          id: 'WS-1',
          round: 'WORLD_SERIES',
          league: 'MLB',
          bestOf: 7,
          higherSeed: { teamId: 'nyy', seed: 1, wins: 101, losses: 61, league: 'AL', divisionWinner: true },
          lowerSeed: { teamId: 'lad', seed: 1, wins: 98, losses: 64, league: 'NL', divisionWinner: true },
          games: [],
          higherSeedWins: 4,
          lowerSeedWins: 2,
          leaderSummary: 'NYY won 4-2',
          status: 'complete',
          winnerId: 'nyy',
          loserId: 'lad',
        }],
      }],
      series: [
        { winnerId: 'nyy', loserId: 'lad', winnerWins: 4, loserWins: 2, games: [], round: 'WORLD_SERIES' },
      ],
      champion: 'nyy',
      runnerUp: 'lad',
    };
    const beforeOwner = api.getOwnerState('nyy');

    api.simDay();

    const afterOwner = api.getOwnerState('nyy');
    const briefing = api.getBriefing(25).find((item) => item.category === 'news');
    const history = api.getSeasonHistory();
    const playoffNews = api.getNews(25).find((item) => item.category === 'playoff');

    expect(playoffNews).toBeTruthy();
    expect(briefing).toBeTruthy();
    expect(history[0]?.keyMoments.length).toBeGreaterThan(0);
    expect(afterOwner?.patience).toBeGreaterThan(beforeOwner?.patience ?? 0);
  });

  it('emits retirement consequences before offseason rollover removes players', () => {
    startGame(222, 'nyy');
    const state = requireState();
    const userVeterans = state.players
      .filter((player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB');
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
    const retirementBriefing = api.getBriefing(25).find((item) => item.category === 'news' && item.relatedTeamIds.includes('nyy'));

    expect(retirementNews).toBeTruthy();
    expect(retirementBriefing).toBeTruthy();
  });

  it('records AI tender decisions once and removes non-tendered players from team control', () => {
    startGame(333, 'nyy');
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
    startGame(336, 'nyy');
    const state = requireState();
    const [arbCandidate] = state.players
      .filter((player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB')
      .slice(0, 1);

    expect(arbCandidate).toBeTruthy();

    arbCandidate!.firstName = 'Juan';
    arbCandidate!.lastName = 'Soto';
    arbCandidate!.contract.annualSalary = 9.4;
    state.serviceTime.set(arbCandidate!.id, 4);

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

    expect(result?.currentPhase).toBe('tender_nontender');
    expect(formatted.phaseResults.arbitrationResolved.length).toBeGreaterThan(0);
    expect(arbitrationResult?.playerId).toBe(arbCandidate!.id);
    expect(arbitrationResult?.newSalary).toBeGreaterThan(0);
    expect(userRow?.summary).toContain('Juan Soto');
    expect(userRow?.tone).toBe('user');
  });

  it('fast-forwards AI free agency, records rival signings, and emits press coverage', () => {
    startGame(334, 'nyy');
    const state = requireState();
    const target = state.players.find(
      (player) => player.teamId === 'oak' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
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
    startGame(335, 'nyy');
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
      (player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const alRbi = state.players.find(
      (player) => player.teamId === 'tb' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const alAvg = state.players.find(
      (player) => player.teamId === 'tor' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const nlMvp = state.players.find(
      (player) => player.teamId === 'lad' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
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
      (player) => player.teamId === 'sd' && player.rosterStatus === 'MLB' && player.pitcherAttributes != null,
    )!;
    const nlK = state.players.find(
      (player) => player.teamId === 'mil' && player.rosterStatus === 'MLB' && player.pitcherAttributes != null,
    )!;
    const nlW = state.players.find(
      (player) => player.teamId === 'sf' && player.rosterStatus === 'MLB' && player.pitcherAttributes != null,
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
    standingsRecords.set('nyy', {
      teamId: 'nyy',
      wins: 99,
      losses: 63,
      runsScored: 845,
      runsAllowed: 699,
      streak: 4,
      last10: [7, 3],
      divisionWins: 52,
      divisionLosses: 24,
    });
    standingsRecords.set('lad', {
      teamId: 'lad',
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
      relatedTeamIds: ['nyy', 'lad'],
      read: false,
    }];
    state.briefingQueue = [];
    state.seasonHistory = [];
    state.playoffBracket = {
      seeds: [
        { teamId: 'nyy', seed: 1, wins: 99, losses: 63, league: 'AL', divisionWinner: true },
        { teamId: 'lad', seed: 1, wins: 98, losses: 64, league: 'NL', divisionWinner: true },
      ],
      currentRound: 'WORLD_SERIES',
      currentRoundSeries: [
        {
          id: 'WS-1',
          round: 'WORLD_SERIES',
          league: 'MLB',
          bestOf: 7,
          higherSeed: { teamId: 'nyy', seed: 1, wins: 99, losses: 63, league: 'AL', divisionWinner: true },
          lowerSeed: { teamId: 'lad', seed: 1, wins: 98, losses: 64, league: 'NL', divisionWinner: true },
          games: [],
          higherSeedWins: 4,
          lowerSeedWins: 2,
          leaderSummary: 'NYY won 4-2',
          status: 'complete',
          winnerId: 'nyy',
          loserId: 'lad',
        },
      ],
      completedRounds: [{
        round: 'WORLD_SERIES',
        series: [{
          id: 'WS-1',
          round: 'WORLD_SERIES',
          league: 'MLB',
          bestOf: 7,
          higherSeed: { teamId: 'nyy', seed: 1, wins: 99, losses: 63, league: 'AL', divisionWinner: true },
          lowerSeed: { teamId: 'lad', seed: 1, wins: 98, losses: 64, league: 'NL', divisionWinner: true },
          games: [],
          higherSeedWins: 4,
          lowerSeedWins: 2,
          leaderSummary: 'NYY won 4-2',
          status: 'complete',
          winnerId: 'nyy',
          loserId: 'lad',
        }],
      }],
      series: [
        { winnerId: 'nyy', loserId: 'lad', winnerWins: 4, loserWins: 2, games: [], round: 'WORLD_SERIES' },
      ],
      champion: 'nyy',
      runnerUp: 'lad',
    };
    state.seasonState.playerSeasonStats.clear();
    for (const [playerId, stats] of new Map([
      [alMvp.id, createPlayerStats({ playerId: alMvp.id, teamId: 'nyy', pa: 680, ab: 600, hits: 198, hr: 44, rbi: 131, bb: 70, runs: 118 })],
      [alRbi.id, createPlayerStats({ playerId: alRbi.id, teamId: 'tb', pa: 650, ab: 590, hits: 177, hr: 35, rbi: 122, bb: 58, runs: 99 })],
      [alAvg.id, createPlayerStats({ playerId: alAvg.id, teamId: 'tor', pa: 620, ab: 540, hits: 189, hr: 18, rbi: 84, bb: 63, runs: 95 })],
      [nlMvp.id, createPlayerStats({ playerId: nlMvp.id, teamId: 'lad', pa: 670, ab: 595, hits: 191, hr: 39, rbi: 121, bb: 72, runs: 117 })],
      [nlHr.id, createPlayerStats({ playerId: nlHr.id, teamId: 'atl', pa: 640, ab: 580, hits: 171, hr: 41, rbi: 111, bb: 60, runs: 101 })],
      [nlAvg.id, createPlayerStats({ playerId: nlAvg.id, teamId: 'phi', pa: 610, ab: 530, hits: 183, hr: 21, rbi: 76, bb: 64, runs: 92 })],
      [alCy.id, createPlayerStats({ playerId: alCy.id, teamId: 'bos', ip: 650, earnedRuns: 68, strikeouts: 236, walks: 47, hitsAllowed: 144, wins: 18, losses: 6 })],
      [alK.id, createPlayerStats({ playerId: alK.id, teamId: 'cle', ip: 620, earnedRuns: 73, strikeouts: 251, walks: 54, hitsAllowed: 150, wins: 16, losses: 7 })],
      [alW.id, createPlayerStats({ playerId: alW.id, teamId: 'sea', ip: 640, earnedRuns: 79, strikeouts: 218, walks: 52, hitsAllowed: 156, wins: 20, losses: 5 })],
      [nlCy.id, createPlayerStats({ playerId: nlCy.id, teamId: 'sd', ip: 660, earnedRuns: 66, strikeouts: 244, walks: 45, hitsAllowed: 140, wins: 19, losses: 4 })],
      [nlK.id, createPlayerStats({ playerId: nlK.id, teamId: 'mil', ip: 625, earnedRuns: 71, strikeouts: 246, walks: 50, hitsAllowed: 148, wins: 17, losses: 6 })],
      [nlW.id, createPlayerStats({ playerId: nlW.id, teamId: 'sf', ip: 635, earnedRuns: 74, strikeouts: 221, walks: 55, hitsAllowed: 152, wins: 21, losses: 5 })],
      [alRoy.id, createPlayerStats({ playerId: alRoy.id, teamId: 'bal', pa: 570, ab: 510, hits: 158, hr: 24, rbi: 82, bb: 48, runs: 77 })],
      [nlRoy.id, createPlayerStats({ playerId: nlRoy.id, teamId: 'nym', pa: 560, ab: 500, hits: 152, hr: 20, rbi: 74, bb: 45, runs: 71 })],
    ])) {
      state.seasonState.playerSeasonStats.set(playerId, stats);
    }

    api.simDay();

    const recap = api.getSeasonHistory()[0]!;
    const archive = api.getSeasonArchive(1)!;
    expect(recap.championTeamId).toBe('nyy');
    expect(recap.runnerUpTeamId).toBe('lad');
    expect(recap.worldSeriesRecord).toBe('4-2');
    expect(recap.awards).toHaveLength(10);
    expect(recap.statLeaders.hr.length).toBe(3);
    expect(recap.statLeaders.w[0]?.playerId).toBe(nlW.id);
    expect(recap.blockbusterTrades[0]?.headline).toBe('Deadline blockbuster reshaped the race');
    expect(recap.userSeason?.teamId).toBe('nyy');
    expect(recap.userSeason?.playoffResult).toContain('Champion');
    expect(archive.awards).toHaveLength(10);
    expect(archive.standings.find((entry) => entry.teamId === 'nyy')?.wins).toBe(99);
    expect(archive.playoffSeries[0]?.winnerTeamId).toBe('nyy');
    expect(archive.transactions[0]?.headline).toBe('Deadline blockbuster reshaped the race');
    expect(archive.financials.some((entry) => entry.teamId === 'nyy')).toBe(true);

    for (const veteran of state.players.filter((player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB').slice(0, 4)) {
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
          teamId: 'nyy',
          years: 7,
          annualSalary: 32,
          totalValue: 224,
        }],
        draftPicks: [{
          round: 1,
          pickNumber: 8,
          teamId: 'nyy',
          playerId: 'draft-1',
          playerName: 'Calvin Velez',
          position: 'SS',
          scoutingGrade: 71,
          origin: 'college',
        }],
        ifaSignings: [{
          playerId: 'ifa-1',
          teamId: 'nyy',
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
    startGame(336, 'nyy');
    const state = requireState();
    state.seasonArchive = [
      {
        season: 1,
        standings: [
          { teamId: 'nyy', wins: 88, losses: 74, divisionRank: 2, gamesBack: 5 },
        ],
        playoffSeries: [
          { round: 'CHAMPIONSHIP_SERIES', winnerTeamId: 'hou', loserTeamId: 'nyy', result: '4-2' },
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
          { teamId: 'nyy', payroll: 210, budget: 228 },
        ],
        userSummary: {
          teamId: 'nyy',
          record: '88-74',
          playoffResult: 'Championship Series exit',
          storylines: ['Came up short in October.'],
        },
        timelineEvents: ['Reached the ALCS'],
      },
      {
        season: 2,
        standings: [
          { teamId: 'nyy', wins: 97, losses: 65, divisionRank: 1, gamesBack: 0 },
        ],
        playoffSeries: [
          { round: 'WORLD_SERIES', winnerTeamId: 'nyy', loserTeamId: 'lad', result: '4-2' },
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
          { teamId: 'nyy', payroll: 235, budget: 248 },
        ],
        userSummary: {
          teamId: 'nyy',
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
    expect(comparison?.userTeamId).toBe('nyy');
    expect(comparison?.deltas.wins).toBe(9);
    expect(comparison?.deltas.payroll).toBe(25);
    expect(comparison?.deltas.budget).toBe(20);
    if (comparison?.right && 'userSummary' in comparison.right) {
      expect(comparison.right.userSummary?.playoffResult).toBe('Champion');
    }
  });

  it('records draft picks with structured detail and auto-advances to the next user turn', () => {
    startGame(338, 'nyy');
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
        availableProspects: Array<{ id: string }>;
      } | null;
      newPicks: Array<{ playerId: string }>;
    };

    expect(start.success).toBe(true);
    expect(start.draft?.currentPick?.teamId).toBe('nyy');
    expect(start.draft?.currentPick?.userOnClock).toBe(true);
    expect(start.draft?.completedPicks.length).toBe(start.newPicks.length);

    const selectedProspectId = start.draft?.availableProspects[0]?.id;
    expect(selectedProspectId).toBeTruthy();

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
    expect(result.newPicks[0]?.teamId).toBe('nyy');
    expect(requireState().players.find((player) => player.id === result.newPicks[0]?.playerId)?.teamId).toBe('nyy');

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
    startGame(339, 'nyy');
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

    startGame(339, 'nyy');
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

  it('creates a rule 5 protection audit after the amateur draft and lets the user protect an exposed prospect', () => {
    startGame(340, 'nyy');
    const state = requireState();
    const candidate = state.players.find(
      (player) => player.teamId === 'nyy' && player.rosterStatus === 'AA',
    )!;

    candidate.rule5EligibleAfterSeason = state.season;
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'draft',
      phaseDay: 3,
      totalDay: 40,
    };
    state.rosterStates.set('nyy', {
      ...state.rosterStates.get('nyy')!,
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

  it('blocks demoting active rule 5 players until the offer-back flow resolves', () => {
    startGame(341, 'nyy');
    const state = requireState();
    const player = state.players.find(
      (candidate) => candidate.teamId === 'nyy' && candidate.rosterStatus === 'MLB' && candidate.pitcherAttributes == null,
    )!;

    state.rule5Obligations = [
      {
        playerId: player.id,
        originalTeamId: 'bos',
        draftingTeamId: 'nyy',
        draftedAfterSeason: state.season,
        status: 'active',
      },
    ];

    const blocked = api.demotePlayerAction(player.id);

    expect(blocked.success).toBe(false);
    expect(blocked.error).toMatch(/rule 5/i);
    expect(state.rule5OfferBackStates[0]).toEqual(expect.objectContaining({
      playerId: player.id,
      originalTeamId: 'bos',
      draftingTeamId: 'nyy',
      status: 'pending',
    }));

    const resolved = (api as typeof api & {
      resolveRule5OfferBack: (playerId: string, acceptReturn: boolean) => { success: boolean };
    }).resolveRule5OfferBack(player.id, true);

    expect(resolved.success).toBe(true);
    expect(state.rule5Obligations[0]?.status).toBe('returned');
    expect(state.players.find((candidate) => candidate.id === player.id)?.teamId).toBe('bos');
  });

  it('opens the international signing phase after the Rule 5 draft and seeds the IFA pool', () => {
    startGame(342, 'nyy');
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
    startGame(343, 'nyy');
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
    expect(state.players.some((player) => player.id === target.id && player.teamId === 'nyy' && player.rosterStatus === 'ROOKIE')).toBe(true);
    expect(state.playerOrigins.get(target.id)).toMatchObject({
      playerId: target.id,
      originTeamId: 'nyy',
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
    startGame(340, 'nyy');
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
    startGame(3401, 'nyy');
    const state = requireState();
    state.phase = 'regular';
    state.day = 118;

    const first = buildIncomingOffer('deadline-hot-1');
    const second = buildIncomingOffer('deadline-hot-2');
    second.offer.fromTeamId = 'tb';
    second.offer.id = 'deadline-hot-2';
    second.offer.message = 'Tampa Bay is circling with a final framework.';

    state.tradeState.pendingOffers = [first.offer, second.offer];
    state.tradeState.tradeHistory = [
      {
        id: 'ticker-trade-1',
        fromTeamId: 'sea',
        toTeamId: 'sd',
        offeringAssets: [{ type: 'player', playerId: first.offered.id }],
        requestingAssets: [{ type: 'player', playerId: first.requested.id }],
        fairnessScore: 18,
        summary: 'Seattle Mariners sent Drew Heater to San Diego Padres for Miguel Prospect.',
        timestamp: 'S1D117',
      },
    ];

    const deadlineState = (api as typeof api & {
      getTradeDeadlineState: () => {
        deadlineMode: boolean;
        hotOffers: Array<{ urgencyTag: string; bidderCount: number; biddingSummary: string | null }>;
        ticker: Array<{ summary: string }>;
      };
    }).getTradeDeadlineState();

    expect(deadlineState.deadlineMode).toBe(true);
    expect(deadlineState.hotOffers).toHaveLength(2);
    expect(deadlineState.hotOffers[0]?.urgencyTag).toBe('EXPIRING SOON');
    expect(deadlineState.hotOffers.some((offer) => offer.bidderCount > 1)).toBe(true);
    expect(deadlineState.hotOffers.some((offer) => offer.biddingSummary?.includes('clubs'))).toBe(true);
    expect(deadlineState.ticker[0]?.summary).toContain('Seattle Mariners');
  });

  it('creates a deadline recap and analysis when the market closes', () => {
    startGame(3402, 'nyy');
    const state = requireState();
    state.phase = 'regular';
    state.day = 122;

    const { offer, requested, offered } = buildIncomingOffer('deadline-missed');
    state.tradeState.pendingOffers = [offer];
    state.tradeState.tradeHistory = [
      {
        id: 'deadline-user-trade',
        fromTeamId: 'nyy',
        toTeamId: 'bos',
        offeringAssets: [{ type: 'player', playerId: requested.id }],
        requestingAssets: [{ type: 'player', playerId: offered.id }],
        fairnessScore: 14,
        summary: 'New York Yankees sent Anthony Volpe to Boston Red Sox for Roman Anthony.',
        timestamp: 'S1D121',
      },
      {
        id: 'deadline-ai-trade',
        fromTeamId: 'sea',
        toTeamId: 'lad',
        offeringAssets: [{ type: 'player', playerId: offered.id }],
        requestingAssets: [{ type: 'player', playerId: requested.id }],
        fairnessScore: -8,
        summary: 'Seattle Mariners sent Drew Heater to Los Angeles Dodgers for Miguel Prospect.',
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
    startGame(3403, 'nyy');
    let state = requireState();
    state.phase = 'regular';
    state.day = 114;
    configureMonthlyTradeScenario();

    processTradeMarketActivity(state, 91, 114);
    const firstRun = {
      offers: api.getTradeOffers(),
      history: api.getTradeHistory(),
    };

    startGame(3403, 'nyy');
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
    startGame(341, 'nyy');
    let state = requireState();
    state.phase = 'regular';
    state.day = 31;
    configureMonthlyTradeScenario();

    processTradeMarketActivity(state, 30, 31);
    const firstRun = api.getTradeOffers();

    expect(firstRun.length).toBeGreaterThan(0);
    expect(firstRun.every((offer) => offer.toTeamId === 'nyy')).toBe(true);
    expect(firstRun.some((offer) => offer.requestingAssets.some((asset) => asset.type === 'player'))).toBe(true);

    startGame(341, 'nyy');
    state = requireState();
    state.phase = 'regular';
    state.day = 31;
    configureMonthlyTradeScenario();

    processTradeMarketActivity(state, 30, 31);
    const secondRun = api.getTradeOffers();

    expect(secondRun).toEqual(firstRun);
  });

  it('accepts AI trade offers and records history, news, briefing, and morale updates', () => {
    startGame(342, 'nyy');
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
    expect(requireState().players.find((player) => player.id === offered.id)?.teamId).toBe('nyy');
    expect(requireState().players.find((player) => player.id === requested.id)?.teamId).toBe('bos');
    expect(api.getNews(25).some((item) => item.category === 'trade' && item.relatedPlayerIds.includes(offered.id))).toBe(true);
    expect(api.getBriefing(25).some((item) => item.category === 'news' && item.relatedPlayerIds.includes(offered.id))).toBe(true);
    expect(requireState().playerMorale.get(offered.id)?.score).toBeGreaterThan(baselineIncomingMorale);
    expect(requireState().playerMorale.get(requested.id)?.score).toBeLessThan(baselineOutgoingMorale);
  });

  it('advances trade sagas and annotates homegrown aftermath when a bonded player is moved', () => {
    startGame(3422, 'nyy');
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
      originTeamId: 'nyy',
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
    startGame(343, 'nyy');
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
    startGame(3431, 'nyy');
    const state = requireState();
    state.ceremony.pendingMoments = [
      {
        id: 'moment-a',
        type: 'playoff_clinch',
        title: 'POSTSEASON BOUND',
        subtitle: 'New York Yankees',
        detailLines: ['Clinched a playoff berth.'],
        soundEffect: 'playoff_clinch',
        autoDismissMs: 5000,
        createdAt: 'S1D150',
        theme: 'celebration',
        relatedTeamIds: ['nyy'],
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
        relatedTeamIds: ['nyy'],
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
    startGame(344, 'nyy');
    const state = requireState();
    const finalRegularSeasonDay = Math.max(...state.schedule.map((game) => game.day));

    state.phase = 'regular';
    state.day = finalRegularSeasonDay;
    state.seasonState = {
      ...state.seasonState,
      currentDay: finalRegularSeasonDay,
    };

    for (let win = 0; win < 140; win += 1) {
      state.seasonState.standings.recordGame('nyy', 'bos', 5, 1, true);
    }

    api.simDay();

    const ceremony = (api as typeof api & {
      getCeremonyState: () => {
        activeMoment: { type: string; title: string } | null;
      };
    }).getCeremonyState();

    expect(ceremony.activeMoment?.type).toBe('playoff_clinch');
    expect(ceremony.activeMoment?.title).toContain('POSTSEASON BOUND');
  });

  it('queues a prospect debut flashback on a homegrown player first MLB game', () => {
    startGame(3441, 'nyy');
    api.simDay();
    api.simDay();
    const state = requireState();
    const promotionTarget = state.players.find((player) => player.teamId === 'nyy' && player.rosterStatus === 'AAA')!;
    const rosterState = state.rosterStates.get('nyy')!;
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
      originTeamId: 'nyy',
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
      teamId: 'nyy',
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
    startGame(3442, 'nyy');
    api.simDay();
    api.simDay();
    const state = requireState();
    const promotionTarget = state.players.find((player) => player.teamId === 'nyy' && player.rosterStatus === 'AAA')!;
    const rosterState = state.rosterStates.get('nyy')!;
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
      originTeamId: 'nyy',
      acquisitionType: 'draft',
      acquiredSeason: state.season,
      draftSeason: state.season,
      draftRound: 1,
      draftPickNumber: 11,
      originalGrade: 61,
      bonusAmount: 4.4,
    });

    const hitsRecord = state.recordBook.find((entry) => entry.id === 'franchise:nyy:individual_single_season:hits');
    if (!hitsRecord) {
      throw new Error('Expected franchise hits record to exist.');
    }
    hitsRecord.holders = [{
      playerId: 'historic-hits-holder',
      playerName: 'Historic Contact Bat',
      teamId: 'nyy',
      season: 1,
      value: 95,
      displayValue: '95',
    }];

    api.promotePlayer(promotionTarget.id);
    state.seasonState.playerSeasonStats.set(promotionTarget.id, createPlayerStats({
      playerId: promotionTarget.id,
      teamId: 'nyy',
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
    startGame(3555, 'nyy');
    const state = requireState();
    state.season = 6;
    state.phase = 'regular';
    state.day = 30;
    state.seasonState = {
      ...state.seasonState,
      currentDay: 30,
    };
    for (let win = 0; win < 68; win += 1) {
      state.seasonState.standings.recordGame('nyy', 'bos', 5, 3, true);
    }
    for (let loss = 0; loss < 22; loss += 1) {
      state.seasonState.standings.recordGame('bos', 'nyy', 5, 3, true);
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
    const veteran = state.players.find((player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB')!;
    state.playerOrigins.set(veteran.id, {
      playerId: veteran.id,
      originTeamId: 'nyy',
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
    startGame(3556, 'nyy');
    const state = requireState();
    const tradedPlayer = state.players.find(
      (player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
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
      fromTeamId: 'nyy',
      toTeamId: 'bos',
      offeringAssets: [{ type: 'player', playerId: tradedPlayer.id }],
      requestingAssets: [],
      fairnessScore: 6,
      summary: 'New York Yankees sent a homegrown bat to Boston Red Sox.',
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

  it('fast-forwards to the playoff intro ceremony without simming the bracket', () => {
    startGame(344, 'nyy');

    const result = api.simToPlayoffs();
    const flow = api.getSeasonFlowState() as { status: string; action: string | null };

    expect(result.phase).toBe('playoffs');
    expect(requireState().playoffBracket).toBeNull();
    expect(flow.status).toBe('regular_season_complete');
    expect(flow.action).toBe('watch_playoffs');
  }, 20_000);

  it('preserves playoff and offseason ceremony states until explicit proceed actions', () => {
    startGame(345, 'nyy');
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
  });

  it('supports interactive playoff progression through game, series, round, and remaining-bracket APIs', () => {
    startGame(512, 'nyy');
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
    startGame(513, 'nyy');
    const state = requireState();
    const icon = state.players.find(
      (player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
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
      teamId: 'nyy',
      summary: `${icon.firstName} ${icon.lastName} won AL MVP.`,
    } satisfies AwardHistoryEntry);
    state.seasonState.playerSeasonStats.set(icon.id, createPlayerStats({
      playerId: icon.id,
      teamId: 'nyy',
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
        { teamId: 'nyy', seed: 1, wins: 103, losses: 59, league: 'AL', divisionWinner: true },
        { teamId: 'lad', seed: 1, wins: 97, losses: 65, league: 'NL', divisionWinner: true },
      ],
      currentRound: 'WORLD_SERIES',
      currentRoundSeries: [{
        id: 'WS-1',
        round: 'WORLD_SERIES',
        league: 'MLB',
        bestOf: 7,
        higherSeed: { teamId: 'nyy', seed: 1, wins: 103, losses: 59, league: 'AL', divisionWinner: true },
        lowerSeed: { teamId: 'lad', seed: 1, wins: 97, losses: 65, league: 'NL', divisionWinner: true },
        games: [],
        higherSeedWins: 4,
        lowerSeedWins: 1,
        leaderSummary: 'NYY won 4-1',
        status: 'complete',
        winnerId: 'nyy',
        loserId: 'lad',
      }],
      completedRounds: [{
        round: 'WORLD_SERIES',
        series: [{
          id: 'WS-1',
          round: 'WORLD_SERIES',
          league: 'MLB',
          bestOf: 7,
          higherSeed: { teamId: 'nyy', seed: 1, wins: 103, losses: 59, league: 'AL', divisionWinner: true },
          lowerSeed: { teamId: 'lad', seed: 1, wins: 97, losses: 65, league: 'NL', divisionWinner: true },
          games: [],
          higherSeedWins: 4,
          lowerSeedWins: 1,
          leaderSummary: 'NYY won 4-1',
          status: 'complete',
          winnerId: 'nyy',
          loserId: 'lad',
        }],
      }],
      series: [
        { winnerId: 'nyy', loserId: 'lad', winnerWins: 4, loserWins: 1, games: [], round: 'WORLD_SERIES' },
      ],
      champion: 'nyy',
      runnerUp: 'lad',
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
        teamIds: ['nyy'],
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

  it('builds a unified press room feed with duplicate news wrappers removed and deterministic ordering', () => {
    startGame(777, 'nyy');
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
        relatedTeamIds: ['nyy'],
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
        relatedTeamIds: ['nyy', 'bos'],
        read: false,
      },
      {
        id: 'press-conference-1',
        headline: 'Press Conference: New York Yankees',
        body: 'The room carried a sharper edge: Why should fans stay patient?',
        priority: 3,
        category: 'press_conference',
        tag: 'ANALYSIS',
        timestamp: 'S1D10',
        relatedPlayerIds: [],
        relatedTeamIds: ['nyy'],
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
        relatedTeamIds: ['nyy'],
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
        relatedTeamIds: ['nyy'],
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
        relatedTeamIds: ['nyy', 'bos'],
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
        headline: 'Press Conference: New York Yankees',
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
        id: 'synthetic-rivalry-bos:nyy-1-1',
        source: 'league_wire',
        category: 'rivalry',
        headline: 'Rivalry watch: NYY vs BOS',
        timestamp: 'S1D1',
      }),
    ]);
    expect(feed.some((entry) => entry.id === 'brief-news-breaker')).toBe(false);
  });

  it('defaults press room feed to the newest 100 entries', () => {
    startGame(778, 'nyy');
    const state = requireState();
    state.news = Array.from({ length: 120 }, (_, index) => ({
      id: `news-${index + 1}`,
      headline: `Headline ${index + 1}`,
      body: `Body ${index + 1}`,
      priority: 3,
      category: 'performance' as const,
      timestamp: `S1D${index + 1}`,
      relatedPlayerIds: [],
      relatedTeamIds: ['nyy'],
      read: index % 2 === 0,
    }));
    state.briefingQueue = [];

    const feed = api.getPressRoomFeed();

    expect(feed).toHaveLength(100);
    expect(feed[0]?.id).toBe('news-120');
    expect(feed.at(-1)?.id).toBe('news-21');
  });

  it('injects synthetic rumor, development, rivalry, and hot-stove entries with derived tags', () => {
    startGame(779, 'nyy');
    const state = requireState();
    const prospect = state.players.find(
      (player) => player.teamId === 'nyy' && player.rosterStatus !== 'MLB',
    )!;
    const freeAgentTarget = state.players.find(
      (player) => player.teamId === 'oak' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;

    state.day = 100;
    state.tradeState.pendingOffers = [buildIncomingOffer('offer-synthetic').offer];
    state.minorLeagueState.developmentReports = [
      {
        playerId: prospect.id,
        teamId: 'nyy',
        season: state.season,
        month: 6,
        trajectory: 'ahead_of_curve',
        summary: 'The player development group is pushing for a promotion.',
        overallRating: prospect.overallRating,
      },
    ];
    state.rivalries.set('bos:nyy', {
      id: 'bos:nyy',
      teamA: 'nyy',
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
          interestedTeams: ['bos', 'lad', 'chc'],
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
      relatedTeamIds: ['nyy'],
    });
    expect(deadlineRumor?.headline).toContain('Deadline buzz');

    expect(hotStoveRumor).toMatchObject({
      category: 'rumor',
      tag: 'RUMOR',
      relatedPlayerIds: [freeAgentTarget.id],
      relatedTeamIds: ['bos', 'lad', 'chc'],
    });
    expect(hotStoveRumor?.headline).toContain(freeAgentTarget.firstName);

    expect(development).toMatchObject({
      category: 'development',
      tag: 'ANALYSIS',
      relatedPlayerIds: [prospect.id],
      relatedTeamIds: ['nyy'],
    });
    expect(development?.headline).toContain(`${prospect.firstName} ${prospect.lastName}`);
    expect(development?.body).toContain('promotion');

    expect(rivalry).toMatchObject({
      category: 'rivalry',
      tag: 'ANALYSIS',
      relatedTeamIds: ['nyy', 'bos'],
    });
    expect(rivalry?.headline).toContain('NYY');
    expect(rivalry?.headline).toContain('BOS');
  });

  it('adds rivalry-flavored ticker text for heated score lines', () => {
    startGame(7801, 'nyy');
    const state = requireState();
    state.rivalries.set('bos:nyy', {
      id: 'bos:nyy',
      teamA: 'nyy',
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
        homeTeamId: 'nyy',
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

  it('returns advanced stat lines and advanced leaderboard results', () => {
    startGame(780, 'nyy');
    const state = requireState();
    const hitter = state.players.find(
      (player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const pitcher = state.players.find(
      (player) => player.teamId === 'nyy' && player.rosterStatus === 'MLB' && player.pitcherAttributes != null,
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

  it('creates a what-if branch and loads it by id', async () => {
    startGame(123, 'nyy');
    mockedCreateBranchSave.mockResolvedValue({
      id: 'branch-1',
      slotNumber: null,
      name: 'Aggressive deadline push',
      season: 1,
      day: 1,
      phase: 'preseason',
      schemaVersion: 15,
      hasSnapshot: true,
      snapshot: null,
      legacyState: null,
      createdAt: '2026-04-04T00:00:00.000Z',
      updatedAt: '2026-04-04T00:00:00.000Z',
      parentSaveId: 'save-slot-1',
      isRootSave: false,
      branchMeta: {
        id: 'branch-1',
        saveId: 'branch-1',
        description: 'Aggressive deadline push',
        branchedAtSeason: 1,
        branchedAtDay: 1,
        createdAt: '2026-04-04T00:00:00.000Z',
      },
    });
    mockedListBranches.mockResolvedValue([{
      id: 'branch-1',
      slotNumber: null,
      name: 'Aggressive deadline push',
      season: 1,
      day: 1,
      phase: 'preseason',
      schemaVersion: 15,
      hasSnapshot: true,
      snapshot: null,
      legacyState: null,
      createdAt: '2026-04-04T00:00:00.000Z',
      updatedAt: '2026-04-04T00:00:00.000Z',
      parentSaveId: 'save-slot-1',
      isRootSave: false,
      branchMeta: {
        id: 'branch-1',
        saveId: 'branch-1',
        description: 'Aggressive deadline push',
        branchedAtSeason: 1,
        branchedAtDay: 1,
        createdAt: '2026-04-04T00:00:00.000Z',
      },
    }]);

    const branchApi = api as typeof api & MinorLeagueWorkerApi;
    const branch = await branchApi.createWhatIfBranch('save-slot-1', 'Aggressive deadline push');
    const branches = await branchApi.getBranches('save-slot-1');

    expect(branch.parentSaveId).toBe('save-slot-1');
    expect(branch.isRootSave).toBe(false);
    expect(branch.branchMeta?.description).toBe('Aggressive deadline push');
    expect(branches).toHaveLength(1);
    expect(branches[0]?.id).toBe(branch.id);
    expect(mockedCreateBranchSave).toHaveBeenCalledWith(
      'save-slot-1',
      expect.objectContaining({
        season: 1,
        day: 1,
        userTeamId: 'nyy',
      }),
      'Aggressive deadline push',
    );
    expect(mockedListBranches).toHaveBeenCalledWith('save-slot-1');
  });

  it('enforces the 3-branch cap per parent save', async () => {
    startGame(321, 'nyy');
    mockedCreateBranchSave
      .mockResolvedValueOnce({
        id: 'branch-1',
        slotNumber: null,
        name: 'Branch one',
        season: 1,
        day: 1,
        phase: 'preseason',
        schemaVersion: 15,
        hasSnapshot: true,
        snapshot: null,
        legacyState: null,
        createdAt: '2026-04-04T00:00:00.000Z',
        updatedAt: '2026-04-04T00:00:00.000Z',
        parentSaveId: 'save-slot-1',
        isRootSave: false,
        branchMeta: {
          id: 'branch-1',
          saveId: 'branch-1',
          description: 'Branch one',
          branchedAtSeason: 1,
          branchedAtDay: 1,
          createdAt: '2026-04-04T00:00:00.000Z',
        },
      })
      .mockResolvedValueOnce({
        id: 'branch-2',
        slotNumber: null,
        name: 'Branch two',
        season: 1,
        day: 1,
        phase: 'preseason',
        schemaVersion: 15,
        hasSnapshot: true,
        snapshot: null,
        legacyState: null,
        createdAt: '2026-04-04T00:00:00.000Z',
        updatedAt: '2026-04-04T00:00:00.000Z',
        parentSaveId: 'save-slot-1',
        isRootSave: false,
        branchMeta: {
          id: 'branch-2',
          saveId: 'branch-2',
          description: 'Branch two',
          branchedAtSeason: 1,
          branchedAtDay: 1,
          createdAt: '2026-04-04T00:00:00.000Z',
        },
      })
      .mockResolvedValueOnce({
        id: 'branch-3',
        slotNumber: null,
        name: 'Branch three',
        season: 1,
        day: 1,
        phase: 'preseason',
        schemaVersion: 15,
        hasSnapshot: true,
        snapshot: null,
        legacyState: null,
        createdAt: '2026-04-04T00:00:00.000Z',
        updatedAt: '2026-04-04T00:00:00.000Z',
        parentSaveId: 'save-slot-1',
        isRootSave: false,
        branchMeta: {
          id: 'branch-3',
          saveId: 'branch-3',
          description: 'Branch three',
          branchedAtSeason: 1,
          branchedAtDay: 1,
          createdAt: '2026-04-04T00:00:00.000Z',
        },
      })
      .mockRejectedValueOnce(new Error('A save can only keep 3 what-if branches.'));
    const branchApi = api as typeof api & MinorLeagueWorkerApi;
    await branchApi.createWhatIfBranch('save-slot-1', 'Branch one');
    await branchApi.createWhatIfBranch('save-slot-1', 'Branch two');
    await branchApi.createWhatIfBranch('save-slot-1', 'Branch three');

    await expect(branchApi.createWhatIfBranch('save-slot-1', 'Branch four')).rejects.toThrow('3');
    expect(mockedCreateBranchSave).toHaveBeenCalledTimes(4);
  });

  it('deletes a branch and removes it from parent metadata', async () => {
    startGame(456, 'nyy');
    mockedCreateBranchSave.mockResolvedValue({
      id: 'branch-rollback',
      slotNumber: null,
      name: 'Rollback candidate',
      season: 1,
      day: 1,
      phase: 'preseason',
      schemaVersion: 15,
      hasSnapshot: true,
      snapshot: null,
      legacyState: null,
      createdAt: '2026-04-04T00:00:00.000Z',
      updatedAt: '2026-04-04T00:00:00.000Z',
      parentSaveId: 'save-slot-1',
      isRootSave: false,
      branchMeta: {
        id: 'branch-rollback',
        saveId: 'branch-rollback',
        description: 'Rollback candidate',
        branchedAtSeason: 1,
        branchedAtDay: 1,
        createdAt: '2026-04-04T00:00:00.000Z',
      },
    });
    mockedListBranches.mockResolvedValue([]);

    const branchApi = api as typeof api & MinorLeagueWorkerApi;
    const branch = await branchApi.createWhatIfBranch('save-slot-1', 'Rollback candidate');

    await expect(branchApi.deleteWhatIfBranch(branch.id)).resolves.toEqual({ success: true });

    const branches = await branchApi.getBranches('save-slot-1');

    expect(branches).toEqual([]);
    expect(mockedDeleteSaveById).toHaveBeenCalledWith('branch-rollback');
  });
});
