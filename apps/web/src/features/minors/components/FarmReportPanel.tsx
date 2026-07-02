export interface FarmReportView {
  bondedProspects: number;
  activeSetbackCount: number;
  breakoutCandidates: Array<{
    playerId: string;
    playerName: string;
    summary: string;
  }>;
  topProspects: Array<{
    playerId: string;
    playerName: string;
    position: string;
    level: string;
    levelLabel: string;
    overallRating: number;
    ceiling: number;
    bondStrength: number;
    loyaltyModifier: number;
    milestones: string[];
    latestLineSummary: string | null;
    activeSetback: {
      type: string;
      summary: string;
      endMonth: number;
      endSeason: number;
    } | null;
  }>;
}

export default function FarmReportPanel({
  farmReport,
}: {
  farmReport: FarmReportView | null;
}) {
  const breakoutCandidates = farmReport?.breakoutCandidates ?? [];
  const topProspects = farmReport?.topProspects ?? [];

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-heading text-xs uppercase text-dynasty-muted">Farm report</div>
          <div className="mt-1 font-data text-sm text-dynasty-muted">
            {farmReport?.bondedProspects ?? 0} bonded prospects | {breakoutCandidates.length} breakout candidates | {farmReport?.activeSetbackCount ?? 0} active development signals
          </div>
        </div>
      </div>
      {breakoutCandidates.length > 0 ? (
        <div className="mt-4 rounded border border-dynasty-border bg-dynasty-elevated p-3">
          <div className="font-heading text-xs uppercase text-dynasty-muted">Breakout candidates</div>
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {breakoutCandidates.map((candidate) => (
              <div key={candidate.playerId} className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                <div className="font-heading text-sm text-dynasty-text">{candidate.playerName}</div>
                <div className="mt-1 text-xs text-dynasty-muted">{candidate.summary}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {topProspects.length > 0 ? topProspects.map((prospect) => (
          <div key={prospect.playerId} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-heading text-sm text-dynasty-text">{prospect.playerName}</div>
                <div className="mt-1 font-data text-xs text-dynasty-muted">
                  {prospect.position} | {prospect.levelLabel}
                </div>
              </div>
              <div className="text-right">
                <div className="font-data text-lg text-dynasty-text">{prospect.overallRating}</div>
                <div className="font-data text-[11px] text-dynasty-muted">Bond {prospect.bondStrength}</div>
              </div>
            </div>
            <div className="mt-3 text-sm text-dynasty-muted">
              {prospect.latestLineSummary ?? 'No stat line logged yet.'}
            </div>
            {prospect.activeSetback ? (
              <div className="mt-3 rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 text-xs text-dynasty-muted">
                {prospect.activeSetback.summary}
              </div>
            ) : null}
            {prospect.milestones.length > 0 ? (
              <div className="mt-3 text-xs text-dynasty-muted">
                {prospect.milestones.join(' | ')}
              </div>
            ) : null}
          </div>
        )) : (
          <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-4 text-sm text-dynasty-muted">
            No farm report entries available yet.
          </div>
        )}
      </div>
    </div>
  );
}
