import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  calculateCoachMarketValue,
  calculateStaffBudget,
  generateCoachingStaff,
  getCoachingDevelopmentModifier,
  type Coach,
  type GeneratedPlayer,
} from '../src/index.js';

function makeHitterProspect(): GeneratedPlayer {
  return {
    id: 'prospect-1',
    firstName: 'Luis',
    lastName: 'Power',
    age: 20,
    position: 'RF',
    hitterAttributes: {
      contact: 230,
      power: 260,
      eye: 210,
      speed: 180,
      defense: 190,
      durability: 220,
    },
    pitcherAttributes: null,
    personality: {
      workEthic: 70,
      mentalToughness: 58,
      leadership: 44,
      competitiveness: 61,
    },
    contract: {
      years: 1,
      annualSalary: 0.7,
      totalValue: 0.7,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    rosterStatus: 'AA',
    developmentPhase: 'Prospect',
    teamId: 'nym',
    nationality: 'latin',
    overallRating: 235,
    potentialRating: 320,
    ceiling: 340,
    floor: 205,
    developmentProgram: 'power',
    developmentTrajectory: 'on_track',
    extensionHistory: [],
    rule5EligibleAfterSeason: 4,
    serviceTimeDays: 0,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: 'AA',
  };
}

function makeCoach(overrides: Partial<Coach>): Coach {
  return {
    id: 'coach-1',
    firstName: 'Jim',
    lastName: 'Power',
    role: 'hitting_coach',
    specialty: 'power',
    teachingAbility: 0.82,
    developmentBonus: 0.15,
    personalityFit: 0.74,
    experienceYears: 11,
    contractYears: 2,
    annualSalary: 2.4,
    teamId: 'nym',
    ...overrides,
  };
}

describe('generateCoachingStaff', () => {
  it('builds a deterministic 12-role staff for a team', () => {
    const first = generateCoachingStaff(new GameRNG(77), 'nym');
    const second = generateCoachingStaff(new GameRNG(77), 'nym');

    expect(first).toHaveLength(12);
    expect(second).toEqual(first);
    expect(new Set(first.map((coach) => coach.role))).toEqual(new Set([
      'manager',
      'pitching_coach',
      'hitting_coach',
      'bench_coach',
      'bullpen_coach',
      'first_base_coach',
      'third_base_coach',
      'farm_director',
      'rookie_coordinator',
      'a_coordinator',
      'aa_coordinator',
      'aaa_coordinator',
    ]));
  });
});

describe('calculateCoachMarketValue', () => {
  it('prices elite coaches above replacement-level coaches', () => {
    const elite = makeCoach({
      teachingAbility: 0.95,
      developmentBonus: 0.28,
      personalityFit: 0.88,
      experienceYears: 18,
    });
    const replacement = makeCoach({
      id: 'coach-2',
      teachingAbility: 0.4,
      developmentBonus: 0.03,
      personalityFit: 0.45,
      experienceYears: 2,
    });

    expect(calculateCoachMarketValue(elite)).toBeGreaterThan(
      calculateCoachMarketValue(replacement),
    );
  });
});

describe('getCoachingDevelopmentModifier', () => {
  it('awards a larger modifier when coach specialty matches player needs', () => {
    const player = makeHitterProspect();
    const matchingStaff = [
      makeCoach({ role: 'farm_director', specialty: 'power' }),
      makeCoach({ id: 'coach-3', role: 'aa_coordinator', specialty: 'power' }),
    ];
    const mismatchStaff = [
      makeCoach({ role: 'farm_director', specialty: 'contact' }),
      makeCoach({ id: 'coach-4', role: 'aa_coordinator', specialty: 'control' }),
    ];

    expect(
      getCoachingDevelopmentModifier(player, matchingStaff, 'AA'),
    ).toBeGreaterThan(
      getCoachingDevelopmentModifier(player, mismatchStaff, 'AA'),
    );
  });
});

describe('calculateStaffBudget', () => {
  it('applies the derived floor and cap to staff budgets', () => {
    expect(calculateStaffBudget(90)).toBe(6);
    expect(calculateStaffBudget(240)).toBe(9.6);
    expect(calculateStaffBudget(500)).toBe(14);
  });
});
