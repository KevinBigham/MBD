import { useCallback, useRef, useState } from 'react';
import type { GameSnapshot } from '@mbd/contracts';
import { registerGuidedStartSave } from '@/features/onboarding/nudges';
import type { ShowSaveRecoveryOptions } from '@/features/save-recovery';
import type { GameState } from '@/shared/hooks/useGameStore';
import { logger } from '@/shared/lib/logger';
import { isSimAdvanceCoordinatorBusy } from '@/shared/hooks/useSimAdvanceExecutor';
import {
  activateActiveSavePersistenceMetadata,
  abortActiveSaveSessionTransition,
  completeActiveSaveSessionTransition,
  markActiveSaveSessionTransitionOwnershipCommitted,
  prepareActiveSaveSessionTransition,
  replaceInactiveSavePersistenceRecord,
  restoreInactiveSaveIntegrityBackup,
  retireSaveTreePersistenceForDelete,
  type ActiveSaveSessionTransition,
} from '@/shared/lib/activeSavePersistence';
import {
  deleteSave,
  deleteSaveById,
  loadSaveSafely,
  resolveSaveSessionTarget,
  saveGame,
  type LoadSaveSafelyResult,
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
  withSaveSessionImportAuthorization,
  withSaveSessionNewGameAuthorization,
  withSaveSessionCandidateSnapshotExportAuthorization,
  withTransientSaveSessionOwnership,
  type SaveSessionClaim,
} from '@/shared/lib/saveSessionOwnership';
import {
  captureOutgoingSaveSessionSnapshot,
  recoverWorkerAfterCandidateImportFailure,
} from '@/shared/lib/saveSessionTransitionRecovery';
import type { NewGameOptions } from '@/workers/sim.worker.setup';
import type {
  ScenarioCatalogEntry,
  SetupDayOneExperience,
  SetupDifficulty,
  SetupPlayMode,
  SetupWizardMode,
} from '../components/SetupDynastyWizardPanel';
import { generateDefaultGMName } from './useSetupWizardControls';

type ImportedSnapshotResult =
  | {
    success: false;
    error?: string;
  }
  | {
    success: true;
    season: number;
    day: number;
    phase: string;
    playerCount: number;
    userTeamId: string;
    teamName: string;
    gmName: string;
    difficulty: SetupDifficulty;
  };

interface NewGameResult {
  season: number;
  day: number;
  phase: string;
  playerCount: number;
  userTeamId: string;
  teamName: string;
  gmName: string;
  difficulty: SetupDifficulty;
}

export interface UseSetupActionHandlersOptions {
  activeSaveId: string | null;
  activeSaveSlot: number | null;
  dayOneExperience: SetupDayOneExperience;
  difficulty: SetupDifficulty;
  exportSnapshot: () => Promise<GameSnapshot | object>;
  gmName: string;
  importSnapshot: (snapshot: object | null) => Promise<ImportedSnapshotResult>;
  initializeGame: GameState['initializeGame'];
  setInitialized: GameState['setInitialized'];
  navigate: (path: string) => void;
  newGame: (options: NewGameOptions) => Promise<NewGameResult>;
  playMode: SetupPlayMode;
  persistActiveSave: (options?: {
    transitionSaveId?: string;
  }) => Promise<{ saved: boolean; saveName: string | null }>;
  recovery: {
    showFailure: (options: ShowSaveRecoveryOptions) => unknown;
  };
  refreshSaves: () => Promise<void>;
  restartWorker: () => Promise<void>;
  seed: number;
  selectedScenario: ScenarioCatalogEntry | null;
  selectedScenarioId: string | null;
  selectedSlot: number;
  setStatus: (status: string) => void;
  teamId: string;
  wizardMode: SetupWizardMode;
  workerIsReady: boolean;
}

export interface UseSetupActionHandlersResult {
  busySlot: number | null;
  handleBeginDynasty: () => Promise<void>;
  handleContinueSave: (save: SaveData) => Promise<boolean>;
  handleDelete: (slot: number) => Promise<boolean>;
}

