// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('comlink', () => ({
  expose: () => {},
}));

import { api } from './sim.worker';
import { requireState } from './sim.worker.helpers';
import {
  buildAchievementMetrics,
  buildAchievementView,
  captureSeasonAchievementFacts,
  recordDraftedHomegrownPlayer,
  recordFreeAgentSigning,
  recordInternationalHomegrownPlayer,
  recordProspectCallup,
  syncAchievementState,
} from './sim.worker.achievements';

function startGame(seed: number, userTeamId: string = 'nyy') {
  return api.newGame({
    seed,
    userTeamId,
    gmName: 'General Manager',
    difficulty: 'standard',
    saveSlot: 1,
  });
}

describe('worker achievement state', () => {
  beforeEach(() => {
    startGame(991, 'nyy');
  });

  it('unlocks achievements once and publishes a ceremony card plus breaking-style news', () => {
    const state = requireState();
    state.franchiseTimeline = [
      {
        season: 1,
        teamId: 'nyy',
        record: '96-66',
        winTotal: 96,
        playoffResult: 'Champion',
        championship: true,
        worldSeriesAppearance: true,
        playoffAppearance: true,
        divisionTitle: true,
        awardWinnerCount: 0,
        keyAcquisitions: [],
        keyDepartures: [],
        dynastyScore: 240,
      },
    ];

    const firstPass = syncAchievementState(state);
    const secondPass = syncAchievementState(state);

    expect(firstPass.map((achievement) => achievement.id)).toContain('champion');
    expect(secondPass).toEqual([]);
    expect(state.achievements.unlocked.some((achievement) => achievement.id === 'champion')).toBe(true);
    expect(state.ceremony.pendingMoments[0]?.type).toBe('achievement');
    expect(state.news[0]?.headline).toContain('Achievement unlocked');
    expect(state.news[0]?.priority).toBe(1);
  });

  it('builds trophy-room view models from the catalog, progress, and unlock state', () => {
    const state = requireState();
    state.achievements.unlocked = [
      {
        id: 'champion',
        unlockedAt: 'S1D180',
        season: 1,
        teamId: 'nyy',
        summary: 'Won the World Series.',
      },
    ];
    state.achievements.progress = [
      ['decade', { current: 6, target: 10, summary: 'Seasons managed' }],
    ];

    const entries = buildAchievementView(state);
    const champion = entries.find((entry) => entry.id === 'champion');
    const decade = entries.find((entry) => entry.id === 'decade');
    const tradeShark = entries.find((entry) => entry.id === 'trade_shark');

    expect(champion?.unlocked).toBe(true);
    expect(champion?.unlockedAt).toBe('S1D180');
    expect(decade?.progress).toEqual({ current: 6, target: 10, summary: 'Seasons managed' });
    expect(tradeShark?.unlocked).toBe(false);
    expect(tradeShark?.category).toBe('moneyball');
  });

  it('records homegrown ledgers for drafted and international players plus MLB debuts', () => {
    const state = requireState();

    recordDraftedHomegrownPlayer(state, 'drafted-player', 'A');
    recordInternationalHomegrownPlayer(state, 'ifa-player', 'ROOKIE');
    recordProspectCallup(state, 'drafted-player');

    const metrics = buildAchievementMetrics(state);

    expect(metrics.firstCallups).toBe(1);
    expect(metrics.homegrownMlbers).toBe(1);
    expect(buildAchievementView(state).find((entry) => entry.id === 'prospect_pipeline')?.progress.current).toBe(1);
  });

  it('captures season achievement facts for bargain free agents and franchise records', () => {
    const state = requireState();
    const hitter = state.players.find((player) => player.teamId === 'nyy' && player.pitcherAttributes == null && player.rosterStatus === 'MLB')!;
    hitter.age = 27;
    hitter.position = 'SS';
    hitter.overallRating = 430;
    hitter.hitterAttributes = {
      contact: 410,
      power: 435,
      eye: 390,
      speed: 285,
      defense: 340,
      durability: 355,
    };

    for (const player of state.players.filter((candidate) => candidate.id !== hitter.id).slice(0, 24)) {
      state.seasonState.playerSeasonStats.set(player.id, player.pitcherAttributes == null
        ? {
          playerId: player.id,
          teamId: player.teamId,
          pa: 620,
          ab: 560,
          hits: 145,
          doubles: 28,
          triples: 3,
          hr: 18,
          rbi: 76,
          bb: 52,
          k: 128,
          runs: 74,
          hbp: 2,
          sacFlies: 5,
          ip: 0,
          earnedRuns: 0,
          strikeouts: 0,
          walks: 0,
          hitsAllowed: 0,
          homeRunsAllowed: 0,
          hitBatters: 0,
          flyBallsAllowed: 0,
          wins: 0,
          losses: 0,
        }
        : {
          playerId: player.id,
          teamId: player.teamId,
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
          ip: 540,
          earnedRuns: 82,
          strikeouts: 172,
          walks: 56,
          hitsAllowed: 156,
          homeRunsAllowed: 21,
          hitBatters: 4,
          flyBallsAllowed: 182,
          wins: 11,
          losses: 10,
        });
    }

    state.seasonState.playerSeasonStats.set(hitter.id, {
      playerId: hitter.id,
      teamId: 'nyy',
      pa: 710,
      ab: 620,
      hits: 230,
      doubles: 40,
      triples: 4,
      hr: 56,
      rbi: 145,
      bb: 80,
      k: 105,
      runs: 128,
      hbp: 4,
      sacFlies: 6,
      ip: 0,
      earnedRuns: 0,
      strikeouts: 0,
      walks: 0,
      hitsAllowed: 0,
      homeRunsAllowed: 0,
      hitBatters: 0,
      flyBallsAllowed: 0,
      wins: 0,
      losses: 0,
    });

    recordFreeAgentSigning(state, hitter.id, 8);
    captureSeasonAchievementFacts(state);

    const metrics = buildAchievementMetrics(state);
    expect(metrics.cheapFreeAgentThreeWarSeasons).toBe(1);
    expect(metrics.fiftyHomeRunSeasons).toBe(1);
    expect(metrics.recordBreaks).toBeGreaterThan(0);
  });

  it('can rebuild progress silently for imported snapshots without publishing duplicate ceremony or news', () => {
    const state = requireState();
    state.franchiseTimeline = [
      {
        season: 1,
        teamId: 'nyy',
        record: '98-64',
        winTotal: 98,
        playoffResult: 'Champion',
        championship: true,
        worldSeriesAppearance: true,
        playoffAppearance: true,
        divisionTitle: true,
        awardWinnerCount: 0,
        keyAcquisitions: [],
        keyDepartures: [],
        dynastyScore: 300,
      },
    ];

    const rebuilt = syncAchievementState(state, { publish: false });

    expect(rebuilt.map((achievement) => achievement.id)).toContain('champion');
    expect(state.news).toEqual([]);
    expect(state.ceremony.pendingMoments).toEqual([]);
  });

  it('derives dynasty, trade, and Hall of Fame metrics from persisted history', () => {
    const state = requireState();
    state.franchiseTimeline = [
      {
        season: 1,
        teamId: 'nyy',
        record: '61-101',
        winTotal: 61,
        playoffResult: 'Missed playoffs',
        championship: false,
        worldSeriesAppearance: false,
        playoffAppearance: false,
        divisionTitle: false,
        awardWinnerCount: 0,
        keyAcquisitions: [],
        keyDepartures: [],
        dynastyScore: 40,
      },
      {
        season: 2,
        teamId: 'nyy',
        record: '94-68',
        winTotal: 94,
        playoffResult: 'Champion',
        championship: true,
        worldSeriesAppearance: true,
        playoffAppearance: true,
        divisionTitle: true,
        awardWinnerCount: 0,
        keyAcquisitions: [],
        keyDepartures: [],
        dynastyScore: 220,
      },
    ];
    state.tradeState.tradeHistory = [
      {
        id: 'trade-1',
        fromTeamId: 'nyy',
        toTeamId: 'bos',
        offeringAssets: [],
        requestingAssets: [],
        fairnessScore: 8,
        summary: 'Won the trade.',
        timestamp: 'S1D120',
      },
      {
        id: 'trade-2',
        fromTeamId: 'nyy',
        toTeamId: 'lad',
        offeringAssets: [],
        requestingAssets: [],
        fairnessScore: 7,
        summary: 'Won the trade again.',
        timestamp: 'S1D121',
      },
      {
        id: 'trade-3',
        fromTeamId: 'nyy',
        toTeamId: 'sea',
        offeringAssets: [],
        requestingAssets: [],
        fairnessScore: 6,
        summary: 'Won the trade a third time.',
        timestamp: 'S1D122',
      },
    ];
    state.hallOfFame = [
      {
        playerId: 'drafted-player',
        playerName: 'Drafted Legend',
        position: 'SS',
        seasonsPlayed: 12,
        teamIds: ['nyy'],
        inductionSeason: 9,
        score: 92,
        inductionType: 'first_ballot',
        awards: [],
        summary: 'A lock for Cooperstown.',
        careerStats: {
          playerId: 'drafted-player',
          playerName: 'Drafted Legend',
          position: 'SS',
          seasonsPlayed: 12,
          teamIds: ['nyy'],
          peakOverall: 88,
          championshipRings: 1,
          allStarSelections: 5,
          batting: { hits: 3100, hr: 420, rbi: 1600 },
          pitching: null,
        },
      },
    ];
    recordDraftedHomegrownPlayer(state, 'drafted-player', 'A');

    const metrics = buildAchievementMetrics(state);

    expect(metrics.rebuildMasterRuns).toBe(1);
    expect(metrics.tradeSharkDeals).toBe(3);
    expect(metrics.draftedHallOfFamers).toBe(1);
  });
});
