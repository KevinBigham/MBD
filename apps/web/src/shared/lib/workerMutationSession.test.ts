// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  beginWorkerMutation,
  beginSimAdvanceWorkerMutation,
  beginSimAdvanceWorkerSession,
  assertSimAdvanceWorkerSessionAdmissionAvailable,
  assertSimAdvanceWorkerSessionCurrent,
  consumeSimAdvanceWorkerAuthorization,
  createSimAdvanceWorkerAuthorization,
  finishSimAdvanceWorkerSession,
  finishWorkerMutation,
  getWorkerMutationPauseSnapshot,
  pauseWorkerMutationsForSaveTransition,
  reserveWorkerMutationPauseRelease,
  commitReservedWorkerMutationPauseRelease,
  cancelReservedWorkerMutationPauseRelease,
  resetWorkerMutationSessionForTesting,
  resumeWorkerMutationsAfterSaveTransition,
  subscribeToWorkerMutationPause,
} from './workerMutationSession';
import {
  beginBootRecoveryAdmission,
  failBootRecoveryAdmission,
  resetBootRecoveryAdmissionForTesting,
} from './bootRecoveryAdmission';

afterEach(() => {
  resetWorkerMutationSessionForTesting();
  resetBootRecoveryAdmissionForTesting();
});

describe('worker mutation save-session gate', () => {
  it('refuses a transition while an accepted gameplay mutation is still running', () => {
    const mutation = beginWorkerMutation('save-slot-1');

    expect(() => pauseWorkerMutationsForSaveTransition()).toThrowError(
      expect.objectContaining({ kind: 'request_failed' }),
    );
    expect(getWorkerMutationPauseSnapshot()).toBe(true);

    finishWorkerMutation(mutation);
    const pause = pauseWorkerMutationsForSaveTransition();
    expect(getWorkerMutationPauseSnapshot()).toBe(true);
    resumeWorkerMutationsAfterSaveTransition(pause);
    expect(getWorkerMutationPauseSnapshot()).toBe(false);
  });

  it('rejects new gameplay mutations until the exact transition pause ends', () => {
    const pause = pauseWorkerMutationsForSaveTransition();

    expect(() => beginWorkerMutation('save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    expect(() => resumeWorkerMutationsAfterSaveTransition({
      pauseId: Symbol('stale-pause'),
    })).toThrow('no longer current');

    resumeWorkerMutationsAfterSaveTransition(pause);
    const mutation = beginWorkerMutation('save-slot-1');
    finishWorkerMutation(mutation);
  });

  it('reserves pause release before a durable delete and commits its tail without observer failure', () => {
    const pause = pauseWorkerMutationsForSaveTransition();
    expect(() => reserveWorkerMutationPauseRelease({ ...pause })).toThrow('cannot reserve release');
    const reservation = reserveWorkerMutationPauseRelease(pause);
    expect(() => reserveWorkerMutationPauseRelease(pause)).toThrow('cannot reserve release');
    expect(() => resumeWorkerMutationsAfterSaveTransition(pause)).toThrow('reserved release');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const unsubscribe = subscribeToWorkerMutationPause(() => { throw new Error('listener'); });

    // A copied/stale post-delete callback is a harmless no-op; it cannot make
    // a successful durable delete fail after its preflight reservation.
    commitReservedWorkerMutationPauseRelease({ ...reservation });
    expect(getWorkerMutationPauseSnapshot()).toBe(true);
    expect(() => commitReservedWorkerMutationPauseRelease(reservation)).not.toThrow();
    expect(getWorkerMutationPauseSnapshot()).toBe(false);
    expect(consoleError).toHaveBeenCalled();
    expect(() => commitReservedWorkerMutationPauseRelease(reservation)).not.toThrow();
    cancelReservedWorkerMutationPauseRelease(reservation);
    unsubscribe();
  });

  it('gates ordinary mutations and save transitions behind one exact simulation journal session', async () => {
    const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    expect(getWorkerMutationPauseSnapshot()).toBe(true);
    expect(() => beginWorkerMutation('save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    expect(() => pauseWorkerMutationsForSaveTransition()).toThrowError(
      expect.objectContaining({ kind: 'request_failed' }),
    );
    expect(() => beginSimAdvanceWorkerMutation(session, 'save-slot-2')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );

    const permit = beginSimAdvanceWorkerMutation(session, 'save-slot-1');
    expect(() => beginSimAdvanceWorkerMutation(session, 'save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    finishWorkerMutation(permit);
    finishSimAdvanceWorkerSession(session);
    expect(getWorkerMutationPauseSnapshot()).toBe(false);
    expect(() => beginWorkerMutation('save-slot-1')).not.toThrow();
  });

  it('rejects simulation admission synchronously while an ordinary permit is active', () => {
    const ordinary = beginWorkerMutation('save-slot-1');
    expect(getWorkerMutationPauseSnapshot()).toBe(true);
    expect(() => assertSimAdvanceWorkerSessionAdmissionAvailable('save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'request_failed' }),
    );
    expect(() => beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'request_failed' }),
    );
    finishWorkerMutation(ordinary);
    expect(getWorkerMutationPauseSnapshot()).toBe(false);
    const session = beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    expect(session).toMatchObject({
      expectedSaveId: 'save-slot-1',
      expectedRootSaveId: 'save-slot-1',
    });
    finishSimAdvanceWorkerSession(session);
  });

  it.each(['recovering', 'fail_closed'] as const)(
    'rejects direct simulation admission synchronously while boot is %s',
    (state) => {
      const recovery = beginBootRecoveryAdmission('save-slot-1', 'save-slot-1');
      if (state === 'fail_closed') failBootRecoveryAdmission(recovery, new Error('boot failed'));
      expect(() => assertSimAdvanceWorkerSessionAdmissionAvailable('save-slot-1')).toThrow('Boot recovery is active');
      expect(() => beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1')).toThrow('Boot recovery is active');
      if (state === 'recovering') failBootRecoveryAdmission(recovery, new Error('stop'));
    },
  );

  it('keeps session acquisition and release coherent when a pause observer throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const unsubscribe = subscribeToWorkerMutationPause(() => { throw new Error('observer'); });
    const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    expect(getWorkerMutationPauseSnapshot()).toBe(true);
    finishSimAdvanceWorkerSession(session);
    expect(getWorkerMutationPauseSnapshot()).toBe(false);
    expect(consoleError).toHaveBeenCalled();
    unsubscribe();
  });

  it('asserts only the exact current session/save/root without allocating a permit', async () => {
    const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    expect(() => assertSimAdvanceWorkerSessionCurrent(session, 'save-slot-1', 'save-slot-1')).not.toThrow();
    expect(() => assertSimAdvanceWorkerSessionCurrent(session, 'save-slot-2', 'save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    expect(() => assertSimAdvanceWorkerSessionCurrent(session, 'save-slot-1', 'save-slot-2')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    const forged = { ...session } as typeof session;
    expect(() => assertSimAdvanceWorkerSessionCurrent(forged, 'save-slot-1', 'save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    finishSimAdvanceWorkerSession(session);
    expect(() => assertSimAdvanceWorkerSessionCurrent(session, 'save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
  });

  it('rejects a previous session after another exact session begins', async () => {
    const first = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    finishSimAdvanceWorkerSession(first);
    const second = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    expect(() => assertSimAdvanceWorkerSessionCurrent(first, 'save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    finishSimAdvanceWorkerSession(second);
  });

  it('cannot issue or consume a worker authorization from forged non-durable journal evidence', async () => {
    const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    expect(() => createSimAdvanceWorkerAuthorization(
      session,
      'save-slot-1',
      'save-slot-1',
      'simDay',
      {},
    )).toThrow('durably prepared simulation intent');
    expect(() => consumeSimAdvanceWorkerAuthorization(
      { authorizationId: Symbol('forged') } as never,
      session,
      'save-slot-1',
      'save-slot-1',
      'simDay',
    )).toThrowError(expect.objectContaining({ kind: 'not_owner' }));
    finishSimAdvanceWorkerSession(session);
  });

  it('requires the exact session, permit, and transition-pause handles to finish their live authority', async () => {
    const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    expect(() => finishSimAdvanceWorkerSession({ ...session } as typeof session))
      .toThrow('no longer active');
    expect(getWorkerMutationPauseSnapshot()).toBe(true);
    finishSimAdvanceWorkerSession(session);

    const permit = beginWorkerMutation('save-slot-1');
    expect(() => finishWorkerMutation({ ...permit } as typeof permit))
      .toThrow('no longer active');
    // The original permit still closes the actual active entry.
    finishWorkerMutation(permit);

    const pause = pauseWorkerMutationsForSaveTransition();
    expect(() => resumeWorkerMutationsAfterSaveTransition({ ...pause } as typeof pause))
      .toThrow('no longer current');
    expect(getWorkerMutationPauseSnapshot()).toBe(true);
    resumeWorkerMutationsAfterSaveTransition(pause);
    expect(getWorkerMutationPauseSnapshot()).toBe(false);
  });

  it('keeps the exact session fenced throughout a beforeRelease callback and rejects reentrant reset/finish', async () => {
    const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    const persistenceRelease = vi.fn();

    finishSimAdvanceWorkerSession(session, () => {
      expect(() => assertSimAdvanceWorkerSessionCurrent(session, 'save-slot-1', 'save-slot-1'))
        .toThrowError(expect.objectContaining({ kind: 'not_owner' }));
      expect(() => beginSimAdvanceWorkerMutation(session, 'save-slot-1'))
        .toThrowError(expect.objectContaining({ kind: 'not_owner' }));
      expect(() => finishSimAdvanceWorkerSession(session)).toThrow('already finishing');
      expect(() => resetWorkerMutationSessionForTesting()).toThrow('cannot reset while a session is finishing');
      persistenceRelease();
    });

    expect(persistenceRelease).toHaveBeenCalledTimes(1);
    expect(getWorkerMutationPauseSnapshot()).toBe(false);
  });
});
