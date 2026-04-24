import type { RookieOfTheYearVotingEntry } from '@mbd/contracts';
import {
  pickStablePlayerArcBody,
  pickStablePlayerArcHeadline,
  type PlayerArcRenderContext,
  type PlayerArcTopicId,
} from '../narrative/playerArcProse.js';
import {
  pickStablePlayerMicroArcBody,
  pickStablePlayerMicroArcHeadline,
  type PlayerMicroArcRenderContext,
  type PlayerMicroArcTopicId,
} from '../narrative/playerMicroArcProse.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { getTeamById } from '../league/teams.js';
import { REGULAR_SEASON_DAYS, getRegularSeasonMonthForDay, getTradeDeadlineDay } from '../sim/calendar.js';
import type { GameBoxScore, PlayerGameStats } from '../sim/gameSimulator.js';
import type { PAOutcome, PAResult } from '../sim/plateAppearance.js';
import { buildLeagueAdvancedContext, calculateAdvancedStatLine } from '../stats/advanced.js';
import { ERA_PLUS_SHUTOUT_CAP } from '../stats/teamAggregates.js';
import type { Moment } from './momentDetector.js';

export const COMEBACK_PLAYER_IMPACT = 58;
export const COMEBACK_PLAYER_RELEVANCE = 0.9;
export const COMEBACK_PLAYER_MISSED_GAMES_THRESHOLD = 50;
export const COMEBACK_PLAYER_WAR_THRESHOLD = 3.5;
export const ROOKIE_SENSATION_IMPACT = 52;
export const ROOKIE_SENSATION_RELEVANCE = 0.82;
export const REDEMPTION_ARC_IMPACT = 56;
export const REDEMPTION_ARC_RELEVANCE = 0.88;
export const REDEMPTION_ARC_PRIOR_WAR_MAX = 1.0;
export const REDEMPTION_ARC_CURRENT_WAR_MIN = 3.0;
export const LATE_CAREER_PEAK_IMPACT = 54;
export const LATE_CAREER_PEAK_RELEVANCE = 0.86;
export const LATE_CAREER_PEAK_AGE_MIN = 36;
export const LATE_CAREER_PEAK_CAREER_WAR_MIN = 40.0;
export const LATE_CAREER_PEAK_CURRENT_WAR_MIN = 3.0;
export const ROOKIE_BREAKOUT_IMPACT = 55;
export const ROOKIE_BREAKOUT_RELEVANCE = 0.84;
export const ROOKIE_BREAKOUT_SERVICE_TIME_MAX = 172;
export const ROOKIE_BREAKOUT_CURRENT_WAR_MIN = 3.0;
export const INJURY_RETURN_HERO_IMPACT = 53;
export const INJURY_RETURN_HERO_RELEVANCE = 0.83;
export const INJURY_RETURN_HERO_MIN_OPS_OR_ERA_PLUS = 130;
export const INJURY_RETURN_HERO_WINDOW_DAYS = 21;
export const INJURY_RETURN_HERO_MIN_PA = 50;
export const INJURY_RETURN_HERO_MIN_IP_OUTS = 45;
export const TRADE_DEADLINE_SPARK_IMPACT = 54;
export const TRADE_DEADLINE_SPARK_RELEVANCE = 0.84;
export const TRADE_DEADLINE_SPARK_MIN_OPS_OR_ERA_PLUS = 130;
export const TRADE_DEADLINE_SPARK_WINDOW_DAYS = 30;
export const TRADE_DEADLINE_SPARK_MIN_PA = 75;
export const TRADE_DEADLINE_SPARK_MIN_IP_OUTS = 60;
export const SEPTEMBER_CALLUP_HERO_IMPACT = 55;
export const SEPTEMBER_CALLUP_HERO_RELEVANCE = 0.85;
export const SEPTEMBER_CALLUP_HERO_MIN_OPS_OR_ERA_PLUS = 140;
export const SEPTEMBER_CALLUP_HERO_WINDOW_DAYS = 30;
export const SEPTEMBER_CALLUP_HERO_MIN_PA = 40;
export const SEPTEMBER_CALLUP_HERO_MIN_IP_OUTS = 30;

export interface SignatureMomentDetectionResult {
  readonly playerId: string;
  readonly moment: Moment & { readonly day: number; readonly timestamp: string };
  readonly score?: number;
}

