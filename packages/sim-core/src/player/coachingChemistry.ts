import type { GeneratedPlayer } from './generation.js';
import type { Coach } from './coaching.js';
import { COACH_ROLES, COACH_SPECIALTIES } from './coaching.js';

export interface CoachSynergy {
  coachAId: string;
  coachBId: string;
  synergyScore: number;
  factors: string[];
}

export interface CoachPlayerAffinity {
  coachId: string;
  playerId: string;
  affinityScore: number;
  factors: string[];
}

export interface StaffHarmony {
  overallScore: number;
  synergies: CoachSynergy[];
  weakestLink: CoachSynergy | null;
  strongestBond: CoachSynergy | null;
}

export interface ChemistryIssue {
  severity: 'low' | 'medium' | 'high';
  description: string;
  involvedIds: string[];
}

type CoachWithTraits = Coach & { personalityTraits?: string[] };

const NEUTRAL_HARMONY_SCORE = 50;
const BASE_SYNERGY_SCORE = 40;
const BASE_AFFINITY_SCORE = 20;
const MIN_SCORE = 0;
const MAX_SCORE = 100;
const COMPLEMENTARY_SPECIALTY_BONUS = 20;
const OVERLAPPING_SPECIALTY_PENALTY = 6;
const TEACHING_ALIGNMENT_THRESHOLD = 0.15;
const TEACHING_ALIGNMENT_BONUS = 15;
const TEACHING_MISMATCH_THRESHOLD = 0.35;
const TEACHING_MISMATCH_PENALTY = 6;
const SHARED_TRAIT_BONUS = 10;
const CONFLICTING_TRAIT_PENALTY = 15;
const ROLE_COMPATIBILITY_BONUS = 10;
const SAME_TEAM_BONUS = 5;
const ROLE_MATCH_BONUS = 25;
const POSITION_GROUP_BONUS = 10;
const SPECIALTY_MATCH_BONUS = 15;
const SHARED_COACH_PLAYER_TRAIT_BONUS = 10;
const HIGH_WORK_ETHIC_THRESHOLD = 70;
const LOW_WORK_ETHIC_THRESHOLD = 40;
const HIGH_TEACHING_THRESHOLD = 0.75;
const STRICT_TEACHING_THRESHOLD = 0.85;
const WORK_ETHIC_ALIGNMENT_BONUS = 15;
const WORK_ETHIC_MISMATCH_PENALTY = 10;
const LOW_SYNERGY_THRESHOLD = 45;
const HIGH_SEVERITY_THRESHOLD = 30;
const MIN_DEVELOPMENT_MULTIPLIER = 0.8;
const MAX_DEVELOPMENT_MULTIPLIER = 1.3;
const DEVELOPMENT_MULTIPLIER_RANGE = MAX_DEVELOPMENT_MULTIPLIER - MIN_DEVELOPMENT_MULTIPLIER;

const ROLE_COMPATIBILITY_PAIRS = new Set([
  'bullpen_coach:pitching_coach',
  'first_base_coach:hitting_coach',
  'hitting_coach:third_base_coach',
]);

const TRAIT_CONFLICT_PAIRS = new Set([
  'Diva:Leader',
  'Diva:Mentor',
  'Hard Worker:Party Animal',
  'Hot Head:Quiet Professional',
  'Mercenary:Team First',
]);

const HITTER_SPECIALTY_MATCHES = new Set([
  'power',
  'contact',
  'speed',
  'defense',
  'durability',
  'mlb_prep',
]);

const PITCHER_SPECIALTY_MATCHES = new Set([
  'stuff',
  'control',
  'velocity',
  'breaking',
  'stamina',
  'mlb_prep',
]);

