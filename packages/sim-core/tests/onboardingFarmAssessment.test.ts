import { describe, expect, it } from 'vitest';
import {
  assessFarmSystem,
  createGameRNG,
  assessPipelineHealth,
  profileTopProspects,
  type Coach,
  type GeneratedPlayer,
} from '../src/index.js';

function makeCoach(overrides: Partial<Coach> = {}): Coach {
  return {
    id: overrides.id ?? 'coach-1',
    firstName: overrides.firstName ?? 'Tom',
    lastName: overrides.lastName ?? 'Bennett',
    role: overrides.role ?? 'farm_director',
    specialty: overrides.specialty ?? 'mlb_prep',
    teachingAbility: overrides.teachingAbility ?? 0.84,
    developmentBonus: overrides.developmentBonus ?? 0.16,
    personalityFit: overrides.personalityFit ?? 0.76,
    experienceYears: overrides.experienceYears ?? 11,
    contractYears: overrides.contractYears ?? 2,
    annualSalary: overrides.annualSalary ?? 1.8,
    teamId: overrides.teamId ?? 'nym',
  };
}

function makeProspect(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  const position = overrides.position ?? 'CF';
  const isPitcher = position === 'SP' || position === 'RP' || position === 'CL';

  return {
    id: overrides.id ?? `prospect-${position}-${overrides.age ?? 20}`,
    firstName: overrides.firstName ?? 'Eli',
    lastName: overrides.lastName ?? 'Prospect',
    age: overrides.age ?? 20,
    position,
    hitterAttributes: {
      contact: 270,
      power: 255,
      eye: 240,
      speed: 295,
      defense: 275,
      durability: 280,
      ...overrides.hitterAttributes,
    },
    pitcherAttributes: isPitcher ? {
      stuff: 300,
      control: 280,
      stamina: position === 'SP' ? 320 : 210,
      velocity: 305,
      movement: 295,
      ...(overrides.pitcherAttributes ?? {}),
    } : null,
    personality: {
      workEthic: 73,
      mentalToughness: 66,
      leadership: 45,
      competitiveness: 72,
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
      ...overrides.contract,
    },
    rosterStatus: overrides.rosterStatus ?? 'AAA',
    developmentPhase: overrides.developmentPhase ?? 'Prospect',
    teamId: overrides.teamId ?? 'nym',
    nationality: overrides.nationality ?? 'american',
    overallRating: overrides.overallRating ?? 285,
    rule5EligibleAfterSeason: overrides.rule5EligibleAfterSeason ?? 0,
    serviceTimeDays: overrides.serviceTimeDays ?? 0,
    optionYearsUsed: overrides.optionYearsUsed ?? 0,
    isOutOfOptions: overrides.isOutOfOptions ?? false,
    minorLeagueLevel: overrides.minorLeagueLevel ?? 'AAA',
    ceiling: overrides.ceiling ?? 360,
    floor: overrides.floor ?? 235,
    developmentProgram: overrides.developmentProgram ?? 'tools',
    developmentTrajectory: overrides.developmentTrajectory ?? 'ahead_of_curve',
    extensionHistory: overrides.extensionHistory ?? [],
    personalityTraits: overrides.personalityTraits ?? [],
    potentialRating: overrides.potentialRating ?? 355,
  };
}

