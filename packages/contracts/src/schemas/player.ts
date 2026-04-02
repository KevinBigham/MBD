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

export const InjurySchema = z.object({
  type: z.string(),
  severity: z.number().int().min(1).max(5),
  gamesRemaining: z.number().int().min(0),
});
export type Injury = z.infer<typeof InjurySchema>;

export const ContractSchema = z.object({
  years: z.number().int().min(0),
  annualSalary: z.number().min(0),
  noTradeClause: z.boolean(),
  playerOption: z.boolean(),
  teamOption: z.boolean(),
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
});
export type Player = z.infer<typeof PlayerSchema>;
