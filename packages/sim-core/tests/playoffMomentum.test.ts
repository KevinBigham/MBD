import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/index.js';
import {
  buildPlayoffGameModifiers,
  calculateHomeFieldAdvantage,
  calculateMustWinPressure,
  calculatePitcherFatigue,
  calculateStreakMomentum,
  generateMomentumNarrative,
  type GameModifiers,
  type PlayoffGameContext,
} from '../src/sim/playoffMomentum.js';

function makeContext(overrides: Partial<PlayoffGameContext> = {}): PlayoffGameContext {
  return {
    homeTeamWins: 98,
    homeTeamLosses: 64,
    awayTeamWins: 90,
    awayTeamLosses: 72,
    seriesHomeWins: 2,
    seriesAwayWins: 1,
    homeStarterGamesInSeries: 1,
    awayStarterGamesInSeries: 1,
    homeStarterDaysSinceStart: 5,
    awayStarterDaysSinceStart: 5,
    homeStarterStamina: 320,
    awayStarterStamina: 320,
    homeRecentResults: [true, true, true],
    awayRecentResults: [false, false, false],
    isElimination: false,
    round: 'DS',
    ...overrides,
  };
}

function makeModifiers(overrides: Partial<GameModifiers> = {}): GameModifiers {
  return {
    homeOffenseModifier: overrides.homeOffenseModifier ?? 0.05,
    awayOffenseModifier: overrides.awayOffenseModifier ?? -0.03,
    homePitchingModifier: overrides.homePitchingModifier ?? -0.01,
    awayPitchingModifier: overrides.awayPitchingModifier ?? -0.06,
    varianceMultiplier: overrides.varianceMultiplier ?? 1.15,
    momentumNarrative: overrides.momentumNarrative ?? 'Home field and fatigue are both active.',
  };
}

describe('calculateHomeFieldAdvantage', () => {
  it('returns a positive edge for the home club', () => {
    expect(calculateHomeFieldAdvantage(95, 67, true)).toBeGreaterThan(0);
  });

  it('gives better regular-season teams a larger home edge', () => {
    const elite = calculateHomeFieldAdvantage(105, 57, true);
    const average = calculateHomeFieldAdvantage(81, 81, true);

    expect(elite).toBeGreaterThan(average);
  });

  it('keeps the playoff base edge above the regular-season base edge', () => {
    const playoff = calculateHomeFieldAdvantage(90, 72, true);
    const regular = calculateHomeFieldAdvantage(90, 72, false);

    expect(playoff).toBeGreaterThan(regular);
  });

  it('keeps the value in a narrow bounded range', () => {
    const value = calculateHomeFieldAdvantage(120, 42, true);

    expect(value).toBeGreaterThanOrEqual(0.02);
    expect(value).toBeLessThanOrEqual(0.06);
  });
});

describe('calculatePitcherFatigue', () => {
  it('returns no fatigue penalty on a first series start with full rest', () => {
    const result = calculatePitcherFatigue(new GameRNG(11), 1, 5, 320);

    expect(result.modifier).toBe(0);
    expect(result.isTired).toBe(false);
  });

  it('applies the second-start penalty', () => {
    const result = calculatePitcherFatigue(new GameRNG(12), 2, 5, 320);

    expect(result.modifier).toBe(-0.03);
  });

  it('applies the third-start penalty', () => {
    const result = calculatePitcherFatigue(new GameRNG(13), 3, 5, 320);

    expect(result.modifier).toBe(-0.08);
  });

  it('stacks a short-rest penalty on top of game-count fatigue', () => {
    const result = calculatePitcherFatigue(new GameRNG(14), 2, 3, 320);

    expect(result.modifier).toBe(-0.08);
  });

  it('reduces the penalty by 40 percent for high-stamina pitchers', () => {
    const lowStamina = calculatePitcherFatigue(new GameRNG(15), 3, 3, 320);
    const highStamina = calculatePitcherFatigue(new GameRNG(15), 3, 3, 420);

    expect(highStamina.modifier).toBeCloseTo(lowStamina.modifier * 0.6, 5);
  });

  it('does not reduce penalties for low-stamina pitchers', () => {
    const result = calculatePitcherFatigue(new GameRNG(16), 3, 3, 0);

    expect(result.modifier).toBe(-0.13);
  });

  it('is deterministic for the same seed and input', () => {
    const first = calculatePitcherFatigue(new GameRNG(17), 2, 4, 310);
    const second = calculatePitcherFatigue(new GameRNG(17), 2, 4, 310);

    expect(first).toEqual(second);
  });
});

