import { z } from "zod";

export const ScoutReportSchema = z.object({
  playerId: z.string(),
  scoutId: z.string(),
  overallGrade: z.number().int().min(20).max(80),
  confidence: z.number().int().min(0).max(100),
  attributes: z.record(z.string(), z.number().int().min(20).max(80)),
  notes: z.string(),
  date: z.string(),
});
export type ScoutReport = z.infer<typeof ScoutReportSchema>;

export const DraftProspectBackgroundEnum = z.enum([
  "college_senior",
  "college_underclass",
  "high_school",
]);
export type DraftProspectBackground = z.infer<typeof DraftProspectBackgroundEnum>;

export const DraftScoutingReportSchema = z.object({
  playerId: z.string(),
  looks: z.number().int().min(1),
  accuracy: z.number().min(0.5).max(0.95),
  observedRatings: z.record(z.string(), z.number().int().min(20).max(80)),
  overallGrade: z.number().int().min(20).max(80),
  confidence: z.number().int().min(1).max(20),
  ceiling: z.number().int().min(20).max(80),
  floor: z.number().int().min(20).max(80),
  notes: z.string(),
  reliability: z.number().min(0.5).max(0.95),
});
export type DraftScoutingReport = z.infer<typeof DraftScoutingReportSchema>;

export const DraftSignabilitySchema = z.object({
  playerId: z.string(),
  background: DraftProspectBackgroundEnum,
  commitmentStrength: z.number().min(0).max(1),
  signability: z.number().min(0).max(1),
  slotValue: z.number().min(0),
  askBonus: z.number().min(0),
});
export type DraftSignability = z.infer<typeof DraftSignabilitySchema>;

export const DraftPickOwnershipSchema = z.object({
  season: z.number().int().min(1),
  round: z.number().int().min(1),
  originalTeamId: z.string(),
  currentTeamId: z.string(),
  forfeited: z.boolean(),
});
export type DraftPickOwnership = z.infer<typeof DraftPickOwnershipSchema>;

export const DraftCompensatoryPickSchema = z.object({
  id: z.string(),
  season: z.number().int().min(1),
  awardedToTeamId: z.string(),
  compensationForPlayerId: z.string(),
  compensationFromTeamId: z.string(),
  order: z.number().int().min(1),
});
export type DraftCompensatoryPick = z.infer<typeof DraftCompensatoryPickSchema>;

export const QualifyingOfferStatusEnum = z.enum([
  "offered",
  "accepted",
  "rejected",
  "compensated",
  "expired",
]);
export type QualifyingOfferStatus = z.infer<typeof QualifyingOfferStatusEnum>;

export const QualifyingOfferRecordSchema = z.object({
  playerId: z.string(),
  teamId: z.string(),
  season: z.number().int().min(1),
  marketValue: z.number().min(0),
  amount: z.number().min(0),
  status: QualifyingOfferStatusEnum,
  signingTeamId: z.string().nullable(),
  compensationPickId: z.string().nullable(),
});
export type QualifyingOfferRecord = z.infer<typeof QualifyingOfferRecordSchema>;

export const DraftSigningDecisionSchema = z.object({
  playerId: z.string(),
  teamId: z.string(),
  season: z.number().int().min(1),
  signed: z.boolean(),
  offeredBonus: z.number().min(0),
  agreedBonus: z.number().min(0).nullable(),
  returnPath: z.enum(["organization", "college"]),
});
export type DraftSigningDecision = z.infer<typeof DraftSigningDecisionSchema>;

export const DraftPickSchema = z.object({
  round: z.number().int().min(1),
  pickNumber: z.number().int().min(1),
  teamId: z.string(),
  playerId: z.string().optional(),
});
export type DraftPick = z.infer<typeof DraftPickSchema>;

export const DraftClassSchema = z.object({
  year: z.number().int(),
  picks: z.array(DraftPickSchema),
});
export type DraftClass = z.infer<typeof DraftClassSchema>;
