import { z } from "zod";

export const AffiliateLevelEnum = z.enum([
  "AAA",
  "AA",
  "A_PLUS",
  "A",
  "ROOKIE",
]);
export type AffiliateLevel = z.infer<typeof AffiliateLevelEnum>;

export const AffiliatePlayerStatsSchema = z.object({
  playerId: z.string(),
  games: z.number().int().min(0),
  pa: z.number().int().min(0),
  hits: z.number().int().min(0),
  hr: z.number().int().min(0),
  rbi: z.number().int().min(0),
  bb: z.number().int().min(0),
  k: z.number().int().min(0),
  ipOuts: z.number().int().min(0),
  earnedRuns: z.number().int().min(0),
  strikeouts: z.number().int().min(0),
  walks: z.number().int().min(0),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
});
export type AffiliatePlayerStats = z.infer<typeof AffiliatePlayerStatsSchema>;

export const AffiliateStateSchema = z.object({
  teamId: z.string(),
  level: AffiliateLevelEnum,
  season: z.number().int().min(1),
  gamesPlayed: z.number().int().min(0),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  runsScored: z.number().int(),
  runsAllowed: z.number().int(),
  playerStats: z.array(z.tuple([z.string(), AffiliatePlayerStatsSchema])),
});
export type AffiliateState = z.infer<typeof AffiliateStateSchema>;

export const WaiverClaimSchema = z.object({
  playerId: z.string(),
  fromTeamId: z.string(),
  toTeamId: z.string().nullable(),
  season: z.number().int().min(1),
  day: z.number().int().min(1),
  priorityTeamIds: z.array(z.string()),
  status: z.enum(["pending", "claimed", "cleared"]),
  salary: z.number().min(0),
});
export type WaiverClaim = z.infer<typeof WaiverClaimSchema>;

export const AffiliateBoxScoreSchema = z.object({
  id: z.string(),
  season: z.number().int().min(1),
  day: z.number().int().min(1),
  level: AffiliateLevelEnum,
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  summary: z.string(),
  notablePlayerIds: z.array(z.string()),
});
export type AffiliateBoxScore = z.infer<typeof AffiliateBoxScoreSchema>;

export const MinorLeagueStateSchema = z.object({
  serviceTimeLedger: z.array(z.tuple([z.string(), z.number().int().min(0)])),
  optionUsage: z.array(z.tuple([z.string(), z.array(z.number().int().min(0))])),
  waiverClaims: z.array(WaiverClaimSchema),
  affiliateStates: z.array(AffiliateStateSchema),
  affiliateBoxScores: z.array(AffiliateBoxScoreSchema),
});
export type MinorLeagueState = z.infer<typeof MinorLeagueStateSchema>;
