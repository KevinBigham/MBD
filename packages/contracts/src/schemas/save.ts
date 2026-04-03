import { z } from "zod";
import {
  ContractSchema,
  DevelopmentProgramEnum,
  DevelopmentTrajectoryEnum,
  HitterAttributesSchema,
  MinorLeagueLevelEnum,
  PersonalitySchema,
  PersonalityTraitSchema,
  PitcherAttributesSchema,
  PositionEnum,
  RosterStatusEnum,
  DevelopmentPhaseEnum,
  ExtensionHistoryEntrySchema,
} from "./player.js";
import {
  AwardHistoryEntrySchema,
  BriefingItemSchema,
  CareerStatsLedgerSchema,
  FrontOfficeStateSchema,
  FranchiseTimelineEntrySchema,
  HallOfFameBallotEntrySchema,
  HallOfFameEntrySchema,
  HistoricalPlayerSchema,
  MentorRelationshipSchema,
  NewsItemSchema,
  OwnerStateSchema,
  PlayerMoraleSchema,
  RecordBookEntrySchema,
  RecordWatchEntrySchema,
  RivalrySchema,
  SeasonArchiveEntrySchema,
  TeamChemistrySchema,
  SeasonHistoryEntrySchema,
  type NewsTag,
} from "./narrative.js";
import { MonthlyPulseStateSchema } from "./monthlyPulse.js";
import { TradeStateSchema } from "./trade.js";
import {
  AchievementStateSchema,
  CeremonyStateSchema,
  FranchiseStateSchema,
} from "./franchise.js";
import {
  DraftCompensatoryPickSchema,
  DraftPickOwnershipSchema,
  DraftScoutingReportSchema,
  DraftSigningDecisionSchema,
  DraftSignabilitySchema,
  QualifyingOfferRecordSchema,
} from "./draft.js";
import {
  AffiliateBoxScoreSchema,
  AffiliateStateSchema,
  MinorLeagueStateSchema,
  WaiverClaimSchema,
} from "./minors.js";
import { CoachSchema } from "./staff.js";

export const SaveMetaSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  season: z.number().int(),
  teamName: z.string(),
  version: z.number().int().min(1),
});
export type SaveMeta = z.infer<typeof SaveMetaSchema>;

export const SaveSlotSchema = z.object({
  slotNumber: z.number().int().min(1).max(10),
  meta: SaveMetaSchema.optional(),
  isEmpty: z.boolean(),
});
export type SaveSlot = z.infer<typeof SaveSlotSchema>;

const DISPLAY_GRADE_MIN = 20;
const DISPLAY_GRADE_MAX = 80;

export const GameRNGStateSchema = z.object({
  seed: z.number().int(),
  callCount: z.number().int().min(0),
});
export type GameRNGState = z.infer<typeof GameRNGStateSchema>;

export const SimPhaseEnum = z.enum([
  "preseason",
  "regular",
  "playoffs",
  "offseason",
]);
export type SimPhase = z.infer<typeof SimPhaseEnum>;

const LegacySnapshotPlayerSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  age: z.number().int().min(16).max(50),
  position: PositionEnum,
  hitterAttributes: HitterAttributesSchema,
  pitcherAttributes: PitcherAttributesSchema.nullable(),
  personality: PersonalitySchema,
  contract: ContractSchema,
  rosterStatus: RosterStatusEnum,
  developmentPhase: DevelopmentPhaseEnum,
  teamId: z.string(),
  nationality: z.enum(["american", "latin", "asian"]),
  overallRating: z.number().int().min(0).max(550),
});
const SnapshotPlayerV6Schema = LegacySnapshotPlayerSchema.extend({
  rule5EligibleAfterSeason: z.number().int().min(1),
});
export const SnapshotPlayerV7Schema = SnapshotPlayerV6Schema.extend({
  serviceTimeDays: z.number().int().min(0),
  optionYearsUsed: z.number().int().min(0),
  isOutOfOptions: z.boolean(),
  minorLeagueLevel: MinorLeagueLevelEnum.nullable(),
});
export const SnapshotPlayerSchema = SnapshotPlayerV7Schema.extend({
  ceiling: z.number().int().min(0).max(550).optional(),
  floor: z.number().int().min(0).max(550).optional(),
  developmentProgram: DevelopmentProgramEnum.optional(),
  developmentTrajectory: DevelopmentTrajectoryEnum.optional(),
  extensionHistory: z.array(ExtensionHistoryEntrySchema).optional(),
  personalityTraits: z.array(PersonalityTraitSchema).default([]),
});
export type SnapshotPlayer = z.infer<typeof SnapshotPlayerSchema>;

export const ScheduledGameSchema = z.object({
  day: z.number().int().min(1),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
});
export type ScheduledGame = z.infer<typeof ScheduledGameSchema>;

export const StandingsRecordSchema = z.object({
  teamId: z.string(),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  runsScored: z.number().int(),
  runsAllowed: z.number().int(),
  streak: z.number().int(),
  last10: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  divisionWins: z.number().int().min(0),
  divisionLosses: z.number().int().min(0),
});
export type StandingsRecord = z.infer<typeof StandingsRecordSchema>;

export const PlayerStatEntrySchema = z.tuple([
  z.string(),
  z.object({
    gamesPlayed: z.number().int().min(0).default(0),
    pa: z.number().int().min(0),
    ab: z.number().int().min(0),
    hits: z.number().int().min(0),
    doubles: z.number().int().min(0),
    triples: z.number().int().min(0),
    hr: z.number().int().min(0),
    rbi: z.number().int().min(0),
    bb: z.number().int().min(0),
    k: z.number().int().min(0),
    runs: z.number().int().min(0),
    hbp: z.number().int().min(0),
    sacFlies: z.number().int().min(0),
    ip: z.number().int().min(0),
    earnedRuns: z.number().int().min(0),
    strikeouts: z.number().int().min(0),
    walks: z.number().int().min(0),
    hitsAllowed: z.number().int().min(0),
    homeRunsAllowed: z.number().int().min(0),
    hitBatters: z.number().int().min(0),
    flyBallsAllowed: z.number().int().min(0),
    wins: z.number().int().min(0),
    saves: z.number().int().min(0).default(0),
    losses: z.number().int().min(0),
  }),
]);
export type PlayerStatEntry = z.infer<typeof PlayerStatEntrySchema>;

const PlayerStatEntryV8Schema = z.tuple([
  z.string(),
  z.object({
    pa: z.number().int().min(0),
    ab: z.number().int().min(0),
    hits: z.number().int().min(0),
    doubles: z.number().int().min(0),
    triples: z.number().int().min(0),
    hr: z.number().int().min(0),
    rbi: z.number().int().min(0),
    bb: z.number().int().min(0),
    k: z.number().int().min(0),
    runs: z.number().int().min(0),
    ip: z.number().int().min(0),
    earnedRuns: z.number().int().min(0),
    strikeouts: z.number().int().min(0),
    walks: z.number().int().min(0),
    hitsAllowed: z.number().int().min(0),
    wins: z.number().int().min(0),
    losses: z.number().int().min(0),
  }),
]);

const LegacyPlayerStatEntrySchema = z.tuple([
  z.string(),
  z.object({
    pa: z.number().int().min(0),
    ab: z.number().int().min(0),
    hits: z.number().int().min(0),
    doubles: z.number().int().min(0),
    triples: z.number().int().min(0),
    hr: z.number().int().min(0),
    rbi: z.number().int().min(0),
    bb: z.number().int().min(0),
    k: z.number().int().min(0),
    runs: z.number().int().min(0),
    ip: z.number().int().min(0),
    earnedRuns: z.number().int().min(0),
    strikeouts: z.number().int().min(0),
    walks: z.number().int().min(0),
    hitsAllowed: z.number().int().min(0),
  }),
]);

export const SerializedSeasonStateSchema = z.object({
  season: z.number().int().min(1),
  currentDay: z.number().int().min(1),
  standings: z.array(StandingsRecordSchema),
  playerSeasonStats: z.array(PlayerStatEntrySchema),
  gameLog: z.array(z.unknown()),
  completed: z.boolean(),
});
export type SerializedSeasonState = z.infer<typeof SerializedSeasonStateSchema>;

const SerializedSeasonStateV8Schema = z.object({
  season: z.number().int().min(1),
  currentDay: z.number().int().min(1),
  standings: z.array(StandingsRecordSchema),
  playerSeasonStats: z.array(PlayerStatEntryV8Schema),
  gameLog: z.array(z.unknown()),
  completed: z.boolean(),
});

