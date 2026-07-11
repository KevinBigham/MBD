import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteSave,
  deleteSaveById,
  loadSaveSafely,
  resolveSaveSessionTarget,
  saveGame,
  type SaveData,
} from '@/shared/lib/saveSystem';
import { registerGuidedStartSave } from '@/features/onboarding/nudges';
import {
  activateActiveSavePersistenceMetadata,
  abortActiveSaveSessionTransition,
  completeActiveSaveSessionTransition,
  markActiveSaveSessionTransitionOwnershipCommitted,
  prepareActiveSaveSessionTransition,
  replaceInactiveSavePersistenceRecord,
  restoreInactiveSaveIntegrityBackup,
  retireSaveTreePersistenceForDelete,
} from '@/shared/lib/activeSavePersistence';
import {
  abortSaveSessionOwnership,
  beginSaveSessionOwnership,
  commitSaveSessionOwnership,
  saveSessionOwnershipFailureMessage,
  withSaveSessionImportAuthorization,
  withSaveSessionNewGameAuthorization,
  withSaveSessionCandidateSnapshotExportAuthorization,
  withTransientSaveSessionOwnership,
} from '@/shared/lib/saveSessionOwnership';
import {
  captureOutgoingSaveSessionSnapshot,
  recoverWorkerAfterCandidateImportFailure,
} from '@/shared/lib/saveSessionTransitionRecovery';
import { useSetupActionHandlers } from './useSetupActionHandlers';

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('@/features/onboarding/nudges', () => ({
  registerGuidedStartSave: vi.fn(),
}));

vi.mock('@/shared/lib/saveSystem', () => ({
  deleteSave: vi.fn(),
  deleteSaveById: vi.fn(),
  loadSaveSafely: vi.fn(),
  resolveSaveSessionTarget: vi.fn(),
  saveGame: vi.fn(),
}));

vi.mock('@/shared/lib/activeSavePersistence', () => ({
  abortActiveSaveSessionTransition: vi.fn(),
  activateActiveSavePersistenceMetadata: vi.fn(),
  completeActiveSaveSessionTransition: vi.fn(),
  markActiveSaveSessionTransitionOwnershipCommitted: vi.fn(),
  prepareActiveSaveSessionTransition: vi.fn(),
  replaceInactiveSavePersistenceRecord: vi.fn(),
  restoreInactiveSaveIntegrityBackup: vi.fn(),
  retireSaveTreePersistenceForDelete: vi.fn(),
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
  withSaveSessionImportAuthorization: vi.fn((_claim, operation: () => Promise<unknown>) => operation()),
  withSaveSessionNewGameAuthorization: vi.fn((_claim, operation: () => Promise<unknown>) => operation()),
  withSaveSessionCandidateSnapshotExportAuthorization: vi.fn((_claim, operation: () => Promise<unknown>) => operation()),
  withTransientSaveSessionOwnership: vi.fn((_rootSaveId, operation: () => Promise<unknown>) => operation()),
}));

