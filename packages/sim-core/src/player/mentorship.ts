import type { MentorRelationship } from '@mbd/contracts';
import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from './generation.js';
import { countMatchingTraits } from './personalityTraits.js';

export interface MentorshipPairing {
  mentorId: string;
  protegeeId: string;
  quality: number;
  compatibilityFactors: string[];
  developmentBonus: number;
}

export interface MentorshipEvent {
  type: 'breakthrough' | 'tension' | 'graduated' | 'bonding';
  mentorId: string;
  protegeeId: string;
  description: string;
  impactDelta: number;
}

const ELIGIBLE_MENTOR_TRAITS = new Set([
  'Leader',
  'Mentor',
  'Team First',
  'Hard Worker',
  'Veteran Presence',
]);

const ELIGIBLE_PROTEGEE_LEVELS = new Set<GeneratedPlayer['rosterStatus']>(['MLB', 'AAA', 'AA']);
const ELIGIBLE_PROTEGEE_PHASES = new Set<GeneratedPlayer['developmentPhase']>(['Prospect', 'Ascent']);
const MAX_PROTEGEES_PER_MENTOR = 2;
const SHARED_TRAIT_BONUS = 15;
const SAME_TEAM_BONUS = 20;
const IDEAL_AGE_GAP_MIN = 8;
const IDEAL_AGE_GAP_MAX = 12;
const IDEAL_AGE_GAP_BONUS = 10;
const LEADERSHIP_SCALE = 0.3;
const MAX_QUALITY = 100;
const MIN_QUALITY = 0;
const MAX_DEVELOPMENT_BONUS = 0.15;
const TOTAL_DEVELOPMENT_BONUS_CAP = 0.2;
const EVENT_CHANCE = 0.15;
const BREAKTHROUGH_DELTA = 0.02;
const TENSION_DELTA = -0.01;
const BONDING_DELTA = 0.01;
const GRADUATED_DELTA = 0.03;
const ROUND_TO_HUNDREDTH = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToHundredth(value: number): number {
  return Math.round(value * ROUND_TO_HUNDREDTH) / ROUND_TO_HUNDREDTH;
}

function isPitcher(player: GeneratedPlayer): boolean {
  return player.pitcherAttributes != null || player.position === 'SP' || player.position === 'RP' || player.position === 'CL';
}

function samePositionGroup(left: GeneratedPlayer, right: GeneratedPlayer): boolean {
  return isPitcher(left) === isPitcher(right);
}

function mentorTraitCount(player: GeneratedPlayer): number {
  return countMatchingTraits(player.personalityTraits, ELIGIBLE_MENTOR_TRAITS);
}

function sharedTraits(left: GeneratedPlayer, right: GeneratedPlayer): string[] {
  const rightTraits = new Set(right.personalityTraits ?? []);
  return (left.personalityTraits ?? []).filter((trait) => rightTraits.has(trait));
}

function buildPairingQuality(mentor: GeneratedPlayer, protegee: GeneratedPlayer): {
  quality: number;
  factors: string[];
} {
  let quality = 0;
  const factors: string[] = [];
  const shared = sharedTraits(mentor, protegee);
  if (shared.length > 0) {
    quality += shared.length * SHARED_TRAIT_BONUS;
    factors.push(`Shared traits: ${shared.join(', ')}.`);
  }

  quality += mentor.personality.leadership * LEADERSHIP_SCALE;
  factors.push(`Mentor leadership: ${mentor.personality.leadership}.`);

  if (mentor.teamId === protegee.teamId) {
    quality += SAME_TEAM_BONUS;
    factors.push('Same team context.');
  }

  const ageGap = mentor.age - protegee.age;
  if (ageGap >= IDEAL_AGE_GAP_MIN && ageGap <= IDEAL_AGE_GAP_MAX) {
    quality += IDEAL_AGE_GAP_BONUS;
    factors.push('Ideal age gap for mentorship.');
  }

  return {
    quality: Math.round(clamp(quality, MIN_QUALITY, MAX_QUALITY)),
    factors,
  };
}

function pairingBonus(quality: number): number {
  return roundToHundredth((quality / MAX_QUALITY) * MAX_DEVELOPMENT_BONUS);
}

function eventDescription(
  type: MentorshipEvent['type'],
  pairing: MentorshipPairing,
): string {
  switch (type) {
    case 'bonding':
      return `Mentor ${pairing.mentorId} and protegee ${pairing.protegeeId} strengthened their routine work together.`;
    case 'breakthrough':
      return `Mentor ${pairing.mentorId} helped protegee ${pairing.protegeeId} unlock a breakthrough month.`;
    case 'tension':
      return `Mentor ${pairing.mentorId} and protegee ${pairing.protegeeId} hit tension over the current development plan.`;
    case 'graduated':
      return `Mentor ${pairing.mentorId} has taken protegee ${pairing.protegeeId} as far as this pairing can go.`;
    default:
      return `Mentor ${pairing.mentorId} and protegee ${pairing.protegeeId} logged a mentorship update.`;
  }
}

