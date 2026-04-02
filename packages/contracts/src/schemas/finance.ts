import { z } from "zod";

export const ContractDetailSchema = z.object({
  playerId: z.string(),
  years: z.number().int().min(0),
  annualSalaries: z.array(z.number().min(0)),
  noTradeClause: z.boolean(),
  noTradeClauseType: z.enum(["none", "partial", "full"]).optional(),
  playerOption: z.number().int().min(1).optional(),
  teamOption: z.number().int().min(1).optional(),
  optOutYears: z.array(z.number().int().min(1)).optional(),
  vestingOption: z
    .object({
      year: z.number().int().min(1),
      threshold: z.string(),
      value: z.number().min(0),
    })
    .optional(),
  signingBonus: z.number().min(0),
  buyoutAmount: z.number().min(0).optional(),
  deferredMoney: z
    .array(
      z.object({
        yearOffset: z.number().int().min(0),
        amount: z.number().min(0),
      }),
    )
    .optional(),
  totalValue: z.number().min(0),
});
export type ContractDetail = z.infer<typeof ContractDetailSchema>;
