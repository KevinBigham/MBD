import type { SeasonArchiveEntry } from '@mbd/contracts';
import type { HistorySeasonView } from '@/workers/sim.worker.narrative';

export interface SeasonComparisonView {
  userTeamId: string;
  left: HistorySeasonView | null;
  right: HistorySeasonView | null;
  deltas: {
    wins: number | null;
    payroll: number | null;
    budget: number | null;
  };
}

interface SeasonComparisonCardProps {
  seasonComparison: SeasonComparisonView | null;
}

function isFullSeasonArchive(view: HistorySeasonView | null): view is SeasonArchiveEntry {
  return view != null && 'playoffSeries' in view;
}

function formatMoney(value: number | null | undefined): string {
  if (value == null) return '--';
  return `$${value.toFixed(1)}M`;
}

function formatSignedMetric(value: number | null | undefined, suffix: string): string {
  if (value == null) return `-- ${suffix}`;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}${suffix}`;
}

export default function SeasonComparisonCard({ seasonComparison }: SeasonComparisonCardProps): JSX.Element {
  return (
    <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="font-heading text-sm text-dynasty-textBright">Compare Seasons</div>
      {seasonComparison?.left && seasonComparison.right ? (
        <div className="mt-3 space-y-3">
          <div className="font-heading text-sm text-dynasty-text">
            Season {seasonComparison.right.season} vs Season {seasonComparison.left.season}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded border border-dynasty-border/70 px-3 py-2">
              <div className="font-heading text-[11px] uppercase text-dynasty-muted">Wins</div>
              <div className="mt-1 font-data text-sm text-dynasty-textBright">
                {formatSignedMetric(seasonComparison.deltas.wins, ' wins')}
              </div>
            </div>
            <div className="rounded border border-dynasty-border/70 px-3 py-2">
              <div className="font-heading text-[11px] uppercase text-dynasty-muted">Payroll</div>
              <div className="mt-1 font-data text-sm text-dynasty-textBright">
                {formatMoney(
                  isFullSeasonArchive(seasonComparison.right)
                    ? seasonComparison.right.financials.find((entry) => entry.teamId === seasonComparison.userTeamId)?.payroll
                    : null,
                )}
              </div>
              <div className="mt-1 font-heading text-[11px] text-dynasty-muted">
                {formatMoney(seasonComparison.deltas.payroll)}
              </div>
            </div>
            <div className="rounded border border-dynasty-border/70 px-3 py-2">
              <div className="font-heading text-[11px] uppercase text-dynasty-muted">Budget</div>
              <div className="mt-1 font-data text-sm text-dynasty-textBright">
                {formatMoney(
                  isFullSeasonArchive(seasonComparison.right)
                    ? seasonComparison.right.financials.find((entry) => entry.teamId === seasonComparison.userTeamId)?.budget
                    : null,
                )}
              </div>
              <div className="mt-1 font-heading text-[11px] text-dynasty-muted">
                {formatMoney(seasonComparison.deltas.budget)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 font-heading text-sm text-dynasty-muted">
          Pick two archived seasons to compare.
        </div>
      )}
    </div>
  );
}
