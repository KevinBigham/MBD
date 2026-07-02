import { useCallback, useState } from 'react';
import type { GameSnapshot } from '@mbd/contracts';
import { registerGuidedStartSave } from '@/features/onboarding/nudges';
import type { ShowSaveRecoveryOptions } from '@/features/save-recovery';
import type { GameState } from '@/shared/hooks/useGameStore';
import { logger } from '@/shared/lib/logger';
import {
  deleteSave,
  inspectSaveById,
  loadSaveSafely,
  saveGame,
  type LoadSaveSafelyResult,
  type SaveData,
  type SaveInspectionResult,
} from '@/shared/lib/saveSystem';
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
  dayOneExperience: SetupDayOneExperience;
  difficulty: SetupDifficulty;
  exportSnapshot: () => Promise<GameSnapshot | object>;
  gmName: string;
  importSnapshot: (snapshot: object | null) => Promise<ImportedSnapshotResult>;
  initializeGame: GameState['initializeGame'];
  navigate: (path: string) => void;
  newGame: (options: NewGameOptions) => Promise<NewGameResult>;
  playMode: SetupPlayMode;
  recovery: {
    showFailure: (options: ShowSaveRecoveryOptions) => unknown;
  };
  refreshSaves: () => Promise<void>;
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
  handleDelete: (slot: number) => Promise<void>;
}

export function useSetupActionHandlers({
  dayOneExperience,
  difficulty,
  exportSnapshot,
  gmName,
  importSnapshot,
  initializeGame,
  navigate,
  newGame,
  playMode,
  recovery,
  refreshSaves,
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

  const continueFromSave = useCallback(async (save: SaveData, snapshot: object | null) => {
    const imported = await importSnapshot(snapshot);
    if (!imported.success) {
      const msg = imported.error ?? 'Incompatible save.';
      setStatus(typeof msg === 'string' ? msg : 'This save is from an older version and is no longer compatible. Please start a new dynasty.');
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
    navigate('/dashboard');
  }, [importSnapshot, initializeGame, navigate, setStatus]);

  const continueFromInspection = useCallback(async (result: Extract<SaveInspectionResult, { status: 'ok' }>) => {
    await continueFromSave(result.save, result.save.snapshot);
  }, [continueFromSave]);

  const continueFromSafeLoad = useCallback(async (result: Extract<LoadSaveSafelyResult, { ok: true }>) => {
    await continueFromSave(result.save, result.snapshot);
  }, [continueFromSave]);

  const handleDelete = useCallback(async (slot: number) => {
    setBusySlot(slot);
    setStatus('');
    try {
      await deleteSave(slot);
      await refreshSaves();
    } catch (error) {
      logger.error('Failed to delete save:', error);
      setStatus(`Failed to delete slot ${slot}.`);
    } finally {
      setBusySlot(null);
    }
  }, [refreshSaves, setStatus]);

  const handleContinueSave = useCallback(async (save: SaveData): Promise<boolean> => {
    if (!workerIsReady) {
      return false;
    }
    setBusySlot(save.slotNumber);
    setStatus('');
    try {
      if (save.isRootSave && save.slotNumber != null) {
        const result = await loadSaveSafely(save.slotNumber);
        if (!result.ok) {
          recovery.showFailure({
            failure: result,
            onDelete: () => handleDelete(save.slotNumber!),
            onRetry: () => handleContinueSave(save),
          });
          return false;
        }

        await continueFromSafeLoad(result);
        return true;
      }

      const result = await inspectSaveById(save.id);
      if (result.status !== 'ok') {
        if (save.slotNumber == null) {
          setStatus(`Unable to load branch "${save.name}".`);
        }
        return false;
      }

      await continueFromInspection(result);
      return true;
    } catch (error) {
      logger.error('Failed to continue save:', error);
      setStatus(save.slotNumber != null ? `Failed to load slot ${save.slotNumber}.` : `Failed to load branch "${save.name}".`);
      return false;
    } finally {
      setBusySlot(null);
    }
  }, [
    continueFromInspection,
    continueFromSafeLoad,
    handleDelete,
    recovery,
    setStatus,
    workerIsReady,
  ]);

  const handleBeginDynasty = useCallback(async () => {
    if (!workerIsReady) {
      return;
    }

    const finalGmName = gmName.trim() || generateDefaultGMName(seed);
    setBusySlot(selectedSlot);
    setStatus('');
    try {
      const result = await newGame({
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
      });
      const snapshot = await exportSnapshot();
      await saveGame(selectedSlot, `${finalGmName} • ${result.teamName}`, snapshot);
      registerGuidedStartSave(`save-slot-${selectedSlot}`);
      initializeGame({
        season: result.season,
        day: result.day,
        phase: result.phase,
        playerCount: result.playerCount,
        userTeamId: result.userTeamId,
        teamName: result.teamName,
        gmName: result.gmName,
        difficulty: result.difficulty,
        activeSaveId: `save-slot-${selectedSlot}`,
        activeSaveSlot: selectedSlot,
      });
      navigate(wizardMode === 'scenario' ? '/dashboard' : '/onboarding');
    } catch (error) {
      logger.error('Failed to create dynasty:', error);
      setStatus('Failed to create the new dynasty.');
    } finally {
      setBusySlot(null);
    }
  }, [
    dayOneExperience,
    difficulty,
    exportSnapshot,
    gmName,
    initializeGame,
    navigate,
    newGame,
    playMode,
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
