// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  TEAMS,
  assignGMPersonality,
  buildRosterState,
  createRule5Session,
  createSeasonState,
  generateLeaguePlayers,
  generateSchedule,
  generateScoutingStaff,
  initializeGMCareer,
  simulateDay,
} from '@mbd/sim-core';
import {
  CURRENT_GAME_SNAPSHOT_VERSION,
  type ArchivedSeason,
  type BriefingItem,
  type GMRelationship,
  type LeagueEvent,
  type PlayerNicknameState,
  type DebutFlashback,
  type GameSnapshot,
  type OwnerState,
  type PlayerOrigin,
  type PlayerStoryArc,
  type PlayerMorale,
  type ProspectBond,
  type RecordBookEntry,
  type RecordWatchEntry,
  type Rivalry,
  type SignatureMoment,
  type TickerEntry,
  type WhatIfBranchMeta,
  type TeamChemistry,
} from '@mbd/contracts';
import type { FullGameState } from './sim.worker.helpers';
import {
  createDefaultFranchiseState,
  createEmptyAchievementState,
  createEmptyCeremonyState,
} from './sim.worker.ceremony';
import { exportGameSnapshot, importGameSnapshot } from './snapshot';

function createNarrativeSample(userTeamId: string) {
  const playerMorale = new Map<string, PlayerMorale>();
  const teamChemistry = new Map<string, TeamChemistry>();
  const ownerState = new Map<string, OwnerState>();
  const rivalries = new Map<string, Rivalry>();
  const briefingQueue: BriefingItem[] = [];
  const storyFlags = new Map<string, string[]>();

  playerMorale.set('player-1', {
    playerId: 'player-1',
    score: 61,
    trend: 'rising',
    summary: 'Responding well to recent promotion.',
    lastUpdated: 'S1D2',
  });

  teamChemistry.set(userTeamId, {
    teamId: userTeamId,
    score: 57,
    tier: 'steady',
    trend: 'rising',
    summary: 'Clubhouse is stabilizing after a strong week.',
    reasons: ['Winning streak', 'Healthy core'],
  });

  ownerState.set(userTeamId, {
    teamId: userTeamId,
    archetype: 'win_now',
    patience: 48,
    confidence: 55,
    hotSeat: true,
    summary: 'Owner expects immediate contention.',
    expectations: {
      winsTarget: 88,
      playoffTarget: true,
      payrollTarget: 210_000_000,
    },
  });

  rivalries.set(`${userTeamId}:bos`, {
    id: `${userTeamId}:bos`,
    teamA: userTeamId,
    teamB: 'bos',
    intensity: 63,
    summary: 'Division race tension is building.',
    reasons: ['Recent series split', 'Playoff position battle'],
  });

  briefingQueue.push({
    id: 'brief-1',
    priority: 2,
    category: 'owner',
    headline: 'Ownership is watching the payroll closely.',
    body: 'A strong month could cool the hot seat quickly.',
    relatedTeamIds: [userTeamId],
    relatedPlayerIds: [],
    timestamp: 'S1D2',
    acknowledged: false,
  });

  storyFlags.set(userTeamId, ['owner_hot_seat', 'wild_card_race']);

  const playerMoments = new Map<string, SignatureMoment[]>();
  playerMoments.set('player-1', [{
    season: 1,
    type: 'walk_off_hr',
    description: 'Player One ended the game with one swing.',
    impact: 65,
    relevance: 65,
    isPlayoff: false,
    isEliminationGame: false,
    worldSeriesClincher: false,
    round: null,
  }]);

  const playerNicknames = new Map<string, PlayerNicknameState>();
  playerNicknames.set('player-1', {
    seasonHistory: [{
      season: 1,
      age: 22,
      teamId: userTeamId,
      gamesPlayed: 158,
      pa: 690,
      hits: 205,
      hr: 24,
      battingWalks: 58,
      battingStrikeouts: 102,
      stolenBases: 33,
      saves: 0,
      blownSaves: 0,
      wins: 0,
      era: 0,
      pitchingStrikeouts: 0,
      injuryCount: 0,
      overallStart: 60,
      overallEnd: 67,
      wasOnMlbRoster: true,
      ledLeagueInStolenBases: true,
    }],
    earnedNicknames: [{
      id: 'the_flash',
      displayText: 'The Flash',
      priority: 7,
      triggerData: { seasonsMatched: 3 },
    }],
    primaryNickname: {
      id: 'the_flash',
      displayText: 'The Flash',
      priority: 7,
      triggerData: { seasonsMatched: 3 },
    },
    badgeNicknames: [],
  });

  const gmRelationships = new Map<string, GMRelationship>();
  gmRelationships.set('bos', {
    targetTeamId: 'bos',
    score: 12,
    tradeHistory: [{
      season: 1,
      surplusValue: 2.5,
      permanentMemory: false,
      description: 'Moved complementary pieces.',
    }],
    lastInteractionSeason: 1,
  });

  const leagueEvents: LeagueEvent[] = [{
    type: 'gm_firing',
    season: 1,
    month: 4,
    teamIds: ['bos'],
    playerIds: [],
    headline: 'Boston shakes up the front office',
    description: 'Boston moved on from its GM after a slow April.',
    gameplayEffect: 'Boston now has a reset trade baseline.',
    effectData: {
      kind: 'gm_reset',
      magnitude: 10,
      newPersonality: 'analytical',
    },
  }];

  return {
    playerMorale,
    teamChemistry,
    ownerState,
    briefingQueue,
    storyFlags,
    rivalries,
    tickerFeed: [] as TickerEntry[],
    playerMoments,
    playerNicknames,
    playerStoryArcs: [] as PlayerStoryArc[],
    prospectBonds: [] as ProspectBond[],
    gmRelationships,
    leagueEvents,
    playerOrigins: new Map<string, PlayerOrigin>(),
    debutFlashbacks: [] as DebutFlashback[],
    awardHistory: [],
    recordBook: [] as RecordBookEntry[],
    recordWatch: [] as RecordWatchEntry[],
    seasonArchive: [],
    archivedSeasons: [] as ArchivedSeason[],
    historicalPlayers: [],
    mentorRelationships: [],
    frontOfficeState: new Map(),
    seasonHistory: [],
    whatIfBranches: [] as WhatIfBranchMeta[],
  };
}

