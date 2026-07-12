// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activateActiveSavePersistenceMetadata,
  beginSimAdvancePersistenceLease,
  captureSimAdvanceBaselineSeal,
  captureSimAdvanceSnapshot,
  closeCommittedSimAdvancePersistenceLeaseFailClosed,
  failCloseActiveSaveSessionTransition,
  finishSimAdvancePersistenceLease,
  finishReservedActiveSaveSessionTransition,
  getActiveSavePersistenceStatus,
  persistActiveSaveSnapshot,
  poisonSimAdvancePersistenceLease,
  prepareActiveSaveSessionTransition,
  resetActiveSavePersistenceForTesting,
  reserveActiveSaveSessionTransitionCommit,
  retryActiveSavePersistence,
  stageActiveSavePersistenceMetadataForTransition,
  waitForActiveSavePersistenceReceipt,
  markActiveSaveSessionTransitionOwnershipCommitted,
} from './activeSavePersistence';
import {
  assertSimAdvanceWorkerSessionCurrent,
  beginSimAdvanceWorkerMutation,
  beginSimAdvanceWorkerSession,
  beginWorkerMutation,
  finishSimAdvanceWorkerSession,
  finishWorkerMutation,
  resetWorkerMutationSessionForTesting,
  subscribeToWorkerMutationPause,
} from './workerMutationSession';
import {
  commitSimAdvanceBaselineSeal,
  commitSimAdvanceSnapshot,
  saveGameById,
  type SaveData,
  type SimAdvanceBaselineSealProof,
  type SimAdvanceIntent,
} from './saveSystem';
import {
  beginSaveSessionOwnership,
  commitSaveSessionOwnership,
  enableSaveSessionOwnershipEnforcement,
  releaseActiveSaveSessionOwnership,
  resetSaveSessionOwnershipForTesting,
  type WebLockManagerLike,
} from './saveSessionOwnership';
import {
  beginBootRecoveryAdmission,
  failBootRecoveryAdmission,
  resetBootRecoveryAdmissionForTesting,
} from './bootRecoveryAdmission';

vi.mock('./saveSystem', async (importOriginal) => ({
  ...await importOriginal<typeof import('./saveSystem')>(),
  deleteSaveById: vi.fn(),
  listSaveTreeChildIds: vi.fn().mockResolvedValue([]),
  loadGameById: vi.fn(),
  restoreSaveIntegrityBackup: vi.fn(),
  saveGameById: vi.fn(),
  commitSimAdvanceBaselineSeal: vi.fn(),
  commitSimAdvanceSnapshot: vi.fn(),
  scheduleAutoSave: vi.fn(),
}));

class MemoryWebLockManager implements WebLockManagerLike {
  private readonly held = new Set<string>();

  async request<T>(
    name: string,
    _options: { mode: 'exclusive'; ifAvailable: true },
    callback: (lock: { name: string; mode: 'exclusive' } | null) => T | PromiseLike<T>,
  ): Promise<T> {
    if (this.held.has(name)) return await callback(null);
    this.held.add(name);
    try {
      return await callback({ name, mode: 'exclusive' });
    } finally {
      this.held.delete(name);
    }
  }
}

function savedRecord(id: string): SaveData {
  return {
    id,
    name: 'Owned Dynasty',
    updatedAt: '2026-07-11T13:00:00.000Z',
  } as SaveData;
}

function baselineSealProof(
  saveId = 'save-slot-1',
  rootSaveId = saveId,
): SimAdvanceBaselineSealProof {
  return {
    saveId,
    rootSaveId,
    source: 'unsealed_primary_no_shadow',
    baseline: { id: saveId, name: 'Owned Dynasty' } as SaveData,
    workerSnapshot: { schemaVersion: 34, season: 7, day: 12, phase: 'regular' } as never,
    primaryCanonical: `primary:${saveId}`,
    shadowCanonical: null,
  } as unknown as SimAdvanceBaselineSealProof;
}

function postIntent(saveId: string, rootSaveId: string): SimAdvanceIntent {
  return {
    journalVersion: 1,
    saveId,
    rootSaveId,
    operation: 'sim_day',
    baselineChecksum: 'a'.repeat(64),
    baselineSeason: 7,
    baselineDay: 12,
    baselinePhase: 'regular',
    attempt: 200,
    token: `session-post:${saveId}`,
  };
}