const LegacySerializedSeasonStateSchema = z.object({
  season: z.number().int().min(1),
  currentDay: z.number().int().min(1),
  standings: z.array(StandingsRecordSchema),
  playerSeasonStats: z.array(LegacyPlayerStatEntrySchema),
  gameLog: z.array(z.unknown()),
  completed: z.boolean(),
});

const InjuryEntrySchema = z.tuple([z.string(), z.unknown()]);
const ServiceTimeEntrySchema = z.tuple([z.string(), z.number().int().min(0)]);
const ScoutStaffEntrySchema = z.tuple([z.string(), z.array(z.unknown())]);
const CoachingStaffEntrySchema = z.tuple([z.string(), z.array(CoachSchema)]);
const GMPersonalityEntrySchema = z.tuple([z.string(), z.string()]);
const RosterStateEntrySchema = z.tuple([z.string(), z.unknown()]);
const StoryFlagEntrySchema = z.tuple([z.string(), z.array(z.string())]);
const PlayerMoraleEntrySchema = z.tuple([z.string(), PlayerMoraleSchema]);
const TeamChemistryEntrySchema = z.tuple([z.string(), TeamChemistrySchema]);
const OwnerStateEntrySchema = z.tuple([z.string(), OwnerStateSchema]);
const RivalryEntrySchema = z.tuple([z.string(), RivalrySchema]);

export const NarrativeSnapshotSchema = z.object({
  playerMorale: z.array(PlayerMoraleEntrySchema),
  teamChemistry: z.array(TeamChemistryEntrySchema),
  ownerState: z.array(OwnerStateEntrySchema),
  briefingQueue: z.array(BriefingItemSchema),
  storyFlags: z.array(StoryFlagEntrySchema),
  rivalries: z.array(RivalryEntrySchema),
  awardHistory: z.array(AwardHistoryEntrySchema),
  hallOfFame: z.array(HallOfFameEntrySchema),
  hallOfFameBallot: z.array(HallOfFameBallotEntrySchema),
  franchiseTimeline: z.array(FranchiseTimelineEntrySchema),
  careerStats: z.array(CareerStatsLedgerSchema),
  recordBook: z.array(RecordBookEntrySchema).default([]),
  recordWatch: z.array(RecordWatchEntrySchema).default([]),
  seasonArchive: z.array(SeasonArchiveEntrySchema).default([]),
  historicalPlayers: z.array(HistoricalPlayerSchema).default([]),
  mentorRelationships: z.array(MentorRelationshipSchema).default([]),
  frontOfficeState: z.array(z.tuple([z.string(), FrontOfficeStateSchema])).default([]),
  seasonHistory: z.array(SeasonHistoryEntrySchema),
});
export type NarrativeSnapshot = z.infer<typeof NarrativeSnapshotSchema>;

const LegacyAwardHistoryEntrySchema = z.object({
  season: z.number().int().min(1),
  award: z.string(),
  playerId: z.string(),
  teamId: z.string(),
  summary: z.string(),
});

const LegacySeasonHistoryEntrySchema = z.object({
  season: z.number().int().min(1),
  championTeamId: z.string().nullable(),
  summary: z.string(),
  awards: z.array(LegacyAwardHistoryEntrySchema),
  keyMoments: z.array(z.string()),
});

const LegacyNarrativeSnapshotSchema = z.object({
  playerMorale: z.array(PlayerMoraleEntrySchema),
  teamChemistry: z.array(TeamChemistryEntrySchema),
  ownerState: z.array(OwnerStateEntrySchema),
  briefingQueue: z.array(BriefingItemSchema),
  storyFlags: z.array(StoryFlagEntrySchema),
  rivalries: z.array(RivalryEntrySchema),
  awardHistory: z.array(LegacyAwardHistoryEntrySchema),
  seasonHistory: z.array(LegacySeasonHistoryEntrySchema),
});

const NarrativeSnapshotV4Schema = z.object({
  playerMorale: z.array(PlayerMoraleEntrySchema),
  teamChemistry: z.array(TeamChemistryEntrySchema),
  ownerState: z.array(OwnerStateEntrySchema),
  briefingQueue: z.array(BriefingItemSchema),
  storyFlags: z.array(StoryFlagEntrySchema),
  rivalries: z.array(RivalryEntrySchema),
  awardHistory: z.array(AwardHistoryEntrySchema),
  seasonHistory: z.array(SeasonHistoryEntrySchema),
});

export const InternationalBonusPoolSchema = z.object({
  baseAllocation: z.number().min(0),
  tradedIn: z.number(),
  tradedOut: z.number(),
  committed: z.number().min(0),
});
export type InternationalBonusPool = z.infer<typeof InternationalBonusPoolSchema>;

export const InternationalRegionEnum = z.enum([
  "latin_america",
  "caribbean",
  "asia",
]);
export type InternationalRegion = z.infer<typeof InternationalRegionEnum>;

export const InternationalNationalityEnum = z.enum(["latin", "asian"]);
export type InternationalNationality = z.infer<typeof InternationalNationalityEnum>;

export const IFAProspectStatusEnum = z.enum(["available", "signed"]);
export type IFAProspectStatus = z.infer<typeof IFAProspectStatusEnum>;

export const InternationalProspectSchema = z.object({
  id: z.string(),
  season: z.number().int().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  age: z.number().int().min(16).max(22),
  position: PositionEnum,
  hitterAttributes: HitterAttributesSchema,
  pitcherAttributes: PitcherAttributesSchema.nullable(),
  personality: PersonalitySchema,
  nationality: InternationalNationalityEnum,
  region: InternationalRegionEnum,
  country: z.string().min(1),
  overallRating: z.number().int().min(0).max(550),
  potentialRating: z.number().int().min(0).max(550),
  expectedBonus: z.number().min(0),
  status: IFAProspectStatusEnum,
  signedTeamId: z.string().nullable(),
  signedBonus: z.number().min(0).nullable(),
});
export type InternationalProspect = z.infer<typeof InternationalProspectSchema>;

export const InternationalScoutingReportSchema = z.object({
  playerId: z.string(),
  looks: z.number().int().min(1),
  accuracy: z.number().min(0.5).max(0.95),
  observedRatings: z.record(z.string(), z.number().int().min(DISPLAY_GRADE_MIN).max(DISPLAY_GRADE_MAX)),
  overallGrade: z.number().int().min(DISPLAY_GRADE_MIN).max(DISPLAY_GRADE_MAX),
  confidence: z.number().int().min(1).max(20),
  ceiling: z.number().int().min(DISPLAY_GRADE_MIN).max(DISPLAY_GRADE_MAX),
  floor: z.number().int().min(DISPLAY_GRADE_MIN).max(DISPLAY_GRADE_MAX),
  notes: z.string(),
  reliability: z.number().min(0.5).max(0.95),
});
export type InternationalScoutingReport = z.infer<typeof InternationalScoutingReportSchema>;

export const IFAScoutingHistoryEntrySchema = z.object({
  playerId: z.string(),
  looks: z.number().int().min(1),
  report: InternationalScoutingReportSchema,
});
export type IFAScoutingHistoryEntry = z.infer<typeof IFAScoutingHistoryEntrySchema>;

export const InternationalScoutingStateSchema = z.object({
  season: z.number().int().min(1),
  ifaPool: z.array(InternationalProspectSchema),
  budgets: z.array(z.tuple([z.string(), InternationalBonusPoolSchema])),
  scoutingHistory: z.array(z.tuple([z.string(), z.array(IFAScoutingHistoryEntrySchema)])),
});
export type InternationalScoutingState = z.infer<typeof InternationalScoutingStateSchema>;

export const DraftStateSchema = z.object({
  scoutingReports: z.array(z.tuple([z.string(), z.array(DraftScoutingReportSchema)])),
  signability: z.array(z.tuple([z.string(), DraftSignabilitySchema])),
  qualifyingOffers: z.array(QualifyingOfferRecordSchema),
  compensatoryPicks: z.array(DraftCompensatoryPickSchema),
  pickOwnership: z.array(DraftPickOwnershipSchema),
  bigBoards: z.array(z.tuple([z.string(), z.array(z.string())])),
  signingDecisions: z.array(DraftSigningDecisionSchema),
});
export type DraftState = z.infer<typeof DraftStateSchema>;

export type MinorLeagueState = z.infer<typeof MinorLeagueStateSchema>;

