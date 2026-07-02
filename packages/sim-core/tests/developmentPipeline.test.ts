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
    teamId: 'nym',
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
    const staff = new Map([['nym', generateCoachingStaff(new GameRNG(21), 'nym')]]);
    const state = createMinorLeagueState(['nym'], 1);

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
    const strongStaff = new Map([['nym', generateCoachingStaff(new GameRNG(31), 'nym')]]);
    const weakStaff = new Map([['nym', generateCoachingStaff(new GameRNG(32), 'nym').map((coach) => ({
      ...coach,
      teachingAbility: 0.35,
      developmentBonus: 0.01,
      personalityFit: 0.4,
    }))]]);
    const baselineState = createMinorLeagueState(['nym'], 1);

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

  it('raises monthly progress and lowers bust risk for active mentorship support', () => {
    const player = makePlayer({});
    const staff = new Map([['nym', generateCoachingStaff(new GameRNG(34), 'nym')]]);
    const baselineState = createMinorLeagueState(['nym'], 1);
    const mentorshipBonuses = new Map([[player.id, 0.16]]);

    const withoutMentor = runMonthlyDevelopmentCheckpoint(
      new GameRNG(35),
      1,
      4,
      [player],
      staff,
      baselineState,
    );
    const withMentor = runMonthlyDevelopmentCheckpoint(
      new GameRNG(35),
      1,
      4,
      [player],
      staff,
      baselineState,
      mentorshipBonuses,
    );

    const baselineLedger = withoutMentor.state.developmentLedger[0]!;
    const mentoredLedger = withMentor.state.developmentLedger[0]!;
    expect(mentoredLedger.progressScore).toBeGreaterThan(baselineLedger.progressScore);
    expect(mentoredLedger.breakoutProbability).toBeGreaterThan(baselineLedger.breakoutProbability);
    expect(mentoredLedger.bustRisk).toBeLessThan(baselineLedger.bustRisk);
  });
});

describe('reconcileDevelopmentPipeline', () => {
  it('keeps annual reconciliation within the player potential band', () => {
    const player = makePlayer({ ceiling: 245, floor: 205, overallRating: 220 });
    const staff = new Map([['nym', generateCoachingStaff(new GameRNG(41), 'nym')]]);
    const seededState = runMonthlyDevelopmentCheckpoint(
      new GameRNG(42),
      1,
      1,
      [player],
      staff,
      createMinorLeagueState(['nym'], 1),
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

  it('turns mentor-supported monthly progress into higher annual rating movement', () => {
    const player = makePlayer({ ceiling: 270, floor: 205, overallRating: 220 });
    const staff = new Map([['nym', generateCoachingStaff(new GameRNG(44), 'nym')]]);
    const mentorshipBonuses = new Map([[player.id, 0.2]]);
    let baselineState = createMinorLeagueState(['nym'], 1);
    let mentoredState = createMinorLeagueState(['nym'], 1);

    for (const month of [1, 2, 3]) {
      baselineState = runMonthlyDevelopmentCheckpoint(
        new GameRNG(50 + month),
        1,
        month,
        [player],
        staff,
        baselineState,
      ).state;
      mentoredState = runMonthlyDevelopmentCheckpoint(
        new GameRNG(50 + month),
        1,
        month,
        [player],
        staff,
        mentoredState,
        mentorshipBonuses,
      ).state;
    }

    const baseline = reconcileDevelopmentPipeline(
      new GameRNG(61),
      [player],
      staff,
      baselineState,
    );
    const mentored = reconcileDevelopmentPipeline(
      new GameRNG(61),
      [player],
      staff,
      mentoredState,
    );

    expect(mentored[0]?.overallRating).toBeGreaterThan(baseline[0]?.overallRating ?? 0);
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
    const strongStaff = generateCoachingStaff(new GameRNG(51), 'nym');
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
