import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

interface OwnershipMocks {
  assertActive: ReturnType<typeof vi.fn>;
  assertExport: ReturnType<typeof vi.fn>;
  assertImport: ReturnType<typeof vi.fn>;
  assertNewGame: ReturnType<typeof vi.fn>;
}

function installRuntimeMocks(
  workerApi: Record<string, ReturnType<typeof vi.fn>>,
  ownership: OwnershipMocks,
  toastError = vi.fn(),
) {
  vi.doMock('comlink', () => ({
    wrap: vi.fn(() => workerApi),
  }));
  vi.doMock('sonner', () => ({
    toast: { error: toastError },
  }));
  vi.doMock('@/shared/lib/saveSessionOwnership', () => ({
    assertActiveSaveSessionOwned: ownership.assertActive,
    assertSaveSessionSnapshotExportAuthorized: ownership.assertExport,
    assertSaveSessionImportAuthorized: ownership.assertImport,
    assertSaveSessionNewGameAuthorized: ownership.assertNewGame,
    SaveSessionOwnershipError: class SaveSessionOwnershipError extends Error {
      rootSaveId: string | null;

      constructor(
        readonly kind: string,
        message: string,
        rootSaveId: string | null,
      ) {
        super(message);
        this.rootSaveId = rootSaveId;
      }
    },
  }));

  class MockWorker {
    addEventListener = vi.fn();
    postMessage = vi.fn();
    start = vi.fn();
    terminate = vi.fn();
  }
  vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
  return toastError;
}

