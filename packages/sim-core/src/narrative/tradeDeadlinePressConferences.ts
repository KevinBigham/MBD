import type { GeneratedPlayer } from '../player/generation.js';
import type { GMPersonality } from '../trade/tradeAI.js';
import {
  detectTradeMoments,
  detectDeadlineIdentityMoments,
  type DeadlineIdentityDetectedMoment,
  type TradeDetectedMoment,
} from '../moments/tradeMoments.js';
import { isTradeDeadlineModeDay } from '../sim/calendar.js';
import type { PressConferenceTopicCategory } from './pressConferences.js';

const BLOCKBUSTER_TRADE_RATING_THRESHOLD = 280;
const BLOCKBUSTER_TRADE_VALUE_THRESHOLD = 60;
const SELL_SIGNAL_PERSONALITIES: readonly GMPersonality[] = ['conservative', 'prospect_hugger'];
const BUY_SIGNAL_PERSONALITIES: readonly GMPersonality[] = ['aggressive', 'win_now'];

export interface TradeDeadlinePressConferenceContext {
  tradeId: string;
  season: number;
  day: number;
  sellerTeamId: string;
  sellerTeamName: string;
  sellerGMPersonality: GMPersonality;
  buyerTeamId: string;
  buyerTeamName: string;
  buyerGMPersonality: GMPersonality;
  movedPlayers: readonly GeneratedPlayer[];
  acquiredPlayers: readonly GeneratedPlayer[];
}

export interface TradeDeadlinePressConference {
  id: string;
  topicId:
    | 'deadline_blockbuster'
    | 'deadline_sell_signal'
    | 'deadline_buy_signal'
    | 'offseason_blockbuster'
    | 'routine_swap';
  topicCategory: Extract<PressConferenceTopicCategory, 'TRADE_DEADLINE'>;
  headline: string;
  body: string;
  priority: 1 | 2 | 3;
}

export interface TradeBroadcastCoverage {
  moments: TradeDetectedMoment[];
  identityMoments: DeadlineIdentityDetectedMoment[];
  pressConference: TradeDeadlinePressConference;
  relatedPlayerIds: string[];
  relatedTeamIds: string[];
}

