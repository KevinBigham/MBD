import { Film } from 'lucide-react';
import type { ArchivedSeason, SeasonArchiveEntry } from '@mbd/contracts';
import type { HistorySeasonView } from '@/workers/sim.worker.narrative';

interface SeasonArchiveSummaryCardProps {
  seasonView: HistorySeasonView;
  onOpenYearInReview: () => void;
}

function isArchivedSeasonView(view: HistorySeasonView | null): view is ArchivedSeason {
  return view != null && !('playoffSeries' in view);
}

function isFullSeasonArchive(view: HistorySeasonView | null): view is SeasonArchiveEntry {
  return view != null && 'playoffSeries' in view;
}

function formatSeasonViewRecord(view: HistorySeasonView | null): string {
  if (!view) {
    return 'No user summary';
  }
  if (isArchivedSeasonView(view)) {
    return view.userRecord ? `${view.userRecord.wins}-${view.userRecord.losses}` : 'No user summary';
  }
  return view.userSummary?.record ?? 'No user summary';
}

function formatSeasonViewPlayoffResult(view: HistorySeasonView | null): string {
  if (!view) {
    return 'No playoff result recorded';
  }
  if (isArchivedSeasonView(view)) {
    return view.playoffResult ?? (view.championshipWon ? 'Won World Series' : 'No playoff result recorded');
  }
  return view.userSummary?.playoffResult ?? 'No playoff result recorded';
}

function getSeasonViewTimelineEvents(view: HistorySeasonView | null): string[] {
  return isFullSeasonArchive(view) ? view.timelineEvents : [];
}

export default function SeasonArchiveSummaryCard({
  onOpenYearInReview,
  seasonView,
}: SeasonArchiveSummaryCardProps): JSX.Element {
  return (
    <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-heading text-base text-dynasty-textBright">Season {seasonView.season} Archive</div>
        <div className="flex items-center gap-3">
          {!isArchivedSeasonView(seasonView) && (
            <button
              type="button"
              onClick={onOpenYearInReview}
              className="focus-ring flex items-center gap-1.5 rounded border border-accent-primary/40 bg-accent-primary/10 px-2.5 py-1 font-heading text-xs text-accent-primary transition-colors hover:bg-accent-primary/20"
            >
              <Film className="h-3.5 w-3.5" />
              Year in Review
            </button>
          )}
          <div className="font-data text-xs text-dynasty-muted">
            {formatSeasonViewRecord(seasonView)}
          </div>
        </div>
      </div>
      <div className="mt-2 font-heading text-sm text-dynasty-text">
        {formatSeasonViewPlayoffResult(seasonView)}
      </div>
      <div className="mt-3 space-y-2">
        {getSeasonViewTimelineEvents(seasonView).map((event) => (
          <div key={event} className="font-heading text-xs text-dynasty-muted">{event}</div>
        ))}
        {isArchivedSeasonView(seasonView) ? (
          <div className="font-heading text-xs text-dynasty-muted">
            Detailed transaction, draft, and payroll logs were archived to keep long dynasties fast.
          </div>
        ) : null}
      </div>
    </div>
  );
}
