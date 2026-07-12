// @vitest-environment node

import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CURRENT_GAME_SNAPSHOT_VERSION,
  MINIMUM_SUPPORTED_GAME_SNAPSHOT_VERSION,
  parseGameSnapshot,
  type GameSnapshot,
} from '@mbd/contracts';
import currentSnapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v34/core.json';
import v17SnapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v17/core.json';
import deepV33SnapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v33/season10.json';
import { materializeSimulationImportDefaults } from '@mbd/sim-core';
import {
  buildLeaderboardEntry,
  assessSimAdvanceBaseline,
  clearAllSaves,
  consumeSimAdvanceIntentRollback,
  createBranchSave,
  db,
  deleteSaveById,
  exportSnapshotToJson,
  importSnapshotFromJson,
  listRootSaves,
  listSaveTree,
  listSaveTreeChildIds,
  loadSaveSafely,
  repairSave,
  prepareSimAdvanceIntent,
  readSimAdvanceIntentBaseline,
  restoreSaveIntegrityBackup,
  saveGame,
  saveGameById,
  type LeaderboardEntry,
  type SaveData,
} from './saveSystem';
import {
  canonicalizeSaveIntegrityValue,
  sealSaveRecord,
  verifySaveRecordIntegrity,
} from './saveIntegrity';

const ROOT_ID = 'save-slot-1';
const OTHER_ROOT_ID = 'save-slot-2';

function materializedSnapshot(snapshot: unknown): GameSnapshot {
  return materializeSimulationImportDefaults(parseGameSnapshot(snapshot));
}

function currentSnapshot(): GameSnapshot {
  return materializedSnapshot(currentSnapshotFixture);
}

function rootWriteMetadata(slotNumber = 1) {
  return {
    slotNumber,
    parentSaveId: null,
    isRootSave: true,
    branchMeta: null,
  } as const;
}

function unsealedFixtureRecord(
  slotNumber: number,
  name: string,
  snapshot: unknown,
): SaveData {
  const fixture = snapshot as {
    schemaVersion: number;
    season: number;
    day: number;
    phase: SaveData['phase'];
  };
  const timestamp = `2025-0${slotNumber}-02T03:04:05.000Z`;

  return {
    id: `save-slot-${slotNumber}`,
    slotNumber,
    name,
    season: fixture.season,
    day: fixture.day,
    phase: fixture.phase,
    schemaVersion: fixture.schemaVersion,
    hasSnapshot: true,
    snapshot: snapshot as GameSnapshot,
    legacyState: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    parentSaveId: null,
    isRootSave: true,
    branchMeta: null,
  };
}

async function putSealedExactPair(record: SaveData): Promise<SaveData> {
  const sealed = await sealSaveRecord(record);
  await db.saves.put(sealed);
  await db.saveIntegrityBackups.put(sealed);
  return sealed;
}

function branchFixtureRecord(snapshot: unknown): SaveData {
  return {
    ...unsealedFixtureRecord(1, 'Branch baseline', snapshot),
    id: 'branch-1',
    slotNumber: null,
    parentSaveId: ROOT_ID,
    isRootSave: false,
    branchMeta: null,
  };
}

function rngOnlyMismatch(snapshot: GameSnapshot): GameSnapshot {
  return parseGameSnapshot({
    ...snapshot,
    rng: { ...snapshot.rng, seed: snapshot.rng.seed + 1 },
  });
}

async function expectValidPrimaryShadowPair(saveId: string): Promise<{
  primary: SaveData;
  shadow: SaveData;
}> {
  const [primary, shadow] = await Promise.all([
    db.saves.get(saveId),
    db.saveIntegrityBackups.get(saveId),
  ]);

  expect(primary).toBeDefined();
  expect(shadow).toBeDefined();
  expect(shadow).toEqual(primary);
  await expect(verifySaveRecordIntegrity(primary!)).resolves.toMatchObject({
    status: 'valid',
    checksum: primary!.integrity?.checksum,
  });
  await expect(verifySaveRecordIntegrity(shadow!)).resolves.toMatchObject({
    status: 'valid',
    checksum: shadow!.integrity?.checksum,
  });

  return { primary: primary!, shadow: shadow! };
}

async function corruptBothBranchCopies(branch: SaveData): Promise<void> {
  await db.saves.put({
    ...branch,
    name: 'Untrusted branch primary',
    parentSaveId: null,
    branchMeta: null,
  });
  await db.saveIntegrityBackups.put({
    ...branch,
    name: 'Untrusted branch shadow',
    parentSaveId: null,
    branchMeta: null,
  });
}