const MinorLeagueStateV7Schema = z.object({
  serviceTimeLedger: z.array(z.tuple([z.string(), z.number().int().min(0)])),
  optionUsage: z.array(z.tuple([z.string(), z.array(z.number().int().min(0))])),
  waiverClaims: z.array(WaiverClaimSchema),
  affiliateStates: z.array(AffiliateStateSchema),
  affiliateBoxScores: z.array(AffiliateBoxScoreSchema),
});

export const CURRENT_GAME_SNAPSHOT_VERSION = 12;

const Rule5SessionSchema = z.unknown().nullable();
const Rule5StateEntrySchema = z.unknown();

export const GameSnapshotSchema = z.object({
  schemaVersion: z.literal(CURRENT_GAME_SNAPSHOT_VERSION),
  rng: GameRNGStateSchema,
  season: z.number().int().min(1),
  day: z.number().int().min(1),
  phase: SimPhaseEnum,
  userTeamId: z.string(),
  players: z.array(SnapshotPlayerSchema),
  schedule: z.array(ScheduledGameSchema),
  seasonState: SerializedSeasonStateSchema,
  playoffBracket: z.unknown().nullable(),
  injuries: z.array(InjuryEntrySchema),
  serviceTime: z.array(ServiceTimeEntrySchema),
  scoutingStaffs: z.array(ScoutStaffEntrySchema),
  gmPersonalities: z.array(GMPersonalityEntrySchema),
  offseasonState: z.unknown().nullable(),
  draftClass: z.unknown().nullable(),
  freeAgencyMarket: z.unknown().nullable(),
  news: z.array(NewsItemSchema),
  rosterStates: z.array(RosterStateEntrySchema),
  coachingStaffs: z.array(CoachingStaffEntrySchema),
  coachFreeAgentPool: z.array(CoachSchema),
  narrative: NarrativeSnapshotSchema,
  monthlyPulse: MonthlyPulseStateSchema,
  tradeState: TradeStateSchema,
  franchise: FranchiseStateSchema,
  ceremony: CeremonyStateSchema,
  achievements: AchievementStateSchema,
  internationalScoutingState: InternationalScoutingStateSchema,
  draftState: DraftStateSchema,
  minorLeagueState: MinorLeagueStateSchema,
  rule5Session: Rule5SessionSchema,
  rule5Obligations: z.array(Rule5StateEntrySchema),
  rule5OfferBackStates: z.array(Rule5StateEntrySchema),
});
export type GameSnapshot = z.infer<typeof GameSnapshotSchema>;

export const GameSnapshotV11Schema = GameSnapshotSchema.extend({
  schemaVersion: z.literal(11),
});
export type GameSnapshotV11 = z.infer<typeof GameSnapshotV11Schema>;

export const GameSnapshotV10Schema = z.object({
  schemaVersion: z.literal(10),
  rng: GameRNGStateSchema,
  season: z.number().int().min(1),
  day: z.number().int().min(1),
  phase: SimPhaseEnum,
  userTeamId: z.string(),
  players: z.array(SnapshotPlayerSchema),
  schedule: z.array(ScheduledGameSchema),
  seasonState: SerializedSeasonStateSchema,
  playoffBracket: z.unknown().nullable(),
  injuries: z.array(InjuryEntrySchema),
  serviceTime: z.array(ServiceTimeEntrySchema),
  scoutingStaffs: z.array(ScoutStaffEntrySchema),
  gmPersonalities: z.array(GMPersonalityEntrySchema),
  offseasonState: z.unknown().nullable(),
  draftClass: z.unknown().nullable(),
  freeAgencyMarket: z.unknown().nullable(),
  news: z.array(NewsItemSchema),
  rosterStates: z.array(RosterStateEntrySchema),
  coachingStaffs: z.array(CoachingStaffEntrySchema),
  coachFreeAgentPool: z.array(CoachSchema),
  narrative: NarrativeSnapshotSchema,
  monthlyPulse: MonthlyPulseStateSchema,
  tradeState: TradeStateSchema,
  internationalScoutingState: InternationalScoutingStateSchema,
  draftState: DraftStateSchema,
  minorLeagueState: MinorLeagueStateSchema,
  rule5Session: Rule5SessionSchema,
  rule5Obligations: z.array(Rule5StateEntrySchema),
  rule5OfferBackStates: z.array(Rule5StateEntrySchema),
});
export type GameSnapshotV10 = z.infer<typeof GameSnapshotV10Schema>;

export const GameSnapshotV9Schema = z.object({
  schemaVersion: z.literal(9),
  rng: GameRNGStateSchema,
  season: z.number().int().min(1),
  day: z.number().int().min(1),
  phase: SimPhaseEnum,
  userTeamId: z.string(),
  players: z.array(SnapshotPlayerSchema),
  schedule: z.array(ScheduledGameSchema),
  seasonState: SerializedSeasonStateV8Schema,
  playoffBracket: z.unknown().nullable(),
  injuries: z.array(InjuryEntrySchema),
  serviceTime: z.array(ServiceTimeEntrySchema),
  scoutingStaffs: z.array(ScoutStaffEntrySchema),
  gmPersonalities: z.array(GMPersonalityEntrySchema),
  offseasonState: z.unknown().nullable(),
  draftClass: z.unknown().nullable(),
  freeAgencyMarket: z.unknown().nullable(),
  news: z.array(NewsItemSchema),
  rosterStates: z.array(RosterStateEntrySchema),
  coachingStaffs: z.array(CoachingStaffEntrySchema),
  coachFreeAgentPool: z.array(CoachSchema),
  narrative: NarrativeSnapshotSchema,
  tradeState: TradeStateSchema,
  internationalScoutingState: InternationalScoutingStateSchema,
  draftState: DraftStateSchema,
  minorLeagueState: MinorLeagueStateSchema,
  rule5Session: Rule5SessionSchema,
  rule5Obligations: z.array(Rule5StateEntrySchema),
  rule5OfferBackStates: z.array(Rule5StateEntrySchema),
});
export type GameSnapshotV9 = z.infer<typeof GameSnapshotV9Schema>;

export const GameSnapshotV8Schema = z.object({
  schemaVersion: z.literal(8),
  rng: GameRNGStateSchema,
  season: z.number().int().min(1),
  day: z.number().int().min(1),
  phase: SimPhaseEnum,
  userTeamId: z.string(),
  players: z.array(SnapshotPlayerSchema),
  schedule: z.array(ScheduledGameSchema),
  seasonState: SerializedSeasonStateV8Schema,
  playoffBracket: z.unknown().nullable(),
  injuries: z.array(InjuryEntrySchema),
  serviceTime: z.array(ServiceTimeEntrySchema),
  scoutingStaffs: z.array(ScoutStaffEntrySchema),
  gmPersonalities: z.array(GMPersonalityEntrySchema),
  offseasonState: z.unknown().nullable(),
  draftClass: z.unknown().nullable(),
  freeAgencyMarket: z.unknown().nullable(),
  news: z.array(NewsItemSchema),
  rosterStates: z.array(RosterStateEntrySchema),
  coachingStaffs: z.array(CoachingStaffEntrySchema),
  coachFreeAgentPool: z.array(CoachSchema),
  narrative: NarrativeSnapshotSchema,
  tradeState: TradeStateSchema,
  internationalScoutingState: InternationalScoutingStateSchema,
  draftState: DraftStateSchema,
  minorLeagueState: MinorLeagueStateSchema,
  rule5Session: Rule5SessionSchema,
  rule5Obligations: z.array(Rule5StateEntrySchema),
  rule5OfferBackStates: z.array(Rule5StateEntrySchema),
});
export type GameSnapshotV8 = z.infer<typeof GameSnapshotV8Schema>;

export const GameSnapshotV7Schema = z.object({
  schemaVersion: z.literal(7),
  rng: GameRNGStateSchema,
  season: z.number().int().min(1),
  day: z.number().int().min(1),
  phase: SimPhaseEnum,
  userTeamId: z.string(),
  players: z.array(SnapshotPlayerV7Schema),
  schedule: z.array(ScheduledGameSchema),
  seasonState: SerializedSeasonStateV8Schema,
  playoffBracket: z.unknown().nullable(),
  injuries: z.array(InjuryEntrySchema),
  serviceTime: z.array(ServiceTimeEntrySchema),
  scoutingStaffs: z.array(ScoutStaffEntrySchema),
  gmPersonalities: z.array(GMPersonalityEntrySchema),
  offseasonState: z.unknown().nullable(),
  draftClass: z.unknown().nullable(),
  freeAgencyMarket: z.unknown().nullable(),
  news: z.array(NewsItemSchema),
  rosterStates: z.array(RosterStateEntrySchema),
  narrative: NarrativeSnapshotSchema,
  tradeState: TradeStateSchema,
  internationalScoutingState: InternationalScoutingStateSchema,
  draftState: DraftStateSchema,
  minorLeagueState: MinorLeagueStateV7Schema,
  rule5Session: Rule5SessionSchema,
  rule5Obligations: z.array(Rule5StateEntrySchema),
  rule5OfferBackStates: z.array(Rule5StateEntrySchema),
});
export type GameSnapshotV7 = z.infer<typeof GameSnapshotV7Schema>;

