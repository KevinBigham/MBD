import type { GameRNG } from '../math/prng.js';
import { toLetterGrade } from '../player/attributes.js';
import { calculateBreakoutProbability, predictProspectCeiling } from '../player/breakoutEngine.js';
import type { Coach } from '../player/coaching.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { getPlayerArchetype } from '../player/similarity.js';
import { getPlayerFullName, pickTemplate } from './shared.js';

export interface ProspectProfile {
  playerId: string;
  name: string;
  position: string;
  age: number;
  level: string;
  overallRating: number;
  ceiling: number;
  ceilingGrade: string;
  archetype: string;
  readiness: 'ready_now' | 'one_year' | 'developing' | 'raw';
  breakoutProbability: number;
  spotlight: string;
}

export interface PipelineHealth {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  readyCount: number;
  developingCount: number;
  rawCount: number;
  positionBalance: 'balanced' | 'pitcher_heavy' | 'hitter_heavy';
  depthDescription: string;
}

export interface FarmAssessment {
  topProspects: ProspectProfile[];
  pipeline: PipelineHealth;
  farmNarrative: string;
  developmentOptions: Array<{ id: string; label: string; description: string }>;
  closestToMLB: ProspectProfile | null;
  highestCeiling: ProspectProfile | null;
}

const FARM_OPENERS = [
  'The player-development side of the organization has real direction.',
  'The system has a clear shape, even if not every prospect is on the same timeline.',
  'The farm picture shows both immediate reinforcement and longer-term projection.',
] as const;

function minorLeaguers(players: readonly GeneratedPlayer[]): GeneratedPlayer[] {
  return players.filter((player) => player.rosterStatus !== 'MLB');
}

function getLevel(player: GeneratedPlayer): string {
  return player.minorLeagueLevel ?? player.rosterStatus;
}

function readinessRank(readiness: ProspectProfile['readiness']): number {
  switch (readiness) {
    case 'ready_now':
      return 4;
    case 'one_year':
      return 3;
    case 'developing':
      return 2;
    case 'raw':
    default:
      return 1;
  }
}

function classifyReadiness(player: GeneratedPlayer): ProspectProfile['readiness'] {
  const level = getLevel(player);

  if (player.age >= 22 && player.overallRating >= 300 && level === 'AAA') {
    return 'ready_now';
  }

  if (
    (level === 'AAA' && player.overallRating >= 280)
    || (level === 'AA' && player.overallRating >= 290)
    || (player.age >= 21 && player.overallRating >= 285)
  ) {
    return 'one_year';
  }

  if (player.age >= 19 && player.overallRating >= 235) {
    return 'developing';
  }

  return 'raw';
}

function buildProspectProfile(
  rng: GameRNG,
  player: GeneratedPlayer,
  coaches: Coach[],
): ProspectProfile {
  const readiness = classifyReadiness(player);
  const projectedCeiling = predictProspectCeiling(rng.fork(), player);
  const breakout = calculateBreakoutProbability(player, [], coaches);
  const archetype = getPlayerArchetype(player).archetype;
  const ceiling = player.ceiling ?? player.potentialRating ?? projectedCeiling.projectedPeak;

  return {
    playerId: player.id,
    name: getPlayerFullName(player),
    position: player.position,
    age: player.age,
    level: getLevel(player),
    overallRating: player.overallRating,
    ceiling,
    ceilingGrade: toLetterGrade(ceiling),
    archetype,
    readiness,
    breakoutProbability: breakout.probability,
    spotlight: `${getPlayerFullName(player)} carries a ${archetype.toLowerCase()} profile with a ${breakout.probability}% breakout indicator and a projected peak around ${projectedCeiling.projectedPeak}.`,
  };
}

export function profileTopProspects(
  rng: GameRNG,
  players: GeneratedPlayer[],
  limit: number = 5,
): ProspectProfile[] {
  return minorLeaguers(players)
    .map((player) => buildProspectProfile(rng.fork(), player, []))
    .sort((left, right) => {
      if (right.ceiling !== left.ceiling) {
        return right.ceiling - left.ceiling;
      }
      return left.playerId.localeCompare(right.playerId);
    })
    .slice(0, limit);
}

