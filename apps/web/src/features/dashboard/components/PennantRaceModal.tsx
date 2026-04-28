import { useCallback, useEffect, useState } from 'react';
import { Flame, Trophy, X } from 'lucide-react';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { useWorker } from '@/shared/hooks/useWorker';

export interface PennantRaceDetailTeam {
  teamId: string;
  abbreviation: string;
  name: string;
  wins: number;
  losses: number;
  pct: number;
  gamesBack: number;
  streak: string;
  projectedWins: number;
}

export interface PennantRaceDetailDivision {
  division: string;
  divisionLabel: string;
  teams: PennantRaceDetailTeam[];
}

export interface PennantRaceDetailWildcardTeam extends PennantRaceDetailTeam {
  inWildcard: boolean;
}

export interface PennantRaceDetailWildcard {
  league: 'AL' | 'NL';
  leagueLabel: string;
  teams: PennantRaceDetailWildcardTeam[];
}

export interface PennantRaceDetailView {
  season: number;
  day: number;
  gamesRemaining: number;
  divisions: PennantRaceDetailDivision[];
  wildcards: PennantRaceDetailWildcard[];
}

interface PennantRaceModalProps {
  onDismiss: () => void;
}

function streakClasses(streak: string): string {
  if (streak.startsWith('W')) return 'text-accent-success';
  if (streak.startsWith('L')) return 'text-accent-danger';
  return 'text-dynasty-muted';
}

function formatGB(gb: number): string {
  if (gb === 0) return '-';
  if (Number.isInteger(gb)) return gb.toString();
  return gb.toFixed(1);
}

function formatPct(pct: number): string {
  return pct.toFixed(3).replace(/^0\./, '.');
}

export default function PennantRaceModal({ onDismiss }: PennantRaceModalProps) {
  const { getPennantRaceDetail, isReady } = useWorker();
  const [view, setView] = useState<PennantRaceDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const fetchView = useCallback(async () => {
    if (!isReady || typeof getPennantRaceDetail !== 'function') {
      setView(null);
      setLoading(false);
      return;
    }
    try {
      const data = await getPennantRaceDetail();
      setView((data as PennantRaceDetailView | null) ?? null);
      setErrored(false);
    } catch {
      setView(null);
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, [getPennantRaceDetail, isReady]);

  useEffect(() => {
    void fetchView();
  }, [fetchView]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pennant-race-modal-title"
      onClick={onDismiss}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-dynasty-border bg-dynasty-elevated shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-dynasty-border/70 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent-danger" />
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
                Pennant Race Board
              </div>
            </div>
            <h2
              id="pennant-race-modal-title"
              className="mt-1 font-heading text-lg font-semibold text-dynasty-textBright"
            >
              {view ? `Season ${view.season} · Day ${view.day}` : 'Pennant Race Board'}
            </h2>
            {view ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-data text-[11px] text-dynasty-text">
                <span>
                  <span className="text-dynasty-muted">Games remaining </span>
                  <span className="text-dynasty-textBright">{view.gamesRemaining}</span>
                </span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-dynasty-border/70 bg-dynasty-surface/70 text-dynasty-muted transition hover:bg-dynasty-surface hover:text-dynasty-textBright"
            aria-label="Close pennant race board"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="font-heading text-sm text-dynasty-muted">Loading pennant race board...</div>
          ) : errored ? (
            <div className="rounded-lg border border-accent-danger/40 bg-accent-danger/5 p-3 font-heading text-sm text-accent-danger">
              Could not load pennant race data. Try again from the dashboard.
            </div>
          ) : !view ? (
            <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
              No pennant race data available yet.
            </div>
          ) : view.divisions.length === 0 && view.wildcards.length === 0 ? (
            <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
              Races will unfold once teams have played enough games to separate the standings.
            </div>
          ) : (
            <div className="space-y-4">
              {view.divisions.length > 0 ? (
                <div className="space-y-3">
                  <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                    Divisions
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {view.divisions.map((div) => (
                      <DivisionBlock key={div.division} division={div} />
                    ))}
                  </div>
                </div>
              ) : null}

              {view.wildcards.length > 0 ? (
                <div className="space-y-3">
                  <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                    Wildcard Picture
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {view.wildcards.map((wc) => (
                      <WildcardBlock key={wc.league} wildcard={wc} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DivisionBlock({ division }: { division: PennantRaceDetailDivision }) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-center gap-1.5">
        <Trophy className="h-3.5 w-3.5 text-accent-warning" />
        <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
          {division.divisionLabel}
        </div>
      </div>
      <ul className="mt-2 space-y-1">
        {division.teams.map((team, idx) => {
          const isLeader = idx === 0;
          return (
            <li
              key={team.teamId}
              className={`flex items-center gap-2 rounded px-1.5 py-1 ${
                isLeader ? 'bg-accent-warning/10' : ''
              }`}
            >
              <span className="w-4 font-data text-[10px] text-dynasty-muted">{idx + 1}</span>
              <TeamLogo teamId={team.teamId} size="xs" />
              <span
                className={`font-heading text-xs ${
                  isLeader ? 'font-semibold text-dynasty-textBright' : 'text-dynasty-text'
                }`}
              >
                {team.abbreviation}
              </span>
              <span className="font-data text-[11px] text-dynasty-text">
                {team.wins}-{team.losses}
              </span>
              <span className="font-data text-[10px] text-dynasty-muted">{formatPct(team.pct)}</span>
              <span className={`font-data text-[10px] ${streakClasses(team.streak)}`}>
                {team.streak}
              </span>
              <span className="ml-auto flex items-center gap-2 font-data text-[10px] text-dynasty-muted">
                <span>{isLeader ? '-' : `${formatGB(team.gamesBack)} GB`}</span>
                <span className="hidden sm:inline">
                  <span className="text-dynasty-muted/80">proj </span>
                  <span className="text-dynasty-text">{team.projectedWins}</span>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WildcardBlock({ wildcard }: { wildcard: PennantRaceDetailWildcard }) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
        {wildcard.leagueLabel} League
      </div>
      <ul className="mt-2 space-y-1">
        {wildcard.teams.map((team, idx) => (
          <li
            key={team.teamId}
            className={`flex items-center gap-2 rounded border-l-2 px-1.5 py-1 ${
              team.inWildcard ? 'border-accent-success/60' : 'border-dynasty-border/40'
            }`}
          >
            <span className="w-4 font-data text-[10px] text-dynasty-muted">{idx + 1}</span>
            <TeamLogo teamId={team.teamId} size="xs" />
            <span
              className={`font-heading text-xs ${
                team.inWildcard ? 'font-semibold text-dynasty-textBright' : 'text-dynasty-text'
              }`}
            >
              {team.abbreviation}
            </span>
            <span className="font-data text-[11px] text-dynasty-text">
              {team.wins}-{team.losses}
            </span>
            <span className={`font-data text-[10px] ${streakClasses(team.streak)}`}>
              {team.streak}
            </span>
            <span className="ml-auto flex items-center gap-2 font-data text-[10px] text-dynasty-muted">
              <span className={team.inWildcard ? 'text-accent-success' : ''}>
                {team.inWildcard ? 'In' : `${formatGB(team.gamesBack)} GB`}
              </span>
              <span className="hidden sm:inline">
                <span className="text-dynasty-muted/80">proj </span>
                <span className="text-dynasty-text">{team.projectedWins}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