export const GameSnapshotV6Schema = z.object({
  schemaVersion: z.literal(6),
  rng: GameRNGStateSchema,
  season: z.number().int().min(1),
  day: z.number().int().min(1),
  phase: SimPhaseEnum,
  userTeamId: z.string(),
  players: z.array(SnapshotPlayerV6Schema),
  schedule: z.array(ScheduledGameSchema),
  seasonState: SerializedSeasonStateV8Schema,
  playoffBracket: z.unknown().nullable(),
  injuries: z.array(InjuryEntrySchema),
  serviceTime: z.array(ServiceTimeEntrySchema),
  scoutingStaffs: z.array(ScoutStaffEntrySchema),
  gmPersonalities: z.array(GMPersonalityEntrySchema),
  offseasonState: z.unknown().nullable(),
  draftClass: z.unknown().nullable(),
  freeAgencyMarket: z.unknown().nullable(),
  news: z.array(NewsItemSchema),
  rosterStates: z.array(RosterStateEntrySchema),
  narrative: NarrativeSnapshotSchema,
  tradeState: TradeStateSchema,
  rule5Session: Rule5SessionSchema,
  rule5Obligations: z.array(Rule5StateEntrySchema),
  rule5OfferBackStates: z.array(Rule5StateEntrySchema),
});
export type GameSnapshotV6 = z.infer<typeof GameSnapshotV6Schema>;

export const GameSnapshotV5Schema = z.object({
  schemaVersion: z.literal(5),
  rng: GameRNGStateSchema,
  season: z.number().int().min(1),
  day: z.number().int().min(1),
  phase: SimPhaseEnum,
  userTeamId: z.string(),
  players: z.array(LegacySnapshotPlayerSchema),
  schedule: z.array(ScheduledGameSchema),
  seasonState: SerializedSeasonStateV8Schema,
  playoffBracket: z.unknown().nullable(),
  injuries: z.array(InjuryEntrySchema),
  serviceTime: z.array(ServiceTimeEntrySchema),
  scoutingStaffs: z.array(ScoutStaffEntrySchema),
  gmPersonalities: z.array(GMPersonalityEntrySchema),
  offseasonState: z.unknown().nullable(),
  draftClass: z.unknown().nullable(),
  freeAgencyMarket: z.unknown().nullable(),
  news: z.array(NewsItemSchema),
  rosterStates: z.array(RosterStateEntrySchema),
  narrative: NarrativeSnapshotSchema,
  tradeState: TradeStateSchema,
});
export type GameSnapshotV5 = z.infer<typeof GameSnapshotV5Schema>;

export const GameSnapshotV4Schema = z.object({
  schemaVersion: z.literal(4),
  rng: GameRNGStateSchema,
  season: z.number().int().min(1),
  day: z.number().int().min(1),
  phase: SimPhaseEnum,
  userTeamId: z.string(),
  players: z.array(LegacySnapshotPlayerSchema),
  schedule: z.array(ScheduledGameSchema),
  seasonState: SerializedSeasonStateV8Schema,
  playoffBracket: z.unknown().nullable(),
  injuries: z.array(InjuryEntrySchema),
  serviceTime: z.array(ServiceTimeEntrySchema),
  scoutingStaffs: z.array(ScoutStaffEntrySchema),
  gmPersonalities: z.array(GMPersonalityEntrySchema),
  offseasonState: z.unknown().nullable(),
  draftClass: z.unknown().nullable(),
  freeAgencyMarket: z.unknown().nullable(),
  news: z.array(NewsItemSchema),
  rosterStates: z.array(RosterStateEntrySchema),
  narrative: NarrativeSnapshotV4Schema,
  tradeState: TradeStateSchema,
});
export type GameSnapshotV4 = z.infer<typeof GameSnapshotV4Schema>;

export const GameSnapshotV3Schema = z.object({
  schemaVersion: z.literal(3),
  rng: GameRNGStateSchema,
  season: z.number().int().min(1),
  day: z.number().int().min(1),
  phase: SimPhaseEnum,
  userTeamId: z.string(),
  players: z.array(LegacySnapshotPlayerSchema),
  schedule: z.array(ScheduledGameSchema),
  seasonState: SerializedSeasonStateV8Schema,
  playoffBracket: z.unknown().nullable(),
  injuries: z.array(InjuryEntrySchema),
  serviceTime: z.array(ServiceTimeEntrySchema),
  scoutingStaffs: z.array(ScoutStaffEntrySchema),
  gmPersonalities: z.array(GMPersonalityEntrySchema),
  offseasonState: z.unknown().nullable(),
  draftClass: z.unknown().nullable(),
  freeAgencyMarket: z.unknown().nullable(),
  news: z.array(NewsItemSchema),
  rosterStates: z.array(RosterStateEntrySchema),
  narrative: NarrativeSnapshotSchema,
});
export type GameSnapshotV3 = z.infer<typeof GameSnapshotV3Schema>;

export const GameSnapshotV2Schema = z.object({
  schemaVersion: z.literal(2),
  rng: GameRNGStateSchema,
  season: z.number().int().min(1),
  day: z.number().int().min(1),
  phase: SimPhaseEnum,
  userTeamId: z.string(),
  players: z.array(LegacySnapshotPlayerSchema),
  schedule: z.array(ScheduledGameSchema),
  seasonState: LegacySerializedSeasonStateSchema,
  playoffBracket: z.unknown().nullable(),
  injuries: z.array(InjuryEntrySchema),
  serviceTime: z.array(ServiceTimeEntrySchema),
  scoutingStaffs: z.array(ScoutStaffEntrySchema),
  gmPersonalities: z.array(GMPersonalityEntrySchema),
  offseasonState: z.unknown().nullable(),
  draftClass: z.unknown().nullable(),
  freeAgencyMarket: z.unknown().nullable(),
  news: z.array(NewsItemSchema),
  rosterStates: z.array(RosterStateEntrySchema),
  narrative: LegacyNarrativeSnapshotSchema,
});
export type GameSnapshotV2 = z.infer<typeof GameSnapshotV2Schema>;

function migratePlayerStatEntry([playerId, stats]: z.infer<typeof LegacyPlayerStatEntrySchema>): PlayerStatEntry {
  return [
    playerId,
    {
      gamesPlayed: 0,
      ...stats,
      hbp: 0,
      sacFlies: 0,
      homeRunsAllowed: 0,
      hitBatters: 0,
      flyBallsAllowed: 0,
      wins: 0,
      saves: 0,
      losses: 0,
    },
  ];
}

function migratePlayerStatEntryV8([playerId, stats]: z.infer<typeof PlayerStatEntryV8Schema>): PlayerStatEntry {
  return [
    playerId,
    {
      gamesPlayed: 0,
      ...stats,
      hbp: 0,
      sacFlies: 0,
      homeRunsAllowed: 0,
      hitBatters: 0,
      flyBallsAllowed: 0,
      saves: 0,
    },
  ];
}

function inferSavedNewsTag(category: string, priority: number): NewsTag {
  if (category === "rumor") return "RUMOR";
  if (priority <= 1) return "BREAKING";
  if (["extension", "qualifying_offer", "coaching", "development", "rivalry", "owner", "chemistry"].includes(category)) {
    return "ANALYSIS";
  }
  return "RECAP";
}

function normalizeSavedNewsItemTag<T extends { category: string; priority: number; tag?: NewsTag }>(item: T): T & { tag: NewsTag } {
  return {
    ...item,
    tag: item.tag ?? inferSavedNewsTag(item.category, item.priority),
  };
}

function createEmptyMonthlyPulseState() {
  return {
    pendingReport: null,
    decisionQueue: [],
  };
}

function createEmptyStatLeaders() {
  return {
    hr: [],
    rbi: [],
    avg: [],
    era: [],
    k: [],
    w: [],
  };
}

function createEmptyTradeState() {
  return {
    pendingOffers: [],
    tradeHistory: [],
  };
}

