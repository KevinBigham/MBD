import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { ResponsiveTable, type ColumnDef } from '@/shared/components/ResponsiveTable';

interface PlayerDTO {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  position: string;
  overallRating: number;
  displayRating: number;
  letterGrade: string;
  rosterStatus: string;
  teamId: string;
  stats: {
    pa: number;
    ab: number;
    hits: number;
    hr: number;
    rbi: number;
    bb: number;
    k: number;
    avg: string;
    ip: number;
    earnedRuns: number;
    strikeouts: number;
    walks: number;
    era: string;
  } | null;
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-accent-success/20 text-accent-success';
    case 'B': return 'bg-accent-info/20 text-accent-info';
    case 'C': return 'bg-accent-warning/20 text-accent-warning';
    case 'D': return 'bg-accent-danger/20 text-accent-danger';
    default:  return 'bg-dynasty-border text-dynasty-muted';
  }
}

export default function PlayersPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized } = useGameStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerDTO[]>([]);
  const [defaultPlayers, setDefaultPlayers] = useState<PlayerDTO[]>([]);

  const fetchDefaults = useCallback(async () => {
    if (!isInitialized || !worker.isReady) return;
    const leaders = await worker.getLeagueLeaders('hr', 50);
    setDefaultPlayers(leaders as PlayerDTO[]);
  }, [isInitialized, workerReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDefaults();
  }, [fetchDefaults]);

  useEffect(() => {
    if (!query || !worker.isReady) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const found = await worker.searchPlayers(query, 30);
      setResults(found as PlayerDTO[]);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, workerReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const players = query ? results : defaultPlayers;
  const navigate = useNavigate();

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
        <span className={`inline-block w-6 rounded text-center text-xs font-bold ${gradeColor(p.letterGrade)}`}>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dynasty-muted" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search players by name..."
          className="w-full rounded-lg border border-dynasty-border bg-dynasty-surface py-2.5 pl-10 pr-4 font-heading text-sm text-dynasty-text placeholder:text-dynasty-muted focus:border-accent-primary focus:outline-none"
        />
      </div>

      {/* Results — responsive table/cards */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-2 md:p-0">
        <ResponsiveTable
          data={players}
          columns={columns}
          keyExtractor={(p) => p.id}
          onRowClick={(p) => navigate(`/players/${p.id}`)}
          emptyMessage={query ? 'No players found' : 'Sim games to see player stats'}
        />
      </div>
    </div>
  );
}
