import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShowSaveRecoveryOptions } from '@/features/save-recovery';
import type { useWorker } from '@/shared/hooks/useWorker';
import {
  abortActiveSaveSessionTransition,
  activateActiveSavePersistenceMetadata,
  completeActiveSaveSessionTransition,
  markActiveSaveSessionTransitionOwnershipCommitted,
  prepareActiveSaveSessionTransition,
  replaceInactiveSavePersistenceRecord,
  restoreInactiveSaveIntegrityBackup,
  retireActiveSavePersistenceForDelete,
  retireSaveTreePersistenceForDelete,
  trackActiveSavePersistenceOperation,
} from '@/shared/lib/activeSavePersistence';
import {
  clearAllSaves,
  createBranchSave,
  deleteSave,
  deleteSaveByIdWithResult,
  importSnapshotFromJson,
  listBranches,
  listSaves,
  loadGameById,
  loadSaveSafely,
  resolveSaveSessionTarget,
  saveGame,
  type SaveData,
} from '@/shared/lib/saveSystem';
import {
  abortSaveSessionOwnership,
  beginSaveSessionOwnership,
  commitSaveSessionOwnership,
  saveSessionOwnershipFailureMessage,
  withAllTransientSaveSessionOwnership,
  withSaveSessionImportAuthorization,
  withTransientSaveSessionOwnership,
} from '@/shared/lib/saveSessionOwnership';
import {
  captureOutgoingSaveSessionSnapshot,
  recoverWorkerAfterCandidateImportFailure,
} from '@/shared/lib/saveSessionTransitionRecovery';
import { useSettingsSaveData } from './useSettingsSaveData';
import { resetSettingsOperationCoordinatorForTesting } from '../lib/settingsOperationCoordinator';

vi.mock('@/shared/lib/activeSavePersistence', () => ({
  abortActiveSaveSessionTransition: vi.fn(),
  activateActiveSavePersistenceMetadata: vi.fn(),
  completeActiveSaveSessionTransition: vi.fn(),
  markActiveSaveSessionTransitionOwnershipCommitted: vi.fn(),
  prepareActiveSaveSessionTransition: vi.fn(),
  replaceInactiveSavePersistenceRecord: vi.fn(),
  restoreInactiveSaveIntegrityBackup: vi.fn(),
  retireActiveSavePersistenceForDelete: vi.fn(),
  retireSaveTreePersistenceForDelete: vi.fn(),
  trackActiveSavePersistenceOperation: vi.fn(),
}));

vi.mock('@/shared/lib/saveSystem', () => ({
  SAVE_SLOTS: [1, 2, 3, 4, 5],
  clearAllSaves: vi.fn(),
  createBranchSave: vi.fn(),
  deleteSave: vi.fn(),
  deleteSaveByIdWithResult: vi.fn(),
  exportSnapshotToJson: vi.fn((name: string, snapshot: unknown) =>
    JSON.stringify({ kind: 'mbd-save-export', name, snapshot })),
  importSnapshotFromJson: vi.fn(),
  listBranches: vi.fn(),
  listSaves: vi.fn(),
  loadGameById: vi.fn(),
  loadSaveSafely: vi.fn(),
  resolveSaveSessionTarget: vi.fn(),
  saveGame: vi.fn(),
}));

vi.mock('@/shared/lib/saveSessionOwnership', () => ({
  SaveSessionOwnershipError: class SaveSessionOwnershipError extends Error {
    constructor(readonly kind: string, message: string, readonly rootSaveId: string | null) {
      super(message);
    }
  },
  abortSaveSessionOwnership: vi.fn(),
  beginSaveSessionOwnership: vi.fn(),
  commitSaveSessionOwnership: vi.fn(),
  isSaveSessionOwnershipError: (error: unknown) => Boolean(
    error && typeof error === 'object' && 'kind' in error,
  ),
  saveSessionOwnershipFailureMessage: vi.fn((_error, target: string, outcome: string) =>
    `${target}: ${outcome}`),
  withAllTransientSaveSessionOwnership: vi.fn((_rootSaveIds, operation: () => Promise<unknown>) => operation()),
  withSaveSessionImportAuthorization: vi.fn((_claim, operation: () => Promise<unknown>) => operation()),
  withTransientSaveSessionOwnership: vi.fn((_rootSaveId, operation: () => Promise<unknown>) => operation()),
}));

