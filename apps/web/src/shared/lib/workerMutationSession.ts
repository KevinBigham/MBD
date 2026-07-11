import { SaveSessionOwnershipError } from './saveSessionOwnership';

export interface WorkerMutationPermit {
  readonly permitId: symbol;
  readonly expectedSaveId: string | null;
}

export interface WorkerMutationPause {
  readonly pauseId: symbol;
}

const activePermits = new Map<symbol, WorkerMutationPermit>();
const pauseListeners = new Set<() => void>();
let activePause: WorkerMutationPause | null = null;

function notifyPauseListeners(): void {
  for (const listener of pauseListeners) listener();
}

export function subscribeToWorkerMutationPause(listener: () => void): () => void {
  pauseListeners.add(listener);
  return () => pauseListeners.delete(listener);
}

export function getWorkerMutationPauseSnapshot(): boolean {
  return activePause != null;
}

/**
 * Registers one ordinary gameplay mutation. Candidate-only `newGame` and
 * `importSnapshot` calls intentionally do not use this lane.
 */
export function beginWorkerMutation(
  expectedSaveId: string | null,
): WorkerMutationPermit {
  if (activePause) {
    throw new SaveSessionOwnershipError(
      'not_owner',
      'A save-session switch is in progress. Finish that switch before changing the dynasty.',
      null,
    );
  }

  const permit = Object.freeze({
    permitId: Symbol(`worker-mutation:${expectedSaveId ?? 'unbound'}`),
    expectedSaveId,
  });
  activePermits.set(permit.permitId, permit);
  return permit;
}

export function finishWorkerMutation(permit: WorkerMutationPermit): void {
  if (!activePermits.delete(permit.permitId)) {
    throw new Error('This worker-mutation permit is no longer active.');
  }
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
  if (activePermits.size > 0) {
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
  if (!activePause || activePause.pauseId !== pause.pauseId) {
    throw new Error('This worker-mutation pause is no longer current.');
  }
  activePause = null;
  notifyPauseListeners();
}

export function resetWorkerMutationSessionForTesting(): void {
  activePermits.clear();
  activePause = null;
  notifyPauseListeners();
}
