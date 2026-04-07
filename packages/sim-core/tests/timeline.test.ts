import { describe, expect, it } from 'vitest';
import type { GameSnapshot, WhatIfBranchMeta } from '@mbd/contracts';
import { compareTimelines } from '../src/timeline';

function createTimelineSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  const snapshot = {
    schemaVersion: 15,
    rng: { seed: 7, callCount: 14 },
    season: 6,
    day: 120,
    phase: 'regular',
    userTeamId: 'nym',
    players: [],
    schedule: [],
    seasonState: {
      season: 6,
      currentDay: 120,
      standings: [
        {
          teamId: 'nym',
          wins: 84,
          losses: 60,
          divisionRank: 2,
          gamesBack: 4,
        },
      ],
      playerSeasonStats: [],
      gameLog: [],
      completed: false,
    },
    playoffBracket: null,
    injuries: [],
    serviceTime: [],
    scoutingStaffs: [],
    gmPersonalities: [],
    offseasonState: null,
    rule5Session: null,
    rule5Obligations: [],
    rule5OfferBackStates: [],
    draftClass: null,
    freeAgencyMarket: null,
    news: [],
    rosterStates: [],
    coachingStaffs: [],
    coachFreeAgentPool: [],
    narrative: {
      playerMorale: [],
      teamChemistry: [],
      ownerState: [],
      briefingQueue: [],
      storyFlags: [],
      rivalries: [],
      tickerFeed: [],
      playerStoryArcs: [],
      prospectBonds: [],
      playerOrigins: [],
      debutFlashbacks: [],
      awardHistory: [],
      hallOfFame: [],
      hallOfFameBallot: [],
      franchiseTimeline: [],
      careerStats: [],
      recordBook: [],
      recordWatch: [],
      seasonArchive: [],
      archivedSeasons: [],
      historicalPlayers: [],
      mentorRelationships: [],
      frontOfficeState: [],
      gmCareer: undefined,
      jobMarket: {
        availableJobs: [],
        applicationDeadlineSeason: null,
      },
      consequenceWatchers: [],
      fanSentiment: {
        score: 50,
        trend: 'stable',
        summary: 'Stable.',
        updatedAt: 'S6D120',
      },
      scoutConflicts: [],
      dynastyCards: [],
      challengeState: null,
      seasonHistory: [],
      whatIfBranches: [],
    },
    tradeState: {
      pendingOffers: [],
      tradeHistory: [],
    },
    internationalScoutingState: {
      season: 6,
      ifaPool: [],
      budgets: [],
      scoutingHistory: [],
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
    monthlyPulse: {
      pendingReport: null,
      decisionQueue: [],
    },
    franchise: {
      gmName: 'General Manager',
      difficulty: 'standard',
      playMode: 'standard',
      createdAt: 'S1D1',
      teamId: 'nym',
      teamName: 'New York Tycoons',
      teamAbbreviation: 'NYT',
      teamDivision: 'AL_EAST',
      onboarding: {
        welcomeBriefingSeen: true,
        firstMonthlyPulseSeen: true,
      },
    },
    ceremony: {
      pendingMoments: [],
      seenMomentIds: [],
    },
    achievements: {
      unlocked: [],
      progress: [],
      counters: [],
      ledgers: [],
    },
    performanceDiagnostics: {
      totalSeasons: 6,
      snapshotSizeBytes: 1024,
    },
  } as unknown as GameSnapshot;

  return {
    ...snapshot,
    ...overrides,
  };
}

