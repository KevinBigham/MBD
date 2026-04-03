import { describe, expect, it } from 'vitest';
import {
  createFrontOfficeState,
  createOwnerState,
  evaluateFrontOfficeState,
  evaluateOwnerState,
  frontOfficeFreeAgencyAppeal,
  frontOfficeTradeModifier,
} from '../src/index.js';

describe('front office dynamics', () => {
  it('raises owner budgets when satisfaction and spending appetite are strong', () => {
    const cheapOwner = {
      ...createOwnerState('oak', 128_000_000),
      spendingWillingness: 'cheap' as const,
      satisfaction: 42,
    };
    const lavishOwner = {
      ...createOwnerState('nyy', 214_000_000),
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

  it('moves reputation, trade leverage, and FA appeal together', () => {
    const baseline = createFrontOfficeState('nyy');
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
});
