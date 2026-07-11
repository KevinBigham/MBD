import { parseGameSnapshot } from '@mbd/contracts';
import {
  deleteSaveById,
  exportSnapshotToJson,
  listSaveTreeChildIds,
  loadGameById,
  restoreSaveIntegrityBackup,
  saveGameById,
  type SaveData,
} from './saveSystem';
import { assertActiveSaveSessionOwned } from './saveSessionOwnership';
import {
  pauseWorkerMutationsForSaveTransition,
  resetWorkerMutationSessionForTesting,
  resumeWorkerMutationsAfterSaveTransition,
  type WorkerMutationPause,
} from './workerMutationSession';

export type ActiveSavePersistenceState = 'idle' | 'saving' | 'saved' | 'failed';
export type ActiveSavePersistenceFailureKind =
  | 'export'
  | 'quota'
  | 'unavailable'
  | 'indexeddb'
  | 'storage'
  | 'unknown';

export type ActiveSaveRecoveryPhase =
  | 'retry_scheduled'
  | 'retrying'
  | 'fallback_ready'
  | 'recovered';

export interface ActiveSaveRecoveryStatus {
  phase: ActiveSaveRecoveryPhase;
  automaticAttempts: number;
  automaticAttemptLimit: number;
  failureKind: ActiveSavePersistenceFailureKind;
  errorMessage: string;
}

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
  recovery: ActiveSaveRecoveryStatus | null;
}

export interface ActiveSavePersistenceBackup {
  saveId: string;
  generation: number;
  filename: string;
  payload: string;
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
  writeReason: 'capture' | 'automatic' | 'manual';
}

interface RecoveryEpisode {
  automaticAttempts: number;
  automaticEnabled: boolean;
  failureKind: ActiveSavePersistenceFailureKind;
  errorMessage: string;
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
  recoveryEpisode: RecoveryEpisode | null;
  recoveryTimer: ReturnType<typeof setTimeout> | null;
  recoveryEpoch: number;
}

export const ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS = [1_000, 3_000] as const;

const states = new Map<string, SaveCoordinatorState>();
const listeners = new Set<() => void>();
let latestSaveId: string | null = null;
let activeRecoverySaveId: string | null = null;
let activeRecoveryOwnerActivated = false;
let activeSessionTransition: InternalActiveSaveSessionTransition | null = null;

export interface ActiveSaveSessionTransition {
  readonly transitionId: symbol;
  readonly targetSaveId: string;
  readonly outgoingSaveId: string | null;
}

export interface PrepareActiveSaveSessionTransitionOptions {
  persistOutgoingSnapshot?: (
    outgoingSaveId: string,
  ) => Promise<{ saved: boolean; saveName: string | null }>;
}

interface InternalActiveSaveSessionTransition extends ActiveSaveSessionTransition {
  barriers: SavePersistenceBarrier[];
  ownershipCommitted: boolean;
  previousActiveRecoveryOwnerActivated: boolean;
  previousActiveRecoverySaveId: string | null;
  previousLatestSaveId: string | null;
  workerMutationPause: WorkerMutationPause;
}

// Bootstrap/test callers may touch independent save IDs before a dynasty is
// activated. Once activation names the imported worker state, stale closures
// for any other save must not reclaim persistence or recovery ownership.
function claimActiveRecoverySave(saveId: string): boolean {
  if (activeRecoveryOwnerActivated && activeRecoverySaveId !== saveId) {
    return false;
  }
  if (!activeRecoveryOwnerActivated) {
    activeRecoverySaveId = saveId;
  }
  return true;
}