describe('calculateMustWinPressure', () => {
  it('returns no pressure outside elimination games', () => {
    const pressure = calculateMustWinPressure(1, 2, false);

    expect(pressure.offenseModifier).toBe(0);
    expect(pressure.varianceBoost).toBe(0);
  });

  it('adds offense and variance for elimination games', () => {
    const pressure = calculateMustWinPressure(1, 2, true);

    expect(pressure.offenseModifier).toBeGreaterThan(0);
    expect(pressure.varianceBoost).toBeGreaterThan(0);
  });

  it('pushes down 3-0 teams to the maximum pressure tier', () => {
    const maxPressure = calculateMustWinPressure(0, 3, true);
    const lighterPressure = calculateMustWinPressure(1, 2, true);

    expect(maxPressure.offenseModifier).toBeGreaterThan(lighterPressure.offenseModifier);
    expect(maxPressure.varianceBoost).toBeGreaterThan(lighterPressure.varianceBoost);
  });

  it('does not create pressure for a club that is not trailing', () => {
    const pressure = calculateMustWinPressure(3, 0, true);

    expect(pressure.offenseModifier).toBe(0);
    expect(pressure.varianceBoost).toBe(0);
  });
});

describe('calculateStreakMomentum', () => {
  it('returns positive momentum for a three-game winning streak', () => {
    expect(calculateStreakMomentum([true, true, true])).toBe(0.02);
  });

  it('increases for each extra win in the streak', () => {
    expect(calculateStreakMomentum([true, true, true, true]))
      .toBeGreaterThan(calculateStreakMomentum([true, true, true]));
  });

  it('caps positive streak momentum at the configured maximum', () => {
    expect(calculateStreakMomentum([true, true, true, true, true, true, true])).toBe(0.04);
  });

  it('mirrors losing streaks as negative momentum', () => {
    expect(calculateStreakMomentum([false, false, false])).toBe(-0.02);
  });

  it('uses only the current contiguous streak', () => {
    expect(calculateStreakMomentum([false, false, true, true])).toBe(0);
  });

  it('returns zero for short streaks', () => {
    expect(calculateStreakMomentum([true, true])).toBe(0);
  });
});

describe('buildPlayoffGameModifiers', () => {
  it('builds a positive home offense edge for the stronger home club', () => {
    const modifiers = buildPlayoffGameModifiers(makeContext());

    expect(modifiers.homeOffenseModifier).toBeGreaterThan(modifiers.awayOffenseModifier);
  });

  it('scales the home-field edge up by round', () => {
    const divisionSeries = buildPlayoffGameModifiers(makeContext({ round: 'DS' }));
    const worldSeries = buildPlayoffGameModifiers(makeContext({ round: 'WS' }));

    expect(worldSeries.homeOffenseModifier).toBeGreaterThan(divisionSeries.homeOffenseModifier);
  });

  it('applies fatigue penalties to pitching modifiers', () => {
    const modifiers = buildPlayoffGameModifiers(makeContext({
      homeStarterGamesInSeries: 3,
      homeStarterDaysSinceStart: 3,
    }));

    expect(modifiers.homePitchingModifier).toBeLessThan(0);
  });

  it('boosts the home offense in a home elimination spot', () => {
    const neutral = buildPlayoffGameModifiers(makeContext({
      seriesHomeWins: 1,
      seriesAwayWins: 2,
      isElimination: false,
    }));
    const pressured = buildPlayoffGameModifiers(makeContext({
      seriesHomeWins: 1,
      seriesAwayWins: 2,
      isElimination: true,
    }));

    expect(pressured.homeOffenseModifier).toBeGreaterThan(neutral.homeOffenseModifier);
  });

  it('boosts the away offense in an away elimination spot', () => {
    const neutral = buildPlayoffGameModifiers(makeContext({
      seriesHomeWins: 2,
      seriesAwayWins: 1,
      isElimination: false,
    }));
    const pressured = buildPlayoffGameModifiers(makeContext({
      seriesHomeWins: 2,
      seriesAwayWins: 1,
      isElimination: true,
    }));

    expect(pressured.awayOffenseModifier).toBeGreaterThan(neutral.awayOffenseModifier);
  });

  it('raises variance in elimination games', () => {
    const neutral = buildPlayoffGameModifiers(makeContext({ isElimination: false }));
    const pressured = buildPlayoffGameModifiers(makeContext({
      seriesHomeWins: 1,
      seriesAwayWins: 2,
      isElimination: true,
    }));

    expect(pressured.varianceMultiplier).toBeGreaterThan(neutral.varianceMultiplier);
  });

  it('avoids pressure adjustments in a 0-0 series', () => {
    const modifiers = buildPlayoffGameModifiers(makeContext({
      seriesHomeWins: 0,
      seriesAwayWins: 0,
      isElimination: false,
    }));

    expect(modifiers.varianceMultiplier).toBe(1);
  });

  it('is deterministic for the same inputs', () => {
    const first = buildPlayoffGameModifiers(makeContext());
    const second = buildPlayoffGameModifiers(makeContext());

    expect(first).toEqual(second);
  });

  it('writes a deterministic momentum summary', () => {
    const modifiers = buildPlayoffGameModifiers(makeContext({
      homeStarterGamesInSeries: 2,
      homeStarterDaysSinceStart: 3,
      isElimination: true,
      seriesHomeWins: 1,
      seriesAwayWins: 2,
    }));

    expect(modifiers.momentumNarrative.toLowerCase()).toMatch(/home field|fatigue|pressure|streak/);
  });

  it('reflects a large regular-season gap in the home edge', () => {
    const dominant = buildPlayoffGameModifiers(makeContext({
      homeTeamWins: 108,
      homeTeamLosses: 54,
      awayTeamWins: 80,
      awayTeamLosses: 82,
    }));
    const narrow = buildPlayoffGameModifiers(makeContext({
      homeTeamWins: 92,
      homeTeamLosses: 70,
      awayTeamWins: 90,
      awayTeamLosses: 72,
    }));

    expect(dominant.homeOffenseModifier).toBeGreaterThan(narrow.homeOffenseModifier);
  });

  it('keeps zero-stamina pitchers bounded', () => {
    const modifiers = buildPlayoffGameModifiers(makeContext({
      homeStarterGamesInSeries: 3,
      homeStarterDaysSinceStart: 3,
      homeStarterStamina: 0,
    }));

    expect(modifiers.homePitchingModifier).toBeGreaterThanOrEqual(-0.2);
  });

  it('lets streak momentum improve the hot team pitching line', () => {
    const hot = buildPlayoffGameModifiers(makeContext({
      homeRecentResults: [true, true, true, true],
      awayRecentResults: [false, false, false],
    }));
    const flat = buildPlayoffGameModifiers(makeContext({
      homeRecentResults: [true, false, true, false],
      awayRecentResults: [false, true, false, true],
    }));

    expect(hot.homePitchingModifier).toBeGreaterThan(flat.homePitchingModifier);
  });
});