interface PlayerMicroArcDetectionContext {
  readonly season: number;
  readonly detectionDay: number;
  readonly players: readonly GeneratedPlayer[];
  readonly playerSeasonStats: ReadonlyMap<string, PlayerGameStats>;
  readonly gameLog: readonly GameBoxScore[];
  readonly playerMoments: ReadonlyMap<string, readonly Moment[]>;
}

export interface InjuryReturnHeroDetectionContext extends PlayerMicroArcDetectionContext {
  readonly returnDay: number;
  readonly injuryLabel: string;
  readonly daysOnIl: number;
  readonly teamId: string;
}

export interface TradeDeadlineSparkDetectionContext extends PlayerMicroArcDetectionContext {
  readonly tradeDay: number;
  readonly acquiringTeamId: string;
  readonly priorTeamId: string;
}

export interface SeptemberCallupHeroDetectionContext extends PlayerMicroArcDetectionContext {
  readonly callupDay: number;
  readonly teamId: string;
}

function createMoment(
  season: number,
  day: number,
  type: Moment['type'],
  description: string,
  impact: number,
  relevance: number,
): SignatureMomentDetectionResult['moment'] {
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
    round: null,
  };
}

export function estimatedWar(stats: PlayerGameStats): number {
  if (stats.ip > 0 && stats.pa < 30) {
    const innings = stats.ip / 3;
    const era = innings > 0 ? (stats.earnedRuns * 9) / innings : 9;
    return Number(((stats.wins * 0.28) + (stats.strikeouts / 52) + Math.max(0, 4.5 - era)).toFixed(2));
  }

  const average = stats.hits / Math.max(1, stats.ab);
  return Number(((stats.hr * 0.12) + (stats.rbi * 0.028) + (stats.runs * 0.02) + (stats.bb * 0.015) + (average * 1.8)).toFixed(2));
}

function playerAlreadyHasMoment(
  playerMoments: ReadonlyMap<string, readonly Moment[]>,
  playerId: string,
  type: Moment['type'],
  season: number,
): boolean {
  return playerMoments.get(playerId)?.some((moment) => moment.type === type && moment.season === season) ?? false;
}

