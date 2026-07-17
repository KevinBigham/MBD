// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CURRENT_GAME_SNAPSHOT_VERSION, type GameSnapshot } from '@mbd/contracts';

vi.mock('comlink', () => ({
  expose: () => {},
}));

import { actionApi } from './sim.worker.actions';
import {
  clearWorkerQueryTimingsForTest,
} from './sim.worker.diagnostics';
import { importGameSnapshot } from './snapshot';
import { queryApi } from './sim.worker.queries';
import { requireState, setState } from './sim.worker.helpers';
import {
  finishLongSaveProfileStage,
  LONG_SAVE_PROFILE_STAGE_ORDER,
  runWithLongSaveProfiler,
  startLongSaveProfileStage,
  type LongSaveProfileReport,
  type LongSaveProfileStage,
} from './sim.worker.longSaveProfiler';

function sequenceClock(values: readonly number[]) {
  let index = 0;
  return vi.fn(() => {
    const value = values[index];
    if (value == null) {
      throw new Error(`Fake clock exhausted after ${index} reads.`);
    }
    index += 1;
    return value;
  });
}

function runProfiledStage<T>(stage: LongSaveProfileStage, operation: () => T): T {
  const frame = startLongSaveProfileStage(stage);
  try {
    return operation();
  } finally {
    finishLongSaveProfileStage(frame);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  clearWorkerQueryTimingsForTest();
  setState(null);
});

