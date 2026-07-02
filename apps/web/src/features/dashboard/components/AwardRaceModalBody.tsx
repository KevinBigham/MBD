import { Link } from 'react-router-dom';
import { Flame, History, Sparkles, Trophy } from 'lucide-react';

export interface AwardRaceDetailEntry {
  playerId: string;
  playerName: string;
  teamId: string;
  teamAbbreviation: string;
  teamName: string;
  score: number;
  statCallout: string;
}

export interface AwardRaceDetailBoard {
  mvp: AwardRaceDetailEntry[];
  cyYoung: AwardRaceDetailEntry[];
  roy: AwardRaceDetailEntry[];
}

export interface AwardRacePriorSeasonWinner {
  award: 'mvp' | 'cyYoung' | 'roy';
  league: 'AL' | 'NL';
  season: number;
  playerId: string;
  playerName: string;
  teamId: string;
  teamAbbreviation: string;
  summary: string;
}

export interface AwardRaceDetailView {
  season: number;
  day: number;
  gamesRemaining: number;
  al: AwardRaceDetailBoard;
  nl: AwardRaceDetailBoard;
  priorSeasonWinners?: AwardRacePriorSeasonWinner[];
}

export type AwardKey = 'mvp' | 'cyYoung' | 'roy';

interface AwardRaceModalBodyProps {
  loading: boolean;
  errored: boolean;
  view: AwardRaceDetailView | null;
}

const AWARD_META: Array<{
  key: AwardKey;
  label: string;
  icon: typeof Trophy;
}> = [
  { key: 'mvp', label: 'MVP', icon: Trophy },
  { key: 'cyYoung', label: 'Cy Young', icon: Flame },
  { key: 'roy', label: 'Rookie of the Year', icon: Sparkles },
];

export function hasAwardRaceEntries(view: AwardRaceDetailView): boolean {
  return AWARD_META.some(
    ({ key }) => view.al[key].length > 0 || view.nl[key].length > 0,
  );
}

export function AwardRaceModalBody({
  loading,
  errored,
  view,
}: AwardRaceModalBodyProps) {
  if (loading) {
    return (
      <div className="font-heading text-sm text-dynasty-muted">Loading award race board...</div>
    );
  }

  if (errored) {
    return (
      <div className="rounded-lg border border-accent-danger/40 bg-accent-danger/5 p-3 font-heading text-sm text-accent-danger">
        Could not load award race data. Try again from the dashboard.
      </div>
    );
  }

  if (!view) {
    return (
      <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
        No award race data available yet.
      </div>
    );
  }

  if (!hasAwardRaceEntries(view)) {
    return (
      <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
        Award races surface once enough of the season has been played for sample sizes to stabilize.
      </div>
    );
  }

  const priorSeasonWinners = view.priorSeasonWinners ?? [];

  return (
    <div className="space-y-5">
      {priorSeasonWinners.length > 0 ? (
        <PriorSeasonContextTile winners={priorSeasonWinners} />
      ) : null}
      {AWARD_META.map(({ key, label, icon: Icon }) => {
        const alEntries = view.al[key];
        const nlEntries = view.nl[key];
        if (alEntries.length === 0 && nlEntries.length === 0) return null;

        return (
          <section key={key} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-accent-warning" />
              <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                {label}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <LeagueColumn leagueLabel="American League" entries={alEntries} />
              <LeagueColumn leagueLabel="National League" entries={nlEntries} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

function LeagueColumn({
  leagueLabel,
  entries,
}: {
  leagueLabel: string;
  entries: AwardRaceDetailEntry[];
}) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
        {leagueLabel}
      </div>
      {entries.length === 0 ? (
        <div className="mt-2 font-data text-[11px] text-dynasty-muted">
          No qualified candidates
        </div>
      ) : (
        <ol className="mt-2 space-y-1">
          {entries.map((entry, idx) => (
            <AwardRow key={entry.playerId} rank={idx + 1} entry={entry} />
          ))}
        </ol>
      )}
    </div>
  );
}

function PriorSeasonContextTile({
  winners,
}: {
  winners: AwardRacePriorSeasonWinner[];
}) {
  const priorSeason = winners[0]?.season ?? null;
  const awardOrder: Array<{ key: AwardKey; label: string }> = [
    { key: 'mvp', label: 'MVP' },
    { key: 'cyYoung', label: 'Cy Young' },
    { key: 'roy', label: 'ROY' },
  ];

  const rows: Array<{
    awardLabel: string;
    league: 'AL' | 'NL';
    winner: AwardRacePriorSeasonWinner;
  }> = [];
  for (const { key, label } of awardOrder) {
    for (const league of ['AL', 'NL'] as const) {
      const winner = winners.find((w) => w.award === key && w.league === league);
      if (winner) rows.push({ awardLabel: label, league, winner });
    }
  }

  if (rows.length === 0) return null;

  return (
    <section
      data-testid="prior-season-winners"
      className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3"
    >
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-dynasty-muted" />
        <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
          {priorSeason != null ? `Season ${priorSeason} Winners` : 'Prior Season Winners'}
        </div>
      </div>
      <ul className="mt-2 grid gap-1 md:grid-cols-2">
        {rows.map((row) => (
          <li
            key={`${row.winner.award}-${row.league}`}
            className="flex min-w-0 items-baseline gap-2 font-data text-[11px]"
          >
            <span className="shrink-0 uppercase tracking-[0.12em] text-dynasty-muted">
              {row.league} {row.awardLabel}
            </span>
            <Link
              to={`/players/${row.winner.playerId}`}
              className="truncate font-heading text-xs text-dynasty-text hover:text-accent-primary"
            >
              {row.winner.playerName}
            </Link>
            <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
              {row.winner.teamAbbreviation}
            </span>
            <span className="ml-auto truncate text-[10px] text-dynasty-muted">
              {row.winner.summary}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AwardRow({ rank, entry }: { rank: number; entry: AwardRaceDetailEntry }) {
  const isLeader = rank === 1;
  return (
    <li
      className={`flex items-center gap-2 rounded px-1.5 py-1 ${
        isLeader ? 'bg-accent-warning/10' : ''
      }`}
    >
      <span className="w-5 shrink-0 font-data text-[10px] text-dynasty-muted">{rank}.</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to={`/players/${entry.playerId}`}
            className={`truncate font-heading text-xs hover:text-accent-primary ${
              isLeader ? 'font-semibold text-dynasty-textBright' : 'text-dynasty-text'
            }`}
          >
            {entry.playerName}
          </Link>
          <span className="shrink-0 font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
            {entry.teamAbbreviation}
          </span>
        </div>
        <span className="truncate font-data text-[10px] text-dynasty-muted">
          {entry.statCallout}
        </span>
      </div>
      <span className="ml-auto shrink-0 font-data text-[10px] text-dynasty-muted">
        {entry.score.toFixed(1)}
      </span>
    </li>
  );
}
