import { z } from "zod";

const TradeMoneySchema = z.number().positive().refine(
  (value) => Number.isFinite(value) && Math.abs((value * 100) - Math.round(value * 100)) < 1e-8,
  "Trade money must be finite and use at most two decimal places.",
);

export const TradeContractReferenceSchema = z.object({
  annualSalary: TradeMoneySchema,
  contractEndSeasonExclusive: z.number().int().min(2),
});
export type TradeContractReference = z.infer<typeof TradeContractReferenceSchema>;

export const SalaryRetentionTermSchema = z.object({
  annualAmount: TradeMoneySchema,
  startSeason: z.number().int().min(1),
  endSeasonExclusive: z.number().int().min(2),
});
export type SalaryRetentionTerm = z.infer<typeof SalaryRetentionTermSchema>;

export const CashConsiderationTermSchema = z.object({
  amount: TradeMoneySchema,
  season: z.number().int().min(1),
});
export type CashConsiderationTerm = z.infer<typeof CashConsiderationTermSchema>;

export const PlayerTradeAssetV34Schema = z.object({
  type: z.literal("player"),
  playerId: z.string(),
}).strict();

const PlayerTradeAssetSchema = PlayerTradeAssetV34Schema.extend({
  contractReference: TradeContractReferenceSchema.optional(),
  retainedSalary: SalaryRetentionTermSchema.optional(),
  cashConsideration: CashConsiderationTermSchema.optional(),
});

function validatePlayerFinancialTerms(
  asset: z.infer<typeof PlayerTradeAssetSchema>,
  context: z.RefinementCtx,
) {
  if ((asset.retainedSalary || asset.cashConsideration) && !asset.contractReference) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Player-linked financial terms require an exact contract reference.",
      path: ["contractReference"],
    });
  }
  if (asset.retainedSalary
    && asset.retainedSalary.endSeasonExclusive > (asset.contractReference?.contractEndSeasonExclusive ?? 0)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Retained salary cannot extend beyond the referenced contract.",
      path: ["retainedSalary", "endSeasonExclusive"],
    });
  }
  if (asset.retainedSalary
    && asset.retainedSalary.startSeason >= asset.retainedSalary.endSeasonExclusive) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Retained salary must cover at least one season.",
      path: ["retainedSalary", "endSeasonExclusive"],
    });
  }
}

const DraftPickTradeAssetSchema = z.object({
  type: z.literal("draft_pick"),
  season: z.number().int().min(1),
  round: z.number().int().min(1),
  originalTeamId: z.string(),
});

const IFAPoolSpaceTradeAssetV34Schema = z.object({
  type: z.literal("ifa_pool_space"),
  amount: z.number().positive(),
});

const IFAPoolSpaceTradeAssetSchema = z.object({
  type: z.literal("ifa_pool_space"),
  amount: TradeMoneySchema,
});

export const TradeAssetSchema = z.discriminatedUnion("type", [
  PlayerTradeAssetSchema,
  DraftPickTradeAssetSchema,
  IFAPoolSpaceTradeAssetSchema,
]).superRefine((asset, context) => {
  if (asset.type === "player") validatePlayerFinancialTerms(asset, context);
});
export type TradeAsset = z.infer<typeof TradeAssetSchema>;

export const TradeAssetV34Schema = z.discriminatedUnion("type", [
  PlayerTradeAssetV34Schema,
  DraftPickTradeAssetSchema,
  IFAPoolSpaceTradeAssetV34Schema,
]);
export type TradeAssetV34 = z.infer<typeof TradeAssetV34Schema>;

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

const NormalizedTradeEntryV34Schema = NormalizedTradeEntrySchema.extend({
  offeringAssets: z.array(TradeAssetV34Schema),
  requestingAssets: z.array(TradeAssetV34Schema),
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

const PersistentTradeOfferV34Schema = z.preprocess(
  normalizeLegacyTradeEntry,
  NormalizedTradeEntryV34Schema.extend({
    message: z.string(),
    createdAt: z.string(),
  }),
);

const TradeHistoryEntryV34Schema = z.preprocess(
  normalizeLegacyTradeEntry,
  NormalizedTradeEntryV34Schema.extend({
    summary: z.string(),
    timestamp: z.string(),
  }),
);

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

const NegotiationProposalV34Schema = z.object({
  fromTeamId: z.string(),
  toTeamId: z.string(),
  offering: z.array(z.string()).default([]),
  requesting: z.array(z.string()).default([]),
  valuationGap: z.number(),
}).strict();

function normalizeNegotiationProposal(value: unknown) {
  if (typeof value !== "object" || value === null) return value;
  const proposal = value as {
    offering?: unknown;
    requesting?: unknown;
    offeringAssets?: unknown;
    requestingAssets?: unknown;
  };
  const offering = Array.isArray(proposal.offering)
    ? proposal.offering.filter((playerId): playerId is string => typeof playerId === "string")
    : [];
  const requesting = Array.isArray(proposal.requesting)
    ? proposal.requesting.filter((playerId): playerId is string => typeof playerId === "string")
    : [];
  return {
    ...value,
    offeringAssets: proposal.offeringAssets ?? offering.map((playerId) => ({
      type: "player" as const,
      playerId,
    })),
    requestingAssets: proposal.requestingAssets ?? requesting.map((playerId) => ({
      type: "player" as const,
      playerId,
    })),
  };
}

export const NegotiationProposalSchema = z.preprocess(
  normalizeNegotiationProposal,
  NegotiationProposalV34Schema.extend({
    offeringAssets: z.array(TradeAssetSchema),
    requestingAssets: z.array(TradeAssetSchema),
  }),
);
export type NegotiationProposal = z.infer<typeof NegotiationProposalSchema>;

export const PersistentNegotiationContextSchema = z.object({
  currentDay: z.number().int().min(1),
  fromTeamId: z.string(),
  toTeamId: z.string(),
  protectedPlayerIds: z.array(z.string()).default([]),
  unavailablePlayerIds: z.array(z.string()).default([]),
});
export type PersistentNegotiationContext = z.infer<typeof PersistentNegotiationContextSchema>;

const PersistentNegotiationStateShape = {
  id: z.string(),
  phase: NegotiationPhaseEnum,
  context: PersistentNegotiationContextSchema,
  counterOffers: z.array(CounterOfferSchema).default([]),
  roundsCompleted: z.number().int().min(0),
  expiresAtDay: z.number().int().min(1),
  dialogue: z.array(NegotiationDialogueSchema).default([]),
  relationshipChange: z.number(),
};

export const PersistentNegotiationStateSchema = z.object({
  ...PersistentNegotiationStateShape,
  proposal: NegotiationProposalSchema,
});
export type PersistentNegotiationState = z.infer<typeof PersistentNegotiationStateSchema>;

export const PersistentNegotiationStateV34Schema = z.object({
  ...PersistentNegotiationStateShape,
  proposal: NegotiationProposalV34Schema,
});

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

export const TradeStateV34Schema = z.object({
  pendingOffers: z.array(PersistentTradeOfferV34Schema),
  tradeHistory: z.array(TradeHistoryEntryV34Schema),
  negotiations: z.array(PersistentNegotiationStateV34Schema).default([]),
  multiTeamPendingTrades: z.array(PendingTradeSchema).default([]),
});
export type TradeStateV34 = z.infer<typeof TradeStateV34Schema>;
