import { Link } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { TeamLogo } from '@/shared/components/TeamLogo';

export interface HistoricalMomentShape {
  season: number;
  day?: number;
  description: string;
  type: string;
  isPlayoff: boolean;
  relevance: number;
}

export interface HistoricalPlayerEntry {
  kind: 'player';
  playerId: string;
  playerName: string;
  teamId: string;
  yearsAgo: number;
  moment: HistoricalMomentShape;
}

export interface HistoricalTeamEntry {
  kind: 'team';
  teamId: string;
  teamName: string;
  yearsAgo: number;
  moment: HistoricalMomentShape;
}

export type HistoricalEntry = HistoricalPlayerEntry | HistoricalTeamEntry;

interface ThisWeekInHistoryCardBodyProps {
  loading: boolean;
  entries: HistoricalEntry[];
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

export default function ThisWeekInHistoryCardBody({
  loading,
  entries,
}: ThisWeekInHistoryCardBodyProps) {
  if (loading) {
    return <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
        No franchise history matches this week yet. Come back after a full season.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {entries.map((entry) => (entry.kind === 'player'
        ? <PlayerEntry key={entryKey(entry)} entry={entry} />
        : <TeamEntry key={entryKey(entry)} entry={entry} />
      ))}
    </div>
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
            {entry.moment.day != null ? (
              <>
                {' '}&middot; Day {entry.moment.day}
              </>
            ) : null}
            {entry.moment.isPlayoff ? (
              <>
                {' '}&middot; Playoffs
              </>
            ) : null}
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
            <span className="truncate font-heading text-sm text-dynasty-textBright">{entry.teamName}</span>
            <span className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Franchise</span>
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-text">
            {entry.moment.description}
          </div>
          <div className="mt-2 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            {yearsAgoLabel(entry.yearsAgo)}
            {' '}&middot; Season {entry.moment.season}
            {entry.moment.day != null ? (
              <>
                {' '}&middot; Day {entry.moment.day}
              </>
            ) : null}
            {entry.moment.isPlayoff ? (
              <>
                {' '}&middot; Playoffs
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
