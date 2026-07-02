import type { TeamChemistry } from '@mbd/contracts';
import { PageHelp } from '@/shared/components/PageHelp';
import { humanizeLabel } from '@/shared/lib/labels';

interface RosterStatusPanelProps {
  activeRosterCount: number;
  actionMessage: string | null;
  chemistry: TeamChemistry | null;
}

function chemistryTone(tier: string): string {
  switch (tier) {
    case 'electric': return 'text-accent-success';
    case 'connected': return 'text-accent-info';
    case 'steady': return 'text-dynasty-text';
    case 'tense': return 'text-accent-warning';
    default: return 'text-accent-danger';
  }
}

export function RosterStatusPanel({
  activeRosterCount,
  actionMessage,
  chemistry,
}: RosterStatusPanelProps) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-dynasty-text">Roster</h1>
          <p className="font-data text-sm text-dynasty-muted">
            {activeRosterCount} players on active roster
          </p>
        </div>
        <PageHelp pageKey="roster" />
      </div>

      {actionMessage ? (
        <div className="rounded-lg border border-accent-warning/40 bg-accent-warning/10 px-4 py-3 font-heading text-sm text-accent-warning">
          {actionMessage}
        </div>
      ) : null}

      {chemistry && (
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="font-heading text-xs uppercase text-dynasty-muted">Clubhouse chemistry</div>
              <div className="mt-1 flex items-end gap-3">
                <div className={`font-data text-4xl font-bold ${chemistryTone(chemistry.tier)}`}>
                  {chemistry.score}
                </div>
                <div className="pb-1 font-heading text-sm text-dynasty-muted">
                  {humanizeLabel(chemistry.tier)} | {humanizeLabel(chemistry.trend)}
                </div>
              </div>
              <div className="mt-2 font-heading text-sm text-dynasty-text">
                {chemistry.summary}
              </div>
            </div>
            <div className="grid gap-2 text-sm">
              {chemistry.reasons.map((reason) => (
                <div key={reason} className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-dynasty-muted">
                  {reason}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
