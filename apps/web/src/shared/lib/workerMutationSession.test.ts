// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import {
  beginWorkerMutation,
  finishWorkerMutation,
  getWorkerMutationPauseSnapshot,
  pauseWorkerMutationsForSaveTransition,
  resetWorkerMutationSessionForTesting,
  resumeWorkerMutationsAfterSaveTransition,
} from './workerMutationSession';

afterEach(() => {
  resetWorkerMutationSessionForTesting();
});

describe('worker mutation save-session gate', () => {
  it('refuses a transition while an accepted gameplay mutation is still running', () => {
    const mutation = beginWorkerMutation('save-slot-1');

    expect(() => pauseWorkerMutationsForSaveTransition()).toThrowError(
      expect.objectContaining({ kind: 'request_failed' }),
    );
    expect(getWorkerMutationPauseSnapshot()).toBe(false);

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
});
