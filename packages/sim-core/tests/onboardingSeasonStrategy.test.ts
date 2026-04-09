import { describe, expect, it } from 'vitest';
import {
  generateSeasonStrategy,
  rankStrategicPriorities,
  type FarmAssessment,
  type FinancialPlaybook,
  type OwnerMeetingBriefing,
  type RosterAssessment,
  type ScoutingBriefing,
  type SeasonStrategyContext,
  type StaffEvaluation,
} from '../src/index.js';

function createOwnerMeeting(overrides: Partial<OwnerMeetingBriefing> = {}): OwnerMeetingBriefing {
  return {
    ownerGreeting: 'Welcome.',
    ownerPersonality: {
      archetype: 'patient_builder',
      expectationLevel: 'moderate',
      personalityDescription: 'Ownership wants a disciplined plan.',
    },
    expectations: 'Ownership expects competitive baseball.',
    budgetOverview: {
      totalBudget: 240,
      currentPayroll: 188,
      availableSpace: 52,
      luxuryTaxDistance: 42,
      spendingGrade: 'B',
      narrativeSummary: 'Plenty of room remains.',
    },
    marketContext: 'Large market.',
    divisionOutlook: 'Boston is the benchmark.',
    seasonGoalOptions: [
      { id: 'championship', label: 'Championship', description: 'Go for it.' },
      { id: 'playoff', label: 'Playoff', description: 'Get to October.' },
      { id: 'compete', label: 'Compete', description: 'Stay relevant.' },
      { id: 'rebuild', label: 'Rebuild', description: 'Reset the curve.' },
    ],
    ...overrides,
  };
}

function createRoster(overrides: Partial<RosterAssessment> = {}): RosterAssessment {
  return {
    stars: [],
    lineup: {
      overallGrade: 'B',
      hittersGrade: 'B',
      pitchingGrade: 'B',
      topStrength: 'elite rotation',
      biggestWeakness: 'shallow bullpen',
      depthRating: 'adequate',
      balanceAssessment: 'Balanced roster.',
    },
    needs: [],
    contracts: {
      totalPayroll: 115,
      extensionCandidates: [],
      expiringDeals: [],
      biggestContract: { name: 'Victor Ace', salary: 31, years: 2 },
      narrativeSummary: 'Payroll is manageable.',
    },
    rosterNarrative: 'The roster can contend with the right support.',
    aceStarter: null,
    cleanupHitter: null,
    ...overrides,
  };
}

function createFarm(overrides: Partial<FarmAssessment> = {}): FarmAssessment {
  return {
    topProspects: [],
    pipeline: {
      grade: 'B',
      readyCount: 2,
      developingCount: 2,
      rawCount: 1,
      positionBalance: 'balanced',
      depthDescription: 'Strong enough to help soon.',
    },
    farmNarrative: 'The pipeline can support the roster.',
    developmentOptions: [],
    closestToMLB: null,
    highestCeiling: null,
    ...overrides,
  };
}

function createStaff(overrides: Partial<StaffEvaluation> = {}): StaffEvaluation {
  return {
    keyCoaches: [],
    strengths: {
      overallGrade: 'B',
      bestArea: 'player development',
      weakestArea: 'bullpen instruction',
      teachingAverage: 0.74,
      budgetUtilization: 0.82,
      narrativeSummary: 'Staff is solid.',
    },
    staffBudget: 14,
    staffPayroll: 11.5,
    budgetRemaining: 2.5,
    ...overrides,
  };
}

function createFinancial(overrides: Partial<FinancialPlaybook> = {}): FinancialPlaybook {
  return {
    payroll: {
      totalPayroll: 115,
      hitterPayroll: 71,
      pitcherPayroll: 44,
      topPaidPlayer: { name: 'Victor Ace', salary: 31 },
      averageSalary: 19.17,
      medianSalary: 16.5,
    },
    extensions: [],
    flexibility: {
      grade: 'B',
      availableSpace: 52,
      luxuryTaxRoom: 42,
      canAddStar: true,
      canAddRole: true,
      narrativeSummary: 'The front office has room to maneuver.',
    },
    spendingOptions: [],
    ...overrides,
  };
}

