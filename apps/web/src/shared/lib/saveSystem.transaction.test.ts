// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseGameSnapshot } from '@mbd/contracts';
import snapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v34/core.json';
import {
  persistActiveSaveSnapshot,
  replaceInactiveSavePersistenceRecord,
  resetActiveSavePersistenceForTesting,
  retireSaveTreePersistenceForDelete,
} from './activeSavePersistence';
import {
  createBranchSave,
  db,
  deleteSaveById,
  listBranches,
  loadGameById,
  saveGame,
  saveGameById,
} from './saveSystem';

describe('saveSystem IndexedDB transaction', () => {
  beforeEach(async () => {
    resetActiveSavePersistenceForTesting();
    db.close();
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    resetActiveSavePersistenceForTesting();
    vi.restoreAllMocks();
    db.close();
    await db.delete();
  });

  it('rolls back the save row when the leaderboard write rejects', async () => {
    const initialSnapshot = parseGameSnapshot(snapshotFixture);
    await saveGameById('save-slot-1', 'Durable Original', initialSnapshot, {
      slotNumber: 1,
      parentSaveId: null,
      isRootSave: true,
      branchMeta: null,
    });
    const originalSave = await db.saves.get('save-slot-1');
    const originalLeaderboard = await db.leaderboard.get('leaderboard-dynasty-1');
    expect(originalSave?.snapshot?.day).toBe(97);
    expect(originalLeaderboard).toBeDefined();

    const leaderboardFailure = new Error('Forced leaderboard failure');
    vi.spyOn(db.leaderboard, 'put').mockRejectedValueOnce(leaderboardFailure);
    const newerSnapshot = parseGameSnapshot({
      ...initialSnapshot,
      day: 98,
    });

    await expect(saveGameById('save-slot-1', 'Must Roll Back', newerSnapshot, {
      slotNumber: 1,
      parentSaveId: null,
      isRootSave: true,
      branchMeta: null,
    })).rejects.toThrow('Forced leaderboard failure');

    const saveAfterFailure = await db.saves.get('save-slot-1');
    const leaderboardAfterFailure = await db.leaderboard.get('leaderboard-dynasty-1');
    expect(saveAfterFailure).toEqual(originalSave);
    expect(leaderboardAfterFailure).toEqual(originalLeaderboard);
  });

  it('serializes branch create/delete with root autosaves without losing gameplay or metadata', async () => {
    const initialSnapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Durable Original', initialSnapshot);

    const branchSnapshot = parseGameSnapshot({ ...initialSnapshot, day: 98 });
    const autosaveAfterCreate = parseGameSnapshot({ ...initialSnapshot, day: 99 });
    const [created] = await Promise.all([
      createBranchSave('save-slot-1', branchSnapshot, 'Deadline fork'),
      saveGameById('save-slot-1', 'Durable Original', autosaveAfterCreate, {
        slotNumber: 1,
        parentSaveId: null,
        isRootSave: true,
        branchMeta: null,
      }),
    ]);
    const branch = created.branch;

    const rootAfterCreate = await loadGameById('save-slot-1');
    expect(rootAfterCreate?.snapshot?.day).toBe(99);
    expect(rootAfterCreate?.snapshot?.narrative.whatIfBranches).toEqual([
      expect.objectContaining({ saveId: branch.id }),
    ]);
    await expect(listBranches('save-slot-1')).resolves.toHaveLength(1);

    const autosaveAfterDelete = parseGameSnapshot({ ...initialSnapshot, day: 100 });
    await Promise.all([
      deleteSaveById(branch.id),
      saveGameById('save-slot-1', 'Durable Original', autosaveAfterDelete, {
        slotNumber: 1,
        parentSaveId: null,
        isRootSave: true,
        branchMeta: null,
      }),
    ]);

    const rootAfterDelete = await loadGameById('save-slot-1');
    expect(rootAfterDelete?.snapshot?.day).toBe(100);
    expect(rootAfterDelete?.snapshot?.narrative.whatIfBranches).toEqual([]);
    await expect(listBranches('save-slot-1')).resolves.toEqual([]);
  });

  it('atomically removes child branch rows when a root slot is explicitly replaced', async () => {
    const initialSnapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Old Dynasty', initialSnapshot);
    await createBranchSave('save-slot-1', initialSnapshot, 'Old timeline');
    await expect(listBranches('save-slot-1')).resolves.toHaveLength(1);

    const replacementSnapshot = parseGameSnapshot({
      ...initialSnapshot,
      day: 1,
      narrative: {
        ...initialSnapshot.narrative,
        whatIfBranches: [{
          id: 'foreign-branch',
          saveId: 'foreign-branch',
          branchedAtSeason: initialSnapshot.season,
          branchedAtDay: initialSnapshot.day,
          description: 'Must not cross into replacement',
          createdAt: '2026-04-02T00:00:00.000Z',
        }],
      },
    });
    await saveGame(1, 'New Dynasty', replacementSnapshot, {
      replaceExistingRootBranchMetadata: true,
    });

    const replacedRoot = await loadGameById('save-slot-1');
    expect(replacedRoot?.name).toBe('New Dynasty');
    expect(replacedRoot?.snapshot?.narrative.whatIfBranches).toEqual([]);
    await expect(listBranches('save-slot-1')).resolves.toEqual([]);
  });

  it('rolls back a branch child row when its parent metadata write rejects', async () => {
    const initialSnapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Durable Original', initialSnapshot);
    const originalPut = db.saves.put.bind(db.saves);
    vi.spyOn(db.saves, 'put').mockImplementation((async (record) => {
      if (
        record.id === 'save-slot-1'
        && (record.snapshot?.narrative.whatIfBranches.length ?? 0) > 0
      ) {
        throw new Error('Forced parent metadata failure');
      }
      return originalPut(record);
    }) as typeof db.saves.put);

    await expect(createBranchSave(
      'save-slot-1',
      initialSnapshot,
      'Must roll back',
    )).rejects.toThrow('Forced parent metadata failure');

    const root = await loadGameById('save-slot-1');
    expect(root?.snapshot?.narrative.whatIfBranches).toEqual([]);
    await expect(listBranches('save-slot-1')).resolves.toEqual([]);
  });

  it('rolls back parent metadata when a branch child deletion rejects', async () => {
    const initialSnapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Durable Original', initialSnapshot);
    const { branch } = await createBranchSave('save-slot-1', initialSnapshot, 'Keep on failure');
    const originalDelete = db.saves.delete.bind(db.saves);
    vi.spyOn(db.saves, 'delete').mockImplementation((async (id) => {
      if (id === branch.id) {
        throw new Error('Forced branch delete failure');
      }
      return originalDelete(id);
    }) as typeof db.saves.delete);

    await expect(deleteSaveById(branch.id)).rejects.toThrow('Forced branch delete failure');

    const root = await loadGameById('save-slot-1');
    expect(root?.snapshot?.narrative.whatIfBranches).toEqual([
      expect.objectContaining({ saveId: branch.id }),
    ]);
    await expect(listBranches('save-slot-1')).resolves.toEqual([
      expect.objectContaining({ id: branch.id }),
    ]);
  });

  it('tombstones delayed child captures before an atomic root delete cascade', async () => {
    const initialSnapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Root to delete', initialSnapshot);
    const { branch } = await createBranchSave('save-slot-1', initialSnapshot, 'Delayed branch');
    let releaseExport: (snapshot: object) => void = () => {};
    const delayedBranchCapture = persistActiveSaveSnapshot({
      activeSaveId: branch.id,
      activeSaveSlot: null,
      gmName: 'Branch GM',
      teamName: 'Branch Club',
      season: initialSnapshot.season,
      exportSnapshot: () => new Promise<object>((resolve) => {
        releaseExport = resolve;
      }),
    });
    await Promise.resolve();

    await retireSaveTreePersistenceForDelete(
      'save-slot-1',
      async () => {
        await deleteSaveById('save-slot-1');
      },
    );
    releaseExport({ ...initialSnapshot, day: initialSnapshot.day + 1 });

    await expect(delayedBranchCapture).resolves.toEqual({ saved: false, saveName: null });
    await expect(db.saves.get('save-slot-1')).resolves.toBeUndefined();
    await expect(db.saves.get(branch.id)).resolves.toBeUndefined();
  });

  it('tombstones delayed child captures before an atomic root replacement cascade', async () => {
    const initialSnapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Root to replace', initialSnapshot);
    const { branch } = await createBranchSave('save-slot-1', initialSnapshot, 'Old branch');
    let releaseExport: (snapshot: object) => void = () => {};
    const delayedBranchCapture = persistActiveSaveSnapshot({
      activeSaveId: branch.id,
      activeSaveSlot: null,
      gmName: 'Old Branch GM',
      teamName: 'Old Branch Club',
      season: initialSnapshot.season,
      exportSnapshot: () => new Promise<object>((resolve) => {
        releaseExport = resolve;
      }),
    });
    await Promise.resolve();

    const replacementSnapshot = parseGameSnapshot({ ...initialSnapshot, day: 1 });
    await replaceInactiveSavePersistenceRecord(
      'save-slot-1',
      () => saveGame(1, 'Replacement Root', replacementSnapshot, {
        replaceExistingRootBranchMetadata: true,
      }),
    );
    releaseExport({ ...initialSnapshot, day: initialSnapshot.day + 1 });

    await expect(delayedBranchCapture).resolves.toEqual({ saved: false, saveName: null });
    await expect(db.saves.get(branch.id)).resolves.toBeUndefined();
    const root = await loadGameById('save-slot-1');
    expect(root?.name).toBe('Replacement Root');
    expect(root?.snapshot?.narrative.whatIfBranches).toEqual([]);
  });
});
