import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertCapturedBootRecoveryOrdinaryAdmission,
  assertBootRecoveryOrdinaryAdmission,
  beginBootRecoveryAdmission,
  cancelBootRecoveryAdmission,
  commitBootRecoverySuccess,
  consumeBootRecoveryCandidateOperationAuthorization,
  captureBootRecoveryOrdinaryAdmission,
  failBootRecoveryAdmission,
  getBootRecoveryAdmissionStatus,
  reserveBootRecoverySuccess,
  resetBootRecoveryAdmissionForTesting,
  subscribeToBootRecoveryAdmission,
  withBootRecoveryCandidateAuthorization,
} from './bootRecoveryAdmission';

afterEach(() => resetBootRecoveryAdmissionForTesting());

describe('bootRecoveryAdmission', () => {
  it('blocks ordinary work while exact candidate work remains authorized', async () => {
    const permit = beginBootRecoveryAdmission('branch-1', 'save-slot-1');
    expect(() => assertBootRecoveryOrdinaryAdmission()).toThrow('Boot recovery is active');
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const pending = withBootRecoveryCandidateAuthorization(permit, () => {
      expect(consumeBootRecoveryCandidateOperationAuthorization('branch-1')).toBe(true);
      expect(consumeBootRecoveryCandidateOperationAuthorization('branch-1')).toBe(false);
      expect(consumeBootRecoveryCandidateOperationAuthorization('save-slot-1')).toBe(false);
      return held;
    });
    expect(consumeBootRecoveryCandidateOperationAuthorization('branch-1')).toBe(false);
    release();
    await pending;
    const success = reserveBootRecoverySuccess(permit);
    commitBootRecoverySuccess(success);
    expect(() => assertBootRecoveryOrdinaryAdmission()).not.toThrow();
  });

  it('rejects copied, stale, and double permits and isolates observers', () => {
    const observer = vi.fn(() => { throw new Error('observer'); });
    const unsubscribe = subscribeToBootRecoveryAdmission(observer);
    const permit = beginBootRecoveryAdmission('save-slot-1', 'save-slot-1');
    expect(() => reserveBootRecoverySuccess({ ...permit })).toThrow('no longer current');
    const success = reserveBootRecoverySuccess(permit);
    expect(() => reserveBootRecoverySuccess(permit)).toThrow('already reserved');
    // Post-delete finalization is total: a copied callback cannot destroy the
    // live reservation, and a duplicate exact callback cannot throw later.
    commitBootRecoverySuccess({ ...success });
    expect(getBootRecoveryAdmissionStatus()).toMatchObject({ kind: 'recovering' });
    commitBootRecoverySuccess(success);
    expect(() => commitBootRecoverySuccess(success)).not.toThrow();
    expect(() => failBootRecoveryAdmission(permit, new Error('late'))).toThrow('no longer current');
    expect(getBootRecoveryAdmissionStatus()).toEqual({ kind: 'idle' });
    expect(observer).toHaveBeenCalled();
    unsubscribe();
  });

  it('is terminal after failure until reset', () => {
    const permit = beginBootRecoveryAdmission('save-slot-1', 'save-slot-1');
    failBootRecoveryAdmission(permit, new Error('restore failed'));
    expect(getBootRecoveryAdmissionStatus()).toMatchObject({ kind: 'fail_closed', saveId: 'save-slot-1' });
    expect(() => beginBootRecoveryAdmission('save-slot-1', 'save-slot-1')).toThrow('already active');
  });

  it('retires an ordinary admission captured before recovery begins', () => {
    const admission = captureBootRecoveryOrdinaryAdmission();
    const permit = beginBootRecoveryAdmission('save-slot-1', 'save-slot-1');
    expect(() => assertCapturedBootRecoveryOrdinaryAdmission(admission))
      .toThrow('began while ordinary dynasty work was awaiting completion');
    failBootRecoveryAdmission(permit, new Error('candidate import failed'));
  });

  it('returns a no-journal inspection permit to idle only before candidate work', async () => {
    const permit = beginBootRecoveryAdmission('save-slot-1', 'save-slot-1');
    cancelBootRecoveryAdmission(permit);
    expect(getBootRecoveryAdmissionStatus()).toEqual({ kind: 'idle' });
    const active = beginBootRecoveryAdmission('save-slot-1', 'save-slot-1');
    await withBootRecoveryCandidateAuthorization(active, async () => {
      expect(() => cancelBootRecoveryAdmission(active)).toThrow('candidate work is active');
      expect(consumeBootRecoveryCandidateOperationAuthorization('save-slot-1')).toBe(true);
      expect(() => cancelBootRecoveryAdmission(active)).toThrow('candidate work is active');
    });
    failBootRecoveryAdmission(active, new Error('stop'));
  });
});
