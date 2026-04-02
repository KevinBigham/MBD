import { z } from "zod";

export const DivisionEnum = z.enum([
  "AL_EAST",
  "AL_CENTRAL",
  "AL_WEST",
  "NL_EAST",
  "NL_CENTRAL",
  "NL_WEST",
]);
export type Division = z.infer<typeof DivisionEnum>;

export const OwnerArchetypeEnum = z.enum([
  "win_now",
  "patient_builder",
  "penny_pincher",
]);
export type OwnerArchetype = z.infer<typeof OwnerArchetypeEnum>;

export const TeamSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  city: z.string().min(1),
  abbreviation: z.string().length(3),
  division: DivisionEnum,
  parkFactor: z.number().min(0.85).max(1.15),
  payroll: z.number().min(0),
  ownerArchetype: OwnerArchetypeEnum,
  chemistryRating: z.number().int().min(0).max(100),
});
export type Team = z.infer<typeof TeamSchema>;
