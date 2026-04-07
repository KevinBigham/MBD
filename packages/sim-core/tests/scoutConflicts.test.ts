import { describe, expect, it } from 'vitest';
import * as simCore from '../src/index.js';

function buildStaff(seed: number) {
  const rng = new simCore.GameRNG(seed);
  return simCore.generateScoutingStaff(rng).slice(0, 3);
}

function buildProspect(seed: number, background: 'high_school' | 'college_senior' | 'college_underclass') {
  const draftClass = simCore.generateDraftClass(new simCore.GameRNG(seed), 4);
  const prospect = draftClass.prospects[0]!;
  return {
    ...prospect,
    background,
    collegeOrHS: background,
    player: {
      ...prospect.player,
      age: background === 'high_school' ? 18 : background === 'college_senior' ? 22 : 20,
    },
  };
}

describe('scout conflicts', () => {
  it('generates three deterministic opinions with source-specific metadata', () => {
    const generateScoutConflict = (
      simCore as unknown as {
        generateScoutConflict?: (
          rng: InstanceType<typeof simCore.GameRNG>,
          prospect: ReturnType<typeof buildProspect>,
          scoutStaff: ReturnType<typeof buildStaff>,
          season?: number,
          teamId?: string | null,
        ) => import('@mbd/contracts').ScoutConflict;
      }
    ).generateScoutConflict;

    expect(typeof generateScoutConflict).toBe('function');

    const staff = buildStaff(99);
    const prospect = buildProspect(12, 'college_underclass');
    const conflict = generateScoutConflict!(new simCore.GameRNG(44), prospect, staff, 4, 'nym');
    const repeat = generateScoutConflict!(new simCore.GameRNG(44), prospect, staff, 4, 'nym');

    expect(conflict.opinions).toHaveLength(3);
    expect(conflict.opinions.map((entry) => entry.source)).toEqual([
      'scout_director',
      'analytics_head',
      'manager',
    ]);
    expect(conflict.divergence).toBeGreaterThanOrEqual(0);
    expect(conflict).toEqual(repeat);
  });

  it('creates more divergence for high-school prospects and resolves the closest source after two seasons', () => {
    const generateScoutConflict = (
      simCore as unknown as {
        generateScoutConflict?: (
          rng: InstanceType<typeof simCore.GameRNG>,
          prospect: ReturnType<typeof buildProspect>,
          scoutStaff: ReturnType<typeof buildStaff>,
          season?: number,
          teamId?: string | null,
        ) => import('@mbd/contracts').ScoutConflict;
      }
    ).generateScoutConflict;
    const resolveScoutConflicts = (
      simCore as unknown as {
        resolveScoutConflicts?: (
          rng: InstanceType<typeof simCore.GameRNG>,
          conflicts: import('@mbd/contracts').ScoutConflict[],
          playerOutcomes: Array<{ prospectId: string; actualGrade: number; mlbSeasons: number }>,
          season: number,
        ) => import('@mbd/contracts').ScoutConflict[];
      }
    ).resolveScoutConflicts;

    expect(typeof generateScoutConflict).toBe('function');
    expect(typeof resolveScoutConflicts).toBe('function');

    const staff = buildStaff(123);
    const prep = generateScoutConflict!(new simCore.GameRNG(7), buildProspect(3, 'high_school'), staff, 4, 'nym');
    const senior = generateScoutConflict!(new simCore.GameRNG(7), buildProspect(3, 'college_senior'), staff, 4, 'nym');

    expect(prep.divergence).toBeGreaterThan(senior.divergence);

    const actualGrade = prep.opinions[1]!.overallGrade;
    const resolved = resolveScoutConflicts!(
      new simCore.GameRNG(22),
      [prep],
      [{ prospectId: prep.prospectId, actualGrade, mlbSeasons: 2 }],
      6,
    );

    expect(resolved[0]?.resolved).toBe(true);
    expect(resolved[0]?.resolution?.closestSource).toBe('analytics_head');
    expect(resolved[0]?.outcomeSummary?.length).toBeGreaterThan(0);
  });
});
