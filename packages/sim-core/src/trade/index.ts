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

export {
  MAX_NEGOTIATION_ROUNDS,
  PENDING_EXPIRE_DAYS,
  INSTANT_REJECT_THRESHOLD,
  COUNTER_RANGE_LOW,
  COUNTER_RANGE_HIGH,
  initiateNegotiation,
  advanceNegotiation,
  resolveNegotiation,
  generateNegotiationDialogue,
  calculateCounterOffer,
  isNegotiationComplete,
} from './tradeNegotiation.js';
export type {
  NegotiationProposal,
  NegotiationContext,
  NegotiationPhase,
  NegotiationDialogue,
  CounterOffer,
  CounterOfferResult,
  NegotiationState,
  NegotiationResponse,
  NegotiationOutcome,
} from './tradeNegotiation.js';
