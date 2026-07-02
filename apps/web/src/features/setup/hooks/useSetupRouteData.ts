import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { logger } from '@/shared/lib/logger';
import { SAVE_SLOTS, type SaveTreeEntry } from '@/shared/lib/saveSystem';
import type {
  ScenarioCatalogEntry,
  SetupDifficulty,
  SetupWizardMode,
} from '../components/SetupDynastyWizardPanel';
import type { SetupPreview, SetupTeamOption } from '../components/SetupTeamPickerPanel';

interface SetupPreviewOptions {
  seed: number;
  userTeamId: string;
  difficulty: SetupDifficulty;
}

interface UseSetupRouteDataOptions {
  difficulty: SetupDifficulty;
  getScenarioCatalog?: () => Promise<unknown>;
  getSetupPreview: (options: SetupPreviewOptions) => Promise<unknown>;
  isWorkerReady: boolean;
  listSaveTree: () => Promise<SaveTreeEntry[]>;
  seed: number;
  teamId: string;
  teamOptions: readonly SetupTeamOption[];
  wizardMode: SetupWizardMode;
  wizardOpen: boolean;
}

interface UseSetupRouteDataResult {
  activePreview: SetupPreview | null;
  previewMap: Record<string, SetupPreview>;
  refreshSaves: () => Promise<void>;
  saveTree: SaveTreeEntry[];
  scenarioCatalog: ScenarioCatalogEntry[];
  selectedScenario: ScenarioCatalogEntry | null;
  selectedScenarioId: string | null;
  selectedSlot: number;
  setPreviewMap: Dispatch<SetStateAction<Record<string, SetupPreview>>>;
  setSelectedScenarioId: Dispatch<SetStateAction<string | null>>;
  setSelectedSlot: Dispatch<SetStateAction<number>>;
  setStatus: Dispatch<SetStateAction<string>>;
  status: string;
}

export function useSetupRouteData({
  difficulty,
  getScenarioCatalog,
  getSetupPreview,
  isWorkerReady,
  listSaveTree,
  seed,
  teamId,
  teamOptions,
  wizardMode,
  wizardOpen,
}: UseSetupRouteDataOptions): UseSetupRouteDataResult {
  const [saveTree, setSaveTree] = useState<SaveTreeEntry[]>([]);
  const [status, setStatus] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<number>(2);
  const [previewMap, setPreviewMap] = useState<Record<string, SetupPreview>>({});
  const [scenarioCatalog, setScenarioCatalog] = useState<ScenarioCatalogEntry[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const selectedScenario = useMemo(
    () => scenarioCatalog.find((entry) => entry.id === selectedScenarioId) ?? null,
    [scenarioCatalog, selectedScenarioId],
  );
  const preview = previewMap[teamId] ?? null;
  const activePreview = wizardMode === 'scenario'
    ? (previewMap[selectedScenario?.startingTeamId ?? teamId] ?? null)
    : preview;

  const refreshSaves = useCallback(async () => {
    const nextSaveTree = await listSaveTree();
    setSaveTree(nextSaveTree);
    const taken = new Set(nextSaveTree.map((entry) => entry.save.slotNumber));
    const firstEmpty = SAVE_SLOTS.find((slot) => !taken.has(slot)) ?? SAVE_SLOTS[0];
    setSelectedSlot(firstEmpty);
  }, [listSaveTree]);

  useEffect(() => {
    void refreshSaves();
  }, [refreshSaves]);

  useEffect(() => {
    if (!wizardOpen || !isWorkerReady || typeof getScenarioCatalog !== 'function') {
      return;
    }

    void getScenarioCatalog().then((catalog) => {
      const nextCatalog = (catalog ?? []) as ScenarioCatalogEntry[];
      setScenarioCatalog(nextCatalog);
      setSelectedScenarioId((current) => current ?? nextCatalog[0]?.id ?? null);
    }).catch((error) => {
      logger.error('Failed to load scenario catalog:', error);
    });
  }, [getScenarioCatalog, isWorkerReady, wizardOpen]);

  useEffect(() => {
    if (!wizardOpen || !isWorkerReady || typeof getScenarioCatalog !== 'function') {
      return;
    }

    if (wizardMode === 'scenario') {
      if (scenarioCatalog.length === 0 || !selectedScenario) {
        return;
      }

      const previewTeamId = selectedScenario.startingTeamId ?? teamId;
      void getSetupPreview({
        seed,
        userTeamId: previewTeamId,
        difficulty,
      }).then((nextPreview) => {
        setPreviewMap((current) => ({
          ...current,
          [previewTeamId]: nextPreview as SetupPreview,
        }));
      }).catch((error) => {
        logger.error('Failed to build scenario preview:', error);
        setStatus('Failed to build the scenario preview.');
      });
      return;
    }

    void Promise.all(
      teamOptions.map(async (entry) => {
        const teamPreview = await getSetupPreview({
          seed,
          userTeamId: entry.id,
          difficulty,
        });
        return [entry.id, teamPreview as SetupPreview] as const;
      }),
    ).then((entries) => {
      setPreviewMap(Object.fromEntries(entries));
    }).catch((error) => {
      logger.error('Failed to build dynasty previews:', error);
      setStatus('Failed to build the dynasty previews.');
    });
  }, [
    difficulty,
    getScenarioCatalog,
    getSetupPreview,
    isWorkerReady,
    scenarioCatalog.length,
    seed,
    selectedScenario,
    teamId,
    teamOptions,
    wizardMode,
    wizardOpen,
  ]);

  return {
    activePreview,
    previewMap,
    refreshSaves,
    saveTree,
    scenarioCatalog,
    selectedScenario,
    selectedScenarioId,
    selectedSlot,
    setPreviewMap,
    setSelectedScenarioId,
    setSelectedSlot,
    setStatus,
    status,
  };
}
