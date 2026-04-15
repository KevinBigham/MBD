import type { FanSentiment, JobMarket, MonthlyPulseState } from '@mbd/contracts';

export function createEmptyMonthlyPulseState(): MonthlyPulseState {
  return {
    pendingReport: null,
    decisionQueue: [],
  };
}

export function createEmptyJobMarket(): JobMarket {
  return {
    availableJobs: [],
    applicationDeadlineSeason: null,
  };
}

export function createDefaultFanSentiment(season: number, day: number): FanSentiment {
  return {
    score: 50,
    trend: 'stable',
    summary: 'Fan sentiment is stable.',
    updatedAt: `S${season}D${day}`,
  };
}
