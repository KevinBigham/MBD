import { describe, expect, it } from 'vitest';
import type { GameSnapshot } from '@mbd/contracts';
import * as simCore from '../src/index.js';

function createSnapshot(): GameSnapshot {
  return {
    schemaVersion: 13,
    rng: { seed: 7, callCount: 4 },
    season: 6,
    day: 162,
    phase: 'offseason',
    userTeamId: 'nym',
    players: [],
    schedule: [],
    seasonState: {
      season: 6,
      currentDay: 162,
      standings: [],
      playerSeasonStats: [],
      gameLog: [],
      completed: true,
    },
    playoffBracket: null,
    injuries: [],
    serviceTime: [],
    scoutingStaffs: [],
    gmPersonalities: [],
    coachingStaffs: [],
    coachFreeAgentPool: [],
    offseasonState: null,
    rule5Session: null,
    rule5Obligations: [],
    rule5OfferBackStates: [],
    draftClass: null,
    freeAgencyMarket: null,
    news: [],
    rosterStates: [],
    narrative: {
      playerMorale: [],
      teamChemistry: [],
      ownerState: [],
      briefingQueue: [],
      storyFlags: [],
      rivalries: [],
      awardHistory: [],
      hallOfFame: [],
      hallOfFameBallot: [],
      franchiseTimeline: [
        {
          season: 4,
          teamId: 'nym',
          record: '97-65',
          winTotal: 97,
          playoffResult: 'World Series champion',
          championship: true,
          worldSeriesAppearance: true,
          playoffAppearance: true,
          divisionTitle: true,
          awardWinnerCount: 1,
          keyAcquisitions: ['Ace Starter'],
          keyDepartures: [],
          dynastyScore: 92,
        },
        {
          season: 5,
          teamId: 'bos',
          record: '91-71',
          winTotal: 91,
          playoffResult: 'Division Series loss',
          championship: false,
          worldSeriesAppearance: false,
          playoffAppearance: true,
          divisionTitle: true,
          awardWinnerCount: 0,
          keyAcquisitions: ['Bullpen Anchor'],
          keyDepartures: ['Ace Starter'],
          dynastyScore: 77,
        },
      ],
      careerStats: [],
      recordBook: [],
      recordWatch: [],
      seasonArchive: [],
      historicalPlayers: [],
      mentorRelationships: [],
      frontOfficeState: [],
      seasonHistory: [],
      gmCareer: {
        careerHistory: [
          {
            teamId: 'nym',
            seasons: 4,
            record: { wins: 360, losses: 288 },
            championships: 1,
            hiredSeason: 1,
            firedSeason: 4,
            firedReason: 'Owner impatience',
            reputation: 62,
          },
          {
            teamId: 'bos',
            seasons: 2,
            record: { wins: 182, losses: 142 },
            championships: 0,
            hiredSeason: 5,
            firedSeason: null,
            firedReason: null,
            reputation: 68,
          },
        ],
        currentTeamId: 'bos',
        reputation: 68,
        overallRecord: { wins: 542, losses: 430 },
        championships: 1,
        hiredSeason: 5,
        firedSeasons: [4],
        careerAchievements: ['Won 1 championship.'],
        jobSearchActive: false,
        lastFiredReason: null,
      },
      jobMarket: { availableJobs: [], applicationDeadlineSeason: null },
      consequenceWatchers: [],
      fanSentiment: { score: 63, trend: 'rising', summary: 'Fans are energized by the recent stretch.', updatedAt: 'S6D162' },
      scoutConflicts: [],
      dynastyCards: [],
      challengeState: null,
    },
    tradeState: { pendingOffers: [], tradeHistory: [] },
    internationalScoutingState: { season: 6, ifaPool: [], budgets: [], scoutingHistory: [] },
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
      processedDevelopmentMonths: [],
      developmentLedger: [],
      developmentReports: [],
      conversionRecommendations: [],
    },
    monthlyPulse: { pendingReport: null, decisionQueue: [] },
    franchise: {
      gmName: 'Alex Rivera',
      difficulty: 'hard',
      createdAt: 'S1D1',
      teamId: 'bos',
      teamName: 'Boston Noreasters',
      teamAbbreviation: 'BOS',
      teamDivision: 'AL East',
      onboarding: { welcomeBriefingSeen: true, firstMonthlyPulseSeen: true },
      playMode: 'career',
    },
    ceremony: { pendingMoments: [], seenMomentIds: [] },
    achievements: { unlocked: [], progress: [], counters: [], ledgers: [] },
  } as unknown as GameSnapshot;
}