function createScouting(overrides: Partial<ScoutingBriefing> = {}): ScoutingBriefing {
  return {
    divisionReports: [],
    leagueThreats: [
      { teamId: 'bos', teamName: 'Boston Noreasters', projectedWins: 92, threatLevel: 'favorite' },
    ],
    scoutingFocusOptions: [],
    intelNarrative: 'Boston remains the benchmark.',
    ...overrides,
  };
}

function createContext(overrides: Partial<SeasonStrategyContext> = {}): SeasonStrategyContext {
  return {
    teamId: 'nym',
    teamName: 'Tycoons',
    ownerMeeting: createOwnerMeeting(),
    roster: createRoster(),
    farm: createFarm(),
    staff: createStaff(),
    financial: createFinancial(),
    scouting: createScouting(),
    ...overrides,
  };
}

describe('rankStrategicPriorities', () => {
  it('prioritizes immediate contention for a strong roster with financial room', () => {
    const priorities = rankStrategicPriorities(createContext());

    expect(priorities[0]?.id).toBe('push_current_window');
  });

  it('prioritizes talent accumulation for weak rosters with poor flexibility', () => {
    const priorities = rankStrategicPriorities(createContext({
      roster: createRoster({
        lineup: {
          overallGrade: 'D',
          hittersGrade: 'D',
          pitchingGrade: 'D',
          topStrength: 'none',
          biggestWeakness: 'everyday lineup',
          depthRating: 'thin',
          balanceAssessment: 'Overmatched roster.',
        },
      }),
      financial: createFinancial({
        flexibility: {
          grade: 'F',
          availableSpace: -12,
          luxuryTaxRoom: -18,
          canAddStar: false,
          canAddRole: false,
          narrativeSummary: 'No maneuvering room.',
        },
      }),
      farm: createFarm({
        pipeline: {
          grade: 'D',
          readyCount: 0,
          developingCount: 1,
          rawCount: 3,
          positionBalance: 'pitcher_heavy',
          depthDescription: 'Thin system.',
        },
      }),
    }));

    expect(priorities[0]?.id).toBe('accumulate_future_value');
  });
});

describe('generateSeasonStrategy', () => {
  it('returns the competitive window, recommended approach, and all trade-approach options', () => {
    const strategy = generateSeasonStrategy(createContext());

    expect(strategy.competitiveWindow).toMatch(/win_now|stable_contender|transitioning|retooling|rebuild/);
    expect(strategy.recommendedTradeApproach).toMatch(/buyer|seller|opportunistic/);
    expect(strategy.strategyOptions.map((option) => option.id)).toEqual([
      'buyer',
      'seller',
      'opportunistic',
    ]);
  });

  it('identifies rebuild conditions when the roster and finances are both poor', () => {
    const strategy = generateSeasonStrategy(createContext({
      ownerMeeting: createOwnerMeeting({
        ownerPersonality: {
          archetype: 'budget_hawk',
          expectationLevel: 'low',
          personalityDescription: 'Ownership wants a reset.',
        },
      }),
      roster: createRoster({
        lineup: {
          overallGrade: 'D',
          hittersGrade: 'D',
          pitchingGrade: 'D',
          topStrength: 'none',
          biggestWeakness: 'everyday lineup',
          depthRating: 'thin',
          balanceAssessment: 'Overmatched roster.',
        },
      }),
      financial: createFinancial({
        flexibility: {
          grade: 'F',
          availableSpace: -12,
          luxuryTaxRoom: -18,
          canAddStar: false,
          canAddRole: false,
          narrativeSummary: 'No room.',
        },
      }),
      farm: createFarm({
        pipeline: {
          grade: 'F',
          readyCount: 0,
          developingCount: 0,
          rawCount: 4,
          positionBalance: 'balanced',
          depthDescription: 'Empty pipeline.',
        },
      }),
    }));

    expect(strategy.competitiveWindow).toBe('rebuild');
    expect(strategy.recommendedSeasonGoal).toBe('rebuild');
    expect(strategy.recommendedTradeApproach).toBe('seller');
  });
});