function parseSummary(summary: string): {
  quality: number;
  developmentBonus: number;
  compatibilityFactors: string[];
} {
  const qualityMatch = /quality (\d+)/i.exec(summary);
  const bonusMatch = /development bonus ([\d.]+)/i.exec(summary);
  const factorsMatch = /factors:\s*(.+)$/i.exec(summary);

  const quality = qualityMatch ? Number(qualityMatch[1]) : 50;
  const developmentBonus = bonusMatch ? Number(bonusMatch[1]) : pairingBonus(quality);
  const compatibilityFactors = factorsMatch
    ? factorsMatch[1]!.split(',').map((factor) => factor.trim()).filter(Boolean)
    : [summary];

  return {
    quality: Math.round(clamp(quality, MIN_QUALITY, MAX_QUALITY)),
    developmentBonus: roundToHundredth(clamp(developmentBonus, 0, MAX_DEVELOPMENT_BONUS)),
    compatibilityFactors,
  };
}

export function findMentorCandidates(players: GeneratedPlayer[]): GeneratedPlayer[] {
  return players.filter((player) =>
    player.rosterStatus === 'MLB'
    && player.age >= 30
    && player.personality.leadership >= 60
    && mentorTraitCount(player) > 0,
  );
}

export function findProtegeeCandidates(players: GeneratedPlayer[]): GeneratedPlayer[] {
  return players.filter((player) =>
    ELIGIBLE_PROTEGEE_LEVELS.has(player.rosterStatus)
    && player.age <= 25
    && ELIGIBLE_PROTEGEE_PHASES.has(player.developmentPhase),
  );
}

export function pairMentors(
  rng: GameRNG,
  mentors: GeneratedPlayer[],
  protegees: GeneratedPlayer[],
): MentorshipPairing[] {
  const mentorLoads = new Map<string, number>();
  const pairings: MentorshipPairing[] = [];
  const sortedProtegees = [...protegees].sort((left, right) =>
    left.teamId.localeCompare(right.teamId) || left.id.localeCompare(right.id),
  );

  for (const protegee of sortedProtegees) {
    const candidates = mentors
      .filter((mentor) => samePositionGroup(mentor, protegee))
      .filter((mentor) => (mentorLoads.get(mentor.id) ?? 0) < MAX_PROTEGEES_PER_MENTOR)
      .map((mentor) => ({
        mentor,
        score: buildPairingQuality(mentor, protegee),
      }))
      .filter((entry) => entry.score.quality > 0);

    if (candidates.length === 0) {
      continue;
    }

    const highestQuality = Math.max(...candidates.map((entry) => entry.score.quality));
    const bestCandidates = candidates.filter((entry) => entry.score.quality === highestQuality);
    const chosen = bestCandidates.length === 1
      ? bestCandidates[0]!
      : rng.weightedPick(
        bestCandidates,
        bestCandidates.map((entry) => Math.max(1, entry.score.quality)),
      );

    mentorLoads.set(chosen.mentor.id, (mentorLoads.get(chosen.mentor.id) ?? 0) + 1);
    pairings.push({
      mentorId: chosen.mentor.id,
      protegeeId: protegee.id,
      quality: chosen.score.quality,
      compatibilityFactors: chosen.score.factors,
      developmentBonus: pairingBonus(chosen.score.quality),
    });
  }

  return pairings;
}

export function advanceMentorship(
  rng: GameRNG,
  pairing: MentorshipPairing,
  monthsActive: number,
): MentorshipEvent | null {
  if (rng.nextFloat() >= EVENT_CHANCE) {
    return null;
  }

  const eventTypes: MentorshipEvent['type'][] = monthsActive >= 6
    ? ['bonding', 'breakthrough', 'tension', 'graduated']
    : ['bonding', 'breakthrough', 'tension'];
  const eventWeights = monthsActive >= 6
    ? [40, 30, 20, 10]
    : [40, 30, 20];
  const eventType = rng.weightedPick(eventTypes, eventWeights);

  let impactDelta = 0;
  switch (eventType) {
    case 'bonding':
      impactDelta = BONDING_DELTA;
      break;
    case 'breakthrough':
      impactDelta = BREAKTHROUGH_DELTA;
      break;
    case 'tension':
      impactDelta = TENSION_DELTA;
      break;
    case 'graduated':
      impactDelta = GRADUATED_DELTA;
      break;
  }

  return {
    type: eventType,
    mentorId: pairing.mentorId,
    protegeeId: pairing.protegeeId,
    description: eventDescription(eventType, pairing),
    impactDelta,
  };
}

export function getMentorshipDevelopmentBonus(
  pairings: MentorshipPairing[],
  playerId: string,
): number {
  const total = pairings
    .filter((pairing) => pairing.protegeeId === playerId)
    .reduce((sum, pairing) => sum + pairing.developmentBonus, 0);
  return roundToHundredth(clamp(total, 0, TOTAL_DEVELOPMENT_BONUS_CAP));
}

export function toMentorRelationship(
  pairing: MentorshipPairing,
  teamId: string,
  startedSeason: number,
): MentorRelationship {
  return {
    veteranPlayerId: pairing.mentorId,
    rookiePlayerId: pairing.protegeeId,
    teamId,
    startedSeason,
    summary: `Mentorship quality ${pairing.quality}; development bonus ${pairing.developmentBonus.toFixed(2)}; factors: ${pairing.compatibilityFactors.join(', ')}`,
  };
}

export function fromMentorRelationship(
  relationship: MentorRelationship,
): MentorshipPairing {
  const parsed = parseSummary(relationship.summary);
  return {
    mentorId: relationship.veteranPlayerId,
    protegeeId: relationship.rookiePlayerId,
    quality: parsed.quality,
    compatibilityFactors: parsed.compatibilityFactors,
    developmentBonus: parsed.developmentBonus,
  };
}
