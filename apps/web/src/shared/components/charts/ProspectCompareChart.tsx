/**
 * Prospect Compare Chart — overlay radar for 2-3 draft prospects.
 * Reuses radar axis logic from AttributeRadar. Each prospect gets a distinct color.
 */
import { useMemo } from 'react';
import {
  CHART_COLORS,
  CHART_FONTS,
  DISPLAY_RATING_MAX,
  DISPLAY_RATING_MIN,
  SERIES_PALETTE,
} from './chartTheme';

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
} from 'recharts';

/* ── pure data types ──────────────────────────────────────── */

export interface ProspectRadarEntry {
  attribute: string;
  [prospectKey: string]: string | number;
}

export interface ProspectInput {
  name: string;
  /** Scouting grade (20-80 display scale) per attribute */
  attributes: Record<string, number>;
}

/* ── prospect colors ──────────────────────────────────────── */

const PROSPECT_COLORS = [
  CHART_COLORS.primary,    // orange
  CHART_COLORS.secondary,  // cyan
  CHART_COLORS.tertiary,   // green
] as const;

/* ── pure transformer ─────────────────────────────────────── */

/**
 * Merge prospect attributes into a single data array for overlaid radars.
 * All prospects must have the same attribute keys (first prospect defines axes).
 */
export function transformProspectCompareData(
  prospects: ProspectInput[] | undefined | null,
): ProspectRadarEntry[] {
  if (!prospects || prospects.length === 0) return [];

  const first = prospects[0]!;
  const attributeKeys = Object.keys(first.attributes);
  if (attributeKeys.length === 0) return [];

  return attributeKeys.map((attr) => {
    const point: ProspectRadarEntry = { attribute: attr };
    for (const prospect of prospects) {
      point[prospect.name] = prospect.attributes[attr] ?? 0;
    }
    return point;
  });
}

/* ── component ────────────────────────────────────────────── */

interface ProspectCompareChartProps {
  prospects: ProspectInput[] | undefined | null;
}

export default function ProspectCompareChart({ prospects }: ProspectCompareChartProps) {
  const data = useMemo(() => transformProspectCompareData(prospects), [prospects]);
  const names = useMemo(() => (prospects ?? []).map((p) => p.name), [prospects]);

  if (data.length === 0 || names.length === 0) return null;

  return (
    <div className="h-64 w-full" role="img" aria-label="Prospect comparison radar">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="65%">
          <PolarGrid stroke={CHART_COLORS.grid} strokeOpacity={0.4} />
          <PolarAngleAxis
            dataKey="attribute"
            tick={{ fill: CHART_COLORS.text, fontFamily: CHART_FONTS.tick, fontSize: 10 }}
          />
          <PolarRadiusAxis
            domain={[DISPLAY_RATING_MIN, DISPLAY_RATING_MAX]}
            tick={{ fill: CHART_COLORS.text, fontFamily: CHART_FONTS.tick, fontSize: 8 }}
            axisLine={false}
            tickCount={4}
          />
          {names.map((name, i) => (
            <Radar
              key={name}
              name={name}
              dataKey={name}
              stroke={PROSPECT_COLORS[i % PROSPECT_COLORS.length]}
              fill={PROSPECT_COLORS[i % PROSPECT_COLORS.length]}
              fillOpacity={0.1}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
          <Legend
            wrapperStyle={{
              fontFamily: CHART_FONTS.tick,
              fontSize: 11,
              color: CHART_COLORS.text,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: CHART_COLORS.tooltipBg,
              border: `1px solid ${CHART_COLORS.tooltipBorder}`,
              borderRadius: 4,
              fontFamily: CHART_FONTS.tick,
              fontSize: 11,
              color: CHART_COLORS.textBright,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
