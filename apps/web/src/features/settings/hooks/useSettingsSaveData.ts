import { useCallback, useEffect, useState } from 'react';
import type { ShowSaveRecoveryOptions } from '@/features/save-recovery';
import type { GameState } from '@/shared/hooks/useGameStore';
import type { useWorker } from '@/shared/hooks/useWorker';
import { logger } from '@/shared/lib/logger';
import {
  SAVE_SLOTS,
  clearAllSaves,
  deleteSave,
  exportSnapshotToJson,
  importSnapshotFromJson,
  listSaves,
  loadSaveSafely,
  saveGame,
  type LoadSaveSafelyResult,
  type SaveData,
} from '@/shared/lib/saveSystem';

type SettingsSaveDataWorker = Pick<
  ReturnType<typeof useWorker>,
  | 'createWhatIfBranch'
  | 'deleteWhatIfBranch'
  | 'exportSnapshot'
  | 'getBranches'
  | 'importSnapshot'
  | 'isReady'
>;

type InitializeGame = GameState['initializeGame'];
type RecoveryShowFailure = (options: ShowSaveRecoveryOptions) => unknown;

export interface UseSettingsSaveDataOptions {
  activeSaveId: string | null;
  activeSaveSlot: number | null;
  day: number;
  initializeGame: InitializeGame;
  recoveryShowFailure: RecoveryShowFailure;
  season: number;
  worker: SettingsSaveDataWorker;
}