describe('active persistence save-session fencing', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetBootRecoveryAdmissionForTesting();
    resetActiveSavePersistenceForTesting();
    await resetSaveSessionOwnershipForTesting();
    vi.stubGlobal('navigator', { locks: new MemoryWebLockManager() });
    enableSaveSessionOwnershipEnforcement();
    vi.mocked(saveGameById).mockImplementation(async (id) => savedRecord(id));
    vi.mocked(commitSimAdvanceBaselineSeal).mockImplementation(async (proof) => savedRecord(proof.saveId));
    vi.mocked(commitSimAdvanceSnapshot).mockImplementation(async (intent) => savedRecord(intent.saveId));
  });

  afterEach(async () => {
    resetBootRecoveryAdmissionForTesting();
    resetActiveSavePersistenceForTesting();
    resetWorkerMutationSessionForTesting();
    await resetSaveSessionOwnershipForTesting();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function own(saveId: string, rootSaveId = saveId) {
    await commitSaveSessionOwnership(
      await beginSaveSessionOwnership(rootSaveId),
      saveId,
    );
    activateActiveSavePersistenceMetadata(savedRecord(saveId));
  }

  it.each([
    ['root', 'save-slot-1', 'save-slot-1', 1],
    ['branch', 'branch-1', 'save-slot-1', null],
  ])('committed-closes the latest durable %s post receipt after actual ownership release without falsifying status', async (_kind, saveId, rootSaveId, activeSaveSlot) => {
    await own(saveId, rootSaveId);
    const lease = await beginSimAdvancePersistenceLease(saveId, rootSaveId);
    const baselineReceipt = await captureSimAdvanceBaselineSeal(lease, baselineSealProof(saveId, rootSaveId), {
      activeSaveId: saveId, activeSaveSlot, gmName: 'Owner', teamName: 'Tycoons', season: 7,
      exportSnapshot: async () => ({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
    });
    await expect(waitForActiveSavePersistenceReceipt(baselineReceipt)).resolves.toMatchObject({ kind: 'durable' });
    const postReceipt = await captureSimAdvanceSnapshot(lease, postIntent(saveId, rootSaveId), {
      activeSaveId: saveId, activeSaveSlot, gmName: 'Owner', teamName: 'Tycoons', season: 7,
      exportSnapshot: async () => ({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' }),
    });
    await expect(waitForActiveSavePersistenceReceipt(postReceipt)).resolves.toMatchObject({ kind: 'durable' });
    const before = structuredClone(getActiveSavePersistenceStatus(saveId));

    await releaseActiveSaveSessionOwnership();
    expect(() => closeCommittedSimAdvancePersistenceLeaseFailClosed(lease, postReceipt)).not.toThrow();
    expect(getActiveSavePersistenceStatus(saveId)).toEqual(before);
  });

  it('rechecks exact ownership after delayed export and never enqueues a stale write', async () => {
    await own('save-slot-1');
    let resolveExport!: (snapshot: object) => void;
    const exportStarted = vi.fn();
    const persistence = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Owner',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: () => new Promise<object>((resolve) => {
        exportStarted();
        resolveExport = resolve;
      }),
    });
    await Promise.resolve();
    expect(exportStarted).toHaveBeenCalledTimes(1);

    await releaseActiveSaveSessionOwnership();
    resolveExport({ schemaVersion: 34, season: 4, day: 92 });

    await expect(persistence).rejects.toMatchObject({ kind: 'not_owner' });
    expect(saveGameById).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus('save-slot-1')).toMatchObject({
      state: 'idle',
      pendingWrites: 0,
      canRetry: false,
    });
  });

  it('rejects manual Retry before status or storage changes after ownership ends', async () => {
    vi.useFakeTimers();
    await own('save-slot-1');
    vi.mocked(saveGameById).mockRejectedValueOnce(
      new Error('QuotaExceededError: storage full'),
    );
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Owner',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 93 }),
    })).rejects.toThrow('storage full');
    const failedStatus = getActiveSavePersistenceStatus('save-slot-1');
    expect(failedStatus).toMatchObject({ state: 'failed', pendingWrites: 1 });

    await releaseActiveSaveSessionOwnership();
    await expect(retryActiveSavePersistence('save-slot-1')).rejects.toMatchObject({
      kind: 'not_owner',
    });
    expect(saveGameById).toHaveBeenCalledTimes(1);
    expect(getActiveSavePersistenceStatus('save-slot-1')).toEqual(failedStatus);
  });

  it('rejects a sibling exact save even when this tab owns the same root tree', async () => {
    await own('branch-alpha', 'save-slot-1');
    const exportSnapshot = vi.fn().mockResolvedValue({ schemaVersion: 34 });

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'branch-beta',
      activeSaveSlot: null,
      gmName: 'Stale Branch',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot,
    })).rejects.toMatchObject({ kind: 'not_owner' });
    expect(exportSnapshot).not.toHaveBeenCalled();
    expect(saveGameById).not.toHaveBeenCalled();
  });

  it('releases durable post persistence only inside a validated worker-session finish callback', async () => {
    await own('save-slot-1');
    const lease = await beginSimAdvancePersistenceLease('save-slot-1', 'save-slot-1');
    const baselineReceipt = await captureSimAdvanceBaselineSeal(lease, baselineSealProof(), {
      activeSaveId: 'save-slot-1', activeSaveSlot: 1, gmName: 'Owner', teamName: 'Tycoons', season: 7,
      exportSnapshot: async () => ({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
    });
    await expect(waitForActiveSavePersistenceReceipt(baselineReceipt)).resolves.toMatchObject({ kind: 'durable' });
    const postReceipt = await captureSimAdvanceSnapshot(lease, postIntent('save-slot-1', 'save-slot-1'), {
      activeSaveId: 'save-slot-1', activeSaveSlot: 1, gmName: 'Owner', teamName: 'Tycoons', season: 7,
      exportSnapshot: async () => ({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' }),
    });
    await expect(waitForActiveSavePersistenceReceipt(postReceipt)).resolves.toMatchObject({ kind: 'durable' });
    const before = structuredClone(getActiveSavePersistenceStatus('save-slot-1'));
    const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    const events: string[] = [];

    finishSimAdvanceWorkerSession(session, () => {
      events.push('persistence');
      finishSimAdvancePersistenceLease(lease);
    });

    expect(events).toEqual(['persistence']);
    expect(getActiveSavePersistenceStatus('save-slot-1')).toEqual(before);
    const ordinaryPermit = beginWorkerMutation('save-slot-1');
    finishWorkerMutation(ordinaryPermit);
    const freshLease = await beginSimAdvancePersistenceLease('save-slot-1', 'save-slot-1');
    finishSimAdvancePersistenceLease(freshLease);
  });

  it('keeps both real lanes fenced when worker validation or the persistence callback fails', async () => {
    await own('save-slot-1');
    const lease = await beginSimAdvancePersistenceLease('save-slot-1', 'save-slot-1');
    const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    const callback = vi.fn();
    expect(() => finishSimAdvanceWorkerSession({ ...session } as typeof session, callback)).toThrow('no longer active');
    expect(callback).not.toHaveBeenCalled();
    expect(() => assertSimAdvanceWorkerSessionCurrent(session, 'save-slot-1', 'save-slot-1')).not.toThrow();

    const permit = beginSimAdvanceWorkerMutation(session, 'save-slot-1');
    expect(() => finishSimAdvanceWorkerSession(session, callback)).toThrow('worker work is still active');
    expect(callback).not.toHaveBeenCalled();
    finishWorkerMutation(permit);

    expect(() => finishSimAdvanceWorkerSession(session, () => { throw new Error('persistence release failed'); }))
      .toThrow('persistence release failed');
    expect(() => assertSimAdvanceWorkerSessionCurrent(session, 'save-slot-1', 'save-slot-1')).not.toThrow();
    await expect(beginSimAdvancePersistenceLease('save-slot-1', 'save-slot-1')).rejects.toThrow('already active');

    poisonSimAdvancePersistenceLease(lease);
    expect(getActiveSavePersistenceStatus('save-slot-1')).toMatchObject({ state: 'failed', canRetry: false });
    await expect(beginSimAdvancePersistenceLease('save-slot-1', 'save-slot-1')).rejects.toThrow('fail-closed');
    const ordinaryExport = vi.fn();
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1', activeSaveSlot: 1, gmName: 'Owner', teamName: 'Tycoons', season: 7,
      exportSnapshot: ordinaryExport,
    })).resolves.toEqual({ saved: false, saveName: null });
    expect(ordinaryExport).not.toHaveBeenCalled();
    expect(() => beginWorkerMutation('save-slot-1')).toThrowError(expect.objectContaining({ kind: 'not_owner' }));
  });

  it('leaves a successor worker session and newly activated lease untouched by a stale finish handle', async () => {
    await own('save-slot-1');
    const firstLease = await beginSimAdvancePersistenceLease('save-slot-1', 'save-slot-1');
    const first = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    finishSimAdvanceWorkerSession(first, () => finishSimAdvancePersistenceLease(firstLease));
    activateActiveSavePersistenceMetadata(savedRecord('save-slot-1'));
    const successorLease = await beginSimAdvancePersistenceLease('save-slot-1', 'save-slot-1');
    const successor = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    const staleCallback = vi.fn();

    expect(() => finishSimAdvanceWorkerSession(first, staleCallback)).toThrow('no longer active');
    expect(staleCallback).not.toHaveBeenCalled();
    expect(() => assertSimAdvanceWorkerSessionCurrent(successor, 'save-slot-1', 'save-slot-1')).not.toThrow();
    finishSimAdvanceWorkerSession(successor, () => finishSimAdvancePersistenceLease(successorLease));
  });

  it('rejects stale ordinary export and persistence before invocation while boot recovery owns the candidate', async () => {
    await own('save-slot-1');
    const recovery = beginBootRecoveryAdmission('save-slot-2', 'save-slot-2');
    const exportSnapshot = vi.fn();

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1', activeSaveSlot: 1, gmName: 'A', teamName: 'Tycoons', season: 7,
      exportSnapshot,
    })).rejects.toThrow('Boot recovery is active');
    expect(exportSnapshot).not.toHaveBeenCalled();
    expect(() => beginWorkerMutation('save-slot-1')).toThrow('Boot recovery is active');

    failBootRecoveryAdmission(recovery, new Error('candidate failed'));
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1', activeSaveSlot: 1, gmName: 'A', teamName: 'Tycoons', season: 7,
      exportSnapshot,
    })).rejects.toThrow('Boot recovery is active');
    expect(exportSnapshot).not.toHaveBeenCalled();
  });

  it('holds transition barriers through a reserved durable boot delete and releases once', async () => {
    await own('save-slot-1');
    const transition = await prepareActiveSaveSessionTransition('save-slot-2');
    markActiveSaveSessionTransitionOwnershipCommitted(transition);
    stageActiveSavePersistenceMetadataForTransition(transition, savedRecord('save-slot-2'));
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({
      saveId: 'save-slot-2', saveName: 'Owned Dynasty', pendingWrites: 0,
    });
    const reservation = reserveActiveSaveSessionTransitionCommit(transition);
    let resolveDelete!: () => void;
    const durableDelete = vi.fn(() => new Promise<void>((resolve) => { resolveDelete = resolve; }));
    const completion = finishReservedActiveSaveSessionTransition(reservation, durableDelete);

    await Promise.resolve();
    expect(durableDelete).toHaveBeenCalledTimes(1);
    expect(() => beginWorkerMutation('save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    const staleExport = vi.fn();
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Boot', teamName: 'Tycoons', season: 7,
      exportSnapshot: staleExport,
    })).rejects.toMatchObject({ kind: 'not_owner' });
    expect(staleExport).not.toHaveBeenCalled();

    resolveDelete();
    await expect(completion).resolves.toBeUndefined();
    const permit = beginWorkerMutation('save-slot-2');
    finishWorkerMutation(permit);
  });

  it('does all staging before the durable callback and keeps observer failures out of its total tail', async () => {
    await own('save-slot-1');
    const transition = await prepareActiveSaveSessionTransition('save-slot-2');
    markActiveSaveSessionTransitionOwnershipCommitted(transition);
    const callback = vi.fn(async () => undefined);

    expect(() => stageActiveSavePersistenceMetadataForTransition(transition, savedRecord('other-save')))
      .toThrow('exact candidate save');
    expect(callback).not.toHaveBeenCalled();

    stageActiveSavePersistenceMetadataForTransition(transition, savedRecord('save-slot-2'));
    const reservation = reserveActiveSaveSessionTransitionCommit(transition);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const unsubscribe = subscribeToWorkerMutationPause(() => { throw new Error('pause observer'); });

    await expect(finishReservedActiveSaveSessionTransition(reservation, callback)).resolves.toBeUndefined();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
    await expect(finishReservedActiveSaveSessionTransition(reservation, callback)).rejects.toThrow('no longer current');
    unsubscribe();
  });

  it('keeps boot transition fences held when reserved durable delete rejects and terminal close never restores A', async () => {
    await own('save-slot-1');
    const transition = await prepareActiveSaveSessionTransition('save-slot-2');
    markActiveSaveSessionTransitionOwnershipCommitted(transition);
    stageActiveSavePersistenceMetadataForTransition(transition, savedRecord('save-slot-2'));
    const reservation = reserveActiveSaveSessionTransitionCommit(transition);
    const deleteFailure = new Error('intent delete failed');

    await expect(finishReservedActiveSaveSessionTransition(reservation, async () => { throw deleteFailure; }))
      .rejects.toBe(deleteFailure);
    await expect(finishReservedActiveSaveSessionTransition({ ...reservation }, async () => undefined))
      .rejects.toThrow('no longer current');
    expect(() => beginWorkerMutation('save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );

    failCloseActiveSaveSessionTransition(transition);
    const permit = beginWorkerMutation('save-slot-1');
    finishWorkerMutation(permit);
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1', activeSaveSlot: 1, gmName: 'Stale', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn(),
    })).resolves.toEqual({ saved: false, saveName: null });
  });
});
