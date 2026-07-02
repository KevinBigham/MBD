import type { SeasonArchiveEntry } from '@mbd/contracts';
import type { HistorySeasonView } from '@/workers/sim.worker.narrative';

interface SeasonTransactionsPanelProps {
  seasonView: HistorySeasonView;
}

function isFullSeasonArchive(view: HistorySeasonView): view is SeasonArchiveEntry {
  return 'playoffSeries' in view;
}

export default function SeasonTransactionsPanel({
  seasonView,
}: SeasonTransactionsPanelProps): JSX.Element {
  return (
    <div className="space-y-3">
      {isFullSeasonArchive(seasonView) ? seasonView.transactions.map((entry) => (
        <div key={entry.headline} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-heading text-sm text-dynasty-text">{entry.headline}</div>
            <div className="font-data text-xs text-dynasty-muted">{entry.impactScore.toFixed(1)} impact</div>
          </div>
          <div className="mt-2 font-heading text-xs text-dynasty-muted">{entry.summary}</div>
        </div>
      )) : (
        <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
          Detailed transaction logs were archived for this season.
        </div>
      )}
    </div>
  );
}
