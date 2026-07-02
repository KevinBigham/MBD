import type { SeasonArchiveEntry } from '@mbd/contracts';
import type { HistorySeasonView } from '@/workers/sim.worker.narrative';

interface SeasonDraftPanelProps {
  seasonView: HistorySeasonView;
  teamName: (teamId: string | null) => string;
}

function isFullSeasonArchive(view: HistorySeasonView): view is SeasonArchiveEntry {
  return 'playoffSeries' in view;
}

export default function SeasonDraftPanel({
  seasonView,
  teamName,
}: SeasonDraftPanelProps): JSX.Element {
  return (
    <div className="space-y-3">
      {isFullSeasonArchive(seasonView) && seasonView.draftClass.length > 0 ? seasonView.draftClass.map((pick) => (
        <div key={pick.playerId} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-heading text-sm text-dynasty-text">Pick {pick.pickNumber} · {pick.playerName}</div>
            <div className="font-data text-xs text-dynasty-muted">{teamName(pick.teamId)}</div>
          </div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">{pick.currentStatus}</div>
        </div>
      )) : (
        <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
          {isFullSeasonArchive(seasonView)
            ? 'No draft class has been archived for this season yet.'
            : 'Detailed draft logs were archived for this season.'}
        </div>
      )}
    </div>
  );
}
