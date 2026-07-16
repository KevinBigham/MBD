import { ProgressFill } from '@/shared/components/ProgressFill';
import type { OwnerPayrollPolicy } from '@mbd/sim-core';

export interface FinancialCardBodyProps {
  payroll: number;
  budget: number;
  budgetRoom?: number;
  luxuryTax: number;
  annualBudget?: number;
  payrollCap?: number;
  ownerPayrollPolicy?: OwnerPayrollPolicy;
}

export default function FinancialCardBody({
  payroll,
  budget,
  budgetRoom,
  luxuryTax,
  annualBudget,
  payrollCap,
  ownerPayrollPolicy,
}: FinancialCardBodyProps) {
  const targetBudget = ownerPayrollPolicy?.softCeiling ?? payrollCap ?? annualBudget ?? budget;
  const spendRate = targetBudget > 0 ? Math.min(100, (payroll / targetBudget) * 100) : 0;
  const ownerBand = ownerPayrollPolicy?.ownerBand === 'below_floor'
    ? 'Below owner floor'
    : ownerPayrollPolicy?.ownerBand === 'above_soft_ceiling'
      ? 'Above soft ceiling'
      : 'Inside owner plan';
  const signedBudgetRoom = budgetRoom ?? budget - payroll;
  const ownerPlanTone = ownerPayrollPolicy?.ownerBand === 'on_plan'
    ? 'bg-accent-success'
    : ownerPayrollPolicy
      ? 'bg-accent-warning'
      : spendRate >= 90
        ? 'bg-accent-warning'
        : 'bg-accent-success';

  return (
    <>
      <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">Payroll vs owner plan</div>
          <div className="font-data text-sm text-dynasty-textBright">${payroll.toFixed(1)}M</div>
        </div>
        <div className="mt-3">
          <ProgressFill toneClassName={ownerPlanTone} value={spendRate} />
        </div>
        <div className="mt-2 font-heading text-xs text-dynasty-muted">
          {ownerPayrollPolicy
            ? `${ownerBand} · Floor $${ownerPayrollPolicy.floor.toFixed(1)}M · Soft ceiling $${ownerPayrollPolicy.softCeiling.toFixed(1)}M`
            : `Budget target $${targetBudget.toFixed(1)}M`}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
          <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">Budget room</div>
          <div className={`mt-2 font-data text-2xl ${signedBudgetRoom < 0 ? 'text-accent-danger' : 'text-dynasty-textBright'}`}>
            {signedBudgetRoom < 0
              ? `$${Math.abs(signedBudgetRoom).toFixed(1)}M over budget`
              : `$${signedBudgetRoom.toFixed(1)}M remaining`}
          </div>
        </div>
        <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
          <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">Projected tax exposure</div>
          <div className={`mt-2 font-data text-2xl ${luxuryTax > 0 ? 'text-accent-warning' : 'text-accent-success'}`}>
            {luxuryTax > 0 ? `$${luxuryTax.toFixed(1)}M` : 'Clear'}
          </div>
          {ownerPayrollPolicy ? (
            <div className="mt-1 font-heading text-xs text-dynasty-muted">
              Tax payroll ${ownerPayrollPolicy.luxuryTaxPayroll.toFixed(1)}M · Line ${ownerPayrollPolicy.taxThreshold.toFixed(1)}M
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
