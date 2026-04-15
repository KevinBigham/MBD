/**
 * @module enums
 * Shared player + roster constants/enums used across `player/` and `roster/`.
 * Hosted in its own module so neither directory has to import the other to
 * pick up these values, breaking the historical
 * `generation.ts ↔ rosterManager.ts ↔ rule5.ts` runtime cycle.
 *
 * Pure data only — no logic, no imports.
 */

/** Pitching positions. */
export const PITCHER_POSITIONS = ['SP', 'RP', 'CL'] as const;

/** Roster level definitions, ordered loosely from highest to lowest. */
export const ROSTER_LEVELS = ['MLB', 'AAA', 'AA', 'A_PLUS', 'A', 'ROOKIE', 'INTERNATIONAL'] as const;
export type RosterLevel = (typeof ROSTER_LEVELS)[number];

/** 40-man roster limit. */
export const FORTY_MAN_LIMIT = 40;
