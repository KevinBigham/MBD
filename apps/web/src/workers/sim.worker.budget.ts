/**
 * @module sim.worker.budget
 *
 * Difficulty-aware budget helpers used by `sim.worker.helpers.ts` and
 * `sim.worker.setup.ts`. Lives in its own module so `helpers.ts` can pick up
 * the budget functions without statically importing `setup.ts` — that import
 * formed a runtime cycle (helpers ↔ setup) because `setup.ts` also imports
 * `createEmpty*` factories from `helpers.ts`.
 *
 * The `FullGameState` import is type-only and is therefore stripped at emit
 * by `verbatimModuleSyntax: true`, so there is no runtime edge back to
 * helpers.ts from this module.
 */
import type { Difficulty } from '@mbd/contracts';
import { frontOfficeFreeAgencyAppeal, getTeamBudget } from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';

export const DIFFICULTY_PROFILES: Record<Difficulty, {
  budgetMultiplier: number;
  tradeBias: number;
  aiCompetitiveBidMultiplier: number;
}> = {
  easy: {
    budgetMultiplier: 1.1,
    tradeBias: 8,
    aiCompetitiveBidMultiplier: 0.92,
  },
  standard: {
    budgetMultiplier: 1,
    tradeBias: 0,
    aiCompetitiveBidMultiplier: 1,
  },
  hard: {
    budgetMultiplier: 0.9,
    tradeBias: -8,
    aiCompetitiveBidMultiplier: 1.08,
  },
};

export function getDifficultyProfileForState(state: Pick<FullGameState, 'franchise'>) {
  return DIFFICULTY_PROFILES[state.franchise.difficulty];
}

export function difficultyAdjustValue(
  state: Pick<FullGameState, 'franchise' | 'userTeamId'>,
  teamId: string,
  value: number,
): number {
  if (teamId !== state.userTeamId) {
    return Math.round(value * 100) / 100;
  }
  return Math.round(value * getDifficultyProfileForState(state).budgetMultiplier * 100) / 100;
}

export function getDifficultyAdjustedBudget(
  state: Pick<FullGameState, 'franchise' | 'userTeamId'> & Partial<Pick<FullGameState, 'ownerState'>>,
  teamId: string,
): number {
  const baseBudget = state.ownerState?.get(teamId)?.annualBudget ?? getTeamBudget(teamId);
  return difficultyAdjustValue(state, teamId, baseBudget);
}

export function getTeamPayrollCap(
  state: Pick<FullGameState, 'franchise' | 'userTeamId'> & Partial<Pick<FullGameState, 'ownerState'>>,
  teamId: string,
): number {
  const value = state.ownerState?.get(teamId)?.payrollCap ?? (getDifficultyAdjustedBudget(state, teamId) * 0.92);
  return difficultyAdjustValue(state, teamId, value);
}

export function getTeamIFABonusPool(
  state: Pick<FullGameState, 'franchise' | 'userTeamId'> & Partial<Pick<FullGameState, 'ownerState'>>,
  teamId: string,
): number {
  const value = state.ownerState?.get(teamId)?.ifaBonusPool ?? Math.max(3.5, getDifficultyAdjustedBudget(state, teamId) * 0.0225);
  return difficultyAdjustValue(state, teamId, value);
}

export function getTeamFreeAgencyAppealScore(
  state: Pick<FullGameState, 'teamChemistry'> & Partial<Pick<FullGameState, 'frontOfficeState' | 'fanSentiment' | 'userTeamId' | 'franchise'>>,
  teamId: string,
): number {
  const chemistryScore = state.teamChemistry.get(teamId)?.score ?? 50;
  const reputationAppeal = frontOfficeFreeAgencyAppeal(state.frontOfficeState?.get(teamId)?.reputation ?? 50);
  const fanModifier = state.userTeamId === teamId && state.fanSentiment
    ? Math.max(-3, Math.min(3, Math.round((state.fanSentiment.score - 50) / 16)))
    : 0;
  const spendingModifier = state.userTeamId === teamId
    ? state.franchise?.gmPhilosophy?.spendingStyle === 'big_spender'
      ? 5
      : state.franchise?.gmPhilosophy?.spendingStyle === 'penny_pincher'
        ? -5
        : 1
    : 0;
  return Math.max(0, Math.min(100, Math.round((chemistryScore * 0.7) + (reputationAppeal * 0.3) + fanModifier + spendingModifier)));
}
