import { describe, expect, it } from 'vitest';
import { transformSparklineData, sparklineTrendColor } from './Sparkline';
import { CHART_COLORS } from './chartTheme';

describe('transformSparklineData', () => {
  it('returns empty array for null input', () => {
    expect(transformSparklineData(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(transformSparklineData(undefined)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(transformSparklineData([])).toEqual([]);
  });

  it('maps values with index', () => {
    const result = transformSparklineData([10, 20, 30]);
    expect(result).toEqual([
      { index: 0, value: 10 },
      { index: 1, value: 20 },
      { index: 2, value: 30 },
    ]);
  });
});

describe('sparklineTrendColor', () => {
  it('returns muted for null input', () => {
    expect(sparklineTrendColor(null)).toBe(CHART_COLORS.text);
  });

  it('returns muted for single value', () => {
    expect(sparklineTrendColor([42])).toBe(CHART_COLORS.text);
  });

  it('returns green for upward trend', () => {
    expect(sparklineTrendColor([10, 20, 30])).toBe(CHART_COLORS.tertiary);
  });

  it('returns red for downward trend', () => {
    expect(sparklineTrendColor([30, 20, 10])).toBe(CHART_COLORS.danger);
  });

  it('returns muted for flat trend', () => {
    expect(sparklineTrendColor([20, 25, 20])).toBe(CHART_COLORS.text);
  });
});