export function useSettingsSaveData({
  activeSaveId,
  activeSaveSlot,
  day,
  initializeGame,
  recoveryShowFailure,
  season,
  worker,
}: UseSettingsSaveDataOptions) {
  const workerReady = worker.isReady;
  const [saves, setSaves] = useState<SaveData[]>([]);
  const [status, setStatus] = useState<string>('');
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [branchBusy, setBranchBusy] = useState(false);
  const [branchDescription, setBranchDescription] = useState('');
  const [branches, setBranches] = useState<SaveData[]>([]);
  const activeRootSaveId = activeSaveSlot != null ? `save-slot-${activeSaveSlot}` : null;
  const activeManagedSaveId = activeSaveId ?? activeRootSaveId;

  const refreshSaves = useCallback(async () => {
    setSaves(await listSaves());
  }, []);

  const refreshBranches = useCallback(async () => {
    if (!workerReady || !activeRootSaveId || typeof worker.getBranches !== 'function') {
      setBranches([]);
      return;
    }

    setBranches(await worker.getBranches(activeRootSaveId));
  }, [activeRootSaveId, worker, workerReady]);

  useEffect(() => {
    void refreshSaves();
    void refreshBranches();
  }, [activeManagedSaveId, refreshBranches, refreshSaves]);

  const handleSave = useCallback(async (slot: number) => {
    if (!workerReady) return;
    setBusySlot(slot);
    setStatus('');
    try {
      const snapshot = await worker.exportSnapshot();
      await saveGame(slot, `Season ${season} Day ${day}`, snapshot);
      await refreshSaves();
      setStatus(`Saved snapshot to slot ${slot}.`);
    } catch (error) {
      logger.error('Failed to save game:', error);
      setStatus(`Failed to save slot ${slot}.`);
    } finally {
      setBusySlot(null);
    }
  }, [day, refreshSaves, season, worker, workerReady]);

  const handleDelete = useCallback(async (slot: number) => {
    setBusySlot(slot);
    setStatus('');
    try {
      await deleteSave(slot);
      await refreshSaves();
      setStatus(`Deleted slot ${slot}.`);
    } catch (error) {
      logger.error('Failed to delete save:', error);
      setStatus(`Failed to delete slot ${slot}.`);
    } finally {
      setBusySlot(null);
    }
  }, [refreshSaves]);

  const continueFromSave = useCallback(async (save: SaveData, snapshot: object | null) => {
    const imported = await worker.importSnapshot(snapshot);
    if (!imported.success) {
      const errorMsg = 'error' in imported ? imported.error : 'Failed to load save.';
      logger.error('Save incompatible:', errorMsg);
      return;
    }
    initializeGame({
      season: imported.season,
      day: imported.day,
      phase: imported.phase,
      playerCount: imported.playerCount,
      userTeamId: imported.userTeamId,
      teamName: imported.teamName,
      gmName: imported.gmName,
      difficulty: imported.difficulty,
      activeSaveId: save.id,
      activeSaveSlot: save.slotNumber,
    });
  }, [initializeGame, worker]);

  const continueFromSafeLoad = useCallback(async (result: Extract<LoadSaveSafelyResult, { ok: true }>) => {
    await continueFromSave(result.save, result.snapshot);
  }, [continueFromSave]);

  const handleLoad = useCallback(async (slot: number): Promise<boolean> => {
    if (!workerReady) return false;
    setBusySlot(slot);
    setStatus('');
    try {
      const result = await loadSaveSafely(slot);
      if (!result.ok) {
        recoveryShowFailure({
          failure: result,
          onDelete: () => handleDelete(slot),
          onRetry: () => handleLoad(slot),
        });
        return false;
      }
      await continueFromSafeLoad(result);
      setStatus(`Loaded slot ${slot}.`);
      return true;
    } catch (error) {
      logger.error('Failed to load game:', error);
      setStatus(`Failed to load slot ${slot}.`);
      return false;
    } finally {
      setBusySlot(null);
    }
  }, [continueFromSafeLoad, handleDelete, recoveryShowFailure, workerReady]);

  const handleExportCurrent = useCallback(async () => {
    if (!workerReady) {
      setStatus('Start or load a dynasty before exporting.');
      return;
    }

    try {
      const snapshot = await worker.exportSnapshot();
      const payload = exportSnapshotToJson(`Season ${season} Day ${day}`, snapshot);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mbd-season-${season}-day-${day}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      setStatus('Exported the current dynasty snapshot.');
    } catch (error) {
      logger.error('Failed to export snapshot:', error);
      setStatus('Failed to export the current dynasty snapshot.');
    }
  }, [day, season, worker, workerReady]);

  const handleImportFile = useCallback(async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const imported = importSnapshotFromJson(text);
      const usedSlots = new Set(saves.map((save) => save.slotNumber));
      const slot = SAVE_SLOTS.find((candidate) => !usedSlots.has(candidate));
      if (!slot) {
        setStatus('Delete an existing save slot before importing a new dynasty.');
        return;
      }
      await saveGame(slot, imported.name, imported.snapshot);
      await refreshSaves();
      setStatus(`Imported save into slot ${slot}.`);
    } catch (error) {
      logger.error('Failed to import save:', error);
      setStatus('Failed to import save file.');
    }
  }, [refreshSaves, saves]);

  const handleClearAllSaves = useCallback(async () => {
    if (typeof window !== 'undefined' && !window.confirm('Delete every save slot? This cannot be undone.')) {
      return;
    }

    await clearAllSaves();
    await refreshSaves();
    setStatus('Cleared every local save slot.');
  }, [refreshSaves]);

  const handleCreateBranch = useCallback(async () => {
    if (!workerReady || !activeRootSaveId || typeof worker.createWhatIfBranch !== 'function') {
      return;
    }
    const description = branchDescription.trim();
    if (!description) {
      setStatus('Name the what-if branch before creating it.');
      return;
    }

    setBranchBusy(true);
    setStatus('');
    try {
      await worker.createWhatIfBranch(activeRootSaveId, description);
      await refreshBranches();
      setBranchDescription('');
      setStatus('Created a new what-if branch from the active root save.');
    } catch (error) {
      logger.error('Failed to create branch:', error);
      setStatus('Failed to create a what-if branch.');
    } finally {
      setBranchBusy(false);
    }
  }, [activeRootSaveId, branchDescription, refreshBranches, worker, workerReady]);

  const handleDeleteBranch = useCallback(async (branchSaveId: string) => {
    if (typeof worker.deleteWhatIfBranch !== 'function') {
      return;
    }

    setBranchBusy(true);
    setStatus('');
    try {
      await worker.deleteWhatIfBranch(branchSaveId);
      await refreshBranches();
      setStatus('Deleted the selected what-if branch.');
    } catch (error) {
      logger.error('Failed to delete branch:', error);
      setStatus('Failed to delete the selected what-if branch.');
    } finally {
      setBranchBusy(false);
    }
  }, [refreshBranches, worker]);

  return {
    activeManagedSaveId,
    activeRootSaveId,
    branchBusy,
    branchDescription,
    branches,
    busySlot,
    handleClearAllSaves,
    handleCreateBranch,
    handleDelete,
    handleDeleteBranch,
    handleExportCurrent,
    handleImportFile,
    handleLoad,
    handleSave,
    refreshSaves,
    saveSlots: SAVE_SLOTS,
    saves,
    setBranchDescription,
    setStatus,
    status,
  };
}
