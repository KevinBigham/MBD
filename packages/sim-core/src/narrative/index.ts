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
  SITUATION_CONTEXTS,
  generateEnhancedPlayByPlay,
} from './playByPlayEnhanced.js';
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
  evaluatePressConferenceResponse,
  generateEnhancedPressConference,
  selectPressConferenceTopic,
} from './pressConferences.js';
export {
  generateArbitrationPressConference,
} from './arbitrationPressConferences.js';
export {
  generateHoldoutBriefing,
} from './holdoutCoverage.js';
export {
  generateOffseasonHeadline,
  generateSeasonRecapNarrative,
} from './offseasonRecap.js';
export {
  EVENTS_PER_MONTH_MIN,
  EVENTS_PER_MONTH_MAX,
  EVENT_WEIGHTS,
  generateMonthlyLeagueEvents,
  evaluateEventRippleEffects,
  generateLeagueEventNarrative,
} from './leagueEvents.js';

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
  EnhancedPlayByPlayEntry,
  PlayByPlayContext,
} from './playByPlayEnhanced.js';
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
export type {
  PressConferenceResponseTone,
  PressConferenceSeasonRange,
  PressConferenceTopicCategory,
  PressConferenceTopicContext,
  EnhancedPressConferenceResponse,
  PressConferenceTopic,
  EnhancedPressConference,
  PressConferenceOutcome,
} from './pressConferences.js';
export type {
  ArbitrationPressConferenceContext,
  ArbitrationPressConference,
} from './arbitrationPressConferences.js';
export type {
  HoldoutCoverageContext,
  HoldoutBriefing,
} from './holdoutCoverage.js';
export type {
  LeagueEventType,
  LeagueEventTeamSnapshot,
  LeagueEventContext,
  TradeMarketShiftEffectData,
  ProspectMarketShiftEffectData,
  GMResetEffectData,
  SellerSignalEffectData,
  BudgetShiftEffectData,
  RevenueShiftEffectData,
  InternationalMarketShiftEffectData,
  DraftPickPenaltyEffectData,
  ExpansionUncertaintyEffectData,
  LeagueEventEffectData,
  LeagueEvent,
  TradeMarketShiftRippleEffect,
  ProspectMarketShiftRippleEffect,
  GMResetRippleEffect,
  SellerSignalRippleEffect,
  BudgetShiftRippleEffect,
  DraftPickPenaltyRippleEffect,
  InternationalMarketShiftRippleEffect,
  RevenueShiftRippleEffect,
  ExpansionUncertaintyRippleEffect,
  RippleEffect,
} from './leagueEvents.js';
