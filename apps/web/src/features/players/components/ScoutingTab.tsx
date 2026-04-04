import { Badge, Card, CardContent, CardHeader, CardTitle } from '@mbd/ui';
import type { PlayerProfileView } from './playerProfileShared';
import { labelize } from './playerProfileShared';

function StatChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-3 py-3 text-center">
      <div className="font-heading text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">{label}</div>
      <div className="mt-1 font-data text-xl font-bold text-dynasty-text">{value}</div>
    </div>
  );
}

export default function ScoutingTab({
  view,
}: {
  view: PlayerProfileView;
}) {
  if (!view.player) {
    return null;
  }

  const { player, scoutConflict, scoutingReport, scoutingHistoryNote } = view;

  if (scoutConflict) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Scout Conflict</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-accent-warning/30 bg-accent-warning/10 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning">WATCH</Badge>
                <Badge variant="outline">{scoutConflict.prospectType.toUpperCase()}</Badge>
                <div className="font-heading text-sm text-dynasty-text">{scoutConflict.headline}</div>
              </div>
              <div className="mt-2 font-heading text-sm text-dynasty-muted">
                Divergence {scoutConflict.divergence} · Resolution season {scoutConflict.resolutionSeason}
              </div>
              {scoutConflict.outcomeSummary ? (
                <div className="mt-3 rounded-lg border border-dynasty-border bg-dynasty-elevated px-3 py-3 font-heading text-sm text-dynasty-text">
                  {scoutConflict.outcomeSummary}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {scoutConflict.opinions.map((opinion) => (
                <div key={opinion.source} className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-heading text-sm text-dynasty-text">
                      {labelize(opinion.source)}
                    </div>
                    <Badge variant="info">Conf {opinion.confidence}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <StatChip label="OVR" value={String(opinion.overallGrade)} />
                    <StatChip label="Ceil" value={String(opinion.ceiling)} />
                    <StatChip label="Floor" value={String(opinion.floor)} />
                  </div>
                  <div className="mt-3 font-heading text-sm text-dynasty-muted">
                    {opinion.summary}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-accent-info/30 bg-accent-info/10 px-4 py-3 font-heading text-sm text-accent-info">
              {scoutingHistoryNote}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (scoutingReport) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Current Scouting Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  {scoutingReport.scoutName} · {scoutingReport.date}
                </div>
                <div className="mt-2 font-heading text-lg text-dynasty-text">
                  {scoutingReport.playerName} · {scoutingReport.teamName}
                </div>
                <div className="mt-1 font-heading text-sm text-dynasty-muted">
                  {scoutingReport.notes}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatChip label="OVR" value={String(scoutingReport.overall)} />
                <StatChip label="Ceil" value={String(scoutingReport.ceiling)} />
                <StatChip label="Floor" value={String(scoutingReport.floor)} />
                <StatChip label="Rel" value={`${scoutingReport.reliability}/5`} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Object.entries(scoutingReport.grades)
                .sort((left, right) => left[0].localeCompare(right[0]))
                .map(([attribute, grade]) => (
                  <StatChip key={attribute} label={labelize(attribute)} value={String(Math.round(grade))} />
                ))}
            </div>

            <div className="rounded-lg border border-accent-info/30 bg-accent-info/10 px-4 py-3 font-heading text-sm text-accent-info">
              {scoutingHistoryNote}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-dynasty-text">Scouting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
          {player.historical
            ? 'Historical scouting snapshots are not tracked in v15.'
            : 'No scouting context is available for this player right now.'}
        </div>
        <div className="rounded-lg border border-accent-info/30 bg-accent-info/10 px-4 py-3 font-heading text-sm text-accent-info">
          {scoutingHistoryNote}
        </div>
      </CardContent>
    </Card>
  );
}
