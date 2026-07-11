import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { AppBootGate } from './AppBootGate';
import { useWorker } from '@/shared/hooks/useWorker';
import { loadSaveSafely, type LoadSaveSafelyResult } from '@/shared/lib/saveSystem';
import { useGameStore } from '@/shared/hooks/useGameStore';
import {
  activateActiveSavePersistenceMetadata,
  prepareActiveSavePersistenceForLoad,
  releaseActiveSavePersistenceLoad,
  restoreInactiveSaveIntegrityBackup,
} from '@/shared/lib/activeSavePersistence';
import { toast } from 'sonner';

const recoveryMock = vi.hoisted(() => ({
  showFailure: vi.fn(),
}));

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/lib/saveSystem', () => ({
  loadSaveSafely: vi.fn(),
}));

vi.mock('@/shared/lib/activeSavePersistence', () => ({
  activateActiveSavePersistenceMetadata: vi.fn(),
  prepareActiveSavePersistenceForLoad: vi.fn().mockResolvedValue(undefined),
  releaseActiveSavePersistenceLoad: vi.fn(),
  restoreInactiveSaveIntegrityBackup: vi.fn(),
}));

vi.mock('@/features/save-recovery', () => ({
  useSaveRecovery: () => recoveryMock,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createStorageMock(): Storage {
  const storage = new Map<string, string>();

  return {
    get length() {
      return storage.size;
    },
    clear() {
      storage.clear();
    },
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
  };
}

const okLoadResult: Extract<LoadSaveSafelyResult, { ok: true }> = {
  ok: true,
  snapshot: {
    schemaVersion: 34,
    season: 4,
    day: 88,
    phase: 'regular',
  } as never,
  save: {
    id: 'save-slot-1',
    slotNumber: 1,
    name: 'Tycoons Year 4',
    season: 4,
    day: 88,
    phase: 'regular',
    schemaVersion: 34,
    hasSnapshot: true,
    snapshot: null,
    legacyState: null,
    createdAt: '2026-04-02T00:00:00.000Z',
    updatedAt: '2026-04-02T12:00:00.000Z',
    parentSaveId: null,
    isRootSave: true,
    branchMeta: null,
  },
  rawJson: '{"id":"save-slot-1"}',
};

function resetGameStore() {
  useGameStore.setState({
    season: 1,
    day: 1,
    phase: 'preseason',
    isSimulating: false,
    isInitialized: false,
    userTeamId: 'nym',
    teamName: 'Tycoons',
    gmName: 'General Manager',
    difficulty: 'standard',
    activeSaveId: null,
    activeSaveSlot: null,
    playerCount: 0,
    gamesPlayed: 0,
  });
}

async function flushAsync() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('AppBootGate', () => {
  let container: HTMLDivElement;
  let root: Root;
  let workerMock: {
    isReady: boolean;
    importSnapshot: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    window.history.replaceState(null, '', '/MBD/dashboard');
    const storage = createStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });
    window.localStorage.clear();
    resetGameStore();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    workerMock = {
      isReady: true,
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
    };
    vi.mocked(useWorker).mockReturnValue(workerMock as unknown as ReturnType<typeof useWorker>);
    recoveryMock.showFailure.mockReset();
    vi.mocked(toast.info).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    window.history.replaceState(null, '', '/MBD/dashboard');
    vi.clearAllMocks();
  });

  it('blocks the route with a resume skeleton, hydrates the worker, and then renders children', async () => {
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    let resolveLoad: (value: Extract<LoadSaveSafelyResult, { ok: true }>) => void = () => {};
    vi.mocked(loadSaveSafely).mockReturnValue(new Promise((resolve) => {
      resolveLoad = resolve;
    }));

    await act(async () => {
      root.render(
        <AppBootGate>
          <div>Dashboard Route</div>
        </AppBootGate>,
      );
      await flushAsync();
    });

    expect(container.textContent).toContain('Reopening the front office');
    expect(container.textContent).not.toContain('Dashboard Route');

    await act(async () => {
      resolveLoad(okLoadResult);
      await flushAsync();
    });

    expect(loadSaveSafely).toHaveBeenCalledWith('save-slot-1');
    expect(workerMock.importSnapshot).toHaveBeenCalledWith(okLoadResult.snapshot);
    expect(prepareActiveSavePersistenceForLoad).toHaveBeenCalledWith('save-slot-1');
    expect(activateActiveSavePersistenceMetadata).toHaveBeenCalledWith(okLoadResult.save);
    expect(releaseActiveSavePersistenceLoad).not.toHaveBeenCalled();
    expect(useGameStore.getState()).toMatchObject({
      isInitialized: true,
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      season: 4,
      day: 88,
      phase: 'regular',
      teamName: 'New York Tycoons',
    });
    expect(container.textContent).toContain('Dashboard Route');
  });

  it('clears a missing persisted save id and falls through to children without recovery', async () => {
    useGameStore.getState().setActiveSave('save-slot-404', null);
    vi.mocked(loadSaveSafely).mockResolvedValue({
      ok: false,
      reason: 'storage_failed',
      detail: {
        slotId: 'save-slot-404',
        slotNumber: null,
        message: 'No save record found.',
        rawJson: null,
      },
    });

    await act(async () => {
      root.render(
        <AppBootGate>
          <div>Save Hub Route</div>
        </AppBootGate>,
      );
      await flushAsync();
    });

    expect(loadSaveSafely).toHaveBeenCalledWith('save-slot-404');
    expect(useGameStore.getState().activeSaveId).toBeNull();
    expect(useGameStore.getState().activeSaveSlot).toBeNull();
    expect(recoveryMock.showFailure).not.toHaveBeenCalled();
    expect(activateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(releaseActiveSavePersistenceLoad).toHaveBeenCalledWith('save-slot-404');
    expect(toast.info).toHaveBeenCalled();
    expect(container.textContent).toContain('Save Hub Route');
  });

  it('hands corrupt persisted saves to Save Recovery and clears the stale active id', async () => {
    const failure: Extract<LoadSaveSafelyResult, { ok: false }> = {
      ok: false,
      reason: 'zod',
      detail: {
        slotId: 'save-slot-1',
        slotNumber: 1,
        message: 'Snapshot payload is invalid.',
        rawJson: '{"id":"save-slot-1"}',
      },
    };
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    vi.mocked(loadSaveSafely).mockResolvedValue(failure);

    await act(async () => {
      root.render(
        <AppBootGate>
          <div>Save Hub Route</div>
        </AppBootGate>,
      );
      await flushAsync();
    });

    expect(recoveryMock.showFailure).toHaveBeenCalledWith(expect.objectContaining({
      failure,
      onRetry: expect.any(Function),
    }));
    expect(activateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(releaseActiveSavePersistenceLoad).toHaveBeenCalledWith('save-slot-1');
    expect(useGameStore.getState().activeSaveId).toBeNull();
    expect(container.textContent).toContain('Save Hub Route');
  });

  it('restores an integrity failure through the persistence boundary before ordinary retry', async () => {
    const failure: Extract<LoadSaveSafelyResult, { ok: false }> = {
      ok: false,
      reason: 'integrity_failed',
      detail: {
        slotId: 'save-slot-1',
        slotNumber: 1,
        message: 'The primary checksum does not match.',
        rawJson: '{"id":"save-slot-1"}',
        integrityFailureKind: 'mismatch',
        repairAvailable: true,
        repairUpdatedAt: okLoadResult.save.updatedAt,
      },
    };
    window.history.replaceState(null, '', '/MBD/players/player-42');
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    vi.mocked(loadSaveSafely)
      .mockResolvedValueOnce(failure)
      .mockResolvedValueOnce(okLoadResult);
    vi.mocked(restoreInactiveSaveIntegrityBackup).mockResolvedValue(okLoadResult.save);

    await act(async () => {
      root.render(
        <AppBootGate>
          <div>Recovered Route</div>
        </AppBootGate>,
      );
      await flushAsync();
    });

    const actions = recoveryMock.showFailure.mock.calls[0]?.[0] as {
      onRepair: () => Promise<boolean>;
      onRetry: () => Promise<boolean>;
    };
    expect(actions.onRepair).toEqual(expect.any(Function));
    expect(actions.onRetry).toEqual(expect.any(Function));

    await expect(actions.onRepair()).resolves.toBe(true);
    expect(restoreInactiveSaveIntegrityBackup).toHaveBeenCalledWith('save-slot-1');

    // A failed protected-route boot redirects to the Save Hub while the
    // recovery dialog remains open. Successful retry must restore the route
    // the player was using before that redirect.
    window.history.replaceState(null, '', '/MBD/');

    await act(async () => {
      await expect(actions.onRetry()).resolves.toBe(true);
      await flushAsync();
    });
    expect(loadSaveSafely).toHaveBeenLastCalledWith('save-slot-1');
    expect(workerMock.importSnapshot).toHaveBeenCalledWith(okLoadResult.snapshot);
    expect(activateActiveSavePersistenceMetadata).toHaveBeenCalledWith(okLoadResult.save);
    expect(useGameStore.getState().activeSaveId).toBe('save-slot-1');
    expect(window.location.pathname).toBe('/MBD/players/player-42');
  });

  it('does not auto-load when there is no persisted active save id', async () => {
    await act(async () => {
      root.render(
        <AppBootGate>
          <div>Save Hub Route</div>
        </AppBootGate>,
      );
      await flushAsync();
    });

    expect(loadSaveSafely).not.toHaveBeenCalled();
    expect(workerMock.importSnapshot).not.toHaveBeenCalled();
    expect(prepareActiveSavePersistenceForLoad).not.toHaveBeenCalled();
    expect(activateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Save Hub Route');
  });
});
