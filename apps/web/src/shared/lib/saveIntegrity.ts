export const SAVE_INTEGRITY_VERSION = 1 as const;
export const SAVE_INTEGRITY_ALGORITHM = 'SHA-256' as const;
export const SAVE_INTEGRITY_PROJECTION = 'mbd-save-record-v1' as const;

export interface SaveIntegrityMetadata {
  version: typeof SAVE_INTEGRITY_VERSION;
  algorithm: typeof SAVE_INTEGRITY_ALGORITHM;
  projection: typeof SAVE_INTEGRITY_PROJECTION;
  checksum: string;
}

export interface SaveIntegrityRecord {
  id: string;
  slotNumber: number | null;
  name: string;
  season: number;
  day: number;
  phase: string;
  schemaVersion: number;
  hasSnapshot: boolean;
  snapshot: unknown;
  legacyState: string | null;
  gameState?: string | null;
  createdAt: string;
  updatedAt: string;
  parentSaveId: string | null;
  isRootSave: boolean;
  branchMeta: unknown;
  integrity?: unknown;
}

export type SaveIntegrityCrypto = Pick<Crypto, 'subtle'>;

export type SaveIntegrityVerification =
  | { status: 'unsealed' }
  | {
    status: 'valid';
    metadata: SaveIntegrityMetadata;
    checksum: string;
  }
  | {
    status: 'invalid';
    reason: 'malformed' | 'unsupported';
    message: string;
    metadata?: SaveIntegrityMetadata;
    expectedChecksum?: string;
  }
  | {
    status: 'invalid';
    reason: 'mismatch';
    message: string;
    metadata: SaveIntegrityMetadata;
    expectedChecksum: string;
    actualChecksum: string;
  }
  | {
    status: 'invalid';
    reason: 'unavailable';
    message: string;
    cause: string;
  };

export class SaveIntegrityCanonicalizationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SaveIntegrityCanonicalizationError';
  }
}

export class SaveIntegrityUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SaveIntegrityUnavailableError';
  }
}

