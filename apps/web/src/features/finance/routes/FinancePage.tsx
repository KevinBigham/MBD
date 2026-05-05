import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle, StatLine } from '@mbd/ui';
import { DollarSign, TrendingDown, TrendingUp, Users, Briefcase } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { RatingBadge } from '@/shared/components/RatingBadge';

interface ContractEntry {
  playerId: string;
  name: string;
  position: string;
  rosterStatus: string;
  displayRating: number;
  letterGrade: string;
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

type SortKey = 'name' | 'position' | 'displayRating' | 'annualSalary' | 'yearsRemaining';
type SortDir = 'asc' | 'desc';

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

export default function FinancePage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, season, day, phase } = useGameStore();
  const [data, setData] = useState<FinanceData | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('annualSalary');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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

  const sortedContracts = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.contracts];
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
        case 'displayRating':
          cmp = a.displayRating - b.displayRating;
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
  }, [data, sortKey, sortDir]);

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

      {/* Contract Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
            <Users className="h-4 w-4 text-accent-info" />
            Player Contracts ({sortedContracts.length})
          </CardTitle>
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
                    className="cursor-pointer px-3 py-2 text-center font-heading text-xs uppercase tracking-wider text-dynasty-muted hover:text-dynasty-text"
                    onClick={() => handleSort('displayRating')}
                  >
                    OVR{sortIndicator('displayRating')}
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
                    <td className="px-3 py-2 text-center">
                      <RatingBadge value={c.displayRating} grade={c.letterGrade} size="sm" />
                    </td>
                    <td className="px-3 py-2 text-right font-data text-sm text-dynasty-text">{formatDollars(c.annualSalary)}</td>
                    <td className="px-3 py-2 text-center font-data text-sm text-dynasty-text">{c.yearsRemaining}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant={c.rosterStatus === 'MLB' ? 'default' : 'outline'} className="text-[10px]">
                        {c.rosterStatus}
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
