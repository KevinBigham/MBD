import { Badge } from '@mbd/ui';
import { Users } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { minorLevelLabel } from '@/shared/lib/labels';
import {
  formatDollars,
  type FinanceContractEntry,
} from './financePresentation';

export type FinanceContractSortKey = 'name' | 'position' | 'annualSalary' | 'yearsRemaining';
export type FinanceContractFilter = 'mlb' | 'minors' | 'expiring' | 'high_salary' | 'clauses' | 'extension_priority' | 'all';

interface FinanceContractTablePanelProps {
  contracts: readonly FinanceContractEntry[];
  visibleContracts: readonly FinanceContractEntry[];
  contractFilter: FinanceContractFilter;
  contractFilterCounts: Record<FinanceContractFilter, number>;
  onContractFilterChange: (filter: FinanceContractFilter) => void;
  onSort: (key: FinanceContractSortKey) => void;
  sortIndicator: (key: FinanceContractSortKey) => string;
}

const CONTRACT_FILTERS: FinanceContractFilter[] = [
  'mlb',
  'minors',
  'expiring',
  'high_salary',
  'clauses',
  'extension_priority',
  'all',
];

function filterLabel(filter: FinanceContractFilter): string {
  switch (filter) {
    case 'mlb':
      return 'MLB';
    case 'minors':
      return 'Minors';
    case 'expiring':
      return 'Expiring';
    case 'high_salary':
      return 'High Salary';
    case 'clauses':
      return 'NTC/PO';
    case 'extension_priority':
      return 'Extension Priority';
    case 'all':
      return 'Full List';
  }
}

export function FinanceContractTablePanel({
  contracts,
  visibleContracts,
  contractFilter,
  contractFilterCounts,
  onContractFilterChange,
  onSort,
  sortIndicator,
}: FinanceContractTablePanelProps) {
  return (
    <DensePanel
      title={`Player Contracts (${visibleContracts.length}/${contracts.length})`}
      icon={<Users className="h-4 w-4 text-accent-info" />}
      meta={(
        <div className="flex flex-wrap gap-2">
          {CONTRACT_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              data-mobile-critical-control="finance-contract-filter"
              onClick={() => onContractFilterChange(filter)}
              className={`mobile-critical-control focus-ring rounded border px-3 py-1.5 font-heading text-[11px] uppercase tracking-wide transition-colors ${
                contractFilter === filter
                  ? 'border-accent-info/60 bg-accent-info/10 text-accent-info'
                  : 'border-dynasty-border text-dynasty-muted hover:border-accent-info/40 hover:text-accent-info'
              }`}
            >
              {filterLabel(filter)} · {contractFilterCounts[filter] ?? 0}
            </button>
          ))}
        </div>
      )}
    >
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="contract-table">
            <thead>
              <tr className="border-b border-dynasty-border">
                <th
                  className="cursor-pointer px-3 py-2 text-left font-heading text-xs uppercase tracking-wider text-dynasty-muted hover:text-dynasty-text"
                  onClick={() => onSort('name')}
                >
                  Player{sortIndicator('name')}
                </th>
                <th
                  className="cursor-pointer px-3 py-2 text-center font-heading text-xs uppercase tracking-wider text-dynasty-muted hover:text-dynasty-text"
                  onClick={() => onSort('position')}
                >
                  Pos{sortIndicator('position')}
                </th>
                <th
                  className="cursor-pointer px-3 py-2 text-right font-heading text-xs uppercase tracking-wider text-dynasty-muted hover:text-dynasty-text"
                  onClick={() => onSort('annualSalary')}
                >
                  Gross / Net{sortIndicator('annualSalary')}
                </th>
                <th
                  className="cursor-pointer px-3 py-2 text-center font-heading text-xs uppercase tracking-wider text-dynasty-muted hover:text-dynasty-text"
                  onClick={() => onSort('yearsRemaining')}
                >
                  Years{sortIndicator('yearsRemaining')}
                </th>
                <th className="px-3 py-2 text-center font-heading text-xs uppercase tracking-wider text-dynasty-muted">
                  Status
                </th>
                <th className="px-3 py-2 text-center font-heading text-xs uppercase tracking-wider text-dynasty-muted">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleContracts.map((contract) => (
                <tr key={contract.playerId} className="border-b border-dynasty-border/50 hover:bg-dynasty-elevated/30">
                  <td className="px-3 py-2 font-heading text-sm text-dynasty-text">{contract.name}</td>
                  <td className="px-3 py-2 text-center font-data text-xs uppercase text-dynasty-muted">{contract.position}</td>
                  <td className="px-3 py-2 text-right font-data text-sm text-dynasty-text">
                    <div>{formatDollars(contract.annualSalary)} gross</div>
                    <div className={contract.salaryCredit > 0 ? 'text-accent-success' : 'text-dynasty-muted'}>
                      {formatDollars(contract.effectiveAnnualSalary)} net
                      {contract.salaryCredit > 0 ? ` · ${formatDollars(contract.salaryCredit)} credit` : ''}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center font-data text-sm text-dynasty-text">{contract.yearsRemaining}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant={contract.rosterStatus === 'MLB' ? 'default' : 'outline'} className="text-[10px]">
                      {minorLevelLabel(contract.rosterStatus)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {contract.noTradeClause && (
                        <Badge variant="warning" className="text-[10px]">NTC</Badge>
                      )}
                      {contract.playerOption && (
                        <Badge variant="info" className="text-[10px]">PO</Badge>
                      )}
                      {contract.yearsRemaining === 1 && contract.teamOption && (
                        <Badge variant="info" className="text-[10px]">Team option after this season</Badge>
                      )}
                      {contract.yearsRemaining === 1 && !contract.teamOption && (
                        <Badge variant="warning" className="text-[10px]">Expiring after this season</Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </DensePanel>
  );
}
