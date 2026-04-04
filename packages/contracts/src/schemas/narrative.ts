import { z } from "zod";

export const NewsPriorityEnum = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
export type NewsPriority = z.infer<typeof NewsPriorityEnum>;

export const NewsTagEnum = z.enum([
  "BREAKING",
  "ANALYSIS",
  "RECAP",
  "RUMOR",
  "WATCH",
  "DEBATE",
]);
export type NewsTag = z.infer<typeof NewsTagEnum>;

export const NewsCategoryEnum = z.enum([
  "injury",
  "trade",
  "signing",
  "extension",
  "qualifying_offer",
  "coaching",
  "draft",
  "milestone",
  "performance",
  "standings",
  "roster_move",
  "development",
  "rumor",
  "rivalry",
  "award",
  "record",
  "playoff",
  "press_conference",
]);
export type NewsCategory = z.infer<typeof NewsCategoryEnum>;

export const NewsItemSchema = z.object({
  id: z.string(),
  headline: z.string().min(1),
  body: z.string(),
  priority: NewsPriorityEnum,
  category: NewsCategoryEnum,
  tag: NewsTagEnum.optional(),
  timestamp: z.string(),
  relatedPlayerIds: z.array(z.string()),
  relatedTeamIds: z.array(z.string()),
  read: z.boolean(),
});
export type NewsItem = z.infer<typeof NewsItemSchema>;

export const MomentTypeEnum = z.enum([
  "walk_off",
  "no_hitter",
  "perfect_game",
  "cycle",
  "milestone_hr",
  "milestone_hit",
  "milestone_k",
  "milestone_win",
  "streak",
  "record_broken",
  "debut",
  "retirement",
  "championship",
  "playoff_upset",
  "comeback",
]);
export type MomentType = z.infer<typeof MomentTypeEnum>;

export const MomentSchema = z.object({
  type: MomentTypeEnum,
  headline: z.string().min(1),
  description: z.string(),
  season: z.number().int().min(1),
  day: z.number().int().min(1),
  playerIds: z.array(z.string()),
  teamIds: z.array(z.string()),
  historical: z.boolean(),
});
export type Moment = z.infer<typeof MomentSchema>;

export const NarrativeTrendEnum = z.enum([
  "rising",
  "falling",
  "steady",
]);
export type NarrativeTrend = z.infer<typeof NarrativeTrendEnum>;

export const ChemistryTierEnum = z.enum([
  "fractured",
  "tense",
  "steady",
  "connected",
  "electric",
]);
export type ChemistryTier = z.infer<typeof ChemistryTierEnum>;

export const PlayerMoraleSchema = z.object({
  playerId: z.string(),
  score: z.number().min(0).max(100),
  trend: NarrativeTrendEnum,
  summary: z.string(),
  lastUpdated: z.string(),
});
export type PlayerMorale = z.infer<typeof PlayerMoraleSchema>;

export const TeamChemistrySchema = z.object({
  teamId: z.string(),
  score: z.number().min(0).max(100),
  tier: ChemistryTierEnum,
  trend: NarrativeTrendEnum,
  summary: z.string(),
  reasons: z.array(z.string()),
});
export type TeamChemistry = z.infer<typeof TeamChemistrySchema>;

export const OwnerExpectationsSchema = z.object({
  winsTarget: z.number().int().min(0),
  playoffTarget: z.boolean(),
  payrollTarget: z.number().min(0),
});
export type OwnerExpectations = z.infer<typeof OwnerExpectationsSchema>;

export const OwnerStateSchema = z.object({
  teamId: z.string(),
  archetype: z.enum(["win_now", "patient_builder", "penny_pincher"]),
  patience: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  hotSeat: z.boolean(),
  summary: z.string(),
  expectations: OwnerExpectationsSchema,
  spendingWillingness: z.enum(["cheap", "moderate", "lavish"]).optional(),
  winNowPressure: z.number().min(0).max(100).optional(),
  meddlingLevel: z.number().min(0).max(100).optional(),
  satisfaction: z.number().min(0).max(100).optional(),
  annualBudget: z.number().min(0).optional(),
  payrollCap: z.number().min(0).optional(),
  draftBonusPool: z.number().min(0).optional(),
  ifaBonusPool: z.number().min(0).optional(),
  staffBudget: z.number().min(0).optional(),
});
export type OwnerState = z.infer<typeof OwnerStateSchema>;