vi.mock('@/shared/lib/saveSessionTransitionRecovery', () => ({
  captureOutgoingSaveSessionSnapshot: vi.fn(),
  recoverWorkerAfterCandidateImportFailure: vi.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useSettingsSaveData>[0];
type HookResult = ReturnType<typeof useSettingsSaveData>;
type SettingsWorker = HookOptions['worker'];

const baseSave: SaveData = {
  id: 'save-slot-1',
  slotNumber: 1,
  name: 'Healthy Save',
  season: 4,
  day: 91,
  phase: 'regular',
  schemaVersion: 34,
  hasSnapshot: true,
  snapshot: null,
  legacyState: null,
  parentSaveId: null,
  isRootSave: true,
  branchMeta: null,
  createdAt: '2026-04-02T00:00:00.000Z',
  updatedAt: '2026-04-02T12:00:00.000Z',
};

const branchSave: SaveData = {
  ...baseSave,
  id: 'branch-1',
  slotNumber: null,
  name: 'Aggressive deadline push',
  parentSaveId: 'save-slot-1',
  isRootSave: false,
  branchMeta: {
    id: 'branch-1',
    saveId: 'branch-1',
    branchedAtSeason: 4,
    branchedAtDay: 91,
    description: 'Aggressive deadline push',
    createdAt: '2026-04-03T00:00:00.000Z',
  },
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useSettingsSaveData(options));
  return null;
}

describe('useSettingsSaveData', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;

  const mockedClearAllSaves = vi.mocked(clearAllSaves);
  const mockedCreateBranchSave = vi.mocked(createBranchSave);
  const mockedDeleteSave = vi.mocked(deleteSave);
  const mockedDeleteSaveByIdWithResult = vi.mocked(deleteSaveByIdWithResult);
  const mockedImportSnapshotFromJson = vi.mocked(importSnapshotFromJson);
  const mockedListBranches = vi.mocked(listBranches);
  const mockedListSaves = vi.mocked(listSaves);
  const mockedLoadSaveSafely = vi.mocked(loadSaveSafely);
  const mockedResolveSaveSessionTarget = vi.mocked(resolveSaveSessionTarget);
  const mockedActivateActiveSavePersistenceMetadata = vi.mocked(
    activateActiveSavePersistenceMetadata,
  );
  const mockedPrepareActiveSaveSessionTransition = vi.mocked(
    prepareActiveSaveSessionTransition,
  );
  const mockedRetireActiveSavePersistenceForDelete = vi.mocked(
    retireActiveSavePersistenceForDelete,
  );
  const mockedReplaceInactiveSavePersistenceRecord = vi.mocked(
    replaceInactiveSavePersistenceRecord,
  );
  const mockedRestoreInactiveSaveIntegrityBackup = vi.mocked(
    restoreInactiveSaveIntegrityBackup,
  );
  const mockedRetireSaveTreePersistenceForDelete = vi.mocked(
    retireSaveTreePersistenceForDelete,
  );
  const mockedTrackActiveSavePersistenceOperation = vi.mocked(
    trackActiveSavePersistenceOperation,
  );
  const mockedAbortActiveSaveSessionTransition = vi.mocked(abortActiveSaveSessionTransition);
  const mockedLoadGameById = vi.mocked(loadGameById);
  const mockedSaveGame = vi.mocked(saveGame);

  beforeEach(() => {
    resetSettingsOperationCoordinatorForTesting();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
    mockedListSaves.mockResolvedValue([baseSave]);
    mockedResolveSaveSessionTarget.mockImplementation(async (saveId) => ({
      saveId,
      rootSaveId: saveId.startsWith('branch-') ? 'save-slot-1' : saveId,
      slotNumber: Number(/^save-slot-(\d+)$/.exec(saveId)?.[1] ?? 1),
      name: saveId.startsWith('branch-') ? branchSave.name : baseSave.name,
    }));
    vi.mocked(beginSaveSessionOwnership).mockImplementation(async (rootSaveId) => ({
      rootSaveId,
      resourceName: `mbd-save-tree-v1:${rootSaveId}`,
      claimId: Symbol(rootSaveId),
    }));
    mockedPrepareActiveSaveSessionTransition.mockImplementation(async (targetSaveId) => ({
      transitionId: Symbol(targetSaveId),
      targetSaveId,
      outgoingSaveId: 'save-slot-1',
    }));
    vi.mocked(abortSaveSessionOwnership).mockResolvedValue(undefined);
    vi.mocked(commitSaveSessionOwnership).mockResolvedValue(undefined);
    vi.mocked(captureOutgoingSaveSessionSnapshot).mockResolvedValue({
      schemaVersion: 34,
      season: 4,
      day: 91,
    });
    vi.mocked(recoverWorkerAfterCandidateImportFailure).mockResolvedValue({
      kind: 'restored_outgoing',
    });
    mockedLoadGameById.mockResolvedValue(branchSave);
    mockedClearAllSaves.mockResolvedValue(undefined);
    mockedCreateBranchSave.mockResolvedValue({ branch: branchSave, parent: baseSave });
    mockedDeleteSave.mockResolvedValue(undefined);
    mockedDeleteSaveByIdWithResult.mockResolvedValue({
      outcome: 'deleted_branch',
      parent: baseSave,
    });
    mockedRestoreInactiveSaveIntegrityBackup.mockResolvedValue(baseSave);
    mockedListBranches.mockResolvedValue([branchSave]);
    mockedSaveGame.mockImplementation(async (slot, name) => ({
      ...baseSave,
      id: `save-slot-${slot}`,
      slotNumber: slot,
      name,
      createdAt: `2026-04-0${slot}T00:00:00.000Z`,
      updatedAt: `2026-04-0${slot}T12:00:00.000Z`,
    }));
    mockedRetireActiveSavePersistenceForDelete.mockImplementation(async (_saveId, deleteRecord) => (
      deleteRecord?.()
    ));
    mockedReplaceInactiveSavePersistenceRecord.mockImplementation(async (_saveId, replaceRecord) => replaceRecord());
    mockedRetireSaveTreePersistenceForDelete.mockImplementation(async (_saveId, deleteRecord) => deleteRecord());
    mockedTrackActiveSavePersistenceOperation.mockImplementation(async (_saveId, operation) => operation());
    mockedImportSnapshotFromJson.mockReturnValue({
      name: 'Imported Dynasty',
      snapshot: { schemaVersion: 34, season: 5, day: 12, phase: 'regular' },
    } as never);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    resetSettingsOperationCoordinatorForTesting();
    vi.clearAllMocks();
  });

  function makeWorker(overrides: Partial<SettingsWorker> = {}): SettingsWorker {
    return {
      isReady: true,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 91 }),
      importSnapshot: vi.fn().mockResolvedValue({
        success: true,
        season: 4,
        day: 91,
        phase: 'regular',
        playerCount: 960,
        userTeamId: 'nym',
        teamName: 'Tycoons',
        gmName: 'Kevin',
        difficulty: 'standard',
      }),
      ...overrides,
    } as unknown as SettingsWorker;
  }

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      day: 91,
      initializeGame: vi.fn(),
      setInitialized: vi.fn(),
      persistActiveSave: vi.fn().mockResolvedValue({
        saved: true,
        saveName: 'Healthy Save',
      }),
      recoveryShowFailure: vi.fn(),
      season: 4,
      worker: makeWorker(),
      ...overrides,
    };
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  async function waitForAssertion(assertion: () => void) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        assertion();
        return;
      } catch (error) {
        lastError = error;
      }
      await act(async () => {
        await Promise.resolve();
      });
    }
    throw lastError;
  }

  it('loads save and branch data, then continues a safe save through the worker import path', async () => {
    const worker = makeWorker();
    const initializeGame = vi.fn();
    const options = baseOptions({ initializeGame, worker });
    mockedLoadSaveSafely.mockResolvedValue({
      ok: true,
      snapshot: { schemaVersion: 34, season: 4, day: 91, phase: 'regular' },
      save: baseSave,
      rawJson: '{"id":"save-slot-1"}',
    } as never);

    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.saves).toEqual([baseSave]);
      expect(latestResult?.branches).toEqual([branchSave]);
    });

    let loadResult: boolean | void = undefined;
    await act(async () => {
      loadResult = await latestResult?.handleLoad(1);
    });

    expect(loadResult).toBe(true);
    expect(beginSaveSessionOwnership).toHaveBeenCalledWith('save-slot-1');
    expect(mockedPrepareActiveSaveSessionTransition).toHaveBeenCalledWith(
      'save-slot-1',
      expect.objectContaining({ persistOutgoingSnapshot: expect.any(Function) }),
    );
    expect(mockedLoadSaveSafely).toHaveBeenCalledWith(1);
    expect(mockedActivateActiveSavePersistenceMetadata).toHaveBeenCalledWith(baseSave);
    expect(completeActiveSaveSessionTransition).toHaveBeenCalled();
    expect(commitSaveSessionOwnership).toHaveBeenCalled();
    expect(markActiveSaveSessionTransitionOwnershipCommitted).toHaveBeenCalledTimes(1);
    expect(mockedPrepareActiveSaveSessionTransition.mock.invocationCallOrder[0]!).toBeLessThan(
      mockedLoadSaveSafely.mock.invocationCallOrder[0]!,
    );
    expect(mockedLoadSaveSafely.mock.invocationCallOrder[0]!).toBeLessThan(
      mockedActivateActiveSavePersistenceMetadata.mock.invocationCallOrder[0]!,
    );
    expect(worker.importSnapshot).toHaveBeenCalledWith({ schemaVersion: 34, season: 4, day: 91, phase: 'regular' });
    expect(initializeGame).toHaveBeenCalledWith({
      season: 4,
      day: 91,
      phase: 'regular',
      playerCount: 960,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Kevin',
      difficulty: 'standard',
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
    });
    expect(vi.mocked(commitSaveSessionOwnership).mock.invocationCallOrder[0]!).toBeLessThan(
      initializeGame.mock.invocationCallOrder[0]!,
    );
    expect(initializeGame.mock.invocationCallOrder[0]!).toBeLessThan(
      vi.mocked(completeActiveSaveSessionTransition).mock.invocationCallOrder[0]!,
    );
    expect(latestResult?.status).toBe('Loaded slot 1.');
  });

  it('serializes a delayed load against saving another slot before candidate activation', async () => {
    const candidateSave: SaveData = {
      ...baseSave,
      id: 'save-slot-2',
      slotNumber: 2,
      name: 'Candidate Save',
    };
    const worker = makeWorker();
    let releaseCommit!: () => void;
    vi.mocked(commitSaveSessionOwnership).mockImplementationOnce(() => (
      new Promise<void>((resolve) => {
        releaseCommit = resolve;
      })
    ));
    mockedLoadSaveSafely.mockResolvedValue({
      ok: true,
      snapshot: { schemaVersion: 34, season: 5, day: 12, phase: 'regular' },
      save: candidateSave,
      rawJson: '{"id":"save-slot-2"}',
    } as never);

    await renderHook(baseOptions({ worker }));

    let loadPromise!: Promise<boolean>;
    await act(async () => {
      loadPromise = latestResult!.handleLoad(2);
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitForAssertion(() => {
      expect(commitSaveSessionOwnership).toHaveBeenCalledTimes(1);
      expect(latestResult?.operationBusy).toBe(true);
    });
    const exportCountBeforeBlockedSave = vi.mocked(worker.exportSnapshot).mock.calls.length;

    await act(async () => {
      await latestResult?.handleSave(3);
    });

    expect(worker.exportSnapshot).toHaveBeenCalledTimes(exportCountBeforeBlockedSave);
    expect(mockedReplaceInactiveSavePersistenceRecord).not.toHaveBeenCalled();
    expect(mockedSaveGame).not.toHaveBeenCalledWith(
      3,
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(latestResult?.status).toBe(
      'Finish the current save operation before starting another one.',
    );

    await act(async () => {
      releaseCommit();
      await loadPromise;
    });
    expect(latestResult?.operationBusy).toBe(false);
  });

  it('exposes one shared Settings operation latch for a maintenance owner to consume', async () => {
    await renderHook(baseOptions());
    let owner: ReturnType<HookResult['beginSettingsOperation']> = null;
    await act(async () => {
      owner = latestResult?.beginSettingsOperation() ?? null;
    });
    expect(owner).not.toBeNull();
    expect(latestResult?.operationBusy).toBe(true);
    await act(async () => {
      expect(latestResult?.beginSettingsOperation()).toBeNull();
    });
    expect(latestResult?.status).toBe('Finish the current save operation before starting another one.');
    await act(async () => { latestResult?.finishSettingsOperation(owner!); });
    expect(latestResult?.operationBusy).toBe(false);
    expect(latestResult?.status).toBe('');
  });

  it('keeps the shared operation owned across a route-instance remount', async () => {
    let resolveFirstSave!: (value: { saved: boolean; saveName: string | null }) => void;
    const firstPersist = vi.fn().mockReturnValue(new Promise((resolve) => {
      resolveFirstSave = resolve;
    }));
    const firstOptions = baseOptions({ persistActiveSave: firstPersist });
    await renderHook(firstOptions);

    let firstOperation!: Promise<void>;
    await act(async () => {
      firstOperation = latestResult!.handleSave(1);
      await Promise.resolve();
    });
    expect(latestResult?.operationBusy).toBe(true);
    expect(firstPersist).toHaveBeenCalledTimes(1);

    const secondPersist = vi.fn().mockResolvedValue({ saved: true, saveName: 'Second' });
    const secondOptions = baseOptions({ persistActiveSave: secondPersist });
    await act(async () => {
      root.render(<HookHarness key="remounted" options={secondOptions} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    expect(latestResult?.operationBusy).toBe(true);
    await act(async () => { await latestResult?.handleSave(1); });
    expect(secondPersist).not.toHaveBeenCalled();
    expect(latestResult?.status).toBe('Finish the current save operation before starting another one.');

    await act(async () => {
      resolveFirstSave({ saved: true, saveName: 'First' });
      await firstOperation;
    });
    await waitForAssertion(() => expect(latestResult?.operationBusy).toBe(false));
    expect(firstPersist).toHaveBeenCalledTimes(1);
    expect(latestResult?.status).toBe('');
  });

  it('restores the outgoing worker when ownership commit fails after candidate import', async () => {
    const candidateSave: SaveData = {
      ...baseSave,
      id: 'save-slot-2',
      slotNumber: 2,
      name: 'Candidate Save',
    };
    const worker = makeWorker();
    const outgoingSnapshot = { schemaVersion: 34, season: 4, day: 91 };
    vi.mocked(captureOutgoingSaveSessionSnapshot).mockResolvedValueOnce(outgoingSnapshot);
    vi.mocked(commitSaveSessionOwnership).mockRejectedValueOnce(new Error('commit failed'));
    mockedLoadSaveSafely.mockResolvedValue({
      ok: true,
      snapshot: { schemaVersion: 34, season: 5, day: 12, phase: 'regular' },
      save: candidateSave,
      rawJson: '{"id":"save-slot-2"}',
    } as never);

    await renderHook(baseOptions({ worker }));
    await act(async () => {
      await expect(latestResult?.handleLoad(2)).resolves.toBe(false);
    });

    expect(recoverWorkerAfterCandidateImportFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        importSnapshot: worker.importSnapshot,
        outgoingSnapshot,
        restartWorker: worker.restartWorker,
      }),
    );
    expect(mockedActivateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(mockedAbortActiveSaveSessionTransition).toHaveBeenCalledTimes(1);
    expect(abortSaveSessionOwnership).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(recoverWorkerAfterCandidateImportFailure).mock.invocationCallOrder[0],
    ).toBeLessThan(mockedAbortActiveSaveSessionTransition.mock.invocationCallOrder[0]!);
  });

  it('fails closed when outgoing snapshot capture itself rejects', async () => {
    const worker = makeWorker();
    mockedLoadSaveSafely.mockResolvedValue({
      ok: true,
      snapshot: { schemaVersion: 34, season: 4, day: 91, phase: 'regular' },
      save: baseSave,
      rawJson: '{"id":"save-slot-1"}',
    } as never);
    vi.mocked(captureOutgoingSaveSessionSnapshot).mockRejectedValueOnce(
      new Error('fatal export restarted the worker'),
    );

    await renderHook(baseOptions({ worker }));
    await act(async () => {
      await expect(latestResult?.handleLoad(1)).resolves.toBe(false);
    });

    expect(worker.importSnapshot).not.toHaveBeenCalled();
    expect(recoverWorkerAfterCandidateImportFailure).toHaveBeenCalledWith(
      expect.objectContaining({ outgoingSnapshot: null }),
    );
    expect(mockedAbortActiveSaveSessionTransition).toHaveBeenCalledTimes(1);
  });

  it('releases the load barrier when worker import rejects a safe record', async () => {
    const initializeGame = vi.fn();
    const worker = makeWorker({
      importSnapshot: vi.fn().mockResolvedValue({
        success: false,
        error: 'Snapshot is incompatible.',
      }),
      restartWorker: vi.fn().mockResolvedValue(undefined),
    });
    mockedLoadSaveSafely.mockResolvedValue({
      ok: true,
      snapshot: { schemaVersion: 34, season: 4, day: 91, phase: 'regular' },
      save: baseSave,
      rawJson: '{"id":"save-slot-1"}',
    } as never);

    await renderHook(baseOptions({ initializeGame, worker }));

    let loadResult: boolean | void = undefined;
    await act(async () => {
      loadResult = await latestResult?.handleLoad(1);
    });

    expect(loadResult).toBe(false);
    expect(mockedPrepareActiveSaveSessionTransition).toHaveBeenCalledWith(
      'save-slot-1',
      expect.objectContaining({ persistOutgoingSnapshot: expect.any(Function) }),
    );
    expect(mockedAbortActiveSaveSessionTransition).toHaveBeenCalled();
    expect(abortSaveSessionOwnership).toHaveBeenCalled();
    expect(mockedActivateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(recoverWorkerAfterCandidateImportFailure).toHaveBeenCalledTimes(1);
    expect(initializeGame).not.toHaveBeenCalled();
    expect(latestResult?.status).toBe('Failed to load slot 1.');
  });

  it('hands failed safe loads to save recovery with retry and delete callbacks', async () => {
    const recoveryShowFailure = vi.fn();
    const failure = {
      ok: false,
      reason: 'migration_failed',
      detail: {
        slotId: 'save-slot-1',
        slotNumber: 1,
        message: 'Snapshot payload is invalid.',
        rawJson: '{"id":"save-slot-1"}',
        schemaVersion: 2,
      },
    } as const;
    mockedLoadSaveSafely.mockResolvedValue(failure as never);

    await renderHook(baseOptions({ recoveryShowFailure }));

    let loadResult: boolean | void = undefined;
    await act(async () => {
      loadResult = await latestResult?.handleLoad(1);
    });

    expect(loadResult).toBe(false);
    expect(mockedPrepareActiveSaveSessionTransition).toHaveBeenCalledWith(
      'save-slot-1',
      expect.objectContaining({ persistOutgoingSnapshot: expect.any(Function) }),
    );
    expect(mockedAbortActiveSaveSessionTransition).toHaveBeenCalled();
    expect(recoveryShowFailure).toHaveBeenCalledWith(expect.objectContaining({
      failure,
      onDelete: expect.any(Function),
      onRetry: expect.any(Function),
    }));

    const recoveryOptions = recoveryShowFailure.mock.calls[0]?.[0] as ShowSaveRecoveryOptions;
    await act(async () => {
      await recoveryOptions.onDelete?.();
    });
    expect(mockedDeleteSave).not.toHaveBeenCalled();
    expect(latestResult?.status).toBe('Cannot delete slot 1 while its dynasty is active.');

    mockedLoadSaveSafely.mockResolvedValueOnce({
      ok: false,
      reason: 'storage_failed',
      detail: {
        slotId: 'save-slot-1',
        slotNumber: 1,
        message: 'IndexedDB failed.',
        rawJson: null,
      },
    } as never);

    let retryResult: boolean | void = undefined;
    await act(async () => {
      retryResult = await recoveryOptions.onRetry?.();
    });
    expect(retryResult).toBe(false);
  });

  it('restores a verified integrity copy before retrying the ordinary settings load', async () => {
    const recoveryShowFailure = vi.fn();
    const failure = {
      ok: false,
      reason: 'integrity_failed',
      detail: {
        slotId: 'save-slot-1',
        slotNumber: 1,
        message: 'The stored checksum does not match.',
        rawJson: '{"id":"save-slot-1"}',
        integrityFailureKind: 'mismatch',
        repairAvailable: true,
        repairUpdatedAt: baseSave.updatedAt,
      },
    } as const;
    mockedLoadSaveSafely
      .mockResolvedValueOnce(failure as never)
      .mockResolvedValueOnce({
        ok: true,
        snapshot: { schemaVersion: 34, season: 4, day: 91, phase: 'regular' },
        save: baseSave,
        rawJson: '{"id":"save-slot-1"}',
      } as never);

    await renderHook(baseOptions({ recoveryShowFailure }));
    await act(async () => {
      await latestResult?.handleLoad(1);
    });

    const recoveryOptions = recoveryShowFailure.mock.calls[0]?.[0] as ShowSaveRecoveryOptions;
    expect(recoveryOptions.onRepair).toEqual(expect.any(Function));
    await act(async () => {
      await recoveryOptions.onRepair?.();
    });
    expect(mockedRestoreInactiveSaveIntegrityBackup).toHaveBeenCalledWith('save-slot-1');

    let retryResult: boolean | void = undefined;
    await act(async () => {
      retryResult = await recoveryOptions.onRetry?.();
    });
    expect(retryResult).toBe(true);
    expect(mockedLoadSaveSafely).toHaveBeenLastCalledWith(1);
    expect(mockedActivateActiveSavePersistenceMetadata).toHaveBeenCalledWith(baseSave);
  });

  it('uses kind-aware copy for load and destructive ownership failures', async () => {
    const loadError = { kind: 'unavailable', rootSaveId: 'save-slot-2' };
    vi.mocked(beginSaveSessionOwnership).mockRejectedValueOnce(loadError);
    await renderHook(baseOptions());

    await act(async () => {
      await latestResult?.handleLoad(2);
    });
    expect(saveSessionOwnershipFailureMessage).toHaveBeenCalledWith(
      loadError,
      'Slot 2',
      'Nothing was loaded.',
    );

    const deleteError = { kind: 'request_failed', rootSaveId: 'save-slot-2' };
    vi.mocked(withTransientSaveSessionOwnership).mockRejectedValueOnce(deleteError);
    await act(async () => {
      await latestResult?.handleDelete(2);
    });
    expect(saveSessionOwnershipFailureMessage).toHaveBeenCalledWith(
      deleteError,
      'Slot 2',
      'Nothing was deleted.',
    );
  });

  it('saves, imports, clears, creates branches, and deletes branches through existing IO helpers', async () => {
    const worker = makeWorker();
    mockedListBranches
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([branchSave])
      .mockResolvedValueOnce([]);

    await renderHook(baseOptions({ worker }));

    await waitForAssertion(() => {
      expect(latestResult?.branches).toEqual([]);
    });

    await act(async () => {
      await latestResult?.handleSave(2);
    });
    expect(worker.exportSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedSaveGame).toHaveBeenCalledWith(
      2,
      'Season 4 Day 91',
      { schemaVersion: 34, season: 4, day: 91 },
      { replaceExistingRootBranchMetadata: true },
    );
    expect(mockedReplaceInactiveSavePersistenceRecord).toHaveBeenCalledWith(
      'save-slot-2',
      expect.any(Function),
    );
    expect(withTransientSaveSessionOwnership).toHaveBeenCalledWith(
      'save-slot-2',
      expect.any(Function),
    );
    expect(mockedActivateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(latestResult?.status).toBe('Saved snapshot to slot 2.');

    await act(async () => {
      await latestResult?.handleImportFile(new File(['{}'], 'save.json', { type: 'application/json' }));
    });
    expect(mockedImportSnapshotFromJson).toHaveBeenCalledWith('{}');
    expect(mockedSaveGame).toHaveBeenCalledWith(
      2,
      'Imported Dynasty',
      { schemaVersion: 34, season: 5, day: 12, phase: 'regular' },
    );

    await act(async () => {
      latestResult?.setBranchDescription(' Aggressive deadline push ');
    });
    await act(async () => {
      await latestResult?.handleCreateBranch();
    });
    expect(worker.exportSnapshot).toHaveBeenCalledTimes(2);
    expect(mockedCreateBranchSave).toHaveBeenCalledWith(
      'save-slot-1',
      { schemaVersion: 34, season: 4, day: 91 },
      'Aggressive deadline push',
    );
    expect(mockedTrackActiveSavePersistenceOperation).toHaveBeenCalledWith(
      'save-slot-1',
      expect.any(Function),
    );
    expect(latestResult?.branchDescription).toBe('');
    expect(latestResult?.branches).toEqual([branchSave]);

    await act(async () => {
      await latestResult?.handleDeleteBranch('branch-1');
    });
    expect(mockedDeleteSaveByIdWithResult).toHaveBeenCalledWith('branch-1');
    expect(mockedTrackActiveSavePersistenceOperation).toHaveBeenCalledTimes(2);
    expect(latestResult?.branches).toEqual([]);
    expect(mockedLoadGameById).not.toHaveBeenCalled();
  });

  it('reports exact branch cleanup truthfully when a damaged parent is left untouched', async () => {
    mockedDeleteSaveByIdWithResult.mockResolvedValueOnce({
      outcome: 'deleted_exact_parent_untouched',
      parent: null,
    });
    mockedListBranches
      .mockResolvedValueOnce([branchSave])
      .mockResolvedValueOnce([]);
    await renderHook(baseOptions());

    await act(async () => {
      await latestResult?.handleDeleteBranch(branchSave.id);
    });

    expect(mockedDeleteSaveByIdWithResult).toHaveBeenCalledWith(branchSave.id);
    expect(latestResult?.status).toBe(
      'Deleted the branch record. Its root save was left unchanged because the branch history could not be updated safely; recover that root before continuing.',
    );
    expect(latestResult?.branches).toEqual([]);
  });

  it('routes the active root manual save through the coordinator and surfaces coordinator failure', async () => {
    const worker = makeWorker();
    const persistActiveSave = vi.fn()
      .mockResolvedValueOnce({ saved: true, saveName: 'Healthy Save' })
      .mockResolvedValueOnce({ saved: false, saveName: 'Healthy Save' });

    await renderHook(baseOptions({ persistActiveSave, worker }));

    await act(async () => {
      await latestResult?.handleSave(1);
    });

    expect(persistActiveSave).toHaveBeenCalledTimes(1);
    expect(worker.exportSnapshot).not.toHaveBeenCalled();
    expect(mockedSaveGame).not.toHaveBeenCalled();
    expect(mockedActivateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(latestResult?.status).toBe('Saved snapshot to slot 1.');

    await act(async () => {
      await latestResult?.handleSave(1);
    });

    expect(persistActiveSave).toHaveBeenCalledTimes(2);
    expect(worker.exportSnapshot).not.toHaveBeenCalled();
    expect(mockedSaveGame).not.toHaveBeenCalled();
    expect(latestResult?.status).toBe('Failed to save slot 1.');
  });

  it('blocks destructive actions that could remove the active record but preserves non-active deletion', async () => {
    const worker = makeWorker();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    await renderHook(baseOptions({
      activeSaveId: 'branch-1',
      activeSaveSlot: null,
      worker,
    }));

    await act(async () => {
      await latestResult?.handleDelete(1);
    });
    expect(mockedDeleteSave).not.toHaveBeenCalled();
    expect(mockedLoadGameById).toHaveBeenCalledWith('branch-1');
    expect(latestResult?.status).toBe('Cannot delete slot 1 because it owns the active what-if branch.');

    await act(async () => {
      await latestResult?.handleSave(1);
    });
    expect(mockedReplaceInactiveSavePersistenceRecord).not.toHaveBeenCalled();
    expect(worker.exportSnapshot).not.toHaveBeenCalled();
    expect(latestResult?.status).toBe('Cannot overwrite slot 1 while its what-if branch is active.');

    await act(async () => {
      await latestResult?.handleDeleteBranch('branch-1');
    });
    expect(mockedDeleteSaveByIdWithResult).not.toHaveBeenCalled();
    expect(latestResult?.status).toBe('Cannot delete the active what-if branch.');

    await act(async () => {
      await latestResult?.handleClearAllSaves();
    });
    expect(confirm).not.toHaveBeenCalled();
    expect(mockedClearAllSaves).not.toHaveBeenCalled();
    expect(latestResult?.status).toBe('Cannot clear local saves while a dynasty is active.');

    await act(async () => {
      await latestResult?.handleDelete(2);
    });
    expect(mockedDeleteSave).toHaveBeenCalledWith(2);
    expect(mockedRetireSaveTreePersistenceForDelete).toHaveBeenCalledWith(
      'save-slot-2',
      expect.any(Function),
    );
    expect(withTransientSaveSessionOwnership).toHaveBeenCalledWith(
      'save-slot-2',
      expect.any(Function),
    );
    expect(latestResult?.status).toBe('Deleted slot 2.');

    await renderHook(baseOptions({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      worker,
    }));
    await act(async () => {
      await latestResult?.handleDeleteBranch('branch-2');
    });
    expect(mockedDeleteSaveByIdWithResult).toHaveBeenCalledWith('branch-2');

    confirm.mockRestore();
  });

  it('allows clearing saves only when no dynasty is active', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    await renderHook(baseOptions({
      activeSaveId: null,
      activeSaveSlot: null,
    }));

    await act(async () => {
      await latestResult?.handleClearAllSaves();
    });

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(withAllTransientSaveSessionOwnership).toHaveBeenCalledWith(
      ['save-slot-1', 'save-slot-2', 'save-slot-3', 'save-slot-4', 'save-slot-5'],
      expect.any(Function),
    );
    expect(mockedClearAllSaves).toHaveBeenCalledTimes(1);
    expect(latestResult?.status).toBe('Cleared every local save slot.');
    confirm.mockRestore();
  });
});
