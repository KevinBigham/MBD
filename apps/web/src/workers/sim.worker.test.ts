// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AwardHistoryEntry } from '@mbd/contracts';
import {
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
  getPromotionCandidates: (teamId?: string) => PromotionCandidateView[];
  getRosterComplianceIssues: (teamId?: string) => {
    issues: RosterComplianceIssueView[];
    dfaRecommendations: DFACandidateView[];
  };
  getAffiliateOverview: (teamId?: string) => AffiliateOverviewView;
  getAffiliateBoxScore: (boxScoreId: string) => AffiliateBoxScoreView | null;
}

function createPlayerStats(overrides: Partial<PlayerGameStats>): PlayerGameStats {
  return {
    playerId: 'player',
    teamId: 'nyy',
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
    ip: 0,
    earnedRuns: 0,
    strikeouts: 0,
    walks: 0,
    hitsAllowed: 0,
    wins: 0,
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
    api.newGame(123, 'nyy');

    const chemistry = api.getTeamChemistry('nyy');
    const owner = api.getOwnerState('nyy');
    const briefing = api.getBriefing(10);

    expect(chemistry?.teamId).toBe('nyy');
    expect(chemistry?.score).toBeGreaterThanOrEqual(0);
    expect(owner?.teamId).toBe('nyy');
    expect(typeof owner?.summary).toBe('string');
    expect(briefing.length).toBeGreaterThan(0);
  });

  it('returns personality profiles and award races after the season starts', () => {
    api.newGame(456, 'nyy');
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
    api.newGame(457, 'nyy');

    const player = api.getTeamRoster('nyy')[0]!;
    const names = api.resolveHistoryDisplayNames([player.id], ['nyy', 'bos']);

    expect(names.players[player.id]).toBe(`${player.firstName} ${player.lastName}`);
    expect(names.teams.nyy).toBe('New York Yankees');
    expect(names.teams.bos).toBe('Boston Red Sox');
  });

  it('restores narrative state through snapshot import', () => {
    api.newGame(789, 'nyy');
    api.simDay();
    api.simDay();

    const beforeChemistry = api.getTeamChemistry('nyy');
    const beforeBriefing = api.getBriefing(10);
    const snapshot = api.exportSnapshot();

    api.newGame(999, 'bos');
    api.importSnapshot(snapshot);

    expect(api.getTeamChemistry('nyy')).toEqual(beforeChemistry);
    expect(api.getBriefing(10)).toEqual(beforeBriefing);
  });

  it('exposes minor league management queries and affiliate box scores', () => {
    api.newGame(111, 'nyy');
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
    api.newGame(112, 'ari');
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
    api.newGame(321, 'nyy');
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
    api.newGame(654, 'nyy');
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
    api.newGame(987, 'nyy');
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
    api.newGame(222, 'nyy');
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
    api.newGame(333, 'nyy');
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
    api.newGame(336, 'nyy');
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
    api.newGame(334, 'nyy');
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
    api.newGame(335, 'nyy');
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
    api.newGame(338, 'nyy');
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
    api.newGame(339, 'nyy');
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

    api.newGame(339, 'nyy');
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
    api.newGame(340, 'nyy');
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
    api.newGame(341, 'nyy');
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
    api.newGame(342, 'nyy');
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
    api.newGame(343, 'nyy');
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

  it('closes the trade market after day 120 and clears pending offers', () => {
    api.newGame(340, 'nyy');
    const state = requireState();
    state.phase = 'regular';

    const { offer, requested, offered } = buildIncomingOffer('deadline-offer');
    state.tradeState.pendingOffers = [offer];

    processTradeMarketActivity(state, 120, 121);
    state.day = 121;

    expect(api.getTradeOffers()).toEqual([]);

    const closedResult = api.proposeTrade(
      [{ type: 'player', playerId: requested.id }],
      [{ type: 'player', playerId: offered.id }],
      'bos',
    );
    expect(closedResult.decision).toBe('rejected');
    expect(closedResult.reason).toContain('Trade market closed');
  });

  it('generates deterministic monthly AI trade offers for the user inbox', () => {
    api.newGame(341, 'nyy');
    let state = requireState();
    state.phase = 'regular';
    state.day = 31;
    const { target } = configureMonthlyTradeScenario();

    processTradeMarketActivity(state, 30, 31);
    const firstRun = api.getTradeOffers();

    expect(firstRun.length).toBeGreaterThan(0);
    expect(firstRun.some((offer) => offer.fromTeamId === 'bos' && offer.toTeamId === 'nyy')).toBe(true);
    expect(firstRun.some((offer) => offer.requestingAssets.some((asset) => asset.playerId === target.id))).toBe(true);

    api.newGame(341, 'nyy');
    state = requireState();
    state.phase = 'regular';
    state.day = 31;
    configureMonthlyTradeScenario();

    processTradeMarketActivity(state, 30, 31);
    const secondRun = api.getTradeOffers();

    expect(secondRun).toEqual(firstRun);
  });

  it('accepts AI trade offers and records history, news, briefing, and morale updates', () => {
    api.newGame(342, 'nyy');
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
    api.newGame(343, 'nyy');
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

  it('fast-forwards to the playoff intro ceremony without simming the bracket', () => {
    api.newGame(344, 'nyy');

    const result = api.simToPlayoffs();
    const flow = api.getSeasonFlowState() as { status: string; action: string | null };

    expect(result.phase).toBe('playoffs');
    expect(requireState().playoffBracket).toBeNull();
    expect(flow.status).toBe('regular_season_complete');
    expect(flow.action).toBe('watch_playoffs');
  });

  it('preserves playoff and offseason ceremony states until explicit proceed actions', () => {
    api.newGame(345, 'nyy');
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
    api.newGame(512, 'nyy');
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
    api.newGame(513, 'nyy');
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
    api.newGame(777, 'nyy');
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
    api.newGame(778, 'nyy');
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
});
