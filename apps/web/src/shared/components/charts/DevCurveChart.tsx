/**
 * Development Curve Chart — line chart of player overall rating over time.
 * Plots checkpoints from development reports history.
 */
import { useMemo } from 'react';
import type { DevelopmentReportsView } from '@/features/players/components/playerProfileShared';
import {
  CHART_COLORS,
  CHART_FONTS,
  DISPLAY_RATING_MAX,
  DISPLAY_RATING_MIN,
  chartAxisProps,
  chartGridProps,
  chartTooltipProps,
} from './chartTheme';

/* ── pure data types ──────────────────────────────────────── */

export interface DevCurveDataPoint {
  /** Label for X-axis: "S3 M4" = Season 3, Month 4 */
  label: string;
  /** Numeric sort key (season * 100 + month) */
  sortKey: number;
  /** Overall rating at this checkpoint (20-80 display scale) */
  overall: number;
  /** Trajectory at this checkpoint */
  trajectory: string;
}

/* ── pure transformer ─────────────────────────────────────── */

export function transformDevCurveData(
  history: DevelopmentReportsView['history'] | undefined | null,
): DevCurveDataPoint[] {
  if (!history || history.length === 0) return [];

  return history
    .map((entry) => ({
      label: `S${entry.season} M${entry.month}`,
      sortKey: entry.season * 100 + entry.month,
      overall: entry.overallRating,
      trajectory: entry.trajectory,
    }))
    .sort((a, b) => a.sortKey - b.sortKey);
}

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

/* ── component ────────────────────────────────────────────── */

interface DevCurveChartProps {
  history: DevelopmentReportsView['history'] | undefined | null;
  floor?: number | null;
  ceiling?: number | null;
}

export default function DevCurveChart({ history, floor, ceiling }: DevCurveChartProps) {
  const data = useMemo(() => transformDevCurveData(history), [history]);

  if (data.length === 0) return null;

  const grid = chartGridProps();
  const axis = chartAxisProps();
  const tooltip = chartTooltipProps();

  return (
    <div className="h-48 w-full" role="img" aria-label="Player development rating curve">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid {...grid} />
          <XAxis
            dataKey="label"
            {...axis}
            tick={{ ...axis.tick, fontSize: 9 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[DISPLAY_RATING_MIN, DISPLAY_RATING_MAX]}
            {...axis}
            tick={{ ...axis.tick, fontSize: 9 }}
            width={28}
          />
          <Tooltip {...tooltip} />
          {floor != null && (
            <ReferenceLine
              y={floor}
              stroke={CHART_COLORS.danger}
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{ value: 'Floor', fill: CHART_COLORS.danger, fontSize: 9, fontFamily: CHART_FONTS.tick }}
            />
          )}
          {ceiling != null && (
            <ReferenceLine
              y={ceiling}
              stroke={CHART_COLORS.tertiary}
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{ value: 'Ceiling', fill: CHART_COLORS.tertiary, fontSize: 9, fontFamily: CHART_FONTS.tick }}
            />
          )}
          <Line
            type="monotone"
            dataKey="overall"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS.primary, r: 3 }}
            activeDot={{ r: 5, fill: CHART_COLORS.primary }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
