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
  simulateDay,
} from '@mbd/sim-core';
import type {
  BriefingItem,
  GameSnapshot,
  OwnerState,
  PlayerMorale,
  Rivalry,
  TeamChemistry,
} from '@mbd/contracts';
import type { FullGameState } from './sim.worker.helpers';
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

  return {
    playerMorale,
    teamChemistry,
    ownerState,
    briefingQueue,
    storyFlags,
    rivalries,
    awardHistory: [],
    seasonHistory: [],
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

  return {
    rng,
    season: 1,
    day: dayOne.newState.currentDay,
    phase: 'regular',
    players,
    schedule,
    seasonState: dayOne.newState,
    userTeamId: 'nyy',
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
    },
    ...createNarrativeSample('nyy'),
    tradeState: {
      pendingOffers: [],
      tradeHistory: [],
    },
    hallOfFame: [],
    hallOfFameBallot: [],
    franchiseTimeline: [],
    careerStats: [],
  };
}

describe('snapshot helpers', () => {
  it('round-trips full game state without losing deterministic future state', () => {
    const original = createState();
    const candidate = original.players.find(
      (player) => player.teamId === 'bos' && player.rosterStatus === 'AA',
    )!;

    candidate.rule5EligibleAfterSeason = original.season;
    original.rule5Session = createRule5Session({
      season: original.season,
      draftOrder: ['nyy', 'bos'],
      players: original.players,
      rosterStates: original.rosterStates,
    });
    original.rule5Obligations = [
      {
        playerId: candidate.id,
        originalTeamId: 'bos',
        draftingTeamId: 'nyy',
        draftedAfterSeason: original.season,
        status: 'active',
      },
    ];
    original.rule5OfferBackStates = [
      {
        playerId: candidate.id,
        originalTeamId: 'bos',
        draftingTeamId: 'nyy',
        status: 'pending',
      },
    ];

    const snapshot = exportGameSnapshot(original);
    const restored = importGameSnapshot(snapshot);

    expect(snapshot.schemaVersion).toBe(7);
    expect(snapshot.day).toBe(original.day);
    expect(snapshot.narrative.playerMorale).toHaveLength(1);
    expect(snapshot.narrative.teamChemistry).toHaveLength(1);
    expect(snapshot.narrative.ownerState).toHaveLength(1);
    expect(snapshot.narrative.briefingQueue).toHaveLength(1);
    expect(snapshot.narrative.storyFlags).toHaveLength(1);
    expect(snapshot.narrative.rivalries).toHaveLength(1);
    expect(snapshot.rule5Session).toBeTruthy();
    expect(snapshot.rule5Obligations).toHaveLength(1);
    expect(snapshot.rule5OfferBackStates).toHaveLength(1);

    expect(restored.userTeamId).toBe(original.userTeamId);
    expect(restored.day).toBe(original.day);
    expect(restored.seasonState.currentDay).toBe(original.seasonState.currentDay);
    expect(restored.rng.nextInt(0, 10_000)).toBe(original.rng.nextInt(0, 10_000));
    expect(restored.teamChemistry.get('nyy')?.score).toBe(57);
    expect(restored.ownerState.get('nyy')?.hotSeat).toBe(true);
    expect(restored.briefingQueue[0]?.headline).toContain('Ownership');
    expect(restored.storyFlags.get('nyy')).toContain('owner_hot_seat');
    expect(restored.rivalries.get('nyy:bos')?.intensity).toBe(63);
    expect(restored.tradeState.pendingOffers).toEqual([]);
    expect(restored.tradeState.tradeHistory).toEqual([]);
    expect(restored.rule5Session?.phase).toBe('protection_audit');
    expect(restored.rule5Obligations[0]?.status).toBe('active');
    expect(restored.rule5OfferBackStates[0]?.status).toBe('pending');
  });

  it('migrates v6 snapshots into the v7 service-time and roster-control shape', () => {
    const snapshot = exportGameSnapshot(createState());
    const mlbPlayer = snapshot.players.find((player) => player.rosterStatus === 'MLB')!;
    const minorLeaguer = snapshot.players.find((player) => player.rosterStatus === 'AA')!;
    const v6Snapshot = {
      ...snapshot,
      schemaVersion: 6,
    } as unknown as GameSnapshot;

    const restored = importGameSnapshot(v6Snapshot);
    const restoredMLBPlayer = restored.players.find((player) => player.id === mlbPlayer.id)!;
    const restoredMinorLeaguer = restored.players.find((player) => player.id === minorLeaguer.id)!;

    expect(restoredMLBPlayer.serviceTimeDays).toBe(172);
    expect(restoredMLBPlayer.optionYearsUsed).toBe(0);
    expect(restoredMLBPlayer.isOutOfOptions).toBe(false);
    expect(restoredMinorLeaguer.minorLeagueLevel).toBe(minorLeaguer.rosterStatus);
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
            teamId: 'nyy',
            summary: 'Historic season.',
          },
        ],
        seasonHistory: [
          {
            season: 1,
            championTeamId: 'nyy',
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
