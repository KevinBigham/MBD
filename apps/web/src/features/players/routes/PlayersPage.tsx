import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { TeamLogo } from '@/shared/components/TeamLogo';

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

      {/* Results table */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dynasty-border text-xs text-dynasty-muted">
                <th className="px-4 py-2 text-left font-heading">Player</th>
                <th className="px-2 py-2 text-left font-heading">POS</th>
                <th className="px-2 py-2 text-left font-heading">TEAM</th>
                <th className="px-2 py-2 text-right font-data">OVR</th>
                <th className="px-2 py-2 text-center font-heading">GRD</th>
                <th className="px-2 py-2 text-right font-data">AGE</th>
                <th className="px-2 py-2 text-right font-data">AVG</th>
                <th className="px-2 py-2 text-right font-data">HR</th>
                <th className="px-2 py-2 text-right font-data">RBI</th>
              </tr>
            </thead>
            <tbody>
              {players.map(player => (
                <tr key={player.id} className="border-b border-dynasty-border/50 text-sm hover:bg-dynasty-elevated">
                  <td className="px-4 py-2">
                    <Link
                      to={`/players/${player.id}`}
                      className="font-heading font-medium text-dynasty-text hover:text-accent-primary"
                    >
                      {player.firstName} {player.lastName}
                    </Link>
                  </td>
                  <td className="px-2 py-2 font-data text-dynasty-muted">{player.position}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <TeamLogo teamId={player.teamId} size="xs" />
                      <span className="font-data text-dynasty-muted">{player.teamId.toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-data text-dynasty-text">{player.displayRating}</td>
                  <td className="px-2 py-2 text-center">
                    <span className={`inline-block w-6 rounded text-center font-data text-xs font-bold ${gradeColor(player.letterGrade)}`}>
                      {player.letterGrade}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right font-data text-dynasty-muted">{player.age}</td>
                  <td className="px-2 py-2 text-right font-data text-dynasty-muted">{player.stats?.avg ?? '-'}</td>
                  <td className="px-2 py-2 text-right font-data text-dynasty-text">{player.stats?.hr ?? '-'}</td>
                  <td className="px-2 py-2 text-right font-data text-dynasty-text">{player.stats?.rbi ?? '-'}</td>
                </tr>
              ))}
              {players.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center font-heading text-sm text-dynasty-muted">
                    {query ? 'No players found' : 'Sim games to see player stats'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
