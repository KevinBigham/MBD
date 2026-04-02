import { z } from "zod";

export const DecisionSpotlightUrgencyEnum = z.enum(["red", "yellow", "blue"]);
export type DecisionSpotlightUrgency = z.infer<typeof DecisionSpotlightUrgencyEnum>;

export const MonthlyPlayerOfTheMonthSchema = z.object({
  playerId: z.string(),
  playerName: z.string().min(1),
  position: z.string().min(1),
  war: z.number(),
});
export type MonthlyPlayerOfTheMonth = z.infer<typeof MonthlyPlayerOfTheMonthSchema>;

export const ScheduleDifficultySchema = z.object({
  score: z.number().min(0).max(100),
  label: z.string().min(1),
  summary: z.string().min(1),
});
export type ScheduleDifficulty = z.infer<typeof ScheduleDifficultySchema>;

export const MonthlyReportSchema = z.object({
  id: z.string(),
  season: z.number().int().min(1),
  month: z.number().int().min(1).max(12),
  monthLabel: z.string().min(1),
  startDay: z.number().int().min(1),
  endDay: z.number().int().min(1),
  teamRecord: z.string().min(3),
  overallRecord: z.string().min(3),
  divisionRank: z.number().int().min(1),
  divisionMovement: z.number().int(),
  playerOfTheMonth: MonthlyPlayerOfTheMonthSchema.nullable(),
  keyInjuries: z.array(z.string()),
  keyReturns: z.array(z.string()),
  tradeDeadlineCountdown: z.number().int().min(0).nullable(),
  upcomingScheduleDifficulty: ScheduleDifficultySchema,
});
export type MonthlyReport = z.infer<typeof MonthlyReportSchema>;

export const DecisionSpotlightItemSchema = z.object({
  id: z.string(),
  urgency: DecisionSpotlightUrgencyEnum,
  title: z.string().min(1),
  body: z.string().min(1),
  route: z.string().min(1),
  actionLabel: z.string().min(1),
});
export type DecisionSpotlightItem = z.infer<typeof DecisionSpotlightItemSchema>;

export const MonthlyPulseStateSchema = z.object({
  pendingReport: MonthlyReportSchema.nullable(),
  decisionQueue: z.array(DecisionSpotlightItemSchema),
});
export type MonthlyPulseState = z.infer<typeof MonthlyPulseStateSchema>;
