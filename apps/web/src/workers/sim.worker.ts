import * as Comlink from 'comlink';
import { actionApi } from './sim.worker.actions.js';
import {
  advanceDayOneIntro,
  advanceDayOneOrgReview,
  applyScoutingHire,
  applyStaffHires,
  chooseDayOneAGM,
  completeOnboarding,
  completeRevisedOnboarding,
  finishDayOne,
  getAGMCandidates,
  getDayOneSession,
  getOnboardingData,
  getRevisedOnboardingData,
  resolveDayOneCrisis,
  setDayOneBudgetAllocation,
  setDayOneDevelopmentPlan,
  setDayOneOpeningPlan,
  setDayOneSeasonGoal,
} from './sim.worker.onboarding.js';
import { queryApi } from './sim.worker.queries.js';

const onboardingApi = {
  getDayOneSession,
  advanceDayOneIntro,
  chooseDayOneAGM,
  advanceDayOneOrgReview,
  setDayOneSeasonGoal,
  setDayOneBudgetAllocation,
  setDayOneOpeningPlan,
  setDayOneDevelopmentPlan,
  resolveDayOneCrisis,
  finishDayOne,
  getOnboardingData,
  completeOnboarding,
  getAGMCandidates,
  getRevisedOnboardingData,
  applyStaffHires,
  applyScoutingHire,
  completeRevisedOnboarding,
};

/**
 * Web Worker entry point.
 * The worker owns simulation state and exposes a stable Comlink API.
 */
export const api = {
  ping() {
    return { pong: true as const, timestamp: Date.now() };
  },
  ...actionApi,
  ...queryApi,
  ...onboardingApi,
};

export type WorkerApi = typeof api;
Comlink.expose(api);
