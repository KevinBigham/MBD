import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@mbd/ui';
import { Flame, Swords } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { PageShell } from '@/shared/components/PageShell';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';

interface RivalryEvent {
  season: number;
  type: string;
  summary: string;
}

interface Rivalry {
  id: string;
  teamA: string;
  teamB: string;
  intensity: number;
  summary: string;
  reasons: string[];
  origin: string;
  active: boolean;
  currentSeasonWinsA: number;
  currentSeasonWinsB: number;
  historicalWinsA: number;
  historicalWinsB: number;
  eventHistory: RivalryEvent[];
  closeRaceStreak: number;
  playoffSeriesStreak: number;
}

function teamAbbr(teamId: string): string {
  return getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase().slice(0, 3);
}

function teamName(teamId: string): string {
  const t = getTeamById(teamId);
  return t ? `${t.city} ${t.name}` : teamId;
}

function intensityColor(intensity: number): string {
  if (intensity >= 70) return 'bg-accent-danger';
  if (intensity >= 40) return 'bg-accent-warning';
  return 'bg-accent-info';
}

function intensityLabel(intensity: number): string {
  if (intensity >= 80) return 'HEATED';
  if (intensity >= 60) return 'INTENSE';
  if (intensity >= 40) return 'COMPETITIVE';
  return 'MILD';
}

function originTone(origin: string): string {
  switch (origin) {
    case 'historical': return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
    case 'playoff': return 'text-accent-primary bg-accent-primary/10 border-accent-primary/30';
    case 'trade': return 'text-accent-info bg-accent-info/10 border-accent-info/30';
    case 'defection': return 'text-accent-danger bg-accent-danger/10 border-accent-danger/30';
    case 'division_race': return 'text-accent-success bg-accent-success/10 border-accent-success/30';
    default: return 'text-dynasty-muted bg-dynasty-elevated border-dynasty-border';
  }
}

function HeadToHeadBar({ winsA, winsB }: { winsA: number; winsB: number }) {
  const total = winsA + winsB;
  if (total === 0) return null;
  const pctA = Math.round((winsA / total) * 100);
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full">
      <div className="bg-accent-primary transition-[width] duration-300" style={{ width: `${pctA}%` }} />
      <div className="bg-accent-danger/60 transition-[width] duration-300" style={{ width: `${100 - pctA}%` }} />
    </div>
  );
}

function RivalryCard({ r }: { r: Rivalry }) {
  const isHot = r.intensity >= 70;
  return (
    <div
      className={[
        'rounded-lg border p-4',
        isHot
          ? 'border-accent-danger/40 bg-dynasty-elevated ring-1 ring-accent-danger/20'
          : 'border-dynasty-border bg-dynasty-surface',
      ].join(' ')}
    >
      {/* Top row: teams + intensity */}
      <div className="flex items-center gap-4">
        {/* Intensity bar */}
        <div className="flex h-16 w-3 flex-col justify-end overflow-hidden rounded-full bg-dynasty-border">
          <div
            className={`${intensityColor(r.intensity)} rounded-full transition-[height] duration-500`}
            style={{ height: `${r.intensity}%` }}
          />
        </div>

        {/* Matchup */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-brand text-xl text-dynasty-textBright">{teamAbbr(r.teamA)}</span>
            <Swords className="h-4 w-4 text-dynasty-muted" />
            <span className="font-brand text-xl text-dynasty-textBright">{teamAbbr(r.teamB)}</span>
            <Badge className={[
              'ml-auto font-data text-[10px] uppercase',
              isHot ? 'border-accent-danger/40 bg-accent-danger/10 text-accent-danger' : 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted',
            ].join(' ')}>
              {intensityLabel(r.intensity)} {r.intensity}
            </Badge>
          </div>
          <p className="mt-0.5 font-data text-xs text-dynasty-muted">
            {teamName(r.teamA)} vs {teamName(r.teamB)}
          </p>
        </div>
      </div>

      {/* Origin + Streaks */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge className={originTone(r.origin)}>{r.origin.replace('_', ' ')}</Badge>
        {r.closeRaceStreak >= 3 && (
          <Badge className="border-accent-warning/40 bg-accent-warning/10 text-accent-warning">
            <Flame className="mr-0.5 inline h-3 w-3" />{r.closeRaceStreak}-season race
          </Badge>
        )}
        {r.playoffSeriesStreak >= 2 && (
          <Badge className="border-accent-primary/40 bg-accent-primary/10 text-accent-primary">
            {r.playoffSeriesStreak} playoff meetings
          </Badge>
        )}
        {!r.active && (
          <Badge className="border-dynasty-muted/40 bg-dynasty-muted/10 text-dynasty-muted">DORMANT</Badge>
        )}
      </div>

      {/* Head-to-head */}
      <div className="mt-3 space-y-1">
        <div className="flex justify-between font-data text-[10px] text-dynasty-muted">
          <span>{teamAbbr(r.teamA)} {r.historicalWinsA}W</span>
          <span>All-Time</span>
          <span>{r.historicalWinsB}W {teamAbbr(r.teamB)}</span>
        </div>
        <HeadToHeadBar winsA={r.historicalWinsA} winsB={r.historicalWinsB} />
        {(r.currentSeasonWinsA > 0 || r.currentSeasonWinsB > 0) && (
          <>
            <div className="flex justify-between font-data text-[10px] text-dynasty-muted">
              <span>{r.currentSeasonWinsA}W</span>
              <span>This Season</span>
              <span>{r.currentSeasonWinsB}W</span>
            </div>
            <HeadToHeadBar winsA={r.currentSeasonWinsA} winsB={r.currentSeasonWinsB} />
          </>
        )}
      </div>

      {/* Reasons */}
      {r.reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.reasons.map((reason, i) => (
            <span key={i} className="rounded border border-dynasty-border bg-dynasty-base px-2 py-0.5 font-data text-[10px] text-dynasty-muted">
              {reason}
            </span>
          ))}
        </div>
      )}

      {/* Summary */}
      {r.summary && (
        <p className="mt-3 font-data text-xs italic text-dynasty-muted">{r.summary}</p>
      )}

      {/* Event Timeline */}
      {r.eventHistory.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-dynasty-border pt-2">
          {r.eventHistory.slice(0, 3).map((ev, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dynasty-muted" />
              <span className="font-data text-[10px] text-dynasty-muted">
                <span className="text-dynasty-text">S{ev.season}</span> {ev.summary}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RivalriesPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, season, day, phase } = useGameStore();
  const [rivalries, setRivalries] = useState<Rivalry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    const data = await worker.getRivalries();
    setRivalries((data ?? []) as Rivalry[]);
    setLoading(false);
  }, [isInitialized, worker, workerReady]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, season, day, phase]);

  const activeCount = rivalries.filter((r) => r.active).length;

  return (
    <PageShell loading={loading}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-brand text-3xl tracking-wide text-dynasty-textBright">Rivalry Watch</h1>
          <p className="mt-1 font-data text-sm text-dynasty-muted">
            <span className="text-accent-danger">{activeCount}</span> active
            {rivalries.length > activeCount && (
              <span> of {rivalries.length} total</span>
            )}
          </p>
        </div>

        {/* Rivalries */}
        {rivalries.length === 0 ? (
          <EmptyStatePanel
            icon={Flame}
            title="No rivalries yet"
            description="Rivalries form through division races, playoff matchups, blockbuster trades, and star defections."
          />
        ) : (
          <div className="space-y-4">
            {rivalries.map((r) => (
              <RivalryCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
