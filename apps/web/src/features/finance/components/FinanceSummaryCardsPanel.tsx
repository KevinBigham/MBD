import { StatLine } from '@mbd/ui';
import type { OwnerPayrollPolicy } from '@mbd/sim-core';
import { Briefcase, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { formatMoney } from './financePresentation';

export interface FinanceSummaryCardsPanelProps {
  totalPayroll: number;
  mlbPayroll: number;
  minorsPayroll: number;
  luxuryTaxPayroll: number;
  luxuryTax: number;
  budget: number;
  budgetRoom: number;
  coachingPayroll: number;
  retainedSalaryCharges: number;
  cashConsiderationCharges: number;
  releasedContractCharges: number;
  acquiredSalaryCredits: number;
  ownerPayrollPolicy: OwnerPayrollPolicy;
}

function budgetStatusColor(budgetRoom: number): string {
  if (budgetRoom > 10) return 'text-accent-success';
  if (budgetRoom > 0) return 'text-accent-warning';
  return 'text-accent-danger';
}

export function FinanceSummaryCardsPanel({
  totalPayroll,
  mlbPayroll,
  minorsPayroll,
  luxuryTaxPayroll,
  luxuryTax,
  budget,
  budgetRoom,
  coachingPayroll,
  retainedSalaryCharges,
  cashConsiderationCharges,
  releasedContractCharges,
  acquiredSalaryCredits,
  ownerPayrollPolicy,
}: FinanceSummaryCardsPanelProps) {
  const ownerBandLabel = ownerPayrollPolicy.ownerBand === 'below_floor'
    ? 'Below owner floor'
    : ownerPayrollPolicy.ownerBand === 'above_soft_ceiling'
      ? 'Above soft ceiling'
      : 'Inside owner plan';

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <DensePanel
        title="Total Payroll"
        icon={<DollarSign className="h-4 w-4 text-accent-primary" />}
        titleClassName="text-dynasty-muted"
      >
          <div className="font-data text-2xl font-bold text-dynasty-text">{formatMoney(totalPayroll)}</div>
          <StatLine
            className="mt-2"
            stats={[
              { label: 'MLB', value: formatMoney(mlbPayroll) },
              { label: 'Minors', value: formatMoney(minorsPayroll) },
            ]}
          />
      </DensePanel>

      <DensePanel
        title="Trade Salary Support"
        icon={<DollarSign className="h-4 w-4 text-accent-info" />}
        titleClassName="text-dynasty-muted"
      >
        <div className="font-data text-sm font-bold text-dynasty-text">
          {acquiredSalaryCredits > 0 ? `${formatMoney(acquiredSalaryCredits)} received` : 'No acquired credit'}
        </div>
        <StatLine
          className="mt-2"
          stats={[
            { label: 'Retained out', value: formatMoney(retainedSalaryCharges) },
            { label: 'Cash out', value: formatMoney(cashConsiderationCharges) },
            { label: 'Released', value: formatMoney(releasedContractCharges) },
          ]}
        />
      </DensePanel>

      <DensePanel
        title="Owner Plan"
        icon={<TrendingUp className="h-4 w-4 text-accent-primary" />}
        titleClassName="text-dynasty-muted"
      >
          <div className="font-data text-sm font-bold text-dynasty-text">{ownerBandLabel}</div>
          <StatLine
            className="mt-2"
            stats={[
              { label: 'Floor', value: formatMoney(ownerPayrollPolicy.floor) },
              { label: 'Soft ceiling', value: formatMoney(ownerPayrollPolicy.softCeiling) },
            ]}
          />
      </DensePanel>

      <DensePanel
        title="Effective Gameplay Budget"
        icon={budgetRoom >= 0
          ? <TrendingUp className="h-4 w-4 text-accent-success" />
          : <TrendingDown className="h-4 w-4 text-accent-danger" />}
        titleClassName="text-dynasty-muted"
      >
          <div className="font-data text-2xl font-bold text-dynasty-text">{formatMoney(budget)}</div>
          <div className={`mt-1 font-data text-sm ${budgetStatusColor(budgetRoom)}`}>
            {budgetRoom >= 0
              ? `${formatMoney(budgetRoom)} effective room`
              : `${formatMoney(Math.abs(budgetRoom))} over effective budget`}
          </div>
      </DensePanel>

      <DensePanel
        title="Projected Tax"
        icon={<DollarSign className="h-4 w-4 text-accent-warning" />}
        titleClassName="text-dynasty-muted"
      >
          <div className="font-data text-2xl font-bold text-dynasty-text">
            {luxuryTax > 0 ? formatMoney(luxuryTax) : 'Clear'}
          </div>
          <StatLine
            className="mt-2"
            stats={[
              { label: 'Tax payroll', value: formatMoney(luxuryTaxPayroll) },
              { label: 'Line', value: formatMoney(ownerPayrollPolicy.taxThreshold) },
              { label: 'Overage', value: ownerPayrollPolicy.taxOverage > 0 ? formatMoney(ownerPayrollPolicy.taxOverage) : '--' },
            ]}
          />
      </DensePanel>

      <DensePanel
        title="Coaching Staff"
        icon={<Briefcase className="h-4 w-4 text-accent-info" />}
        titleClassName="text-dynasty-muted"
      >
          <div className="font-data text-2xl font-bold text-dynasty-text">{formatMoney(coachingPayroll)}</div>
          <div className="mt-1 font-data text-sm text-dynasty-muted">Staff payroll</div>
      </DensePanel>
    </div>
  );
}
