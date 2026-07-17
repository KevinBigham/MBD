export const LONG_SAVE_PROFILE_STAGE_ORDER = Object.freeze([
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
] as const);

export type LongSaveProfileStage = typeof LONG_SAVE_PROFILE_STAGE_ORDER[number];

export interface LongSaveProfileStageResult {
  stage: LongSaveProfileStage;
  callCount: number;
  inclusiveMs: number;
  selfMs: number;
  minMs: number;
  maxMs: number;
}

export interface LongSaveProfileReport {
  stages: readonly LongSaveProfileStageResult[];
}

export interface LongSaveProfilerOptions {
  clock?: () => number;
  observer: (report: LongSaveProfileReport) => void;
}

interface MutableStageResult {
  callCount: number;
  inclusiveMs: number;
  selfMs: number;
  minMs: number;
  maxMs: number;
}

interface StageFrame {
  stage: LongSaveProfileStage;
  startedAt: number;
  childMs: number;
}

interface ActiveSession {
  clock: () => number;
  observer: (report: LongSaveProfileReport) => void;
  stack: StageFrame[];
  results: Map<LongSaveProfileStage, MutableStageResult>;
  timingFailed: boolean;
}

let activeSession: ActiveSession | null = null;

function monotonicNow(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function readClock(session: ActiveSession): number | null {
  try {
    const value = session.clock();
    if (!Number.isFinite(value)) {
      session.timingFailed = true;
      return null;
    }
    return value;
  } catch {
    session.timingFailed = true;
    return null;
  }
}

function startStage(session: ActiveSession, stage: LongSaveProfileStage): StageFrame | null {
  if (session.timingFailed) {
    return null;
  }

  const startedAt = readClock(session);
  if (startedAt == null) {
    return null;
  }

  const frame: StageFrame = { stage, startedAt, childMs: 0 };
  session.stack.push(frame);
  return frame;
}

function finishStage(session: ActiveSession, frame: StageFrame | null): void {
  if (frame == null || session.timingFailed) {
    return;
  }

  try {
    if (session.stack[session.stack.length - 1] !== frame) {
      session.timingFailed = true;
      session.stack.length = 0;
      session.results.clear();
      return;
    }

    session.stack.pop();
    const endedAt = readClock(session);
    if (endedAt == null) {
      session.stack.length = 0;
      session.results.clear();
      return;
    }

    const inclusiveMs = Math.max(0, endedAt - frame.startedAt);
    const selfMs = Math.max(0, inclusiveMs - frame.childMs);
    const current = session.results.get(frame.stage);
    if (current) {
      current.callCount += 1;
      current.inclusiveMs += inclusiveMs;
      current.selfMs += selfMs;
      current.minMs = Math.min(current.minMs, inclusiveMs);
      current.maxMs = Math.max(current.maxMs, inclusiveMs);
    } else {
      session.results.set(frame.stage, {
        callCount: 1,
        inclusiveMs,
        selfMs,
        minMs: inclusiveMs,
        maxMs: inclusiveMs,
      });
    }

    const parent = session.stack[session.stack.length - 1];
    if (parent) {
      parent.childMs += inclusiveMs;
    }
  } catch {
    session.timingFailed = true;
    session.stack.length = 0;
    session.results.clear();
  }
}

function buildReport(session: ActiveSession): LongSaveProfileReport {
  if (session.timingFailed || session.stack.length > 0) {
    return { stages: [] };
  }

  return {
    stages: LONG_SAVE_PROFILE_STAGE_ORDER.flatMap((stage) => {
      const result = session.results.get(stage);
      return result == null
        ? []
        : [{ stage, ...result }];
    }),
  };
}

/**
 * Runs one synchronous worker operation with the internal long-save profiler
 * active. Tests and disposable diagnostic adapters import this function
 * directly; it is deliberately absent from the worker's Comlink API.
 */
export function runWithLongSaveProfiler<T>(
  operation: () => T,
  options: LongSaveProfilerOptions,
): T {
  if (activeSession != null) {
    throw new Error('A long-save profiler session is already active.');
  }

  const session: ActiveSession = {
    clock: options.clock ?? monotonicNow,
    observer: options.observer,
    stack: [],
    results: new Map(),
    timingFailed: false,
  };
  activeSession = session;

  try {
    return operation();
  } finally {
    activeSession = null;
    let report: LongSaveProfileReport = { stages: [] };
    try {
      report = buildReport(session);
    } catch {
      // Profiling is observational. Report construction cannot replace the
      // operation's return value or error.
    }
    try {
      session.observer(report);
    } catch {
      // A diagnostic observer must never interrupt worker simulation.
    }
  }
}

/**
 * Starts one synchronous stage when a direct-import profiling session is
 * active. The production-disabled path returns null without reading the clock
 * or allocating a timing record, so the caller invokes its operation directly.
 */
export function startLongSaveProfileStage(stage: LongSaveProfileStage): StageFrame | null {
  const session = activeSession;
  if (session == null || session.timingFailed) {
    return null;
  }
  return startStage(session, stage);
}

/** Completes a stage token without ever interrupting its caller. */
export function finishLongSaveProfileStage(frame: StageFrame | null): void {
  const session = activeSession;
  if (session != null) {
    finishStage(session, frame);
  }
}

/** Convenience wrapper for compound coarse stages in the worker source. */
export function profileLongSaveStage<T>(
  stage: LongSaveProfileStage,
  operation: () => T,
): T {
  const frame = startLongSaveProfileStage(stage);
  try {
    return operation();
  } finally {
    finishLongSaveProfileStage(frame);
  }
}