function makeFarm(): GeneratedPlayer[] {
  return [
    makeProspect({ id: 'ready-cf', firstName: 'Victor', lastName: 'Lane', age: 23, position: 'CF', overallRating: 318, ceiling: 385, minorLeagueLevel: 'AAA', rosterStatus: 'AAA' }),
    makeProspect({ id: 'ceiling-sp', firstName: 'Marco', lastName: 'Silva', age: 20, position: 'SP', overallRating: 274, ceiling: 420, potentialRating: 410, minorLeagueLevel: 'AA', rosterStatus: 'AA' }),
    makeProspect({ id: 'aaa-bat', firstName: 'Jordan', lastName: 'Price', age: 22, position: '1B', overallRating: 304, ceiling: 360, hitterAttributes: { contact: 285, power: 365, eye: 255, speed: 150, defense: 180, durability: 300 } }),
    makeProspect({ id: 'aa-short', firstName: 'Noah', lastName: 'Pierce', age: 21, position: 'SS', overallRating: 292, ceiling: 372, minorLeagueLevel: 'AA', rosterStatus: 'AA' }),
    makeProspect({ id: 'raw-rf', firstName: 'Luis', lastName: 'Cruz', age: 18, position: 'RF', overallRating: 228, ceiling: 390, minorLeagueLevel: 'ROOKIE', rosterStatus: 'ROOKIE', developmentProgram: 'power' }),
    makeProspect({ id: 'a-ball-sp', firstName: 'Dylan', lastName: 'Hart', age: 19, position: 'SP', overallRating: 242, ceiling: 365, minorLeagueLevel: 'A', rosterStatus: 'A' }),
  ];
}

describe('profileTopProspects', () => {
  it('sorts top prospects by ceiling rather than current rating', () => {
    const prospects = profileTopProspects(createGameRNG(41), makeFarm(), 5);

    expect(prospects[0]?.playerId).toBe('ceiling-sp');
    expect(prospects[1]?.playerId).toBe('raw-rf');
  });

  it('classifies readiness from age, level, and current rating', () => {
    const prospects = profileTopProspects(createGameRNG(42), makeFarm(), 5);

    expect(prospects.find((player) => player.playerId === 'ready-cf')?.readiness).toBe('ready_now');
    expect(prospects.find((player) => player.playerId === 'aa-short')?.readiness).toBe('one_year');
    expect(prospects.find((player) => player.playerId === 'a-ball-sp')?.readiness).toBe('developing');
    expect(prospects.find((player) => player.playerId === 'raw-rf')?.readiness).toBe('raw');
  });
});

describe('assessPipelineHealth', () => {
  it('grades a strong system as A when it has at least three ready or near-ready prospects', () => {
    const pipeline = assessPipelineHealth(makeFarm());

    expect(pipeline.grade).toBe('A');
    expect(pipeline.readyCount).toBeGreaterThanOrEqual(2);
  });

  it('grades a barren system as F when there is no near-term help', () => {
    const barren = assessPipelineHealth([
      makeProspect({ id: 'raw-1', age: 18, overallRating: 215, ceiling: 310, minorLeagueLevel: 'ROOKIE', rosterStatus: 'ROOKIE' }),
      makeProspect({ id: 'raw-2', age: 19, overallRating: 220, ceiling: 320, minorLeagueLevel: 'A', rosterStatus: 'A', position: 'SP' }),
    ]);

    expect(barren.grade).toBe('F');
  });
});

describe('assessFarmSystem', () => {
  it('integrates breakout-engine probabilities into top prospect profiles', () => {
    const assessment = assessFarmSystem(createGameRNG(43), makeFarm(), [makeCoach()]);

    expect(assessment.topProspects[0]?.breakoutProbability).toBeGreaterThanOrEqual(0);
    expect(assessment.topProspects[0]?.breakoutProbability).toBeLessThanOrEqual(100);
  });

  it('can differentiate the closest-to-MLB prospect from the highest-ceiling prospect', () => {
    const assessment = assessFarmSystem(createGameRNG(44), makeFarm(), [makeCoach()]);

    expect(assessment.closestToMLB?.playerId).toBe('ready-cf');
    expect(assessment.highestCeiling?.playerId).toBe('ceiling-sp');
  });

  it('always exposes all three development philosophy options', () => {
    const assessment = assessFarmSystem(createGameRNG(45), makeFarm(), [makeCoach()]);

    expect(assessment.developmentOptions.map((option) => option.id)).toEqual([
      'aggressive',
      'patient',
      'balanced',
    ]);
  });

  it('is deterministic for the same seed, prospects, and coaches', () => {
    const prospects = makeFarm();
    const coaches = [makeCoach()];

    expect(assessFarmSystem(createGameRNG(46), prospects, coaches)).toEqual(
      assessFarmSystem(createGameRNG(46), prospects, coaches),
    );
  });
});
