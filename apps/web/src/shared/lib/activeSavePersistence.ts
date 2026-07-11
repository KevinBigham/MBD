import {
  deleteSaveById,
  listBranches,
  loadGameById,
  saveGameById,
  type SaveData,
} from './saveSystem';

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
  pendingWrites: number;
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
  saveName?: string;
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
  captureEpoch: number;
  captureBlocked: boolean;
  capturePaused: boolean;
  activeCaptures: number;
  captureQuiescenceWaiters: Array<() => void>;
  captureResumeWaiters: Array<() => void>;
  quiescenceWaiters: Array<() => void>;
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
  pendingWrites: 0,
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

function validDurableTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? value : null;
}

function latestDurableTimestamp(
  current: string | null,
  candidate: string | null | undefined,
): string | null {
  const next = validDurableTimestamp(candidate);
  if (!next) return current;
  const currentTimestamp = validDurableTimestamp(current);
  if (!currentTimestamp) return next;
  return Date.parse(next) >= Date.parse(currentTimestamp) ? next : currentTimestamp;
}

function pendingWrites(state: SaveCoordinatorState): number {
  return Math.max(0, state.desiredGeneration - state.durableGeneration);
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
    captureEpoch: 0,
    captureBlocked: false,
    capturePaused: false,
    activeCaptures: 0,
    captureQuiescenceWaiters: [],
    captureResumeWaiters: [],
    quiescenceWaiters: [],
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
    ...status,
    saveId,
    desiredGeneration: state.desiredGeneration,
    durableGeneration: state.durableGeneration,
    pendingWrites: pendingWrites(state),
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

function resolveQuiescenceWaiters(state: SaveCoordinatorState) {
  if (state.running || state.latestJob) return;
  const waiters = state.quiescenceWaiters.splice(0);
  waiters.forEach((resolve) => resolve());
}

function resolveCaptureQuiescenceWaiters(state: SaveCoordinatorState) {
  if (state.activeCaptures > 0) return;
  const waiters = state.captureQuiescenceWaiters.splice(0);
  waiters.forEach((resolve) => resolve());
}

function resumePausedCaptures(state: SaveCoordinatorState) {
  state.capturePaused = false;
  const waiters = state.captureResumeWaiters.splice(0);
  waiters.forEach((resolve) => resolve());
}

async function waitForCaptureQuiescence(state: SaveCoordinatorState): Promise<void> {
  if (state.activeCaptures === 0) return;
  await new Promise<void>((resolve) => {
    state.captureQuiescenceWaiters.push(resolve);
  });
}

async function waitForWriteQuiescence(saveId: string, state: SaveCoordinatorState): Promise<void> {
  flushSave(saveId);
  if (!state.running && !state.latestJob) return;
  await new Promise<void>((resolve) => {
    state.quiescenceWaiters.push(resolve);
  });
}

interface SavePersistenceBarrier {
  saveId: string;
  state: SaveCoordinatorState;
  wasBlocked: boolean;
}

function beginSavePersistenceBarrier(saveId: string): SavePersistenceBarrier {
  const state = ensureState(saveId);
  const barrier = { saveId, state, wasBlocked: state.captureBlocked };
  state.captureBlocked = true;
  state.captureEpoch += 1;
  resumePausedCaptures(state);
  return barrier;
}

async function beginSaveTreePersistenceBarrier(saveId: string): Promise<SavePersistenceBarrier[]> {
  const rootBarrier = beginSavePersistenceBarrier(saveId);
  const barriers = [rootBarrier];
  notifyListeners();
  try {
    await waitForWriteQuiescence(saveId, rootBarrier.state);
    const branches = await listBranches(saveId);
    const childBarriers = branches.map((branch) => beginSavePersistenceBarrier(branch.id));
    barriers.push(...childBarriers);
    notifyListeners();
    await Promise.all(childBarriers.map((barrier) => (
      waitForWriteQuiescence(barrier.saveId, barrier.state)
    )));
    return barriers;
  } catch (error) {
    restoreSavePersistenceBarriers(barriers);
    throw error;
  }
}

function restoreSavePersistenceBarriers(barriers: SavePersistenceBarrier[]) {
  for (const barrier of barriers) {
    barrier.state.captureBlocked = barrier.wasBlocked;
    barrier.state.captureEpoch += 1;
  }
  notifyListeners();
}

function tombstoneSavePersistenceBarrier(barrier: SavePersistenceBarrier) {
  const { saveId, state } = barrier;
  resolveAll(state, { saved: false, saveName: null });
  state.desiredGeneration = 0;
  state.durableGeneration = 0;
  state.latestJob = null;
  state.failedJob = null;
  state.status = {
    ...IDLE_STATUS,
    saveId,
  };
  if (latestSaveId === saveId) {
    latestSaveId = null;
  }
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
        const savedRecord = await writeSnapshotJob(job);
        state.durableGeneration = Math.max(state.durableGeneration, job.generation);
        state.failedJob = null;
        const durableLatest = state.durableGeneration >= state.desiredGeneration && !state.latestJob;
        updateStatus(saveId, state, {
          state: durableLatest ? 'saved' : 'saving',
          saveName: job.saveName,
          canRetry: false,
          lastSavedAt: latestDurableTimestamp(state.status.lastSavedAt, savedRecord.updatedAt),
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
        resolveQuiescenceWaiters(state);
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
  if (state.failedJob && pendingWrites(state) > 0) {
    notifyListeners();
    return;
  }
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

export function reconcileActiveSavePersistenceMetadata(
  save: Pick<SaveData, 'id' | 'name' | 'updatedAt'>,
): void {
  const state = ensureState(save.id);
  latestSaveId = save.id;
  updateStatus(save.id, state, {
    saveName: save.name,
    lastSavedAt: latestDurableTimestamp(state.status.lastSavedAt, save.updatedAt),
  });
}

/**
 * Starts an explicit load/switch boundary for one save ID. Captures that have
 * not produced a snapshot yet are superseded, while already accepted writes
 * are allowed to settle before the caller reads and imports the durable row.
 */
export async function prepareActiveSavePersistenceForLoad(saveId: string): Promise<void> {
  const state = ensureState(saveId);
  state.captureBlocked = true;
  state.captureEpoch += 1;
  resumePausedCaptures(state);
  latestSaveId = saveId;
  notifyListeners();

  await waitForWriteQuiescence(saveId, state);
}

export function releaseActiveSavePersistenceLoad(saveId: string): void {
  const state = states.get(saveId);
  if (!state) return;
  state.captureBlocked = false;
  state.captureEpoch += 1;
  resumePausedCaptures(state);
  notifyListeners();
}

/**
 * Activates the exact durable record that was imported into the worker. This
 * is intentionally stronger than metadata reconciliation: an explicit load
 * supersedes any retained retry job from an older runtime session.
 */
export function activateActiveSavePersistenceMetadata(
  save: Pick<SaveData, 'id' | 'name' | 'updatedAt'>,
): void {
  const state = ensureState(save.id);
  if (state.running || state.latestJob) {
    throw new Error(`Save ${save.id} must be quiescent before activation.`);
  }

  resolveAll(state, { saved: false, saveName: null });
  state.desiredGeneration = 0;
  state.durableGeneration = 0;
  state.latestJob = null;
  state.failedJob = null;
  state.captureBlocked = false;
  state.captureEpoch += 1;
  resumePausedCaptures(state);
  state.status = {
    ...IDLE_STATUS,
    saveId: save.id,
    saveName: save.name,
    lastSavedAt: validDurableTimestamp(save.updatedAt),
  };
  latestSaveId = save.id;
  notifyListeners();
}

export async function refreshActiveSavePersistenceMetadata(
  saveId: string,
): Promise<SaveData | null> {
  const save = await loadGameById(saveId);
  if (!save) return null;
  reconcileActiveSavePersistenceMetadata(save);
  return save;
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
  if (state.captureBlocked || state.capturePaused) {
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

/**
 * Tracks a non-snapshot save mutation in the same active-save status owner.
 * Existing captures settle first and new captures wait, so queue depth and
 * recency cannot race the metadata write.
 */
export async function trackActiveSavePersistenceOperation(
  saveId: string,
  operation: () => Promise<SaveData>,
): Promise<SaveData> {
  const state = ensureState(saveId);
  const operationEpoch = state.captureEpoch;
  while (state.capturePaused && !state.captureBlocked) {
    await new Promise<void>((resolve) => {
      state.captureResumeWaiters.push(resolve);
    });
  }
  if (state.captureBlocked) {
    throw new Error(`Save ${saveId} is not available for persistence.`);
  }

  state.capturePaused = true;
  latestSaveId = saveId;
  notifyListeners();
  await waitForCaptureQuiescence(state);
  await waitForWriteQuiescence(saveId, state);

  if (state.captureBlocked || state.captureEpoch !== operationEpoch) {
    resumePausedCaptures(state);
    throw new Error(`Save ${saveId} is not available for persistence.`);
  }
  if (state.status.state === 'failed' || pendingWrites(state) > 0) {
    resumePausedCaptures(state);
    throw new Error(`Save ${saveId} has unresolved persistence work. Retry or save it before changing save metadata.`);
  }

  const generation = state.desiredGeneration + 1;
  const statusBeforeOperation = state.status;
  state.desiredGeneration = generation;
  state.running = true;
  updateStatus(saveId, state, {
    state: 'saving',
    canRetry: false,
    errorMessage: null,
    failureKind: null,
  });

  try {
    const savedRecord = await operation();
    state.durableGeneration = generation;
    state.failedJob = null;
    updateStatus(saveId, state, {
      state: 'saved',
      saveName: savedRecord.name,
      canRetry: false,
      lastSavedAt: latestDurableTimestamp(state.status.lastSavedAt, savedRecord.updatedAt),
      errorMessage: null,
      failureKind: null,
    });
    return savedRecord;
  } catch (error) {
    state.desiredGeneration = generation - 1;
    state.status = statusBeforeOperation;
    notifyListeners();
    throw error;
  } finally {
    state.running = false;
    resolveQuiescenceWaiters(state);
    resumePausedCaptures(state);
    notifyListeners();
  }
}

/**
 * Replaces a non-active save record behind a target-ID boundary. Delayed
 * captures from an earlier active session are invalidated, accepted writes
 * settle first, and the target remains blocked until an explicit load/create
 * activation claims it again.
 */
export async function replaceInactiveSavePersistenceRecord(
  saveId: string,
  replaceRecord: () => Promise<SaveData>,
): Promise<SaveData> {
  const barriers = await beginSaveTreePersistenceBarrier(saveId);
  const rootState = barriers[0]!.state;

  try {
    const savedRecord = await replaceRecord();
    barriers.forEach(tombstoneSavePersistenceBarrier);
    rootState.status = {
      ...IDLE_STATUS,
      saveId,
      saveName: savedRecord.name,
      lastSavedAt: validDurableTimestamp(savedRecord.updatedAt),
    };
    notifyListeners();
    return savedRecord;
  } catch (error) {
    restoreSavePersistenceBarriers(barriers);
    throw error;
  }
}

/**
 * Retires a save ID before deletion. Delayed exports are invalidated, already
 * accepted writes settle, and retry state is discarded only after deletion.
 * The tombstoned coordinator stays blocked until explicit activation.
 */
export function retireActiveSavePersistenceForDelete(saveId: string): Promise<void>;
export function retireActiveSavePersistenceForDelete<T>(
  saveId: string,
  deleteRecord: () => Promise<T>,
): Promise<T>;
export async function retireActiveSavePersistenceForDelete(
  saveId: string,
  deleteRecord: () => Promise<unknown> = async () => {
    await deleteSaveById(saveId);
  },
): Promise<unknown> {
  const state = ensureState(saveId);
  const wasBlocked = state.captureBlocked;
  state.captureBlocked = true;
  state.captureEpoch += 1;
  resumePausedCaptures(state);
  notifyListeners();

  await waitForWriteQuiescence(saveId, state);

  try {
    const deletionResult = await deleteRecord();
    resolveAll(state, { saved: false, saveName: null });
    state.desiredGeneration = 0;
    state.durableGeneration = 0;
    state.latestJob = null;
    state.failedJob = null;
    state.status = {
      ...IDLE_STATUS,
      saveId,
    };
    if (latestSaveId === saveId) {
      latestSaveId = null;
    }
    notifyListeners();
    return deletionResult;
  } catch (error) {
    state.captureBlocked = wasBlocked;
    state.captureEpoch += 1;
    notifyListeners();
    throw error;
  }
}

/**
 * Retires child branch coordinators before a root's atomic storage cascade so
 * delayed branch exports cannot recreate orphan rows after the root is gone.
 */
export async function retireSaveTreePersistenceForDelete<T>(
  saveId: string,
  deleteRecord: () => Promise<T>,
): Promise<T> {
  const barriers = await beginSaveTreePersistenceBarrier(saveId);
  try {
    const deletionResult = await deleteRecord();
    barriers.forEach(tombstoneSavePersistenceBarrier);
    notifyListeners();
    return deletionResult;
  } catch (error) {
    restoreSavePersistenceBarriers(barriers);
    throw error;
  }
}

export async function persistActiveSaveSnapshot({
  activeSaveId,
  activeSaveSlot,
  gmName,
  teamName,
  season,
  saveName: explicitSaveName,
  exportSnapshot,
}: PersistActiveSaveSnapshotOptions): Promise<PersistActiveSaveSnapshotResult> {
  if (activeSaveId == null) {
    return { saved: false, saveName: null };
  }

  const state = ensureState(activeSaveId);
  while (state.capturePaused && !state.captureBlocked) {
    await new Promise<void>((resolve) => {
      state.captureResumeWaiters.push(resolve);
    });
  }
  const captureEpoch = state.captureEpoch;
  if (state.captureBlocked) {
    return { saved: false, saveName: null };
  }

  let snapshot: object;
  state.activeCaptures += 1;
  try {
    snapshot = await exportSnapshot();
  } catch (error) {
    if (state.captureBlocked || state.captureEpoch !== captureEpoch) {
      return { saved: false, saveName: null };
    }
    markPreCaptureFailure(activeSaveId, error, 'export');
    throw error;
  } finally {
    state.activeCaptures -= 1;
    resolveCaptureQuiescenceWaiters(state);
  }

  if (state.captureBlocked || state.captureEpoch !== captureEpoch) {
    return { saved: false, saveName: null };
  }

  const generation = state.desiredGeneration + 1;
  const saveName = explicitSaveName?.trim()
    || saveNameForSnapshot(snapshot, season, gmName, teamName);
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
  states.forEach((state) => {
    state.activeCaptures = 0;
    resolveQuiescenceWaiters(state);
    resolveCaptureQuiescenceWaiters(state);
    resumePausedCaptures(state);
  });
  states.clear();
  listeners.clear();
  latestSaveId = null;
}
