import { compareMomentType, type Moment, type MomentRound } from './momentDetector.js';

export const CHAMPIONSHIP_RUN_IMPACT = 50;
export const CHAMPIONSHIP_RUN_RELEVANCE = 1.0;
export const CONTENTION_COLLAPSE_IMPACT = -35;
export const CONTENTION_COLLAPSE_RELEVANCE = 0.8;
export const CONTENTION_COLLAPSE_WINS_THRESHOLD = 85;
export const FIRST_DYNASTY_PEAK_IMPACT = 55;
export const FIRST_DYNASTY_PEAK_RELEVANCE = 0.95;
export const LOSING_SEASON_STREAK_IMPACT = -40;
export const LOSING_SEASON_STREAK_RELEVANCE = 0.85;
export const REBUILD_BEGUN_IMPACT = -25;
export const REBUILD_BEGUN_RELEVANCE = 0.75;
export const BREAKOUT_SEASON_IMPACT = 45;
export const BREAKOUT_SEASON_RELEVANCE = 0.90;
export const CONTENTION_WINDOW_OPENS_IMPACT = 30;
export const CONTENTION_WINDOW_OPENS_RELEVANCE = 0.75;

export interface PriorSeasonSummary {
  readonly season: number;
  readonly divisionRank: number | null;
  readonly wins: number;
  readonly losses: number;
}

