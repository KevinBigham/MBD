import { describe, expect, it } from 'vitest';
import { transformStandingsData } from './StandingsTrendChart';

const makeTeam = (
  teamId: string,
  abbreviation: string,
  wins: number,
  losses: number,
  pct: string,
  gamesBack: number,
) => ({ teamId, abbreviation, wins, losses, pct, gamesBack });

describe('transformStandingsData', () => {
  it('returns empty array for null input', () => {
    expect(transformStandingsData(null, 'team-1')).toEqual([]);
  });

  it('returns empty array for empty standings', () => {
    expect(transformStandingsData([], 'team-1')).toEqual([]);
  });

  it('sorts by win pct descending', () => {
    const standings = [
      makeTeam('t1', 'AAA', 40, 50, '.444', 10),
      makeTeam('t2', 'BBB', 50, 40, '.556', 0),
      makeTeam('t3', 'CCC', 45, 45, '.500', 5),
    ];
    const result = transformStandingsData(standings, 't2');
    expect(result.map((d) => d.abbreviation)).toEqual(['BBB', 'CCC', 'AAA']);
  });

  it('marks user team correctly', () => {
    const standings = [
      makeTeam('t1', 'AAA', 50, 40, '.556', 0),
      makeTeam('t2', 'BBB', 40, 50, '.444', 10),
    ];
    const result = transformStandingsData(standings, 't2');
    expect(result.find((d) => d.teamId === 't2')!.isUser).toBe(true);
    expect(result.find((d) => d.teamId === 't1')!.isUser).toBe(false);
  });

  it('parses pct string to number', () => {
    const standings = [makeTeam('t1', 'AAA', 50, 40, '.556', 0)];
    const result = transformStandingsData(standings, 't1');
    expect(result[0]!.pct).toBeCloseTo(0.556);
  });

  it('handles invalid pct string gracefully', () => {
    const standings = [makeTeam('t1', 'AAA', 0, 0, '---', 0)];
    const result = transformStandingsData(standings, 't1');
    expect(result[0]!.pct).toBe(0);
  });
});
