import { z } from "zod";

export const CoachRoleEnum = z.enum([
  "manager",
  "pitching_coach",
  "hitting_coach",
  "bench_coach",
  "bullpen_coach",
  "first_base_coach",
  "third_base_coach",
  "farm_director",
  "rookie_coordinator",
  "a_coordinator",
  "aa_coordinator",
  "aaa_coordinator",
]);
export type CoachRole = z.infer<typeof CoachRoleEnum>;

export const CoachSpecialtyEnum = z.enum([
  "leadership",
  "power",
  "contact",
  "speed",
  "defense",
  "durability",
  "stuff",
  "control",
  "velocity",
  "breaking",
  "stamina",
  "mlb_prep",
]);
export type CoachSpecialty = z.infer<typeof CoachSpecialtyEnum>;

export const CoachSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: CoachRoleEnum,
  specialty: CoachSpecialtyEnum,
  teachingAbility: z.number().min(0.3).max(1),
  developmentBonus: z.number().min(0).max(0.3),
  personalityFit: z.number().min(0.3).max(1),
  experienceYears: z.number().int().min(0),
  contractYears: z.number().int().min(0),
  annualSalary: z.number().min(0),
  teamId: z.string().nullable(),
});
export type Coach = z.infer<typeof CoachSchema>;
