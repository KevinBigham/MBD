import { useCallback, useEffect, useState } from 'react';
import type { ShowSaveRecoveryOptions } from '@/features/save-recovery';
import type { GameState } from '@/shared/hooks/useGameStore';
import type { useWorker } from '@/shared/hooks/useWorker';
import { logger } from '@/shared/lib/logger';
import {
  activateActiveSavePersistenceMetadata,
  prepareActiveSavePersistenceForLoad,
  releaseActiveSavePersistenceLoad,
  replaceInactiveSavePersistenceRecord,
  retireActiveSavePersistenceForDelete,
  retireSaveTreePersistenceForDelete,
  trackActiveSavePersistenceOperation,
} from '@/shared/lib/activeSavePersistence';
import {
  SAVE_SLOTS,
  clearAllSaves,
  createBranchSave,
  deleteSave,
  deleteSaveById,
  exportSnapshotToJson,
  importSnapshotFromJson,
  listBranches,
  listSaves,
  loadGameById,
  loadSaveSafely,
  saveGame,
  type LoadSaveSafelyResult,
  type SaveData,
} from '@/shared/lib/saveSystem';

type SettingsSaveDataWorker = Pick<
  ReturnType<typeof useWorker>,
  | 'exportSnapshot'
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
  persistActiveSave: () => Promise<{ saved: boolean; saveName: string | null }>;
  recoveryShowFailure: RecoveryShowFailure;
  season: number;
  worker: SettingsSaveDataWorker;
}

