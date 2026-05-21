import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { AppBootGate } from './AppBootGate';
import { useWorker } from '@/shared/hooks/useWorker';
import { loadSaveSafely, type LoadSaveSafelyResult } from '@/shared/lib/saveSystem';
import { useGameStore } from '@/shared/hooks/useGameStore';
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
    schemaVersion: 33,
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
    schemaVersion: 33,
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
    expect(useGameStore.getState().activeSaveId).toBeNull();
    expect(container.textContent).toContain('Save Hub Route');
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
    expect(container.textContent).toContain('Save Hub Route');
  });
});
