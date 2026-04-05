import { describe, expect, it } from 'vitest';
import { transformLeaderData } from './LeagueLeadersChart';

describe('transformLeaderData', () => {
  it('returns empty array for null input', () => {
    expect(transformLeaderData(null)).toEqual([]);
  });

  it('returns empty array for empty entries', () => {
    expect(transformLeaderData([])).toEqual([]);
  });

  it('sorts by value descending and assigns ranks', () => {
    const entries = [
      { name: 'Player A', value: 20 },
      { name: 'Player B', value: 35 },
      { name: 'Player C', value: 28 },
    ];
    const result = transformLeaderData(entries);
    expect(result[0]!.name).toBe('Player B');
    expect(result[0]!.rank).toBe(1);
    expect(result[1]!.name).toBe('Player C');
    expect(result[1]!.rank).toBe(2);
    expect(result[2]!.name).toBe('Player A');
    expect(result[2]!.rank).toBe(3);
  });

  it('respects limit parameter', () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({
      name: `Player ${i}`,
      value: i,
    }));
    const result = transformLeaderData(entries, 5);
    expect(result).toHaveLength(5);
    expect(result[0]!.value).toBe(19);
  });

  it('defaults to limit of 10', () => {
    const entries = Array.from({ length: 15 }, (_, i) => ({
      name: `Player ${i}`,
      value: i,
    }));
    const result = transformLeaderData(entries);
    expect(result).toHaveLength(10);
  });
});
