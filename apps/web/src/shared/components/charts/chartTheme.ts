/**
 * Shared Recharts theme configuration.
 * Bloomberg Terminal aesthetic — dark surfaces, orange accent, monospace data.
 */
import { dynasty, accent } from '@mbd/design-tokens';

/* ── colour palette ────────────────────────────────────────── */

export const CHART_COLORS = {
  primary: accent.primary,        // #f97316
  secondary: accent.info,         // #38BDF8
  tertiary: accent.success,       // #22C55E
  warning: accent.warning,        // #F59E0B
  danger: accent.danger,          // #F43F5E
  grid: dynasty.border,           // #1E3A6E
  text: dynasty.muted,            // #64748B
  textBright: dynasty.text,       // #E2E8F0
  surface: dynasty.elevated,      // #142447
  tooltipBg: dynasty.elevated,    // #142447
  tooltipBorder: dynasty.border,  // #1E3A6E
} as const;

/** Ordered series palette for multi-line/multi-bar charts. */
export const SERIES_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.tertiary,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
] as const;

/* ── fonts ─────────────────────────────────────────────────── */

export const CHART_FONTS = {
  tick: "'JetBrains Mono', monospace",
  label: "'Space Grotesk', sans-serif",
} as const;

/* ── reusable prop builders ────────────────────────────────── */

export function chartGridProps() {
  return {
    strokeDasharray: '3 3',
    stroke: CHART_COLORS.grid,
    strokeOpacity: 0.4,
  } as const;
}

export function chartAxisProps() {
  return {
    tick: { fill: CHART_COLORS.text, fontFamily: CHART_FONTS.tick, fontSize: 11 },
    axisLine: { stroke: CHART_COLORS.grid, strokeOpacity: 0.5 },
    tickLine: false as const,
  } as const;
}

export function chartTooltipProps() {
  return {
    contentStyle: {
      backgroundColor: CHART_COLORS.tooltipBg,
      border: `1px solid ${CHART_COLORS.tooltipBorder}`,
      borderRadius: 4,
      fontFamily: CHART_FONTS.tick,
      fontSize: 12,
      color: CHART_COLORS.textBright,
    },
    itemStyle: { color: CHART_COLORS.textBright },
    labelStyle: { color: CHART_COLORS.text, fontFamily: CHART_FONTS.label, fontSize: 11 },
    cursor: { stroke: CHART_COLORS.primary, strokeOpacity: 0.3 },
  } as const;
}

/* ── attribute name constants ──────────────────────────────── */

export const HITTER_ATTRS = ['contact', 'power', 'eye', 'speed', 'defense', 'durability'] as const;
export const PITCHER_ATTRS = ['stuff', 'control', 'stamina', 'velocity', 'movement'] as const;

export const HITTER_ATTR_LABELS: Record<typeof HITTER_ATTRS[number], string> = {
  contact: 'Contact',
  power: 'Power',
  eye: 'Eye',
  speed: 'Speed',
  defense: 'Defense',
  durability: 'Durability',
};

export const PITCHER_ATTR_LABELS: Record<typeof PITCHER_ATTRS[number], string> = {
  stuff: 'Stuff',
  control: 'Control',
  stamina: 'Stamina',
  velocity: 'Velocity',
  movement: 'Movement',
};

/* ── scale constants ───────────────────────────────────────── */

export const DISPLAY_RATING_MIN = 20;
export const DISPLAY_RATING_MAX = 80;
