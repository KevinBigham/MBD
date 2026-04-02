/**
 * @module offseason
 * Offseason phase sequencing: arbitration → tender/non-tender → qualifying offers →
 * free agency → draft → rule 5 → international signing → spring training.
 * Pure engine logic — no React, no DOM.
 */

import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const OFFSEASON_PHASES = [
  'season_review',
  'arbitration',
  'tender_nontender',
  'qualifying_offers',
  'free_agency',
  'draft',
  'protection_audit',
  'rule5_draft',
  'international_signing',
  'spring_training',
] as const;

export type OffseasonPhase = (typeof OFFSEASON_PHASES)[number];

/** Days allocated to each phase */
const PHASE_DURATIONS: Record<OffseasonPhase, number> = {
  season_review: 3,
  arbitration: 7,
  tender_nontender: 5,
  qualifying_offers: 4,
  free_agency: 30,
  draft: 3,
  protection_audit: 4,
  rule5_draft: 3,
  international_signing: 10,
  spring_training: 12,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OffseasonState {
  readonly season: number;
  readonly currentPhase: OffseasonPhase;
  readonly phaseDay: number;          // Day within current phase
  readonly totalDay: number;          // Overall offseason day
  readonly completed: boolean;
  readonly phaseResults: PhaseResults;
}

export interface PhaseResults {
  arbitrationResolved: ArbitrationResult[];
  tenderedPlayers: string[];          // Player IDs that were tendered
  nonTenderedPlayers: string[];       // Player IDs that were non-tendered (become FAs)
  freeAgentSignings: FASigningResult[];
  draftPicks: DraftPickResult[];
  ifaSignings: IFASigningResult[];
  retiredPlayers: RetirementResult[];
}

export interface ArbitrationResult {
  playerId: string;
  teamId: string;
  previousSalary: number;
  newSalary: number;
  teamWon: boolean;     // True if team's offer was accepted
}

export interface FASigningResult {
  playerId: string;
  teamId: string;
  years: number;
  annualSalary: number;
  totalValue: number;
}

export interface DraftPickResult {
  round: number;
  pickNumber: number;
  teamId: string;
  playerId: string;
  playerName: string;
  position: string;
  scoutingGrade: number;
  origin: string;
}

export interface IFASigningResult {
  playerId: string;
  teamId: string;
  playerName: string;
  position: string;
  country: string;
  bonusAmount: number;
}

export interface RetirementResult {
  playerId: string;
  teamId: string;
  playerName: string;
  seasonsPlayed: number;
  summary: string;
}

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

/** Create a fresh offseason state for a given season. */
export function createOffseasonState(season: number): OffseasonState {
  return {
    season,
    currentPhase: 'season_review',
    phaseDay: 1,
    totalDay: 1,
    completed: false,
    phaseResults: {
      arbitrationResolved: [],
      tenderedPlayers: [],
      nonTenderedPlayers: [],
      freeAgentSignings: [],
      draftPicks: [],
      ifaSignings: [],
      retiredPlayers: [],
    },
  };
}

/** Get the total number of offseason days. */
export function getOffseasonLength(): number {
  let total = 0;
  for (const phase of OFFSEASON_PHASES) {
    total += PHASE_DURATIONS[phase];
  }
  return total;
}

/** Get the phase index (0-based). */
export function getPhaseIndex(phase: OffseasonPhase): number {
  return OFFSEASON_PHASES.indexOf(phase);
}

/** Get the next phase, or null if offseason is complete. */
export function getNextPhase(current: OffseasonPhase): OffseasonPhase | null {
  const idx = OFFSEASON_PHASES.indexOf(current);
  if (idx < 0 || idx >= OFFSEASON_PHASES.length - 1) return null;
  return OFFSEASON_PHASES[idx + 1]!;
}

/** Get the duration (in days) for a given phase. */
export function getPhaseDuration(phase: OffseasonPhase): number {
  return PHASE_DURATIONS[phase];
}

// ---------------------------------------------------------------------------
// Phase advancement
// ---------------------------------------------------------------------------

/**
 * Advance the offseason by one day.
 * Returns the updated state. When a phase ends, transitions to the next.
 * When all phases complete, sets completed = true.
 */
export function advanceOffseasonDay(state: OffseasonState): OffseasonState {
  if (state.completed) return state;

  const phaseDuration = PHASE_DURATIONS[state.currentPhase];
  const nextPhaseDay = state.phaseDay + 1;

  // Still within current phase
  if (nextPhaseDay <= phaseDuration) {
    return {
      ...state,
      phaseDay: nextPhaseDay,
      totalDay: state.totalDay + 1,
    };
  }

  // Phase complete — move to next
  const nextPhase = getNextPhase(state.currentPhase);
  if (nextPhase === null) {
    // All phases done
    return {
      ...state,
      totalDay: state.totalDay + 1,
      completed: true,
    };
  }

  return {
    ...state,
    currentPhase: nextPhase,
    phaseDay: 1,
    totalDay: state.totalDay + 1,
  };
}

/**
 * Skip to the end of the current phase.
 * Useful for phases where the user has no actions to take.
 */
export function skipCurrentPhase(state: OffseasonState): OffseasonState {
  if (state.completed) return state;

  const nextPhase = getNextPhase(state.currentPhase);
  if (nextPhase === null) {
    return { ...state, completed: true };
  }

  const daysSkipped = PHASE_DURATIONS[state.currentPhase] - state.phaseDay;
  return {
    ...state,
    currentPhase: nextPhase,
    phaseDay: 1,
    totalDay: state.totalDay + daysSkipped + 1,
  };
}

// ---------------------------------------------------------------------------
// Phase result recording
// ---------------------------------------------------------------------------

/** Record an arbitration result. */
export function recordArbitration(
  state: OffseasonState,
  result: ArbitrationResult,
): OffseasonState {
  return {
    ...state,
    phaseResults: {
      ...state.phaseResults,
      arbitrationResolved: [...state.phaseResults.arbitrationResolved, result],
    },
  };
}

/** Record tender/non-tender decisions. */
export function recordTenderDecisions(
  state: OffseasonState,
  tendered: string[],
  nonTendered: string[],
): OffseasonState {
  return {
    ...state,
    phaseResults: {
      ...state.phaseResults,
      tenderedPlayers: [...state.phaseResults.tenderedPlayers, ...tendered],
      nonTenderedPlayers: [...state.phaseResults.nonTenderedPlayers, ...nonTendered],
    },
  };
}

/** Record a free agent signing. */
export function recordFASigning(
  state: OffseasonState,
  signing: FASigningResult,
): OffseasonState {
  return {
    ...state,
    phaseResults: {
      ...state.phaseResults,
      freeAgentSignings: [...state.phaseResults.freeAgentSignings, signing],
    },
  };
}

/** Record draft picks. */
export function recordDraftPicks(
  state: OffseasonState,
  picks: DraftPickResult[],
): OffseasonState {
  return {
    ...state,
    phaseResults: {
      ...state.phaseResults,
      draftPicks: [...state.phaseResults.draftPicks, ...picks],
    },
  };
}

export function recordIFASigning(
  state: OffseasonState,
  signing: IFASigningResult,
): OffseasonState {
  return {
    ...state,
    phaseResults: {
      ...state.phaseResults,
      ifaSignings: [...state.phaseResults.ifaSignings, signing],
    },
  };
}

/** Record retired players. */
export function recordRetirements(
  state: OffseasonState,
  retiredPlayers: RetirementResult[],
): OffseasonState {
  return {
    ...state,
    phaseResults: {
      ...state.phaseResults,
      retiredPlayers: [...state.phaseResults.retiredPlayers, ...retiredPlayers],
    },
  };
}

// ---------------------------------------------------------------------------
// AI auto-resolve helpers
// ---------------------------------------------------------------------------

/**
 * Auto-resolve the tender/non-tender phase for AI teams.
 * Non-tender players with low rating relative to salary.
 */
export function autoResolveTenderNonTender(
  rng: GameRNG,
  teamId: string,
  players: GeneratedPlayer[],
  serviceTime: Map<string, number>,
): { tendered: string[]; nonTendered: string[] } {
  const teamPlayers = players.filter(
    p => p.teamId === teamId && p.rosterStatus === 'MLB',
  );

  const tendered: string[] = [];
  const nonTendered: string[] = [];

  for (const player of teamPlayers) {
    const years = serviceTime.get(player.id) ?? 0;
    // Only arb-eligible players need tender decisions (3-5 years service)
    if (years < 3 || years > 5) {
      tendered.push(player.id);
      continue;
    }

    // Non-tender if salary is disproportionate to value
    const salaryRatio = player.contract.annualSalary / Math.max(1, (player.overallRating / 550) * 20);
    if (salaryRatio > 1.5 || player.overallRating < 180) {
      nonTendered.push(player.id);
    } else {
      tendered.push(player.id);
    }
  }

  return { tendered, nonTendered };
}

/**
 * Determine which players should retire this offseason.
 * Uses age and rating as primary factors.
 */
export function determineRetirements(
  rng: GameRNG,
  players: GeneratedPlayer[],
): string[] {
  const retired: string[] = [];

  for (const player of players) {
    if (player.age < 32) continue;

    let retireChance = 0;

    // Age-based retirement chance
    if (player.age >= 38) {
      retireChance = 0.20 + (player.age - 38) * 0.15;
    } else if (player.age >= 36) {
      retireChance = 0.05;
    }

    // Low rating increases chance
    if (player.overallRating < 100) {
      retireChance += 0.30;
    } else if (player.overallRating < 150) {
      retireChance += 0.10;
    }

    // Low durability/stamina increases chance
    const durabilityAttr = player.pitcherAttributes
      ? player.pitcherAttributes.stamina
      : player.hitterAttributes.durability;
    if (durabilityAttr < 80) {
      retireChance += 0.10;
    }

    retireChance = Math.min(retireChance, 0.95);

    if (retireChance > 0 && rng.nextFloat() < retireChance) {
      retired.push(player.id);
    }
  }

  return retired;
}

// ---------------------------------------------------------------------------
// Offseason summary
// ---------------------------------------------------------------------------

export interface OffseasonSummary {
  season: number;
  totalArbitrations: number;
  totalNonTendered: number;
  totalSignings: number;
  totalDraftPicks: number;
  totalRetirements: number;
  topSigning: FASigningResult | null;
  topDraftPick: DraftPickResult | null;
}

/** Generate a summary of the offseason. */
export function summarizeOffseason(state: OffseasonState): OffseasonSummary {
  const results = state.phaseResults;

  const topSigning = results.freeAgentSignings.length > 0
    ? results.freeAgentSignings.reduce((best, s) =>
        s.totalValue > best.totalValue ? s : best)
    : null;

  const topDraftPick = results.draftPicks.length > 0
    ? results.draftPicks[0]! // First overall pick
    : null;

  return {
    season: state.season,
    totalArbitrations: results.arbitrationResolved.length,
    totalNonTendered: results.nonTenderedPlayers.length,
    totalSignings: results.freeAgentSignings.length,
    totalDraftPicks: results.draftPicks.length,
    totalRetirements: results.retiredPlayers.length,
    topSigning,
    topDraftPick,
  };
}
