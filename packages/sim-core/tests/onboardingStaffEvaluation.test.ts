import { describe, expect, it } from 'vitest';
import {
  assessStaffStrengths,
  evaluateCoachingStaff,
  profileKeyCoaches,
  createGameRNG,
  type Coach,
} from '../src/index.js';

function makeCoach(overrides: Partial<Coach> = {}): Coach {
  const rng = createGameRNG(overrides.experienceYears ?? 12);

  return {
    id: overrides.id ?? `coach-${rng.nextInt(1, 999)}`,
    firstName: overrides.firstName ?? 'Jim',
    lastName: overrides.lastName ?? 'Walker',
    role: overrides.role ?? 'manager',
    specialty: overrides.specialty ?? 'leadership',
    teachingAbility: overrides.teachingAbility ?? 0.82,
    developmentBonus: overrides.developmentBonus ?? 0.16,
    personalityFit: overrides.personalityFit ?? 0.74,
    experienceYears: overrides.experienceYears ?? 12,
    contractYears: overrides.contractYears ?? 2,
    annualSalary: overrides.annualSalary ?? 1.9,
    teamId: overrides.teamId ?? 'nym',
  };
}

function makeStaff(): Coach[] {
  return [
    makeCoach({ id: 'mgr', firstName: 'Alan', lastName: 'Boone', role: 'manager', specialty: 'leadership', teachingAbility: 0.88, annualSalary: 2.8 }),
    makeCoach({ id: 'hit', firstName: 'Carlos', lastName: 'Mendoza', role: 'hitting_coach', specialty: 'power', teachingAbility: 0.91, annualSalary: 2.4 }),
    makeCoach({ id: 'pit', firstName: 'Pete', lastName: 'Caldwell', role: 'pitching_coach', specialty: 'control', teachingAbility: 0.86, annualSalary: 2.2 }),
    makeCoach({ id: 'bench', firstName: 'Darren', lastName: 'Price', role: 'bench_coach', specialty: 'contact', teachingAbility: 0.79, annualSalary: 1.7 }),
    makeCoach({ id: 'farm', firstName: 'Luis', lastName: 'Ramos', role: 'farm_director', specialty: 'mlb_prep', teachingAbility: 0.83, annualSalary: 1.8 }),
    makeCoach({ id: 'bullpen', firstName: 'Greg', lastName: 'Frost', role: 'bullpen_coach', specialty: 'breaking', teachingAbility: 0.28, annualSalary: 1.2 }),
  ];
}

describe('profileKeyCoaches', () => {
  it('always includes the manager plus the top three coaches by teaching ability', () => {
    const profiles = profileKeyCoaches(makeStaff());

    expect(profiles.map((coach) => coach.coachId)).toEqual(['mgr', 'hit', 'pit', 'farm']);
  });

  it('maps teaching scores into letter grades', () => {
    const profiles = profileKeyCoaches(makeStaff().concat([
      makeCoach({ id: 'struggler', role: 'aaa_coordinator', teachingAbility: 0.21 }),
    ]));

    expect(profiles.find((coach) => coach.coachId === 'hit')?.teachingGrade).toBe('A');
    expect(profileKeyCoaches([
      makeCoach({ id: 'mgr', role: 'manager', teachingAbility: 0.25 }),
      makeCoach({ id: 'weak-1', role: 'hitting_coach', teachingAbility: 0.22 }),
      makeCoach({ id: 'weak-2', role: 'pitching_coach', teachingAbility: 0.24 }),
      makeCoach({ id: 'weak-3', role: 'bench_coach', teachingAbility: 0.26 }),
    ])[1]?.teachingGrade).toBe('D');
  });
});

describe('assessStaffStrengths', () => {
  it('calculates budget utilization from payroll and budget', () => {
    const strengths = assessStaffStrengths(makeStaff(), 14);

    expect(strengths.budgetUtilization).toBeCloseTo(0.864, 3);
  });

  it('identifies the best and weakest coaching areas', () => {
    const strengths = assessStaffStrengths(makeStaff(), 14);

    expect(strengths.bestArea.length).toBeGreaterThan(0);
    expect(strengths.weakestArea.length).toBeGreaterThan(0);
  });
});

describe('evaluateCoachingStaff', () => {
  it('returns payroll and budget remaining values', () => {
    const evaluation = evaluateCoachingStaff(makeStaff(), 14);

    expect(evaluation.staffPayroll).toBeGreaterThan(0);
    expect(evaluation.budgetRemaining).toBeCloseTo(14 - evaluation.staffPayroll, 2);
  });

  it('is deterministic for the same inputs', () => {
    expect(evaluateCoachingStaff(makeStaff(), 14)).toEqual(evaluateCoachingStaff(makeStaff(), 14));
  });
});