describe('useWorker save-session ownership', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    window.sessionStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  async function renderTrackedProbe<T>(): Promise<{ current: () => T }> {
    const { useWorker } = await import('./useWorker');
    let latest: T | null = null;
    function Probe() {
      latest = useWorker() as unknown as T;
      return null;
    }
    await act(async () => {
      root.render(<Probe />);
      await Promise.resolve();
      await Promise.resolve();
    });
    if (!latest) throw new Error('useWorker probe did not render');
    return {
      current: () => {
        if (!latest) throw new Error('useWorker probe is no longer rendered');
        return latest;
      },
    };
  }

  async function renderProbe<T>(): Promise<T> {
    return (await renderTrackedProbe<T>()).current();
  }

  it('rejects a gameplay mutation before Comlink without a false worker-failure toast', async () => {
    const ownershipError = new Error('This tab is not the editor.');
    const ownership: OwnershipMocks = {
      assertActive: vi.fn(() => { throw ownershipError; }),
      assertExport: vi.fn(() => 'ordinary'),
      assertImport: vi.fn(),
      assertNewGame: vi.fn(),
    };
    const workerApi = {
      ping: vi.fn().mockResolvedValue({ pong: true }),
      makeContractOffer: vi.fn().mockResolvedValue({ accepted: true }),
      getStandings: vi.fn().mockResolvedValue([{ teamId: 'nym' }]),
    };
    const toastError = installRuntimeMocks(workerApi, ownership);
    const worker = await renderProbe<{
      makeContractOffer: (id: string, years: number, salary: number) => Promise<unknown>;
      getStandings: () => Promise<unknown>;
    }>();

    await expect(worker.makeContractOffer('fa-1', 2, 10)).rejects.toBe(ownershipError);
    expect(workerApi.makeContractOffer).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();

    await expect(worker.getStandings()).resolves.toEqual([{ teamId: 'nym' }]);
    expect(workerApi.getStandings).toHaveBeenCalledTimes(1);
    expect(ownership.assertActive).toHaveBeenCalledTimes(1);
  });

  it('treats lazy free-agency market creation as a guarded worker mutation', async () => {
    const ownershipError = new Error('This tab is not the editor.');
    const ownership: OwnershipMocks = {
      assertActive: vi.fn(() => { throw ownershipError; }),
      assertExport: vi.fn(() => 'ordinary'),
      assertImport: vi.fn(),
      assertNewGame: vi.fn(),
    };
    const workerApi = {
      ping: vi.fn().mockResolvedValue({ pong: true }),
      getFreeAgents: vi.fn().mockResolvedValue([{ id: 'fa-1' }]),
    };
    const toastError = installRuntimeMocks(workerApi, ownership);
    const worker = await renderProbe<{
      getFreeAgents: () => Promise<unknown>;
    }>();

    await expect(worker.getFreeAgents()).rejects.toBe(ownershipError);
    expect(workerApi.getFreeAgents).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('requires the target root claim before newGame reaches the simulation worker', async () => {
    const ownership: OwnershipMocks = {
      assertActive: vi.fn(),
      assertExport: vi.fn(() => 'ordinary'),
      assertImport: vi.fn(),
      assertNewGame: vi.fn(),
    };
    const workerApi = {
      ping: vi.fn().mockResolvedValue({ pong: true }),
      newGame: vi.fn().mockResolvedValue({ season: 1 }),
    };
    installRuntimeMocks(workerApi, ownership);
    const worker = await renderProbe<{
      newGame: (options: { saveSlot: number; seed: number }) => Promise<unknown>;
    }>();

    await expect(worker.newGame({ saveSlot: 4, seed: 42 })).resolves.toEqual({ season: 1 });
    expect(ownership.assertNewGame).toHaveBeenCalledWith('save-slot-4');
    expect(ownership.assertActive).not.toHaveBeenCalled();
    expect(ownership.assertImport).not.toHaveBeenCalled();
    expect(workerApi.newGame).toHaveBeenCalledWith({ saveSlot: 4, seed: 42 });
  });

  it('requires an explicit candidate import authorization before worker snapshot import', async () => {
    const ownershipError = new Error('Import is not authorized.');
    const ownership: OwnershipMocks = {
      assertActive: vi.fn(),
      assertExport: vi.fn(() => 'ordinary'),
      assertImport: vi.fn(() => { throw ownershipError; }),
      assertNewGame: vi.fn(),
    };
    const workerApi = {
      ping: vi.fn().mockResolvedValue({ pong: true }),
      importSnapshot: vi.fn().mockResolvedValue({ success: true }),
    };
    installRuntimeMocks(workerApi, ownership);
    const worker = await renderProbe<{
      importSnapshot: (snapshot: object) => Promise<unknown>;
    }>();

    await expect(worker.importSnapshot({ schemaVersion: 34 })).rejects.toBe(ownershipError);
    expect(workerApi.importSnapshot).not.toHaveBeenCalled();
    expect(ownership.assertImport).toHaveBeenCalledTimes(1);
    expect(ownership.assertActive).not.toHaveBeenCalled();
  });

  it('binds ordinary mutation callbacks to the exact save active when the hook rendered', async () => {
    const staleSessionError = new Error('The originating save is no longer active.');
    let ownedSaveId = 'save-slot-1';
    const ownership: OwnershipMocks = {
      assertActive: vi.fn((expectedSaveId: string) => {
        if (expectedSaveId !== ownedSaveId) throw staleSessionError;
      }),
      assertExport: vi.fn(() => 'ordinary'),
      assertImport: vi.fn(),
      assertNewGame: vi.fn(),
    };
    const workerApi = {
      ping: vi.fn().mockResolvedValue({ pong: true }),
      makeContractOffer: vi.fn().mockResolvedValue({ accepted: true }),
    };
    const toastError = installRuntimeMocks(workerApi, ownership);
    const { useGameStore } = await import('./useGameStore');
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    const workerProbe = await renderTrackedProbe<{
      makeContractOffer: (id: string, years: number, salary: number) => Promise<unknown>;
    }>();
    const staleWorker = workerProbe.current();

    ownedSaveId = 'save-slot-2';
    await act(async () => {
      useGameStore.getState().setActiveSave('save-slot-2', 2);
      await Promise.resolve();
    });

    await expect(staleWorker.makeContractOffer('fa-1', 2, 10)).rejects.toBe(staleSessionError);
    expect(ownership.assertActive).toHaveBeenLastCalledWith('save-slot-1');
    expect(workerApi.makeContractOffer).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();

    const currentWorker = workerProbe.current();
    expect(currentWorker).not.toBe(staleWorker);
    await expect(currentWorker.makeContractOffer('fa-1', 2, 10)).resolves.toEqual({
      accepted: true,
    });
    expect(ownership.assertActive).toHaveBeenLastCalledWith('save-slot-2');
    expect(workerApi.makeContractOffer).toHaveBeenCalledTimes(1);
  });

  it('holds an exact-save mutation permit for the full ordinary snapshot export', async () => {
    const ownership: OwnershipMocks = {
      assertActive: vi.fn(),
      assertExport: vi.fn(() => 'ordinary'),
      assertImport: vi.fn(),
      assertNewGame: vi.fn(),
    };
    let resolveExport!: (snapshot: object) => void;
    const workerApi = {
      ping: vi.fn().mockResolvedValue({ pong: true }),
      exportSnapshot: vi.fn(() => new Promise<object>((resolve) => {
        resolveExport = resolve;
      })),
    };
    installRuntimeMocks(workerApi, ownership);
    const worker = await renderProbe<{
      exportSnapshot: () => Promise<object>;
    }>();
    const {
      pauseWorkerMutationsForSaveTransition,
      resumeWorkerMutationsAfterSaveTransition,
    } = await import('@/shared/lib/workerMutationSession');

    const exportPromise = worker.exportSnapshot();
    await Promise.resolve();
    expect(() => pauseWorkerMutationsForSaveTransition()).toThrowError(
      expect.objectContaining({ kind: 'request_failed' }),
    );

    resolveExport({ schemaVersion: 34 });
    await expect(exportPromise).resolves.toEqual({ schemaVersion: 34 });
    const pause = pauseWorkerMutationsForSaveTransition();
    resumeWorkerMutationsAfterSaveTransition(pause);
  });

  it('captures call-bound transition export authority before async admission without allowing piggyback', async () => {
    let transitionAuthorized = false;
    const ownership: OwnershipMocks = {
      assertActive: vi.fn(),
      assertExport: vi.fn(() => transitionAuthorized ? 'transition' : 'ordinary'),
      assertImport: vi.fn(),
      assertNewGame: vi.fn(),
    };
    const workerApi = {
      ping: vi.fn().mockResolvedValue({ pong: true }),
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34 }),
    };
    installRuntimeMocks(workerApi, ownership);
    const worker = await renderProbe<{
      exportSnapshot: () => Promise<object>;
    }>();
    const {
      pauseWorkerMutationsForSaveTransition,
      resumeWorkerMutationsAfterSaveTransition,
    } = await import('@/shared/lib/workerMutationSession');
    const pause = pauseWorkerMutationsForSaveTransition();

    transitionAuthorized = true;
    const authorizedExport = worker.exportSnapshot();
    transitionAuthorized = false;
    const ordinaryExport = worker.exportSnapshot();
    const ordinaryExportRejected = expect(ordinaryExport).rejects.toMatchObject({ kind: 'not_owner' });

    await expect(authorizedExport).resolves.toEqual({ schemaVersion: 34 });
    await ordinaryExportRejected;
    expect(workerApi.exportSnapshot).toHaveBeenCalledTimes(1);
    resumeWorkerMutationsAfterSaveTransition(pause);
  });

  it('captures call-bound active import authority before async admission without allowing piggyback', async () => {
    const unauthorized = new Error('Import is not authorized.');
    let importAuthorized = false;
    const ownership: OwnershipMocks = {
      assertActive: vi.fn(),
      assertExport: vi.fn(() => 'ordinary'),
      assertImport: vi.fn(() => {
        if (!importAuthorized) throw unauthorized;
      }),
      assertNewGame: vi.fn(),
    };
    const workerApi = {
      ping: vi.fn().mockResolvedValue({ pong: true }),
      importSnapshot: vi.fn().mockResolvedValue({ success: true }),
    };
    installRuntimeMocks(workerApi, ownership);
    const worker = await renderProbe<{
      importSnapshot: (snapshot: object) => Promise<object>;
    }>();
    const {
      pauseWorkerMutationsForSaveTransition,
      resumeWorkerMutationsAfterSaveTransition,
    } = await import('@/shared/lib/workerMutationSession');
    const pause = pauseWorkerMutationsForSaveTransition();

    importAuthorized = true;
    const authorizedImport = worker.importSnapshot({ schemaVersion: 34 });
    importAuthorized = false;
    const ordinaryImport = worker.importSnapshot({ schemaVersion: 34 });
    const ordinaryImportRejected = expect(ordinaryImport).rejects.toBe(unauthorized);

    await expect(authorizedImport).resolves.toEqual({ success: true });
    await ordinaryImportRejected;
    expect(workerApi.importSnapshot).toHaveBeenCalledTimes(1);
    resumeWorkerMutationsAfterSaveTransition(pause);
  });

  it('rejects gameplay before Comlink while a save-session transition is paused', async () => {
    const ownership: OwnershipMocks = {
      assertActive: vi.fn(),
      assertExport: vi.fn(() => 'ordinary'),
      assertImport: vi.fn(),
      assertNewGame: vi.fn(),
    };
    const workerApi = {
      ping: vi.fn().mockResolvedValue({ pong: true }),
      makeContractOffer: vi.fn().mockResolvedValue({ accepted: true }),
    };
    const toastError = installRuntimeMocks(workerApi, ownership);
    const worker = await renderProbe<{
      makeContractOffer: (id: string, years: number, salary: number) => Promise<unknown>;
    }>();
    const {
      pauseWorkerMutationsForSaveTransition,
      resumeWorkerMutationsAfterSaveTransition,
    } = await import('@/shared/lib/workerMutationSession');
    const pause = pauseWorkerMutationsForSaveTransition();

    await expect(worker.makeContractOffer('fa-1', 2, 10)).rejects.toMatchObject({
      kind: 'not_owner',
    });
    expect(workerApi.makeContractOffer).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
    resumeWorkerMutationsAfterSaveTransition(pause);
  });
});
