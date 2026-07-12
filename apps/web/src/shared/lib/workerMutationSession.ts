import { SaveSessionOwnershipError } from './saveSessionOwnership';
import { assertBootRecoveryOrdinaryAdmission } from './bootRecoveryAdmission';
import {
  assertDurablyPreparedSimAdvanceIntent,
  claimDurablyPreparedSimAdvanceIntent,
} from './saveSystem';

export interface WorkerMutationPermit {
  readonly permitId: symbol;
  readonly expectedSaveId: string | null;
}

export interface WorkerMutationPause {
  readonly pauseId: symbol;
}

/** Exact pre-delete reservation for a transition pause release. */
export interface WorkerMutationPauseReleaseReservation {
  readonly reservationId: symbol;
}

/** Opaque authority for one whole write-ahead regular-season command. */
export interface SimAdvanceWorkerSession {
  readonly sessionId: symbol;
  readonly expectedSaveId: string;
  readonly expectedRootSaveId: string;
}

declare const simAdvanceWorkerAuthorizationBrand: unique symbol;

/**
 * Opaque one-shot authority issued by the coordinator only after its exact
 * durable intent has resolved. It is runtime provenance, never save data.
 */
export interface SimAdvanceWorkerAuthorization {
  readonly authorizationId: symbol;
  readonly [simAdvanceWorkerAuthorizationBrand]: true;
}

export type SimAdvanceAuthorizedWorkerOperation = 'simDay' | 'simWeek' | 'simMonth' | 'simToPlayoffs';

function journalOperationForWorkerOperation(
  operation: SimAdvanceAuthorizedWorkerOperation,
): 'sim_day' | 'sim_week' | 'sim_month' | 'sim_to_playoffs' {
  switch (operation) {
    case 'simDay': return 'sim_day';
    case 'simWeek': return 'sim_week';
    case 'simMonth': return 'sim_month';
    case 'simToPlayoffs': return 'sim_to_playoffs';
    default:
      throw new Error('Unsupported simulation worker operation.');
  }
}

interface InternalSimAdvanceWorkerAuthorization {
  session: SimAdvanceWorkerSession;
  saveId: string;
  rootSaveId: string;
  operation: SimAdvanceAuthorizedWorkerOperation;
  intent: object;
  consumed: boolean;
}

const activePermits = new Map<symbol, WorkerMutationPermit>();
const pauseListeners = new Set<() => void>();
let activePause: WorkerMutationPause | null = null;
let activePauseReleaseReservation: {
  readonly reservation: WorkerMutationPauseReleaseReservation;
  readonly pause: WorkerMutationPause;
} | null = null;
let activeSimAdvanceSession: SimAdvanceWorkerSession | null = null;
let activeSimAdvanceFinishReservation: symbol | null = null;
let simAdvanceWorkerAuthorizations = new WeakMap<
  SimAdvanceWorkerAuthorization,
  InternalSimAdvanceWorkerAuthorization
>();

function notifyPauseListeners(): void {
  for (const listener of pauseListeners) {
    try {
      listener();
    } catch (error) {
      console.error('Worker mutation session observer failed:', error);
    }
  }
}

export function subscribeToWorkerMutationPause(listener: () => void): () => void {
  pauseListeners.add(listener);
  return () => pauseListeners.delete(listener);
}

export function getWorkerMutationPauseSnapshot(): boolean {
  return activePause != null
    || activeSimAdvanceSession != null
    || activePermits.size > 0;
}

/** Synchronous gate used before the coordinator may publish `preparing`. */
export function assertSimAdvanceWorkerSessionAdmissionAvailable(
  _expectedSaveId: string,
): void {
  // This must precede coordinator presentation/target resolution. Direct
  // callers must not briefly publish `preparing` during boot recovery.
  assertBootRecoveryOrdinaryAdmission();
  if (activePause
    || activeSimAdvanceSession
    || activePermits.size > 0) {
    throw new SaveSessionOwnershipError(
      'request_failed',
      'Another dynasty mutation or save transition is already in progress.',
      null,
    );
  }
}

/**
 * Registers one ordinary gameplay mutation. Candidate-only `newGame` and
 * `importSnapshot` calls intentionally do not use this lane.
 */
export function beginWorkerMutation(
  expectedSaveId: string | null,
): WorkerMutationPermit {
  assertBootRecoveryOrdinaryAdmission();
  if (activePause || activeSimAdvanceSession) {
    throw new SaveSessionOwnershipError(
      'not_owner',
      activeSimAdvanceSession
        ? 'A regular-season simulation is finishing its durable save. Wait before changing the dynasty.'
        : 'A save-session switch is in progress. Finish that switch before changing the dynasty.',
      null,
    );
  }

  const permit = Object.freeze({
    permitId: Symbol(`worker-mutation:${expectedSaveId ?? 'unbound'}`),
    expectedSaveId,
  });
  activePermits.set(permit.permitId, permit);
  notifyPauseListeners();
  return permit;
}

