/**
 * Career Arc Chart — area chart showing overall rating trajectory over seasons.
 * Uses development report history to plot career progression.
 */
import { useMemo } from 'react';
import {
  CHART_COLORS,
  DISPLAY_RATING_MAX,
  DISPLAY_RATING_MIN,
  chartAxisProps,
  chartGridProps,
  chartTooltipProps,
} from './chartTheme';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from 'recharts';

/* ── pure data types ──────────────────────────────────────── */

export interface CareerArcDataPoint {
  season: number;
  overall: number;
  isPeak: boolean;
}

/* ── pure transformer ─────────────────────────────────────── */

/**
 * Transforms development history into career arc data points.
 * Collapses multiple checkpoints per season into the latest one.
 * Marks the peak season.
 */
export function transformCareerArcData(
  history: Array<{ season: number; month: number; overallRating: number }> | undefined | null,
): CareerArcDataPoint[] {
  if (!history || history.length === 0) return [];

  // Take the latest checkpoint per season (highest month)
  const bySeason = new Map<number, { season: number; month: number; overall: number }>();
  for (const entry of history) {
    const existing = bySeason.get(entry.season);
    if (!existing || entry.month > existing.month) {
      bySeason.set(entry.season, { season: entry.season, month: entry.month, overall: entry.overallRating });
    }
  }

  const sorted = [...bySeason.values()].sort((a, b) => a.season - b.season);
  if (sorted.length === 0) return [];

  const peakOverall = Math.max(...sorted.map((s) => s.overall));

  return sorted.map((entry) => ({
    season: entry.season,
    overall: entry.overall,
    isPeak: entry.overall === peakOverall,
  }));
}

/* ── component ────────────────────────────────────────────── */

interface CareerArcChartProps {
  history: Array<{ season: number; month: number; overallRating: number }> | undefined | null;
}

export default function CareerArcChart({ history }: CareerArcChartProps) {
  const data = useMemo(() => transformCareerArcData(history), [history]);

  if (data.length === 0) return null;

  const grid = chartGridProps();
  const axis = chartAxisProps();
  const tooltip = chartTooltipProps();
  const peak = data.find((d) => d.isPeak);

  return (
    <div className="h-44 w-full" role="img" aria-label="Career rating arc">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="careerArcGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...grid} />
          <XAxis
            dataKey="season"
            {...axis}
            tick={{ ...axis.tick, fontSize: 10 }}
            label={{ value: 'Season', position: 'insideBottom', offset: -2, fill: CHART_COLORS.text, fontSize: 9 }}
          />
          <YAxis
            domain={[DISPLAY_RATING_MIN, DISPLAY_RATING_MAX]}
            {...axis}
            tick={{ ...axis.tick, fontSize: 9 }}
            width={28}
          />
          <Tooltip {...tooltip} />
          <Area
            type="monotone"
            dataKey="overall"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#careerArcGrad)"
            isAnimationActive={false}
          />
          {peak && (
            <ReferenceDot
              x={peak.season}
              y={peak.overall}
              r={5}
              fill={CHART_COLORS.primary}
              stroke={CHART_COLORS.textBright}
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