function createState(): FullGameState {
  const rng = new GameRNG(42);
  const teamIds = TEAMS.map((team) => team.id);
  const players = generateLeaguePlayers(rng.fork(), teamIds);
  const schedule = generateSchedule(rng.fork());
  const seasonState = createSeasonState(1, teamIds);
  const dayOne = simulateDay(rng.fork(), seasonState, schedule, players);

  const serviceTime = new Map<string, number>();
  const scoutingStaffs = new Map();
  const gmPersonalities = new Map();
  const rosterStates = new Map();

  for (const teamId of teamIds) {
    scoutingStaffs.set(teamId, generateScoutingStaff(rng.fork(), teamId));
    gmPersonalities.set(teamId, assignGMPersonality(rng.fork(), teamId));
    rosterStates.set(teamId, buildRosterState(teamId, players));
  }

  for (const player of players) {
    if (player.rosterStatus === 'MLB') {
      serviceTime.set(player.id, 1);
      player.serviceTimeDays = 172;
    }
  }

  const narrative = createNarrativeSample('nym');

  return {
    rng,
    season: 1,
    day: dayOne.newState.currentDay,
    phase: 'regular',
    players,
    schedule,
    seasonState: dayOne.newState,
    userTeamId: 'nym',
    playoffBracket: null,
    injuries: new Map(),
    serviceTime,
    scoutingStaffs,
    gmPersonalities,
    offseasonState: null,
    rule5Session: null,
    rule5Obligations: [],
    rule5OfferBackStates: [],
    draftClass: null,
    freeAgencyMarket: null,
    news: [],
    rosterStates,
    internationalScoutingState: {
      season: 1,
      ifaPool: [],
      budgets: new Map(),
      scoutingHistory: new Map(),
    },
    draftState: {
      scoutingReports: [],
      signability: [],
      qualifyingOffers: [],
      compensatoryPicks: [],
      pickOwnership: [],
      bigBoards: [],
      signingDecisions: [],
    },
    minorLeagueState: {
      serviceTimeLedger: [],
      optionUsage: [],
      waiverClaims: [],
      affiliateStates: [],
      affiliateBoxScores: [],
      minorLeagueStatHistory: [],
      activeDevelopmentSetbacks: [],
      processedDevelopmentMonths: [],
      developmentLedger: [],
      developmentReports: [],
      conversionRecommendations: [],
    },
    coachingStaffs: new Map(),
    coachFreeAgentPool: [],
    pendingExtensionNegotiations: new Map(),
    monthlyPulse: {
      pendingReport: null,
      decisionQueue: [],
    },
    ...narrative,
    tradeState: {
      pendingOffers: [],
      tradeHistory: [],
      negotiations: [],
      multiTeamPendingTrades: [],
    },
    hallOfFame: [],
    hallOfFameBallot: [],
    franchiseTimeline: [],
    careerStats: [],
    recordBook: narrative.recordBook,
    recordWatch: narrative.recordWatch,
    seasonArchive: narrative.seasonArchive,
    historicalPlayers: narrative.historicalPlayers,
    mentorRelationships: narrative.mentorRelationships,
    frontOfficeState: narrative.frontOfficeState,
    franchise: createDefaultFranchiseState('nym', 1, dayOne.newState.currentDay),
    gmCareer: initializeGMCareer(new GameRNG(99), 'nym', 'General Manager', 1),
    jobMarket: {
      availableJobs: [],
      applicationDeadlineSeason: null,
    },
    consequenceWatchers: [],
    fanSentiment: {
      score: 50,
      trend: 'stable',
      summary: 'Fan sentiment is stable.',
      updatedAt: `S1D${dayOne.newState.currentDay}`,
    },
    scoutConflicts: [],
    dynastyCards: [],
    challengeState: null,
    ceremony: createEmptyCeremonyState(),
    achievements: createEmptyAchievementState(),
    performanceDiagnostics: {
      totalSeasons: 1,
      snapshotSizeBytes: 0,
    },
  };
}

