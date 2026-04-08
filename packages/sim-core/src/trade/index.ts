/**
 * @module trade
 * Barrel export for the trade system: valuation + AI trade behavior.
 */

export {
  evaluatePlayerTradeValue,
  comparePackages,
  type PlayerTradeValue,
  type PackageComparison,
} from './valuation.js';

export {
  assignGMPersonality,
  evaluateTradeProposal,
  generateAITradeOffers,
  executeTrade,
  generateTradeId,
  type GMPersonality,
  type TradeStatus,
  type TradeProposal,
  type TradeResult,
} from './tradeAI.js';

export {
  generateDeadlineTimeline,
  getDeadlineEventsForDay,
  generateBiddingWar,
  resolveDeadlineBuzzerBeater,
  type DeadlineEventType,
  type DeadlineEvent,
  type DeadlineContext,
  type BiddingRound,
  type BiddingWar,
  type BuzzerBeaterResult,
} from './deadlineDrama.js';
