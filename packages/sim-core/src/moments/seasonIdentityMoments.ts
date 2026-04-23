import type {
  ArchivedSeason,
  CareerStatsLedger,
  MonthlyRecordSplits,
  PlayoffSeriesHistoryEntry,
  Rivalry,
  SeasonArchiveEntry,
  TradeHistoryEntry,
} from '@mbd/contracts';
import type { StandingsEntry } from '../league/standings.js';
import {
  computeRivalryIntensityScore,
  getRivalryMatchupNarrative,
  RIVALRY_HIGH_LEVERAGE_MIN_SCORE,
} from '../league/rivalries.js';
import { getTeamById } from '../league/teams.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { getLongestTeamTenureSeasons } from '../player/teamTenures.js';
import { isTradeDeadlineModeDay } from '../sim/calendar.js';
import type { GMPersonality } from '../trade/tradeAI.js';
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
export const FIRE_SALE_IMPACT = -55;
export const FIRE_SALE_RELEVANCE = 0.90;
export const DYNASTY_END_IMPACT = -65;
export const DYNASTY_END_RELEVANCE = 0.95;
export const CURSED_FRANCHISE_IMPACT = -45;
export const CURSED_FRANCHISE_RELEVANCE = 0.85;
export const VETERAN_CORE_RETIRES_IMPACT = -38;
export const VETERAN_CORE_RETIRES_RELEVANCE = 0.78;
export const SEPTEMBER_HEROICS_IMPACT = 42;
export const SEPTEMBER_HEROICS_RELEVANCE = 0.8;
export const PLAYOFF_GAUNTLET_IMPACT = 64;
export const PLAYOFF_GAUNTLET_RELEVANCE = 0.92;

const FIRE_SALE_VETERAN_THRESHOLD = 3;
const FIRE_SALE_WIN_PCT_THRESHOLD = 0.45;
const CURSED_FRANCHISE_MILESTONES = [10, 15, 20] as const;
const VETERAN_CORE_TENURE_THRESHOLD = 8;
const SEPTEMBER_HEROICS_WIN_THRESHOLD = 20;
const HIGH_LEVERAGE_CONTENTION_GAMES_BACK = 3;
const WILD_CARD_SLOT_COUNT = 3;

export interface PriorSeasonSummary {
  readonly season: number;
  readonly divisionRank: number | null;
  readonly wins: number;
  readonly losses: number;
}

