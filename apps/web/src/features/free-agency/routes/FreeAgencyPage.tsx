import { Suspense, lazy, useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpDown, DollarSign, Search, TrendingUp, User, Filter,
} from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import { getAudioEngine } from '@/shared/lib/audio';
import { gradeTextColor } from '@/shared/lib/grade';

const MarketIntelPanel = lazy(() => import('../components/MarketIntelPanel'));

interface FreeAgentRow {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  age: number;
  displayRating: number;
  letterGrade: string;
  marketValue: number;
  demandLevel: string;
}

interface RawFreeAgentRow {
  id?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  age?: number;
  displayRating?: number;
  letterGrade?: string;
  marketValue?: number;
  demandLevel?: string;
  player?: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    age: number;
    overallRating: number;
  };
}

interface FinanceOverview {
  totalPayroll: number;
  budget: number;
  capSpace: number;
}

type PositionFilter = 'all' | 'hitters' | 'pitchers';
type DemandFilter = 'all' | 'elite' | 'high' | 'moderate' | 'low' | 'fringe';
type SortKey = 'marketValue' | 'displayRating' | 'age' | 'name';

const HITTER_POS = new Set(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH']);

function demandColor(level: string): string {
  switch (level) {
    case 'elite': return 'bg-accent-success/20 text-accent-success';
    case 'high': return 'bg-accent-info/20 text-accent-info';
    case 'moderate': return 'bg-accent-warning/20 text-accent-warning';
    case 'low': return 'bg-dynasty-border text-dynasty-muted';
    default: return 'bg-dynasty-border text-dynasty-muted';
  }
}

function normalizeFreeAgent(row: RawFreeAgentRow): FreeAgentRow {
  if (row.player) {
    return {
      id: row.player.id,
      firstName: row.player.firstName,
      lastName: row.player.lastName,
      position: row.player.position,
      age: row.player.age,
      displayRating: Math.round(row.player.overallRating / 5),
      letterGrade: row.letterGrade ?? 'B',
      marketValue: row.marketValue ?? 0,
      demandLevel: row.demandLevel ?? 'moderate',
    };
  }

  return {
    id: row.id ?? '',
    firstName: row.firstName ?? 'Unknown',
    lastName: row.lastName ?? 'Player',
    position: row.position ?? 'UTIL',
    age: row.age ?? 0,
    displayRating: row.displayRating ?? 0,
    letterGrade: row.letterGrade ?? 'C',
    marketValue: row.marketValue ?? 0,
    demandLevel: row.demandLevel ?? 'moderate',
  };
}

function money(value: number): string {
  return `$${value.toFixed(1)}M`;
}

export default function FreeAgencyPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { phase, isInitialized, season } = useGameStore();
  const autosaveActiveGame = useActiveSaveAutosave();
  const [agents, setAgents] = useState<FreeAgentRow[]>([]);
  const [filter, setFilter] = useState<PositionFilter>('all');
  const [demandFilter, setDemandFilter] = useState<DemandFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('marketValue');
  const [sortDesc, setSortDesc] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [finance, setFinance] = useState<FinanceOverview | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<FreeAgentRow | null>(null);
  const [offerYears, setOfferYears] = useState(3);
  const [offerSalary, setOfferSalary] = useState(10);
  const [offerResult, setOfferResult] = useState<string | null>(null);

  const fetchFreeAgents = useCallback(async () => {
    if (!isInitialized || !worker.isReady) return;
    try {
      const api = worker as Record<string, unknown>;
      if (typeof api.getFreeAgents === 'function') {
        const data = await (api.getFreeAgents as (limit?: number) => Promise<RawFreeAgentRow[]>)(200);
        setAgents(data.map(normalizeFreeAgent).filter((agent) => agent.id));
      }
      if (typeof api.getFinanceOverview === 'function') {
        const nextFinance = await (api.getFinanceOverview as () => Promise<FinanceOverview>)();
        setFinance(nextFinance);
      }
    } catch {
      // Worker method not available yet
    }
  }, [isInitialized, worker, workerReady]);

  useEffect(() => { fetchFreeAgents(); }, [fetchFreeAgents, phase]);

  const filteredAgents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return agents
      .filter((agent) => {
        if (filter === 'hitters' && !HITTER_POS.has(agent.position)) return false;
        if (filter === 'pitchers' && HITTER_POS.has(agent.position)) return false;
        if (demandFilter !== 'all' && agent.demandLevel !== demandFilter) return false;
        if (query) {
          const haystack = `${agent.firstName} ${agent.lastName} ${agent.position}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((left, right) => {
        let cmp = 0;
        if (sortKey === 'name') {
          cmp = `${left.lastName}, ${left.firstName}`.localeCompare(`${right.lastName}, ${right.firstName}`);
        } else {
          cmp = left[sortKey] - right[sortKey];
        }
        return sortDesc ? -cmp : cmp;
      });
  }, [agents, demandFilter, filter, searchQuery, sortDesc, sortKey]);

  const offerBudget = useMemo(() => {
    if (!finance) return null;
    const projectedPayroll = finance.totalPayroll + offerSalary;
    return {
      projectedPayroll,
      budgetRoom: finance.budget - projectedPayroll,
      taxRoom: finance.capSpace - offerSalary,
    };
  }, [finance, offerSalary]);

  const handleOffer = async () => {
    if (!selectedPlayer) return;
    try {
      const api = worker as Record<string, unknown>;
      if (typeof api.makeContractOffer === 'function') {
        const result = await (api.makeContractOffer as (id: string, y: number, s: number) => Promise<{ accepted: boolean; reason: string }>)(
          selectedPlayer.id, offerYears, offerSalary,
        );
        setOfferResult(result.accepted
          ? `Signed! ${selectedPlayer.firstName} ${selectedPlayer.lastName} joins your team.`
          : `Rejected: ${result.reason}`);
        if (result.accepted) {
          getAudioEngine().playEffect('free_agent_signed');
          setAgents(prev => prev.filter(a => a.id !== selectedPlayer.id));
          setSelectedPlayer(null);
          await autosaveActiveGame({ season });
          await fetchFreeAgents();
        }
      }
    } catch {
      setOfferResult('Contract offers not available yet.');
    }
  };

  // Pre-offseason state
  if (phase !== 'offseason' && agents.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
            Free Agency
          </h1>
          <p className="mt-1 font-heading text-sm text-dynasty-muted">
            The free agent market opens during the offseason.
          </p>
        </div>
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-8">
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <DollarSign className="h-12 w-12 text-dynasty-muted" />
            <h2 className="font-heading text-lg font-semibold text-dynasty-text">
              Market Closed
            </h2>
            <p className="max-w-md font-heading text-sm text-dynasty-muted">
              Free agency begins after the season ends. Players whose contracts
              expire will enter the open market where all teams can compete to
              sign them.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
            Free Agency
          </h1>
          <p className="mt-1 font-heading text-sm text-dynasty-muted">
            Sign available free agents to strengthen your roster.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'hitters', 'pitchers'] as PositionFilter[]).map(f => (
            <button
              key={f}
              onClick={() => {
                getAudioEngine().playEffect('tab_switch');
                setFilter(f);
              }}
              className={`rounded px-3 py-1.5 font-heading text-xs capitalize transition-colors ${
                filter === f
                  ? 'bg-accent-primary text-white'
                  : 'bg-dynasty-surface text-dynasty-muted hover:text-dynasty-text'
              }`}
            >
              <Filter className="mr-1 inline h-3 w-3" />
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-dynasty-border bg-dynasty-surface p-4 lg:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-dynasty-muted" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search name or position..."
            className="w-full rounded border border-dynasty-border bg-dynasty-elevated py-2 pl-9 pr-3 font-heading text-sm text-dynasty-text outline-none focus:border-accent-primary"
          />
        </label>
        <select
          value={demandFilter}
          onChange={(event) => setDemandFilter(event.target.value as DemandFilter)}
          className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-sm text-dynasty-text outline-none focus:border-accent-primary"
        >
          {(['all', 'elite', 'high', 'moderate', 'low', 'fringe'] as DemandFilter[]).map((value) => (
            <option key={value} value={value}>{value === 'all' ? 'All demand' : value}</option>
          ))}
        </select>
        <div className="flex gap-2">
          {([
            ['marketValue', 'Value'],
            ['displayRating', 'OVR'],
            ['age', 'Age'],
            ['name', 'Name'],
          ] as Array<[SortKey, string]>).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSortKey((current) => {
                  if (current === key) {
                    setSortDesc((value) => !value);
                    return current;
                  }
                  setSortDesc(key !== 'name');
                  return key;
                });
              }}
              className={`rounded border px-3 py-2 font-heading text-xs ${
                sortKey === key
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                  : 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted hover:text-dynasty-text'
              }`}
            >
              <ArrowUpDown className="mr-1 inline h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Free Agent Table */}
        <div className="lg:col-span-2 rounded-lg border border-dynasty-border bg-dynasty-surface">
          <div className="border-b border-dynasty-border px-4 py-3">
            <h2 className="font-heading text-sm font-semibold text-dynasty-text">
              Available Free Agents ({filteredAgents.length})
            </h2>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-dynasty-surface">
                <tr className="border-b border-dynasty-border text-xs text-dynasty-muted">
                  <th className="px-4 py-2 text-left font-heading">Player</th>
                  <th className="px-2 py-2 text-left font-heading">POS</th>
                  <th className="px-2 py-2 text-right font-data">OVR</th>
                  <th className="px-2 py-2 text-right font-data">AGE</th>
                  <th className="px-2 py-2 text-right font-data">VALUE</th>
                  <th className="px-2 py-2 text-center font-heading">DEMAND</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map(agent => (
                  <tr
                    key={agent.id}
                    onClick={() => { setSelectedPlayer(agent); setOfferResult(null); }}
                    className={`cursor-pointer border-b border-dynasty-border/50 text-sm transition-colors hover:bg-dynasty-elevated ${
                      selectedPlayer?.id === agent.id ? 'bg-accent-primary/10' : ''
                    }`}
                  >
                    <td className="px-4 py-2 font-heading font-medium text-dynasty-text">
                      <Link
                        to={`/players/${agent.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="hover:text-accent-primary"
                      >
                        {agent.firstName} {agent.lastName}
                      </Link>
                    </td>
                    <td className="px-2 py-2 font-data text-dynasty-muted">{agent.position}</td>
                    <td className={`px-2 py-2 text-right font-data font-bold ${gradeTextColor(agent.letterGrade)}`}>
                      {agent.displayRating}
                    </td>
                    <td className="px-2 py-2 text-right font-data text-dynasty-muted">{agent.age}</td>
                    <td className="px-2 py-2 text-right font-data text-dynasty-text">
                      ${agent.marketValue?.toFixed(1) ?? '?'}M
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className={`inline-block rounded px-2 py-0.5 font-data text-xs ${demandColor(agent.demandLevel)}`}>
                        {agent.demandLevel}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredAgents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center font-heading text-sm text-dynasty-muted">
                      No free agents available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Offer Panel */}
        <div className="space-y-4">
          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
            <h2 className="mb-4 font-heading text-sm font-semibold text-dynasty-text">
              Contract Offer
            </h2>
            {selectedPlayer ? (
              <div className="space-y-4">
                <div className="rounded border border-dynasty-border/50 bg-dynasty-elevated p-3">
                  <div className="flex items-center gap-3">
                    <User className="h-8 w-8 text-dynasty-muted" />
                    <div>
                      <div className="font-heading font-semibold text-dynasty-textBright">
                        {selectedPlayer.firstName} {selectedPlayer.lastName}
                      </div>
                      <div className="font-data text-xs text-dynasty-muted">
                        {selectedPlayer.position} | Age {selectedPlayer.age} | OVR {selectedPlayer.displayRating}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 font-data text-xs">
                    <TrendingUp className="h-3 w-3 text-accent-info" />
                    <span className="text-dynasty-muted">Market value:</span>
                    <span className="font-bold text-accent-primary">
                      ${selectedPlayer.marketValue?.toFixed(1) ?? '?'}M/yr
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-heading text-xs text-dynasty-muted">
                    Years: {offerYears}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={offerYears}
                    onChange={e => setOfferYears(Number(e.target.value))}
                    className="w-full accent-accent-primary"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-heading text-xs text-dynasty-muted">
                    Annual Salary: ${offerSalary}M
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={45}
                    step={0.5}
                    value={offerSalary}
                    onChange={e => setOfferSalary(Number(e.target.value))}
                    className="w-full accent-accent-primary"
                  />
                </div>

                <div className="rounded border border-dynasty-border/50 bg-dynasty-elevated p-2 font-data text-xs text-dynasty-muted">
                  Total: {money(offerYears * offerSalary)} / {offerYears}yr
                </div>

                {offerBudget && (
                  <div className="grid gap-2 rounded border border-dynasty-border/50 bg-dynasty-elevated p-3 font-data text-xs">
                    <div className="flex justify-between gap-3 text-dynasty-muted">
                      <span>Projected payroll</span>
                      <span className="text-dynasty-text">{money(offerBudget.projectedPayroll)}</span>
                    </div>
                    <div className={`flex justify-between gap-3 ${offerBudget.budgetRoom >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                      <span>Budget room</span>
                      <span>{offerBudget.budgetRoom >= 0 ? money(offerBudget.budgetRoom) : `${money(Math.abs(offerBudget.budgetRoom))} over`}</span>
                    </div>
                    <div className={`flex justify-between gap-3 ${offerBudget.taxRoom >= 0 ? 'text-accent-info' : 'text-accent-warning'}`}>
                      <span>Tax room after offer</span>
                      <span>{offerBudget.taxRoom >= 0 ? money(offerBudget.taxRoom) : `${money(Math.abs(offerBudget.taxRoom))} over`}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleOffer}
                  className="w-full rounded bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80"
                >
                  <DollarSign className="mr-1 inline h-4 w-4" />
                  Offer Contract
                </button>

                {offerResult && (
                  <div className={`rounded p-3 font-heading text-sm ${
                    offerResult.includes('Signed')
                      ? 'bg-accent-success/20 text-accent-success'
                      : 'bg-accent-danger/20 text-accent-danger'
                  }`}>
                    {offerResult}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center font-heading text-sm text-dynasty-muted">
                Select a free agent to make an offer
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Market Intelligence */}
      <Suspense fallback={null}>
        <MarketIntelPanel />
      </Suspense>
    </div>
  );
}
