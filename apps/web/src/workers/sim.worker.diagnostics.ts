import type {
  ArchivedSeason,
  AwardHistoryEntry,
  SeasonArchiveEntry,
  SeasonStatLeaders,
} from '@mbd/contracts';
import type { ConsequenceWatcher, TickerEntry } from '@mbd/contracts';
import type { FullGameState } from './sim.worker.helpers.js';

const ARCHIVE_KEEP_SEASONS = 10;

export interface RuntimeDiagnosticsState {
  lastSimDayMs: number | null;
  lastSaveMs: number | null;
  lastLoadMs: number | null;
}

export interface WorkerQueryTimingView {
  name: string;
  callCount: number;
  latestMs: number;
  averageMs: number;
  maxMs: number;
  budgetMs: number | null;
  overBudget: boolean;
}

export interface WorkerQueryDiagnosticsView {
  enabled: boolean;
  warningCount: number;
  topSlowQueries: WorkerQueryTimingView[];
}

export interface PerformanceDiagnosticsView {
  totals: {
    totalSeasons: number;
    snapshotSizeBytes: number;
    liveArchiveSeasons: number;
    archivedSeasons: number;
  };
  queues: {
    newsItems: number;
    briefingItems: number;
    tickerEntries: number;
    staleTickerEntries: number;
    activeWatchers: number;
    resolvedWatchers: number;
    staleWatchers: number;
    scoutConflicts: number;
  };
  runtime: RuntimeDiagnosticsState;
  queryTimings: WorkerQueryDiagnosticsView;
}

const runtimeDiagnostics: RuntimeDiagnosticsState = {
  lastSimDayMs: null,
  lastSaveMs: null,
  lastLoadMs: null,
};

const WORKER_QUERY_TIMING_LIMIT = 5;
const WORKER_QUERY_BUDGET_MS: Record<string, number> = {
  getDashboardSummary: 80,
  getFullRoster: 80,
  getHistoryOverview: 120,
  getPlayerProfileView: 100,
  getTradeDeadlineState: 100,
  exportSnapshot: 150,
};

interface WorkerQueryTimingState {
  callCount: number;
  totalMs: number;
  latestMs: number;
  maxMs: number;
  budgetMs: number | null;
}

const workerQueryTimings = new Map<string, WorkerQueryTimingState>();

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function roundMs(value: number): number {
  return Number(value.toFixed(1));
}

function parseRecord(record: string | null | undefined): { wins: number; losses: number } | null {
  if (!record) {
    return null;
  }

  const match = /^(\d+)-(\d+)$/.exec(record);
  if (!match) {
    return null;
  }

  return {
    wins: Number(match[1]),
    losses: Number(match[2]),
  };
}

function summarizeAwardWinner(awards: AwardHistoryEntry[], awardType: string): string | null {
  return awards.find((entry) => entry.award === awardType)?.summary ?? null;
}

function sliceTopLeaders(leaders: SeasonStatLeaders): SeasonStatLeaders {
  return {
    hr: leaders.hr.slice(0, 1),
    rbi: leaders.rbi.slice(0, 1),
    avg: leaders.avg.slice(0, 1),
    era: leaders.era.slice(0, 1),
    k: leaders.k.slice(0, 1),
    w: leaders.w.slice(0, 1),
  };
}

function toArchivedSeason(entry: SeasonArchiveEntry, userTeamId: string): ArchivedSeason {
  const championTeamId = entry.playoffSeries.find((series) => series.round === 'World Series')?.winnerTeamId ?? null;

  return {
    season: entry.season,
    standings: entry.standings.map((standing) => ({
      teamId: standing.teamId,
      wins: standing.wins,
      losses: standing.losses,
      divisionRank: standing.divisionRank,
    })),
    userRecord: parseRecord(entry.userSummary?.record),
    playoffResult: entry.userSummary?.playoffResult ?? null,
    championshipWon: championTeamId === userTeamId,
    championTeamId,
    mvpName: summarizeAwardWinner(entry.awards, 'MVP'),
    cyYoungName: summarizeAwardWinner(entry.awards, 'CY_YOUNG'),
    statLeaders: sliceTopLeaders(entry.statLeaders),
    dynastyScore: null,
  };
}

