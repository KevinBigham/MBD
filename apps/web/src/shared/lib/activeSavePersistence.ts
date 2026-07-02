import { loadGameById, saveGameById, type SaveData } from './saveSystem';

export type ActiveSavePersistenceState = 'idle' | 'saving' | 'saved' | 'failed';
export type ActiveSavePersistenceFailureKind =
  | 'export'
  | 'quota'
  | 'indexeddb'
  | 'storage'
  | 'unknown';

export interface ActiveSavePersistenceStatus {
  state: ActiveSavePersistenceState;
  saveId: string | null;
  saveName: string | null;
  desiredGeneration: number;
  durableGeneration: number;
  canRetry: boolean;
  lastSavedAt: string | null;
  errorMessage: string | null;
  failureKind: ActiveSavePersistenceFailureKind | null;
}

interface PersistActiveSaveSnapshotOptions {
  activeSaveId: string | null | undefined;
  activeSaveSlot: number | null | undefined;
  gmName: string | null | undefined;
  teamName: string | null | undefined;
  season: number;
  exportSnapshot: () => Promise<object>;
}

interface PersistActiveSaveSnapshotResult {
  saved: boolean;
  saveName: string | null;
}

interface PersistedSnapshotJob {
  generation: number;
  saveId: string;
  activeSaveSlot: number | null | undefined;
  saveName: string;
  snapshot: object;
}

interface DeferredPersist {
  resolve: (value: PersistActiveSaveSnapshotResult) => void;
  reject: (error: unknown) => void;
}

interface SaveCoordinatorState {
  status: ActiveSavePersistenceStatus;
  desiredGeneration: number;
  durableGeneration: number;
  latestJob: PersistedSnapshotJob | null;
  failedJob: PersistedSnapshotJob | null;
  running: boolean;
  deferreds: DeferredPersist[];
}

const states = new Map<string, SaveCoordinatorState>();
const listeners = new Set<() => void>();
let latestSaveId: string | null = null;

const IDLE_STATUS: ActiveSavePersistenceStatus = {
  state: 'idle',
  saveId: null,
  saveName: null,
  desiredGeneration: 0,
  durableGeneration: 0,
  canRetry: false,
  lastSavedAt: null,
  errorMessage: null,
  failureKind: null,
};

function snapshotSeason(snapshot: object, fallbackSeason: number): number {
  const value = (snapshot as { season?: unknown }).season;
  return typeof value === 'number' && Number.isFinite(value) ? value : fallbackSeason;
}

function saveNameForSnapshot(
  snapshot: object,
  fallbackSeason: number,
  gmName: string | null | undefined,
  teamName: string | null | undefined,
): string {
  const saveSeason = snapshotSeason(snapshot, fallbackSeason);
  return `${gmName?.trim() || 'General Manager'} • ${teamName?.trim() || 'Franchise'} • Season ${saveSeason}`;
}

function classifyPersistenceFailure(error: unknown, fallbackKind: ActiveSavePersistenceFailureKind): ActiveSavePersistenceFailureKind {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/quota|exceeded/i.test(message)) {
    return 'quota';
  }
  if (/indexeddb|dexie|database|transaction|objectstore|constraint|version(?:error)?|blocked|abort/i.test(message)) {
    return 'indexeddb';
  }
  if (/storage/i.test(message)) {
    return 'storage';
  }
  return fallbackKind;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function ensureState(saveId: string): SaveCoordinatorState {
  const existing = states.get(saveId);
  if (existing) {
    return existing;
  }

  const state: SaveCoordinatorState = {
    status: {
      ...IDLE_STATUS,
      saveId,
    },
    desiredGeneration: 0,
    durableGeneration: 0,
    latestJob: null,
    failedJob: null,
    running: false,
    deferreds: [],
  };
  states.set(saveId, state);
  return state;
}

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function updateStatus(
  saveId: string,
  state: SaveCoordinatorState,
  status: Partial<ActiveSavePersistenceStatus>,
) {
  state.status = {
    ...state.status,
    saveId,
    desiredGeneration: state.desiredGeneration,
    durableGeneration: state.durableGeneration,
    ...status,
  };
  notifyListeners();
}

function resolveAll(state: SaveCoordinatorState, value: PersistActiveSaveSnapshotResult) {
  const deferreds = state.deferreds.splice(0);
  deferreds.forEach((deferred) => deferred.resolve(value));
}

function rejectAll(state: SaveCoordinatorState, error: unknown) {
  const deferreds = state.deferreds.splice(0);
  deferreds.forEach((deferred) => deferred.reject(error));
}

async function writeSnapshotJob(job: PersistedSnapshotJob): Promise<SaveData> {
  if (job.activeSaveSlot != null) {
    return saveGameById(job.saveId, job.saveName, job.snapshot, {
      slotNumber: job.activeSaveSlot,
      parentSaveId: null,
      isRootSave: true,
      branchMeta: null,
    });
  }

  const existing = await loadGameById(job.saveId);
  return saveGameById(job.saveId, job.saveName, job.snapshot, {
    slotNumber: existing?.slotNumber ?? null,
    parentSaveId: existing?.parentSaveId ?? null,
    isRootSave: existing?.isRootSave ?? false,
    branchMeta: existing?.branchMeta ?? null,
  });
}