export function useSettingsSaveData({
  activeSaveId,
  activeSaveSlot,
  day,
  initializeGame,
  persistActiveSave,
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
    if (!workerReady || !activeRootSaveId) {
      setBranches([]);
      return;
    }

    setBranches(await listBranches(activeRootSaveId));
  }, [activeRootSaveId, workerReady]);

  useEffect(() => {
    void refreshSaves();
    void refreshBranches();
  }, [activeManagedSaveId, refreshBranches, refreshSaves]);

  const handleSave = useCallback(async (slot: number) => {
    if (!workerReady) return;
    setBusySlot(slot);
    setStatus('');
    try {
      const targetSaveId = `save-slot-${slot}`;
      if (activeManagedSaveId === targetSaveId) {
        const result = await persistActiveSave();
        if (!result.saved) {
          setStatus(`Failed to save slot ${slot}.`);
          return;
        }
      } else {
        if (activeSaveId && activeSaveId !== activeRootSaveId) {
          const activeRecord = await loadGameById(activeSaveId);
          if (!activeRecord || activeRecord.parentSaveId === targetSaveId) {
            setStatus(`Cannot overwrite slot ${slot} while its what-if branch is active.`);
            return;
          }
        }
        await replaceInactiveSavePersistenceRecord(targetSaveId, async () => {
          const snapshot = await worker.exportSnapshot();
          return saveGame(slot, `Season ${season} Day ${day}`, snapshot, {
            replaceExistingRootBranchMetadata: true,
          });
        });
      }
      await refreshSaves();
      setStatus(`Saved snapshot to slot ${slot}.`);
    } catch (error) {
      logger.error('Failed to save game:', error);
      setStatus(`Failed to save slot ${slot}.`);
    } finally {
      setBusySlot(null);
    }
  }, [activeManagedSaveId, activeRootSaveId, activeSaveId, day, persistActiveSave, refreshSaves, season, worker, workerReady]);

  const handleDelete = useCallback(async (slot: number) => {
    const targetSaveId = `save-slot-${slot}`;
    if (
      activeManagedSaveId === targetSaveId
      || (activeManagedSaveId && activeRootSaveId === targetSaveId)
    ) {
      setStatus(`Cannot delete slot ${slot} while its dynasty is active.`);
      return false;
    }

    if (activeSaveId && activeSaveId !== activeRootSaveId) {
      try {
        const activeRecord = await loadGameById(activeSaveId);
        if (!activeRecord) {
          setStatus(`Cannot delete slot ${slot} while active branch ownership cannot be verified.`);
          return false;
        }
        if (activeRecord.parentSaveId === targetSaveId) {
          setStatus(`Cannot delete slot ${slot} because it owns the active what-if branch.`);
          return false;
        }
      } catch (error) {
        logger.error('Failed to verify active branch ownership:', error);
        setStatus(`Cannot delete slot ${slot} while active branch ownership cannot be verified.`);
        return false;
      }
    }

    setBusySlot(slot);
    setStatus('');
    try {
      await retireSaveTreePersistenceForDelete(targetSaveId, () => deleteSave(slot));
      await refreshSaves();
      setStatus(`Deleted slot ${slot}.`);
      return true;
    } catch (error) {
      logger.error('Failed to delete save:', error);
      setStatus(`Failed to delete slot ${slot}.`);
      return false;
    } finally {
      setBusySlot(null);
    }
  }, [activeManagedSaveId, activeRootSaveId, activeSaveId, refreshSaves]);

  const continueFromSave = useCallback(async (save: SaveData, snapshot: object | null): Promise<boolean> => {
    const imported = await worker.importSnapshot(snapshot);
    if (!imported.success) {
      releaseActiveSavePersistenceLoad(save.id);
      const errorMsg = 'error' in imported ? imported.error : 'Failed to load save.';
      logger.error('Save incompatible:', errorMsg);
      return false;
    }
    activateActiveSavePersistenceMetadata(save);
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
    return true;
  }, [initializeGame, worker]);

  const continueFromSafeLoad = useCallback(async (
    result: Extract<LoadSaveSafelyResult, { ok: true }>,
  ): Promise<boolean> => {
    return continueFromSave(result.save, result.snapshot);
  }, [continueFromSave]);

  const handleLoad = useCallback(async (slot: number): Promise<boolean> => {
    if (!workerReady) return false;
    const targetSaveId = `save-slot-${slot}`;
    setBusySlot(slot);
    setStatus('');
    try {
      await prepareActiveSavePersistenceForLoad(targetSaveId);
      const result = await loadSaveSafely(slot);
      if (!result.ok) {
        releaseActiveSavePersistenceLoad(targetSaveId);
        recoveryShowFailure({
          failure: result,
          onDelete: () => handleDelete(slot),
          onRetry: () => handleLoad(slot),
        });
        return false;
      }
      const continued = await continueFromSafeLoad(result);
      if (!continued) {
        setStatus(`Failed to load slot ${slot}.`);
        return false;
      }
      setStatus(`Loaded slot ${slot}.`);
      return true;
    } catch (error) {
      releaseActiveSavePersistenceLoad(targetSaveId);
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
    if (activeManagedSaveId) {
      setStatus('Cannot clear local saves while a dynasty is active.');
      return;
    }

    if (typeof window !== 'undefined' && !window.confirm('Delete every save slot? This cannot be undone.')) {
      return;
    }

    await clearAllSaves();
    await refreshSaves();
    setStatus('Cleared every local save slot.');
  }, [activeManagedSaveId, refreshSaves]);

  const handleCreateBranch = useCallback(async () => {
    if (!workerReady || !activeRootSaveId) {
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
      const snapshot = await worker.exportSnapshot();
      await trackActiveSavePersistenceOperation(activeRootSaveId, async () => {
        const created = await createBranchSave(activeRootSaveId, snapshot, description);
        return created.parent;
      });
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
    if (activeManagedSaveId === branchSaveId) {
      setStatus('Cannot delete the active what-if branch.');
      return;
    }
    if (!activeRootSaveId) {
      return;
    }

    setBranchBusy(true);
    setStatus('');
    try {
      await trackActiveSavePersistenceOperation(activeRootSaveId, async () => {
        const parent = await retireActiveSavePersistenceForDelete(
          branchSaveId,
          () => deleteSaveById(branchSaveId),
        );
        if (!parent) {
          throw new Error('The active root save disappeared after branch deletion.');
        }
        return parent;
      });
      await refreshBranches();
      setStatus('Deleted the selected what-if branch.');
    } catch (error) {
      logger.error('Failed to delete branch:', error);
      setStatus('Failed to delete the selected what-if branch.');
    } finally {
      setBranchBusy(false);
    }
  }, [activeManagedSaveId, activeRootSaveId, refreshBranches]);

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