export function beginSimAdvanceWorkerSession(
  expectedSaveId: string,
  expectedRootSaveId: string,
): SimAdvanceWorkerSession {
  assertBootRecoveryOrdinaryAdmission();
  assertSimAdvanceWorkerSessionAdmissionAvailable(expectedSaveId);
  const session = Object.freeze({
    sessionId: Symbol(`sim-advance:${expectedSaveId}`),
    expectedSaveId,
    expectedRootSaveId,
  });
  activeSimAdvanceSession = session;
  notifyPauseListeners();
  return session;
}

export function beginSimAdvanceWorkerMutation(
  session: SimAdvanceWorkerSession,
  expectedSaveId: string | null,
): WorkerMutationPermit {
  assertSimAdvanceWorkerSessionCurrent(session, expectedSaveId);
  if (activePermits.size > 0) {
    throw new SaveSessionOwnershipError(
      'not_owner',
      'This simulation journal no longer owns the worker mutation session.',
      null,
    );
  }
  const permit = Object.freeze({
    permitId: Symbol(`sim-advance-worker-mutation:${expectedSaveId}`),
    expectedSaveId,
  });
  activePermits.set(permit.permitId, permit);
  notifyPauseListeners();
  return permit;
}

/** Validates opaque simulation authority without allocating a worker permit. */
export function assertSimAdvanceWorkerSessionCurrent(
  session: SimAdvanceWorkerSession,
  expectedSaveId: string | null,
  expectedRootSaveId?: string,
): void {
  if (activePause || activeSimAdvanceFinishReservation != null || activeSimAdvanceSession !== session
    || expectedSaveId == null || expectedSaveId !== session.expectedSaveId
    || (expectedRootSaveId != null && expectedRootSaveId !== session.expectedRootSaveId)) {
    throw new SaveSessionOwnershipError(
      'not_owner',
      'This simulation journal no longer owns the worker mutation session.',
      null,
    );
  }
}

/** Internal coordinator issuance boundary; callers cannot forge a WeakMap member. */
export function createSimAdvanceWorkerAuthorization(
  session: SimAdvanceWorkerSession,
  expectedSaveId: string,
  expectedRootSaveId: string,
  operation: SimAdvanceAuthorizedWorkerOperation,
  preparedIntent: object,
): SimAdvanceWorkerAuthorization {
  assertSimAdvanceWorkerSessionCurrent(session, expectedSaveId, expectedRootSaveId);
  // Validation happens before the one-time claim, so malformed/wrong-operation
  // issuance attempts cannot burn the exact durable intent's only worker run.
  claimDurablyPreparedSimAdvanceIntent(
    preparedIntent,
    expectedSaveId,
    expectedRootSaveId,
    journalOperationForWorkerOperation(operation),
  );
  const authorization = Object.freeze({
    authorizationId: Symbol(`sim-advance-authorized:${expectedSaveId}:${operation}`),
  }) as SimAdvanceWorkerAuthorization;
  simAdvanceWorkerAuthorizations.set(authorization, {
    session,
    saveId: expectedSaveId,
    rootSaveId: expectedRootSaveId,
    operation,
    intent: preparedIntent,
    consumed: false,
  });
  return authorization;
}

/** Consumes one exact prepared-intent authorization before the Comlink gameplay call. */
export function consumeSimAdvanceWorkerAuthorization(
  authorization: SimAdvanceWorkerAuthorization,
  session: SimAdvanceWorkerSession,
  expectedSaveId: string | null,
  expectedRootSaveId: string,
  operation: SimAdvanceAuthorizedWorkerOperation,
): void {
  const internal = simAdvanceWorkerAuthorizations.get(authorization);
  if (!internal
    || internal.consumed
    || internal.session !== session
    || internal.saveId !== expectedSaveId
    || internal.rootSaveId !== expectedRootSaveId
    || internal.operation !== operation) {
    throw new SaveSessionOwnershipError(
      'not_owner',
      'This simulation command does not hold the exact prepared journal authorization.',
      null,
    );
  }
  assertDurablyPreparedSimAdvanceIntent(
    internal.intent,
    expectedSaveId,
    expectedRootSaveId,
    journalOperationForWorkerOperation(operation),
  );
  assertSimAdvanceWorkerSessionCurrent(session, expectedSaveId, expectedRootSaveId);
  internal.consumed = true;
}

/**
 * Releases an exact simulation worker session. The optional callback runs
 * while the worker fence is still held, so persistence can finish first only
 * after session validation has made later worker release non-throwing.
 */
