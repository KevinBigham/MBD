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
  generatePlayByPlay,
  generateGameHighlights,
  generateGameRecap,
} from './playByPlay.js';
export {
  generateDraftCommentary,
  generateDraftBuzz,
  generateDraftPickPreview,
  generateDraftGrades,
} from './draft.js';
export {
  deriveTradeDeadlineMode,
  generateTradeDialogue,
  generateTradeChatter,
} from './tradeTheatre.js';
export {
  detectNewStoryArcs,
  advanceStoryArcs,
} from './storyArcs.js';
export {
  detectBreakoutCountdowns,
  generateDebutFlashback,
  generatePressConference,
  generateInteractivePressConference,
} from './farmNarratives.js';
export {
  generateOffseasonHeadline,
  generateSeasonRecapNarrative,
} from './offseasonRecap.js';

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
  GameHighlight,
} from './playByPlay.js';
export type {
  DraftNarrativeTone,
  DraftNarrativeProspect,
  DraftNarrativePick,
  DraftNarrativeCurrentPick,
  DraftCommentaryEntry,
  DraftBuzzItem,
  DraftPickPreview,
  DraftTeamGrade,
} from './draft.js';
export type {
  TradeDeadlineMode,
  TradeNegotiationType,
  TradeDialogue,
  TradeChatterItem,
} from './tradeTheatre.js';
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
  PressConferenceResponse,
  InteractivePressConference,
} from './farmNarratives.js';
