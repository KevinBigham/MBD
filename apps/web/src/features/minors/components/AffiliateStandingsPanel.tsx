import { AffiliateIdentityMark } from '@/shared/components/AffiliateIdentityMark';

export interface AffiliateStandingView {
  teamId: string;
  level: string;
  label: string;
  shortName?: string;
  identityNote?: string | null;
  wins: number;
  losses: number;
  gamesPlayed: number;
  runDifferential: number;
  topPerformer: {
    playerId: string;
    playerName: string;
    statLine: string;
  } | null;
}

export default function AffiliateStandingsPanel({
  affiliates,
}: {
  affiliates: AffiliateStandingView[];
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4 xl:col-span-2">
      <div className="font-heading text-xs uppercase text-dynasty-muted">Affiliate standings</div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {affiliates.map((affiliate) => (
          <div key={affiliate.level} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <AffiliateIdentityMark
                  teamId={affiliate.teamId}
                  level={affiliate.level}
                  label={affiliate.label}
                  shortName={affiliate.shortName}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-heading text-sm text-dynasty-text">{affiliate.label}</div>
                  <div className="font-data text-xs text-dynasty-muted">
                    {affiliate.wins}-{affiliate.losses} in {affiliate.gamesPlayed} G
                  </div>
                </div>
              </div>
              <div className={`font-data text-sm ${affiliate.runDifferential >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                {affiliate.runDifferential >= 0 ? '+' : ''}{affiliate.runDifferential}
              </div>
            </div>
            {affiliate.topPerformer ? (
              <div className="mt-3 text-sm text-dynasty-muted">
                <span className="font-heading text-dynasty-text">{affiliate.topPerformer.playerName}</span>
                {' '}| {affiliate.topPerformer.statLine}
              </div>
            ) : null}
            {affiliate.identityNote ? (
              <div className="mt-3 text-xs text-dynasty-muted">{affiliate.identityNote}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
