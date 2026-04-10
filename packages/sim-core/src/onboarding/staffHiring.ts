import type { GMPhilosophy } from './flowEngine.js';
import type { GameRNG } from '../math/prng.js';
import {
  generateCoachingStaff,
  type Coach,
  type CoachRole,
} from '../player/coaching.js';
import {
  generateScoutingStaff,
  type Scout,
} from '../scouting/scoutingEngine.js';

export type ManagerStyle = 'analytics' | 'traditional' | 'players_manager';
export type PitchingCoachStyle = 'development' | 'game_planning';
export type HittingCoachStyle = 'approach' | 'power';

export interface StaffCandidate {
  id: string;
  role: CoachRole;
  name: string;
  age: number;
  experience: number;
  style: string;
  teachingGrade: number;
  specialty: string;
  personality: string;
  strengths: string[];
  weaknesses: string[];
  coach: Coach;
}

export interface StaffHiringSlate {
  managerCandidates: [StaffCandidate, StaffCandidate, StaffCandidate];
  pitchingCoachCandidates: [StaffCandidate, StaffCandidate];
  hittingCoachCandidates: [StaffCandidate, StaffCandidate];
}

export interface StaffHireChoices {
  managerId: string;
  pitchingCoachId: string;
  hittingCoachId: string;
}

export interface OnboardingTeamContext {
  teamId: string;
  teamName: string;
  coachingStaff: Coach[];
  scoutingStaff: Scout[];
}

export interface ManagerStyleModifier {
  bullpenUsageBias: number;
  playerTrustBonus: number;
  developmentSupport: number;
}

export interface AppliedStaffHires extends OnboardingTeamContext {
  coachingStaff: Coach[];
  hires: StaffHireChoices;
}

export interface ScoutingDirectorCandidate {
  id: string;
  name: string;
  age: number;
  experience: number;
  specialty: GMPhilosophy['scoutingFocus'];
  networkStrength: number;
  evaluationAccuracy: number;
  strengths: string[];
  weaknesses: string[];
  scout: Scout;
}

export interface PersistedScoutingDirector {
  id: string;
  name: string;
  age: number;
  experience: number;
  specialty: GMPhilosophy['scoutingFocus'];
  networkStrength: number;
  evaluationAccuracy: number;
  strengths: string[];
  weaknesses: string[];
}

export interface ScoutingHiringSlate {
  candidates: [ScoutingDirectorCandidate, ScoutingDirectorCandidate, ScoutingDirectorCandidate];
}

export interface AppliedScoutingHire {
  scoutingDirector: PersistedScoutingDirector;
  scoutingFocus: GMPhilosophy['scoutingFocus'];
}

