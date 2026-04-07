import { describe, it, expect } from 'vitest';
import { TEAMS, DIVISIONS, getTeamsByDivision, getTeamById } from '../src/league/teams.js';

describe('TEAMS', () => {
  it('has 32 teams', () => {
    expect(TEAMS.length).toBe(32);
  });

  it('all teams have required fields', () => {
    for (const team of TEAMS) {
      expect(team.id).toBeTruthy();
      expect(team.name).toBeTruthy();
      expect(team.city).toBeTruthy();
      expect(team.abbreviation).toHaveLength(3);
      expect(DIVISIONS).toContain(team.division);
    }
  });

  it('all team IDs are unique', () => {
    const ids = TEAMS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all abbreviations are unique', () => {
    const abbrs = TEAMS.map(t => t.abbreviation);
    expect(new Set(abbrs).size).toBe(abbrs.length);
  });
});

describe('getTeamsByDivision', () => {
  it('returns teams for a valid division', () => {
    const alEast = getTeamsByDivision('AL_EAST');
    expect(alEast.length).toBeGreaterThanOrEqual(5);
    for (const team of alEast) {
      expect(team.division).toBe('AL_EAST');
    }
  });

  it('covers all 6 divisions', () => {
    for (const div of DIVISIONS) {
      const teams = getTeamsByDivision(div);
      expect(teams.length).toBeGreaterThan(0);
    }
  });
});

describe('getTeamById', () => {
  it('finds a known team', () => {
    const team = getTeamById('nym');
    expect(team).toBeDefined();
    expect(team!.name).toBe('Tycoons');
  });

  it('returns undefined for unknown id', () => {
    expect(getTeamById('xyz')).toBeUndefined();
  });
});
