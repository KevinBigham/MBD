import { z } from "zod";

export const DifficultyEnum = z.enum([
  "easy",
  "standard",
  "hard",
]);
export type Difficulty = z.infer<typeof DifficultyEnum>;

export const PlayModeEnum = z.enum([
  "standard",
  "career",
  "scenario",
]);
export type PlayMode = z.infer<typeof PlayModeEnum>;

export const FranchiseOnboardingSchema = z.object({
  welcomeBriefingSeen: z.boolean(),
  firstMonthlyPulseSeen: z.boolean(),
});
export type FranchiseOnboarding = z.infer<typeof FranchiseOnboardingSchema>;

export const FranchiseStateSchema = z.object({
  gmName: z.string().min(1),
  difficulty: DifficultyEnum,
  playMode: PlayModeEnum.default("standard"),
  createdAt: z.string(),
  teamId: z.string(),
  teamName: z.string().min(1),
  teamAbbreviation: z.string().min(1),
  teamDivision: z.string().min(1),
  status: z.enum(["active", "fired"]).optional(),
  endedAt: z.string().nullable().optional(),
  endReason: z.string().nullable().optional(),
  onboarding: FranchiseOnboardingSchema,
});
export type FranchiseState = z.infer<typeof FranchiseStateSchema>;

export const CeremonySoundEffectEnum = z.enum([
  "achievement_unlock",
  "playoff_clinch",
  "prospect_callup",
  "walk_off",
  "win",
  "world_series_win",
]);
export type CeremonySoundEffect = z.infer<typeof CeremonySoundEffectEnum>;

export const CeremonyMomentTypeEnum = z.enum([
  "playoff_clinch",
  "series_win",
  "world_series_win",
  "achievement",
  "award",
  "hall_of_fame",
  "career_milestone",
  "prospect_debut",
  "record_broken",
]);
export type CeremonyMomentType = z.infer<typeof CeremonyMomentTypeEnum>;

export const CeremonyMomentThemeEnum = z.enum([
  "celebration",
  "future",
  "historic",
  "spotlight",
]);
export type CeremonyMomentTheme = z.infer<typeof CeremonyMomentThemeEnum>;

export const CeremonyMomentSchema = z.object({
  id: z.string(),
  type: CeremonyMomentTypeEnum,
  title: z.string().min(1),
  subtitle: z.string().min(1),
  detailLines: z.array(z.string()),
  soundEffect: CeremonySoundEffectEnum,
  autoDismissMs: z.number().int().min(1000).max(10000),
  createdAt: z.string(),
  theme: CeremonyMomentThemeEnum,
  relatedTeamIds: z.array(z.string()),
  relatedPlayerIds: z.array(z.string()),
});
export type CeremonyMoment = z.infer<typeof CeremonyMomentSchema>;

export const CeremonyStateSchema = z.object({
  pendingMoments: z.array(CeremonyMomentSchema),
  seenMomentIds: z.array(z.string()),
});
export type CeremonyState = z.infer<typeof CeremonyStateSchema>;

export const AchievementUnlockSchema = z.object({
  id: z.string(),
  unlockedAt: z.string(),
  season: z.number().int().min(1),
  teamId: z.string(),
  summary: z.string(),
});
export type AchievementUnlock = z.infer<typeof AchievementUnlockSchema>;

export const AchievementProgressSchema = z.object({
  current: z.number(),
  target: z.number(),
  summary: z.string().optional(),
});
export type AchievementProgress = z.infer<typeof AchievementProgressSchema>;

export const AchievementStateSchema = z.object({
  unlocked: z.array(AchievementUnlockSchema),
  progress: z.array(z.tuple([z.string(), AchievementProgressSchema])),
  counters: z.array(z.tuple([z.string(), z.number()])),
  ledgers: z.array(z.tuple([z.string(), z.array(z.string())])).default([]),
});
export type AchievementState = z.infer<typeof AchievementStateSchema>;
