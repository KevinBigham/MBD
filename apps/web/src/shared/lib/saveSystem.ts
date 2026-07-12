import Dexie, { type Table } from 'dexie';
import {
  CURRENT_GAME_SNAPSHOT_VERSION,
  MINIMUM_SUPPORTED_GAME_SNAPSHOT_VERSION,
  GameSnapshotSchema,
  SimPhaseEnum,
  parseGameSnapshot,
  type GameSnapshot,
  type SimPhase,
  type WhatIfBranchMeta,
} from '@mbd/contracts';
import {
  calculateDynastyLeaderboardScore,
  materializeSimulationImportDefaults,
} from '@mbd/sim-core';
import {
  SAVE_IO_BUDGET_MS,
  measureAsyncOperation,
} from './performance';
import {
  calculateSaveIntegrity,
  canonicalizeSaveIntegrityValue,
  SaveIntegrityUnavailableError,
  sealSaveRecord,
  verifySaveRecordIntegrity,
  type SaveIntegrityMetadata,
} from './saveIntegrity';
import {
  assertActiveSaveSessionOwned,
  assertAllSaveTreeSessionsOwned,
  assertSaveTreeSessionOwned,
  isSaveSessionOwnershipEnforcementEnabled,
  SaveSessionOwnershipError,
} from './saveSessionOwnership';

export const SAVE_SLOTS = [1, 2, 3, 4, 5] as const;

function isSupportedSaveSlot(value: unknown): value is (typeof SAVE_SLOTS)[number] {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Number.isInteger(value)
    && SAVE_SLOTS.includes(value as (typeof SAVE_SLOTS)[number]);
}

export interface SaveData {
  id: string;
  slotNumber: number | null;
  name: string;
  season: number;
  day: number;
  phase: SimPhase;
  schemaVersion: number;
  hasSnapshot: boolean;
  snapshot: GameSnapshot | null;
  legacyState: string | null;
  createdAt: string;
  updatedAt: string;
  gameState?: string;
  parentSaveId: string | null;
  isRootSave: boolean;
  branchMeta: WhatIfBranchMeta | null;
  integrity?: SaveIntegrityMetadata;
}

export interface LeaderboardEntry {
  id: string;
  slotNumber: number;
  scenarioId: string | null;
  gmName: string;
  teamId: string;
  teamName: string;
  season: number;
  score: number;
  record: string;
  championships: number;
  summary: string;
  updatedAt: string;
}

/**
 * A bounded write-ahead record for one regular-season advance command.  The
 * snapshot stays in the primary/shadow pair; this row deliberately records
 * only the identity needed to prove that pair is still the command baseline.
 */
export interface SimAdvanceIntent {
  journalVersion: 1;
  saveId: string;
  rootSaveId: string;
  operation: 'sim_day' | 'sim_week' | 'sim_month' | 'sim_to_playoffs';
  baselineChecksum: string;
  baselineSeason: number;
  baselineDay: number;
  baselinePhase: SimPhase;
  attempt: number;
  token: string;
}

export type SimAdvanceOperation = SimAdvanceIntent['operation'];

/** A deterministic proof/CAS/topology conflict, never a retryable storage outage. */
export class SimAdvanceEvidenceConflictError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SimAdvanceEvidenceConflictError';
  }
}

export type SaveInspectionResult =
  | { status: 'ok'; slot: number | null; save: SaveData }
  | { status: 'empty'; slot: number | null }
  | { status: 'legacy'; slot: number | null; save: SaveData; message: string }
  | { status: 'corrupt'; slot: number | null; message: string; raw?: Partial<SaveData> | null };

export type SaveLoadFailureReason =
  | 'parse'
  | 'zod'
  | 'version_too_new'
  | 'version_too_old'
  | 'migration_failed'
  | 'integrity_failed'
  | 'storage_failed';

export type SaveIntegrityFailureKind =
  | 'mismatch'
  | 'malformed'
  | 'unsupported'
  | 'unavailable'
  | 'missing';

export interface SaveLoadFailureDetail {
  slotId: string;
  slotNumber: number | null;
  message: string;
  rawJson: string | null;
  schemaVersion?: number;
  currentVersion?: number;
  minimumSupportedVersion?: number;
  integrityFailureKind?: SaveIntegrityFailureKind;
  expectedChecksum?: string;
  actualChecksum?: string;
  repairAvailable?: boolean;
  repairUpdatedAt?: string;
}

export type LoadSaveSafelyResult =
  | {
    ok: true;
    snapshot: GameSnapshot;
    save: SaveData;
    rawJson: string;
  }
  | {
    ok: false;
    reason: SaveLoadFailureReason;
    detail: SaveLoadFailureDetail;
  };

export interface SaveTreeEntry {
  save: SaveData;
  branches: SaveData[];
}

export interface SaveSessionTarget {
  saveId: string;
  rootSaveId: string;
  slotNumber: number;
  name: string | null;
}

interface AutoSaveJob {
  slot: number;
  name: string;
  state: object;
}

interface Deferred {
  resolve: () => void;
  reject: (error: unknown) => void;
}

interface SnapshotExportPayload {
  kind: 'mbd-save-export';
  name: string;
  exportedAt: string;
  snapshot: GameSnapshot;
}

type IdleCancel = () => void;
type IdleScheduler = (callback: () => void) => IdleCancel;

interface AutoSaveScheduler {
  schedule(job: AutoSaveJob): Promise<void>;
  flush(): Promise<void>;
  hasPending(): boolean;
}

class MBDDatabase extends Dexie {
  saves!: Table<SaveData, string>;
  saveIntegrityBackups!: Table<SaveData, string>;
  leaderboard!: Table<LeaderboardEntry, string>;
  simAdvanceIntents!: Table<SimAdvanceIntent, string>;

  constructor() {
    super('mbd-saves');
    this.version(1).stores({
      saves: 'id, slotNumber, updatedAt',
    });
    this.version(2)
      .stores({
        saves: 'id, slotNumber, updatedAt, hasSnapshot',
      })
      .upgrade((tx) =>
        tx
          .table('saves')
          .toCollection()
          .modify((record: SaveData) => {
            if (!record.snapshot && record.gameState) {
              record.schemaVersion = 1;
              record.hasSnapshot = false;
              record.legacyState = record.gameState;
            }
            if (record.snapshot) {
              record.schemaVersion = 2;
              record.hasSnapshot = true;
              record.legacyState = null;
            }
          }));
    this.version(3).stores({
      saves: 'id, slotNumber, updatedAt, hasSnapshot',
      leaderboard: 'id, slotNumber, scenarioId, score, updatedAt',
    });
    this.version(4).stores({
      saves: 'id, slotNumber, parentSaveId, updatedAt, hasSnapshot',
      leaderboard: 'id, slotNumber, scenarioId, score, updatedAt',
    });
    this.version(5).stores({
      saves: 'id, slotNumber, parentSaveId, updatedAt, hasSnapshot',
      saveIntegrityBackups: 'id, parentSaveId, updatedAt',
      leaderboard: 'id, slotNumber, scenarioId, score, updatedAt',
    });
    // Compatibility tombstone: builds opening this v6 database must understand
    // the operational WAL store before accepting write authority.
    this.version(6).stores({
      saves: 'id, slotNumber, parentSaveId, updatedAt, hasSnapshot',
      saveIntegrityBackups: 'id, parentSaveId, updatedAt',
      leaderboard: 'id, slotNumber, scenarioId, score, updatedAt',
      simAdvanceIntents: 'saveId,&rootSaveId',
    });
  }
}

export const db = new MBDDatabase();

/**
 * Logical JSON measurements of the records MBD owns in IndexedDB.  These are
 * deliberately not a claim about IndexedDB's physical footprint: indexes,
 * structured-clone overhead, compression, and other origin data are browser
 * implementation details.
 */
export interface LocalStorageTreeEstimate {
  rootSaveId: string;
  slotNumber: number;
  saveIds: string[];
  primaryBytes: number;
  shadowBytes: number;
  leaderboardBytes: number;
  journalBytes: number;
  totalBytes: number;
  attribution: 'complete' | 'partial';
}

export interface LocalStorageEstimate {
  status: 'available' | 'partial' | 'unavailable';
  /** Bytes from rows that serialized successfully; not a claimed total if partial. */
  allMbdBytes: number | null;
  allMbdBytesKnown: boolean;
  /** Null means unsafe rows exist but one or more cannot be serialized. */
  unattributedBytes: number | null;
  trees: LocalStorageTreeEstimate[];
  message: string | null;
}

function rawJsonBytes(value: unknown): number | null {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) return null;
    return new TextEncoder().encode(serialized).byteLength;
  } catch {
    return null;
  }
}

/**
 * Take one read-only Dexie snapshot before sizing.  This intentionally never
 * parses, normalizes, repairs, reseals, or updates any record: malformed and
 * orphaned rows still consume local MBD storage and therefore remain in the
 * all-MBD total instead of being silently assigned to a dynasty.
 */
export async function getLocalStorageEstimate(): Promise<LocalStorageEstimate> {
  if (!hasIndexedDBSupport()) {
    return { status: 'unavailable', allMbdBytes: null, allMbdBytesKnown: false, unattributedBytes: null, trees: [], message: 'Local IndexedDB is unavailable in this browser context.' };
  }

  try {
    const [primaries, shadows, leaderboard, intents] = await db.transaction(
      'r', db.saves, db.saveIntegrityBackups, db.leaderboard, db.simAdvanceIntents,
      async () => Promise.all([
        db.saves.toArray(),
        db.saveIntegrityBackups.toArray(),
        db.leaderboard.toArray(),
        db.simAdvanceIntents.toArray(),
      ]),
    );
    const primaryById = new Map(primaries.map((record) => [record.id, record]));
    const shadowById = new Map(shadows.map((record) => [record.id, record]));
    const bytesByPrimary = new Map(primaries.map((record) => [record.id, rawJsonBytes(record)]));
    const bytesByShadow = new Map(shadows.map((record) => [record.id, rawJsonBytes(record)]));
    const leaderboardBytes = leaderboard.map((record) => ({ record, bytes: rawJsonBytes(record) }));
    const intentBytes = intents.map((record) => ({ record, bytes: rawJsonBytes(record) }));
    const allRows = [
      ...bytesByPrimary.values(),
      ...bytesByShadow.values(),
      ...leaderboardBytes.map((entry) => entry.bytes),
      ...intentBytes.map((entry) => entry.bytes),
    ];
    const allMbdBytes = allRows.reduce<number>((total, bytes) => total + (bytes ?? 0), 0);
    const serializingFailed = allRows.some((bytes) => bytes == null);
    const trees: LocalStorageTreeEstimate[] = [];
    const attributed = new Set<string>();

    const isTrustedTopologyRecord = (record: SaveData): boolean => {
      const shadow = shadowById.get(record.id);
      // v4-era checksumless primaries legitimately have no shadow. Once a
      // shadow exists, only exact copies are safe relationship evidence.
      return shadow
        ? recordsAreExactCopies(record.id, record, shadow)
        : !record.integrity;
    };
    const isCanonicalRoot = (record: SaveData): boolean => (
      record.isRootSave
      && isSupportedSaveSlot(record.slotNumber)
      && record.id === rootSaveId(record.slotNumber)
      && record.parentSaveId === null
      && record.branchMeta == null
      && isTrustedTopologyRecord(record)
    );
    const isTrustedBranchForRoot = (record: SaveData, root: SaveData): boolean => (
      !record.isRootSave
      && record.slotNumber == null
      && record.parentSaveId === root.id
      && record.branchMeta?.saveId === record.id
      && isTrustedTopologyRecord(record)
    );
    for (const root of primaries.filter(isCanonicalRoot)) {
      const rootId = root.id;
      const saveIds = [rootId, ...primaries
        .filter((record) => isTrustedBranchForRoot(record, root))
        .map((record) => record.id)
        .sort((left, right) => left.localeCompare(right))];
      let primaryBytes = 0;
      let shadowBytes = 0;
      let partial = false;
      for (const saveId of saveIds) {
        const primaryBytesForId = bytesByPrimary.get(saveId);
        const shadowBytesForId = bytesByShadow.get(saveId);
        if (primaryBytesForId == null) partial = true;
        else primaryBytes += primaryBytesForId;
        // A checksumless legacy primary with no shadow is a single actual row,
        // not an invented duplicate. A present but mismatched shadow is unsafe
        // to attribute and remains in the all-MBD total.
        const primary = primaryById.get(saveId);
        const shadow = shadowById.get(saveId);
        if (shadow) {
          if (shadowBytesForId == null || !primary || !recordsAreExactCopies(saveId, primary, shadow)) {
            partial = true;
          } else {
            shadowBytes += shadowBytesForId;
          }
        }
        attributed.add(`save:${saveId}`);
        if (shadow && shadowBytesForId != null) attributed.add(`shadow:${saveId}`);
      }
      // A slot is only a safe leaderboard owner when it has exactly one
      // canonical root. A duplicate/rogue root can make slot-only leaderboard
      // rows ambiguous, so retain their bytes in the all-MBD lower bound.
      const conflictingRootSlot = primaries.some((record) => record.id !== rootId
        && record.isRootSave
        && record.slotNumber === root.slotNumber);
      const slotLeaderboard = leaderboardBytes.filter(({ record }) => record.slotNumber === root.slotNumber);
      const slotLeaderboardBytes = conflictingRootSlot
        ? 0
        : slotLeaderboard.reduce((total, entry) => total + (entry.bytes ?? 0), 0);
      const hasBadLeaderboard = slotLeaderboard.some(({ bytes }) => bytes == null);
      if (!conflictingRootSlot) {
        slotLeaderboard.forEach(({ record }) => attributed.add(`leaderboard:${record.id}`));
      }
      // A journal row is operational evidence only when it names an existing
      // trusted exact save in this tree and repeats the canonical root ID.
      const treeIntent = intentBytes.find(({ record }) => (
        record.rootSaveId === rootId
        && saveIds.includes(record.saveId)
        && hasValidSimAdvanceIntentShape(record, record.saveId, rootId)
      ));
      const journalBytes = treeIntent?.bytes ?? 0;
      if (treeIntent?.bytes != null) {
        attributed.add(`intent:${treeIntent.record.saveId}`);
      }
      trees.push({
        rootSaveId: rootId,
        slotNumber: root.slotNumber!,
        saveIds,
        primaryBytes,
        shadowBytes,
        leaderboardBytes: slotLeaderboardBytes,
        journalBytes,
        totalBytes: primaryBytes + shadowBytes + slotLeaderboardBytes + journalBytes,
        attribution: partial || hasBadLeaderboard || conflictingRootSlot || (treeIntent != null && treeIntent.bytes == null) ? 'partial' : 'complete',
      });
    }
    const unattributedRows = [
      ...primaries.map((record) => ({ key: `save:${record.id}`, bytes: bytesByPrimary.get(record.id) })),
      ...shadows.map((record) => ({ key: `shadow:${record.id}`, bytes: bytesByShadow.get(record.id) })),
      ...leaderboardBytes.map(({ record, bytes }) => ({ key: `leaderboard:${record.id}`, bytes })),
      ...intentBytes.map(({ record, bytes }) => ({ key: `intent:${record.saveId}`, bytes })),
    ].filter((entry) => !attributed.has(entry.key));
    const unattributedBytes = unattributedRows.some((entry) => entry.bytes == null)
      ? null
      : unattributedRows.reduce<number>((total, entry) => total + entry.bytes!, 0);
    const partial = serializingFailed || unattributedBytes == null || unattributedBytes > 0 || trees.some((tree) => tree.attribution === 'partial');
    const message = serializingFailed
      ? 'One or more local MBD rows could not be serialized; the all-MBD value is a known lower bound.'
      : partial
        ? 'Some local MBD rows could not be safely attributed; they remain included in the all-MBD estimate.'
        : null;
    return {
      status: partial ? 'partial' : 'available',
      allMbdBytes,
      allMbdBytesKnown: !serializingFailed,
      unattributedBytes,
      trees: trees.sort((left, right) => left.slotNumber - right.slotNumber),
      message,
    };
  } catch {
    return { status: 'unavailable', allMbdBytes: null, allMbdBytesKnown: false, unattributedBytes: null, trees: [], message: 'MBD could not read local save records without changing them.' };
  }
}
const MAX_BRANCHES_PER_SAVE = 3;
let branchIdCounter = 0;
const saveWriteTails = new Map<string, Promise<void>>();

