import { Link } from 'react-router-dom';
import { Flame, Sparkles, Trophy } from 'lucide-react';

export interface AwardEntry {
  playerId: string;
  playerName: string;
  teamId: string;
  teamAbbreviation: string;
  teamName: string;
  score: number;
  statCallout: string;
}

export interface AwardBoard {
  mvp: AwardEntry[];
  cyYoung: AwardEntry[];
  roy: AwardEntry[];
}

type AwardKey = 'mvp' | 'cyYoung' | 'roy';

const AWARD_META: Array<{ key: AwardKey; label: string; icon: typeof Trophy }> = [
  { key: 'mvp', label: 'MVP', icon: Trophy },
  { key: 'cyYoung', label: 'Cy Young', icon: Flame },
  { key: 'roy', label: 'Rookie of the Year', icon: Sparkles },
];

export default function AwardRaceCardBody({
  loading,
  al,
  nl,
}: {
  loading: boolean;
  al: AwardBoard;
  nl: AwardBoard;
}) {
  const hasAnyEntries = AWARD_META.some(({ key }) => al[key].length > 0 || nl[key].length > 0);

  if (loading) {
    return <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>;
  }

  if (!hasAnyEntries) {
    return (
      <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
        Award races surface once enough of the season has been played for sample sizes to stabilize.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {AWARD_META.map(({ key, label, icon: Icon }) => {
        const alEntries = al[key];
        const nlEntries = nl[key];
        if (alEntries.length === 0 && nlEntries.length === 0) return null;

        return (
          <div key={key}>
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-accent-warning" />
              <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                {label}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              <LeagueColumn leagueLabel="AL" entries={alEntries} />
              <LeagueColumn leagueLabel="NL" entries={nlEntries} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeagueColumn({ leagueLabel, entries }: { leagueLabel: string; entries: AwardEntry[] }) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
        {leagueLabel}
      </div>
      {entries.length === 0 ? (
        <div className="mt-2 font-data text-[11px] text-dynasty-muted">No qualified candidates</div>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {entries.map((entry, idx) => (
            <AwardRow key={entry.playerId} rank={idx + 1} entry={entry} />
          ))}
        </ol>
      )}
    </div>
  );
}

function AwardRow({ rank, entry }: { rank: number; entry: AwardEntry }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="shrink-0 font-data text-[11px] font-medium text-dynasty-muted">
          {rank}.
        </span>
        <Link
          to={`/players/${entry.playerId}`}
          className="truncate font-heading text-xs text-dynasty-textBright hover:text-accent-primary"
        >
          {entry.playerName}
        </Link>
        <span className="shrink-0 font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
          {entry.teamAbbreviation}
        </span>
      </div>
      <span className="shrink-0 font-data text-[10px] text-dynasty-muted">
        {entry.statCallout}
      </span>
    </li>
  );
}
