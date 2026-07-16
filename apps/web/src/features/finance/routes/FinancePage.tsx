import { Badge } from '@mbd/ui';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { FinanceContractTablePanel } from '../components/FinanceContractTablePanel';
import { FinanceDecisionDeskPanel } from '../components/FinanceDecisionDeskPanel';
import { FinanceFutureCommitmentsPanel } from '../components/FinanceFutureCommitmentsPanel';
import { FinanceSummaryCardsPanel } from '../components/FinanceSummaryCardsPanel';
import { formatMoney } from '../components/financePresentation';
import { useFinanceRouteData } from '../hooks/useFinanceRouteData';

function taxStatusVariant(taxpayer: boolean): 'success' | 'warning' {
  return taxpayer ? 'warning' : 'success';
}

export default function FinancePage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, season, day, phase } = useGameStore();
  const {
    contractFilter,
    contractFilterCounts,
    data,
    handleSort,
    setContractFilter,
    sortIndicator,
    visibleContracts,
  } = useFinanceRouteData({
    day,
    getFinanceOverview: worker.getFinanceOverview,
    isInitialized,
    phase,
    season,
    workerReady,
  });

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="font-data text-sm text-dynasty-muted">Loading finance data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-dynasty-text">Finance</h1>
          <p className="font-data text-sm text-dynasty-muted">
            Payroll breakdown, luxury tax exposure, and contract obligations.
          </p>
        </div>
        <Badge variant={taxStatusVariant(data.ownerPayrollPolicy.taxBand === 'taxpayer')} className="uppercase">
          {data.ownerPayrollPolicy.taxBand === 'taxpayer'
            ? `${formatMoney(data.ownerPayrollPolicy.taxOverage)} over tax line`
            : data.ownerPayrollPolicy.taxRoom > 0
              ? `${formatMoney(data.ownerPayrollPolicy.taxRoom)} below tax line`
              : 'At tax line · $0.00M projected exposure'}
        </Badge>
      </div>

      <FinanceSummaryCardsPanel
        budget={data.budget}
        budgetRoom={data.budgetRoom}
        coachingPayroll={data.coachingPayroll}
        luxuryTax={data.luxuryTax}
        luxuryTaxPayroll={data.luxuryTaxPayroll}
        minorsPayroll={data.minorsPayroll}
        mlbPayroll={data.mlbPayroll}
        ownerPayrollPolicy={data.ownerPayrollPolicy}
        totalPayroll={data.totalPayroll}
      />

      <FinanceFutureCommitmentsPanel
        futureCommitments={data.futureCommitments}
        totalPayroll={data.totalPayroll}
      />

      <FinanceDecisionDeskPanel
        contracts={data.contracts}
      />

      <FinanceContractTablePanel
        contractFilter={contractFilter}
        contractFilterCounts={contractFilterCounts}
        contracts={data.contracts}
        onContractFilterChange={setContractFilter}
        onSort={handleSort}
        sortIndicator={sortIndicator}
        visibleContracts={visibleContracts}
      />
    </div>
  );
}
