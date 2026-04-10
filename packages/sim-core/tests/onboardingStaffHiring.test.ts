import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  applyScoutingHire,
  applyStaffHires,
  generateCoachingStaff,
  generateScoutingHiringSlate,
  generateScoutingStaff,
  generateStaffHiringSlate,
  getManagerStyleModifier,
  type Coach,
  type StaffHireChoices,
} from '../src/index.js';

function createHiringContext() {
  return {
    teamId: 'nym',
    teamName: 'New York Tycoons',
    coachingStaff: generateCoachingStaff(new GameRNG(100), 'nym'),
    scoutingStaff: generateScoutingStaff(new GameRNG(200), 'nym'),
  };
}

function getRole(staff: Coach[], role: Coach['role']) {
  return staff.find((coach) => coach.role === role) ?? null;
}

describe('generateStaffHiringSlate', () => {
  it('creates the expected number of candidates per onboarding role', () => {
    const slate = generateStaffHiringSlate(createHiringContext(), new GameRNG(10));

    expect(slate.managerCandidates).toHaveLength(3);
    expect(slate.pitchingCoachCandidates).toHaveLength(2);
    expect(slate.hittingCoachCandidates).toHaveLength(2);
  });

  it('is deterministic for the same team context and seed', () => {
    const context = createHiringContext();
    const first = generateStaffHiringSlate(context, new GameRNG(11));
    const second = generateStaffHiringSlate(context, new GameRNG(11));

    expect(second).toEqual(first);
  });

  it('keeps candidate grades in the onboarding-safe range and avoids identical manager builds', () => {
    const slate = generateStaffHiringSlate(createHiringContext(), new GameRNG(12));
    const managerFingerprints = slate.managerCandidates.map((candidate) => (
      `${candidate.style}:${candidate.teachingGrade}:${candidate.specialty}`
    ));

    expect(new Set(managerFingerprints).size).toBe(3);

    for (const candidate of [
      ...slate.managerCandidates,
      ...slate.pitchingCoachCandidates,
      ...slate.hittingCoachCandidates,
    ]) {
      expect(candidate.teachingGrade).toBeGreaterThanOrEqual(50);
      expect(candidate.teachingGrade).toBeLessThanOrEqual(80);
    }
  });
});

describe('applyStaffHires', () => {
  it('replaces only the three targeted MLB staff roles', () => {
    const context = createHiringContext();
    const slate = generateStaffHiringSlate(context, new GameRNG(13));
    const hires: StaffHireChoices = {
      managerId: slate.managerCandidates[2].id,
      pitchingCoachId: slate.pitchingCoachCandidates[1].id,
      hittingCoachId: slate.hittingCoachCandidates[0].id,
    };

    const result = applyStaffHires(context, slate, hires);

    expect(getRole(result.coachingStaff, 'manager')?.id).toBe(hires.managerId);
    expect(getRole(result.coachingStaff, 'pitching_coach')?.id).toBe(hires.pitchingCoachId);
    expect(getRole(result.coachingStaff, 'hitting_coach')?.id).toBe(hires.hittingCoachId);
    expect(getRole(result.coachingStaff, 'bench_coach')?.id).toBe(getRole(context.coachingStaff, 'bench_coach')?.id);
  });

  it('maps each manager style to a distinct gameplay modifier profile', () => {
    expect(getManagerStyleModifier('analytics')).not.toEqual(getManagerStyleModifier('traditional'));
    expect(getManagerStyleModifier('traditional')).not.toEqual(getManagerStyleModifier('players_manager'));
    expect(getManagerStyleModifier('analytics')).not.toEqual(getManagerStyleModifier('players_manager'));
  });
});

describe('generateScoutingHiringSlate', () => {
  it('creates one candidate for each scouting specialty', () => {
    const slate = generateScoutingHiringSlate(createHiringContext(), new GameRNG(14));

    expect(slate.candidates).toHaveLength(3);
    expect(slate.candidates.map((candidate) => candidate.specialty)).toEqual([
      'draft',
      'international',
      'pro_scouting',
    ]);
  });
});

describe('applyScoutingHire', () => {
  it('records the selected scouting director snapshot and scouting focus', () => {
    const context = createHiringContext();
    const slate = generateScoutingHiringSlate(context, new GameRNG(15));
    const hireId = slate.candidates[1].id;

    const result = applyScoutingHire(context, slate, hireId);

    expect(result.scoutingDirector?.id).toBe(hireId);
    expect(result.scoutingFocus).toBe('international');
  });
});
