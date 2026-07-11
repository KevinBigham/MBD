import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  SAVE_INTEGRITY_ALGORITHM,
  SAVE_INTEGRITY_PROJECTION,
  SAVE_INTEGRITY_VERSION,
  SaveIntegrityCanonicalizationError,
  SaveIntegrityUnavailableError,
  calculateSaveIntegrity,
  calculateSha256Hex,
  canonicalizeSaveIntegrityValue,
  sealSaveRecord,
  type SaveIntegrityCrypto,
  type SaveIntegrityRecord,
  verifySaveRecordIntegrity,
} from './saveIntegrity';

const cryptoLike = webcrypto as unknown as SaveIntegrityCrypto;

function saveRecord(overrides: Partial<SaveIntegrityRecord> = {}): SaveIntegrityRecord {
  return {
    id: 'save-root-1',
    slotNumber: 1,
    name: 'Chicago Dynasty',
    season: 7,
    day: 42,
    phase: 'regular',
    schemaVersion: 34,
    hasSnapshot: true,
    snapshot: {
      schemaVersion: 34,
      teams: [
        { id: 'team-b', wins: 22 },
        { id: 'team-a', wins: 25 },
      ],
      nested: { z: 3, a: 1 },
    },
    legacyState: null,
    createdAt: '2026-04-02T19:40:00.000Z',
    updatedAt: '2026-04-02T19:41:02.000Z',
    parentSaveId: null,
    isRootSave: true,
    branchMeta: {
      scenarioId: 'scenario-1',
      label: 'Hold the line',
    },
    ...overrides,
  };
}

