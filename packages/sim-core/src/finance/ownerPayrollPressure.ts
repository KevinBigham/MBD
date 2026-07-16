import type { OwnerState } from '@mbd/contracts';
import {
  LUXURY_TAX_THRESHOLD,
  calculateLuxuryTax,
} from './contracts.js';

export type OwnerPayrollBand = 'below_floor' | 'on_plan' | 'above_soft_ceiling';
export type OwnerPayrollTaxBand = 'clear' | 'taxpayer';

export interface OwnerPayrollPolicyInput {
  archetype: OwnerState['archetype'];
  softCeiling: number;
  totalPayroll: number;
  luxuryTaxPayroll: number;
}

export interface OwnerPayrollPolicy {
  archetype: OwnerState['archetype'];
  floor: number;
  softCeiling: number;
  totalPayroll: number;
  ownerBand: OwnerPayrollBand;
  floorShortfall: number;
  softCeilingRoom: number;
  softCeilingOverage: number;
  taxThreshold: number;
  luxuryTaxPayroll: number;
  taxBand: OwnerPayrollTaxBand;
  taxRoom: number;
  taxOverage: number;
  projectedTax: number;
}

export const OWNER_PAYROLL_FLOOR_RATIOS: Readonly<
  Record<OwnerState['archetype'], number>
> = {
  win_now: 0.5,
  patient_builder: 0.4,
  penny_pincher: 0.3,
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function nonnegativeMoney(value: number): number {
  return Number.isFinite(value) ? roundMoney(Math.max(0, value)) : 0;
}

function positiveMoney(value: number): number | null {
  return Number.isFinite(value) && value > 0 ? roundMoney(value) : null;
}

export function resolveOwnerSoftCeiling(input: {
  payrollCap?: number | null;
  payrollTarget?: number | null;
  fallbackBudget: number;
}): number {
  const payrollCap = positiveMoney(input.payrollCap ?? Number.NaN);
  if (payrollCap != null) return payrollCap;

  const payrollTarget = positiveMoney(input.payrollTarget ?? Number.NaN);
  if (payrollTarget != null) return payrollTarget;

  const fallbackBudget = positiveMoney(input.fallbackBudget);
  return roundMoney((fallbackBudget ?? 0) * 0.92);
}

export function deriveOwnerPayrollPolicy(
  input: OwnerPayrollPolicyInput,
): OwnerPayrollPolicy {
  // Public callers normally resolve through source-owned owner/budget values,
  // but keep the pure policy contract ordered even for a malformed direct
  // input. Two cents is the smallest line whose rounded archetype floor
  // remains strictly lower.
  const softCeiling = Math.max(0.02, nonnegativeMoney(input.softCeiling));
  const totalPayroll = nonnegativeMoney(input.totalPayroll);
  const luxuryTaxPayroll = nonnegativeMoney(input.luxuryTaxPayroll);
  const floor = roundMoney(
    softCeiling * OWNER_PAYROLL_FLOOR_RATIOS[input.archetype],
  );
  const ownerBand: OwnerPayrollBand = totalPayroll < floor
    ? 'below_floor'
    : totalPayroll > softCeiling
      ? 'above_soft_ceiling'
      : 'on_plan';
  const taxBand: OwnerPayrollTaxBand = luxuryTaxPayroll > LUXURY_TAX_THRESHOLD
    ? 'taxpayer'
    : 'clear';

  return {
    archetype: input.archetype,
    floor,
    softCeiling,
    totalPayroll,
    ownerBand,
    floorShortfall: roundMoney(Math.max(0, floor - totalPayroll)),
    softCeilingRoom: roundMoney(Math.max(0, softCeiling - totalPayroll)),
    softCeilingOverage: roundMoney(Math.max(0, totalPayroll - softCeiling)),
    taxThreshold: LUXURY_TAX_THRESHOLD,
    luxuryTaxPayroll,
    taxBand,
    taxRoom: roundMoney(Math.max(0, LUXURY_TAX_THRESHOLD - luxuryTaxPayroll)),
    taxOverage: roundMoney(Math.max(0, luxuryTaxPayroll - LUXURY_TAX_THRESHOLD)),
    projectedTax: calculateLuxuryTax(luxuryTaxPayroll),
  };
}
