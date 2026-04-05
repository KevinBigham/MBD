import { describe, expect, it } from 'vitest';
import { transformDevCurveData } from './DevCurveChart';

describe('transformDevCurveData', () => {
  it('returns empty array for null input', () => {
    expect(transformDevCurveData(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(transformDevCurveData(undefined)).toEqual([]);
  });

  it('returns empty array for empty history', () => {
    expect(transformDevCurveData([])).toEqual([]);
  });

  it('maps history entries to data points', () => {
    const history = [
      { season: 2, month: 6, trajectory: 'on_track', summary: '', overallRating: 45 },
      { season: 2, month: 3, trajectory: 'ahead_of_curve', summary: '', overallRating: 42 },
    ];
    const result = transformDevCurveData(history);
    expect(result).toHaveLength(2);
    expect(result[0]!.overall).toBe(42);
    expect(result[0]!.label).toBe('S2 M3');
    expect(result[1]!.overall).toBe(45);
    expect(result[1]!.label).toBe('S2 M6');
  });

  it('sorts by season then month', () => {
    const history = [
      { season: 3, month: 1, trajectory: 'on_track', summary: '', overallRating: 55 },
      { season: 1, month: 6, trajectory: 'on_track', summary: '', overallRating: 35 },
      { season: 2, month: 3, trajectory: 'on_track', summary: '', overallRating: 45 },
    ];
    const result = transformDevCurveData(history);
    expect(result.map((d) => d.sortKey)).toEqual([106, 203, 301]);
    expect(result.map((d) => d.overall)).toEqual([35, 45, 55]);
  });

  it('preserves trajectory info', () => {
    const history = [
      { season: 1, month: 3, trajectory: 'bust_risk', summary: '', overallRating: 25 },
    ];
    const result = transformDevCurveData(history);
    expect(result[0]!.trajectory).toBe('bust_risk');
  });
});
