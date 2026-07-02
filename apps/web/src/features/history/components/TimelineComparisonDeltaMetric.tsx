import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

interface TimelineComparisonDeltaMetricProps {
  label: string;
  parentValue: string;
  branchValue: string;
  delta: number;
  suffix?: string;
  invertColor?: boolean;
}

export function timelineComparisonDeltaColor(delta: number): string {
  if (delta > 0) return 'text-accent-success';
  if (delta < 0) return 'text-accent-danger';
  return 'text-dynasty-muted';
}

export function formatTimelineComparisonDelta(delta: number, suffix = ''): string {
  if (delta > 0) return `+${delta}${suffix}`;
  return `${delta}${suffix}`;
}

function deltaIcon(delta: number) {
  if (delta > 0) return <TrendingUp className="h-4 w-4 text-accent-success" />;
  if (delta < 0) return <TrendingDown className="h-4 w-4 text-accent-danger" />;
  return <Minus className="h-4 w-4 text-dynasty-muted" />;
}

export default function TimelineComparisonDeltaMetric({
  label,
  parentValue,
  branchValue,
  delta,
  suffix,
  invertColor,
}: TimelineComparisonDeltaMetricProps) {
  const effectiveDelta = invertColor ? -delta : delta;

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center justify-between">
        <span className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">{label}</span>
        {deltaIcon(effectiveDelta)}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="font-data text-[10px] text-dynasty-muted">Main</div>
          <div className="font-data text-lg text-dynasty-text">{parentValue}</div>
        </div>
        <div className={`font-data text-2xl font-bold ${timelineComparisonDeltaColor(effectiveDelta)}`}>
          {formatTimelineComparisonDelta(effectiveDelta, suffix)}
        </div>
        <div className="text-right">
          <div className="font-data text-[10px] text-dynasty-muted">Branch</div>
          <div className="font-data text-lg text-accent-info">{branchValue}</div>
        </div>
      </div>
    </div>
  );
}
