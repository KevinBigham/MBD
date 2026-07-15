import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseGameSnapshot } from '@mbd/contracts';
import snapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v34/core.json';
import {
  ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS,
  beginExactSaveMutationPersistenceLease,
  beginSimAdvancePersistenceLease,
  captureExactSaveMutationSnapshot,
  captureSimAdvanceBaselineSeal,
  captureSimAdvanceSnapshot,
  closeCommittedSimAdvancePersistenceLeaseFailClosed,
  abortActiveSaveSessionTransition,
  activateActiveSavePersistenceMetadata,
  completeActiveSaveSessionTransition,
  markActiveSaveSessionTransitionOwnershipCommitted,
  createActiveSavePersistenceBackup,
  finishSimAdvancePersistenceLease,
  finishExactSaveMutationPersistenceLease,
  getActiveSavePersistenceStatus,
  isActiveSavePersistenceReceiptDurable,
  persistActiveSaveSnapshot,
  poisonSimAdvancePersistenceLease,
  prepareActiveSaveSessionTransition,
  prepareActiveSavePersistenceForLoad,
  reconcileActiveSavePersistenceMetadata,
  releaseActiveSavePersistenceLoad,
  replaceInactiveSavePersistenceRecord,
  resetActiveSavePersistenceForTesting,
  restoreInactiveSaveIntegrityBackup,
  retireActiveSavePersistenceForDelete,
  retireSaveTreePersistenceForDelete,
  retryActiveSavePersistence,
  subscribeToActiveSavePersistenceStatus,
  trackActiveSavePersistenceOperation,
  waitForActiveSavePersistenceReceipt,
  waitForExactSaveMutationPersistenceReceipt,
  waitForOrdinaryActiveSavePersistenceReceipt,
  SimAdvancePersistenceAdmissionBlockedError,
  type ActiveSavePersistenceReceipt,
} from './activeSavePersistence';
import {
  deleteSaveById,
  commitSimAdvanceSnapshot,
  commitSimAdvanceBaselineSeal,
  importSnapshotFromJson,
  listSaveTreeChildIds,
  loadGameById,
  restoreSaveIntegrityBackup,
  saveGameById,
  scheduleAutoSave,
  type SaveData,
  type SimAdvanceBaselineSealProof,
  type SimAdvanceIntent,
  SimAdvanceEvidenceConflictError,
} from './saveSystem';
import { SaveIntegrityUnavailableError } from './saveIntegrity';
import {
  beginWorkerMutation,
  finishWorkerMutation,
} from './workerMutationSession';
import { SaveSessionOwnershipError } from './saveSessionOwnership';

vi.mock('./saveSystem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./saveSystem')>();
  return {
    ...actual,
    deleteSaveById: vi.fn(),
    listSaveTreeChildIds: vi.fn(),
    loadGameById: vi.fn(),
    restoreSaveIntegrityBackup: vi.fn(),
    saveGameById: vi.fn(),
    commitSimAdvanceBaselineSeal: vi.fn(),
    commitSimAdvanceSnapshot: vi.fn(),
    scheduleAutoSave: vi.fn(),
  };
});

const mockedLoadGameById = vi.mocked(loadGameById);
const mockedDeleteSaveById = vi.mocked(deleteSaveById);
const mockedListSaveTreeChildIds = vi.mocked(listSaveTreeChildIds);
const mockedRestoreSaveIntegrityBackup = vi.mocked(restoreSaveIntegrityBackup);
const mockedSaveGameById = vi.mocked(saveGameById);
const mockedCommitSimAdvanceBaselineSeal = vi.mocked(commitSimAdvanceBaselineSeal);
const mockedCommitSimAdvanceSnapshot = vi.mocked(commitSimAdvanceSnapshot);
const mockedScheduleAutoSave = vi.mocked(scheduleAutoSave);

