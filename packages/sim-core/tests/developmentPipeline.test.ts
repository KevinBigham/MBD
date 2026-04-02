import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  createMinorLeagueState,
  generateCoachingStaff,
  getBreakoutProbability,
  getPositionConversionTargets,
  initializePlayerDevelopmentProfile,
  reconcileDevelopmentPipeline,
  runMonthlyDevelopmentCheckpoint,
  type GeneratedPlayer,
} from '../src/index.js';

function makePlayer(overrides: Partial<GeneratedPlayer>): GeneratedPlayer {
  return {
    id: 'player-1',
    firstName: 'Marco',
    lastName: 'Prospect',
    age: 20,
    position: 'SS',
    hitterAttributes: {
      contact: 225,
      power: 180,
      eye: 205,
      speed: 215,
      defense: 170,
      durability: 210,
    },
    pitcherAttributes: null,
    personality: {
      workEthic: 72,
      mentalToughness: 60,
      leadership: 41,
      competitiveness: 69,
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
    teamId: 'nyy',
    nationality: 'latin',
    overallRating: 220,
    potentialRating: 310,
    ceiling: 320,
    floor: 195,
    developmentProgram: 'refinement',
    developmentTrajectory: 'on_track',
    extensionHistory: [],
    rule5EligibleAfterSeason: 4,
    serviceTimeDays: 0,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: 'AA',
    ...overrides,
  };
}

describe('initializePlayerDevelopmentProfile', () => {
  it('assigns a ceiling and floor around the current overall', () => {
    const player = makePlayer({
      ceiling: 0,
      floor: 0,
      developmentProgram: 'tools',
    });
    const initialized = initializePlayerDevelopmentProfile(new GameRNG(14), player);

    expect(initialized.ceiling).toBeGreaterThan(initialized.overallRating);
    expect(initialized.floor).toBeLessThanOrEqual(initialized.overallRating);
    expect(initialized.developmentProgram).toBe('refinement');
  });
});

describe('runMonthlyDevelopmentCheckpoint', () => {
  it('records monthly development reports and processed months', () => {
    const player = makePlayer({});
    const staff = new Map([['nyy', generateCoachingStaff(new GameRNG(21), 'nyy')]]);
    const state = createMinorLeagueState(['nyy'], 1);

    const result = runMonthlyDevelopmentCheckpoint(
      new GameRNG(22),
      1,
      2,
      [player],
      staff,
      state,
    );

    expect(result.state.processedDevelopmentMonths).toContain(2);
    expect(result.state.developmentLedger).toHaveLength(1);
    expect(result.state.developmentReports).toHaveLength(1);
    expect(result.players[0]?.developmentTrajectory).not.toBe('on_track');
  });

  it('produces stronger progress under better coaching', () => {
    const player = makePlayer({});
    const strongStaff = new Map([['nyy', generateCoachingStaff(new GameRNG(31), 'nyy')]]);
    const weakStaff = new Map([['nyy', generateCoachingStaff(new GameRNG(32), 'nyy').map((coach) => ({
      ...coach,
      teachingAbility: 0.35,
      developmentBonus: 0.01,
      personalityFit: 0.4,
    }))]]);
    const baselineState = createMinorLeagueState(['nyy'], 1);

    const strong = runMonthlyDevelopmentCheckpoint(
      new GameRNG(33),
      1,
      3,
      [player],
      strongStaff,
      baselineState,
    );
    const weak = runMonthlyDevelopmentCheckpoint(
      new GameRNG(33),
      1,
      3,
      [player],
      weakStaff,
      baselineState,
    );

    expect(strong.state.developmentLedger[0]?.progressScore).toBeGreaterThan(
      weak.state.developmentLedger[0]?.progressScore ?? 0,
    );
  });
});

describe('reconcileDevelopmentPipeline', () => {
  it('keeps annual reconciliation within the player potential band', () => {
    const player = makePlayer({ ceiling: 245, floor: 205, overallRating: 220 });
    const staff = new Map([['nyy', generateCoachingStaff(new GameRNG(41), 'nyy')]]);
    const seededState = runMonthlyDevelopmentCheckpoint(
      new GameRNG(42),
      1,
      1,
      [player],
      staff,
      createMinorLeagueState(['nyy'], 1),
    ).state;

    const reconciled = reconcileDevelopmentPipeline(
      new GameRNG(43),
      [player],
      staff,
      seededState,
    );

    expect(reconciled[0]?.overallRating).toBeGreaterThanOrEqual(205);
    expect(reconciled[0]?.overallRating).toBeLessThanOrEqual(245);
  });
});

describe('getPositionConversionTargets', () => {
  it('flags a glove-light shortstop for an infield move', () => {
    const player = makePlayer({
      hitterAttributes: {
        contact: 225,
        power: 180,
        eye: 205,
        speed: 215,
        defense: 120,
        durability: 210,
      },
    });

    expect(getPositionConversionTargets(player)).toContain('2B');
  });
});

describe('getBreakoutProbability', () => {
  it('improves breakout odds with stronger coaching support', () => {
    const player = makePlayer({});
    const strongStaff = generateCoachingStaff(new GameRNG(51), 'nyy');
    const weakStaff = strongStaff.map((coach) => ({
      ...coach,
      teachingAbility: 0.3,
      developmentBonus: 0,
      personalityFit: 0.35,
    }));

    expect(getBreakoutProbability(player, strongStaff, 'AA')).toBeGreaterThan(
      getBreakoutProbability(player, weakStaff, 'AA'),
    );
  });
});
