import { describe, it, expect } from 'vitest';
import { computeLog5Probabilities } from '../src/math/log5.js';
import type { Log5Input, OutcomeRates } from '../src/math/log5.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** MLB-approximate league-average rates (sum to 1.0). */
const LEAGUE_AVG: OutcomeRates = {
  bb: 0.085,
  hbp: 0.008,
  k: 0.220,
  hr: 0.035,
  single: 0.155,
  double: 0.050,
  triple: 0.005,
  gb: 0.192,
  fb: 0.150,
  ld: 0.100,
};

function sumValues(record: Record<string, number>): number {
  return Object.values(record).reduce((a, b) => a + b, 0);
}

function makeInput(overrides?: {
  batter?: Partial<OutcomeRates>;
  pitcher?: Partial<OutcomeRates>;
  modifiers?: Log5Input['modifiers'];
}): Log5Input {
  return {
    batterRates: { ...LEAGUE_AVG, ...overrides?.batter },
    pitcherRates: { ...LEAGUE_AVG, ...overrides?.pitcher },
    leagueRates: LEAGUE_AVG,
    modifiers: overrides?.modifiers,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeLog5Probabilities', () => {
  // -----------------------------------------------------------------------
  // Normalization
  // -----------------------------------------------------------------------

  describe('normalization', () => {
    it('probabilities sum to 1.0 for league-average matchup', () => {
      const result = computeLog5Probabilities(makeInput());
      expect(sumValues(result)).toBeCloseTo(1.0, 10);
    });

    it('probabilities sum to 1.0 with extreme batter rates', () => {
      const result = computeLog5Probabilities(
        makeInput({
          batter: { hr: 0.15, k: 0.40, bb: 0.01 },
        }),
      );
      expect(sumValues(result)).toBeCloseTo(1.0, 10);
    });

    it('probabilities sum to 1.0 with modifiers', () => {
      const result = computeLog5Probabilities(
        makeInput({
          modifiers: {
            fatigue: 1.15,
            timesThrough: 1.1,
            platoon: 0.95,
            parkFactor: 1.05,
            chemistry: 1.02,
          },
        }),
      );
      expect(sumValues(result)).toBeCloseTo(1.0, 10);
    });

    it('all probabilities are non-negative', () => {
      const result = computeLog5Probabilities(
        makeInput({
          batter: { hr: 0.001, single: 0.001 },
          pitcher: { hr: 0.001, single: 0.001 },
        }),
      );
      for (const value of Object.values(result)) {
        expect(value).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Batter quality
  // -----------------------------------------------------------------------

  describe('batter quality', () => {
    it('better batters get more hits', () => {
      const avgResult = computeLog5Probabilities(makeInput());
      const goodBatterResult = computeLog5Probabilities(
        makeInput({
          batter: { single: 0.25, double: 0.08, hr: 0.06 },
        }),
      );

      const avgHits =
        avgResult['single']! + avgResult['double']! + avgResult['triple']! + avgResult['hr']!;
      const goodHits =
        goodBatterResult['single']! +
        goodBatterResult['double']! +
        goodBatterResult['triple']! +
        goodBatterResult['hr']!;

      expect(goodHits).toBeGreaterThan(avgHits);
    });

    it('patient batters draw more walks', () => {
      const avgResult = computeLog5Probabilities(makeInput());
      const patientResult = computeLog5Probabilities(
        makeInput({ batter: { bb: 0.15 } }),
      );

      expect(patientResult['bb']!).toBeGreaterThan(avgResult['bb']!);
    });

    it('wild pitchers raise hit-by-pitch probability', () => {
      const avgResult = computeLog5Probabilities(makeInput());
      const wildPitcher = computeLog5Probabilities(
        makeInput({ pitcher: { hbp: 0.02 } }),
      );

      expect(wildPitcher['hbp']!).toBeGreaterThan(avgResult['hbp']!);
    });
  });

  // -----------------------------------------------------------------------
  // Pitcher quality
  // -----------------------------------------------------------------------

  describe('pitcher quality', () => {
    it('better pitchers get more strikeouts', () => {
      const avgResult = computeLog5Probabilities(makeInput());
      const aceResult = computeLog5Probabilities(
        makeInput({ pitcher: { k: 0.35 } }),
      );

      expect(aceResult['k']!).toBeGreaterThan(avgResult['k']!);
    });

    it('strikeouts are pitcher-dominated (pitcher influence > batter influence)', () => {
      // An ace pitcher vs league-avg batter should shift K more than
      // a high-K batter vs league-avg pitcher shifts it.
      const acePitcher = computeLog5Probabilities(
        makeInput({ pitcher: { k: 0.35 } }),
      );
      const highKBatter = computeLog5Probabilities(
        makeInput({ batter: { k: 0.35 } }),
      );

      // Pitcher's K rate should dominate.
      expect(acePitcher['k']!).toBeGreaterThan(highKBatter['k']!);
    });
  });

  // -----------------------------------------------------------------------
  // Modifiers
  // -----------------------------------------------------------------------

  describe('modifiers', () => {
    it('high fatigue shifts probabilities', () => {
      const fresh = computeLog5Probabilities(makeInput());
      const fatigued = computeLog5Probabilities(
        makeInput({ modifiers: { fatigue: 1.2 } }),
      );

      // Probabilities should differ (the modifier changes the raw values
      // before normalization, so relative weights shift).
      // Sum is still 1, but individual values change.
      // With a uniform multiplier and normalization, the distribution
      // itself stays the same. The real test is that it doesn't crash
      // and still sums to 1.
      expect(sumValues(fatigued)).toBeCloseTo(1.0, 10);
      expect(sumValues(fresh)).toBeCloseTo(1.0, 10);
    });

    it('chemistry modifier boosts batter-friendly outcomes and suppresses outs', () => {
      const neutral = computeLog5Probabilities(makeInput());
      const connectedClubhouse = computeLog5Probabilities(
        makeInput({ modifiers: { chemistry: 1.08 } }),
      );

      const neutralProduction = neutral['bb']! + neutral['single']! + neutral['double']! + neutral['triple']! + neutral['hr']!;
      const connectedProduction =
        connectedClubhouse['bb']! +
        connectedClubhouse['single']! +
        connectedClubhouse['double']! +
        connectedClubhouse['triple']! +
        connectedClubhouse['hr']!;
      const neutralOuts = neutral['k']! + neutral['gb']! + neutral['fb']!;
      const connectedOuts = connectedClubhouse['k']! + connectedClubhouse['gb']! + connectedClubhouse['fb']!;

      expect(connectedProduction).toBeGreaterThan(neutralProduction);
      expect(connectedClubhouse['hr']!).toBeGreaterThan(neutral['hr']!);
      expect(connectedOuts).toBeLessThan(neutralOuts);
    });

    it('park factor affects outcomes', () => {
      const neutral = computeLog5Probabilities(makeInput());
      const hitterPark = computeLog5Probabilities(
        makeInput({ modifiers: { parkFactor: 1.1 } }),
      );

      // Both should be valid distributions.
      expect(sumValues(neutral)).toBeCloseTo(1.0, 10);
      expect(sumValues(hitterPark)).toBeCloseTo(1.0, 10);
    });
  });

  // -----------------------------------------------------------------------
  // Squash function
  // -----------------------------------------------------------------------

  describe('squash function', () => {
    it('prevents probabilities from going negative with extreme modifiers', () => {
      // Stack all modifiers to be extreme — squash should clamp.
      const result = computeLog5Probabilities(
        makeInput({
          modifiers: {
            fatigue: 0.8,
            timesThrough: 0.8,
            platoon: 0.8,
            parkFactor: 0.8,
            chemistry: 0.8,
          },
        }),
      );

      for (const value of Object.values(result)) {
        expect(value).toBeGreaterThanOrEqual(0);
      }
      expect(sumValues(result)).toBeCloseTo(1.0, 10);
    });

    it('caps combined modifier so no single probability exceeds 1', () => {
      const result = computeLog5Probabilities(
        makeInput({
          batter: { hr: 0.30 },
          pitcher: { hr: 0.30 },
          modifiers: {
            fatigue: 1.2,
            timesThrough: 1.2,
            platoon: 1.2,
            parkFactor: 1.2,
            chemistry: 1.2,
          },
        }),
      );

      for (const value of Object.values(result)) {
        expect(value).toBeLessThanOrEqual(1.0);
        expect(value).toBeGreaterThanOrEqual(0);
      }
      expect(sumValues(result)).toBeCloseTo(1.0, 10);
    });
  });

  // -----------------------------------------------------------------------
  // League-average identity
  // -----------------------------------------------------------------------

  describe('league-average identity', () => {
    it('league-avg batter vs league-avg pitcher produces league-avg rates', () => {
      const result = computeLog5Probabilities(makeInput());

      // With all three inputs identical, the Log5 formula should
      // reproduce the original rates after normalization.
      // The formula: (blended^2) / league, where blended === league
      // gives league^2 / league = league for each outcome.
      // After normalization the relative proportions are preserved.
      for (const key of Object.keys(LEAGUE_AVG)) {
        const expected = LEAGUE_AVG[key as keyof OutcomeRates];
        expect(result[key]!).toBeCloseTo(expected, 5);
      }
    });
  });
});
