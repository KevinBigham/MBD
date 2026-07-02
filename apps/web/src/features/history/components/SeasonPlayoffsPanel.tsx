import type { ArchivedSeason, SeasonArchiveEntry } from '@mbd/contracts';
import type { HistorySeasonView } from '@/workers/sim.worker.narrative';

interface SeasonPlayoffsPanelProps {
  seasonView: HistorySeasonView;
  teamName: (teamId: string | null) => string;
}

function isFullSeasonArchive(view: HistorySeasonView): view is SeasonArchiveEntry {
  return 'playoffSeries' in view;
}

function formatArchivedSeasonPlayoffResult(view: ArchivedSeason): string {
  return view.playoffResult ?? (view.championshipWon ? 'Won World Series' : 'No playoff result recorded');
}

export default function SeasonPlayoffsPanel({
  seasonView,
  teamName,
}: SeasonPlayoffsPanelProps): JSX.Element {
  return (
    <div className="grid gap-3">
      {isFullSeasonArchive(seasonView) ? seasonView.playoffSeries.map((series, index) => (
        <div key={`${series.round}-${index}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-heading text-sm text-dynasty-text">{series.round}</div>
            <div className="font-data text-xs text-dynasty-muted">{series.result}</div>
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-text">
            {teamName(series.winnerTeamId)} def. {teamName(series.loserTeamId)}
          </div>
        </div>
      )) : (
        <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
          <div className="font-heading text-sm text-dynasty-text">
            {formatArchivedSeasonPlayoffResult(seasonView)}
          </div>
          <div className="mt-2 font-heading text-xs text-dynasty-muted">
            Champion: {teamName(seasonView.championTeamId)}
          </div>
        </div>
      )}
    </div>
  );
}
