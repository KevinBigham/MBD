import { useEffect, useRef } from 'react';
import { useSimAdvanceCoordinatorStatus } from '@/shared/hooks/useSimAdvanceExecutor';
import type { GameSnapshot } from '@mbd/contracts';
import type { ShowSaveRecoveryOptions } from '@/features/save-recovery';
import type { GameState } from '@/shared/hooks/useGameStore';
import {
  listSaveTree as listSaveTreeFromStorage,
  type SaveTreeEntry,
} from '@/shared/lib/saveSystem';
import type { NewGameOptions } from '@/workers/sim.worker.setup';
import type { SetupPageContentProps } from '../components/SetupPageContent';
import type {
  ScenarioCatalogEntry,
  SetupDifficulty,
} from '../components/SetupDynastyWizardPanel';
import type { SetupPreview, SetupTeamOption } from '../components/SetupTeamPickerPanel';
import { useSetupActionHandlers } from './useSetupActionHandlers';
import { useSetupRouteData } from './useSetupRouteData';
import { useSetupWizardControls } from './useSetupWizardControls';

export const SETUP_TEAM_OPTIONS = [
  { id: 'atl', label: 'Atlanta Peach Kings' },
  { id: 'aus', label: 'Austin Bat Colony' },
  { id: 'bal', label: 'Baltimore Crab Cakes' },
  { id: 'bos', label: 'Boston Noreasters' },
  { id: 'cha', label: 'Charlotte Weavers' },
  { id: 'chi', label: 'Chicago Deep Dish' },
  { id: 'cle', label: 'Cleveland Forge' },
  { id: 'col', label: 'Columbus Wayfinders' },
  { id: 'dal', label: 'Dallas Lone Stars' },
  { id: 'den', label: 'Denver Altitude' },
  { id: 'det', label: 'Detroit Motor Kings' },
  { id: 'hou', label: 'Houston Starliners' },
  { id: 'ind', label: 'Indianapolis Speedsters' },
  { id: 'kc',  label: 'Kansas City BBQ Fountains' },
  { id: 'lax', label: 'Los Angeles Sunset Strip' },
  { id: 'mia', label: 'Miami Palms' },
  { id: 'mil', label: 'Milwaukee Suds' },
  { id: 'msp', label: 'Minneapolis Frost Giants' },
  { id: 'nas', label: 'Nashville Honky Tonks' },
  { id: 'nym', label: 'New York Tycoons' },
  { id: 'orl', label: 'Orlando Sunbursts' },
  { id: 'phi', label: 'Philadelphia Liberty Bells' },
  { id: 'phx', label: 'Phoenix Copperbirds' },
  { id: 'pit', label: 'Pittsburgh Smokestack' },
  { id: 'por', label: 'Portland Sasquatch' },
  { id: 'ral', label: 'Raleigh Pines' },
  { id: 'sat', label: 'San Antonio Riverwalk' },
  { id: 'sdg', label: 'San Diego Surf Hounds' },
  { id: 'sea', label: 'Seattle Drizzle' },
  { id: 'sfb', label: 'San Francisco Sourdoughs' },
  { id: 'stl', label: 'St. Louis Archers' },
  { id: 'wsh', label: 'Washington Monuments' },
] as const satisfies readonly SetupTeamOption[];

const WHAT_IF_BRANCH_LIMIT = 3;

interface SetupPreviewOptions {
  seed: number;
  userTeamId: string;
  difficulty: SetupDifficulty;
}

interface SetupPageWorker {
  exportSnapshot: () => Promise<GameSnapshot | object>;
  getScenarioCatalog?: () => Promise<unknown>;
  getSetupPreview: (options: SetupPreviewOptions) => Promise<unknown>;
  importSnapshot: (snapshot: object | null) => Promise<{
    success: false;
    error?: string;
  } | {
    success: true;
    season: number;
    day: number;
    phase: string;
    playerCount: number;
    userTeamId: string;
    teamName: string;
    gmName: string;
    difficulty: SetupDifficulty;
  }>;
  isReady: boolean;
  newGame: (options: NewGameOptions) => Promise<{
    season: number;
    day: number;
    phase: string;
    playerCount: number;
    userTeamId: string;
    teamName: string;
    gmName: string;
    difficulty: SetupDifficulty;
  }>;
  restartWorker: () => Promise<void>;
  workerStatus: string;
}

export interface UseSetupPageControllerOptions {
  activeSaveId: string | null;
  activeSaveSlot: number | null;
  branchLimit?: number;
  initializeGame: GameState['initializeGame'];
  setInitialized: GameState['setInitialized'];
  isInitialized: boolean;
  listSaveTree?: () => Promise<SaveTreeEntry[]>;
  navigate: (path: string) => void;
  persistActiveSave: (options?: {
    transitionSaveId?: string;
  }) => Promise<{ saved: boolean; saveName: string | null }>;
  recovery: {
    showFailure: (options: ShowSaveRecoveryOptions) => unknown;
  };
  teamOptions?: readonly SetupTeamOption[];
  worker: SetupPageWorker;
}

interface UseSetupPageControllerResult {
  contentProps: SetupPageContentProps;
}

