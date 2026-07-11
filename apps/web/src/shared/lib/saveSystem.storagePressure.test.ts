// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseGameSnapshot } from '@mbd/contracts';
import snapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v34/core.json';
import { createBranchSave, db, getLocalStorageEstimate, saveGame, type SaveData } from './saveSystem';

describe('getLocalStorageEstimate', () => {
  beforeEach(async () => { db.close(); await db.delete(); await db.open(); });
  afterEach(async () => { vi.restoreAllMocks(); db.close(); await db.delete(); });

  it('counts actual primary/shadow/branch/leaderboard rows and retains orphan bytes as partial evidence', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Unicode 夏', snapshot);
    const { branch } = await createBranchSave('save-slot-1', snapshot, 'what if');
    const legacy: SaveData = {
      id: 'orphan-legacy', slotNumber: null, name: 'orphan', season: 1, day: 1,
      phase: snapshot.phase, schemaVersion: snapshot.schemaVersion, hasSnapshot: true,
      snapshot, legacyState: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      parentSaveId: 'missing-root', isRootSave: false, branchMeta: null,
    };
    await db.saves.put(legacy);
    const report = await getLocalStorageEstimate();
    const tree = report.trees.find((candidate) => candidate.rootSaveId === 'save-slot-1');
    expect(tree?.saveIds).toEqual(['save-slot-1', branch.id]);
    expect(tree?.primaryBytes).toBeGreaterThan(0);
    expect(tree?.shadowBytes).toBeGreaterThan(0);
    expect(tree?.leaderboardBytes).toBeGreaterThan(0);
    expect(report.allMbdBytes).toBeGreaterThan(tree?.totalBytes ?? 0);
    expect(report.unattributedBytes).toBeGreaterThan(0);
    expect(report.status).toBe('partial');
  });

  it('accepts only the live checksumless legacy no-shadow compatibility case, and counts it once', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await db.saves.put({
      id: 'save-slot-1', slotNumber: 1, name: 'Legacy', season: snapshot.season, day: snapshot.day,
      phase: snapshot.phase, schemaVersion: snapshot.schemaVersion, hasSnapshot: true, snapshot, legacyState: null,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', parentSaveId: null, isRootSave: true, branchMeta: null,
    });
    const report = await getLocalStorageEstimate();
    expect(report.trees[0]?.shadowBytes).toBe(0);
    expect(report.trees[0]?.primaryBytes).toBeGreaterThan(0);
    expect(report.trees[0]?.attribution).toBe('complete');
    expect(report.status).toBe('available');
    expect(report.unattributedBytes).toBe(0);
  });

  it.each([
    ['zero', 0, 'save-slot-0'],
    ['out of range', 6, 'save-slot-6'],
    ['fractional', 1.5, 'save-slot-1.5'],
    ['nonfinite', Number.POSITIVE_INFINITY, 'save-slot-Infinity'],
    ['string-valued', '1', 'save-slot-1'],
  ])('keeps a canonical-shaped root with a %s slot unattributed', async (_label, slotNumber, id) => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await db.saves.put({
      id,
      slotNumber: slotNumber as number,
      name: 'Malformed slot root',
      season: snapshot.season,
      day: snapshot.day,
      phase: snapshot.phase,
      schemaVersion: snapshot.schemaVersion,
      hasSnapshot: true,
      snapshot,
      legacyState: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      parentSaveId: null,
      isRootSave: true,
      branchMeta: null,
    });
    await db.leaderboard.put({
      id: `leaderboard-${String(slotNumber)}`,
      slotNumber: slotNumber as number,
      scenarioId: null,
      gmName: 'Malformed',
      teamId: 'nym',
      teamName: 'Tycoons',
      season: 1,
      score: 1,
      record: '1-0',
      championships: 0,
      summary: 'Unsafe slot',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const report = await getLocalStorageEstimate();
    expect(report.trees).toEqual([]);
    expect(report.status).toBe('partial');
    expect(report.allMbdBytes).toBeGreaterThan(0);
    expect(report.unattributedBytes).toBe(report.allMbdBytes);
  });

  it('uses UTF-8 JSON bytes for Unicode records and counts every leaderboard row in the canonical slot', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, '東京 夏', snapshot);
    await db.leaderboard.put({ id: 'leaderboard-extra-1', slotNumber: 1, scenarioId: '日本', gmName: '夏', teamId: 'nym', teamName: 'Tycoons', season: 3, score: 1, record: '1-0', championships: 0, summary: 'é', updatedAt: '2026-01-01T00:00:00.000Z' });
    const report = await getLocalStorageEstimate();
    const tree = report.trees[0]!;
    const rows = await db.leaderboard.where('slotNumber').equals(1).toArray();
    const expectedLeaderboardBytes = rows.reduce((total, row) => total + new TextEncoder().encode(JSON.stringify(row)).byteLength, 0);
    expect(tree.leaderboardBytes).toBe(expectedLeaderboardBytes);
  });

  it('keeps sealed missing-shadow and rogue-root rows in the all-MBD lower bound, not a trusted tree', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Sealed root', snapshot);
    const sealed = await db.saves.get('save-slot-1');
    await db.saveIntegrityBackups.delete('save-slot-1');
    await db.saves.put({ ...sealed!, id: 'rogue-root', slotNumber: 2, name: 'Rogue root' });
    const report = await getLocalStorageEstimate();
    expect(report.trees).toEqual([]);
    expect(report.status).toBe('partial');
    expect(report.unattributedBytes).toBeGreaterThan(0);
    expect(report.allMbdBytesKnown).toBe(true);
  });

  it('attributes a canonical root, exact branch pair, and every slot leaderboard row by exact UTF-8 JSON bytes', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, '東京 夏', snapshot);
    const { branch } = await createBranchSave('save-slot-1', snapshot, 'Unicode branch 夏');
    await db.leaderboard.bulkPut([
      { id: 'leaderboard-extra-1', slotNumber: 1, scenarioId: '日本', gmName: '夏', teamId: 'nym', teamName: 'Tycoons', season: 3, score: 1, record: '1-0', championships: 0, summary: 'é', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'leaderboard-extra-2', slotNumber: 1, scenarioId: '東京', gmName: '春', teamId: 'nym', teamName: 'Tycoons', season: 4, score: 2, record: '2-0', championships: 1, summary: '漢字', updatedAt: '2026-01-02T00:00:00.000Z' },
    ]);

    const report = await getLocalStorageEstimate();
    const tree = report.trees.find((candidate) => candidate.rootSaveId === 'save-slot-1')!;
    const [primaries, shadows, leaderboard] = await Promise.all([
      db.saves.bulkGet(['save-slot-1', branch.id]),
      db.saveIntegrityBackups.bulkGet(['save-slot-1', branch.id]),
      db.leaderboard.where('slotNumber').equals(1).toArray(),
    ]);
    const bytes = (row: unknown) => new TextEncoder().encode(JSON.stringify(row)).byteLength;
    const expectedPrimary = primaries.reduce((total, row) => total + bytes(row), 0);
    const expectedShadow = shadows.reduce((total, row) => total + bytes(row), 0);
    const expectedLeaderboard = leaderboard.reduce((total, row) => total + bytes(row), 0);

    expect(tree.saveIds).toEqual(['save-slot-1', branch.id]);
    expect(tree.primaryBytes).toBe(expectedPrimary);
    expect(tree.shadowBytes).toBe(expectedShadow);
    expect(tree.leaderboardBytes).toBe(expectedLeaderboard);
    expect(tree.totalBytes).toBe(expectedPrimary + expectedShadow + expectedLeaderboard);
    expect(tree.attribution).toBe('complete');
    expect(report.allMbdBytes).toBe(expectedPrimary + expectedShadow + expectedLeaderboard);
    expect(report.allMbdBytesKnown).toBe(true);
    expect(report.status).toBe('available');
  });

  it('does not let a rogue duplicate root steal a canonical slot tree or its slot-only leaderboard rows', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Canonical', snapshot);
    const canonical = await db.saves.get('save-slot-1');
    await db.saves.put({
      ...canonical!, id: 'rogue-root', name: 'Rogue', parentSaveId: null, isRootSave: true,
    });
    await db.saves.put({
      ...canonical!, id: 'rogue-branch', slotNumber: null, parentSaveId: 'rogue-root', isRootSave: false,
      branchMeta: { saveId: 'rogue-branch' } as SaveData['branchMeta'],
    });

    const report = await getLocalStorageEstimate();
    const tree = report.trees.find((candidate) => candidate.rootSaveId === 'save-slot-1')!;
    expect(tree.saveIds).toEqual(['save-slot-1']);
    expect(tree.leaderboardBytes).toBe(0);
    expect(tree.attribution).toBe('partial');
    expect(report.unattributedBytes).toBeGreaterThan(0);
    expect(report.status).toBe('partial');
  });

  it.each([
    ['save id', async (shadow: SaveData) => {
      await db.saveIntegrityBackups.delete(shadow.id);
      await db.saveIntegrityBackups.put({ ...shadow, id: 'wrong-shadow-id' });
    }],
    ['root linkage', async (shadow: SaveData) => db.saveIntegrityBackups.put({ ...shadow, parentSaveId: 'wrong-root' })],
    ['slot', async (shadow: SaveData) => db.saveIntegrityBackups.put({ ...shadow, slotNumber: 2 })],
    ['checksum', async (shadow: SaveData) => db.saveIntegrityBackups.put({ ...shadow, integrity: { ...shadow.integrity!, checksum: 'not-the-primary-checksum' } })],
    ['generation metadata', async (shadow: SaveData) => db.saveIntegrityBackups.put({ ...shadow, updatedAt: '2027-01-01T00:00:00.000Z' })],
  ])('treats a mismatched primary/shadow %s as unsafe and unattributable', async (_label, corruptShadow) => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Sealed root', snapshot);
    const shadow = await db.saveIntegrityBackups.get('save-slot-1');
    await corruptShadow(shadow!);

    const report = await getLocalStorageEstimate();
    expect(report.trees).toEqual([]);
    expect(report.status).toBe('partial');
    expect(report.unattributedBytes).toBeGreaterThan(0);
    expect(report.allMbdBytesKnown).toBe(true);
  });

  it.each([
    ['a missing root', 'missing-root', null],
    ['a rogue root', 'rogue-root', null],
    ['a conflicting branch slot', 'save-slot-1', 1],
  ])('leaves a branch with %s out of the canonical tree', async (_label, parentSaveId, slotNumber) => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Root', snapshot);
    const { branch } = await createBranchSave('save-slot-1', snapshot, 'what if');
    const primary = await db.saves.get(branch.id);
    await db.saves.put({ ...primary!, parentSaveId, slotNumber });

    const report = await getLocalStorageEstimate();
    const tree = report.trees.find((candidate) => candidate.rootSaveId === 'save-slot-1')!;
    expect(tree.saveIds).toEqual(['save-slot-1']);
    expect(report.status).toBe('partial');
    expect(report.unattributedBytes).toBeGreaterThan(0);
  });

  it('retains corrupt metadata and an orphan shadow in the all-MBD lower bound without fabricating a tree', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    const malformed = {
      id: 'corrupt-metadata', slotNumber: null, name: 'Corrupt', season: 1, day: 1,
      phase: snapshot.phase, schemaVersion: snapshot.schemaVersion, hasSnapshot: true, snapshot, legacyState: null,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', parentSaveId: 'no-root', isRootSave: false,
      branchMeta: 'not-a-branch-meta',
    } as unknown as SaveData;
    await db.saves.put(malformed);
    await db.saveIntegrityBackups.put({ ...malformed, id: 'orphan-shadow', parentSaveId: 'also-missing' });

    const report = await getLocalStorageEstimate();
    expect(report.trees).toEqual([]);
    expect(report.status).toBe('partial');
    expect(report.unattributedBytes).toBeGreaterThan(0);
    expect(report.allMbdBytes).toBeGreaterThan(0);
  });

  it('reports a known lower bound when one storable raw row cannot be JSON serialized', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Safe row remains measurable', snapshot);
    const unserializable = {
      id: 'json-bigint', slotNumber: null, name: 'BigInt', season: 1, day: 1,
      phase: snapshot.phase, schemaVersion: snapshot.schemaVersion, hasSnapshot: true, snapshot, legacyState: null,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', parentSaveId: 'missing', isRootSave: false, branchMeta: null,
      diagnosticOnly: BigInt(1),
    } as unknown as SaveData;
    await db.saves.put(unserializable);

    const report = await getLocalStorageEstimate();
    expect(report.status).toBe('partial');
    expect(report.allMbdBytesKnown).toBe(false);
    expect(report.allMbdBytes).toBeGreaterThan(0);
    expect(report.unattributedBytes).toBeNull();
    expect(report.message).toContain('could not be serialized');
  });

  it('returns unavailable nullable bytes when the readonly transaction fails', async () => {
    const transaction = vi.spyOn(db, 'transaction').mockRejectedValueOnce(new Error('read failure'));
    const report = await getLocalStorageEstimate();
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(report).toMatchObject({
      status: 'unavailable', allMbdBytes: null, allMbdBytesKnown: false, trees: [],
    });
    expect(report.unattributedBytes).toBeNull();
  });

  it('performs no write-side effect while reading the report', async () => {
    const snapshot = parseGameSnapshot(snapshotFixture);
    await saveGame(1, 'Read only', snapshot);
    const writes = [
      vi.spyOn(db.saves, 'put'), vi.spyOn(db.saves, 'delete'), vi.spyOn(db.saveIntegrityBackups, 'put'),
      vi.spyOn(db.saveIntegrityBackups, 'delete'), vi.spyOn(db.leaderboard, 'put'), vi.spyOn(db.leaderboard, 'delete'),
    ];
    await getLocalStorageEstimate();
    writes.forEach((write) => expect(write).not.toHaveBeenCalled());
  });
});
