import { useCallback, useEffect, useRef, useState } from 'react';
import type { ShowSaveRecoveryOptions } from '@/features/save-recovery';
import type { GameState } from '@/shared/hooks/useGameStore';
import type { useWorker } from '@/shared/hooks/useWorker';
import { logger } from '@/shared/lib/logger';
import {
  activateActiveSavePersistenceMetadata,
  abortActiveSaveSessionTransition,
  completeActiveSaveSessionTransition,
  markActiveSaveSessionTransitionOwnershipCommitted,
  prepareActiveSaveSessionTransition,
  replaceInactiveSavePersistenceRecord,
  restoreInactiveSaveIntegrityBackup,
  retireActiveSavePersistenceForDelete,
  retireSaveTreePersistenceForDelete,
  trackActiveSavePersistenceOperation,
  type ActiveSaveSessionTransition,
} from '@/shared/lib/activeSavePersistence';
import {
  SAVE_SLOTS,
  clearAllSaves,
  createBranchSave,
  deleteSave,
  deleteSaveByIdWithResult,
  exportSnapshotToJson,
  importSnapshotFromJson,
  listBranches,
  listSaves,
  loadGameById,
  loadSaveSafely,
  resolveSaveSessionTarget,
  saveGame,
  type LoadSaveSafelyResult,
  type DeleteSaveByIdResult,
  type SaveData,
  type SaveSessionTarget,
} from '@/shared/lib/saveSystem';
import {
  abortSaveSessionOwnership,
  beginSaveSessionOwnership,
  commitSaveSessionOwnership,
  isSaveSessionOwnershipError,
  saveSessionOwnershipFailureMessage,
  SaveSessionOwnershipError,
  withAllTransientSaveSessionOwnership,
  withSaveSessionImportAuthorization,
  withTransientSaveSessionOwnership,
  type SaveSessionClaim,
} from '@/shared/lib/saveSessionOwnership';
import {
  captureOutgoingSaveSessionSnapshot,
  recoverWorkerAfterCandidateImportFailure,
} from '@/shared/lib/saveSessionTransitionRecovery';

type SettingsSaveDataWorker = Pick<
  ReturnType<typeof useWorker>,
  | 'exportSnapshot'
  | 'importSnapshot'
  | 'isReady'
  | 'restartWorker'
>;

type InitializeGame = GameState['initializeGame'];
type RecoveryShowFailure = (options: ShowSaveRecoveryOptions) => unknown;

export interface UseSettingsSaveDataOptions {
  activeSaveId: string | null;
  activeSaveSlot: number | null;
  day: number;
  initializeGame: InitializeGame;
  setInitialized: GameState['setInitialized'];
  persistActiveSave: (options?: {
    transitionSaveId?: string;
  }) => Promise<{ saved: boolean; saveName: string | null }>;
  recoveryShowFailure: RecoveryShowFailure;
  season: number;
  worker: SettingsSaveDataWorker;
}

