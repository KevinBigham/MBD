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
    scoutConflicts: number;
  };
  runtime: RuntimeDiagnosticsState;
}

const runtimeDiagnostics: RuntimeDiagnosticsState = {
  lastSimDayMs: null,
  lastSaveMs: null,
  lastLoadMs: null,
};

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

function isTickerStale(state: FullGameState, entry: TickerEntry): boolean {
  return entry.expiresDay < state.day;
}

function isWatcherStale(state: FullGameState, watcher: ConsequenceWatcher): boolean {
  return watcher.resolved
    || watcher.expiresSeason < state.season
    || (watcher.expiresSeason === state.season && watcher.expiresDay < state.day);
}

export function recordRuntimeDiagnostic(metric: keyof RuntimeDiagnosticsState, value: number | null) {
  runtimeDiagnostics[metric] = value;
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
  normalizePerformanceDiagnostics(state);
  const staleTickerEntries = state.tickerFeed.filter((entry) => isTickerStale(state, entry)).length;
  const resolvedWatchers = state.consequenceWatchers.filter((watcher) => watcher.resolved).length;
  const activeWatchers = state.consequenceWatchers.filter((watcher) => !isWatcherStale(state, watcher)).length;

  return {
    totals: {
      totalSeasons: state.performanceDiagnostics.totalSeasons,
      snapshotSizeBytes: state.performanceDiagnostics.snapshotSizeBytes,
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
      scoutConflicts: state.scoutConflicts.length,
    },
    runtime: { ...runtimeDiagnostics },
  };
}

export function archiveOldSeasonsInState(state: FullGameState): number {
  normalizePerformanceDiagnostics(state);
  const keepThresholdSeason = Math.max(1, state.season - ARCHIVE_KEEP_SEASONS);
  const existingArchived = new Set(state.archivedSeasons.map((entry) => entry.season));
  const seasonsToArchive = state.seasonArchive.filter((entry) =>
    entry.season < keepThresholdSeason && !existingArchived.has(entry.season),
  );

  if (seasonsToArchive.length === 0) {
    return 0;
  }

  state.archivedSeasons = [
    ...state.archivedSeasons,
    ...seasonsToArchive.map((entry) => toArchivedSeason(entry, state.userTeamId)),
  ].sort((left, right) => left.season - right.season);
  state.seasonArchive = state.seasonArchive.filter((entry) => entry.season >= keepThresholdSeason);
  return seasonsToArchive.length;
}

export function pruneStaleWorkerData(state: FullGameState): number {
  const beforeTickerCount = state.tickerFeed.length;
  const beforeWatcherCount = state.consequenceWatchers.length;

  state.tickerFeed = state.tickerFeed.filter((entry) => !isTickerStale(state, entry));
  state.consequenceWatchers = state.consequenceWatchers.filter((watcher) => !isWatcherStale(state, watcher));

  return (beforeTickerCount - state.tickerFeed.length) + (beforeWatcherCount - state.consequenceWatchers.length);
}