describe('snapshot helpers', () => {
  it('round-trips full game state without losing deterministic future state', () => {
    const original = createState();
    const candidate = original.players.find(
      (player) => player.teamId === 'bos' && player.rosterStatus === 'AA',
    )!;
    original.tickerFeed.push({
      id: 'ticker-1',
      timestamp: 'S1D2',
      category: 'score',
      text: 'Tycoons defeats Noreasters 5-3.',
      priority: 2,
      relatedTeamIds: ['nym', 'bos'],
      relatedPlayerIds: [candidate.id],
      expiresDay: 5,
    });
    original.playerStoryArcs.push({
      playerId: candidate.id,
      arcType: 'prospect_rise',
      startSeason: 1,
      startDay: 2,
      phase: 'setup',
      milestones: ['Drafted'],
      resolvedSeason: null,
    });
    original.prospectBonds.push({
      prospectId: candidate.id,
      draftedSeason: 1,
      debutSeason: null,
      currentLevel: 'AA',
      bondStrength: 25,
      milestones: ['Drafted Round 2, 1'],
      loyaltyModifier: 0.25,
    });
    original.playerOrigins.set(candidate.id, {
      playerId: candidate.id,
      originTeamId: 'bos',
      acquisitionType: 'draft',
      acquiredSeason: 1,
      draftSeason: 1,
      draftRound: 2,
      draftPickNumber: 42,
      originalGrade: 58,
      bonusAmount: null,
    });
    original.debutFlashbacks.push({
      playerId: candidate.id,
      playerName: `${candidate.firstName} ${candidate.lastName}`,
      draftSeason: 1,
      draftRound: 2,
      originalGrade: 58,
      debutSeason: 3,
      debutOverall: 61,
      journeyHighlights: ['Drafted', 'Reached AA'],
    });
    original.minorLeagueState.minorLeagueStatHistory = [[candidate.id, [{
      season: 1,
      level: 'AA',
      gamesPlayed: 54,
      pa: 220,
      hits: 63,
      hr: 9,
      rbi: 41,
      avg: 0.286,
      ip: 0,
      era: 0,
      k: 0,
      bb: 0,
    }]]];
    original.minorLeagueState.activeDevelopmentSetbacks = [{
      playerId: candidate.id,
      type: 'mental_block',
      overallModifier: -6,
      startSeason: 1,
      startMonth: 2,
      endSeason: 1,
      endMonth: 4,
      summary: 'Struggling with consistency.',
      active: true,
    }];

    candidate.rule5EligibleAfterSeason = original.season;
    original.rule5Session = createRule5Session({
      season: original.season,
      draftOrder: ['nym', 'bos'],
      players: original.players,
      rosterStates: original.rosterStates,
    });
    original.rule5Obligations = [
      {
        playerId: candidate.id,
        originalTeamId: 'bos',
        draftingTeamId: 'nym',
        draftedAfterSeason: original.season,
        status: 'active',
      },
    ];
    original.rule5OfferBackStates = [
      {
        playerId: candidate.id,
        originalTeamId: 'bos',
        draftingTeamId: 'nym',
        status: 'pending',
      },
    ];

    const snapshot = exportGameSnapshot(original);
    const restored = importGameSnapshot(snapshot);

    expect(snapshot.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect((snapshot as GameSnapshot & {
      monthlyPulse?: { pendingReport: null; decisionQueue: unknown[] };
    }).monthlyPulse).toEqual({
      pendingReport: null,
      decisionQueue: [],
    });
    expect(snapshot.day).toBe(original.day);
    expect(snapshot.narrative.playerMorale).toHaveLength(1);
    expect(snapshot.narrative.teamChemistry).toHaveLength(1);
    expect(snapshot.narrative.ownerState).toHaveLength(1);
    expect(snapshot.narrative.briefingQueue).toHaveLength(1);
    expect(snapshot.narrative.storyFlags).toHaveLength(1);
    expect(snapshot.narrative.rivalries).toHaveLength(1);
    expect(snapshot.narrative.playerMoments).toHaveLength(1);
    expect(snapshot.narrative.playerNicknames).toHaveLength(1);
    expect(snapshot.narrative.gmRelationships).toHaveLength(1);
    expect(snapshot.narrative.leagueEvents).toHaveLength(1);
    expect(snapshot.narrative.recordBook).toEqual([]);
    expect(snapshot.narrative.recordWatch).toEqual([]);
    expect(snapshot.narrative.seasonArchive).toEqual([]);
    expect(snapshot.narrative.historicalPlayers).toEqual([]);
    expect(snapshot.narrative.mentorRelationships).toEqual([]);
    expect(snapshot.narrative.frontOfficeState).toEqual([]);
    expect(snapshot.rule5Session).toBeTruthy();
    expect(snapshot.rule5Obligations).toHaveLength(1);
    expect(snapshot.rule5OfferBackStates).toHaveLength(1);

    expect(restored.userTeamId).toBe(original.userTeamId);
    expect(restored.day).toBe(original.day);
    expect(restored.seasonState.currentDay).toBe(original.seasonState.currentDay);
    expect(restored.rng.nextInt(0, 10_000)).toBe(original.rng.nextInt(0, 10_000));
    expect(restored.teamChemistry.get('nym')?.score).toBe(57);
    expect(restored.ownerState.get('nym')?.hotSeat).toBe(true);
    expect(restored.briefingQueue[0]?.headline).toContain('Ownership');
    expect(restored.storyFlags.get('nym')).toContain('owner_hot_seat');
    expect(restored.rivalries.get('nym:bos')?.intensity).toBe(63);
    expect(restored.playerMoments.get('player-1')?.[0]?.type).toBe('walk_off_hr');
    expect(restored.playerNicknames.get('player-1')?.primaryNickname?.id).toBe('the_flash');
    expect(restored.gmRelationships.get('bos')?.score).toBe(12);
    expect(restored.leagueEvents[0]?.type).toBe('gm_firing');
    expect(restored.recordBook).toEqual([]);
    expect(restored.recordWatch).toEqual([]);
    expect(restored.seasonArchive).toEqual([]);
    expect(restored.historicalPlayers).toEqual([]);
    expect(restored.mentorRelationships).toEqual([]);
    expect(restored.frontOfficeState.size).toBe(0);
    expect(restored.tradeState.pendingOffers).toEqual([]);
    expect(restored.tradeState.tradeHistory).toEqual([]);
    expect(restored.tradeState.negotiations).toEqual([]);
    expect(restored.tradeState.multiTeamPendingTrades).toEqual([]);
    expect((restored as FullGameState & {
      monthlyPulse: { pendingReport: null; decisionQueue: unknown[] };
    }).monthlyPulse).toEqual({
      pendingReport: null,
      decisionQueue: [],
    });
    expect(restored.rule5Session?.phase).toBe('protection_audit');
    expect(restored.rule5Obligations[0]?.status).toBe('active');
    expect(restored.rule5OfferBackStates[0]?.status).toBe('pending');
    expect(restored.tickerFeed[0]?.id).toBe('ticker-1');
    expect(restored.playerStoryArcs[0]?.playerId).toBe(candidate.id);
    expect(restored.prospectBonds[0]?.prospectId).toBe(candidate.id);
    expect(restored.playerOrigins.get(candidate.id)?.draftRound).toBe(2);
    expect(restored.debutFlashbacks[0]?.playerId).toBe(candidate.id);
    expect(restored.minorLeagueState.minorLeagueStatHistory[0]?.[0]).toBe(candidate.id);
    expect(restored.minorLeagueState.activeDevelopmentSetbacks[0]?.playerId).toBe(candidate.id);
  });

  it('migrates v16 snapshots into the v18 narrative, trade, and arbitration shape', () => {
    const exported = exportGameSnapshot(createState()) as GameSnapshot & {
      schemaVersion: number;
      narrative: Omit<GameSnapshot['narrative'], 'playerMoments' | 'playerNicknames' | 'gmRelationships' | 'leagueEvents'> & {
        playerMoments?: unknown;
        playerNicknames?: unknown;
        gmRelationships?: unknown;
        leagueEvents?: unknown;
      };
      tradeState: Omit<GameSnapshot['tradeState'], 'negotiations' | 'multiTeamPendingTrades'> & {
        negotiations?: unknown;
        multiTeamPendingTrades?: unknown;
      };
    };

    const restored = importGameSnapshot({
      ...exported,
      schemaVersion: 16,
      narrative: {
        ...exported.narrative,
        playerMoments: undefined,
        playerNicknames: undefined,
        gmRelationships: undefined,
        leagueEvents: undefined,
      },
      tradeState: {
        ...exported.tradeState,
        negotiations: undefined,
        multiTeamPendingTrades: undefined,
      },
    });

    expect(restored.playerMoments).toEqual(new Map());
    expect(restored.playerNicknames).toEqual(new Map());
    expect(restored.gmRelationships.size).toBe(TEAMS.length - 1);
    expect(restored.leagueEvents).toEqual([]);
    expect(restored.tradeState.negotiations).toEqual([]);
    expect(restored.tradeState.multiTeamPendingTrades).toEqual([]);
  });

  it('migrates v14 snapshots into the v15 archive and diagnostics shape', () => {
    const snapshot = exportGameSnapshot(createState()) as unknown as {
      schemaVersion: number;
      season: number;
      narrative: {
        seasonArchive: GameSnapshot['narrative']['seasonArchive'];
      };
    };
    snapshot.schemaVersion = 14;
    snapshot.season = 25;
    snapshot.narrative.seasonArchive = Array.from({ length: 14 }, (_, index) => ({
      season: index + 1,
      standings: [
        {
          teamId: 'nym',
          wins: 90,
          losses: 72,
          divisionRank: 1,
          gamesBack: 0,
        },
      ],
      playoffSeries: [
        {
          round: 'World Series',
          winnerTeamId: 'nym',
          loserTeamId: 'lax',
          result: '4-2',
        },
      ],
      awards: [
        {
          season: index + 1,
          award: 'MVP',
          league: 'MLB',
          playerId: `mvp-${index + 1}`,
          teamId: 'nym',
          summary: 'Won MVP',
        },
      ],
      statLeaders: {
        hr: [{ playerId: 'slugger', teamId: 'nym', value: '42', summary: 'Slugger hit 42 HR.' }],
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
        record: '90-72',
        playoffResult: 'Won World Series',
        storylines: ['Title run'],
      },
      timelineEvents: ['Won the title'],
    }));

    const restored = importGameSnapshot(snapshot);

    expect(restored.archivedSeasons.length).toBeGreaterThan(0);
    expect(restored.whatIfBranches).toEqual([]);
    expect(restored.performanceDiagnostics.totalSeasons).toBe(25);
    expect(restored.performanceDiagnostics.snapshotSizeBytes).toBeGreaterThan(0);
    expect(restored.seasonArchive).toEqual([]);
    expect(restored.archivedSeasons[0]).toMatchObject({
      season: 1,
      championshipWon: true,
      championTeamId: 'nym',
    });
  });

  it('migrates v9 snapshots into the v10 monthly pulse shape', () => {
    const original = createState();
    const exported = exportGameSnapshot(original) as GameSnapshot & {
      schemaVersion: number;
      monthlyPulse?: unknown;
    };

    const restored = importGameSnapshot({
      ...exported,
      schemaVersion: 9,
      monthlyPulse: undefined,
    });

    expect((restored as FullGameState & {
      monthlyPulse: { pendingReport: null; decisionQueue: unknown[] };
    }).monthlyPulse).toEqual({
      pendingReport: null,
      decisionQueue: [],
    });
  });

  it('migrates v10 snapshots into the v11 franchise, ceremony, and achievement shape', () => {
    const original = createState();
    const exported = exportGameSnapshot(original) as GameSnapshot & {
      schemaVersion: number;
      franchise?: unknown;
      ceremony?: unknown;
      achievements?: unknown;
    };

    const restored = importGameSnapshot({
      ...exported,
      schemaVersion: 10,
      franchise: undefined,
      ceremony: undefined,
      achievements: undefined,
    });

    expect(restored.franchise.gmName).toBe('General Manager');
    expect(restored.ceremony.pendingMoments).toEqual([]);
    expect(restored.ceremony.seenMomentIds).toEqual([]);
    expect(restored.achievements.unlocked).toEqual([]);
  });

  it('migrates v11 snapshots into the v12 record and historical state shape', () => {
    const original = createState();
    const exported = exportGameSnapshot(original) as GameSnapshot & {
      schemaVersion: number;
    };

    const restored = importGameSnapshot({
      ...exported,
      schemaVersion: 11,
    });

    expect(restored.recordBook.length).toBeGreaterThan(0);
    expect(restored.recordWatch).toEqual([]);
    expect(restored.seasonArchive).toEqual([]);
    expect(restored.historicalPlayers.length).toBeGreaterThan(0);
    expect(restored.mentorRelationships).toEqual([]);
    expect(restored.frontOfficeState.size).toBe(0);
  });

  it('migrates v12 snapshots into the v13 career and replayability state shape', () => {
    const original = createState();
    original.season = 4;
    original.franchiseTimeline = [
      {
        season: 1,
        teamId: 'nym',
        record: '81-81',
        winTotal: 81,
        playoffResult: 'Missed playoffs',
        championship: false,
        worldSeriesAppearance: false,
        playoffAppearance: false,
        divisionTitle: false,
        awardWinnerCount: 0,
        keyAcquisitions: [],
        keyDepartures: [],
        dynastyScore: 10,
      },
      {
        season: 2,
        teamId: 'nym',
        record: '93-69',
        winTotal: 93,
        playoffResult: 'World Series champion',
        championship: true,
        worldSeriesAppearance: true,
        playoffAppearance: true,
        divisionTitle: true,
        awardWinnerCount: 2,
        keyAcquisitions: [],
        keyDepartures: [],
        dynastyScore: 35,
      },
      {
        season: 3,
        teamId: 'nym',
        record: '88-74',
        winTotal: 88,
        playoffResult: 'Division Series exit',
        championship: false,
        worldSeriesAppearance: false,
        playoffAppearance: true,
        divisionTitle: false,
        awardWinnerCount: 1,
        keyAcquisitions: [],
        keyDepartures: [],
        dynastyScore: 42,
      },
    ];
    const userRecord = original.seasonState.standings.getRecord('nym');
    if (!userRecord) {
      throw new Error('Expected user record');
    }
    userRecord.wins = 76;
    userRecord.losses = 54;

    const exported = exportGameSnapshot(original) as GameSnapshot & {
      schemaVersion: number;
    };

    const restored = importGameSnapshot({
      ...exported,
      schemaVersion: 12,
    });

    expect(restored.franchise.playMode).toBe('standard');
    expect(restored.gmCareer.currentTeamId).toBe('nym');
    expect(restored.gmCareer.overallRecord).toEqual({ wins: 338, losses: 278 });
    expect(restored.gmCareer.championships).toBe(1);
    expect(restored.jobMarket.availableJobs).toEqual([]);
    expect(restored.consequenceWatchers).toEqual([]);
    expect(restored.scoutConflicts).toEqual([]);
    expect(restored.dynastyCards).toEqual([]);
    expect(restored.challengeState).toBeNull();
  });

  it('migrates v13 snapshots into the v14 narrative ticker and farm-depth state shape', () => {
    const original = createState();
    original.season = 4;
    const draftedProspect = original.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'AA',
    )!;
    original.seasonArchive = [
      {
        season: 3,
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
        transactions: [],
        draftClass: [{
          pickNumber: 42,
          playerId: draftedProspect.id,
          playerName: `${draftedProspect.firstName} ${draftedProspect.lastName}`,
          teamId: 'nym',
          currentStatus: 'AA',
        }],
        financials: [],
        userSummary: null,
        timelineEvents: [],
      },
    ];

    const exported = exportGameSnapshot(original) as GameSnapshot & {
      schemaVersion: number;
      narrative: Record<string, unknown>;
      minorLeagueState: Record<string, unknown>;
    };

    const restored = importGameSnapshot({
      ...exported,
      schemaVersion: 13,
      narrative: {
        ...exported.narrative,
        tickerFeed: undefined,
        playerStoryArcs: undefined,
        prospectBonds: undefined,
        playerOrigins: undefined,
        debutFlashbacks: undefined,
      },
      minorLeagueState: {
        ...exported.minorLeagueState,
        minorLeagueStatHistory: undefined,
        activeDevelopmentSetbacks: undefined,
      },
    });

    expect(restored.tickerFeed).toEqual([]);
    expect(restored.playerStoryArcs).toEqual([]);
    expect(restored.debutFlashbacks).toEqual([]);
    expect(restored.minorLeagueState.minorLeagueStatHistory).toEqual([]);
    expect(restored.minorLeagueState.activeDevelopmentSetbacks).toEqual([]);
    expect(restored.playerOrigins.get(draftedProspect.id)).toMatchObject({
      playerId: draftedProspect.id,
      originTeamId: 'nym',
      acquisitionType: 'draft',
      draftSeason: 3,
      draftRound: 2,
      draftPickNumber: 42,
      originalGrade: null,
    });
    expect(restored.prospectBonds.find((bond) => bond.prospectId === draftedProspect.id)).toMatchObject({
      prospectId: draftedProspect.id,
      draftedSeason: 3,
      currentLevel: 'AA',
      bondStrength: 30,
      loyaltyModifier: 0.3,
    });
  });

  it('does not persist pending extension negotiations in snapshots', () => {
    const original = createState();
    original.pendingExtensionNegotiations.set('player-1', {
      playerId: 'player-1',
      targetContract: {
        years: 5,
        annualSalary: 20,
        totalValue: 100,
        noTradeClause: false,
        noTradeClauseType: 'none',
        playerOption: false,
        teamOption: false,
        optOutYears: [],
        signingBonus: 0,
        buyoutAmount: 0,
        deferredMoney: [],
      },
      counterOffer: null,
      rounds: [],
    });

    const snapshot = exportGameSnapshot(original);
    const restored = importGameSnapshot(snapshot);

    expect('pendingExtensionNegotiations' in snapshot).toBe(false);
    expect(restored.pendingExtensionNegotiations.size).toBe(0);
  });

  it('migrates v7 snapshots into the v8 staff and development shape', () => {
    const snapshot = exportGameSnapshot(createState());
    const mlbPlayer = snapshot.players.find((player) => player.rosterStatus === 'MLB')!;
    const minorLeaguer = snapshot.players.find((player) => player.rosterStatus === 'AA')!;
    const v7Snapshot = {
      ...snapshot,
      schemaVersion: 7,
    } as unknown as GameSnapshot;

    const restored = importGameSnapshot(v7Snapshot);
    const restoredMLBPlayer = restored.players.find((player) => player.id === mlbPlayer.id)!;
    const restoredMinorLeaguer = restored.players.find((player) => player.id === minorLeaguer.id)!;

    expect(restoredMLBPlayer.serviceTimeDays).toBe(172);
    expect(restoredMLBPlayer.optionYearsUsed).toBe(0);
    expect(restoredMLBPlayer.isOutOfOptions).toBe(false);
    expect(restoredMinorLeaguer.minorLeagueLevel).toBe(minorLeaguer.rosterStatus);
    expect(restored.coachingStaffs.get('nym')).toHaveLength(12);
    expect(restored.coachFreeAgentPool.length).toBeGreaterThan(0);
    expect(restored.minorLeagueState.processedDevelopmentMonths).toEqual([]);
  });

  it('migrates v8 snapshots into the v9 advanced stat shape', () => {
    const snapshot = exportGameSnapshot(createState());
    const [playerId, playerStats] = snapshot.seasonState.playerSeasonStats[0]!;
    const v8Snapshot = {
      ...snapshot,
      schemaVersion: 8,
      seasonState: {
        ...snapshot.seasonState,
        playerSeasonStats: snapshot.seasonState.playerSeasonStats.map(([entryPlayerId, entryStats]) => [
          entryPlayerId,
          {
            pa: entryStats.pa,
            ab: entryStats.ab,
            hits: entryStats.hits,
            doubles: entryStats.doubles,
            triples: entryStats.triples,
            hr: entryStats.hr,
            rbi: entryStats.rbi,
            bb: entryStats.bb,
            k: entryStats.k,
            runs: entryStats.runs,
            ip: entryStats.ip,
            earnedRuns: entryStats.earnedRuns,
            strikeouts: entryStats.strikeouts,
            walks: entryStats.walks,
            hitsAllowed: entryStats.hitsAllowed,
            wins: entryStats.wins,
            losses: entryStats.losses,
          },
        ]),
      },
    } as unknown as GameSnapshot;

    const restored = importGameSnapshot(v8Snapshot);
    const migrated = restored.seasonState.playerSeasonStats.get(playerId);

    expect(migrated?.hbp).toBe(0);
    expect(migrated?.sacFlies).toBe(0);
    expect(migrated?.homeRunsAllowed).toBe(0);
    expect(migrated?.hitBatters).toBe(0);
    expect(migrated?.flyBallsAllowed).toBe(0);
    expect(playerStats.hbp).toBeDefined();
  });

  it('migrates v2 snapshots into the v5 narrative, stat, trade, and legacy shape', () => {
    const snapshot = exportGameSnapshot(createState());
    const v2Snapshot = {
      ...snapshot,
      schemaVersion: 2,
      seasonState: {
        ...snapshot.seasonState,
        playerSeasonStats: snapshot.seasonState.playerSeasonStats.map(([playerId, stats]) => [
          playerId,
          {
            pa: stats.pa,
            ab: stats.ab,
            hits: stats.hits,
            doubles: stats.doubles,
            triples: stats.triples,
            hr: stats.hr,
            rbi: stats.rbi,
            bb: stats.bb,
            k: stats.k,
            runs: stats.runs,
            ip: stats.ip,
            earnedRuns: stats.earnedRuns,
            strikeouts: stats.strikeouts,
            walks: stats.walks,
            hitsAllowed: stats.hitsAllowed,
          },
        ]),
      },
      narrative: {
        ...snapshot.narrative,
        awardHistory: [
          {
            season: 1,
            award: 'MVP',
            playerId: 'player-1',
            teamId: 'nym',
            summary: 'Historic season.',
          },
        ],
        seasonHistory: [
          {
            season: 1,
            championTeamId: 'nym',
            summary: 'Won the title.',
            awards: [],
            keyMoments: ['Won Game 6 at home.'],
          },
        ],
      },
    } as unknown as GameSnapshot;

    const restored = importGameSnapshot(v2Snapshot);

    const migratedStats = restored.seasonState.playerSeasonStats.get(
      restored.seasonState.playerSeasonStats.keys().next().value as string,
    );
    expect(migratedStats?.wins).toBe(0);
    expect(migratedStats?.losses).toBe(0);
    expect(restored.awardHistory[0]?.league).toBe('MLB');
    expect(restored.seasonHistory[0]?.runnerUpTeamId).toBeNull();
    expect(restored.seasonHistory[0]?.statLeaders.hr).toEqual([]);
    expect(restored.hallOfFame).toEqual([]);
    expect(restored.franchiseTimeline).toEqual([]);
    expect(restored.tradeState.pendingOffers).toEqual([]);
    expect(restored.tradeState.tradeHistory).toEqual([]);
  });

  it('migrates v3 snapshots into the v5 trade and legacy state shape', () => {
    const snapshot = exportGameSnapshot(createState());
    const v3Snapshot = {
      ...snapshot,
      schemaVersion: 3,
    } as unknown as GameSnapshot;

    const restored = importGameSnapshot(v3Snapshot);

    expect(restored.tradeState.pendingOffers).toEqual([]);
    expect(restored.tradeState.tradeHistory).toEqual([]);
    expect(restored.hallOfFameBallot).toEqual([]);
  });

  it('migrates v4 snapshots into the v6 legacy and rule5 state shape', () => {
    const snapshot = exportGameSnapshot(createState());
    const v4Snapshot = {
      ...snapshot,
      schemaVersion: 4,
      narrative: {
        playerMorale: [],
        teamChemistry: [],
        ownerState: [],
        briefingQueue: [],
        storyFlags: [],
        rivalries: [],
        awardHistory: [],
        seasonHistory: [],
      },
    } as unknown as GameSnapshot;

    const restored = importGameSnapshot(v4Snapshot);

    expect(restored.hallOfFame).toEqual([]);
    expect(restored.hallOfFameBallot).toEqual([]);
    expect(restored.franchiseTimeline).toEqual([]);
    expect(restored.careerStats).toEqual([]);
    expect(restored.rule5Session).toBeNull();
    expect(restored.rule5Obligations).toEqual([]);
    expect(restored.rule5OfferBackStates).toEqual([]);
  });

  it('rejects unsupported snapshot schema versions', () => {
    const snapshot = exportGameSnapshot(createState());
    const badSnapshot = {
      ...snapshot,
      schemaVersion: 999,
    } as unknown as GameSnapshot;

    expect(() => importGameSnapshot(badSnapshot)).toThrow(/schema/i);
  });
});