function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function canonicalizeValue(value: unknown, ancestors: Set<object>): string {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'string':
    case 'boolean':
      return JSON.stringify(value);
    case 'number':
      if (!Number.isFinite(value)) {
        throw new SaveIntegrityCanonicalizationError('Canonical JSON requires finite numbers.');
      }
      return JSON.stringify(value);
    case 'undefined':
      throw new SaveIntegrityCanonicalizationError('Canonical JSON does not support undefined.');
    case 'bigint':
    case 'function':
    case 'symbol':
      throw new SaveIntegrityCanonicalizationError(
        `Canonical JSON does not support ${typeof value} values.`,
      );
    case 'object':
      break;
    default:
      throw new SaveIntegrityCanonicalizationError(
        `Canonical JSON does not support ${describeValue(value)} values.`,
      );
  }

  if (ancestors.has(value)) {
    throw new SaveIntegrityCanonicalizationError('Canonical JSON does not support cyclic values.');
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const items: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!(index in value)) {
          throw new SaveIntegrityCanonicalizationError(
            'Canonical JSON does not support sparse arrays.',
          );
        }
        items.push(canonicalizeValue(value[index], ancestors));
      }
      return `[${items.join(',')}]`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new SaveIntegrityCanonicalizationError(
        'Canonical JSON supports only arrays and plain objects.',
      );
    }

    const objectValue = value as Record<string, unknown>;
    const fields = Object.keys(objectValue).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalizeValue(objectValue[key], ancestors)}`
    ));
    return `{${fields.join(',')}}`;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalizeSaveIntegrityValue(value: unknown): string {
  try {
    return canonicalizeValue(value, new Set<object>());
  } catch (error) {
    if (error instanceof SaveIntegrityCanonicalizationError) throw error;
    throw new SaveIntegrityCanonicalizationError('The value cannot be represented as canonical JSON.', {
      cause: error,
    });
  }
}

function defaultCrypto(): SaveIntegrityCrypto | null {
  return typeof globalThis.crypto === 'object' ? globalThis.crypto : null;
}

function causeText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return typeof error === 'string' && error ? error : 'Unknown Web Crypto failure';
}

export async function calculateSha256Hex(
  value: string,
  cryptoLike: SaveIntegrityCrypto | null = defaultCrypto(),
): Promise<string> {
  let subtle: SubtleCrypto | undefined;
  try {
    subtle = cryptoLike?.subtle;
  } catch (error) {
    throw new SaveIntegrityUnavailableError('Web Crypto SHA-256 is unavailable.', {
      cause: error,
    });
  }

  if (!subtle || typeof subtle.digest !== 'function') {
    throw new SaveIntegrityUnavailableError('Web Crypto SHA-256 is unavailable.');
  }

  if (typeof TextEncoder !== 'function') {
    throw new SaveIntegrityUnavailableError('UTF-8 encoding is unavailable.');
  }

  let digest: ArrayBuffer;
  try {
    digest = await subtle.digest(
      SAVE_INTEGRITY_ALGORITHM,
      new TextEncoder().encode(value),
    );
  } catch (error) {
    throw new SaveIntegrityUnavailableError('Web Crypto SHA-256 could not calculate a checksum.', {
      cause: error,
    });
  }

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function projectSaveRecord(record: SaveIntegrityRecord): Record<string, unknown> {
  return {
    id: record.id,
    slotNumber: record.slotNumber,
    name: record.name,
    season: record.season,
    day: record.day,
    phase: record.phase,
    schemaVersion: record.schemaVersion,
    hasSnapshot: record.hasSnapshot,
    snapshot: record.snapshot,
    legacyState: record.legacyState,
    gameState: record.gameState ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    parentSaveId: record.parentSaveId,
    isRootSave: record.isRootSave,
    branchMeta: record.branchMeta,
  };
}

function integrityMaterial(record: SaveIntegrityRecord): string {
  return canonicalizeSaveIntegrityValue({
    version: SAVE_INTEGRITY_VERSION,
    algorithm: SAVE_INTEGRITY_ALGORITHM,
    projection: SAVE_INTEGRITY_PROJECTION,
    record: projectSaveRecord(record),
  });
}

export async function calculateSaveIntegrity(
  record: SaveIntegrityRecord,
  cryptoLike: SaveIntegrityCrypto | null = defaultCrypto(),
): Promise<SaveIntegrityMetadata> {
  const checksum = await calculateSha256Hex(integrityMaterial(record), cryptoLike);
  return {
    version: SAVE_INTEGRITY_VERSION,
    algorithm: SAVE_INTEGRITY_ALGORITHM,
    projection: SAVE_INTEGRITY_PROJECTION,
    checksum,
  };
}

export async function sealSaveRecord<T extends SaveIntegrityRecord>(
  record: T,
  cryptoLike: SaveIntegrityCrypto | null = defaultCrypto(),
): Promise<T & { integrity: SaveIntegrityMetadata }> {
  const integrity = await calculateSaveIntegrity(record, cryptoLike);
  return { ...record, integrity };
}

type ObservedIntegrityMetadata = {
  version: number;
  algorithm: string;
  projection: string;
  checksum: string;
};

function readMetadata(value: unknown):
  | { status: 'malformed'; message: string }
  | { status: 'unsupported'; message: string }
  | { status: 'supported'; metadata: SaveIntegrityMetadata } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { status: 'malformed', message: 'The save integrity metadata is not an object.' };
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return { status: 'malformed', message: 'The save integrity metadata is not a plain object.' };
  }

  const candidate = value as Partial<ObservedIntegrityMetadata>;
  if (
    !Number.isInteger(candidate.version)
    || typeof candidate.algorithm !== 'string'
    || typeof candidate.projection !== 'string'
    || typeof candidate.checksum !== 'string'
  ) {
    return { status: 'malformed', message: 'The save integrity metadata has invalid fields.' };
  }

  if (
    candidate.version !== SAVE_INTEGRITY_VERSION
    || candidate.algorithm !== SAVE_INTEGRITY_ALGORITHM
    || candidate.projection !== SAVE_INTEGRITY_PROJECTION
  ) {
    return {
      status: 'unsupported',
      message: 'The save uses an unsupported integrity format.',
    };
  }

  const supportedFields = ['algorithm', 'checksum', 'projection', 'version'];
  const metadataFields = Object.keys(value).sort();
  if (
    metadataFields.length !== supportedFields.length
    || metadataFields.some((field, index) => field !== supportedFields[index])
  ) {
    return { status: 'malformed', message: 'The save integrity metadata has unknown fields.' };
  }

  if (!/^[0-9a-f]{64}$/.test(candidate.checksum)) {
    return { status: 'malformed', message: 'The save integrity checksum is malformed.' };
  }

  return {
    status: 'supported',
    metadata: candidate as SaveIntegrityMetadata,
  };
}

export async function verifySaveRecordIntegrity(
  record: SaveIntegrityRecord,
  cryptoLike: SaveIntegrityCrypto | null = defaultCrypto(),
): Promise<SaveIntegrityVerification> {
  if (record.integrity === undefined) return { status: 'unsealed' };

  const parsed = readMetadata(record.integrity);
  if (parsed.status !== 'supported') {
    return {
      status: 'invalid',
      reason: parsed.status,
      message: parsed.message,
    };
  }

  let actual: SaveIntegrityMetadata;
  try {
    actual = await calculateSaveIntegrity(record, cryptoLike);
  } catch (error) {
    if (error instanceof SaveIntegrityUnavailableError) {
      return {
        status: 'invalid',
        reason: 'unavailable',
        message: error.message,
        cause: causeText(error.cause),
      };
    }
    if (error instanceof SaveIntegrityCanonicalizationError) {
      return {
        status: 'invalid',
        reason: 'malformed',
        message: error.message,
        metadata: parsed.metadata,
        expectedChecksum: parsed.metadata.checksum,
      };
    }
    return {
      status: 'invalid',
      reason: 'unavailable',
      message: 'Save integrity verification is unavailable.',
      cause: causeText(error),
    };
  }

  if (actual.checksum !== parsed.metadata.checksum) {
    return {
      status: 'invalid',
      reason: 'mismatch',
      message: 'The save record does not match its integrity checksum.',
      metadata: parsed.metadata,
      expectedChecksum: parsed.metadata.checksum,
      actualChecksum: actual.checksum,
    };
  }

  return {
    status: 'valid',
    metadata: parsed.metadata,
    checksum: actual.checksum,
  };
}
