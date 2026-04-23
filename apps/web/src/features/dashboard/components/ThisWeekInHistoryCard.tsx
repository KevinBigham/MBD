import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Flag } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';

// "This Week in History" surfaces signature moments from strictly-prior
// seasons whose `day` falls within ±DAY_WINDOW of the current day. Mirrors the
// narrative payoff of a franchise that remembers its own past — e.g. "2 years
// ago today, Rodriguez threw a no-hitter against Boston." Reads persisted
// state only; no schema change.

interface HistoricalMomentShape {
  season: number;
  day?: number;
  description: string;
  type: string;
  isPlayoff: boolean;
  relevance: number;
}

interface HistoricalPlayerEntry {
  kind: 'player';
  playerId: string;
  playerName: string;
  teamId: string;
  yearsAgo: number;
  moment: HistoricalMomentShape;
}

interface HistoricalTeamEntry {
  kind: 'team';
  teamId: string;
  yearsAgo: number;
  moment: HistoricalMomentShape;
}

type HistoricalEntry = HistoricalPlayerEntry | HistoricalTeamEntry;

const DAY_WINDOW = 3;
const MAX_VISIBLE = 6;

function teamDisplayName(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId;
}

function entryKey(entry: HistoricalEntry): string {
  const base = `${entry.moment.type}-${entry.moment.season}-${entry.moment.day ?? 0}`;
  return entry.kind === 'player' ? `p-${entry.playerId}-${base}` : `t-${entry.teamId}-${base}`;
}

function yearsAgoLabel(yearsAgo: number): string {
  if (yearsAgo <= 0) return 'This season';
  if (yearsAgo === 1) return '1 year ago today';
  return `${yearsAgo} years ago today`;
}

export default function ThisWeekInHistoryCard() {
  const worker = useWorker();
  const { day, season } = useGameStore();
  const [entries, setEntries] = useState<HistoricalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!worker.isReady || typeof worker.getThisWeekInHistory !== 'function') {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await worker.getThisWeekInHistory(DAY_WINDOW);
      const playerEntries: HistoricalEntry[] = (data?.playerMoments ?? []).map((entry) => ({
        kind: 'player',
        playerId: entry.playerId,
        playerName: entry.playerName,
        teamId: entry.teamId,
        yearsAgo: entry.yearsAgo,
        moment: entry.moment as HistoricalMomentShape,
      }));
      const teamEntries: HistoricalEntry[] = (data?.teamMoments ?? []).map((entry) => ({
        kind: 'team',
        teamId: entry.teamId,
        yearsAgo: entry.yearsAgo,
        moment: entry.moment as HistoricalMomentShape,
      }));

      const merged = [...playerEntries, ...teamEntries].sort((left, right) =>
        left.yearsAgo - right.yearsAgo
        || right.moment.relevance - left.moment.relevance
        || left.kind.localeCompare(right.kind)
        || left.moment.type.localeCompare(right.moment.type),
      );

      setEntries(merged.slice(0, MAX_VISIBLE));
    } finally {
      setLoading(false);
    }
  }, [worker]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory, day, season]);

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-accent-info" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">This Week in History</h2>
      </div>

      {loading ? (
        <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
          No franchise history matches this week yet. Come back after a full season.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {entries.map((entry) => (entry.kind === 'player'
            ? <PlayerEntry key={entryKey(entry)} entry={entry} />
            : <TeamEntry key={entryKey(entry)} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}

function PlayerEntry({ entry }: { entry: HistoricalPlayerEntry }) {
  return (
    <Link
      to={`/players/${entry.playerId}?tab=moments`}
      className="block rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 transition-colors hover:border-accent-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {entry.teamId ? <TeamLogo teamId={entry.teamId} size="xs" /> : null}
            <span className="truncate font-heading text-sm text-dynasty-textBright">{entry.playerName}</span>
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-text">
            {entry.moment.description}
          </div>
          <div className="mt-2 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            {yearsAgoLabel(entry.yearsAgo)}
            {' '}&middot; Season {entry.moment.season}
            {entry.moment.day != null ? ` · Day ${entry.moment.day}` : ''}
            {entry.moment.isPlayoff ? ' · Playoffs' : ''}
          </div>
        </div>
      </div>
    </Link>
  );
}

function TeamEntry({ entry }: { entry: HistoricalTeamEntry }) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Flag className="h-3.5 w-3.5 text-accent-info" />
            <TeamLogo teamId={entry.teamId} size="xs" />
            <span className="truncate font-heading text-sm text-dynasty-textBright">{teamDisplayName(entry.teamId)}</span>
            <span className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Franchise</span>
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-text">
            {entry.moment.description}
          </div>
          <div className="mt-2 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            {yearsAgoLabel(entry.yearsAgo)}
            {' '}&middot; Season {entry.moment.season}
            {entry.moment.day != null ? ` · Day ${entry.moment.day}` : ''}
            {entry.moment.isPlayoff ? ' · Playoffs' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
