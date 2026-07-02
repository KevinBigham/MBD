import { describe, expect, it } from 'vitest';
import {
  createFrontOfficeState,
  createOwnerState,
  evaluateFrontOfficeState,
  deriveTeamBuildingArchetype,
  evaluateOwnerState,
  frontOfficeFreeAgencyAppeal,
  frontOfficeTradeModifier,
  teamBuildingExtensionPriorityAdjustment,
  teamBuildingFreeAgencyAggression,
  teamBuildingPromotionScoreAdjustment,
} from '../src/index.js';

describe('front office dynamics', () => {
  it('raises owner budgets when satisfaction and spending appetite are strong', () => {
    const cheapOwner = {
      ...createOwnerState('por', 128_000_000),
      spendingWillingness: 'cheap' as const,
      satisfaction: 42,
    };
    const lavishOwner = {
      ...createOwnerState('nym', 214_000_000),
      spendingWillingness: 'lavish' as const,
      satisfaction: 84,
    };

    const cheapBudgetYear = evaluateOwnerState(cheapOwner, {
      wins: 72,
      losses: 90,
      payroll: 136_000_000,
      chemistryScore: 45,
      recentDecisionScore: -8,
    });
    const lavishBudgetYear = evaluateOwnerState(lavishOwner, {
      wins: 97,
      losses: 65,
      payroll: 204_000_000,
      chemistryScore: 78,
      recentDecisionScore: 10,
    });

    expect(lavishBudgetYear.annualBudget).toBeGreaterThan(cheapBudgetYear.annualBudget ?? 0);
    expect(lavishBudgetYear.payrollCap).toBeGreaterThan(cheapBudgetYear.payrollCap ?? 0);
    expect(lavishBudgetYear.draftBonusPool).toBeGreaterThan(0);
    expect(lavishBudgetYear.ifaBonusPool).toBeGreaterThan(0);
    expect(lavishBudgetYear.staffBudget).toBeGreaterThan(0);
    expect(lavishBudgetYear.satisfaction).toBeGreaterThan(cheapBudgetYear.satisfaction ?? 0);
  });

  it('keeps win-now owner trust bounded when a competitive club misses a ceiling target', () => {
    const owner = {
      ...createOwnerState('nym', 214_000_000),
      expectations: {
        ...createOwnerState('nym', 214_000_000).expectations,
        winsTarget: 96,
        playoffTarget: true,
      },
      spendingWillingness: 'lavish' as const,
      winNowPressure: 98,
      patience: 56,
      confidence: 58,
      satisfaction: 62,
    };

    const evaluated = evaluateOwnerState(owner, {
      wins: 88,
      losses: 74,
      payroll: 198_000_000,
      chemistryScore: 68,
      recentDecisionScore: -2,
      madePlayoffs: false,
    });
    const trust = Math.round(((evaluated.patience + evaluated.confidence) / 2));

    expect(trust).toBeGreaterThanOrEqual(52);
    expect(evaluated.hotSeat).toBe(false);
    expect(evaluated.satisfaction).toBeLessThan(62);
  });

  it('keeps regular-season owner trust from maxing out before title consequences', () => {
    const owner = {
      ...createOwnerState('mia', 118_000_000),
      expectations: {
        ...createOwnerState('mia', 118_000_000).expectations,
        winsTarget: 72,
        playoffTarget: false,
      },
      winNowPressure: 73,
      patience: 100,
      confidence: 100,
      satisfaction: 100,
    };

    const evaluated = evaluateOwnerState(owner, {
      wins: 97,
      losses: 65,
      payroll: 110_000_000,
      chemistryScore: 82,
      recentDecisionScore: 8,
      madePlayoffs: true,
    });

    expect(evaluated.satisfaction).toBeGreaterThanOrEqual(80);
    expect(evaluated.patience).toBeLessThanOrEqual(94);
    expect(evaluated.confidence).toBeLessThanOrEqual(94);
  });

  it('moves reputation, trade leverage, and FA appeal together', () => {
    const baseline = createFrontOfficeState('nym');
    const improved = evaluateFrontOfficeState(baseline, {
      draftDelta: 8,
      tradeDelta: 12,
      freeAgencyDelta: 6,
      playoffDelta: 10,
    });
    const damaged = evaluateFrontOfficeState(baseline, {
      draftDelta: -6,
      tradeDelta: -14,
      freeAgencyDelta: -8,
      playoffDelta: -10,
    });

    expect(improved.reputation).toBeGreaterThan(baseline.reputation);
    expect(damaged.reputation).toBeLessThan(baseline.reputation);
    expect(frontOfficeTradeModifier(improved.reputation)).toBeGreaterThan(frontOfficeTradeModifier(damaged.reputation));
    expect(frontOfficeFreeAgencyAppeal(improved.reputation)).toBeGreaterThan(frontOfficeFreeAgencyAppeal(damaged.reputation));
  });

  it('derives deterministic team-building archetypes from roster, payroll, and record pressure', () => {
    expect(deriveTeamBuildingArchetype({
      winPercentage: 0.36,
      payrollRatio: 0.62,
      prospectScore: 82,
      majorLeagueCoreScore: 46,
      frontOfficeReputation: 48,
    })).toBe('rebuilding');

    expect(deriveTeamBuildingArchetype({
      winPercentage: 0.49,
      payrollRatio: 0.96,
      prospectScore: 51,
      majorLeagueCoreScore: 59,
      frontOfficeReputation: 42,
    })).toBe('budget_constrained');

    expect(deriveTeamBuildingArchetype({
      winPercentage: 0.58,
      payrollRatio: 0.82,
      prospectScore: 61,
      majorLeagueCoreScore: 72,
      frontOfficeReputation: 57,
    })).toBe('contending');

    expect(deriveTeamBuildingArchetype({
      winPercentage: 0.64,
      payrollRatio: 0.89,
      prospectScore: 54,
      majorLeagueCoreScore: 81,
      frontOfficeReputation: 76,
    })).toBe('win_now');

    expect(deriveTeamBuildingArchetype({
      winPercentage: 0.5,
      payrollRatio: 0.76,
      prospectScore: 56,
      majorLeagueCoreScore: 58,
      frontOfficeReputation: 50,
    })).toBe('balanced');
  });

  it('sets free-agency aggression by team-building identity', () => {
    expect(teamBuildingFreeAgencyAggression('win_now')).toBeGreaterThan(teamBuildingFreeAgencyAggression('contending'));
    expect(teamBuildingFreeAgencyAggression('contending')).toBeGreaterThan(teamBuildingFreeAgencyAggression('balanced'));
    expect(teamBuildingFreeAgencyAggression('balanced')).toBeGreaterThan(teamBuildingFreeAgencyAggression('rebuilding'));
    expect(teamBuildingFreeAgencyAggression('rebuilding')).toBeGreaterThan(teamBuildingFreeAgencyAggression('budget_constrained'));
  });

  it('sets promotion and extension priorities by team-building identity', () => {
    const upsideProspect = {
      age: 22,
      overallRating: 305,
      potentialRating: 425,
    };
    const currentCoreVeteran = {
      age: 31,
      overallRating: 390,
      potentialRating: 398,
    };

    expect(teamBuildingPromotionScoreAdjustment('rebuilding', upsideProspect)).toBeGreaterThan(
      teamBuildingPromotionScoreAdjustment('win_now', upsideProspect),
    );
    expect(teamBuildingPromotionScoreAdjustment('win_now', currentCoreVeteran)).toBeGreaterThan(
      teamBuildingPromotionScoreAdjustment('rebuilding', currentCoreVeteran),
    );

    expect(teamBuildingExtensionPriorityAdjustment('rebuilding', {
      age: 24,
      overallRating: 370,
      controlYears: 3,
      annualSalary: 6,
    })).toBeGreaterThan(teamBuildingExtensionPriorityAdjustment('rebuilding', {
      age: 33,
      overallRating: 370,
      controlYears: 1,
      annualSalary: 22,
    }));
    expect(teamBuildingExtensionPriorityAdjustment('win_now', {
      age: 30,
      overallRating: 415,
      controlYears: 1,
      annualSalary: 24,
    })).toBeGreaterThan(teamBuildingExtensionPriorityAdjustment('budget_constrained', {
      age: 30,
      overallRating: 415,
      controlYears: 1,
      annualSalary: 24,
    }));
  });
});
