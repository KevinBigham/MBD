import { parseGameSnapshot } from '@mbd/contracts';
import {
  deleteSaveById,
  exportSnapshotToJson,
  listSaveTreeChildIds,
  loadGameById,
  restoreSaveIntegrityBackup,
  saveGameById,
  commitSimAdvanceBaselineSeal,
  commitSimAdvanceSnapshot,
  SimAdvanceEvidenceConflictError,
  type SimAdvanceIntent,
  type SimAdvanceBaselineSealProof,
  type SaveData,
} from './saveSystem';
import { SaveIntegrityUnavailableError } from './saveIntegrity';
import { assertActiveSaveSessionOwned, SaveSessionOwnershipError } from './saveSessionOwnership';
import {
  pauseWorkerMutationsForSaveTransition,
  reserveWorkerMutationPauseRelease,
  commitReservedWorkerMutationPauseRelease,
  cancelReservedWorkerMutationPauseRelease,
  resetWorkerMutationSessionForTesting,
  resumeWorkerMutationsAfterSaveTransition,
  type WorkerMutationPause,
  type WorkerMutationPauseReleaseReservation,
} from './workerMutationSession';
import {
  assertBootRecoveryOrdinaryAdmission,
  assertCapturedBootRecoveryOrdinaryAdmission,
  captureBootRecoveryOrdinaryAdmission,
} from './bootRecoveryAdmission';

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
  onSnapshotAccepted?: (receipt: ActiveSavePersistenceReceipt) => void;
}

export interface ActiveSaveSnapshotCaptureOptions {
  activeSaveId: string | null | undefined;
  activeSaveSlot: number | null | undefined;
  gmName: string | null | undefined;
  teamName: string | null | undefined;
  season: number;
  saveName?: string;
  exportSnapshot: () => Promise<object>;
}

declare const activeSavePersistenceReceiptBrand: unique symbol;
declare const simAdvancePersistenceLeaseBrand: unique symbol;

/**
 * Opaque runtime identity for one accepted snapshot capture. Object identity is
 * retained across persistence-only Retry and is never serialized into a save.
 */
export interface ActiveSavePersistenceReceipt {
  readonly generation: number;
  readonly saveId: string;
  readonly [activeSavePersistenceReceiptBrand]: true;
}

export interface SimAdvancePersistenceLease {
  readonly leaseId: symbol;
  readonly saveId: string;
  readonly rootSaveId: string;
  readonly [simAdvancePersistenceLeaseBrand]: true;
}

export type ActiveSavePersistenceReceiptOutcome =
  | { kind: 'durable'; record: SaveData }
  | { kind: 'retired'; reason: 'ownership_lost' | 'activation' | 'delete' | 'replace' | 'fail_closed' | 'reset' };

type PersistedSnapshotCommit =
  | { readonly kind: 'ordinary' }
  | {
      readonly kind: 'baseline_seal';
      readonly leaseId: symbol;
      readonly proof: SimAdvanceBaselineSealProof;
    }
  | { readonly kind: 'sim_advance'; readonly leaseId: symbol; readonly intent: SimAdvanceIntent };

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
  receipt: ActiveSavePersistenceReceipt;
  writeReason: 'capture' | 'automatic' | 'manual';
  commit: PersistedSnapshotCommit;
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
  durableReceipt: ActiveSavePersistenceReceipt | null;
  simAdvanceCurrentReceipt: ActiveSavePersistenceReceipt | null;
  latestJob: PersistedSnapshotJob | null;
  failedJob: PersistedSnapshotJob | null;
  runningJob: PersistedSnapshotJob | null;
  /** A fail-closed request made while this exact journal transaction still runs. */
  simAdvanceRunningRetirement: ActiveSavePersistenceReceipt | null;
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
  simAdvanceFailClosed: boolean;
}

/** A clean admission refusal: existing ordinary persistence remains authoritative. */
export class SimAdvancePersistenceAdmissionBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SimAdvancePersistenceAdmissionBlockedError';
  }
}

export const ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS = [1_000, 3_000] as const;