export const BriefingCategoryEnum = z.enum([
  "owner",
  "chemistry",
  "morale",
  "award",
  "rivalry",
  "breakout",
  "news",
  "extension",
  "qualifying_offer",
  "coaching",
  "development",
  "rumor",
]);
export type BriefingCategory = z.infer<typeof BriefingCategoryEnum>;

export const BriefingItemSchema = z.object({
  id: z.string(),
  priority: NewsPriorityEnum,
  category: BriefingCategoryEnum,
  tag: NewsTagEnum.optional(),
  headline: z.string().min(1),
  body: z.string(),
  relatedTeamIds: z.array(z.string()),
  relatedPlayerIds: z.array(z.string()),
  timestamp: z.string(),
  acknowledged: z.boolean(),
});
export type BriefingItem = z.infer<typeof BriefingItemSchema>;

export const TickerCategoryEnum = z.enum([
  "score",
  "trade",
  "injury",
  "milestone",
  "standings",
  "prospect",
  "rumor",
  "record",
]);
export type TickerCategory = z.infer<typeof TickerCategoryEnum>;

export const TickerEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  category: TickerCategoryEnum,
  text: z.string().min(1),
  priority: NewsPriorityEnum,
  relatedTeamIds: z.array(z.string()),
  relatedPlayerIds: z.array(z.string()),
  expiresDay: z.number().int().min(1),
});
export type TickerEntry = z.infer<typeof TickerEntrySchema>;

export const StoryArcPhaseEnum = z.enum([
  "setup",
  "rising",
  "climax",
  "resolution",
]);
export type StoryArcPhase = z.infer<typeof StoryArcPhaseEnum>;

export const PlayerStoryArcSchema = z.object({
  playerId: z.string(),
  arcType: z.string().min(1),
  startSeason: z.number().int().min(1),
  startDay: z.number().int().min(1),
  phase: StoryArcPhaseEnum,
  milestones: z.array(z.string()).default([]),
  resolvedSeason: z.number().int().min(1).nullable(),
});
export type PlayerStoryArc = z.infer<typeof PlayerStoryArcSchema>;

export const ProspectBondSchema = z.object({
  prospectId: z.string(),
  draftedSeason: z.number().int().min(1),
  debutSeason: z.number().int().min(1).nullable(),
  currentLevel: z.string().min(1),
  bondStrength: z.number().min(0).max(100),
  milestones: z.array(z.string()).default([]),
  loyaltyModifier: z.number().min(0).max(1),
});
export type ProspectBond = z.infer<typeof ProspectBondSchema>;

export const PlayerOriginAcquisitionTypeEnum = z.enum(["draft", "ifa"]);
export type PlayerOriginAcquisitionType = z.infer<typeof PlayerOriginAcquisitionTypeEnum>;

export const PlayerOriginSchema = z.object({
  playerId: z.string(),
  originTeamId: z.string(),
  acquisitionType: PlayerOriginAcquisitionTypeEnum,
  acquiredSeason: z.number().int().min(1),
  draftSeason: z.number().int().min(1).nullable(),
  draftRound: z.number().int().min(1).nullable(),
  draftPickNumber: z.number().int().min(1).nullable(),
  originalGrade: z.number().int().min(20).max(80).nullable(),
  bonusAmount: z.number().min(0).nullable(),
});
export type PlayerOrigin = z.infer<typeof PlayerOriginSchema>;

export const DebutFlashbackSchema = z.object({
  playerId: z.string(),
  playerName: z.string().min(1),
  draftSeason: z.number().int().min(1),
  draftRound: z.number().int().min(1),
  originalGrade: z.number().int().min(20).max(80),
  debutSeason: z.number().int().min(1),
  debutOverall: z.number().int().min(0).max(100),
  journeyHighlights: z.array(z.string()).default([]),
});
export type DebutFlashback = z.infer<typeof DebutFlashbackSchema>;

