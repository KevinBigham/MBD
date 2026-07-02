import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { ResponsiveTable, type ColumnDef } from '@/shared/components/ResponsiveTable';
import { gradeBadgeColor } from '@/shared/lib/grade';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

export interface PlayersPageContentProps {
  readonly query: string;
  readonly players: readonly PlayerDTO[];
  readonly onQueryChange: (query: string) => void;
  readonly onPlayerOpen: (playerId: string) => void;
}

export default function PlayersPageContent({
  query,
  players,
  onQueryChange,
  onPlayerOpen,
}: PlayersPageContentProps) {
  const columns = useMemo((): ColumnDef<PlayerDTO>[] => [
    {
      key: 'name',
      label: 'Player',
      primary: true,
      hideOnMobile: true,
      render: (p) => (
        <Link
          to={`/players/${p.id}`}
          className="font-heading font-medium text-dynasty-text hover:text-accent-primary"
        >
          {p.firstName} {p.lastName}
        </Link>
      ),
    },
    { key: 'pos', label: 'POS', render: (p) => <span className="text-dynasty-muted">{p.position}</span> },
    {
      key: 'team',
      label: 'Team',
      render: (p) => (
        <div className="flex items-center gap-1.5">
          <TeamLogo teamId={p.teamId} size="xs" />
          <span className="text-dynasty-muted">{p.teamId.toUpperCase()}</span>
        </div>
      ),
    },
    { key: 'ovr', label: 'OVR', className: 'text-right', highlight: true, render: (p) => p.displayRating },
    {
      key: 'grd',
      label: 'GRD',
      className: 'text-center',
      render: (p) => (
        <span className={`inline-block w-6 rounded text-center text-xs font-bold ${gradeBadgeColor(p.letterGrade)}`}>
          {p.letterGrade}
        </span>
      ),
    },
    { key: 'age', label: 'AGE', className: 'text-right', render: (p) => <span className="text-dynasty-muted">{p.age}</span> },
    { key: 'avg', label: 'AVG', className: 'text-right', render: (p) => <span className="text-dynasty-muted">{p.stats?.avg ?? '-'}</span> },
    { key: 'hr', label: 'HR', className: 'text-right', render: (p) => p.stats?.hr ?? '-' },
    { key: 'rbi', label: 'RBI', className: 'text-right', render: (p) => p.stats?.rbi ?? '-' },
  ], []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-dynasty-text">Players</h1>
        <p className="font-data text-sm text-dynasty-muted">Search and browse all players</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dynasty-muted" />
        <input
          type="text"
          data-mobile-critical-control="players-search-input"
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          placeholder="Search players or nicknames..."
          className="mobile-critical-control focus-ring w-full rounded-lg border border-dynasty-border bg-dynasty-surface py-2.5 pl-10 pr-4 text-left font-heading text-sm text-dynasty-text placeholder:text-dynasty-muted focus:border-accent-primary"
        />
      </div>

      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-2 md:p-0">
        <ResponsiveTable
          data={players}
          columns={columns}
          keyExtractor={(p) => p.id}
          onRowClick={(p) => onPlayerOpen(p.id)}
          emptyMessage={query ? 'No players found' : 'Sim games to see player stats'}
        />
      </div>
    </div>
  );
}