function createDefaultFranchiseState(userTeamId: string, season: number, day: number) {
  const teamCode = userTeamId.toUpperCase();
  return {
    gmName: "General Manager",
    difficulty: "standard" as const,
    createdAt: `S${season}D${day}`,
    teamId: userTeamId,
    teamName: teamCode,
    teamAbbreviation: teamCode,
    teamDivision: "UNKNOWN",
    status: "active" as const,
    endedAt: null,
    endReason: null,
    onboarding: {
      welcomeBriefingSeen: true,
      firstMonthlyPulseSeen: true,
    },
  };
}

function createEmptyCeremonyState() {
  return {
    pendingMoments: [],
    seenMomentIds: [],
  };
}

function createEmptyAchievementState() {
  return {
    unlocked: [],
    progress: [],
    counters: [],
    ledgers: [],
  };
}

function createEmptyPhase9State(userTeamId: string, season: number, day: number) {
  return {
    franchise: createDefaultFranchiseState(userTeamId, season, day),
    ceremony: createEmptyCeremonyState(),
    achievements: createEmptyAchievementState(),
  };
}

function createEmptyPhase11NarrativeState() {
  return {
    recordBook: [],
    recordWatch: [],
    seasonArchive: [],
    historicalPlayers: [],
    mentorRelationships: [],
    frontOfficeState: [],
  };
}

type RecordCategory = "team_single_season" | "individual_single_season" | "career" | "streak";

const RECORD_DESCRIPTORS: Array<{
  scope: "franchise" | "league";
  category: RecordCategory;
  stat: string;
  label: string;
}> = [
  { scope: "franchise", category: "team_single_season", stat: "wins", label: "Most Wins" },
  { scope: "franchise", category: "team_single_season", stat: "losses", label: "Most Losses" },
  { scope: "franchise", category: "team_single_season", stat: "batting_average", label: "Highest Team BA" },
  { scope: "franchise", category: "team_single_season", stat: "era", label: "Lowest Team ERA" },
  { scope: "franchise", category: "team_single_season", stat: "hr", label: "Most Home Runs" },
  { scope: "franchise", category: "team_single_season", stat: "stolen_bases", label: "Most Stolen Bases" },
  { scope: "franchise", category: "individual_single_season", stat: "hr", label: "Most Home Runs" },
  { scope: "franchise", category: "individual_single_season", stat: "rbi", label: "Most RBI" },
  { scope: "franchise", category: "individual_single_season", stat: "hits", label: "Most Hits" },
  { scope: "franchise", category: "individual_single_season", stat: "batting_average", label: "Highest Batting Average" },
  { scope: "franchise", category: "individual_single_season", stat: "wins", label: "Most Pitcher Wins" },
  { scope: "franchise", category: "individual_single_season", stat: "saves", label: "Most Saves" },
  { scope: "franchise", category: "individual_single_season", stat: "era", label: "Lowest ERA" },
  { scope: "franchise", category: "individual_single_season", stat: "strikeouts", label: "Most Strikeouts" },
  { scope: "franchise", category: "career", stat: "games_played", label: "Most Games" },
  { scope: "franchise", category: "career", stat: "hr", label: "Most Career Home Runs" },
  { scope: "franchise", category: "career", stat: "hits", label: "Most Career Hits" },
  { scope: "franchise", category: "career", stat: "wins", label: "Most Career Wins" },
  { scope: "franchise", category: "career", stat: "saves", label: "Most Career Saves" },
  { scope: "franchise", category: "career", stat: "war", label: "Most Career WAR" },
  { scope: "franchise", category: "streak", stat: "win_streak", label: "Longest Win Streak" },
  { scope: "franchise", category: "streak", stat: "loss_streak", label: "Longest Losing Streak" },
  { scope: "franchise", category: "streak", stat: "playoff_appearances", label: "Most Consecutive Playoff Appearances" },
  { scope: "league", category: "team_single_season", stat: "wins", label: "Most Wins" },
  { scope: "league", category: "team_single_season", stat: "losses", label: "Most Losses" },
  { scope: "league", category: "individual_single_season", stat: "hr", label: "Most Home Runs" },
  { scope: "league", category: "individual_single_season", stat: "batting_average", label: "Highest Batting Average" },
  { scope: "league", category: "individual_single_season", stat: "era", label: "Lowest ERA" },
  { scope: "league", category: "career", stat: "games_played", label: "Most Games" },
  { scope: "league", category: "career", stat: "hr", label: "Most Career Home Runs" },
  { scope: "league", category: "career", stat: "hits", label: "Most Career Hits" },
  { scope: "league", category: "career", stat: "wins", label: "Most Career Wins" },
  { scope: "league", category: "career", stat: "saves", label: "Most Career Saves" },
  { scope: "league", category: "career", stat: "war", label: "Most Career WAR" },
];

function createDefaultRecordBook(franchiseTeamId: string, currentSeason: number): z.infer<typeof RecordBookEntrySchema>[] {
  return RECORD_DESCRIPTORS.map((descriptor) => ({
    id: `${descriptor.scope}:${descriptor.scope === "franchise" ? `${franchiseTeamId}:` : ""}${descriptor.category}:${descriptor.stat}`,
    scope: descriptor.scope,
    teamId: descriptor.scope === "franchise" ? franchiseTeamId : null,
    category: descriptor.category,
    stat: descriptor.stat,
    label: descriptor.label,
    qualifier: null,
    holders: [] as z.infer<typeof RecordBookEntrySchema>["holders"],
    trackingFromSeason: currentSeason,
    note: null,
  }));
}

function setRecordBookValue(
  recordBook: ReturnType<typeof createDefaultRecordBook>,
  id: string,
  holder: {
    playerId: string | null;
    playerName: string | null;
    teamId: string | null;
    season: number | null;
    value: number;
    displayValue: string;
  },
) {
  const entry = recordBook.find((candidate) => candidate.id === id);
  if (!entry) {
    return;
  }

  if (entry.holders.length === 0 || holder.value > entry.holders[0]!.value) {
    entry.holders = [holder];
    entry.trackingFromSeason = null;
    return;
  }

  if (holder.value === entry.holders[0]!.value) {
    entry.holders.push(holder);
    entry.trackingFromSeason = null;
  }
}

function createHistoricalPlayers(
  players: z.infer<typeof SnapshotPlayerSchema>[],
  careerStats: z.infer<typeof CareerStatsLedgerSchema>[],
) {
  const historicalPlayers = new Map<
    string,
    {
      playerId: string;
      fullName: string;
      firstName: string;
      lastName: string;
      position: string;
      lastKnownTeamId: string;
      active: boolean;
      retiredSeason: number | null;
      seasonsPlayed: number;
      peakOverall: number | null;
      personalityTraits: string[];
    }
  >();

  for (const player of players) {
    historicalPlayers.set(player.id, {
      playerId: player.id,
      fullName: `${player.firstName} ${player.lastName}`,
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      lastKnownTeamId: player.teamId,
      active: player.rosterStatus !== "RETIRED",
      retiredSeason: player.rosterStatus === "RETIRED" ? null : null,
      seasonsPlayed: 0,
      peakOverall: null,
      personalityTraits: [...(player.personalityTraits ?? [])],
    });
  }

  for (const ledger of careerStats) {
    const current = historicalPlayers.get(ledger.playerId);
    const names = ledger.playerName.split(" ");
    historicalPlayers.set(ledger.playerId, {
      playerId: ledger.playerId,
      fullName: ledger.playerName,
      firstName: current?.firstName ?? names[0] ?? ledger.playerName,
      lastName: current?.lastName ?? (names.slice(1).join(" ") || names[0] || ledger.playerName),
      position: current?.position ?? ledger.position,
      lastKnownTeamId: current?.lastKnownTeamId ?? ledger.teamIds[ledger.teamIds.length - 1] ?? "",
      active: current?.active ?? false,
      retiredSeason: current?.retiredSeason ?? null,
      seasonsPlayed: ledger.seasonsPlayed,
      peakOverall: ledger.peakOverall,
      personalityTraits: current?.personalityTraits ?? [],
    });
  }

  return Array.from(historicalPlayers.values());
}