export const RivalrySchema = z.object({
  id: z.string(),
  teamA: z.string(),
  teamB: z.string(),
  intensity: z.number().min(0).max(100),
  summary: z.string(),
  reasons: z.array(z.string()),
  origin: z.enum(["historical", "division_race", "playoff", "trade", "defection"]).optional(),
  active: z.boolean().optional(),
  currentSeasonWinsA: z.number().int().min(0).optional(),
  currentSeasonWinsB: z.number().int().min(0).optional(),
  historicalWinsA: z.number().int().min(0).optional(),
  historicalWinsB: z.number().int().min(0).optional(),
  lastMetSeason: z.number().int().min(0).optional(),
  closeRaceStreak: z.number().int().min(0).optional(),
  playoffSeriesStreak: z.number().int().min(0).optional(),
  lastTradeSeason: z.number().int().min(0).optional(),
  lastDefectionSeason: z.number().int().min(0).optional(),
  eventHistory: z.array(z.object({
    season: z.number().int().min(1),
    type: z.enum(["historical", "division_race", "playoff", "trade", "defection", "series_result"]),
    summary: z.string(),
  })).optional(),
});
export type Rivalry = z.infer<typeof RivalrySchema>;

export const AwardLeagueEnum = z.enum(["AL", "NL", "MLB"]);
export type AwardLeague = z.infer<typeof AwardLeagueEnum>;

export const AwardHistoryEntrySchema = z.object({
  season: z.number().int().min(1),
  award: z.string(),
  league: AwardLeagueEnum,
  playerId: z.string(),
  teamId: z.string(),
  summary: z.string(),
});
export type AwardHistoryEntry = z.infer<typeof AwardHistoryEntrySchema>;

export const CareerBattingTotalsSchema = z.object({
  hits: z.number().int().min(0),
  hr: z.number().int().min(0),
  rbi: z.number().int().min(0),
});
export type CareerBattingTotals = z.infer<typeof CareerBattingTotalsSchema>;

export const CareerPitchingTotalsSchema = z.object({
  wins: z.number().int().min(0),
  strikeouts: z.number().int().min(0),
  inningsPitched: z.number().min(0),
  earnedRuns: z.number().int().min(0),
});
export type CareerPitchingTotals = z.infer<typeof CareerPitchingTotalsSchema>;

export const CareerStatsLedgerSchema = z.object({
  playerId: z.string(),
  playerName: z.string().min(1),
  position: z.string().min(1),
  seasonsPlayed: z.number().int().min(0),
  teamIds: z.array(z.string()),
  peakOverall: z.number().int().min(0).max(100),
  championshipRings: z.number().int().min(0),
  allStarSelections: z.number().int().min(0),
  gamesPlayed: z.number().int().min(0).optional(),
  saves: z.number().int().min(0).optional(),
  war: z.number().optional(),
  batting: CareerBattingTotalsSchema.nullable(),
  pitching: CareerPitchingTotalsSchema.nullable(),
});
export type CareerStatsLedger = z.infer<typeof CareerStatsLedgerSchema>;

export const HallOfFameEntrySchema = z.object({
  playerId: z.string(),
  playerName: z.string().min(1),
  position: z.string().min(1),
  careerStats: CareerStatsLedgerSchema,
  awards: z.array(z.string()),
  seasonsPlayed: z.number().int().min(0),
  teamIds: z.array(z.string()),
  inductionSeason: z.number().int().min(1),
  score: z.number().int().min(0),
  inductionType: z.enum(["first_ballot", "ballot"]),
  summary: z.string(),
});
export type HallOfFameEntry = z.infer<typeof HallOfFameEntrySchema>;

export const HallOfFameBallotEntrySchema = z.object({
  playerId: z.string(),
  playerName: z.string().min(1),
  position: z.string().min(1),
  careerStats: CareerStatsLedgerSchema,
  score: z.number().int().min(0),
  enteredBallotSeason: z.number().int().min(1),
  inductionSeason: z.number().int().min(1),
});
export type HallOfFameBallotEntry = z.infer<typeof HallOfFameBallotEntrySchema>;

