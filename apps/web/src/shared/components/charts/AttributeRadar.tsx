/**
 * Attribute Radar Chart — 5/6-tool radar for hitter or pitcher profiles.
 * Accepts raw 0-550 internal ratings and maps to 20-80 display scale.
 */
import { useMemo } from 'react';
import type { HitterAttributes, PitcherAttributes } from '@mbd/contracts';
import {
  CHART_COLORS,
  CHART_FONTS,
  DISPLAY_RATING_MAX,
  DISPLAY_RATING_MIN,
  HITTER_ATTRS,
  HITTER_ATTR_LABELS,
  PITCHER_ATTRS,
  PITCHER_ATTR_LABELS,
} from './chartTheme';

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';

/* ── pure data types ──────────────────────────────────────── */

export interface RadarDataPoint {
  attribute: string;
  value: number;
  fullMark: number;
}

/* ── internal→display scale ───────────────────────────────── */

function toDisplayScale(internal: number): number {
  // Internal 0-550 → Display 20-80
  const clamped = Math.max(0, Math.min(550, internal));
  return Math.round(DISPLAY_RATING_MIN + (clamped / 550) * (DISPLAY_RATING_MAX - DISPLAY_RATING_MIN));
}

/* ── pure transformers ────────────────────────────────────── */

export function transformHitterRadarData(attrs: HitterAttributes): RadarDataPoint[] {
  return HITTER_ATTRS.map((key) => ({
    attribute: HITTER_ATTR_LABELS[key],
    value: toDisplayScale(attrs[key]),
    fullMark: DISPLAY_RATING_MAX,
  }));
}

export function transformPitcherRadarData(attrs: PitcherAttributes): RadarDataPoint[] {
  return PITCHER_ATTRS.map((key) => ({
    attribute: PITCHER_ATTR_LABELS[key],
    value: toDisplayScale(attrs[key]),
    fullMark: DISPLAY_RATING_MAX,
  }));
}

/* ── component ────────────────────────────────────────────── */

interface AttributeRadarProps {
  attrs: HitterAttributes | PitcherAttributes;
  isPitcher: boolean;
  /** Optional comparison overlay (e.g. ceiling projection) */
  comparison?: HitterAttributes | PitcherAttributes;
}

export default function AttributeRadar({ attrs, isPitcher, comparison }: AttributeRadarProps) {
  const data = useMemo(
    () => (isPitcher
      ? transformPitcherRadarData(attrs as PitcherAttributes)
      : transformHitterRadarData(attrs as HitterAttributes)),
    [attrs, isPitcher],
  );

  const comparisonData = useMemo(() => {
    if (!comparison) return null;
    return isPitcher
      ? transformPitcherRadarData(comparison as PitcherAttributes)
      : transformHitterRadarData(comparison as HitterAttributes);
  }, [comparison, isPitcher]);

  // Merge comparison into data for overlay
  const mergedData = useMemo(() => {
    if (!comparisonData) return data;
    return data.map((point, i) => ({
      ...point,
      comparison: comparisonData[i]?.value ?? 0,
    }));
  }, [data, comparisonData]);

  return (
    <div className="h-56 w-full" role="img" aria-label={`${isPitcher ? 'Pitcher' : 'Hitter'} attribute radar`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={mergedData} cx="50%" cy="50%" outerRadius="70%">
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
          {comparisonData && (
            <Radar
              name="Comparison"
              dataKey="comparison"
              stroke={CHART_COLORS.secondary}
              fill={CHART_COLORS.secondary}
              fillOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="4 4"
              isAnimationActive={false}
            />
          )}
          <Radar
            name="Current"
            dataKey="value"
            stroke={CHART_COLORS.primary}
            fill={CHART_COLORS.primary}
            fillOpacity={0.2}
            strokeWidth={2}
            isAnimationActive={false}
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
