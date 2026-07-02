import { humanizeLabel } from '@/shared/lib/labels';

export interface WaiverClaimView {
  playerId: string;
  playerName: string;
  fromTeamName: string;
  toTeamName: string | null;
  status: string;
  salary: number;
  priorityIndex: number | null;
}

export default function WaiverTrafficPanel({
  waiverClaims,
}: {
  waiverClaims: WaiverClaimView[];
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="font-heading text-xs uppercase text-dynasty-muted">Waiver traffic</div>
      <div className="mt-3 space-y-3">
        {waiverClaims.length > 0 ? waiverClaims.map((claim) => (
          <div key={`${claim.playerId}-${claim.status}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="font-heading text-sm text-dynasty-text">{claim.playerName}</div>
            <div className="mt-1 text-xs text-dynasty-muted">
              {humanizeLabel(claim.status)} | {claim.fromTeamName}
            </div>
            <div className="mt-2 text-xs text-dynasty-muted">
              ${claim.salary.toFixed(1)}M
              {claim.priorityIndex ? ` | Priority ${claim.priorityIndex}` : ''}
            </div>
          </div>
        )) : (
          <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-4 text-sm text-dynasty-muted">
            No recent waiver movement.
          </div>
        )}
      </div>
    </div>
  );
}