export const FranchiseTimelineEntrySchema = z.object({
  season: z.number().int().min(1),
  teamId: z.string(),
  record: z.string().min(1),
  winTotal: z.number().int().min(0),
  playoffResult: z.string().min(1),
  championship: z.boolean(),
  worldSeriesAppearance: z.boolean(),
  playoffAppearance: z.boolean(),
  divisionTitle: z.boolean(),
  awardWinnerCount: z.number().int().min(0),
  keyAcquisitions: z.array(z.string()),
  keyDepartures: z.array(z.string()),
  dynastyScore: z.number().int(),
});
export type FranchiseTimelineEntry = z.infer<typeof FranchiseTimelineEntrySchema>;

export const SeasonStatLeaderSchema = z.object({
  playerId: z.string(),
  teamId: z.string(),
  value: z.string(),
  summary: z.string(),
});
export type SeasonStatLeader = z.infer<typeof SeasonStatLeaderSchema>;

export const SeasonStatLeadersSchema = z.object({
  hr: z.array(SeasonStatLeaderSchema),
  rbi: z.array(SeasonStatLeaderSchema),
  avg: z.array(SeasonStatLeaderSchema),
  era: z.array(SeasonStatLeaderSchema),
  k: z.array(SeasonStatLeaderSchema),
  w: z.array(SeasonStatLeaderSchema),
});
export type SeasonStatLeaders = z.infer<typeof SeasonStatLeadersSchema>;

export const RetirementSummarySchema = z.object({
  playerId: z.string(),
  teamId: z.string(),
  seasonsPlayed: z.number().int().min(0),
  overallRating: z.number().int().min(0).max(100),
  summary: z.string(),
});
export type RetirementSummary = z.infer<typeof RetirementSummarySchema>;

export const BlockbusterTradeSummarySchema = z.object({
  headline: z.string().min(1),
  summary: z.string(),
  playerIds: z.array(z.string()),
  teamIds: z.array(z.string()),
});
export type BlockbusterTradeSummary = z.infer<typeof BlockbusterTradeSummarySchema>;

export const RecordBookHolderSchema = z.object({
  playerId: z.string().nullable(),
  playerName: z.string().nullable(),
  teamId: z.string().nullable(),
  season: z.number().int().min(1).nullable(),
  value: z.number(),
  displayValue: z.string().min(1),
});
export type RecordBookHolder = z.infer<typeof RecordBookHolderSchema>;

export const RecordBookEntrySchema = z.object({
  id: z.string(),
  scope: z.enum(["franchise", "league"]),
  teamId: z.string().nullable(),
  category: z.enum(["team_single_season", "individual_single_season", "career", "streak"]),
  stat: z.string().min(1),
  label: z.string().min(1),
  qualifier: z.string().nullable().default(null),
  holders: z.array(RecordBookHolderSchema).default([]),
  trackingFromSeason: z.number().int().min(1).nullable().default(null),
  note: z.string().nullable().default(null),
});
export type RecordBookEntry = z.infer<typeof RecordBookEntrySchema>;

export const RecordWatchEntrySchema = z.object({
  id: z.string(),
  recordId: z.string(),
  playerId: z.string(),
  playerName: z.string().min(1),
  teamId: z.string(),
  recordLabel: z.string().min(1),
  currentValue: z.number(),
  projectedValue: z.number(),
  holderValue: z.number(),
  progressRatio: z.number().min(0).max(2),
  summary: z.string(),
});
export type RecordWatchEntry = z.infer<typeof RecordWatchEntrySchema>;

export const HistoricalPlayerSchema = z.object({
  playerId: z.string(),
  fullName: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  position: z.string().min(1),
  lastKnownTeamId: z.string(),
  active: z.boolean(),
  retiredSeason: z.number().int().min(1).nullable().default(null),
  seasonsPlayed: z.number().int().min(0).default(0),
  peakOverall: z.number().int().min(0).max(100).nullable().default(null),
  personalityTraits: z.array(z.string()).default([]),
});
export type HistoricalPlayer = z.infer<typeof HistoricalPlayerSchema>;

export const MentorRelationshipSchema = z.object({
  veteranPlayerId: z.string(),
  rookiePlayerId: z.string(),
  teamId: z.string(),
  startedSeason: z.number().int().min(1),
  summary: z.string(),
});
export type MentorRelationship = z.infer<typeof MentorRelationshipSchema>;