describe('long-save profiler core', () => {
  it('aggregates nested inclusive/self timing in stable closed-union order', () => {
    const clock = sequenceClock([0, 5, 10, 12, 17, 20]);
    let report: LongSaveProfileReport | null = null;

    const returned = runWithLongSaveProfiler(() => {
      runProfiledStage('regularSeason.recordTracking', () => 'record');
      runProfiledStage('regularSeason.total', () => {
        runProfiledStage('regularSeason.mlbSimulation', () => 'mlb');
      });
      return 37;
    }, {
      clock,
      observer: (value) => {
        report = value;
      },
    });

    expect(returned).toBe(37);
    expect(clock).toHaveBeenCalledTimes(6);
    expect(report).toEqual({
      stages: [
        {
          stage: 'regularSeason.total',
          callCount: 1,
          inclusiveMs: 10,
          selfMs: 5,
          minMs: 10,
          maxMs: 10,
        },
        {
          stage: 'regularSeason.mlbSimulation',
          callCount: 1,
          inclusiveMs: 5,
          selfMs: 5,
          minMs: 5,
          maxMs: 5,
        },
        {
          stage: 'regularSeason.recordTracking',
          callCount: 1,
          inclusiveMs: 5,
          selfMs: 5,
          minMs: 5,
          maxMs: 5,
        },
      ],
    });
    expect(report!.stages.map((entry) => entry.stage)).toEqual(
      LONG_SAVE_PROFILE_STAGE_ORDER.filter((stage) => report!.stages.some((entry) => entry.stage === stage)),
    );
  });

  it('aggregates repeated calls with correct count, inclusive/self, min, and max', () => {
    const clock = sequenceClock([0, 2, 7, 10, 12, 14]);
    let report: LongSaveProfileReport | null = null;

    runWithLongSaveProfiler(() => {
      runProfiledStage('regularSeason.month', () => {
        runProfiledStage('regularSeason.mlbSimulation', () => undefined);
      });
      runProfiledStage('regularSeason.month', () => undefined);
    }, {
      clock,
      observer: (value) => {
        report = value;
      },
    });

    expect(report).toEqual({
      stages: [
        {
          stage: 'regularSeason.month',
          callCount: 2,
          inclusiveMs: 12,
          selfMs: 7,
          minMs: 2,
          maxMs: 10,
        },
        {
          stage: 'regularSeason.mlbSimulation',
          callCount: 1,
          inclusiveMs: 5,
          selfMs: 5,
          minMs: 5,
          maxMs: 5,
        },
      ],
    });
  });

  it('accepts every adapter-only stage and reports them in frozen order', () => {
    const adapterStages = [
      'season.playoffs',
      'offseason.season_review',
      'offseason.arbitration',
      'offseason.tender_nontender',
      'offseason.extensions',
      'offseason.qualifying_offers',
      'offseason.free_agency',
      'offseason.draft',
      'offseason.protection_audit',
      'offseason.rule5_draft',
      'offseason.international_signing',
      'offseason.coaching_changes',
      'offseason.spring_training',
      'season.rollover',
      'evidence.annualRow',
      'evidence.checkpointExport',
      'evidence.checkpointImport',
      'evidence.checkpointDigest',
    ] as const satisfies readonly LongSaveProfileStage[];
    const reports: LongSaveProfileReport[] = [];
    let tick = 0;

    runWithLongSaveProfiler(() => {
      for (const stage of [...adapterStages].reverse()) {
        runProfiledStage(stage, () => undefined);
      }
    }, {
      clock: () => {
        tick += 1;
        return tick;
      },
      observer: (report) => {
        reports.push(report);
      },
    });

    expect(reports[0]?.stages.map((entry) => entry.stage)).toEqual(adapterStages);
    expect(reports[0]?.stages).toEqual(adapterStages.map((stage) => ({
      stage,
      callCount: 1,
      inclusiveMs: 1,
      selfMs: 1,
      minMs: 1,
      maxMs: 1,
    })));
    expect(LONG_SAVE_PROFILE_STAGE_ORDER.slice(-adapterStages.length)).toEqual(adapterStages);
  });

  it('uses the direct zero-clock path while disabled', () => {
    const nowSpy = vi.spyOn(performance, 'now');
    const operation = vi.fn(() => ({ sentinel: true }));

    const frame = startLongSaveProfileStage('regularSeason.total');
    const returned = operation();
    finishLongSaveProfileStage(frame);

    expect(frame).toBeNull();
    expect(returned).toBe(operation.mock.results[0]!.value);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(nowSpy).not.toHaveBeenCalled();
  });

  it('returns the same value and rethrows the identical operation error', () => {
    const value = { sentinel: 'same-reference' };
    const error = new Error('sentinel-operation-error');
    const successReports: LongSaveProfileReport[] = [];
    const failureReports: LongSaveProfileReport[] = [];

    const returned = runWithLongSaveProfiler(
      () => runProfiledStage('regularSeason.total', () => value),
      {
        clock: sequenceClock([1, 3]),
        observer: (report) => {
          successReports.push(report);
        },
      },
    );

    let caught: unknown;
    try {
      runWithLongSaveProfiler(
        () => runProfiledStage('regularSeason.total', () => {
          throw error;
        }),
        {
          clock: sequenceClock([4, 8]),
          observer: (report) => {
            failureReports.push(report);
          },
        },
      );
    } catch (candidate) {
      caught = candidate;
    }

    expect(returned).toBe(value);
    expect(caught).toBe(error);
    expect(successReports[0]?.stages).toHaveLength(1);
    expect(failureReports[0]?.stages).toHaveLength(1);
  });

  it('rejects nested session activation before the nested operation and cleans up', () => {
    const nestedOperation = vi.fn(() => 'must-not-run');
    let caught: unknown;

    runWithLongSaveProfiler(() => {
      try {
        runWithLongSaveProfiler(nestedOperation, {
          clock: sequenceClock([]),
          observer: () => {},
        });
      } catch (candidate) {
        caught = candidate;
      }
    }, {
      clock: sequenceClock([]),
      observer: () => {},
    });

    expect(nestedOperation).not.toHaveBeenCalled();
    expect(caught).toEqual(new Error('A long-save profiler session is already active.'));

    const next = runWithLongSaveProfiler(() => 'clean', {
      clock: sequenceClock([]),
      observer: () => {},
    });
    expect(next).toBe('clean');
  });

  it('never lets clock or observer failures interrupt simulation and cleans up afterward', () => {
    const observerError = new Error('observer-failure');
    const observer = vi.fn(() => {
      throw observerError;
    });
    let failedClockReport: LongSaveProfileReport | null = null;
    let failedEndClockReport: LongSaveProfileReport | null = null;

    const afterObserverFailure = runWithLongSaveProfiler(
      () => runProfiledStage('regularSeason.total', () => 'observer-safe'),
      {
        clock: sequenceClock([1, 2]),
        observer,
      },
    );
    const afterClockFailure = runWithLongSaveProfiler(
      () => runProfiledStage('regularSeason.total', () => 'clock-safe'),
      {
        clock: () => {
          throw new Error('clock-failure');
        },
        observer: (report) => {
          failedClockReport = report;
        },
      },
    );
    let endClockReads = 0;
    const afterEndClockFailure = runWithLongSaveProfiler(
      () => runProfiledStage('regularSeason.total', () => 'end-clock-safe'),
      {
        clock: () => {
          endClockReads += 1;
          if (endClockReads === 1) {
            return 10;
          }
          throw new Error('end-clock-failure');
        },
        observer: (report) => {
          failedEndClockReport = report;
        },
      },
    );
    const afterBoth = runWithLongSaveProfiler(
      () => runProfiledStage('regularSeason.total', () => 'clean-again'),
      {
        clock: sequenceClock([3, 5]),
        observer: () => {},
      },
    );

    expect(afterObserverFailure).toBe('observer-safe');
    expect(observer).toHaveBeenCalledTimes(1);
    expect(afterClockFailure).toBe('clock-safe');
    expect(failedClockReport).toEqual({ stages: [] });
    expect(afterEndClockFailure).toBe('end-clock-safe');
    expect(failedEndClockReport).toEqual({ stages: [] });
    expect(afterBoth).toBe('clean-again');
  });
});

