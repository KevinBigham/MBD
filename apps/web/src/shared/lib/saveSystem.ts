import Dexie, { type Table } from 'dexie';
import {
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
  }
}

export const db = new MBDDatabase();
const MAX_BRANCHES_PER_SAVE = 3;
let branchIdCounter = 0;

function hasIndexedDBSupport(): boolean {
  return typeof indexedDB !== 'undefined';
}

function rootSaveId(slot: number): string {
  return `save-slot-${slot}`;
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

export async function saveGameById(
  id: string,
  name: string,
  state: object,
  metadata: {
    slotNumber: number | null;
    parentSaveId: string | null;
    isRootSave: boolean;
    branchMeta: WhatIfBranchMeta | null;
  },
): Promise<SaveData> {
  return measureAsyncOperation('save.write', async () => {
    const existing = await db.saves.get(id);
    const snapshot = GameSnapshotSchema.safeParse(state);
    if (snapshot.success) {
      const record = buildSaveRecordById(id, name, snapshot.data, {
        existing,
        ...metadata,
      });
      await db.saves.put(record);
      if (record.isRootSave && record.slotNumber != null) {
        await upsertLeaderboardEntry(record.slotNumber, record.snapshot!);
      }
      return record;
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
    await db.saves.put(record);
    return record;
  }, { budgetMs: SAVE_IO_BUDGET_MS });
}

export async function saveGame(
  slot: number,
  name: string,
  state: object,
): Promise<void> {
  await saveGameById(rootSaveId(slot), name, state, {
    slotNumber: slot,
    parentSaveId: null,
    isRootSave: true,
    branchMeta: null,
  });
}

export async function loadGameById(id: string): Promise<SaveData | undefined> {
  return measureAsyncOperation('save.load', async () => {
    const raw = await db.saves.get(id);
    return raw ? normalizeLoadedSaveRecord(raw) : undefined;
  }, { budgetMs: SAVE_IO_BUDGET_MS });
}

export async function loadGame(
  slot: number,
): Promise<SaveData | undefined> {
  return loadGameById(rootSaveId(slot));
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

export async function listRootSaves(): Promise<SaveData[]> {
  const saves = await listAllSaveRecords();
  return saves
    .filter((save) => save.isRootSave)
    .sort((left, right) => (left.slotNumber ?? 99) - (right.slotNumber ?? 99));
}

export async function listSaves(): Promise<SaveData[]> {
  return listRootSaves();
}

export async function listBranches(parentSaveId: string): Promise<SaveData[]> {
  const saves = await listAllSaveRecords();
  return saves
    .filter((save) => !save.isRootSave && save.parentSaveId === parentSaveId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listSaveTree(): Promise<SaveTreeEntry[]> {
  const [roots, saves] = await Promise.all([listRootSaves(), listAllSaveRecords()]);
  return roots.map((save) => ({
    save,
    branches: saves
      .filter((candidate) => !candidate.isRootSave && candidate.parentSaveId === save.id)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  }));
}

export async function loadMostRecentSnapshot(): Promise<SaveData | undefined> {
  const saves = await listAllSaveRecords();
  return saves
    .filter((save) => save.hasSnapshot && save.snapshot)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

async function updateParentBranchMetadata(
  parentSaveId: string,
  update: (branches: WhatIfBranchMeta[]) => WhatIfBranchMeta[],
): Promise<void> {
  const parent = await loadGameById(parentSaveId);
  if (!parent?.snapshot) {
    return;
  }

  const updatedParentSnapshot = GameSnapshotSchema.parse({
    ...parent.snapshot,
    narrative: {
      ...parent.snapshot.narrative,
      whatIfBranches: update(parent.snapshot.narrative.whatIfBranches ?? []),
    },
  });
  const updatedParentRecord = buildSaveRecordById(parent.id, parent.name, updatedParentSnapshot, {
    existing: parent,
    slotNumber: parent.slotNumber,
    parentSaveId: null,
    isRootSave: true,
    branchMeta: null,
  });
  await db.saves.put(updatedParentRecord);
}

export async function createBranchSave(
  parentSaveId: string,
  snapshot: GameSnapshot,
  description: string,
): Promise<SaveData> {
  const parent = await loadGameById(parentSaveId);
  if (!parent?.snapshot || !parent.isRootSave) {
    throw new Error('Cannot branch a missing or non-root save.');
  }

  const existingBranches = await listBranches(parentSaveId);
  if (existingBranches.length >= MAX_BRANCHES_PER_SAVE) {
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

  const branchRecord = await saveGameById(branchId, description, branchSnapshot, {
    slotNumber: null,
    parentSaveId,
    isRootSave: false,
    branchMeta,
  });
  await updateParentBranchMetadata(parentSaveId, (branches) => [...branches, branchMeta]);
  return branchRecord;
}

export async function deleteSaveById(id: string): Promise<void> {
  const record = await loadGameById(id);
  if (!record) {
    return;
  }

  if (record.isRootSave) {
    const branches = await listBranches(record.id);
    await Promise.all(branches.map((branch) => db.saves.delete(branch.id)));
    if (record.slotNumber != null) {
      await deleteLeaderboardEntriesForSlot(record.slotNumber);
    }
  } else if (record.parentSaveId) {
    await updateParentBranchMetadata(record.parentSaveId, (branches) =>
      branches.filter((branch) => branch.saveId !== record.id && branch.id !== record.id));
  }

  await db.saves.delete(id);
}

export async function deleteSave(slot: number): Promise<void> {
  await deleteSaveById(rootSaveId(slot));
}

export async function clearAllSaves(): Promise<void> {
  if (!hasIndexedDBSupport()) {
    await db.saves.clear();
    return;
  }

  await Promise.all([db.saves.clear(), db.leaderboard.clear()]);
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

export async function repairSave(slot: number): Promise<SaveInspectionResult> {
  const id = `save-slot-${slot}`;
  return measureAsyncOperation('save.repair', async () => {
    const raw = await db.saves.get(id);
    if (!raw) {
      return { status: 'empty', slot } as SaveInspectionResult;
    }

    const repairedSnapshot = tryParseSnapshot(raw.snapshot) ?? tryParseLegacySnapshot(raw.legacyState ?? raw.gameState);
    if (!repairedSnapshot) {
      return {
        status: 'corrupt',
        slot,
        message: 'Unable to repair this save.',
        raw,
      } satisfies SaveInspectionResult;
    }

    const repairedRecord = buildSaveRecord(slot, raw.name ?? `Slot ${slot}`, repairedSnapshot, raw as SaveData);
    await db.saves.put(repairedRecord);
    return {
      status: 'ok',
      slot,
      save: repairedRecord,
    } satisfies SaveInspectionResult;
  }, { budgetMs: SAVE_IO_BUDGET_MS });
}

const autoSaveScheduler = createAutoSaveScheduler((job) =>
  saveGame(job.slot, job.name, job.state),
);

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