export const FrontOfficeStateSchema = z.object({
  teamId: z.string(),
  reputation: z.number().min(0).max(100),
  draftScore: z.number(),
  tradeScore: z.number(),
  freeAgencyScore: z.number(),
  playoffScore: z.number(),
  summary: z.string(),
});
export type FrontOfficeState = z.infer<typeof FrontOfficeStateSchema>;

export const WinLossRecordSchema = z.object({
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
});
export type WinLossRecord = z.infer<typeof WinLossRecordSchema>;

export const GMCareerEntrySchema = z.object({
  teamId: z.string(),
  seasons: z.number().int().min(0),
  record: WinLossRecordSchema,
  championships: z.number().int().min(0),
  hiredSeason: z.number().int().min(1),
  firedSeason: z.number().int().min(1).nullable(),
  firedReason: z.string().nullable(),
  reputation: z.number().min(0).max(100),
});
export type GMCareerEntry = z.infer<typeof GMCareerEntrySchema>;

export const GMCareerSchema = z.object({
  careerHistory: z.array(GMCareerEntrySchema).default([]),
  currentTeamId: z.string(),
  reputation: z.number().min(0).max(100),
  overallRecord: WinLossRecordSchema,
  championships: z.number().int().min(0),
  hiredSeason: z.number().int().min(1),
  firedSeasons: z.array(z.number().int().min(1)).default([]),
  careerAchievements: z.array(z.string()).default([]),
  jobSearchActive: z.boolean().default(false),
  lastFiredReason: z.string().nullable().default(null),
});
export type GMCareer = z.infer<typeof GMCareerSchema>;

export const JobOpeningSchema = z.object({
  teamId: z.string(),
  ownerArchetype: z.string().min(1),
  budget: z.string().min(1),
  expectations: z.string().min(1),
  difficulty: z.string().min(1),
  attractiveness: z.number(),
});
export type JobOpening = z.infer<typeof JobOpeningSchema>;

export const JobMarketSchema = z.object({
  availableJobs: z.array(JobOpeningSchema).default([]),
  applicationDeadlineSeason: z.number().int().min(1).nullable().default(null),
});
export type JobMarket = z.infer<typeof JobMarketSchema>;

export const ConsequenceWatcherTypeEnum = z.enum([
  "trade_aftermath",
  "prospect_risk",
  "contract_reaction",
  "fan_reaction",
]);
export type ConsequenceWatcherType = z.infer<typeof ConsequenceWatcherTypeEnum>;

export const ConsequenceWatcherSchema = z.object({
  id: z.string(),
  type: ConsequenceWatcherTypeEnum,
  createdSeason: z.number().int().min(1),
  createdDay: z.number().int().min(1),
  expiresSeason: z.number().int().min(1).default(1),
  expiresDay: z.number().int().min(1),
  context: z.record(z.string(), z.unknown()).default({}),
  resolved: z.boolean().default(false),
});
export type ConsequenceWatcher = z.infer<typeof ConsequenceWatcherSchema>;

export const FanSentimentTrendEnum = z.enum([
  "rising",
  "stable",
  "falling",
]);
export type FanSentimentTrend = z.infer<typeof FanSentimentTrendEnum>;

export const FanSentimentSchema = z.object({
  score: z.number().min(0).max(100),
  trend: FanSentimentTrendEnum.default("stable"),
  summary: z.string(),
  updatedAt: z.string(),
});
export type FanSentiment = z.infer<typeof FanSentimentSchema>;

export const ScoutOpinionSourceEnum = z.enum([
  "scout_director",
  "analytics_head",
  "manager",
]);
export type ScoutOpinionSource = z.infer<typeof ScoutOpinionSourceEnum>;

export const ScoutOpinionSchema = z.object({
  source: ScoutOpinionSourceEnum,
  overallGrade: z.number().int().min(20).max(80),
  ceiling: z.number().int().min(20).max(80),
  floor: z.number().int().min(20).max(80),
  summary: z.string().min(1),
  confidence: z.number().int().min(1).max(20),
});
export type ScoutOpinion = z.infer<typeof ScoutOpinionSchema>;