vi.mock('@/shared/lib/saveSessionTransitionRecovery', () => ({
  captureOutgoingSaveSessionSnapshot: vi.fn(),
  recoverWorkerAfterCandidateImportFailure: vi.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useSetupActionHandlers>[0];
type HookResult = ReturnType<typeof useSetupActionHandlers>;

function saveData(overrides: Partial<SaveData> = {}): SaveData {
  return {
    id: 'save-slot-1',
    slotNumber: 1,
    name: 'Tycoons Year 4',
    season: 4,
    day: 88,
    phase: 'regular',
    schemaVersion: 34,
    hasSnapshot: true,
    snapshot: { schemaVersion: 34, season: 4, day: 88, phase: 'regular' } as SaveData['snapshot'],
    legacyState: null,
    createdAt: '2026-04-02T00:00:00.000Z',
    updatedAt: '2026-04-02T12:00:00.000Z',
    parentSaveId: null,
    isRootSave: true,
    branchMeta: null,
    ...overrides,
  };
}

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useSetupActionHandlers(options));
  return null;
}

describe('useSetupActionHandlers', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
    vi.mocked(replaceInactiveSavePersistenceRecord).mockImplementation(async (_saveId, replaceRecord) => replaceRecord());
    vi.mocked(retireSaveTreePersistenceForDelete).mockImplementation(async (_saveId, deleteRecord) => deleteRecord());
    vi.mocked(resolveSaveSessionTarget).mockImplementation(async (saveId) => ({
      saveId,
      rootSaveId: saveId.startsWith('branch-') ? 'save-slot-1' : saveId,
      slotNumber: Number(/^save-slot-(\d+)$/.exec(saveId)?.[1] ?? 1),
      name: saveId.startsWith('branch-') ? 'Aggressive deadline push' : 'Tycoons Year 4',
    }));
    vi.mocked(beginSaveSessionOwnership).mockImplementation(async (rootSaveId) => ({
      rootSaveId,
      resourceName: `mbd-save-tree-v1:${rootSaveId}`,
      claimId: Symbol(rootSaveId),
    }));
    vi.mocked(prepareActiveSaveSessionTransition).mockImplementation(async (targetSaveId) => ({
      transitionId: Symbol(targetSaveId),
      targetSaveId,
      outgoingSaveId: null,
    }));
    vi.mocked(abortSaveSessionOwnership).mockResolvedValue(undefined);
    vi.mocked(commitSaveSessionOwnership).mockResolvedValue(undefined);
    vi.mocked(captureOutgoingSaveSessionSnapshot).mockResolvedValue(null);
    vi.mocked(recoverWorkerAfterCandidateImportFailure).mockImplementation(async (options) => {
      await options.restartWorker();
      if (options.candidateCommitted) {
        options.setInitialized?.(false);
        return { kind: 'reload_required', error: new Error('reload required') };
      }
      return { kind: 'discarded_candidate' };
    });
    vi.mocked(loadSaveSafely).mockResolvedValue({
      ok: true,
      save: saveData(),
      snapshot: { schemaVersion: 34, season: 4, day: 88, phase: 'regular' },
      rawJson: '{"id":"save-slot-1"}',
    } as never);
    vi.mocked(deleteSaveById).mockResolvedValue(null);
    vi.mocked(restoreInactiveSaveIntegrityBackup).mockResolvedValue(saveData());
    vi.mocked(saveGame).mockResolvedValue(saveData({
      id: 'save-slot-2',
      slotNumber: 2,
      name: 'Alex Rivera • New York Tycoons',
      season: 1,
      day: 1,
      phase: 'preseason',
      createdAt: '2026-04-02T13:00:00.000Z',
      updatedAt: '2026-04-02T13:00:00.000Z',
    }));
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      activeSaveId: null,
      activeSaveSlot: null,
      dayOneExperience: 'full',
      difficulty: 'hard',
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34 }),
      gmName: 'Alex Rivera',
      importSnapshot: vi.fn().mockResolvedValue({
        success: true,
        season: 4,
        day: 88,
        phase: 'regular',
        playerCount: 780,
        userTeamId: 'nym',
        teamName: 'New York Tycoons',
        gmName: 'General Manager',
        difficulty: 'standard',
      }),
      initializeGame: vi.fn(),
      setInitialized: vi.fn(),
      navigate: vi.fn(),
      newGame: vi.fn().mockResolvedValue({
        success: true,
        season: 1,
        day: 1,
        phase: 'preseason',
        playerCount: 780,
        userTeamId: 'nym',
        teamName: 'New York Tycoons',
        gmName: 'Alex Rivera',
        difficulty: 'hard',
      }),
      playMode: 'standard',
      persistActiveSave: vi.fn().mockResolvedValue({
        saved: true,
        saveName: 'Outgoing Save',
      }),
      recovery: { showFailure: vi.fn() },
      refreshSaves: vi.fn().mockResolvedValue(undefined),
      restartWorker: vi.fn().mockResolvedValue(undefined),
      seed: 42,
      selectedScenario: null,
      selectedScenarioId: null,
      selectedSlot: 2,
      setStatus: vi.fn(),
      teamId: 'nym',
      wizardMode: 'dynasty',
      workerIsReady: true,
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

  it('continues root saves through safe loading and initializes the imported snapshot', async () => {
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleContinueSave(saveData());
    });

    expect(loadSaveSafely).toHaveBeenCalledWith('save-slot-1');
    expect(beginSaveSessionOwnership).toHaveBeenCalledWith('save-slot-1');
    expect(prepareActiveSaveSessionTransition).toHaveBeenCalledWith(
      'save-slot-1',
      expect.objectContaining({ persistOutgoingSnapshot: expect.any(Function) }),
    );
    expect(options.importSnapshot).toHaveBeenCalledWith({ schemaVersion: 34, season: 4, day: 88, phase: 'regular' });
    expect(withSaveSessionImportAuthorization).toHaveBeenCalled();
    expect(activateActiveSavePersistenceMetadata).toHaveBeenCalledWith(saveData());
    expect(completeActiveSaveSessionTransition).toHaveBeenCalled();
    expect(commitSaveSessionOwnership).toHaveBeenCalledWith(
      expect.objectContaining({ rootSaveId: 'save-slot-1' }),
      'save-slot-1',
    );
    expect(markActiveSaveSessionTransitionOwnershipCommitted).toHaveBeenCalledTimes(1);
    expect(options.initializeGame).toHaveBeenCalledWith(expect.objectContaining({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      teamName: 'New York Tycoons',
    }));
    expect(options.navigate).toHaveBeenCalledWith('/dashboard');
    expect(vi.mocked(commitSaveSessionOwnership).mock.invocationCallOrder[0]!).toBeLessThan(
      vi.mocked(options.initializeGame).mock.invocationCallOrder[0]!,
    );
    expect(vi.mocked(options.initializeGame).mock.invocationCallOrder[0]!).toBeLessThan(
      vi.mocked(completeActiveSaveSessionTransition).mock.invocationCallOrder[0]!,
    );
    expect(latestResult?.busySlot).toBeNull();
  });

  it('restores the outgoing worker before aborting a post-import commit failure', async () => {
    const candidate = saveData({
      id: 'save-slot-2',
      slotNumber: 2,
      name: 'Candidate Save',
    });
    const outgoingSnapshot = { schemaVersion: 34, season: 4, day: 88 };
    vi.mocked(prepareActiveSaveSessionTransition).mockResolvedValueOnce({
      transitionId: Symbol('switch-to-b'),
      targetSaveId: 'save-slot-2',
      outgoingSaveId: 'save-slot-1',
    });
    vi.mocked(captureOutgoingSaveSessionSnapshot).mockResolvedValueOnce(outgoingSnapshot);
    vi.mocked(loadSaveSafely).mockResolvedValueOnce({
      ok: true,
      save: candidate,
      snapshot: candidate.snapshot!,
      rawJson: '{"id":"save-slot-2"}',
    });
    vi.mocked(commitSaveSessionOwnership).mockRejectedValueOnce(new Error('commit failed'));
    const options = baseOptions({ activeSaveId: 'save-slot-1', activeSaveSlot: 1 });
    await renderHook(options);

    await act(async () => {
      await expect(latestResult?.handleContinueSave(candidate)).resolves.toBe(false);
    });

    expect(recoverWorkerAfterCandidateImportFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        importSnapshot: options.importSnapshot,
        outgoingSnapshot,
        restartWorker: options.restartWorker,
      }),
    );
    expect(activateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(abortActiveSaveSessionTransition).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(recoverWorkerAfterCandidateImportFailure).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(abortActiveSaveSessionTransition).mock.invocationCallOrder[0]!);
  });

  it('hands corrupt root saves to recovery callbacks that retry and delete the same slot', async () => {
    const failure = {
      ok: false,
      reason: 'zod',
      detail: {
        slotId: 'save-slot-1',
        slotNumber: 1,
        message: 'Snapshot payload is invalid.',
        rawJson: '{"id":"save-slot-1"}',
      },
    } as const;
    vi.mocked(loadSaveSafely).mockResolvedValueOnce(failure as never);
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleContinueSave(saveData());
    });

    expect(options.recovery.showFailure).toHaveBeenCalledWith(expect.objectContaining({
      failure,
      onDelete: expect.any(Function),
      onRetry: expect.any(Function),
    }));
    expect(activateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(abortActiveSaveSessionTransition).toHaveBeenCalled();
    expect(abortSaveSessionOwnership).toHaveBeenCalled();
    const recoveryOptions = vi.mocked(options.recovery.showFailure).mock.calls[0]?.[0] as {
      onDelete: () => Promise<void>;
      onRetry: () => Promise<boolean>;
    };

    await act(async () => {
      await recoveryOptions.onDelete();
    });
    expect(retireSaveTreePersistenceForDelete).toHaveBeenCalledWith(
      'save-slot-1',
      expect.any(Function),
    );
    expect(deleteSaveById).toHaveBeenCalledWith('save-slot-1');
    expect(deleteSave).not.toHaveBeenCalled();

    vi.mocked(loadSaveSafely).mockResolvedValueOnce(failure as never);
    let retryResult = true;
    await act(async () => {
      retryResult = await recoveryOptions.onRetry();
    });
    expect(retryResult).toBe(false);
  });

  it('continues branch saves through the same verified safe-load path', async () => {
    const options = baseOptions();
    await renderHook(options);
    const branch = saveData({
      id: 'branch-1',
      slotNumber: null,
      name: 'Aggressive deadline push',
      isRootSave: false,
      parentSaveId: 'save-slot-1',
    });
    vi.mocked(loadSaveSafely).mockResolvedValueOnce({
      ok: true,
      save: branch,
      snapshot: branch.snapshot!,
      rawJson: '{"id":"branch-1"}',
    });

    await act(async () => {
      await latestResult?.handleContinueSave(branch);
    });

    expect(loadSaveSafely).toHaveBeenCalledWith('branch-1');
    expect(beginSaveSessionOwnership).toHaveBeenCalledWith('save-slot-1');
    expect(activateActiveSavePersistenceMetadata).toHaveBeenCalledWith(expect.objectContaining({
      id: 'branch-1',
      slotNumber: null,
      isRootSave: false,
      parentSaveId: 'save-slot-1',
    }));
    expect(options.initializeGame).toHaveBeenCalledWith(expect.objectContaining({
      activeSaveId: 'branch-1',
      activeSaveSlot: null,
    }));
    expect(options.navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('blocks root deletion while a branch activation is still loading', async () => {
    const options = baseOptions();
    await renderHook(options);
    const branch = saveData({
      id: 'branch-1',
      slotNumber: null,
      name: 'Aggressive deadline push',
      isRootSave: false,
      parentSaveId: 'save-slot-1',
    });
    let finishLoad!: (result: Awaited<ReturnType<typeof loadSaveSafely>>) => void;
    vi.mocked(loadSaveSafely).mockReturnValueOnce(new Promise((resolve) => {
      finishLoad = resolve;
    }));

    let loadAttempt!: Promise<boolean>;
    await act(async () => {
      loadAttempt = latestResult!.handleContinueSave(branch);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latestResult?.busySlot).toBe(0);

    await act(async () => {
      await expect(latestResult!.handleDelete(1)).resolves.toBe(false);
    });
    expect(withTransientSaveSessionOwnership).not.toHaveBeenCalled();
    expect(deleteSave).not.toHaveBeenCalled();
    expect(options.setStatus).toHaveBeenCalledWith(
      'Finish the current save operation before deleting a dynasty.',
    );

    finishLoad({
      ok: true,
      save: branch,
      snapshot: branch.snapshot!,
      rawJson: '{"id":"branch-1"}',
    });
    await act(async () => {
      await expect(loadAttempt).resolves.toBe(true);
    });
  });

  it('routes a damaged branch through verified restore and the ordinary safe-load retry', async () => {
    const branch = saveData({
      id: 'branch-1',
      slotNumber: null,
      name: 'Aggressive deadline push',
      isRootSave: false,
      parentSaveId: 'save-slot-1',
    });
    const failure = {
      ok: false,
      reason: 'integrity_failed',
      detail: {
        slotId: branch.id,
        slotNumber: null,
        message: 'The branch checksum does not match.',
        rawJson: '{"id":"branch-1"}',
        integrityFailureKind: 'mismatch',
        repairAvailable: true,
        repairUpdatedAt: branch.updatedAt,
      },
    } as const;
    vi.mocked(loadSaveSafely).mockResolvedValueOnce(failure as never);
    vi.mocked(restoreInactiveSaveIntegrityBackup).mockResolvedValue(branch);
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleContinueSave(branch);
    });

    const recoveryOptions = vi.mocked(options.recovery.showFailure).mock.calls[0]?.[0] as {
      onRepair: () => Promise<boolean>;
      onRetry: () => Promise<boolean>;
    };
    expect(recoveryOptions.onRepair).toEqual(expect.any(Function));
    await expect(recoveryOptions.onRepair()).resolves.toBe(true);
    expect(restoreInactiveSaveIntegrityBackup).toHaveBeenCalledWith('branch-1');

    vi.mocked(loadSaveSafely).mockResolvedValueOnce({
      ok: true,
      save: branch,
      snapshot: branch.snapshot!,
      rawJson: '{"id":"branch-1"}',
    });
    await act(async () => {
      await expect(recoveryOptions.onRetry()).resolves.toBe(true);
    });
    expect(loadSaveSafely).toHaveBeenLastCalledWith('branch-1');
    expect(activateActiveSavePersistenceMetadata).toHaveBeenCalledWith(branch);
  });

  it('does not delete the active root save or an unknown active branch parent', async () => {
    const rootOptions = baseOptions({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
    });
    await renderHook(rootOptions);

    await act(async () => {
      await latestResult?.handleDelete(1);
    });

    expect(deleteSave).not.toHaveBeenCalled();
    expect(rootOptions.setStatus).toHaveBeenCalledWith(
      'Cannot delete slot 1 while its dynasty or a what-if branch is active.',
    );

    const branchOptions = baseOptions({
      activeSaveId: 'branch-1',
      activeSaveSlot: null,
    });
    await act(async () => {
      root.render(<HookHarness options={branchOptions} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    await act(async () => {
      await latestResult?.handleDelete(2);
    });

    expect(deleteSave).not.toHaveBeenCalled();
    expect(branchOptions.setStatus).toHaveBeenCalledWith(
      'Cannot delete slot 2 while its dynasty or a what-if branch is active.',
    );
  });

  it('creates a new dynasty, saves the exported snapshot, registers guided start, and routes by mode', async () => {
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleBeginDynasty();
    });

    expect(options.newGame).toHaveBeenCalledWith(expect.objectContaining({
      seed: 42,
      userTeamId: 'nym',
      gmName: 'Alex Rivera',
      difficulty: 'hard',
      saveSlot: 2,
      playMode: 'standard',
      dayOneExperience: 'full',
    }));
    expect(withSaveSessionNewGameAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ rootSaveId: 'save-slot-2' }),
      expect.any(Function),
    );
    expect(withSaveSessionCandidateSnapshotExportAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ rootSaveId: 'save-slot-2' }),
      options.exportSnapshot,
    );
    expect(saveGame).toHaveBeenCalledWith(
      2,
      expect.stringContaining('Alex Rivera'),
      { schemaVersion: 34 },
      { replaceExistingRootBranchMetadata: true },
    );
    expect(replaceInactiveSavePersistenceRecord).toHaveBeenCalledWith(
      'save-slot-2',
      expect.any(Function),
    );
    expect(activateActiveSavePersistenceMetadata).toHaveBeenCalledWith(expect.objectContaining({
      id: 'save-slot-2',
      slotNumber: 2,
      name: 'Alex Rivera • New York Tycoons',
      updatedAt: '2026-04-02T13:00:00.000Z',
    }));
    expect(beginSaveSessionOwnership).toHaveBeenCalledWith('save-slot-2');
    expect(prepareActiveSaveSessionTransition).toHaveBeenCalledWith(
      'save-slot-2',
      expect.objectContaining({ persistOutgoingSnapshot: expect.any(Function) }),
    );
    expect(commitSaveSessionOwnership).toHaveBeenCalledWith(
      expect.objectContaining({ rootSaveId: 'save-slot-2' }),
      'save-slot-2',
    );
    expect(registerGuidedStartSave).toHaveBeenCalledWith('save-slot-2');
    expect(options.initializeGame).toHaveBeenCalledWith(expect.objectContaining({
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      gmName: 'Alex Rivera',
    }));
    expect(options.navigate).toHaveBeenCalledWith('/onboarding');
  });

  it.each(['export', 'save', 'commit'] as const)(
    'discards the new worker before releasing ownership when %s fails',
    async (failurePoint) => {
      const options = baseOptions();
      if (failurePoint === 'export') {
        vi.mocked(options.exportSnapshot).mockRejectedValueOnce(new Error('export failed'));
      } else if (failurePoint === 'save') {
        vi.mocked(saveGame).mockRejectedValueOnce(new Error('save failed'));
      } else {
        vi.mocked(commitSaveSessionOwnership).mockRejectedValueOnce(new Error('commit failed'));
      }
      await renderHook(options);

      await act(async () => {
        await latestResult?.handleBeginDynasty();
      });

      expect(options.newGame).toHaveBeenCalledTimes(1);
      expect(options.restartWorker).toHaveBeenCalledTimes(1);
      expect(abortActiveSaveSessionTransition).toHaveBeenCalledTimes(1);
      expect(abortSaveSessionOwnership).toHaveBeenCalledTimes(1);
      expect(
        vi.mocked(options.restartWorker).mock.invocationCallOrder[0],
      ).toBeLessThan(vi.mocked(abortActiveSaveSessionTransition).mock.invocationCallOrder[0]!);
      expect(options.initializeGame).not.toHaveBeenCalled();
      expect(options.navigate).not.toHaveBeenCalled();
      expect(completeActiveSaveSessionTransition).not.toHaveBeenCalled();
      expect(latestResult?.busySlot).toBeNull();
      if (failurePoint === 'export') {
        expect(saveGame).not.toHaveBeenCalled();
      }
    },
  );

  it.each(['initialize', 'complete'] as const)(
    'releases a committed new-dynasty worker session when %s fails',
    async (failurePoint) => {
      const options = baseOptions();
      if (failurePoint === 'initialize') {
        vi.mocked(options.initializeGame).mockImplementationOnce(() => {
          throw new Error('store persistence failed');
        });
      } else {
        vi.mocked(completeActiveSaveSessionTransition).mockImplementationOnce(() => {
          throw new Error('transition completion failed');
        });
      }
      await renderHook(options);

      await act(async () => {
        await latestResult?.handleBeginDynasty();
      });

      expect(markActiveSaveSessionTransitionOwnershipCommitted).toHaveBeenCalledTimes(1);
      expect(recoverWorkerAfterCandidateImportFailure).toHaveBeenCalledWith(
        expect.objectContaining({ candidateCommitted: true }),
      );
      expect(options.restartWorker).toHaveBeenCalledTimes(1);
      expect(options.setInitialized).toHaveBeenCalledWith(false);
      expect(abortActiveSaveSessionTransition).toHaveBeenCalledTimes(1);
      expect(abortSaveSessionOwnership).not.toHaveBeenCalled();
    },
  );

  it('acquires an inactive delete target before entering its persistence barrier', async () => {
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleDelete(3);
    });

    expect(withTransientSaveSessionOwnership).toHaveBeenCalledWith(
      'save-slot-3',
      expect.any(Function),
    );
    expect(retireSaveTreePersistenceForDelete).toHaveBeenCalledWith(
      'save-slot-3',
      expect.any(Function),
    );
  });

  it('does not replace the worker with a new dynasty while another save is active', async () => {
    const options = baseOptions({ activeSaveId: 'save-slot-1', activeSaveSlot: 1 });
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleBeginDynasty();
    });

    expect(beginSaveSessionOwnership).not.toHaveBeenCalled();
    expect(options.newGame).not.toHaveBeenCalled();
    expect(options.setStatus).toHaveBeenCalledWith(
      'Finish or reload the active dynasty before starting a new one.',
    );
  });

  it.each(['unavailable', 'request_failed', 'unknown_tree'] as const)(
    'routes %s new-game ownership failures through kind-aware copy',
    async (kind) => {
      const error = { kind, rootSaveId: 'save-slot-2' };
      vi.mocked(beginSaveSessionOwnership).mockRejectedValueOnce(error);
      const options = baseOptions();
      await renderHook(options);

      await act(async () => {
        await latestResult?.handleBeginDynasty();
      });

      expect(saveSessionOwnershipFailureMessage).toHaveBeenCalledWith(
        error,
        'Slot 2',
        'The new dynasty was not started.',
      );
      expect(options.newGame).not.toHaveBeenCalled();
    },
  );
});