export interface SaveGameOptions {
  replaceExistingRootBranchMetadata?: boolean;
}

type SaveWriteMetadata = {
  slotNumber: number | null;
  parentSaveId: string | null;
  isRootSave: boolean;
  branchMeta: WhatIfBranchMeta | null;
  replaceExistingRootBranchMetadata?: boolean;
  deleteExistingBranchRows?: boolean;
  deleteExistingBranchIds?: string[];
};

async function runSaveWriteInOrder<T>(
  saveId: string,
  write: () => Promise<T>,
): Promise<T> {
  const previous = saveWriteTails.get(saveId) ?? Promise.resolve();
  const result = previous.then(write);
  const tail = result.then(
    () => undefined,
    () => undefined,
  );
  saveWriteTails.set(saveId, tail);

  try {
    return await result;
  } finally {
    if (saveWriteTails.get(saveId) === tail) {
      saveWriteTails.delete(saveId);
    }
  }
}

function hasIndexedDBSupport(): boolean {
  return typeof indexedDB !== 'undefined';
}

function rootSaveId(slot: number): string {
  return `save-slot-${slot}`;
}

function writeRootSaveId(id: string, metadata: SaveWriteMetadata): string {
  const rootId = metadata.parentSaveId ?? (metadata.isRootSave ? id : null);
  if (!rootId) {
    throw new SaveSessionOwnershipError(
      'unknown_tree',
      'MBD could not identify the root save tree for this write.',
      null,
    );
  }
  return rootId;
}

