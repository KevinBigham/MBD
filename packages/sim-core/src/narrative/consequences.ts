import type { BriefingItem, ConsequenceWatcher, FanSentiment } from '@mbd/contracts';
import { getTeamById } from '../league/teams.js';
import type { CareerStatsLedger } from '../league/hallOfFame.js';
import type { MoraleEvent } from '../league/narrativeState.js';
import type { GameRNG } from '../math/prng.js';
import { toDisplayRating } from '../player/attributes.js';
import type { GeneratedPlayer } from '../player/generation.js';
import type { PlayerGameStats } from '../sim/gameSimulator.js';
import type { PlayoffBracket } from '../sim/playoffSimulator.js';
import { REGULAR_SEASON_DAYS } from '../sim/calendar.js';
import { buildLeagueAdvancedContext, calculateAdvancedStatLine } from '../stats/advanced.js';
import { generateNews, generateRetirementNews, generateSeasonRecap } from './newsFeed.js';
import type { NewsItem } from './newsFeed.js';

const WATCHER_CAP = 20;
const LEVEL_ORDER = ['ROOKIE', 'A', 'A_PLUS', 'AA', 'AAA', 'MLB'] as const;

export interface OwnerDecisionDelta {
  delta: number;
  summary: string;
}

export interface PlayerMoraleDelta {
  playerId: string;
  event: MoraleEvent;
}

export interface ConsequenceBundle {
  newsItems: NewsItem[];
  briefingItems: BriefingItem[];
  playerMoraleEvents: PlayerMoraleDelta[];
  ownerDecisionDelta: OwnerDecisionDelta | null;
  storyFlags: string[];
  seasonHistoryMoments: string[];
}

export interface TradeConsequenceContext {
  rng: GameRNG;
  season: number;
  day: number;
  userTeamId: string;
  partnerTeamId: string;
  acquiredPlayers: GeneratedPlayer[];
  tradedAwayPlayers: GeneratedPlayer[];
  remainingUserPlayers: GeneratedPlayer[];
  userFairness: number;
  payrollAfterTrade: number;
  payrollTarget: number;
}

export interface SigningConsequenceContext {
  rng: GameRNG;
  season: number;
  day: number;
  userTeamId: string;
  player: GeneratedPlayer;
  annualSalary: number;
  years: number;
  marketValue: number;
  payrollAfterSigning: number;
  payrollTarget: number;
  remainingUserPlayers: GeneratedPlayer[];
  decisionExplanation?: string;
}

export type UserPostseasonOutcome =
  | 'champion'
  | 'world_series_loss'
  | 'championship_series_loss'
  | 'division_series_loss'
  | 'wild_card_loss'
  | 'missed_playoffs';

export interface PostseasonConsequenceContext {
  rng: GameRNG;
  season: number;
  userTeamId: string;
  playoffBracket: PlayoffBracket;
  standings: Array<{ teamId: string; wins: number; losses: number }>;
  userPlayers: GeneratedPlayer[];
  userOutcome: UserPostseasonOutcome;
}

export interface RetirementConsequenceContext {
  rng: GameRNG;
  season: number;
  day: number;
  userTeamId: string;
  retiredPlayers: GeneratedPlayer[];
  remainingUserPlayers: GeneratedPlayer[];
  careerStatsByPlayerId?: ReadonlyMap<string, CareerStatsLedger>;
  priorSeasonGamesMissedByPlayerId?: ReadonlyMap<string, number>;
}

export interface TradeAftermathChainContext {
  rng: GameRNG;
  season: number;
  day: number;
  userTeamId: string;
  tradedAwayPlayers: GeneratedPlayer[];
  replacementPlayers: GeneratedPlayer[];
  seasonsWithTeamByPlayerId: Record<string, number>;
}

export interface EvaluateConsequenceWatchersContext {
  rng: GameRNG;
  season: number;
  day: number;
  userTeamId: string;
  players: GeneratedPlayer[];
  playerStats: Array<[string, PlayerGameStats]>;
  watchers: ConsequenceWatcher[];
}

export interface EvaluateConsequenceWatchersResult {
  updatedWatchers: ConsequenceWatcher[];
  newsItems: NewsItem[];
  moraleDeltas: PlayerMoraleDelta[];
}

export interface RushingRisk {
  injuryMultiplier: number;
  regressionChance: number;
  confidenceHit: number;
}

