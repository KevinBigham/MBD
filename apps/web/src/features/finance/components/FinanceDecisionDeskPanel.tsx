import { Briefcase } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { minorLevelLabel } from '@/shared/lib/labels';
import {
  formatMoney,
  isExtensionPriorityContract,
  type FinanceContractEntry,
} from './financePresentation';

export type { FinanceContractEntry } from './financePresentation';

interface FinanceDecisionDeskPanelProps {
  contracts: readonly FinanceContractEntry[];
}

function FinanceTriageList({
  title,
  empty,
  entries,
  detail,
}: {
  title: string;
  empty: string;
  entries: readonly FinanceContractEntry[];
  detail: (contract: FinanceContractEntry) => string;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
      <div className="font-heading text-xs uppercase tracking-wide text-dynasty-muted">{title}</div>
      <div className="mt-3 space-y-2">
        {entries.length > 0 ? entries.map((contract) => (
          <div key={`${title}-${contract.playerId}`} className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
            <div className="font-heading text-sm text-dynasty-textBright">{contract.name}</div>
            <div className="mt-1 font-heading text-xs text-dynasty-muted">
              {contract.position} · {minorLevelLabel(contract.rosterStatus)} · {detail(contract)}
            </div>
          </div>
        )) : (
          <div className="font-heading text-sm text-dynasty-muted">{empty}</div>
        )}
      </div>
    </div>
  );
}

export function FinanceDecisionDeskPanel({
  contracts,
}: FinanceDecisionDeskPanelProps) {
  const expiringContracts = [...contracts]
    .filter((contract) => contract.yearsRemaining <= 1 && !contract.teamOption)
    .sort((left, right) => right.annualSalary - left.annualSalary)
    .slice(0, 3);
  const clauseContracts = [...contracts]
    .filter((contract) => contract.noTradeClause || contract.playerOption)
    .sort((left, right) => right.annualSalary - left.annualSalary)
    .slice(0, 3);
  const extensionPriorityContracts = [...contracts]
    .filter((contract) => isExtensionPriorityContract(contract))
    .sort((left, right) => left.yearsRemaining - right.yearsRemaining || right.annualSalary - left.annualSalary)
    .slice(0, 3);

  return (
    <DensePanel
      title="Finance Decision Desk"
      icon={<Briefcase className="h-4 w-4 text-accent-info" />}
    >
      <div className="grid gap-3 lg:grid-cols-3">
        <FinanceTriageList
          title="Expiring Money"
          empty="No expiring contracts need attention."
          entries={expiringContracts}
          detail={(contract) => `${formatMoney(contract.annualSalary)} clears after this season`}
        />
        <FinanceTriageList
          title="Clause Watch"
          empty="No no-trade or player-option clauses in the current view."
          entries={clauseContracts}
          detail={(contract) => [
            contract.noTradeClause ? 'No-trade protection' : null,
            contract.playerOption ? 'Player option' : null,
          ].filter(Boolean).join(' · ')}
        />
        <FinanceTriageList
          title="Extension Priority"
          empty="No obvious extension-priority contracts right now."
          entries={extensionPriorityContracts}
          detail={(contract) => `${contract.yearsRemaining} year${contract.yearsRemaining === 1 ? '' : 's'} left at ${formatMoney(contract.annualSalary)}`}
        />
      </div>
    </DensePanel>
  );
}
