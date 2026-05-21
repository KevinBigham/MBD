import { loadGameById, saveGameById, scheduleAutoSave } from './saveSystem';

interface PersistActiveSaveSnapshotOptions {
  activeSaveId: string | null | undefined;
  activeSaveSlot: number | null | undefined;
  gmName: string | null | undefined;
  teamName: string | null | undefined;
  season: number;
  exportSnapshot: () => Promise<object>;
}

interface PersistActiveSaveSnapshotResult {
  saved: boolean;
  saveName: string | null;
}

function snapshotSeason(snapshot: object, fallbackSeason: number): number {
  const value = (snapshot as { season?: unknown }).season;
  return typeof value === 'number' && Number.isFinite(value) ? value : fallbackSeason;
}

export async function persistActiveSaveSnapshot({
  activeSaveId,
  activeSaveSlot,
  gmName,
  teamName,
  season,
  exportSnapshot,
}: PersistActiveSaveSnapshotOptions): Promise<PersistActiveSaveSnapshotResult> {
  if (activeSaveId == null) {
    return { saved: false, saveName: null };
  }

  const snapshot = await exportSnapshot();
  const saveSeason = snapshotSeason(snapshot, season);
  const saveName = `${gmName?.trim() || 'General Manager'} • ${teamName?.trim() || 'Franchise'} • Season ${saveSeason}`;

  if (activeSaveSlot != null) {
    await scheduleAutoSave(activeSaveSlot, saveName, snapshot);
    return { saved: true, saveName };
  }

  const existing = await loadGameById(activeSaveId);
  await saveGameById(activeSaveId, saveName, snapshot, {
    slotNumber: existing?.slotNumber ?? null,
    parentSaveId: existing?.parentSaveId ?? null,
    isRootSave: existing?.isRootSave ?? false,
    branchMeta: existing?.branchMeta ?? null,
  });

  return { saved: true, saveName };
}
