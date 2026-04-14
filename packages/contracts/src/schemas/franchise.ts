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

export const AGMCandidateIdEnum = z.enum([
  "marcus_chen",
  "elena_vargas",
  "walt_kowalski",
]);
export type AGMCandidateId = z.infer<typeof AGMCandidateIdEnum>;

export const GMPhilosophySchema = z.object({
  developmentStyle: z.enum(["aggressive", "patient", "balanced"]),
  spendingStyle: z.enum(["big_spender", "penny_pincher", "balanced"]),
  tradeApproach: z.enum(["buyer", "seller", "opportunistic"]),
  scoutingFocus: z.enum(["draft", "international", "pro_scouting"]),
  seasonGoal: z.enum(["championship", "playoff", "rebuild", "compete"]),
  mediaTone: z.enum(["confident", "humble", "measured"]),
});
export type GMPhilosophy = z.infer<typeof GMPhilosophySchema>;

export const DayOneExperienceEnum = z.enum([
  "full",
  "quick",
]);
export type DayOneExperience = z.infer<typeof DayOneExperienceEnum>;

export const DayOneStatusEnum = z.enum([
  "pending",
  "in_progress",
  "complete",
]);
export type DayOneStatus = z.infer<typeof DayOneStatusEnum>;

export const DayOneCurrentStepEnum = z.enum([
  "owner_intro",
  "agm_select",
  "org_review",
  "season_goal",
  "budget",
  "opening_day_plan",
  "development",
  "crisis",
  "recap",
  "complete",
]);
export type DayOneCurrentStep = z.infer<typeof DayOneCurrentStepEnum>;

export const DayOneBudgetAllocationEnum = z.enum([
  "spend_now",
  "balanced",
  "future_flex",
]);
export type DayOneBudgetAllocation = z.infer<typeof DayOneBudgetAllocationEnum>;

export const DayOnePromotionStanceEnum = z.enum([
  "aggressive",
  "measured",
  "patient",
]);
export type DayOnePromotionStance = z.infer<typeof DayOnePromotionStanceEnum>;

export const DayOneCrisisTypeEnum = z.enum([
  "injury_shock",
  "prospect_pressure",
  "bullpen_instability",
  "rotation_hole",
]);
export type DayOneCrisisType = z.infer<typeof DayOneCrisisTypeEnum>;

export const DayOneBullpenPlanSchema = z.object({
  closerId: z.string().nullable().default(null),
  setupIds: z.array(z.string()).default([]),
  longReliefId: z.string().nullable().default(null),
});
export type DayOneBullpenPlan = z.infer<typeof DayOneBullpenPlanSchema>;

export const DayOneOpeningPlanSchema = z.object({
  lineupPlayerIds: z.array(z.string()).default([]),
  rotationPlayerIds: z.array(z.string()).default([]),
  bullpen: DayOneBullpenPlanSchema.nullable().default(null),
});
export type DayOneOpeningPlan = z.infer<typeof DayOneOpeningPlanSchema>;

export const DayOneStateSchema = z.object({
  experience: DayOneExperienceEnum.default("quick"),
  status: DayOneStatusEnum.default("complete"),
  currentStep: DayOneCurrentStepEnum.default("complete"),
  selectedAGMId: AGMCandidateIdEnum.nullable().default(null),
  seasonGoal: GMPhilosophySchema.shape.seasonGoal.nullable().default(null),
  budgetAllocation: DayOneBudgetAllocationEnum.nullable().default(null),
  developmentStyle: GMPhilosophySchema.shape.developmentStyle.nullable().default(null),
  promotionStance: DayOnePromotionStanceEnum.nullable().default(null),
  openingDayPlan: DayOneOpeningPlanSchema.nullable().default(null),
  crisisType: DayOneCrisisTypeEnum.nullable().default(null),
  crisisResponseId: z.string().nullable().default(null),
  quickStartRecapSeen: z.boolean().default(true),
});
export type DayOneState = z.infer<typeof DayOneStateSchema>;

export const ScoutingDirectorSnapshotSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  age: z.number().int().min(18).max(90),
  experience: z.number().int().min(0).max(80),
  specialty: GMPhilosophySchema.shape.scoutingFocus,
  networkStrength: z.number().int().min(40).max(80),
  evaluationAccuracy: z.number().int().min(40).max(80),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});
export type ScoutingDirectorSnapshot = z.infer<typeof ScoutingDirectorSnapshotSchema>;

export const FranchiseStateV15Schema = z.object({
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
export type FranchiseStateV15 = z.infer<typeof FranchiseStateV15Schema>;

export const FranchiseStateV17Schema = FranchiseStateV15Schema.extend({
  assistantGMId: AGMCandidateIdEnum.nullable().default(null),
  gmPhilosophy: GMPhilosophySchema.nullable().default(null),
  scoutingDirector: ScoutingDirectorSnapshotSchema.nullable().default(null),
});
export type FranchiseStateV17 = z.infer<typeof FranchiseStateV17Schema>;

export const FranchiseStateSchema = FranchiseStateV17Schema.extend({
  dayOne: DayOneStateSchema.default({
    experience: "quick",
    status: "complete",
    currentStep: "complete",
    selectedAGMId: null,
    seasonGoal: null,
    budgetAllocation: null,
    developmentStyle: null,
    promotionStance: null,
    openingDayPlan: null,
    crisisType: null,
    crisisResponseId: null,
    quickStartRecapSeen: true,
  }),
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
