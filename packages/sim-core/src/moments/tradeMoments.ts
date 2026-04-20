import type { GeneratedPlayer } from '../player/generation.js';
import { isTradeDeadlineModeDay } from '../sim/calendar.js';
import type { Moment, MomentRound } from './momentDetector.js';

export const BLOCKBUSTER_TRADE_RATING_THRESHOLD = 280;
export const BLOCKBUSTER_TRADE_VALUE_THRESHOLD = 60;
export const BLOCKBUSTER_TRADE_MOVED_IMPACT = -24;
export const BLOCKBUSTER_TRADE_ACQUIRED_IMPACT = 26;
export const DEADLINE_SELLER_IMPACT = 18;
export const DEADLINE_BUYER_IMPACT = 24;

export interface TradeMomentDetectionContext {
  season: number;
  day: number;
  movedPlayers: readonly GeneratedPlayer[];
  acquiredPlayers: readonly GeneratedPlayer[];
}

export interface TradeDetectedMoment {
  playerId: string;
  moment: Moment & {
    day: number;
    timestamp: string;
  };
}

export interface DeadlineIdentityMomentDetectionContext {
  season: number;
  day: number;
  sellerTeamId: string;
  buyerTeamId: string;
  hasBlockbusterPlayers: boolean;
}

export interface DeadlineIdentityDetectedMoment {
  teamId: string;
  moment: Moment & {
    day: number;
    timestamp: string;
  };
}

function playerName(player: Pick<GeneratedPlayer, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`;
}

function createMoment(
  type: Moment['type'],
  description: string,
  impact: number,
  season: number,
  day: number,
): TradeDetectedMoment['moment'] {
  return {
    season,
    day,
    timestamp: `S${season}D${day}`,
    type,
    description,
    impact,
    relevance: Math.abs(impact),
    isPlayoff: false,
    isEliminationGame: false,
    worldSeriesClincher: false,
    round: null as MomentRound | null,
  };
}

function contractTotalValue(player: GeneratedPlayer): number {
  return player.contract.totalValue ?? (player.contract.annualSalary * player.contract.years);
}

function isBlockbusterPlayer(player: GeneratedPlayer): boolean {
  return player.overallRating >= BLOCKBUSTER_TRADE_RATING_THRESHOLD
    || contractTotalValue(player) >= BLOCKBUSTER_TRADE_VALUE_THRESHOLD;
}

export function detectTradeMoments(
  context: TradeMomentDetectionContext,
): TradeDetectedMoment[] {
  const movedMoments = context.movedPlayers
    .filter(isBlockbusterPlayer)
    .map((player) => ({
      playerId: player.id,
      moment: createMoment(
        'blockbuster_trade_moved',
        `${playerName(player)} was moved in a blockbuster that changed the market's tone.`,
        BLOCKBUSTER_TRADE_MOVED_IMPACT,
        context.season,
        context.day,
      ),
    }));
  const acquiredMoments = context.acquiredPlayers
    .filter(isBlockbusterPlayer)
    .map((player) => ({
      playerId: player.id,
      moment: createMoment(
        'blockbuster_trade_acquired',
        `${playerName(player)} arrived as part of a blockbuster return that reset the club's direction.`,
        BLOCKBUSTER_TRADE_ACQUIRED_IMPACT,
        context.season,
        context.day,
      ),
    }));

  return [...movedMoments, ...acquiredMoments].sort((left, right) =>
    left.playerId.localeCompare(right.playerId)
    || left.moment.type.localeCompare(right.moment.type),
  );
}

export function detectDeadlineIdentityMoments(
  context: DeadlineIdentityMomentDetectionContext,
): DeadlineIdentityDetectedMoment[] {
  if (!context.hasBlockbusterPlayers || !isTradeDeadlineModeDay(context.day)) {
    return [];
  }

  return [
    {
      teamId: context.sellerTeamId,
      moment: createMoment(
        'deadline_seller',
        'The front office chose a deadline sell path and made the pivot public.',
        DEADLINE_SELLER_IMPACT,
        context.season,
        context.day,
      ),
    },
    {
      teamId: context.buyerTeamId,
      moment: createMoment(
        'deadline_buyer',
        'The front office pushed chips into the middle at the deadline.',
        DEADLINE_BUYER_IMPACT,
        context.season,
        context.day,
      ),
    },
  ].sort((left, right) =>
    left.teamId.localeCompare(right.teamId)
    || left.moment.type.localeCompare(right.moment.type),
  );
}