function referencedBranchIds(record: Partial<SaveData> | null | undefined): string[] {
  const snapshot = tryParseSnapshot(record?.snapshot);
  if (!snapshot) {
    return [];
  }
  return (snapshot.narrative.whatIfBranches ?? [])
    .map((branch) => branch.saveId || branch.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function parseSlotNumberFromId(id: string | undefined): number | null {
  if (!id) {
    return null;
  }
  const match = /^save-slot-(\d+)$/.exec(id);
  return match ? Number(match[1]) : null;
}

function createBranchId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `branch-${crypto.randomUUID()}`;
  }
  branchIdCounter += 1;
  return `branch-${Date.now().toString(36)}-${branchIdCounter.toString(36)}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function safeRecordJson(raw: unknown): string | null {
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return null;
  }
}

type SaveIntegrityBackupInspection = {
  exists: boolean;
  record: SaveData | null;
  valid: boolean;
};

type SaveIntegrityVerification = Awaited<ReturnType<typeof verifySaveRecordIntegrity>>;

export class SaveIntegrityError extends Error {
  readonly kind: SaveIntegrityFailureKind;
  readonly expectedChecksum?: string;
  readonly actualChecksum?: string;

  constructor(
    kind: SaveIntegrityFailureKind,
    message: string,
    evidence: { expectedChecksum?: string; actualChecksum?: string } = {},
  ) {
    super(message);
    this.name = 'SaveIntegrityError';
    this.kind = kind;
    this.expectedChecksum = evidence.expectedChecksum;
    this.actualChecksum = evidence.actualChecksum;
  }
}

function integrityErrorFromVerification(
  verification: Extract<Awaited<ReturnType<typeof verifySaveRecordIntegrity>>, { status: 'invalid' }>,
): SaveIntegrityError {
  return new SaveIntegrityError(
    verification.reason,
    verification.message,
    verification.reason === 'mismatch'
      ? {
        expectedChecksum: verification.expectedChecksum,
        actualChecksum: verification.actualChecksum,
      }
      : {},
  );
}

async function backupMatchesPrimaryGeneration(
  primary: SaveData,
  primaryVerification: SaveIntegrityVerification,
  backupVerification: Extract<SaveIntegrityVerification, { status: 'valid' }>,
): Promise<boolean> {
  if (primaryVerification.status === 'valid') {
    return primaryVerification.checksum === backupVerification.checksum;
  }
  if (primaryVerification.status === 'invalid') {
    if (primaryVerification.reason === 'mismatch') {
      return primaryVerification.expectedChecksum === backupVerification.checksum
        || primaryVerification.actualChecksum === backupVerification.checksum;
    }
    if (
      primaryVerification.reason === 'malformed'
      && primaryVerification.expectedChecksum
    ) {
      return primaryVerification.expectedChecksum === backupVerification.checksum;
    }
    if (
      primaryVerification.reason === 'unsupported'
      || primaryVerification.reason === 'unavailable'
    ) {
      return false;
    }
  }

  try {
    return (await calculateSaveIntegrity(primary)).checksum === backupVerification.checksum;
  } catch {
    return false;
  }
}

async function inspectSaveIntegrityBackup(
  saveId: string,
  primary?: SaveData,
  primaryVerification?: SaveIntegrityVerification,
): Promise<SaveIntegrityBackupInspection> {
  if (!hasIndexedDBSupport()) {
    return { exists: false, record: null, valid: false };
  }

  const record = await db.saveIntegrityBackups.get(saveId);
  if (!record) {
    return { exists: false, record: null, valid: false };
  }

  const verification = await verifySaveRecordIntegrity(record);
  const valid = record.id === saveId
    && verification.status === 'valid'
    && (primary
      ? await backupMatchesPrimaryGeneration(
        primary,
        primaryVerification ?? await verifySaveRecordIntegrity(primary),
        verification,
      )
      : true);
  return {
    exists: true,
    record,
    valid,
  };
}

async function selectTrustedSaveRecord(
  saveId: string,
  primary: SaveData | undefined,
  backup: SaveData | undefined,
): Promise<SaveData | null> {
  const primaryVerification = primary
    ? await verifySaveRecordIntegrity(primary)
    : null;
  if (primary && primaryVerification?.status === 'valid') {
    return primary;
  }
  if (primary && primaryVerification?.status === 'unsealed' && !backup) {
    return primary;
  }
  if (!backup || backup.id !== saveId) {
    return null;
  }

  const backupVerification = await verifySaveRecordIntegrity(backup);
  if (backupVerification.status !== 'valid') {
    return null;
  }
  if (!primary || !primaryVerification) {
    return backup;
  }
  return await backupMatchesPrimaryGeneration(
    primary,
    primaryVerification,
    backupVerification,
  )
    ? backup
    : null;
}

function recordsAreExactCopies(
  saveId: string,
  primary: SaveData | undefined,
  backup: SaveData | undefined,
): primary is SaveData {
  if (!primary || !backup || primary.id !== saveId || backup.id !== saveId) {
    return false;
  }
  try {
    return canonicalizeSaveIntegrityValue(primary) === canonicalizeSaveIntegrityValue(backup);
  } catch {
    return false;
  }
}

function simAdvanceIntentToken(intent: Pick<SimAdvanceIntent,
  | 'journalVersion'
  | 'saveId'
  | 'rootSaveId'
  | 'operation'
  | 'baselineChecksum'
  | 'baselineSeason'
  | 'baselineDay'
  | 'baselinePhase'
  | 'attempt'>,
): string {
  // This is an opaque compare token, not simulation truth. It is intentionally
  // deterministic and derived only from the exact durable baseline identity.
  return `sim-advance-v${intent.journalVersion}:${intent.saveId}:${intent.rootSaveId}:${intent.operation}:${intent.baselineChecksum}:${intent.baselineSeason}:${intent.baselineDay}:${intent.baselinePhase}:${intent.attempt}`;
}

function isSimAdvanceOperation(value: unknown): value is SimAdvanceOperation {
  return value === 'sim_day' || value === 'sim_week' || value === 'sim_month' || value === 'sim_to_playoffs';
}

/** Goal 20 owns only command baselines beginning in preseason or regular season. */
export function isJournalSimAdvancePhase(phase: unknown): phase is Extract<SimPhase, 'preseason' | 'regular'> {
  return phase === 'preseason' || phase === 'regular';
}

function hasValidSimAdvanceIntentShape(
  intent: unknown,
  saveId: string,
  rootId: string,
  baseline?: SaveData,
): intent is SimAdvanceIntent {
  if (!intent || typeof intent !== 'object') return false;
  const value = intent as Partial<SimAdvanceIntent>;
  const allowedKeys = new Set([
    'journalVersion', 'saveId', 'rootSaveId', 'operation', 'baselineChecksum',
    'baselineSeason', 'baselineDay', 'baselinePhase', 'attempt', 'token',
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return false;
  if (value.journalVersion !== 1 || value.saveId !== saveId || value.rootSaveId !== rootId
    || !isSimAdvanceOperation(value.operation)
    || typeof value.baselineChecksum !== 'string' || !/^[a-f0-9]{64}$/.test(value.baselineChecksum)
    || !Number.isInteger(value.baselineSeason) || !Number.isInteger(value.baselineDay)
    || !SimPhaseEnum.safeParse(value.baselinePhase).success
    || typeof value.attempt !== 'number' || !Number.isInteger(value.attempt) || value.attempt <= 0
    || typeof value.token !== 'string') {
    return false;
  }
  if (baseline && (value.baselineSeason !== baseline.season
    || value.baselineDay !== baseline.day || value.baselinePhase !== baseline.phase)) {
    return false;
  }
  return value.token === simAdvanceIntentToken(value as SimAdvanceIntent);
}

type VerifiedSimAdvanceBaseline = {
  primary: SaveData;
  shadow: SaveData;
  checksum: string;
};

declare const simAdvanceBaselineProofBrand: unique symbol;
declare const simAdvanceBaselineSealProofBrand: unique symbol;
export interface SimAdvanceBaselineProof {
  readonly saveId: string;
  readonly rootSaveId: string;
  readonly checksum: string;
  readonly baseline: SaveData;
  readonly workerSnapshot: GameSnapshot;
  readonly primaryCanonical: string;
  readonly shadowCanonical: string;
  readonly attempt: number;
  readonly [simAdvanceBaselineProofBrand]: true;
}

export interface SimAdvanceBaselineSealProof {
  readonly saveId: string;
  readonly rootSaveId: string;
  readonly source:
    | 'unsealed_primary_no_shadow'
    | 'sealed_primary_no_shadow'
    | 'verified_noncanonical_pair';
  /** The exact unmodified durable primary row that a later seal must CAS. */
  readonly baseline: SaveData;
  /** Strict current-v34 worker export proven equal to the durable snapshot. */
  readonly workerSnapshot: GameSnapshot;
  readonly primaryCanonical: string;
  readonly shadowCanonical: string | null;
  readonly [simAdvanceBaselineSealProofBrand]: true;
}

export type SimAdvanceBaselineAssessment =
  | { kind: 'ready'; proof: SimAdvanceBaselineProof }
  | { kind: 'seal_required'; proof: SimAdvanceBaselineSealProof };

let simAdvanceAttemptCounter = 0;
const issuedSimAdvanceBaselineSealProofs = new WeakSet<SimAdvanceBaselineSealProof>();
type ReadySimAdvanceProofState = 'available' | 'preparing' | 'consumed';
type IssuedReadySimAdvanceProof = {
  state: ReadySimAdvanceProofState;
  reservation: symbol | null;
};
// A ready proof is a page-local, one-use authority over the exact coherent
// primary/shadow read that minted it. Its structural fields remain useful CAS
// evidence, but no copy can prepare a journal or revive a consumed attempt.
const issuedReadySimAdvanceProofs = new WeakMap<
  SimAdvanceBaselineProof,
  IssuedReadySimAdvanceProof
>();
type PreparedSimAdvanceIntentProvenance = {
  readonly intent: SimAdvanceIntent;
  active: boolean;
  workerAuthorizationClaimed: boolean;
};
const preparedSimAdvanceIntentProvenance = new WeakMap<
  SimAdvanceIntent,
  PreparedSimAdvanceIntentProvenance
>();
const preparedSimAdvanceIntentByToken = new Map<string, PreparedSimAdvanceIntentProvenance>();

type SimAdvanceBaselineRows = {
  primary: SaveData | undefined;
  shadow: SaveData | undefined;
  root: SaveData | undefined;
};

/** Read one coherent primary/shadow view before doing any asynchronous verification. */
async function readSimAdvanceBaselineRows(
  saveId: string,
  rootId: string,
): Promise<SimAdvanceBaselineRows> {
  return db.transaction('r', db.saves, db.saveIntegrityBackups, async () => {
    const [primary, shadow, root] = await Promise.all([
      db.saves.get(saveId),
      db.saveIntegrityBackups.get(saveId),
      saveId === rootId ? Promise.resolve(undefined) : db.saves.get(rootId),
    ]);
    return { primary, shadow, root };
  });
}

function hasExpectedSimAdvanceTopology(
  record: SaveData,
  saveId: string,
  rootId: string,
  root: SaveData | undefined,
): boolean {
  const rootSlot = parseSlotNumberFromId(rootId);
  if (
    rootSlot == null
    || !isSupportedSaveSlot(rootSlot)
    || rootId !== rootSaveId(rootSlot)
    || record.id !== saveId
  ) return false;
  if (saveId === rootId) {
    return record.id === rootId
      && record.slotNumber === rootSlot
      && record.isRootSave === true
      && record.parentSaveId === null
      && record.branchMeta === null;
  }
  return record.isRootSave === false
    && record.slotNumber === null
    && record.parentSaveId === rootId
    && root?.id === rootId
    && root.slotNumber === rootSlot
    && root.isRootSave === true
    && root.parentSaveId === null
    && root.branchMeta === null;
}

function assertExpectedSimAdvanceTopology(
  record: SaveData | undefined,
  saveId: string,
  rootId: string,
  root: SaveData | undefined,
): asserts record is SaveData {
  if (!record || !hasExpectedSimAdvanceTopology(record, saveId, rootId, root)) {
    throw new Error('The durable save does not match the requested exact save and dynasty tree.');
  }
}

function parseSupportedSimAdvanceSnapshot(record: SaveData): GameSnapshot {
  const candidate = loadSnapshotCandidate(record);
  const version = readSnapshotVersion(candidate, record.schemaVersion);
  if (version == null
    || version < MINIMUM_SUPPORTED_GAME_SNAPSHOT_VERSION
    || version > CURRENT_GAME_SNAPSHOT_VERSION) {
    throw new Error('The durable simulation baseline has an unsupported snapshot version.');
  }
  return materializeSimulationImportDefaults(parseGameSnapshot(candidate));
}

function parseStrictCurrentSimAdvanceWorkerSnapshot(workerSnapshot: object): GameSnapshot {
  if (
    !workerSnapshot
    || typeof workerSnapshot !== 'object'
    || Array.isArray(workerSnapshot)
    || (workerSnapshot as { schemaVersion?: unknown }).schemaVersion !== CURRENT_GAME_SNAPSHOT_VERSION
  ) {
    throw new Error('The worker must export a strict current-v34 simulation snapshot.');
  }
  return GameSnapshotSchema.parse(workerSnapshot);
}

function snapshotsAreCanonicallyEqual(left: GameSnapshot, right: GameSnapshot): boolean {
  return canonicalizeSaveIntegrityValue(left) === canonicalizeSaveIntegrityValue(right);
}

function isCurrentCanonicalRawBaseline(
  primary: SaveData,
  parsedSnapshot: GameSnapshot,
  workerSnapshot: GameSnapshot,
): boolean {
  const rawSnapshot = primary.snapshot;
  return primary.schemaVersion === CURRENT_GAME_SNAPSHOT_VERSION
    && primary.hasSnapshot === true
    && primary.legacyState === null
    && primary.gameState == null
    && rawSnapshot != null
    && typeof rawSnapshot === 'object'
    && !Array.isArray(rawSnapshot)
    && (rawSnapshot as { schemaVersion?: unknown }).schemaVersion === CURRENT_GAME_SNAPSHOT_VERSION
    && primary.season === parsedSnapshot.season
    && primary.day === parsedSnapshot.day
    && primary.phase === parsedSnapshot.phase
    && canonicalizeSaveIntegrityValue(rawSnapshot) === canonicalizeSaveIntegrityValue(workerSnapshot);
}

function deepFreezeSimAdvanceEvidence(value: unknown, seen = new WeakSet<object>()): void {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    deepFreezeSimAdvanceEvidence((value as Record<PropertyKey, unknown>)[key], seen);
  }
  Object.freeze(value);
}

function cloneAndFreezeSimAdvanceEvidence<T extends object>(value: T): T {
  const clone = structuredClone(value) as T;
  deepFreezeSimAdvanceEvidence(clone);
  return clone;
}

function freezeSimAdvanceEvidence(
  baseline: SaveData,
  workerSnapshot: GameSnapshot,
  primaryCanonical: string,
): { baseline: SaveData; workerSnapshot: GameSnapshot } {
  const frozenBaseline = cloneAndFreezeSimAdvanceEvidence(baseline);
  const frozenWorkerSnapshot = cloneAndFreezeSimAdvanceEvidence(workerSnapshot);
  if (canonicalizeSaveIntegrityValue(frozenBaseline) !== primaryCanonical) {
    throw new Error('The simulation baseline evidence changed while its proof was being created.');
  }
  return { baseline: frozenBaseline, workerSnapshot: frozenWorkerSnapshot };
}

function makeSimAdvanceSealProof(
  saveId: string,
  rootId: string,
  source: SimAdvanceBaselineSealProof['source'],
  baseline: SaveData,
  workerSnapshot: GameSnapshot,
  primaryCanonical: string,
  shadowCanonical: string | null,
): SimAdvanceBaselineAssessment {
  const frozen = freezeSimAdvanceEvidence(baseline, workerSnapshot, primaryCanonical);
  const proof = Object.freeze({
    saveId,
    rootSaveId: rootId,
    source,
    baseline: frozen.baseline,
    workerSnapshot: frozen.workerSnapshot,
    primaryCanonical,
    shadowCanonical,
  }) as SimAdvanceBaselineSealProof;
  issuedSimAdvanceBaselineSealProofs.add(proof);
  return Object.freeze({
    kind: 'seal_required',
    proof,
  });
}

async function readVerifiedSimAdvanceBaseline(
  saveId: string,
  rootId: string,
): Promise<VerifiedSimAdvanceBaseline> {
  const { primary, shadow, root } = await readSimAdvanceBaselineRows(saveId, rootId);
  if (!recordsAreExactCopies(saveId, primary, shadow) || !primary || !shadow) {
    throw new SimAdvanceEvidenceConflictError('The durable primary and protected save copy are not an exact baseline pair.');
  }
  try {
    assertExpectedSimAdvanceTopology(primary, saveId, rootId, root);
  } catch (error) {
    throw new SimAdvanceEvidenceConflictError('The durable simulation baseline topology is not exact.', { cause: error });
  }
  const [primaryVerification, shadowVerification] = await Promise.all([
    verifySaveRecordIntegrity(primary),
    verifySaveRecordIntegrity(shadow),
  ]);
  const isUnavailable = (verification: typeof primaryVerification): boolean => (
    verification.status === 'invalid' && verification.reason === 'unavailable'
  );
  // A corrupt, unsealed, unsupported, or mismatched member of the exact
  // primary/shadow pair is deterministic evidence failure. It takes priority
  // over the other copy merely being temporarily unverifiable: retrying must
  // never downgrade a known bad pair into apparent storage unavailability.
  if (
    (primaryVerification.status !== 'valid' && !isUnavailable(primaryVerification))
    || (shadowVerification.status !== 'valid' && !isUnavailable(shadowVerification))
  ) {
    throw new SimAdvanceEvidenceConflictError('The durable baseline could not be integrity-verified.');
  }
  // A missing Web Crypto/runtime verification facility is not evidence that
  // this exact primary/shadow pair changed. Let the persistence lease retain
  // its one accepted snapshot and retry when integrity verification returns.
  if (primaryVerification.status !== 'valid' || shadowVerification.status !== 'valid') {
    if (primaryVerification.status === 'invalid' && primaryVerification.reason === 'unavailable') {
      throw new SaveIntegrityUnavailableError(primaryVerification.message);
    }
    if (shadowVerification.status === 'invalid' && shadowVerification.reason === 'unavailable') {
      throw new SaveIntegrityUnavailableError(shadowVerification.message);
    }
    throw new SimAdvanceEvidenceConflictError('The durable baseline could not be integrity-verified.');
  }
  if (primaryVerification.checksum !== shadowVerification.checksum) {
    throw new SimAdvanceEvidenceConflictError('The durable baseline could not be integrity-verified.');
  }
  return { primary, shadow, checksum: primaryVerification.checksum };
}

/** Exact verified durable baseline used to fence a worker export before journaling. */
export async function readSimAdvanceBaseline(
  saveId: string,
  rootId: string,
): Promise<SaveData> {
  return (await readVerifiedSimAdvanceBaseline(saveId, rootId)).primary;
}

/** Creates the sole opaque authority that can journal the worker export it verified. */
export async function assessSimAdvanceBaseline(
  saveId: string,
  rootId: string,
  workerSnapshot: object,
): Promise<SimAdvanceBaselineAssessment> {
  const canonicalWorker = parseStrictCurrentSimAdvanceWorkerSnapshot(workerSnapshot);
  const { primary, shadow, root } = await readSimAdvanceBaselineRows(saveId, rootId);
  assertExpectedSimAdvanceTopology(primary, saveId, rootId, root);

  const primaryCanonical = canonicalizeSaveIntegrityValue(primary);
  const canonicalStored = parseSupportedSimAdvanceSnapshot(primary);
  if (!snapshotsAreCanonicallyEqual(canonicalWorker, canonicalStored)) {
    throw new Error('The worker snapshot does not equal the exact verified durable simulation baseline.');
  }

  const primaryVerification = await verifySaveRecordIntegrity(primary);
  if (shadow) {
    if (!recordsAreExactCopies(saveId, primary, shadow)) {
      throw new Error('The durable primary and protected save copy are not an exact baseline pair.');
    }
    const shadowCanonical = canonicalizeSaveIntegrityValue(shadow);
    const shadowVerification = await verifySaveRecordIntegrity(shadow);
    if (
      primaryVerification.status !== 'valid'
      || shadowVerification.status !== 'valid'
      || primaryVerification.checksum !== shadowVerification.checksum
    ) {
      throw new Error('The durable baseline could not be integrity-verified.');
    }
    const canonicalShadow = parseSupportedSimAdvanceSnapshot(shadow);
    if (!snapshotsAreCanonicallyEqual(canonicalStored, canonicalShadow)) {
      throw new Error('The durable primary and protected save copy do not contain the same simulation snapshot.');
    }
    if (!isCurrentCanonicalRawBaseline(primary, canonicalStored, canonicalWorker)) {
      return makeSimAdvanceSealProof(
        saveId,
        rootId,
        'verified_noncanonical_pair',
        primary,
        canonicalWorker,
        primaryCanonical,
        shadowCanonical,
      );
    }
    simAdvanceAttemptCounter += 1;
    const frozen = freezeSimAdvanceEvidence(primary, canonicalWorker, primaryCanonical);
    const proof = Object.freeze({
      saveId,
      rootSaveId: rootId,
      checksum: primaryVerification.checksum,
      baseline: frozen.baseline,
      workerSnapshot: frozen.workerSnapshot,
      primaryCanonical,
      shadowCanonical,
      attempt: simAdvanceAttemptCounter,
    }) as SimAdvanceBaselineProof;
    issuedReadySimAdvanceProofs.set(proof, { state: 'available', reservation: null });
    return Object.freeze({
      kind: 'ready',
      proof,
    });
  }

  if (primaryVerification.status === 'unsealed') {
    return makeSimAdvanceSealProof(
      saveId,
      rootId,
      'unsealed_primary_no_shadow',
      primary,
      canonicalWorker,
      primaryCanonical,
      null,
    );
  }
  if (primaryVerification.status === 'valid') {
    return makeSimAdvanceSealProof(
      saveId,
      rootId,
      'sealed_primary_no_shadow',
      primary,
      canonicalWorker,
      primaryCanonical,
      null,
    );
  }
  throw new Error('The durable primary simulation baseline could not be integrity-verified.');
}

function isExactIntent(
  actual: SimAdvanceIntent | undefined,
  expected: SimAdvanceIntent,
): boolean {
  return actual != null
    && hasValidSimAdvanceIntentShape(expected, expected.saveId, expected.rootSaveId)
    && hasValidSimAdvanceIntentShape(actual, expected.saveId, expected.rootSaveId)
    && canonicalizeSaveIntegrityValue(actual) === canonicalizeSaveIntegrityValue(expected);
}

function intentMatchesCurrentBaseline(
  intent: SimAdvanceIntent,
  primary: SaveData | undefined,
  shadow: SaveData | undefined,
): boolean {
  if (!recordsAreExactCopies(intent.saveId, primary, shadow) || !primary || !shadow) {
    return false;
  }
  return hasValidSimAdvanceIntentShape(intent, intent.saveId, intent.rootSaveId, primary)
    && (primary.isRootSave ? primary.id : primary.parentSaveId) === intent.rootSaveId
    && primary.integrity?.checksum === intent.baselineChecksum
    && shadow.integrity?.checksum === intent.baselineChecksum;
}

function reserveIssuedReadySimAdvanceProof(proof: SimAdvanceBaselineProof): symbol {
  // Do not read proof fields before exact runtime membership is established.
  // A spread/deserialized/forged object cannot be a WeakMap key member.
  if (!proof || typeof proof !== 'object') {
    throw new SimAdvanceEvidenceConflictError('The simulation journal requires an exact issued ready baseline proof.');
  }
  const issued = issuedReadySimAdvanceProofs.get(proof);
  if (!issued || issued.state !== 'available' || issued.reservation != null) {
    throw new SimAdvanceEvidenceConflictError('The simulation journal ready baseline proof is unavailable or already consumed.');
  }
  const reservation = Symbol('sim-advance-ready-proof-reservation');
  issued.state = 'preparing';
  issued.reservation = reservation;
  return reservation;
}

function restoreIssuedReadySimAdvanceProof(
  proof: SimAdvanceBaselineProof,
  reservation: symbol,
): void {
  const issued = issuedReadySimAdvanceProofs.get(proof);
  if (issued?.state === 'preparing' && issued.reservation === reservation) {
    issued.state = 'available';
    issued.reservation = null;
  }
}

function consumeIssuedReadySimAdvanceProof(
  proof: SimAdvanceBaselineProof,
  reservation: symbol,
): void {
  const issued = issuedReadySimAdvanceProofs.get(proof);
  if (issued?.state !== 'preparing' || issued.reservation !== reservation) {
    throw new SimAdvanceEvidenceConflictError('The simulation journal ready baseline proof reservation changed before commit.');
  }
  issued.state = 'consumed';
  issued.reservation = null;
}

/**
 * Durably records one whole-command regular-season advance before the worker
 * may mutate. It re-reads the verified pair inside the transaction so a
 * replacement or stale callback cannot journal a different generation.
 */
export async function prepareSimAdvanceIntent(
  proof: SimAdvanceBaselineProof,
  operation: SimAdvanceOperation,
): Promise<SimAdvanceIntent> {
  // This runs before proof reservation or any proof field/storage access. A
  // runtime cast must never consume the exact ready proof it failed to use.
  if (!isSimAdvanceOperation(operation)) {
    throw new SimAdvanceEvidenceConflictError('The simulation journal operation is unsupported.');
  }
  const reservation = reserveIssuedReadySimAdvanceProof(proof);
  try {
    assertSaveTreeSessionOwned(proof.rootSaveId);
    const intent: SimAdvanceIntent = {
      journalVersion: 1,
      saveId: proof.saveId,
      rootSaveId: proof.rootSaveId,
      operation,
      baselineChecksum: proof.checksum,
      baselineSeason: proof.baseline.season,
      baselineDay: proof.baseline.day,
      baselinePhase: proof.baseline.phase,
      attempt: proof.attempt,
      token: '',
    };
    intent.token = simAdvanceIntentToken(intent);

    await db.transaction(
      'rw', db.saves, db.saveIntegrityBackups, db.simAdvanceIntents,
      async () => {
        assertSaveTreeSessionOwned(proof.rootSaveId);
        const [currentPrimary, currentShadow] = await Promise.all([
          db.saves.get(proof.saveId),
          db.saveIntegrityBackups.get(proof.saveId),
        ]);
        if (
          !recordsAreExactCopies(proof.saveId, currentPrimary, currentShadow)
          || canonicalizeSaveIntegrityValue(currentPrimary) !== proof.primaryCanonical
          || canonicalizeSaveIntegrityValue(currentShadow) !== proof.shadowCanonical
        ) {
          throw new Error('The save changed before the simulation journal could be prepared.');
        }
        await db.simAdvanceIntents.add(intent);
      },
    );
    // Transaction success is the irreversible point for this exact assessed
    // authority. A rollback consumes its intent, never the proof's attempt.
    consumeIssuedReadySimAdvanceProof(proof, reservation);
    const provenance = { intent, active: true, workerAuthorizationClaimed: false };
    preparedSimAdvanceIntentProvenance.set(intent, provenance);
    preparedSimAdvanceIntentByToken.set(intent.token, provenance);
    Object.freeze(intent);
    return intent;
  } catch (error) {
    restoreIssuedReadySimAdvanceProof(proof, reservation);
    throw error;
  }
}

/**
 * Runtime-only bridge from the durable intent writer to the worker boundary.
 * A structural copy, deserialized row, or pre-transaction object is never a
 * member. The coordinator is the sole production caller that turns this proof
 * into a worker authorization.
 */
function requireDurablyPreparedSimAdvanceIntent(
  value: object,
  expectedSaveId: string,
  expectedRootSaveId: string,
  expectedOperation?: SimAdvanceOperation,
): PreparedSimAdvanceIntentProvenance {
  const intent = value as SimAdvanceIntent;
  const provenance = preparedSimAdvanceIntentProvenance.get(intent);
  if (!provenance
    || !provenance.active
    || provenance.intent !== intent
    || intent.saveId !== expectedSaveId
    || intent.rootSaveId !== expectedRootSaveId
    || (expectedOperation != null && intent.operation !== expectedOperation)) {
    throw new SimAdvanceEvidenceConflictError(
      'The worker command does not hold the exact durably prepared simulation intent.',
    );
  }
  return provenance;
}

export function assertDurablyPreparedSimAdvanceIntent(
  value: object,
  expectedSaveId: string,
  expectedRootSaveId: string,
  expectedOperation?: SimAdvanceOperation,
): asserts value is SimAdvanceIntent {
  requireDurablyPreparedSimAdvanceIntent(
    value,
    expectedSaveId,
    expectedRootSaveId,
    expectedOperation,
  );
}

/** Burns the single worker-mutation issuance permitted by one durable intent. */
export function claimDurablyPreparedSimAdvanceIntent(
  value: object,
  expectedSaveId: string,
  expectedRootSaveId: string,
  expectedOperation: SimAdvanceOperation,
): void {
  // An omitted or cast operation must not turn the optional equality check
  // into a bypass or burn the one worker-authorization claim.
  if (!isSimAdvanceOperation(expectedOperation)) {
    throw new SimAdvanceEvidenceConflictError('The worker authorization operation is unsupported.');
  }
  const provenance = requireDurablyPreparedSimAdvanceIntent(
    value,
    expectedSaveId,
    expectedRootSaveId,
    expectedOperation,
  );
  if (provenance.workerAuthorizationClaimed) {
    throw new SimAdvanceEvidenceConflictError(
      'The durable simulation intent already issued its one worker authorization.',
    );
  }
  provenance.workerAuthorizationClaimed = true;
}

function revokeDurablyPreparedSimAdvanceIntent(intent: SimAdvanceIntent): void {
  // Prefer the current token map over a stale object WeakMap entry. If an old
  // structural callback somehow removes the current durable row, its token
  // must revoke the current runtime authority too.
  const exact = preparedSimAdvanceIntentProvenance.get(intent);
  const current = preparedSimAdvanceIntentByToken.get(intent.token);
  if (exact) exact.active = false;
  if (current) {
    current.active = false;
    if (preparedSimAdvanceIntentByToken.get(intent.token) === current) {
      preparedSimAdvanceIntentByToken.delete(intent.token);
    }
  }
}

function revokeDurablyPreparedSimAdvanceIntentsForSaveIds(saveIds: readonly string[]): void {
  const removed = new Set(saveIds);
  for (const [token, provenance] of preparedSimAdvanceIntentByToken) {
    if (!removed.has(provenance.intent.saveId)) continue;
    provenance.active = false;
    if (preparedSimAdvanceIntentByToken.get(token) === provenance) {
      preparedSimAdvanceIntentByToken.delete(token);
    }
  }
}

/** Returns the exact verified baseline evidence for boot or rollback; it never consumes it. */
export async function readSimAdvanceIntentBaseline(
  saveId: string,
  rootId: string,
): Promise<{ intent: SimAdvanceIntent; baseline: SaveData } | null> {
  const intent = await db.simAdvanceIntents.get(saveId);
  if (!intent) return null;
  if (!hasValidSimAdvanceIntentShape(intent, saveId, rootId)) {
    throw new Error('Simulation journal evidence is malformed or belongs to another dynasty tree.');
  }
  const baseline = await readVerifiedSimAdvanceBaseline(saveId, rootId);
  if (!hasValidSimAdvanceIntentShape(intent, saveId, rootId, baseline.primary)
    || !intentMatchesCurrentBaseline(intent, baseline.primary, baseline.shadow)) {
    throw new Error('Simulation journal baseline no longer matches the durable save.');
  }
  return { intent, baseline: baseline.primary };
}

export type SimAdvanceIntentCandidate =
  | { kind: 'none' }
  | { kind: 'rollback'; intent: SimAdvanceIntent; baseline: SaveData };

/**
 * Boot must inspect the root-unique row, not merely an exact saveId. A row for
 * a different branch is evidence of an interrupted command, never an absent
 * intent that may be silently ignored.
 */
export async function inspectSimAdvanceIntentForCandidate(
  saveId: string,
  rootId: string,
): Promise<SimAdvanceIntentCandidate> {
  const { exact, candidates } = await db.transaction(
    'r',
    db.simAdvanceIntents,
    async () => ({
      exact: await db.simAdvanceIntents.get(saveId),
      candidates: await db.simAdvanceIntents.where('rootSaveId').equals(rootId).toArray(),
    }),
  );
  // An exact-key row is durable evidence even when its root field is malformed.
  // Never let an incorrect root index make that evidence disappear at boot.
  if (exact && exact.rootSaveId !== rootId) {
    throw new Error('The exact save has simulation journal evidence for another or malformed dynasty tree.');
  }
  if (!exact && candidates.length === 0) return { kind: 'none' };
  if (!exact
    || candidates.length !== 1
    || !isExactIntent(candidates[0], exact)
    || candidates[0]!.saveId !== saveId) {
    throw new Error('Another exact save in this dynasty tree has unresolved simulation journal evidence.');
  }
  const evidence = await readSimAdvanceIntentBaseline(saveId, rootId);
  if (!evidence) throw new Error('Simulation journal evidence disappeared during candidate inspection.');
  return { kind: 'rollback', ...evidence };
}

/** Consumes only a matching retained intent after baseline rollback has succeeded. */
export async function consumeSimAdvanceIntentRollback(intent: SimAdvanceIntent): Promise<void> {
  assertSaveTreeSessionOwned(intent.rootSaveId);
  await db.transaction(
    'rw', db.saves, db.saveIntegrityBackups, db.simAdvanceIntents,
    async () => {
      assertSaveTreeSessionOwned(intent.rootSaveId);
      const [currentIntent, primary, shadow] = await Promise.all([
        db.simAdvanceIntents.get(intent.saveId),
        db.saves.get(intent.saveId),
        db.saveIntegrityBackups.get(intent.saveId),
      ]);
      if (!isExactIntent(currentIntent, intent) || !intentMatchesCurrentBaseline(intent, primary, shadow)) {
        throw new Error('Simulation journal rollback evidence changed before it could be consumed.');
      }
      await db.simAdvanceIntents.delete(intent.saveId);
    },
  );
  revokeDurablyPreparedSimAdvanceIntent(intent);
}

async function selectTrustedSaveTreeMetadataRecord(
  saveId: string,
  primary: SaveData | undefined,
  backup: SaveData | undefined,
): Promise<SaveData | null> {
  const verified = await selectTrustedSaveRecord(saveId, primary, backup);
  if (verified) {
    return verified;
  }

  // Tree barriers and deletion need a no-crypto escape hatch. Exact independent
  // copies are sufficient evidence for relationship metadata only; they are
  // never returned by a gameplay load or offered as a verified repair source.
  return recordsAreExactCopies(saveId, primary, backup) ? primary : null;
}

export async function listSaveTreeChildIds(parentSaveId: string): Promise<string[]> {
  if (!hasIndexedDBSupport()) {
    const branches = await listBranches(parentSaveId);
    return branches.map((branch) => branch.id).sort((left, right) => left.localeCompare(right));
  }

  const [rootPrimary, rootBackup, primaryIndexIds, backupIndexIds] = await Promise.all([
    db.saves.get(parentSaveId),
    db.saveIntegrityBackups.get(parentSaveId),
    db.saves.where('parentSaveId').equals(parentSaveId).primaryKeys(),
    db.saveIntegrityBackups.where('parentSaveId').equals(parentSaveId).primaryKeys(),
  ]);
  const trustedRoot = await selectTrustedSaveTreeMetadataRecord(
    parentSaveId,
    rootPrimary,
    rootBackup,
  );
  const trustedRootIds = new Set(
    referencedBranchIds(trustedRoot).filter((id) => !/^save-slot-\d+$/.test(id)),
  );
  const candidateIds = new Set<string>([
    ...trustedRootIds,
    ...primaryIndexIds.map(String),
    ...backupIndexIds.map(String),
  ]);
  candidateIds.delete(parentSaveId);

  const decisions = await Promise.all([...candidateIds].map(async (candidateId) => {
    const [primary, backup] = await Promise.all([
      db.saves.get(candidateId),
      db.saveIntegrityBackups.get(candidateId),
    ]);
    const trustedChild = await selectTrustedSaveTreeMetadataRecord(
      candidateId,
      primary,
      backup,
    );
    if (trustedChild) {
      return !trustedChild.isRootSave && trustedChild.parentSaveId === parentSaveId
        ? candidateId
        : null;
    }
    return trustedRootIds.has(candidateId) ? candidateId : null;
  }));

  return decisions
    .filter((id): id is string => id != null)
    .sort((left, right) => left.localeCompare(right));
}

async function assertStoredSaveIntegrity(
  raw: SaveData,
  saveId: string,
): Promise<void> {
  const verification = await verifySaveRecordIntegrity(raw);
  if (verification.status === 'valid') {
    return;
  }
  if (verification.status === 'invalid') {
    throw integrityErrorFromVerification(verification);
  }

  const backup = await inspectSaveIntegrityBackup(saveId, raw, verification);
  if (backup.exists) {
    throw new SaveIntegrityError(
      'missing',
      'The save record is missing integrity metadata even though a protected copy exists.',
    );
  }
}

async function readVerifiedStoredSave(saveId: string): Promise<SaveData | undefined> {
  const raw = await db.saves.get(saveId);
  if (!raw) {
    const backup = await inspectSaveIntegrityBackup(saveId);
    if (backup.exists) {
      throw new SaveIntegrityError(
        'missing',
        'The primary save record is missing while a protected copy still exists.',
      );
    }
    return undefined;
  }
  await assertStoredSaveIntegrity(raw, saveId);
  return normalizeLoadedSaveRecord(raw);
}

function resolveSaveId(slotId: number | string): string {
  return typeof slotId === 'number' ? rootSaveId(slotId) : slotId;
}

function readSnapshotVersion(snapshotLike: unknown, fallback?: unknown): number | undefined {
  if (
    snapshotLike
    && typeof snapshotLike === 'object'
    && 'schemaVersion' in snapshotLike
    && typeof (snapshotLike as { schemaVersion?: unknown }).schemaVersion === 'number'
  ) {
    return (snapshotLike as { schemaVersion: number }).schemaVersion;
  }

  return typeof fallback === 'number' ? fallback : undefined;
}

function loadSnapshotCandidate(raw: Partial<SaveData>): unknown {
  if (typeof raw.snapshot === 'string') {
    return JSON.parse(raw.snapshot) as unknown;
  }

  if (raw.snapshot != null) {
    return raw.snapshot;
  }

  const legacyState = raw.legacyState ?? raw.gameState;
  if (typeof legacyState === 'string') {
    return JSON.parse(legacyState) as unknown;
  }

  return null;
}

function saveLoadFailure(
  reason: SaveLoadFailureReason,
  raw: Partial<SaveData> | undefined,
  slotId: string,
  message: string,
  extras: Partial<Omit<SaveLoadFailureDetail, 'slotId' | 'slotNumber' | 'message' | 'rawJson'>> = {},
): LoadSaveSafelyResult {
  return {
    ok: false,
    reason,
    detail: {
      slotId,
      slotNumber: raw?.slotNumber ?? parseSlotNumberFromId(slotId),
      message,
      rawJson: raw ? safeRecordJson(raw) : null,
      ...extras,
    },
  };
}

async function saveIntegrityLoadFailure(
  raw: SaveData,
  slotId: string,
  error: SaveIntegrityError,
): Promise<LoadSaveSafelyResult> {
  const backup = await inspectSaveIntegrityBackup(slotId, raw);
  let primaryCanBeRaceChecked = true;
  try {
    canonicalizeSaveIntegrityValue(raw);
  } catch {
    primaryCanBeRaceChecked = false;
  }
  const repairAvailable = backup.valid && primaryCanBeRaceChecked;
  return saveLoadFailure('integrity_failed', raw, slotId, error.message, {
    integrityFailureKind: error.kind,
    ...(error.expectedChecksum ? { expectedChecksum: error.expectedChecksum } : {}),
    ...(error.actualChecksum ? { actualChecksum: error.actualChecksum } : {}),
    repairAvailable,
    ...(repairAvailable && backup.record
      ? { repairUpdatedAt: backup.record.updatedAt }
      : {}),
  });
}

function fallbackGMCareer(snapshot: GameSnapshot): NonNullable<GameSnapshot['narrative']['gmCareer']> {
  return snapshot.narrative.gmCareer ?? {
    careerHistory: [],
    currentTeamId: snapshot.franchise.teamId,
    reputation: 50,
    overallRecord: { wins: 0, losses: 0 },
    championships: 0,
    hiredSeason: snapshot.season,
    firedSeasons: [],
    careerAchievements: [],
    jobSearchActive: false,
    lastFiredReason: null,
  };
}

function snapshotRecord(snapshot: GameSnapshot): string {
  const standings = snapshot.seasonState.standings as Array<{ teamId?: string; wins?: number; losses?: number }> | Array<[string, { wins: number; losses: number }]>;
  for (const entry of standings) {
    if (Array.isArray(entry)) {
      if (entry[0] === snapshot.userTeamId) {
        return `${entry[1].wins}-${entry[1].losses}`;
      }
      continue;
    }

    if (entry.teamId === snapshot.userTeamId) {
      return `${entry.wins ?? 0}-${entry.losses ?? 0}`;
    }
  }

  const record = fallbackGMCareer(snapshot).overallRecord;
  return `${record.wins}-${record.losses}`;
}

export function buildLeaderboardEntry(
  slot: number,
  snapshot: GameSnapshot,
  updatedAt: string = new Date().toISOString(),
): LeaderboardEntry {
  const scenarioId = snapshot.narrative.challengeState?.scenarioId ?? null;
  const latestCard = snapshot.narrative.dynastyCards?.at(-1) ?? null;
  const gmCareer = fallbackGMCareer(snapshot);

  return {
    id: scenarioId ? `leaderboard-scenario-${slot}-${scenarioId}` : `leaderboard-dynasty-${slot}`,
    slotNumber: slot,
    scenarioId,
    gmName: snapshot.franchise.gmName,
    teamId: snapshot.franchise.teamId,
    teamName: snapshot.franchise.teamName,
    season: snapshot.season,
    score: calculateDynastyLeaderboardScore(snapshot),
    record: snapshotRecord(snapshot),
    championships: gmCareer.championships,
    summary: latestCard?.textSummary ?? snapshot.narrative.challengeState?.summary ?? `${snapshot.franchise.gmName} · Season ${snapshot.season}`,
    updatedAt,
  };
}

export async function upsertLeaderboardEntry(
  slot: number,
  snapshot: GameSnapshot,
): Promise<LeaderboardEntry> {
  const entry = buildLeaderboardEntry(slot, snapshot);
  if (hasIndexedDBSupport()) {
    await db.leaderboard.put(entry);
  }
  return entry;
}

export async function listLeaderboardEntries(
  options: { scenarioId?: string | null } = {},
): Promise<LeaderboardEntry[]> {
  if (!hasIndexedDBSupport()) {
    return [];
  }
  const entries = await db.leaderboard.toArray();
  return entries
    .filter((entry) => (
      options.scenarioId === undefined
        ? true
        : entry.scenarioId === options.scenarioId
    ))
    .sort((left, right) => right.score - left.score || right.updatedAt.localeCompare(left.updatedAt));
}

export async function deleteLeaderboardEntriesForSlot(slot: number): Promise<void> {
  if (!hasIndexedDBSupport()) {
    return;
  }
  await db.leaderboard.where('slotNumber').equals(slot).delete();
}

function tryParseSnapshot(snapshotLike: unknown): GameSnapshot | null {
  try {
    return snapshotLike ? parseGameSnapshot(snapshotLike) : null;
  } catch {
    return null;
  }
}

function tryParseLegacySnapshot(legacyState: string | null | undefined): GameSnapshot | null {
  if (!legacyState) {
    return null;
  }

  try {
    const parsed = JSON.parse(legacyState) as unknown;
    return parseGameSnapshot(parsed);
  } catch {
    return null;
  }
}

function scheduleOnIdle(callback: () => void): IdleCancel {
  const globalWindow = typeof window !== 'undefined' ? window : null;

  if (globalWindow && typeof globalWindow.requestIdleCallback === 'function') {
    const idleHandle = globalWindow.requestIdleCallback(() => {
      globalWindow.clearTimeout(timeoutHandle);
      callback();
    }, { timeout: 250 });
    const timeoutHandle = globalWindow.setTimeout(() => {
      globalWindow.cancelIdleCallback?.(idleHandle);
      callback();
    }, 250);

    return () => {
      globalWindow.cancelIdleCallback?.(idleHandle);
      globalWindow.clearTimeout(timeoutHandle);
    };
  }

  const timeoutHandle = globalThis.setTimeout(() => {
    callback();
  }, 32);

  return () => {
    globalThis.clearTimeout(timeoutHandle);
  };
}

export function createAutoSaveScheduler(
  writeSave: (job: AutoSaveJob) => Promise<void>,
  scheduleIdle: IdleScheduler = scheduleOnIdle,
): AutoSaveScheduler {
  let queued: { job: AutoSaveJob; deferreds: Deferred[] } | null = null;
  let running = false;
  let cancelScheduled: IdleCancel | null = null;

  const requestFlush = () => {
    if (cancelScheduled) {
      return;
    }

    cancelScheduled = scheduleIdle(() => {
      cancelScheduled = null;
      void flush();
    });
  };

  const flush = async () => {
    if (running || !queued) {
      return;
    }

    const current = queued;
    queued = null;
    cancelScheduled?.();
    cancelScheduled = null;
    running = true;

    try {
      await writeSave(current.job);
      current.deferreds.forEach((deferred) => deferred.resolve());
    } catch (error) {
      current.deferreds.forEach((deferred) => deferred.reject(error));
    } finally {
      running = false;
      if (queued) {
        requestFlush();
      }
    }
  };

  return {
    schedule(job: AutoSaveJob) {
      return new Promise<void>((resolve, reject) => {
        if (queued) {
          queued.job = job;
          queued.deferreds.push({ resolve, reject });
        } else {
          queued = {
            job,
            deferreds: [{ resolve, reject }],
          };
        }

        requestFlush();
      });
    },
    flush,
    hasPending() {
      return running || queued != null;
    },
  };
}

export function normalizeLoadedSaveRecord(raw: Partial<SaveData>): SaveData {
  const snapshot = tryParseSnapshot(raw.snapshot);
  const slotNumber = raw.slotNumber ?? parseSlotNumberFromId(raw.id);
  const isRootSave = raw.isRootSave ?? (slotNumber != null);

  return {
    id: raw.id ?? rootSaveId(slotNumber ?? 1),
    slotNumber: slotNumber ?? null,
    name: raw.name ?? 'Unnamed Save',
    season: raw.season ?? snapshot?.season ?? 1,
    day: raw.day ?? snapshot?.day ?? 1,
    phase: (raw.phase ?? snapshot?.phase ?? 'preseason') as SimPhase,
    schemaVersion: snapshot?.schemaVersion ?? 1,
    hasSnapshot: snapshot != null,
    snapshot,
    legacyState: raw.legacyState ?? raw.gameState ?? null,
    createdAt: raw.createdAt ?? new Date(0).toISOString(),
    updatedAt: raw.updatedAt ?? new Date(0).toISOString(),
    parentSaveId: raw.parentSaveId ?? null,
    isRootSave,
    branchMeta: raw.branchMeta ?? null,
    ...(raw.integrity ? { integrity: raw.integrity } : {}),
  };
}

function inspectRawSaveRecord(slot: number | null, raw: Partial<SaveData> | undefined): SaveInspectionResult {
  if (!raw) {
    return { status: 'empty', slot };
  }

  const snapshot = tryParseSnapshot(raw.snapshot);
  if (snapshot) {
    return {
      status: 'ok',
      slot,
      save: normalizeLoadedSaveRecord({
        ...raw,
        snapshot,
      }),
    };
  }

  const normalized = normalizeLoadedSaveRecord(raw);
  if (normalized.legacyState) {
    return {
      status: 'legacy',
      slot,
      save: normalized,
      message: 'This save needs repair before it can be loaded.',
    };
  }

  if (raw.snapshot != null || raw.hasSnapshot) {
    return {
      status: 'corrupt',
      slot,
      message: 'This save could not be parsed.',
      raw,
    };
  }

  return {
    status: 'legacy',
    slot,
    save: normalized,
    message: 'This save only has legacy metadata and needs repair before it can be loaded.',
  };
}

export function buildSaveRecord(
  slot: number,
  name: string,
  snapshot: GameSnapshot,
  existing?: SaveData
): SaveData {
  return buildSaveRecordById(rootSaveId(slot), name, snapshot, {
    existing,
    slotNumber: slot,
    parentSaveId: null,
    isRootSave: true,
    branchMeta: null,
  });
}

function buildSaveRecordById(
  id: string,
  name: string,
  snapshot: GameSnapshot,
  options: {
    existing?: Partial<SaveData>;
    slotNumber: number | null;
    parentSaveId: string | null;
    isRootSave: boolean;
    branchMeta: WhatIfBranchMeta | null;
  },
): SaveData {
  const now = new Date().toISOString();
  const parsedSnapshot = GameSnapshotSchema.parse(snapshot);

  return {
    id,
    slotNumber: options.slotNumber,
    name,
    season: parsedSnapshot.season,
    day: parsedSnapshot.day,
    phase: parsedSnapshot.phase,
    schemaVersion: parsedSnapshot.schemaVersion,
    hasSnapshot: true,
    snapshot: parsedSnapshot,
    legacyState: null,
    createdAt: options.existing?.createdAt ?? now,
    updatedAt: now,
    parentSaveId: options.parentSaveId,
    isRootSave: options.isRootSave,
    branchMeta: options.branchMeta,
  };
}

async function prepareSealedSaveRecordById(
  id: string,
  name: string,
  state: object,
  metadata: SaveWriteMetadata,
  existing?: SaveData,
): Promise<SaveData> {
  const snapshot = GameSnapshotSchema.safeParse(state);
  if (snapshot.success) {
    const existingSnapshot = metadata.isRootSave && !metadata.replaceExistingRootBranchMetadata
      ? tryParseSnapshot(existing?.snapshot)
      : null;
    let snapshotToPersist = snapshot.data;
    if (metadata.deleteExistingBranchRows) {
      snapshotToPersist = GameSnapshotSchema.parse({
        ...snapshot.data,
        narrative: {
          ...snapshot.data.narrative,
          whatIfBranches: [],
        },
      });
    } else if (existingSnapshot) {
      snapshotToPersist = GameSnapshotSchema.parse({
        ...snapshot.data,
        narrative: {
          ...snapshot.data.narrative,
          whatIfBranches: existingSnapshot.narrative.whatIfBranches ?? [],
        },
      });
    }
    return sealSaveRecord(buildSaveRecordById(id, name, snapshotToPersist, {
      existing,
      slotNumber: metadata.slotNumber,
      parentSaveId: metadata.parentSaveId,
      isRootSave: metadata.isRootSave,
      branchMeta: metadata.branchMeta,
    }));
  }

  const now = new Date().toISOString();
  const record: SaveData = {
    id,
    slotNumber: metadata.slotNumber,
    name,
    season: (state as { season?: number }).season ?? 1,
    day: (state as { day?: number }).day ?? 1,
    phase: ((state as { phase?: SimPhase }).phase ?? 'preseason'),
    schemaVersion: 1,
    hasSnapshot: false,
    snapshot: null,
    legacyState: JSON.stringify(state),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    parentSaveId: metadata.parentSaveId,
    isRootSave: metadata.isRootSave,
    branchMeta: metadata.branchMeta,
  };
  return sealSaveRecord(record);
}

async function collectSimAdvanceIntentSaveIdsForTreeMutation(
  rootId: string,
  exactSaveIds: readonly string[],
): Promise<string[]> {
  if (!hasIndexedDBSupport()) return [];
  const indexedIds = await db.simAdvanceIntents
    .where('rootSaveId')
    .equals(rootId)
    .primaryKeys();
  return Array.from(new Set([
    ...exactSaveIds,
    ...indexedIds.map(String),
  ])).sort((left, right) => left.localeCompare(right));
}

async function hasSimAdvanceIntentForSaveOrRoot(
  saveId: string,
  rootId: string,
): Promise<boolean> {
  if (!hasIndexedDBSupport()) return false;
  const [exact, indexed] = await Promise.all([
    db.simAdvanceIntents.get(saveId),
    db.simAdvanceIntents.where('rootSaveId').equals(rootId).first(),
  ]);
  return exact != null || indexed != null;
}

async function putSealedSaveRecordRows(
  record: SaveData,
  metadata: SaveWriteMetadata,
): Promise<string[]> {
  let removedIntentSaveIds: string[] = [];
  if (metadata.deleteExistingBranchRows) {
    if (hasIndexedDBSupport()) {
      const childIds = metadata.deleteExistingBranchIds ?? [];
      removedIntentSaveIds = await collectSimAdvanceIntentSaveIdsForTreeMutation(
        record.id,
        [record.id, ...childIds],
      );
      await db.saves.bulkDelete(childIds);
      await db.saveIntegrityBackups.bulkDelete(childIds);
      await db.simAdvanceIntents.bulkDelete(removedIntentSaveIds);
    } else {
      await db.saves.where('parentSaveId').equals(record.id).delete();
    }
  }

  await db.saves.put(record);
  if (hasIndexedDBSupport()) {
    await db.saveIntegrityBackups.put(record);
  }

  if (
    hasIndexedDBSupport()
    && record.isRootSave
    && record.slotNumber != null
    && record.snapshot
  ) {
    await db.leaderboard.put(buildLeaderboardEntry(
      record.slotNumber,
      record.snapshot,
      record.updatedAt,
    ));
  }
  return removedIntentSaveIds;
}

async function commitSealedSaveRecord(
  record: SaveData,
  metadata: SaveWriteMetadata,
): Promise<SaveData> {
  let removedIntentSaveIds: string[] = [];
  if (hasIndexedDBSupport()) {
    await db.transaction(
      'rw',
      db.saves,
      db.saveIntegrityBackups,
      db.leaderboard,
      db.simAdvanceIntents,
      async () => {
        const unresolved = await db.simAdvanceIntents.where('rootSaveId').equals(
          record.parentSaveId ?? record.id,
        ).first();
        if (unresolved && !metadata.deleteExistingBranchRows) {
          throw new Error('An unresolved simulation journal blocks ordinary save writes for this dynasty tree.');
        }
        removedIntentSaveIds = await putSealedSaveRecordRows(record, metadata);
      },
    );
  } else {
    removedIntentSaveIds = await putSealedSaveRecordRows(record, metadata);
  }
  if (removedIntentSaveIds.length > 0) {
    revokeDurablyPreparedSimAdvanceIntentsForSaveIds(removedIntentSaveIds);
  }
  return record;
}

async function writeSaveGameByIdUnqueued(
  id: string,
  name: string,
  state: object,
  metadata: SaveWriteMetadata,
): Promise<SaveData> {
  const ownershipRootSaveId = writeRootSaveId(id, metadata);
  assertSaveTreeSessionOwned(ownershipRootSaveId);
  const existing = await readVerifiedStoredSave(id);
  const commitMetadata = metadata.deleteExistingBranchRows
    ? {
      ...metadata,
      deleteExistingBranchIds: await listSaveTreeChildIds(id),
    }
    : metadata;
  const record = await prepareSealedSaveRecordById(id, name, state, commitMetadata, existing);
  assertSaveTreeSessionOwned(ownershipRootSaveId);
  return commitSealedSaveRecord(record, commitMetadata);
}

export async function saveGameById(
  id: string,
  name: string,
  state: object,
  metadata: SaveWriteMetadata,
): Promise<SaveData> {
  return measureAsyncOperation(
    'save.write',
    () => runSaveWriteInOrder(
      id,
      () => writeSaveGameByIdUnqueued(id, name, state, metadata),
    ),
    { budgetMs: SAVE_IO_BUDGET_MS },
  );
}

/**
 * Atomically publishes the exact post-command snapshot and consumes the
 * matching write-ahead intent. The baseline checksum and full intent token are
 * checked in the same Dexie transaction as primary/shadow/leaderboard writes.
 */
export async function commitSimAdvanceSnapshot(
  intent: SimAdvanceIntent,
  name: string,
  state: object,
): Promise<SaveData> {
  // Journal commits are v34 snapshot-only. Never let the generic legacy save
  // fallback consume an intent after a malformed post export.
  let postSnapshot: GameSnapshot;
  try {
    postSnapshot = GameSnapshotSchema.parse(state);
  } catch (error) {
    throw new SimAdvanceEvidenceConflictError(
      'The simulation post snapshot is not valid current save evidence.',
      { cause: error },
    );
  }
  return measureAsyncOperation('save.sim-advance-commit', () => runSaveWriteInOrder(
    intent.saveId,
    async () => {
      assertSaveTreeSessionOwned(intent.rootSaveId);
      const baseline = await readVerifiedSimAdvanceBaseline(intent.saveId, intent.rootSaveId);
      if (!intentMatchesCurrentBaseline(intent, baseline.primary, baseline.shadow)) {
        throw new SimAdvanceEvidenceConflictError('The simulation baseline changed before its post-command snapshot could be saved.');
      }
      const metadata: SaveWriteMetadata = {
        slotNumber: baseline.primary.slotNumber,
        parentSaveId: baseline.primary.parentSaveId,
        isRootSave: baseline.primary.isRootSave,
        branchMeta: baseline.primary.branchMeta,
      };
      const record = await prepareSealedSaveRecordById(
        intent.saveId,
        name,
        postSnapshot,
        metadata,
        baseline.primary,
      );
      await db.transaction(
        'rw', db.saves, db.saveIntegrityBackups, db.leaderboard, db.simAdvanceIntents,
        async () => {
          assertSaveTreeSessionOwned(intent.rootSaveId);
          const [currentIntent, currentPrimary, currentShadow] = await Promise.all([
            db.simAdvanceIntents.get(intent.saveId),
            db.saves.get(intent.saveId),
            db.saveIntegrityBackups.get(intent.saveId),
          ]);
          if (!isExactIntent(currentIntent, intent)
            || !intentMatchesCurrentBaseline(intent, currentPrimary, currentShadow)) {
            throw new SimAdvanceEvidenceConflictError('The simulation journal changed before its post-command snapshot could be committed.');
          }
          await putSealedSaveRecordRows(record, metadata);
          await db.simAdvanceIntents.delete(intent.saveId);
        },
      );
      revokeDurablyPreparedSimAdvanceIntent(intent);
      return record;
    },
  ), { budgetMs: SAVE_IO_BUDGET_MS });
}

/**
 * Seals a loadable old/checksumless baseline before journaling a simulation
 * command. This is deliberately not a journal write: it cannot create or
 * consume an intent and may only rewrite the exact assessed baseline pair.
 */
export async function commitSimAdvanceBaselineSeal(
  proof: SimAdvanceBaselineSealProof,
  capturedSnapshot: object,
): Promise<SaveData> {
  if (!issuedSimAdvanceBaselineSealProofs.has(proof)) {
    throw new SimAdvanceEvidenceConflictError('The simulation baseline seal proof is not an exact issued assessment object.');
  }
  let canonicalCaptured: GameSnapshot;
  try {
    canonicalCaptured = parseStrictCurrentSimAdvanceWorkerSnapshot(capturedSnapshot);
  } catch (error) {
    throw new SimAdvanceEvidenceConflictError(
      'The captured baseline seal snapshot is not strict current simulation evidence.',
      { cause: error },
    );
  }
  if (!snapshotsAreCanonicallyEqual(canonicalCaptured, proof.workerSnapshot)) {
    throw new SimAdvanceEvidenceConflictError('The captured baseline seal snapshot does not equal the assessed worker baseline.');
  }
  assertActiveSaveSessionOwned(proof.saveId);
  assertSaveTreeSessionOwned(proof.rootSaveId);

  return measureAsyncOperation('save.sim-advance-baseline-seal', () => runSaveWriteInOrder(
    proof.saveId,
    async () => {
      assertActiveSaveSessionOwned(proof.saveId);
      assertSaveTreeSessionOwned(proof.rootSaveId);
      // Build from the captured worker export exactly. In particular, do not
      // use the normal root-save path that carries over stale branch narrative.
      const record = await sealSaveRecord(buildSaveRecordById(
        proof.saveId,
        proof.baseline.name,
        canonicalCaptured,
        {
          slotNumber: proof.baseline.slotNumber,
          parentSaveId: proof.baseline.parentSaveId,
          isRootSave: proof.baseline.isRootSave,
          branchMeta: proof.baseline.branchMeta,
          existing: proof.baseline,
        },
      ));

      await db.transaction(
        'rw', db.saves, db.saveIntegrityBackups, db.leaderboard, db.simAdvanceIntents,
        async () => {
          assertActiveSaveSessionOwned(proof.saveId);
          assertSaveTreeSessionOwned(proof.rootSaveId);
          const [currentPrimary, currentShadow, currentRoot, exactIntent, rootIntent] = await Promise.all([
            db.saves.get(proof.saveId),
            db.saveIntegrityBackups.get(proof.saveId),
            proof.saveId === proof.rootSaveId
              ? Promise.resolve(undefined)
              : db.saves.get(proof.rootSaveId),
            db.simAdvanceIntents.get(proof.saveId),
            db.simAdvanceIntents.where('rootSaveId').equals(proof.rootSaveId).first(),
          ]);
          if (exactIntent || rootIntent) {
            throw new SimAdvanceEvidenceConflictError('An unresolved simulation journal blocks baseline sealing for this dynasty tree.');
          }
          if (!currentPrimary || !hasExpectedSimAdvanceTopology(
            currentPrimary,
            proof.saveId,
            proof.rootSaveId,
            currentRoot,
          )) {
            throw new SimAdvanceEvidenceConflictError('The durable baseline topology changed before it could be sealed.');
          }
          const currentPrimaryCanonical = canonicalizeSaveIntegrityValue(currentPrimary);
          const currentShadowCanonical = currentShadow
            ? canonicalizeSaveIntegrityValue(currentShadow)
            : null;
          if (
            currentPrimaryCanonical !== proof.primaryCanonical
            || currentShadowCanonical !== proof.shadowCanonical
          ) {
            throw new SimAdvanceEvidenceConflictError('The durable baseline changed before it could be sealed.');
          }
          assertActiveSaveSessionOwned(proof.saveId);
          assertSaveTreeSessionOwned(proof.rootSaveId);
          await db.saves.put(record);
          assertActiveSaveSessionOwned(proof.saveId);
          assertSaveTreeSessionOwned(proof.rootSaveId);
          await db.saveIntegrityBackups.put(record);
          assertActiveSaveSessionOwned(proof.saveId);
          assertSaveTreeSessionOwned(proof.rootSaveId);
          if (record.isRootSave && record.slotNumber != null) {
            await db.leaderboard.put(buildLeaderboardEntry(
              record.slotNumber,
              canonicalCaptured,
              record.updatedAt,
            ));
          }
          assertActiveSaveSessionOwned(proof.saveId);
          assertSaveTreeSessionOwned(proof.rootSaveId);
        },
      );
      return record;
    },
  ), { budgetMs: SAVE_IO_BUDGET_MS });
}

export async function saveGame(
  slot: number,
  name: string,
  state: object,
  options: SaveGameOptions = {},
): Promise<SaveData> {
  return saveGameById(rootSaveId(slot), name, state, {
    slotNumber: slot,
    parentSaveId: null,
    isRootSave: true,
    branchMeta: null,
    replaceExistingRootBranchMetadata: options.replaceExistingRootBranchMetadata,
    deleteExistingBranchRows: options.replaceExistingRootBranchMetadata,
  });
}

export async function loadGameById(id: string): Promise<SaveData | undefined> {
  return measureAsyncOperation('save.load', async () => {
    const result = await loadSaveSafely(id);
    if (result.ok) {
      return result.save;
    }
    if (
      result.reason === 'storage_failed'
      && result.detail.rawJson == null
      && result.detail.message === 'No save record found.'
    ) {
      return undefined;
    }
    if (result.reason === 'integrity_failed') {
      throw new SaveIntegrityError(
        result.detail.integrityFailureKind ?? 'malformed',
        result.detail.message,
        {
          expectedChecksum: result.detail.expectedChecksum,
          actualChecksum: result.detail.actualChecksum,
        },
      );
    }
    throw new Error(result.detail.message);
  }, { budgetMs: SAVE_IO_BUDGET_MS });
}

export async function loadGame(
  slot: number,
): Promise<SaveData | undefined> {
  return loadGameById(rootSaveId(slot));
}

export async function loadSaveSafely(slotId: number | string): Promise<LoadSaveSafelyResult> {
  const id = resolveSaveId(slotId);
  let raw: SaveData | undefined;

  try {
    raw = await db.saves.get(id);
  } catch (error) {
    return saveLoadFailure('storage_failed', undefined, id, errorMessage(error));
  }

  if (!raw) {
    try {
      const backup = await inspectSaveIntegrityBackup(id);
      if (backup.exists) {
        return saveLoadFailure(
          'integrity_failed',
          undefined,
          id,
          'The primary save record is missing while a protected copy still exists.',
          {
            integrityFailureKind: 'missing',
            repairAvailable: backup.valid,
            ...(backup.valid && backup.record
              ? { repairUpdatedAt: backup.record.updatedAt }
              : {}),
          },
        );
      }
    } catch (error) {
      return saveLoadFailure(
        'storage_failed',
        undefined,
        id,
        `MBD could not inspect the protected save copy: ${errorMessage(error)}`,
      );
    }
    return saveLoadFailure('storage_failed', undefined, id, 'No save record found.');
  }

  try {
    const verification = await verifySaveRecordIntegrity(raw);
    if (verification.status === 'invalid') {
      return await saveIntegrityLoadFailure(
        raw,
        id,
        integrityErrorFromVerification(verification),
      );
    }
    if (verification.status === 'unsealed') {
      const backup = await inspectSaveIntegrityBackup(id, raw, verification);
      if (backup.exists) {
        return await saveIntegrityLoadFailure(
          raw,
          id,
          new SaveIntegrityError(
            'missing',
            'The save record is missing integrity metadata even though a protected copy exists.',
          ),
        );
      }
    }
  } catch (error) {
    if (error instanceof SaveIntegrityError) {
      return await saveIntegrityLoadFailure(raw, id, error);
    }
    return saveLoadFailure(
      'storage_failed',
      raw,
      id,
      `MBD could not verify local save integrity: ${errorMessage(error)}`,
    );
  }

  let snapshotLike: unknown;
  try {
    snapshotLike = loadSnapshotCandidate(raw);
  } catch (error) {
    return saveLoadFailure('parse', raw, id, errorMessage(error));
  }

  const schemaVersion = readSnapshotVersion(snapshotLike, raw.schemaVersion);
  if (schemaVersion != null && schemaVersion > CURRENT_GAME_SNAPSHOT_VERSION) {
    return saveLoadFailure('version_too_new', raw, id, `Save schema v${schemaVersion} is newer than this build supports.`, {
      schemaVersion,
      currentVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    });
  }

  if (schemaVersion != null && schemaVersion < MINIMUM_SUPPORTED_GAME_SNAPSHOT_VERSION) {
    return saveLoadFailure('version_too_old', raw, id, `Save schema v${schemaVersion} is older than the supported migration floor.`, {
      schemaVersion,
      minimumSupportedVersion: MINIMUM_SUPPORTED_GAME_SNAPSHOT_VERSION,
    });
  }

  try {
    const snapshot = parseGameSnapshot(snapshotLike);
    const save = normalizeLoadedSaveRecord({
      ...raw,
      snapshot,
      schemaVersion: snapshot.schemaVersion,
      hasSnapshot: true,
      legacyState: null,
    });
    return {
      ok: true,
      snapshot,
      save,
      rawJson: safeRecordJson(raw) ?? '{}',
    };
  } catch (error) {
    const reason: SaveLoadFailureReason = schemaVersion === CURRENT_GAME_SNAPSHOT_VERSION || schemaVersion == null
      ? 'zod'
      : 'migration_failed';
    return saveLoadFailure(reason, raw, id, errorMessage(error), {
      ...(schemaVersion == null ? {} : { schemaVersion }),
      ...(reason === 'zod' ? { currentVersion: CURRENT_GAME_SNAPSHOT_VERSION } : {}),
    });
  }
}

export async function inspectSaveById(id: string): Promise<SaveInspectionResult> {
  return measureAsyncOperation('save.inspect', async () => {
    const raw = await db.saves.get(id);
    return inspectRawSaveRecord(raw?.slotNumber ?? parseSlotNumberFromId(id), raw);
  }, { budgetMs: SAVE_IO_BUDGET_MS });
}

export async function inspectSave(slot: number): Promise<SaveInspectionResult> {
  return inspectSaveById(rootSaveId(slot));
}

export async function loadGameSafe(slot: number): Promise<SaveInspectionResult> {
  return inspectSave(slot);
}

async function listAllSaveRecords(): Promise<SaveData[]> {
  const saves = await db.saves.toArray();
  return saves.map(normalizeLoadedSaveRecord);
}

async function readSaveListingRecord(
  saveId: string,
  topology: Pick<SaveData, 'slotNumber' | 'parentSaveId' | 'isRootSave'>,
): Promise<SaveData | null> {
  const [primary, backup] = await Promise.all([
    db.saves.get(saveId),
    db.saveIntegrityBackups.get(saveId),
  ]);
  const trusted = await selectTrustedSaveTreeMetadataRecord(saveId, primary, backup);
  const source = trusted ?? primary ?? backup;
  if (!source) {
    return null;
  }
  return normalizeLoadedSaveRecord({
    ...source,
    id: saveId,
    ...topology,
  });
}

export async function listRootSaves(): Promise<SaveData[]> {
  if (hasIndexedDBSupport()) {
    const roots = await Promise.all(SAVE_SLOTS.map((slotNumber) => readSaveListingRecord(
      rootSaveId(slotNumber),
      {
        slotNumber,
        parentSaveId: null,
        isRootSave: true,
      },
    )));
    return roots.filter((save): save is SaveData => save != null);
  }

  const saves = await listAllSaveRecords();
  return saves
    .filter((save) => save.isRootSave)
    .sort((left, right) => (left.slotNumber ?? 99) - (right.slotNumber ?? 99));
}

export async function listSaves(): Promise<SaveData[]> {
  return listRootSaves();
}

export async function listBranches(parentSaveId: string): Promise<SaveData[]> {
  if (hasIndexedDBSupport()) {
    const childIds = await listSaveTreeChildIds(parentSaveId);
    const branches = await Promise.all(childIds.map((saveId) => readSaveListingRecord(
      saveId,
      {
        slotNumber: null,
        parentSaveId,
        isRootSave: false,
      },
    )));
    return branches
      .filter((save): save is SaveData => save != null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  const saves = await listAllSaveRecords();
  return saves
    .filter((save) => !save.isRootSave && save.parentSaveId === parentSaveId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listSaveTree(): Promise<SaveTreeEntry[]> {
  if (hasIndexedDBSupport()) {
    const roots = await listRootSaves();
    return Promise.all(roots.map(async (save) => ({
      save,
      branches: await listBranches(save.id),
    })));
  }

  const [roots, saves] = await Promise.all([listRootSaves(), listAllSaveRecords()]);
  return roots.map((save) => ({
    save,
    branches: saves
      .filter((candidate) => !candidate.isRootSave && candidate.parentSaveId === save.id)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  }));
}

export async function loadMostRecentSnapshot(): Promise<SaveData | undefined> {
  const listed = await listAllSaveRecords();
  const saves = await Promise.all(listed.map((save) => loadGameById(save.id)));
  return saves
    .filter((save): save is SaveData => save != null)
    .filter((save) => save.hasSnapshot && save.snapshot)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

async function prepareParentBranchMetadataUpdate(
  parent: SaveData,
  update: (branches: WhatIfBranchMeta[]) => WhatIfBranchMeta[],
): Promise<SaveData | null> {
  if (!parent?.snapshot) {
    return null;
  }

  const updatedParentSnapshot = GameSnapshotSchema.parse({
    ...parent.snapshot,
    narrative: {
      ...parent.snapshot.narrative,
      whatIfBranches: update(parent.snapshot.narrative.whatIfBranches ?? []),
    },
  });
  return prepareSealedSaveRecordById(parent.id, parent.name, updatedParentSnapshot, {
    slotNumber: parent.slotNumber,
    parentSaveId: null,
    isRootSave: true,
    branchMeta: null,
    replaceExistingRootBranchMetadata: true,
  }, parent);
}

export async function createBranchSave(
  parentSaveId: string,
  snapshot: GameSnapshot,
  description: string,
): Promise<{ branch: SaveData; parent: SaveData }> {
  assertSaveTreeSessionOwned(parentSaveId);
  return runSaveWriteInOrder(parentSaveId, async () => {
    const parent = await readVerifiedStoredSave(parentSaveId);
    if (!parent?.snapshot || !parent.isRootSave) {
      throw new Error('Cannot branch a missing or non-root save.');
    }

    const existingBranchIds = await listSaveTreeChildIds(parentSaveId);
    if (existingBranchIds.length >= MAX_BRANCHES_PER_SAVE) {
      throw new Error(`A save can only keep ${MAX_BRANCHES_PER_SAVE} what-if branches.`);
    }

    const branchId = createBranchId();
    const createdAt = new Date().toISOString();
    const branchMeta: WhatIfBranchMeta = {
      id: branchId,
      saveId: branchId,
      branchedAtSeason: snapshot.season,
      branchedAtDay: snapshot.day,
      description,
      createdAt,
    };
    const branchSnapshot = parseGameSnapshot(JSON.parse(JSON.stringify(snapshot)));
    const branchMetadata: SaveWriteMetadata = {
      slotNumber: null,
      parentSaveId,
      isRootSave: false,
      branchMeta,
    };
    const parentMetadata: SaveWriteMetadata = {
      slotNumber: parent.slotNumber,
      parentSaveId: null,
      isRootSave: true,
      branchMeta: null,
      replaceExistingRootBranchMetadata: true,
    };
    const branchRecord = await prepareSealedSaveRecordById(
      branchId,
      description,
      branchSnapshot,
      branchMetadata,
    );
    const parentRecord = await prepareParentBranchMetadataUpdate(
      parent,
      (branches) => [...branches, branchMeta],
    );
    if (!parentRecord) {
      throw new Error('The parent save disappeared during branch creation.');
    }

    const createBranchRows = async () => {
      assertSaveTreeSessionOwned(parentSaveId);
      if (await db.simAdvanceIntents.where('rootSaveId').equals(parentSaveId).first()) {
        throw new Error('An unresolved simulation journal blocks branch creation for this dynasty tree.');
      }
      await putSealedSaveRecordRows(branchRecord, branchMetadata);
      await putSealedSaveRecordRows(parentRecord, parentMetadata);
      return { branch: branchRecord, parent: parentRecord };
    };

    return hasIndexedDBSupport()
      ? db.transaction(
        'rw',
        db.saves,
        db.saveIntegrityBackups,
        db.leaderboard,
        db.simAdvanceIntents,
        createBranchRows,
      )
      : createBranchRows();
  });
}

async function readSaveForDeletion(id: string): Promise<SaveData | undefined> {
  const raw = await db.saves.get(id);
  if (!raw) {
    const backup = await inspectSaveIntegrityBackup(id);
    if (!backup.exists || !backup.record) {
      return undefined;
    }
    const normalized = normalizeLoadedSaveRecord(backup.record);
    const rootSlot = parseSlotNumberFromId(id);
    if (backup.valid) {
      return normalized;
    }
    return rootSlot == null
      ? {
        ...normalized,
        id,
        slotNumber: null,
        parentSaveId: null,
        isRootSave: false,
      }
      : {
        ...normalized,
        id,
        slotNumber: rootSlot,
        parentSaveId: null,
        isRootSave: true,
      };
  }

  try {
    await assertStoredSaveIntegrity(raw, id);
    return normalizeLoadedSaveRecord(raw);
  } catch (error) {
    if (!(error instanceof SaveIntegrityError)) {
      throw error;
    }
    const backup = await inspectSaveIntegrityBackup(id, raw);
    if (backup.valid && backup.record) {
      return normalizeLoadedSaveRecord(backup.record);
    }

    const normalized = normalizeLoadedSaveRecord(raw);
    const rootSlot = parseSlotNumberFromId(id);
    return rootSlot == null
      ? {
        ...normalized,
        id,
        slotNumber: null,
        parentSaveId: null,
        isRootSave: false,
      }
      : {
        ...normalized,
        id,
        slotNumber: rootSlot,
        parentSaveId: null,
        isRootSave: true,
      };
  }
}

async function readTrustedSaveTreeMetadataRecord(saveId: string): Promise<SaveData | null> {
  const [primary, backup] = await Promise.all([
    db.saves.get(saveId),
    db.saveIntegrityBackups.get(saveId),
  ]);
  const trusted = await selectTrustedSaveTreeMetadataRecord(saveId, primary, backup);
  return trusted ? normalizeLoadedSaveRecord(trusted) : null;
}

async function findTrustedParentIdForBranch(branchSaveId: string): Promise<string | null> {
  if (!hasIndexedDBSupport()) {
    return null;
  }

  const candidates = await Promise.all(SAVE_SLOTS.map(async (slot) => {
    const id = rootSaveId(slot);
    const trusted = await readTrustedSaveTreeMetadataRecord(id);
    return trusted?.isRootSave && referencedBranchIds(trusted).includes(branchSaveId)
      ? id
      : null;
  }));
  const parentIds = candidates.filter((candidate): candidate is string => candidate != null);
  return parentIds.length === 1 ? parentIds[0]! : null;
}

function knownRootSlot(saveId: string | null | undefined): number | null {
  const slotNumber = parseSlotNumberFromId(saveId ?? undefined);
  return isSupportedSaveSlot(slotNumber)
    ? slotNumber
    : null;
}

/**
 * Resolves only the stable ownership topology needed before a tab may load a
 * dynasty. The caller must acquire the returned root lock and then run the
 * ordinary verified load again; this metadata is never gameplay state.
 */
export async function resolveSaveSessionTarget(
  saveId: string,
): Promise<SaveSessionTarget | null> {
  const directRootSlot = knownRootSlot(saveId);
  const trusted = await readTrustedSaveTreeMetadataRecord(saveId);

  if (directRootSlot != null) {
    return {
      saveId,
      rootSaveId: saveId,
      slotNumber: directRootSlot,
      name: trusted?.name ?? null,
    };
  }

  if (trusted?.isRootSave) {
    const trustedRootId = trusted.slotNumber == null
      ? trusted.id
      : rootSaveId(trusted.slotNumber);
    const slotNumber = knownRootSlot(trustedRootId);
    return slotNumber == null
      ? null
      : {
        saveId,
        rootSaveId: trustedRootId,
        slotNumber,
        name: trusted.name,
      };
  }

  const parentSaveId = trusted?.parentSaveId
    ?? await findTrustedParentIdForBranch(saveId);
  const slotNumber = knownRootSlot(parentSaveId);
  if (!parentSaveId || slotNumber == null) {
    return null;
  }

  return {
    saveId,
    rootSaveId: parentSaveId,
    slotNumber,
    name: trusted?.name ?? null,
  };
}

async function requiredMutationRootSaveId(saveId: string): Promise<string | null> {
  if (!isSaveSessionOwnershipEnforcementEnabled()) {
    return null;
  }
  const target = await resolveSaveSessionTarget(saveId);
  if (!target) {
    throw new SaveSessionOwnershipError(
      'unknown_tree',
      'MBD could not establish this record\'s root save tree safely.',
      null,
    );
  }
  assertSaveTreeSessionOwned(target.rootSaveId);
  return target.rootSaveId;
}

function reassertMutationRoot(rootSaveId: string | null): void {
  if (rootSaveId) {
    assertSaveTreeSessionOwned(rootSaveId);
  }
}

async function deleteExactSaveRows(id: string): Promise<void> {
  const deleteRows = async () => {
    await db.saves.delete(id);
    if (hasIndexedDBSupport()) {
      await db.saveIntegrityBackups.delete(id);
      await db.simAdvanceIntents.delete(id);
    }
  };
  if (hasIndexedDBSupport()) {
    await db.transaction('rw', db.saves, db.saveIntegrityBackups, db.simAdvanceIntents, deleteRows);
  } else {
    await deleteRows();
  }
  revokeDurablyPreparedSimAdvanceIntentsForSaveIds([id]);
}

export type DeleteSaveByIdResult =
  | { outcome: 'not_found'; parent: null }
  | { outcome: 'deleted_root'; parent: null }
  | { outcome: 'deleted_branch'; parent: SaveData }
  | { outcome: 'deleted_exact_parent_untouched'; parent: null };

export async function deleteSaveByIdWithResult(id: string): Promise<DeleteSaveByIdResult> {
  return runSaveWriteInOrder(id, async () => {
    const ownershipRootSaveId = await requiredMutationRootSaveId(id);
    const record = await readSaveForDeletion(id);
    if (!record) {
      return { outcome: 'not_found', parent: null };
    }

    if (record.isRootSave) {
      const childIds = hasIndexedDBSupport()
        ? await listSaveTreeChildIds(record.id)
        : [];
      let removedIntentSaveIds: string[] = [];
      const deleteRootRows = async () => {
        reassertMutationRoot(ownershipRootSaveId);
        if (hasIndexedDBSupport()) {
          removedIntentSaveIds = await collectSimAdvanceIntentSaveIdsForTreeMutation(
            record.id,
            [id, ...childIds],
          );
          await db.saves.bulkDelete(childIds);
          await db.saveIntegrityBackups.bulkDelete(childIds);
          await db.saveIntegrityBackups.delete(id);
          await db.simAdvanceIntents.bulkDelete(removedIntentSaveIds);
        } else {
          await db.saves.where('parentSaveId').equals(record.id).delete();
        }
        if (record.slotNumber != null) {
          await deleteLeaderboardEntriesForSlot(record.slotNumber);
        }
        await db.saves.delete(id);
      };
      if (hasIndexedDBSupport()) {
        await db.transaction(
          'rw',
          db.saves,
          db.saveIntegrityBackups,
          db.leaderboard,
          db.simAdvanceIntents,
          deleteRootRows,
        );
      } else {
        await deleteRootRows();
      }
      revokeDurablyPreparedSimAdvanceIntentsForSaveIds(removedIntentSaveIds);
      return { outcome: 'deleted_root', parent: null };
    }

    const discoveredParentId = record.parentSaveId
      ? null
      : await findTrustedParentIdForBranch(record.id);
    const parentSaveId = record.parentSaveId ?? discoveredParentId;
    if (parentSaveId) {
      return runSaveWriteInOrder(parentSaveId, async () => {
        let parent: SaveData | undefined;
        try {
          parent = await readVerifiedStoredSave(parentSaveId);
        } catch (error) {
          if (!(error instanceof SaveIntegrityError)) {
            throw error;
          }
          throw new Error(
            'The branch cannot be deleted until its parent save is recovered.',
            { cause: error },
          );
        }
        if (!parent) {
          reassertMutationRoot(ownershipRootSaveId);
          await deleteExactSaveRows(id);
          return { outcome: 'deleted_exact_parent_untouched', parent: null };
        }
        if (!parent.isRootSave || !referencedBranchIds(parent).includes(record.id)) {
          reassertMutationRoot(ownershipRootSaveId);
          await deleteExactSaveRows(id);
          return { outcome: 'deleted_exact_parent_untouched', parent: null };
        }
        let updatedParent: SaveData | null;
        try {
          updatedParent = await prepareParentBranchMetadataUpdate(parent, (branches) =>
            branches.filter((branch) => branch.saveId !== record.id && branch.id !== record.id));
        } catch (error) {
          if (!(error instanceof SaveIntegrityUnavailableError)) {
            throw error;
          }
          throw new Error(
            'The branch cannot be deleted until its parent save can be verified.',
            { cause: error },
          );
        }
        if (!updatedParent) {
          throw new Error('The parent save could not be updated during branch deletion.');
        }
        const parentMetadata: SaveWriteMetadata = {
          slotNumber: updatedParent.slotNumber,
          parentSaveId: null,
          isRootSave: true,
          branchMeta: null,
          replaceExistingRootBranchMetadata: true,
        };
        const deleteBranchRows = async () => {
          reassertMutationRoot(ownershipRootSaveId);
          if (await db.simAdvanceIntents.where('rootSaveId').equals(parentSaveId).first()) {
            throw new Error('An unresolved simulation journal blocks branch deletion for this dynasty tree.');
          }
          await putSealedSaveRecordRows(updatedParent, parentMetadata);
          await db.saves.delete(id);
          if (hasIndexedDBSupport()) {
            await db.saveIntegrityBackups.delete(id);
            await db.simAdvanceIntents.delete(id);
          }
        };
        if (hasIndexedDBSupport()) {
          await db.transaction(
            'rw',
            db.saves,
            db.saveIntegrityBackups,
            db.leaderboard,
            db.simAdvanceIntents,
            deleteBranchRows,
          );
        } else {
          await deleteBranchRows();
        }
        revokeDurablyPreparedSimAdvanceIntentsForSaveIds([id]);
        return { outcome: 'deleted_branch', parent: updatedParent };
      });
    }

    reassertMutationRoot(ownershipRootSaveId);
    await deleteExactSaveRows(id);
    return { outcome: 'deleted_exact_parent_untouched', parent: null };
  });
}

export async function deleteSaveById(id: string): Promise<SaveData | null> {
  return (await deleteSaveByIdWithResult(id)).parent;
}

export async function deleteSave(slot: number): Promise<void> {
  await deleteSaveById(rootSaveId(slot));
}

export async function clearAllSaves(): Promise<void> {
  const rootSaveIds = SAVE_SLOTS.map(rootSaveId);
  assertAllSaveTreeSessionsOwned(rootSaveIds);
  if (!hasIndexedDBSupport()) {
    await db.saves.clear();
    revokeDurablyPreparedSimAdvanceIntentsForSaveIds(
      Array.from(preparedSimAdvanceIntentByToken.values()).map((provenance) => provenance.intent.saveId),
    );
    return;
  }

  await db.transaction(
    'rw',
    db.saves,
    db.saveIntegrityBackups,
    db.leaderboard,
    db.simAdvanceIntents,
    async () => {
      assertAllSaveTreeSessionsOwned(rootSaveIds);
      await db.saves.clear();
      await db.saveIntegrityBackups.clear();
      await db.leaderboard.clear();
      await db.simAdvanceIntents.clear();
    },
  );
  revokeDurablyPreparedSimAdvanceIntentsForSaveIds(
    Array.from(preparedSimAdvanceIntentByToken.values()).map((provenance) => provenance.intent.saveId),
  );
}

export function exportSnapshotToJson(name: string, snapshot: GameSnapshot): string {
  const payload: SnapshotExportPayload = {
    kind: 'mbd-save-export',
    name,
    exportedAt: new Date().toISOString(),
    snapshot: GameSnapshotSchema.parse(snapshot),
  };

  return JSON.stringify(payload, null, 2);
}

export function importSnapshotFromJson(text: string): { name: string; snapshot: GameSnapshot } {
  const parsed = JSON.parse(text) as unknown;
  if (
    parsed
    && typeof parsed === 'object'
    && 'kind' in parsed
    && (parsed as { kind?: unknown }).kind === 'mbd-save-export'
    && 'snapshot' in parsed
  ) {
    const exportPayload = parsed as { name?: unknown; snapshot: unknown };
    return {
      name: typeof exportPayload.name === 'string'
        ? exportPayload.name
        : 'Imported Save',
      snapshot: parseGameSnapshot(exportPayload.snapshot),
    };
  }

  return {
    name: 'Imported Save',
    snapshot: parseGameSnapshot(parsed),
  };
}

export async function restoreSaveIntegrityBackup(saveId: string): Promise<SaveData> {
  if (!hasIndexedDBSupport()) {
    throw new SaveIntegrityError(
      'unavailable',
      'Browser storage is unavailable, so the verified copy cannot be restored.',
    );
  }

  return measureAsyncOperation('save.repair', () => runSaveWriteInOrder(saveId, async () => {
    const ownershipRootSaveId = await requiredMutationRootSaveId(saveId);
    if (await db.simAdvanceIntents.get(saveId)) {
      throw new Error('This save has unresolved simulation journal evidence and cannot be repaired.');
    }
    const [primary, backup] = await Promise.all([
      db.saves.get(saveId),
      db.saveIntegrityBackups.get(saveId),
    ]);
    if (!backup || backup.id !== saveId) {
      throw new Error('No verified copy is available for this save. Nothing was restored.');
    }

    const primaryVerification = primary
      ? await verifySaveRecordIntegrity(primary)
      : null;
    if (primaryVerification?.status === 'valid') {
      throw new Error('The primary save changed and now verifies. Nothing was restored.');
    }
    const backupVerification = await verifySaveRecordIntegrity(backup);
    if (backupVerification.status !== 'valid') {
      throw new Error('The recovery copy no longer verifies. Nothing was restored.');
    }
    const repairRootSaveId = backup.isRootSave ? backup.id : backup.parentSaveId;
    if (!repairRootSaveId) {
      throw new Error('The recovery copy no longer identifies a safe root save tree. Nothing was restored.');
    }
    if (await hasSimAdvanceIntentForSaveOrRoot(saveId, repairRootSaveId)) {
      throw new Error('This save tree has unresolved simulation journal evidence and cannot be repaired.');
    }
    if (
      primary
      && primaryVerification
      && !await backupMatchesPrimaryGeneration(primary, primaryVerification, backupVerification)
    ) {
      throw new Error('The recovery copy does not match the damaged save generation. Nothing was restored.');
    }

    const expectedPrimary = primary
      ? canonicalizeSaveIntegrityValue(primary)
      : null;
    const expectedBackup = canonicalizeSaveIntegrityValue(backup);
    const restoredSnapshot = backup.snapshot
      ? GameSnapshotSchema.parse(backup.snapshot)
      : null;

    await db.transaction(
      'rw',
      db.saves,
      db.saveIntegrityBackups,
      db.leaderboard,
      db.simAdvanceIntents,
      async () => {
        reassertMutationRoot(ownershipRootSaveId);
        const [currentPrimary, currentBackup] = await Promise.all([
          db.saves.get(saveId),
          db.saveIntegrityBackups.get(saveId),
        ]);
        if (await hasSimAdvanceIntentForSaveOrRoot(saveId, repairRootSaveId)) {
          throw new Error('This save tree gained unresolved simulation journal evidence during repair.');
        }
        if (
          !currentBackup
          || (expectedPrimary == null
            ? currentPrimary != null
            : !currentPrimary
              || canonicalizeSaveIntegrityValue(currentPrimary) !== expectedPrimary)
          || canonicalizeSaveIntegrityValue(currentBackup) !== expectedBackup
        ) {
          throw new Error('The save changed while repair was being prepared. Nothing was restored.');
        }

        await db.saves.put(backup);
        await db.saveIntegrityBackups.put(backup);
        if (backup.isRootSave && backup.slotNumber != null && restoredSnapshot) {
          await db.leaderboard.put(buildLeaderboardEntry(
            backup.slotNumber,
            restoredSnapshot,
            backup.updatedAt,
          ));
        }
      },
    );

    return normalizeLoadedSaveRecord(backup);
  }), { budgetMs: SAVE_IO_BUDGET_MS });
}

export async function repairSave(slot: number): Promise<SaveInspectionResult> {
  const id = `save-slot-${slot}`;
  return measureAsyncOperation('save.repair', () => runSaveWriteInOrder(id, async () => {
    if (await hasSimAdvanceIntentForSaveOrRoot(id, id)) {
      throw new Error('This save tree has unresolved simulation journal evidence and cannot be repaired.');
    }
    const raw = await db.saves.get(id);
    if (!raw) {
      const backup = await inspectSaveIntegrityBackup(id);
      if (backup.exists) {
        throw new SaveIntegrityError(
          'missing',
          'The primary save record is missing while a protected copy still exists.',
        );
      }
      return { status: 'empty', slot } as SaveInspectionResult;
    }
    await assertStoredSaveIntegrity(raw, id);

    const repairedSnapshot = tryParseSnapshot(raw.snapshot) ?? tryParseLegacySnapshot(raw.legacyState ?? raw.gameState);
    if (!repairedSnapshot) {
      return {
        status: 'corrupt',
        slot,
        message: 'Unable to repair this save.',
        raw,
      } satisfies SaveInspectionResult;
    }

    const repairedRecord = await writeSaveGameByIdUnqueued(
      id,
      raw.name ?? `Slot ${slot}`,
      repairedSnapshot,
      {
        slotNumber: slot,
        parentSaveId: null,
        isRootSave: true,
        branchMeta: null,
      },
    );
    return {
      status: 'ok',
      slot,
      save: repairedRecord,
    } satisfies SaveInspectionResult;
  }), { budgetMs: SAVE_IO_BUDGET_MS });
}

const autoSaveScheduler = createAutoSaveScheduler(async (job) => {
  await saveGame(job.slot, job.name, job.state);
});

export function scheduleAutoSave(
  slot: number,
  name: string,
  state: object,
): Promise<void> {
  return autoSaveScheduler.schedule({ slot, name, state });
}

export async function flushAutoSaveQueueForTesting(): Promise<void> {
  await autoSaveScheduler.flush();
}