function createPhase11MigrationState(
  userTeamId: string,
  season: number,
  players: z.infer<typeof SnapshotPlayerSchema>[],
  franchiseTimeline: z.infer<typeof FranchiseTimelineEntrySchema>[],
  careerStats: z.infer<typeof CareerStatsLedgerSchema>[],
) {
  const recordBook = createDefaultRecordBook(userTeamId, season);
  const bestWinSeason = franchiseTimeline.reduce<typeof franchiseTimeline[number] | null>((best, entry) => {
    if (entry.teamId !== userTeamId) {
      return best;
    }
    if (!best || entry.winTotal > best.winTotal) {
      return entry;
    }
    return best;
  }, null);

  if (bestWinSeason) {
    setRecordBookValue(recordBook, `franchise:${userTeamId}:team_single_season:wins`, {
      playerId: null,
      playerName: null,
      teamId: userTeamId,
      season: bestWinSeason.season,
      value: bestWinSeason.winTotal,
      displayValue: String(bestWinSeason.winTotal),
    });
  }

  const franchiseCareerLedgers = careerStats.filter((entry) => entry.teamIds.includes(userTeamId));
  for (const ledger of franchiseCareerLedgers) {
    setRecordBookValue(recordBook, `franchise:${userTeamId}:career:games_played`, {
      playerId: ledger.playerId,
      playerName: ledger.playerName,
      teamId: userTeamId,
      season: null,
      value: ledger.gamesPlayed ?? 0,
      displayValue: String(ledger.gamesPlayed ?? 0),
    });
    setRecordBookValue(recordBook, `franchise:${userTeamId}:career:hr`, {
      playerId: ledger.playerId,
      playerName: ledger.playerName,
      teamId: userTeamId,
      season: null,
      value: ledger.batting?.hr ?? 0,
      displayValue: String(ledger.batting?.hr ?? 0),
    });
    setRecordBookValue(recordBook, `franchise:${userTeamId}:career:hits`, {
      playerId: ledger.playerId,
      playerName: ledger.playerName,
      teamId: userTeamId,
      season: null,
      value: ledger.batting?.hits ?? 0,
      displayValue: String(ledger.batting?.hits ?? 0),
    });
    setRecordBookValue(recordBook, `franchise:${userTeamId}:career:wins`, {
      playerId: ledger.playerId,
      playerName: ledger.playerName,
      teamId: userTeamId,
      season: null,
      value: ledger.pitching?.wins ?? 0,
      displayValue: String(ledger.pitching?.wins ?? 0),
    });
    setRecordBookValue(recordBook, `franchise:${userTeamId}:career:saves`, {
      playerId: ledger.playerId,
      playerName: ledger.playerName,
      teamId: userTeamId,
      season: null,
      value: ledger.saves ?? 0,
      displayValue: String(ledger.saves ?? 0),
    });
    setRecordBookValue(recordBook, `franchise:${userTeamId}:career:war`, {
      playerId: ledger.playerId,
      playerName: ledger.playerName,
      teamId: userTeamId,
      season: null,
      value: ledger.war ?? 0,
      displayValue: (ledger.war ?? 0).toFixed(1),
    });
  }

  return {
    recordBook,
    recordWatch: [],
    seasonArchive: [],
    historicalPlayers: createHistoricalPlayers(players, careerStats),
    mentorRelationships: [],
    frontOfficeState: [],
  };
}

function createEmptyLegacyState() {
  return {
    hallOfFame: [],
    hallOfFameBallot: [],
    franchiseTimeline: [],
    careerStats: [],
  };
}

function createEmptyRule5State() {
  return {
    rule5Session: null,
    rule5Obligations: [],
    rule5OfferBackStates: [],
  };
}

function createEmptyPhase6State(season: number) {
  return {
    internationalScoutingState: {
      season,
      ifaPool: [],
      budgets: [],
      scoutingHistory: [],
    },
    draftState: {
      scoutingReports: [],
      signability: [],
      qualifyingOffers: [],
      compensatoryPicks: [],
      pickOwnership: [],
      bigBoards: [],
      signingDecisions: [],
    },
    minorLeagueState: {
      serviceTimeLedger: [],
      optionUsage: [],
      waiverClaims: [],
      affiliateStates: [],
      affiliateBoxScores: [],
      processedDevelopmentMonths: [],
      developmentLedger: [],
      developmentReports: [],
      conversionRecommendations: [],
    },
  };
}

const COACH_ROLE_ORDER = [
  "manager",
  "pitching_coach",
  "hitting_coach",
  "bench_coach",
  "bullpen_coach",
  "first_base_coach",
  "third_base_coach",
  "farm_director",
  "rookie_coordinator",
  "a_coordinator",
  "aa_coordinator",
  "aaa_coordinator",
] as const;

const COACH_FIRST_NAMES = [
  "Jim",
  "Dave",
  "Ron",
  "Mike",
  "Tony",
  "Luis",
  "Carlos",
  "Pete",
  "Sam",
  "Mark",
  "Dan",
  "Alex",
];

const COACH_LAST_NAMES = [
  "Thompson",
  "Martinez",
  "Walker",
  "Collins",
  "Rivera",
  "Johnson",
  "Bennett",
  "Foster",
  "Cruz",
  "Parker",
  "Hernandez",
  "Lopez",
];

const ROLE_SPECIALTY_MAP: Record<(typeof COACH_ROLE_ORDER)[number], z.infer<typeof CoachSchema>["specialty"]> = {
  manager: "leadership",
  pitching_coach: "stuff",
  hitting_coach: "power",
  bench_coach: "contact",
  bullpen_coach: "control",
  first_base_coach: "speed",
  third_base_coach: "defense",
  farm_director: "leadership",
  rookie_coordinator: "speed",
  a_coordinator: "contact",
  aa_coordinator: "contact",
  aaa_coordinator: "mlb_prep",
};

function clampRating(value: number): number {
  return Math.max(0, Math.min(550, Math.round(value)));
}

function clampFraction(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash * 31) + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function deriveDevelopmentProgram(
  rosterStatus: z.infer<typeof SnapshotPlayerSchema>["rosterStatus"],
  minorLeagueLevel: z.infer<typeof SnapshotPlayerSchema>["minorLeagueLevel"],
): z.infer<typeof DevelopmentProgramEnum> {
  const level = minorLeagueLevel ?? rosterStatus;
  switch (level) {
    case "ROOKIE":
    case "INTERNATIONAL":
      return "tools";
    case "A":
    case "A_PLUS":
      return "fundamentals";
    case "AA":
      return "refinement";
    case "AAA":
    case "MLB":
    case "FREE_AGENT":
    case "RETIRED":
    default:
      return "mlb_prep";
  }
}

function backfillDevelopmentProfile(
  player: z.infer<typeof SnapshotPlayerV7Schema>,
): Pick<
  SnapshotPlayer,
  "ceiling" | "floor" | "developmentProgram" | "developmentTrajectory" | "extensionHistory"
> {
  const varianceSeed = hashString(player.id);
  const upsideWindow = Math.max(
    18,
    Math.min(
      120,
      (player.rosterStatus === "MLB" ? 24 : 42)
      + Math.max(0, 26 - player.age) * 4
      + (varianceSeed % 18),
    ),
  );
  const floorWindow = Math.max(
    10,
    Math.min(
      90,
      20 + Math.max(0, player.age - 24) * 3 + ((varianceSeed >> 4) % 16),
    ),
  );

  return {
    ceiling: clampRating(player.overallRating + upsideWindow),
    floor: clampRating(player.overallRating - floorWindow),
    developmentProgram: deriveDevelopmentProgram(
      player.rosterStatus,
      player.minorLeagueLevel,
    ),
    developmentTrajectory: "on_track",
    extensionHistory: [],
  };
}

function upgradeMinorLeagueState(
  state: z.infer<typeof MinorLeagueStateV7Schema>,
): MinorLeagueState {
  return {
    ...state,
    processedDevelopmentMonths: [],
    developmentLedger: [],
    developmentReports: [],
    conversionRecommendations: [],
  };
}

function createCoachRecord(
  role: (typeof COACH_ROLE_ORDER)[number],
  teamId: string | null,
  seed: string,
): z.infer<typeof CoachSchema> {
  const hash = hashString(seed);
  const firstIndex = hash % COACH_FIRST_NAMES.length;
  const lastIndex = (hash >>> 3) % COACH_LAST_NAMES.length;
  const annualSalary = Math.round((0.6 + (((hash >>> 8) % 290) / 100)) * 100) / 100;
  return {
    id: `coach-${seed}`,
    firstName: COACH_FIRST_NAMES[firstIndex]!,
    lastName: COACH_LAST_NAMES[lastIndex]!,
    role,
    specialty: ROLE_SPECIALTY_MAP[role],
    teachingAbility: clampFraction(0.3 + ((hash % 701) / 1000), 0.3, 1),
    developmentBonus: clampFraction((((hash >>> 4) % 301) / 1000), 0, 0.3),
    personalityFit: clampFraction(0.3 + ((((hash >>> 6) % 701) / 1000)), 0.3, 1),
    experienceYears: hash % 26,
    contractYears: 1 + (hash % 3),
    annualSalary,
    teamId,
  };
}

