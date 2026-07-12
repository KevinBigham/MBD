// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseGameSnapshot, type GameSnapshot } from '@mbd/contracts';
import { materializeSimulationImportDefaults } from '@mbd/sim-core';
import v17SnapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v17/core.json';
import deepV33SnapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v33/season10.json';
import v34SnapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v34/core.json';

vi.mock('comlink', () => ({ expose: () => {} }));

import { api } from '../../workers/sim.worker';
import { setState } from '../../workers/sim.worker.helpers';
import {
  assessSimAdvanceBaseline,
  commitSimAdvanceBaselineSeal,
  db,
  saveGame,
} from './saveSystem';

describe('simulation baseline worker/save coherence', () => {
  beforeEach(async () => {
    setState(null);
    db.close();
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    setState(null);
    db.close();
    await db.delete();
  });

  it('keeps a public-Setup-shaped scenario exact across save, restart, import, and journal admission', async () => {
    api.newGame({
      seed: 1_783_849_480_775,
      userTeamId: 'sea',
      gmName: 'Journal Browser GM',
      difficulty: 'hard',
      saveSlot: 1,
      scenarioId: 'trade_shark',
    });
    const setupSnapshot = api.exportSnapshot() as GameSnapshot;
    const saved = await saveGame(1, 'Journal Browser GM • Seattle Emeralds', setupSnapshot, {
      replaceExistingRootBranchMetadata: true,
    });

    setState(null);
    expect(api.importSnapshot(structuredClone(saved.snapshot)).success).toBe(true);
    const imported = api.exportSnapshot() as GameSnapshot;

    expect(imported).toEqual(saved.snapshot);
    await expect(assessSimAdvanceBaseline(saved.id, saved.id, imported))
      .resolves.toMatchObject({ kind: 'ready' });
    await expect(db.simAdvanceIntents.count()).resolves.toBe(0);
  });

  it.each([
    ['v17', v17SnapshotFixture],
    ['deep v33', deepV33SnapshotFixture],
    ['compatibility v34', v34SnapshotFixture],
  ])('seals a deterministic %s import materialization before journal readiness', async (_label, fixture) => {
    const accepted = parseGameSnapshot(fixture);
    const canonical = materializeSimulationImportDefaults(accepted);
    const saved = await saveGame(1, 'Compatibility baseline', accepted, {
      replaceExistingRootBranchMetadata: true,
    });

    expect(api.importSnapshot(structuredClone(accepted)).success).toBe(true);
    const imported = api.exportSnapshot() as GameSnapshot;
    expect(imported).toEqual(canonical);

    const first = await assessSimAdvanceBaseline(saved.id, saved.id, imported);
    expect(first).toMatchObject({ kind: 'seal_required' });
    if (first.kind !== 'seal_required') throw new Error('Expected compatibility baseline seal.');
    expect(await db.simAdvanceIntents.count()).toBe(0);

    await commitSimAdvanceBaselineSeal(first.proof, imported);
    expect((await db.saves.get(saved.id))?.snapshot).toEqual(imported);
    expect((await db.saveIntegrityBackups.get(saved.id))?.snapshot).toEqual(imported);
    await expect(assessSimAdvanceBaseline(saved.id, saved.id, imported))
      .resolves.toMatchObject({ kind: 'ready' });
    expect(await db.simAdvanceIntents.count()).toBe(0);
  });
});