export const ScoutConflictSchema = z.object({
  prospectId: z.string(),
  teamId: z.string().nullable().default(null),
  prospectType: z.enum(["draft", "ifa"]),
  createdSeason: z.number().int().min(1),
  resolutionSeason: z.number().int().min(1),
  resolved: z.boolean().default(false),
  headline: z.string().min(1),
  opinions: z.array(ScoutOpinionSchema).length(3),
  divergence: z.number().int().min(0).default(0),
  debateGenerated: z.boolean().default(false),
  resolution: z.object({
    season: z.number().int().min(1),
    actualGrade: z.number().int().min(20).max(80),
    closestSource: ScoutOpinionSourceEnum,
  }).nullable().default(null),
  winningSource: ScoutOpinionSourceEnum.nullable().default(null),
  outcomeSummary: z.string().nullable().default(null),
});
export type ScoutConflict = z.infer<typeof ScoutConflictSchema>;

export const DynastyCardTypeEnum = z.enum([
  "championship_run",
  "draft_class",
  "trade_network",
  "farm_pipeline",
  "career_overview",
  "season_recap",
  "underdog_story",
  "scenario_complete",
]);
export type DynastyCardType = z.infer<typeof DynastyCardTypeEnum>;

export const DynastyCardStatSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});
export type DynastyCardStat = z.infer<typeof DynastyCardStatSchema>;

export const DynastyCardSchema = z.object({
  id: z.string(),
  type: DynastyCardTypeEnum,
  title: z.string().min(1),
  subtitle: z.string().min(1),
  stats: z.array(DynastyCardStatSchema).default([]),
  highlights: z.array(z.string()).default([]),
  generatedAt: z.string(),
  teamId: z.string().nullable().default(null),
  season: z.number().int().min(1).nullable().default(null),
  textSummary: z.string().min(1).default(""),
});
export type DynastyCard = z.infer<typeof DynastyCardSchema>;

export const ChallengeStateSchema = z.object({
  scenarioId: z.string(),
  startSeason: z.number().int().min(1),
  maxSeasons: z.number().int().min(1),
  progress: z.number().min(0).max(1),
  completed: z.boolean(),
  completedSeason: z.number().int().min(1).nullable().default(null),
  failed: z.boolean().default(false),
  summary: z.string().min(1),
});
export type ChallengeState = z.infer<typeof ChallengeStateSchema>;

export const SeasonArchiveStandingSchema = z.object({
  teamId: z.string(),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  divisionRank: z.number().int().min(1),
  gamesBack: z.number(),
});
export type SeasonArchiveStanding = z.infer<typeof SeasonArchiveStandingSchema>;

export const ArchivedSeasonStandingSchema = z.object({
  teamId: z.string(),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  divisionRank: z.number().int().min(1),
});
export type ArchivedSeasonStanding = z.infer<typeof ArchivedSeasonStandingSchema>;

export const SeasonArchivePlayoffSeriesSchema = z.object({
  round: z.string().min(1),
  winnerTeamId: z.string().nullable(),
  loserTeamId: z.string().nullable(),
  result: z.string().nullable(),
});
export type SeasonArchivePlayoffSeries = z.infer<typeof SeasonArchivePlayoffSeriesSchema>;

export const SeasonArchiveTransactionSchema = z.object({
  headline: z.string().min(1),
  summary: z.string(),
  playerIds: z.array(z.string()).default([]),
  teamIds: z.array(z.string()).default([]),
  impactScore: z.number().default(0),
});
export type SeasonArchiveTransaction = z.infer<typeof SeasonArchiveTransactionSchema>;

export const SeasonArchiveDraftPickSchema = z.object({
  pickNumber: z.number().int().min(1),
  playerId: z.string(),
  playerName: z.string().min(1),
  teamId: z.string(),
  currentStatus: z.string().min(1),
});
export type SeasonArchiveDraftPick = z.infer<typeof SeasonArchiveDraftPickSchema>;

export const SeasonArchiveFinancialSchema = z.object({
  teamId: z.string(),
  payroll: z.number().min(0),
  budget: z.number().min(0),
});
export type SeasonArchiveFinancial = z.infer<typeof SeasonArchiveFinancialSchema>;