function flushSave(saveId: string) {
  const state = states.get(saveId);
  if (!state || state.running || !state.latestJob) {
    return;
  }

  void (async () => {
    while (state.latestJob) {
      const job = state.latestJob;
      state.latestJob = null;
      state.running = true;
      updateStatus(saveId, state, {
        state: 'saving',
        saveName: job.saveName,
        canRetry: false,
        errorMessage: null,
        failureKind: null,
      });

      try {
        await writeSnapshotJob(job);
        state.durableGeneration = Math.max(state.durableGeneration, job.generation);
        state.failedJob = null;
        const durableLatest = state.durableGeneration >= state.desiredGeneration && !state.latestJob;
        updateStatus(saveId, state, {
          state: durableLatest ? 'saved' : 'saving',
          saveName: job.saveName,
          canRetry: false,
          lastSavedAt: durableLatest ? new Date().toISOString() : state.status.lastSavedAt,
          errorMessage: null,
          failureKind: null,
        });
        if (durableLatest) {
          resolveAll(state, { saved: true, saveName: job.saveName });
        }
      } catch (error) {
        const staleFailure = state.latestJob != null || job.generation < state.desiredGeneration;
        if (staleFailure) {
          continue;
        }

        state.failedJob = job;
        updateStatus(saveId, state, {
          state: 'failed',
          saveName: job.saveName,
          canRetry: true,
          errorMessage: errorMessage(error),
          failureKind: classifyPersistenceFailure(error, 'storage'),
        });
        rejectAll(state, error);
      } finally {
        state.running = false;
      }
    }
  })();
}

function markPreCaptureFailure(
  saveId: string,
  error: unknown,
  failureKind: ActiveSavePersistenceFailureKind,
) {
  const state = ensureState(saveId);
  latestSaveId = saveId;
  updateStatus(saveId, state, {
    state: 'failed',
    canRetry: false,
    errorMessage: errorMessage(error),
    failureKind: classifyPersistenceFailure(error, failureKind),
  });
}

export function getActiveSavePersistenceStatus(saveId?: string | null): ActiveSavePersistenceStatus {
  const resolvedSaveId = saveId === undefined ? latestSaveId : saveId;
  if (!resolvedSaveId) {
    return IDLE_STATUS;
  }
  return states.get(resolvedSaveId)?.status ?? IDLE_STATUS;
}

export function subscribeToActiveSavePersistenceStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function retryActiveSavePersistence(saveId?: string | null): Promise<PersistActiveSaveSnapshotResult> {
  const resolvedSaveId = saveId ?? latestSaveId;
  if (!resolvedSaveId) {
    return { saved: false, saveName: null };
  }

  const state = states.get(resolvedSaveId);
  const retryJob = state?.failedJob;
  if (!state || !retryJob) {
    return { saved: false, saveName: null };
  }

  state.latestJob = retryJob;
  state.failedJob = null;
  latestSaveId = resolvedSaveId;
  updateStatus(resolvedSaveId, state, {
    state: 'saving',
    saveName: retryJob.saveName,
    canRetry: false,
    errorMessage: null,
    failureKind: null,
  });

  const retryPromise = new Promise<PersistActiveSaveSnapshotResult>((resolve, reject) => {
    state.deferreds.push({ resolve, reject });
  });
  flushSave(resolvedSaveId);
  return retryPromise;
}

export async function persistActiveSaveSnapshot({
  activeSaveId,
  activeSaveSlot,
  gmName,
  teamName,
  season,
  exportSnapshot,
}: PersistActiveSaveSnapshotOptions): Promise<PersistActiveSaveSnapshotResult> {
  if (activeSaveId == null) {
    return { saved: false, saveName: null };
  }

  let snapshot: object;
  try {
    snapshot = await exportSnapshot();
  } catch (error) {
    markPreCaptureFailure(activeSaveId, error, 'export');
    throw error;
  }

  const state = ensureState(activeSaveId);
  const generation = state.desiredGeneration + 1;
  const saveName = saveNameForSnapshot(snapshot, season, gmName, teamName);
  const job: PersistedSnapshotJob = {
    generation,
    saveId: activeSaveId,
    activeSaveSlot,
    saveName,
    snapshot,
  };

  state.desiredGeneration = generation;
  state.latestJob = job;
  state.failedJob = null;
  latestSaveId = activeSaveId;
  updateStatus(activeSaveId, state, {
    state: 'saving',
    saveName,
    canRetry: false,
    errorMessage: null,
    failureKind: null,
  });

  const persistPromise = new Promise<PersistActiveSaveSnapshotResult>((resolve, reject) => {
    state.deferreds.push({ resolve, reject });
  });
  flushSave(activeSaveId);
  return persistPromise;
}

export function resetActiveSavePersistenceForTesting(): void {
  states.clear();
  listeners.clear();
  latestSaveId = null;
}