function activatedOwnerExcludes(saveId: string): boolean {
  return activeRecoveryOwnerActivated && activeRecoverySaveId !== saveId;
}

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
  recovery: null,
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
  if (/securityerror|notallowederror|invalidstateerror|private browsing|incognito|operation is insecure|access denied|storage (?:is )?(?:disabled|unavailable)/i.test(message)) {
    return 'unavailable';
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
    recoveryEpisode: null,
    recoveryTimer: null,
    recoveryEpoch: 0,
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

function recoveryStatus(
  episode: RecoveryEpisode,
  phase: ActiveSaveRecoveryPhase,
): ActiveSaveRecoveryStatus {
  return {
    phase,
    automaticAttempts: episode.automaticAttempts,
    automaticAttemptLimit: ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS.length,
    failureKind: episode.failureKind,
    errorMessage: episode.errorMessage,
  };
}

function isRetainedStorageFailure(kind: ActiveSavePersistenceFailureKind): boolean {
  return kind === 'quota'
    || kind === 'unavailable'
    || kind === 'indexeddb'
    || kind === 'storage';
}

function cancelRecoveryTimer(state: SaveCoordinatorState): boolean {
  const hadTimer = state.recoveryTimer != null;
  if (state.recoveryTimer != null) {
    clearTimeout(state.recoveryTimer);
    state.recoveryTimer = null;
  }
  state.recoveryEpoch += 1;
  return hadTimer;
}

function clearRecoveryEpisode(state: SaveCoordinatorState): void {
  cancelRecoveryTimer(state);
  state.recoveryEpisode = null;
}

function exposeRecoveryFallback(saveId: string, state: SaveCoordinatorState): void {
  const episode = state.recoveryEpisode;
  if (!episode) return;
  episode.automaticEnabled = false;
  cancelRecoveryTimer(state);
  updateStatus(saveId, state, {
    state: 'failed',
    canRetry: true,
    errorMessage: episode.errorMessage,
    failureKind: episode.failureKind,
    recovery: recoveryStatus(episode, 'fallback_ready'),
  });
}

function queueAutomaticRetry(saveId: string, state: SaveCoordinatorState): void {
  const episode = state.recoveryEpisode;
  const retryJob = state.failedJob;
  if (!episode || !retryJob) return;
  if (!episode.automaticEnabled
    || episode.automaticAttempts >= ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS.length) {
    exposeRecoveryFallback(saveId, state);
    return;
  }

  cancelRecoveryTimer(state);
  const recoveryEpoch = state.recoveryEpoch;
  const expectedGeneration = retryJob.generation;
  const nextAttempt = episode.automaticAttempts + 1;
  const delay = ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[episode.automaticAttempts] ?? 0;

  state.recoveryTimer = setTimeout(() => {
    state.recoveryTimer = null;
    if (state.recoveryEpoch !== recoveryEpoch
      || activeRecoverySaveId !== saveId
      || state.captureBlocked
      || state.capturePaused
      || state.activeCaptures > 0
      || state.running
      || state.latestJob
      || state.failedJob?.generation !== expectedGeneration
      || !state.recoveryEpisode?.automaticEnabled) {
      return;
    }

    state.recoveryEpisode.automaticAttempts = nextAttempt;
    const automaticJob: PersistedSnapshotJob = {
      ...state.failedJob,
      writeReason: 'automatic',
    };
    state.latestJob = automaticJob;
    state.failedJob = null;
    updateStatus(saveId, state, {
      state: 'saving',
      saveName: automaticJob.saveName,
      canRetry: false,
      errorMessage: null,
      failureKind: null,
      recovery: recoveryStatus(state.recoveryEpisode, 'retrying'),
    });
    flushSave(saveId);
  }, delay);

  updateStatus(saveId, state, {
    state: 'failed',
    canRetry: true,
    errorMessage: episode.errorMessage,
    failureKind: episode.failureKind,
    recovery: recoveryStatus(episode, 'retry_scheduled'),
  });
}

function resumeAutomaticRecovery(saveId: string, state: SaveCoordinatorState): void {
  if (state.captureBlocked
    || state.capturePaused
    || state.activeCaptures > 0
    || state.running
    || state.latestJob
    || state.recoveryTimer
    || !state.failedJob
    || !state.recoveryEpisode?.automaticEnabled) {
    return;
  }
  queueAutomaticRetry(saveId, state);
}

function recordRetainedStorageFailure(
  saveId: string,
  state: SaveCoordinatorState,
  job: PersistedSnapshotJob,
  error: unknown,
): void {
  const failureKind = classifyPersistenceFailure(error, 'storage');
  const message = errorMessage(error);
  const episode = state.recoveryEpisode ?? {
    automaticAttempts: 0,
    automaticEnabled: true,
    failureKind,
    errorMessage: message,
  };
  // Preserve the initiating outage evidence even if later persistence-only
  // attempts fail through a different browser-storage path.
  state.recoveryEpisode = episode;
  state.failedJob = {
    ...job,
    writeReason: 'capture',
  };

  if (!isRetainedStorageFailure(failureKind) || job.writeReason === 'manual') {
    exposeRecoveryFallback(saveId, state);
    return;
  }
  queueAutomaticRetry(saveId, state);
}

function resolveAll(state: SaveCoordinatorState, value: PersistActiveSaveSnapshotResult) {
  const deferreds = state.deferreds.splice(0);
  deferreds.forEach((deferred) => deferred.resolve(value));
}

function rejectAll(state: SaveCoordinatorState, error: unknown) {
  const deferreds = state.deferreds.splice(0);
  deferreds.forEach((deferred) => deferred.reject(error));
}

function cancelPersistenceForLostSessionOwnership(
  saveId: string,
  state: SaveCoordinatorState,
): void {
  cancelRecoveryTimer(state);
  resolveAll(state, { saved: false, saveName: null });
  state.desiredGeneration = state.durableGeneration;
  state.latestJob = null;
  state.failedJob = null;
  clearRecoveryEpisode(state);
  state.captureBlocked = true;
  state.captureEpoch += 1;
  resumePausedCaptures(state);
  state.status = {
    ...IDLE_STATUS,
    saveId,
    saveName: state.status.saveName,
    lastSavedAt: state.status.lastSavedAt,
  };
  notifyListeners();
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
  cancelRecoveryTimer(state);
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
    const childSaveIds = await listSaveTreeChildIds(saveId);
    const childBarriers = childSaveIds.map(beginSavePersistenceBarrier);
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
    resumeAutomaticRecovery(barrier.saveId, barrier.state);
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
  clearRecoveryEpisode(state);
  state.status = {
    ...IDLE_STATUS,
    saveId,
  };
  if (latestSaveId === saveId) {
    latestSaveId = null;
  }
  if (activeRecoverySaveId === saveId) {
    activeRecoverySaveId = null;
    activeRecoveryOwnerActivated = false;
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
  try {
    assertActiveSaveSessionOwned(saveId);
  } catch {
    cancelPersistenceForLostSessionOwnership(saveId, state);
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
        recovery: state.recoveryEpisode
          ? recoveryStatus(state.recoveryEpisode, 'retrying')
          : null,
      });

      try {
        const savedRecord = await writeSnapshotJob(job);
        state.durableGeneration = Math.max(state.durableGeneration, job.generation);
        state.failedJob = null;
        const durableLatest = state.durableGeneration >= state.desiredGeneration && !state.latestJob;
        const episode = state.recoveryEpisode;
        const recovery = episode
          ? recoveryStatus(episode, durableLatest ? 'recovered' : 'retrying')
          : null;
        if (episode && durableLatest) {
          clearRecoveryEpisode(state);
        }
        updateStatus(saveId, state, {
          state: durableLatest ? 'saved' : 'saving',
          saveName: job.saveName,
          canRetry: false,
          lastSavedAt: latestDurableTimestamp(state.status.lastSavedAt, savedRecord.updatedAt),
          errorMessage: null,
          failureKind: null,
          recovery,
        });
        if (durableLatest) {
          resolveAll(state, { saved: true, saveName: job.saveName });
        }
      } catch (error) {
        const staleFailure = state.latestJob != null || job.generation < state.desiredGeneration;
        if (staleFailure) {
          continue;
        }

        recordRetainedStorageFailure(saveId, state, job, error);
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
    recovery: null,
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
  claimActiveRecoverySave(save.id);
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
  cancelRecoveryTimer(state);
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
  resumeAutomaticRecovery(saveId, state);
  notifyListeners();
}

function requireActiveSessionTransition(
  transition: ActiveSaveSessionTransition,
): InternalActiveSaveSessionTransition {
  if (!activeSessionTransition
    || activeSessionTransition.transitionId !== transition.transitionId
    || activeSessionTransition.targetSaveId !== transition.targetSaveId) {
    throw new Error('This active-save session transition is no longer current.');
  }
  return activeSessionTransition;
}

/**
 * Quiesces both the outgoing exact save and the candidate target before a
 * cross-tab ownership handoff. The caller still owns the outgoing browser
 * lock until candidate activation succeeds and the transition completes.
 */
export async function prepareActiveSaveSessionTransition(
  targetSaveId: string,
  options: PrepareActiveSaveSessionTransitionOptions = {},
): Promise<ActiveSaveSessionTransition> {
  if (activeSessionTransition) {
    throw new Error('Another active-save session transition is already in progress.');
  }

  const workerMutationPause = pauseWorkerMutationsForSaveTransition();

  const outgoingSaveId = activeRecoveryOwnerActivated
    ? activeRecoverySaveId
    : null;
  const barriers: SavePersistenceBarrier[] = [];
  const transition: InternalActiveSaveSessionTransition = {
    transitionId: Symbol(`active-save-session:${targetSaveId}`),
    targetSaveId,
    outgoingSaveId,
    barriers,
    ownershipCommitted: false,
    previousActiveRecoveryOwnerActivated: activeRecoveryOwnerActivated,
    previousActiveRecoverySaveId: activeRecoverySaveId,
    previousLatestSaveId: latestSaveId,
    workerMutationPause,
  };
  activeSessionTransition = transition;

  try {
    // A worker mutation can resolve before its route finishes display refresh
    // and requests autosave. Once the mutation lane is paused, force one exact
    // outgoing capture so every accepted worker change is durable before the
    // old browser lock can be released.
    if (outgoingSaveId && options.persistOutgoingSnapshot) {
      const persisted = await options.persistOutgoingSnapshot(outgoingSaveId);
      if (!persisted.saved) {
        throw new Error(
          `Save ${outgoingSaveId} could not be made durable before switching dynasties.`,
        );
      }
    }

    const saveIds = Array.from(new Set([
      ...(outgoingSaveId ? [outgoingSaveId] : []),
      targetSaveId,
    ]));
    barriers.push(...saveIds.map(beginSavePersistenceBarrier));
    latestSaveId = targetSaveId;
    notifyListeners();

    await Promise.all(barriers.map(async (barrier) => {
      await waitForCaptureQuiescence(barrier.state);
      await waitForWriteQuiescence(barrier.saveId, barrier.state);
    }));

    if (outgoingSaveId) {
      const outgoingState = ensureState(outgoingSaveId);
      if (
        pendingWrites(outgoingState) > 0
        || outgoingState.failedJob
        || outgoingState.status.state === 'failed'
      ) {
        throw new Error(
          `Save ${outgoingSaveId} has unresolved persistence work. Retry or download a backup before switching dynasties.`,
        );
      }
    }

    return {
      transitionId: transition.transitionId,
      targetSaveId,
      outgoingSaveId,
    };
  } catch (error) {
    restoreSavePersistenceBarriers(barriers);
    latestSaveId = transition.previousLatestSaveId;
    activeSessionTransition = null;
    resumeWorkerMutationsAfterSaveTransition(workerMutationPause);
    throw error;
  }
}

export function abortActiveSaveSessionTransition(
  transition: ActiveSaveSessionTransition,
): void {
  const current = requireActiveSessionTransition(transition);
  restoreSavePersistenceBarriers(current.barriers);
  latestSaveId = current.ownershipCommitted ? null : current.previousLatestSaveId;
  activeRecoverySaveId = current.ownershipCommitted
    ? null
    : current.previousActiveRecoverySaveId;
  activeRecoveryOwnerActivated = current.ownershipCommitted
    ? false
    : current.previousActiveRecoveryOwnerActivated;
  activeSessionTransition = null;
  resumeWorkerMutationsAfterSaveTransition(current.workerMutationPause);
  notifyListeners();
}

export function markActiveSaveSessionTransitionOwnershipCommitted(
  transition: ActiveSaveSessionTransition,
): void {
  const current = requireActiveSessionTransition(transition);
  current.ownershipCommitted = true;
}

export function completeActiveSaveSessionTransition(
  transition: ActiveSaveSessionTransition,
): void {
  const current = requireActiveSessionTransition(transition);
  if (!current.ownershipCommitted) {
    throw new Error(
      `Save ${current.targetSaveId} ownership must be committed before its session transition can complete.`,
    );
  }
  if (!activeRecoveryOwnerActivated || activeRecoverySaveId !== current.targetSaveId) {
    throw new Error(
      `Save ${current.targetSaveId} must be activated before its session transition can complete.`,
    );
  }

  for (const barrier of current.barriers) {
    if (barrier.saveId === current.targetSaveId) {
      continue;
    }
    cancelRecoveryTimer(barrier.state);
    barrier.state.captureBlocked = true;
    barrier.state.captureEpoch += 1;
    resumePausedCaptures(barrier.state);
  }
  activeSessionTransition = null;
  resumeWorkerMutationsAfterSaveTransition(current.workerMutationPause);
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
  clearRecoveryEpisode(state);
  state.captureBlocked = false;
  state.captureEpoch += 1;
  resumePausedCaptures(state);
  state.status = {
    ...IDLE_STATUS,
    saveId: save.id,
    saveName: save.name,
    lastSavedAt: validDurableTimestamp(save.updatedAt),
  };
  for (const [otherSaveId, otherState] of states) {
    if (otherSaveId !== save.id) {
      cancelRecoveryTimer(otherState);
    }
  }
  latestSaveId = save.id;
  activeRecoverySaveId = save.id;
  activeRecoveryOwnerActivated = true;
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
  assertActiveSaveSessionOwned(resolvedSaveId);

  const state = states.get(resolvedSaveId);
  const retryJob = state?.failedJob;
  if (!state || !retryJob || activeRecoverySaveId !== resolvedSaveId) {
    return { saved: false, saveName: null };
  }
  if (state.captureBlocked || state.capturePaused || state.activeCaptures > 0 || state.running) {
    return { saved: false, saveName: null };
  }

  const episode = state.recoveryEpisode ?? {
    automaticAttempts: 0,
    automaticEnabled: false,
    failureKind: state.status.failureKind ?? 'storage',
    errorMessage: state.status.errorMessage ?? 'Local save failed.',
  };
  episode.automaticEnabled = false;
  state.recoveryEpisode = episode;
  cancelRecoveryTimer(state);
  state.latestJob = {
    ...retryJob,
    writeReason: 'manual',
  };
  state.failedJob = null;
  latestSaveId = resolvedSaveId;
  updateStatus(resolvedSaveId, state, {
    state: 'saving',
    saveName: retryJob.saveName,
    canRetry: false,
    errorMessage: null,
    failureKind: null,
    recovery: recoveryStatus(episode, 'retrying'),
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
export function trackActiveSavePersistenceOperation(
  saveId: string,
  operation: () => Promise<SaveData>,
): Promise<SaveData>;
export function trackActiveSavePersistenceOperation(
  saveId: string,
  operation: () => Promise<SaveData | null>,
): Promise<SaveData | null>;
export async function trackActiveSavePersistenceOperation(
  saveId: string,
  operation: () => Promise<SaveData | null>,
): Promise<SaveData | null> {
  assertActiveSaveSessionOwned(saveId);
  if (!claimActiveRecoverySave(saveId)) {
    throw new Error(`Save ${saveId} is not the active persistence owner.`);
  }
  const state = ensureState(saveId);
  const operationEpoch = state.captureEpoch;
  while (state.capturePaused && !state.captureBlocked) {
    await new Promise<void>((resolve) => {
      state.captureResumeWaiters.push(resolve);
    });
  }
  if (state.captureBlocked || activatedOwnerExcludes(saveId)) {
    throw new Error(`Save ${saveId} is not available for persistence.`);
  }
  if (state.status.state === 'failed') {
    throw new Error(`Save ${saveId} has unresolved persistence work. Retry or save it before changing save metadata.`);
  }

  state.capturePaused = true;
  latestSaveId = saveId;
  notifyListeners();
  await waitForCaptureQuiescence(state);
  await waitForWriteQuiescence(saveId, state);

  if (state.captureBlocked
    || state.captureEpoch !== operationEpoch
    || activatedOwnerExcludes(saveId)) {
    resumePausedCaptures(state);
    throw new Error(`Save ${saveId} is not available for persistence.`);
  }
  if (pendingWrites(state) > 0) {
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
    recovery: null,
  });

  try {
    const savedRecord = await operation();
    if (!savedRecord) {
      // The operation may truthfully complete without mutating this active
      // save (for example, exact branch cleanup while its parent is corrupt).
      // Restore the prior coordinator truth instead of claiming a new durable
      // generation or turning a successful cleanup into a false failure.
      state.desiredGeneration = generation - 1;
      state.status = statusBeforeOperation;
      return null;
    }
    state.durableGeneration = generation;
    state.failedJob = null;
    updateStatus(saveId, state, {
      state: 'saved',
      saveName: savedRecord.name,
      canRetry: false,
      lastSavedAt: latestDurableTimestamp(state.status.lastSavedAt, savedRecord.updatedAt),
      errorMessage: null,
      failureKind: null,
      recovery: null,
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
    resumeAutomaticRecovery(saveId, state);
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

export async function restoreInactiveSaveIntegrityBackup(
  saveId: string,
): Promise<SaveData> {
  const barriers = await beginSaveTreePersistenceBarrier(saveId);
  const targetBarrier = barriers[0]!;

  try {
    const savedRecord = await restoreSaveIntegrityBackup(saveId);
    tombstoneSavePersistenceBarrier(targetBarrier);
    targetBarrier.state.status = {
      ...IDLE_STATUS,
      saveId,
      saveName: savedRecord.name,
      lastSavedAt: validDurableTimestamp(savedRecord.updatedAt),
    };
    restoreSavePersistenceBarriers(barriers.slice(1));
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
  cancelRecoveryTimer(state);
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
    clearRecoveryEpisode(state);
    state.status = {
      ...IDLE_STATUS,
      saveId,
    };
    if (latestSaveId === saveId) {
      latestSaveId = null;
    }
    if (activeRecoverySaveId === saveId) {
      activeRecoverySaveId = null;
      activeRecoveryOwnerActivated = false;
    }
    notifyListeners();
    return deletionResult;
  } catch (error) {
    state.captureBlocked = wasBlocked;
    state.captureEpoch += 1;
    resumeAutomaticRecovery(saveId, state);
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
  assertActiveSaveSessionOwned(activeSaveId);
  if (!claimActiveRecoverySave(activeSaveId)) {
    return { saved: false, saveName: null };
  }

  const state = ensureState(activeSaveId);
  while (state.capturePaused && !state.captureBlocked) {
    await new Promise<void>((resolve) => {
      state.captureResumeWaiters.push(resolve);
    });
  }
  const captureEpoch = state.captureEpoch;
  if (state.captureBlocked || activatedOwnerExcludes(activeSaveId)) {
    return { saved: false, saveName: null };
  }

  const pausedAutomaticRecovery = state.recoveryTimer != null
    ? cancelRecoveryTimer(state)
    : false;
  let resumeRecoveryAfterCapture = false;
  let snapshot: object;
  state.activeCaptures += 1;
  try {
    snapshot = await exportSnapshot();
  } catch (error) {
    resumeRecoveryAfterCapture = pausedAutomaticRecovery;
    if (state.captureBlocked
      || state.captureEpoch !== captureEpoch
      || activatedOwnerExcludes(activeSaveId)) {
      return { saved: false, saveName: null };
    }
    markPreCaptureFailure(activeSaveId, error, 'export');
    throw error;
  } finally {
    state.activeCaptures -= 1;
    resolveCaptureQuiescenceWaiters(state);
    const captureInvalidated = state.captureBlocked
      || state.captureEpoch !== captureEpoch
      || activatedOwnerExcludes(activeSaveId);
    if (resumeRecoveryAfterCapture || (pausedAutomaticRecovery && captureInvalidated)) {
      resumeAutomaticRecovery(activeSaveId, state);
    }
  }

  if (state.captureBlocked
    || state.captureEpoch !== captureEpoch
    || activatedOwnerExcludes(activeSaveId)) {
    return { saved: false, saveName: null };
  }
  assertActiveSaveSessionOwned(activeSaveId);

  const generation = state.desiredGeneration + 1;
  const saveName = explicitSaveName?.trim()
    || saveNameForSnapshot(snapshot, season, gmName, teamName);
  const job: PersistedSnapshotJob = {
    generation,
    saveId: activeSaveId,
    activeSaveSlot,
    saveName,
    snapshot,
    writeReason: 'capture',
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
    recovery: state.recoveryEpisode
      ? recoveryStatus(state.recoveryEpisode, 'retrying')
      : null,
  });

  const persistPromise = new Promise<PersistActiveSaveSnapshotResult>((resolve, reject) => {
    state.deferreds.push({ resolve, reject });
  });
  flushSave(activeSaveId);
  return persistPromise;
}

function backupFilename(saveId: string, generation: number): string {
  const safeSaveId = saveId
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'active-save';
  return `mbd-${safeSaveId}-pending-${generation}.json`;
}

/**
 * Creates an importable safety copy from the exact retained failed job. This
 * does not mutate coordinator state or imply that local persistence recovered.
 */
export function createActiveSavePersistenceBackup(
  saveId?: string | null,
): ActiveSavePersistenceBackup | null {
  const resolvedSaveId = saveId ?? latestSaveId;
  if (!resolvedSaveId || activeRecoverySaveId !== resolvedSaveId) return null;
  const state = states.get(resolvedSaveId);
  const job = state?.failedJob;
  if (!state
    || !job
    || state.status.recovery?.phase !== 'fallback_ready') {
    return null;
  }

  const snapshot = parseGameSnapshot(job.snapshot);
  return {
    saveId: resolvedSaveId,
    generation: job.generation,
    filename: backupFilename(resolvedSaveId, job.generation),
    payload: exportSnapshotToJson(job.saveName, snapshot),
  };
}

export function resetActiveSavePersistenceForTesting(): void {
  states.forEach((state) => {
    clearRecoveryEpisode(state);
    state.activeCaptures = 0;
    resolveQuiescenceWaiters(state);
    resolveCaptureQuiescenceWaiters(state);
    resumePausedCaptures(state);
  });
  states.clear();
  listeners.clear();
  latestSaveId = null;
  activeRecoverySaveId = null;
  activeRecoveryOwnerActivated = false;
  activeSessionTransition = null;
  resetWorkerMutationSessionForTesting();
}