function absoluteDay(season: number, day: number): number {
  return (season * 1000) + day;
}

function isTickerStale(state: FullGameState, entry: TickerEntry): boolean {
  return entry.expiresDay < absoluteDay(state.season, state.day);
}

function isWatcherStale(state: FullGameState, watcher: ConsequenceWatcher): boolean {
  return watcher.resolved
    || watcher.expiresSeason < state.season
    || (watcher.expiresSeason === state.season && watcher.expiresDay < state.day);
}

export function recordRuntimeDiagnostic(metric: keyof RuntimeDiagnosticsState, value: number | null) {
  runtimeDiagnostics[metric] = value;
}

export function isWorkerQueryProfilingEnabled(): boolean {
  const globalFlag = (globalThis as typeof globalThis & {
    __MBD_PROFILE_WORKER_QUERIES__?: boolean;
  }).__MBD_PROFILE_WORKER_QUERIES__;
  const envFlag = (import.meta as ImportMeta & {
    env?: Record<string, string | boolean | undefined>;
  }).env?.VITE_MBD_PROFILE_WORKER_QUERIES;
  return globalFlag === true || envFlag === '1' || envFlag === 'true';
}

export function recordWorkerQueryTiming(name: string, durationMs: number): void {
  if (!isWorkerQueryProfilingEnabled()) {
    return;
  }

  const roundedDuration = roundMs(Math.max(0, durationMs));
  const current = workerQueryTimings.get(name);
  const budgetMs = WORKER_QUERY_BUDGET_MS[name] ?? null;

  if (!current) {
    workerQueryTimings.set(name, {
      callCount: 1,
      totalMs: roundedDuration,
      latestMs: roundedDuration,
      maxMs: roundedDuration,
      budgetMs,
    });
    return;
  }

  current.callCount += 1;
  current.totalMs += roundedDuration;
  current.latestMs = roundedDuration;
  current.maxMs = Math.max(current.maxMs, roundedDuration);
  current.budgetMs = budgetMs;
}

export function measureWorkerQuerySync<T>(name: string, operation: () => T): T {
  if (!isWorkerQueryProfilingEnabled()) {
    return operation();
  }

  const startedAt = nowMs();
  try {
    return operation();
  } finally {
    recordWorkerQueryTiming(name, nowMs() - startedAt);
  }
}

export function buildWorkerQueryDiagnosticsView(): WorkerQueryDiagnosticsView {
  const enabled = isWorkerQueryProfilingEnabled();
  if (!enabled) {
    return {
      enabled: false,
      warningCount: 0,
      topSlowQueries: [],
    };
  }

  const queryRows = Array.from(workerQueryTimings.entries())
    .map(([name, timing]) => {
      const averageMs = roundMs(timing.totalMs / Math.max(1, timing.callCount));
      return {
        name,
        callCount: timing.callCount,
        latestMs: timing.latestMs,
        averageMs,
        maxMs: timing.maxMs,
        budgetMs: timing.budgetMs,
        overBudget: timing.budgetMs != null && timing.maxMs > timing.budgetMs,
      };
    })
    .sort((left, right) =>
      Number(right.overBudget) - Number(left.overBudget)
      || right.maxMs - left.maxMs
      || right.averageMs - left.averageMs
      || left.name.localeCompare(right.name),
    );

  return {
    enabled: true,
    warningCount: queryRows.filter((entry) => entry.overBudget).length,
    topSlowQueries: queryRows.slice(0, WORKER_QUERY_TIMING_LIMIT),
  };
}

export function clearWorkerQueryTimingsForTest(): void {
  workerQueryTimings.clear();
}

export function measureRuntimeSync<T>(
  metric: keyof RuntimeDiagnosticsState,
  operation: () => T,
): T {
  const startedAt = nowMs();
  const result = operation();
  recordRuntimeDiagnostic(metric, roundMs(nowMs() - startedAt));
  return result;
}