describe('dynasty sharing', () => {
  it('builds deterministic career-overview cards and leaderboard scores', () => {
    const generateDynastyCard = (
      simCore as unknown as {
        generateDynastyCard?: (
          snapshot: GameSnapshot,
          cardType: import('@mbd/contracts').DynastyCard['type'],
        ) => import('@mbd/contracts').DynastyCard;
      }
    ).generateDynastyCard;
    const calculateDynastyLeaderboardScore = (
      simCore as unknown as {
        calculateDynastyLeaderboardScore?: (snapshot: GameSnapshot) => number;
      }
    ).calculateDynastyLeaderboardScore;

    expect(typeof generateDynastyCard).toBe('function');
    expect(typeof calculateDynastyLeaderboardScore).toBe('function');

    const snapshot = createSnapshot();
    const card = generateDynastyCard!(snapshot, 'career_overview');
    const score = calculateDynastyLeaderboardScore!(snapshot);

    expect(card.type).toBe('career_overview');
    expect(card.title).toContain('Alex Rivera');
    expect(card.stats.some((entry) => entry.label.toLowerCase().includes('teams'))).toBe(true);
    expect(card.textSummary).toContain('Championships');
    expect(score).toBe(calculateDynastyLeaderboardScore!(snapshot));
    expect(score).toBeGreaterThan(0);
  });

  it('adds the offseason headline to season recap card text summaries when history is available', () => {
    const generateSeasonRecapCard = (
      simCore as unknown as {
        generateSeasonRecapCard?: (
          snapshot: GameSnapshot,
          season?: number,
        ) => import('@mbd/contracts').DynastyCard;
      }
    ).generateSeasonRecapCard;
    const generateOffseasonHeadline = (
      simCore as unknown as {
        generateOffseasonHeadline?: (
          seasonHistory: Record<string, unknown>,
          seasonArchive?: Record<string, unknown> | null,
        ) => string;
      }
    ).generateOffseasonHeadline;

    expect(typeof generateSeasonRecapCard).toBe('function');
    expect(typeof generateOffseasonHeadline).toBe('function');

    const snapshot = createSnapshot() as GameSnapshot & {
      narrative: GameSnapshot['narrative'] & {
        seasonHistory: Record<string, unknown>[];
        seasonArchive: Record<string, unknown>[];
      };
    };
    snapshot.narrative.seasonHistory = [{
      season: 6,
      championTeamId: 'lax',
      runnerUpTeamId: 'nym',
      worldSeriesRecord: '4-2',
      summary: 'Los Angeles finished the climb and New York was left chasing the last step.',
      awards: [],
      keyMoments: ['October exposed the last roster gap.'],
      statLeaders: { hr: [], avg: [], era: [], w: [], war: [] },
      notableRetirements: [],
      blockbusterTrades: [],
      userSeason: {
        teamId: 'nym',
        record: '92-70',
        playoffResult: 'Division Series loss',
        storylines: ['October exposed the last roster gap.'],
      },
    }];
    snapshot.narrative.seasonArchive = [{
      season: 6,
      timelineEvents: ['October exposed the last roster gap.'],
      transactions: [],
      userSummary: {
        teamId: 'nym',
        record: '92-70',
        playoffResult: 'Division Series loss',
        storylines: ['October exposed the last roster gap.'],
      },
    }];

    const expectedHeadline = generateOffseasonHeadline!(
      snapshot.narrative.seasonHistory[0]!,
      snapshot.narrative.seasonArchive[0]!,
    );
    const card = generateSeasonRecapCard!(snapshot, 6);

    expect(card.type).toBe('season_recap');
    expect(card.textSummary).toContain(expectedHeadline);
  });
});
