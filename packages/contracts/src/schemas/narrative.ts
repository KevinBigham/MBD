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

export const RivalrySchema = z.object({
  id: z.string(),
  teamA: z.string(),
  teamB: z.string(),
  intensity: z.number().min(0).max(100),
  summary: z.string(),
  reasons: z.array(z.string()),
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

export const UserSeasonSummarySchema = z.object({
  teamId: z.string(),
  record: z.string(),
  playoffResult: z.string(),
  storylines: z.array(z.string()),
});
export type UserSeasonSummary = z.infer<typeof UserSeasonSummarySchema>;

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
