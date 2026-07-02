import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShowSaveRecoveryOptions } from '@/features/save-recovery';
import type { useWorker } from '@/shared/hooks/useWorker';
import {
  clearAllSaves,
  deleteSave,
  importSnapshotFromJson,
  listSaves,
  loadSaveSafely,
  saveGame,
  type SaveData,
} from '@/shared/lib/saveSystem';
import { useSettingsSaveData } from './useSettingsSaveData';

vi.mock('@/shared/lib/saveSystem', () => ({
  SAVE_SLOTS: [1, 2, 3, 4, 5],
  clearAllSaves: vi.fn(),
  deleteSave: vi.fn(),
  exportSnapshotToJson: vi.fn((name: string, snapshot: unknown) =>
    JSON.stringify({ kind: 'mbd-save-export', name, snapshot })),
  importSnapshotFromJson: vi.fn(),
  listSaves: vi.fn(),
  loadSaveSafely: vi.fn(),
  saveGame: vi.fn(),
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
  const mockedDeleteSave = vi.mocked(deleteSave);
  const mockedImportSnapshotFromJson = vi.mocked(importSnapshotFromJson);
  const mockedListSaves = vi.mocked(listSaves);
  const mockedLoadSaveSafely = vi.mocked(loadSaveSafely);
  const mockedSaveGame = vi.mocked(saveGame);

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
    mockedListSaves.mockResolvedValue([baseSave]);
    mockedClearAllSaves.mockResolvedValue(undefined);
    mockedDeleteSave.mockResolvedValue(undefined);
    mockedSaveGame.mockResolvedValue(undefined);
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
      getBranches: vi.fn().mockResolvedValue([branchSave]),
      createWhatIfBranch: vi.fn().mockResolvedValue(branchSave),
      deleteWhatIfBranch: vi.fn().mockResolvedValue({ success: true }),
      ...overrides,
    } as unknown as SettingsWorker;
  }

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      day: 91,
      initializeGame: vi.fn(),
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
    expect(mockedLoadSaveSafely).toHaveBeenCalledWith(1);
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
    expect(latestResult?.status).toBe('Loaded slot 1.');
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
    expect(recoveryShowFailure).toHaveBeenCalledWith(expect.objectContaining({
      failure,
      onDelete: expect.any(Function),
      onRetry: expect.any(Function),
    }));

    const recoveryOptions = recoveryShowFailure.mock.calls[0]?.[0] as ShowSaveRecoveryOptions;
    await act(async () => {
      await recoveryOptions.onDelete?.();
    });
    expect(mockedDeleteSave).toHaveBeenCalledWith(1);

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

  it('saves, imports, clears, creates branches, and deletes branches through existing IO helpers', async () => {
    const worker = makeWorker({
      getBranches: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([branchSave])
        .mockResolvedValueOnce([]),
    } as Partial<SettingsWorker>);

    await renderHook(baseOptions({ worker }));

    await waitForAssertion(() => {
      expect(latestResult?.branches).toEqual([]);
    });

    await act(async () => {
      await latestResult?.handleSave(2);
    });
    expect(worker.exportSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedSaveGame).toHaveBeenCalledWith(2, 'Season 4 Day 91', { schemaVersion: 34, season: 4, day: 91 });
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
    expect(worker.createWhatIfBranch).toHaveBeenCalledWith('save-slot-1', 'Aggressive deadline push');
    expect(latestResult?.branchDescription).toBe('');
    expect(latestResult?.branches).toEqual([branchSave]);

    await act(async () => {
      await latestResult?.handleDeleteBranch('branch-1');
    });
    expect(worker.deleteWhatIfBranch).toHaveBeenCalledWith('branch-1');
    expect(latestResult?.branches).toEqual([]);
  });
});
