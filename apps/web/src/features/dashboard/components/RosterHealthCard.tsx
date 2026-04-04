import { HeartPulse } from 'lucide-react';

interface FatigueWarningView {
  playerId: string;
  name: string;
  position: string;
  fatigueScore: number;
  summary: string;
}

interface RosterHealthCardProps {
  injuredCount: number;
  nextReturnDays: number | null;
  fatigueWarnings: FatigueWarningView[];
}

export default function RosterHealthCard({
  injuredCount,
  nextReturnDays,
  fatigueWarnings,
}: RosterHealthCardProps) {
  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <HeartPulse className="h-4 w-4 text-accent-danger" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Roster Health</h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
          <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">Active injuries</div>
          <div className="mt-2 font-data text-3xl text-dynasty-textBright">{injuredCount}</div>
          <div className="mt-2 font-heading text-xs text-dynasty-muted">
            {nextReturnDays != null ? `${nextReturnDays} days until the next return.` : 'No players are currently on the shelf.'}
          </div>
        </div>
        <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
          <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">Fatigue watch</div>
          <div className="mt-2 font-data text-3xl text-dynasty-textBright">{fatigueWarnings.length}</div>
          <div className="mt-2 font-heading text-xs text-dynasty-muted">
            Top three starters trending toward heavy workloads.
          </div>
        </div>
      </div>

      <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
        {fatigueWarnings.length > 0 ? fatigueWarnings.map((warning) => (
          <div key={warning.playerId} className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-heading text-sm text-dynasty-textBright">{warning.name}</div>
              <div className="font-data text-sm text-accent-warning">{warning.fatigueScore.toFixed(1)}</div>
            </div>
            <div className="mt-1 font-heading text-xs text-dynasty-muted">{warning.position} · {warning.summary}</div>
          </div>
        )) : (
          <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
            No fatigue warnings are flashing right now.
          </div>
        )}
      </div>
    </section>
  );
}
