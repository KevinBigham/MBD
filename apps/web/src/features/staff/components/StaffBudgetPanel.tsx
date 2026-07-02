import { Badge, StatLine } from '@mbd/ui';
import { Wallet } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { moneyLabel, type StaffBudgetView } from './staffPresentation';

interface StaffBudgetPanelProps {
  budget: StaffBudgetView | null;
}

export function StaffBudgetPanel({ budget }: StaffBudgetPanelProps) {
  return (
    <DensePanel
      title="Budget"
      icon={<Wallet className="h-4 w-4 text-accent-warning" />}
      meta={(
        <Badge variant={budget && budget.remaining >= 0 ? 'success' : 'danger'}>
          {budget ? `${moneyLabel(budget.remaining)} room` : 'Loading'}
        </Badge>
      )}
    >
      <StatLine
        stats={[
          { label: 'Payroll', value: budget ? moneyLabel(budget.payroll) : '--' },
          { label: 'Budget', value: budget ? moneyLabel(budget.budget) : '--' },
          { label: 'Remaining', value: budget ? moneyLabel(budget.remaining) : '--' },
        ]}
      />
    </DensePanel>
  );
}
