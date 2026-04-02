/**
 * @module coaching
 * Deterministic coaching staff generation and development modifiers.
 */

import type { GameRNG } from '../math/prng.js';
import type {
  GeneratedPlayer,
  Position,
  RosterLevel,
} from './generation.js';

export const COACH_ROLES = [
  'manager',
  'pitching_coach',
  'hitting_coach',
  'bench_coach',
  'bullpen_coach',
  'first_base_coach',
  'third_base_coach',
  'farm_director',
  'rookie_coordinator',
  'a_coordinator',
  'aa_coordinator',
  'aaa_coordinator',
] as const;
export type CoachRole = (typeof COACH_ROLES)[number];

export const COACH_SPECIALTIES = [
  'leadership',
  'power',
  'contact',
  'speed',
  'defense',
  'durability',
  'stuff',
  'control',
  'velocity',
  'breaking',
  'stamina',
  'mlb_prep',
] as const;
export type CoachSpecialty = (typeof COACH_SPECIALTIES)[number];

export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  role: CoachRole;
  specialty: CoachSpecialty;
  teachingAbility: number;
  developmentBonus: number;
  personalityFit: number;
  experienceYears: number;
  contractYears: number;
  annualSalary: number;
  teamId: string | null;
}

const COACH_FIRST_NAMES = [
  'Jim',
  'Dave',
  'Ron',
  'Mike',
  'Tony',
  'Luis',
  'Carlos',
  'Pete',
  'Sam',
  'Mark',
  'Dan',
  'Alex',
  'Reggie',
  'Tom',
];

const COACH_LAST_NAMES = [
  'Thompson',
  'Martinez',
  'Walker',
  'Collins',
  'Rivera',
  'Johnson',
  'Bennett',
  'Foster',
  'Cruz',
  'Parker',
  'Hernandez',
  'Lopez',
  'Hill',
  'Reed',
];

const ROLE_SPECIALTY_MAP: Record<CoachRole, CoachSpecialty[]> = {
  manager: ['leadership', 'mlb_prep'],
  pitching_coach: ['stuff', 'control', 'velocity'],
  hitting_coach: ['power', 'contact'],
  bench_coach: ['contact', 'leadership'],
  bullpen_coach: ['control', 'breaking'],
  first_base_coach: ['speed', 'defense'],
  third_base_coach: ['defense', 'leadership'],
  farm_director: ['leadership', 'mlb_prep'],
  rookie_coordinator: ['speed', 'durability'],
  a_coordinator: ['contact', 'defense'],
  aa_coordinator: ['contact', 'power'],
  aaa_coordinator: ['mlb_prep', 'leadership'],
};

const HITTER_SPECIALTY_BY_PROGRAM: Record<string, CoachSpecialty> = {
  tools: 'speed',
  fundamentals: 'contact',
  refinement: 'contact',
  mlb_prep: 'mlb_prep',
  power: 'power',
  contact: 'contact',
  speed: 'speed',
  defense: 'defense',
  control: 'contact',
  velocity: 'power',
  breaking: 'contact',
  stamina: 'durability',
};

