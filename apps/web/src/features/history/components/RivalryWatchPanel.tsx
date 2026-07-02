import { Flame } from 'lucide-react';
import type { Rivalry } from '@mbd/contracts';
import { DensePanel } from '@/shared/components/DensePanel';
import { humanizeLabel } from '@/shared/lib/labels';

interface RivalryWatchPanelProps {
  rivalries: Rivalry[];
  teamAbbreviation: (teamId: string) => string;
  teamName: (teamId: string | null) => string;
}

export default function RivalryWatchPanel({
  rivalries,
  teamAbbreviation,
  teamName,
}: RivalryWatchPanelProps) {
  return (
    <DensePanel
      title="Rivalry Watch"
      icon={<Flame className="h-4 w-4 text-accent-warning" />}
      titleClassName="text-dynasty-textBright"
      bodyClassName="space-y-3"
    >
      {rivalries.length > 0 ? rivalries.map((rivalry) => (
        <div key={rivalry.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-heading text-sm text-dynasty-text">
              {teamName(rivalry.teamA)} vs {teamName(rivalry.teamB)}
            </div>
            <div className={`font-data text-sm ${intensityTone(rivalry.intensity)}`}>
              {rivalry.intensity}
            </div>
          </div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">
            {rivalry.summary}
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <div className="rounded border border-dynasty-border/70 px-2 py-2">
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Origin</div>
              <div className="mt-1 font-heading text-xs text-dynasty-textBright">
                {formatRivalryOrigin(rivalry.origin)}
              </div>
            </div>
            <div className="rounded border border-dynasty-border/70 px-2 py-2">
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Current season</div>
              <div className="mt-1 font-heading text-xs text-dynasty-textBright">
                {teamAbbreviation(rivalry.teamA)} {rivalry.currentSeasonWinsA ?? 0}-{rivalry.currentSeasonWinsB ?? 0} {teamAbbreviation(rivalry.teamB)}
              </div>
            </div>
            <div className="rounded border border-dynasty-border/70 px-2 py-2">
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Historical record</div>
              <div className="mt-1 font-heading text-xs text-dynasty-textBright">
                {teamAbbreviation(rivalry.teamA)} {rivalry.historicalWinsA ?? 0}-{rivalry.historicalWinsB ?? 0} {teamAbbreviation(rivalry.teamB)}
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {rivalry.reasons.map((reason) => (
              <span key={reason} className="rounded border border-dynasty-border px-2 py-1 font-heading text-[10px] uppercase text-dynasty-muted">
                {reason}
              </span>
            ))}
          </div>
        </div>
      )) : (
        <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
          Rivalries will appear once the standings tighten or postseason history starts to repeat.
        </div>
      )}
    </DensePanel>
  );
}

function intensityTone(intensity: number): string {
  if (intensity >= 75) return 'text-accent-danger';
  if (intensity >= 55) return 'text-accent-warning';
  if (intensity >= 35) return 'text-accent-info';
  return 'text-dynasty-muted';
}

function formatRivalryOrigin(origin: Rivalry['origin']): string {
  if (!origin) return 'Emergent';
  return humanizeLabel(origin);
}
