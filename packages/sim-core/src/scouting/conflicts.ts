import type { ScoutConflict, ScoutOpinion, ScoutOpinionSource } from '@mbd/contracts';
import { toDisplayRating } from '../player/attributes.js';
import type { DraftProspect } from '../draft/draftPool.js';
import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import type { InternationalProspect } from './international.js';
import type { Scout } from './scoutingEngine.js';

type ConflictProspect = DraftProspect | InternationalProspect;

interface ProspectShape {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  overallRating: number;
  position: string;
  hitterAttributes: GeneratedPlayer['hitterAttributes'];
  pitcherAttributes: GeneratedPlayer['pitcherAttributes'];
  personality: GeneratedPlayer['personality'];
  background: 'high_school' | 'college_senior' | 'college_underclass' | 'international';
  prospectType: 'draft' | 'ifa';
}

const SOURCE_ORDER: ScoutOpinionSource[] = [
  'scout_director',
  'analytics_head',
  'manager',
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toProspectShape(prospect: ConflictProspect): ProspectShape {
  if ('player' in prospect) {
    return {
      id: prospect.player.id,
      firstName: prospect.player.firstName,
      lastName: prospect.player.lastName,
      age: prospect.player.age,
      overallRating: prospect.player.overallRating,
      position: prospect.player.position,
      hitterAttributes: prospect.player.hitterAttributes,
      pitcherAttributes: prospect.player.pitcherAttributes,
      personality: prospect.player.personality,
      background: prospect.background,
      prospectType: 'draft',
    };
  }

  return {
    id: prospect.id,
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    age: prospect.age,
    overallRating: prospect.overallRating,
    position: prospect.position,
    hitterAttributes: prospect.hitterAttributes,
    pitcherAttributes: prospect.pitcherAttributes,
    personality: prospect.personality,
    background: 'international',
    prospectType: 'ifa',
  };
}

function averageScoutQuality(staff: Scout[]): number {
  if (staff.length === 0) {
    return 50;
  }
  return staff.reduce((sum, scout) => sum + scout.quality, 0) / staff.length;
}

function backgroundVarianceMultiplier(background: ProspectShape['background']): number {
  switch (background) {
    case 'high_school':
      return 1.25;
    case 'international':
      return 1.15;
    case 'college_underclass':
      return 1.05;
    default:
      return 0.8;
  }
}

function playerToolScore(prospect: ProspectShape): number {
  if (prospect.pitcherAttributes) {
    return (
      prospect.pitcherAttributes.stuff
      + prospect.pitcherAttributes.velocity
      + prospect.pitcherAttributes.movement
    ) / 3;
  }

  return (
    prospect.hitterAttributes.power
    + prospect.hitterAttributes.speed
    + prospect.hitterAttributes.defense
  ) / 3;
}

function playerStatSignal(prospect: ProspectShape): number {
  if (prospect.pitcherAttributes) {
    return (
      prospect.pitcherAttributes.control
      + prospect.pitcherAttributes.movement
      + prospect.pitcherAttributes.stamina
    ) / 3;
  }

  return (
    prospect.hitterAttributes.contact
    + prospect.hitterAttributes.eye
    + prospect.hitterAttributes.speed
  ) / 3;
}

function playerMakeupScore(prospect: ProspectShape): number {
  return (
    prospect.personality.workEthic
    + prospect.personality.mentalToughness
    + prospect.personality.leadership
  ) / 3;
}

function buildSummary(source: ScoutOpinionSource, prospect: ProspectShape): string {
  if (source === 'scout_director') {
    const label = prospect.pitcherAttributes
      ? (prospect.pitcherAttributes.velocity >= prospect.pitcherAttributes.stuff ? 'premium velocity' : 'bat-missing stuff')
      : (prospect.hitterAttributes.power >= prospect.hitterAttributes.speed ? 'impact power' : 'plus speed');
    return `${label} stands out most in this look.`;
  }
  if (source === 'analytics_head') {
    const label = prospect.pitcherAttributes
      ? (prospect.pitcherAttributes.control >= prospect.pitcherAttributes.movement ? 'efficient strike-throwing' : 'shape-backed pitch mix')
      : (prospect.hitterAttributes.eye >= prospect.hitterAttributes.contact ? 'advanced approach' : 'contact quality');
    return `${label} drives the statistical case.`;
  }

  const label = prospect.personality.leadership >= prospect.personality.workEthic
    ? 'high-character leadership'
    : 'work-ethic makeup';
  return `${label} keeps the room confident in the player.`;
}

function buildOpinion(
  rng: GameRNG,
  source: ScoutOpinionSource,
  prospect: ProspectShape,
  scoutStaff: Scout[],
): ScoutOpinion {
  const base = toDisplayRating(prospect.overallRating);
  const averageQuality = averageScoutQuality(scoutStaff);
  const noiseWindow = clamp(
    Math.round((8 - ((averageQuality - 50) / 12)) * backgroundVarianceMultiplier(prospect.background)),
    0,
    10,
  );
  const tools = toDisplayRating(playerToolScore(prospect));
  const statSignal = toDisplayRating(playerStatSignal(prospect));
  const makeup = Math.round((playerMakeupScore(prospect) / 100) * 60) + 20;

  let weighted = base;
  if (source === 'scout_director') {
    weighted = Math.round((base * 0.65) + (tools * 0.35) - ((statSignal - 50) * 0.08));
  } else if (source === 'analytics_head') {
    weighted = Math.round((base * 0.6) + (statSignal * 0.4) - ((tools - 50) * 0.05));
  } else {
    weighted = Math.round((base * 0.7) + (makeup * 0.3));
  }

  const deterministicBias = source === 'scout_director' ? 2 : source === 'analytics_head' ? -1 : 1;
  const overallGrade = clamp(weighted + deterministicBias + rng.nextInt(-noiseWindow, noiseWindow), 20, 80);
  const ceiling = clamp(overallGrade + (prospect.background === 'high_school' ? 8 : 5), overallGrade, 80);
  const floor = clamp(overallGrade - (prospect.background === 'high_school' ? 7 : 4), 20, overallGrade);
  const confidence = clamp(20 - noiseWindow - (prospect.background === 'high_school' ? 3 : 0), 1, 20);

  return {
    source,
    overallGrade,
    ceiling,
    floor,
    confidence,
    summary: buildSummary(source, prospect),
  };
}

export function generateScoutConflict(
  rng: GameRNG,
  rawProspect: ConflictProspect,
  scoutStaff: Scout[],
  season: number = 1,
  teamId: string | null = null,
): ScoutConflict {
  const prospect = toProspectShape(rawProspect);
  const opinions = SOURCE_ORDER.map((source) => buildOpinion(rng.fork(), source, prospect, scoutStaff));
  const grades = opinions.map((opinion) => opinion.overallGrade);
  const divergence = Math.max(...grades) - Math.min(...grades);
  const fullName = `${prospect.firstName} ${prospect.lastName}`;

  return {
    prospectId: prospect.id,
    teamId,
    prospectType: prospect.prospectType,
    createdSeason: season,
    resolutionSeason: season + 2,
    resolved: false,
    headline: divergence >= 10 ? `Staff divided on ${fullName}` : `Staff aligned on ${fullName}`,
    opinions,
    divergence,
    debateGenerated: divergence >= 10,
    resolution: null,
    winningSource: null,
    outcomeSummary: null,
  };
}

export function resolveScoutConflicts(
  rng: GameRNG,
  conflicts: ScoutConflict[],
  playerOutcomes: Array<{ prospectId: string; actualGrade: number; mlbSeasons: number }>,
  season: number,
): ScoutConflict[] {
  const outcomeMap = new Map(playerOutcomes.map((entry) => [entry.prospectId, entry] as const));

  return conflicts.map((conflict) => {
    if (conflict.resolved) {
      return conflict;
    }

    const outcome = outcomeMap.get(conflict.prospectId);
    if (!outcome || outcome.mlbSeasons < 2 || season < conflict.resolutionSeason) {
      return conflict;
    }

    const ranked = conflict.opinions
      .map((opinion) => ({
        source: opinion.source,
        distance: Math.abs(opinion.overallGrade - outcome.actualGrade),
      }))
      .sort((left, right) => left.distance - right.distance || left.source.localeCompare(right.source));
    const closestSource = ranked[0]?.source ?? 'manager';
    const farthestSource = ranked.at(-1)?.source ?? closestSource;

    return {
      ...conflict,
      resolved: true,
      winningSource: closestSource,
      resolution: {
        season,
        actualGrade: outcome.actualGrade,
        closestSource,
      },
      outcomeSummary: `${closestSource.replace(/_/g, ' ')} was vindicated while ${farthestSource.replace(/_/g, ' ')} missed the read.`,
      headline: conflict.debateGenerated
        ? conflict.headline
        : `${conflict.headline} (${rng.nextInt(1, 99)})`,
    };
  });
}
