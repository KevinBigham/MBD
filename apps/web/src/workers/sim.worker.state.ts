import type { MonthlyPulseState } from '@mbd/contracts';

export function createEmptyMonthlyPulseState(): MonthlyPulseState {
  return {
    pendingReport: null,
    decisionQueue: [],
  };
}
