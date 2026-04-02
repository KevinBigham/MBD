import { z } from "zod";
import {
  ContractSchema,
  HitterAttributesSchema,
  MinorLeagueLevelEnum,
  PersonalitySchema,
  PitcherAttributesSchema,
  PositionEnum,
  RosterStatusEnum,
  DevelopmentPhaseEnum,
} from "./player.js";
import {
  AwardHistoryEntrySchema,
  BriefingItemSchema,
  CareerStatsLedgerSchema,
  FranchiseTimelineEntrySchema,
  HallOfFameBallotEntrySchema,
  HallOfFameEntrySchema,
  NewsItemSchema,
  OwnerStateSchema,
  PlayerMoraleSchema,
  RivalrySchema,
  TeamChemistrySchema,
  SeasonHistoryEntrySchema,
} from "./narrative.js";
import { TradeStateSchema } from "./trade.js";
import {
  DraftCompensatoryPickSchema,
  DraftPickOwnershipSchema,
  DraftScoutingReportSchema,
  DraftSigningDecisionSchema,
  DraftSignabilitySchema,
  QualifyingOfferRecordSchema,
} from "./draft.js";
import { MinorLeagueStateSchema } from "./minors.js";

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
export const SnapshotPlayerSchema = SnapshotPlayerV6Schema.extend({
  serviceTimeDays: z.number().int().min(0),
  optionYearsUsed: z.number().int().min(0),
  isOutOfOptions: z.boolean(),
  minorLeagueLevel: MinorLeagueLevelEnum.nullable(),
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
export type PlayerStatEntry = z.infer<typeof PlayerStatEntrySchema>;

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

export const CURRENT_GAME_SNAPSHOT_VERSION = 7;

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
  narrative: NarrativeSnapshotSchema,
  tradeState: TradeStateSchema,
  internationalScoutingState: InternationalScoutingStateSchema,
  draftState: DraftStateSchema,
  minorLeagueState: MinorLeagueStateSchema,
  rule5Session: Rule5SessionSchema,
  rule5Obligations: z.array(Rule5StateEntrySchema),
  rule5OfferBackStates: z.array(Rule5StateEntrySchema),
});
export type GameSnapshot = z.infer<typeof GameSnapshotSchema>;

export const GameSnapshotV6Schema = z.object({
  schemaVersion: z.literal(6),
  rng: GameRNGStateSchema,
  season: z.number().int().min(1),
  day: z.number().int().min(1),
  phase: SimPhaseEnum,
  userTeamId: z.string(),
  players: z.array(SnapshotPlayerV6Schema),
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
      ...stats,
      wins: 0,
      losses: 0,
    },
  ];
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
    },
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
  return {
    ...player,
    serviceTimeDays: serviceTimeYears * 172,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: getMinorLeagueLevel(player.rosterStatus),
  };
}

export function migrateGameSnapshot(snapshot: GameSnapshotV2): GameSnapshot {
  const serviceTimeLookup = createServiceTimeLookup(snapshot.serviceTime);
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
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
    tradeState: createEmptyTradeState(),
    ...createEmptyRule5State(),
    ...createEmptyPhase6State(snapshot.season),
  });
}

function migrateGameSnapshotV3(snapshot: GameSnapshotV3): GameSnapshot {
  const serviceTimeLookup = createServiceTimeLookup(snapshot.serviceTime);
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    players: snapshot.players.map((player) =>
      migrateSnapshotPlayer(player, snapshot.season, serviceTimeLookup.get(player.id) ?? 0)),
    narrative: {
      ...snapshot.narrative,
      ...createEmptyLegacyState(),
    },
    tradeState: createEmptyTradeState(),
    ...createEmptyRule5State(),
    ...createEmptyPhase6State(snapshot.season),
  });
}

function migrateGameSnapshotV4(snapshot: GameSnapshotV4): GameSnapshot {
  const serviceTimeLookup = createServiceTimeLookup(snapshot.serviceTime);
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    players: snapshot.players.map((player) =>
      migrateSnapshotPlayer(player, snapshot.season, serviceTimeLookup.get(player.id) ?? 0)),
    narrative: {
      ...snapshot.narrative,
      ...createEmptyLegacyState(),
    },
    tradeState: snapshot.tradeState ?? createEmptyTradeState(),
    ...createEmptyRule5State(),
    ...createEmptyPhase6State(snapshot.season),
  });
}

function migrateGameSnapshotV5(snapshot: GameSnapshotV5): GameSnapshot {
  const serviceTimeLookup = createServiceTimeLookup(snapshot.serviceTime);
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    players: snapshot.players.map((player) =>
      migrateSnapshotPlayer(player, snapshot.season, serviceTimeLookup.get(player.id) ?? 0)),
    ...createEmptyRule5State(),
    ...createEmptyPhase6State(snapshot.season),
  });
}

function migrateGameSnapshotV6(snapshot: GameSnapshotV6): GameSnapshot {
  const serviceTimeLookup = createServiceTimeLookup(snapshot.serviceTime);
  return GameSnapshotSchema.parse({
    ...snapshot,
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    players: snapshot.players.map((player) =>
      migrateV6SnapshotPlayer(player, serviceTimeLookup.get(player.id) ?? 0)),
    ...createEmptyPhase6State(snapshot.season),
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
