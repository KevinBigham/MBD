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

export const TradeStateSchema = z.object({
  pendingOffers: z.array(PersistentTradeOfferSchema),
  tradeHistory: z.array(TradeHistoryEntrySchema),
});
export type TradeState = z.infer<typeof TradeStateSchema>;
