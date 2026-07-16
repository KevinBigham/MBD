import { describe, expect, it } from 'vitest';
import {
  LUXURY_TAX_THRESHOLD,
  OWNER_PAYROLL_FLOOR_RATIOS,
  deriveOwnerPayrollPolicy,
  resolveOwnerSoftCeiling,
} from '../src/index.js';

describe('owner payroll pressure policy', () => {
  it('derives ordered archetype floors from the raw owner soft ceiling', () => {
    const policies = (['win_now', 'patient_builder', 'penny_pincher'] as const)
      .map((archetype) => deriveOwnerPayrollPolicy({
        archetype,
        softCeiling: 200,
        totalPayroll: 100,
        luxuryTaxPayroll: 90,
      }));

    expect(OWNER_PAYROLL_FLOOR_RATIOS).toEqual({
      win_now: 0.5,
      patient_builder: 0.4,
      penny_pincher: 0.3,
    });
    expect(policies.map((policy) => policy.floor)).toEqual([100, 80, 60]);
    for (const policy of policies) {
      expect(Number.isFinite(policy.floor)).toBe(true);
      expect(policy.floor).toBeGreaterThanOrEqual(0);
      expect(policy.floor).toBeLessThan(policy.softCeiling);
    }
  });

  it('classifies exact floor and soft-ceiling boundaries as on plan', () => {
    const atFloor = deriveOwnerPayrollPolicy({
      archetype: 'win_now',
      softCeiling: 200,
      totalPayroll: 100,
      luxuryTaxPayroll: 100,
    });
    const atSoftCeiling = deriveOwnerPayrollPolicy({
      archetype: 'win_now',
      softCeiling: 200,
      totalPayroll: 200,
      luxuryTaxPayroll: 200,
    });

    expect(atFloor.ownerBand).toBe('on_plan');
    expect(atSoftCeiling.ownerBand).toBe('on_plan');
    expect(deriveOwnerPayrollPolicy({
      archetype: 'win_now',
      softCeiling: 200,
      totalPayroll: 99.99,
      luxuryTaxPayroll: 99.99,
    }).ownerBand).toBe('below_floor');
    expect(deriveOwnerPayrollPolicy({
      archetype: 'win_now',
      softCeiling: 200,
      totalPayroll: 200.01,
      luxuryTaxPayroll: 200.01,
    }).ownerBand).toBe('above_soft_ceiling');
  });

  it('uses luxury-tax payroll rather than total payroll at the exact tax line', () => {
    const base = {
      archetype: 'patient_builder' as const,
      softCeiling: 250,
      totalPayroll: 260,
    };

    expect(deriveOwnerPayrollPolicy({
      ...base,
      luxuryTaxPayroll: LUXURY_TAX_THRESHOLD - 0.01,
    })).toMatchObject({ taxBand: 'clear', projectedTax: 0, taxRoom: 0.01 });
    expect(deriveOwnerPayrollPolicy({
      ...base,
      luxuryTaxPayroll: LUXURY_TAX_THRESHOLD,
    })).toMatchObject({ taxBand: 'clear', projectedTax: 0, taxRoom: 0 });
    expect(deriveOwnerPayrollPolicy({
      ...base,
      luxuryTaxPayroll: LUXURY_TAX_THRESHOLD + 0.01,
    })).toMatchObject({ taxBand: 'taxpayer', taxOverage: 0.01 });

    const minorsOnlyOverage = deriveOwnerPayrollPolicy({
      ...base,
      totalPayroll: 300,
      luxuryTaxPayroll: 220,
    });
    expect(minorsOnlyOverage.ownerBand).toBe('above_soft_ceiling');
    expect(minorsOnlyOverage.taxBand).toBe('clear');
    expect(minorsOnlyOverage.projectedTax).toBe(0);
  });

  it('preserves the existing progressive tax assessment', () => {
    expect(deriveOwnerPayrollPolicy({
      archetype: 'win_now',
      softCeiling: 400,
      totalPayroll: 290,
      luxuryTaxPayroll: 290,
    }).projectedTax).toBe(20.4);
  });

  it('resolves malformed optional owner lines through source-owned fallbacks', () => {
    expect(resolveOwnerSoftCeiling({
      payrollCap: 210,
      payrollTarget: 190,
      fallbackBudget: 175,
    })).toBe(210);
    expect(resolveOwnerSoftCeiling({
      payrollCap: Number.NaN,
      payrollTarget: 190,
      fallbackBudget: 175,
    })).toBe(190);
    expect(resolveOwnerSoftCeiling({
      payrollCap: -1,
      payrollTarget: Number.POSITIVE_INFINITY,
      fallbackBudget: 175,
    })).toBe(161);
  });

  it('keeps direct malformed policy inputs finite, nonnegative, and ordered', () => {
    for (const softCeiling of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      const policy = deriveOwnerPayrollPolicy({
        archetype: 'win_now',
        softCeiling,
        totalPayroll: Number.NaN,
        luxuryTaxPayroll: Number.NEGATIVE_INFINITY,
      });

      expect(policy.softCeiling).toBe(0.02);
      expect(policy.floor).toBe(0.01);
      expect(policy.floor).toBeLessThan(policy.softCeiling);
      expect(policy.totalPayroll).toBe(0);
      expect(policy.luxuryTaxPayroll).toBe(0);
    }
  });

  it('is deterministic and advisory-only', () => {
    const input = {
      archetype: 'penny_pincher' as const,
      softCeiling: 160,
      totalPayroll: 170,
      luxuryTaxPayroll: 150,
    };
    const first = deriveOwnerPayrollPolicy(input);
    const second = deriveOwnerPayrollPolicy(input);

    expect(second).toEqual(first);
    expect(first.ownerBand).toBe('above_soft_ceiling');
    expect(first).not.toHaveProperty('allowed');
    expect(first).not.toHaveProperty('rejected');
  });
});
