// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseGameSnapshot, type GameSnapshot } from '@mbd/contracts';
import currentSnapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v34/core.json';
import {
  clearAllSaves,
  createBranchSave,
  db,
  deleteSaveById,
  saveGame,
} from './saveSystem';
import {
  beginSaveSessionOwnership,
  commitSaveSessionOwnership,
  enableSaveSessionOwnershipEnforcement,
  releaseActiveSaveSessionOwnership,
  resetSaveSessionOwnershipForTesting,
  withAllTransientSaveSessionOwnership,
  type WebLockManagerLike,
} from './saveSessionOwnership';

class MemoryWebLockManager implements WebLockManagerLike {
  private readonly held = new Set<string>();

  async request<T>(
    name: string,
    _options: { mode: 'exclusive'; ifAvailable: true },
    callback: (lock: { name: string; mode: 'exclusive' } | null) => T | PromiseLike<T>,
  ): Promise<T> {
    if (this.held.has(name)) {
      return await callback(null);
    }
    this.held.add(name);
    try {
      return await callback({ name, mode: 'exclusive' });
    } finally {
      this.held.delete(name);
    }
  }
}

const snapshot = (): GameSnapshot => parseGameSnapshot(currentSnapshotFixture);
const allRoots = ['save-slot-1', 'save-slot-2', 'save-slot-3', 'save-slot-4', 'save-slot-5'] as const;

describe('save-system session ownership defense', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await resetSaveSessionOwnershipForTesting();
    vi.stubGlobal('navigator', { locks: new MemoryWebLockManager() });
    db.close();
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await resetSaveSessionOwnershipForTesting();
    vi.unstubAllGlobals();
    db.close();
    await db.delete();
  });

  it('rejects a root write before touching storage when application enforcement is active', async () => {
    enableSaveSessionOwnershipEnforcement();

    await expect(saveGame(1, 'Unowned', snapshot())).rejects.toMatchObject({
      kind: 'not_owner',
      rootSaveId: 'save-slot-1',
    });
    expect(await db.saves.count()).toBe(0);
    expect(await db.saveIntegrityBackups.count()).toBe(0);
  });

  it('allows the owned root while rejecting another tree and all-save deletion', async () => {
    enableSaveSessionOwnershipEnforcement();
    const claim = await beginSaveSessionOwnership('save-slot-1');
    await commitSaveSessionOwnership(claim, 'save-slot-1');

    await expect(saveGame(1, 'Owned', snapshot())).resolves.toMatchObject({
      id: 'save-slot-1',
    });
    await expect(saveGame(2, 'Foreign', snapshot())).rejects.toMatchObject({
      kind: 'not_owner',
      rootSaveId: 'save-slot-2',
    });
    await expect(clearAllSaves()).rejects.toMatchObject({
      kind: 'not_owner',
      rootSaveId: 'save-slot-2',
    });
    expect(await db.saves.get('save-slot-1')).toBeDefined();
    expect(await db.saves.get('save-slot-2')).toBeUndefined();
  });

  it('fences branch mutation and deletion through the root-tree claim', async () => {
    enableSaveSessionOwnershipEnforcement();
    await commitSaveSessionOwnership(
      await beginSaveSessionOwnership('save-slot-1'),
      'save-slot-1',
    );
    await saveGame(1, 'Owned Root', snapshot());
    const { branch } = await createBranchSave('save-slot-1', snapshot(), 'Owned Branch');

    await expect(deleteSaveById(branch.id)).resolves.toMatchObject({ id: 'save-slot-1' });
    await expect(deleteSaveById('save-slot-2')).rejects.toMatchObject({
      kind: 'not_owner',
      rootSaveId: 'save-slot-2',
    });
  });

  it('rechecks ownership after an asynchronous read and aborts before commit', async () => {
    enableSaveSessionOwnershipEnforcement();
    await commitSaveSessionOwnership(
      await beginSaveSessionOwnership('save-slot-1'),
      'save-slot-1',
    );
    let readStarted!: () => void;
    let continueRead!: () => void;
    const started = new Promise<void>((resolve) => {
      readStarted = resolve;
    });
    const proceed = new Promise<void>((resolve) => {
      continueRead = resolve;
    });
    vi.spyOn(db.saves, 'get').mockImplementationOnce((async () => {
      readStarted();
      await proceed;
      return undefined;
    }) as never);

    const write = saveGame(1, 'Must Not Commit', snapshot());
    await started;
    await releaseActiveSaveSessionOwnership();
    continueRead();

    await expect(write).rejects.toMatchObject({ kind: 'not_owner' });
    expect(await db.saves.count()).toBe(0);
    expect(await db.saveIntegrityBackups.count()).toBe(0);
  });

  it('permits Clear All only while this document holds every root resource', async () => {
    enableSaveSessionOwnershipEnforcement();
    await withAllTransientSaveSessionOwnership(allRoots, async () => {
      await saveGame(1, 'One', snapshot());
      await saveGame(5, 'Five', snapshot());
      await clearAllSaves();
    });

    expect(await db.saves.count()).toBe(0);
    expect(await db.saveIntegrityBackups.count()).toBe(0);
    expect(await db.leaderboard.count()).toBe(0);
  });
});
