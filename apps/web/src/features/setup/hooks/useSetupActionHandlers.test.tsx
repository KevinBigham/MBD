import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteSave,
  deleteSaveById,
  loadSaveSafely,
  saveGame,
  type SaveData,
} from '@/shared/lib/saveSystem';
import { registerGuidedStartSave } from '@/features/onboarding/nudges';
import {
  activateActiveSavePersistenceMetadata,
  prepareActiveSavePersistenceForLoad,
  releaseActiveSavePersistenceLoad,
  replaceInactiveSavePersistenceRecord,
  restoreInactiveSaveIntegrityBackup,
  retireSaveTreePersistenceForDelete,
} from '@/shared/lib/activeSavePersistence';
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
  saveGame: vi.fn(),
}));

vi.mock('@/shared/lib/activeSavePersistence', () => ({
  activateActiveSavePersistenceMetadata: vi.fn(),
  prepareActiveSavePersistenceForLoad: vi.fn().mockResolvedValue(undefined),
  releaseActiveSavePersistenceLoad: vi.fn(),
  replaceInactiveSavePersistenceRecord: vi.fn(),
  restoreInactiveSaveIntegrityBackup: vi.fn(),
  retireSaveTreePersistenceForDelete: vi.fn(),
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
      recovery: { showFailure: vi.fn() },
      refreshSaves: vi.fn().mockResolvedValue(undefined),
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
    expect(prepareActiveSavePersistenceForLoad).toHaveBeenCalledWith('save-slot-1');
    expect(options.importSnapshot).toHaveBeenCalledWith({ schemaVersion: 34, season: 4, day: 88, phase: 'regular' });
    expect(activateActiveSavePersistenceMetadata).toHaveBeenCalledWith(saveData());
    expect(options.initializeGame).toHaveBeenCalledWith(expect.objectContaining({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      teamName: 'New York Tycoons',
    }));
    expect(options.navigate).toHaveBeenCalledWith('/dashboard');
    expect(latestResult?.busySlot).toBeNull();
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
    expect(releaseActiveSavePersistenceLoad).toHaveBeenCalledWith('save-slot-1');
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
    expect(registerGuidedStartSave).toHaveBeenCalledWith('save-slot-2');
    expect(options.initializeGame).toHaveBeenCalledWith(expect.objectContaining({
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      gmName: 'Alex Rivera',
    }));
    expect(options.navigate).toHaveBeenCalledWith('/onboarding');
  });
});
