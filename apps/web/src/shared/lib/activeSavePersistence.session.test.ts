// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activateActiveSavePersistenceMetadata,
  getActiveSavePersistenceStatus,
  persistActiveSaveSnapshot,
  resetActiveSavePersistenceForTesting,
  retryActiveSavePersistence,
} from './activeSavePersistence';
import { saveGameById, type SaveData } from './saveSystem';
import {
  beginSaveSessionOwnership,
  commitSaveSessionOwnership,
  enableSaveSessionOwnershipEnforcement,
  releaseActiveSaveSessionOwnership,
  resetSaveSessionOwnershipForTesting,
  type WebLockManagerLike,
} from './saveSessionOwnership';

vi.mock('./saveSystem', async (importOriginal) => ({
  ...await importOriginal<typeof import('./saveSystem')>(),
  deleteSaveById: vi.fn(),
  listSaveTreeChildIds: vi.fn().mockResolvedValue([]),
  loadGameById: vi.fn(),
  restoreSaveIntegrityBackup: vi.fn(),
  saveGameById: vi.fn(),
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

describe('active persistence save-session fencing', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetActiveSavePersistenceForTesting();
    await resetSaveSessionOwnershipForTesting();
    vi.stubGlobal('navigator', { locks: new MemoryWebLockManager() });
    enableSaveSessionOwnershipEnforcement();
    vi.mocked(saveGameById).mockImplementation(async (id) => savedRecord(id));
  });

  afterEach(async () => {
    resetActiveSavePersistenceForTesting();
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
});