export function useSetupActionHandlers({
  activeSaveId,
  activeSaveSlot,
  dayOneExperience,
  difficulty,
  exportSnapshot,
  gmName,
  importSnapshot,
  initializeGame,
  setInitialized,
  navigate,
  newGame,
  playMode,
  persistActiveSave,
  recovery,
  refreshSaves,
  restartWorker,
  seed,
  selectedScenario,
  selectedScenarioId,
  selectedSlot,
  setStatus,
  teamId,
  wizardMode,
  workerIsReady,
}: UseSetupActionHandlersOptions): UseSetupActionHandlersResult {
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const operationInFlightRef = useRef(false);

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
        exportSnapshot,
      );
      workerMayBeReplaced = true;
      const imported = await withSaveSessionImportAuthorization(
        claim,
        () => importSnapshot(snapshot),
      );
      if (!imported.success) {
        const msg = imported.error ?? 'Incompatible save.';
        throw new Error(typeof msg === 'string'
          ? msg
          : 'This save is from an older version and is no longer compatible. Please start a new dynasty.');
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
      navigate('/dashboard');
      return true;
    } catch (error) {
      if (workerMayBeReplaced) {
        const recoveryResult = await recoverWorkerAfterCandidateImportFailure({
          importSnapshot,
          candidateCommitted,
          outgoingSnapshot,
          restartWorker,
          setInitialized,
          transition,
        });
        if (recoveryResult.kind === 'reload_required') {
          logger.error(
            'Failed to restore the outgoing worker after a save switch:',
            recoveryResult.error,
          );
        }
      }
      throw error;
    }
  }, [exportSnapshot, importSnapshot, initializeGame, navigate, restartWorker, setInitialized]);

  const continueFromSafeLoad = useCallback(async (
    result: Extract<LoadSaveSafelyResult, { ok: true }>,
    target: SaveSessionTarget,
    claim: SaveSessionClaim,
    transition: ActiveSaveSessionTransition,
  ): Promise<boolean> => {
    return continueFromSave(result.save, result.snapshot, target, claim, transition);
  }, [continueFromSave]);

  const handleDelete = useCallback(async (slot: number) => {
    if (isSimAdvanceCoordinatorBusy()) {
      setStatus('Finish the current simulation save activity before changing saves.');
      return false;
    }
    if (operationInFlightRef.current) {
      setStatus('Finish the current save operation before deleting a dynasty.');
      return false;
    }
    const targetSaveId = `save-slot-${slot}`;
    const deletingActiveRoot = activeSaveId === targetSaveId;
    const activeBranchParentIsUnknown = activeSaveId != null && activeSaveSlot == null;
    if (deletingActiveRoot || activeBranchParentIsUnknown) {
      setStatus(`Cannot delete slot ${slot} while its dynasty or a what-if branch is active.`);
      return false;
    }

    operationInFlightRef.current = true;
    setBusySlot(slot);
    setStatus('');
    try {
      await withTransientSaveSessionOwnership(targetSaveId, () =>
        retireSaveTreePersistenceForDelete(targetSaveId, () => deleteSave(slot)));
      await refreshSaves();
      return true;
    } catch (error) {
      logger.error('Failed to delete save:', error);
      setStatus(isSaveSessionOwnershipError(error)
        ? saveSessionOwnershipFailureMessage(error, `Slot ${slot}`, 'Nothing was deleted.')
        : `Failed to delete slot ${slot}.`);
      return false;
    } finally {
      setBusySlot(null);
      operationInFlightRef.current = false;
    }
  }, [activeSaveId, activeSaveSlot, refreshSaves, setStatus]);

  const handleContinueSave = useCallback(async (
    save: SaveData,
    options: { fromRecovery?: boolean } = {},
  ): Promise<boolean> => {
    if (isSimAdvanceCoordinatorBusy()) {
      setStatus('Finish the current simulation save activity before changing saves.');
      return false;
    }
    if (!workerIsReady) {
      return false;
    }
    if (operationInFlightRef.current) {
      setStatus('Finish the current save operation before opening another dynasty.');
      return false;
    }
    operationInFlightRef.current = true;
    setBusySlot(save.slotNumber ?? 0);
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
      const target = await resolveSaveSessionTarget(save.id);
      if (!target) {
        throw new SaveSessionOwnershipError(
          'unknown_tree',
          'MBD could not identify the root dynasty for this save or branch.',
          null,
        );
      }
      claim = await beginSaveSessionOwnership(target.rootSaveId);
      transition = await prepareActiveSaveSessionTransition(save.id, {
        persistOutgoingSnapshot: (outgoingSaveId) => persistActiveSave({
          transitionSaveId: outgoingSaveId,
        }),
      });
      const result = await loadSaveSafely(save.id);
      if (!result.ok) {
        await cancelAttempt();
        if (!options.fromRecovery) {
          recovery.showFailure({
            failure: result,
            onDelete: async () => {
              const deletingActiveSave = activeSaveId === save.id;
              const deletingRootWithUnknownActiveBranch = /^save-slot-\d+$/.test(save.id)
                && activeSaveId != null
                && activeSaveSlot == null;
              if (deletingActiveSave || deletingRootWithUnknownActiveBranch) {
                setStatus(`Cannot delete ${save.name} while its dynasty or a what-if branch is active.`);
                return false;
              }
              await retireSaveTreePersistenceForDelete(
                save.id,
                () => deleteSaveById(save.id),
              );
              await refreshSaves();
              return true;
            },
            onRepair: async () => {
              await restoreInactiveSaveIntegrityBackup(save.id);
              return true;
            },
            onRetry: () => handleContinueSave(save, { fromRecovery: true }),
          });
        }
        return false;
      }

      const continued = await continueFromSafeLoad(result, target, claim, transition);
      claim = null;
      transition = null;
      return continued;
    } catch (error) {
      await cancelAttempt();
      logger.error('Failed to continue save:', error);
      setStatus(isSaveSessionOwnershipError(error)
        ? saveSessionOwnershipFailureMessage(
            error,
            save.slotNumber != null ? `Slot ${save.slotNumber}` : `Branch "${save.name}"`,
            'Nothing was loaded.',
          )
        : save.slotNumber != null
          ? `Failed to load slot ${save.slotNumber}.`
          : `Failed to load branch "${save.name}".`);
      return false;
    } finally {
      setBusySlot(null);
      operationInFlightRef.current = false;
    }
  }, [
    activeSaveId,
    activeSaveSlot,
    continueFromSafeLoad,
    handleDelete,
    recovery,
    persistActiveSave,
    refreshSaves,
    setStatus,
    workerIsReady,
  ]);

  const handleBeginDynasty = useCallback(async () => {
    if (isSimAdvanceCoordinatorBusy()) {
      setStatus('Finish the current simulation save activity before starting a new dynasty.');
      return;
    }
    if (!workerIsReady) {
      return;
    }
    if (operationInFlightRef.current) {
      setStatus('Finish the current save operation before starting a dynasty.');
      return;
    }
    if (activeSaveId) {
      setStatus('Finish or reload the active dynasty before starting a new one.');
      return;
    }

    operationInFlightRef.current = true;
    const finalGmName = gmName.trim() || generateDefaultGMName(seed);
    const targetSaveId = `save-slot-${selectedSlot}`;
    setBusySlot(selectedSlot);
    setStatus('');
    let claim: SaveSessionClaim | null = null;
    let transition: ActiveSaveSessionTransition | null = null;
    let workerMayBeMutated = false;
    let candidateCommitted = false;
    const cancelAttempt = async () => {
      const pendingTransition = transition;
      const pendingClaim = claim;
      transition = null;
      claim = null;
      if (pendingTransition) {
        try {
          abortActiveSaveSessionTransition(pendingTransition);
        } catch (cleanupError) {
          logger.error('Failed to roll back an incomplete save-session transition:', cleanupError);
        }
      }
      if (pendingClaim) {
        try {
          await abortSaveSessionOwnership(pendingClaim);
        } catch (cleanupError) {
          logger.error('Failed to release incomplete save-session ownership:', cleanupError);
        }
      }
    };
    try {
      claim = await beginSaveSessionOwnership(targetSaveId);
      transition = await prepareActiveSaveSessionTransition(targetSaveId, {
        persistOutgoingSnapshot: (outgoingSaveId) => persistActiveSave({
          transitionSaveId: outgoingSaveId,
        }),
      });
      workerMayBeMutated = true;
      const result = await withSaveSessionNewGameAuthorization(claim, () => newGame({
        seed,
        userTeamId: wizardMode === 'scenario'
          ? (selectedScenario?.startingTeamId ?? teamId)
          : teamId,
        gmName: finalGmName,
        difficulty,
        saveSlot: selectedSlot,
        playMode: wizardMode === 'scenario'
          ? (selectedScenario?.requiresCareerMode ? 'career' : 'standard')
          : playMode,
        scenarioId: wizardMode === 'scenario' ? (selectedScenarioId ?? undefined) : undefined,
        dayOneExperience: wizardMode === 'dynasty' ? dayOneExperience : undefined,
      }));
      const snapshot = await withSaveSessionCandidateSnapshotExportAuthorization(
        claim,
        null,
        exportSnapshot,
      );
      const savedRecord = await replaceInactiveSavePersistenceRecord(
        targetSaveId,
        () => saveGame(
          selectedSlot,
          `${finalGmName} • ${result.teamName}`,
          snapshot,
          { replaceExistingRootBranchMetadata: true },
        ),
      );
      await commitSaveSessionOwnership(claim, savedRecord.id);
      markActiveSaveSessionTransitionOwnershipCommitted(transition);
      candidateCommitted = true;
      claim = null;
      activateActiveSavePersistenceMetadata(savedRecord);
      initializeGame({
        season: result.season,
        day: result.day,
        phase: result.phase,
        playerCount: result.playerCount,
        userTeamId: result.userTeamId,
        teamName: result.teamName,
        gmName: result.gmName,
        difficulty: result.difficulty,
        activeSaveId: targetSaveId,
        activeSaveSlot: selectedSlot,
      });
      completeActiveSaveSessionTransition(transition);
      transition = null;
      workerMayBeMutated = false;
      try {
        registerGuidedStartSave(targetSaveId);
      } catch (nudgeError) {
        logger.error('Failed to register guided-start nudges:', nudgeError);
      }
      navigate(wizardMode === 'scenario' ? '/dashboard' : '/onboarding');
    } catch (error) {
      if (workerMayBeMutated) {
        if (transition) {
          const recoveryResult = await recoverWorkerAfterCandidateImportFailure({
            candidateCommitted,
            importSnapshot,
            outgoingSnapshot: null,
            restartWorker,
            setInitialized,
            transition,
          });
          if (recoveryResult.kind === 'reload_required') {
            logger.error(
              'Failed to finish new-dynasty activation; a verified reload is required:',
              recoveryResult.error,
            );
          }
        } else {
          try {
            await restartWorker();
          } catch (resetError) {
            logger.error('Failed to discard an incomplete new-dynasty worker:', resetError);
          }
        }
      }
      await cancelAttempt();
      logger.error('Failed to create dynasty:', error);
      setStatus(isSaveSessionOwnershipError(error)
        ? saveSessionOwnershipFailureMessage(
            error,
            `Slot ${selectedSlot}`,
            'The new dynasty was not started.',
          )
        : 'Failed to create the new dynasty.');
    } finally {
      setBusySlot(null);
      operationInFlightRef.current = false;
    }
  }, [
    dayOneExperience,
    activeSaveId,
    difficulty,
    exportSnapshot,
    gmName,
    initializeGame,
    navigate,
    newGame,
    playMode,
    persistActiveSave,
    restartWorker,
    seed,
    selectedScenario,
    selectedScenarioId,
    selectedSlot,
    setStatus,
    teamId,
    wizardMode,
    workerIsReady,
  ]);

  return {
    busySlot,
    handleBeginDynasty,
    handleContinueSave,
    handleDelete,
  };
}
