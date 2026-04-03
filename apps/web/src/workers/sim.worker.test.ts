// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
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

import { api } from './sim.worker';
import { requireState, setState } from './sim.worker.helpers';
import { processTradeMarketActivity } from './sim.worker.trade';

function startGame(seed: number, userTeamId: string = 'nyy') {
  return api.newGame({
    seed,
    userTeamId,
    gmName: 'General Manager',
    difficulty: 'standard',
    saveSlot: 1,
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
  acknowledgeMonthlyReport: (reportId: string) => { success: boolean };
  dismissDecisionSpotlight: (decisionId: string) => { success: boolean };
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
  afterEach(() => {
    setState(null);
  });

  it('hydrates briefing, chemistry, and owner state for a new game', () => {
    startGame(123, 'nyy');

    const chemistry = api.getTeamChemistry('nyy');
    const owner = api.getOwnerState('nyy');
    const briefing = api.getBriefing(10);

    expect(chemistry?.teamId).toBe('nyy');
    expect(chemistry?.score).toBeGreaterThanOrEqual(0);
    expect(owner?.teamId).toBe('nyy');
    expect(typeof owner?.summary).toBe('string');
    expect(briefing.length).toBeGreaterThan(0);
  });

  it('accepts object-based new game options and persists franchise identity settings', () => {
    const result = api.newGame({
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
    const news = (api as typeof api & {
      getNews: (limit?: number) => Array<{ category: string; tag?: string }>;
    }).getNews(20);

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
    expect(recap.championTeamId).toBe('nyy');
    expect(recap.runnerUpTeamId).toBe('lad');
    expect(recap.worldSeriesRecord).toBe('4-2');
    expect(recap.awards).toHaveLength(6);
    expect(recap.statLeaders.hr.length).toBe(3);
    expect(recap.statLeaders.w[0]?.playerId).toBe(nlW.id);
    expect(recap.blockbusterTrades[0]?.headline).toBe('Deadline blockbuster reshaped the race');
    expect(recap.userSeason?.teamId).toBe('nyy');
    expect(recap.userSeason?.playoffResult).toContain('Champion');

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
      completed: true,
    };

    api.proceedToOffseason();
    api.startNextSeason();

    const finalized = api.getSeasonHistory().find((entry) => entry.season === 1)!;
    expect(finalized.notableRetirements.length).toBeGreaterThan(0);
    expect(finalized.notableRetirements[0]?.seasonsPlayed).toBeGreaterThanOrEqual(10);
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
    expect(reportResult.report.looks).toBe(1);
    expect(reportResult.report.overall).toBeGreaterThan(20);

    const signResult = (api as typeof api & {
      signIFAPlayer: (playerId: string, bonusAmount: number) => { success: boolean; remainingBudget?: number };
    }).signIFAPlayer(target.id, target.expectedBonus);

    expect(signResult.success).toBe(true);
    if (!signResult.success) {
      throw new Error(signResult.error);
    }
    expect(signResult.remainingBudget).toBeLessThan(poolBefore.budget.remaining);
    expect(state.players.some((player) => player.id === target.id && player.teamId === 'nyy' && player.rosterStatus === 'ROOKIE')).toBe(true);

    const tradeResult = (api as typeof api & {
      tradeIFAPoolSpace: (toTeamId: string, amount: number) => { success: boolean; remainingBudget?: number };
    }).tradeIFAPoolSpace('bos', 0.25);

    expect(tradeResult.success).toBe(true);
    if (!tradeResult.success) {
      throw new Error(tradeResult.error);
    }
    expect(tradeResult.remainingBudget).toBeLessThan(signResult.remainingBudget);
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

  it('queues a prospect debut moment when a user prospect reaches MLB', () => {
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

    const result = api.promotePlayer(promotionTarget.id);
    const ceremony = (api as typeof api & {
      getCeremonyState: () => {
        activeMoment: { type: string; title: string; subtitle: string } | null;
      };
    }).getCeremonyState();

    expect(result.success).toBe(true);
    expect(ceremony.activeMoment?.type).toBe('prospect_debut');
    expect(ceremony.activeMoment?.title).toContain('THE FUTURE IS NOW');
    expect(ceremony.activeMoment?.subtitle).toContain(promotionTarget.lastName);
  });

  it('fast-forwards to the playoff intro ceremony without simming the bracket', () => {
    startGame(344, 'nyy');

    const result = api.simToPlayoffs();
    const flow = api.getSeasonFlowState() as { status: string; action: string | null };

    expect(result.phase).toBe('playoffs');
    expect(requireState().playoffBracket).toBeNull();
    expect(flow.status).toBe('regular_season_complete');
    expect(flow.action).toBe('watch_playoffs');
  }, 10_000);

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
        source: 'news',
        category: 'trade',
        headline: 'Breaking trade headline',
        timestamp: 'S1D10',
      }),
      expect.objectContaining({
        id: 'news-read-feature',
        source: 'news',
        category: 'performance',
        headline: 'Read feature still belongs in the archive',
        timestamp: 'S1D9',
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
    state.rivalries.set('nyy:bos', {
      id: 'nyy:bos',
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
    const rivalry = feed.find((entry) => entry.id === `synthetic-rivalry-nyy:bos-${state.season}-${state.day}`);

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
});
