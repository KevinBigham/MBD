import { afterEach, describe, expect, it } from 'vitest';
import {
  buildWorkerQueryDiagnosticsView,
  clearWorkerQueryTimingsForTest,
  recordWorkerQueryTiming,
} from './sim.worker.diagnostics';

declare global {
  // eslint-disable-next-line no-var
  var __MBD_PROFILE_WORKER_QUERIES__: boolean | undefined;
}

describe('worker query diagnostics', () => {
  afterEach(() => {
    globalThis.__MBD_PROFILE_WORKER_QUERIES__ = undefined;
    clearWorkerQueryTimingsForTest();
  });

  it('stays inert until worker query profiling is explicitly enabled', () => {
    recordWorkerQueryTiming('getDashboardSummary', 42);

    expect(buildWorkerQueryDiagnosticsView()).toEqual({
      enabled: false,
      warningCount: 0,
      topSlowQueries: [],
    });
  });

  it('aggregates slow query timings with budget warnings when enabled', () => {
    globalThis.__MBD_PROFILE_WORKER_QUERIES__ = true;

    recordWorkerQueryTiming('getDashboardSummary', 45);
    recordWorkerQueryTiming('getDashboardSummary', 95);
    recordWorkerQueryTiming('getHistoryOverview', 55);

    expect(buildWorkerQueryDiagnosticsView()).toEqual({
      enabled: true,
      warningCount: 1,
      topSlowQueries: [
        {
          name: 'getDashboardSummary',
          callCount: 2,
          latestMs: 95,
          averageMs: 70,
          maxMs: 95,
          budgetMs: 80,
          overBudget: true,
        },
        {
          name: 'getHistoryOverview',
          callCount: 1,
          latestMs: 55,
          averageMs: 55,
          maxMs: 55,
          budgetMs: 120,
          overBudget: false,
        },
      ],
    });
  });
});
