/**
 * Sparkline — tiny inline chart for table cells.
 * No axes, no grid, no tooltip. Just a line.
 */
import { useMemo } from 'react';
import { CHART_COLORS } from './chartTheme';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

/* ── pure data types ──────────────────────────────────────── */

export interface SparklineDataPoint {
  index: number;
  value: number;
}

/* ── pure transformer ─────────────────────────────────────── */

export function transformSparklineData(values: number[] | undefined | null): SparklineDataPoint[] {
  if (!values || values.length === 0) return [];
  return values.map((value, index) => ({ index, value }));
}

/** Determine trend color: green (up), red (down), muted (flat). */
export function sparklineTrendColor(values: number[] | undefined | null): string {
  if (!values || values.length < 2) return CHART_COLORS.text;
  const first = values[0]!;
  const last = values[values.length - 1]!;
  const diff = last - first;
  if (diff > 0) return CHART_COLORS.tertiary;  // green
  if (diff < 0) return CHART_COLORS.danger;    // red
  return CHART_COLORS.text;                     // flat
}

/* ── component ────────────────────────────────────────────── */

interface SparklineProps {
  values: number[] | undefined | null;
  width?: number;
  height?: number;
  color?: string;
}

export default function Sparkline({ values, width = 80, height = 24, color }: SparklineProps) {
  const data = useMemo(() => transformSparklineData(values), [values]);
  const strokeColor = color ?? sparklineTrendColor(values);

  if (data.length === 0) return null;

  return (
    <div style={{ width, height }} role="img" aria-label="Trend sparkline">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