export interface FanSentimentContext {
  season: number;
  day: number;
  priorScore?: number;
  wins: number;
  losses: number;
  tradePulse: number;
  signingPulse: number;
  prospectDebuts: number;
  championshipSeasons: number[];
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function makeTimestamp(season: number, day: number): string {
  return `S${season}D${day}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickStableVariant(scope: string, variants: readonly string[]): string {
  if (variants.length === 0) {
    return '';
  }
  return variants[hashString(scope) % variants.length] ?? variants[0] ?? '';
}

function pickStableVariantByValue(value: number, variants: readonly string[]): string {
  if (variants.length === 0) {
    return '';
  }
  return variants[Math.abs(value) % variants.length] ?? variants[0] ?? '';
}

function compareSeasonDay(
  leftSeason: number,
  leftDay: number,
  rightSeason: number,
  rightDay: number,
): number {
  if (leftSeason !== rightSeason) {
    return leftSeason - rightSeason;
  }
  return leftDay - rightDay;
}

function watcherSort(left: ConsequenceWatcher, right: ConsequenceWatcher): number {
  return compareSeasonDay(left.createdSeason, left.createdDay, right.createdSeason, right.createdDay);
}

function watcherId(
  type: ConsequenceWatcher['type'],
  season: number,
  day: number,
  subjectId: string,
  suffix: string,
  seed: number,
): string {
  return `${type}-${season}-${day}-${subjectId}-${suffix}-${seed}`;
}

function buildWarIndex(
  players: GeneratedPlayer[],
  playerStats: Map<string, PlayerGameStats>,
): Map<string, number> {
  if (players.length === 0 || playerStats.size === 0) {
    return new Map();
  }

  const context = buildLeagueAdvancedContext(players, playerStats);
  return new Map(
    players.map((player) => {
      const stats = playerStats.get(player.id);
      if (!stats) {
        return [player.id, 0] as const;
      }
      return [player.id, calculateAdvancedStatLine(player, stats, context).war] as const;
    }),
  );
}

function buildBriefingFromNews(
  newsItem: NewsItem,
  timestamp: string,
  priority: number = newsItem.priority,
): BriefingItem {
  return {
    id: `brief-${newsItem.id}`,
    priority: priority as 1 | 2 | 3 | 4 | 5,
    category: 'news',
    headline: newsItem.headline,
    body: newsItem.body,
    relatedTeamIds: newsItem.relatedTeamIds,
    relatedPlayerIds: newsItem.relatedPlayerIds,
    timestamp,
    acknowledged: false,
  };
}

function buildMoraleDelta(
  playerId: string,
  type: MoraleEvent['type'],
  impact: number,
  summary: string,
  timestamp: string,
): PlayerMoraleDelta {
  return {
    playerId,
    event: {
      type,
      impact,
      summary,
      timestamp,
    },
  };
}

function postseasonSummary(
  context: Pick<PostseasonConsequenceContext, 'season' | 'userTeamId' | 'userOutcome'> & {
    championTeamId: string | null;
  },
): { text: string; moraleImpact: number; ownerDelta: number; storyFlags: string[] } {
  const championName = teamLabel(context.championTeamId ?? '');
  const scopeValue =
    (context.season * 17)
    + hashString(context.userTeamId)
    + hashString(context.userOutcome)
    + hashString(context.championTeamId ?? 'none');

  switch (context.userOutcome) {
    case 'champion':
      return {
        text: pickStableVariantByValue(scopeValue, [
          `${championName} finished on top.`,
          `${championName} closed October with the last word.`,
        ]),
        moraleImpact: 8,
        ownerDelta: 15,
        storyFlags: ['championship_window'],
      };
    case 'world_series_loss':
      return {
        text: pickStableVariantByValue(scopeValue, [
          'The club fell in the final round but kept the window open.',
          'One series short of a title still left the window alive.',
        ]),
        moraleImpact: 5,
        ownerDelta: 9,
        storyFlags: ['deep_october_run'],
      };
    case 'championship_series_loss':
      return {
        text: pickStableVariantByValue(scopeValue, [
          'A deep October push ended short of the final series.',
          'The pennant push ended, but it widened the window.',
        ]),
        moraleImpact: 3,
        ownerDelta: 6,
        storyFlags: ['deep_october_run'],
      };
    case 'division_series_loss':
      return {
        text: pickStableVariantByValue(scopeValue, [
          'The division round ended fast and left a thicker October file.',
          'A sharp division-series exit made the roster feel close, not complete.',
          'Getting through the door only sharpened how much more the roster still needs.',
        ]),
        moraleImpact: -4,
        ownerDelta: 3,
        storyFlags: ['postseason_sting'],
      };
    case 'wild_card_loss':
      return {
        text: pickStableVariantByValue(scopeValue, [
          'The playoff exit landed early and left unfinished business.',
          'The wild-card round ended before the club could settle in.',
          'The first postseason hurdle stopped the run and sharpened the offseason.',
        ]),
        moraleImpact: -4,
        ownerDelta: 3,
        storyFlags: ['postseason_sting'],
      };
    default:
      return {
        text: 'October arrived without this club in the bracket.',
        moraleImpact: 0,
        ownerDelta: 0,
        storyFlags: [],
      };
  }
}

function postseasonBriefingHeadline(
  context: Pick<PostseasonConsequenceContext, 'season' | 'userTeamId' | 'userOutcome'> & {
    championTeamId: string | null;
  },
): string {
  const scopeValue =
    (context.season * 11)
    + hashString(context.userTeamId)
    + hashString(context.userOutcome)
    + hashString(context.championTeamId ?? 'none');

  switch (context.userOutcome) {
    case 'champion':
      return pickStableVariantByValue(scopeValue, [
        `Season ${context.season} title ledger`,
        `Season ${context.season} under title banners`,
      ]);
    case 'world_series_loss':
      return pickStableVariantByValue(scopeValue, [
        `Season ${context.season} one series short`,
        `Season ${context.season} final-round bruise`,
      ]);
    case 'championship_series_loss':
      return pickStableVariantByValue(scopeValue, [
        `Season ${context.season} pennant-race scar`,
        `Season ${context.season} late-October weight`,
      ]);
    case 'division_series_loss':
      return pickStableVariantByValue(scopeValue, [
        `Season ${context.season} October to-do list`,
        `Season ${context.season} second-round fallout`,
      ]);
    case 'wild_card_loss':
      return pickStableVariantByValue(scopeValue, [
        `Season ${context.season} early October bruise`,
        `Season ${context.season} wild-card fallout`,
        `Season ${context.season} before rhythm`,
      ]);
    default:
      return `Season ${context.season} postseason summary`;
  }
}

export function buildTradeConsequenceBundle(
  context: TradeConsequenceContext,
): ConsequenceBundle {
  const timestamp = makeTimestamp(context.season, context.day);
  const primaryIncoming = context.acquiredPlayers[0] ?? context.tradedAwayPlayers[0];
  const primaryOutgoing = context.tradedAwayPlayers[0] ?? context.acquiredPlayers[0];
  const newsItems = generateNews(
    context.rng.fork(),
    {
      type: 'trade',
      season: context.season,
      day: context.day,
      data: {
        player1Id: primaryIncoming?.id,
        player2Id: primaryOutgoing?.id,
        team1Id: context.userTeamId,
        team2Id: context.partnerTeamId,
        team1Name: teamLabel(context.userTeamId),
        team2Name: teamLabel(context.partnerTeamId),
      },
    },
    [...context.acquiredPlayers, ...context.tradedAwayPlayers],
    context.season,
    context.day,
  );

  const clubhouseImpact =
    context.userFairness >= 20 ? 4 :
    context.userFairness <= -20 ? -4 :
    0;
  const playerMoraleEvents = [
    ...context.acquiredPlayers.map((player) =>
      buildMoraleDelta(
        player.id,
        'trade',
        6,
        `${player.firstName} ${player.lastName} arrives with a fresh opportunity.`,
        timestamp,
      ),
    ),
    ...context.tradedAwayPlayers.map((player) =>
      buildMoraleDelta(
        player.id,
        'trade',
        -10,
        `${player.firstName} ${player.lastName} was moved out in the trade.`,
        timestamp,
      ),
    ),
    ...(
      clubhouseImpact === 0
        ? []
        : context.remainingUserPlayers.map((player) =>
            buildMoraleDelta(
              player.id,
              'trade',
              clubhouseImpact,
              clubhouseImpact > 0
                ? 'The room sees this trade as a push in the right direction.'
                : 'The room is uneasy about what this trade cost.',
              timestamp,
            ),
          )
    ),
  ];

  const payrollPenalty = Math.floor(Math.max(0, context.payrollAfterTrade - context.payrollTarget) / 15);
  const ownerDelta = clamp(Math.round(context.userFairness / 10) - payrollPenalty, -12, 12);

  return {
    newsItems,
    briefingItems: newsItems.map((item) => buildBriefingFromNews(item, timestamp, 2)),
    playerMoraleEvents,
    ownerDecisionDelta: {
      delta: ownerDelta,
      summary: ownerDelta >= 0
        ? 'Ownership views the trade as a credible swing at improvement.'
        : 'Ownership sees the trade as a risky use of payroll and assets.',
    },
    storyFlags: ownerDelta >= 4 ? ['trade_spark'] : ownerDelta <= -4 ? ['trade_backlash'] : [],
    seasonHistoryMoments: [],
  };
}

export function buildSigningConsequenceBundle(
  context: SigningConsequenceContext,
): ConsequenceBundle {
  const timestamp = makeTimestamp(context.season, context.day);
  const newsItems = generateNews(
    context.rng.fork(),
    {
      type: 'signing',
      season: context.season,
      day: context.day,
      data: {
        playerId: context.player.id,
        teamId: context.userTeamId,
        teamName: teamLabel(context.userTeamId),
        years: context.years,
        ...(context.decisionExplanation
          ? { decisionExplanation: context.decisionExplanation }
          : {}),
      },
    },
    [context.player],
    context.season,
    context.day,
  );

  const teammateImpact = context.annualSalary <= context.marketValue ? 3 : 1;
  const withinTarget = context.payrollAfterSigning <= context.payrollTarget;
  const atOrBelowMarket = context.annualSalary <= context.marketValue;
  const ownerDelta =
    withinTarget && atOrBelowMarket ? 8 :
    withinTarget || atOrBelowMarket ? 4 :
    -6;

  return {
    newsItems,
    briefingItems: newsItems.map((item) => buildBriefingFromNews(item, timestamp, 2)),
    playerMoraleEvents: [
      buildMoraleDelta(
        context.player.id,
        'promotion',
        10,
        `${context.player.firstName} ${context.player.lastName} secured the deal and joined the major-league roster.`,
        timestamp,
      ),
      ...context.remainingUserPlayers.map((player) =>
        buildMoraleDelta(
          player.id,
          'promotion',
          teammateImpact,
          'The clubhouse sees the front office adding real talent.',
          timestamp,
        ),
      ),
    ],
    ownerDecisionDelta: {
      delta: ownerDelta,
      summary: ownerDelta >= 0
        ? 'Ownership approved the signing and the payroll fit.'
        : 'Ownership is uneasy about the signing cost relative to the payroll plan.',
    },
    storyFlags: ownerDelta >= 8 ? ['winter_statement'] : ownerDelta < 0 ? ['winter_overreach'] : [],
    seasonHistoryMoments: [`Signed ${context.player.firstName} ${context.player.lastName} to a ${context.years}-year contract.`],
  };
}

export function buildPostseasonConsequenceBundle(
  context: PostseasonConsequenceContext,
): ConsequenceBundle {
  const summary = postseasonSummary({
    season: context.season,
    userTeamId: context.userTeamId,
    userOutcome: context.userOutcome,
    championTeamId: context.playoffBracket.champion,
  });
  const championshipNews = context.playoffBracket.champion
    ? generateNews(
        context.rng.fork(),
        {
          type: 'season_end',
          season: context.season,
          day: REGULAR_SEASON_DAYS,
          data: {
            championId: context.playoffBracket.champion,
            championName: teamLabel(context.playoffBracket.champion),
            season: context.season,
          },
        },
        [],
        context.season,
        REGULAR_SEASON_DAYS,
      )
    : [];
  const recapNews = generateSeasonRecap(
    context.rng.fork(),
    context.standings,
    context.playoffBracket.champion,
    context.season,
  );
  const newsItems = [...championshipNews, ...recapNews];

  return {
    newsItems,
    briefingItems: context.userOutcome === 'missed_playoffs'
      ? []
      : [{
          id: `brief-postseason-${context.season}`,
          priority: 1,
          category: 'news',
          headline: postseasonBriefingHeadline({
            season: context.season,
            userTeamId: context.userTeamId,
            userOutcome: context.userOutcome,
            championTeamId: context.playoffBracket.champion,
          }),
          body: summary.text,
          relatedTeamIds: [context.userTeamId],
          relatedPlayerIds: [],
          timestamp: `S${context.season}D${REGULAR_SEASON_DAYS}`,
          acknowledged: false,
        }],
    playerMoraleEvents: summary.moraleImpact === 0
      ? []
      : context.userPlayers.map((player) =>
          buildMoraleDelta(
            player.id,
            'award',
            summary.moraleImpact,
            summary.text,
            `S${context.season}D${REGULAR_SEASON_DAYS}`,
          ),
        ),
    ownerDecisionDelta: summary.ownerDelta === 0
      ? null
      : {
          delta: summary.ownerDelta,
          summary: summary.text,
        },
    storyFlags: summary.storyFlags,
    seasonHistoryMoments: [
      summary.text,
      ...newsItems.slice(0, 2).map((item) => item.headline),
    ].slice(0, 3),
  };
}

export function buildRetirementConsequenceBundle(
  context: RetirementConsequenceContext,
): ConsequenceBundle {
  const timestamp = makeTimestamp(context.season, context.day);
  const newsItems: NewsItem[] = [];
  const seasonHistoryMoments: string[] = [];
  let ownerDecisionDelta: OwnerDecisionDelta | null = null;
  let clubhouseLoss = false;

  for (const player of context.retiredPlayers) {
    const userRetiree = player.teamId === context.userTeamId;
    const notableLeagueRetiree = player.rosterStatus === 'MLB' && player.personality.leadership >= 70;
    if (!userRetiree && !notableLeagueRetiree) continue;

    const newsItem = generateRetirementNews(
      context.rng.fork(),
      player,
      context.season,
      context.day,
      teamLabel(player.teamId),
      {
        careerStats: context.careerStatsByPlayerId?.get(player.id) ?? null,
        priorSeasonGamesMissed: context.priorSeasonGamesMissedByPlayerId?.get(player.id),
        currentTeamId: player.teamId,
      },
    );
    newsItems.push(newsItem);
    seasonHistoryMoments.push(newsItem.headline);

    if (userRetiree && player.rosterStatus === 'MLB' && player.personality.leadership >= 70) {
      clubhouseLoss = true;
    }

    if (userRetiree && player.rosterStatus === 'MLB' && toDisplayRating(player.overallRating) >= 60) {
      ownerDecisionDelta = {
        delta: -2,
        summary: `Ownership now expects the front office to replace the void left by ${player.firstName} ${player.lastName}.`,
      };
    }
  }

  return {
    newsItems,
    briefingItems: newsItems
      .filter((item) => item.relatedTeamIds.includes(context.userTeamId))
      .map((item) => buildBriefingFromNews(item, timestamp, 1)),
    playerMoraleEvents: clubhouseLoss
      ? context.remainingUserPlayers.map((player) =>
          buildMoraleDelta(
            player.id,
            'loss',
            -4,
            'A respected veteran left the room, and the clubhouse feels it.',
            timestamp,
          ),
        )
      : [],
    ownerDecisionDelta,
    storyFlags: clubhouseLoss ? ['clubhouse_transition'] : [],
    seasonHistoryMoments,
  };
}

function normalizeExpiry(season: number, day: number, offsetDays: number): { season: number; day: number } {
  const targetDay = day + offsetDays;
  if (targetDay <= REGULAR_SEASON_DAYS) {
    return { season, day: targetDay };
  }
  return {
    season: season + Math.floor((targetDay - 1) / REGULAR_SEASON_DAYS),
    day: ((targetDay - 1) % REGULAR_SEASON_DAYS) + 1,
  };
}

export function buildTradeAftermathChain(
  context: TradeAftermathChainContext,
): ConsequenceWatcher[] {
  const watchers: ConsequenceWatcher[] = [];
  for (const [index, player] of context.tradedAwayPlayers.entries()) {
    const seasonsWithClub = context.seasonsWithTeamByPlayerId[player.id] ?? 0;
    if (seasonsWithClub < 5) {
      continue;
    }

    const replacement = context.replacementPlayers[index] ?? context.replacementPlayers[0] ?? null;
    const shortExpiry = normalizeExpiry(context.season, context.day, 60);
    const shortSeed = context.rng.nextInt(100, 999);
    const longSeed = context.rng.nextInt(100, 999);
    const tradedPlayerName = `${player.firstName} ${player.lastName}`;
    const replacementPlayerName = replacement == null ? 'next man up' : `${replacement.firstName} ${replacement.lastName}`;

    watchers.push({
      id: watcherId('trade_aftermath', context.season, context.day, player.id, 'mourning', shortSeed),
      type: 'trade_aftermath',
      createdSeason: context.season,
      createdDay: context.day,
      expiresSeason: shortExpiry.season,
      expiresDay: shortExpiry.day,
      resolved: false,
      context: {
        kind: 'fan_mourning',
        teamId: context.userTeamId,
        tradedPlayerId: player.id,
        tradedPlayerName,
        replacementPlayerId: replacement?.id ?? null,
        replacementPlayerName,
      },
    });
    watchers.push({
      id: watcherId('trade_aftermath', context.season, context.day, player.id, 'review', longSeed),
      type: 'trade_aftermath',
      createdSeason: context.season,
      createdDay: context.day,
      expiresSeason: context.season + 1,
      expiresDay: 1,
      resolved: false,
      context: {
        kind: 'season_review',
        teamId: context.userTeamId,
        tradedPlayerId: player.id,
        tradedPlayerName,
        replacementPlayerId: replacement?.id ?? null,
        replacementPlayerName,
      },
    });
  }

  return watchers;
}

function findOldestUnresolvedIndex(
  watchers: ConsequenceWatcher[],
  excludedIds: Set<string> = new Set(),
): number {
  let bestIndex = -1;
  for (const [index, watcher] of watchers.entries()) {
    if (watcher.resolved || excludedIds.has(watcher.id)) {
      continue;
    }
    if (bestIndex === -1 || watcherSort(watcher, watchers[bestIndex]!) < 0) {
      bestIndex = index;
    }
  }
  return bestIndex;
}

function findOldestResolvedIndex(
  watchers: ConsequenceWatcher[],
  excludedIds: Set<string> = new Set(),
): number {
  let bestIndex = -1;
  for (const [index, watcher] of watchers.entries()) {
    if (!watcher.resolved || excludedIds.has(watcher.id)) {
      continue;
    }
    if (bestIndex === -1 || watcherSort(watcher, watchers[bestIndex]!) < 0) {
      bestIndex = index;
    }
  }
  return bestIndex;
}

export function appendConsequenceWatchers(
  existing: ConsequenceWatcher[],
  additions: ConsequenceWatcher[],
): ConsequenceWatcher[] {
  const merged = [...existing];
  const protectedIds = new Set<string>();

  for (const addition of additions) {
    if (merged.filter((watcher) => !watcher.resolved).length >= WATCHER_CAP) {
      const oldestUnresolvedIndex = findOldestUnresolvedIndex(merged, protectedIds);
      if (oldestUnresolvedIndex >= 0) {
        merged[oldestUnresolvedIndex] = {
          ...merged[oldestUnresolvedIndex]!,
          resolved: true,
        };
      }
    }

    merged.push(addition);
    protectedIds.add(addition.id);

    while (merged.length > WATCHER_CAP) {
      const removableUnresolvedIndex = findOldestUnresolvedIndex(merged, protectedIds);
      if (removableUnresolvedIndex >= 0) {
        merged.splice(removableUnresolvedIndex, 1);
        continue;
      }

      const removableResolvedIndex = findOldestResolvedIndex(merged, protectedIds);
      if (removableResolvedIndex >= 0) {
        merged.splice(removableResolvedIndex, 1);
        continue;
      }

      merged.shift();
    }
  }

  return merged;
}

function buildTradeResolutionNews(
  season: number,
  day: number,
  userTeamId: string,
  watcher: ConsequenceWatcher,
  tradedWar: number,
  replacementWar: number,
): NewsItem {
  const tradedPlayerName = String(watcher.context.tradedPlayerName ?? 'the departed veteran');
  const replacementPlayerName = String(watcher.context.replacementPlayerName ?? 'the replacement');
  const vindication = replacementWar >= tradedWar;
  const headline = vindication
    ? `Trade vindication: ${replacementPlayerName} softened the loss of ${tradedPlayerName}`
    : `Trade regret: ${tradedPlayerName} left a larger void than expected`;
  const homegrownCoda = typeof watcher.context.homegrownDraftSeason === 'number'
    ? ` Fans remember drafting ${tradedPlayerName} in ${watcher.context.homegrownDraftSeason}.`
    : '';
  const body = vindication
    ? `${replacementPlayerName} delivered ${replacementWar.toFixed(1)} WAR versus ${tradedPlayerName}'s ${tradedWar.toFixed(1)}, giving the deal a defensible shape.${homegrownCoda}`
    : `${tradedPlayerName} outpaced ${replacementPlayerName} ${tradedWar.toFixed(1)} WAR to ${replacementWar.toFixed(1)}, and the move still stings.${homegrownCoda}`;

  return {
    id: `news-trade-review-${watcher.id}`,
    headline,
    body,
    priority: vindication ? 3 : 2,
    category: 'trade',
    tag: 'ANALYSIS',
    timestamp: makeTimestamp(season, day),
    relatedPlayerIds: [
      String(watcher.context.tradedPlayerId ?? ''),
      String(watcher.context.replacementPlayerId ?? ''),
    ].filter(Boolean),
    relatedTeamIds: [userTeamId],
    read: false,
  };
}

export function evaluateConsequenceWatchers(
  context: EvaluateConsequenceWatchersContext,
): EvaluateConsequenceWatchersResult {
  const playerStats = new Map(context.playerStats);
  const warIndex = buildWarIndex(context.players, playerStats);
  const newsItems: NewsItem[] = [];
  const moraleDeltas: PlayerMoraleDelta[] = [];

  const updatedWatchers = context.watchers.map((watcher) => {
    if (watcher.resolved) {
      return watcher;
    }

    const hasExpired = compareSeasonDay(
      context.season,
      context.day,
      watcher.expiresSeason,
      watcher.expiresDay,
    ) >= 0;
    if (!hasExpired) {
      return watcher;
    }

    if (watcher.type === 'trade_aftermath' && watcher.context.kind !== 'fan_mourning') {
      const tradedWar = warIndex.get(String(watcher.context.tradedPlayerId ?? '')) ?? 0;
      const replacementWar = warIndex.get(String(watcher.context.replacementPlayerId ?? '')) ?? 0;
      newsItems.push(
        buildTradeResolutionNews(
          context.season,
          context.day,
          context.userTeamId,
          watcher,
          tradedWar,
          replacementWar,
        ),
      );
    }

    return {
      ...watcher,
      resolved: true,
    };
  });

  return {
    updatedWatchers,
    newsItems,
    moraleDeltas,
  };
}

export function calculateRushingRisk(
  _player: GeneratedPlayer,
  currentLevel: string,
  targetLevel: string,
): RushingRisk {
  const currentIndex = LEVEL_ORDER.indexOf(currentLevel as (typeof LEVEL_ORDER)[number]);
  const targetIndex = LEVEL_ORDER.indexOf(targetLevel as (typeof LEVEL_ORDER)[number]);
  const levelJump = currentIndex < 0 || targetIndex < 0
    ? 1
    : Math.max(1, targetIndex - currentIndex);

  if (levelJump >= 2) {
    return {
      injuryMultiplier: 1.6,
      regressionChance: 0.2,
      confidenceHit: 10,
    };
  }

  return {
    injuryMultiplier: 1.3,
    regressionChance: 0.1,
    confidenceHit: 5,
  };
}

export function calculateFanSentiment(context: FanSentimentContext): FanSentiment {
  const priorScore = context.priorScore ?? 50;
  const totalGames = context.wins + context.losses;
  const winPct = totalGames > 0 ? context.wins / totalGames : 0.5;
  const recentChampionshipBonus = context.championshipSeasons.includes(context.season - 1) ? 6 : 0;
  const score = clamp(
    Math.round(
      priorScore
      + ((winPct - 0.5) * 55)
      + (context.tradePulse * 0.9)
      + (context.signingPulse * 0.8)
      + (context.prospectDebuts * 2)
      + recentChampionshipBonus,
    ),
    0,
    100,
  );
  const delta = score - priorScore;
  const trend =
    delta >= 4 ? 'rising' :
    delta <= -4 ? 'falling' :
    'stable';
  const summary =
    trend === 'rising'
      ? 'Fans are energized by the club and expecting more.'
      : trend === 'falling'
        ? 'Fans are frustrated and the temperature around the club is dropping.'
        : 'Fans are engaged but waiting for the next real push.';

  return {
    score,
    trend,
    summary,
    updatedAt: makeTimestamp(context.season, context.day),
  };
}