export const SeasonArchiveEntrySchema = z.object({
  season: z.number().int().min(1),
  standings: z.array(SeasonArchiveStandingSchema).default([]),
  playoffSeries: z.array(SeasonArchivePlayoffSeriesSchema).default([]),
  awards: z.array(AwardHistoryEntrySchema).default([]),
  statLeaders: SeasonStatLeadersSchema,
  transactions: z.array(SeasonArchiveTransactionSchema).default([]),
  draftClass: z.array(SeasonArchiveDraftPickSchema).default([]),
  financials: z.array(SeasonArchiveFinancialSchema).default([]),
  userSummary: z.lazy(() => UserSeasonSummarySchema).nullable().default(null),
  timelineEvents: z.array(z.string()).default([]),
});
export type SeasonArchiveEntry = z.infer<typeof SeasonArchiveEntrySchema>;

export const UserSeasonSummarySchema = z.object({
  teamId: z.string(),
  record: z.string(),
  playoffResult: z.string(),
  storylines: z.array(z.string()),
});
export type UserSeasonSummary = z.infer<typeof UserSeasonSummarySchema>;

export const ArchivedSeasonSchema = z.object({
  season: z.number().int().min(1),
  standings: z.array(ArchivedSeasonStandingSchema).default([]),
  userRecord: WinLossRecordSchema.nullable().default(null),
  playoffResult: z.string().nullable().default(null),
  championshipWon: z.boolean().default(false),
  championTeamId: z.string().nullable().default(null),
  mvpName: z.string().nullable().default(null),
  cyYoungName: z.string().nullable().default(null),
  statLeaders: SeasonStatLeadersSchema,
  dynastyScore: z.number().nullable().default(null),
});
export type ArchivedSeason = z.infer<typeof ArchivedSeasonSchema>;

export const WhatIfBranchMetaSchema = z.object({
  id: z.string().min(1),
  saveId: z.string().min(1),
  branchedAtSeason: z.number().int().min(1),
  branchedAtDay: z.number().int().min(1),
  description: z.string().min(1),
  createdAt: z.string(),
});
export type WhatIfBranchMeta = z.infer<typeof WhatIfBranchMetaSchema>;

const TimelineRecordSummarySchema = z.object({
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  pct: z.number().min(0).max(1),
});

const TimelineStandingsSummarySchema = z.object({
  divisionRank: z.number().int().min(1),
  gamesBack: z.number().min(0),
});

const TimelineCountDeltaSchema = z.object({
  parent: z.number().int().min(0),
  branch: z.number().int().min(0),
  delta: z.number().int(),
});

export const TimelineComparisonSchema = z.object({
  branchMeta: WhatIfBranchMetaSchema,
  recordDelta: z.object({
    parent: TimelineRecordSummarySchema,
    branch: TimelineRecordSummarySchema,
    delta: z.number().int(),
  }),
  standingsDelta: z.object({
    parent: TimelineStandingsSummarySchema,
    branch: TimelineStandingsSummarySchema,
    delta: z.number().int(),
  }),
  rosterDelta: z.object({
    parent: z.array(z.string()),
    branch: z.array(z.string()),
    added: z.array(z.string()),
    lost: z.array(z.string()),
    delta: z.number().int(),
  }),
  championshipsDelta: TimelineCountDeltaSchema,
  tradesDelta: TimelineCountDeltaSchema,
});
export type TimelineComparison = z.infer<typeof TimelineComparisonSchema>;

export const SeasonHistoryEntrySchema = z.object({
  season: z.number().int().min(1),
  championTeamId: z.string().nullable(),
  runnerUpTeamId: z.string().nullable(),
  worldSeriesRecord: z.string().nullable(),
  summary: z.string(),
  awards: z.array(AwardHistoryEntrySchema),
  keyMoments: z.array(z.string()),
  statLeaders: SeasonStatLeadersSchema,
  notableRetirements: z.array(RetirementSummarySchema),
  blockbusterTrades: z.array(BlockbusterTradeSummarySchema),
  userSeason: UserSeasonSummarySchema.nullable(),
});
export type SeasonHistoryEntry = z.infer<typeof SeasonHistoryEntrySchema>;