function playerName(player: Pick<GeneratedPlayer, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`;
}

function contractTotalValue(player: GeneratedPlayer): number {
  return player.contract.totalValue ?? (player.contract.annualSalary * player.contract.years);
}

function isBlockbusterPlayer(player: GeneratedPlayer): boolean {
  return player.overallRating >= BLOCKBUSTER_TRADE_RATING_THRESHOLD
    || contractTotalValue(player) >= BLOCKBUSTER_TRADE_VALUE_THRESHOLD;
}

function isBlockbusterTrade(context: TradeDeadlinePressConferenceContext): boolean {
  return [...context.movedPlayers, ...context.acquiredPlayers].some(isBlockbusterPlayer);
}

function gmLead(personality: GMPersonality, posture: 'seller' | 'buyer'): string {
  switch (personality) {
    case 'aggressive':
      return posture === 'buyer'
        ? 'The buyer called it a needed strike.'
        : 'The seller said leverage was gone.';
    case 'conservative':
      return posture === 'buyer'
        ? 'The buyer said the price still fit the board.'
        : 'The seller called it a long-view reset.';
    case 'prospect_hugger':
      return posture === 'buyer'
        ? 'The buyer admitted the prospect cost hurt.'
        : 'The seller kept pointing to control years.';
    case 'win_now':
      return posture === 'buyer'
        ? 'The buyer said October urgency drove the call.'
        : 'The seller said the standings forced the pivot.';
    default:
      return posture === 'buyer'
        ? 'The buyer kept returning to value and the calendar.'
        : 'The seller called it a reset, not a retreat.';
  }
}

function primaryHeadlineName(context: TradeDeadlinePressConferenceContext): string {
  return context.movedPlayers[0]
    ? playerName(context.movedPlayers[0]!)
    : context.acquiredPlayers[0]
      ? playerName(context.acquiredPlayers[0]!)
      : 'The trade';
}

function topicIdForContext(
  context: TradeDeadlinePressConferenceContext,
  deadlineMode: boolean,
  blockbuster: boolean,
): TradeDeadlinePressConference['topicId'] {
  if (!blockbuster) {
    return 'routine_swap';
  }
  if (!deadlineMode) {
    return 'offseason_blockbuster';
  }
  if (SELL_SIGNAL_PERSONALITIES.includes(context.sellerGMPersonality)) {
    return 'deadline_sell_signal';
  }
  if (BUY_SIGNAL_PERSONALITIES.includes(context.buyerGMPersonality)) {
    return 'deadline_buy_signal';
  }
  return 'deadline_blockbuster';
}

export function generateTradeDeadlinePressConference(
  context: TradeDeadlinePressConferenceContext,
): TradeDeadlinePressConference {
  const deadlineMode = isTradeDeadlineModeDay(context.day);
  const blockbuster = isBlockbusterTrade(context);
  const topicId = topicIdForContext(context, deadlineMode, blockbuster);
  const starName = primaryHeadlineName(context);
  const acquiredSummary = context.acquiredPlayers.length > 0
    ? context.acquiredPlayers.map((player) => playerName(player)).join(', ')
    : 'future value';

  const headline = (() => {
    switch (topicId) {
      case 'deadline_blockbuster':
        return `${starName} turns the deadline loud for ${context.sellerTeamName} and ${context.buyerTeamName}`;
      case 'deadline_sell_signal':
        return `${context.sellerTeamName} explains the pivot after moving ${starName} at the deadline`;
      case 'deadline_buy_signal':
        return `${context.buyerTeamName} sells the urgency behind the ${starName} push`;
      case 'offseason_blockbuster':
        return `${starName} anchors an offseason blockbuster between ${context.sellerTeamName} and ${context.buyerTeamName}`;
      case 'routine_swap':
        return `${context.sellerTeamName} and ${context.buyerTeamName} frame a routine swap`;
    }
  })();

  const body = (() => {
    switch (topicId) {
      case 'deadline_blockbuster':
        return `${starName} changed clubs in the loudest move of the window. ${gmLead(context.sellerGMPersonality, 'seller')} ${gmLead(context.buyerGMPersonality, 'buyer')} Return: ${acquiredSummary}.`;
      case 'deadline_sell_signal':
        return `${context.sellerTeamName} said moving ${starName} was the price of flexibility. ${gmLead(context.sellerGMPersonality, 'seller')} Return: ${acquiredSummary}.`;
      case 'deadline_buy_signal':
        return `${context.buyerTeamName} said ${starName} was worth the push. ${gmLead(context.buyerGMPersonality, 'buyer')} ${context.sellerTeamName} took ${acquiredSummary}.`;
      case 'offseason_blockbuster':
        return `This was a winter power move around ${starName}. ${gmLead(context.sellerGMPersonality, 'seller')} ${gmLead(context.buyerGMPersonality, 'buyer')} Return: ${acquiredSummary}.`;
      case 'routine_swap':
        return `${context.sellerTeamName} and ${context.buyerTeamName} called it a fit trade. Return: ${acquiredSummary}.`;
    }
  })();

  return {
    id: `press-conference-trade-deadline-${context.tradeId}-${context.season}-${context.day}`,
    topicId,
    topicCategory: 'TRADE_DEADLINE',
    headline,
    body,
    priority: topicId === 'deadline_blockbuster' || topicId === 'deadline_buy_signal'
      ? 1
      : topicId === 'routine_swap'
        ? 3
        : 2,
  };
}

export function buildTradeBroadcastCoverage(
  context: TradeDeadlinePressConferenceContext,
): TradeBroadcastCoverage {
  const relatedPlayerIds = (context.movedPlayers.length > 0 ? context.movedPlayers : context.acquiredPlayers)
    .map((player) => player.id)
    .sort((left, right) => left.localeCompare(right));

  const hasBlockbusterPlayers = isBlockbusterTrade(context);

  return {
    moments: detectTradeMoments({
      season: context.season,
      day: context.day,
      movedPlayers: context.movedPlayers,
      acquiredPlayers: context.acquiredPlayers,
    }),
    identityMoments: detectDeadlineIdentityMoments({
      season: context.season,
      day: context.day,
      sellerTeamId: context.sellerTeamId,
      buyerTeamId: context.buyerTeamId,
      hasBlockbusterPlayers,
    }),
    pressConference: generateTradeDeadlinePressConference(context),
    relatedPlayerIds,
    relatedTeamIds: [context.sellerTeamId, context.buyerTeamId],
  };
}
