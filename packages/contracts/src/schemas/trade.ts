import { z } from "zod";

const PlayerTradeAssetSchema = z.object({
  type: z.literal("player"),
  playerId: z.string(),
});

const DraftPickTradeAssetSchema = z.object({
  type: z.literal("draft_pick"),
  season: z.number().int().min(1),
  round: z.number().int().min(1),
  originalTeamId: z.string(),
});

const IFAPoolSpaceTradeAssetSchema = z.object({
  type: z.literal("ifa_pool_space"),
  amount: z.number().positive(),
});

export const TradeAssetSchema = z.discriminatedUnion("type", [
  PlayerTradeAssetSchema,
  DraftPickTradeAssetSchema,
  IFAPoolSpaceTradeAssetSchema,
]);
export type TradeAsset = z.infer<typeof TradeAssetSchema>;

export const TradeStatusEnum = z.enum([
  "PROPOSED",
  "COUNTERED",
  "ACCEPTED",
  "REJECTED",
  "EXECUTED",
]);
export type TradeStatus = z.infer<typeof TradeStatusEnum>;

export const TradePackageSchema = z.object({
  assets: z.array(TradeAssetSchema),
});
export type TradePackage = z.infer<typeof TradePackageSchema>;

export const TradeProposalSchema = z.object({
  id: z.string(),
  proposingTeamId: z.string(),
  receivingTeamId: z.string(),
  proposingPackage: TradePackageSchema,
  receivingPackage: TradePackageSchema,
  status: TradeStatusEnum,
  counterOfferCount: z.number().int().min(0),
});
export type TradeProposal = z.infer<typeof TradeProposalSchema>;

const NormalizedTradeEntrySchema = z.object({
  id: z.string(),
  fromTeamId: z.string(),
  toTeamId: z.string(),
  offeringAssets: z.array(TradeAssetSchema),
  requestingAssets: z.array(TradeAssetSchema),
  fairnessScore: z.number(),
  message: z.string().optional(),
  createdAt: z.string().optional(),
  summary: z.string().optional(),
  timestamp: z.string().optional(),
});

function normalizeLegacyTradeEntry(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "offeringPlayerIds" in value &&
    "requestingPlayerIds" in value
  ) {
    const legacy = value as {
      offeringPlayerIds?: string[];
      requestingPlayerIds?: string[];
    };
    return {
      ...value,
      offeringAssets: (legacy.offeringPlayerIds ?? []).map((playerId) => ({
        type: "player" as const,
        playerId,
      })),
      requestingAssets: (legacy.requestingPlayerIds ?? []).map((playerId) => ({
        type: "player" as const,
        playerId,
      })),
    };
  }

  return value;
}

export const PersistentTradeOfferSchema = z.preprocess(
  normalizeLegacyTradeEntry,
  NormalizedTradeEntrySchema.extend({
    message: z.string(),
    createdAt: z.string(),
  }),
);
export type PersistentTradeOffer = z.infer<typeof PersistentTradeOfferSchema>;

export const TradeHistoryEntrySchema = z.preprocess(
  normalizeLegacyTradeEntry,
  NormalizedTradeEntrySchema.extend({
    summary: z.string(),
    timestamp: z.string(),
  }),
);
export type TradeHistoryEntry = z.infer<typeof TradeHistoryEntrySchema>;

export const NegotiationPhaseEnum = z.enum([
  "proposed",
  "pending",
  "counter_1",
  "counter_2",
  "counter_3",
  "accepted",
  "rejected",
  "dead",
]);
export type NegotiationPhase = z.infer<typeof NegotiationPhaseEnum>;

export const NegotiationDialogueSchema = z.object({
  speaker: z.enum(["rival_gm", "agm_advisor"]),
  text: z.string().min(1),
  tone: z.string().min(1),
});
export type NegotiationDialogue = z.infer<typeof NegotiationDialogueSchema>;

export const CounterOfferSchema = z.object({
  round: z.number().int().min(1),
  addedByAI: z.array(z.string()).default([]),
  removedByAI: z.array(z.string()).default([]),
  adjustedValuationGap: z.number(),
});
export type CounterOffer = z.infer<typeof CounterOfferSchema>;

export const NegotiationProposalSchema = z.object({
  fromTeamId: z.string(),
  toTeamId: z.string(),
  offering: z.array(z.string()).default([]),
  requesting: z.array(z.string()).default([]),
  valuationGap: z.number(),
});
export type NegotiationProposal = z.infer<typeof NegotiationProposalSchema>;

export const PersistentNegotiationContextSchema = z.object({
  currentDay: z.number().int().min(1),
  fromTeamId: z.string(),
  toTeamId: z.string(),
  protectedPlayerIds: z.array(z.string()).default([]),
  unavailablePlayerIds: z.array(z.string()).default([]),
});
export type PersistentNegotiationContext = z.infer<typeof PersistentNegotiationContextSchema>;

export const PersistentNegotiationStateSchema = z.object({
  id: z.string(),
  phase: NegotiationPhaseEnum,
  proposal: NegotiationProposalSchema,
  context: PersistentNegotiationContextSchema,
  counterOffers: z.array(CounterOfferSchema).default([]),
  roundsCompleted: z.number().int().min(0),
  expiresAtDay: z.number().int().min(1),
  dialogue: z.array(NegotiationDialogueSchema).default([]),
  relationshipChange: z.number(),
});
export type PersistentNegotiationState = z.infer<typeof PersistentNegotiationStateSchema>;

export const TradeParticipantRoleEnum = z.enum([
  "initiator",
  "partner",
  "facilitator",
]);
export type TradeParticipantRole = z.infer<typeof TradeParticipantRoleEnum>;

export const TradeParticipantSchema = z.object({
  teamId: z.string(),
  sending: z.array(z.string()).default([]),
  receiving: z.array(z.string()).default([]),
  role: TradeParticipantRoleEnum,
});
export type TradeParticipant = z.infer<typeof TradeParticipantSchema>;

export const TradeConditionTypeEnum = z.enum([
  "performance",
  "games_played",
  "award",
  "playoff",
]);
export type TradeConditionType = z.infer<typeof TradeConditionTypeEnum>;

export const TradeConditionSchema = z.object({
  type: TradeConditionTypeEnum,
  threshold: z.number(),
  playerId: z.string(),
  deadline: z.number().int().min(1),
  description: z.string().min(1),
});
export type TradeCondition = z.infer<typeof TradeConditionSchema>;

export const MultiTeamProposalSchema = z.object({
  teams: z.array(TradeParticipantSchema).min(3).default([]),
  conditions: z.array(TradeConditionSchema).default([]),
});
export type MultiTeamProposal = z.infer<typeof MultiTeamProposalSchema>;

export const PendingTradeSchema = z.object({
  id: z.string(),
  requiredPlayerId: z.string().optional(),
  triggerCondition: z.string().min(1),
});
export type PendingTrade = z.infer<typeof PendingTradeSchema>;

export const TradeStateSchema = z.object({
  pendingOffers: z.array(PersistentTradeOfferSchema),
  tradeHistory: z.array(TradeHistoryEntrySchema),
  negotiations: z.array(PersistentNegotiationStateSchema).default([]),
  multiTeamPendingTrades: z.array(PendingTradeSchema).default([]),
});
export type TradeState = z.infer<typeof TradeStateSchema>;
