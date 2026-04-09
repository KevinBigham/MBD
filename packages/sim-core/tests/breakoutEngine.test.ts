import { describe, expect, it } from 'vitest';
import { GameRNG, type Coach, type GeneratedPlayer } from '../src/index.js';
import {
  calculateBreakoutProbability,
  classifyDevelopmentTrajectory,
  detectRegressionRisk,
  generateBreakoutScoutReport,
  predictProspectCeiling,
  type BreakoutAssessment,
  type BreakoutDevelopmentTrajectory,
} from '../src/player/breakoutEngine.js';

function makePlayer(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  const position = overrides.position ?? 'CF';
  const isPitcher = position === 'SP' || position === 'RP' || position === 'CL';

  return {
    id: 'player-1',
    firstName: 'Eli',
    lastName: 'Harper',
    age: 21,
    position,
    hitterAttributes: {
      contact: 305,
      power: 295,
      eye: 280,
      speed: 330,
      defense: 310,
      durability: 290,
    },
    pitcherAttributes: isPitcher ? {
      stuff: 320,
      control: 295,
      stamina: 305,
      velocity: 315,
      movement: 300,
    } : null,
    personality: {
      workEthic: 78,
      mentalToughness: 70,
      leadership: 55,
      competitiveness: 82,
    },
    contract: {
      years: 3,
      annualSalary: 1.2,
      totalValue: 3.6,
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
    nationality: 'american',
    overallRating: 278,
    rule5EligibleAfterSeason: 0,
    serviceTimeDays: 0,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: 'AA',
    ceiling: 370,
    floor: 230,
    developmentProgram: 'tools',
    developmentTrajectory: 'ahead_of_curve',
    extensionHistory: [],
    personalityTraits: [],
    potentialRating: 360,
    ...overrides,
  };
}

function makeCoach(overrides: Partial<Coach> = {}): Coach {
  return {
    id: overrides.id ?? 'coach-1',
    firstName: 'Tom',
    lastName: 'Bennett',
    role: overrides.role ?? 'farm_director',
    specialty: overrides.specialty ?? 'mlb_prep',
    teachingAbility: overrides.teachingAbility ?? 0.84,
    developmentBonus: overrides.developmentBonus ?? 0.22,
    personalityFit: overrides.personalityFit ?? 0.8,
    experienceYears: overrides.experienceYears ?? 9,
    contractYears: overrides.contractYears ?? 2,
    annualSalary: overrides.annualSalary ?? 1.4,
    teamId: overrides.teamId ?? 'nym',
  };
}

function makeAssessment(
  overrides: Partial<BreakoutAssessment> = {},
): BreakoutAssessment {
  return {
    playerId: 'player-1',
    probability: 72,
    factors: [{
      name: 'Rating velocity',
      weight: 30,
      contribution: 24,
      description: 'Recent gains are accelerating.',
    }],
    riskLevel: 'high',
    narrativeHook: 'Recent growth points to a possible breakout.',
    ...overrides,
  };
}

describe('calculateBreakoutProbability', () => {
  it('returns a high probability for a young prospect with strong recent gains', () => {
    const player = makePlayer({ age: 20, overallRating: 272, ceiling: 390 });

    const assessment = calculateBreakoutProbability(player, [
      { prevRating: 220, currRating: 242 },
      { prevRating: 242, currRating: 266 },
      { prevRating: 266, currRating: 272 },
    ], [makeCoach()]);

    expect(assessment.probability).toBeGreaterThanOrEqual(65);
    expect(assessment.riskLevel).toMatch(/high|imminent/);
  });

  it('returns zero probability for decline-phase veterans', () => {
    const veteran = makePlayer({
      age: 35,
      developmentPhase: 'Decline',
      overallRating: 305,
      rosterStatus: 'MLB',
      minorLeagueLevel: null,
    });

    const assessment = calculateBreakoutProbability(veteran, [
      { prevRating: 312, currRating: 305 },
    ], [makeCoach()]);

    expect(assessment.probability).toBe(0);
    expect(assessment.riskLevel).toBe('low');
  });

  it('returns zero probability for retired players', () => {
    const retired = makePlayer({
      age: 39,
      developmentPhase: 'Retirement',
      overallRating: 250,
      rosterStatus: 'MLB',
      minorLeagueLevel: null,
    });

    const assessment = calculateBreakoutProbability(retired, [
      { prevRating: 252, currRating: 250 },
    ], [makeCoach()]);

    expect(assessment.probability).toBe(0);
  });

  it('applies a stronger scarcity bonus for catchers than designated hitters', () => {
    const catcher = makePlayer({ position: 'C', hitterAttributes: { contact: 290, power: 250, eye: 270, speed: 180, defense: 340, durability: 300 } });
    const dh = makePlayer({ position: 'DH', hitterAttributes: { contact: 290, power: 250, eye: 270, speed: 180, defense: 140, durability: 300 } });

    const catcherAssessment = calculateBreakoutProbability(catcher, [
      { prevRating: 250, currRating: 268 },
    ], [makeCoach()]);
    const dhAssessment = calculateBreakoutProbability(dh, [
      { prevRating: 250, currRating: 268 },
    ], [makeCoach()]);

    expect(catcherAssessment.probability).toBeGreaterThan(dhAssessment.probability);
  });

  it('applies a stronger scarcity bonus for center fielders than designated hitters', () => {
    const centerFielder = makePlayer({ position: 'CF' });
    const dh = makePlayer({ position: 'DH', hitterAttributes: { contact: 305, power: 295, eye: 280, speed: 180, defense: 120, durability: 290 } });

    const cfAssessment = calculateBreakoutProbability(centerFielder, [
      { prevRating: 255, currRating: 274 },
    ], [makeCoach()]);
    const dhAssessment = calculateBreakoutProbability(dh, [
      { prevRating: 255, currRating: 274 },
    ], [makeCoach()]);

    expect(cfAssessment.probability).toBeGreaterThan(dhAssessment.probability);
  });

  it('improves probability with stronger coaching support', () => {
    const player = makePlayer();
    const strongStaff = [makeCoach()];
    const weakStaff = [makeCoach({
      teachingAbility: 0.35,
      developmentBonus: 0.02,
      personalityFit: 0.45,
    })];

    const strongAssessment = calculateBreakoutProbability(player, [
      { prevRating: 240, currRating: 260 },
    ], strongStaff);
    const weakAssessment = calculateBreakoutProbability(player, [
      { prevRating: 240, currRating: 260 },
    ], weakStaff);

    expect(strongAssessment.probability).toBeGreaterThan(weakAssessment.probability);
  });

  it('sorts factors by contribution descending', () => {
    const assessment = calculateBreakoutProbability(makePlayer(), [
      { prevRating: 235, currRating: 258 },
      { prevRating: 258, currRating: 278 },
    ], [makeCoach()]);

    const contributions = assessment.factors.map((factor) => factor.contribution);
    expect(contributions).toEqual([...contributions].sort((left, right) => right - left));
  });

  it('always includes all configured factor names', () => {
    const assessment = calculateBreakoutProbability(makePlayer(), [
      { prevRating: 245, currRating: 269 },
    ], [makeCoach()]);

    expect(assessment.factors.map((factor) => factor.name)).toEqual([
      'Rating velocity',
      'Age-phase alignment',
      'Ceiling gap',
      'Coaching quality',
      'Positional scarcity',
    ]);
  });

  it('produces a narrative hook that mentions the player and a growth signal', () => {
    const player = makePlayer();
    const assessment = calculateBreakoutProbability(player, [
      { prevRating: 240, currRating: 266 },
    ], [makeCoach()]);

    expect(assessment.narrativeHook).toContain(`${player.firstName} ${player.lastName}`);
    expect(assessment.narrativeHook.toLowerCase()).toMatch(/breakout|growth|surge|trend/);
  });

  it('handles empty history by returning a bounded probability', () => {
    const assessment = calculateBreakoutProbability(makePlayer(), [], [makeCoach()]);

    expect(assessment.probability).toBeGreaterThanOrEqual(0);
    expect(assessment.probability).toBeLessThanOrEqual(100);
  });

  it('handles a single-season history entry', () => {
    const assessment = calculateBreakoutProbability(makePlayer(), [
      { prevRating: 248, currRating: 257 },
    ], [makeCoach()]);

    expect(assessment.probability).toBeGreaterThan(0);
  });

  it('rates an 18-year-old prospect above an otherwise identical 38-year-old', () => {
    const teenager = makePlayer({ age: 18, overallRating: 250, ceiling: 380 });
    const veteran = makePlayer({
      age: 38,
      overallRating: 250,
      ceiling: 380,
      developmentPhase: 'Prime',
      rosterStatus: 'MLB',
      minorLeagueLevel: null,
    });

    const teenAssessment = calculateBreakoutProbability(teenager, [
      { prevRating: 230, currRating: 250 },
    ], [makeCoach()]);
    const veteranAssessment = calculateBreakoutProbability(veteran, [
      { prevRating: 230, currRating: 250 },
    ], [makeCoach()]);

    expect(teenAssessment.probability).toBeGreaterThan(veteranAssessment.probability);
  });

  it('keeps probability within 0-100 for extreme positive inputs', () => {
    const assessment = calculateBreakoutProbability(makePlayer({
      age: 18,
      overallRating: 200,
      ceiling: 430,
      position: 'C',
    }), [
      { prevRating: 150, currRating: 200 },
      { prevRating: 200, currRating: 250 },
      { prevRating: 250, currRating: 310 },
    ], [makeCoach()]);

    expect(assessment.probability).toBeLessThanOrEqual(100);
  });

  it('keeps probability within 0-100 for extreme negative inputs', () => {
    const assessment = calculateBreakoutProbability(makePlayer({
      age: 34,
      overallRating: 330,
      ceiling: 331,
      developmentPhase: 'Prime',
      position: 'DH',
      rosterStatus: 'MLB',
      minorLeagueLevel: null,
    }), [
      { prevRating: 345, currRating: 338 },
      { prevRating: 338, currRating: 330 },
    ], [makeCoach({
      teachingAbility: 0.3,
      developmentBonus: 0,
      personalityFit: 0.3,
    })]);

    expect(assessment.probability).toBeGreaterThanOrEqual(0);
  });
});

describe('classifyDevelopmentTrajectory', () => {
  it.each<{
    name: string;
    deltas: number[];
    expected: BreakoutDevelopmentTrajectory;
  }>([
    { name: 'rocket', deltas: [18, 24, 29], expected: 'rocket' },
    { name: 'steady climb', deltas: [5, 8, 7], expected: 'steady_climb' },
    { name: 'plateau', deltas: [1, 0, -1], expected: 'plateau' },
    { name: 'stalled', deltas: [4, -3, 2], expected: 'stalled' },
    { name: 'declining', deltas: [-6, -8, -10], expected: 'declining' },
    { name: 'volatile', deltas: [34, -36, 39, -33], expected: 'volatile' },
  ])('classifies $name history', ({ deltas, expected }) => {
    expect(classifyDevelopmentTrajectory(deltas)).toBe(expected);
  });

  it('defaults to stalled when there is no history', () => {
    expect(classifyDevelopmentTrajectory([])).toBe('stalled');
  });

  it('treats tiny mixed movement as stalled instead of declining', () => {
    expect(classifyDevelopmentTrajectory([2, -1, 2, -2])).toBe('stalled');
  });
});

describe('detectRegressionRisk', () => {
  it('returns stable for consistently positive deltas', () => {
    const assessment = detectRegressionRisk(makePlayer(), [3, 5, 7, 8]);

    expect(assessment.riskLevel).toBe('stable');
    expect(assessment.warningSignals).toHaveLength(0);
  });

  it('returns declining after three consecutive negative deltas', () => {
    const assessment = detectRegressionRisk(makePlayer(), [-4, -6, -9, -12]);

    expect(assessment.riskLevel).toBe('declining');
    expect(assessment.warningSignals.join(' ')).toMatch(/consecutive|decline/i);
  });

  it('marks plateau sequences as concerning', () => {
    const assessment = detectRegressionRisk(makePlayer(), [0, 1, -1, 0]);

    expect(assessment.riskLevel).toBe('concerning');
    expect(assessment.warningSignals.join(' ')).toMatch(/plateau/i);
  });

  it('marks alternating major swings as concerning volatility', () => {
    const assessment = detectRegressionRisk(makePlayer(), [35, -34, 36, -37]);

    expect(assessment.riskLevel).toBe('concerning');
    expect(assessment.warningSignals.join(' ')).toMatch(/volatile/i);
  });

  it('respects an explicit player floor when projecting the floor', () => {
    const assessment = detectRegressionRisk(makePlayer({ floor: 245, overallRating: 280 }), [-6, -7, -8]);

    expect(assessment.projectedFloor).toBeGreaterThanOrEqual(245);
  });

  it('derives a zero decline rate for stable growth', () => {
    const assessment = detectRegressionRisk(makePlayer(), [4, 3, 5]);

    expect(assessment.declineRate).toBe(0);
  });
});

describe('predictProspectCeiling', () => {
  it('is deterministic for the same RNG seed', () => {
    const player = makePlayer();

    const first = predictProspectCeiling(new GameRNG(44), player);
    const second = predictProspectCeiling(new GameRNG(44), player);

    expect(first).toEqual(second);
  });

  it('projects a higher peak for an ahead-of-curve prospect than a bust-risk profile', () => {
    const fastTrack = makePlayer({ developmentTrajectory: 'ahead_of_curve', ceiling: 390 });
    const bustRisk = makePlayer({ developmentTrajectory: 'bust_risk', ceiling: 390 });

    const fastProjection = predictProspectCeiling(new GameRNG(11), fastTrack);
    const bustProjection = predictProspectCeiling(new GameRNG(11), bustRisk);

    expect(fastProjection.projectedPeak).toBeGreaterThan(bustProjection.projectedPeak);
  });

  it('projects longer timelines for younger prospects than prime veterans', () => {
    const prospect = makePlayer({ age: 19, developmentPhase: 'Prospect' });
    const veteran = makePlayer({
      age: 30,
      developmentPhase: 'Prime',
      rosterStatus: 'MLB',
      minorLeagueLevel: null,
    });

    const prospectProjection = predictProspectCeiling(new GameRNG(19), prospect);
    const veteranProjection = predictProspectCeiling(new GameRNG(19), veteran);

    expect(prospectProjection.timelineSeasons).toBeGreaterThan(veteranProjection.timelineSeasons);
  });

  it('uses the archetype engine for the comparison archetype', () => {
    const projection = predictProspectCeiling(new GameRNG(31), makePlayer({
      hitterAttributes: {
        contact: 330,
        power: 410,
        eye: 250,
        speed: 210,
        defense: 220,
        durability: 290,
      },
    }));

    expect(projection.comparisonArchetype.length).toBeGreaterThan(0);
  });

  it.each([
    { age: 19, expected: 'high' },
    { age: 24, expected: 'medium' },
    { age: 31, expected: 'low' },
  ])('assigns $expected confidence around age $age', ({ age, expected }) => {
    const projection = predictProspectCeiling(new GameRNG(52), makePlayer({
      age,
      developmentPhase: age >= 30 ? 'Prime' : 'Prospect',
      rosterStatus: age >= 30 ? 'MLB' : 'AA',
      minorLeagueLevel: age >= 30 ? null : 'AA',
    }));

    expect(projection.confidenceLevel).toBe(expected);
  });
});

describe('generateBreakoutScoutReport', () => {
  it('is deterministic for the same seed and assessment', () => {
    const player = makePlayer();
    const assessment = makeAssessment();

    const first = generateBreakoutScoutReport(new GameRNG(88), player, assessment);
    const second = generateBreakoutScoutReport(new GameRNG(88), player, assessment);

    expect(first).toBe(second);
  });

  it.each([
    { riskLevel: 'low' as const, matcher: /patience|monitor|early/i },
    { riskLevel: 'moderate' as const, matcher: /watch|trend|tracking/i },
    { riskLevel: 'high' as const, matcher: /surge|push|real/i },
    { riskLevel: 'imminent' as const, matcher: /breakout|arriving|ready/i },
  ])('tailors language for $riskLevel risk', ({ riskLevel, matcher }) => {
    const report = generateBreakoutScoutReport(
      new GameRNG(91),
      makePlayer(),
      makeAssessment({ riskLevel, probability: riskLevel === 'low' ? 18 : riskLevel === 'moderate' ? 46 : riskLevel === 'high' ? 71 : 88 }),
    );

    expect(report).toMatch(matcher);
  });

  it('mentions the top factor label', () => {
    const report = generateBreakoutScoutReport(
      new GameRNG(33),
      makePlayer(),
      makeAssessment({
        factors: [{
          name: 'Ceiling gap',
          weight: 20,
          contribution: 16,
          description: 'Plenty of projection remains.',
        }],
      }),
    );

    expect(report).toContain('Ceiling gap');
  });

  it('includes the breakout probability percentage', () => {
    const report = generateBreakoutScoutReport(
      new GameRNG(72),
      makePlayer(),
      makeAssessment({ probability: 83 }),
    );

    expect(report).toContain('83%');
  });
});

describe('top-level exports', () => {
  it('re-exports breakout engine APIs from sim-core index', async () => {
    const simCore = await import('../src/index.js');

    expect(typeof simCore.calculateBreakoutProbability).toBe('function');
    expect(typeof simCore.detectRegressionRisk).toBe('function');
    expect(typeof simCore.predictProspectCeiling).toBe('function');
    expect(typeof simCore.classifyDevelopmentTrajectory).toBe('function');
    expect(typeof simCore.generateBreakoutScoutReport).toBe('function');
  });
});