export function useSettingsSaveData({
  activeSaveId,
  activeSaveSlot,
  day,
  initializeGame,
  setInitialized,
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
  const [operationBusy, setOperationBusy] = useState(false);
  const operationInFlightRef = useRef(false);
  const [branchDescription, setBranchDescription] = useState('');
  const [branches, setBranches] = useState<SaveData[]>([]);
  const activeRootSaveId = activeSaveSlot != null ? `save-slot-${activeSaveSlot}` : null;
  const activeManagedSaveId = activeSaveId ?? activeRootSaveId;

  const beginSaveDataOperation = useCallback((): boolean => {
    if (operationInFlightRef.current) {
      setStatus('Finish the current save operation before starting another one.');
      return false;
    }
    operationInFlightRef.current = true;
    setOperationBusy(true);
    return true;
  }, []);

  const finishSaveDataOperation = useCallback((): void => {
    operationInFlightRef.current = false;
    setOperationBusy(false);
  }, []);

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
    if (!beginSaveDataOperation()) return;
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
        await withTransientSaveSessionOwnership(targetSaveId, () =>
          replaceInactiveSavePersistenceRecord(targetSaveId, async () => {
            const snapshot = await worker.exportSnapshot();
            return saveGame(slot, `Season ${season} Day ${day}`, snapshot, {
              replaceExistingRootBranchMetadata: true,
            });
          }),
        );
      }
      await refreshSaves();
      setStatus(`Saved snapshot to slot ${slot}.`);
    } catch (error) {
      logger.error('Failed to save game:', error);
      setStatus(isSaveSessionOwnershipError(error)
        ? saveSessionOwnershipFailureMessage(error, `Slot ${slot}`, 'Nothing was saved there.')
        : `Failed to save slot ${slot}.`);
    } finally {
      setBusySlot(null);
      finishSaveDataOperation();
    }
  }, [activeManagedSaveId, activeRootSaveId, activeSaveId, beginSaveDataOperation, day, finishSaveDataOperation, persistActiveSave, refreshSaves, season, worker, workerReady]);

  const handleDelete = useCallback(async (slot: number) => {
    if (!beginSaveDataOperation()) return false;
    const targetSaveId = `save-slot-${slot}`;
    try {
      if (
        activeManagedSaveId === targetSaveId
        || (activeManagedSaveId && activeRootSaveId === targetSaveId)
      ) {
        setStatus(`Cannot delete slot ${slot} while its dynasty is active.`);
        return false;
      }

      if (activeSaveId && activeSaveId !== activeRootSaveId) {
        const activeRecord = await loadGameById(activeSaveId);
        if (!activeRecord) {
          setStatus(`Cannot delete slot ${slot} while active branch ownership cannot be verified.`);
          return false;
        }
        if (activeRecord.parentSaveId === targetSaveId) {
          setStatus(`Cannot delete slot ${slot} because it owns the active what-if branch.`);
          return false;
        }
      }

      setBusySlot(slot);
      setStatus('');
      await withTransientSaveSessionOwnership(targetSaveId, () =>
        retireSaveTreePersistenceForDelete(targetSaveId, () => deleteSave(slot)));
      await refreshSaves();
      setStatus(`Deleted slot ${slot}.`);
      return true;
    } catch (error) {
      logger.error('Failed to delete save:', error);
      setStatus(isSaveSessionOwnershipError(error)
        ? saveSessionOwnershipFailureMessage(error, `Slot ${slot}`, 'Nothing was deleted.')
        : `Failed to delete slot ${slot}.`);
      return false;
    } finally {
      setBusySlot(null);
      finishSaveDataOperation();
    }
  }, [activeManagedSaveId, activeRootSaveId, activeSaveId, beginSaveDataOperation, finishSaveDataOperation, refreshSaves]);

  const continueFromSave = useCallback(async (
    save: SaveData,
    snapshot: object | null,
    target: SaveSessionTarget,
    claim: SaveSessionClaim,
    transition: ActiveSaveSessionTransition,
  ): Promise<boolean> => {
    if ((save.parentSaveId ?? save.id) !== target.rootSaveId) {
      throw new SaveSessionOwnershipError(
        'unknown_tree',
        'The save-tree relationship changed while exclusive access was being prepared.',
        target.rootSaveId,
      );
    }
    let outgoingSnapshot: object | null = null;
    let workerMayBeReplaced = transition.outgoingSaveId != null;
    let candidateCommitted = false;
    try {
      outgoingSnapshot = await captureOutgoingSaveSessionSnapshot(
        transition,
        worker.exportSnapshot,
      );
      workerMayBeReplaced = true;
      const imported = await withSaveSessionImportAuthorization(
        claim,
        () => worker.importSnapshot(snapshot),
      );
      if (!imported.success) {
        const errorMsg = 'error' in imported ? imported.error : 'Failed to load save.';
        logger.error('Save incompatible:', errorMsg);
        throw new Error(errorMsg);
      }
      await commitSaveSessionOwnership(claim, save.id);
      markActiveSaveSessionTransitionOwnershipCommitted(transition);
      candidateCommitted = true;
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
      completeActiveSaveSessionTransition(transition);
      return true;
    } catch (error) {
      if (workerMayBeReplaced) {
        const recovery = await recoverWorkerAfterCandidateImportFailure({
          importSnapshot: worker.importSnapshot,
          candidateCommitted,
          outgoingSnapshot,
          restartWorker: worker.restartWorker,
          setInitialized,
          transition,
        });
        if (recovery.kind === 'reload_required') {
          logger.error('Failed to restore the outgoing worker after a save switch:', recovery.error);
        }
      }
      throw error;
    }
  }, [initializeGame, setInitialized, worker]);

  const continueFromSafeLoad = useCallback(async (
    result: Extract<LoadSaveSafelyResult, { ok: true }>,
    target: SaveSessionTarget,
    claim: SaveSessionClaim,
    transition: ActiveSaveSessionTransition,
  ): Promise<boolean> => {
    return continueFromSave(result.save, result.snapshot, target, claim, transition);
  }, [continueFromSave]);

  const handleLoad = useCallback(async (
    slot: number,
    options: { fromRecovery?: boolean } = {},
  ): Promise<boolean> => {
    if (!workerReady) return false;
    if (!beginSaveDataOperation()) return false;
    const targetSaveId = `save-slot-${slot}`;
    setBusySlot(slot);
    setStatus('');
    let claim: SaveSessionClaim | null = null;
    let transition: ActiveSaveSessionTransition | null = null;
    const cancelAttempt = async () => {
      const pendingTransition = transition;
      const pendingClaim = claim;
      transition = null;
      claim = null;
      if (pendingTransition) {
        try {
          abortActiveSaveSessionTransition(pendingTransition);
        } catch (error) {
          logger.error('Failed to roll back an incomplete save-session transition:', error);
        }
      }
      if (pendingClaim) {
        try {
          await abortSaveSessionOwnership(pendingClaim);
        } catch (error) {
          logger.error('Failed to release incomplete save-session ownership:', error);
        }
      }
    };
    try {
      const target = await resolveSaveSessionTarget(targetSaveId);
      if (!target) {
        throw new SaveSessionOwnershipError(
          'unknown_tree',
          `MBD could not identify the root dynasty for slot ${slot}.`,
          targetSaveId,
        );
      }
      claim = await beginSaveSessionOwnership(target.rootSaveId);
      transition = await prepareActiveSaveSessionTransition(targetSaveId, {
        persistOutgoingSnapshot: (outgoingSaveId) => persistActiveSave({
          transitionSaveId: outgoingSaveId,
        }),
      });
      const result = await loadSaveSafely(slot);
      if (!result.ok) {
        await cancelAttempt();
        if (!options.fromRecovery) {
          recoveryShowFailure({
            failure: result,
            onDelete: () => handleDelete(slot),
            onRepair: async () => {
              await restoreInactiveSaveIntegrityBackup(targetSaveId);
              return true;
            },
            onRetry: () => handleLoad(slot, { fromRecovery: true }),
          });
        }
        return false;
      }
      const continued = await continueFromSafeLoad(result, target, claim, transition);
      claim = null;
      transition = null;
      if (!continued) {
        setStatus(`Failed to load slot ${slot}.`);
        return false;
      }
      setStatus(`Loaded slot ${slot}.`);
      return true;
    } catch (error) {
      await cancelAttempt();
      logger.error('Failed to load game:', error);
      setStatus(isSaveSessionOwnershipError(error)
        ? saveSessionOwnershipFailureMessage(error, `Slot ${slot}`, 'Nothing was loaded.')
        : `Failed to load slot ${slot}.`);
      return false;
    } finally {
      setBusySlot(null);
      finishSaveDataOperation();
    }
  }, [beginSaveDataOperation, continueFromSafeLoad, finishSaveDataOperation, handleDelete, persistActiveSave, recoveryShowFailure, workerReady]);

  const handleExportCurrent = useCallback(async () => {
    if (!workerReady) {
      setStatus('Start or load a dynasty before exporting.');
      return;
    }
    if (!beginSaveDataOperation()) return;

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
    } finally {
      finishSaveDataOperation();
    }
  }, [beginSaveDataOperation, day, finishSaveDataOperation, season, worker, workerReady]);

  const handleImportFile = useCallback(async (file: File | null) => {
    if (!file) {
      return;
    }
    if (!beginSaveDataOperation()) return;

    try {
      const text = await file.text();
      const imported = importSnapshotFromJson(text);
      const usedSlots = new Set(saves.map((save) => save.slotNumber));
      const slot = SAVE_SLOTS.find((candidate) => !usedSlots.has(candidate));
      if (!slot) {
        setStatus('Delete an existing save slot before importing a new dynasty.');
        return;
      }
      const targetSaveId = `save-slot-${slot}`;
      await withTransientSaveSessionOwnership(targetSaveId, () =>
        saveGame(slot, imported.name, imported.snapshot));
      await refreshSaves();
      setStatus(`Imported save into slot ${slot}.`);
    } catch (error) {
      logger.error('Failed to import save:', error);
      setStatus(isSaveSessionOwnershipError(error)
        ? saveSessionOwnershipFailureMessage(
            error,
            'the selected import slot',
            'Nothing was imported.',
          )
        : 'Failed to import save file.');
    } finally {
      finishSaveDataOperation();
    }
  }, [beginSaveDataOperation, finishSaveDataOperation, refreshSaves, saves]);

  const handleClearAllSaves = useCallback(async () => {
    if (!beginSaveDataOperation()) return;
    if (activeManagedSaveId) {
      setStatus('Cannot clear local saves while a dynasty is active.');
      finishSaveDataOperation();
      return;
    }

    if (typeof window !== 'undefined' && !window.confirm('Delete every save slot? This cannot be undone.')) {
      finishSaveDataOperation();
      return;
    }

    try {
      await withAllTransientSaveSessionOwnership(
        SAVE_SLOTS.map((slot) => `save-slot-${slot}`),
        () => clearAllSaves(),
      );
      await refreshSaves();
      setStatus('Cleared every local save slot.');
    } catch (error) {
      logger.error('Failed to clear local saves:', error);
      setStatus(isSaveSessionOwnershipError(error)
        ? saveSessionOwnershipFailureMessage(
            error,
            'the local save slots',
            'No save slot was cleared.',
          )
        : 'Failed to clear local save slots.');
    } finally {
      finishSaveDataOperation();
    }
  }, [activeManagedSaveId, beginSaveDataOperation, finishSaveDataOperation, refreshSaves]);

  const handleCreateBranch = useCallback(async () => {
    if (!workerReady || !activeRootSaveId) {
      return;
    }
    const description = branchDescription.trim();
    if (!description) {
      setStatus('Name the what-if branch before creating it.');
      return;
    }
    if (!beginSaveDataOperation()) return;

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
      setStatus(isSaveSessionOwnershipError(error)
        ? saveSessionOwnershipFailureMessage(
            error,
            'this dynasty',
            'No what-if branch was created.',
          )
        : 'Failed to create a what-if branch.');
    } finally {
      setBranchBusy(false);
      finishSaveDataOperation();
    }
  }, [activeRootSaveId, beginSaveDataOperation, branchDescription, finishSaveDataOperation, refreshBranches, worker, workerReady]);

  const handleDeleteBranch = useCallback(async (branchSaveId: string) => {
    if (activeManagedSaveId === branchSaveId) {
      setStatus('Cannot delete the active what-if branch.');
      return;
    }
    if (!activeRootSaveId) {
      return;
    }
    if (!beginSaveDataOperation()) return;

    setBranchBusy(true);
    setStatus('');
    try {
      let deletionOutcome: DeleteSaveByIdResult['outcome'] = 'not_found';
      await trackActiveSavePersistenceOperation(activeRootSaveId, async () => {
        const result = await retireActiveSavePersistenceForDelete(
          branchSaveId,
          () => deleteSaveByIdWithResult(branchSaveId),
        );
        deletionOutcome = result.outcome;
        return result.parent;
      });
      await refreshBranches();
      const completedOutcome = deletionOutcome as DeleteSaveByIdResult['outcome'];
      if (completedOutcome === 'deleted_exact_parent_untouched') {
        setStatus(
          'Deleted the branch record. Its root save was left unchanged because the branch history could not be updated safely; recover that root before continuing.',
        );
      } else if (completedOutcome === 'not_found') {
        setStatus('The selected what-if branch was already absent.');
      } else {
        setStatus('Deleted the selected what-if branch.');
      }
    } catch (error) {
      logger.error('Failed to delete branch:', error);
      setStatus(isSaveSessionOwnershipError(error)
        ? saveSessionOwnershipFailureMessage(
            error,
            'this dynasty',
            'No what-if branch was deleted.',
          )
        : 'Failed to delete the selected what-if branch.');
    } finally {
      setBranchBusy(false);
      finishSaveDataOperation();
    }
  }, [activeManagedSaveId, activeRootSaveId, beginSaveDataOperation, finishSaveDataOperation, refreshBranches]);

  return {
    activeManagedSaveId,
    activeRootSaveId,
    branchBusy,
    branchDescription,
    branches,
    busySlot,
    operationBusy,
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
