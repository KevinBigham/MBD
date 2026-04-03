import Dexie, { type Table } from 'dexie';
import {
  type GameSnapshot,
  type SimPhase,
} from '@mbd/contracts';
import {
  GameSnapshotSchema,
  parseGameSnapshot,
} from '../../../../../packages/contracts/src/schemas/save';
import {
  SAVE_IO_BUDGET_MS,
  measureAsyncOperation,
} from './performance';

export const SAVE_SLOTS = [1, 2, 3, 4, 5] as const;

export interface SaveData {
  id: string;
  slotNumber: number;
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

type IdleCancel = () => void;
type IdleScheduler = (callback: () => void) => IdleCancel;

interface AutoSaveScheduler {
  schedule(job: AutoSaveJob): Promise<void>;
  flush(): Promise<void>;
  hasPending(): boolean;
}

class MBDDatabase extends Dexie {
  saves!: Table<SaveData, string>;

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
  }
}

export const db = new MBDDatabase();

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
  const snapshot = raw.snapshot ? parseGameSnapshot(raw.snapshot) : null;

  return {
    id: raw.id ?? `save-slot-${raw.slotNumber ?? 1}`,
    slotNumber: raw.slotNumber ?? 1,
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
  };
}

export function buildSaveRecord(
  slot: number,
  name: string,
  snapshot: GameSnapshot,
  existing?: SaveData
): SaveData {
  const now = new Date().toISOString();
  const parsedSnapshot = GameSnapshotSchema.parse(snapshot);

  return {
    id: `save-slot-${slot}`,
    slotNumber: slot,
    name,
    season: parsedSnapshot.season,
    day: parsedSnapshot.day,
    phase: parsedSnapshot.phase,
    schemaVersion: parsedSnapshot.schemaVersion,
    hasSnapshot: true,
    snapshot: parsedSnapshot,
    legacyState: null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function saveGame(
  slot: number,
  name: string,
  state: object
): Promise<void> {
  await measureAsyncOperation('save.write', async () => {
    const existing = await db.saves.get(`save-slot-${slot}`);
    const snapshot = GameSnapshotSchema.safeParse(state);
    if (snapshot.success) {
      await db.saves.put(buildSaveRecord(slot, name, snapshot.data, existing));
      return;
    }

    const now = new Date().toISOString();
    await db.saves.put({
      id: `save-slot-${slot}`,
      slotNumber: slot,
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
    });
  }, { budgetMs: SAVE_IO_BUDGET_MS });
}

export async function loadGame(
  slot: number
): Promise<SaveData | undefined> {
  return measureAsyncOperation('save.load', async () => {
    const id = `save-slot-${slot}`;
    const raw = await db.saves.get(id);
    return raw ? normalizeLoadedSaveRecord(raw) : undefined;
  }, { budgetMs: SAVE_IO_BUDGET_MS });
}

export async function listSaves(): Promise<SaveData[]> {
  const saves = await db.saves.orderBy('slotNumber').toArray();
  return saves.map(normalizeLoadedSaveRecord);
}

export async function loadMostRecentSnapshot(): Promise<SaveData | undefined> {
  const saves = await listSaves();
  return saves
    .filter((save) => save.hasSnapshot && save.snapshot)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export async function deleteSave(slot: number): Promise<void> {
  const id = `save-slot-${slot}`;
  await db.saves.delete(id);
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
