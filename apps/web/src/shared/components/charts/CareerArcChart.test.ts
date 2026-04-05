import { describe, expect, it } from 'vitest';
import { transformCareerArcData } from './CareerArcChart';

describe('transformCareerArcData', () => {
  it('returns empty array for null input', () => {
    expect(transformCareerArcData(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(transformCareerArcData(undefined)).toEqual([]);
  });

  it('returns empty array for empty history', () => {
    expect(transformCareerArcData([])).toEqual([]);
  });

  it('collapses multiple months to latest per season', () => {
    const history = [
      { season: 1, month: 3, overallRating: 40 },
      { season: 1, month: 6, overallRating: 45 },
      { season: 1, month: 9, overallRating: 48 },
    ];
    const result = transformCareerArcData(history);
    expect(result).toHaveLength(1);
    expect(result[0]!.overall).toBe(48);
    expect(result[0]!.season).toBe(1);
  });

  it('sorts by season ascending', () => {
    const history = [
      { season: 3, month: 6, overallRating: 55 },
      { season: 1, month: 6, overallRating: 40 },
      { season: 2, month: 6, overallRating: 48 },
    ];
    const result = transformCareerArcData(history);
    expect(result.map((d) => d.season)).toEqual([1, 2, 3]);
  });

  it('marks peak season correctly', () => {
    const history = [
      { season: 1, month: 6, overallRating: 40 },
      { season: 2, month: 6, overallRating: 60 },
      { season: 3, month: 6, overallRating: 55 },
    ];
    const result = transformCareerArcData(history);
    expect(result[0]!.isPeak).toBe(false);
    expect(result[1]!.isPeak).toBe(true);
    expect(result[2]!.isPeak).toBe(false);
  });

  it('handles single entry', () => {
    const history = [{ season: 1, month: 3, overallRating: 42 }];
    const result = transformCareerArcData(history);
    expect(result).toHaveLength(1);
    expect(result[0]!.isPeak).toBe(true);
    expect(result[0]!.overall).toBe(42);
  });

  it('handles tied peak ratings', () => {
    const history = [
      { season: 1, month: 6, overallRating: 60 },
      { season: 2, month: 6, overallRating: 60 },
    ];
    const result = transformCareerArcData(history);
    // Both are peak
    expect(result[0]!.isPeak).toBe(true);
    expect(result[1]!.isPeak).toBe(true);
  });
});