async function flushPromises(times = 5) {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

function savedRecord(
  id: string,
  updatedAt = '2026-04-02T19:42:03.000Z',
): SaveData {
  return {
    id,
    name: 'Durable Dynasty',
    updatedAt,
  } as SaveData;
}

function baselineSealProof(
  saveId = 'save-slot-2',
  rootSaveId = saveId,
  name = 'Assessed Baseline Name',
): SimAdvanceBaselineSealProof {
  return {
    saveId,
    rootSaveId,
    source: 'unsealed_primary_no_shadow',
    baseline: { id: saveId, name } as SaveData,
    workerSnapshot: { schemaVersion: 34, season: 7, day: 12, phase: 'regular' } as never,
    primaryCanonical: `primary:${saveId}`,
    shadowCanonical: null,
  } as unknown as SimAdvanceBaselineSealProof;
}

function simAdvanceIntent(
  overrides: Partial<SimAdvanceIntent> = {},
): SimAdvanceIntent {
  return {
    journalVersion: 1,
    saveId: 'save-slot-2',
    rootSaveId: 'save-slot-2',
    operation: 'sim_day',
    baselineChecksum: 'a'.repeat(64),
    baselineSeason: 7,
    baselineDay: 12,
    baselinePhase: 'regular',
    attempt: 100,
    token: 'sim-intent-100',
    ...overrides,
  };
}

async function beginActivatedSimAdvanceLease(saveId = 'save-slot-2', rootSaveId = saveId) {
  activateActiveSavePersistenceMetadata(savedRecord(saveId));
  return beginSimAdvancePersistenceLease(saveId, rootSaveId);
}

async function beginActivatedExactSaveMutationLease(saveId = 'save-slot-2', rootSaveId = saveId) {
  activateActiveSavePersistenceMetadata(savedRecord(saveId));
  return beginExactSaveMutationPersistenceLease(saveId, rootSaveId);
}

describe('persistActiveSaveSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetActiveSavePersistenceForTesting();
    mockedScheduleAutoSave.mockResolvedValue(undefined);
    mockedDeleteSaveById.mockResolvedValue(null);
    mockedListSaveTreeChildIds.mockResolvedValue([]);
    mockedRestoreSaveIntegrityBackup.mockImplementation(async (id) => savedRecord(id));
    mockedSaveGameById.mockImplementation(async (id) => savedRecord(id));
    mockedCommitSimAdvanceBaselineSeal.mockImplementation(async (proof) => savedRecord(proof.saveId));
    mockedCommitSimAdvanceSnapshot.mockImplementation(async (intent) => savedRecord(intent.saveId));
  });

  afterEach(() => {
    resetActiveSavePersistenceForTesting();
    vi.useRealTimers();
  });

  it('hydrates exact durable metadata with zero pending work and never regresses or fabricates time', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToActiveSavePersistenceStatus(listener);

    reconcileActiveSavePersistenceMetadata(savedRecord(
      'save-slot-2',
      '2026-04-02T19:42:03.000Z',
    ));
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({
      state: 'idle',
      saveId: 'save-slot-2',
      saveName: 'Durable Dynasty',
      desiredGeneration: 0,
      durableGeneration: 0,
      pendingWrites: 0,
      lastSavedAt: '2026-04-02T19:42:03.000Z',
    });

    reconcileActiveSavePersistenceMetadata(savedRecord(
      'save-slot-2',
      '2026-04-01T19:42:03.000Z',
    ));
    reconcileActiveSavePersistenceMetadata(savedRecord(
      'save-slot-2',
      '1970-01-01T00:00:00.000Z',
    ));
    expect(getActiveSavePersistenceStatus('save-slot-2').lastSavedAt).toBe(
      '2026-04-02T19:42:03.000Z',
    );
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
  });

  it('persists a root-slot snapshot through the ordered active-save coordinator', async () => {
    const snapshot = { schemaVersion: 34, season: 7, day: 12, phase: 'regular' };
    const result = await persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 6,
      exportSnapshot: vi.fn().mockResolvedValue(snapshot),
    });

    expect(result.saved).toBe(true);
    expect(mockedSaveGameById).toHaveBeenCalledWith(
      'save-slot-2',
      'Alex Rivera • Tycoons • Season 7',
      snapshot,
      {
        slotNumber: 2,
        parentSaveId: null,
        isRootSave: true,
        branchMeta: null,
      },
    );
    expect(mockedScheduleAutoSave).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({
      state: 'saved',
      desiredGeneration: 1,
      durableGeneration: 1,
      pendingWrites: 0,
      saveName: 'Alex Rivera • Tycoons • Season 7',
      canRetry: false,
      lastSavedAt: '2026-04-02T19:42:03.000Z',
    });
  });

  it('does not reclassify a committed save as failed when a status observer throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const unsubscribe = subscribeToActiveSavePersistenceStatus(() => {
      throw new Error('observer failure');
    });
    const snapshot = { schemaVersion: 34, season: 7, day: 12, phase: 'regular' };

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 7,
      exportSnapshot: vi.fn().mockResolvedValue(snapshot),
    })).resolves.toEqual({ saved: true, saveName: 'Alex Rivera • Tycoons • Season 7' });
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({
      state: 'saved',
      pendingWrites: 0,
      failureKind: null,
    });
    expect(consoleError).toHaveBeenCalled();
    unsubscribe();
  });

  it('settles a journal receipt only after its exact intent-bearing commit is durable', async () => {
    const lease = await beginActivatedSimAdvanceLease();
    const intent = {
      journalVersion: 1 as const, saveId: 'save-slot-2', rootSaveId: 'save-slot-2',
      operation: 'sim_day' as const, baselineChecksum: 'a'.repeat(64), baselineSeason: 7,
      baselineDay: 12, baselinePhase: 'regular' as const, attempt: 1, token: 'token',
    };
    const snapshot = { schemaVersion: 34, season: 7, day: 13, phase: 'regular' };
    const receipt = await captureSimAdvanceSnapshot(lease, intent, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue(snapshot),
    });
    await expect(waitForActiveSavePersistenceReceipt(receipt)).resolves.toMatchObject({ kind: 'durable' });
    expect(mockedCommitSimAdvanceSnapshot).toHaveBeenCalledWith(intent, 'Alex • Tycoons • Season 7', snapshot);
    finishSimAdvancePersistenceLease(lease);
  });

  it('requires the exact activated persistence owner before leasing a simulation save', async () => {
    const before = structuredClone(getActiveSavePersistenceStatus('save-slot-2'));
    await expect(beginSimAdvancePersistenceLease('save-slot-2', 'save-slot-2'))
      .rejects.toThrow('exact activated active save owner');
    expect(getActiveSavePersistenceStatus('save-slot-2')).toEqual(before);
    const lease = await beginActivatedSimAdvanceLease();
    await expect(beginSimAdvancePersistenceLease('save-slot-3', 'save-slot-3'))
      .rejects.toThrow('exact activated active save owner');
    finishSimAdvancePersistenceLease(lease);
  });

  it('keeps a journal receipt pending through first storage failure and manually retries the exact frozen job', async () => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceSnapshot
      .mockRejectedValueOnce(new Error('IndexedDB storage failure'))
      .mockImplementationOnce(async (intent) => savedRecord(intent.saveId));
    const exportSnapshot = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' });
    const lease = await beginActivatedSimAdvanceLease();
    const intent = {
      journalVersion: 1 as const, saveId: 'save-slot-2', rootSaveId: 'save-slot-2', operation: 'sim_day' as const,
      baselineChecksum: 'b'.repeat(64), baselineSeason: 7, baselineDay: 12, baselinePhase: 'regular' as const, attempt: 2, token: 'token-2',
    };
    const receipt = await captureSimAdvanceSnapshot(lease, intent, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot,
    });
    const settlement = waitForActiveSavePersistenceReceipt(receipt);
    await flushPromises(10);
    await vi.runAllTicks();
    expect(getActiveSavePersistenceStatus('save-slot-2').state).toBe('failed');
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ pendingWrites: 1, canRetry: true });
    await retryActiveSavePersistence('save-slot-2');
    await expect(settlement).resolves.toMatchObject({ kind: 'durable' });
    expect(mockedCommitSimAdvanceSnapshot).toHaveBeenCalledTimes(2);
    const retainedIntent = mockedCommitSimAdvanceSnapshot.mock.calls[0]?.[0];
    expect(retainedIntent).not.toBe(intent);
    expect(retainedIntent).toEqual(intent);
    expect(Object.isFrozen(retainedIntent)).toBe(true);
    expect(mockedCommitSimAdvanceSnapshot.mock.calls[1]?.[0]).toBe(retainedIntent);
    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    finishSimAdvancePersistenceLease(lease);
  });

  it('automatically retries the exact retained journal job without a second export', async () => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceSnapshot
      .mockRejectedValueOnce(new Error('IndexedDB storage failure'))
      .mockImplementationOnce(async (intent) => savedRecord(intent.saveId));
    const exportSnapshot = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' });
    const lease = await beginActivatedSimAdvanceLease();
    const intent = {
      journalVersion: 1 as const, saveId: 'save-slot-2', rootSaveId: 'save-slot-2', operation: 'sim_week' as const,
      baselineChecksum: 'c'.repeat(64), baselineSeason: 7, baselineDay: 12, baselinePhase: 'regular' as const, attempt: 3, token: 'token-3',
    };
    const receipt = await captureSimAdvanceSnapshot(lease, intent, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot,
    });
    const settlement = waitForActiveSavePersistenceReceipt(receipt);
    await flushPromises(10);
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ state: 'failed', pendingWrites: 1 });
    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[0]);
    await expect(settlement).resolves.toMatchObject({ kind: 'durable' });
    expect(mockedCommitSimAdvanceSnapshot).toHaveBeenCalledTimes(2);
    const retainedIntent = mockedCommitSimAdvanceSnapshot.mock.calls[0]?.[0];
    expect(retainedIntent).not.toBe(intent);
    expect(retainedIntent).toEqual(intent);
    expect(Object.isFrozen(retainedIntent)).toBe(true);
    expect(mockedCommitSimAdvanceSnapshot.mock.calls[1]?.[0]).toBe(retainedIntent);
    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    finishSimAdvancePersistenceLease(lease);
  });

  it('keeps a journal receipt pending through exhausted automatic retries until manual recovery', async () => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceSnapshot
      .mockRejectedValueOnce(new Error('IndexedDB storage failure'))
      .mockRejectedValueOnce(new Error('IndexedDB storage failure'))
      .mockRejectedValueOnce(new Error('IndexedDB storage failure'))
      .mockImplementationOnce(async (intent) => savedRecord(intent.saveId));
    const exportSnapshot = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' });
    const lease = await beginActivatedSimAdvanceLease();
    const intent = {
      journalVersion: 1 as const, saveId: 'save-slot-2', rootSaveId: 'save-slot-2', operation: 'sim_month' as const,
      baselineChecksum: 'd'.repeat(64), baselineSeason: 7, baselineDay: 12, baselinePhase: 'regular' as const, attempt: 4, token: 'token-4',
    };
    const receipt = await captureSimAdvanceSnapshot(lease, intent, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot,
    });
    const settlement = waitForActiveSavePersistenceReceipt(receipt);
    await flushPromises(10);
    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[0]);
    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[1]);
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ state: 'failed', canRetry: true, pendingWrites: 1, recovery: { phase: 'fallback_ready' } });
    await retryActiveSavePersistence('save-slot-2');
    await expect(settlement).resolves.toMatchObject({ kind: 'durable' });
    expect(mockedCommitSimAdvanceSnapshot).toHaveBeenCalledTimes(4);
    const retainedIntent = mockedCommitSimAdvanceSnapshot.mock.calls[0]?.[0];
    expect(retainedIntent).not.toBe(intent);
    expect(mockedCommitSimAdvanceSnapshot.mock.calls.every((call) => call[0] === retainedIntent)).toBe(true);
    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    finishSimAdvancePersistenceLease(lease);
  });

  it('blocks ordinary capture before export while a simulation lease owns the save', async () => {
    const lease = await beginActivatedSimAdvanceLease();
    const ordinaryExport = vi.fn();
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: ordinaryExport,
    })).resolves.toEqual({ saved: false, saveName: null });
    expect(ordinaryExport).not.toHaveBeenCalled();
    finishSimAdvancePersistenceLease(lease);
  });

  it('drains an already-accepted ordinary write before admitting an exact-save mutation lease', async () => {
    let releaseOrdinaryWrite!: () => void;
    mockedSaveGameById.mockImplementationOnce(async (id) => new Promise<SaveData>((resolve) => {
      releaseOrdinaryWrite = () => resolve(savedRecord(id));
    }));
    activateActiveSavePersistenceMetadata(savedRecord('save-slot-2'));
    const ordinarySnapshot = { schemaVersion: 34, season: 7, day: 12, phase: 'offseason' };
    const ordinaryWrite = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue(ordinarySnapshot),
    });
    await vi.waitFor(() => expect(mockedSaveGameById).toHaveBeenCalledTimes(1));

    let leaseSettled = false;
    const pendingLease = beginExactSaveMutationPersistenceLease('save-slot-2', 'save-slot-2')
      .then((lease) => {
        leaseSettled = true;
        return lease;
      });
    await flushPromises();
    expect(leaseSettled).toBe(false);

    releaseOrdinaryWrite();
    await expect(ordinaryWrite).resolves.toMatchObject({ saved: true });
    const lease = await pendingLease;
    const exactSnapshot = { schemaVersion: 34, season: 7, day: 13, phase: 'offseason' };
    const receipt = await captureExactSaveMutationSnapshot(lease, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue(exactSnapshot),
    });
    await expect(waitForExactSaveMutationPersistenceReceipt(receipt)).resolves.toMatchObject({ kind: 'durable' });

    expect(mockedSaveGameById.mock.calls[0]?.[2]).toEqual(ordinarySnapshot);
    expect(mockedSaveGameById.mock.calls[1]?.[2]).toEqual(exactSnapshot);
    finishExactSaveMutationPersistenceLease(lease, receipt);
  });

  it('blocks stale ordinary capture while an exact-save mutation lease owns persistence', async () => {
    const lease = await beginActivatedExactSaveMutationLease();
    const staleExport = vi.fn();
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: staleExport,
    })).resolves.toEqual({ saved: false, saveName: null });
    expect(staleExport).not.toHaveBeenCalled();

    const receipt = await captureExactSaveMutationSnapshot(lease, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 13, phase: 'offseason' }),
    });
    await expect(waitForExactSaveMutationPersistenceReceipt(receipt)).resolves.toMatchObject({ kind: 'durable' });
    finishExactSaveMutationPersistenceLease(lease, receipt);
  });

  it('preserves branch lineage when an exact-save mutation persists a branch', async () => {
    const branchRecord = {
      ...savedRecord('branch-2'),
      slotNumber: null,
      parentSaveId: 'save-slot-2',
      isRootSave: false,
      branchMeta: {
        id: 'branch-meta-2',
        saveId: 'branch-2',
        createdAt: '2026-04-02T19:42:03.000Z',
        description: 'Arbitration branch',
        branchedAtSeason: 7,
        branchedAtDay: 12,
      },
    } as SaveData;
    mockedLoadGameById.mockResolvedValue(branchRecord);
    const lease = await beginActivatedExactSaveMutationLease('branch-2', 'save-slot-2');
    const snapshot = { schemaVersion: 34, season: 7, day: 13, phase: 'offseason' };
    const receipt = await captureExactSaveMutationSnapshot(lease, {
      activeSaveId: 'branch-2', activeSaveSlot: null, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue(snapshot),
    });
    await expect(waitForExactSaveMutationPersistenceReceipt(receipt)).resolves.toMatchObject({ kind: 'durable' });
    expect(() => waitForActiveSavePersistenceReceipt(receipt))
      .toThrow('not an exact issued simulation receipt');
    expect(() => waitForOrdinaryActiveSavePersistenceReceipt(receipt))
      .toThrow('not an exact issued ordinary receipt');

    expect(mockedSaveGameById).toHaveBeenCalledWith(
      'branch-2',
      'Alex • Tycoons • Season 7',
      expect.objectContaining(snapshot),
      {
        slotNumber: null,
        parentSaveId: 'save-slot-2',
        isRootSave: false,
        branchMeta: branchRecord.branchMeta,
      },
    );
    finishExactSaveMutationPersistenceLease(lease, receipt);
  });

  it('retries only the frozen exact-save mutation snapshot after a storage failure', async () => {
    vi.useFakeTimers();
    mockedSaveGameById
      .mockRejectedValueOnce(new Error('IndexedDB storage failure'))
      .mockImplementationOnce(async (id) => savedRecord(id));
    const lease = await beginActivatedExactSaveMutationLease();
    const sourceSnapshot = { schemaVersion: 34, season: 7, day: 13, phase: 'offseason', nested: { value: 1 } };
    const exportSnapshot = vi.fn().mockResolvedValue(sourceSnapshot);
    const receipt = await captureExactSaveMutationSnapshot(lease, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot,
    });
    const settlement = waitForExactSaveMutationPersistenceReceipt(receipt);
    await flushPromises(10);
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ state: 'failed', pendingWrites: 1 });
    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[0]);
    await expect(settlement).resolves.toMatchObject({ kind: 'durable' });

    const retainedSnapshot = mockedSaveGameById.mock.calls[0]?.[2];
    expect(retainedSnapshot).not.toBe(sourceSnapshot);
    expect(retainedSnapshot).toEqual(sourceSnapshot);
    expect(Object.isFrozen(retainedSnapshot!)).toBe(true);
    expect(mockedSaveGameById.mock.calls[1]?.[2]).toBe(retainedSnapshot);
    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    finishExactSaveMutationPersistenceLease(lease, receipt);
  });

  it('writes a baseline seal through its exact lease and settles only after durable save', async () => {
    const lease = await beginActivatedSimAdvanceLease();
    const proof = baselineSealProof();
    const snapshot = { schemaVersion: 34, season: 7, day: 12, phase: 'regular' };
    const receipt = await captureSimAdvanceBaselineSeal(lease, proof, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue(snapshot),
    });
    await expect(waitForActiveSavePersistenceReceipt(receipt)).resolves.toMatchObject({ kind: 'durable' });
    const committedSnapshot = mockedCommitSimAdvanceBaselineSeal.mock.calls[0]?.[1];
    expect(mockedCommitSimAdvanceBaselineSeal).toHaveBeenCalledWith(proof, committedSnapshot);
    expect(committedSnapshot).not.toBe(snapshot);
    expect(Object.isFrozen(committedSnapshot!)).toBe(true);
    expect(mockedSaveGameById).not.toHaveBeenCalled();
    expect(mockedLoadGameById).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ state: 'saved', pendingWrites: 0, saveName: proof.baseline.name });
    finishSimAdvancePersistenceLease(lease);
  });

  it('rejects wrong baseline proof save/root before export or status mutation', async () => {
    const lease = await beginActivatedSimAdvanceLease();
    const exportSnapshot = vi.fn();
    const before = structuredClone(getActiveSavePersistenceStatus('save-slot-2'));

    expect(() => captureSimAdvanceBaselineSeal(lease, baselineSealProof('save-slot-3'), {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot,
    })).toThrow('does not match persistence lease');
    expect(() => captureSimAdvanceBaselineSeal(lease, baselineSealProof('save-slot-2', 'save-slot-3'), {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot,
    })).toThrow('does not match persistence lease');

    expect(exportSnapshot).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus('save-slot-2')).toEqual(before);
    finishSimAdvancePersistenceLease(lease);
  });

  it('dispatches root and branch baseline proof/lease pairs directly without ordinary save reads', async () => {
    const rootLease = await beginActivatedSimAdvanceLease();
    const rootProof = baselineSealProof();
    const rootExport = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular', nested: { value: 1 } });
    const rootReceipt = await captureSimAdvanceBaselineSeal(rootLease, rootProof, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Ignored', teamName: 'Ignored', season: 7, exportSnapshot: rootExport,
    });
    await expect(waitForActiveSavePersistenceReceipt(rootReceipt)).resolves.toMatchObject({ kind: 'durable' });
    expect(mockedCommitSimAdvanceBaselineSeal.mock.calls[0]?.[0]).toBe(rootProof);
    expect(mockedCommitSimAdvanceBaselineSeal.mock.calls[0]?.[1]).not.toBeUndefined();
    expect(mockedLoadGameById).not.toHaveBeenCalled();
    expect(mockedSaveGameById).not.toHaveBeenCalled();
    finishSimAdvancePersistenceLease(rootLease);

    const branchLease = await beginActivatedSimAdvanceLease('branch-2', 'save-slot-2');
    const branchProof = baselineSealProof('branch-2', 'save-slot-2', 'Branch assessed name');
    const branchExport = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' });
    const branchReceipt = await captureSimAdvanceBaselineSeal(branchLease, branchProof, {
      activeSaveId: 'branch-2', activeSaveSlot: null, gmName: 'Ignored', teamName: 'Ignored', season: 7, exportSnapshot: branchExport,
    });
    await expect(waitForActiveSavePersistenceReceipt(branchReceipt)).resolves.toMatchObject({ kind: 'durable' });
    expect(mockedCommitSimAdvanceBaselineSeal.mock.calls[1]?.[0]).toBe(branchProof);
    expect(mockedLoadGameById).not.toHaveBeenCalled();
    expect(mockedSaveGameById).not.toHaveBeenCalled();
    finishSimAdvancePersistenceLease(branchLease);
  });

  it('automatically retries one immutable baseline job without re-exporting or replacing proof/snapshot identity', async () => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceBaselineSeal
      .mockRejectedValueOnce(new Error('IndexedDB storage failure'))
      .mockImplementationOnce(async (proof) => savedRecord(proof.saveId));
    const lease = await beginActivatedSimAdvanceLease();
    const proof = baselineSealProof();
    const exported = { schemaVersion: 34, season: 7, day: 12, phase: 'regular', nested: { seed: 7 } };
    const exportSnapshot = vi.fn().mockResolvedValue(exported);
    const receipt = await captureSimAdvanceBaselineSeal(lease, proof, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Wrong', teamName: 'Wrong', season: 7, exportSnapshot,
    });
    const settlement = waitForActiveSavePersistenceReceipt(receipt);
    await flushPromises(10);
    const firstSnapshot = mockedCommitSimAdvanceBaselineSeal.mock.calls[0]?.[1];
    expect(Object.isFrozen(firstSnapshot!)).toBe(true);
    expect(Object.isFrozen((firstSnapshot as { nested: object }).nested)).toBe(true);
    expect(firstSnapshot).not.toBe(exported);
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ desiredGeneration: 1, durableGeneration: 0, pendingWrites: 1 });

    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[0]);
    await expect(settlement).resolves.toMatchObject({ kind: 'durable' });
    expect(mockedCommitSimAdvanceBaselineSeal).toHaveBeenCalledTimes(2);
    expect(mockedCommitSimAdvanceBaselineSeal.mock.calls[0]?.[0]).toBe(proof);
    expect(mockedCommitSimAdvanceBaselineSeal.mock.calls[1]?.[0]).toBe(proof);
    expect(mockedCommitSimAdvanceBaselineSeal.mock.calls[1]?.[1]).toBe(firstSnapshot);
    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    finishSimAdvancePersistenceLease(lease);
  });

  it('retains the same baseline proof/snapshot/receipt through exhausted automatic recovery until manual retry', async () => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceBaselineSeal
      .mockRejectedValueOnce(new Error('IndexedDB storage failure'))
      .mockRejectedValueOnce(new Error('IndexedDB storage failure'))
      .mockRejectedValueOnce(new Error('IndexedDB storage failure'))
      .mockImplementationOnce(async (proof) => savedRecord(proof.saveId));
    const lease = await beginActivatedSimAdvanceLease();
    const proof = baselineSealProof();
    const exportSnapshot = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' });
    const receipt = await captureSimAdvanceBaselineSeal(lease, proof, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Ignored', teamName: 'Ignored', season: 7, exportSnapshot,
    });
    const settlement = waitForActiveSavePersistenceReceipt(receipt);
    await flushPromises(10);
    const snapshot = mockedCommitSimAdvanceBaselineSeal.mock.calls[0]?.[1];
    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[0]);
    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[1]);
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ state: 'failed', canRetry: true, pendingWrites: 1, recovery: { phase: 'fallback_ready' } });

    await retryActiveSavePersistence('save-slot-2');
    await expect(settlement).resolves.toMatchObject({ kind: 'durable' });
    expect(mockedCommitSimAdvanceBaselineSeal).toHaveBeenCalledTimes(4);
    expect(mockedCommitSimAdvanceBaselineSeal.mock.calls.every((call) => call[0] === proof && call[1] === snapshot)).toBe(true);
    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    finishSimAdvancePersistenceLease(lease);
  });

  it.each([
    ['CAS evidence', new SimAdvanceEvidenceConflictError('IndexedDB transaction storage blocked by CAS evidence')],
    ['snapshot evidence', new SimAdvanceEvidenceConflictError('storage snapshot proof mismatch')],
    ['topology evidence', new SimAdvanceEvidenceConflictError('transaction topology changed')],
    ['intent evidence', new SimAdvanceEvidenceConflictError('blocked journal intent evidence')],
  ])('treats typed %s failure as terminal even when its message resembles storage', async (_label, error) => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceBaselineSeal.mockRejectedValueOnce(error);
    const lease = await beginActivatedSimAdvanceLease();
    const proof = baselineSealProof();
    const receipt = await captureSimAdvanceBaselineSeal(lease, proof, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Ignored', teamName: 'Ignored', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
    });
    await expect(waitForActiveSavePersistenceReceipt(receipt)).resolves.toEqual({ kind: 'retired', reason: 'fail_closed' });
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ state: 'failed', canRetry: false, pendingWrites: 1, recovery: null });
    expect(vi.getTimerCount()).toBe(0);
    await expect(retryActiveSavePersistence('save-slot-2')).resolves.toEqual({ saved: false, saveName: null });
    expect(mockedCommitSimAdvanceBaselineSeal).toHaveBeenCalledTimes(1);
    await expect(beginSimAdvancePersistenceLease('save-slot-2', 'save-slot-2')).rejects.toThrow('fail-closed');
  });

  it('treats baseline ownership loss as terminal without scheduling recovery', async () => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceBaselineSeal.mockRejectedValueOnce(new SaveSessionOwnershipError('not_owner', 'ownership lost', 'save-slot-2'));
    const lease = await beginActivatedSimAdvanceLease();
    const receipt = await captureSimAdvanceBaselineSeal(lease, baselineSealProof(), {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Ignored', teamName: 'Ignored', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
    });
    await expect(waitForActiveSavePersistenceReceipt(receipt)).resolves.toEqual({ kind: 'retired', reason: 'ownership_lost' });
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ state: 'failed', canRetry: false, pendingWrites: 1, recovery: null });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('committed-closes the exact durable baseline receipt without falsifying durable status', async () => {
    const lease = await beginActivatedSimAdvanceLease();
    const proof = baselineSealProof();
    const receipt = await captureSimAdvanceBaselineSeal(lease, proof, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Ignored', teamName: 'Ignored', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
    });
    const outcome = await waitForActiveSavePersistenceReceipt(receipt);
    const before = structuredClone(getActiveSavePersistenceStatus('save-slot-2'));

    closeCommittedSimAdvancePersistenceLeaseFailClosed(lease, receipt);

    expect(getActiveSavePersistenceStatus('save-slot-2')).toEqual(before);
    await expect(waitForActiveSavePersistenceReceipt(receipt)).resolves.toEqual(outcome);
    expect(isActiveSavePersistenceReceiptDurable(receipt)).toBe(true);
    const ordinaryExport = vi.fn();
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot: ordinaryExport,
    })).resolves.toEqual({ saved: false, saveName: null });
    expect(ordinaryExport).not.toHaveBeenCalled();
    await expect(beginSimAdvancePersistenceLease('save-slot-2', 'save-slot-2')).rejects.toThrow('fail-closed');

    await prepareActiveSavePersistenceForLoad('save-slot-2');
    releaseActiveSavePersistenceLoad('save-slot-2');
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot: ordinaryExport,
    })).resolves.toEqual({ saved: false, saveName: null });
    expect(ordinaryExport).not.toHaveBeenCalled();

    activateActiveSavePersistenceMetadata(savedRecord('save-slot-2'));
    const reopenedLease = await beginSimAdvancePersistenceLease('save-slot-2', 'save-slot-2');
    finishSimAdvancePersistenceLease(reopenedLease);
  });

  it('rejects stale, non-durable, and nonquiescent committed-close requests without state mutation', async () => {
    let resolveCommit!: (record: SaveData) => void;
    mockedCommitSimAdvanceBaselineSeal.mockImplementationOnce(() => new Promise<SaveData>((resolve) => {
      resolveCommit = resolve;
    }));
    const lease = await beginActivatedSimAdvanceLease();
    const receipt = await captureSimAdvanceBaselineSeal(lease, baselineSealProof(), {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Ignored', teamName: 'Ignored', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
    });
    await flushPromises();
    const beforeRunning = structuredClone(getActiveSavePersistenceStatus('save-slot-2'));
    const staleReceipt = { generation: receipt.generation + 1, saveId: receipt.saveId } as ActiveSavePersistenceReceipt;
    expect(() => closeCommittedSimAdvancePersistenceLeaseFailClosed(lease, receipt)).toThrow('exact quiescent durable receipt');
    expect(() => closeCommittedSimAdvancePersistenceLeaseFailClosed(lease, staleReceipt)).toThrow('not an exact issued simulation receipt');
    expect(getActiveSavePersistenceStatus('save-slot-2')).toEqual(beforeRunning);

    resolveCommit(savedRecord('save-slot-2'));
    await expect(waitForActiveSavePersistenceReceipt(receipt)).resolves.toMatchObject({ kind: 'durable' });
    const beforeDurable = structuredClone(getActiveSavePersistenceStatus('save-slot-2'));
    expect(() => closeCommittedSimAdvancePersistenceLeaseFailClosed(lease, staleReceipt)).toThrow('not an exact issued simulation receipt');
    expect(getActiveSavePersistenceStatus('save-slot-2')).toEqual(beforeDurable);
    expect(() => poisonSimAdvancePersistenceLease(lease)).toThrow('durable simulation receipt');
    expect(getActiveSavePersistenceStatus('save-slot-2')).toEqual(beforeDurable);
    closeCommittedSimAdvancePersistenceLeaseFailClosed(lease, receipt);
  });

  it('keeps poison fail-closed through load release until coherent activation', async () => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceBaselineSeal.mockRejectedValueOnce(new Error('IndexedDB storage failure'));
    const lease = await beginActivatedSimAdvanceLease();
    const receipt = await captureSimAdvanceBaselineSeal(lease, baselineSealProof(), {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Ignored', teamName: 'Ignored', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
    });
    await flushPromises(10);
    poisonSimAdvancePersistenceLease(lease);
    await expect(waitForActiveSavePersistenceReceipt(receipt)).resolves.toEqual({ kind: 'retired', reason: 'fail_closed' });
    releaseActiveSavePersistenceLoad('save-slot-2');
    const ordinaryExport = vi.fn();
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot: ordinaryExport,
    })).resolves.toEqual({ saved: false, saveName: null });
    expect(ordinaryExport).not.toHaveBeenCalled();
    await expect(beginSimAdvancePersistenceLease('save-slot-2', 'save-slot-2')).rejects.toThrow('fail-closed');

    activateActiveSavePersistenceMetadata(savedRecord('save-slot-2'));
    const reopenedLease = await beginSimAdvancePersistenceLease('save-slot-2', 'save-slot-2');
    finishSimAdvancePersistenceLease(reopenedLease);
  });

  it('poisons a retained journal receipt without leaving a retry waiter', async () => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceSnapshot.mockRejectedValueOnce(new Error('IndexedDB storage failure'));
    const lease = await beginActivatedSimAdvanceLease();
    const intent = {
      journalVersion: 1 as const, saveId: 'save-slot-2', rootSaveId: 'save-slot-2', operation: 'sim_day' as const,
      baselineChecksum: 'f'.repeat(64), baselineSeason: 7, baselineDay: 12, baselinePhase: 'regular' as const, attempt: 6, token: 'token-6',
    };
    const receipt = await captureSimAdvanceSnapshot(lease, intent, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' }),
    });
    const settlement = waitForActiveSavePersistenceReceipt(receipt);
    await flushPromises(10);
    poisonSimAdvancePersistenceLease(lease);
    await expect(settlement).resolves.toEqual({ kind: 'retired', reason: 'fail_closed' });
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ state: 'failed', canRetry: false, pendingWrites: 1 });
    await expect(retryActiveSavePersistence('save-slot-2')).resolves.toEqual({ saved: false, saveName: null });
    expect(() => finishSimAdvancePersistenceLease(lease)).toThrow();
  });

  it.each(['baseline seal', 'post snapshot'] as const)(
    'does not pre-settle a running %s receipt when fail-closed poison races a later durable commit',
    async (kind) => {
      let resolveCommit!: (record: SaveData) => void;
      if (kind === 'baseline seal') {
        mockedCommitSimAdvanceBaselineSeal.mockImplementationOnce(() => new Promise<SaveData>((resolve) => {
          resolveCommit = resolve;
        }));
      } else {
        mockedCommitSimAdvanceSnapshot.mockImplementationOnce(() => new Promise<SaveData>((resolve) => {
          resolveCommit = resolve;
        }));
      }
      const lease = await beginActivatedSimAdvanceLease();
      const receipt = kind === 'baseline seal'
        ? await captureSimAdvanceBaselineSeal(lease, baselineSealProof(), {
          activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Ignored', teamName: 'Ignored', season: 7,
          exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
        })
        : await captureSimAdvanceSnapshot(lease, simAdvanceIntent({ attempt: 701 }), {
          activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
          exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' }),
        });
      const settlement = waitForActiveSavePersistenceReceipt(receipt);
      await flushPromises();
      poisonSimAdvancePersistenceLease(lease);
      expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ state: 'failed', canRetry: false, pendingWrites: 1 });

      resolveCommit(savedRecord('save-slot-2'));
      await expect(settlement).resolves.toMatchObject({ kind: 'durable' });
      expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({
        state: 'saved', pendingWrites: 0, canRetry: false, recovery: null,
      });
      const ordinaryExport = vi.fn();
      await expect(persistActiveSaveSnapshot({
        activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot: ordinaryExport,
      })).resolves.toEqual({ saved: false, saveName: null });
      expect(ordinaryExport).not.toHaveBeenCalled();
      await expect(beginSimAdvancePersistenceLease('save-slot-2', 'save-slot-2')).rejects.toThrow('fail-closed');
    },
  );

  it.each(['baseline seal', 'post snapshot'] as const)(
    'retires a running fail-closed %s receipt once on later storage rejection without retry resurrection',
    async (kind) => {
    vi.useFakeTimers();
    let rejectCommit!: (error: Error) => void;
    const holdRejection = () => new Promise<SaveData>((_resolve, reject) => {
      rejectCommit = reject;
    });
    if (kind === 'baseline seal') {
      mockedCommitSimAdvanceBaselineSeal.mockImplementationOnce(holdRejection);
    } else {
      mockedCommitSimAdvanceSnapshot.mockImplementationOnce(holdRejection);
    }
    const lease = await beginActivatedSimAdvanceLease();
    const receipt = kind === 'baseline seal'
      ? await captureSimAdvanceBaselineSeal(lease, baselineSealProof(), {
        activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Ignored', teamName: 'Ignored', season: 7,
        exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
      })
      : await captureSimAdvanceSnapshot(lease, simAdvanceIntent({ attempt: 702 }), {
        activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
        exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' }),
      });
    const settlement = waitForActiveSavePersistenceReceipt(receipt);
    await flushPromises();
    poisonSimAdvancePersistenceLease(lease);
    rejectCommit(new Error('IndexedDB storage failure'));
    await expect(settlement).resolves.toEqual({ kind: 'retired', reason: 'fail_closed' });
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({
      state: 'failed', pendingWrites: 1, canRetry: false, recovery: null,
    });
    expect(vi.getTimerCount()).toBe(0);
    await expect(retryActiveSavePersistence('save-slot-2')).resolves.toEqual({ saved: false, saveName: null });
    expect(kind === 'baseline seal'
      ? mockedCommitSimAdvanceBaselineSeal
      : mockedCommitSimAdvanceSnapshot).toHaveBeenCalledTimes(1);
  },
  );

  it('preserves the exact retained journal job across every conflicting persistence lifecycle API', async () => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceSnapshot
      .mockRejectedValueOnce(new Error('IndexedDB storage failure'))
      .mockImplementationOnce(async (intent) => savedRecord(intent.saveId));
    const exportSnapshot = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' });
    const lease = await beginActivatedSimAdvanceLease();
    const intent = {
      journalVersion: 1 as const, saveId: 'save-slot-2', rootSaveId: 'save-slot-2', operation: 'sim_day' as const,
      baselineChecksum: '1'.repeat(64), baselineSeason: 7, baselineDay: 12, baselinePhase: 'regular' as const, attempt: 7, token: 'token-7',
    };
    const receipt = await captureSimAdvanceSnapshot(lease, intent, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot,
    });
    const settlement = waitForActiveSavePersistenceReceipt(receipt);
    await flushPromises(10);
    const before = structuredClone(getActiveSavePersistenceStatus('save-slot-2'));
    const assertUnchanged = () => expect(getActiveSavePersistenceStatus('save-slot-2')).toEqual(before);
    const replace = vi.fn();
    const deleteRecord = vi.fn();
    const metadata = vi.fn();
    const ordinaryExport = vi.fn();
    const treeDelete = vi.fn();
    const restoreCalls = mockedRestoreSaveIntegrityBackup.mock.calls.length;

    expect(() => reconcileActiveSavePersistenceMetadata(savedRecord('save-slot-2'))).toThrow('active simulation persistence lease');
    assertUnchanged();
    await expect(prepareActiveSavePersistenceForLoad('save-slot-2')).rejects.toThrow('active simulation persistence lease');
    assertUnchanged();
    expect(() => releaseActiveSavePersistenceLoad('save-slot-2')).toThrow('active simulation persistence lease');
    assertUnchanged();
    expect(() => activateActiveSavePersistenceMetadata(savedRecord('save-slot-2'))).toThrow('active simulation persistence lease');
    assertUnchanged();
    const transitionExport = vi.fn();
    await expect(prepareActiveSaveSessionTransition('save-slot-3', {
      persistOutgoingSnapshot: () => persistActiveSaveSnapshot({
        activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
        exportSnapshot: transitionExport,
      }),
    })).rejects.toThrow();
    expect(transitionExport).not.toHaveBeenCalled();
    assertUnchanged();
    const permit = beginWorkerMutation('save-slot-2');
    finishWorkerMutation(permit);
    assertUnchanged();
    await expect(replaceInactiveSavePersistenceRecord('save-slot-2', replace)).rejects.toThrow('active simulation persistence lease');
    expect(replace).not.toHaveBeenCalled();
    assertUnchanged();
    await expect(retireActiveSavePersistenceForDelete('save-slot-2', deleteRecord)).rejects.toThrow('active simulation persistence lease');
    expect(deleteRecord).not.toHaveBeenCalled();
    assertUnchanged();
    await expect(restoreInactiveSaveIntegrityBackup('save-slot-2')).rejects.toThrow('active simulation persistence lease');
    expect(mockedRestoreSaveIntegrityBackup.mock.calls).toHaveLength(restoreCalls);
    assertUnchanged();
    await expect(retireSaveTreePersistenceForDelete('save-slot-2', treeDelete)).rejects.toThrow('active simulation persistence lease');
    expect(treeDelete).not.toHaveBeenCalled();
    assertUnchanged();
    await expect(trackActiveSavePersistenceOperation('save-slot-2', metadata)).rejects.toThrow('active simulation persistence lease');
    expect(metadata).not.toHaveBeenCalled();
    assertUnchanged();
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot: ordinaryExport,
    })).resolves.toEqual({ saved: false, saveName: null });
    expect(ordinaryExport).not.toHaveBeenCalled();
    assertUnchanged();

    await retryActiveSavePersistence('save-slot-2');
    await expect(settlement).resolves.toMatchObject({ kind: 'durable' });
    expect(mockedCommitSimAdvanceSnapshot.mock.calls.map((call) => call[0])).toEqual([intent, intent]);
    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    finishSimAdvancePersistenceLease(lease);
  });

  it('rejects metadata persistence before its operation can run while a lease is held', async () => {
    const lease = await beginActivatedSimAdvanceLease();
    const operation = vi.fn();
    await expect(trackActiveSavePersistenceOperation('save-slot-2', operation)).rejects.toThrow('active simulation persistence lease');
    expect(operation).not.toHaveBeenCalled();
    finishSimAdvancePersistenceLease(lease);
  });

  it('retires a journal receipt without scheduling retry when journal evidence fails terminally', async () => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceSnapshot.mockRejectedValueOnce(new Error('Simulation journal baseline CAS evidence mismatch'));
    const lease = await beginActivatedSimAdvanceLease();
    const intent = {
      journalVersion: 1 as const, saveId: 'save-slot-2', rootSaveId: 'save-slot-2', operation: 'sim_day' as const,
      baselineChecksum: 'e'.repeat(64), baselineSeason: 7, baselineDay: 12, baselinePhase: 'regular' as const, attempt: 5, token: 'token-5',
    };
    const receipt = await captureSimAdvanceSnapshot(lease, intent, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' }),
    });
    await expect(waitForActiveSavePersistenceReceipt(receipt)).resolves.toEqual({ kind: 'retired', reason: 'fail_closed' });
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ state: 'failed', canRetry: false, pendingWrites: 1 });
    expect(vi.getTimerCount()).toBe(0);
    await expect(retryActiveSavePersistence('save-slot-2')).resolves.toEqual({ saved: false, saveName: null });
    expect(mockedCommitSimAdvanceSnapshot).toHaveBeenCalledTimes(1);
  });

  it('retires an in-flight journal receipt as ownership_lost without retry', async () => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceSnapshot.mockRejectedValueOnce(new SaveSessionOwnershipError(
      'not_owner', 'This tab does not own the dynasty save tree.', 'save-slot-2',
    ));
    const lease = await beginActivatedSimAdvanceLease();
    const exportSnapshot = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' });
    const intent = {
      journalVersion: 1 as const, saveId: 'save-slot-2', rootSaveId: 'save-slot-2', operation: 'sim_day' as const,
      baselineChecksum: '2'.repeat(64), baselineSeason: 7, baselineDay: 12, baselinePhase: 'regular' as const, attempt: 8, token: 'token-8',
    };
    const receipt = await captureSimAdvanceSnapshot(lease, intent, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot,
    });
    await expect(waitForActiveSavePersistenceReceipt(receipt)).resolves.toEqual({ kind: 'retired', reason: 'ownership_lost' });
    expect(mockedCommitSimAdvanceSnapshot).toHaveBeenCalledTimes(1);
    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ state: 'failed', canRetry: false, pendingWrites: 1, recovery: null });
    expect(vi.getTimerCount()).toBe(0);
    await expect(retryActiveSavePersistence('save-slot-2')).resolves.toEqual({ saved: false, saveName: null });
    expect(mockedCommitSimAdvanceSnapshot).toHaveBeenCalledTimes(1);
    expect(() => finishSimAdvancePersistenceLease(lease)).toThrow();
  });

  it('reset settles a pending retained journal receipt exactly once', async () => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceSnapshot.mockRejectedValueOnce(new Error('IndexedDB storage failure'));
    const lease = await beginActivatedSimAdvanceLease();
    const intent = {
      journalVersion: 1 as const, saveId: 'save-slot-2', rootSaveId: 'save-slot-2', operation: 'sim_day' as const,
      baselineChecksum: '3'.repeat(64), baselineSeason: 7, baselineDay: 12, baselinePhase: 'regular' as const, attempt: 9, token: 'token-9',
    };
    const receipt = await captureSimAdvanceSnapshot(lease, intent, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' }),
    });
    const settlement = waitForActiveSavePersistenceReceipt(receipt);
    await flushPromises(10);
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ recovery: { phase: 'retry_scheduled' } });
    resetActiveSavePersistenceForTesting();
    await expect(settlement).resolves.toEqual({ kind: 'retired', reason: 'reset' });
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(mockedCommitSimAdvanceSnapshot).toHaveBeenCalledTimes(1);
  });

  it('accepts receipt waiters only for the exact issued live simulation receipt', async () => {
    let ordinaryReceipt: ActiveSavePersistenceReceipt | undefined;
    await persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
      onSnapshotAccepted: (receipt) => { ordinaryReceipt = receipt; },
    });
    expect(ordinaryReceipt).toBeDefined();
    await expect(waitForOrdinaryActiveSavePersistenceReceipt(ordinaryReceipt!))
      .resolves.toMatchObject({ kind: 'durable' });
    expect(() => waitForActiveSavePersistenceReceipt(ordinaryReceipt!))
      .toThrow('not an exact issued simulation receipt');

    const lease = await beginActivatedSimAdvanceLease();
    const receipt = await captureSimAdvanceBaselineSeal(lease, baselineSealProof(), {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Ignored', teamName: 'Ignored', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
    });
    await expect(waitForActiveSavePersistenceReceipt(receipt)).resolves.toMatchObject({ kind: 'durable' });
    expect(() => waitForOrdinaryActiveSavePersistenceReceipt(receipt))
      .toThrow('not an exact issued ordinary receipt');
    const spreadReceipt = { ...receipt } as ActiveSavePersistenceReceipt;
    expect(() => waitForActiveSavePersistenceReceipt(spreadReceipt))
      .toThrow('not an exact issued simulation receipt');

    resetActiveSavePersistenceForTesting();
    expect(() => waitForActiveSavePersistenceReceipt(receipt))
      .toThrow('not an exact issued simulation receipt');
  });

  it('retains one frozen private intent across caller mutation and retry', async () => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceSnapshot
      .mockRejectedValueOnce(new Error('IndexedDB storage failure'))
      .mockImplementationOnce(async (intent) => savedRecord(intent.saveId));
    let resolveExport!: (snapshot: object) => void;
    const exportSnapshot = vi.fn(() => new Promise<object>((resolve) => { resolveExport = resolve; }));
    const lease = await beginActivatedSimAdvanceLease();
    const intent = simAdvanceIntent({ attempt: 101, token: 'before-export' });
    const capture = captureSimAdvanceSnapshot(lease, intent, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot,
    });
    (intent as { token: string; operation: SimAdvanceIntent['operation'] }).token = 'caller-mutated-before-export';
    (intent as { operation: SimAdvanceIntent['operation'] }).operation = 'sim_month';
    resolveExport({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' });
    const receipt = await capture;
    const settlement = waitForActiveSavePersistenceReceipt(receipt);
    await flushPromises(10);
    (intent as { token: string; baselineDay: number }).token = 'caller-mutated-after-failure';
    (intent as { token: string; baselineDay: number }).baselineDay = 99;
    await retryActiveSavePersistence('save-slot-2');
    await expect(settlement).resolves.toMatchObject({ kind: 'durable' });

    const retained = mockedCommitSimAdvanceSnapshot.mock.calls[0]?.[0];
    expect(retained).not.toBe(intent);
    expect(retained).toMatchObject({ token: 'before-export', operation: 'sim_day', baselineDay: 12 });
    expect(Object.isFrozen(retained)).toBe(true);
    expect(mockedCommitSimAdvanceSnapshot.mock.calls[1]?.[0]).toBe(retained);
    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    finishSimAdvancePersistenceLease(lease);
  });

  it('rejects a non-cloneable intent before export without accepting a receipt or job', async () => {
    const lease = await beginActivatedSimAdvanceLease();
    const before = structuredClone(getActiveSavePersistenceStatus('save-slot-2'));
    const exportSnapshot = vi.fn();
    const nonCloneable = {
      ...simAdvanceIntent({ attempt: 102 }),
      unsupportedRuntimeField: () => undefined,
    } as unknown as SimAdvanceIntent;

    await expect(captureSimAdvanceSnapshot(lease, nonCloneable, {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot,
    })).rejects.toThrow();
    expect(exportSnapshot).not.toHaveBeenCalled();
    expect(mockedCommitSimAdvanceSnapshot).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus('save-slot-2')).toEqual(before);

    // No receipt or generation was accepted, so the still-current lease can
    // be terminally poisoned without pretending a durable write existed.
    expect(() => poisonSimAdvancePersistenceLease(lease)).not.toThrow();
  });

  it('keeps an integrity-unavailable journal commit retryable without re-exporting', async () => {
    vi.useFakeTimers();
    mockedCommitSimAdvanceSnapshot
      .mockRejectedValueOnce(new SaveIntegrityUnavailableError('Web Crypto is temporarily unavailable.'))
      .mockImplementationOnce(async (intent) => savedRecord(intent.saveId));
    const exportSnapshot = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' });
    const lease = await beginActivatedSimAdvanceLease();
    const receipt = await captureSimAdvanceSnapshot(lease, simAdvanceIntent({ attempt: 103 }), {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7, exportSnapshot,
    });
    const settlement = waitForActiveSavePersistenceReceipt(receipt);
    await flushPromises(10);
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({
      state: 'failed', failureKind: 'unavailable', pendingWrites: 1,
    });
    await retryActiveSavePersistence('save-slot-2');
    await expect(settlement).resolves.toMatchObject({ kind: 'durable' });
    expect(mockedCommitSimAdvanceSnapshot).toHaveBeenCalledTimes(2);
    expect(mockedCommitSimAdvanceSnapshot.mock.calls[0]?.[0])
      .toBe(mockedCommitSimAdvanceSnapshot.mock.calls[1]?.[0]);
    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    finishSimAdvancePersistenceLease(lease);
  });

  it.each([
    ['root', 'save-slot-2', 'save-slot-2'],
    ['branch', 'branch-2', 'save-slot-2'],
  ])('rejects an old %s baseline receipt while its accepted post receipt is pending, then closes only that post', async (_kind, saveId, rootSaveId) => {
    const lease = await beginActivatedSimAdvanceLease(saveId, rootSaveId);
    const baselineReceipt = await captureSimAdvanceBaselineSeal(lease, baselineSealProof(saveId, rootSaveId), {
      activeSaveId: saveId, activeSaveSlot: null, gmName: 'Ignored', teamName: 'Ignored', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
    });
    await expect(waitForActiveSavePersistenceReceipt(baselineReceipt)).resolves.toMatchObject({ kind: 'durable' });
    let resolvePost!: (record: SaveData) => void;
    mockedCommitSimAdvanceSnapshot.mockImplementationOnce(() => new Promise<SaveData>((resolve) => {
      resolvePost = resolve;
    }));
    const postReceipt = await captureSimAdvanceSnapshot(lease, simAdvanceIntent({
      saveId, rootSaveId, attempt: 104, token: `post-${saveId}`,
    }), {
      activeSaveId: saveId, activeSaveSlot: null, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 13, phase: 'regular' }),
    });
    await flushPromises();
    expect(mockedCommitSimAdvanceSnapshot).toHaveBeenCalledTimes(1);
    const beforePendingPost = structuredClone(getActiveSavePersistenceStatus(saveId));
    expect(beforePendingPost).toMatchObject({ state: 'saving', pendingWrites: 1 });

    expect(() => closeCommittedSimAdvancePersistenceLeaseFailClosed(lease, baselineReceipt))
      .toThrow('exact quiescent durable receipt');
    expect(getActiveSavePersistenceStatus(saveId)).toEqual(beforePendingPost);

    resolvePost(savedRecord(saveId));
    await expect(waitForActiveSavePersistenceReceipt(postReceipt)).resolves.toMatchObject({ kind: 'durable' });
    const beforeCommittedClose = structuredClone(getActiveSavePersistenceStatus(saveId));
    closeCommittedSimAdvancePersistenceLeaseFailClosed(lease, postReceipt);
    expect(getActiveSavePersistenceStatus(saveId)).toEqual(beforeCommittedClose);
  });

  it('does not let ordinary or completed-old-lease durability block a fresh lease poison', async () => {
    activateActiveSavePersistenceMetadata(savedRecord('save-slot-2'));
    let ordinaryReceipt: ActiveSavePersistenceReceipt | undefined;
    await persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
      onSnapshotAccepted: (receipt) => { ordinaryReceipt = receipt; },
    });
    const ordinaryDurableStatus = structuredClone(getActiveSavePersistenceStatus('save-slot-2'));
    const ordinaryLease = await beginSimAdvancePersistenceLease('save-slot-2', 'save-slot-2');
    expect(() => poisonSimAdvancePersistenceLease(ordinaryLease)).not.toThrow();
    expect(ordinaryReceipt).toBeDefined();
    expect(isActiveSavePersistenceReceiptDurable(ordinaryReceipt!)).toBe(true);
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({
      state: 'failed',
      pendingWrites: 0,
      canRetry: false,
      failureKind: 'unknown',
      desiredGeneration: ordinaryDurableStatus.desiredGeneration,
      durableGeneration: ordinaryDurableStatus.durableGeneration,
      saveName: ordinaryDurableStatus.saveName,
      lastSavedAt: ordinaryDurableStatus.lastSavedAt,
    });

    activateActiveSavePersistenceMetadata(savedRecord('save-slot-2'));
    const completedLease = await beginSimAdvancePersistenceLease('save-slot-2', 'save-slot-2');
    const oldReceipt = await captureSimAdvanceBaselineSeal(completedLease, baselineSealProof(), {
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Ignored', teamName: 'Ignored', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
    });
    await expect(waitForActiveSavePersistenceReceipt(oldReceipt)).resolves.toMatchObject({ kind: 'durable' });
    finishSimAdvancePersistenceLease(completedLease);

    const nextLease = await beginSimAdvancePersistenceLease('save-slot-2', 'save-slot-2');
    const before = structuredClone(getActiveSavePersistenceStatus('save-slot-2'));
    expect(() => closeCommittedSimAdvancePersistenceLeaseFailClosed(nextLease, oldReceipt))
      .toThrow('exact quiescent durable receipt');
    expect(getActiveSavePersistenceStatus('save-slot-2')).toEqual(before);
    expect(() => poisonSimAdvancePersistenceLease(nextLease)).not.toThrow();
  });

  it('quiesces an already accepted ordinary write before minting a simulation lease', async () => {
    activateActiveSavePersistenceMetadata(savedRecord('save-slot-2'));
    let releaseWrite!: () => void;
    mockedSaveGameById.mockImplementationOnce(() => new Promise<SaveData>((resolve) => {
      releaseWrite = () => resolve(savedRecord('save-slot-2'));
    }));
    const ordinaryExport = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' });
    const ordinary = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: ordinaryExport,
    });
    await vi.waitFor(() => expect(mockedSaveGameById).toHaveBeenCalledTimes(1));

    let leaseSettled = false;
    const pendingLease = beginSimAdvancePersistenceLease('save-slot-2', 'save-slot-2')
      .then((value) => {
        leaseSettled = true;
        return value;
      });
    await flushPromises();
    expect(leaseSettled).toBe(false);
    expect(ordinaryExport).toHaveBeenCalledTimes(1);

    releaseWrite();
    await expect(ordinary).resolves.toMatchObject({ saved: true });
    const lease = await pendingLease;
    expect(lease.saveId).toBe('save-slot-2');
    finishSimAdvancePersistenceLease(lease);
  });

  it('cleanly blocks simulation admission behind retained ordinary recovery without changing that recovery truth', async () => {
    vi.useFakeTimers();
    activateActiveSavePersistenceMetadata(savedRecord('save-slot-2'));
    mockedSaveGameById.mockRejectedValueOnce(new Error('IndexedDB storage failure'));
    const ordinary = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
    });
    await expect(ordinary).rejects.toThrow('IndexedDB storage failure');
    await flushPromises(10);
    const before = structuredClone(getActiveSavePersistenceStatus('save-slot-2'));

    await expect(beginSimAdvancePersistenceLease('save-slot-2', 'save-slot-2'))
      .rejects.toBeInstanceOf(SimAdvancePersistenceAdmissionBlockedError);
    expect(getActiveSavePersistenceStatus('save-slot-2')).toEqual(before);
  });

  it('waits for an already accepted ordinary write that later retains recovery, then cleanly blocks lease admission', async () => {
    vi.useFakeTimers();
    activateActiveSavePersistenceMetadata(savedRecord('save-slot-2'));
    let rejectWrite!: (error: Error) => void;
    mockedSaveGameById.mockImplementationOnce(() => new Promise<SaveData>((_resolve, reject) => {
      rejectWrite = reject;
    }));
    const ordinary = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2', activeSaveSlot: 2, gmName: 'Alex', teamName: 'Tycoons', season: 7,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 7, day: 12, phase: 'regular' }),
    });
    await vi.waitFor(() => expect(mockedSaveGameById).toHaveBeenCalledTimes(1));
    const admission = beginSimAdvancePersistenceLease('save-slot-2', 'save-slot-2');
    rejectWrite(new Error('IndexedDB storage failure'));
    await expect(ordinary).rejects.toThrow('IndexedDB storage failure');
    await expect(admission).rejects.toBeInstanceOf(SimAdvancePersistenceAdmissionBlockedError);
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({
      state: 'failed', pendingWrites: 1,
    });
  });


  it('preserves branch metadata when saving a non-slot active save', async () => {
    const snapshot = { schemaVersion: 34, season: 3, day: 44, phase: 'regular' };
    mockedLoadGameById.mockResolvedValue({
      id: 'branch-1',
      slotNumber: null,
      parentSaveId: 'save-slot-1',
      isRootSave: false,
      branchMeta: {
        id: 'branch-meta-1',
        saveId: 'branch-1',
        branchedAtSeason: 2,
        branchedAtDay: 99,
        description: 'What if',
        createdAt: '2026-05-20T00:00:00.000Z',
      },
    } as Awaited<ReturnType<typeof loadGameById>>);

    await persistActiveSaveSnapshot({
      activeSaveId: 'branch-1',
      activeSaveSlot: null,
      gmName: 'Branch GM',
      teamName: 'Alt Club',
      season: 3,
      exportSnapshot: vi.fn().mockResolvedValue(snapshot),
    });

    expect(mockedSaveGameById).toHaveBeenCalledWith(
      'branch-1',
      'Branch GM • Alt Club • Season 3',
      snapshot,
      expect.objectContaining({
        slotNumber: null,
        parentSaveId: 'save-slot-1',
        isRootSave: false,
      }),
    );
  });

  it('keeps a three-generation burst ordered and reports exact logical pending depth through coalescing', async () => {
    const writeReleases: Array<() => void> = [];
    const writtenStates: object[] = [];
    mockedSaveGameById.mockImplementation(async (id, _name, state) => {
      writtenStates.push(state);
      await new Promise<void>((resolve) => {
        writeReleases.push(resolve);
      });
      const day = (state as { day: number }).day;
      return savedRecord(id, `2026-04-02T19:42:${String(day - 100).padStart(2, '0')}.000Z`);
    });

    const first = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 101 }),
    });
    await Promise.resolve();

    const second = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 102 }),
    });
    await Promise.resolve();

    const third = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 103 }),
    });
    await Promise.resolve();

    let firstSettled = false;
    first.then(() => {
      firstSettled = true;
    });

    expect(mockedSaveGameById).toHaveBeenCalledTimes(1);
    expect(writtenStates).toEqual([{ schemaVersion: 34, season: 4, day: 101 }]);
    expect(getActiveSavePersistenceStatus('save-slot-1')).toMatchObject({
      state: 'saving',
      desiredGeneration: 3,
      durableGeneration: 0,
      pendingWrites: 3,
      lastSavedAt: null,
    });

    writeReleases.shift()?.();
    await flushPromises();

    expect(firstSettled).toBe(false);
    expect(mockedSaveGameById).toHaveBeenCalledTimes(2);
    expect(writtenStates).toEqual([
      { schemaVersion: 34, season: 4, day: 101 },
      { schemaVersion: 34, season: 4, day: 103 },
    ]);
    expect(getActiveSavePersistenceStatus('save-slot-1')).toMatchObject({
      state: 'saving',
      desiredGeneration: 3,
      durableGeneration: 1,
      pendingWrites: 2,
      lastSavedAt: '2026-04-02T19:42:01.000Z',
    });

    writeReleases.shift()?.();
    await Promise.all([first, second, third]);

    expect(getActiveSavePersistenceStatus('save-slot-1')).toMatchObject({
      state: 'saved',
      desiredGeneration: 3,
      durableGeneration: 3,
      pendingWrites: 0,
      canRetry: false,
      lastSavedAt: '2026-04-02T19:42:03.000Z',
    });
  });

  it('does not coalesce pending writes across different active save ids', async () => {
    const writeReleases: Array<() => void> = [];
    mockedSaveGameById.mockImplementation(async (id) => {
      await new Promise<void>((resolve) => {
        writeReleases.push(resolve);
      });
      return savedRecord(id);
    });

    const slotOne = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 2,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 2, day: 44 }),
    });
    await Promise.resolve();

    const slotTwo = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      gmName: 'Branch GM',
      teamName: 'Rivals',
      season: 8,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 8, day: 10 }),
    });
    await Promise.resolve();

    expect(mockedSaveGameById).toHaveBeenCalledWith(
      'save-slot-1',
      expect.any(String),
      expect.objectContaining({ day: 44 }),
      expect.objectContaining({ slotNumber: 1 }),
    );
    expect(mockedSaveGameById).toHaveBeenCalledWith(
      'save-slot-2',
      expect.any(String),
      expect.objectContaining({ day: 10 }),
      expect.objectContaining({ slotNumber: 2 }),
    );

    writeReleases.splice(0).forEach((release) => release());
    await Promise.all([slotOne, slotTwo]);

    expect(getActiveSavePersistenceStatus('save-slot-1')).toMatchObject({ state: 'saved', durableGeneration: 1, pendingWrites: 0 });
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ state: 'saved', durableGeneration: 1, pendingWrites: 0 });
  });

  it('binds a delayed export to the save id captured before an active-save switch', async () => {
    let releaseSlotOneExport: () => void = () => {};
    const exportSlotOne = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        releaseSlotOneExport = resolve;
      });
      return { schemaVersion: 34, season: 3, day: 18 };
    });
    const exportSlotTwo = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 9, day: 2 });

    const slotOne = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Slot One GM',
      teamName: 'Tycoons',
      season: 3,
      exportSnapshot: exportSlotOne,
    });
    await Promise.resolve();

    const slotTwo = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      gmName: 'Slot Two GM',
      teamName: 'Rivals',
      season: 9,
      exportSnapshot: exportSlotTwo,
    });

    await slotTwo;
    releaseSlotOneExport();
    await slotOne;

    expect(mockedSaveGameById).toHaveBeenNthCalledWith(
      1,
      'save-slot-2',
      'Slot Two GM • Rivals • Season 9',
      { schemaVersion: 34, season: 9, day: 2 },
      expect.objectContaining({ slotNumber: 2 }),
    );
    expect(mockedSaveGameById).toHaveBeenNthCalledWith(
      2,
      'save-slot-1',
      'Slot One GM • Tycoons • Season 3',
      { schemaVersion: 34, season: 3, day: 18 },
      expect.objectContaining({ slotNumber: 1 }),
    );
  });

  it('retries the latest failed captured snapshot without exporting or rerunning mutation work', async () => {
    const snapshot = { schemaVersion: 34, season: 5, day: 120, phase: 'regular' };
    const exportSnapshot = vi.fn().mockResolvedValue(snapshot);
    const storageError = new Error('QuotaExceededError');
    let acceptedReceipt: ActiveSavePersistenceReceipt | null = null;
    reconcileActiveSavePersistenceMetadata(savedRecord(
      'save-slot-5',
      '2026-04-02T19:40:00.000Z',
    ));
    mockedSaveGameById
      .mockRejectedValueOnce(storageError)
      .mockResolvedValueOnce(savedRecord('save-slot-5', '2026-04-02T19:45:00.000Z'));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot,
      onSnapshotAccepted: (receipt) => { acceptedReceipt = receipt; },
    })).rejects.toThrow('QuotaExceededError');

    expect(acceptedReceipt).toMatchObject({ saveId: 'save-slot-5', generation: 1 });
    expect(isActiveSavePersistenceReceiptDurable(acceptedReceipt!)).toBe(false);

    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'failed',
      canRetry: true,
      failureKind: 'quota',
      desiredGeneration: 1,
      durableGeneration: 0,
      pendingWrites: 1,
      lastSavedAt: '2026-04-02T19:40:00.000Z',
    });

    await retryActiveSavePersistence('save-slot-5');

    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedSaveGameById).toHaveBeenCalledTimes(2);
    expect(mockedSaveGameById).toHaveBeenNthCalledWith(
      2,
      'save-slot-5',
      'Alex Rivera • Tycoons • Season 5',
      snapshot,
      expect.objectContaining({ slotNumber: 5 }),
    );
    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'saved',
      canRetry: false,
      durableGeneration: 1,
      pendingWrites: 0,
      lastSavedAt: '2026-04-02T19:45:00.000Z',
    });
    expect(isActiveSavePersistenceReceiptDurable(acceptedReceipt!)).toBe(true);

    activateActiveSavePersistenceMetadata(savedRecord(
      'save-slot-5',
      '2026-04-02T19:45:00.000Z',
    ));
    expect(isActiveSavePersistenceReceiptDurable(acceptedReceipt!)).toBe(false);
  });

  it('runs exactly two automatic persistence retries before exposing fallback', async () => {
    vi.useFakeTimers();
    const snapshot = { schemaVersion: 34, season: 5, day: 121, phase: 'regular' };
    const exportSnapshot = vi.fn().mockResolvedValue(snapshot);
    reconcileActiveSavePersistenceMetadata(savedRecord(
      'save-slot-5',
      '2026-04-02T19:40:00.000Z',
    ));
    mockedSaveGameById.mockRejectedValue(new DOMException(
      'The quota has been exceeded.',
      'QuotaExceededError',
    ));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot,
    })).rejects.toThrow('quota');

    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'failed',
      pendingWrites: 1,
      lastSavedAt: '2026-04-02T19:40:00.000Z',
      recovery: {
        phase: 'retry_scheduled',
        automaticAttempts: 0,
        automaticAttemptLimit: 2,
        failureKind: 'quota',
      },
    });

    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[0]);
    await flushPromises();
    expect(mockedSaveGameById).toHaveBeenCalledTimes(2);
    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'failed',
      pendingWrites: 1,
      recovery: {
        phase: 'retry_scheduled',
        automaticAttempts: 1,
      },
    });

    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[1]);
    await flushPromises();
    expect(mockedSaveGameById).toHaveBeenCalledTimes(3);
    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'failed',
      canRetry: true,
      pendingWrites: 1,
      lastSavedAt: '2026-04-02T19:40:00.000Z',
      recovery: {
        phase: 'fallback_ready',
        automaticAttempts: 2,
        automaticAttemptLimit: 2,
      },
    });

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000);
    expect(mockedSaveGameById).toHaveBeenCalledTimes(3);
  });

  it('retains the initiating failure evidence across heterogeneous automatic and manual failures', async () => {
    vi.useFakeTimers();
    const quotaError = new Error('QuotaExceededError: disk full');
    const unavailableError = Object.assign(
      new Error('Browser storage is unavailable.'),
      { name: 'SecurityError' },
    );
    const transactionError = new Error('TransactionInactiveError: write aborted');
    const manualError = new Error('InvalidStateError: database closed');
    mockedSaveGameById
      .mockRejectedValueOnce(quotaError)
      .mockRejectedValueOnce(unavailableError)
      .mockRejectedValueOnce(transactionError)
      .mockRejectedValueOnce(manualError);

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-11',
      activeSaveSlot: 11,
      gmName: 'Evidence GM',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 5, day: 121 }),
    })).rejects.toThrow('QuotaExceededError');

    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[0]);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[1]);
    await flushPromises();

    expect(getActiveSavePersistenceStatus('save-slot-11')).toMatchObject({
      state: 'failed',
      failureKind: 'quota',
      errorMessage: quotaError.message,
      recovery: {
        phase: 'fallback_ready',
        failureKind: 'quota',
        errorMessage: quotaError.message,
      },
    });

    await expect(retryActiveSavePersistence('save-slot-11')).rejects.toThrow('InvalidStateError');
    expect(getActiveSavePersistenceStatus('save-slot-11')).toMatchObject({
      state: 'failed',
      failureKind: 'quota',
      errorMessage: quotaError.message,
      recovery: {
        phase: 'fallback_ready',
        failureKind: 'quota',
        errorMessage: quotaError.message,
      },
    });
    expect(mockedSaveGameById).toHaveBeenCalledTimes(4);
  });

  it('recovers automatically from the exact retained snapshot and cancels later timers', async () => {
    vi.useFakeTimers();
    const snapshot = { schemaVersion: 34, season: 5, day: 122, phase: 'regular' };
    const exportSnapshot = vi.fn().mockResolvedValue(snapshot);
    reconcileActiveSavePersistenceMetadata(savedRecord(
      'save-slot-5',
      '2026-04-02T19:40:00.000Z',
    ));
    mockedSaveGameById
      .mockRejectedValueOnce(new Error('TransactionInactiveError'))
      .mockResolvedValueOnce(savedRecord('save-slot-5', '2026-04-02T19:45:00.000Z'));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot,
    })).rejects.toThrow('TransactionInactiveError');

    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[0]);
    await flushPromises();

    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedSaveGameById).toHaveBeenNthCalledWith(
      2,
      'save-slot-5',
      'Alex Rivera • Tycoons • Season 5',
      snapshot,
      expect.objectContaining({ slotNumber: 5 }),
    );
    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'saved',
      durableGeneration: 1,
      pendingWrites: 0,
      lastSavedAt: '2026-04-02T19:45:00.000Z',
      recovery: {
        phase: 'recovered',
        automaticAttempts: 1,
        failureKind: 'indexeddb',
      },
    });

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000);
    expect(mockedSaveGameById).toHaveBeenCalledTimes(2);
  });

  it('lets manual Retry cancel the automatic sequence and falls back immediately if manual persistence fails', async () => {
    vi.useFakeTimers();
    mockedSaveGameById.mockRejectedValue(new Error('Persistent storage unavailable'));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 5, day: 123 }),
    })).rejects.toThrow('Persistent storage unavailable');

    await expect(retryActiveSavePersistence('save-slot-5'))
      .rejects.toThrow('Persistent storage unavailable');
    expect(mockedSaveGameById).toHaveBeenCalledTimes(2);
    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'failed',
      canRetry: true,
      recovery: {
        phase: 'fallback_ready',
        automaticAttempts: 0,
        failureKind: 'unavailable',
      },
    });

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000);
    expect(mockedSaveGameById).toHaveBeenCalledTimes(2);
  });

  it('keeps one outage budget when a newer full snapshot supersedes a scheduled retry', async () => {
    vi.useFakeTimers();
    const firstSnapshot = parseGameSnapshot(snapshotFixture);
    const latestSnapshot = parseGameSnapshot({
      ...firstSnapshot,
      day: firstSnapshot.day === 162 ? 161 : firstSnapshot.day + 1,
    });
    mockedSaveGameById.mockRejectedValue(new Error('TransactionInactiveError'));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot: vi.fn().mockResolvedValue(firstSnapshot),
    })).rejects.toThrow('TransactionInactiveError');
    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[0]);
    await flushPromises();
    expect(mockedSaveGameById).toHaveBeenCalledTimes(2);

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot: vi.fn().mockResolvedValue(latestSnapshot),
    })).rejects.toThrow('TransactionInactiveError');
    expect(getActiveSavePersistenceStatus('save-slot-5').recovery).toMatchObject({
      phase: 'retry_scheduled',
      automaticAttempts: 1,
    });

    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[1]);
    await flushPromises();

    expect(mockedSaveGameById).toHaveBeenCalledTimes(4);
    expect(mockedSaveGameById).toHaveBeenLastCalledWith(
      'save-slot-5',
      expect.any(String),
      latestSnapshot,
      expect.objectContaining({ slotNumber: 5 }),
    );
    expect(getActiveSavePersistenceStatus('save-slot-5').recovery).toMatchObject({
      phase: 'fallback_ready',
      automaticAttempts: 2,
    });
    const backup = createActiveSavePersistenceBackup('save-slot-5');
    expect(backup).toMatchObject({
      saveId: 'save-slot-5',
      generation: 2,
      filename: 'mbd-save-slot-5-pending-2.json',
    });
    expect(importSnapshotFromJson(backup!.payload).snapshot).toEqual(latestSnapshot);
  });

  it('does not let a metadata operation supersede a failed gameplay snapshot or destroy Retry', async () => {
    mockedSaveGameById
      .mockRejectedValueOnce(new Error('QuotaExceededError'))
      .mockResolvedValueOnce(savedRecord('save-slot-5', '2026-04-02T19:45:00.000Z'));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 5, day: 120 }),
    })).rejects.toThrow('QuotaExceededError');

    const metadataOperation = vi.fn().mockResolvedValue(
      savedRecord('save-slot-5', '2026-04-02T19:44:00.000Z'),
    );
    await expect(trackActiveSavePersistenceOperation(
      'save-slot-5',
      metadataOperation,
    )).rejects.toThrow('unresolved persistence work');

    expect(metadataOperation).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'failed',
      desiredGeneration: 1,
      durableGeneration: 0,
      pendingWrites: 1,
      canRetry: true,
      lastSavedAt: null,
    });

    await retryActiveSavePersistence('save-slot-5');
    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'saved',
      desiredGeneration: 1,
      durableGeneration: 1,
      pendingWrites: 0,
      canRetry: false,
      lastSavedAt: '2026-04-02T19:45:00.000Z',
    });
  });

  it('preserves Retry for a failed durable snapshot when a later export also fails', async () => {
    const retainedSnapshot = { schemaVersion: 34, season: 5, day: 120 };
    mockedSaveGameById
      .mockRejectedValueOnce(new Error('QuotaExceededError'))
      .mockResolvedValueOnce(savedRecord('save-slot-5', '2026-04-02T19:45:00.000Z'));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot: vi.fn().mockResolvedValue(retainedSnapshot),
    })).rejects.toThrow('QuotaExceededError');

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot: vi.fn().mockRejectedValue(new Error('Worker export failed.')),
    })).rejects.toThrow('Worker export failed.');

    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'failed',
      desiredGeneration: 1,
      durableGeneration: 0,
      pendingWrites: 1,
      canRetry: true,
      failureKind: 'quota',
      errorMessage: 'QuotaExceededError',
    });

    await retryActiveSavePersistence('save-slot-5');
    expect(mockedSaveGameById).toHaveBeenLastCalledWith(
      'save-slot-5',
      'Current GM • Tycoons • Season 5',
      retainedSnapshot,
      expect.objectContaining({ slotNumber: 5 }),
    );
    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'saved',
      pendingWrites: 0,
      canRetry: false,
      lastSavedAt: '2026-04-02T19:45:00.000Z',
    });
  });

  it('reschedules automatic recovery after a newer snapshot export fails', async () => {
    vi.useFakeTimers();
    const retainedSnapshot = { schemaVersion: 34, season: 5, day: 120 };
    mockedSaveGameById
      .mockRejectedValueOnce(new Error('QuotaExceededError'))
      .mockResolvedValueOnce(savedRecord('save-slot-5', '2026-04-02T19:45:00.000Z'));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot: vi.fn().mockResolvedValue(retainedSnapshot),
    })).rejects.toThrow('QuotaExceededError');

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot: vi.fn().mockRejectedValue(new Error('Worker export failed.')),
    })).rejects.toThrow('Worker export failed.');

    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'failed',
      pendingWrites: 1,
      failureKind: 'quota',
      recovery: {
        phase: 'retry_scheduled',
        automaticAttempts: 0,
      },
    });
    expect(mockedSaveGameById).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[0]);
    await flushPromises();

    expect(mockedSaveGameById).toHaveBeenCalledTimes(2);
    expect(mockedSaveGameById).toHaveBeenLastCalledWith(
      'save-slot-5',
      'Current GM • Tycoons • Season 5',
      retainedSnapshot,
      expect.objectContaining({ slotNumber: 5 }),
    );
    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'saved',
      pendingWrites: 0,
      recovery: {
        phase: 'recovered',
      },
    });
  });

  it('reschedules recovery when a delayed successful export is invalidated by a released load barrier', async () => {
    vi.useFakeTimers();
    const retainedSnapshot = { schemaVersion: 34, season: 5, day: 120 };
    mockedSaveGameById
      .mockRejectedValueOnce(new Error('QuotaExceededError'))
      .mockResolvedValueOnce(savedRecord('save-slot-5', '2026-04-02T19:45:00.000Z'));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot: vi.fn().mockResolvedValue(retainedSnapshot),
    })).rejects.toThrow('QuotaExceededError');

    let resolveDelayedExport: ((snapshot: object) => void) | undefined;
    const delayedExport = new Promise<object>((resolve) => {
      resolveDelayedExport = resolve;
    });
    const invalidatedCapture = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot: () => delayedExport,
    });
    await flushPromises();

    await prepareActiveSavePersistenceForLoad('save-slot-5');
    releaseActiveSavePersistenceLoad('save-slot-5');
    resolveDelayedExport?.({ schemaVersion: 34, season: 5, day: 121 });
    await expect(invalidatedCapture).resolves.toEqual({ saved: false, saveName: null });
    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'failed',
      pendingWrites: 1,
      recovery: {
        phase: 'retry_scheduled',
        automaticAttempts: 0,
      },
    });

    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[0]);
    await flushPromises();

    expect(mockedSaveGameById).toHaveBeenCalledTimes(2);
    expect(mockedSaveGameById).toHaveBeenLastCalledWith(
      'save-slot-5',
      'Current GM • Tycoons • Season 5',
      retainedSnapshot,
      expect.objectContaining({ slotNumber: 5 }),
    );
    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'saved',
      pendingWrites: 0,
    });
  });

  it('makes an explicit load supersede a retained failed snapshot and its retry', async () => {
    const storageError = new Error('QuotaExceededError');
    mockedSaveGameById.mockRejectedValueOnce(storageError);

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-4',
      activeSaveSlot: 4,
      gmName: 'Old Runtime GM',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 88 }),
    })).rejects.toThrow('QuotaExceededError');

    await prepareActiveSavePersistenceForLoad('save-slot-4');
    activateActiveSavePersistenceMetadata(savedRecord(
      'save-slot-4',
      '2026-04-02T18:00:00.000Z',
    ));

    expect(getActiveSavePersistenceStatus('save-slot-4')).toMatchObject({
      state: 'idle',
      desiredGeneration: 0,
      durableGeneration: 0,
      pendingWrites: 0,
      canRetry: false,
      lastSavedAt: '2026-04-02T18:00:00.000Z',
    });
    await expect(retryActiveSavePersistence('save-slot-4')).resolves.toEqual({
      saved: false,
      saveName: null,
    });
    expect(mockedSaveGameById).toHaveBeenCalledTimes(1);
  });

  it('invalidates a scheduled retry and stale fallback action when another save activates', async () => {
    vi.useFakeTimers();
    const retainedSnapshot = parseGameSnapshot(snapshotFixture);
    mockedSaveGameById.mockRejectedValue(new Error('TransactionInactiveError'));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-4',
      activeSaveSlot: 4,
      gmName: 'Old Runtime GM',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: vi.fn().mockResolvedValue(retainedSnapshot),
    })).rejects.toThrow('TransactionInactiveError');
    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[0]);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[1]);
    await flushPromises();
    expect(getActiveSavePersistenceStatus('save-slot-4').recovery).toMatchObject({
      phase: 'fallback_ready',
    });
    expect(createActiveSavePersistenceBackup('save-slot-4')).toMatchObject({
      saveId: 'save-slot-4',
      generation: 1,
    });

    activateActiveSavePersistenceMetadata(savedRecord(
      'save-slot-6',
      '2026-04-02T20:00:00.000Z',
    ));
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000);

    expect(mockedSaveGameById).toHaveBeenCalledTimes(3);
    await expect(retryActiveSavePersistence('save-slot-4')).resolves.toEqual({
      saved: false,
      saveName: null,
    });
    expect(createActiveSavePersistenceBackup('save-slot-4')).toBeNull();
  });

  it('does not let a late stale-save callback reclaim ownership after another save activates', async () => {
    vi.useFakeTimers();
    activateActiveSavePersistenceMetadata(savedRecord(
      'save-slot-6',
      '2026-04-02T20:00:00.000Z',
    ));
    mockedSaveGameById
      .mockRejectedValueOnce(new Error('QuotaExceededError'))
      .mockResolvedValueOnce(savedRecord('save-slot-6', '2026-04-02T20:01:00.000Z'));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-6',
      activeSaveSlot: 6,
      gmName: 'Active GM',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 91 }),
    })).rejects.toThrow('QuotaExceededError');

    const staleExport = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 92 });
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-4',
      activeSaveSlot: 4,
      gmName: 'Stale GM',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: staleExport,
    })).resolves.toEqual({ saved: false, saveName: null });
    expect(staleExport).not.toHaveBeenCalled();

    const staleMetadataOperation = vi.fn().mockResolvedValue(savedRecord('save-slot-4'));
    await expect(trackActiveSavePersistenceOperation(
      'save-slot-4',
      staleMetadataOperation,
    )).rejects.toThrow('not the active persistence owner');
    expect(staleMetadataOperation).not.toHaveBeenCalled();

    await expect(retryActiveSavePersistence('save-slot-6')).resolves.toEqual({
      saved: true,
      saveName: 'Active GM • Tycoons • Season 4',
    });
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000);

    expect(mockedSaveGameById).toHaveBeenCalledTimes(2);
    expect(getActiveSavePersistenceStatus('save-slot-6')).toMatchObject({
      state: 'saved',
      pendingWrites: 0,
      lastSavedAt: '2026-04-02T20:01:00.000Z',
    });
  });

  it('cancels scheduled recovery when a failed save is deleted or replaced', async () => {
    vi.useFakeTimers();
    mockedSaveGameById.mockRejectedValue(new Error('TransactionInactiveError'));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-7',
      activeSaveSlot: 7,
      gmName: 'Delete GM',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 90 }),
    })).rejects.toThrow('TransactionInactiveError');
    await retireActiveSavePersistenceForDelete('save-slot-7', async () => undefined);

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-8',
      activeSaveSlot: 8,
      gmName: 'Replace GM',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 91 }),
    })).rejects.toThrow('TransactionInactiveError');
    const replacement = savedRecord('save-slot-8', '2026-04-02T21:00:00.000Z');
    await replaceInactiveSavePersistenceRecord('save-slot-8', async () => replacement);

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000);
    expect(mockedSaveGameById).toHaveBeenCalledTimes(2);
    expect(getActiveSavePersistenceStatus('save-slot-7').recovery).toBeNull();
    expect(getActiveSavePersistenceStatus('save-slot-8')).toMatchObject({
      state: 'idle',
      pendingWrites: 0,
      lastSavedAt: '2026-04-02T21:00:00.000Z',
      recovery: null,
    });
  });

  it('clears scheduled retry timers when the coordinator test/runtime owner resets', async () => {
    vi.useFakeTimers();
    mockedSaveGameById.mockRejectedValue(new Error('TransactionInactiveError'));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-9',
      activeSaveSlot: 9,
      gmName: 'Reset GM',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 92 }),
    })).rejects.toThrow('TransactionInactiveError');
    resetActiveSavePersistenceForTesting();
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000);

    expect(mockedSaveGameById).toHaveBeenCalledTimes(1);
    expect(getActiveSavePersistenceStatus()).toMatchObject({
      state: 'idle',
      recovery: null,
    });
  });

  it('creates an importable canonical backup from the exhausted retained snapshot without changing durability', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-02T19:42:03.000Z'));
    const snapshot = parseGameSnapshot(snapshotFixture);
    const exportSnapshot = vi.fn().mockResolvedValue(snapshot);
    reconcileActiveSavePersistenceMetadata(savedRecord(
      'save-slot-10',
      '2026-04-02T19:40:00.000Z',
    ));
    mockedSaveGameById.mockRejectedValue(new Error('TransactionInactiveError'));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-10',
      activeSaveSlot: 10,
      gmName: 'Backup GM',
      teamName: 'Tycoons',
      season: snapshot.season,
      exportSnapshot,
    })).rejects.toThrow('TransactionInactiveError');
    await vi.advanceTimersByTimeAsync(
      ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[0] + ACTIVE_SAVE_AUTO_RETRY_DELAYS_MS[1],
    );
    await flushPromises();

    const statusBeforeBackup = getActiveSavePersistenceStatus('save-slot-10');
    const backup = createActiveSavePersistenceBackup('save-slot-10');
    expect(backup).toMatchObject({
      saveId: 'save-slot-10',
      generation: 1,
      filename: 'mbd-save-slot-10-pending-1.json',
    });
    expect(backup?.payload).toContain('"kind": "mbd-save-export"');
    expect(importSnapshotFromJson(backup!.payload).snapshot).toEqual(snapshot);
    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    expect(getActiveSavePersistenceStatus('save-slot-10')).toBe(statusBeforeBackup);
    expect(getActiveSavePersistenceStatus('save-slot-10')).toMatchObject({
      state: 'failed',
      pendingWrites: 1,
      lastSavedAt: '2026-04-02T19:40:00.000Z',
      canRetry: true,
      recovery: { phase: 'fallback_ready' },
    });
  });

  it('lets a newer coordinator capture supersede a retained failed snapshot', async () => {
    mockedSaveGameById
      .mockRejectedValueOnce(new Error('QuotaExceededError'))
      .mockResolvedValueOnce(savedRecord('save-slot-5', '2026-04-02T19:55:00.000Z'));

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 5, day: 40 }),
    })).rejects.toThrow('QuotaExceededError');

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 5, day: 41 }),
    })).resolves.toMatchObject({ saved: true });

    expect(mockedSaveGameById).toHaveBeenLastCalledWith(
      'save-slot-5',
      expect.any(String),
      expect.objectContaining({ day: 41 }),
      expect.objectContaining({ slotNumber: 5 }),
    );
    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'saved',
      desiredGeneration: 2,
      durableGeneration: 2,
      pendingWrites: 0,
      canRetry: false,
      lastSavedAt: '2026-04-02T19:55:00.000Z',
    });
    await expect(retryActiveSavePersistence('save-slot-5')).resolves.toEqual({
      saved: false,
      saveName: null,
    });
    expect(mockedSaveGameById).toHaveBeenCalledTimes(2);
  });

  it('blocks delayed captures during a load boundary without writing the stale snapshot', async () => {
    let releaseExport: (snapshot: object) => void = () => {};
    const delayedCapture = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-3',
      activeSaveSlot: 3,
      gmName: 'Old Runtime GM',
      teamName: 'Tycoons',
      season: 3,
      exportSnapshot: () => new Promise<object>((resolve) => {
        releaseExport = resolve;
      }),
    });
    await Promise.resolve();

    await prepareActiveSavePersistenceForLoad('save-slot-3');
    releaseExport({ schemaVersion: 34, season: 3, day: 77 });

    await expect(delayedCapture).resolves.toEqual({ saved: false, saveName: null });
    expect(mockedSaveGameById).not.toHaveBeenCalled();

    releaseActiveSavePersistenceLoad('save-slot-3');
    activateActiveSavePersistenceMetadata(savedRecord('save-slot-3'));
    expect(getActiveSavePersistenceStatus('save-slot-3')).toMatchObject({
      state: 'idle',
      pendingWrites: 0,
      canRetry: false,
    });
  });

  it('waits for an already accepted write before opening the durable load boundary', async () => {
    let releaseWrite: () => void = () => {};
    mockedSaveGameById.mockImplementationOnce(async (id) => {
      await new Promise<void>((resolve) => {
        releaseWrite = resolve;
      });
      return savedRecord(id, '2026-04-02T19:50:00.000Z');
    });

    const persistence = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 2,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 2, day: 30 }),
    });
    await Promise.resolve();

    let prepared = false;
    const preparation = prepareActiveSavePersistenceForLoad('save-slot-2').then(() => {
      prepared = true;
    });
    await Promise.resolve();
    expect(prepared).toBe(false);

    releaseWrite();
    await Promise.all([persistence, preparation]);
    expect(prepared).toBe(true);
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({
      state: 'saved',
      pendingWrites: 0,
      lastSavedAt: '2026-04-02T19:50:00.000Z',
    });

    activateActiveSavePersistenceMetadata(savedRecord(
      'save-slot-2',
      '2026-04-02T19:50:00.000Z',
    ));
    expect(getActiveSavePersistenceStatus('save-slot-2').state).toBe('idle');
  });

  it('quiesces the outgoing accepted write before completing a session switch', async () => {
    activateActiveSavePersistenceMetadata(savedRecord('save-slot-1'));
    let releaseWrite: () => void = () => {};
    mockedSaveGameById.mockImplementationOnce(async (id) => {
      await new Promise<void>((resolve) => {
        releaseWrite = resolve;
      });
      return savedRecord(id, '2026-04-02T20:00:00.000Z');
    });
    const persistence = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Outgoing GM',
      teamName: 'Tycoons',
      season: 2,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 2, day: 50 }),
    });
    await flushPromises();

    let prepared = false;
    const preparation = prepareActiveSaveSessionTransition('save-slot-2').then((transition) => {
      prepared = true;
      return transition;
    });
    await flushPromises();
    expect(prepared).toBe(false);

    releaseWrite();
    await persistence;
    const transition = await preparation;
    markActiveSaveSessionTransitionOwnershipCommitted(transition);
    activateActiveSavePersistenceMetadata(savedRecord('save-slot-2'));
    completeActiveSaveSessionTransition(transition);

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Stale GM',
      teamName: 'Tycoons',
      season: 2,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 2, day: 51 }),
    })).resolves.toEqual({ saved: false, saveName: null });
    expect(mockedSaveGameById).toHaveBeenCalledTimes(1);
  });

  it('forces the settled worker state durable before a display-refresh gap can switch saves', async () => {
    activateActiveSavePersistenceMetadata(savedRecord('save-slot-1'));
    let finishOutgoingPersistence!: () => void;
    const persistOutgoingSnapshot = vi.fn(() => new Promise<{
      saved: boolean;
      saveName: string | null;
    }>((resolve) => {
      finishOutgoingPersistence = () => resolve({
        saved: true,
        saveName: 'Outgoing after accepted mutation',
      });
    }));

    let prepared = false;
    const preparation = prepareActiveSaveSessionTransition('save-slot-2', {
      persistOutgoingSnapshot,
    }).then((transition) => {
      prepared = true;
      return transition;
    });
    await flushPromises();

    expect(persistOutgoingSnapshot).toHaveBeenCalledWith('save-slot-1');
    expect(prepared).toBe(false);
    expect(() => beginWorkerMutation('save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );

    finishOutgoingPersistence();
    const transition = await preparation;
    abortActiveSaveSessionTransition(transition);
    expect(prepared).toBe(true);
  });

  it('restores the outgoing editor when a prepared candidate switch aborts', async () => {
    activateActiveSavePersistenceMetadata(savedRecord('save-slot-1'));
    const transition = await prepareActiveSaveSessionTransition('save-slot-2');
    abortActiveSaveSessionTransition(transition);

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Still Active',
      teamName: 'Tycoons',
      season: 2,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 2, day: 52 }),
    })).resolves.toMatchObject({ saved: true });
    expect(mockedSaveGameById).toHaveBeenCalledTimes(1);
  });

  it('keeps the worker mutation lane closed for the full prepared transition', async () => {
    const inFlightMutation = beginWorkerMutation('save-slot-1');
    await expect(prepareActiveSaveSessionTransition('save-slot-2')).rejects.toMatchObject({
      kind: 'request_failed',
    });
    finishWorkerMutation(inFlightMutation);

    const transition = await prepareActiveSaveSessionTransition('save-slot-2');
    expect(() => beginWorkerMutation('save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    abortActiveSaveSessionTransition(transition);

    const outgoingMutation = beginWorkerMutation('save-slot-1');
    finishWorkerMutation(outgoingMutation);
  });

  it('refuses to release an outgoing editor with unresolved persistence work', async () => {
    activateActiveSavePersistenceMetadata(savedRecord('save-slot-1'));
    mockedSaveGameById.mockRejectedValueOnce(new Error('QuotaExceededError: storage full'));
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Unsaved GM',
      teamName: 'Tycoons',
      season: 2,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 2, day: 53 }),
    })).rejects.toThrow('storage full');

    await expect(prepareActiveSaveSessionTransition('save-slot-2')).rejects.toThrow(
      'unresolved persistence work',
    );
    expect(getActiveSavePersistenceStatus('save-slot-1')).toMatchObject({
      state: 'failed',
      pendingWrites: 1,
      canRetry: true,
    });

    await expect(retryActiveSavePersistence('save-slot-1')).resolves.toMatchObject({ saved: true });
  });

  it('waits for an invalidated outgoing capture before a candidate can proceed', async () => {
    activateActiveSavePersistenceMetadata(savedRecord('save-slot-1'));
    let releaseExport: (snapshot: object) => void = () => {};
    const capture = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Capture GM',
      teamName: 'Tycoons',
      season: 2,
      exportSnapshot: () => new Promise<object>((resolve) => {
        releaseExport = resolve;
      }),
    });
    await Promise.resolve();

    let prepared = false;
    const preparation = prepareActiveSaveSessionTransition('save-slot-2').then((transition) => {
      prepared = true;
      return transition;
    });
    await flushPromises();
    expect(prepared).toBe(false);

    releaseExport({ schemaVersion: 34, season: 2, day: 54 });
    await expect(capture).resolves.toEqual({ saved: false, saveName: null });
    const transition = await preparation;
    expect(prepared).toBe(true);
    abortActiveSaveSessionTransition(transition);
    expect(mockedSaveGameById).not.toHaveBeenCalled();
  });

  it('tracks an active-save metadata operation as one pending generation and queues new captures behind it', async () => {
    let releaseOperation: () => void = () => {};
    reconcileActiveSavePersistenceMetadata(savedRecord(
      'save-slot-1',
      '2026-04-02T19:40:00.000Z',
    ));
    const operation = trackActiveSavePersistenceOperation(
      'save-slot-1',
      async () => {
        await new Promise<void>((resolve) => {
          releaseOperation = resolve;
        });
        return savedRecord('save-slot-1', '2026-04-02T19:41:00.000Z');
      },
    );
    await flushPromises();

    expect(getActiveSavePersistenceStatus('save-slot-1')).toMatchObject({
      state: 'saving',
      desiredGeneration: 1,
      durableGeneration: 0,
      pendingWrites: 1,
      lastSavedAt: '2026-04-02T19:40:00.000Z',
    });

    const exportSnapshot = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 92 });
    const queuedCapture = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot,
    });
    await flushPromises();
    expect(exportSnapshot).not.toHaveBeenCalled();

    releaseOperation();
    await operation;
    await queuedCapture;

    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    expect(getActiveSavePersistenceStatus('save-slot-1')).toMatchObject({
      state: 'saved',
      desiredGeneration: 2,
      durableGeneration: 2,
      pendingWrites: 0,
      lastSavedAt: '2026-04-02T19:42:03.000Z',
    });
  });

  it('does not claim a durable active-root mutation when exact child cleanup leaves it untouched', async () => {
    reconcileActiveSavePersistenceMetadata(savedRecord(
      'save-slot-1',
      '2026-04-02T19:40:00.000Z',
    ));

    await expect(trackActiveSavePersistenceOperation(
      'save-slot-1',
      vi.fn().mockResolvedValue(null),
    )).resolves.toBeNull();

    expect(getActiveSavePersistenceStatus('save-slot-1')).toMatchObject({
      state: 'idle',
      desiredGeneration: 0,
      durableGeneration: 0,
      pendingWrites: 0,
      lastSavedAt: '2026-04-02T19:40:00.000Z',
    });
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 92 }),
    })).resolves.toMatchObject({ saved: true });
  });

  it('rolls back a rejected atomic metadata generation without phantom pending work', async () => {
    reconcileActiveSavePersistenceMetadata(savedRecord(
      'save-slot-1',
      '2026-04-02T19:40:00.000Z',
    ));

    await expect(trackActiveSavePersistenceOperation(
      'save-slot-1',
      vi.fn().mockRejectedValue(new Error('Branch transaction aborted.')),
    )).rejects.toThrow('Branch transaction aborted.');

    expect(getActiveSavePersistenceStatus('save-slot-1')).toMatchObject({
      state: 'idle',
      desiredGeneration: 0,
      durableGeneration: 0,
      pendingWrites: 0,
      canRetry: false,
      lastSavedAt: '2026-04-02T19:40:00.000Z',
    });
  });

  it('invalidates a metadata intent waiting on capture when load activates a newer record', async () => {
    let releaseExport: (snapshot: object) => void = () => {};
    const delayedCapture = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      gmName: 'Old Runtime GM',
      teamName: 'Tycoons',
      season: 2,
      exportSnapshot: () => new Promise<object>((resolve) => {
        releaseExport = resolve;
      }),
    });
    await Promise.resolve();

    const metadataOperation = vi.fn().mockResolvedValue(savedRecord('save-slot-2'));
    const metadataIntent = trackActiveSavePersistenceOperation('save-slot-2', metadataOperation);
    const metadataIntentAssertion = expect(metadataIntent).rejects.toThrow('not available for persistence');
    await Promise.resolve();

    await prepareActiveSavePersistenceForLoad('save-slot-2');
    activateActiveSavePersistenceMetadata(savedRecord(
      'save-slot-2',
      '2026-04-02T20:00:00.000Z',
    ));
    releaseExport({ schemaVersion: 34, season: 2, day: 50 });

    await expect(delayedCapture).resolves.toEqual({ saved: false, saveName: null });
    await metadataIntentAssertion;
    expect(metadataOperation).not.toHaveBeenCalled();
    expect(mockedSaveGameById).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({
      state: 'idle',
      pendingWrites: 0,
      lastSavedAt: '2026-04-02T20:00:00.000Z',
    });
  });

  it('replaces an inactive target behind an epoch boundary so its delayed export cannot overwrite it', async () => {
    let releaseExport: (snapshot: object) => void = () => {};
    const delayedCapture = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-4',
      activeSaveSlot: 4,
      gmName: 'Old Slot GM',
      teamName: 'Old Club',
      season: 8,
      exportSnapshot: () => new Promise<object>((resolve) => {
        releaseExport = resolve;
      }),
    });
    await Promise.resolve();

    const replacement = savedRecord('save-slot-4', '2026-04-02T21:00:00.000Z');
    const replaceRecord = vi.fn().mockResolvedValue(replacement);
    await expect(replaceInactiveSavePersistenceRecord(
      'save-slot-4',
      replaceRecord,
    )).resolves.toBe(replacement);
    expect(replaceRecord).toHaveBeenCalledTimes(1);

    releaseExport({ schemaVersion: 34, season: 8, day: 140 });
    await expect(delayedCapture).resolves.toEqual({ saved: false, saveName: null });
    expect(mockedSaveGameById).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus('save-slot-4')).toMatchObject({
      state: 'idle',
      pendingWrites: 0,
      lastSavedAt: '2026-04-02T21:00:00.000Z',
    });

    const staleExport = vi.fn();
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-4',
      activeSaveSlot: 4,
      gmName: 'Old Slot GM',
      teamName: 'Old Club',
      season: 8,
      exportSnapshot: staleExport,
    })).resolves.toEqual({ saved: false, saveName: null });
    expect(staleExport).not.toHaveBeenCalled();
  });

  it('restores one integrity record without tombstoning untouched child coordinators', async () => {
    const branch = savedRecord('branch-live', '2026-04-02T20:30:00.000Z');
    activateActiveSavePersistenceMetadata(branch);
    mockedListSaveTreeChildIds.mockResolvedValueOnce([branch.id]);
    const restoredRoot = savedRecord('save-slot-4', '2026-04-02T21:00:00.000Z');
    mockedRestoreSaveIntegrityBackup.mockResolvedValueOnce(restoredRoot);
    mockedLoadGameById.mockResolvedValueOnce({
      ...branch,
      slotNumber: null,
      parentSaveId: 'save-slot-4',
      isRootSave: false,
      branchMeta: null,
    } as SaveData);

    await expect(restoreInactiveSaveIntegrityBackup('save-slot-4')).resolves.toBe(restoredRoot);

    expect(mockedRestoreSaveIntegrityBackup).toHaveBeenCalledWith('save-slot-4');
    expect(getActiveSavePersistenceStatus('save-slot-4')).toMatchObject({
      state: 'idle',
      saveName: 'Durable Dynasty',
      lastSavedAt: '2026-04-02T21:00:00.000Z',
    });
    await expect(persistActiveSaveSnapshot({
      activeSaveId: branch.id,
      activeSaveSlot: null,
      gmName: 'Branch GM',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 92 }),
    })).resolves.toMatchObject({ saved: true });
    expect(mockedSaveGameById).toHaveBeenCalledWith(
      branch.id,
      expect.any(String),
      expect.objectContaining({ day: 92 }),
      expect.objectContaining({
        parentSaveId: 'save-slot-4',
        isRootSave: false,
      }),
    );
  });

  it('fails a tree replacement closed when child coordinator discovery rejects', async () => {
    reconcileActiveSavePersistenceMetadata(savedRecord(
      'save-slot-4',
      '2026-04-02T19:40:00.000Z',
    ));
    mockedListSaveTreeChildIds.mockRejectedValueOnce(new Error('Branch enumeration failed.'));
    const replaceRecord = vi.fn();

    await expect(replaceInactiveSavePersistenceRecord(
      'save-slot-4',
      replaceRecord,
    )).rejects.toThrow('Branch enumeration failed.');

    expect(replaceRecord).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus('save-slot-4')).toMatchObject({
      state: 'idle',
      pendingWrites: 0,
      lastSavedAt: '2026-04-02T19:40:00.000Z',
    });
    const resumedExport = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 90 });
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-4',
      activeSaveSlot: 4,
      gmName: 'Current GM',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: resumedExport,
    })).resolves.toMatchObject({ saved: true });
    expect(resumedExport).toHaveBeenCalledTimes(1);
  });

  it('retires a save before deletion so a delayed export cannot recreate it', async () => {
    let releaseExport: (snapshot: object) => void = () => {};
    const delayedCapture = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-3',
      activeSaveSlot: 3,
      gmName: 'Old Runtime GM',
      teamName: 'Tycoons',
      season: 3,
      exportSnapshot: () => new Promise<object>((resolve) => {
        releaseExport = resolve;
      }),
    });
    await Promise.resolve();

    await retireActiveSavePersistenceForDelete('save-slot-3');
    expect(mockedDeleteSaveById).toHaveBeenCalledWith('save-slot-3');

    releaseExport({ schemaVersion: 34, season: 3, day: 78 });
    await expect(delayedCapture).resolves.toEqual({ saved: false, saveName: null });
    expect(mockedSaveGameById).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus('save-slot-3')).toMatchObject({
      state: 'idle',
      desiredGeneration: 0,
      durableGeneration: 0,
      pendingWrites: 0,
      canRetry: false,
    });

    const tombstonedCapture = vi.fn();
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-3',
      activeSaveSlot: 3,
      gmName: 'Old Runtime GM',
      teamName: 'Tycoons',
      season: 3,
      exportSnapshot: tombstonedCapture,
    })).resolves.toEqual({ saved: false, saveName: null });
    expect(tombstonedCapture).not.toHaveBeenCalled();
  });

  it('classifies durable-write failures into distinct storage-family kinds', async () => {
    const cases: Array<{ error: Error; slot: number; saveId: string; kind: string }> = [
      { error: new DOMException('The quota has been exceeded.', 'QuotaExceededError'), slot: 11, saveId: 'save-slot-11', kind: 'quota' },
      { error: new DOMException('A mutation operation was attempted on a database that did not allow mutations.', 'TransactionInactiveError'), slot: 12, saveId: 'save-slot-12', kind: 'indexeddb' },
      { error: new DOMException('The operation is insecure in private browsing.', 'SecurityError'), slot: 13, saveId: 'save-slot-13', kind: 'unavailable' },
      { error: new Error('Persistent storage is unavailable right now.'), slot: 14, saveId: 'save-slot-14', kind: 'unavailable' },
      { error: new Error('Something else went wrong.'), slot: 15, saveId: 'save-slot-15', kind: 'storage' },
    ];

    for (const testCase of cases) {
      mockedSaveGameById.mockRejectedValueOnce(testCase.error);
      await expect(persistActiveSaveSnapshot({
        activeSaveId: testCase.saveId,
        activeSaveSlot: testCase.slot,
        gmName: 'Alex Rivera',
        teamName: 'Tycoons',
        season: 5,
        exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 5, day: 1 }),
      })).rejects.toBeTruthy();

      expect(getActiveSavePersistenceStatus(testCase.saveId)).toMatchObject({
        state: 'failed',
        canRetry: true,
        failureKind: testCase.kind,
      });
    }
  });

  it('classifies a snapshot export failure before any durable write', async () => {
    vi.useFakeTimers();
    const exportSnapshot = vi.fn().mockRejectedValue(new Error('Worker export failed.'));
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-21',
      activeSaveSlot: 21,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot,
    })).rejects.toThrow('Worker export failed.');

    expect(mockedSaveGameById).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus('save-slot-21')).toMatchObject({
      state: 'failed',
      failureKind: 'export',
      pendingWrites: 0,
      canRetry: false,
      recovery: null,
    });
    expect(createActiveSavePersistenceBackup('save-slot-21')).toBeNull();
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000);
    expect(mockedSaveGameById).not.toHaveBeenCalled();
  });

  it('does nothing when there is no active save', async () => {
    const exportSnapshot = vi.fn();
    const result = await persistActiveSaveSnapshot({
      activeSaveId: null,
      activeSaveSlot: null,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 1,
      exportSnapshot,
    });

    expect(result.saved).toBe(false);
    expect(exportSnapshot).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus(null)).toMatchObject({
      state: 'idle',
      canRetry: false,
      pendingWrites: 0,
    });
  });
});
