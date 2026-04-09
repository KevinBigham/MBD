import { describe, expect, it } from 'vitest';
import type { GameSnapshot, SeasonArchiveEntry } from '@mbd/contracts';
import {
  archiveOldSeasons,
  estimateSnapshotSize,
  pruneStaleData,
} from '../src/performance';

function createArchiveEntry(
  season: number,
  overrides: Partial<SeasonArchiveEntry> = {},
): SeasonArchiveEntry {
  return {
    season,
    standings: [
      {
        teamId: 'nym',
        wins: 90 - (season % 7),
        losses: 72 + (season % 7),
        divisionRank: 1,
        gamesBack: 0,
      },
      {
        teamId: 'bos',
        wins: 84,
        losses: 78,
        divisionRank: 2,
        gamesBack: 6,
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
        season,
        award: 'MVP',
        league: 'MLB',
        playerId: `mvp-${season}`,
        teamId: 'nym',
        summary: `MVP for season ${season}`,
      },
      {
        season,
        award: 'CY_YOUNG',
        league: 'MLB',
        playerId: `cy-${season}`,
        teamId: 'nym',
        summary: `Cy Young for season ${season}`,
      },
    ],
    statLeaders: {
      hr: [{ playerId: `slugger-${season}`, teamId: 'nym', value: '44', summary: `Slugger ${season} hit 44 HR.` }],
      rbi: [{ playerId: `runproducer-${season}`, teamId: 'nym', value: '121', summary: `Run Producer ${season} drove in 121 runs.` }],
      avg: [{ playerId: `bat-${season}`, teamId: 'nym', value: '.321', summary: `Bat ${season} hit .321.` }],
      era: [{ playerId: `ace-${season}`, teamId: 'nym', value: '2.81', summary: `Ace ${season} posted a 2.81 ERA.` }],
      k: [{ playerId: `k-${season}`, teamId: 'nym', value: '241', summary: `Strikeout ${season} recorded 241 K.` }],
      w: [{ playerId: `wins-${season}`, teamId: 'nym', value: '19', summary: `Winner ${season} won 19 games.` }],
    },
    transactions: [
      {
        headline: `Blockbuster ${season}`,
        summary: `Major move in season ${season}`,
        playerIds: [`trade-${season}`],
        teamIds: ['nym', 'bos'],
        impactScore: 80,
      },
    ],
    draftClass: [
      {
        pickNumber: 1,
        playerId: `pick-${season}`,
        playerName: `Pick ${season}`,
        teamId: 'nym',
        currentStatus: 'MLB',
      },
    ],
    financials: [
      {
        teamId: 'nym',
        payroll: 210,
        budget: 225,
      },
    ],
    userSummary: {
      teamId: 'nym',
      record: '90-72',
      playoffResult: 'Won World Series',
      storylines: [`Season ${season} title run`],
    },
    timelineEvents: [`Season ${season} milestone`],
    ...overrides,
  };
}