function playerName(player: Pick<GeneratedPlayer, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`;
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function roundToTenth(value: number): number {
  return Number(value.toFixed(1));
}

function buildPlayerArcDescription(
  topicId: PlayerArcTopicId,
  renderContext: PlayerArcRenderContext,
  playerId: string,
  season: number,
): string {
  const headline = pickStablePlayerArcHeadline(topicId, renderContext, playerId, season);
  const body = pickStablePlayerArcBody(topicId, renderContext, playerId, season);
  return `${headline} ${body}`;
}

function buildPlayerMicroArcDescription(
  topicId: PlayerMicroArcTopicId,
  renderContext: PlayerMicroArcRenderContext,
  playerId: string,
  season: number,
): string {
  const headline = pickStablePlayerMicroArcHeadline(topicId, renderContext, playerId, season);
  const body = pickStablePlayerMicroArcBody(topicId, renderContext, playerId, season);
  return `${headline} ${body}`;
}

const HIT_OUTCOMES: ReadonlySet<PAOutcome> = new Set(['SINGLE', 'DOUBLE', 'TRIPLE', 'HR']);
const AT_BAT_OUTCOMES: ReadonlySet<PAOutcome> = new Set([
  'SINGLE', 'DOUBLE', 'TRIPLE', 'HR', 'K', 'GB_OUT', 'FB_OUT', 'LD_OUT', 'DOUBLE_PLAY',
]);
const PITCHER_OUTS_BY_OUTCOME: Readonly<Record<PAOutcome, number>> = {
  BB: 0,
  HBP: 0,
  SINGLE: 0,
  DOUBLE: 0,
  TRIPLE: 0,
  HR: 0,
  K: 1,
  GB_OUT: 1,
  FB_OUT: 1,
  LD_OUT: 1,
  SAC_FLY: 1,
  DOUBLE_PLAY: 2,
};

function emptyPlayerStats(playerId: string, teamId: string): PlayerGameStats {
  return {
    playerId,
    teamId,
    gamesPlayed: 0,
    gamesMissedToInjury: 0,
    pa: 0,
    ab: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    bb: 0,
    k: 0,
    runs: 0,
    hbp: 0,
    sacFlies: 0,
    ip: 0,
    earnedRuns: 0,
    strikeouts: 0,
    walks: 0,
    hitsAllowed: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    flyBallsAllowed: 0,
    wins: 0,
    saves: 0,
    losses: 0,
  };
}

function dayFromBoxScore(boxScore: GameBoxScore): number | null {
  const match = /^S\d+D(\d+)$/.exec(boxScore.date);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function isWindowGame(boxScore: GameBoxScore, startDay: number, windowDays: number): boolean {
  if (boxScore.isPlayoff) {
    return false;
  }
  const day = dayFromBoxScore(boxScore);
  return day != null && day >= startDay && day < startDay + windowDays;
}

function addBattingPa(stats: PlayerGameStats, result: PAResult) {
  stats.pa += 1;
  if (AT_BAT_OUTCOMES.has(result.outcome)) stats.ab += 1;
  if (HIT_OUTCOMES.has(result.outcome)) stats.hits += 1;
  if (result.outcome === 'DOUBLE') stats.doubles += 1;
  if (result.outcome === 'TRIPLE') stats.triples += 1;
  if (result.outcome === 'HR') stats.hr += 1;
  if (result.outcome === 'BB') stats.bb += 1;
  if (result.outcome === 'HBP') stats.hbp += 1;
  if (result.outcome === 'K') stats.k += 1;
  if (result.outcome === 'SAC_FLY') stats.sacFlies += 1;
  stats.rbi += result.rbiOnPlay;
}

function addPitchingPa(stats: PlayerGameStats, result: PAResult) {
  if (HIT_OUTCOMES.has(result.outcome)) stats.hitsAllowed += 1;
  if (result.outcome === 'HR') stats.homeRunsAllowed += 1;
  if (result.outcome === 'K') stats.strikeouts += 1;
  if (result.outcome === 'BB') stats.walks += 1;
  if (result.outcome === 'HBP') stats.hitBatters += 1;
  if (result.outcome === 'FB_OUT' || result.outcome === 'HR' || result.outcome === 'SAC_FLY') {
    stats.flyBallsAllowed += 1;
  }
  stats.ip += PITCHER_OUTS_BY_OUTCOME[result.outcome];
  stats.earnedRuns += result.rbiOnPlay;
}

function aggregateWindowStats(
  player: GeneratedPlayer,
  teamId: string,
  gameLog: readonly GameBoxScore[],
  startDay: number,
  windowDays: number,
): PlayerGameStats {
  const stats = emptyPlayerStats(player.id, teamId);
  for (const game of gameLog) {
    if (!isWindowGame(game, startDay, windowDays)) {
      continue;
    }
    for (const result of game.paResults) {
      if (result.batterId === player.id) {
        addBattingPa(stats, result);
      }
      if (result.pitcherId === player.id) {
        addPitchingPa(stats, result);
      }
    }
  }
  return stats;
}

function roundToOne(value: number): number {
  return Number(value.toFixed(1));
}

function eraPlusFor(stats: PlayerGameStats, leagueEra: number): number | null {
  const innings = stats.ip / 3;
  if (innings <= 0 || leagueEra <= 0) {
    return null;
  }
  const era = (stats.earnedRuns / innings) * 9;
  if (era <= 0) {
    return ERA_PLUS_SHUTOUT_CAP;
  }
  return roundToOne((leagueEra / era) * 100);
}

function scoreWindowPerformance(
  player: GeneratedPlayer,
  teamId: string,
  stats: PlayerGameStats,
  players: readonly GeneratedPlayer[],
  playerSeasonStats: ReadonlyMap<string, PlayerGameStats>,
  minPa: number,
  minIpOuts: number,
): number | null {
  const context = buildLeagueAdvancedContext([...players], new Map(playerSeasonStats));

  if (player.pitcherAttributes != null) {
    if (stats.ip < minIpOuts) {
      return null;
    }
    return eraPlusFor(stats, context.leagueEra);
  }

  if (stats.pa < minPa) {
    return null;
  }
  const line = calculateAdvancedStatLine({ ...player, teamId }, stats, context);
  return line.opsPlus == null ? null : roundToOne(line.opsPlus);
}

function dayLabel(day: number): string {
  const month = getRegularSeasonMonthForDay(day);
  return `${month.label} ${Math.max(1, day - month.startDay + 1)}`;
}

function isDeadlineTradeDay(day: number): boolean {
  const month = getRegularSeasonMonthForDay(day);
  return month.key === 'JULY' && day <= getTradeDeadlineDay();
}

function isSeptemberCallupDay(day: number): boolean {
  return getRegularSeasonMonthForDay(day).key === 'SEPTEMBER'
    || day >= REGULAR_SEASON_DAYS - 30 + 1;
}

function playerAlreadyHasTradeSparkForTeam(
  playerMoments: ReadonlyMap<string, readonly Moment[]>,
  playerId: string,
  season: number,
  acquiringTeamLabel: string,
): boolean {
  return playerMoments.get(playerId)?.some((moment) =>
    moment.type === 'trade_deadline_spark'
    && moment.season === season
    && moment.description.includes(acquiringTeamLabel)
  ) ?? false;
}

export function detectComebackPlayer(
  player: GeneratedPlayer,
  stats: PlayerGameStats | undefined,
  season: number,
  day: number,
  playerMoments: ReadonlyMap<string, readonly Moment[]> = new Map(),
): SignatureMomentDetectionResult | null {
  if (!stats) {
    return null;
  }
  if (player.priorSeasonGamesMissed < COMEBACK_PLAYER_MISSED_GAMES_THRESHOLD) {
    return null;
  }
  if (playerAlreadyHasMoment(playerMoments, player.id, 'comeback_player', season)) {
    return null;
  }
  if (estimatedWar(stats) < COMEBACK_PLAYER_WAR_THRESHOLD) {
    return null;
  }

  return {
    playerId: player.id,
    moment: createMoment(
      season,
      day,
      'comeback_player',
      `${player.firstName} ${player.lastName} came back from a lost year and turned ${player.priorSeasonGamesMissed} missed games into an impact season.`,
      COMEBACK_PLAYER_IMPACT,
      COMEBACK_PLAYER_RELEVANCE,
    ),
  };
}

export function detectRookieSensation(
  userTeamId: string,
  players: readonly GeneratedPlayer[],
  rookieOfTheYearVoting: readonly RookieOfTheYearVotingEntry[],
  season: number,
  day: number,
  playerMoments: ReadonlyMap<string, readonly Moment[]> = new Map(),
): SignatureMomentDetectionResult[] {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const detected: SignatureMomentDetectionResult[] = [];

  for (const ballot of rookieOfTheYearVoting) {
    if (ballot.season !== season) {
      continue;
    }

    for (const placement of ballot.placements) {
      if (placement.rank > 3) {
        continue;
      }

      const player = playersById.get(placement.playerId);
      if (!player || player.teamId !== userTeamId) {
        continue;
      }
      if (playerAlreadyHasMoment(playerMoments, player.id, 'rookie_sensation', season)) {
        continue;
      }

      detected.push({
        playerId: player.id,
        moment: createMoment(
          season,
          day,
          'rookie_sensation',
          `${player.firstName} ${player.lastName} finished ${placement.rank}${placement.rank === 1 ? 'st' : placement.rank === 2 ? 'nd' : 'rd'} in ${ballot.leagueId} Rookie of the Year voting and forced the league to notice.`,
          ROOKIE_SENSATION_IMPACT,
          ROOKIE_SENSATION_RELEVANCE,
        ),
      });
    }
  }

  return detected.sort((left, right) => left.playerId.localeCompare(right.playerId));
}

export function detectRedemptionArc(
  player: GeneratedPlayer,
  stats: PlayerGameStats | undefined,
  season: number,
  day: number,
  playerMoments: ReadonlyMap<string, readonly Moment[]> = new Map(),
): SignatureMomentDetectionResult | null {
  if (!stats || player.priorSeasonEstimatedWar == null) {
    return null;
  }
  if (playerAlreadyHasMoment(playerMoments, player.id, 'redemption_arc', season)) {
    return null;
  }

  const currentWar = estimatedWar(stats);
  if (player.priorSeasonEstimatedWar >= REDEMPTION_ARC_PRIOR_WAR_MAX || currentWar < REDEMPTION_ARC_CURRENT_WAR_MIN) {
    return null;
  }

  const description = buildPlayerArcDescription(
    'redemption_arc',
    {
      playerName: playerName(player),
      teamLabel: teamLabel(player.teamId),
      priorWar: roundToTenth(player.priorSeasonEstimatedWar),
      currentWar: roundToTenth(currentWar),
    },
    player.id,
    season,
  );

  return {
    playerId: player.id,
    moment: createMoment(
      season,
      day,
      'redemption_arc',
      description,
      REDEMPTION_ARC_IMPACT,
      REDEMPTION_ARC_RELEVANCE,
    ),
  };
}

export function detectLateCareerPeak(
  player: GeneratedPlayer,
  stats: PlayerGameStats | undefined,
  careerWarBeforeSeason: number,
  season: number,
  day: number,
  playerMoments: ReadonlyMap<string, readonly Moment[]> = new Map(),
): SignatureMomentDetectionResult | null {
  if (!stats || player.age < LATE_CAREER_PEAK_AGE_MIN) {
    return null;
  }
  if (playerAlreadyHasMoment(playerMoments, player.id, 'late_career_peak', season)) {
    return null;
  }

  const currentWar = estimatedWar(stats);
  if (careerWarBeforeSeason < LATE_CAREER_PEAK_CAREER_WAR_MIN || currentWar < LATE_CAREER_PEAK_CURRENT_WAR_MIN) {
    return null;
  }

  const description = buildPlayerArcDescription(
    'late_career_peak',
    {
      playerName: playerName(player),
      teamLabel: teamLabel(player.teamId),
      age: player.age,
      careerWar: roundToTenth(careerWarBeforeSeason),
      currentWar: roundToTenth(currentWar),
    },
    player.id,
    season,
  );

  return {
    playerId: player.id,
    moment: createMoment(
      season,
      day,
      'late_career_peak',
      description,
      LATE_CAREER_PEAK_IMPACT,
      LATE_CAREER_PEAK_RELEVANCE,
    ),
  };
}

export function detectRookieBreakout(
  player: GeneratedPlayer,
  stats: PlayerGameStats | undefined,
  season: number,
  day: number,
  playerMoments: ReadonlyMap<string, readonly Moment[]> = new Map(),
): SignatureMomentDetectionResult | null {
  if (!stats || player.serviceTimeDays >= ROOKIE_BREAKOUT_SERVICE_TIME_MAX) {
    return null;
  }
  if (playerAlreadyHasMoment(playerMoments, player.id, 'rookie_breakout', season)) {
    return null;
  }

  const currentWar = estimatedWar(stats);
  if (currentWar < ROOKIE_BREAKOUT_CURRENT_WAR_MIN) {
    return null;
  }

  const description = buildPlayerArcDescription(
    'rookie_breakout',
    {
      playerName: playerName(player),
      teamLabel: teamLabel(player.teamId),
      currentWar: roundToTenth(currentWar),
    },
    player.id,
    season,
  );

  return {
    playerId: player.id,
    moment: createMoment(
      season,
      day,
      'rookie_breakout',
      description,
      ROOKIE_BREAKOUT_IMPACT,
      ROOKIE_BREAKOUT_RELEVANCE,
    ),
  };
}

export function detectInjuryReturnHero(
  player: GeneratedPlayer,
  context: InjuryReturnHeroDetectionContext,
): SignatureMomentDetectionResult | null {
  if (context.returnDay > context.detectionDay || context.daysOnIl <= 0) {
    return null;
  }
  if (playerAlreadyHasMoment(context.playerMoments, player.id, 'injury_return_hero', context.season)) {
    return null;
  }

  const windowStats = aggregateWindowStats(
    player,
    context.teamId,
    context.gameLog,
    context.returnDay,
    INJURY_RETURN_HERO_WINDOW_DAYS,
  );
  const score = scoreWindowPerformance(
    player,
    context.teamId,
    windowStats,
    context.players,
    context.playerSeasonStats,
    INJURY_RETURN_HERO_MIN_PA,
    INJURY_RETURN_HERO_MIN_IP_OUTS,
  );
  if (score == null || score < INJURY_RETURN_HERO_MIN_OPS_OR_ERA_PLUS) {
    return null;
  }

  const description = buildPlayerMicroArcDescription(
    'injury_return_hero',
    {
      playerName: playerName(player),
      injuryLabel: context.injuryLabel,
      returnOpsPlusOrEraPlus: Math.round(score),
      daysOnIl: context.daysOnIl,
      teamLabel: teamLabel(context.teamId),
    },
    player.id,
    context.season,
  );

  return {
    playerId: player.id,
    score,
    moment: createMoment(
      context.season,
      context.returnDay,
      'injury_return_hero',
      description,
      INJURY_RETURN_HERO_IMPACT,
      INJURY_RETURN_HERO_RELEVANCE,
    ),
  };
}

export function detectTradeDeadlineSpark(
  player: GeneratedPlayer,
  context: TradeDeadlineSparkDetectionContext,
): SignatureMomentDetectionResult | null {
  if (!isDeadlineTradeDay(context.tradeDay) || context.tradeDay > context.detectionDay) {
    return null;
  }
  const acquiringTeamLabel = teamLabel(context.acquiringTeamId);
  if (playerAlreadyHasTradeSparkForTeam(
    context.playerMoments,
    player.id,
    context.season,
    acquiringTeamLabel,
  )) {
    return null;
  }

  const windowStats = aggregateWindowStats(
    player,
    context.acquiringTeamId,
    context.gameLog,
    context.tradeDay,
    TRADE_DEADLINE_SPARK_WINDOW_DAYS,
  );
  const score = scoreWindowPerformance(
    player,
    context.acquiringTeamId,
    windowStats,
    context.players,
    context.playerSeasonStats,
    TRADE_DEADLINE_SPARK_MIN_PA,
    TRADE_DEADLINE_SPARK_MIN_IP_OUTS,
  );
  if (score == null || score < TRADE_DEADLINE_SPARK_MIN_OPS_OR_ERA_PLUS) {
    return null;
  }

  const description = buildPlayerMicroArcDescription(
    'trade_deadline_spark',
    {
      playerName: playerName(player),
      acquiringTeamLabel,
      priorTeamLabel: teamLabel(context.priorTeamId),
      postTradeOpsPlusOrEraPlus: Math.round(score),
      tradeDayLabel: dayLabel(context.tradeDay),
    },
    player.id,
    context.season,
  );

  return {
    playerId: player.id,
    score,
    moment: createMoment(
      context.season,
      context.tradeDay,
      'trade_deadline_spark',
      description,
      TRADE_DEADLINE_SPARK_IMPACT,
      TRADE_DEADLINE_SPARK_RELEVANCE,
    ),
  };
}

export function detectSeptemberCallupHero(
  player: GeneratedPlayer,
  context: SeptemberCallupHeroDetectionContext,
): SignatureMomentDetectionResult | null {
  if (!isSeptemberCallupDay(context.callupDay) || context.callupDay > context.detectionDay) {
    return null;
  }
  if (playerAlreadyHasMoment(context.playerMoments, player.id, 'september_callup_hero', context.season)) {
    return null;
  }

  const windowStats = aggregateWindowStats(
    player,
    context.teamId,
    context.gameLog,
    context.callupDay,
    SEPTEMBER_CALLUP_HERO_WINDOW_DAYS,
  );
  const score = scoreWindowPerformance(
    player,
    context.teamId,
    windowStats,
    context.players,
    context.playerSeasonStats,
    SEPTEMBER_CALLUP_HERO_MIN_PA,
    SEPTEMBER_CALLUP_HERO_MIN_IP_OUTS,
  );
  if (score == null || score < SEPTEMBER_CALLUP_HERO_MIN_OPS_OR_ERA_PLUS) {
    return null;
  }

  const description = buildPlayerMicroArcDescription(
    'september_callup_hero',
    {
      playerName: playerName(player),
      teamLabel: teamLabel(context.teamId),
      callupDayLabel: dayLabel(context.callupDay),
      callupOpsPlusOrEraPlus: Math.round(score),
      ageAtCallup: player.age,
    },
    player.id,
    context.season,
  );

  return {
    playerId: player.id,
    score,
    moment: createMoment(
      context.season,
      context.callupDay,
      'september_callup_hero',
      description,
      SEPTEMBER_CALLUP_HERO_IMPACT,
      SEPTEMBER_CALLUP_HERO_RELEVANCE,
    ),
  };
}
