import { lazy, Suspense } from 'react';
import { LineChart as LineChartIcon } from 'lucide-react';

const Sparkline = lazy(() => import('@/shared/components/charts/Sparkline'));

export interface CareerRetrospectiveSeasonHistoryEntry {
  season: number;
  winPct: number;
}

function formatWinPct(pct: number): string {
  return pct.toFixed(3).replace(/^0/, '');
}

export default function CareerRetrospectiveSeasonArc({
  history,
}: {
  history: CareerRetrospectiveSeasonHistoryEntry[];
}) {
  const first = history[0]!;
  const last = history[history.length - 1]!;
  const values = history.map((entry) => entry.winPct);
  const peak = values.reduce((max, v) => (v > max ? v : max), values[0]!);
  const trough = values.reduce((min, v) => (v < min ? v : min), values[0]!);

  return (
    <div
      className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3"
      data-testid="season-winpct-strip"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <LineChartIcon className="h-3.5 w-3.5 text-accent-info" />
          <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Season Arc</div>
        </div>
        <div className="font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
          {history.length} season{history.length === 1 ? '' : 's'}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex flex-col text-right font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
          <span className="text-dynasty-textBright">{formatWinPct(first.winPct)}</span>
          <span>S{first.season}</span>
        </div>
        <div className="flex-1">
          <Suspense fallback={<div className="h-6 w-full" aria-hidden />}>
            <Sparkline values={values} width={160} height={24} />
          </Suspense>
        </div>
        <div className="flex flex-col text-left font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
          <span className="text-dynasty-textBright">{formatWinPct(last.winPct)}</span>
          <span>S{last.season}</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
        <span>
          Peak <span className="text-dynasty-textBright">{formatWinPct(peak)}</span>
        </span>
        <span>
          Low <span className="text-dynasty-textBright">{formatWinPct(trough)}</span>
        </span>
      </div>
    </div>
  );
}
