// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { parseGameSnapshot } from '../../../../packages/contracts/src/schemas/save';

function createV15Snapshot() {
  return {
    schemaVersion: 15,
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
      whatIfBranches: [],
      seasonHistory: [],
    },
    tradeState: {
      pendingOffers: [],
      tradeHistory: [],
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

describe('snapshot onboarding migration', () => {
  it('migrates v15 saves to v16 with null onboarding persistence fields', () => {
    const migrated = parseGameSnapshot(createV15Snapshot());

    expect(migrated.schemaVersion).toBe(16);
    expect(migrated.franchise.assistantGMId).toBeNull();
    expect(migrated.franchise.gmPhilosophy).toBeNull();
    expect(migrated.franchise.scoutingDirector).toBeNull();
  });
});
