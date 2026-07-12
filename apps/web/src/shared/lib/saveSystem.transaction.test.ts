// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseGameSnapshot, type GameSnapshot } from '@mbd/contracts';
import rawSnapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v34/core.json';
import v17SnapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v17/core.json';
import deepV33SnapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v33/season10.json';
import { materializeSimulationImportDefaults } from '@mbd/sim-core';
import {
  persistActiveSaveSnapshot,
  replaceInactiveSavePersistenceRecord,
  resetActiveSavePersistenceForTesting,
  retireSaveTreePersistenceForDelete,
} from './activeSavePersistence';
import {
  createBranchSave,
  clearAllSaves,
  assessSimAdvanceBaseline,
  consumeSimAdvanceIntentRollback,
  commitSimAdvanceBaselineSeal,
  commitSimAdvanceSnapshot,
  buildLeaderboardEntry,
  claimDurablyPreparedSimAdvanceIntent,
  db,
  deleteSaveById,
  listBranches,
  loadGameById,
  prepareSimAdvanceIntent,
  inspectSimAdvanceIntentForCandidate,
  readSimAdvanceIntentBaseline,
  repairSave,
  restoreSaveIntegrityBackup,
  saveGame,
  saveGameById,
  SimAdvanceEvidenceConflictError,
  type SaveData,
  type SimAdvanceIntent,
} from './saveSystem';
import {
  sealSaveRecord,
  verifySaveRecordIntegrity,
  type SaveIntegrityVerification,
} from './saveIntegrity';
import * as saveIntegrity from './saveIntegrity';
import * as saveSessionOwnership from './saveSessionOwnership';
import {
  beginSimAdvanceWorkerSession,
  consumeSimAdvanceWorkerAuthorization,
  createSimAdvanceWorkerAuthorization,
  finishSimAdvanceWorkerSession,
} from './workerMutationSession';

// Transaction callers model worker exports. The checked-in v34 contract
// fixture predates import-time simulation defaults, so materialize it through
// the same pure fixed-point oracle that now defines a real worker export.
const snapshotFixture = materializeSimulationImportDefaults(
  parseGameSnapshot(rawSnapshotFixture),
);