export function assessPipelineHealth(players: GeneratedPlayer[]): PipelineHealth {
  const prospects = minorLeaguers(players);
  const profiles = prospects.map((player) => ({
    readiness: classifyReadiness(player),
    position: player.position,
  }));
  const readyCount = profiles.filter((player) => player.readiness === 'ready_now' || player.readiness === 'one_year').length;
  const developingCount = profiles.filter((player) => player.readiness === 'developing').length;
  const rawCount = profiles.filter((player) => player.readiness === 'raw').length;
  const pitchers = profiles.filter((player) => ['SP', 'RP', 'CL'].includes(player.position)).length;
  const hitters = Math.max(0, profiles.length - pitchers);
  const positionBalance: PipelineHealth['positionBalance'] =
    pitchers >= hitters + 2 ? 'pitcher_heavy' : hitters >= pitchers + 2 ? 'hitter_heavy' : 'balanced';
  const grade: PipelineHealth['grade'] =
    readyCount >= 3 ? 'A'
      : readyCount === 2 ? 'B'
        : readyCount === 1 ? 'C'
          : developingCount > 0 ? 'D'
            : 'F';

  return {
    grade,
    readyCount,
    developingCount,
    rawCount,
    positionBalance,
    depthDescription:
      grade === 'A'
        ? 'The system can send credible help to the majors quickly.'
        : grade === 'F'
          ? 'The system is thin and long on projection only.'
          : 'The pipeline has usable talent, but not all of it is close to conversion.',
  };
}

export function generateFarmNarrative(
  rng: GameRNG,
  assessment: FarmAssessment,
): string {
  const opener = pickTemplate(rng, FARM_OPENERS);
  const closest = assessment.closestToMLB?.name ?? 'No immediate call-up';
  const ceiling = assessment.highestCeiling?.name ?? 'No premium ceiling prospect';

  return `${opener} ${closest} is the closest major-league reinforcement, while ${ceiling} carries the highest long-term ceiling. The pipeline grades out at ${assessment.pipeline.grade} with a ${assessment.pipeline.positionBalance.replace('_', ' ')} balance.`;
}

export function assessFarmSystem(
  rng: GameRNG,
  minorLeaguePlayers: GeneratedPlayer[],
  coaches: Coach[],
): FarmAssessment {
  const topProspects = minorLeaguers(minorLeaguePlayers)
    .map((player) => buildProspectProfile(rng.fork(), player, coaches))
    .sort((left, right) => {
      if (right.ceiling !== left.ceiling) {
        return right.ceiling - left.ceiling;
      }
      return left.playerId.localeCompare(right.playerId);
    })
    .slice(0, 5);
  const pipeline = assessPipelineHealth(minorLeaguePlayers);
  const closestToMLB = [...topProspects].sort((left, right) => {
    const readinessDiff = readinessRank(right.readiness) - readinessRank(left.readiness);
    if (readinessDiff !== 0) {
      return readinessDiff;
    }
    if (right.overallRating !== left.overallRating) {
      return right.overallRating - left.overallRating;
    }
    return left.playerId.localeCompare(right.playerId);
  })[0] ?? null;
  const highestCeiling = topProspects[0] ?? null;

  const assessment: FarmAssessment = {
    topProspects,
    pipeline,
    farmNarrative: '',
    developmentOptions: [
      {
        id: 'aggressive',
        label: 'Aggressive Promotions',
        description: 'Promote faster and accept short-term volatility if the upside justifies it.',
      },
      {
        id: 'patient',
        label: 'Patient Development',
        description: 'Let prospects dominate each level before exposing them to the next challenge.',
      },
      {
        id: 'balanced',
        label: 'Balanced Development',
        description: 'Promote when the performance and underlying tools both support the move.',
      },
    ],
    closestToMLB,
    highestCeiling,
  };

  return {
    ...assessment,
    farmNarrative: generateFarmNarrative(rng, assessment),
  };
}
