import type { SeasonArchiveEntry } from '@mbd/contracts';
import type { HistorySeasonView } from '@/workers/sim.worker.narrative';

interface SeasonFinancialsPanelProps {
  seasonView: HistorySeasonView;
  teamName: (teamId: string | null) => string;
  formatMoney: (value: number | null | undefined) => string;
}

function isFullSeasonArchive(view: HistorySeasonView): view is SeasonArchiveEntry {
  return 'playoffSeries' in view;
}

export default function SeasonFinancialsPanel({
  seasonView,
  teamName,
  formatMoney,
}: SeasonFinancialsPanelProps): JSX.Element {
  return (
    <div className="space-y-3">
      {isFullSeasonArchive(seasonView) ? seasonView.financials.map((entry) => (
        <div key={entry.teamId} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-heading text-sm text-dynasty-text">{teamName(entry.teamId)}</div>
            <div className="font-data text-xs text-dynasty-muted">{formatMoney(entry.payroll)}</div>
          </div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">Budget {formatMoney(entry.budget)}</div>
        </div>
      )) : (
        <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
          Detailed payroll archives were compressed for this season.
        </div>
      )}
    </div>
  );
}
