import Dexie, { type Table } from 'dexie';
import {
  CURRENT_GAME_SNAPSHOT_VERSION,
  GameSnapshotSchema,
  parseGameSnapshot,
  type GameSnapshot,
  type SimPhase,
  type WhatIfBranchMeta,
} from '@mbd/contracts';
import { calculateDynastyLeaderboardScore } from '@mbd/sim-core';
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

export const SAVE_SLOTS = [1, 2, 3, 4, 5] as const;

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
  }
}

export const db = new MBDDatabase();
const MAX_BRANCHES_PER_SAVE = 3;
const MINIMUM_SUPPORTED_SNAPSHOT_VERSION = 2;
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

async function putSealedSaveRecordRows(
  record: SaveData,
  metadata: SaveWriteMetadata,
): Promise<void> {
  if (metadata.deleteExistingBranchRows) {
    if (hasIndexedDBSupport()) {
      const childIds = metadata.deleteExistingBranchIds ?? [];
      await db.saves.bulkDelete(childIds);
      await db.saveIntegrityBackups.bulkDelete(childIds);
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
}

async function commitSealedSaveRecord(
  record: SaveData,
  metadata: SaveWriteMetadata,
): Promise<SaveData> {
  if (hasIndexedDBSupport()) {
    await db.transaction(
      'rw',
      db.saves,
      db.saveIntegrityBackups,
      db.leaderboard,
      () => putSealedSaveRecordRows(record, metadata),
    );
  } else {
    await putSealedSaveRecordRows(record, metadata);
  }
  return record;
}

async function writeSaveGameByIdUnqueued(
  id: string,
  name: string,
  state: object,
  metadata: SaveWriteMetadata,
): Promise<SaveData> {
  const existing = await readVerifiedStoredSave(id);
  const commitMetadata = metadata.deleteExistingBranchRows
    ? {
      ...metadata,
      deleteExistingBranchIds: await listSaveTreeChildIds(id),
    }
    : metadata;
  const record = await prepareSealedSaveRecordById(id, name, state, commitMetadata, existing);
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

  if (schemaVersion != null && schemaVersion < MINIMUM_SUPPORTED_SNAPSHOT_VERSION) {
    return saveLoadFailure('version_too_old', raw, id, `Save schema v${schemaVersion} is older than the supported migration floor.`, {
      schemaVersion,
      minimumSupportedVersion: MINIMUM_SUPPORTED_SNAPSHOT_VERSION,
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

async function deleteExactSaveRows(id: string): Promise<void> {
  const deleteRows = async () => {
    await db.saves.delete(id);
    if (hasIndexedDBSupport()) {
      await db.saveIntegrityBackups.delete(id);
    }
  };
  if (hasIndexedDBSupport()) {
    await db.transaction('rw', db.saves, db.saveIntegrityBackups, deleteRows);
  } else {
    await deleteRows();
  }
}

export type DeleteSaveByIdResult =
  | { outcome: 'not_found'; parent: null }
  | { outcome: 'deleted_root'; parent: null }
  | { outcome: 'deleted_branch'; parent: SaveData }
  | { outcome: 'deleted_exact_parent_untouched'; parent: null };

export async function deleteSaveByIdWithResult(id: string): Promise<DeleteSaveByIdResult> {
  return runSaveWriteInOrder(id, async () => {
    const record = await readSaveForDeletion(id);
    if (!record) {
      return { outcome: 'not_found', parent: null };
    }

    if (record.isRootSave) {
      const childIds = hasIndexedDBSupport()
        ? await listSaveTreeChildIds(record.id)
        : [];
      const deleteRootRows = async () => {
        if (hasIndexedDBSupport()) {
          await db.saves.bulkDelete(childIds);
          await db.saveIntegrityBackups.bulkDelete(childIds);
          await db.saveIntegrityBackups.delete(id);
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
          deleteRootRows,
        );
      } else {
        await deleteRootRows();
      }
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
          await deleteExactSaveRows(id);
          return { outcome: 'deleted_exact_parent_untouched', parent: null };
        }
        if (!parent.isRootSave || !referencedBranchIds(parent).includes(record.id)) {
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
          await putSealedSaveRecordRows(updatedParent, parentMetadata);
          await db.saves.delete(id);
          if (hasIndexedDBSupport()) {
            await db.saveIntegrityBackups.delete(id);
          }
        };
        if (hasIndexedDBSupport()) {
          await db.transaction(
            'rw',
            db.saves,
            db.saveIntegrityBackups,
            db.leaderboard,
            deleteBranchRows,
          );
        } else {
          await deleteBranchRows();
        }
        return { outcome: 'deleted_branch', parent: updatedParent };
      });
    }

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
  if (!hasIndexedDBSupport()) {
    await db.saves.clear();
    return;
  }

  await db.transaction(
    'rw',
    db.saves,
    db.saveIntegrityBackups,
    db.leaderboard,
    async () => {
      await db.saves.clear();
      await db.saveIntegrityBackups.clear();
      await db.leaderboard.clear();
    },
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
      async () => {
        const [currentPrimary, currentBackup] = await Promise.all([
          db.saves.get(saveId),
          db.saveIntegrityBackups.get(saveId),
        ]);
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