function createPlayer(id: string, firstName: string, lastName: string): GameSnapshot['players'][number] {
  return {
    id,
    firstName,
    lastName,
    age: 28,
    position: 'RF',
    hitterAttributes: {
      contact: 320,
      power: 340,
      eye: 300,
      speed: 220,
      defense: 250,
      durability: 300,
    },
    personality: {
      workEthic: 60,
      mentalToughness: 60,
      leadership: 60,
      competitiveness: 60,
    },
    contract: {
      years: 3,
      annualSalary: 20,
      totalValue: 60,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    rosterStatus: 'MLB',
    developmentPhase: 'Prime',
    teamId: 'nym',
    rule5EligibleAfterSeason: 1,
    serviceTimeDays: 500,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: null,
  } as unknown as GameSnapshot['players'][number];
}

const branchMeta: WhatIfBranchMeta = {
  id: 'branch-alpha',
  saveId: 'branch-alpha',
  description: 'Aggressive deadline push',
  branchedAtSeason: 4,
  branchedAtDay: 80,
  createdAt: '2026-04-04T00:00:00.000Z',
};

describe('compareTimelines', () => {
  it('returns correct deltas for diverged snapshots', () => {
    const parent = createTimelineSnapshot({
      players: [
        createPlayer('judge', 'Aaron', 'Judge'),
        createPlayer('cole', 'Gerrit', 'Cole'),
      ],
      narrative: {
        ...createTimelineSnapshot().narrative,
        franchiseTimeline: [
          {
            season: 4,
            teamId: 'nym',
            record: '84-78',
            winTotal: 84,
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
            season: 5,
            teamId: 'nym',
            record: '86-76',
            winTotal: 86,
            playoffResult: 'Division Series exit',
            championship: false,
            worldSeriesAppearance: false,
            playoffAppearance: true,
            divisionTitle: true,
            awardWinnerCount: 0,
            keyAcquisitions: [],
            keyDepartures: [],
            dynastyScore: 46,
          },
        ],
      },
      tradeState: {
        pendingOffers: [],
        tradeHistory: [
          {
            id: 'trade-parent',
            fromTeamId: 'nym',
            toTeamId: 'bos',
            offeringAssets: [],
            requestingAssets: [],
            fairnessScore: 0,
            summary: 'Parent trade',
            timestamp: 'S5D20',
          },
        ],
      },
    });
    const branch = createTimelineSnapshot({
      players: [
        createPlayer('judge', 'Aaron', 'Judge'),
        createPlayer('jones', 'Spencer', 'Jones'),
      ],
      seasonState: {
        season: 6,
        currentDay: 120,
        standings: [
          { teamId: 'nym', wins: 90, losses: 54, divisionRank: 1, gamesBack: 0 },
        ],
        playerSeasonStats: [],
        gameLog: [],
        completed: false,
      } as unknown as GameSnapshot['seasonState'],
      narrative: {
        ...createTimelineSnapshot().narrative,
        franchiseTimeline: [
          {
            season: 4,
            teamId: 'nym',
            record: '84-78',
            winTotal: 84,
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
            season: 5,
            teamId: 'nym',
            record: '96-66',
            winTotal: 96,
            playoffResult: 'Champion',
            championship: true,
            worldSeriesAppearance: true,
            playoffAppearance: true,
            divisionTitle: true,
            awardWinnerCount: 1,
            keyAcquisitions: [],
            keyDepartures: [],
            dynastyScore: 62,
          },
        ],
      },
      tradeState: {
        pendingOffers: [],
        tradeHistory: [
          {
            id: 'trade-branch-1',
            fromTeamId: 'nym',
            toTeamId: 'bos',
            offeringAssets: [],
            requestingAssets: [],
            fairnessScore: 0,
            summary: 'Branch trade one',
            timestamp: 'S5D20',
          },
          {
            id: 'trade-branch-2',
            fromTeamId: 'nym',
            toTeamId: 'sea',
            offeringAssets: [],
            requestingAssets: [],
            fairnessScore: 0,
            summary: 'Branch trade two',
            timestamp: 'S6D40',
          },
          {
            id: 'trade-branch-3',
            fromTeamId: 'nym',
            toTeamId: 'sdg',
            offeringAssets: [],
            requestingAssets: [],
            fairnessScore: 0,
            summary: 'Branch trade three',
            timestamp: 'S6D85',
          },
        ],
      },
    });

    const comparison = compareTimelines(parent, branch, branchMeta);

    expect(comparison.branchMeta).toEqual(branchMeta);
    expect(comparison.recordDelta.parent).toMatchObject({ wins: 84, losses: 60 });
    expect(comparison.recordDelta.branch).toMatchObject({ wins: 90, losses: 54 });
    expect(comparison.recordDelta.delta).toBe(6);
    expect(comparison.standingsDelta.parent).toEqual({ divisionRank: 2, gamesBack: 4 });
    expect(comparison.standingsDelta.branch).toEqual({ divisionRank: 1, gamesBack: 0 });
    expect(comparison.standingsDelta.delta).toBe(1);
    expect(comparison.rosterDelta.added).toEqual(['Spencer Jones']);
    expect(comparison.rosterDelta.lost).toEqual(['Gerrit Cole']);
    expect(comparison.championshipsDelta).toEqual({ parent: 0, branch: 1, delta: 1 });
    expect(comparison.tradesDelta).toEqual({ parent: 1, branch: 3, delta: 2 });
  });

  it('handles identical snapshots gracefully', () => {
    const snapshot = createTimelineSnapshot({
      players: [
        createPlayer('judge', 'Aaron', 'Judge'),
      ],
    });

    const comparison = compareTimelines(snapshot, snapshot, branchMeta);

    expect(comparison.recordDelta.delta).toBe(0);
    expect(comparison.standingsDelta.delta).toBe(0);
    expect(comparison.rosterDelta.added).toEqual([]);
    expect(comparison.rosterDelta.lost).toEqual([]);
    expect(comparison.championshipsDelta.delta).toBe(0);
    expect(comparison.tradesDelta.delta).toBe(0);
  });

  it('returns empty roster delta when no changes exist', () => {
    const parent = createTimelineSnapshot({
      players: [
        createPlayer('judge', 'Aaron', 'Judge'),
        createPlayer('soto', 'Juan', 'Soto'),
      ],
    });
    const branch = createTimelineSnapshot({
      players: [
        createPlayer('soto', 'Juan', 'Soto'),
        createPlayer('judge', 'Aaron', 'Judge'),
      ],
    });

    const comparison = compareTimelines(parent, branch, branchMeta);

    expect(comparison.rosterDelta.parent).toEqual(['Aaron Judge', 'Juan Soto']);
    expect(comparison.rosterDelta.branch).toEqual(['Aaron Judge', 'Juan Soto']);
    expect(comparison.rosterDelta.added).toEqual([]);
    expect(comparison.rosterDelta.lost).toEqual([]);
    expect(comparison.rosterDelta.delta).toBe(0);
  });
});