export interface TeamSeasonSummary {
  readonly teamId: string;
  readonly wins: number;
  readonly losses: number;
  readonly madePlayoffs: boolean;
  readonly isChampion: boolean;
  readonly divisionRank?: number | null;
  readonly priorSeasonsSummary?: readonly PriorSeasonSummary[];
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

function getPriorSeason(
  summary: TeamSeasonSummary,
  season: number,
): PriorSeasonSummary | null {
  return summary.priorSeasonsSummary?.find((entry) => entry.season === season) ?? null;
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

export function detectFirstDynastyPeak(
  summary: TeamSeasonSummary,
  season: number,
  day: number,
): SeasonIdentityDetectedMoment | null {
  if (summary.divisionRank !== 1) {
    return null;
  }

  const priorSeason = getPriorSeason(summary, season - 1);
  if (!priorSeason || priorSeason.divisionRank !== 1) {
    return null;
  }

  const previousWindowSeason = getPriorSeason(summary, season - 2);
  if (previousWindowSeason?.divisionRank === 1) {
    return null;
  }

  const currentRecord = `${summary.wins}-${summary.losses}`;
  const priorRecord = `${priorSeason.wins}-${priorSeason.losses}`;
  return {
    teamId: summary.teamId,
    moment: createMoment(
      'first_dynasty_peak',
      `Back-to-back division crowns - the franchise is building something real, finishing ${currentRecord} after last year's ${priorRecord}.`,
      FIRST_DYNASTY_PEAK_IMPACT,
      FIRST_DYNASTY_PEAK_RELEVANCE,
      season,
      day,
    ),
  };
}

export function detectLosingSeasonStreak(
  summary: TeamSeasonSummary,
  season: number,
  day: number,
): SeasonIdentityDetectedMoment | null {
  if (summary.losses <= summary.wins) {
    return null;
  }

  const priorSeason = getPriorSeason(summary, season - 1);
  const twoSeasonsBack = getPriorSeason(summary, season - 2);
  if (!priorSeason || !twoSeasonsBack) {
    return null;
  }
  if (priorSeason.losses <= priorSeason.wins || twoSeasonsBack.losses <= twoSeasonsBack.wins) {
    return null;
  }

  const previousWindowSeason = getPriorSeason(summary, season - 3);
  if (previousWindowSeason && previousWindowSeason.losses > previousWindowSeason.wins) {
    return null;
  }

  return {
    teamId: summary.teamId,
    moment: createMoment(
      'losing_season_streak',
      `Three straight losing seasons - another ${summary.wins}-${summary.losses} campaign has the front office staring down a full-scale rebuild.`,
      LOSING_SEASON_STREAK_IMPACT,
      LOSING_SEASON_STREAK_RELEVANCE,
      season,
      day,
    ),
  };
}

export function detectRebuildBegun(
  summary: TeamSeasonSummary,
  season: number,
  day: number,
): SeasonIdentityDetectedMoment | null {
  if (summary.losses <= summary.wins) {
    return null;
  }
  if ((summary.priorSeasonsSummary?.length ?? 0) < 2) {
    return null;
  }

  const priorSeason = getPriorSeason(summary, season - 1);
  const twoSeasonsBack = getPriorSeason(summary, season - 2);
  if (!priorSeason || !twoSeasonsBack) {
    return null;
  }
  if (priorSeason.losses >= priorSeason.wins || twoSeasonsBack.losses >= twoSeasonsBack.wins) {
    return null;
  }

  return {
    teamId: summary.teamId,
    moment: createMoment(
      'rebuild_begun',
      `After back-to-back winning campaigns, a ${summary.wins}-${summary.losses} slide signals the front office may be pivoting toward a full rebuild.`,
      REBUILD_BEGUN_IMPACT,
      REBUILD_BEGUN_RELEVANCE,
      season,
      day,
    ),
  };
}

export function detectBreakoutSeason(
  summary: TeamSeasonSummary,
  season: number,
  day: number,
): SeasonIdentityDetectedMoment | null {
  if (summary.divisionRank !== 1) {
    return null;
  }
  if ((summary.priorSeasonsSummary?.length ?? 0) < 3) {
    return null;
  }

  const priorSeason = getPriorSeason(summary, season - 1);
  const twoSeasonsBack = getPriorSeason(summary, season - 2);
  const threeSeasonsBack = getPriorSeason(summary, season - 3);
  if (!priorSeason || !twoSeasonsBack || !threeSeasonsBack) {
    return null;
  }
  if (
    priorSeason.divisionRank === 1
    || twoSeasonsBack.divisionRank === 1
    || threeSeasonsBack.divisionRank === 1
  ) {
    return null;
  }

  return {
    teamId: summary.teamId,
    moment: createMoment(
      'breakout_season',
      `After going three straight years without a division title, a ${summary.wins}-${summary.losses} breakout puts the franchise back in the conversation.`,
      BREAKOUT_SEASON_IMPACT,
      BREAKOUT_SEASON_RELEVANCE,
      season,
      day,
    ),
  };
}

export function detectContentionWindowOpens(
  summary: TeamSeasonSummary,
  season: number,
  day: number,
): SeasonIdentityDetectedMoment | null {
  if (summary.wins <= summary.losses) {
    return null;
  }
  if ((summary.priorSeasonsSummary?.length ?? 0) < 2) {
    return null;
  }

  const priorSeason = getPriorSeason(summary, season - 1);
  const twoSeasonsBack = getPriorSeason(summary, season - 2);
  if (!priorSeason || !twoSeasonsBack) {
    return null;
  }
  if (priorSeason.losses <= priorSeason.wins || twoSeasonsBack.losses <= twoSeasonsBack.wins) {
    return null;
  }

  return {
    teamId: summary.teamId,
    moment: createMoment(
      'contention_window_opens',
      `After consecutive losing campaigns, a ${summary.wins}-${summary.losses} turnaround cracks open a fresh contention window.`,
      CONTENTION_WINDOW_OPENS_IMPACT,
      CONTENTION_WINDOW_OPENS_RELEVANCE,
      season,
      day,
    ),
  };
}

export function detectSeasonIdentityMoments(
  context: SeasonIdentityMomentDetectionContext,
): SeasonIdentityDetectedMoment[] {
  const moments: SeasonIdentityDetectedMoment[] = [];
  const breakoutTeamIds = new Set<string>();
  for (const summary of context.teams) {
    const championship = detectChampionshipRun(summary, context.season, context.day);
    if (championship) {
      moments.push(championship);
    }
    const collapse = detectContentionCollapse(summary, context.season, context.day);
    if (collapse) {
      moments.push(collapse);
    }
    const dynastyPeak = detectFirstDynastyPeak(summary, context.season, context.day);
    if (dynastyPeak) {
      moments.push(dynastyPeak);
    }
    const losingStreak = detectLosingSeasonStreak(summary, context.season, context.day);
    if (losingStreak) {
      moments.push(losingStreak);
    }
    const rebuildBegun = detectRebuildBegun(summary, context.season, context.day);
    if (rebuildBegun) {
      moments.push(rebuildBegun);
    }
    const breakoutSeason = detectBreakoutSeason(summary, context.season, context.day);
    if (breakoutSeason) {
      breakoutTeamIds.add(summary.teamId);
      moments.push(breakoutSeason);
    }
    if (breakoutTeamIds.has(summary.teamId)) {
      continue;
    }
    const contentionWindowOpens = detectContentionWindowOpens(summary, context.season, context.day);
    if (contentionWindowOpens) {
      moments.push(contentionWindowOpens);
    }
  }
  return moments.sort((left, right) =>
    left.teamId.localeCompare(right.teamId)
    || compareMomentType(left.moment.type, right.moment.type),
  );
}
