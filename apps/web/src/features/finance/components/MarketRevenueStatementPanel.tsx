import type { MarketRevenueStatement } from '@mbd/sim-core';
import { Building2, TrendingUp } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { formatMoney } from './financePresentation';

function signedMoney(value: number): string {
  if (value === 0) return formatMoney(0);
  return `${value > 0 ? '+' : '-'}${formatMoney(Math.abs(value))}`;
}

function signedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}

export function MarketRevenueStatementPanel({
  statement,
}: {
  statement: MarketRevenueStatement | null;
}) {
  return (
    <DensePanel
      title="Market Revenue"
      icon={<Building2 className="h-4 w-4 text-accent-primary" />}
      meta={statement ? (
        <span className="font-data text-[10px] uppercase tracking-[0.14em] text-accent-success">
          Settled
        </span>
      ) : null}
      bodyClassName="space-y-3"
    >
      {statement ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {[
              { label: `${statement.marketSize} market baseline`, value: formatMoney(statement.marketBaseline) },
              { label: `Modeled attendance · ${signedPercent(statement.attendanceRate)}`, value: signedMoney(statement.attendanceRevenue) },
              { label: `Playoff bump · ${(statement.playoffRate * 100).toFixed(1)}%`, value: signedMoney(statement.playoffRevenue) },
              { label: 'Modeled gross revenue', value: formatMoney(statement.grossRevenue) },
              { label: 'Owner allocation', value: `${statement.allocationFactor.toFixed(2)}x` },
              { label: 'Raw next-season budget', value: formatMoney(statement.annualBudget) },
              { label: 'Payroll plan', value: formatMoney(statement.payrollCap) },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-dynasty-border bg-dynasty-base p-3">
                <div className="font-data text-[10px] uppercase tracking-[0.08em] text-dynasty-muted">
                  {item.label}
                </div>
                <div className="mt-1 font-data text-sm font-semibold text-dynasty-textBright">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          <p className="font-data text-xs leading-5 text-dynasty-muted">
            The attendance effect is modeled from the completed {statement.wins}-{statement.losses} record. It is not a turnstile count or ticket ledger. Projected luxury tax remains separate and is not deducted from gross revenue.
          </p>
        </>
      ) : (
        <div className="flex items-start gap-2 rounded-md border border-dynasty-border bg-dynasty-base p-3">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-dynasty-muted" />
          <p className="font-data text-xs leading-5 text-dynasty-muted">
            The settled statement posts on the first exact Advance or Skip from a completed Season Review. Current effective gameplay budget cards remain the active operating limits until then.
          </p>
        </div>
      )}
    </DensePanel>
  );
}
