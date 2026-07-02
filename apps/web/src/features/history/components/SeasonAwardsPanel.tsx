import type { SeasonArchiveEntry } from '@mbd/contracts';
import type { HistorySeasonView } from '@/workers/sim.worker.narrative';

interface SeasonAwardsPanelProps {
  seasonView: HistorySeasonView;
  formatAwardLabel: (award: string) => string;
  playerName: (playerId: string) => string;
  teamName: (teamId: string | null) => string;
}

function isFullSeasonArchive(view: HistorySeasonView): view is SeasonArchiveEntry {
  return 'playoffSeries' in view;
}

export default function SeasonAwardsPanel({
  seasonView,
  formatAwardLabel,
  playerName,
  teamName,
}: SeasonAwardsPanelProps): JSX.Element {
  return (
    <div className="space-y-3">
      {isFullSeasonArchive(seasonView) ? seasonView.awards.map((entry) => (
        <div key={`${entry.award}-${entry.playerId}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-heading text-sm text-dynasty-text">
              Season {entry.season} {entry.league} {formatAwardLabel(entry.award)}
            </div>
            <div className="font-data text-xs text-dynasty-muted">
              {teamName(entry.teamId)}
            </div>
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-text">
            {playerName(entry.playerId)}
          </div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">
            {entry.summary}
          </div>
        </div>
      )) : (
        <>
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="font-heading text-sm text-dynasty-text">MVP</div>
            <div className="mt-2 font-heading text-xs text-dynasty-muted">
              {seasonView.mvpName ?? 'No archived MVP summary'}
            </div>
          </div>
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="font-heading text-sm text-dynasty-text">Cy Young</div>
            <div className="mt-2 font-heading text-xs text-dynasty-muted">
              {seasonView.cyYoungName ?? 'No archived Cy Young summary'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