function createDefaultCoachingStaffEntries(
  teamIds: string[],
  season: number,
): Array<[string, z.infer<typeof CoachSchema>[]]> {
  return [...teamIds]
    .sort((left, right) => left.localeCompare(right))
    .map((teamId) => [
      teamId,
      COACH_ROLE_ORDER.map((role) =>
        createCoachRecord(role, teamId, `${teamId}-${season}-${role}`)),
    ]);
}

function createDefaultCoachFreeAgentPool(season: number): z.infer<typeof CoachSchema>[] {
  const pool: z.infer<typeof CoachSchema>[] = [];
  for (const role of COACH_ROLE_ORDER) {
    for (let index = 0; index < 2; index += 1) {
      pool.push(createCoachRecord(role, null, `fa-${season}-${role}-${index}`));
    }
  }
  return pool;
}

function createEmptyPhase7State(season: number, teamIds: string[]) {
  return {
    coachingStaffs: createDefaultCoachingStaffEntries(teamIds, season),
    coachFreeAgentPool: createDefaultCoachFreeAgentPool(season),
  };
}

function calculateRule5EligibleAfterSeason(signingSeason: number, signedAge: number): number {
  return Math.max(1, signingSeason + (signedAge <= 18 ? 4 : 3));
}

const BACKFILL_BASE_YEARS: Record<z.infer<typeof LegacySnapshotPlayerSchema>["rosterStatus"], number> = {
  MLB: 6,
  AAA: 4,
  AA: 3,
  A_PLUS: 2,
  A: 1,
  ROOKIE: 1,
  INTERNATIONAL: 1,
  FREE_AGENT: 5,
  RETIRED: 6,
};

const BACKFILL_TYPICAL_MAX_AGE: Record<z.infer<typeof LegacySnapshotPlayerSchema>["rosterStatus"], number> = {
  MLB: 28,
  AAA: 24,
  AA: 22,
  A_PLUS: 21,
  A: 20,
  ROOKIE: 19,
  INTERNATIONAL: 18,
  FREE_AGENT: 29,
  RETIRED: 35,
};

function migrateSnapshotPlayer(
  player: z.infer<typeof LegacySnapshotPlayerSchema>,
  currentSeason: number,
  serviceTimeYears: number,
): SnapshotPlayer {
  const baseYears = BACKFILL_BASE_YEARS[player.rosterStatus];
  const typicalMaxAge = BACKFILL_TYPICAL_MAX_AGE[player.rosterStatus];
  const estimatedYearsInOrg = Math.max(1, baseYears + Math.max(0, player.age - typicalMaxAge));
  const estimatedSigningSeason = currentSeason - estimatedYearsInOrg + 1;
  const estimatedSignedAge = Math.max(16, player.age - estimatedYearsInOrg + 1);

  return {
    ...player,
    rule5EligibleAfterSeason: calculateRule5EligibleAfterSeason(estimatedSigningSeason, estimatedSignedAge),
    serviceTimeDays: serviceTimeYears * 172,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: getMinorLeagueLevel(player.rosterStatus),
    personalityTraits: [],
  };
}

function getMinorLeagueLevel(
  rosterStatus: z.infer<typeof LegacySnapshotPlayerSchema>["rosterStatus"],
): z.infer<typeof MinorLeagueLevelEnum> | null {
  if (
    rosterStatus === "MLB" ||
    rosterStatus === "FREE_AGENT" ||
    rosterStatus === "RETIRED"
  ) {
    return null;
  }

  return rosterStatus;
}

function createServiceTimeLookup(entries: [string, number][]): Map<string, number> {
  return new Map(entries);
}

function migrateV6SnapshotPlayer(
  player: z.infer<typeof SnapshotPlayerV6Schema>,
  serviceTimeYears: number,
): SnapshotPlayer {
  const upgradedPlayer = {
    ...player,
    serviceTimeDays: serviceTimeYears * 172,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: getMinorLeagueLevel(player.rosterStatus),
  };

  return {
    ...upgradedPlayer,
    personalityTraits: [],
    ...backfillDevelopmentProfile(upgradedPlayer),
  };
}

export function migrateGameSnapshot(snapshot: GameSnapshotV2): GameSnapshot {
  const serviceTimeLookup = createServiceTimeLookup(snapshot.serviceTime);
  const teamIds = snapshot.rosterStates.map(([teamId]) => teamId);
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    news: snapshot.news.map(normalizeSavedNewsItemTag),
    players: snapshot.players.map((player) =>
      migrateSnapshotPlayer(player, snapshot.season, serviceTimeLookup.get(player.id) ?? 0)),
    seasonState: {
      ...snapshot.seasonState,
      playerSeasonStats: snapshot.seasonState.playerSeasonStats.map(migratePlayerStatEntry),
    },
    narrative: {
      ...snapshot.narrative,
      awardHistory: snapshot.narrative.awardHistory.map((entry) => ({
        ...entry,
        league: "MLB" as const,
      })),
      briefingQueue: snapshot.narrative.briefingQueue.map(normalizeSavedNewsItemTag),
      ...createEmptyLegacyState(),
      seasonHistory: snapshot.narrative.seasonHistory.map((entry) => ({
        ...entry,
        awards: entry.awards.map((award) => ({
          ...award,
          league: "MLB" as const,
        })),
        runnerUpTeamId: null,
        worldSeriesRecord: null,
        statLeaders: createEmptyStatLeaders(),
        notableRetirements: [],
        blockbusterTrades: [],
        userSeason: null,
        })),
    },
    monthlyPulse: createEmptyMonthlyPulseState(),
    tradeState: createEmptyTradeState(),
    ...createEmptyRule5State(),
    ...createEmptyPhase6State(snapshot.season),
    ...createEmptyPhase7State(snapshot.season, teamIds),
    ...createEmptyPhase9State(snapshot.userTeamId, snapshot.season, snapshot.day),
  });
}

function migrateGameSnapshotV3(snapshot: GameSnapshotV3): GameSnapshot {
  const serviceTimeLookup = createServiceTimeLookup(snapshot.serviceTime);
  const teamIds = snapshot.rosterStates.map(([teamId]) => teamId);
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    news: snapshot.news.map(normalizeSavedNewsItemTag),
    players: snapshot.players.map((player) =>
      migrateSnapshotPlayer(player, snapshot.season, serviceTimeLookup.get(player.id) ?? 0)),
    seasonState: {
      ...snapshot.seasonState,
      playerSeasonStats: snapshot.seasonState.playerSeasonStats.map(migratePlayerStatEntryV8),
    },
    narrative: {
      ...snapshot.narrative,
      briefingQueue: snapshot.narrative.briefingQueue.map(normalizeSavedNewsItemTag),
      ...createEmptyLegacyState(),
    },
    monthlyPulse: createEmptyMonthlyPulseState(),
    tradeState: createEmptyTradeState(),
    ...createEmptyRule5State(),
    ...createEmptyPhase6State(snapshot.season),
    ...createEmptyPhase7State(snapshot.season, teamIds),
    ...createEmptyPhase9State(snapshot.userTeamId, snapshot.season, snapshot.day),
  });
}

function migrateGameSnapshotV4(snapshot: GameSnapshotV4): GameSnapshot {
  const serviceTimeLookup = createServiceTimeLookup(snapshot.serviceTime);
  const teamIds = snapshot.rosterStates.map(([teamId]) => teamId);
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    news: snapshot.news.map(normalizeSavedNewsItemTag),
    players: snapshot.players.map((player) =>
      migrateSnapshotPlayer(player, snapshot.season, serviceTimeLookup.get(player.id) ?? 0)),
    seasonState: {
      ...snapshot.seasonState,
      playerSeasonStats: snapshot.seasonState.playerSeasonStats.map(migratePlayerStatEntryV8),
    },
    narrative: {
      ...snapshot.narrative,
      briefingQueue: snapshot.narrative.briefingQueue.map(normalizeSavedNewsItemTag),
      ...createEmptyLegacyState(),
    },
    monthlyPulse: createEmptyMonthlyPulseState(),
    tradeState: snapshot.tradeState ?? createEmptyTradeState(),
    ...createEmptyRule5State(),
    ...createEmptyPhase6State(snapshot.season),
    ...createEmptyPhase7State(snapshot.season, teamIds),
    ...createEmptyPhase9State(snapshot.userTeamId, snapshot.season, snapshot.day),
  });
}

