import { Badge } from '@mbd/ui';
import { Flame, Swords } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import { TeamLogo } from '@/shared/components/TeamLogo';
import type { Rivalry } from '@mbd/contracts';

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
    <div
      className="flex h-3 w-full overflow-hidden rounded-full"
      data-rivalry-head-to-head-bar="true"
    >
      <div className="bg-accent-primary transition-[width] duration-300" style={{ width: `${pctA}%` }} />
      <div className="bg-accent-danger/60 transition-[width] duration-300" style={{ width: `${100 - pctA}%` }} />
    </div>
  );
}

function RivalryCard({ rivalry }: { rivalry: Rivalry }) {
  const isHot = rivalry.intensity >= 70;
  return (
    <div
      className={[
        'rounded-lg border p-4',
        isHot
          ? 'border-accent-danger/40 bg-dynasty-elevated ring-1 ring-accent-danger/20'
          : 'border-dynasty-border bg-dynasty-surface',
      ].join(' ')}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-3 flex-col justify-end overflow-hidden rounded-full bg-dynasty-border">
          <div
            className={`${intensityColor(rivalry.intensity)} rounded-full transition-[height] duration-500`}
            style={{ height: `${rivalry.intensity}%` }}
          />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <TeamLogo teamId={rivalry.teamA} size="sm" />
            <span className="font-brand text-xl text-dynasty-textBright">{teamAbbr(rivalry.teamA)}</span>
            <Swords className="h-4 w-4 text-dynasty-muted" />
            <span className="font-brand text-xl text-dynasty-textBright">{teamAbbr(rivalry.teamB)}</span>
            <TeamLogo teamId={rivalry.teamB} size="sm" />
            <Badge className={[
              'ml-auto font-data text-[10px] uppercase',
              isHot ? 'border-accent-danger/40 bg-accent-danger/10 text-accent-danger' : 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted',
            ].join(' ')}>
              {intensityLabel(rivalry.intensity)} {rivalry.intensity}
            </Badge>
          </div>
          <p className="mt-0.5 font-data text-xs text-dynasty-muted">
            {teamName(rivalry.teamA)} vs {teamName(rivalry.teamB)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge className={originTone(rivalry.origin ?? 'historical')}>
          {(rivalry.origin ?? 'historical').replace('_', ' ')}
        </Badge>
        {(rivalry.closeRaceStreak ?? 0) >= 3 && (
          <Badge className="border-accent-warning/40 bg-accent-warning/10 text-accent-warning">
            <Flame className="mr-0.5 inline h-3 w-3" />{rivalry.closeRaceStreak}-season race
          </Badge>
        )}
        {(rivalry.playoffSeriesStreak ?? 0) >= 2 && (
          <Badge className="border-accent-primary/40 bg-accent-primary/10 text-accent-primary">
            {rivalry.playoffSeriesStreak} playoff meetings
          </Badge>
        )}
        {rivalry.active === false && (
          <Badge className="border-dynasty-muted/40 bg-dynasty-muted/10 text-dynasty-muted">DORMANT</Badge>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex justify-between font-data text-[10px] text-dynasty-muted">
          <span>{teamAbbr(rivalry.teamA)} {rivalry.historicalWinsA ?? 0}W</span>
          <span>All-Time</span>
          <span>{rivalry.historicalWinsB ?? 0}W {teamAbbr(rivalry.teamB)}</span>
        </div>
        <HeadToHeadBar winsA={rivalry.historicalWinsA ?? 0} winsB={rivalry.historicalWinsB ?? 0} />
        {((rivalry.currentSeasonWinsA ?? 0) > 0 || (rivalry.currentSeasonWinsB ?? 0) > 0) && (
          <>
            <div className="flex justify-between font-data text-[10px] text-dynasty-muted">
              <span>{rivalry.currentSeasonWinsA ?? 0}W</span>
              <span>This Season</span>
              <span>{rivalry.currentSeasonWinsB ?? 0}W</span>
            </div>
            <HeadToHeadBar winsA={rivalry.currentSeasonWinsA ?? 0} winsB={rivalry.currentSeasonWinsB ?? 0} />
          </>
        )}
      </div>

      {rivalry.reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {rivalry.reasons.map((reason) => (
            <span key={reason} className="rounded border border-dynasty-border bg-dynasty-base px-2 py-0.5 font-data text-[10px] text-dynasty-muted">
              {reason}
            </span>
          ))}
        </div>
      )}

      {rivalry.summary && (
        <p className="mt-3 font-data text-xs italic text-dynasty-muted">{rivalry.summary}</p>
      )}

      {(rivalry.eventHistory?.length ?? 0) > 0 && (
        <div className="mt-3 space-y-1 border-t border-dynasty-border pt-2">
          {(rivalry.eventHistory ?? []).slice(0, 3).map((event) => (
            <div key={`${event.season}-${event.type}-${event.summary}`} className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dynasty-muted" />
              <span className="font-data text-[10px] text-dynasty-muted">
                <span className="text-dynasty-text">S{event.season}</span> {event.summary}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface RivalriesContentPanelProps {
  rivalries: Rivalry[];
}

export default function RivalriesContentPanel({ rivalries }: RivalriesContentPanelProps) {
  const activeCount = rivalries.filter((rivalry) => rivalry.active !== false).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-brand text-3xl tracking-wide text-dynasty-textBright">Rivalry Watch</h1>
        <p className="mt-1 font-data text-sm text-dynasty-muted">
          <span className="text-accent-danger">{activeCount}</span> active
          {rivalries.length > activeCount && (
            <span> of {rivalries.length} total</span>
          )}
        </p>
      </div>

      {rivalries.length === 0 ? (
        <EmptyStatePanel
          icon={Flame}
          title="No rivalries yet"
          description="Rivalries form through division races, playoff matchups, blockbuster trades, and star defections."
        />
      ) : (
        <div className="space-y-4">
          {rivalries.map((rivalry) => (
            <RivalryCard key={rivalry.id} rivalry={rivalry} />
          ))}
        </div>
      )}
    </div>
  );
}