export async function measureRuntimeAsync<T>(
  metric: keyof RuntimeDiagnosticsState,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = nowMs();
  const result = await operation();
  recordRuntimeDiagnostic(metric, roundMs(nowMs() - startedAt));
  return result;
}

export function estimateSnapshotSizeBytes(snapshot: unknown): number {
  const serialized = JSON.stringify(snapshot);
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(serialized).byteLength;
  }
  return serialized.length;
}

export function normalizePerformanceDiagnostics(state: FullGameState) {
  state.performanceDiagnostics = {
    ...state.performanceDiagnostics,
    totalSeasons: Math.max(state.performanceDiagnostics.totalSeasons, state.season),
  };
}

export function buildPerformanceDiagnosticsView(state: FullGameState): PerformanceDiagnosticsView {
  const staleTickerEntries = state.tickerFeed.filter((entry) => isTickerStale(state, entry)).length;
  const resolvedWatchers = state.consequenceWatchers.filter((watcher) => watcher.resolved).length;
  const staleWatchers = state.consequenceWatchers.filter((watcher) => isWatcherStale(state, watcher)).length;
  const activeWatchers = state.consequenceWatchers.filter((watcher) => !isWatcherStale(state, watcher)).length;

  return {
    totals: {
      totalSeasons: Math.max(state.performanceDiagnostics.totalSeasons, state.season),
      // This field is a legacy in-memory hint. Queries must not trust a
      // persisted positive value as current snapshot or quota evidence.
      snapshotSizeBytes: 0,
      liveArchiveSeasons: state.seasonArchive.length,
      archivedSeasons: state.archivedSeasons.length,
    },
    queues: {
      newsItems: state.news.length,
      briefingItems: state.briefingQueue.length,
      tickerEntries: state.tickerFeed.length,
      staleTickerEntries,
      activeWatchers,
      resolvedWatchers,
      staleWatchers,
      scoutConflicts: state.scoutConflicts.length,
    },
    runtime: { ...runtimeDiagnostics },
    queryTimings: buildWorkerQueryDiagnosticsView(),
  };
}

export function archiveOldSeasonsInState(state: FullGameState): number {
  const keepThresholdSeason = Math.max(1, state.season - ARCHIVE_KEEP_SEASONS);
  const existingArchived = new Set(state.archivedSeasons.map((entry) => entry.season));
  const seasonsToArchive = state.seasonArchive.filter((entry) =>
    entry.season < keepThresholdSeason && !existingArchived.has(entry.season),
  );

  if (seasonsToArchive.length === 0) {
    return 0;
  }

  normalizePerformanceDiagnostics(state);
  state.archivedSeasons = [
    ...state.archivedSeasons,
    ...seasonsToArchive.map((entry) => toArchivedSeason(entry, state.userTeamId)),
  ].sort((left, right) => left.season - right.season);
  state.seasonArchive = state.seasonArchive.filter((entry) => entry.season >= keepThresholdSeason);
  return seasonsToArchive.length;
}

export function pruneStaleWorkerData(state: FullGameState): number {
  const eligibleTickerEntries = state.tickerFeed.filter((entry) => isTickerStale(state, entry));
  const eligibleWatchers = state.consequenceWatchers.filter((watcher) => isWatcherStale(state, watcher));
  if (eligibleTickerEntries.length === 0 && eligibleWatchers.length === 0) {
    return 0;
  }
  const beforeTickerCount = state.tickerFeed.length;
  const beforeWatcherCount = state.consequenceWatchers.length;

  state.tickerFeed = state.tickerFeed.filter((entry) => !isTickerStale(state, entry));
  state.consequenceWatchers = state.consequenceWatchers.filter((watcher) => !isWatcherStale(state, watcher));

  return (beforeTickerCount - state.tickerFeed.length) + (beforeWatcherCount - state.consequenceWatchers.length);
}
