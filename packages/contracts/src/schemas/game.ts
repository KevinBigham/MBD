import { z } from "zod";

export const PAOutcomeEnum = z.enum([
  "BB",
  "K",
  "SINGLE",
  "DOUBLE",
  "TRIPLE",
  "HR",
  "GB_OUT",
  "FB_OUT",
  "LD_OUT",
  "HBP",
  "SAC_FLY",
  "SAC_BUNT",
  "DOUBLE_PLAY",
  "FIELDERS_CHOICE",
  "ERROR",
]);
export type PAOutcome = z.infer<typeof PAOutcomeEnum>;

export const PAResultSchema = z.object({
  outcome: PAOutcomeEnum,
  batterId: z.string(),
  pitcherId: z.string(),
  inning: z.number().int().min(1),
  halfInning: z.enum(['top', 'bottom']),
  outs: z.number().int().min(0).max(2),
  runnersOn: z.number().int().min(0).max(3),
  scoreBefore: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  scoreAfter: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  rbiOnPlay: z.number().int().min(0),
  isWalkOff: z.boolean(),
});
export type PAResult = z.infer<typeof PAResultSchema>;

export const InningHalfEnum = z.enum(['top', 'bottom']);
export type InningHalf = z.infer<typeof InningHalfEnum>;

export const GameResultSchema = z.object({
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  innings: z.number().int().min(1),
  paResults: z.array(PAResultSchema),
  winningPitcherId: z.string().optional(),
  losingPitcherId: z.string().optional(),
  savePitcherId: z.string().nullable().optional(),
  date: z.string(),
  isPlayoff: z.boolean(),
});
export type GameResult = z.infer<typeof GameResultSchema>;
