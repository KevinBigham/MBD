import { z } from "zod";

export const PositionEnum = z.enum([
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "DH",
  "SP",
  "RP",
  "CL",
]);
export type Position = z.infer<typeof PositionEnum>;

export const DevelopmentPhaseEnum = z.enum([
  "Prospect",
  "Ascent",
  "Prime",
  "Decline",
  "Retirement",
]);
export type DevelopmentPhase = z.infer<typeof DevelopmentPhaseEnum>;

export const RosterStatusEnum = z.enum([
  "MLB",
  "AAA",
  "AA",
  "A_PLUS",
  "A",
  "ROOKIE",
  "INTERNATIONAL",
  "FREE_AGENT",
  "RETIRED",
]);
export type RosterStatus = z.infer<typeof RosterStatusEnum>;

export const MinorLeagueLevelEnum = z.enum([
  "AAA",
  "AA",
  "A_PLUS",
  "A",
  "ROOKIE",
  "INTERNATIONAL",
]);
export type MinorLeagueLevel = z.infer<typeof MinorLeagueLevelEnum>;

export const DevelopmentProgramEnum = z.enum([
  "tools",
  "fundamentals",
  "refinement",
  "mlb_prep",
  "power",
  "contact",
  "speed",
  "defense",
  "control",
  "velocity",
  "breaking",
  "stamina",
]);
export type DevelopmentProgram = z.infer<typeof DevelopmentProgramEnum>;

export const DevelopmentTrajectoryEnum = z.enum([
  "ahead_of_curve",
  "on_track",
  "below_expectations",
  "bust_risk",
]);
export type DevelopmentTrajectory = z.infer<typeof DevelopmentTrajectoryEnum>;

export const NoTradeClauseTypeEnum = z.enum([
  "none",
  "partial",
  "full",
]);
export type NoTradeClauseType = z.infer<typeof NoTradeClauseTypeEnum>;

const attributeRating = z.number().int().min(0).max(550);

export const HitterAttributesSchema = z.object({
  contact: attributeRating,
  power: attributeRating,
  eye: attributeRating,
  speed: attributeRating,
  defense: attributeRating,
  durability: attributeRating,
});
export type HitterAttributes = z.infer<typeof HitterAttributesSchema>;

export const PitcherAttributesSchema = z.object({
  stuff: attributeRating,
  control: attributeRating,
  stamina: attributeRating,
  velocity: attributeRating,
  movement: attributeRating,
});
export type PitcherAttributes = z.infer<typeof PitcherAttributesSchema>;

export const PersonalitySchema = z.object({
  workEthic: z.number().int().min(0).max(100),
  mentalToughness: z.number().int().min(0).max(100),
  leadership: z.number().int().min(0).max(100),
  competitiveness: z.number().int().min(0).max(100),
});
export type Personality = z.infer<typeof PersonalitySchema>;

export const PersonalityTraitSchema = z.string().min(1);
export type PersonalityTrait = z.infer<typeof PersonalityTraitSchema>;

export const InjurySchema = z.object({
  type: z.string(),
  severity: z.number().int().min(1).max(5),
  gamesRemaining: z.number().int().min(0),
});
export type Injury = z.infer<typeof InjurySchema>;

export const DeferredMoneyInstallmentSchema = z.object({
  yearOffset: z.number().int().min(0),
  amount: z.number().min(0),
});
export type DeferredMoneyInstallment = z.infer<
  typeof DeferredMoneyInstallmentSchema
>;

export const ExtensionHistoryEntrySchema = z.object({
  season: z.number().int().min(1),
  teamId: z.string(),
  years: z.number().int().min(0),
  annualSalary: z.number().min(0),
  totalValue: z.number().min(0),
  outcome: z.enum(["accepted", "rejected", "countered"]),
});
export type ExtensionHistoryEntry = z.infer<
  typeof ExtensionHistoryEntrySchema
>;

export const ContractSchema = z.object({
  years: z.number().int().min(0),
  annualSalary: z.number().min(0),
  totalValue: z.number().min(0).optional(),
  noTradeClause: z.boolean(),
  noTradeClauseType: NoTradeClauseTypeEnum.optional(),
  playerOption: z.boolean(),
  teamOption: z.boolean(),
  optOutYears: z.array(z.number().int().min(1)).optional(),
  signingBonus: z.number().min(0).optional(),
  buyoutAmount: z.number().min(0).optional(),
  deferredMoney: z.array(DeferredMoneyInstallmentSchema).optional(),
});
export type Contract = z.infer<typeof ContractSchema>;

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  age: z.number().int().min(16).max(50),
  position: PositionEnum,
  hitterAttributes: HitterAttributesSchema,
  pitcherAttributes: PitcherAttributesSchema.optional(),
  personality: PersonalitySchema,
  contract: ContractSchema,
  rosterStatus: RosterStatusEnum,
  developmentPhase: DevelopmentPhaseEnum,
  injury: InjurySchema.optional(),
  teamId: z.string(),
  rule5EligibleAfterSeason: z.number().int().min(1),
  serviceTimeDays: z.number().int().min(0),
  optionYearsUsed: z.number().int().min(0),
  isOutOfOptions: z.boolean(),
  minorLeagueLevel: MinorLeagueLevelEnum.nullable(),
  ceiling: z.number().int().min(0).max(550).optional(),
  floor: z.number().int().min(0).max(550).optional(),
  developmentProgram: DevelopmentProgramEnum.optional(),
  developmentTrajectory: DevelopmentTrajectoryEnum.optional(),
  extensionHistory: z.array(ExtensionHistoryEntrySchema).optional(),
  personalityTraits: z.array(PersonalityTraitSchema).optional(),
});
export type Player = z.infer<typeof PlayerSchema>;
