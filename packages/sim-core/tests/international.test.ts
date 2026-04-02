import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  createInternationalScoutingState,
  generateIFAPool,
  getAvailableIFAProspects,
  getInternationalScoutAccuracy,
  getRemainingIFABudget,
  scoutIFAProspect,
  scoutQualityToAccuracy,
  signIFAProspect,
  tradeIFABonusPool,
  toDisplayRating,
  type InternationalProspect,
  type Scout,
} from '../src/index.js';

function makeProspect(seed: number): InternationalProspect {
  return generateIFAPool(new GameRNG(seed), 1, 1)[0]!;
}

function makeScout(quality: number): Scout {
  return {
    id: `scout-${quality}`,
    name: `Scout ${quality}`,
    quality,
    specialty: 'all',
    bias: 'neutral',
    salary: 1.2,
  };
}

describe('generateIFAPool', () => {
  it('creates a deterministic international class with 80-120 eligible prospects', () => {
    const rngA = new GameRNG(42);
    const rngB = new GameRNG(42);

    const poolA = generateIFAPool(rngA, 3);
    const poolB = generateIFAPool(rngB, 3);

    expect(poolA).toHaveLength(poolB.length);
    expect(poolA.length).toBeGreaterThanOrEqual(80);
    expect(poolA.length).toBeLessThanOrEqual(120);
    expect(poolA).toEqual(poolB);

    for (const prospect of poolA) {
      expect(prospect.age).toBeGreaterThanOrEqual(16);
      expect(prospect.age).toBeLessThanOrEqual(22);
      expect(['latin_america', 'caribbean', 'asia']).toContain(prospect.region);
      expect(prospect.status).toBe('available');
    }
  });
});

describe('international scouting accuracy', () => {
  it('maps scouting departments into the 0.50-0.95 accuracy band', () => {
    expect(scoutQualityToAccuracy(10)).toBeGreaterThanOrEqual(0.5);
    expect(scoutQualityToAccuracy(99)).toBeLessThanOrEqual(0.95);

    const accuracy = getInternationalScoutAccuracy([
      makeScout(35),
      makeScout(60),
      makeScout(85),
    ]);

    expect(accuracy).toBeGreaterThanOrEqual(0.5);
    expect(accuracy).toBeLessThanOrEqual(0.95);
  });

  it('reduces scouting noise as accuracy and looks increase', () => {
    const prospect = makeProspect(7);
    const truth = toDisplayRating(prospect.overallRating);

    const lowAccuracyReport = scoutIFAProspect(new GameRNG(900), prospect, 0.55, 1);
    const highAccuracyReport = scoutIFAProspect(new GameRNG(900), prospect, 0.9, 1);
    const oneLookReport = scoutIFAProspect(new GameRNG(901), prospect, 0.72, 1);
    const fourLookReport = scoutIFAProspect(new GameRNG(901), prospect, 0.72, 4);

    expect(Math.abs(highAccuracyReport.overallGrade - truth)).toBeLessThanOrEqual(
      Math.abs(lowAccuracyReport.overallGrade - truth),
    );
    expect(fourLookReport.confidence).toBeLessThanOrEqual(oneLookReport.confidence);
    expect(Math.abs(fourLookReport.overallGrade - truth)).toBeLessThanOrEqual(
      Math.abs(oneLookReport.overallGrade - truth),
    );
  });
});

describe('IFA signing and pool management', () => {
  it('filters signed prospects out of the available pool and enforces budgets', () => {
    const state = createInternationalScoutingState(
      new GameRNG(55),
      ['nyy', 'bos'],
      4,
    );
    const target = getAvailableIFAProspects(state)[0]!;

    const signed = signIFAProspect(state, 'nyy', target.id, 1.5);

    expect(getAvailableIFAProspects(signed.state).some((prospect) => prospect.id === target.id)).toBe(false);
    expect(signed.signedPlayer.rosterStatus).toBe('ROOKIE');
    expect(signed.signedPlayer.minorLeagueLevel).toBe('ROOKIE');
    expect(getRemainingIFABudget(signed.state.budgets.get('nyy')!)).toBe(3.5);

    expect(() => signIFAProspect(signed.state, 'nyy', target.id, 0.5)).toThrow(/already signed/i);
    expect(() => signIFAProspect(state, 'nyy', target.id, 6)).toThrow(/bonus pool/i);
  });

  it('supports trading bonus pool space without allowing overdraws', () => {
    const state = createInternationalScoutingState(
      new GameRNG(77),
      ['nyy', 'bos'],
      2,
    );

    const traded = tradeIFABonusPool(state, 'nyy', 'bos', 1.25);

    expect(getRemainingIFABudget(traded.budgets.get('nyy')!)).toBe(3.75);
    expect(getRemainingIFABudget(traded.budgets.get('bos')!)).toBe(6.25);

    expect(() => tradeIFABonusPool(traded, 'nyy', 'bos', 10)).toThrow(/available/i);
    expect(() => tradeIFABonusPool(traded, 'nyy', 'bos', 0)).toThrow(/positive/i);
  });
});
