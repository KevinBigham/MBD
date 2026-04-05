import { describe, expect, it } from 'vitest';
import { transformPayrollData, formatSalary } from './PayrollBreakdownChart';
import { CHART_COLORS } from './chartTheme';

describe('transformPayrollData', () => {
  it('returns empty array for null input', () => {
    expect(transformPayrollData(null)).toEqual([]);
  });

  it('returns empty array for zero budget and payroll', () => {
    expect(transformPayrollData({ payroll: 0, budget: 0, luxuryTax: 0 })).toEqual([]);
  });

  it('creates committed and available slices', () => {
    const result = transformPayrollData({ payroll: 50_000_000, budget: 80_000_000, luxuryTax: 0 });
    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe('Committed');
    expect(result[0]!.value).toBe(50_000_000);
    expect(result[0]!.color).toBe(CHART_COLORS.primary);
    expect(result[1]!.name).toBe('Available');
    expect(result[1]!.value).toBe(30_000_000);
    expect(result[1]!.color).toBe(CHART_COLORS.tertiary);
  });

  it('includes luxury tax slice when over threshold', () => {
    const result = transformPayrollData({ payroll: 90_000_000, budget: 80_000_000, luxuryTax: 5_000_000 });
    expect(result.find((s) => s.name === 'Luxury Tax')).toBeDefined();
    expect(result.find((s) => s.name === 'Luxury Tax')!.value).toBe(5_000_000);
    expect(result.find((s) => s.name === 'Luxury Tax')!.color).toBe(CHART_COLORS.danger);
  });

  it('omits available slice when over budget', () => {
    const result = transformPayrollData({ payroll: 100_000_000, budget: 80_000_000, luxuryTax: 10_000_000 });
    expect(result.find((s) => s.name === 'Available')).toBeUndefined();
  });
});

describe('formatSalary', () => {
  it('formats millions', () => {
    expect(formatSalary(12_500_000)).toBe('$12.5M');
  });

  it('formats thousands', () => {
    expect(formatSalary(500_000)).toBe('$500K');
  });

  it('formats small amounts', () => {
    expect(formatSalary(999)).toBe('$999');
  });
});