export function useSetupPageController({
  activeSaveId,
  activeSaveSlot,
  branchLimit = WHAT_IF_BRANCH_LIMIT,
  initializeGame,
  setInitialized,
  isInitialized,
  listSaveTree = listSaveTreeFromStorage,
  navigate,
  persistActiveSave,
  recovery,
  teamOptions = SETUP_TEAM_OPTIONS,
  worker,
}: UseSetupPageControllerOptions): UseSetupPageControllerResult {
  const simAdvanceStatus = useSimAdvanceCoordinatorStatus();
  const mutationBlocked = simAdvanceStatus.kind !== 'idle';
  const wizardRef = useRef<HTMLElement | null>(null);
  const setupRouteCallbacksRef = useRef({
    resetPreviewMap: () => {},
    setStatus: (_status: string) => {},
  });
  const {
    dayOneExperience,
    difficulty,
    gmName,
    openWizard,
    playMode,
    seed,
    setDayOneExperience,
    setDifficulty,
    setGmName,
    setPlayMode,
    setTeamId,
    setWizardMode,
    setWizardOpen,
    teamId,
    teamPickerFilters,
    updateTeamPickerFilter,
    wizardMode,
    wizardOpen,
  } = useSetupWizardControls({
    onResetPreviewMap: () => setupRouteCallbacksRef.current.resetPreviewMap(),
    onStatusChange: (status) => setupRouteCallbacksRef.current.setStatus(status),
  });
  const {
    activePreview,
    previewMap,
    refreshSaves,
    saveTree,
    storageEstimate,
    originEstimate,
    scenarioCatalog,
    selectedScenario,
    selectedScenarioId,
    selectedSlot,
    setPreviewMap,
    setSelectedScenarioId,
    setSelectedSlot,
    setStatus,
    status,
  } = useSetupRouteData({
    difficulty,
    getScenarioCatalog: worker.getScenarioCatalog,
    getSetupPreview: worker.getSetupPreview,
    isWorkerReady: worker.isReady,
    listSaveTree,
    seed,
    teamId,
    teamOptions,
    wizardMode,
    wizardOpen,
  });
  setupRouteCallbacksRef.current.resetPreviewMap = () => setPreviewMap({});
  setupRouteCallbacksRef.current.setStatus = setStatus;

  const {
    busySlot,
    handleBeginDynasty,
    handleContinueSave,
    handleDelete,
  } = useSetupActionHandlers({
    activeSaveId,
    activeSaveSlot,
    dayOneExperience,
    difficulty,
    exportSnapshot: worker.exportSnapshot,
    gmName,
    importSnapshot: worker.importSnapshot,
    initializeGame,
    setInitialized,
    navigate,
    newGame: worker.newGame,
    playMode,
    persistActiveSave,
    recovery,
    refreshSaves,
    restartWorker: worker.restartWorker,
    seed,
    selectedScenario: selectedScenario as ScenarioCatalogEntry | null,
    selectedScenarioId,
    selectedSlot,
    setStatus,
    teamId,
    wizardMode,
    workerIsReady: worker.isReady,
  });

  useEffect(() => {
    if (!wizardOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const targetTop = Math.max(0, (wizardRef.current?.offsetTop ?? 0) - 16);
      const scrollingElement = document.scrollingElement;
      if (scrollingElement && typeof scrollingElement.scrollTo === 'function') {
        scrollingElement.scrollTo({ top: targetTop, behavior: 'auto' });
      } else if (scrollingElement) {
        scrollingElement.scrollTop = targetTop;
      }
      if (typeof wizardRef.current?.scrollIntoView === 'function') {
        wizardRef.current.scrollIntoView({
          block: 'start',
          behavior: 'auto',
        });
      }
      wizardRef.current?.focus({ preventScroll: true });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [wizardOpen]);

  return {
    contentProps: {
      isInitialized,
      onOpenWizard: () => {
        if (!mutationBlocked) openWizard();
      },
      saveHubPanelProps: {
        saveTree,
        storageEstimate,
        originEstimate,
        selectedSlot,
        busySlot,
        branchLimit,
        mutationBlocked,
        onRefresh: () => void refreshSaves(),
        onUseSlot: (slot) => {
          if (mutationBlocked) return;
          setSelectedSlot(slot);
          openWizard();
        },
        onContinueSave: (save) => {
          if (!mutationBlocked) void handleContinueSave(save);
        },
        onDeleteSlot: (slot) => {
          if (!mutationBlocked) void handleDelete(slot);
        },
      },
      status: mutationBlocked
        ? 'Simulation save activity is still settling. Save-tree changes are paused; read-only refresh remains available.'
        : status,
      wizardOpen,
      wizardPanelProps: {
        busySlot,
        mutationBlocked,
        dayOneExperience,
        difficulty,
        filters: teamPickerFilters,
        gmName,
        onBack: () => setWizardOpen(false),
        onBeginDynasty: () => {
          if (!mutationBlocked) void handleBeginDynasty();
        },
        onChangeDayOneExperience: setDayOneExperience,
        onChangeDifficulty: setDifficulty,
        onChangeFilter: updateTeamPickerFilter,
        onChangeGmName: setGmName,
        onChangePlayMode: setPlayMode,
        onChangeWizardMode: setWizardMode,
        onSelectScenario: setSelectedScenarioId,
        onSelectTeam: setTeamId,
        playMode,
        previewMap: previewMap as Record<string, SetupPreview>,
        scenarioCatalog,
        selectedScenario,
        selectedScenarioId,
        selectedSlot,
        selectedTeamId: teamId,
        teamOptions,
        wizardMode,
        workerIsReady: worker.isReady,
        workerStatus: worker.workerStatus,
      },
      wizardPreviewPanelProps: {
        wizardMode,
        activePreview,
        selectedScenario,
        teamId,
      },
      wizardSectionRef: wizardRef,
    },
  };
}
