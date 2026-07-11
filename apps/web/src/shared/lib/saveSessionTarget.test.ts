// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseGameSnapshot, type GameSnapshot } from '@mbd/contracts';
import currentSnapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v34/core.json';
import {
  createBranchSave,
  db,
  resolveSaveSessionTarget,
  saveGame,
  type SaveData,
} from './saveSystem';

const snapshot = (): GameSnapshot => parseGameSnapshot(currentSnapshotFixture);

describe('resolveSaveSessionTarget', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    db.close();
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    db.close();
    await db.delete();
  });

  it('resolves an empty known root slot without inventing a save record', async () => {
    await expect(resolveSaveSessionTarget('save-slot-3')).resolves.toEqual({
      saveId: 'save-slot-3',
      rootSaveId: 'save-slot-3',
      slotNumber: 3,
      name: null,
    });
    expect(await db.saves.count()).toBe(0);
    expect(await db.saveIntegrityBackups.count()).toBe(0);
  });

  it('resolves a verified root and branch to one root-tree resource', async () => {
    await saveGame(1, 'Root One', snapshot());
    const { branch } = await createBranchSave('save-slot-1', snapshot(), 'Branch One');

    await expect(resolveSaveSessionTarget('save-slot-1')).resolves.toEqual({
      saveId: 'save-slot-1',
      rootSaveId: 'save-slot-1',
      slotNumber: 1,
      name: 'Root One',
    });
    await expect(resolveSaveSessionTarget(branch.id)).resolves.toEqual({
      saveId: branch.id,
      rootSaveId: 'save-slot-1',
      slotNumber: 1,
      name: 'Branch One',
    });
  });

  it('uses the same-generation verified shadow when primary topology is damaged', async () => {
    await saveGame(1, 'Topology Root', snapshot());
    const { branch } = await createBranchSave('save-slot-1', snapshot(), 'Topology Branch');
    await db.saves.put({
      ...branch,
      parentSaveId: 'save-slot-2',
      name: 'Tampered primary',
    });

    await expect(resolveSaveSessionTarget(branch.id)).resolves.toEqual({
      saveId: branch.id,
      rootSaveId: 'save-slot-1',
      slotNumber: 1,
      name: 'Topology Branch',
    });
  });

  it('resolves a missing primary from its verified protected copy', async () => {
    await saveGame(2, 'Missing Primary Root', snapshot());
    const { branch } = await createBranchSave('save-slot-2', snapshot(), 'Protected Branch');
    await db.saves.delete(branch.id);

    await expect(resolveSaveSessionTarget(branch.id)).resolves.toEqual({
      saveId: branch.id,
      rootSaveId: 'save-slot-2',
      slotNumber: 2,
      name: 'Protected Branch',
    });
  });

  it('discovers a parent from trusted root references when the child topology is unavailable', async () => {
    await saveGame(1, 'Discovery Root', snapshot());
    const { branch } = await createBranchSave('save-slot-1', snapshot(), 'Discovery Branch');
    const primary = await db.saves.get(branch.id);
    const backup = await db.saveIntegrityBackups.get(branch.id);
    expect(primary).toBeDefined();
    expect(backup).toBeDefined();
    await db.saves.put({
      ...primary!,
      parentSaveId: null,
      integrity: undefined,
    });
    await db.saveIntegrityBackups.put({
      ...backup!,
      parentSaveId: null,
      integrity: undefined,
    });

    await expect(resolveSaveSessionTarget(branch.id)).resolves.toEqual({
      saveId: branch.id,
      rootSaveId: 'save-slot-1',
      slotNumber: 1,
      name: null,
    });
  });

  it('fails closed for an orphan whose root cannot be established', async () => {
    const now = '2026-07-11T12:00:00.000Z';
    const orphan: SaveData = {
      id: 'branch-orphan',
      slotNumber: null,
      name: 'Orphan',
      season: snapshot().season,
      day: snapshot().day,
      phase: snapshot().phase,
      schemaVersion: snapshot().schemaVersion,
      hasSnapshot: true,
      snapshot: snapshot(),
      legacyState: null,
      createdAt: now,
      updatedAt: now,
      parentSaveId: null,
      isRootSave: false,
      branchMeta: null,
    };
    await db.saves.put(orphan);

    await expect(resolveSaveSessionTarget(orphan.id)).resolves.toBeNull();
  });

  it('can use an exact primary-shadow topology pair when Web Crypto is unavailable', async () => {
    await saveGame(5, 'No Crypto Root', snapshot());
    const { branch } = await createBranchSave('save-slot-5', snapshot(), 'No Crypto Branch');
    vi.stubGlobal('crypto', undefined);

    await expect(resolveSaveSessionTarget(branch.id)).resolves.toEqual({
      saveId: branch.id,
      rootSaveId: 'save-slot-5',
      slotNumber: 5,
      name: 'No Crypto Branch',
    });
  });
});