export interface TeamSeasonSummary {
  readonly teamId: string;
  readonly teamName?: string;
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
  readonly tradeHistory?: readonly TradeHistoryEntry[];
  readonly playerContractYearsById?: ReadonlyMap<string, number>;
  readonly seasonArchive?: readonly SeasonArchiveEntry[];
  readonly archivedSeasons?: readonly ArchivedSeason[];
  readonly teamMoments?: ReadonlyMap<string, readonly Moment[]>;
  readonly careerStats?: readonly CareerStatsLedger[];
  readonly gmPersonalities?: ReadonlyMap<string, GMPersonality>;
  readonly offseasonRetirementsByTeamId?: ReadonlyMap<string, readonly string[]>;
  readonly retiredPlayers?: readonly GeneratedPlayer[];
  readonly monthlyRecordSplits?: MonthlyRecordSplits;
  readonly playoffSeriesHistory?: readonly PlayoffSeriesHistoryEntry[];
  readonly rivalries?: ReadonlyMap<string, Rivalry>;
  readonly standingsByDivision?: Readonly<Record<string, readonly StandingsEntry[]>>;
  readonly playerMomentCountsByTeamId?: ReadonlyMap<string, number>;
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

function teamLabel(summary: Pick<TeamSeasonSummary, 'teamId' | 'teamName'>): string {
  return summary.teamName ?? summary.teamId.toUpperCase();
}

function winPct(wins: number, losses: number): number {
  const totalGames = wins + losses;
  if (totalGames <= 0) {
    return 0;
  }
  return wins / totalGames;
}

function standingsSort(left: StandingsEntry, right: StandingsEntry): number {
  if (right.pct !== left.pct) return right.pct - left.pct;
  if (right.wins !== left.wins) return right.wins - left.wins;
  if (left.losses !== right.losses) return left.losses - right.losses;
  if (right.runDifferential !== left.runDifferential) return right.runDifferential - left.runDifferential;
  return left.teamId.localeCompare(right.teamId);
}

function leagueFromTeamId(teamId: string): 'AL' | 'NL' | null {
  const division = getTeamById(teamId)?.division;
  if (!division) {
    return null;
  }
  return division.startsWith('AL') ? 'AL' : 'NL';
}

function parseTimestamp(timestamp: string | undefined): { season: number; day: number } | null {
  if (!timestamp) {
    return null;
  }

  const match = /^S(?<season>\d+)D(?<day>\d+)$/.exec(timestamp);
  if (!match?.groups) {
    return null;
  }

  return {
    season: Number(match.groups.season),
    day: Number(match.groups.day),
  };
}

function momentAlreadyRecorded(
  context: SeasonIdentityMomentDetectionContext,
  teamId: string,
  type: Moment['type'],
): boolean {
  return context.teamMoments?.get(teamId)?.some((moment) =>
    moment.type === type && moment.season === context.season
  ) ?? false;
}

function countCurrentSeasonTeamMoments(
  context: SeasonIdentityMomentDetectionContext,
  teamId: string,
): number {
  return context.teamMoments?.get(teamId)?.filter((moment) => moment.season === context.season).length ?? 0;
}

function gamesBackFromCutoff(entry: StandingsEntry, cutoff: StandingsEntry): number {
  return ((cutoff.wins - entry.wins) + (entry.losses - cutoff.losses)) / 2;
}

function wildcardCutoffByLeague(
  standingsByDivision: Readonly<Record<string, readonly StandingsEntry[]>>,
): Map<'AL' | 'NL', StandingsEntry> {
  const cutoffByLeague = new Map<'AL' | 'NL', StandingsEntry>();
  for (const league of ['AL', 'NL'] as const) {
    const leagueEntries = Object.entries(standingsByDivision)
      .filter(([division]) => division.startsWith(league))
      .map(([, entries]) => entries);
    const wildcardCutoff = leagueEntries
      .flatMap((entries) => entries.slice(1))
      .sort(standingsSort)[WILD_CARD_SLOT_COUNT - 1];
    if (wildcardCutoff) {
      cutoffByLeague.set(league, wildcardCutoff);
    }
  }
  return cutoffByLeague;
}

function teamIsWithinContentionWindow(
  teamId: string,
  standingsByDivision: Readonly<Record<string, readonly StandingsEntry[]>>,
  cutoffByLeague: ReadonlyMap<'AL' | 'NL', StandingsEntry>,
): boolean {
  const divisionEntries = Object.values(standingsByDivision)
    .find((entries) => entries.some((entry) => entry.teamId === teamId));
  const entry = divisionEntries?.find((candidate) => candidate.teamId === teamId);
  if (!entry) {
    return false;
  }
  if (entry.gamesBack <= HIGH_LEVERAGE_CONTENTION_GAMES_BACK) {
    return true;
  }

  const league = leagueFromTeamId(teamId);
  const cutoff = league ? cutoffByLeague.get(league) : null;
  if (!cutoff) {
    return false;
  }

  return gamesBackFromCutoff(entry, cutoff) <= HIGH_LEVERAGE_CONTENTION_GAMES_BACK;
}

function rivalryMetInCurrentSeasonPlayoffs(
  history: readonly PlayoffSeriesHistoryEntry[] | undefined,
  season: number,
  rivalryId: string,
): boolean {
  return history?.some((entry) =>
    entry.season === season
    && [entry.higherSeedTeamId, entry.lowerSeedTeamId]
      .sort((left, right) => left.localeCompare(right))
      .join(':') === rivalryId
  ) ?? false;
}

function rivalryImpactProfile(intensityScore: number): { impact: number; relevance: number } {
  if (intensityScore >= 90) {
    return { impact: 66, relevance: 0.92 };
  }
  if (intensityScore >= 80) {
    return { impact: 62, relevance: 0.88 };
  }
  return { impact: 58, relevance: 0.84 };
}

function buildHistoricalSummaries(
  summary: TeamSeasonSummary,
  context: SeasonIdentityMomentDetectionContext,
): PriorSeasonSummary[] {
  const historical = new Map<number, PriorSeasonSummary>();

  for (const archivedSeason of context.archivedSeasons ?? []) {
    const standing = archivedSeason.standings.find((entry) => entry.teamId === summary.teamId);
    if (!standing) {
      continue;
    }

    historical.set(archivedSeason.season, {
      season: archivedSeason.season,
      divisionRank: standing.divisionRank,
      wins: standing.wins,
      losses: standing.losses,
    });
  }

  for (const archivedSeason of context.seasonArchive ?? []) {
    const standing = archivedSeason.standings.find((entry) => entry.teamId === summary.teamId);
    if (!standing) {
      continue;
    }

    historical.set(archivedSeason.season, {
      season: archivedSeason.season,
      divisionRank: standing.divisionRank,
      wins: standing.wins,
      losses: standing.losses,
    });
  }

  for (const priorSeason of summary.priorSeasonsSummary ?? []) {
    historical.set(priorSeason.season, priorSeason);
  }

  return Array.from(historical.values()).sort((left, right) => left.season - right.season);
}

function ordinal(value: number): string {
  const remainder10 = value % 10;
  const remainder100 = value % 100;
  if (remainder10 === 1 && remainder100 !== 11) {
    return `${value}st`;
  }
  if (remainder10 === 2 && remainder100 !== 12) {
    return `${value}nd`;
  }
  if (remainder10 === 3 && remainder100 !== 13) {
    return `${value}rd`;
  }
  return `${value}th`;
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

export function detectFireSale(
  summary: TeamSeasonSummary,
  context: SeasonIdentityMomentDetectionContext,
): SeasonIdentityDetectedMoment | null {
  if (momentAlreadyRecorded(context, summary.teamId, 'fire_sale')) {
    return null;
  }
  if (winPct(summary.wins, summary.losses) >= FIRE_SALE_WIN_PCT_THRESHOLD) {
    return null;
  }
  if (!context.tradeHistory || !context.playerContractYearsById) {
    return null;
  }

  const veteranDepartures = new Set<string>();
  for (const trade of context.tradeHistory) {
    if (trade.fromTeamId !== summary.teamId) {
      continue;
    }

    const parsedTimestamp = parseTimestamp(trade.timestamp);
    if (!parsedTimestamp || parsedTimestamp.season !== context.season || !isTradeDeadlineModeDay(parsedTimestamp.day)) {
      continue;
    }

    for (const asset of trade.offeringAssets) {
      if (asset.type !== 'player') {
        continue;
      }
      if ((context.playerContractYearsById.get(asset.playerId) ?? 0) > 1) {
        veteranDepartures.add(asset.playerId);
      }
    }
  }

  if (veteranDepartures.size < FIRE_SALE_VETERAN_THRESHOLD) {
    return null;
  }

  return {
    teamId: summary.teamId,
    moment: createMoment(
      'fire_sale',
      `With ${veteranDepartures.size} veterans shipped out before the deadline, the ${teamLabel(summary)} signaled a hard reset to ownership.`,
      FIRE_SALE_IMPACT,
      FIRE_SALE_RELEVANCE,
      context.season,
      context.day,
    ),
  };
}

export function detectDynastyEnd(
  summary: TeamSeasonSummary,
  context: SeasonIdentityMomentDetectionContext,
): SeasonIdentityDetectedMoment | null {
  if (momentAlreadyRecorded(context, summary.teamId, 'dynasty_end')) {
    return null;
  }
  if (summary.wins >= summary.losses) {
    return null;
  }

  const historicalSummaries = buildHistoricalSummaries(summary, context);
  const priorWindow: PriorSeasonSummary[] = [];
  for (let season = context.season - 4; season < context.season; season += 1) {
    const entry = historicalSummaries.find((candidate) => candidate.season === season);
    if (!entry) {
      return null;
    }
    priorWindow.push(entry);
  }

  if (priorWindow[priorWindow.length - 1]?.divisionRank !== 1) {
    return null;
  }

  const dominantSeasons = priorWindow.filter((entry) => entry.divisionRank === 1);
  if (dominantSeasons.length < 3) {
    return null;
  }

  const startYear = dominantSeasons[0]!.season;
  const endYear = dominantSeasons[dominantSeasons.length - 1]!.season;
  return {
    teamId: summary.teamId,
    moment: createMoment(
      'dynasty_end',
      `The ${teamLabel(summary)} dynasty that ruled the division is over - a sub-.500 season closes the book on the ${startYear}-${endYear} run.`,
      DYNASTY_END_IMPACT,
      DYNASTY_END_RELEVANCE,
      context.season,
      context.day,
    ),
  };
}

export function detectCursedFranchise(
  summary: TeamSeasonSummary,
  context: SeasonIdentityMomentDetectionContext,
): SeasonIdentityDetectedMoment | null {
  if (momentAlreadyRecorded(context, summary.teamId, 'cursed_franchise')) {
    return null;
  }
  if (summary.losses <= summary.wins) {
    return null;
  }

  const historicalBySeason = new Map(
    buildHistoricalSummaries(summary, context).map((entry) => [entry.season, entry] as const),
  );

  let streakLength = 1;
  for (let season = context.season - 1; season >= 1; season -= 1) {
    const priorSeason = historicalBySeason.get(season);
    if (!priorSeason || priorSeason.losses <= priorSeason.wins) {
      break;
    }
    streakLength += 1;
  }

  if (!CURSED_FRANCHISE_MILESTONES.includes(streakLength as typeof CURSED_FRANCHISE_MILESTONES[number])) {
    return null;
  }

  return {
    teamId: summary.teamId,
    moment: createMoment(
      'cursed_franchise',
      `Decade of darkness: the ${teamLabel(summary)} close out their ${ordinal(streakLength)} straight losing season.`,
      CURSED_FRANCHISE_IMPACT,
      CURSED_FRANCHISE_RELEVANCE,
      context.season,
      context.day,
    ),
  };
}

export function detectVeteranCoreRetires(
  summary: TeamSeasonSummary,
  context: SeasonIdentityMomentDetectionContext,
): SeasonIdentityDetectedMoment | null {
  if (momentAlreadyRecorded(context, summary.teamId, 'veteran_core_retires')) {
    return null;
  }

  const retirees = (context.retiredPlayers ?? [])
    .filter((player) =>
      player.teamId === summary.teamId
      && getLongestTeamTenureSeasons(player, summary.teamId, context.season) >= VETERAN_CORE_TENURE_THRESHOLD,
    )
    .sort((left, right) => left.id.localeCompare(right.id));

  if (retirees.length < 3) {
    return null;
  }

  const names = retirees
    .slice(0, 3)
    .map((player) => `${player.firstName} ${player.lastName}`)
    .join(', ');

  return {
    teamId: summary.teamId,
    moment: createMoment(
      'veteran_core_retires',
      `${names} all retired together, ending a veteran core that held the ${teamLabel(summary)} together for years.`,
      VETERAN_CORE_RETIRES_IMPACT,
      VETERAN_CORE_RETIRES_RELEVANCE,
      context.season,
      context.day,
    ),
  };
}

export function detectPlayoffGauntlet(
  series: PlayoffSeriesHistoryEntry,
  day: number,
): SeasonIdentityDetectedMoment | null {
  if (series.deficitReached == null || series.deficitTeamId !== series.winnerTeamId) {
    return null;
  }

  const opponentTeamId = series.winnerTeamId === series.higherSeedTeamId
    ? series.lowerSeedTeamId
    : series.higherSeedTeamId;
  const deficitLabel = series.deficitReached === '0-2' ? 'down 0-2' : 'down 3-1';

  return {
    teamId: series.winnerTeamId,
    moment: createMoment(
      'playoff_gauntlet',
      `The ${series.winnerTeamId.toUpperCase()} survived a ${deficitLabel} ${series.round.toLowerCase()} against ${opponentTeamId.toUpperCase()} and stole the series back.`,
      PLAYOFF_GAUNTLET_IMPACT,
      PLAYOFF_GAUNTLET_RELEVANCE,
      series.season,
      day,
    ),
  };
}

export function detectRivalryRenewed(
  context: SeasonIdentityMomentDetectionContext,
): SeasonIdentityDetectedMoment[] {
  if (!context.rivalries || context.rivalries.size === 0) {
    return [];
  }

  const summaryByTeamId = new Map(context.teams.map((summary) => [summary.teamId, summary] as const));
  const wildcardCutoffs = context.standingsByDivision
    ? wildcardCutoffByLeague(context.standingsByDivision)
    : new Map<'AL' | 'NL', StandingsEntry>();
  const detected: SeasonIdentityDetectedMoment[] = [];
  const seenPairKeys = new Set<string>();

  for (const rivalry of Array.from(context.rivalries.values()).sort((left, right) => left.id.localeCompare(right.id))) {
    const pairKey = `${context.season}:${rivalry.id}`;
    if (seenPairKeys.has(pairKey)) {
      continue;
    }
    seenPairKeys.add(pairKey);

    const teamASummary = summaryByTeamId.get(rivalry.teamA);
    const teamBSummary = summaryByTeamId.get(rivalry.teamB);
    if (!teamASummary || !teamBSummary) {
      continue;
    }
    if (
      momentAlreadyRecorded(context, rivalry.teamA, 'rivalry_renewed')
      || momentAlreadyRecorded(context, rivalry.teamB, 'rivalry_renewed')
    ) {
      continue;
    }

    const pairTeamMomentCount = countCurrentSeasonTeamMoments(context, rivalry.teamA)
      + countCurrentSeasonTeamMoments(context, rivalry.teamB);
    const currentSeasonPlayerMomentCount = (context.playerMomentCountsByTeamId?.get(rivalry.teamA) ?? 0)
      + (context.playerMomentCountsByTeamId?.get(rivalry.teamB) ?? 0);
    const intensityScore = computeRivalryIntensityScore({
      rivalry,
      currentSeasonTeamMomentCount: pairTeamMomentCount,
      currentSeasonPlayerMomentCount,
    });
    if (intensityScore < RIVALRY_HIGH_LEVERAGE_MIN_SCORE) {
      continue;
    }

    const playoffMeeting = rivalryMetInCurrentSeasonPlayoffs(
      context.playoffSeriesHistory,
      context.season,
      rivalry.id,
    );
    const regularSeasonContention = context.standingsByDivision
      ? teamIsWithinContentionWindow(rivalry.teamA, context.standingsByDivision, wildcardCutoffs)
        && teamIsWithinContentionWindow(rivalry.teamB, context.standingsByDivision, wildcardCutoffs)
      : false;
    if (!playoffMeeting && !regularSeasonContention) {
      continue;
    }

    const narrative = getRivalryMatchupNarrative({
      rivalry,
      season: context.season,
      day: context.day,
      minimumIntensityScore: RIVALRY_HIGH_LEVERAGE_MIN_SCORE,
      currentSeasonTeamMomentCount: pairTeamMomentCount,
      currentSeasonPlayerMomentCount,
    });
    if (!narrative) {
      continue;
    }

    const stakes = playoffMeeting
      ? `${teamLabel(teamASummary)} and ${teamLabel(teamBSummary)} ran the rivalry back onto an October stage.`
      : `${teamLabel(teamASummary)} and ${teamLabel(teamBSummary)} both finished within three games of a division or wild-card lane.`;
    const { impact, relevance } = rivalryImpactProfile(intensityScore);
    const description = `${narrative.headline} ${stakes}`;

    detected.push({
      teamId: rivalry.teamA,
      moment: createMoment(
        'rivalry_renewed',
        description,
        impact,
        relevance,
        context.season,
        context.day,
      ),
    });
    detected.push({
      teamId: rivalry.teamB,
      moment: createMoment(
        'rivalry_renewed',
        description,
        impact,
        relevance,
        context.season,
        context.day,
      ),
    });
  }

  return detected.sort((left, right) =>
    left.teamId.localeCompare(right.teamId)
    || compareMomentType(left.moment.type, right.moment.type),
  );
}

export function detectSeptemberHeroics(
  summary: TeamSeasonSummary,
  context: SeasonIdentityMomentDetectionContext,
): SeasonIdentityDetectedMoment | null {
  if (momentAlreadyRecorded(context, summary.teamId, 'september_heroics')) {
    return null;
  }
  if (!summary.madePlayoffs) {
    return null;
  }

  const septemberWins = context.monthlyRecordSplits?.[summary.teamId]?.['9']?.wins ?? 0;
  if (septemberWins < SEPTEMBER_HEROICS_WIN_THRESHOLD) {
    return null;
  }

  return {
    teamId: summary.teamId,
    moment: createMoment(
      'september_heroics',
      `A ${septemberWins}-win September shoved the ${teamLabel(summary)} through the regular-season door and into October.`,
      SEPTEMBER_HEROICS_IMPACT,
      SEPTEMBER_HEROICS_RELEVANCE,
      context.season,
      context.day,
    ),
  };
}

export function detectSeasonIdentityMoments(
  context: SeasonIdentityMomentDetectionContext,
): SeasonIdentityDetectedMoment[] {
  const moments: SeasonIdentityDetectedMoment[] = [
    ...detectRivalryRenewed(context),
  ];
  const breakoutTeamIds = new Set<string>();
  for (const summary of context.teams) {
    const fireSale = detectFireSale(summary, context);
    if (fireSale) {
      moments.push(fireSale);
    }
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
    const dynastyEnd = detectDynastyEnd(summary, context);
    if (dynastyEnd) {
      moments.push(dynastyEnd);
    }
    const losingStreak = detectLosingSeasonStreak(summary, context.season, context.day);
    if (losingStreak) {
      moments.push(losingStreak);
    }
    const cursedFranchise = detectCursedFranchise(summary, context);
    if (cursedFranchise) {
      moments.push(cursedFranchise);
    }
    const veteranCoreRetires = detectVeteranCoreRetires(summary, context);
    if (veteranCoreRetires) {
      moments.push(veteranCoreRetires);
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
    const septemberHeroics = detectSeptemberHeroics(summary, context);
    if (septemberHeroics) {
      moments.push(septemberHeroics);
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