const states = new Map<string, SaveCoordinatorState>();
const listeners = new Set<() => void>();
let latestSaveId: string | null = null;
let activeRecoverySaveId: string | null = null;
let activeRecoveryOwnerActivated = false;
let activeSessionTransition: InternalActiveSaveSessionTransition | null = null;
const simAdvanceLeases = new Map<string, SimAdvancePersistenceLease>();
const receiptWaiters = new Map<ActiveSavePersistenceReceipt, Array<(outcome: ActiveSavePersistenceReceiptOutcome) => void>>();
const receiptOutcomes = new Map<ActiveSavePersistenceReceipt, ActiveSavePersistenceReceiptOutcome>();
type ReceiptProvenance =
  | { readonly kind: 'ordinary' }
  | { readonly kind: 'sim_advance'; readonly leaseId: symbol };
let receiptProvenance = new WeakMap<ActiveSavePersistenceReceipt, ReceiptProvenance>();

function settleReceipt(receipt: ActiveSavePersistenceReceipt, outcome: ActiveSavePersistenceReceiptOutcome): void {
  if (receiptOutcomes.has(receipt)) return;
  receiptOutcomes.set(receipt, outcome);
  const waiters = receiptWaiters.get(receipt) ?? [];
  receiptWaiters.delete(receipt);
  waiters.forEach((resolve) => resolve(outcome));
}

function registerReceipt(
  receipt: ActiveSavePersistenceReceipt,
  provenance: ReceiptProvenance,
): void {
  receiptProvenance.set(receipt, provenance);
}

function requireIssuedSimAdvanceReceipt(
  receipt: ActiveSavePersistenceReceipt,
): Extract<ReceiptProvenance, { kind: 'sim_advance' }> {
  const provenance = receiptProvenance.get(receipt);
  if (!provenance || provenance.kind !== 'sim_advance') {
    throw new Error('This persistence receipt is not an exact issued simulation receipt.');
  }
  return provenance;
}

function retireLeaseReceipt(state: SaveCoordinatorState, reason: Extract<ActiveSavePersistenceReceiptOutcome, { kind: 'retired' }>['reason']): void {
  for (const job of [state.latestJob, state.failedJob]) {
    if (job && job.commit.kind !== 'ordinary') settleReceipt(job.receipt, { kind: 'retired', reason });
  }
}

export interface ActiveSaveSessionTransition {
  readonly transitionId: symbol;
  readonly targetSaveId: string;
  readonly outgoingSaveId: string | null;
}

export interface ActiveSaveSessionTransitionCommitReservation {
  readonly reservationId: symbol;
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
  workerPauseReleaseReservation: WorkerMutationPauseReleaseReservation | null;
  stagedTarget: Pick<SaveData, 'id' | 'name' | 'updatedAt'> | null;
  commitReservation: ActiveSaveSessionTransitionCommitReservation | null;
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
  // Integrity availability is a runtime capability boundary, not a mismatch
  // in the exact simulation evidence. Keep the accepted job intact so a
  // later persistence-only retry can verify and commit the same snapshot.
  if (error instanceof SaveIntegrityUnavailableError) {
    return 'unavailable';
  }
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
    durableReceipt: null,
    simAdvanceCurrentReceipt: null,
    latestJob: null,
    failedJob: null,
    runningJob: null,
    simAdvanceRunningRetirement: null,
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
    simAdvanceFailClosed: false,
  };
  states.set(saveId, state);
  return state;
}

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      // A status observer runs after state has changed. It must never turn a
      // committed IndexedDB transaction into a false persistence failure.
      console.error('Active save persistence observer failed:', error);
    }
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

function deepFreezeLeasedSnapshot(value: unknown, seen = new WeakSet<object>()): void {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    deepFreezeLeasedSnapshot((value as Record<PropertyKey, unknown>)[key], seen);
  }
  Object.freeze(value);
}

function cloneAndFreezeLeasedSnapshot<T extends object>(snapshot: T): T {
  const frozen = structuredClone(snapshot) as T;
  deepFreezeLeasedSnapshot(frozen);
  return frozen;
}

function commitMatchesLease(
  commit: PersistedSnapshotCommit,
  lease: SimAdvancePersistenceLease,
): boolean {
  if (commit.kind === 'ordinary') return false;
  if (commit.leaseId !== lease.leaseId) return false;
  if (commit.kind === 'baseline_seal') {
    return commit.proof.saveId === lease.saveId
      && commit.proof.rootSaveId === lease.rootSaveId;
  }
  return commit.intent.saveId === lease.saveId
    && commit.intent.rootSaveId === lease.rootSaveId;
}