describe('generateMomentumNarrative', () => {
  it('is deterministic for the same seed and modifiers', () => {
    const first = generateMomentumNarrative(new GameRNG(81), makeModifiers());
    const second = generateMomentumNarrative(new GameRNG(81), makeModifiers());

    expect(first).toBe(second);
  });

  it('mentions home field when the home offense edge is positive', () => {
    const narrative = generateMomentumNarrative(new GameRNG(82), makeModifiers({
      homeOffenseModifier: 0.06,
      awayOffenseModifier: -0.04,
    }));

    expect(narrative.toLowerCase()).toMatch(/home|crowd|park/);
  });

  it('mentions fatigue when pitching modifiers are negative', () => {
    const narrative = generateMomentumNarrative(new GameRNG(83), makeModifiers({
      homePitchingModifier: -0.08,
      awayPitchingModifier: -0.02,
    }));

    expect(narrative.toLowerCase()).toMatch(/fatigue|rest|arm/);
  });

  it('mentions pressure when variance is elevated', () => {
    const narrative = generateMomentumNarrative(new GameRNG(84), makeModifiers({
      varianceMultiplier: 1.2,
    }));

    expect(narrative.toLowerCase()).toMatch(/pressure|elimination|variance/);
  });

  it('mentions streaks when momentum is active', () => {
    const narrative = generateMomentumNarrative(new GameRNG(85), makeModifiers({
      homeOffenseModifier: 0.04,
      awayOffenseModifier: -0.02,
      homePitchingModifier: 0.01,
      awayPitchingModifier: -0.05,
      momentumNarrative: 'The home club carries a hot streak into the game.',
    }));

    expect(narrative.toLowerCase()).toMatch(/streak|surge|run/);
  });
});

describe('top-level exports', () => {
  it('re-exports playoff momentum APIs from sim-core index', async () => {
    const simCore = await import('../src/index.js');

    expect(typeof simCore.calculateHomeFieldAdvantage).toBe('function');
    expect(typeof simCore.calculatePitcherFatigue).toBe('function');
    expect(typeof simCore.calculateMustWinPressure).toBe('function');
    expect(typeof simCore.calculateStreakMomentum).toBe('function');
    expect(typeof simCore.buildPlayoffGameModifiers).toBe('function');
    expect(typeof simCore.generateMomentumNarrative).toBe('function');
  });
});
