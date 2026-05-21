import { beforeEach, describe, expect, it, vi } from 'vitest';
import { persistActiveSaveSnapshot } from './activeSavePersistence';
import { loadGameById, saveGameById, scheduleAutoSave } from './saveSystem';

vi.mock('./saveSystem', () => ({
  loadGameById: vi.fn(),
  saveGameById: vi.fn(),
  scheduleAutoSave: vi.fn(),
}));

const mockedLoadGameById = vi.mocked(loadGameById);
const mockedSaveGameById = vi.mocked(saveGameById);
const mockedScheduleAutoSave = vi.mocked(scheduleAutoSave);

describe('persistActiveSaveSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedScheduleAutoSave.mockResolvedValue(undefined);
    mockedSaveGameById.mockResolvedValue({} as Awaited<ReturnType<typeof saveGameById>>);
  });

  it('schedules a root-slot autosave with the exported snapshot', async () => {
    const snapshot = { schemaVersion: 33, season: 7, day: 12, phase: 'regular' };
    const result = await persistActiveSaveSnapshot({
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      gmName: 'Alex Rivera',
      teamName: 'Tycoons',
      season: 6,
      exportSnapshot: vi.fn().mockResolvedValue(snapshot),
    });

    expect(result.saved).toBe(true);
    expect(mockedScheduleAutoSave).toHaveBeenCalledWith(
      2,
      'Alex Rivera • Tycoons • Season 7',
      snapshot,
    );
    expect(mockedSaveGameById).not.toHaveBeenCalled();
  });

  it('preserves branch metadata when saving a non-slot active save', async () => {
    const snapshot = { schemaVersion: 33, season: 3, day: 44, phase: 'regular' };
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
  });
});
