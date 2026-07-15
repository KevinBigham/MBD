import { Link } from 'react-router-dom';
import { ArrowUpDown, Filter, Search } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { gradeTextColor } from '@/shared/lib/grade';

export interface FreeAgencyMarketAgent {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  age: number;
  displayRating: number;
  letterGrade: string;
  marketValue: number;
  demandLevel: string;
  qualifyingOffer?: {
    formerTeamId: string;
    formerTeamName: string;
    requiresCompensation: boolean;
    forfeitedPick: {
      season: number;
      round: number;
      originalTeamId: string;
    } | null;
    blockedReason: string | null;
  } | null;
}

export type PositionFilter = 'all' | 'hitters' | 'pitchers';
export type DemandFilter = 'all' | 'elite' | 'high' | 'moderate' | 'low' | 'fringe';
export type SortKey = 'marketValue' | 'displayRating' | 'age' | 'name';

interface FreeAgencyMarketBoardPanelProps {
  agents: readonly FreeAgencyMarketAgent[];
  positionFilter: PositionFilter;
  demandFilter: DemandFilter;
  sortKey: SortKey;
  sortDesc: boolean;
  searchQuery: string;
  selectedPlayerId: string | null;
  onPositionFilterChange: (filter: PositionFilter) => void;
  onDemandFilterChange: (filter: DemandFilter) => void;
  onSortKeyChange: (key: SortKey) => void;
  onSearchQueryChange: (query: string) => void;
  onSelectPlayer: (agent: FreeAgencyMarketAgent) => void;
}

function demandColor(level: string): string {
  switch (level) {
    case 'elite': return 'bg-accent-success/20 text-accent-success';
    case 'high': return 'bg-accent-info/20 text-accent-info';
    case 'moderate': return 'bg-accent-warning/20 text-accent-warning';
    case 'low': return 'bg-dynasty-border text-dynasty-muted';
    default: return 'bg-dynasty-border text-dynasty-muted';
  }
}

export default function FreeAgencyMarketBoardPanel({
  agents,
  positionFilter,
  demandFilter,
  sortKey,
  sortDesc,
  searchQuery,
  selectedPlayerId,
  onPositionFilterChange,
  onDemandFilterChange,
  onSortKeyChange,
  onSearchQueryChange,
  onSelectPlayer,
}: FreeAgencyMarketBoardPanelProps) {
  return (
    <div className="space-y-4 lg:col-span-2">
      <div className="flex flex-wrap gap-2">
        {(['all', 'hitters', 'pitchers'] as PositionFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            data-mobile-critical-control="free-agency-position-filter"
            onClick={() => onPositionFilterChange(filter)}
            className={`mobile-critical-control rounded px-3 py-1.5 font-heading text-xs capitalize transition-colors ${
              positionFilter === filter
                ? 'bg-accent-primary text-white'
                : 'bg-dynasty-surface text-dynasty-muted hover:text-dynasty-text'
            }`}
          >
            <Filter className="mr-1 inline h-3 w-3" />
            {filter}
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-lg border border-dynasty-border bg-dynasty-surface p-4 lg:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-dynasty-muted" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search name or position..."
            className="w-full rounded border border-dynasty-border bg-dynasty-elevated py-2 pl-9 pr-3 font-heading text-sm text-dynasty-text outline-none focus:border-accent-primary"
          />
        </label>
        <select
          data-mobile-critical-control="free-agency-demand-filter"
          value={demandFilter}
          onChange={(event) => onDemandFilterChange(event.target.value as DemandFilter)}
          className="mobile-critical-control rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-sm text-dynasty-text outline-none focus:border-accent-primary"
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
              data-mobile-critical-control="free-agency-sort"
              onClick={() => onSortKeyChange(key)}
              className={`mobile-critical-control rounded border px-3 py-2 font-heading text-xs ${
                sortKey === key
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                  : 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted hover:text-dynasty-text'
              }`}
            >
              <ArrowUpDown className="mr-1 inline h-3 w-3" />
              {label}
              {sortKey === key ? (sortDesc ? ' ↓' : ' ↑') : ''}
            </button>
          ))}
        </div>
      </div>

      <DensePanel title={`Available Free Agents (${agents.length})`} bodyClassName="p-0">
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
              {agents.map((agent) => (
                <tr
                  key={agent.id}
                  className={`border-b border-dynasty-border/50 text-sm transition-colors hover:bg-dynasty-elevated ${
                    selectedPlayerId === agent.id ? 'bg-accent-primary/10' : ''
                  }`}
                >
                  <td className="px-4 py-2 font-heading font-medium text-dynasty-text">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <button
                        type="button"
                        aria-pressed={selectedPlayerId === agent.id}
                        aria-label={`Select ${agent.firstName} ${agent.lastName} for a contract offer`}
                        onClick={() => onSelectPlayer(agent)}
                        className="rounded text-left hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                      >
                        {agent.firstName} {agent.lastName}
                      </button>
                      <Link
                        to={`/players/${agent.id}`}
                        aria-label={`View ${agent.firstName} ${agent.lastName} profile`}
                        className="font-data text-[10px] uppercase tracking-wide text-dynasty-muted hover:text-accent-primary"
                      >
                        Profile
                      </Link>
                    </div>
                    {agent.qualifyingOffer ? (
                      <div className="mt-0.5 font-data text-[10px] font-semibold uppercase tracking-wide text-accent-warning">
                        QO attached
                      </div>
                    ) : null}
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
              {agents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-heading text-sm text-dynasty-muted">
                    No free agents available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DensePanel>
    </div>
  );
}
