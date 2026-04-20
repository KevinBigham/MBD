// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { parseGameSnapshot } from '@mbd/contracts';

function createV17Snapshot() {
  return {
    schemaVersion: 17,
    rng: { seed: 7, callCount: 14 },
    season: 3,
    day: 97,
    phase: 'regular',
    userTeamId: 'nym',
    players: [],
    schedule: [],
    seasonState: {
      season: 3,
      currentDay: 97,
      standings: [],
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
      playerMoments: [],
      playerNicknames: [],
      playerStoryArcs: [],
      prospectBonds: [],
      gmRelationships: [],
      leagueEvents: [],
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
      whatIfBranches: [],
      seasonHistory: [],
    },
    tradeState: {
      pendingOffers: [],
      tradeHistory: [],
      negotiations: [],
      multiTeamPendingTrades: [],
    },
    internationalScoutingState: {
      season: 3,
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
      createdAt: 'S3D97',
      teamId: 'nym',
      teamName: 'New York Tycoons',
      teamAbbreviation: 'NYT',
      teamDivision: 'AL East',
      onboarding: {
        welcomeBriefingSeen: true,
        firstMonthlyPulseSeen: true,
      },
      assistantGMId: 'marcus_chen',
      gmPhilosophy: {
        seasonGoal: 'playoff',
        developmentStyle: 'balanced',
        spendingStyle: 'balanced',
        tradeApproach: 'opportunistic',
        scoutingFocus: 'draft',
        mediaTone: 'measured',
      },
      scoutingDirector: null,
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
      totalSeasons: 3,
      snapshotSizeBytes: 512,
    },
  };
}

describe('snapshot Day One migration', () => {
  it('migrates v17 saves to current schema with a completed Day One state', () => {
    const migrated = parseGameSnapshot(createV17Snapshot());

    expect(migrated.schemaVersion).toBe(19);
    expect(migrated.franchise.dayOne.status).toBe('complete');
    expect(migrated.franchise.dayOne.currentStep).toBe('complete');
    expect(migrated.franchise.dayOne.selectedAGMId).toBe('marcus_chen');
    expect(migrated.franchise.dayOne.seasonGoal).toBe('playoff');
    expect(migrated.franchise.dayOne.quickStartRecapSeen).toBe(true);
  });
});
