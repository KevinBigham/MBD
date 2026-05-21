import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle, StatLine } from '@mbd/ui';
import { DollarSign, TrendingDown, TrendingUp, Users, Briefcase } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { minorLevelLabel } from '@/shared/lib/labels';

interface ContractEntry {
  playerId: string;
  name: string;
  position: string;
  rosterStatus: string;
  annualSalary: number;
  yearsRemaining: number;
  noTradeClause: boolean;
  playerOption: boolean;
}

interface FinanceData {
  totalPayroll: number;
  mlbPayroll: number;
  minorsPayroll: number;
  luxuryTaxPayroll: number;
  luxuryTax: number;
  budget: number;
  capSpace: number;
  futureCommitments: number[];
  coachingPayroll: number;
  contracts: ContractEntry[];
}

type SortKey = 'name' | 'position' | 'annualSalary' | 'yearsRemaining';
type SortDir = 'asc' | 'desc';
type ContractFilter = 'mlb' | 'minors' | 'expiring' | 'high_salary' | 'clauses' | 'extension_priority' | 'all';

function formatDollars(millions: number): string {
  const value = millions * 1_000_000;
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

function formatMoney(millions: number): string {
  return `$${millions.toFixed(2)}M`;
}

function budgetStatusVariant(capSpace: number): 'success' | 'warning' | 'danger' {
  if (capSpace > 10) return 'success';
  if (capSpace > 0) return 'warning';
  return 'danger';
}

function budgetStatusColor(capSpace: number): string {
  if (capSpace > 10) return 'text-accent-success';
  if (capSpace > 0) return 'text-accent-warning';
  return 'text-accent-danger';
}

function contractMatchesFilter(contract: ContractEntry, filter: ContractFilter, highSalaryFloor: number): boolean {
  switch (filter) {
    case 'mlb':
      return contract.rosterStatus === 'MLB';
    case 'minors':
      return contract.rosterStatus !== 'MLB';
    case 'expiring':
      return contract.yearsRemaining <= 1;
    case 'high_salary':
      return contract.annualSalary >= highSalaryFloor;
    case 'clauses':
      return contract.noTradeClause || contract.playerOption;
    case 'extension_priority':
      return contract.rosterStatus === 'MLB' && contract.yearsRemaining <= 2 && contract.annualSalary >= 1;
    case 'all':
      return true;
  }
}

function filterLabel(filter: ContractFilter): string {
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

function FinanceTriageList({
  title,
  empty,
  entries,
  detail,
}: {
  title: string;
  empty: string;
  entries: ContractEntry[];
  detail: (contract: ContractEntry) => string;
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

export default function FinancePage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, season, day, phase } = useGameStore();
  const [data, setData] = useState<FinanceData | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('annualSalary');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [contractFilter, setContractFilter] = useState<ContractFilter>('mlb');

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const result = await worker.getFinanceOverview();
    setData(result as FinanceData);
  }, [isInitialized, worker, workerReady]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, season, day, phase]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir(key === 'name' || key === 'position' ? 'asc' : 'desc');
      return key;
    });
  }, []);

  const highSalaryFloor = useMemo(() => {
    if (!data || data.contracts.length === 0) return 15;
    const salaries = data.contracts.map((contract) => contract.annualSalary).sort((left, right) => right - left);
    return Math.max(8, salaries[Math.min(salaries.length - 1, 14)] ?? 15);
  }, [data]);

  const filteredContracts = useMemo(() => {
    if (!data) return [];
    return data.contracts.filter((contract) => contractMatchesFilter(contract, contractFilter, highSalaryFloor));
  }, [contractFilter, data, highSalaryFloor]);

  const sortedContracts = useMemo(() => {
    if (!data) return [];
    const sorted = [...filteredContracts];
    sorted.sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'position':
          cmp = a.position.localeCompare(b.position);
          break;
        case 'annualSalary':
          cmp = a.annualSalary - b.annualSalary;
          break;
        case 'yearsRemaining':
          cmp = a.yearsRemaining - b.yearsRemaining;
          break;
        default:
          cmp = 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [data, filteredContracts, sortKey, sortDir]);

  const contractFilterCounts = useMemo(() => {
    if (!data) {
      return {} as Record<ContractFilter, number>;
    }

    return {
      mlb: data.contracts.filter((contract) => contractMatchesFilter(contract, 'mlb', highSalaryFloor)).length,
      minors: data.contracts.filter((contract) => contractMatchesFilter(contract, 'minors', highSalaryFloor)).length,
      expiring: data.contracts.filter((contract) => contractMatchesFilter(contract, 'expiring', highSalaryFloor)).length,
      high_salary: data.contracts.filter((contract) => contractMatchesFilter(contract, 'high_salary', highSalaryFloor)).length,
      clauses: data.contracts.filter((contract) => contractMatchesFilter(contract, 'clauses', highSalaryFloor)).length,
      extension_priority: data.contracts.filter((contract) => contractMatchesFilter(contract, 'extension_priority', highSalaryFloor)).length,
      all: data.contracts.length,
    };
  }, [data, highSalaryFloor]);

  const sortIndicator = useCallback(
    (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : ''),
    [sortKey, sortDir],
  );

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="font-data text-sm text-dynasty-muted">Loading finance data...</div>
      </div>
    );
  }

  const overage = data.luxuryTaxPayroll > 230 ? data.luxuryTaxPayroll - 230 : 0;
  const expiringContracts = data.contracts
    .filter((contract) => contract.yearsRemaining <= 1)
    .sort((left, right) => right.annualSalary - left.annualSalary)
    .slice(0, 3);
  const clauseContracts = data.contracts
    .filter((contract) => contract.noTradeClause || contract.playerOption)
    .sort((left, right) => right.annualSalary - left.annualSalary)
    .slice(0, 3);
  const extensionPriorityContracts = data.contracts
    .filter((contract) => contractMatchesFilter(contract, 'extension_priority', highSalaryFloor))
    .sort((left, right) => left.yearsRemaining - right.yearsRemaining || right.annualSalary - left.annualSalary)
    .slice(0, 3);

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
        <Badge variant={budgetStatusVariant(data.capSpace)} className="uppercase">
          {data.capSpace >= 0 ? `${formatMoney(data.capSpace)} under tax` : `${formatMoney(Math.abs(data.capSpace))} over tax`}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-heading text-sm text-dynasty-muted">Total Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-accent-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-data text-2xl font-bold text-dynasty-text">{formatMoney(data.totalPayroll)}</div>
            <StatLine
              className="mt-2"
              stats={[
                { label: 'MLB', value: formatMoney(data.mlbPayroll) },
                { label: 'Minors', value: formatMoney(data.minorsPayroll) },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-heading text-sm text-dynasty-muted">Budget</CardTitle>
            {data.capSpace >= 0
              ? <TrendingUp className="h-4 w-4 text-accent-success" />
              : <TrendingDown className="h-4 w-4 text-accent-danger" />}
          </CardHeader>
          <CardContent>
            <div className="font-data text-2xl font-bold text-dynasty-text">{formatMoney(data.budget)}</div>
            <div className={`mt-1 font-data text-sm ${budgetStatusColor(data.budget - data.totalPayroll)}`}>
              {data.budget - data.totalPayroll >= 0
                ? `${formatMoney(data.budget - data.totalPayroll)} remaining`
                : `${formatMoney(Math.abs(data.budget - data.totalPayroll))} over budget`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-heading text-sm text-dynasty-muted">Luxury Tax</CardTitle>
            <DollarSign className="h-4 w-4 text-accent-warning" />
          </CardHeader>
          <CardContent>
            <div className="font-data text-2xl font-bold text-dynasty-text">
              {data.luxuryTax > 0 ? formatMoney(data.luxuryTax) : 'None'}
            </div>
            <StatLine
              className="mt-2"
              stats={[
                { label: 'Threshold', value: '$230.0M' },
                { label: 'Overage', value: overage > 0 ? formatMoney(overage) : '--' },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-heading text-sm text-dynasty-muted">Coaching Staff</CardTitle>
            <Briefcase className="h-4 w-4 text-accent-info" />
          </CardHeader>
          <CardContent>
            <div className="font-data text-2xl font-bold text-dynasty-text">{formatMoney(data.coachingPayroll)}</div>
            <div className="mt-1 font-data text-sm text-dynasty-muted">Staff payroll</div>
          </CardContent>
        </Card>
      </div>

      {/* Future Commitments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
            <TrendingUp className="h-4 w-4 text-accent-primary" />
            Future Commitments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dynasty-border">
                  {data.futureCommitments.map((_, i) => (
                    <th key={i} className="px-4 py-2 text-center font-heading text-xs uppercase tracking-wider text-dynasty-muted">
                      Year {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {data.futureCommitments.map((amount, i) => (
                    <td key={i} className="px-4 py-3 text-center">
                      <div className="font-data text-sm font-semibold text-dynasty-text">{formatMoney(amount)}</div>
                      <div className="mx-auto mt-1 h-1.5 w-full max-w-[80px] overflow-hidden rounded-full bg-dynasty-border">
                        <div
                          className="h-full rounded-full bg-accent-primary"
                          style={{
                            width: `${Math.min(100, (amount / Math.max(1, data.totalPayroll)) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
            <Briefcase className="h-4 w-4 text-accent-info" />
            Finance Decision Desk
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Contract Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
              <Users className="h-4 w-4 text-accent-info" />
              Player Contracts ({sortedContracts.length}/{data.contracts.length})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {(['mlb', 'minors', 'expiring', 'high_salary', 'clauses', 'extension_priority', 'all'] as ContractFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setContractFilter(filter)}
                  className={`rounded border px-3 py-1.5 font-heading text-[11px] uppercase tracking-wide transition-colors ${
                    contractFilter === filter
                      ? 'border-accent-info/60 bg-accent-info/10 text-accent-info'
                      : 'border-dynasty-border text-dynasty-muted hover:border-accent-info/40 hover:text-accent-info'
                  }`}
                >
                  {filterLabel(filter)} · {contractFilterCounts[filter] ?? 0}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="contract-table">
              <thead>
                <tr className="border-b border-dynasty-border">
                  <th
                    className="cursor-pointer px-3 py-2 text-left font-heading text-xs uppercase tracking-wider text-dynasty-muted hover:text-dynasty-text"
                    onClick={() => handleSort('name')}
                  >
                    Player{sortIndicator('name')}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2 text-center font-heading text-xs uppercase tracking-wider text-dynasty-muted hover:text-dynasty-text"
                    onClick={() => handleSort('position')}
                  >
                    Pos{sortIndicator('position')}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2 text-right font-heading text-xs uppercase tracking-wider text-dynasty-muted hover:text-dynasty-text"
                    onClick={() => handleSort('annualSalary')}
                  >
                    Salary{sortIndicator('annualSalary')}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2 text-center font-heading text-xs uppercase tracking-wider text-dynasty-muted hover:text-dynasty-text"
                    onClick={() => handleSort('yearsRemaining')}
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
                {sortedContracts.map((c) => (
                  <tr key={c.playerId} className="border-b border-dynasty-border/50 hover:bg-dynasty-elevated/30">
                    <td className="px-3 py-2 font-heading text-sm text-dynasty-text">{c.name}</td>
                    <td className="px-3 py-2 text-center font-data text-xs uppercase text-dynasty-muted">{c.position}</td>
                    <td className="px-3 py-2 text-right font-data text-sm text-dynasty-text">{formatDollars(c.annualSalary)}</td>
                    <td className="px-3 py-2 text-center font-data text-sm text-dynasty-text">{c.yearsRemaining}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant={c.rosterStatus === 'MLB' ? 'default' : 'outline'} className="text-[10px]">
                        {minorLevelLabel(c.rosterStatus)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {c.noTradeClause && (
                          <Badge variant="warning" className="text-[10px]">NTC</Badge>
                        )}
                        {c.playerOption && (
                          <Badge variant="info" className="text-[10px]">PO</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
