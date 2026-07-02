import { ProgressFill } from '@/shared/components/ProgressFill';

export interface FinancialCardBodyProps {
  payroll: number;
  budget: number;
  luxuryTax: number;
  annualBudget?: number;
  payrollCap?: number;
}

export default function FinancialCardBody({
  payroll,
  budget,
  luxuryTax,
  annualBudget,
  payrollCap,
}: FinancialCardBodyProps) {
  const targetBudget = payrollCap ?? annualBudget ?? budget;
  const spendRate = targetBudget > 0 ? Math.min(100, (payroll / targetBudget) * 100) : 0;

  return (
    <>
      <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">Payroll vs target</div>
          <div className="font-data text-sm text-dynasty-textBright">${payroll.toFixed(1)}M</div>
        </div>
        <div className="mt-3">
          <ProgressFill toneClassName={spendRate >= 90 ? 'bg-accent-warning' : 'bg-accent-success'} value={spendRate} />
        </div>
        <div className="mt-2 font-heading text-xs text-dynasty-muted">
          Budget target ${targetBudget.toFixed(1)}M
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
          <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">Budget room</div>
          <div className="mt-2 font-data text-2xl text-dynasty-textBright">${Math.max(0, budget - payroll).toFixed(1)}M</div>
        </div>
        <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
          <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">Luxury tax</div>
          <div className={`mt-2 font-data text-2xl ${luxuryTax > 0 ? 'text-accent-warning' : 'text-accent-success'}`}>
            {luxuryTax > 0 ? `$${luxuryTax.toFixed(1)}M` : 'Clear'}
          </div>
        </div>
      </div>
    </>
  );
}
