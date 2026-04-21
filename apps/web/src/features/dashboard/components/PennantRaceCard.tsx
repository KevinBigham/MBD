import { useCallback, useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { useWorker } from '@/shared/hooks/useWorker';

type Heat = 'tight' | 'close' | 'comfortable';

interface RaceTeam {
  teamId: string;
  abbreviation: string;
  name: string;
  wins: number;
  losses: number;
  streak: string;
}

interface DivisionRace {
  division: string;
  divisionLabel: string;
  leader: RaceTeam;
  chaser: RaceTeam | null;
  gamesBack: number;
  magicNumber: number | null;
  heat: Heat;
}

interface WildcardTeam extends RaceTeam {
  gamesBack: number;
  inWildcard: boolean;
}

interface WildcardRace {
  league: 'AL' | 'NL';
  leagueLabel: string;
  teams: WildcardTeam[];
}

interface PennantRaceView {
  season: number;
  day: number;
  gamesRemaining: number;
  divisionRaces: DivisionRace[];
  wildcardRaces: WildcardRace[];
}

function heatBadgeClasses(heat: Heat): string {
  switch (heat) {
    case 'tight':
      return 'bg-accent-danger/20 text-accent-danger animate-pulse';
    case 'close':
      return 'bg-accent-warning/20 text-accent-warning';
    case 'comfortable':
      return 'bg-accent-info/20 text-accent-info';
  }
}

function heatLabel(heat: Heat): string {
  switch (heat) {
    case 'tight':
      return 'Tight';
    case 'close':
      return 'Close';
    case 'comfortable':
      return 'Comfortable';
  }
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

export default function PennantRaceCard() {
  const { getPennantRaces, isReady } = useWorker();
  const [view, setView] = useState<PennantRaceView | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchView = useCallback(async () => {
    try {
      const data = (await getPennantRaces()) as PennantRaceView;
      setView(data);
    } catch {
      // Silently handle — card is non-critical intel
    } finally {
      setLoading(false);
    }
  }, [getPennantRaces]);

  useEffect(() => {
    if (isReady) {
      fetchView();
    }
  }, [isReady, fetchView]);

  const divisionRaces = view?.divisionRaces ?? [];
  const wildcardRaces = view?.wildcardRaces ?? [];
  const totalRaces = divisionRaces.length + wildcardRaces.length;

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-accent-danger" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
          Pennant Race Heat
        </h2>
        {totalRaces > 0 && (
          <span className="ml-auto rounded-full bg-accent-danger/20 px-2 py-0.5 font-data text-[11px] font-medium text-accent-danger">
            {totalRaces}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>
      ) : totalRaces === 0 ? (
        <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
          No tight races yet. Divisions and wildcard bubbles appear here once the standings
          separate.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {divisionRaces.length > 0 && (
            <div className="space-y-2">
              <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                Division Races
              </div>
              {divisionRaces.map((race) => (
                <div
                  key={race.division}
                  className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                      {race.divisionLabel}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-data text-[10px] font-medium uppercase tracking-wider ${heatBadgeClasses(race.heat)}`}
                    >
                      {heatLabel(race.heat)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <TeamLogo teamId={race.leader.teamId} size="xs" />
                    <span className="font-heading text-sm text-dynasty-textBright">
                      {race.leader.abbreviation}
                    </span>
                    <span className="font-data text-xs text-dynasty-text">
                      {race.leader.wins}-{race.leader.losses}
                    </span>
                    <span className={`font-data text-xs ${streakClasses(race.leader.streak)}`}>
                      {race.leader.streak}
                    </span>
                    {race.magicNumber !== null && (
                      <span className="ml-auto rounded-full bg-accent-info/15 px-2 py-0.5 font-data text-[10px] font-medium uppercase tracking-wider text-accent-info">
                        M{race.magicNumber}
                      </span>
                    )}
                  </div>

                  {race.chaser && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <TeamLogo teamId={race.chaser.teamId} size="xs" />
                      <span className="font-heading text-sm text-dynasty-text">
                        {race.chaser.abbreviation}
                      </span>
                      <span className="font-data text-xs text-dynasty-text">
                        {race.chaser.wins}-{race.chaser.losses}
                      </span>
                      <span className={`font-data text-xs ${streakClasses(race.chaser.streak)}`}>
                        {race.chaser.streak}
                      </span>
                      <span className="ml-auto font-data text-xs text-dynasty-muted">
                        {formatGB(race.gamesBack)} GB
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {wildcardRaces.length > 0 && (
            <div className="space-y-2">
              <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                Wildcard Bubble
              </div>
              {wildcardRaces.map((race) => (
                <div
                  key={race.league}
                  className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3"
                >
                  <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                    {race.leagueLabel} League
                  </div>
                  <div className="mt-2 space-y-1">
                    {race.teams.map((team, idx) => (
                      <div
                        key={team.teamId}
                        className={`flex items-center gap-2 rounded border-l-2 py-0.5 pl-2 ${
                          team.inWildcard
                            ? 'border-accent-success/60'
                            : 'border-dynasty-border/40'
                        }`}
                      >
                        <span className="w-4 font-data text-[10px] text-dynasty-muted">
                          {idx + 1}
                        </span>
                        <TeamLogo teamId={team.teamId} size="xs" />
                        <span
                          className={`font-heading text-sm ${
                            team.inWildcard
                              ? 'text-dynasty-textBright'
                              : 'text-dynasty-text'
                          }`}
                        >
                          {team.abbreviation}
                        </span>
                        <span className="font-data text-xs text-dynasty-text">
                          {team.wins}-{team.losses}
                        </span>
                        <span className={`font-data text-xs ${streakClasses(team.streak)}`}>
                          {team.streak}
                        </span>
                        <span className="ml-auto font-data text-xs text-dynasty-muted">
                          {team.inWildcard ? 'In' : `${formatGB(team.gamesBack)} GB`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
