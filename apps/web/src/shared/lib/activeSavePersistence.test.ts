import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getActiveSavePersistenceStatus,
  persistActiveSaveSnapshot,
  resetActiveSavePersistenceForTesting,
  retryActiveSavePersistence,
} from './activeSavePersistence';
import { loadGameById, saveGameById, scheduleAutoSave } from './saveSystem';

vi.mock('./saveSystem', () => ({
  loadGameById: vi.fn(),
  saveGameById: vi.fn(),
  scheduleAutoSave: vi.fn(),
}));

const mockedLoadGameById = vi.mocked(loadGameById);
const mockedSaveGameById = vi.mocked(saveGameById);
const mockedScheduleAutoSave = vi.mocked(scheduleAutoSave);

async function flushPromises(times = 5) {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

describe('persistActiveSaveSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetActiveSavePersistenceForTesting();
    mockedScheduleAutoSave.mockResolvedValue(undefined);
    mockedSaveGameById.mockResolvedValue({ id: 'save-slot-1' } as Awaited<ReturnType<typeof saveGameById>>);
  });

  it('persists a root-slot snapshot through the ordered active-save coordinator', async () => {
    const snapshot = { schemaVersion: 34, season: 7, day: 12, phase: 'regular' };
    const result = await persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 6,
      exportSnapshot: vi.fn().mockResolvedValue(snapshot),
    });

    expect(result.saved).toBe(true);
    expect(mockedSaveGameById).toHaveBeenCalledWith(
      'save-slot-2',
      'Alex Rivera • Tycoons • Season 7',
      snapshot,
      {
        slotNumber: 2,
        parentSaveId: null,
        isRootSave: true,
        branchMeta: null,
      },
    );
    expect(mockedScheduleAutoSave).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({
      state: 'saved',
      desiredGeneration: 1,
      durableGeneration: 1,
      saveName: 'Alex Rivera • Tycoons • Season 7',
      canRetry: false,
    });
  });

  it('preserves branch metadata when saving a non-slot active save', async () => {
    const snapshot = { schemaVersion: 34, season: 3, day: 44, phase: 'regular' };
    mockedLoadGameById.mockResolvedValue({
      id: 'branch-1',
      slotNumber: null,
      parentSaveId: 'save-slot-1',
      isRootSave: false,
      branchMeta: {
        id: 'branch-meta-1',
        saveId: 'branch-1',
        branchedAtSeason: 2,
        branchedAtDay: 99,
        description: 'What if',
        createdAt: '2026-05-20T00:00:00.000Z',
      },
    } as Awaited<ReturnType<typeof loadGameById>>);

    await persistActiveSaveSnapshot({
      activeSaveId: 'branch-1',
      activeSaveSlot: null,
      gmName: 'Branch GM',
      teamName: 'Alt Club',
      season: 3,
      exportSnapshot: vi.fn().mockResolvedValue(snapshot),
    });

    expect(mockedSaveGameById).toHaveBeenCalledWith(
      'branch-1',
      'Branch GM • Alt Club • Season 3',
      snapshot,
      expect.objectContaining({
        slotNumber: null,
        parentSaveId: 'save-slot-1',
        isRootSave: false,
      }),
    );
  });

  it('keeps burst writes ordered and resolves superseded callers after the latest snapshot is durable', async () => {
    const writeReleases: Array<() => void> = [];
    const writtenStates: object[] = [];
    mockedSaveGameById.mockImplementation(async (_id, _name, state) => {
      writtenStates.push(state);
      await new Promise<void>((resolve) => {
        writeReleases.push(resolve);
      });
      return { id: 'save-slot-1' } as Awaited<ReturnType<typeof saveGameById>>;
    });

    const first = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 101 }),
    });
    await Promise.resolve();

    const second = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 4,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 4, day: 102 }),
    });
    await Promise.resolve();

    let firstSettled = false;
    first.then(() => {
      firstSettled = true;
    });

    expect(mockedSaveGameById).toHaveBeenCalledTimes(1);
    expect(writtenStates).toEqual([{ schemaVersion: 34, season: 4, day: 101 }]);
    expect(getActiveSavePersistenceStatus('save-slot-1')).toMatchObject({
      state: 'saving',
      desiredGeneration: 2,
      durableGeneration: 0,
    });

    writeReleases.shift()?.();
    await flushPromises();

    expect(firstSettled).toBe(false);
    expect(mockedSaveGameById).toHaveBeenCalledTimes(2);
    expect(writtenStates).toEqual([
      { schemaVersion: 34, season: 4, day: 101 },
      { schemaVersion: 34, season: 4, day: 102 },
    ]);

    writeReleases.shift()?.();
    await Promise.all([first, second]);

    expect(getActiveSavePersistenceStatus('save-slot-1')).toMatchObject({
      state: 'saved',
      desiredGeneration: 2,
      durableGeneration: 2,
      canRetry: false,
    });
  });

  it('does not coalesce pending writes across different active save ids', async () => {
    const writeReleases: Array<() => void> = [];
    mockedSaveGameById.mockImplementation(async (id) => {
      await new Promise<void>((resolve) => {
        writeReleases.push(resolve);
      });
      return { id } as Awaited<ReturnType<typeof saveGameById>>;
    });

    const slotOne = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 2,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 2, day: 44 }),
    });
    await Promise.resolve();

    const slotTwo = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      gmName: 'Branch GM',
      teamName: 'Rivals',
      season: 8,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 8, day: 10 }),
    });
    await Promise.resolve();

    expect(mockedSaveGameById).toHaveBeenCalledWith(
      'save-slot-1',
      expect.any(String),
      expect.objectContaining({ day: 44 }),
      expect.objectContaining({ slotNumber: 1 }),
    );
    expect(mockedSaveGameById).toHaveBeenCalledWith(
      'save-slot-2',
      expect.any(String),
      expect.objectContaining({ day: 10 }),
      expect.objectContaining({ slotNumber: 2 }),
    );

    writeReleases.splice(0).forEach((release) => release());
    await Promise.all([slotOne, slotTwo]);

    expect(getActiveSavePersistenceStatus('save-slot-1')).toMatchObject({ state: 'saved', durableGeneration: 1 });
    expect(getActiveSavePersistenceStatus('save-slot-2')).toMatchObject({ state: 'saved', durableGeneration: 1 });
  });

  it('binds a delayed export to the save id captured before an active-save switch', async () => {
    let releaseSlotOneExport: () => void = () => {};
    const exportSlotOne = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        releaseSlotOneExport = resolve;
      });
      return { schemaVersion: 34, season: 3, day: 18 };
    });
    const exportSlotTwo = vi.fn().mockResolvedValue({ schemaVersion: 34, season: 9, day: 2 });

    const slotOne = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      gmName: 'Slot One GM',
      teamName: 'Tycoons',
      season: 3,
      exportSnapshot: exportSlotOne,
    });
    await Promise.resolve();

    const slotTwo = persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      gmName: 'Slot Two GM',
      teamName: 'Rivals',
      season: 9,
      exportSnapshot: exportSlotTwo,
    });

    await slotTwo;
    releaseSlotOneExport();
    await slotOne;

    expect(mockedSaveGameById).toHaveBeenNthCalledWith(
      1,
      'save-slot-2',
      'Slot Two GM • Rivals • Season 9',
      { schemaVersion: 34, season: 9, day: 2 },
      expect.objectContaining({ slotNumber: 2 }),
    );
    expect(mockedSaveGameById).toHaveBeenNthCalledWith(
      2,
      'save-slot-1',
      'Slot One GM • Tycoons • Season 3',
      { schemaVersion: 34, season: 3, day: 18 },
      expect.objectContaining({ slotNumber: 1 }),
    );
  });

  it('retries the latest failed captured snapshot without exporting or rerunning mutation work', async () => {
    const snapshot = { schemaVersion: 34, season: 5, day: 120, phase: 'regular' };
    const exportSnapshot = vi.fn().mockResolvedValue(snapshot);
    const storageError = new Error('QuotaExceededError');
    mockedSaveGameById
      .mockRejectedValueOnce(storageError)
      .mockResolvedValueOnce({ id: 'save-slot-5' } as Awaited<ReturnType<typeof saveGameById>>);

    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot,
    })).rejects.toThrow('QuotaExceededError');

    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'failed',
      canRetry: true,
      failureKind: 'quota',
      desiredGeneration: 1,
      durableGeneration: 0,
    });

    await retryActiveSavePersistence('save-slot-5');

    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedSaveGameById).toHaveBeenCalledTimes(2);
    expect(mockedSaveGameById).toHaveBeenNthCalledWith(
      2,
      'save-slot-5',
      'Alex Rivera • Tycoons • Season 5',
      snapshot,
      expect.objectContaining({ slotNumber: 5 }),
    );
    expect(getActiveSavePersistenceStatus('save-slot-5')).toMatchObject({
      state: 'saved',
      canRetry: false,
      durableGeneration: 1,
    });
  });

  it('classifies durable-write failures into distinct storage-family kinds', async () => {
    const cases: Array<{ error: Error; slot: number; saveId: string; kind: string }> = [
      { error: new DOMException('The quota has been exceeded.', 'QuotaExceededError'), slot: 11, saveId: 'save-slot-11', kind: 'quota' },
      { error: new DOMException('A mutation operation was attempted on a database that did not allow mutations.', 'TransactionInactiveError'), slot: 12, saveId: 'save-slot-12', kind: 'indexeddb' },
      { error: new Error('Persistent storage is unavailable right now.'), slot: 13, saveId: 'save-slot-13', kind: 'storage' },
      { error: new Error('Something else went wrong.'), slot: 14, saveId: 'save-slot-14', kind: 'storage' },
    ];

    for (const testCase of cases) {
      mockedSaveGameById.mockRejectedValueOnce(testCase.error);
      await expect(persistActiveSaveSnapshot({
        activeSaveId: testCase.saveId,
        activeSaveSlot: testCase.slot,
        gmName: 'Alex Rivera',
        teamName: 'Tycoons',
        season: 5,
        exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34, season: 5, day: 1 }),
      })).rejects.toBeTruthy();

      expect(getActiveSavePersistenceStatus(testCase.saveId)).toMatchObject({
        state: 'failed',
        canRetry: true,
        failureKind: testCase.kind,
      });
    }
  });

  it('classifies a snapshot export failure before any durable write', async () => {
    const exportSnapshot = vi.fn().mockRejectedValue(new Error('Worker export failed.'));
    await expect(persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-21',
      activeSaveSlot: 21,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 5,
      exportSnapshot,
    })).rejects.toThrow('Worker export failed.');

    expect(mockedSaveGameById).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus('save-slot-21')).toMatchObject({
      state: 'failed',
      failureKind: 'export',
    });
  });

  it('does nothing when there is no active save', async () => {
    const exportSnapshot = vi.fn();
    const result = await persistActiveSaveSnapshot({
      activeSaveId: null,
      activeSaveSlot: null,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 1,
      exportSnapshot,
    });

    expect(result.saved).toBe(false);
    expect(exportSnapshot).not.toHaveBeenCalled();
    expect(getActiveSavePersistenceStatus(null)).toMatchObject({
      state: 'idle',
      canRetry: false,
    });
  });
});
