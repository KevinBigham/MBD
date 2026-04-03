/**
 * @module narrative
 * Barrel export for the narrative subsystem.
 */

export {
  // Functions
  generateNews,
  generateNewsId,
  checkMilestones,
  generateStandingsNews,
  getUnreadNews,
  markAsRead,
  deduplicateNews,
  generateSeasonRecap,
  generateRetirementNews,
} from './newsFeed.js';
export {
  buildTradeConsequenceBundle,
  buildSigningConsequenceBundle,
  buildPostseasonConsequenceBundle,
  buildRetirementConsequenceBundle,
  buildTradeAftermathChain,
  appendConsequenceWatchers,
  evaluateConsequenceWatchers,
  calculateRushingRisk,
  calculateFanSentiment,
} from './consequences.js';
export {
  generateTickerEntries,
  pruneTickerFeed,
} from './ticker.js';
export {
  detectNewStoryArcs,
  advanceStoryArcs,
} from './storyArcs.js';
export {
  detectBreakoutCountdowns,
  generateDebutFlashback,
  generatePressConference,
} from './farmNarratives.js';

export type {
  // Types
  NewsPriority,
  NewsTag,
  NewsCategory,
  NewsItem,
  MomentType,
  Moment,
  GameEvent,
} from './newsFeed.js';
export type {
  OwnerDecisionDelta,
  PlayerMoraleDelta,
  ConsequenceBundle,
  TradeConsequenceContext,
  SigningConsequenceContext,
  PostseasonConsequenceContext,
  RetirementConsequenceContext,
  UserPostseasonOutcome,
  TradeAftermathChainContext,
  EvaluateConsequenceWatchersContext,
  EvaluateConsequenceWatchersResult,
  RushingRisk,
  FanSentimentContext,
} from './consequences.js';
export type {
  TickerGenerationContext,
  TickerInjuryContext,
  TickerMilestoneContext,
  TickerProspectCallupContext,
  TickerRecordWatchContext,
  TickerRumorCandidate,
  TickerScoreContext,
  TickerStandingsChangeContext,
  TickerTradeContext,
} from './ticker.js';
export type {
  StoryArcSnapshot,
} from './storyArcs.js';
export type {
  BreakoutCountdown,
  BreakoutCountdownSnapshot,
  PressConferenceContext,
} from './farmNarratives.js';