function createSnapshot(): GameSnapshot {
  const seasonArchive = Array.from({ length: 14 }, (_, index) => createArchiveEntry(index + 1));
  return {
    schemaVersion: 15,
    rng: { seed: 7, callCount: 14 },
    season: 25,
    day: 97,
    phase: 'regular',
    userTeamId: 'nym',
    players: [],
    schedule: [],
    seasonState: {
      season: 25,
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
      tickerFeed: Array.from({ length: 245 }, (_, index) => ({
        id: `ticker-${index}`,
        timestamp: 'S25D97',
        category: 'score',
        text: `Ticker ${index}`,
        priority: 3,
        relatedTeamIds: [],
        relatedPlayerIds: [],
        expiresDay: 120,
      })),
      playerStoryArcs: [
        {
          playerId: 'resolved-arc',
          arcType: 'breakout',
          startSeason: 3,
          startDay: 1,
          phase: 'resolution',
          milestones: [],
          resolvedSeason: 10,
        },
      ],
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
      seasonArchive,
      archivedSeasons: [],
      historicalPlayers: [],
      mentorRelationships: [],
      frontOfficeState: [],
      gmCareer: undefined,
      jobMarket: {
        availableJobs: [],
        applicationDeadlineSeason: null,
      },
      consequenceWatchers: [
        {
          id: 'watcher-old',
          type: 'trade_aftershock',
          targetTeamId: 'nym',
          createdSeason: 18,
          createdDay: 1,
          expiresSeason: 19,
          expiresDay: 1,
          resolved: true,
          summary: 'Old watcher',
          playerIds: [],
        },
      ],
      fanSentiment: {
        score: 50,
        trend: 'stable',
        summary: 'Stable.',
        updatedAt: 'S25D97',
      },
      scoutConflicts: Array.from({ length: 102 }, (_, index) => ({
        prospectId: `prospect-${index}`,
        teamId: 'nym',
        createdSeason: 24,
        divergence: 20 - (index % 5),
        opinions: [],
        summary: `Conflict ${index}`,
        resolved: index < 4,
        resolvedSeason: index < 4 ? 24 : null,
      })),
      dynastyCards: Array.from({ length: 55 }, (_, index) => ({
        id: `card-${index}`,
        type: index === 54 ? 'championship' : 'season_recap',
        title: `Card ${index}`,
        subtitle: 'Summary',
        stats: [],
        highlights: [],
        generatedAt: `S${index + 1}D1`,
        teamId: 'nym',
        season: index + 1,
        textSummary: `Card ${index}`,
      })),
      challengeState: null,
      seasonHistory: [],
      whatIfBranches: [],
    },
    tradeState: {
      pendingOffers: [],
      tradeHistory: [],
    },
    internationalScoutingState: {
      season: 25,
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
      activeDevelopmentSetbacks: [
        {
          playerId: 'expired-setback',
          type: 'nagging_injury',
          overallModifier: -2,
          startSeason: 20,
          startMonth: 4,
          endSeason: 21,
          endMonth: 5,
          summary: 'Expired setback',
          active: false,
        },
      ],
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
      createdAt: 'S25D97',
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
      totalSeasons: 25,
      snapshotSizeBytes: 0,
    },
  } as unknown as GameSnapshot;
}

describe('performance snapshot helpers', () => {
  it('archives seasons older than the keep window and preserves compare-grade structure', () => {
    const snapshot = createSnapshot();

    const archived = archiveOldSeasons(snapshot, 25, 10);

    expect(archived.narrative.seasonArchive).toEqual([]);
    expect(archived.narrative.archivedSeasons).toHaveLength(14);
    expect(archived.narrative.archivedSeasons[0]).toMatchObject({
      season: 1,
      championTeamId: 'nym',
      championshipWon: true,
      playoffResult: 'Won World Series',
      userRecord: { wins: 90, losses: 72 },
    });
    expect(archived.narrative.archivedSeasons[0]?.standings[0]).toMatchObject({
      teamId: 'nym',
      wins: expect.any(Number),
      losses: expect.any(Number),
      divisionRank: 1,
    });
    expect(archived.narrative.archivedSeasons[0]?.statLeaders.hr[0]).toMatchObject({
      value: '44',
    });
  });

  it('falls back to franchise.teamId when userTeamId is absent during archiving', () => {
    const snapshot = createSnapshot();

    const archived = archiveOldSeasons({
      ...snapshot,
      userTeamId: undefined,
    }, 25, 10);

    expect(archived.narrative.archivedSeasons[0]?.championTeamId).toBe('nym');
    expect(archived.narrative.archivedSeasons[0]?.championshipWon).toBe(true);
  });

  it('prunes stale narrative and roster bloat within phase 14 caps', () => {
    const snapshot = createSnapshot();

    const pruned = pruneStaleData(snapshot);

    expect(pruned.narrative.tickerFeed).toHaveLength(200);
    expect(pruned.narrative.consequenceWatchers).toEqual([]);
    expect(pruned.narrative.playerStoryArcs).toEqual([]);
    expect(pruned.minorLeagueState.activeDevelopmentSetbacks).toEqual([]);
    expect(pruned.narrative.scoutConflicts).toHaveLength(100);
    expect(pruned.narrative.dynastyCards).toHaveLength(50);
    expect(pruned.narrative.dynastyCards.some((card) => card.type === 'championship')).toBe(true);
  });

  it('estimates snapshot size close to the serialized payload size', () => {
    const snapshot = createSnapshot();

    const estimated = estimateSnapshotSize(snapshot);
    const actual = new TextEncoder().encode(JSON.stringify(snapshot)).byteLength;
    const delta = Math.abs(estimated - actual) / actual;

    expect(delta).toBeLessThanOrEqual(0.2);
  });
});