describe('saveSystem IndexedDB transaction', () => {
  const ROOT_ID = 'save-slot-1';
  const BRANCH_ID = 'branch-seal-1';

  function materializedSnapshot(snapshot: unknown): GameSnapshot {
    return materializeSimulationImportDefaults(parseGameSnapshot(snapshot));
  }

  function currentSnapshot(): GameSnapshot {
    return materializedSnapshot(snapshotFixture);
  }

  function rawRecord(
    id: string,
    snapshot: unknown,
    options: Pick<SaveData, 'slotNumber' | 'parentSaveId' | 'isRootSave' | 'branchMeta'>,
    name = 'Baseline to seal',
  ): SaveData {
    const source = snapshot as Pick<GameSnapshot, 'schemaVersion' | 'season' | 'day' | 'phase'>;
    return {
      id,
      name,
      slotNumber: options.slotNumber,
      parentSaveId: options.parentSaveId,
      isRootSave: options.isRootSave,
      branchMeta: options.branchMeta,
      season: source.season,
      day: source.day,
      phase: source.phase,
      schemaVersion: source.schemaVersion,
      hasSnapshot: true,
      snapshot: snapshot as GameSnapshot,
      legacyState: null,
      createdAt: '2025-01-02T03:04:05.000Z',
      updatedAt: '2025-01-02T03:04:05.000Z',
    };
  }

  function branchMetadata(snapshot: GameSnapshot): NonNullable<SaveData['branchMeta']> {
    return {
      id: BRANCH_ID,
      saveId: BRANCH_ID,
      branchedAtSeason: snapshot.season,
      branchedAtDay: snapshot.day,
      description: 'Exact baseline branch metadata',
      createdAt: '2025-01-02T03:04:05.000Z',
    };
  }

  async function putExactSealedPair(record: SaveData): Promise<SaveData> {
    const sealed = await sealSaveRecord(record);
    await db.saves.put(sealed);
    await db.saveIntegrityBackups.put(sealed);
    return sealed;
  }

  async function sealProof(saveId: string, rootSaveId: string, workerSnapshot: GameSnapshot) {
    const assessment = await assessSimAdvanceBaseline(saveId, rootSaveId, workerSnapshot);
    if (assessment.kind !== 'seal_required') {
      throw new Error(`Expected a seal-required baseline, received ${assessment.kind}.`);
    }
    return assessment.proof;
  }

  async function allDurableRows(): Promise<unknown[]> {
    return Promise.all([
      db.saves.toArray(),
      db.saveIntegrityBackups.toArray(),
      db.leaderboard.toArray(),
      db.simAdvanceIntents.toArray(),
    ]);
  }

  async function readySimAdvanceProof(snapshot: object) {
    const assessment = await assessSimAdvanceBaseline('save-slot-1', 'save-slot-1', snapshot);
    if (assessment.kind !== 'ready') {
      throw new Error(`Expected a ready baseline, received ${assessment.kind}.`);
    }
    return assessment.proof;
  }

  function indexedOrphanIntent(saveId = 'orphan-journal'): SimAdvanceIntent {
    const snapshot = currentSnapshot();
    const checksum = 'c'.repeat(64);
    return {
      journalVersion: 1,
      saveId,
      rootSaveId: ROOT_ID,
      operation: 'sim_week',
      baselineChecksum: checksum,
      baselineSeason: snapshot.season,
      baselineDay: snapshot.day,
      baselinePhase: snapshot.phase,
      attempt: 2,
      token: `sim-advance-v1:${saveId}:${ROOT_ID}:sim_week:${checksum}:${snapshot.season}:${snapshot.day}:${snapshot.phase}:2`,
    };
  }

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

  it('writes a strict exact baseline intent and rejects malformed forged journal evidence', async () => {
    const initialSnapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', initialSnapshot);
    const intent = await prepareSimAdvanceIntent(
      await readySimAdvanceProof(initialSnapshot),
      'sim_day',
    );

    await expect(readSimAdvanceIntentBaseline('save-slot-1', 'save-slot-1')).resolves.toEqual({
      intent,
      baseline: expect.objectContaining({ id: 'save-slot-1', integrity: expect.any(Object) }),
    });

    await db.simAdvanceIntents.put({
      ...intent,
      operation: 'forged_operation' as typeof intent.operation,
      token: `sim-advance-v1:${intent.saveId}:${intent.rootSaveId}:forged_operation:${intent.baselineChecksum}:${intent.baselineSeason}:${intent.baselineDay}:${intent.baselinePhase}:${intent.attempt}`,
    });
    await expect(readSimAdvanceIntentBaseline('save-slot-1', 'save-slot-1'))
      .rejects.toThrow('malformed');
  });

  it('treats exact-row root corruption and another same-tree intent as boot integrity failures', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const intent = await prepareSimAdvanceIntent(await readySimAdvanceProof(snapshot), 'sim_day');
    await db.simAdvanceIntents.put({ ...intent, rootSaveId: 'save-slot-2' });
    await expect(inspectSimAdvanceIntentForCandidate('save-slot-1', 'save-slot-1'))
      .rejects.toThrow('another or malformed dynasty tree');

    await db.simAdvanceIntents.put(intent);
    // The schema's unique root index makes a second same-tree row impossible;
    // prove it cannot be smuggled in, then ensure the exact row still remains
    // recoverable rather than being treated as absent.
    await expect(db.simAdvanceIntents.put({
      ...intent, saveId: 'branch-other', token: `${intent.token}:other`,
    })).rejects.toThrow();
    await expect(inspectSimAdvanceIntentForCandidate('save-slot-1', 'save-slot-1'))
      .resolves.toMatchObject({ kind: 'rollback', intent });
  });

  it('permits worker authorization only for the exact durably prepared journal operation', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const prepared = await prepareSimAdvanceIntent(
      await readySimAdvanceProof(snapshot),
      'sim_day',
    );
    expect(Object.isFrozen(prepared)).toBe(true);
    const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');

    expect(() => createSimAdvanceWorkerAuthorization(
      session,
      'save-slot-1',
      'save-slot-1',
      'simDay',
      {},
    )).toThrow('durably prepared simulation intent');
    expect(() => createSimAdvanceWorkerAuthorization(
      session,
      'save-slot-1',
      'save-slot-1',
      'simWeek',
      prepared,
    )).toThrow('durably prepared simulation intent');
    expect(() => createSimAdvanceWorkerAuthorization(
      session,
      'save-slot-1',
      'save-slot-1',
      'simDay',
      prepared,
    )).not.toThrow();
    finishSimAdvanceWorkerSession(session);
  });

  it('accepts only one exact issued ready proof, restores it after transaction failure, and never accepts structural copies', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const proof = await readySimAdvanceProof(snapshot);
    const before = await allDurableRows();
    const forgedProofs = [
      { ...proof },
      structuredClone(proof),
      { ...proof, checksum: 'f'.repeat(64) },
      { ...proof, baseline: { ...proof.baseline, day: proof.baseline.day + 1 } },
      { ...proof, attempt: proof.attempt + 1 },
    ];
    for (const forged of forgedProofs) {
      await expect(prepareSimAdvanceIntent(forged as typeof proof, 'sim_day'))
        .rejects.toBeInstanceOf(SimAdvanceEvidenceConflictError);
    }
    await expect(allDurableRows()).resolves.toEqual(before);

    vi.spyOn(db.simAdvanceIntents, 'add').mockRejectedValueOnce(new Error('forced prepare transaction failure'));
    await expect(prepareSimAdvanceIntent(proof, 'sim_day')).rejects.toThrow('forced prepare transaction failure');
    await expect(allDurableRows()).resolves.toEqual(before);

    await expect(prepareSimAdvanceIntent(proof, 'sim_day')).resolves.toMatchObject({
      saveId: 'save-slot-1', operation: 'sim_day', attempt: proof.attempt,
    });
  });

  it('rejects an unsupported runtime prepare operation before reserving its exact ready proof', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const proof = await readySimAdvanceProof(snapshot);
    const before = await allDurableRows();

    await expect(prepareSimAdvanceIntent(proof, 'sim_season' as never))
      .rejects.toBeInstanceOf(SimAdvanceEvidenceConflictError);
    await expect(allDurableRows()).resolves.toEqual(before);
    await expect(prepareSimAdvanceIntent(proof, 'sim_day')).resolves.toMatchObject({
      operation: 'sim_day', attempt: proof.attempt,
    });
  });

  it.each([
    ['direct unsupported claim', (session: Awaited<ReturnType<typeof beginSimAdvanceWorkerSession>>, intent: SimAdvanceIntent) =>
      claimDurablyPreparedSimAdvanceIntent(intent, 'save-slot-1', 'save-slot-1', 'sim_season' as never)],
    ['wrong save', (session: Awaited<ReturnType<typeof beginSimAdvanceWorkerSession>>, intent: SimAdvanceIntent) =>
      createSimAdvanceWorkerAuthorization(session, 'save-slot-2', 'save-slot-1', 'simDay', intent)],
    ['wrong root', (session: Awaited<ReturnType<typeof beginSimAdvanceWorkerSession>>, intent: SimAdvanceIntent) =>
      createSimAdvanceWorkerAuthorization(session, 'save-slot-1', 'save-slot-2', 'simDay', intent)],
    ['supported wrong operation', (session: Awaited<ReturnType<typeof beginSimAdvanceWorkerSession>>, intent: SimAdvanceIntent) =>
      createSimAdvanceWorkerAuthorization(session, 'save-slot-1', 'save-slot-1', 'simWeek', intent)],
    ['unsupported worker operation', (session: Awaited<ReturnType<typeof beginSimAdvanceWorkerSession>>, intent: SimAdvanceIntent) =>
      createSimAdvanceWorkerAuthorization(session, 'save-slot-1', 'save-slot-1', 'simSeason' as never, intent)],
  ] as const)('does not burn exact worker authority for %s runtime issuance', async (_label, issueInvalid) => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const prepared = await prepareSimAdvanceIntent(await readySimAdvanceProof(snapshot), 'sim_day');
    const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');

    expect(() => issueInvalid(session, prepared)).toThrow();
    expect(() => createSimAdvanceWorkerAuthorization(
      session, 'save-slot-1', 'save-slot-1', 'simDay', prepared,
    )).not.toThrow();
    finishSimAdvanceWorkerSession(session);
  });

  it('reserves an exact ready proof once, then requires a fresh assessment after rollback', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const proof = await readySimAdvanceProof(snapshot);
    const results = await Promise.allSettled([
      prepareSimAdvanceIntent(proof, 'sim_day'),
      prepareSimAdvanceIntent(proof, 'sim_day'),
    ]);
    const fulfilled = results.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof prepareSimAdvanceIntent>>> => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const first = fulfilled[0]!.value;
    await consumeSimAdvanceIntentRollback(first);

    await expect(prepareSimAdvanceIntent(proof, 'sim_day'))
      .rejects.toBeInstanceOf(SimAdvanceEvidenceConflictError);
    const freshProof = await readySimAdvanceProof(snapshot);
    const second = await prepareSimAdvanceIntent(freshProof, 'sim_day');
    expect(second.attempt).toBeGreaterThan(first.attempt);
    expect(second.token).not.toBe(first.token);
  });

  it('burns one real prepared intent authorization in the same and a later worker session', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const prepared = await prepareSimAdvanceIntent(await readySimAdvanceProof(snapshot), 'sim_day');
    const firstSession = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');

    expect(() => createSimAdvanceWorkerAuthorization(
      firstSession, 'save-slot-1', 'save-slot-1', 'simWeek', prepared,
    )).toThrow('durably prepared simulation intent');
    createSimAdvanceWorkerAuthorization(
      firstSession, 'save-slot-1', 'save-slot-1', 'simDay', prepared,
    );
    expect(() => createSimAdvanceWorkerAuthorization(
      firstSession, 'save-slot-1', 'save-slot-1', 'simDay', prepared,
    )).toThrow('one worker authorization');
    finishSimAdvanceWorkerSession(firstSession);

    const secondSession = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    expect(() => createSimAdvanceWorkerAuthorization(
      secondSession, 'save-slot-1', 'save-slot-1', 'simDay', prepared,
    )).toThrow('one worker authorization');
    finishSimAdvanceWorkerSession(secondSession);
  });

  it('revokes an issued but unused authorization when its exact journal row is removed', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const prepared = await prepareSimAdvanceIntent(await readySimAdvanceProof(snapshot), 'sim_day');
    const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    const authorization = createSimAdvanceWorkerAuthorization(
      session, 'save-slot-1', 'save-slot-1', 'simDay', prepared,
    );
    await consumeSimAdvanceIntentRollback(prepared);
    expect(() => consumeSimAdvanceWorkerAuthorization(
      authorization, session, 'save-slot-1', 'save-slot-1', 'simDay',
    )).toThrowError(SimAdvanceEvidenceConflictError);
    finishSimAdvanceWorkerSession(session);
  });

  it.each([
    ['exact deletion', async (snapshot: GameSnapshot) => { await deleteSaveById('save-slot-1'); }],
    ['coordinated root replacement', async (snapshot: GameSnapshot) => {
      await saveGameById('save-slot-1', 'Replacement', snapshot, {
        slotNumber: 1,
        parentSaveId: null,
        isRootSave: true,
        branchMeta: null,
        deleteExistingBranchRows: true,
        replaceExistingRootBranchMetadata: true,
      });
    }],
    ['Clear All', async (_snapshot: GameSnapshot) => { await clearAllSaves(); }],
  ])('revokes a prepared intent runtime authorization only after %s atomically removes its journal row', async (_label, remove) => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const prepared = await prepareSimAdvanceIntent(
      await readySimAdvanceProof(snapshot),
      'sim_day',
    );
    await remove(snapshot);
    const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    expect(() => createSimAdvanceWorkerAuthorization(
      session,
      'save-slot-1',
      'save-slot-1',
      'simDay',
      prepared,
    )).toThrow('durably prepared simulation intent');
    finishSimAdvanceWorkerSession(session);
  });

  it.each([
    ['root replacement', async (snapshot: GameSnapshot) => saveGameById(ROOT_ID, 'Replacement', snapshot, {
      slotNumber: 1,
      parentSaveId: null,
      isRootSave: true,
      branchMeta: null,
      deleteExistingBranchRows: true,
      replaceExistingRootBranchMetadata: true,
    })],
    ['root deletion', async (_snapshot: GameSnapshot) => deleteSaveById(ROOT_ID)],
  ])('removes every indexed same-root orphan journal row during %s', async (_label, mutateTree) => {
    const snapshot = currentSnapshot();
    await saveGame(1, 'Journal tree', snapshot);
    const orphan = indexedOrphanIntent();
    await db.simAdvanceIntents.put(orphan);

    await mutateTree(snapshot);

    expect(await db.simAdvanceIntents.get(orphan.saveId)).toBeUndefined();
    expect(await db.simAdvanceIntents.where('rootSaveId').equals(ROOT_ID).count()).toBe(0);
  });

  it('rolls back root replacement when indexed orphan-journal deletion fails', async () => {
    const snapshot = currentSnapshot();
    await saveGame(1, 'Original tree', snapshot);
    const orphan = indexedOrphanIntent();
    await db.simAdvanceIntents.put(orphan);
    const before = await allDurableRows();
    vi.spyOn(db.simAdvanceIntents, 'bulkDelete').mockRejectedValueOnce(
      new Error('forced indexed orphan delete failure'),
    );

    await expect(saveGameById(ROOT_ID, 'Must roll back', snapshot, {
      slotNumber: 1,
      parentSaveId: null,
      isRootSave: true,
      branchMeta: null,
      deleteExistingBranchRows: true,
      replaceExistingRootBranchMetadata: true,
    })).rejects.toThrow('forced indexed orphan delete failure');

    await expect(allDurableRows()).resolves.toEqual(before);
  });

  it('refuses protected-copy repair while a branch journal still owns the root tree', async () => {
    const snapshot = currentSnapshot();
    await saveGame(1, 'Repair root', snapshot);
    const { branch } = await createBranchSave(ROOT_ID, snapshot, 'Repair blocker');
    const assessment = await assessSimAdvanceBaseline(branch.id, ROOT_ID, snapshot);
    if (assessment.kind !== 'ready') throw new Error('Expected a ready branch baseline.');
    const intent = await prepareSimAdvanceIntent(assessment.proof, 'sim_day');
    const root = (await db.saves.get(ROOT_ID))!;
    await db.saves.put({ ...root, name: 'Damaged while branch journal is live' });
    const before = await allDurableRows();

    await expect(restoreSaveIntegrityBackup(ROOT_ID))
      .rejects.toThrow('save tree has unresolved simulation journal evidence');

    await expect(allDurableRows()).resolves.toEqual(before);
    expect(await db.simAdvanceIntents.get(branch.id)).toEqual(intent);
  });

  it('revokes a prepared branch intent only after root-tree deletion removes that exact branch journal row', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const { branch } = await createBranchSave('save-slot-1', snapshot, 'Prepared branch');
    const assessment = await assessSimAdvanceBaseline(branch.id, 'save-slot-1', snapshot);
    if (assessment.kind !== 'ready') throw new Error('Expected a ready branch baseline.');
    const prepared = await prepareSimAdvanceIntent(assessment.proof, 'sim_day');

    await deleteSaveById('save-slot-1');
    expect(await db.simAdvanceIntents.get(branch.id)).toBeUndefined();

    const session = await beginSimAdvanceWorkerSession(branch.id, 'save-slot-1');
    expect(() => createSimAdvanceWorkerAuthorization(
      session,
      branch.id,
      'save-slot-1',
      'simDay',
      prepared,
    )).toThrow('durably prepared simulation intent');
    finishSimAdvanceWorkerSession(session);
  });

  it('preserves a live prepared branch intent when ordinary branch deletion is blocked by that unresolved evidence', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const { branch } = await createBranchSave('save-slot-1', snapshot, 'Blocked branch deletion');
    const assessment = await assessSimAdvanceBaseline(branch.id, 'save-slot-1', snapshot);
    if (assessment.kind !== 'ready') throw new Error('Expected a ready branch baseline.');
    const prepared = await prepareSimAdvanceIntent(assessment.proof, 'sim_day');

    await expect(deleteSaveById(branch.id)).rejects.toThrow('unresolved simulation journal');
    expect(await db.simAdvanceIntents.get(branch.id)).toEqual(prepared);

    const session = await beginSimAdvanceWorkerSession(branch.id, 'save-slot-1');
    expect(() => createSimAdvanceWorkerAuthorization(
      session,
      branch.id,
      'save-slot-1',
      'simDay',
      prepared,
    )).not.toThrow();
    finishSimAdvanceWorkerSession(session);
  });

  it('revokes a prepared branch intent after the exact orphan-branch deletion transaction commits', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const { branch } = await createBranchSave('save-slot-1', snapshot, 'Orphan branch deletion');
    const assessment = await assessSimAdvanceBaseline(branch.id, 'save-slot-1', snapshot);
    if (assessment.kind !== 'ready') throw new Error('Expected a ready branch baseline.');
    const prepared = await prepareSimAdvanceIntent(assessment.proof, 'sim_day');

    // This is the recovery-supported orphan path: only after the exact branch
    // delete transaction removes its journal row may runtime authorization die.
    await db.saves.delete('save-slot-1');
    await db.saveIntegrityBackups.delete('save-slot-1');
    await deleteSaveById(branch.id);
    expect(await db.simAdvanceIntents.get(branch.id)).toBeUndefined();

    const session = await beginSimAdvanceWorkerSession(branch.id, 'save-slot-1');
    expect(() => createSimAdvanceWorkerAuthorization(
      session,
      branch.id,
      'save-slot-1',
      'simDay',
      prepared,
    )).toThrow('durably prepared simulation intent');
    finishSimAdvanceWorkerSession(session);
  });

  it('keeps prepared provenance live when a deleting transaction aborts, and repair refuses to remove evidence', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const prepared = await prepareSimAdvanceIntent(
      await readySimAdvanceProof(snapshot),
      'sim_day',
    );
    vi.spyOn(db.simAdvanceIntents, 'bulkDelete').mockRejectedValueOnce(new Error('forced root journal delete failure'));

    await expect(deleteSaveById('save-slot-1')).rejects.toThrow('forced root journal delete failure');
    await expect(repairSave(1)).rejects.toThrow('unresolved simulation journal');

    const session = await beginSimAdvanceWorkerSession('save-slot-1', 'save-slot-1');
    expect(() => createSimAdvanceWorkerAuthorization(
      session,
      'save-slot-1',
      'save-slot-1',
      'simDay',
      prepared,
    )).not.toThrow();
    finishSimAdvanceWorkerSession(session);
  });

  it('atomically keeps baseline, shadow, leaderboard, and intent when journal deletion fails', async () => {
    const initialSnapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', initialSnapshot);
    const intent = await prepareSimAdvanceIntent(
      await readySimAdvanceProof(initialSnapshot),
      'sim_week',
    );
    const [beforePrimary, beforeShadow, beforeLeaderboard] = await Promise.all([
      db.saves.get('save-slot-1'),
      db.saveIntegrityBackups.get('save-slot-1'),
      db.leaderboard.get('leaderboard-dynasty-1'),
    ]);
    vi.spyOn(db.simAdvanceIntents, 'delete').mockRejectedValueOnce(new Error('Forced intent delete failure'));

    await expect(commitSimAdvanceSnapshot(intent, 'Post command', {
      ...initialSnapshot,
      day: initialSnapshot.day + 7,
    })).rejects.toThrow('Forced intent delete failure');

    await expect(db.saves.get('save-slot-1')).resolves.toEqual(beforePrimary);
    await expect(db.saveIntegrityBackups.get('save-slot-1')).resolves.toEqual(beforeShadow);
    await expect(db.leaderboard.get('leaderboard-dynasty-1')).resolves.toEqual(beforeLeaderboard);
    await expect(db.simAdvanceIntents.get('save-slot-1')).resolves.toEqual(intent);
  });

  it('preserves fresh intent2 and every durable row when stale intent1 tries commit and rollback-consume after fresh assessment', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const first = await prepareSimAdvanceIntent(
      await readySimAdvanceProof(snapshot),
      'sim_day',
    );
    await consumeSimAdvanceIntentRollback(first);
    const second = await prepareSimAdvanceIntent(
      await readySimAdvanceProof(snapshot),
      'sim_day',
    );
    expect(second.attempt).toBeGreaterThan(first.attempt);
    expect(second.token).not.toBe(first.token);
    const beforeStaleCallbacks = await allDurableRows();

    await expect(consumeSimAdvanceIntentRollback(first)).rejects.toThrow('changed');
    await expect(commitSimAdvanceSnapshot(first, 'stale post', snapshot)).rejects.toThrow('changed');
    await expect(allDurableRows()).resolves.toEqual(beforeStaleCallbacks);
    await expect(db.simAdvanceIntents.get('save-slot-1')).resolves.toEqual(second);
  });

  it('rejects malformed post state before it can consume the exact intent', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const intent = await prepareSimAdvanceIntent(
      await readySimAdvanceProof(snapshot),
      'sim_day',
    );
    const before = await Promise.all([
      db.saves.get('save-slot-1'), db.saveIntegrityBackups.get('save-slot-1'),
      db.leaderboard.get('leaderboard-dynasty-1'), db.simAdvanceIntents.get('save-slot-1'),
    ]);
    await expect(commitSimAdvanceSnapshot(intent, 'bad post', { schemaVersion: 1 })).rejects.toThrow();
    await expect(Promise.all([
      db.saves.get('save-slot-1'), db.saveIntegrityBackups.get('save-slot-1'),
      db.leaderboard.get('leaderboard-dynasty-1'), db.simAdvanceIntents.get('save-slot-1'),
    ])).resolves.toEqual(before);
  });

  it('treats runtime integrity unavailability as retryable evidence availability without mutating the journal transaction', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const intent = await prepareSimAdvanceIntent(
      await readySimAdvanceProof(snapshot),
      'sim_day',
    );
    const before = await allDurableRows();
    const verify = vi.spyOn(saveIntegrity, 'verifySaveRecordIntegrity')
      .mockResolvedValue({
        status: 'invalid',
        reason: 'unavailable',
        message: 'Web Crypto is temporarily unavailable.',
        cause: 'test_unavailable',
      });

    await expect(commitSimAdvanceSnapshot(intent, 'Post command', {
      ...snapshot,
      day: snapshot.day + 1,
    })).rejects.toMatchObject({ name: 'SaveIntegrityUnavailableError' });
    await expect(allDurableRows()).resolves.toEqual(before);

    verify.mockRestore();
    await expect(commitSimAdvanceSnapshot(intent, 'Post command', {
      ...snapshot,
      day: snapshot.day + 1,
    })).resolves.toMatchObject({ id: 'save-slot-1' });
    await expect(db.simAdvanceIntents.get('save-slot-1')).resolves.toBeUndefined();
  });

  it.each([
    [
      'primary mismatch with shadow unavailable',
      {
        status: 'invalid', reason: 'mismatch', message: 'checksum mismatch',
        metadata: {}, expectedChecksum: 'a'.repeat(64), actualChecksum: 'b'.repeat(64),
      } as SaveIntegrityVerification,
      { status: 'invalid', reason: 'unavailable', message: 'Web Crypto unavailable.', cause: 'test' } as SaveIntegrityVerification,
    ],
    [
      'primary unavailable with shadow mismatch',
      { status: 'invalid', reason: 'unavailable', message: 'Web Crypto unavailable.', cause: 'test' } as SaveIntegrityVerification,
      {
        status: 'invalid', reason: 'mismatch', message: 'checksum mismatch',
        metadata: {}, expectedChecksum: 'a'.repeat(64), actualChecksum: 'b'.repeat(64),
      } as SaveIntegrityVerification,
    ],
    [
      'primary malformed with shadow unavailable',
      { status: 'invalid', reason: 'malformed', message: 'malformed integrity metadata' } as SaveIntegrityVerification,
      { status: 'invalid', reason: 'unavailable', message: 'Web Crypto unavailable.', cause: 'test' } as SaveIntegrityVerification,
    ],
    [
      'primary unavailable with shadow unsealed',
      { status: 'invalid', reason: 'unavailable', message: 'Web Crypto unavailable.', cause: 'test' } as SaveIntegrityVerification,
      { status: 'unsealed' } as SaveIntegrityVerification,
    ],
  ])('keeps mixed %s evidence terminal rather than downgrading it to retryable unavailability', async (_label, primaryVerification, shadowVerification) => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Journal baseline', snapshot);
    const intent = await prepareSimAdvanceIntent(
      await readySimAdvanceProof(snapshot),
      'sim_day',
    );
    const before = await allDurableRows();
    vi.spyOn(saveIntegrity, 'verifySaveRecordIntegrity')
      .mockResolvedValueOnce(primaryVerification)
      .mockResolvedValueOnce(shadowVerification);

    await expect(commitSimAdvanceSnapshot(intent, 'Post command', {
      ...snapshot,
      day: snapshot.day + 1,
    })).rejects.toBeInstanceOf(SimAdvanceEvidenceConflictError);
    await expect(allDurableRows()).resolves.toEqual(before);
    await expect(db.simAdvanceIntents.get('save-slot-1')).resolves.toEqual(intent);
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

  it('rejects direct branch creation while its root has unresolved journal evidence', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Durable Original', snapshot);
    await prepareSimAdvanceIntent(
      await readySimAdvanceProof(snapshot),
      'sim_day',
    );
    await expect(createBranchSave('save-slot-1', snapshot, 'blocked fork'))
      .rejects.toThrow('unresolved simulation journal');
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

  it.each([
    ['checksumless/no-shadow v34', 'unsealed', snapshotFixture],
    ['sealed/no-shadow v34', 'sealed', snapshotFixture],
    ['verified noncanonical v17 pair', 'pair', v17SnapshotFixture],
    ['verified noncanonical deep v33 pair', 'pair', deepV33SnapshotFixture],
  ] as const)('seals a %s root baseline into one exact current-v34 pair', async (_label, source, fixture) => {
    const workerSnapshot = materializedSnapshot(fixture);
    const baseline = rawRecord(
      ROOT_ID,
      fixture,
      { slotNumber: 1, parentSaveId: null, isRootSave: true, branchMeta: null },
      'Root baseline name',
    );
    if (source === 'pair') {
      await putExactSealedPair(baseline);
    } else if (source === 'sealed') {
      await db.saves.put(await sealSaveRecord(baseline));
    } else {
      await db.saves.put(baseline);
    }
    const proof = await sealProof(ROOT_ID, ROOT_ID, workerSnapshot);

    const result = await commitSimAdvanceBaselineSeal(proof, workerSnapshot);

    const [primary, shadow, leaderboard] = await Promise.all([
      db.saves.get(ROOT_ID),
      db.saveIntegrityBackups.get(ROOT_ID),
      db.leaderboard.get('leaderboard-dynasty-1'),
    ]);
    expect(result).toMatchObject({
      id: ROOT_ID,
      name: baseline.name,
      createdAt: baseline.createdAt,
      slotNumber: 1,
      parentSaveId: null,
      isRootSave: true,
      branchMeta: null,
      snapshot: workerSnapshot,
    });
    expect(primary).toEqual(result);
    expect(shadow).toEqual(result);
    await expect(verifySaveRecordIntegrity(primary!)).resolves.toMatchObject({ status: 'valid' });
    expect(leaderboard).toEqual(buildLeaderboardEntry(1, workerSnapshot, result.updatedAt));
    expect(await db.simAdvanceIntents.count()).toBe(0);
    await expect(assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, workerSnapshot)).resolves.toMatchObject({ kind: 'ready' });
  });

  it.each([
    ['checksumless/no-shadow v34', 'unsealed', snapshotFixture],
    ['sealed/no-shadow v34', 'sealed', snapshotFixture],
    ['verified noncanonical v17 pair', 'pair', v17SnapshotFixture],
    ['verified noncanonical deep v33 pair', 'pair', deepV33SnapshotFixture],
  ] as const)('seals a %s branch baseline without changing its root rows', async (_label, source, fixture) => {
    const rootSnapshot = currentSnapshot();
    await saveGame(1, 'Root that must not change', rootSnapshot);
    const rootBefore = await Promise.all([
      db.saves.get(ROOT_ID),
      db.saveIntegrityBackups.get(ROOT_ID),
      db.leaderboard.get('leaderboard-dynasty-1'),
    ]);
    const workerSnapshot = materializedSnapshot(fixture);
    const baseline = rawRecord(
      BRANCH_ID,
      fixture,
      {
        slotNumber: null,
        parentSaveId: ROOT_ID,
        isRootSave: false,
        branchMeta: branchMetadata(workerSnapshot),
      },
      'Branch baseline name',
    );
    if (source === 'pair') {
      await putExactSealedPair(baseline);
    } else if (source === 'sealed') {
      await db.saves.put(await sealSaveRecord(baseline));
    } else {
      await db.saves.put(baseline);
    }
    const proof = await sealProof(BRANCH_ID, ROOT_ID, workerSnapshot);

    const result = await commitSimAdvanceBaselineSeal(proof, workerSnapshot);

    expect(result).toMatchObject({
      id: BRANCH_ID,
      name: baseline.name,
      createdAt: baseline.createdAt,
      slotNumber: null,
      parentSaveId: ROOT_ID,
      isRootSave: false,
      branchMeta: baseline.branchMeta,
      snapshot: workerSnapshot,
    });
    await expect(Promise.all([
      db.saves.get(ROOT_ID),
      db.saveIntegrityBackups.get(ROOT_ID),
      db.leaderboard.get('leaderboard-dynasty-1'),
    ])).resolves.toEqual(rootBefore);
    await expect(Promise.all([
      db.saves.get(BRANCH_ID), db.saveIntegrityBackups.get(BRANCH_ID),
    ])).resolves.toEqual([result, result]);
    await expect(assessSimAdvanceBaseline(BRANCH_ID, ROOT_ID, workerSnapshot)).resolves.toMatchObject({ kind: 'ready' });
  });

  it('mints a baseline attempt only after a successful seal is reassessed as ready', async () => {
    await saveGame(1, 'Earlier ready baseline', currentSnapshot());
    const earlier = await readySimAdvanceProof(currentSnapshot());
    await db.saves.put(rawRecord(
      ROOT_ID,
      snapshotFixture,
      { slotNumber: 1, parentSaveId: null, isRootSave: true, branchMeta: null },
    ));
    await db.saveIntegrityBackups.delete(ROOT_ID);
    const proof = await sealProof(ROOT_ID, ROOT_ID, currentSnapshot());

    await commitSimAdvanceBaselineSeal(proof, currentSnapshot());
    const reassessed = await assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, currentSnapshot());

    expect(reassessed.kind).toBe('ready');
    if (reassessed.kind === 'ready') {
      expect(reassessed.proof.attempt).toBe(earlier.attempt + 1);
    }
  });

  it('rejects a captured snapshot mismatch, including RNG-only mismatch, without changing any store', async () => {
    const workerSnapshot = currentSnapshot();
    await db.saves.put(rawRecord(
      ROOT_ID,
      snapshotFixture,
      { slotNumber: 1, parentSaveId: null, isRootSave: true, branchMeta: null },
    ));
    const proof = await sealProof(ROOT_ID, ROOT_ID, workerSnapshot);
    const before = await allDurableRows();
    const mismatch = parseGameSnapshot({
      ...workerSnapshot,
      rng: { ...workerSnapshot.rng, seed: workerSnapshot.rng.seed + 1 },
    });

    await expect(commitSimAdvanceBaselineSeal(proof, mismatch)).rejects.toThrow('does not equal');

    await expect(allDurableRows()).resolves.toEqual(before);
  });

  it.each([
    ['primary changed after proof', 'primary_changed'],
    ['shadow appeared for a no-shadow proof', 'shadow_appeared'],
    ['paired shadow disappeared', 'shadow_disappeared'],
    ['paired shadow changed', 'shadow_changed'],
  ] as const)('rejects when %s and leaves every durable row unchanged', async (_label, mutation) => {
    const workerSnapshot = currentSnapshot();
    const pairedProof = mutation === 'shadow_disappeared' || mutation === 'shadow_changed';
    const baseline = rawRecord(
      ROOT_ID,
      pairedProof ? v17SnapshotFixture : snapshotFixture,
      { slotNumber: 1, parentSaveId: null, isRootSave: true, branchMeta: null },
    );
    if (pairedProof) {
      await putExactSealedPair(baseline);
    } else {
      await db.saves.put(baseline);
    }
    const proofWorker = pairedProof
      ? materializedSnapshot(v17SnapshotFixture)
      : workerSnapshot;
    const proof = await sealProof(ROOT_ID, ROOT_ID, proofWorker);
    if (mutation === 'primary_changed') {
      await db.saves.put({ ...baseline, name: 'Changed after proof' });
    } else if (mutation === 'shadow_appeared') {
      await db.saveIntegrityBackups.put(await sealSaveRecord(baseline));
    } else if (mutation === 'shadow_disappeared') {
      await db.saveIntegrityBackups.delete(ROOT_ID);
    } else {
      const shadow = (await db.saveIntegrityBackups.get(ROOT_ID))!;
      await db.saveIntegrityBackups.put({ ...shadow, name: 'Changed shadow after proof' });
    }
    const before = await allDurableRows();

    await expect(commitSimAdvanceBaselineSeal(proof, proofWorker)).rejects.toThrow('baseline changed');

    await expect(allDurableRows()).resolves.toEqual(before);
  });

  it('rejects a branch seal when its root topology changes after assessment', async () => {
    const workerSnapshot = currentSnapshot();
    await saveGame(1, 'Branch root', workerSnapshot);
    const branch = rawRecord(
      BRANCH_ID,
      snapshotFixture,
      { slotNumber: null, parentSaveId: ROOT_ID, isRootSave: false, branchMeta: branchMetadata(workerSnapshot) },
    );
    await db.saves.put(branch);
    const proof = await sealProof(BRANCH_ID, ROOT_ID, workerSnapshot);
    const root = (await db.saves.get(ROOT_ID))!;
    await db.saves.put({ ...root, slotNumber: 2 });
    await db.saveIntegrityBackups.put({ ...root, slotNumber: 2 });
    const before = await allDurableRows();

    await expect(commitSimAdvanceBaselineSeal(proof, workerSnapshot)).rejects.toThrow('topology changed');

    await expect(allDurableRows()).resolves.toEqual(before);
  });

  it('rejects same-root journal evidence but ignores an unresolved intent in a distinct root tree', async () => {
    const workerSnapshot = currentSnapshot();
    await saveGame(1, 'Ready root for journal', workerSnapshot);
    const sameRootIntent = await prepareSimAdvanceIntent(
      await readySimAdvanceProof(workerSnapshot),
      'sim_day',
    );
    await db.saves.put(rawRecord(
      ROOT_ID,
      snapshotFixture,
      { slotNumber: 1, parentSaveId: null, isRootSave: true, branchMeta: null },
    ));
    await db.saveIntegrityBackups.delete(ROOT_ID);
    const sameRootProof = await sealProof(ROOT_ID, ROOT_ID, workerSnapshot);
    const sameRootBefore = await allDurableRows();

    await expect(commitSimAdvanceBaselineSeal(sameRootProof, workerSnapshot))
      .rejects.toThrow('unresolved simulation journal');
    await expect(allDurableRows()).resolves.toEqual(sameRootBefore);
    expect(await db.simAdvanceIntents.get(ROOT_ID)).toEqual(sameRootIntent);

    await db.simAdvanceIntents.clear();
    await db.saves.put(rawRecord(
      ROOT_ID,
      snapshotFixture,
      { slotNumber: 1, parentSaveId: null, isRootSave: true, branchMeta: null },
    ));
    await db.saveIntegrityBackups.delete(ROOT_ID);
    const distinctProof = await sealProof(ROOT_ID, ROOT_ID, workerSnapshot);
    await saveGame(2, 'Distinct ready root', workerSnapshot);
    const distinctIntent = await prepareSimAdvanceIntent(
      await assessSimAdvanceBaseline('save-slot-2', 'save-slot-2', workerSnapshot).then((assessment) => {
        if (assessment.kind !== 'ready') throw new Error('Expected distinct root to be ready.');
        return assessment.proof;
      }),
      'sim_day',
    );

    await expect(commitSimAdvanceBaselineSeal(distinctProof, workerSnapshot)).resolves.toMatchObject({ id: ROOT_ID });
    expect(await db.simAdvanceIntents.get('save-slot-2')).toEqual(distinctIntent);
  });

  it('fails before the writer on active/root ownership loss and atomically on an in-transaction reassertion loss', async () => {
    const workerSnapshot = currentSnapshot();
    await db.saves.put(rawRecord(
      ROOT_ID,
      snapshotFixture,
      { slotNumber: 1, parentSaveId: null, isRootSave: true, branchMeta: null },
    ));
    const proof = await sealProof(ROOT_ID, ROOT_ID, workerSnapshot);
    const before = await allDurableRows();
    vi.spyOn(saveSessionOwnership, 'assertActiveSaveSessionOwned')
      .mockImplementation(() => { throw new saveSessionOwnership.SaveSessionOwnershipError('not_owner', 'ownership lost', ROOT_ID); });

    await expect(commitSimAdvanceBaselineSeal(proof, workerSnapshot)).rejects.toThrow('ownership lost');
    await expect(allDurableRows()).resolves.toEqual(before);
    vi.restoreAllMocks();

    let activeAssertions = 0;
    vi.spyOn(saveSessionOwnership, 'assertActiveSaveSessionOwned').mockImplementation(() => {
      activeAssertions += 1;
      if (activeAssertions === 3) {
        throw new saveSessionOwnership.SaveSessionOwnershipError('not_owner', 'ownership lost in transaction', ROOT_ID);
      }
    });
    await expect(commitSimAdvanceBaselineSeal(proof, workerSnapshot)).rejects.toThrow('ownership lost in transaction');
    await expect(allDurableRows()).resolves.toEqual(before);
    vi.restoreAllMocks();

    vi.spyOn(saveSessionOwnership, 'assertSaveTreeSessionOwned')
      .mockImplementation(() => { throw new saveSessionOwnership.SaveSessionOwnershipError('not_owner', 'root ownership lost', ROOT_ID); });
    await expect(commitSimAdvanceBaselineSeal(proof, workerSnapshot)).rejects.toThrow('root ownership lost');
    await expect(allDurableRows()).resolves.toEqual(before);
    vi.restoreAllMocks();

    let rootAssertions = 0;
    vi.spyOn(saveSessionOwnership, 'assertSaveTreeSessionOwned').mockImplementation(() => {
      rootAssertions += 1;
      if (rootAssertions === 3) {
        throw new saveSessionOwnership.SaveSessionOwnershipError('not_owner', 'root ownership lost in transaction', ROOT_ID);
      }
    });
    await expect(commitSimAdvanceBaselineSeal(proof, workerSnapshot)).rejects.toThrow('root ownership lost in transaction');
    await expect(allDurableRows()).resolves.toEqual(before);
  });

  it('rolls back primary, shadow, leaderboard, and intents when the shadow put fails after primary write', async () => {
    const workerSnapshot = currentSnapshot();
    await db.saves.put(rawRecord(
      ROOT_ID,
      snapshotFixture,
      { slotNumber: 1, parentSaveId: null, isRootSave: true, branchMeta: null },
    ));
    const proof = await sealProof(ROOT_ID, ROOT_ID, workerSnapshot);
    const before = await allDurableRows();
    vi.spyOn(db.saveIntegrityBackups, 'put').mockRejectedValueOnce(new Error('forced shadow put failure'));

    await expect(commitSimAdvanceBaselineSeal(proof, workerSnapshot)).rejects.toThrow('forced shadow put failure');

    await expect(allDurableRows()).resolves.toEqual(before);
  });

  it('rejects a second seal from the same proof after the first committed baseline replacement', async () => {
    const workerSnapshot = currentSnapshot();
    await db.saves.put(rawRecord(
      ROOT_ID,
      snapshotFixture,
      { slotNumber: 1, parentSaveId: null, isRootSave: true, branchMeta: null },
    ));
    const proof = await sealProof(ROOT_ID, ROOT_ID, workerSnapshot);

    await commitSimAdvanceBaselineSeal(proof, workerSnapshot);
    const afterFirst = await allDurableRows();
    await expect(commitSimAdvanceBaselineSeal(proof, workerSnapshot)).rejects.toThrow('baseline changed');
    await expect(allDurableRows()).resolves.toEqual(afterFirst);
  });

  it('accepts only the exact issued seal proof and preserves it across precommit failure', async () => {
    const workerSnapshot = currentSnapshot();
    await db.saves.put(rawRecord(
      ROOT_ID,
      snapshotFixture,
      { slotNumber: 1, parentSaveId: null, isRootSave: true, branchMeta: null },
    ));
    const proof = await sealProof(ROOT_ID, ROOT_ID, workerSnapshot);
    const before = await allDurableRows();
    const shallowCopy = { ...proof } as typeof proof;
    const forgedMetadata = {
      ...proof,
      baseline: { ...proof.baseline, name: 'Forged baseline metadata' },
    } as typeof proof;
    const forgedWorker = parseGameSnapshot({
      ...workerSnapshot,
      rng: { ...workerSnapshot.rng, seed: workerSnapshot.rng.seed + 1 },
    });
    const forgedWorkerProof = { ...proof, workerSnapshot: forgedWorker } as typeof proof;

    await expect(commitSimAdvanceBaselineSeal(shallowCopy, workerSnapshot)).rejects.toThrow('exact issued');
    await expect(allDurableRows()).resolves.toEqual(before);
    await expect(commitSimAdvanceBaselineSeal(forgedMetadata, workerSnapshot)).rejects.toThrow('exact issued');
    await expect(allDurableRows()).resolves.toEqual(before);
    await expect(commitSimAdvanceBaselineSeal(forgedWorkerProof, forgedWorker)).rejects.toThrow('exact issued');
    await expect(allDurableRows()).resolves.toEqual(before);
    await expect(commitSimAdvanceBaselineSeal(proof, forgedWorker)).rejects.toThrow('does not equal');
    await expect(allDurableRows()).resolves.toEqual(before);

    await expect(commitSimAdvanceBaselineSeal(proof, workerSnapshot)).resolves.toMatchObject({ id: ROOT_ID });
  });

  it.each([
    ['active ownership', 'assertActiveSaveSessionOwned', 4],
    ['active ownership', 'assertActiveSaveSessionOwned', 5],
    ['active ownership', 'assertActiveSaveSessionOwned', 6],
    ['active ownership', 'assertActiveSaveSessionOwned', 7],
    ['root ownership', 'assertSaveTreeSessionOwned', 4],
    ['root ownership', 'assertSaveTreeSessionOwned', 5],
    ['root ownership', 'assertSaveTreeSessionOwned', 6],
    ['root ownership', 'assertSaveTreeSessionOwned', 7],
  ] as const)('rolls back every store when %s is lost at seal assertion #%s', async (_label, assertion, failureCall) => {
    const workerSnapshot = currentSnapshot();
    await db.saves.put(rawRecord(
      ROOT_ID,
      snapshotFixture,
      { slotNumber: 1, parentSaveId: null, isRootSave: true, branchMeta: null },
    ));
    const proof = await sealProof(ROOT_ID, ROOT_ID, workerSnapshot);
    const before = await allDurableRows();
    let calls = 0;
    vi.spyOn(saveSessionOwnership, assertion).mockImplementation(() => {
      calls += 1;
      if (calls === failureCall) {
        throw new saveSessionOwnership.SaveSessionOwnershipError('not_owner', `lost ${assertion} at ${failureCall}`, ROOT_ID);
      }
    });

    await expect(commitSimAdvanceBaselineSeal(proof, workerSnapshot)).rejects.toThrow(`lost ${assertion} at ${failureCall}`);

    await expect(allDurableRows()).resolves.toEqual(before);
  });

  it('reasserts after shadow before a branch can continue through the no-leaderboard path', async () => {
    const workerSnapshot = currentSnapshot();
    await saveGame(1, 'Branch root', workerSnapshot);
    await db.saves.put(rawRecord(
      BRANCH_ID,
      snapshotFixture,
      { slotNumber: null, parentSaveId: ROOT_ID, isRootSave: false, branchMeta: branchMetadata(workerSnapshot) },
    ));
    const proof = await sealProof(BRANCH_ID, ROOT_ID, workerSnapshot);
    const before = await allDurableRows();
    let activeAssertions = 0;
    vi.spyOn(saveSessionOwnership, 'assertActiveSaveSessionOwned').mockImplementation(() => {
      activeAssertions += 1;
      if (activeAssertions === 6) {
        throw new saveSessionOwnership.SaveSessionOwnershipError('not_owner', 'lost branch authority after shadow', ROOT_ID);
      }
    });

    await expect(commitSimAdvanceBaselineSeal(proof, workerSnapshot)).rejects.toThrow('lost branch authority after shadow');

    await expect(allDurableRows()).resolves.toEqual(before);
  });

  it.each([
    ['malformed exact-save intent', { saveId: ROOT_ID, rootSaveId: 'malformed-root', invalid: true }],
    ['wrong-root exact-save intent', { saveId: ROOT_ID, rootSaveId: 'save-slot-2', invalid: true }],
  ] as const)('blocks %s through the exact intent lookup without mutation', async (_label, malformedIntent) => {
    const workerSnapshot = currentSnapshot();
    await db.saves.put(rawRecord(
      ROOT_ID,
      snapshotFixture,
      { slotNumber: 1, parentSaveId: null, isRootSave: true, branchMeta: null },
    ));
    const proof = await sealProof(ROOT_ID, ROOT_ID, workerSnapshot);
    await db.simAdvanceIntents.put(malformedIntent as never);
    const before = await allDurableRows();

    await expect(commitSimAdvanceBaselineSeal(proof, workerSnapshot)).rejects.toThrow('unresolved simulation journal');

    await expect(allDurableRows()).resolves.toEqual(before);
  });

  it('rolls back a leaderboard write failure and retries the same issued proof successfully', async () => {
    const workerSnapshot = currentSnapshot();
    await db.saves.put(rawRecord(
      ROOT_ID,
      snapshotFixture,
      { slotNumber: 1, parentSaveId: null, isRootSave: true, branchMeta: null },
    ));
    const proof = await sealProof(ROOT_ID, ROOT_ID, workerSnapshot);
    const before = await allDurableRows();
    vi.spyOn(db.leaderboard, 'put').mockRejectedValueOnce(new Error('forced leaderboard seal failure'));

    await expect(commitSimAdvanceBaselineSeal(proof, workerSnapshot)).rejects.toThrow('forced leaderboard seal failure');
    await expect(allDurableRows()).resolves.toEqual(before);
    vi.restoreAllMocks();

    await expect(commitSimAdvanceBaselineSeal(proof, workerSnapshot)).resolves.toMatchObject({ id: ROOT_ID });
    expect(await db.simAdvanceIntents.count()).toBe(0);
  });
});
