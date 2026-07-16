import { DollarSign } from 'lucide-react';
import FinancialCardBody, { type FinancialCardBodyProps } from './FinancialCardBody';

type FinancialCardProps = FinancialCardBodyProps;

export default function FinancialCard({
  payroll,
  budget,
  budgetRoom,
  luxuryTax,
  annualBudget,
  ownerPayrollPolicy,
  payrollCap,
}: FinancialCardProps) {
  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-accent-warning" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Financials</h2>
      </div>

      <FinancialCardBody
        payroll={payroll}
        budget={budget}
        budgetRoom={budgetRoom}
        luxuryTax={luxuryTax}
        annualBudget={annualBudget}
        ownerPayrollPolicy={ownerPayrollPolicy}
        payrollCap={payrollCap}
      />
    </section>
  );
}