describe('saveSystem persisted integrity', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    db.close();
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    db.close();
    await db.delete();
  });

  it('upgrades a real Dexie v5 database by adding an empty journal store without rewriting saved rows', async () => {
    db.close();
    await db.delete();
    const currentRecord = await sealSaveRecord(unsealedFixtureRecord(1, 'Current v34 Primary', currentSnapshotFixture));
    const oldRecord = await sealSaveRecord(unsealedFixtureRecord(2, 'Old v17 Primary', v17SnapshotFixture));
    const leaderboard = buildLeaderboardEntry(
      1,
      currentSnapshot(),
      currentRecord.updatedAt,
    );
    const currentBytes = JSON.stringify(currentRecord);
    const oldBytes = JSON.stringify(oldRecord);
    const leaderboardBytes = JSON.stringify(leaderboard);
    const legacyDb = new Dexie('mbd-saves');
    legacyDb.version(5).stores({
      saves: 'id, slotNumber, parentSaveId, updatedAt, hasSnapshot',
      saveIntegrityBackups: 'id, parentSaveId, updatedAt',
      leaderboard: 'id, slotNumber, scenarioId, score, updatedAt',
    });

    try {
      await legacyDb.open();
      expect(legacyDb.verno).toBe(5);
      expect(legacyDb.tables.map((table) => table.name).sort()).toEqual([
        'leaderboard',
        'saveIntegrityBackups',
        'saves',
      ]);
      await legacyDb.table<SaveData, string>('saves').bulkPut([
        currentRecord,
        oldRecord,
      ]);
      await legacyDb.table<SaveData, string>('saveIntegrityBackups').bulkPut([
        currentRecord,
        oldRecord,
      ]);
      await legacyDb.table<LeaderboardEntry, string>('leaderboard').put(leaderboard);
    } finally {
      legacyDb.close();
    }

    await db.open();

    expect(db.verno).toBe(6);
    expect(db.tables.map((table) => table.name).sort()).toEqual([
      'leaderboard',
      'saveIntegrityBackups',
      'saves',
      'simAdvanceIntents',
    ]);
    const [persistedCurrent, persistedOld, persistedLeaderboard] = await Promise.all([
      db.saves.get(currentRecord.id),
      db.saves.get(oldRecord.id),
      db.leaderboard.get(leaderboard.id),
    ]);
    expect(JSON.stringify(persistedCurrent)).toBe(currentBytes);
    expect(JSON.stringify(persistedOld)).toBe(oldBytes);
    expect(JSON.stringify(persistedLeaderboard)).toBe(leaderboardBytes);
    expect(persistedCurrent?.updatedAt).toBe(currentRecord.updatedAt);
    expect(persistedOld?.updatedAt).toBe(oldRecord.updatedAt);
    expect(persistedLeaderboard?.updatedAt).toBe(leaderboard.updatedAt);
    expect(JSON.stringify(await db.saveIntegrityBackups.get(currentRecord.id))).toBe(currentBytes);
    expect(JSON.stringify(await db.saveIntegrityBackups.get(oldRecord.id))).toBe(oldBytes);
    expect(await db.simAdvanceIntents.count()).toBe(0);

    await expect(loadSaveSafely(currentRecord.id)).resolves.toMatchObject({
      ok: true,
      snapshot: {
        schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
        season: currentSnapshotFixture.season,
      },
      save: {
        updatedAt: currentRecord.updatedAt,
      },
    });
    await expect(loadSaveSafely(oldRecord.id)).resolves.toMatchObject({
      ok: true,
      snapshot: {
        schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
        season: v17SnapshotFixture.season,
      },
      save: {
        updatedAt: oldRecord.updatedAt,
      },
    });
    expect(JSON.stringify(await db.saves.get(currentRecord.id))).toBe(currentBytes);
    expect(JSON.stringify(await db.saves.get(oldRecord.id))).toBe(oldBytes);
    expect(JSON.stringify(await db.leaderboard.get(leaderboard.id))).toBe(leaderboardBytes);
    expect(JSON.stringify(await db.saveIntegrityBackups.get(currentRecord.id))).toBe(currentBytes);
    expect(JSON.stringify(await db.saveIntegrityBackups.get(oldRecord.id))).toBe(oldBytes);
    expect(await db.simAdvanceIntents.count()).toBe(0);
  });

  it('still opens a direct v4 checksumless/no-shadow database through the v5 and v6 declarations', async () => {
    db.close();
    await db.delete();
    const currentRecord = unsealedFixtureRecord(1, 'Direct v4 Current', currentSnapshotFixture);
    const oldRecord = unsealedFixtureRecord(2, 'Direct v4 Old', v17SnapshotFixture);
    const leaderboard = buildLeaderboardEntry(1, currentSnapshot(), currentRecord.updatedAt);
    const currentBytes = JSON.stringify(currentRecord);
    const oldBytes = JSON.stringify(oldRecord);
    const leaderboardBytes = JSON.stringify(leaderboard);
    const legacyDb = new Dexie('mbd-saves');
    legacyDb.version(4).stores({
      saves: 'id, slotNumber, parentSaveId, updatedAt, hasSnapshot',
      leaderboard: 'id, slotNumber, scenarioId, score, updatedAt',
    });

    try {
      await legacyDb.open();
      await legacyDb.table<SaveData, string>('saves').bulkPut([currentRecord, oldRecord]);
      await legacyDb.table<LeaderboardEntry, string>('leaderboard').put(leaderboard);
    } finally {
      legacyDb.close();
    }

    await db.open();
    expect(db.verno).toBe(6);
    expect(db.tables.map((table) => table.name).sort()).toEqual([
      'leaderboard',
      'saveIntegrityBackups',
      'saves',
      'simAdvanceIntents',
    ]);
    await expect(loadSaveSafely(currentRecord.id)).resolves.toMatchObject({
      ok: true,
      snapshot: { schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION },
    });
    await expect(loadSaveSafely(oldRecord.id)).resolves.toMatchObject({
      ok: true,
      snapshot: { schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION },
    });
    expect(JSON.stringify(await db.saves.get(currentRecord.id))).toBe(currentBytes);
    expect(JSON.stringify(await db.saves.get(oldRecord.id))).toBe(oldBytes);
    expect(JSON.stringify(await db.leaderboard.get(leaderboard.id))).toBe(leaderboardBytes);
    expect(await db.saveIntegrityBackups.count()).toBe(0);
    expect(await db.simAdvanceIntents.count()).toBe(0);
  });

  it('supports a v5-aware rollback tombstone before any legacy writer is re-enabled', async () => {
    const rollbackTarget = await saveGame(1, 'Rollback Target', currentSnapshot());
    const untouched = await saveGame(2, 'Untouched Sealed Save', currentSnapshot());

    // The documented emergency rollback first clears every shadow in a
    // v5-aware transaction. Only then may an older writer that omits integrity
    // touch primaries; otherwise a later re-upgrade would see stale shadows.
    await db.transaction('rw', db.saveIntegrityBackups, async () => {
      await db.saveIntegrityBackups.clear();
    });
    db.close();

    const rollbackDb = new Dexie('mbd-saves');
    rollbackDb.version(4).stores({
      saves: 'id, slotNumber, parentSaveId, updatedAt, hasSnapshot',
      leaderboard: 'id, slotNumber, scenarioId, score, updatedAt',
    });
    try {
      await rollbackDb.open();
      const legacySaves = rollbackDb.table<SaveData, string>('saves');
      const current = await legacySaves.get(ROOT_ID);
      const { integrity: _integrity, ...legacyWrite } = current!;
      await legacySaves.put({
        ...legacyWrite,
        name: 'Written During Safe Rollback',
      } as SaveData);
    } finally {
      rollbackDb.close();
    }

    await db.open();

    expect(await db.saveIntegrityBackups.count()).toBe(0);
    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
      ok: true,
      save: {
        name: 'Written During Safe Rollback',
        updatedAt: rollbackTarget.updatedAt,
      },
    });
    await expect(loadSaveSafely(OTHER_ROOT_ID)).resolves.toMatchObject({
      ok: true,
      save: {
        name: untouched.name,
        updatedAt: untouched.updatedAt,
      },
    });
    await expect(verifySaveRecordIntegrity((await db.saves.get(OTHER_ROOT_ID))!)).resolves.toMatchObject({
      status: 'valid',
    });
  });

  it('atomically writes an identical valid primary and shadow with the leaderboard timestamp', async () => {
    const written = await saveGame(1, 'Integrity Root', currentSnapshot());
    const { primary, shadow } = await expectValidPrimaryShadowPair(ROOT_ID);
    const leaderboard = await db.leaderboard.get('leaderboard-dynasty-1');

    expect(primary).toEqual(written);
    expect(shadow).toEqual(written);
    expect(leaderboard).toBeDefined();
    expect(leaderboard?.updatedAt).toBe(written.updatedAt);
  });

  const mismatchCases: Array<{
    label: string;
    tamper: (record: SaveData) => SaveData;
  }> = [
    {
      label: 'an invalid snapshot field',
      tamper: (record) => ({
        ...record,
        snapshot: {
          ...record.snapshot!,
          players: 'not-an-array',
        } as unknown as GameSnapshot,
      }),
    },
    {
      label: 'envelope metadata',
      tamper: (record) => ({
        ...record,
        name: 'Name changed outside MBD',
      }),
    },
    {
      label: 'the checksum',
      tamper: (record) => ({
        ...record,
        integrity: {
          ...record.integrity!,
          checksum: '0'.repeat(64),
        },
      }),
    },
  ];

  it.each(mismatchCases)(
    'rejects $label as an integrity failure before snapshot parsing and retains repair evidence',
    async ({ tamper }) => {
      const written = await saveGame(1, 'Integrity Root', currentSnapshot());
      const tampered = tamper(written);
      await db.saves.put(tampered);

      const directVerification = await verifySaveRecordIntegrity(tampered);
      expect(directVerification).toMatchObject({
        status: 'invalid',
        reason: 'mismatch',
      });
      if (directVerification.status !== 'invalid' || directVerification.reason !== 'mismatch') {
        throw new Error('The hostile fixture must be an integrity mismatch.');
      }

      const result = await loadSaveSafely(ROOT_ID);
      expect(result).toMatchObject({
        ok: false,
        reason: 'integrity_failed',
        detail: {
          integrityFailureKind: 'mismatch',
          expectedChecksum: directVerification.expectedChecksum,
          actualChecksum: directVerification.actualChecksum,
          repairAvailable: true,
          repairUpdatedAt: written.updatedAt,
        },
      });
      if (result.ok) {
        throw new Error('A tampered save must not load.');
      }
      expect(result.detail.expectedChecksum).not.toBe(result.detail.actualChecksum);
    },
  );

  it('rejects a valid same-ID shadow copied from a prior save generation without mutating the primary', async () => {
    const priorGeneration = await saveGame(1, 'Prior Generation', currentSnapshot());
    const currentGeneration = await saveGame(1, 'Current Generation', parseGameSnapshot({
      ...currentSnapshot(),
      day: currentSnapshot().day + 1,
    }));
    expect(priorGeneration.integrity?.checksum).not.toBe(currentGeneration.integrity?.checksum);

    const damagedCurrent: SaveData = {
      ...currentGeneration,
      name: 'Damaged Current Generation',
    };
    await db.saves.put(damagedCurrent);
    await db.saveIntegrityBackups.put(priorGeneration);
    await expect(verifySaveRecordIntegrity(priorGeneration)).resolves.toMatchObject({
      status: 'valid',
      checksum: priorGeneration.integrity?.checksum,
    });
    const primaryBefore = await db.saves.get(ROOT_ID);
    const shadowBefore = await db.saveIntegrityBackups.get(ROOT_ID);
    const leaderboardBefore = await db.leaderboard.get('leaderboard-dynasty-1');

    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
      ok: false,
      reason: 'integrity_failed',
      detail: {
        integrityFailureKind: 'mismatch',
        repairAvailable: false,
      },
    });
    await expect(restoreSaveIntegrityBackup(ROOT_ID)).rejects.toThrow(
      'The recovery copy does not match the damaged save generation. Nothing was restored.',
    );

    expect(await db.saves.get(ROOT_ID)).toEqual(primaryBefore);
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(shadowBefore);
    expect(await db.leaderboard.get('leaderboard-dynasty-1')).toEqual(leaderboardBefore);
  });

  it('keeps checksum-only tampering repairable when the recomputed primary checksum matches the shadow', async () => {
    const written = await saveGame(1, 'Checksum Generation', currentSnapshot());
    const shadow = await db.saveIntegrityBackups.get(ROOT_ID);
    expect(shadow).toEqual(written);
    const checksumTampered: SaveData = {
      ...written,
      integrity: {
        ...written.integrity!,
        checksum: '0'.repeat(64),
      },
    };
    await db.saves.put(checksumTampered);

    const verification = await verifySaveRecordIntegrity(checksumTampered);
    expect(verification).toMatchObject({
      status: 'invalid',
      reason: 'mismatch',
      expectedChecksum: '0'.repeat(64),
      actualChecksum: shadow?.integrity?.checksum,
    });
    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
      ok: false,
      reason: 'integrity_failed',
      detail: {
        repairAvailable: true,
        expectedChecksum: '0'.repeat(64),
        actualChecksum: shadow?.integrity?.checksum,
      },
    });

    await expect(restoreSaveIntegrityBackup(ROOT_ID)).resolves.toEqual(shadow);
    expect(await db.saves.get(ROOT_ID)).toEqual(shadow);
    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({ ok: true });
  });

  it('keeps snapshot tampering repairable when the stored primary checksum matches the shadow', async () => {
    const written = await saveGame(1, 'Snapshot Generation', currentSnapshot());
    const shadow = await db.saveIntegrityBackups.get(ROOT_ID);
    expect(shadow).toEqual(written);
    const snapshotTampered: SaveData = {
      ...written,
      snapshot: {
        ...written.snapshot!,
        day: written.snapshot!.day + 1,
      },
    };
    await db.saves.put(snapshotTampered);

    const verification = await verifySaveRecordIntegrity(snapshotTampered);
    expect(verification).toMatchObject({
      status: 'invalid',
      reason: 'mismatch',
      expectedChecksum: shadow?.integrity?.checksum,
    });
    if (verification.status !== 'invalid' || verification.reason !== 'mismatch') {
      throw new Error('The hostile snapshot fixture must be an integrity mismatch.');
    }
    expect(verification.actualChecksum).not.toBe(shadow?.integrity?.checksum);
    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
      ok: false,
      reason: 'integrity_failed',
      detail: {
        repairAvailable: true,
        expectedChecksum: shadow?.integrity?.checksum,
        actualChecksum: verification.actualChecksum,
      },
    });

    await expect(restoreSaveIntegrityBackup(ROOT_ID)).resolves.toEqual(shadow);
    expect(await db.saves.get(ROOT_ID)).toEqual(shadow);
    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({ ok: true });
  });

  it('repairs a primary that lost a required projected field using its intact stored checksum', async () => {
    const written = await saveGame(1, 'Field Loss Generation', currentSnapshot());
    const shadow = await db.saveIntegrityBackups.get(ROOT_ID);
    const { name: _missingName, ...missingName } = written;
    await db.saves.put(missingName as SaveData);

    await expect(verifySaveRecordIntegrity(missingName as SaveData)).resolves.toMatchObject({
      status: 'invalid',
      reason: 'malformed',
      expectedChecksum: shadow?.integrity?.checksum,
    });
    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
      ok: false,
      reason: 'integrity_failed',
      detail: {
        integrityFailureKind: 'malformed',
        repairAvailable: true,
        repairUpdatedAt: shadow?.updatedAt,
      },
    });

    await expect(restoreSaveIntegrityBackup(ROOT_ID)).resolves.toEqual(shadow);
    expect(await db.saves.get(ROOT_ID)).toEqual(shadow);
    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({ ok: true });
  });

  it.each([
    ['malformed', { checksum: 'not-a-sha-256-checksum' }, true],
    ['unsupported', { version: 999 }, false],
  ] as const)(
    'classifies a $0 integrity envelope before parsing and reports honest repair availability',
    async (kind, metadataChange, repairAvailable) => {
      const written = await saveGame(1, 'Envelope Classification', currentSnapshot());
      await db.saves.put({
        ...written,
        integrity: {
          ...written.integrity!,
          ...metadataChange,
        },
      } as SaveData);

      await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
        ok: false,
        reason: 'integrity_failed',
        detail: {
          integrityFailureKind: kind,
          repairAvailable,
        },
      });
    },
  );

  it('treats a missing primary seal as corruption when the protected shadow still exists', async () => {
    const written = await saveGame(1, 'Protected Root', currentSnapshot());
    const { integrity: _integrity, ...unsealed } = written;
    await db.saves.put(unsealed as SaveData);

    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
      ok: false,
      reason: 'integrity_failed',
      detail: {
        integrityFailureKind: 'missing',
        repairAvailable: true,
        repairUpdatedAt: written.updatedAt,
      },
    });
  });

  it('blocks overwrite and explicitly restores an exact valid shadow when the primary row is missing', async () => {
    const written = await saveGame(1, 'Missing Primary Root', currentSnapshot());
    const shadow = await db.saveIntegrityBackups.get(ROOT_ID);
    const leaderboard = await db.leaderboard.get('leaderboard-dynasty-1');
    expect(shadow).toEqual(written);
    await db.saves.delete(ROOT_ID);

    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
      ok: false,
      reason: 'integrity_failed',
      detail: {
        integrityFailureKind: 'missing',
        repairAvailable: true,
        repairUpdatedAt: written.updatedAt,
      },
    });
    await expect(saveGameById(
      ROOT_ID,
      'Must Not Replace Missing Primary',
      parseGameSnapshot({
        ...currentSnapshot(),
        day: written.day + 1,
      }),
      rootWriteMetadata(),
    )).rejects.toMatchObject({
      name: 'SaveIntegrityError',
      kind: 'missing',
    });
    expect(await db.saves.get(ROOT_ID)).toBeUndefined();
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(shadow);

    const restored = await restoreSaveIntegrityBackup(ROOT_ID);

    expect(restored).toEqual(shadow);
    expect(restored.updatedAt).toBe(written.updatedAt);
    expect(restored.snapshot).toEqual(written.snapshot);
    expect(await db.saves.get(ROOT_ID)).toEqual(shadow);
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(shadow);
    expect(await db.leaderboard.get('leaderboard-dynasty-1')).toEqual(leaderboard);
    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
      ok: true,
      snapshot: written.snapshot,
      save: {
        updatedAt: written.updatedAt,
      },
    });
  });

  it.each([
    ['current v34', 1, currentSnapshotFixture],
    ['old v17', 2, v17SnapshotFixture],
    ['deep Season-10 v33', 3, deepV33SnapshotFixture],
  ] as const)(
    'loads a checksumless/no-shadow $0 fixture without mutating its persisted record',
    async (_label, slotNumber, fixture) => {
      const record = unsealedFixtureRecord(slotNumber, `Unsealed ${slotNumber}`, fixture);
      await db.saves.put(record);
      const before = await db.saves.get(record.id);

      const result = await loadSaveSafely(record.id);

      expect(result).toMatchObject({
        ok: true,
        snapshot: {
          schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
          season: fixture.season,
          day: fixture.day,
        },
        save: {
          id: record.id,
          updatedAt: record.updatedAt,
        },
      });
      expect(await db.saves.get(record.id)).toEqual(before);
      expect(await db.saveIntegrityBackups.get(record.id)).toBeUndefined();

      if (!result.ok) {
        throw new Error('The checksumless fixture must load before its explicit write.');
      }
      const protectedWrite = await saveGameById(
        record.id,
        record.name,
        result.snapshot,
        rootWriteMetadata(slotNumber),
      );
      const pair = await expectValidPrimaryShadowPair(record.id);
      expect(pair.primary).toEqual(protectedWrite);
      expect(pair.primary.snapshot?.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    },
  );

  it('keeps canonical export snapshot-only and protects the imported slot on write', async () => {
    const exported = exportSnapshotToJson('Imported Dynasty', currentSnapshot());
    const parsedExport = JSON.parse(exported) as Record<string, unknown>;
    expect(parsedExport).not.toHaveProperty('integrity');
    expect(parsedExport).not.toHaveProperty('id');
    const imported = importSnapshotFromJson(exported);

    const written = await saveGame(4, imported.name, imported.snapshot);

    const pair = await expectValidPrimaryShadowPair('save-slot-4');
    expect(pair.primary).toEqual(written);
    expect(pair.primary.snapshot).toEqual(imported.snapshot);
  });

  it('restores the exact verified shadow and original time, rebuilds the leaderboard, and then loads safely', async () => {
    const written = await saveGame(1, 'Before Damage', currentSnapshot());
    const originalShadow = await db.saveIntegrityBackups.get(ROOT_ID);
    const originalLeaderboard = await db.leaderboard.get('leaderboard-dynasty-1');
    expect(originalShadow).toEqual(written);
    expect(originalLeaderboard).toBeDefined();

    const damaged: SaveData = {
      ...written,
      name: 'Damaged primary',
      day: written.day + 9,
      updatedAt: '2099-12-31T23:59:59.999Z',
    };
    await db.saves.put(damaged);
    await db.leaderboard.put({
      ...originalLeaderboard!,
      gmName: 'Wrong GM',
      score: -999,
      updatedAt: damaged.updatedAt,
    });

    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
      ok: false,
      reason: 'integrity_failed',
      detail: {
        repairAvailable: true,
        repairUpdatedAt: written.updatedAt,
      },
    });

    const restored = await restoreSaveIntegrityBackup(ROOT_ID);

    expect(restored).toEqual(originalShadow);
    expect(restored.updatedAt).toBe(written.updatedAt);
    expect(await db.saves.get(ROOT_ID)).toEqual(originalShadow);
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(originalShadow);
    expect(await db.leaderboard.get('leaderboard-dynasty-1')).toEqual(originalLeaderboard);
    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
      ok: true,
      snapshot: written.snapshot,
      save: {
        id: ROOT_ID,
        updatedAt: written.updatedAt,
      },
    });
  });

  it('restores only the damaged branch and leaves its root pair and leaderboard byte-identical', async () => {
    await saveGame(1, 'Branch Restore Root', currentSnapshot());
    const { branch } = await createBranchSave(
      ROOT_ID,
      currentSnapshot(),
      'Branch Restore Target',
    );
    const rootPrimaryBefore = await db.saves.get(ROOT_ID);
    const rootShadowBefore = await db.saveIntegrityBackups.get(ROOT_ID);
    const leaderboardBefore = await db.leaderboard.get('leaderboard-dynasty-1');
    const branchShadow = await db.saveIntegrityBackups.get(branch.id);
    await db.saves.put({
      ...branch,
      name: 'Damaged Branch Primary',
      parentSaveId: OTHER_ROOT_ID,
    });

    await expect(loadSaveSafely(branch.id)).resolves.toMatchObject({
      ok: false,
      reason: 'integrity_failed',
      detail: { repairAvailable: true },
    });
    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({ ok: true });

    const restored = await restoreSaveIntegrityBackup(branch.id);

    expect(restored).toEqual(branchShadow);
    expect(restored.id).toBe(branch.id);
    expect(restored.parentSaveId).toBe(ROOT_ID);
    expect(restored.updatedAt).toBe(branch.updatedAt);
    expect(await db.saves.get(branch.id)).toEqual(branchShadow);
    expect(await db.saveIntegrityBackups.get(branch.id)).toEqual(branchShadow);
    expect(await db.saves.get(ROOT_ID)).toEqual(rootPrimaryBefore);
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(rootShadowBefore);
    expect(await db.leaderboard.get('leaderboard-dynasty-1')).toEqual(leaderboardBefore);
    await expect(loadSaveSafely(branch.id)).resolves.toMatchObject({ ok: true });
    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({ ok: true });
  });

  it('rolls back every row when a restore transaction fails after the primary put', async () => {
    const written = await saveGame(1, 'Restore Rollback Root', currentSnapshot());
    const shadowBefore = await db.saveIntegrityBackups.get(ROOT_ID);
    const leaderboardBefore = await db.leaderboard.get('leaderboard-dynasty-1');
    const damaged: SaveData = {
      ...written,
      name: 'Damaged Before Failed Restore',
    };
    await db.saves.put(damaged);
    const primaryBefore = await db.saves.get(ROOT_ID);
    vi.spyOn(db.saveIntegrityBackups, 'put').mockRejectedValueOnce(
      new Error('Forced restore shadow failure'),
    );

    await expect(restoreSaveIntegrityBackup(ROOT_ID)).rejects.toThrow(
      'Forced restore shadow failure',
    );

    expect(await db.saves.get(ROOT_ID)).toEqual(primaryBefore);
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(shadowBefore);
    expect(await db.leaderboard.get('leaderboard-dynasty-1')).toEqual(leaderboardBefore);
  });

  it.each(['missing', 'invalid'] as const)(
    'does not mutate a damaged primary when its shadow is $0',
    async (shadowState) => {
      const written = await saveGame(1, 'Before Damage', currentSnapshot());
      const damaged: SaveData = {
        ...written,
        name: 'Damaged primary',
      };
      await db.saves.put(damaged);

      if (shadowState === 'missing') {
        await db.saveIntegrityBackups.delete(ROOT_ID);
      } else {
        await db.saveIntegrityBackups.put({
          ...written,
          name: 'Damaged shadow',
        });
      }

      const primaryBefore = await db.saves.get(ROOT_ID);
      const shadowBefore = await db.saveIntegrityBackups.get(ROOT_ID);
      const leaderboardBefore = await db.leaderboard.get('leaderboard-dynasty-1');

      await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
        ok: false,
        reason: 'integrity_failed',
        detail: {
          repairAvailable: false,
        },
      });
      await expect(restoreSaveIntegrityBackup(ROOT_ID)).rejects.toThrow(
        shadowState === 'missing'
          ? 'No verified copy is available'
          : 'The recovery copy no longer verifies',
      );

      expect(await db.saves.get(ROOT_ID)).toEqual(primaryBefore);
      expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(shadowBefore);
      expect(await db.leaderboard.get('leaderboard-dynasty-1')).toEqual(leaderboardBefore);
    },
  );

  it('rolls back the primary and leaderboard when the shadow write fails', async () => {
    const original = await saveGame(1, 'Durable Original', currentSnapshot());
    const primaryBefore = await db.saves.get(ROOT_ID);
    const shadowBefore = await db.saveIntegrityBackups.get(ROOT_ID);
    const leaderboardBefore = await db.leaderboard.get('leaderboard-dynasty-1');
    const shadowFailure = new Error('Forced shadow write failure');
    vi.spyOn(db.saveIntegrityBackups, 'put').mockRejectedValueOnce(shadowFailure);
    const newerSnapshot = parseGameSnapshot({
      ...currentSnapshot(),
      day: original.day + 1,
    });

    await expect(saveGameById(
      ROOT_ID,
      'Must Roll Back',
      newerSnapshot,
      rootWriteMetadata(),
    )).rejects.toThrow('Forced shadow write failure');

    expect(await db.saves.get(ROOT_ID)).toEqual(primaryBefore);
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(shadowBefore);
    expect(await db.leaderboard.get('leaderboard-dynasty-1')).toEqual(leaderboardBefore);
  });

  it('rolls back the primary and shadow when the derived leaderboard write fails', async () => {
    const original = await saveGame(1, 'Leaderboard Rollback Original', currentSnapshot());
    const primaryBefore = await db.saves.get(ROOT_ID);
    const shadowBefore = await db.saveIntegrityBackups.get(ROOT_ID);
    const leaderboardBefore = await db.leaderboard.get('leaderboard-dynasty-1');
    vi.spyOn(db.leaderboard, 'put').mockRejectedValueOnce(
      new Error('Forced leaderboard failure'),
    );

    await expect(saveGameById(
      ROOT_ID,
      'Leaderboard Must Roll Back',
      parseGameSnapshot({ ...currentSnapshot(), day: original.day + 1 }),
      rootWriteMetadata(),
    )).rejects.toThrow('Forced leaderboard failure');

    expect(await db.saves.get(ROOT_ID)).toEqual(primaryBefore);
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(shadowBefore);
    expect(await db.leaderboard.get('leaderboard-dynasty-1')).toEqual(leaderboardBefore);
  });

  it('rolls back branch and parent primary-shadow rows when the child shadow write fails', async () => {
    await saveGame(1, 'Branch Rollback Root', currentSnapshot());
    const rootPrimaryBefore = await db.saves.get(ROOT_ID);
    const rootShadowBefore = await db.saveIntegrityBackups.get(ROOT_ID);
    const leaderboardBefore = await db.leaderboard.get('leaderboard-dynasty-1');
    const primaryIdsBefore = await db.saves.toCollection().primaryKeys();
    vi.spyOn(db.saveIntegrityBackups, 'put').mockRejectedValueOnce(
      new Error('Forced branch shadow failure'),
    );

    await expect(createBranchSave(
      ROOT_ID,
      currentSnapshot(),
      'Branch Must Roll Back',
    )).rejects.toThrow('Forced branch shadow failure');

    expect(await db.saves.toCollection().primaryKeys()).toEqual(primaryIdsBefore);
    expect(await db.saves.get(ROOT_ID)).toEqual(rootPrimaryBefore);
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(rootShadowBefore);
    expect(await db.saveIntegrityBackups.count()).toBe(1);
    expect(await db.leaderboard.get('leaderboard-dynasty-1')).toEqual(leaderboardBefore);
  });

  it('refuses to overwrite or reseal a corrupt primary through saveGameById', async () => {
    const written = await saveGame(1, 'Durable Original', currentSnapshot());
    const corruptPrimary: SaveData = {
      ...written,
      name: 'Corrupt Primary',
    };
    await db.saves.put(corruptPrimary);
    const shadowBefore = await db.saveIntegrityBackups.get(ROOT_ID);
    const leaderboardBefore = await db.leaderboard.get('leaderboard-dynasty-1');
    const newerSnapshot = parseGameSnapshot({
      ...currentSnapshot(),
      day: written.day + 1,
    });

    await expect(saveGameById(
      ROOT_ID,
      'Forbidden Overwrite',
      newerSnapshot,
      rootWriteMetadata(),
    )).rejects.toMatchObject({
      name: 'SaveIntegrityError',
      kind: 'mismatch',
      expectedChecksum: written.integrity?.checksum,
    });

    expect(await db.saves.get(ROOT_ID)).toEqual(corruptPrimary);
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(shadowBefore);
    expect(await db.leaderboard.get('leaderboard-dynasty-1')).toEqual(leaderboardBefore);
  });

  it('creates and deletes a branch with atomic child and parent shadow pairs', async () => {
    await saveGame(1, 'Branch Root', currentSnapshot());
    const { branch } = await createBranchSave(
      ROOT_ID,
      currentSnapshot(),
      'Verified branch',
    );

    const branchPair = await expectValidPrimaryShadowPair(branch.id);
    const rootPairAfterCreate = await expectValidPrimaryShadowPair(ROOT_ID);
    expect(branchPair.primary.parentSaveId).toBe(ROOT_ID);
    expect(rootPairAfterCreate.primary.snapshot?.narrative.whatIfBranches).toEqual([
      expect.objectContaining({ saveId: branch.id }),
    ]);

    await deleteSaveById(branch.id);

    expect(await db.saves.get(branch.id)).toBeUndefined();
    expect(await db.saveIntegrityBackups.get(branch.id)).toBeUndefined();
    const rootPairAfterDelete = await expectValidPrimaryShadowPair(ROOT_ID);
    expect(rootPairAfterDelete.primary.snapshot?.narrative.whatIfBranches).toEqual([]);
  });

  it('preserves a verified child until its corrupt parent is explicitly recovered', async () => {
    await saveGame(1, 'Corrupt Parent Root', currentSnapshot());
    const { branch } = await createBranchSave(ROOT_ID, currentSnapshot(), 'Delete child only');
    const parentPrimary = await db.saves.get(ROOT_ID);
    const parentShadow = await db.saveIntegrityBackups.get(ROOT_ID);
    const leaderboard = await db.leaderboard.get('leaderboard-dynasty-1');
    expect(parentPrimary).toEqual(parentShadow);
    const corruptParent: SaveData = {
      ...parentPrimary!,
      name: 'Corrupt Parent Evidence',
    };
    await db.saves.put(corruptParent);

    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
      ok: false,
      reason: 'integrity_failed',
      detail: {
        integrityFailureKind: 'mismatch',
        repairAvailable: true,
        repairUpdatedAt: parentShadow?.updatedAt,
      },
    });

    const branchPrimary = await db.saves.get(branch.id);
    const branchShadow = await db.saveIntegrityBackups.get(branch.id);
    await expect(deleteSaveById(branch.id)).rejects.toThrow(
      'The branch cannot be deleted until its parent save is recovered.',
    );

    expect(await db.saves.get(branch.id)).toEqual(branchPrimary);
    expect(await db.saveIntegrityBackups.get(branch.id)).toEqual(branchShadow);
    expect(await db.saves.get(ROOT_ID)).toEqual(corruptParent);
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(parentShadow);
    expect(await db.leaderboard.get('leaderboard-dynasty-1')).toEqual(leaderboard);
    expect((await db.saves.get(ROOT_ID))?.snapshot?.narrative.whatIfBranches).toEqual([
      expect.objectContaining({ saveId: branch.id }),
    ]);
    expect((await db.saveIntegrityBackups.get(ROOT_ID))?.snapshot?.narrative.whatIfBranches).toEqual([
      expect.objectContaining({ saveId: branch.id }),
    ]);
    await expect(verifySaveRecordIntegrity((await db.saves.get(ROOT_ID))!)).resolves.toMatchObject({
      status: 'invalid',
      reason: 'mismatch',
    });
    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
      ok: false,
      reason: 'integrity_failed',
      detail: {
        integrityFailureKind: 'mismatch',
        repairAvailable: true,
        repairUpdatedAt: parentShadow?.updatedAt,
      },
    });

    await restoreSaveIntegrityBackup(ROOT_ID);
    await expect(deleteSaveById(branch.id)).resolves.toMatchObject({ id: ROOT_ID });
    expect(await db.saves.get(branch.id)).toBeUndefined();
    expect(await db.saveIntegrityBackups.get(branch.id)).toBeUndefined();
    expect((await db.saves.get(ROOT_ID))?.snapshot?.narrative.whatIfBranches).toEqual([]);
  });

  it('preserves a checksumless child when its legacy parent cannot be resealed without Web Crypto', async () => {
    const branchId = 'legacy-checksumless-child';
    const branchMeta = {
      id: branchId,
      saveId: branchId,
      branchedAtSeason: currentSnapshot().season,
      branchedAtDay: currentSnapshot().day,
      description: 'Legacy checksumless branch',
      createdAt: '2025-01-02T03:04:05.000Z',
    };
    const baseSnapshot = currentSnapshot();
    const parentSnapshot = parseGameSnapshot({
      ...baseSnapshot,
      narrative: {
        ...baseSnapshot.narrative,
        whatIfBranches: [branchMeta],
      },
    });
    const legacyParent = unsealedFixtureRecord(1, 'Legacy Parent', parentSnapshot);
    const legacyChild: SaveData = {
      ...unsealedFixtureRecord(2, 'Legacy Child', currentSnapshot()),
      id: branchId,
      slotNumber: null,
      parentSaveId: ROOT_ID,
      isRootSave: false,
      branchMeta,
    };
    await db.saves.put(legacyParent);
    await db.saves.put(legacyChild);
    await db.saveIntegrityBackups.put(legacyChild);
    const parentBefore = await db.saves.get(ROOT_ID);
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toBeUndefined();

    vi.stubGlobal('crypto', undefined);
    try {
      await expect(deleteSaveById(branchId)).rejects.toThrow(
        'The branch cannot be deleted until its parent save can be verified.',
      );

      expect(await db.saves.get(branchId)).toEqual(legacyChild);
      expect(await db.saveIntegrityBackups.get(branchId)).toEqual(legacyChild);
      expect(await db.saves.get(ROOT_ID)).toEqual(parentBefore);
      expect(await db.saveIntegrityBackups.get(ROOT_ID)).toBeUndefined();
      expect((await db.saves.get(ROOT_ID))?.snapshot?.narrative.whatIfBranches).toEqual([
        branchMeta,
      ]);
      await expect(verifySaveRecordIntegrity((await db.saves.get(ROOT_ID))!)).resolves.toEqual({
        status: 'unsealed',
      });
    } finally {
      vi.unstubAllGlobals();
    }

    await expect(deleteSaveById(branchId)).resolves.toMatchObject({ id: ROOT_ID });
    expect(await db.saves.get(branchId)).toBeUndefined();
    expect(await db.saveIntegrityBackups.get(branchId)).toBeUndefined();
    await expectValidPrimaryShadowPair(ROOT_ID);
  });

  it('uses exact primary-shadow copies only for tree deletion when SHA verification is unavailable', async () => {
    await saveGame(1, 'No Crypto Root', currentSnapshot());
    const { branch } = await createBranchSave(ROOT_ID, currentSnapshot(), 'No crypto branch');
    const rootPair = await expectValidPrimaryShadowPair(ROOT_ID);
    const branchPair = await expectValidPrimaryShadowPair(branch.id);

    vi.stubGlobal('crypto', undefined);
    try {
      await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
        ok: false,
        reason: 'integrity_failed',
        detail: {
          integrityFailureKind: 'unavailable',
          repairAvailable: false,
        },
      });
      await expect(restoreSaveIntegrityBackup(ROOT_ID)).rejects.toThrow(
        'The recovery copy no longer verifies. Nothing was restored.',
      );
      expect(await db.saves.get(ROOT_ID)).toEqual(rootPair.primary);
      expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(rootPair.shadow);
      expect(await db.saves.get(branch.id)).toEqual(branchPair.primary);
      expect(await db.saveIntegrityBackups.get(branch.id)).toEqual(branchPair.shadow);

      await expect(listSaveTreeChildIds(ROOT_ID)).resolves.toEqual([branch.id]);
      await deleteSaveById(ROOT_ID);

      expect(await db.saves.get(ROOT_ID)).toBeUndefined();
      expect(await db.saveIntegrityBackups.get(ROOT_ID)).toBeUndefined();
      expect(await db.saves.get(branch.id)).toBeUndefined();
      expect(await db.saveIntegrityBackups.get(branch.id)).toBeUndefined();
      expect(await db.leaderboard.where('slotNumber').equals(1).count()).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not exact-delete a lost-parent branch when an exact root pair still references it without Web Crypto', async () => {
    await saveGame(1, 'Unavailable Parent Root', currentSnapshot());
    const { branch } = await createBranchSave(
      ROOT_ID,
      currentSnapshot(),
      'Lost Parent Metadata',
    );
    const lostParentCopies: SaveData = {
      ...branch,
      parentSaveId: null,
      branchMeta: null,
    };
    await Promise.all([
      db.saves.put(lostParentCopies),
      db.saveIntegrityBackups.put(lostParentCopies),
    ]);
    const rootPrimaryBefore = await db.saves.get(ROOT_ID);
    const rootShadowBefore = await db.saveIntegrityBackups.get(ROOT_ID);

    vi.stubGlobal('crypto', undefined);
    try {
      await expect(deleteSaveById(branch.id)).rejects.toThrow(
        'The branch cannot be deleted until its parent save is recovered.',
      );
      expect(await db.saves.get(branch.id)).toEqual(lostParentCopies);
      expect(await db.saveIntegrityBackups.get(branch.id)).toEqual(lostParentCopies);
      expect(await db.saves.get(ROOT_ID)).toEqual(rootPrimaryBefore);
      expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(rootShadowBefore);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('trusts the valid child shadow over a damaged primary parent index during root deletion', async () => {
    await saveGame(1, 'Correct Root', currentSnapshot());
    const { branch } = await createBranchSave(ROOT_ID, currentSnapshot(), 'Indexed branch');
    await saveGame(2, 'Wrong Root', currentSnapshot());
    const validShadow = await db.saveIntegrityBackups.get(branch.id);
    await db.saves.put({
      ...branch,
      parentSaveId: OTHER_ROOT_ID,
    });

    await expect(listSaveTreeChildIds(ROOT_ID)).resolves.toEqual([branch.id]);
    await expect(listSaveTreeChildIds(OTHER_ROOT_ID)).resolves.toEqual([]);
    await deleteSaveById(OTHER_ROOT_ID);

    expect(await db.saves.get(branch.id)).toBeDefined();
    expect(await db.saveIntegrityBackups.get(branch.id)).toEqual(validShadow);
    await deleteSaveById(ROOT_ID);
    expect(await db.saves.get(branch.id)).toBeUndefined();
    expect(await db.saveIntegrityBackups.get(branch.id)).toBeUndefined();
  });

  it('trusts the valid child primary over a damaged shadow parent index during root replacement', async () => {
    await saveGame(1, 'Correct Root', currentSnapshot());
    const { branch } = await createBranchSave(ROOT_ID, currentSnapshot(), 'Indexed branch');
    await saveGame(2, 'Wrong Root', currentSnapshot());
    const validPrimary = await db.saves.get(branch.id);
    await db.saveIntegrityBackups.put({
      ...branch,
      parentSaveId: OTHER_ROOT_ID,
    });

    await expect(listSaveTreeChildIds(ROOT_ID)).resolves.toEqual([branch.id]);
    await expect(listSaveTreeChildIds(OTHER_ROOT_ID)).resolves.toEqual([]);
    await saveGame(2, 'Wrong Root Replacement', currentSnapshot(), {
      replaceExistingRootBranchMetadata: true,
    });

    expect(await db.saves.get(branch.id)).toEqual(validPrimary);
    expect(await db.saveIntegrityBackups.get(branch.id)).toBeDefined();
    await saveGame(1, 'Correct Root Replacement', currentSnapshot(), {
      replaceExistingRootBranchMetadata: true,
    });
    expect(await db.saves.get(branch.id)).toBeUndefined();
    expect(await db.saveIntegrityBackups.get(branch.id)).toBeUndefined();
  });

  it('never treats another root-shaped save ID as a child from untrusted root references or indexes', async () => {
    const firstRoot = await saveGame(1, 'First Root', currentSnapshot());
    const secondRoot = await saveGame(2, 'Second Root', currentSnapshot());
    const secondShadow = await db.saveIntegrityBackups.get(OTHER_ROOT_ID);
    const untrustedRootReference = {
      id: OTHER_ROOT_ID,
      saveId: OTHER_ROOT_ID,
      branchedAtSeason: firstRoot.season,
      branchedAtDay: firstRoot.day,
      description: 'A root must never become a child',
      createdAt: '2026-04-02T19:40:00.000Z',
    };
    await db.saves.put({
      ...firstRoot,
      snapshot: {
        ...firstRoot.snapshot!,
        narrative: {
          ...firstRoot.snapshot!.narrative,
          whatIfBranches: [untrustedRootReference],
        },
      },
    });
    const untrustedSecondPrimary: SaveData = {
      ...secondRoot,
      parentSaveId: ROOT_ID,
      isRootSave: false,
    };
    await db.saves.put(untrustedSecondPrimary);

    await expect(listSaveTreeChildIds(ROOT_ID)).resolves.toEqual([]);
    await deleteSaveById(ROOT_ID);

    expect(await db.saves.get(OTHER_ROOT_ID)).toEqual(untrustedSecondPrimary);
    expect(await db.saveIntegrityBackups.get(OTHER_ROOT_ID)).toEqual(secondShadow);
  });

  it('keeps damaged or missing root and branch primaries discoverable by stable topology', async () => {
    await saveGame(1, 'Discoverable Root', currentSnapshot());
    const { branch } = await createBranchSave(
      ROOT_ID,
      currentSnapshot(),
      'Discoverable Branch',
    );
    const root = (await db.saves.get(ROOT_ID))!;
    await db.saves.put({
      ...root,
      slotNumber: null,
      isRootSave: false,
    });
    await db.saves.put({
      ...branch,
      slotNumber: 2,
      parentSaveId: OTHER_ROOT_ID,
      isRootSave: true,
    });

    await expect(listRootSaves()).resolves.toEqual([
      expect.objectContaining({
        id: ROOT_ID,
        slotNumber: 1,
        isRootSave: true,
        name: 'Discoverable Root',
      }),
    ]);
    await expect(listSaveTree()).resolves.toEqual([
      expect.objectContaining({
        save: expect.objectContaining({ id: ROOT_ID, slotNumber: 1, isRootSave: true }),
        branches: [
          expect.objectContaining({
            id: branch.id,
            slotNumber: null,
            parentSaveId: ROOT_ID,
            isRootSave: false,
          }),
        ],
      }),
    ]);
    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
      ok: false,
      reason: 'integrity_failed',
      detail: { repairAvailable: true },
    });
    await expect(loadSaveSafely(branch.id)).resolves.toMatchObject({
      ok: false,
      reason: 'integrity_failed',
      detail: { repairAvailable: true },
    });

    await Promise.all([
      db.saves.delete(ROOT_ID),
      db.saves.delete(branch.id),
    ]);

    await expect(listSaveTree()).resolves.toEqual([
      expect.objectContaining({
        save: expect.objectContaining({ id: ROOT_ID, slotNumber: 1, isRootSave: true }),
        branches: [expect.objectContaining({ id: branch.id, parentSaveId: ROOT_ID })],
      }),
    ]);
    await expect(loadSaveSafely(ROOT_ID)).resolves.toMatchObject({
      ok: false,
      reason: 'integrity_failed',
      detail: { integrityFailureKind: 'missing', repairAvailable: true },
    });
    await expect(loadSaveSafely(branch.id)).resolves.toMatchObject({
      ok: false,
      reason: 'integrity_failed',
      detail: { integrityFailureKind: 'missing', repairAvailable: true },
    });
  });

  it('does not let damaged child index metadata consume the verified branch cap', async () => {
    const root = await saveGame(1, 'Branch Cap Root', currentSnapshot());
    const damagedChildren = Array.from({ length: 3 }, (_, index): SaveData => ({
      ...root,
      id: `damaged-child-${index + 1}`,
      slotNumber: null,
      name: `Damaged child ${index + 1}`,
      parentSaveId: ROOT_ID,
      isRootSave: false,
      branchMeta: null,
    }));
    await db.saves.bulkPut(damagedChildren);

    await expect(listSaveTreeChildIds(ROOT_ID)).resolves.toEqual([]);
    const created = await createBranchSave(
      ROOT_ID,
      currentSnapshot(),
      'Verified branch survives damaged indexes',
    );

    expect(created.parent.snapshot?.narrative.whatIfBranches).toEqual([
      expect.objectContaining({ saveId: created.branch.id }),
    ]);
    await expectValidPrimaryShadowPair(created.branch.id);
    await expectValidPrimaryShadowPair(ROOT_ID);
  });

  it('orders legacy repair from its first read so a newer save invocation remains final', async () => {
    const legacy = unsealedFixtureRecord(1, 'Legacy Repair Source', currentSnapshot());
    await db.saves.put(legacy);
    const originalGet = db.saves.get.bind(db.saves);
    let pauseFirstRead = true;
    let announcePaused: () => void = () => undefined;
    const paused = new Promise<void>((resolve) => {
      announcePaused = resolve;
    });
    let releaseRead: () => void = () => undefined;
    const readCanFinish = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    vi.spyOn(db.saves, 'get').mockImplementation((async (key: string) => {
      const record = await originalGet(key);
      if (key === ROOT_ID && pauseFirstRead) {
        pauseFirstRead = false;
        announcePaused();
        await readCanFinish;
      }
      return record;
    }) as typeof db.saves.get);

    const repair = repairSave(1);
    await paused;
    const newerSnapshot = parseGameSnapshot({
      ...currentSnapshot(),
      day: currentSnapshot().day + 11,
    });
    let newerSettled = false;
    const newer = saveGameById(
      ROOT_ID,
      'Newer Explicit Save',
      newerSnapshot,
      rootWriteMetadata(),
    ).then((record) => {
      newerSettled = true;
      return record;
    });
    await Promise.resolve();
    expect(newerSettled).toBe(false);

    releaseRead();
    await expect(repair).resolves.toMatchObject({ status: 'ok' });
    const newerRecord = await newer;

    expect(newerRecord.name).toBe('Newer Explicit Save');
    const pair = await expectValidPrimaryShadowPair(ROOT_ID);
    expect(pair.primary).toEqual(newerRecord);
    expect(pair.primary.snapshot?.day).toBe(newerSnapshot.day);
  });

  it('refuses legacy repair before parsing or resealing a corrupt protected primary', async () => {
    const written = await saveGame(1, 'Protected Repair Source', currentSnapshot());
    const damaged: SaveData = {
      ...written,
      name: 'Damaged Repair Source',
    };
    await db.saves.put(damaged);
    const shadowBefore = await db.saveIntegrityBackups.get(ROOT_ID);
    const leaderboardBefore = await db.leaderboard.get('leaderboard-dynasty-1');

    await expect(repairSave(1)).rejects.toMatchObject({
      name: 'SaveIntegrityError',
      kind: 'mismatch',
    });

    expect(await db.saves.get(ROOT_ID)).toEqual(damaged);
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(shadowBefore);
    expect(await db.leaderboard.get('leaderboard-dynasty-1')).toEqual(leaderboardBefore);
  });

  it('deletes an untrusted branch through its single verified parent reference and reseals both parent copies', async () => {
    await saveGame(1, 'Discovery Root', currentSnapshot());
    const { branch } = await createBranchSave(ROOT_ID, currentSnapshot(), 'Discover by parent');
    await corruptBothBranchCopies(branch);

    await expect(verifySaveRecordIntegrity((await db.saves.get(branch.id))!)).resolves.toMatchObject({
      status: 'invalid',
      reason: 'mismatch',
    });
    await expect(verifySaveRecordIntegrity(
      (await db.saveIntegrityBackups.get(branch.id))!,
    )).resolves.toMatchObject({
      status: 'invalid',
      reason: 'mismatch',
    });

    const updatedParent = await deleteSaveById(branch.id);

    expect(updatedParent).toMatchObject({
      id: ROOT_ID,
      snapshot: {
        narrative: {
          whatIfBranches: [],
        },
      },
    });
    expect(await db.saves.get(branch.id)).toBeUndefined();
    expect(await db.saveIntegrityBackups.get(branch.id)).toBeUndefined();
    const parentPair = await expectValidPrimaryShadowPair(ROOT_ID);
    expect(parentPair.primary.snapshot?.narrative.whatIfBranches).toEqual([]);
  });

  it('re-reads the parent after discovery so a newer queued parent mutation is not overwritten', async () => {
    await saveGame(1, 'Original Parent', currentSnapshot());
    const { branch } = await createBranchSave(ROOT_ID, currentSnapshot(), 'Race branch');
    await corruptBothBranchCopies(branch);
    const originalPrimaryGet = db.saves.get.bind(db.saves);
    const originalBackupGet = db.saveIntegrityBackups.get.bind(db.saveIntegrityBackups);
    let primaryDiscoveryPaused = false;
    let backupDiscoveryPaused = false;
    let announcePrimaryPause: () => void = () => undefined;
    let announceBackupPause: () => void = () => undefined;
    const primaryPaused = new Promise<void>((resolve) => {
      announcePrimaryPause = resolve;
    });
    const backupPaused = new Promise<void>((resolve) => {
      announceBackupPause = resolve;
    });
    let releaseDiscovery: () => void = () => undefined;
    const discoveryCanFinish = new Promise<void>((resolve) => {
      releaseDiscovery = resolve;
    });

    vi.spyOn(db.saves, 'get').mockImplementation((async (key: string) => {
      const record = await originalPrimaryGet(key);
      if (key === ROOT_ID && !primaryDiscoveryPaused) {
        primaryDiscoveryPaused = true;
        announcePrimaryPause();
        await discoveryCanFinish;
      }
      return record;
    }) as typeof db.saves.get);
    vi.spyOn(db.saveIntegrityBackups, 'get').mockImplementation((async (key: string) => {
      const record = await originalBackupGet(key);
      if (key === ROOT_ID && !backupDiscoveryPaused) {
        backupDiscoveryPaused = true;
        announceBackupPause();
        await discoveryCanFinish;
      }
      return record;
    }) as typeof db.saveIntegrityBackups.get);

    const deletion = deleteSaveById(branch.id);
    await Promise.all([primaryPaused, backupPaused]);
    const newerDay = currentSnapshot().day + 7;
    let newerParent: SaveData;
    try {
      newerParent = await saveGameById(
        ROOT_ID,
        'Newer Parent Mutation',
        parseGameSnapshot({
          ...currentSnapshot(),
          day: newerDay,
        }),
        rootWriteMetadata(),
      );
    } finally {
      releaseDiscovery();
    }

    const deletionResult = await deletion;

    expect(newerParent.name).toBe('Newer Parent Mutation');
    expect(deletionResult).toMatchObject({
      id: ROOT_ID,
      name: 'Newer Parent Mutation',
      snapshot: {
        day: newerDay,
        narrative: {
          whatIfBranches: [],
        },
      },
    });
    expect(await db.saves.get(branch.id)).toBeUndefined();
    expect(await db.saveIntegrityBackups.get(branch.id)).toBeUndefined();
    const parentPair = await expectValidPrimaryShadowPair(ROOT_ID);
    expect(parentPair.primary.name).toBe('Newer Parent Mutation');
    expect(parentPair.primary.snapshot?.day).toBe(newerDay);
    expect(parentPair.primary.snapshot?.narrative.whatIfBranches).toEqual([]);
  });

  it('cleans child shadows on root replacement and removes the whole protected tree on root delete', async () => {
    await saveGame(1, 'Old Root', currentSnapshot());
    const firstBranch = await createBranchSave(ROOT_ID, currentSnapshot(), 'Old branch');

    const replacement = await saveGame(1, 'Replacement Root', currentSnapshot(), {
      replaceExistingRootBranchMetadata: true,
    });

    expect(await db.saves.get(firstBranch.branch.id)).toBeUndefined();
    expect(await db.saveIntegrityBackups.get(firstBranch.branch.id)).toBeUndefined();
    const replacementPair = await expectValidPrimaryShadowPair(ROOT_ID);
    expect(replacementPair.primary).toEqual(replacement);
    expect(replacementPair.primary.snapshot?.narrative.whatIfBranches).toEqual([]);

    const secondBranch = await createBranchSave(ROOT_ID, currentSnapshot(), 'Replacement branch');
    await expectValidPrimaryShadowPair(secondBranch.branch.id);
    await deleteSaveById(ROOT_ID);

    expect(await db.saves.get(ROOT_ID)).toBeUndefined();
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toBeUndefined();
    expect(await db.saves.get(secondBranch.branch.id)).toBeUndefined();
    expect(await db.saveIntegrityBackups.get(secondBranch.branch.id)).toBeUndefined();
    expect(await db.leaderboard.where('slotNumber').equals(1).count()).toBe(0);
  });

  it('clears every primary, shadow, and leaderboard row together', async () => {
    await saveGame(1, 'Clear Root', currentSnapshot());
    await createBranchSave(ROOT_ID, currentSnapshot(), 'Clear branch');
    expect(await db.saveIntegrityBackups.count()).toBe(2);

    await clearAllSaves();

    expect(await db.saves.count()).toBe(0);
    expect(await db.saveIntegrityBackups.count()).toBe(0);
    expect(await db.leaderboard.count()).toBe(0);
  });

  it('aborts restore when the primary changes between verification and the repair transaction', async () => {
    const written = await saveGame(1, 'Before Damage', currentSnapshot());
    const firstDamage: SaveData = {
      ...written,
      name: 'First observed damage',
    };
    const racedDamage: SaveData = {
      ...firstDamage,
      name: 'Changed during repair',
    };
    await db.saves.put(firstDamage);
    const shadowBefore = await db.saveIntegrityBackups.get(ROOT_ID);
    const leaderboardBefore = await db.leaderboard.get('leaderboard-dynasty-1');
    const realTransaction = db.transaction.bind(db);

    vi.spyOn(db, 'transaction').mockImplementationOnce((async (...args: unknown[]) => {
      await db.saves.put(racedDamage);
      return (realTransaction as (...transactionArgs: unknown[]) => Promise<unknown>)(...args);
    }) as typeof db.transaction);

    await expect(restoreSaveIntegrityBackup(ROOT_ID)).rejects.toThrow(
      'The save changed while repair was being prepared. Nothing was restored.',
    );

    expect(await db.saves.get(ROOT_ID)).toEqual(racedDamage);
    expect(await db.saveIntegrityBackups.get(ROOT_ID)).toEqual(shadowBefore);
    expect(await db.leaderboard.get('leaderboard-dynasty-1')).toEqual(leaderboardBefore);
  });

  it('assesses an exact sealed current-v34 pair as ready without mutating any durable row', async () => {
    await saveGame(1, 'Ready baseline', currentSnapshot());
    const before = await Promise.all([
      db.saves.get(ROOT_ID),
      db.saveIntegrityBackups.get(ROOT_ID),
      db.leaderboard.get('leaderboard-dynasty-1'),
      db.simAdvanceIntents.toArray(),
    ]);

    const assessment = await assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, currentSnapshot());

    expect(assessment.kind).toBe('ready');
    if (assessment.kind === 'ready') {
      expect(assessment.proof).toMatchObject({
        saveId: ROOT_ID,
        rootSaveId: ROOT_ID,
        baseline: { id: ROOT_ID, schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION },
        workerSnapshot: currentSnapshot(),
      });
    }
    await expect(Promise.all([
      db.saves.get(ROOT_ID),
      db.saveIntegrityBackups.get(ROOT_ID),
      db.leaderboard.get('leaderboard-dynasty-1'),
      db.simAdvanceIntents.toArray(),
    ])).resolves.toEqual(before);
  });

  it.each([
    ['v17', v17SnapshotFixture],
    ['deep v33', deepV33SnapshotFixture],
  ] as const)('marks an exact sealed %s pair as a verified noncanonical seal candidate', async (_label, fixture) => {
    const raw = unsealedFixtureRecord(1, 'Old exact pair', fixture);
    await putSealedExactPair(raw);

    const assessment = await assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, materializedSnapshot(fixture));

    expect(assessment).toMatchObject({
      kind: 'seal_required',
      proof: {
        saveId: ROOT_ID,
        rootSaveId: ROOT_ID,
        source: 'verified_noncanonical_pair',
        shadowCanonical: expect.any(String),
      },
    });
  });

  it.each([
    ['current v34', currentSnapshotFixture],
    ['v17', v17SnapshotFixture],
    ['deep v33', deepV33SnapshotFixture],
  ] as const)('marks checksumless/no-shadow %s primary as an unsealed seal candidate', async (_label, fixture) => {
    await db.saves.put(unsealedFixtureRecord(1, 'Checksumless baseline', fixture));

    const assessment = await assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, materializedSnapshot(fixture));

    expect(assessment).toMatchObject({
      kind: 'seal_required',
      proof: {
        saveId: ROOT_ID,
        rootSaveId: ROOT_ID,
        source: 'unsealed_primary_no_shadow',
        shadowCanonical: null,
      },
    });
  });

  it('marks an independently valid sealed current primary without a shadow as a seal candidate', async () => {
    const sealed = await sealSaveRecord(unsealedFixtureRecord(1, 'Sealed without shadow', currentSnapshotFixture));
    await db.saves.put(sealed);

    const assessment = await assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, currentSnapshot());

    expect(assessment).toMatchObject({
      kind: 'seal_required',
      proof: {
        source: 'sealed_primary_no_shadow',
        primaryCanonical: expect.any(String),
        shadowCanonical: null,
      },
    });
  });

  it('binds a branch assessment to its exact save and verified root topology', async () => {
    await saveGame(1, 'Branch root', currentSnapshot());
    await putSealedExactPair(branchFixtureRecord(currentSnapshot()));

    const assessment = await assessSimAdvanceBaseline('branch-1', ROOT_ID, currentSnapshot());

    expect(assessment.kind).toBe('ready');
    if (assessment.kind === 'ready') {
      expect(assessment.proof.saveId).toBe('branch-1');
      expect(assessment.proof.rootSaveId).toBe(ROOT_ID);
      expect(assessment.proof.baseline.id).toBe('branch-1');
    }
  });

  it.each(['ready pair', 'old pair', 'checksumless primary', 'sealed primary without shadow'] as const)(
    'rejects an RNG-only worker mismatch for each %s assessment source',
    async (source) => {
      await db.saves.clear();
      await db.saveIntegrityBackups.clear();
      await db.leaderboard.clear();
      const fixture = source === 'old pair' ? v17SnapshotFixture : currentSnapshotFixture;
      const worker = materializedSnapshot(fixture);
      if (source === 'ready pair') {
        await saveGame(1, 'Ready pair', worker);
      } else if (source === 'old pair') {
        await putSealedExactPair(unsealedFixtureRecord(1, 'Old pair', fixture));
      } else if (source === 'sealed primary without shadow') {
        await db.saves.put(await sealSaveRecord(
          unsealedFixtureRecord(1, 'Sealed primary without shadow', fixture),
        ));
      } else {
        await db.saves.put(unsealedFixtureRecord(1, 'Checksumless primary', fixture));
      }

      await expect(assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, rngOnlyMismatch(worker)))
        .rejects.toThrow('worker snapshot');
    },
  );

  it('rejects valid but different primary/shadow generations instead of sealing them', async () => {
    const raw = unsealedFixtureRecord(1, 'Generation primary', currentSnapshotFixture);
    const primary = await sealSaveRecord(raw);
    const shadow = await sealSaveRecord({
      ...raw,
      name: 'Generation shadow',
      updatedAt: '2025-01-03T03:04:05.000Z',
    });
    await db.saves.put(primary);
    await db.saveIntegrityBackups.put(shadow);

    await expect(assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, currentSnapshot()))
      .rejects.toThrow('exact baseline pair');
  });

  it('rejects a corrupt primary even when its shadow remains independently valid', async () => {
    const sealed = await sealSaveRecord(unsealedFixtureRecord(1, 'Good shadow', currentSnapshotFixture));
    await db.saves.put({ ...sealed, name: 'Tampered primary' });
    await db.saveIntegrityBackups.put(sealed);

    await expect(assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, currentSnapshot()))
      .rejects.toThrow('exact baseline pair');
  });

  it('rejects checksumless primary/shadow pairs rather than treating them as a seal candidate', async () => {
    const raw = unsealedFixtureRecord(1, 'Unsealed pair', currentSnapshotFixture);
    await db.saves.put(raw);
    await db.saveIntegrityBackups.put(raw);

    await expect(assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, currentSnapshot()))
      .rejects.toThrow('integrity-verified');
  });

  it('rejects wrong-root and missing-primary assessment evidence', async () => {
    await saveGame(1, 'Root one', currentSnapshot());
    await expect(assessSimAdvanceBaseline(ROOT_ID, OTHER_ROOT_ID, currentSnapshot()))
      .rejects.toThrow('requested exact save and dynasty tree');

    await db.saves.clear();
    const sealed = await sealSaveRecord(unsealedFixtureRecord(1, 'Shadow only', currentSnapshotFixture));
    await db.saveIntegrityBackups.put(sealed);
    await expect(assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, currentSnapshot()))
      .rejects.toThrow('requested exact save and dynasty tree');
  });

  it('deep-freezes cloned ready and seal-required evidence without changing canonical proof material', async () => {
    const assessments = [] as Array<Awaited<ReturnType<typeof assessSimAdvanceBaseline>>>;
    await saveGame(1, 'Frozen ready baseline', currentSnapshot());
    assessments.push(await assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, currentSnapshot()));

    await db.saves.clear();
    await db.saveIntegrityBackups.clear();
    await db.leaderboard.clear();
    await putSealedExactPair(unsealedFixtureRecord(1, 'Frozen old baseline', v17SnapshotFixture));
    assessments.push(await assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, materializedSnapshot(v17SnapshotFixture)));

    for (const assessment of assessments) {
      const { proof } = assessment;
      const baselineCanonical = canonicalizeSaveIntegrityValue(proof.baseline);
      const workerCanonical = canonicalizeSaveIntegrityValue(proof.workerSnapshot);
      const snapshot = proof.baseline.snapshot!;
      try { snapshot.rng.seed += 1; } catch { /* frozen evidence rejects mutation */ }
      try { proof.workerSnapshot.rng.seed += 1; } catch { /* frozen evidence rejects mutation */ }
      try { proof.baseline.parentSaveId = 'forged-root'; } catch { /* frozen evidence rejects mutation */ }
      try { (snapshot.narrative.whatIfBranches as unknown as unknown[]).push('forged-branch'); } catch { /* frozen evidence rejects mutation */ }

      expect(Object.isFrozen(assessment)).toBe(true);
      expect(Object.isFrozen(proof)).toBe(true);
      expect(Object.isFrozen(proof.baseline)).toBe(true);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.rng)).toBe(true);
      expect(Object.isFrozen(snapshot.narrative.whatIfBranches)).toBe(true);
      expect(Object.isFrozen(proof.workerSnapshot)).toBe(true);
      expect(Object.isFrozen(proof.workerSnapshot.rng)).toBe(true);
      expect(canonicalizeSaveIntegrityValue(proof.baseline)).toBe(baselineCanonical);
      expect(canonicalizeSaveIntegrityValue(proof.baseline)).toBe(proof.primaryCanonical);
      expect(canonicalizeSaveIntegrityValue(proof.workerSnapshot)).toBe(workerCanonical);
    }
  });

  it.each([
    ['root slot mismatch', {
      ...unsealedFixtureRecord(1, 'Wrong slot', currentSnapshot()),
      slotNumber: 2,
    }, ROOT_ID],
    ['arbitrary root id', {
      ...unsealedFixtureRecord(1, 'Arbitrary root', currentSnapshot()),
      id: 'arbitrary-root',
    }, 'arbitrary-root'],
    ['leading-zero root identity', {
      ...unsealedFixtureRecord(1, 'Leading-zero root', currentSnapshot()),
      id: 'save-slot-01',
    }, 'save-slot-01'],
  ] as const)('rejects a validly sealed canonical root with %s', async (_label, record, rootId) => {
    await putSealedExactPair(record);
    await expect(assessSimAdvanceBaseline(record.id, rootId, currentSnapshot()))
      .rejects.toThrow('requested exact save and dynasty tree');
  });

  it('rejects a structurally valid branch rooted at a leading-zero root identity', async () => {
    const leadingZeroRootId = 'save-slot-01';
    await putSealedExactPair({
      ...unsealedFixtureRecord(1, 'Leading-zero root', currentSnapshot()),
      id: leadingZeroRootId,
    });
    await putSealedExactPair({
      ...branchFixtureRecord(currentSnapshot()),
      parentSaveId: leadingZeroRootId,
    });

    await expect(assessSimAdvanceBaseline('branch-1', leadingZeroRootId, currentSnapshot()))
      .rejects.toThrow('requested exact save and dynasty tree');
  });

  it('rejects a branch with a non-null slot number', async () => {
    await saveGame(1, 'Canonical root', currentSnapshot());
    await putSealedExactPair({ ...branchFixtureRecord(currentSnapshot()), slotNumber: 1 });

    await expect(assessSimAdvanceBaseline('branch-1', ROOT_ID, currentSnapshot()))
      .rejects.toThrow('requested exact save and dynasty tree');
  });

  it.each([
    ['stale slot', { slotNumber: 2 }],
    ['non-null parent', { parentSaveId: 'save-slot-2' }],
    ['non-root flag', { isRootSave: false }],
  ] as const)('rejects a branch when its coherently read root has a %s', async (_label, mutation) => {
    await saveGame(1, 'Canonical root', currentSnapshot());
    const root = (await db.saves.get(ROOT_ID))!;
    const malformedRoot = await sealSaveRecord({ ...root, ...mutation });
    await db.saves.put(malformedRoot);
    await db.saveIntegrityBackups.put(malformedRoot);
    await putSealedExactPair(branchFixtureRecord(currentSnapshot()));

    await expect(assessSimAdvanceBaseline('branch-1', ROOT_ID, currentSnapshot()))
      .rejects.toThrow('requested exact save and dynasty tree');
  });

  it.each([
    ['old exact pair', 'verified_noncanonical_pair'],
    ['checksumless/no-shadow', 'unsealed_primary_no_shadow'],
    ['sealed/no-shadow', 'sealed_primary_no_shadow'],
  ] as const)('binds a branch %s seal-required proof to the exact branch/root', async (source, expectedSource) => {
    await saveGame(1, 'Canonical root', currentSnapshot());
    if (source === 'old exact pair') {
      await putSealedExactPair(branchFixtureRecord(v17SnapshotFixture));
    } else if (source === 'checksumless/no-shadow') {
      await db.saves.put(branchFixtureRecord(currentSnapshotFixture));
    } else {
      await db.saves.put(await sealSaveRecord(branchFixtureRecord(currentSnapshot())));
    }

    const worker = source === 'old exact pair' ? materializedSnapshot(v17SnapshotFixture) : currentSnapshot();
    const assessment = await assessSimAdvanceBaseline('branch-1', ROOT_ID, worker);

    expect(assessment).toMatchObject({
      kind: 'seal_required',
      proof: { saveId: 'branch-1', rootSaveId: ROOT_ID, source: expectedSource },
    });
  });

  it('keeps the canonical branch journal path usable through exact intent prepare/read/rollback', async () => {
    await saveGame(1, 'Canonical root', currentSnapshot());
    await putSealedExactPair(branchFixtureRecord(currentSnapshot()));
    const assessment = await assessSimAdvanceBaseline('branch-1', ROOT_ID, currentSnapshot());
    expect(assessment.kind).toBe('ready');
    if (assessment.kind !== 'ready') throw new Error('Expected canonical branch baseline to be ready.');

    const intent = await prepareSimAdvanceIntent(assessment.proof, 'sim_day');
    await expect(readSimAdvanceIntentBaseline('branch-1', ROOT_ID)).resolves.toMatchObject({
      intent,
      baseline: { id: 'branch-1', parentSaveId: ROOT_ID },
    });
    await consumeSimAdvanceIntentRollback(intent);
    await expect(readSimAdvanceIntentBaseline('branch-1', ROOT_ID)).resolves.toBeNull();
  });

  it.each([
    ['below minimum', MINIMUM_SUPPORTED_GAME_SNAPSHOT_VERSION - 1],
    ['above current', CURRENT_GAME_SNAPSHOT_VERSION + 1],
  ] as const)('rejects a %s stored snapshot version before it can become seal evidence', async (_label, schemaVersion) => {
    const unsupportedSnapshot = { ...currentSnapshot(), schemaVersion } as GameSnapshot;
    const record = {
      ...unsealedFixtureRecord(1, 'Unsupported baseline', unsupportedSnapshot),
      schemaVersion,
    };
    await putSealedExactPair(record);

    await expect(assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, currentSnapshot()))
      .rejects.toThrow('unsupported snapshot version');
  });

  it('marks a valid v34 pair with legacy gameState residue as noncanonical without writing', async () => {
    const record = {
      ...unsealedFixtureRecord(1, 'Legacy state residue', currentSnapshot()),
      gameState: JSON.stringify({ stale: true }),
    };
    await putSealedExactPair(record);
    const before = await Promise.all([
      db.saves.get(ROOT_ID), db.saveIntegrityBackups.get(ROOT_ID),
      db.leaderboard.toArray(), db.simAdvanceIntents.toArray(),
    ]);

    const assessment = await assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, currentSnapshot());

    expect(assessment).toMatchObject({ kind: 'seal_required', proof: { source: 'verified_noncanonical_pair' } });
    await expect(Promise.all([
      db.saves.get(ROOT_ID), db.saveIntegrityBackups.get(ROOT_ID),
      db.leaderboard.toArray(), db.simAdvanceIntents.toArray(),
    ])).resolves.toEqual(before);
  });

  it('does not mint attempts for seal-required assessment evidence', async () => {
    await saveGame(1, 'First ready', currentSnapshot());
    const first = await assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, currentSnapshot());
    if (first.kind !== 'ready') throw new Error('Expected first canonical baseline to be ready.');

    await db.saves.clear();
    await db.saveIntegrityBackups.clear();
    await db.leaderboard.clear();
    await putSealedExactPair(unsealedFixtureRecord(1, 'Old pair', v17SnapshotFixture));
    expect((await assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, materializedSnapshot(v17SnapshotFixture))).kind).toBe('seal_required');
    await db.saves.clear();
    await db.saveIntegrityBackups.clear();
    await db.saves.put(unsealedFixtureRecord(1, 'Unsealed', currentSnapshotFixture));
    expect((await assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, currentSnapshot())).kind).toBe('seal_required');
    await db.saves.clear();
    await db.saveIntegrityBackups.clear();
    await db.saves.put(await sealSaveRecord(unsealedFixtureRecord(1, 'Sealed no shadow', currentSnapshot())));
    expect((await assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, currentSnapshot())).kind).toBe('seal_required');

    await db.saves.clear();
    await db.saveIntegrityBackups.clear();
    await db.leaderboard.clear();
    await saveGame(1, 'Second ready', currentSnapshot());
    const second = await assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, currentSnapshot());
    if (second.kind !== 'ready') throw new Error('Expected second canonical baseline to be ready.');
    expect(second.proof.attempt).toBe(first.proof.attempt + 1);
  });

  it.each([
    ['verified noncanonical pair', 'pair'],
    ['unsealed primary without shadow', 'unsealed'],
    ['sealed primary without shadow', 'sealed'],
  ] as const)('does not mutate any durable store while assessing %s', async (_label, source) => {
    await saveGame(1, 'Leaderboard must remain', currentSnapshot());
    if (source === 'pair') {
      await putSealedExactPair(unsealedFixtureRecord(1, 'Old pair', v17SnapshotFixture));
    } else if (source === 'unsealed') {
      await db.saves.put(unsealedFixtureRecord(1, 'Unsealed no shadow', currentSnapshotFixture));
      await db.saveIntegrityBackups.delete(ROOT_ID);
    } else {
      await db.saves.put(await sealSaveRecord(unsealedFixtureRecord(1, 'Sealed no shadow', currentSnapshot())));
      await db.saveIntegrityBackups.delete(ROOT_ID);
    }
    const worker = source === 'pair' ? materializedSnapshot(v17SnapshotFixture) : currentSnapshot();
    const before = await Promise.all([
      db.saves.get(ROOT_ID), db.saveIntegrityBackups.get(ROOT_ID),
      db.leaderboard.toArray(), db.simAdvanceIntents.toArray(),
    ]);

    await expect(assessSimAdvanceBaseline(ROOT_ID, ROOT_ID, worker)).resolves.toMatchObject({ kind: 'seal_required' });

    await expect(Promise.all([
      db.saves.get(ROOT_ID), db.saveIntegrityBackups.get(ROOT_ID),
      db.leaderboard.toArray(), db.simAdvanceIntents.toArray(),
    ])).resolves.toEqual(before);
  });
});
