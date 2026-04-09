import type { ScoutingBriefing } from '@mbd/sim-core';

interface Props {
  data: ScoutingBriefing;
}

export function ScoutingBriefingView({ data }: Props) {
  return (
    <div className="space-y-5">
      <p className="font-heading text-sm text-dynasty-text">{data.intelNarrative}</p>

      {/* Division rivals */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Division Rivals
        </h4>
        <div className="mt-3 space-y-2">
          {data.divisionReports.map((rival) => (
            <div
              key={rival.teamId}
              className="rounded border border-dynasty-border/50 bg-dynasty-bg/40 px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-heading text-sm font-medium text-dynasty-text">
                  {rival.teamName}
                </span>
                <ThreatBadge level={rival.overallThreatLevel} />
              </div>
              <div className="mt-1.5 space-y-0.5">
                {rival.starPlayer && (
                  <p className="font-data text-[11px] text-dynasty-muted">
                    Star: {rival.starPlayer.name} ({rival.starPlayer.position}, {rival.starPlayer.rating} OVR)
                  </p>
                )}
                <p className="font-data text-[11px] text-accent-success">
                  Strength: {rival.keyStrength}
                </p>
                <p className="font-data text-[11px] text-accent-warning">
                  Weakness: {rival.exploitableWeakness}
                </p>
                <p className="font-data text-[11px] text-dynasty-muted">{rival.headToHeadOutlook}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* League threats (top 8) */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          League Power Rankings
        </h4>
        <div className="mt-3 space-y-1">
          {data.leagueThreats.slice(0, 8).map((threat, idx) => (
            <div
              key={threat.teamId}
              className="flex items-center justify-between py-1"
            >
              <div className="flex items-center gap-2">
                <span className="w-4 font-data text-xs text-dynasty-muted text-right">{idx + 1}</span>
                <span className="font-heading text-sm text-dynasty-text">{threat.teamName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-data text-xs text-dynasty-muted">
                  {threat.projectedWins}W
                </span>
                <ThreatBadge level={threat.threatLevel} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThreatBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    elite: 'bg-accent-danger/15 text-accent-danger',
    favorite: 'bg-accent-danger/15 text-accent-danger',
    dangerous: 'bg-accent-warning/15 text-accent-warning',
    contender: 'bg-accent-warning/15 text-accent-warning',
    competitive: 'bg-accent-primary/15 text-accent-primary',
    fringe: 'bg-dynasty-muted/15 text-dynasty-muted',
    rebuilding: 'bg-dynasty-muted/15 text-dynasty-muted',
    rebuilder: 'bg-dynasty-muted/15 text-dynasty-muted',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 font-data text-[10px] uppercase ${styles[level] ?? 'bg-dynasty-muted/15 text-dynasty-muted'}`}>
      {level}
    </span>
  );
}