function isCurrentLeaseRetry(job: PersistedSnapshotJob | null, saveId: string): boolean {
  if (!job || job.commit.kind === 'ordinary') return false;
  const lease = simAdvanceLeases.get(saveId);
  return lease != null && commitMatchesLease(job.commit, lease);
}

function assertNoSimAdvancePersistenceLease(saveId: string): void {
  const lease = simAdvanceLeases.get(saveId);
  if (lease) {
    throw new Error(`Save ${saveId} has an active simulation persistence lease and cannot change persistence state.`);
  }
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
      || (state.captureBlocked && !isCurrentLeaseRetry(state.failedJob, saveId))
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
  if ((state.captureBlocked && !isCurrentLeaseRetry(state.failedJob, saveId))
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
  retireLeaseReceipt(state, 'ownership_lost');
  simAdvanceLeases.delete(saveId);
  cancelRecoveryTimer(state);
  resolveAll(state, { saved: false, saveName: null });
  state.desiredGeneration = state.durableGeneration;
  state.latestJob = null;
  state.failedJob = null;
  state.durableReceipt = null;
  state.simAdvanceCurrentReceipt = null;
  clearRecoveryEpisode(state);
  state.simAdvanceFailClosed = true;
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
  assertNoSimAdvancePersistenceLease(saveId);
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
  retireLeaseReceipt(state, 'delete');
  simAdvanceLeases.delete(saveId);
  resolveAll(state, { saved: false, saveName: null });
  state.desiredGeneration = 0;
  state.durableGeneration = 0;
  state.latestJob = null;
  state.failedJob = null;
  state.durableReceipt = null;
  state.simAdvanceCurrentReceipt = null;
  state.simAdvanceFailClosed = false;
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
  if (job.commit.kind === 'baseline_seal' || job.commit.kind === 'sim_advance') {
    const lease = simAdvanceLeases.get(job.saveId);
    if (!lease || !commitMatchesLease(job.commit, lease)) {
      throw new Error('Simulation persistence lease is no longer current.');
    }
    if (job.commit.kind === 'baseline_seal') {
      return commitSimAdvanceBaselineSeal(job.commit.proof, job.snapshot);
    }
    return commitSimAdvanceSnapshot(job.commit.intent, job.saveName, job.snapshot);
  }
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
      state.runningJob = job;
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
        state.durableReceipt = job.receipt;
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
        if (job.commit.kind !== 'ordinary') {
          settleReceipt(job.receipt, { kind: 'durable', record: savedRecord });
        }
      } catch (error) {
        const staleFailure = state.latestJob != null || job.generation < state.desiredGeneration;
        if (staleFailure) {
          continue;
        }

        // Poison may arrive while IndexedDB has already accepted this exact
        // journal transaction. Do not pre-settle it: a later commit is still
        // durable truth, while a later rejection must retire exactly once and
        // must never resurrect Retry.
        if (state.simAdvanceRunningRetirement === job.receipt) {
          settleReceipt(job.receipt, { kind: 'retired', reason: 'fail_closed' });
          clearRecoveryEpisode(state);
          state.failedJob = null;
          state.simAdvanceCurrentReceipt = null;
          state.simAdvanceFailClosed = true;
          state.captureBlocked = true;
          updateStatus(saveId, state, {
            state: 'failed',
            canRetry: false,
            errorMessage: errorMessage(error),
            failureKind: classifyPersistenceFailure(error, 'unknown'),
            recovery: null,
          });
          continue;
        }

        const journalFailureKind = classifyPersistenceFailure(error, 'unknown');
        const ownershipLost = error instanceof SaveSessionOwnershipError;
        const semanticConflict = error instanceof SimAdvanceEvidenceConflictError;
        const terminalJournalFailure = job.commit.kind !== 'ordinary'
          && (ownershipLost || semanticConflict || !isRetainedStorageFailure(journalFailureKind));
        if (terminalJournalFailure) {
          settleReceipt(job.receipt, { kind: 'retired', reason: ownershipLost ? 'ownership_lost' : 'fail_closed' });
          simAdvanceLeases.delete(saveId);
          clearRecoveryEpisode(state);
          state.failedJob = null;
          state.simAdvanceCurrentReceipt = null;
          state.simAdvanceFailClosed = true;
          state.captureBlocked = true;
          updateStatus(saveId, state, {
            state: 'failed', canRetry: false, errorMessage: errorMessage(error),
            failureKind: journalFailureKind, recovery: null,
          });
        } else {
          recordRetainedStorageFailure(saveId, state, job, error);
        }
        if (job.commit.kind === 'ordinary') rejectAll(state, error);
      } finally {
        state.running = false;
        state.runningJob = null;
        if (state.simAdvanceRunningRetirement === job.receipt) {
          state.simAdvanceRunningRetirement = null;
        }
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

/** True only after the exact accepted snapshot represented by this receipt wrote durably. */
export function isActiveSavePersistenceReceiptDurable(
  receipt: ActiveSavePersistenceReceipt,
): boolean {
  return states.get(receipt.saveId)?.durableReceipt === receipt;
}

export async function beginSimAdvancePersistenceLease(
  saveId: string,
  rootSaveId: string,
): Promise<SimAdvancePersistenceLease> {
  const bootAdmission = captureBootRecoveryOrdinaryAdmission();
  assertActiveSaveSessionOwned(saveId);
  if (!activeRecoveryOwnerActivated || activeRecoverySaveId !== saveId) {
    throw new Error('Simulation persistence requires the exact activated active save owner.');
  }
  if (simAdvanceLeases.has(saveId)) throw new Error('A simulation persistence lease is already active for this save.');
  const state = ensureState(saveId);
  if (state.simAdvanceFailClosed) {
    throw new Error('Simulation persistence is fail-closed until this save is coherently activated again.');
  }
  if (state.failedJob || state.captureBlocked || state.capturePaused) {
    throw new SimAdvancePersistenceAdmissionBlockedError(
      'Existing persistence recovery or a save transition must settle before simulation can begin.',
    );
  }
  const previousCaptureBlocked = state.captureBlocked;
  state.captureBlocked = true;
  state.captureEpoch += 1;
  try {
    // Fence new exports first, then let already accepted ordinary work reach
    // its own truthful outcome. A successful accepted write is compatible;
    // only a retained failure is a clean blocked admission.
    await waitForCaptureQuiescence(state);
    await waitForWriteQuiescence(saveId, state);
    assertCapturedBootRecoveryOrdinaryAdmission(bootAdmission);
    assertActiveSaveSessionOwned(saveId);
    if (!activeRecoveryOwnerActivated || activeRecoverySaveId !== saveId) {
      throw new SimAdvancePersistenceAdmissionBlockedError(
        'The active persistence owner changed while simulation persistence was quiescing.',
      );
    }
    if (state.failedJob || state.latestJob || state.running || state.runningJob) {
      throw new SimAdvancePersistenceAdmissionBlockedError(
        'Existing persistence recovery must complete before simulation can begin.',
      );
    }
  } catch (error) {
    // This lease never existed, so restore only our temporary capture fence.
    // Do not rewrite a valid ordinary recovery status or retire its receipt.
    state.captureBlocked = previousCaptureBlocked;
    state.captureEpoch += 1;
    resumePausedCaptures(state);
    resumeAutomaticRecovery(saveId, state);
    notifyListeners();
    throw error;
  }
  // A new lease must never inherit a durable receipt from an earlier ordinary
  // write or a completed simulation attempt. Only captures accepted by this
  // exact lease can later require its committed-close path.
  state.simAdvanceCurrentReceipt = null;
  const lease = Object.freeze({ leaseId: Symbol(`sim-advance-persistence:${saveId}`), saveId, rootSaveId }) as SimAdvancePersistenceLease;
  simAdvanceLeases.set(saveId, lease);
  notifyListeners();
  return lease;
}

function assertCurrentSimAdvanceLease(lease: SimAdvancePersistenceLease): SaveCoordinatorState {
  if (simAdvanceLeases.get(lease.saveId) !== lease) throw new Error('Simulation persistence lease is no longer current.');
  assertActiveSaveSessionOwned(lease.saveId);
  return ensureState(lease.saveId);
}

async function captureLeasedSnapshot(
  lease: SimAdvancePersistenceLease,
  commit: PersistedSnapshotCommit,
  options: ActiveSaveSnapshotCaptureOptions,
): Promise<ActiveSavePersistenceReceipt> {
  if (options.activeSaveId !== lease.saveId) throw new Error('Simulation snapshot capture targets a different save.');
  if (!commitMatchesLease(commit, lease)) {
    throw new Error('Simulation proof or intent does not match persistence lease.');
  }
  const state = assertCurrentSimAdvanceLease(lease);
  if (state.latestJob || state.failedJob || state.running) throw new Error('Simulation persistence lease is not quiescent.');
  state.activeCaptures += 1;
  let exportedSnapshot: object;
  try { exportedSnapshot = await options.exportSnapshot(); } finally {
    state.activeCaptures -= 1;
    resolveCaptureQuiescenceWaiters(state);
  }
  assertCurrentSimAdvanceLease(lease);
  if (!commitMatchesLease(commit, lease)) {
    throw new Error('Simulation proof or intent changed before persistence capture was accepted.');
  }
  const snapshot = cloneAndFreezeLeasedSnapshot(exportedSnapshot);
  const generation = state.desiredGeneration + 1;
  const receipt = Object.freeze({ generation, saveId: lease.saveId }) as ActiveSavePersistenceReceipt;
  const saveName = commit.kind === 'baseline_seal'
    ? commit.proof.baseline.name
    : options.saveName?.trim() || saveNameForSnapshot(snapshot, options.season, options.gmName, options.teamName);
  const job: PersistedSnapshotJob = {
    generation, saveId: lease.saveId, activeSaveSlot: options.activeSaveSlot,
    saveName,
    snapshot, receipt, writeReason: 'capture', commit,
  };
  registerReceipt(receipt, { kind: 'sim_advance', leaseId: lease.leaseId });
  state.simAdvanceCurrentReceipt = receipt;
  state.desiredGeneration = generation;
  state.latestJob = job;
  latestSaveId = lease.saveId;
  updateStatus(lease.saveId, state, { state: 'saving', saveName: job.saveName, canRetry: false, errorMessage: null, failureKind: null, recovery: null });
  flushSave(lease.saveId);
  return receipt;
}

export function captureSimAdvanceBaselineSeal(
  lease: SimAdvancePersistenceLease,
  proof: SimAdvanceBaselineSealProof,
  options: ActiveSaveSnapshotCaptureOptions,
): Promise<ActiveSavePersistenceReceipt> {
  if (proof.saveId !== lease.saveId || proof.rootSaveId !== lease.rootSaveId) {
    throw new Error('Simulation baseline seal proof does not match persistence lease.');
  }
  return captureLeasedSnapshot(lease, { kind: 'baseline_seal', leaseId: lease.leaseId, proof }, options);
}

export async function captureSimAdvanceSnapshot(
  lease: SimAdvancePersistenceLease,
  intent: SimAdvanceIntent,
  options: ActiveSaveSnapshotCaptureOptions,
): Promise<ActiveSavePersistenceReceipt> {
  // The caller's journal object is mutable JavaScript data. Capture a single
  // immutable private copy *before* export, then retain that exact object on
  // every automatic/manual retry. This keeps a late caller mutation from
  // changing the command that the receipt eventually commits.
  const retainedIntent = cloneAndFreezeLeasedSnapshot(intent);
  if (retainedIntent.saveId !== lease.saveId || retainedIntent.rootSaveId !== lease.rootSaveId) {
    throw new Error('Simulation intent does not match persistence lease.');
  }
  return captureLeasedSnapshot(
    lease,
    { kind: 'sim_advance', leaseId: lease.leaseId, intent: retainedIntent },
    options,
  );
}

export function waitForActiveSavePersistenceReceipt(receipt: ActiveSavePersistenceReceipt): Promise<ActiveSavePersistenceReceiptOutcome> {
  // Do not touch receipt fields or register a waiter until the exact object
  // has been proven to be a live issued simulation receipt. A spread/forged
  // receipt, ordinary receipt, or receipt from a reset runtime cannot attach
  // to another command's settlement lifecycle.
  requireIssuedSimAdvanceReceipt(receipt);
  const settled = receiptOutcomes.get(receipt);
  if (settled) return Promise.resolve(settled);
  const state = states.get(receipt.saveId);
  if (state?.durableReceipt === receipt) throw new Error('Durable receipt outcome was not recorded.');
  return new Promise((resolve) => {
    const waiters = receiptWaiters.get(receipt) ?? [];
    waiters.push(resolve);
    receiptWaiters.set(receipt, waiters);
  });
}

export function finishSimAdvancePersistenceLease(lease: SimAdvancePersistenceLease): void {
  const state = assertCurrentSimAdvanceLease(lease);
  if (state.latestJob || state.failedJob || state.running || state.durableGeneration < state.desiredGeneration) {
    throw new Error('Simulation persistence lease cannot finish before its receipt is durable.');
  }
  simAdvanceLeases.delete(lease.saveId);
  state.simAdvanceCurrentReceipt = null;
  state.captureBlocked = false;
  state.captureEpoch += 1;
  notifyListeners();
}

/**
 * Closes a lease after storage committed but subsequent publication must fail
 * closed. It intentionally does not require live ownership and never changes
 * already-durable persistence truth.
 */
export function closeCommittedSimAdvancePersistenceLeaseFailClosed(
  lease: SimAdvancePersistenceLease,
  receipt: ActiveSavePersistenceReceipt,
): void {
  const provenance = requireIssuedSimAdvanceReceipt(receipt);
  if (simAdvanceLeases.get(lease.saveId) !== lease) {
    throw new Error('Simulation persistence lease is no longer current.');
  }
  const state = ensureState(lease.saveId);
  const outcome = receiptOutcomes.get(receipt);
  if (
    provenance.leaseId !== lease.leaseId
    || receipt.saveId !== lease.saveId
    || state.simAdvanceCurrentReceipt !== receipt
    || state.durableReceipt !== receipt
    || outcome?.kind !== 'durable'
    || state.running
    || state.latestJob
    || state.failedJob
    || state.desiredGeneration !== state.durableGeneration
  ) {
    throw new Error('Simulation persistence committed close requires the exact quiescent durable receipt.');
  }
  simAdvanceLeases.delete(lease.saveId);
  state.simAdvanceCurrentReceipt = null;
  state.simAdvanceFailClosed = true;
  state.captureBlocked = true;
  state.captureEpoch += 1;
  notifyListeners();
}

export function poisonSimAdvancePersistenceLease(lease: SimAdvancePersistenceLease): void {
  const state = ensureState(lease.saveId);
  if (simAdvanceLeases.get(lease.saveId) !== lease) return;
  const currentReceipt = state.simAdvanceCurrentReceipt;
  const currentProvenance = currentReceipt
    ? receiptProvenance.get(currentReceipt)
    : null;
  if (
    currentReceipt
    && currentProvenance?.kind === 'sim_advance'
    && currentProvenance.leaseId === lease.leaseId
    && state.durableReceipt === currentReceipt
    && receiptOutcomes.get(currentReceipt)?.kind === 'durable'
    && state.desiredGeneration === state.durableGeneration
    && !state.running
    && !state.latestJob
    && !state.failedJob
  ) {
    throw new Error('A durable simulation receipt must use committed fail-closed lease close.');
  }
  const runningJob = state.runningJob;
  const runningJournalReceipt = runningJob != null && runningJob.commit.kind !== 'ordinary'
    ? runningJob.receipt
    : null;
  if (runningJournalReceipt) {
    // The transaction may already commit after this call. Its own completion
    // decides durable versus retired; do not fabricate a receipt outcome now.
    state.simAdvanceRunningRetirement = runningJournalReceipt;
  } else {
    retireLeaseReceipt(state, 'fail_closed');
  }
  simAdvanceLeases.delete(lease.saveId);
  clearRecoveryEpisode(state);
  state.latestJob = null;
  state.failedJob = null;
  state.simAdvanceCurrentReceipt = null;
  state.simAdvanceFailClosed = true;
  state.captureBlocked = true;
  state.captureEpoch += 1;
  updateStatus(lease.saveId, state, {
    state: 'failed', canRetry: false, errorMessage: 'Simulation persistence requires a verified reload.',
    failureKind: 'unknown', recovery: null,
  });
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
  assertNoSimAdvancePersistenceLease(save.id);
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
  assertNoSimAdvancePersistenceLease(saveId);
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
  assertNoSimAdvancePersistenceLease(saveId);
  const state = states.get(saveId);
  if (!state) return;
  if (state.simAdvanceFailClosed) {
    notifyListeners();
    return;
  }
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
    workerPauseReleaseReservation: null,
    stagedTarget: null,
    commitReservation: null,
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

/** Stages imported candidate metadata without reopening its capture lane. */
export function stageActiveSavePersistenceMetadataForTransition(
  transition: ActiveSaveSessionTransition,
  save: Pick<SaveData, 'id' | 'name' | 'updatedAt'>,
): void {
  const current = requireActiveSessionTransition(transition);
  if (save.id !== current.targetSaveId) {
    throw new Error('Transition metadata must match the exact candidate save.');
  }
  const state = ensureState(save.id);
  if (!state.captureBlocked || state.running || state.latestJob || state.failedJob || pendingWrites(state) > 0) {
    throw new Error('The candidate persistence lane is not quiescent for boot recovery staging.');
  }
  applyActiveSavePersistenceMetadata(save, true);
  current.stagedTarget = save;
}

export function reserveActiveSaveSessionTransitionCommit(
  transition: ActiveSaveSessionTransition,
): ActiveSaveSessionTransitionCommitReservation {
  const current = requireActiveSessionTransition(transition);
  if (!current.ownershipCommitted || !current.stagedTarget || current.commitReservation) {
    throw new Error('The exact candidate transition is not ready for a reserved commit.');
  }
  const targetState = ensureState(current.targetSaveId);
  if (!targetState.captureBlocked || targetState.running || targetState.latestJob || targetState.failedJob || pendingWrites(targetState) > 0) {
    throw new Error('The candidate persistence lane changed before reserved commit.');
  }
  if (!activeRecoveryOwnerActivated || activeRecoverySaveId !== current.targetSaveId) {
    throw new Error('The exact candidate persistence owner was not staged before reserved commit.');
  }
  const workerPauseReleaseReservation = reserveWorkerMutationPauseRelease(current.workerMutationPause);
  const reservation = Object.freeze({ reservationId: Symbol(`transition-commit:${current.targetSaveId}`) });
  current.workerPauseReleaseReservation = workerPauseReleaseReservation;
  current.commitReservation = reservation;
  return reservation;
}

/**
 * Keeps the worker pause/barriers held through the sole remaining fallible
 * durable delete. The tail is deliberately synchronous and exception-safe.
 */
export async function finishReservedActiveSaveSessionTransition(
  reservation: ActiveSaveSessionTransitionCommitReservation,
  durableCommit: () => Promise<void>,
): Promise<void> {
  const current = activeSessionTransition;
  if (!current || current.commitReservation !== reservation || !current.stagedTarget || !current.workerPauseReleaseReservation) {
    throw new Error('This reserved active-save transition is no longer current.');
  }
  await durableCommit();
  // No awaited or fallible activation/reset work is permitted after the
  // journal delete: staging completed it before this callback was admitted.
  for (const barrier of current.barriers) {
    if (barrier.saveId === current.targetSaveId) {
      barrier.state.captureBlocked = false;
      barrier.state.captureEpoch += 1;
      resumePausedCaptures(barrier.state);
    } else {
      tombstoneSavePersistenceBarrier(barrier);
    }
  }
  const workerPauseReleaseReservation = current.workerPauseReleaseReservation;
  activeSessionTransition = null;
  commitReservedWorkerMutationPauseRelease(workerPauseReleaseReservation);
  notifyListeners();
}

/** Terminal boot cleanup: never revive outgoing persistence ownership. */
export function failCloseActiveSaveSessionTransition(transition: ActiveSaveSessionTransition): void {
  const current = requireActiveSessionTransition(transition);
  for (const barrier of current.barriers) {
    cancelRecoveryTimer(barrier.state);
    barrier.state.captureBlocked = true;
    barrier.state.captureEpoch += 1;
    barrier.state.simAdvanceFailClosed = true;
  }
  activeRecoverySaveId = null;
  activeRecoveryOwnerActivated = false;
  latestSaveId = null;
  cancelReservedWorkerMutationPauseRelease(current.workerPauseReleaseReservation);
  activeSessionTransition = null;
  if (!current.workerPauseReleaseReservation) {
    try { resumeWorkerMutationsAfterSaveTransition(current.workerMutationPause); }
    catch (error) { console.error('Terminal transition worker-pause release failed:', error); }
  }
  notifyListeners();
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

/** Applies an imported record's durable owner reset. Callers choose whether
 * the capture lane remains fenced through a journal delete. */
function applyActiveSavePersistenceMetadata(
  save: Pick<SaveData, 'id' | 'name' | 'updatedAt'>,
  keepCaptureBlocked: boolean,
): void {
  assertNoSimAdvancePersistenceLease(save.id);
  const state = ensureState(save.id);
  if (state.running || state.latestJob) {
    throw new Error(`Save ${save.id} must be quiescent before activation.`);
  }

  resolveAll(state, { saved: false, saveName: null });
  state.desiredGeneration = 0;
  state.durableGeneration = 0;
  state.latestJob = null;
  state.failedJob = null;
  state.durableReceipt = null;
  state.simAdvanceCurrentReceipt = null;
  state.simAdvanceFailClosed = false;
  clearRecoveryEpisode(state);
  state.captureBlocked = keepCaptureBlocked;
  state.captureEpoch += 1;
  if (!keepCaptureBlocked) {
    resumePausedCaptures(state);
  }
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

/**
 * Activates the exact durable record that was imported into the worker. This
 * is intentionally stronger than metadata reconciliation: an explicit load
 * supersedes any retained retry job from an older runtime session.
 */
export function activateActiveSavePersistenceMetadata(
  save: Pick<SaveData, 'id' | 'name' | 'updatedAt'>,
): void {
  applyActiveSavePersistenceMetadata(save, false);
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
  const bootAdmission = captureBootRecoveryOrdinaryAdmission();
  const resolvedSaveId = saveId ?? latestSaveId;
  if (!resolvedSaveId) {
    return { saved: false, saveName: null };
  }
  assertActiveSaveSessionOwned(resolvedSaveId);

  const state = states.get(resolvedSaveId);
  // A failed write publishes its retry state before its async loop clears the
  // running flag. Manual Retry must join that accepted write rather than
  // returning a false negative and leaving an exact journal receipt pending.
  if (state?.running) {
    await waitForWriteQuiescence(resolvedSaveId, state);
    assertCapturedBootRecoveryOrdinaryAdmission(bootAdmission);
    return retryActiveSavePersistence(resolvedSaveId);
  }
  const retryJob = state?.failedJob;
  if (!state || !retryJob || activeRecoverySaveId !== resolvedSaveId) {
    return { saved: false, saveName: null };
  }
  if ((state.captureBlocked && !isCurrentLeaseRetry(retryJob, resolvedSaveId))
    || state.capturePaused || state.activeCaptures > 0) {
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
  const bootAdmission = captureBootRecoveryOrdinaryAdmission();
  assertActiveSaveSessionOwned(saveId);
  assertNoSimAdvancePersistenceLease(saveId);
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
  try {
    assertCapturedBootRecoveryOrdinaryAdmission(bootAdmission);
  } catch (error) {
    resumePausedCaptures(state);
    throw error;
  }

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
  assertNoSimAdvancePersistenceLease(saveId);
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
    state.durableReceipt = null;
    state.simAdvanceCurrentReceipt = null;
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
  onSnapshotAccepted,
}: PersistActiveSaveSnapshotOptions): Promise<PersistActiveSaveSnapshotResult> {
  const bootAdmission = captureBootRecoveryOrdinaryAdmission();
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

  // A recovery may have started while the worker export was in flight. That
  // stale ordinary capture must disappear without becoming a misleading
  // export failure/retry episode.
  try {
    assertCapturedBootRecoveryOrdinaryAdmission(bootAdmission);
  } catch {
    return { saved: false, saveName: null };
  }

  if (state.captureBlocked
    || state.captureEpoch !== captureEpoch
    || activatedOwnerExcludes(activeSaveId)) {
    return { saved: false, saveName: null };
  }
  assertActiveSaveSessionOwned(activeSaveId);

  const generation = state.desiredGeneration + 1;
  const receipt = Object.freeze({
    generation,
    saveId: activeSaveId,
  }) as ActiveSavePersistenceReceipt;
  registerReceipt(receipt, { kind: 'ordinary' });
  const saveName = explicitSaveName?.trim()
    || saveNameForSnapshot(snapshot, season, gmName, teamName);
  const job: PersistedSnapshotJob = {
    generation,
    saveId: activeSaveId,
    activeSaveSlot,
    saveName,
    snapshot,
    receipt,
    writeReason: 'capture',
    commit: { kind: 'ordinary' },
  };

  state.desiredGeneration = generation;
  state.latestJob = job;
  state.failedJob = null;
  try {
    onSnapshotAccepted?.(receipt);
  } catch {
    // Receipt observation is advisory and must never strand an accepted write.
  }
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
    retireLeaseReceipt(state, 'reset');
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
  simAdvanceLeases.clear();
  receiptWaiters.forEach((waiters) => waiters.forEach((resolve) => resolve({ kind: 'retired', reason: 'reset' })));
  receiptWaiters.clear();
  receiptOutcomes.clear();
  receiptProvenance = new WeakMap<ActiveSavePersistenceReceipt, ReceiptProvenance>();
  resetWorkerMutationSessionForTesting();
}