describe('save integrity canonicalization and SHA-256', () => {
  it('matches the known SHA-256 abc vector using UTF-8 Web Crypto', async () => {
    await expect(calculateSha256Hex('abc', cryptoLike)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('recursively sorts plain-object keys while preserving equivalent values', async () => {
    const left = saveRecord({
      snapshot: { z: 3, nested: { beta: 2, alpha: 1 } },
      branchMeta: { z: 'last', a: 'first' },
    });
    const right = saveRecord({
      snapshot: { nested: { alpha: 1, beta: 2 }, z: 3 },
      branchMeta: { a: 'first', z: 'last' },
    });

    expect(canonicalizeSaveIntegrityValue({ z: 2, a: { y: 1, b: 0 } })).toBe(
      '{"a":{"b":0,"y":1},"z":2}',
    );
    await expect(calculateSaveIntegrity(left, cryptoLike)).resolves.toEqual(
      await calculateSaveIntegrity(right, cryptoLike),
    );
  });

  it('preserves array order in the protected material', async () => {
    const forward = await calculateSaveIntegrity(
      saveRecord({ snapshot: { values: ['a', 'b', 'c'] } }),
      cryptoLike,
    );
    const reverse = await calculateSaveIntegrity(
      saveRecord({ snapshot: { values: ['c', 'b', 'a'] } }),
      cryptoLike,
    );

    expect(reverse.checksum).not.toBe(forward.checksum);
  });

  it.each([
    ['id', { id: 'save-root-2' }],
    ['slotNumber', { slotNumber: 2 }],
    ['name', { name: 'Detroit Dynasty' }],
    ['season', { season: 8 }],
    ['day', { day: 43 }],
    ['phase', { phase: 'offseason' }],
    ['schemaVersion', { schemaVersion: 33 }],
    ['hasSnapshot', { hasSnapshot: false }],
    ['snapshot', { snapshot: { schemaVersion: 34, teams: [] } }],
    ['legacyState', { legacyState: '{"legacy":true}' }],
    ['gameState', { gameState: '{"deprecated":true}' }],
    ['createdAt', { createdAt: '2026-04-02T19:39:00.000Z' }],
    ['updatedAt', { updatedAt: '2026-04-02T19:42:02.000Z' }],
    ['parentSaveId', { parentSaveId: 'save-root-0' }],
    ['isRootSave', { isRootSave: false }],
    ['branchMeta', { branchMeta: { scenarioId: 'scenario-2' } }],
  ] satisfies Array<[string, Partial<SaveIntegrityRecord>]>)('binds the %s envelope field', async (_field, override) => {
    const baseline = await calculateSaveIntegrity(saveRecord(), cryptoLike);
    const changed = await calculateSaveIntegrity(saveRecord(override), cryptoLike);

    expect(changed.checksum).not.toBe(baseline.checksum);
  });

  it('normalizes the absent deprecated gameState field to null', async () => {
    const absent = await calculateSaveIntegrity(saveRecord(), cryptoLike);
    const explicitNull = await calculateSaveIntegrity(saveRecord({ gameState: null }), cryptoLike);

    expect(absent).toEqual(explicitNull);
  });

  it('excludes only integrity metadata from the protected projection', async () => {
    const baseline = await calculateSaveIntegrity(saveRecord(), cryptoLike);
    const withUnrelatedSeal = await calculateSaveIntegrity(saveRecord({
      integrity: {
        version: 999,
        algorithm: 'other',
        projection: 'other',
        checksum: 'not-a-checksum',
      },
    }), cryptoLike);

    expect(withUnrelatedSeal).toEqual(baseline);
  });

  it.each([
    ['undefined', { value: undefined }],
    ['NaN', { value: Number.NaN }],
    ['Infinity', { value: Number.POSITIVE_INFINITY }],
    ['bigint', { value: BigInt(1) }],
    ['function', { value: () => undefined }],
    ['symbol', { value: Symbol('nope') }],
    ['Date', { value: new Date('2026-01-01T00:00:00.000Z') }],
    ['Map', { value: new Map([['key', 'value']]) }],
    ['non-plain object', Object.create({ inherited: true }) as object],
    ['sparse array', { value: Array(1) }],
  ])('rejects the unsupported %s value', (_label, value) => {
    expect(() => canonicalizeSaveIntegrityValue(value)).toThrow(
      SaveIntegrityCanonicalizationError,
    );
  });

  it('rejects cyclic values but permits repeated non-cyclic object references', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const shared = { safe: true };

    expect(() => canonicalizeSaveIntegrityValue(cyclic)).toThrow('cyclic');
    expect(canonicalizeSaveIntegrityValue({ first: shared, second: shared })).toBe(
      '{"first":{"safe":true},"second":{"safe":true}}',
    );
  });
});

describe('save integrity sealing and verification', () => {
  it('seals a copied record with fixed versioned metadata and verifies it', async () => {
    const original = saveRecord();
    const sealed = await sealSaveRecord(original, cryptoLike);

    expect(original.integrity).toBeUndefined();
    expect(sealed.integrity).toEqual({
      version: SAVE_INTEGRITY_VERSION,
      algorithm: SAVE_INTEGRITY_ALGORITHM,
      projection: SAVE_INTEGRITY_PROJECTION,
      checksum: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    await expect(verifySaveRecordIntegrity(sealed, cryptoLike)).resolves.toEqual({
      status: 'valid',
      metadata: sealed.integrity,
      checksum: sealed.integrity.checksum,
    });
  });

  it('distinguishes a genuinely unsealed record', async () => {
    await expect(verifySaveRecordIntegrity(saveRecord(), cryptoLike)).resolves.toEqual({
      status: 'unsealed',
    });
  });

  it.each([
    ['null metadata', null],
    ['array metadata', []],
    ['missing metadata fields', { version: 1 }],
    ['fractional version', {
      version: 1.5,
      algorithm: SAVE_INTEGRITY_ALGORITHM,
      projection: SAVE_INTEGRITY_PROJECTION,
      checksum: '0'.repeat(64),
    }],
    ['short checksum', {
      version: SAVE_INTEGRITY_VERSION,
      algorithm: SAVE_INTEGRITY_ALGORITHM,
      projection: SAVE_INTEGRITY_PROJECTION,
      checksum: 'abcd',
    }],
    ['uppercase checksum', {
      version: SAVE_INTEGRITY_VERSION,
      algorithm: SAVE_INTEGRITY_ALGORITHM,
      projection: SAVE_INTEGRITY_PROJECTION,
      checksum: 'A'.repeat(64),
    }],
    ['unknown metadata fields', {
      version: SAVE_INTEGRITY_VERSION,
      algorithm: SAVE_INTEGRITY_ALGORITHM,
      projection: SAVE_INTEGRITY_PROJECTION,
      checksum: '0'.repeat(64),
      extra: true,
    }],
  ])('classifies %s as malformed', async (_label, integrity) => {
    const result = await verifySaveRecordIntegrity(saveRecord({ integrity }), cryptoLike);

    expect(result).toMatchObject({ status: 'invalid', reason: 'malformed' });
  });

  it.each([
    ['version', {
      version: 2,
      algorithm: SAVE_INTEGRITY_ALGORITHM,
      projection: SAVE_INTEGRITY_PROJECTION,
      checksum: '0'.repeat(64),
    }],
    ['algorithm', {
      version: SAVE_INTEGRITY_VERSION,
      algorithm: 'SHA-512',
      projection: SAVE_INTEGRITY_PROJECTION,
      checksum: '0'.repeat(64),
    }],
    ['projection', {
      version: SAVE_INTEGRITY_VERSION,
      algorithm: SAVE_INTEGRITY_ALGORITHM,
      projection: 'mbd-save-record-v2',
      checksum: '0'.repeat(64),
    }],
  ])('classifies an unsupported %s', async (_label, integrity) => {
    const result = await verifySaveRecordIntegrity(saveRecord({ integrity }), cryptoLike);

    expect(result).toMatchObject({ status: 'invalid', reason: 'unsupported' });
  });

  it('returns both stored expected and calculated actual checksums on mismatch', async () => {
    const sealed = await sealSaveRecord(saveRecord(), cryptoLike);
    const tampered = { ...sealed, day: sealed.day + 1 };
    const actual = await calculateSaveIntegrity(tampered, cryptoLike);

    await expect(verifySaveRecordIntegrity(tampered, cryptoLike)).resolves.toEqual({
      status: 'invalid',
      reason: 'mismatch',
      message: 'The save record does not match its integrity checksum.',
      metadata: sealed.integrity,
      expectedChecksum: sealed.integrity.checksum,
      actualChecksum: actual.checksum,
    });
  });

  it('classifies malformed protected record data before trusting the seal', async () => {
    const sealed = await sealSaveRecord(saveRecord(), cryptoLike);
    const malformed = {
      ...sealed,
      snapshot: { nested: undefined },
    };

    await expect(verifySaveRecordIntegrity(malformed, cryptoLike)).resolves.toMatchObject({
      status: 'invalid',
      reason: 'malformed',
    });
  });

  it('reports unavailable Web Crypto without a fallback digest', async () => {
    const sealed = await sealSaveRecord(saveRecord(), cryptoLike);

    await expect(calculateSaveIntegrity(saveRecord(), null)).rejects.toBeInstanceOf(
      SaveIntegrityUnavailableError,
    );
    await expect(verifySaveRecordIntegrity(sealed, null)).resolves.toMatchObject({
      status: 'invalid',
      reason: 'unavailable',
      message: 'Web Crypto SHA-256 is unavailable.',
      cause: expect.any(String),
    });
  });

  it('preserves a concise Web Crypto rejection cause', async () => {
    const sealed = await sealSaveRecord(saveRecord(), cryptoLike);
    const disabledCrypto = {
      subtle: {
        digest: async () => {
          throw new Error('Browser policy disabled digest');
        },
      },
    } as unknown as SaveIntegrityCrypto;

    await expect(verifySaveRecordIntegrity(sealed, disabledCrypto)).resolves.toMatchObject({
      status: 'invalid',
      reason: 'unavailable',
      cause: 'Browser policy disabled digest',
    });
  });
});