describe('long-save profiler worker exactness', () => {
  it('keeps result, v35 export, RNG, diagnostics, and public worker surfaces exact', () => {
    vi.spyOn(performance, 'now').mockReturnValue(100);
    actionApi.newGame({
      seed: 29_711,
      userTeamId: 'nym',
      gmName: 'General Manager',
      difficulty: 'standard',
      saveSlot: 1,
    });
    const importedState = structuredClone(actionApi.exportSnapshot()) as GameSnapshot;

    setState(importGameSnapshot(structuredClone(importedState)));
    clearWorkerQueryTimingsForTest();
    const disabledResult = actionApi.simToPlayoffs();
    const disabledSnapshot = actionApi.exportSnapshot() as GameSnapshot;
    const disabledRng = structuredClone(requireState().rng.getState());
    const disabledDiagnostics = queryApi.getPerformanceDiagnostics();

    setState(importGameSnapshot(structuredClone(importedState)));
    clearWorkerQueryTimingsForTest();
    let tick = 0;
    const reports: LongSaveProfileReport[] = [];
    const enabledResult = runWithLongSaveProfiler(
      () => actionApi.simToPlayoffs(),
      {
        clock: () => {
          tick += 1;
          return tick;
        },
        observer: (value) => {
          reports.push(value);
        },
      },
    );
    const enabledSnapshot = actionApi.exportSnapshot() as GameSnapshot;
    const enabledRng = structuredClone(requireState().rng.getState());
    const enabledDiagnostics = queryApi.getPerformanceDiagnostics();

    expect(enabledResult).toEqual(disabledResult);
    expect(enabledSnapshot.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(enabledSnapshot).toEqual(disabledSnapshot);
    expect(JSON.stringify(enabledSnapshot)).toBe(JSON.stringify(disabledSnapshot));
    expect(enabledRng).toEqual(disabledRng);
    expect(enabledDiagnostics).toEqual(disabledDiagnostics);
    expect(reports[0]?.stages.map((entry) => entry.stage)).toEqual([
      'regularSeason.total',
      'regularSeason.month',
      'regularSeason.week',
      'regularSeason.day',
      'regularSeason.mlbSimulation',
      'regularSeason.affiliateDays',
      'regularSeason.monthlyDevelopment',
      'regularSeason.tradeMarket',
      'regularSeason.injuryNews',
      'regularSeason.rosterNormalization',
      'regularSeason.signatureWeeklyMicroArc',
      'regularSeason.narrative',
      'regularSeason.tickerDebutConsequences',
      'regularSeason.fanSentiment',
      'regularSeason.recordTracking',
      'regularSeason.monthlyHooksPulseAchievementsScenario',
    ]);

    const profilerTerms = /longSave|profileStage|regularSeason\./i;
    expect(JSON.stringify(enabledSnapshot)).not.toMatch(profilerTerms);
    expect(JSON.stringify(enabledDiagnostics)).not.toMatch(profilerTerms);
    expect(Object.keys(actionApi).join('|')).not.toMatch(profilerTerms);
    expect(Object.keys(queryApi).join('|')).not.toMatch(profilerTerms);
  }, 90_000);
});
