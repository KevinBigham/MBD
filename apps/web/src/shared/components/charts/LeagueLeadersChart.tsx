/**
 * League Leaders Chart — horizontal bar chart for top players in a stat category.
 * Top 3 highlighted in orange gradient, rest in muted.
 */
import { useMemo } from 'react';
import {
  CHART_COLORS,
  CHART_FONTS,
  SERIES_PALETTE,
  chartTooltipProps,
} from './chartTheme';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

/* ── pure data types ──────────────────────────────────────── */

export interface LeaderBarData {
  name: string;
  value: number;
  rank: number;
}

/* ── pure transformer ─────────────────────────────────────── */

export function transformLeaderData(
  entries: Array<{ name: string; value: number }> | undefined | null,
  limit: number = 10,
): LeaderBarData[] {
  if (!entries || entries.length === 0) return [];

  return entries
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((entry, i) => ({
      name: entry.name,
      value: entry.value,
      rank: i + 1,
    }));
}

/* ── component ────────────────────────────────────────────── */

interface LeagueLeadersChartProps {
  entries: Array<{ name: string; value: number }> | undefined | null;
  label?: string;
  limit?: number;
}

export default function LeagueLeadersChart({ entries, label, limit = 10 }: LeagueLeadersChartProps) {
  const data = useMemo(() => transformLeaderData(entries, limit), [entries, limit]);

  if (data.length === 0) return null;

  const tooltip = chartTooltipProps();

  return (
    <div
      className="w-full"
      style={{ height: Math.max(120, data.length * 28 + 24) }}
      role="img"
      aria-label={`League leaders${label ? ` in ${label}` : ''}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 80 }}>
          <XAxis
            type="number"
            tick={{ fill: CHART_COLORS.text, fontFamily: CHART_FONTS.tick, fontSize: 10 }}
            axisLine={{ stroke: CHART_COLORS.grid, strokeOpacity: 0.5 }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: CHART_COLORS.text, fontFamily: CHART_FONTS.tick, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={76}
          />
          <Tooltip
            {...tooltip}
            formatter={(value) => [Number(value ?? 0).toFixed(1), label ?? 'Value']}
          />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.rank <= 3 ? CHART_COLORS.primary : CHART_COLORS.secondary}
                fillOpacity={entry.rank <= 3 ? (1 - (entry.rank - 1) * 0.15) : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