export function finishSimAdvanceWorkerSession(
  session: SimAdvanceWorkerSession,
  beforeRelease?: () => void,
): void {
  if (!activeSimAdvanceSession || activeSimAdvanceSession !== session) {
    throw new Error('This simulation journal session is no longer active.');
  }
  if (activePermits.size > 0) {
    throw new Error('Simulation journal worker work is still active.');
  }
  if (activeSimAdvanceFinishReservation != null) {
    throw new Error('This simulation journal session is already finishing.');
  }
  const reservation = Symbol('sim-advance-worker-finish');
  activeSimAdvanceFinishReservation = reservation;
  try {
    beforeRelease?.();
  } catch (error) {
    if (activeSimAdvanceFinishReservation === reservation) {
      activeSimAdvanceFinishReservation = null;
    }
    throw error;
  }
  if (activeSimAdvanceSession !== session || activeSimAdvanceFinishReservation !== reservation) {
    if (activeSimAdvanceFinishReservation === reservation) {
      activeSimAdvanceFinishReservation = null;
    }
    throw new Error('This simulation journal session changed while it was finishing.');
  }
  activeSimAdvanceSession = null;
  activeSimAdvanceFinishReservation = null;
  notifyPauseListeners();
}

export function finishWorkerMutation(permit: WorkerMutationPermit): void {
  if (activePermits.get(permit.permitId) !== permit) {
    throw new Error('This worker-mutation permit is no longer active.');
  }
  activePermits.delete(permit.permitId);
  notifyPauseListeners();
}

/**
 * Closes the ordinary gameplay mutation lane for a save-session transition.
 * An already accepted worker mutation makes the switch fail before any
 * persistence barrier or candidate import is started; the player can retry
 * after that action completes and saves normally.
 */
export function pauseWorkerMutationsForSaveTransition(): WorkerMutationPause {
  if (activePause) {
    throw new Error('Worker mutations are already paused for a save-session transition.');
  }
  if (activePermits.size > 0 || activeSimAdvanceSession) {
    throw new SaveSessionOwnershipError(
      'request_failed',
      'A gameplay action is still running. Let it finish saving before switching dynasties.',
      null,
    );
  }

  const pause = Object.freeze({
    pauseId: Symbol('save-session-worker-mutation-pause'),
  });
  activePause = pause;
  notifyPauseListeners();
  return pause;
}

export function resumeWorkerMutationsAfterSaveTransition(
  pause: WorkerMutationPause,
): void {
  if (activePauseReleaseReservation?.pause === pause) {
    throw new Error('This worker-mutation pause has a reserved release.');
  }
  if (!activePause || activePause !== pause) {
    throw new Error('This worker-mutation pause is no longer current.');
  }
  activePause = null;
  notifyPauseListeners();
}

/** Reserve all validation before the journal's final fallible delete. */
export function reserveWorkerMutationPauseRelease(
  pause: WorkerMutationPause,
): WorkerMutationPauseReleaseReservation {
  if (!activePause || activePause !== pause || activePauseReleaseReservation) {
    throw new Error('This worker-mutation pause cannot reserve release.');
  }
  const reservation = Object.freeze({ reservationId: Symbol('worker-mutation-pause-release') });
  activePauseReleaseReservation = { reservation, pause };
  return reservation;
}

/**
 * Total post-delete tail. Identity was validated by reservation before the
 * delete; stale/double callers are harmless no-ops rather than a new failure
 * branch after durable journal consumption.
 */
export function commitReservedWorkerMutationPauseRelease(
  reservation: WorkerMutationPauseReleaseReservation,
): void {
  if (!activePauseReleaseReservation || activePauseReleaseReservation.reservation !== reservation) {
    return;
  }
  const pause = activePauseReleaseReservation.pause;
  activePauseReleaseReservation = null;
  if (activePause === pause) {
    activePause = null;
  }
  notifyPauseListeners();
}

/** Terminal boot cleanup may cancel a pre-delete reservation safely. */
export function cancelReservedWorkerMutationPauseRelease(
  reservation: WorkerMutationPauseReleaseReservation | null,
): void {
  if (!reservation || !activePauseReleaseReservation || activePauseReleaseReservation.reservation !== reservation) {
    return;
  }
  const pause = activePauseReleaseReservation.pause;
  activePauseReleaseReservation = null;
  if (activePause === pause) activePause = null;
  notifyPauseListeners();
}

export function resetWorkerMutationSessionForTesting(): void {
  if (activeSimAdvanceFinishReservation != null) {
    throw new Error('Simulation journal worker state cannot reset while a session is finishing.');
  }
  activePermits.clear();
  activePause = null;
  activePauseReleaseReservation = null;
  activeSimAdvanceSession = null;
  activeSimAdvanceFinishReservation = null;
  simAdvanceWorkerAuthorizations = new WeakMap<
    SimAdvanceWorkerAuthorization,
    InternalSimAdvanceWorkerAuthorization
  >();
  notifyPauseListeners();
}