const PITCHER_SPECIALTY_BY_PROGRAM: Record<string, CoachSpecialty> = {
  tools: 'velocity',
  fundamentals: 'control',
  refinement: 'breaking',
  mlb_prep: 'mlb_prep',
  power: 'stuff',
  contact: 'control',
  speed: 'velocity',
  defense: 'control',
  control: 'control',
  velocity: 'velocity',
  breaking: 'breaking',
  stamina: 'stamina',
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function coachId(teamId: string | null, role: CoachRole, rng: GameRNG): string {
  const hex = () => rng.nextInt(0, 0xffff).toString(16).padStart(4, '0');
  const prefix = teamId ?? 'fa';
  return `coach-${prefix}-${role}-${hex()}${hex()}`;
}

function generateCoach(
  rng: GameRNG,
  role: CoachRole,
  teamId: string | null,
): Coach {
  const specialties = ROLE_SPECIALTY_MAP[role];
  const specialty = specialties[rng.nextInt(0, specialties.length - 1)]!;
  const teachingAbility = Math.round(clamp(0.3 + rng.nextFloat() * 0.7, 0.3, 1) * 100) / 100;
  const developmentBonus = Math.round((rng.nextFloat() * 0.3) * 100) / 100;
  const personalityFit = Math.round(clamp(0.3 + rng.nextFloat() * 0.7, 0.3, 1) * 100) / 100;
  const experienceYears = rng.nextInt(0, 25);
  const annualSalary = calculateCoachMarketValue({
    teachingAbility,
    developmentBonus,
    personalityFit,
    experienceYears,
  });

  return {
    id: coachId(teamId, role, rng),
    firstName: COACH_FIRST_NAMES[rng.nextInt(0, COACH_FIRST_NAMES.length - 1)]!,
    lastName: COACH_LAST_NAMES[rng.nextInt(0, COACH_LAST_NAMES.length - 1)]!,
    role,
    specialty,
    teachingAbility,
    developmentBonus,
    personalityFit,
    experienceYears,
    contractYears: rng.nextInt(1, 3),
    annualSalary,
    teamId,
  };
}

function levelCoordinatorRole(level: Exclude<RosterLevel, 'MLB' | 'FREE_AGENT' | 'RETIRED'> | null): CoachRole | null {
  switch (level) {
    case 'ROOKIE':
    case 'INTERNATIONAL':
      return 'rookie_coordinator';
    case 'A':
    case 'A_PLUS':
      return 'a_coordinator';
    case 'AA':
      return 'aa_coordinator';
    case 'AAA':
      return 'aaa_coordinator';
    default:
      return null;
  }
}

function primaryNeed(player: GeneratedPlayer): CoachSpecialty {
  if (player.pitcherAttributes) {
    if ((player.developmentProgram ?? 'refinement') in PITCHER_SPECIALTY_BY_PROGRAM) {
      return PITCHER_SPECIALTY_BY_PROGRAM[player.developmentProgram ?? 'refinement']!;
    }
    const entries: Array<[CoachSpecialty, number]> = [
      ['stuff', player.pitcherAttributes.stuff],
      ['control', player.pitcherAttributes.control],
      ['stamina', player.pitcherAttributes.stamina],
      ['velocity', player.pitcherAttributes.velocity],
      ['breaking', player.pitcherAttributes.movement],
    ];
    return entries.sort((left, right) => left[1] - right[1])[0]?.[0] ?? 'stuff';
  }

  if ((player.developmentProgram ?? 'fundamentals') in HITTER_SPECIALTY_BY_PROGRAM) {
    return HITTER_SPECIALTY_BY_PROGRAM[player.developmentProgram ?? 'fundamentals']!;
  }

  const entries: Array<[CoachSpecialty, number]> = [
    ['contact', player.hitterAttributes.contact],
    ['power', player.hitterAttributes.power],
    ['speed', player.hitterAttributes.speed],
    ['defense', player.hitterAttributes.defense],
    ['durability', player.hitterAttributes.durability],
  ];
  return entries.sort((left, right) => left[1] - right[1])[0]?.[0] ?? 'contact';
}

function relevantRolesForPlayer(
  player: GeneratedPlayer,
  level: Exclude<RosterLevel, 'FREE_AGENT' | 'RETIRED'> | null,
): CoachRole[] {
  if (level === 'MLB' || player.rosterStatus === 'MLB') {
    return player.pitcherAttributes
      ? ['manager', 'pitching_coach', 'bullpen_coach']
      : ['manager', 'hitting_coach', 'bench_coach'];
  }

  const coordinator = levelCoordinatorRole(level ?? player.minorLeagueLevel ?? null);
  return coordinator
    ? ['farm_director', coordinator]
    : ['farm_director'];
}

export function calculateCoachMarketValue(coach: Pick<
  Coach,
  'teachingAbility' | 'developmentBonus' | 'personalityFit' | 'experienceYears'
>): number {
  const value = 0.45
    + (coach.teachingAbility * 1.7)
    + (coach.developmentBonus * 4.8)
    + (coach.personalityFit * 0.6)
    + Math.min(0.9, coach.experienceYears * 0.04);
  return Math.round(value * 100) / 100;
}

export function calculateStaffBudget(teamBudget: number): number {
  return Math.round(clamp(teamBudget * 0.04, 6, 14) * 100) / 100;
}

export function calculateCoachingPayroll(staff: Coach[]): number {
  return Math.round(staff.reduce((sum, coach) => sum + coach.annualSalary, 0) * 100) / 100;
}

export function generateCoachingStaff(rng: GameRNG, teamId: string): Coach[] {
  return COACH_ROLES.map((role) => generateCoach(rng.fork(), role, teamId))
    .sort((left, right) => left.role.localeCompare(right.role));
}

export function generateCoachFreeAgents(rng: GameRNG, count = COACH_ROLES.length * 2): Coach[] {
  const pool: Coach[] = [];
  for (let index = 0; index < count; index += 1) {
    const role = COACH_ROLES[index % COACH_ROLES.length]!;
    pool.push(generateCoach(rng.fork(), role, null));
  }
  return pool.sort((left, right) => {
    const salaryDiff = right.annualSalary - left.annualSalary;
    return salaryDiff !== 0 ? salaryDiff : left.id.localeCompare(right.id);
  });
}

export function getCoachingDevelopmentModifier(
  player: GeneratedPlayer,
  staff: Coach[],
  level: Exclude<RosterLevel, 'FREE_AGENT' | 'RETIRED'> | null = player.rosterStatus,
): number {
  if (staff.length === 0) {
    return 0.92;
  }

  const relevantRoles = new Set(relevantRolesForPlayer(player, level));
  const need = primaryNeed(player);
  const relevantStaff = staff.filter((coach) => relevantRoles.has(coach.role));
  if (relevantStaff.length === 0) {
    return 0.95;
  }

  const aggregate = relevantStaff.reduce((sum, coach) => {
    const specialtyBonus = coach.specialty === need ? 0.08 : coach.specialty === 'leadership' || coach.specialty === 'mlb_prep' ? 0.03 : 0;
    return sum + (coach.teachingAbility * 0.55) + coach.developmentBonus + (coach.personalityFit * 0.15) + specialtyBonus;
  }, 0);
  const average = aggregate / relevantStaff.length;
  return Math.round(clamp(0.82 + average * 0.35, 0.82, 1.45) * 1000) / 1000;
}

export function hireCoach(
  coachingStaffs: Map<string, Coach[]>,
  coachFreeAgentPool: Coach[],
  teamId: string,
  coachId: string,
): { coachingStaffs: Map<string, Coach[]>; coachFreeAgentPool: Coach[]; hiredCoach: Coach | null } {
  const candidate = coachFreeAgentPool.find((coach) => coach.id === coachId) ?? null;
  if (!candidate) {
    return {
      coachingStaffs,
      coachFreeAgentPool,
      hiredCoach: null,
    };
  }

  const nextStaffMap = new Map(coachingStaffs);
  const currentStaff = nextStaffMap.get(teamId) ?? [];
  const filteredStaff = currentStaff.filter((coach) => coach.role !== candidate.role);
  const hiredCoach = { ...candidate, teamId };
  nextStaffMap.set(teamId, [...filteredStaff, hiredCoach].sort((left, right) => left.role.localeCompare(right.role)));

  return {
    coachingStaffs: nextStaffMap,
    coachFreeAgentPool: coachFreeAgentPool.filter((coach) => coach.id !== coachId),
    hiredCoach,
  };
}

export function fireCoach(
  coachingStaffs: Map<string, Coach[]>,
  coachFreeAgentPool: Coach[],
  teamId: string,
  coachId: string,
): { coachingStaffs: Map<string, Coach[]>; coachFreeAgentPool: Coach[]; firedCoach: Coach | null } {
  const currentStaff = coachingStaffs.get(teamId) ?? [];
  const firedCoach = currentStaff.find((coach) => coach.id === coachId) ?? null;
  if (!firedCoach) {
    return {
      coachingStaffs,
      coachFreeAgentPool,
      firedCoach: null,
    };
  }

  const nextStaffMap = new Map(coachingStaffs);
  nextStaffMap.set(teamId, currentStaff.filter((coach) => coach.id !== coachId));

  return {
    coachingStaffs: nextStaffMap,
    coachFreeAgentPool: [...coachFreeAgentPool, { ...firedCoach, teamId: null }]
      .sort((left, right) => left.role.localeCompare(right.role) || left.id.localeCompare(right.id)),
    firedCoach,
  };
}

export function getCoachSpecialtyForPosition(position: Position): CoachSpecialty {
  switch (position) {
    case 'SP':
      return 'stamina';
    case 'RP':
    case 'CL':
      return 'stuff';
    case 'SS':
    case 'CF':
      return 'defense';
    case '1B':
    case 'LF':
    case 'RF':
    case 'DH':
      return 'power';
    case '2B':
    case '3B':
    case 'C':
    default:
      return 'contact';
  }
}