const MANAGER_STYLE_MODIFIERS: Record<ManagerStyle, ManagerStyleModifier> = {
  analytics: {
    bullpenUsageBias: 2,
    playerTrustBonus: -1,
    developmentSupport: 1,
  },
  traditional: {
    bullpenUsageBias: -1,
    playerTrustBonus: 0,
    developmentSupport: 2,
  },
  players_manager: {
    bullpenUsageBias: 0,
    playerTrustBonus: 3,
    developmentSupport: 1,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function teachingGradeFromCoach(coach: Coach, bonus: number): number {
  return clamp(Math.round((coach.teachingAbility * 30) + 45 + bonus), 50, 80);
}

function nameFromCoach(coach: Coach): string {
  return `${coach.firstName} ${coach.lastName}`;
}

function candidateAge(rng: GameRNG, experience: number, min: number, max: number): number {
  return clamp(34 + experience + rng.nextInt(0, 6), min, max);
}

function roleCoach(rng: GameRNG, teamId: string, role: CoachRole): Coach {
  const staff = generateCoachingStaff(rng, `${teamId}-onboarding`);
  const coach = staff.find((candidate) => candidate.role === role);
  if (coach == null) {
    throw new Error(`Missing generated coach for role ${role}`);
  }

  return coach;
}

function createManagerCandidate(
  context: OnboardingTeamContext,
  rng: GameRNG,
  index: number,
  style: ManagerStyle,
): StaffCandidate {
  const base = roleCoach(rng.fork(), context.teamId, 'manager');
  const experience = clamp(base.experienceYears + 8 + index, 8, 30);
  const teachingGrade = teachingGradeFromCoach(base, style === 'traditional' ? 6 : style === 'players_manager' ? 4 : 2);

  const styleDetails: Record<ManagerStyle, Omit<StaffCandidate, 'id' | 'role' | 'name' | 'age' | 'experience' | 'teachingGrade' | 'coach'>> = {
    analytics: {
      style: 'analytics',
      specialty: 'Run-prevention optimization',
      personality: 'detail-driven',
      strengths: ['Lineup leverage', 'Bullpen matchup usage', 'Preparation detail'],
      weaknesses: ['Can over-explain adjustments', 'Not naturally loose with media'],
    },
    traditional: {
      style: 'traditional',
      specialty: 'Routine and accountability',
      personality: 'steady-handed',
      strengths: ['Clubhouse structure', 'Fundamental play', 'Pitcher rhythm'],
      weaknesses: ['Slow to embrace experimentation', 'Can trust veterans too long'],
    },
    players_manager: {
      style: 'players_manager',
      specialty: 'Communication and buy-in',
      personality: 'player-friendly',
      strengths: ['Clubhouse trust', 'Conflict management', 'Young-player confidence'],
      weaknesses: ['Less rigid in preparation', 'Needs strong staff around him'],
    },
  };

  const id = `staff-${context.teamId}-manager-${style}`;

  return {
    id,
    role: 'manager',
    name: nameFromCoach(base),
    age: candidateAge(rng.fork(), experience, 42, 69),
    experience,
    teachingGrade,
    coach: {
      ...base,
      id,
      role: 'manager',
      teamId: context.teamId,
      experienceYears: experience,
      teachingAbility: teachingGrade / 100,
      personalityFit: clamp(base.personalityFit + (style === 'players_manager' ? 0.1 : 0), 0.3, 1),
    },
    ...styleDetails[style],
  };
}

function createPitchingCandidate(
  context: OnboardingTeamContext,
  rng: GameRNG,
  style: PitchingCoachStyle,
): StaffCandidate {
  const base = roleCoach(rng.fork(), context.teamId, 'pitching_coach');
  const experience = clamp(base.experienceYears + 5, 4, 24);
  const teachingGrade = teachingGradeFromCoach(base, style === 'development' ? 5 : 3);
  const id = `staff-${context.teamId}-pitching-${style}`;

  return {
    id,
    role: 'pitching_coach',
    name: nameFromCoach(base),
    age: candidateAge(rng.fork(), experience, 38, 67),
    experience,
    style,
    teachingGrade,
    specialty: style === 'development' ? 'Pitch design and growth plans' : 'Game-planning and attack sequencing',
    personality: style === 'development' ? 'teacher' : 'strategist',
    strengths: style === 'development'
      ? ['Prospect polish', 'Delivery cleanup', 'Long-term pitch usage']
      : ['Advance reports', 'Series planning', 'Bullpen sequencing'],
    weaknesses: style === 'development'
      ? ['Less polished in-game tactician', 'Can be patient with veterans']
      : ['Shorter development leash', 'Can prioritize matchup wins over growth'],
    coach: {
      ...base,
      id,
      role: 'pitching_coach',
      teamId: context.teamId,
      experienceYears: experience,
      teachingAbility: teachingGrade / 100,
    },
  };
}

function createHittingCandidate(
  context: OnboardingTeamContext,
  rng: GameRNG,
  style: HittingCoachStyle,
): StaffCandidate {
  const base = roleCoach(rng.fork(), context.teamId, 'hitting_coach');
  const experience = clamp(base.experienceYears + 4, 4, 24);
  const teachingGrade = teachingGradeFromCoach(base, style === 'approach' ? 4 : 5);
  const id = `staff-${context.teamId}-hitting-${style}`;

  return {
    id,
    role: 'hitting_coach',
    name: nameFromCoach(base),
    age: candidateAge(rng.fork(), experience, 37, 66),
    experience,
    style,
    teachingGrade,
    specialty: style === 'approach' ? 'Plate discipline and contact shape' : 'Damage contact and pull-side lift',
    personality: style === 'approach' ? 'methodical' : 'energetic',
    strengths: style === 'approach'
      ? ['Strike-zone plans', 'Contact quality', 'Two-strike adjustments']
      : ['Power unlocks', 'Damage intent', 'Confidence at the plate'],
    weaknesses: style === 'approach'
      ? ['Can mute aggression', 'Less focused on slugging spikes']
      : ['Swing-and-miss risk', 'Less patient with table-setters'],
    coach: {
      ...base,
      id,
      role: 'hitting_coach',
      teamId: context.teamId,
      experienceYears: experience,
      teachingAbility: teachingGrade / 100,
    },
  };
}

function createScoutingDirectorCandidate(
  context: OnboardingTeamContext,
  rng: GameRNG,
  specialty: GMPhilosophy['scoutingFocus'],
  index: number,
): ScoutingDirectorCandidate {
  const scout = generateScoutingStaff(rng.fork(), `${context.teamId}-director`)[index]!;
  const evaluationAccuracy = clamp(Math.round((scout.quality * 0.4) + 40 + (specialty === 'pro_scouting' ? 4 : 0)), 40, 80);
  const networkStrength = clamp(Math.round((scout.quality * 0.35) + 42 + (specialty === 'international' ? 5 : specialty === 'draft' ? 3 : 0)), 40, 80);

  return {
    id: `scouting-${context.teamId}-${specialty}`,
    name: scout.name,
    age: clamp(41 + index + rng.nextInt(0, 7), 41, 68),
    experience: clamp(9 + index + rng.nextInt(0, 12), 8, 28),
    specialty,
    networkStrength,
    evaluationAccuracy,
    strengths: specialty === 'draft'
      ? ['Amateur board discipline', 'Regional relationships', 'Cross-check sync']
      : specialty === 'international'
        ? ['Global contact network', 'Early-market coverage', 'Latin America presence']
        : ['Trade-target reads', '40-man market coverage', 'Pro advance work'],
    weaknesses: specialty === 'draft'
      ? ['Less aggressive internationally', 'Can defer pro coverage']
      : specialty === 'international'
        ? ['Less ownership-facing polish', 'Needs help on pro follow coverage']
        : ['Less patient with long-horizon teenagers', 'Not a pure draft board specialist'],
    scout: {
      ...scout,
      id: `scout-${context.teamId}-${specialty}`,
    },
  };
}

function replaceRole(staff: Coach[], replacement: Coach): Coach[] {
  return staff.map((coach) => (
    coach.role === replacement.role
      ? { ...replacement, teamId: coach.teamId }
      : coach
  ));
}

export function getManagerStyleModifier(style: ManagerStyle): ManagerStyleModifier {
  return MANAGER_STYLE_MODIFIERS[style];
}

export function generateStaffHiringSlate(
  context: OnboardingTeamContext,
  rng: GameRNG,
): StaffHiringSlate {
  return {
    managerCandidates: [
      createManagerCandidate(context, rng.fork(), 0, 'analytics'),
      createManagerCandidate(context, rng.fork(), 1, 'traditional'),
      createManagerCandidate(context, rng.fork(), 2, 'players_manager'),
    ],
    pitchingCoachCandidates: [
      createPitchingCandidate(context, rng.fork(), 'development'),
      createPitchingCandidate(context, rng.fork(), 'game_planning'),
    ],
    hittingCoachCandidates: [
      createHittingCandidate(context, rng.fork(), 'approach'),
      createHittingCandidate(context, rng.fork(), 'power'),
    ],
  };
}

function findStaffCandidate(slate: StaffHiringSlate, id: string): StaffCandidate {
  const candidate = [
    ...slate.managerCandidates,
    ...slate.pitchingCoachCandidates,
    ...slate.hittingCoachCandidates,
  ].find((entry) => entry.id === id);

  if (candidate == null) {
    throw new Error(`Unknown staff hire candidate: ${id}`);
  }

  return candidate;
}

export function applyStaffHires(
  context: OnboardingTeamContext,
  slate: StaffHiringSlate,
  hires: StaffHireChoices,
): AppliedStaffHires {
  let coachingStaff = [...context.coachingStaff];
  coachingStaff = replaceRole(coachingStaff, findStaffCandidate(slate, hires.managerId).coach);
  coachingStaff = replaceRole(coachingStaff, findStaffCandidate(slate, hires.pitchingCoachId).coach);
  coachingStaff = replaceRole(coachingStaff, findStaffCandidate(slate, hires.hittingCoachId).coach);

  return {
    ...context,
    coachingStaff,
    hires,
  };
}

export function generateScoutingHiringSlate(
  context: OnboardingTeamContext,
  rng: GameRNG,
): ScoutingHiringSlate {
  return {
    candidates: [
      createScoutingDirectorCandidate(context, rng.fork(), 'draft', 0),
      createScoutingDirectorCandidate(context, rng.fork(), 'international', 1),
      createScoutingDirectorCandidate(context, rng.fork(), 'pro_scouting', 2),
    ],
  };
}

export function applyScoutingHire(
  _context: OnboardingTeamContext,
  slate: ScoutingHiringSlate,
  scoutingDirectorId: string,
): AppliedScoutingHire {
  const selected = slate.candidates.find((candidate) => candidate.id === scoutingDirectorId);
  if (selected == null) {
    throw new Error(`Unknown scouting director candidate: ${scoutingDirectorId}`);
  }

  return {
    scoutingDirector: {
      id: selected.id,
      name: selected.name,
      age: selected.age,
      experience: selected.experience,
      specialty: selected.specialty,
      networkStrength: selected.networkStrength,
      evaluationAccuracy: selected.evaluationAccuracy,
      strengths: [...selected.strengths],
      weaknesses: [...selected.weaknesses],
    },
    scoutingFocus: selected.specialty,
  };
}
