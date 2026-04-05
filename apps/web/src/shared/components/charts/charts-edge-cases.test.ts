/**
 * Edge case and accessibility tests for all chart components.
 * Tests boundary conditions, empty states, and extreme values.
 */
import { describe, expect, it } from 'vitest';
import { transformDevCurveData } from './DevCurveChart';
import { transformHitterRadarData, transformPitcherRadarData } from './AttributeRadar';
import { transformCareerArcData } from './CareerArcChart';
import { transformSparklineData, sparklineTrendColor } from './Sparkline';
import { transformStandingsData } from './StandingsTrendChart';
import { transformPayrollData, formatSalary } from './PayrollBreakdownChart';
import { transformLeaderData } from './LeagueLeadersChart';
import { transformProspectCompareData } from './ProspectCompareChart';
import { CHART_COLORS } from './chartTheme';

/* ── DevCurveChart edge cases ─────────────────────────────── */

describe('DevCurveChart edge cases', () => {
  it('handles single checkpoint', () => {
    const result = transformDevCurveData([
      { season: 1, month: 1, trajectory: 'on_track', summary: '', overallRating: 50 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.overall).toBe(50);
  });

  it('handles duplicate season/month entries', () => {
    const result = transformDevCurveData([
      { season: 1, month: 3, trajectory: 'on_track', summary: '', overallRating: 40 },
      { season: 1, month: 3, trajectory: 'ahead_of_curve', summary: '', overallRating: 45 },
    ]);
    expect(result).toHaveLength(2);
    // Both are included, same sortKey
    expect(result[0]!.sortKey).toBe(result[1]!.sortKey);
  });

  it('handles very high season numbers', () => {
    const result = transformDevCurveData([
      { season: 999, month: 12, trajectory: 'on_track', summary: '', overallRating: 80 },
    ]);
    expect(result[0]!.sortKey).toBe(99912);
  });
});

/* ── AttributeRadar edge cases ────────────────────────────── */

describe('AttributeRadar edge cases', () => {
  it('handles all-minimum attributes (hitter)', () => {
    const attrs = { contact: 0, power: 0, eye: 0, speed: 0, defense: 0, durability: 0 };
    const result = transformHitterRadarData(attrs);
    expect(result.every((d) => d.value === 20)).toBe(true);
  });

  it('handles all-maximum attributes (hitter)', () => {
    const attrs = { contact: 550, power: 550, eye: 550, speed: 550, defense: 550, durability: 550 };
    const result = transformHitterRadarData(attrs);
    expect(result.every((d) => d.value === 80)).toBe(true);
  });

  it('handles all-minimum attributes (pitcher)', () => {
    const attrs = { stuff: 0, control: 0, stamina: 0, velocity: 0, movement: 0 };
    const result = transformPitcherRadarData(attrs);
    expect(result.every((d) => d.value === 20)).toBe(true);
  });

  it('handles all-maximum attributes (pitcher)', () => {
    const attrs = { stuff: 550, control: 550, stamina: 550, velocity: 550, movement: 550 };
    const result = transformPitcherRadarData(attrs);
    expect(result.every((d) => d.value === 80)).toBe(true);
  });

  it('handles mid-range value (275 → 50)', () => {
    const attrs = { contact: 275, power: 275, eye: 275, speed: 275, defense: 275, durability: 275 };
    const result = transformHitterRadarData(attrs);
    expect(result.every((d) => d.value === 50)).toBe(true);
  });
});

/* ── CareerArcChart edge cases ────────────────────────────── */

describe('CareerArcChart edge cases', () => {
  it('handles all entries in same month', () => {
    const history = [
      { season: 1, month: 6, overallRating: 40 },
      { season: 2, month: 6, overallRating: 50 },
      { season: 3, month: 6, overallRating: 60 },
    ];
    const result = transformCareerArcData(history);
    expect(result).toHaveLength(3);
    expect(result[2]!.isPeak).toBe(true);
  });

  it('handles declining career correctly', () => {
    const history = [
      { season: 1, month: 6, overallRating: 70 },
      { season: 2, month: 6, overallRating: 60 },
      { season: 3, month: 6, overallRating: 50 },
    ];
    const result = transformCareerArcData(history);
    expect(result[0]!.isPeak).toBe(true);
    expect(result[1]!.isPeak).toBe(false);
    expect(result[2]!.isPeak).toBe(false);
  });
});

/* ── Sparkline edge cases ─────────────────────────────────── */

describe('Sparkline edge cases', () => {
  it('handles single value array', () => {
    const result = transformSparklineData([42]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ index: 0, value: 42 });
  });

  it('handles negative values', () => {
    expect(sparklineTrendColor([-10, -20, -30])).toBe(CHART_COLORS.danger);
  });

  it('handles all-zero values', () => {
    expect(sparklineTrendColor([0, 0, 0])).toBe(CHART_COLORS.text);
  });

  it('handles very large arrays', () => {
    const values = Array.from({ length: 1000 }, (_, i) => i);
    const result = transformSparklineData(values);
    expect(result).toHaveLength(1000);
  });
});

/* ── StandingsTrend edge cases ────────────────────────────── */

describe('StandingsTrend edge cases', () => {
  it('handles single team', () => {
    const result = transformStandingsData(
      [{ teamId: 't1', abbreviation: 'AAA', wins: 50, losses: 40, pct: '.556', gamesBack: 0 }],
      't1',
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.isUser).toBe(true);
  });

  it('handles user team not in standings', () => {
    const result = transformStandingsData(
      [{ teamId: 't1', abbreviation: 'AAA', wins: 50, losses: 40, pct: '.556', gamesBack: 0 }],
      'unknown',
    );
    expect(result[0]!.isUser).toBe(false);
  });
});

/* ── PayrollBreakdown edge cases ──────────────────────────── */

describe('PayrollBreakdown edge cases', () => {
  it('handles zero payroll with positive budget', () => {
    const result = transformPayrollData({ payroll: 0, budget: 80_000_000, luxuryTax: 0 });
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Available');
  });

  it('handles very large payroll values', () => {
    const result = transformPayrollData({ payroll: 300_000_000, budget: 100_000_000, luxuryTax: 50_000_000 });
    expect(result.find((s) => s.name === 'Committed')!.value).toBe(300_000_000);
    expect(result.find((s) => s.name === 'Available')).toBeUndefined();
  });

  it('formats zero correctly', () => {
    expect(formatSalary(0)).toBe('$0');
  });

  it('formats exactly 1M correctly', () => {
    expect(formatSalary(1_000_000)).toBe('$1.0M');
  });
});

/* ── LeagueLeaders edge cases ─────────────────────────────── */

describe('LeagueLeaders edge cases', () => {
  it('handles single entry', () => {
    const result = transformLeaderData([{ name: 'Solo', value: 10 }]);
    expect(result).toHaveLength(1);
    expect(result[0]!.rank).toBe(1);
  });

  it('handles tied values', () => {
    const result = transformLeaderData([
      { name: 'A', value: 10 },
      { name: 'B', value: 10 },
    ]);
    expect(result).toHaveLength(2);
    // Both get sequential ranks
    expect(result[0]!.rank).toBe(1);
    expect(result[1]!.rank).toBe(2);
  });
});

/* ── ProspectCompare edge cases ───────────────────────────── */

describe('ProspectCompare edge cases', () => {
  it('handles single prospect', () => {
    const result = transformProspectCompareData([
      { name: 'Solo', attributes: { Contact: 60, Power: 50 } },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ attribute: 'Contact', Solo: 60 });
  });

  it('handles all-zero attributes', () => {
    const result = transformProspectCompareData([
      { name: 'A', attributes: { Contact: 0, Power: 0 } },
    ]);
    expect(result[0]).toEqual({ attribute: 'Contact', A: 0 });
  });
});
