import type { Moment, MomentRound } from './momentDetector.js';

export const CHAMPIONSHIP_RUN_IMPACT = 50;
export const CHAMPIONSHIP_RUN_RELEVANCE = 1.0;
export const CONTENTION_COLLAPSE_IMPACT = -35;
export const CONTENTION_COLLAPSE_RELEVANCE = 0.8;
export const CONTENTION_COLLAPSE_WINS_THRESHOLD = 85;

export interface TeamSeasonSummary {
  readonly teamId: string;
  readonly wins: number;
  readonly losses: number;
  readonly madePlayoffs: boolean;
  readonly isChampion: boolean;
}

export interface SeasonIdentityMomentDetectionContext {
  readonly season: number;
  readonly day: number;
  readonly teams: readonly TeamSeasonSummary[];
}

export interface SeasonIdentityDetectedMoment {
  readonly teamId: string;
  readonly moment: Moment & { readonly day: number; readonly timestamp: string };
}

function createMoment(
  type: Moment['type'],
  description: string,
  impact: number,
  relevance: number,
  season: number,
  day: number,
): SeasonIdentityDetectedMoment['moment'] {
  return {
    season,
    day,
    timestamp: `S${season}D${day}`,
    type,
    description,
    impact,
    relevance,
    isPlayoff: false,
    isEliminationGame: false,
    worldSeriesClincher: false,
    round: null as MomentRound | null,
  };
}

export function detectChampionshipRun(
  summary: TeamSeasonSummary,
  season: number,
  day: number,
): SeasonIdentityDetectedMoment | null {
  if (!summary.isChampion) {
    return null;
  }
  return {
    teamId: summary.teamId,
    moment: createMoment(
      'championship_run',
      `The franchise took home a World Series trophy, finishing ${summary.wins}-${summary.losses}.`,
      CHAMPIONSHIP_RUN_IMPACT,
      CHAMPIONSHIP_RUN_RELEVANCE,
      season,
      day,
    ),
  };
}

export function detectContentionCollapse(
  summary: TeamSeasonSummary,
  season: number,
  day: number,
  winsThreshold: number = CONTENTION_COLLAPSE_WINS_THRESHOLD,
): SeasonIdentityDetectedMoment | null {
  if (summary.madePlayoffs) {
    return null;
  }
  if (summary.wins < winsThreshold) {
    return null;
  }
  return {
    teamId: summary.teamId,
    moment: createMoment(
      'contention_collapse',
      `A ${summary.wins}-${summary.losses} campaign ended with the front office watching the playoffs from home.`,
      CONTENTION_COLLAPSE_IMPACT,
      CONTENTION_COLLAPSE_RELEVANCE,
      season,
      day,
    ),
  };
}

export function detectSeasonIdentityMoments(
  context: SeasonIdentityMomentDetectionContext,
): SeasonIdentityDetectedMoment[] {
  const moments: SeasonIdentityDetectedMoment[] = [];
  for (const summary of context.teams) {
    const championship = detectChampionshipRun(summary, context.season, context.day);
    if (championship) {
      moments.push(championship);
    }
    const collapse = detectContentionCollapse(summary, context.season, context.day);
    if (collapse) {
      moments.push(collapse);
    }
  }
  return moments.sort((left, right) =>
    left.teamId.localeCompare(right.teamId)
    || left.moment.type.localeCompare(right.moment.type),
  );
}
