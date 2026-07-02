import { StatLine } from '@mbd/ui';
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
  capSpace: number;
  coachingPayroll: number;
}

function budgetStatusColor(capSpace: number): string {
  if (capSpace > 10) return 'text-accent-success';
  if (capSpace > 0) return 'text-accent-warning';
  return 'text-accent-danger';
}

export function FinanceSummaryCardsPanel({
  totalPayroll,
  mlbPayroll,
  minorsPayroll,
  luxuryTaxPayroll,
  luxuryTax,
  budget,
  capSpace,
  coachingPayroll,
}: FinanceSummaryCardsPanelProps) {
  const budgetRoom = budget - totalPayroll;
  const taxOverage = luxuryTaxPayroll > 230 ? luxuryTaxPayroll - 230 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        title="Budget"
        icon={capSpace >= 0
          ? <TrendingUp className="h-4 w-4 text-accent-success" />
          : <TrendingDown className="h-4 w-4 text-accent-danger" />}
        titleClassName="text-dynasty-muted"
      >
          <div className="font-data text-2xl font-bold text-dynasty-text">{formatMoney(budget)}</div>
          <div className={`mt-1 font-data text-sm ${budgetStatusColor(budgetRoom)}`}>
            {budgetRoom >= 0
              ? `${formatMoney(budgetRoom)} remaining`
              : `${formatMoney(Math.abs(budgetRoom))} over budget`}
          </div>
      </DensePanel>

      <DensePanel
        title="Luxury Tax"
        icon={<DollarSign className="h-4 w-4 text-accent-warning" />}
        titleClassName="text-dynasty-muted"
      >
          <div className="font-data text-2xl font-bold text-dynasty-text">
            {luxuryTax > 0 ? formatMoney(luxuryTax) : 'None'}
          </div>
          <StatLine
            className="mt-2"
            stats={[
              { label: 'Threshold', value: '$230.0M' },
              { label: 'Overage', value: taxOverage > 0 ? formatMoney(taxOverage) : '--' },
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
