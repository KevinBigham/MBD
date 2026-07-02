import { TrendingUp } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { formatMoney } from './financePresentation';

interface FinanceFutureCommitmentsPanelProps {
  futureCommitments: readonly number[];
  totalPayroll: number;
}

export function FinanceFutureCommitmentsPanel({
  futureCommitments,
  totalPayroll,
}: FinanceFutureCommitmentsPanelProps) {
  return (
    <DensePanel
      title="Future Commitments"
      icon={<TrendingUp className="h-4 w-4 text-accent-primary" />}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dynasty-border">
              {futureCommitments.map((_, index) => (
                <th key={index} className="px-4 py-2 text-center font-heading text-xs uppercase tracking-wider text-dynasty-muted">
                  Year {index + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {futureCommitments.map((amount, index) => (
                <td key={index} className="px-4 py-3 text-center">
                  <div className="font-data text-sm font-semibold text-dynasty-text">{formatMoney(amount)}</div>
                  <div className="mx-auto mt-1 h-1.5 w-full max-w-[80px] overflow-hidden rounded-full bg-dynasty-border">
                    <div
                      className="h-full rounded-full bg-accent-primary"
                      style={{
                        width: `${Math.min(100, (amount / Math.max(1, totalPayroll)) * 100)}%`,
                      }}
                    />
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </DensePanel>
  );
}