function migrateGameSnapshotV5(snapshot: GameSnapshotV5): GameSnapshot {
  const serviceTimeLookup = createServiceTimeLookup(snapshot.serviceTime);
  const teamIds = snapshot.rosterStates.map(([teamId]) => teamId);
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    news: snapshot.news.map(normalizeSavedNewsItemTag),
    players: snapshot.players.map((player) =>
      migrateSnapshotPlayer(player, snapshot.season, serviceTimeLookup.get(player.id) ?? 0)),
    seasonState: {
      ...snapshot.seasonState,
      playerSeasonStats: snapshot.seasonState.playerSeasonStats.map(migratePlayerStatEntryV8),
    },
    narrative: {
      ...snapshot.narrative,
      briefingQueue: snapshot.narrative.briefingQueue.map(normalizeSavedNewsItemTag),
    },
    monthlyPulse: createEmptyMonthlyPulseState(),
    ...createEmptyRule5State(),
    ...createEmptyPhase6State(snapshot.season),
    ...createEmptyPhase7State(snapshot.season, teamIds),
    ...createEmptyPhase9State(snapshot.userTeamId, snapshot.season, snapshot.day),
  });
}

function migrateGameSnapshotV6(snapshot: GameSnapshotV6): GameSnapshot {
  const serviceTimeLookup = createServiceTimeLookup(snapshot.serviceTime);
  const teamIds = snapshot.rosterStates.map(([teamId]) => teamId);
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    news: snapshot.news.map(normalizeSavedNewsItemTag),
    players: snapshot.players.map((player) =>
      migrateV6SnapshotPlayer(player, serviceTimeLookup.get(player.id) ?? 0)),
    seasonState: {
      ...snapshot.seasonState,
      playerSeasonStats: snapshot.seasonState.playerSeasonStats.map(migratePlayerStatEntryV8),
    },
    narrative: {
      ...snapshot.narrative,
      briefingQueue: snapshot.narrative.briefingQueue.map(normalizeSavedNewsItemTag),
    },
    monthlyPulse: createEmptyMonthlyPulseState(),
    ...createEmptyPhase6State(snapshot.season),
    ...createEmptyPhase7State(snapshot.season, teamIds),
    ...createEmptyPhase9State(snapshot.userTeamId, snapshot.season, snapshot.day),
  });
}

function migrateGameSnapshotV7(snapshot: GameSnapshotV7): GameSnapshot {
  const teamIds = snapshot.rosterStates.map(([teamId]) => teamId);
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    news: snapshot.news.map(normalizeSavedNewsItemTag),
    players: snapshot.players.map((player) => ({
      ...player,
      ...backfillDevelopmentProfile(player),
    })),
    seasonState: {
      ...snapshot.seasonState,
      playerSeasonStats: snapshot.seasonState.playerSeasonStats.map(migratePlayerStatEntryV8),
    },
    narrative: {
      ...snapshot.narrative,
      briefingQueue: snapshot.narrative.briefingQueue.map(normalizeSavedNewsItemTag),
    },
    minorLeagueState: upgradeMinorLeagueState(snapshot.minorLeagueState),
    monthlyPulse: createEmptyMonthlyPulseState(),
    ...createEmptyPhase7State(snapshot.season, teamIds),
    ...createEmptyPhase9State(snapshot.userTeamId, snapshot.season, snapshot.day),
  });
}

function migrateGameSnapshotV8(snapshot: GameSnapshotV8): GameSnapshot {
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    news: snapshot.news.map(normalizeSavedNewsItemTag),
    seasonState: {
      ...snapshot.seasonState,
      playerSeasonStats: snapshot.seasonState.playerSeasonStats.map(migratePlayerStatEntryV8),
    },
    narrative: {
      ...snapshot.narrative,
      briefingQueue: snapshot.narrative.briefingQueue.map(normalizeSavedNewsItemTag),
    },
    monthlyPulse: createEmptyMonthlyPulseState(),
    ...createEmptyPhase9State(snapshot.userTeamId, snapshot.season, snapshot.day),
  });
}

function migrateGameSnapshotV9(snapshot: GameSnapshotV9): GameSnapshot {
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    news: snapshot.news.map(normalizeSavedNewsItemTag),
    seasonState: {
      ...snapshot.seasonState,
      playerSeasonStats: snapshot.seasonState.playerSeasonStats.map(migratePlayerStatEntryV8),
    },
    narrative: {
      ...snapshot.narrative,
      briefingQueue: snapshot.narrative.briefingQueue.map(normalizeSavedNewsItemTag),
    },
    monthlyPulse: createEmptyMonthlyPulseState(),
    ...createEmptyPhase9State(snapshot.userTeamId, snapshot.season, snapshot.day),
  });
}

function migrateGameSnapshotV10(snapshot: GameSnapshotV10): GameSnapshot {
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    ...createEmptyPhase9State(snapshot.userTeamId, snapshot.season, snapshot.day),
  });
}

function migrateGameSnapshotV11(snapshot: GameSnapshotV11): GameSnapshot {
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    narrative: {
      ...snapshot.narrative,
      ...createPhase11MigrationState(
        snapshot.userTeamId,
        snapshot.season,
        snapshot.players,
        snapshot.narrative.franchiseTimeline,
        snapshot.narrative.careerStats,
      ),
    },
  });
}

export function parseGameSnapshot(snapshotLike: unknown): GameSnapshot {
  if (
    typeof snapshotLike === "object" &&
    snapshotLike !== null &&
    "schemaVersion" in snapshotLike &&
    snapshotLike.schemaVersion === 2
  ) {
    return migrateGameSnapshot(GameSnapshotV2Schema.parse(snapshotLike));
  }

  if (
    typeof snapshotLike === "object" &&
    snapshotLike !== null &&
    "schemaVersion" in snapshotLike &&
    snapshotLike.schemaVersion === 3
  ) {
    return migrateGameSnapshotV3(GameSnapshotV3Schema.parse(snapshotLike));
  }

  if (
    typeof snapshotLike === "object" &&
    snapshotLike !== null &&
    "schemaVersion" in snapshotLike &&
    snapshotLike.schemaVersion === 11
  ) {
    return migrateGameSnapshotV11(GameSnapshotV11Schema.parse(snapshotLike));
  }

  if (
    typeof snapshotLike === "object" &&
    snapshotLike !== null &&
    "schemaVersion" in snapshotLike &&
    snapshotLike.schemaVersion === 10
  ) {
    return migrateGameSnapshotV10(GameSnapshotV10Schema.parse(snapshotLike));
  }

  if (
    typeof snapshotLike === "object" &&
    snapshotLike !== null &&
    "schemaVersion" in snapshotLike &&
    snapshotLike.schemaVersion === 9
  ) {
    return migrateGameSnapshotV9(GameSnapshotV9Schema.parse(snapshotLike));
  }

  if (
    typeof snapshotLike === "object" &&
    snapshotLike !== null &&
    "schemaVersion" in snapshotLike &&
    snapshotLike.schemaVersion === 8
  ) {
    return migrateGameSnapshotV8(GameSnapshotV8Schema.parse(snapshotLike));
  }

  if (
    typeof snapshotLike === "object" &&
    snapshotLike !== null &&
    "schemaVersion" in snapshotLike &&
    snapshotLike.schemaVersion === 7
  ) {
    return migrateGameSnapshotV7(GameSnapshotV7Schema.parse(snapshotLike));
  }

  if (
    typeof snapshotLike === "object" &&
    snapshotLike !== null &&
    "schemaVersion" in snapshotLike &&
    snapshotLike.schemaVersion === 6
  ) {
    return migrateGameSnapshotV6(GameSnapshotV6Schema.parse(snapshotLike));
  }

  if (
    typeof snapshotLike === "object" &&
    snapshotLike !== null &&
    "schemaVersion" in snapshotLike &&
    snapshotLike.schemaVersion === 5
  ) {
    return migrateGameSnapshotV5(GameSnapshotV5Schema.parse(snapshotLike));
  }

  if (
    typeof snapshotLike === "object" &&
    snapshotLike !== null &&
    "schemaVersion" in snapshotLike &&
    snapshotLike.schemaVersion === 4
  ) {
    return migrateGameSnapshotV4(GameSnapshotV4Schema.parse(snapshotLike));
  }

  return GameSnapshotSchema.parse(snapshotLike);
}
