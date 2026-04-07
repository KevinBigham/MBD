import { describe, expect, it } from 'vitest';
import type { GameSnapshot } from '@mbd/contracts';
import * as simCore from '../src/index.js';

function createSnapshot(teamId: string = 'nym'): GameSnapshot {
  return {
    schemaVersion: 13,
    rng: { seed: 11, callCount: 0 },
    season: 3,
    day: 1,
    phase: 'preseason',
    userTeamId: teamId,
    players: [],
    schedule: [],
    seasonState: {
      season: 3,
      currentDay: 1,
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
      franchiseTimeline: [],
      careerStats: [],
      recordBook: [],
      recordWatch: [],
      seasonArchive: [],
      historicalPlayers: [],
      mentorRelationships: [],
      frontOfficeState: [],
      seasonHistory: [],
      gmCareer: {
        careerHistory: [],
        currentTeamId: teamId,
        reputation: 55,
        overallRecord: { wins: 0, losses: 0 },
        championships: 0,
        hiredSeason: 3,
        firedSeasons: [],
        careerAchievements: [],
        jobSearchActive: false,
        lastFiredReason: null,
      },
      jobMarket: { availableJobs: [], applicationDeadlineSeason: null },
      consequenceWatchers: [],
      fanSentiment: { score: 50, trend: 'stable', summary: 'Fans are waiting to be convinced.', updatedAt: 'S3D1' },
      scoutConflicts: [],
      dynastyCards: [],
      challengeState: null,
    },
    tradeState: { pendingOffers: [], tradeHistory: [] },
    internationalScoutingState: { season: 3, ifaPool: [], budgets: [], scoutingHistory: [] },
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
      difficulty: 'standard',
      createdAt: 'S3D1',
      teamId,
      teamName: 'New York Tycoons',
      teamAbbreviation: 'NYT',
      teamDivision: 'AL East',
      onboarding: { welcomeBriefingSeen: true, firstMonthlyPulseSeen: true },
      playMode: 'standard',
    },
    ceremony: { pendingMoments: [], seenMomentIds: [] },
    achievements: { unlocked: [], progress: [], counters: [], ledgers: [] },
  } as unknown as GameSnapshot;
}

describe('challenge scenarios', () => {
  it('ships ten scenarios and gates turnaround to career mode', () => {
    const scenarioLibrary = (
      simCore as unknown as {
        SCENARIO_LIBRARY?: Array<{ id: string; requiresCareerMode: boolean }>;
      }
    ).SCENARIO_LIBRARY;

    expect(Array.isArray(scenarioLibrary)).toBe(true);
    expect(scenarioLibrary).toHaveLength(10);
    expect(scenarioLibrary?.find((entry) => entry.id === 'turnaround')?.requiresCareerMode).toBe(true);
  });

  it('applies deterministic overrides and evaluates scenario progress', () => {
    const scenarioLibrary = (
      simCore as unknown as {
        SCENARIO_LIBRARY?: Array<{ id: string }>;
      }
    ).SCENARIO_LIBRARY;
    const applyScenarioOverrides = (
      simCore as unknown as {
        applyScenarioOverrides?: (
          rng: InstanceType<typeof simCore.GameRNG>,
          snapshot: GameSnapshot,
          scenario: { id: string },
        ) => GameSnapshot;
      }
    ).applyScenarioOverrides;
    const evaluateScenarioProgress = (
      simCore as unknown as {
        evaluateScenarioProgress?: (
          snapshot: GameSnapshot,
          scenario: { id: string },
        ) => { met: boolean; progress: number; message: string };
      }
    ).evaluateScenarioProgress;

    expect(typeof applyScenarioOverrides).toBe('function');
    expect(typeof evaluateScenarioProgress).toBe('function');

    const expansion = scenarioLibrary?.find((entry) => entry.id === 'expansion');
    const perfectSeason = scenarioLibrary?.find((entry) => entry.id === 'perfect_season');
    expect(expansion).toBeDefined();
    expect(perfectSeason).toBeDefined();

    const overridden = applyScenarioOverrides!(new simCore.GameRNG(3), createSnapshot('nym'), expansion!);
    expect(overridden.userTeamId).toBe('por');
    expect(overridden.franchise.teamId).toBe('por');

    const winningSnapshot = {
      ...createSnapshot('por'),
      seasonState: {
        ...createSnapshot('por').seasonState,
        standings: [
          ['por', { wins: 117, losses: 45 }],
        ],
      },
    } as unknown as GameSnapshot;
    const progress = evaluateScenarioProgress!(winningSnapshot, perfectSeason!);

    expect(progress.met).toBe(true);
    expect(progress.progress).toBe(1);
    expect(progress.message.length).toBeGreaterThan(0);
  });
});