const HITTER_PROGRAM_TO_SPECIALTY: Partial<Record<NonNullable<GeneratedPlayer['developmentProgram']>, Coach['specialty']>> = {
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

const PITCHER_PROGRAM_TO_SPECIALTY: Partial<Record<NonNullable<GeneratedPlayer['developmentProgram']>, Coach['specialty']>> = {
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

function uniqueTraits(traits: string[]): string[] {
  return Array.from(new Set(traits));
}

function isPitcher(player: GeneratedPlayer): boolean {
  return player.pitcherAttributes != null || player.position === 'SP' || player.position === 'RP' || player.position === 'CL';
}

function isPitchingRole(role: Coach['role']): boolean {
  return role === 'pitching_coach' || role === 'bullpen_coach';
}

function isHittingRole(role: Coach['role']): boolean {
  return role === 'hitting_coach' || role === 'bench_coach' || role === 'first_base_coach' || role === 'third_base_coach';
}

function pairKey(left: string, right: string): string {
  return [left, right].sort((first, second) => first.localeCompare(second)).join(':');
}

function traitConflictKey(left: string, right: string): string {
  return [left, right].sort((first, second) => first.localeCompare(second)).join(':');
}

function coachTraits(coach: Coach): string[] {
  const explicitTraits = (coach as CoachWithTraits).personalityTraits;
  if (explicitTraits && explicitTraits.length > 0) {
    return uniqueTraits(explicitTraits);
  }

  const traits: string[] = [];
  if (coach.role === 'manager' || coach.role === 'bench_coach' || coach.role === 'farm_director' || coach.specialty === 'leadership') {
    traits.push('Leader');
  }
  if (coach.personalityFit >= 0.8) {
    traits.push('Team First');
  }
  if (coach.teachingAbility >= 0.8) {
    traits.push('Hard Worker');
  }
  if (coach.specialty === 'mlb_prep') {
    traits.push('Mentor');
  }
  if (coach.personalityFit <= 0.45) {
    traits.push('Moody');
  }
  return traits;
}

function sharedTraits(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((trait) => rightSet.has(trait));
}

function conflictCount(leftTraits: string[], rightTraits: string[]): number {
  let conflicts = 0;
  for (const left of leftTraits) {
    for (const right of rightTraits) {
      if (TRAIT_CONFLICT_PAIRS.has(traitConflictKey(left, right))) {
        conflicts += 1;
      }
    }
  }
  return conflicts;
}

function sameTeam(coachA: Coach, coachB: Coach): boolean {
  return coachA.teamId != null && coachA.teamId === coachB.teamId;
}

function primaryPlayerNeed(player: GeneratedPlayer): Coach['specialty'] {
  if (player.pitcherAttributes) {
    const programMatch = player.developmentProgram ? PITCHER_PROGRAM_TO_SPECIALTY[player.developmentProgram] : null;
    if (programMatch) {
      return programMatch;
    }

    const needs: Array<[Coach['specialty'], number]> = [
      ['stuff', player.pitcherAttributes.stuff],
      ['control', player.pitcherAttributes.control],
      ['stamina', player.pitcherAttributes.stamina],
      ['velocity', player.pitcherAttributes.velocity],
      ['breaking', player.pitcherAttributes.movement],
    ];
    return needs.sort((left, right) => left[1] - right[1])[0]?.[0] ?? 'stuff';
  }

  const programMatch = player.developmentProgram ? HITTER_PROGRAM_TO_SPECIALTY[player.developmentProgram] : null;
  if (programMatch) {
    return programMatch;
  }

  const needs: Array<[Coach['specialty'], number]> = [
    ['contact', player.hitterAttributes.contact],
    ['power', player.hitterAttributes.power],
    ['speed', player.hitterAttributes.speed],
    ['defense', player.hitterAttributes.defense],
    ['durability', player.hitterAttributes.durability],
  ];
  return needs.sort((left, right) => left[1] - right[1])[0]?.[0] ?? 'contact';
}

function coachSupportsPlayerGroup(coach: Coach, player: GeneratedPlayer): boolean {
  if (isPitcher(player)) {
    return isPitchingRole(coach.role) || PITCHER_SPECIALTY_MATCHES.has(coach.specialty);
  }
  return isHittingRole(coach.role) || HITTER_SPECIALTY_MATCHES.has(coach.specialty);
}

function playerHasMatchingCoach(player: GeneratedPlayer, coaches: Coach[]): boolean {
  const primaryNeed = primaryPlayerNeed(player);
  return coaches.some((coach) =>
    coachSupportsPlayerGroup(coach, player)
    && (coach.specialty === primaryNeed || coach.specialty === 'mlb_prep'),
  );
}

export function calculateCoachSynergy(coachA: Coach, coachB: Coach): CoachSynergy {
  let synergyScore = BASE_SYNERGY_SCORE;
  const factors: string[] = [];

  if (coachA.specialty !== coachB.specialty) {
    synergyScore += COMPLEMENTARY_SPECIALTY_BONUS;
    factors.push('Complementary specialties broaden the staff toolkit.');
  } else {
    synergyScore -= OVERLAPPING_SPECIALTY_PENALTY;
    factors.push('Overlapping specialties reduce diversification.');
  }

  const teachingGap = Math.abs(coachA.teachingAbility - coachB.teachingAbility);
  if (teachingGap <= TEACHING_ALIGNMENT_THRESHOLD) {
    synergyScore += TEACHING_ALIGNMENT_BONUS;
    factors.push('Teaching styles are closely aligned.');
  } else if (teachingGap >= TEACHING_MISMATCH_THRESHOLD) {
    synergyScore -= TEACHING_MISMATCH_PENALTY;
    factors.push('Teaching styles pull in different directions.');
  }

  const coachATraits = coachTraits(coachA);
  const coachBTraits = coachTraits(coachB);
  const shared = sharedTraits(coachATraits, coachBTraits);
  if (shared.length > 0) {
    synergyScore += shared.length * SHARED_TRAIT_BONUS;
    factors.push(`Shared personality traits: ${shared.join(', ')}.`);
  }

  const conflicts = conflictCount(coachATraits, coachBTraits);
  if (conflicts > 0) {
    synergyScore -= conflicts * CONFLICTING_TRAIT_PENALTY;
    factors.push('Conflicting personalities create friction.');
  }

  if (ROLE_COMPATIBILITY_PAIRS.has(pairKey(coachA.role, coachB.role))) {
    synergyScore += ROLE_COMPATIBILITY_BONUS;
    factors.push('Roles complement each other directly.');
  }

  if (sameTeam(coachA, coachB)) {
    synergyScore += SAME_TEAM_BONUS;
    factors.push('Shared clubhouse context improves coordination.');
  }

  return {
    coachAId: coachA.id,
    coachBId: coachB.id,
    synergyScore: Math.round(clamp(synergyScore, MIN_SCORE, MAX_SCORE)),
    factors,
  };
}

export function calculateCoachPlayerAffinity(coach: Coach, player: GeneratedPlayer): CoachPlayerAffinity {
  let affinityScore = BASE_AFFINITY_SCORE;
  const factors: string[] = [];
  const playerIsPitcher = isPitcher(player);
  const positionMatch = playerIsPitcher ? isPitchingRole(coach.role) : isHittingRole(coach.role);
  const positionGroupMatch = coachSupportsPlayerGroup(coach, player);
  const primaryNeed = primaryPlayerNeed(player);

  if (positionMatch) {
    affinityScore += ROLE_MATCH_BONUS;
    factors.push('Coach role fits the player position group.');
  }

  if (positionGroupMatch) {
    affinityScore += POSITION_GROUP_BONUS;
    factors.push('Coach works with the player position group.');
  }

  if (coach.specialty === primaryNeed) {
    affinityScore += SPECIALTY_MATCH_BONUS;
    factors.push('Coach specialty matches the player development need.');
  }

  const shared = sharedTraits(coachTraits(coach), player.personalityTraits ?? []);
  if (shared.length > 0) {
    affinityScore += shared.length * SHARED_COACH_PLAYER_TRAIT_BONUS;
    factors.push(`Coach and player share traits: ${shared.join(', ')}.`);
  }

  if (coach.teachingAbility >= HIGH_TEACHING_THRESHOLD && player.personality.workEthic >= HIGH_WORK_ETHIC_THRESHOLD) {
    affinityScore += WORK_ETHIC_ALIGNMENT_BONUS;
    factors.push('High work ethic matches a demanding teacher.');
  } else if (coach.teachingAbility >= STRICT_TEACHING_THRESHOLD && player.personality.workEthic <= LOW_WORK_ETHIC_THRESHOLD) {
    affinityScore -= WORK_ETHIC_MISMATCH_PENALTY;
    factors.push('Work ethic mismatch undermines coach trust.');
  }

  const conflicts = conflictCount(coachTraits(coach), player.personalityTraits ?? []);
  if (conflicts > 0) {
    affinityScore -= conflicts * CONFLICTING_TRAIT_PENALTY;
    factors.push('Personality conflicts reduce trust.');
  }

  return {
    coachId: coach.id,
    playerId: player.id,
    affinityScore: Math.round(clamp(affinityScore, MIN_SCORE, MAX_SCORE)),
    factors,
  };
}

export function calculateStaffHarmony(coaches: Coach[]): StaffHarmony {
  if (coaches.length < 2) {
    return {
      overallScore: NEUTRAL_HARMONY_SCORE,
      synergies: [],
      weakestLink: null,
      strongestBond: null,
    };
  }

  const synergies: CoachSynergy[] = [];
  for (let leftIndex = 0; leftIndex < coaches.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < coaches.length; rightIndex += 1) {
      synergies.push(calculateCoachSynergy(coaches[leftIndex]!, coaches[rightIndex]!));
    }
  }

  const overallScore = Math.round(
    synergies.reduce((sum, synergy) => sum + synergy.synergyScore, 0) / synergies.length,
  );

  return {
    overallScore,
    synergies,
    weakestLink: synergies.reduce<CoachSynergy | null>(
      (lowest, synergy) => (!lowest || synergy.synergyScore < lowest.synergyScore ? synergy : lowest),
      null,
    ),
    strongestBond: synergies.reduce<CoachSynergy | null>(
      (highest, synergy) => (!highest || synergy.synergyScore > highest.synergyScore ? synergy : highest),
      null,
    ),
  };
}

export function getCoachDevelopmentBonus(coach: Coach, player: GeneratedPlayer): number {
  const affinity = calculateCoachPlayerAffinity(coach, player).affinityScore;
  const multiplier = MIN_DEVELOPMENT_MULTIPLIER + ((affinity / MAX_SCORE) * DEVELOPMENT_MULTIPLIER_RANGE);
  return Number(clamp(multiplier, MIN_DEVELOPMENT_MULTIPLIER, MAX_DEVELOPMENT_MULTIPLIER).toFixed(2));
}

export function identifyChemistryIssues(
  coaches: Coach[],
  players: GeneratedPlayer[],
): ChemistryIssue[] {
  const issues: ChemistryIssue[] = [];

  const harmony = calculateStaffHarmony(coaches);
  for (const synergy of harmony.synergies) {
    if (synergy.synergyScore < LOW_SYNERGY_THRESHOLD) {
      issues.push({
        severity: synergy.synergyScore < HIGH_SEVERITY_THRESHOLD ? 'high' : 'medium',
        description: `Low synergy between coaches ${synergy.coachAId} and ${synergy.coachBId}.`,
        involvedIds: [synergy.coachAId, synergy.coachBId],
      });
    }
  }

  const hasPitchers = players.some((player) => isPitcher(player));
  const hasHitters = players.some((player) => !isPitcher(player));
  const hasPitchingCoverage = coaches.some((coach) => isPitchingRole(coach.role));
  const hasHittingCoverage = coaches.some((coach) => isHittingRole(coach.role));

  if (hasPitchers && !hasPitchingCoverage) {
    issues.push({
      severity: 'high',
      description: 'No pitching coach coverage on staff.',
      involvedIds: coaches.map((coach) => coach.id),
    });
  }

  if (hasHitters && !hasHittingCoverage) {
    issues.push({
      severity: 'medium',
      description: 'No hitting coach coverage on staff.',
      involvedIds: coaches.map((coach) => coach.id),
    });
  }

  for (const player of players) {
    if (!playerHasMatchingCoach(player, coaches)) {
      issues.push({
        severity: 'medium',
        description: `Player ${player.id} is without a matching coach.`,
        involvedIds: [player.id],
      });
    }
  }

  return issues;
}

void COACH_ROLES;
void COACH_SPECIALTIES;
