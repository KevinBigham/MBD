import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { logger } from '@/shared/lib/logger';
import { getLocalStorageEstimate, SAVE_SLOTS, type LocalStorageEstimate, type SaveTreeEntry } from '@/shared/lib/saveSystem';
import { readOriginStorageEstimate, type OriginStorageEstimate } from '@/shared/lib/storagePressure';
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
  readLocalStorageEstimate?: () => Promise<LocalStorageEstimate>;
  readOriginStorageEstimate?: () => Promise<OriginStorageEstimate>;
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
  storageEstimate: LocalStorageEstimate | null;
  originEstimate: OriginStorageEstimate | null;
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

const SAVE_REFRESH_FAILURE_STATUS = 'Failed to refresh save and storage evidence. Prior values are unchanged.';

export function useSetupRouteData({
  difficulty,
  getScenarioCatalog,
  getSetupPreview,
  isWorkerReady,
  listSaveTree,
  readLocalStorageEstimate = getLocalStorageEstimate,
  readOriginStorageEstimate: readOriginEstimate = readOriginStorageEstimate,
  seed,
  teamId,
  teamOptions,
  wizardMode,
  wizardOpen,
}: UseSetupRouteDataOptions): UseSetupRouteDataResult {
  const [saveTree, setSaveTree] = useState<SaveTreeEntry[]>([]);
  const [storageEstimate, setStorageEstimate] = useState<LocalStorageEstimate | null>(null);
  const [originEstimate, setOriginEstimate] = useState<OriginStorageEstimate | null>(null);
  const [status, setStatus] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<number>(2);
  const [previewMap, setPreviewMap] = useState<Record<string, SetupPreview>>({});
  const [scenarioCatalog, setScenarioCatalog] = useState<ScenarioCatalogEntry[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const saveRefreshRequestRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      saveRefreshRequestRef.current += 1;
    };
  }, []);

  const selectedScenario = useMemo(
    () => scenarioCatalog.find((entry) => entry.id === selectedScenarioId) ?? null,
    [scenarioCatalog, selectedScenarioId],
  );
  const preview = previewMap[teamId] ?? null;
  const activePreview = wizardMode === 'scenario'
    ? (previewMap[selectedScenario?.startingTeamId ?? teamId] ?? null)
    : preview;

  const refreshSaves = useCallback(async () => {
    const request = ++saveRefreshRequestRef.current;
    try {
      const [nextSaveTree, nextStorageEstimate, nextOriginEstimate] = await Promise.all([
        listSaveTree(), readLocalStorageEstimate(), readOriginEstimate(),
      ]);
      if (!mountedRef.current || request !== saveRefreshRequestRef.current) return;
      setSaveTree(nextSaveTree);
      setStorageEstimate(nextStorageEstimate);
      setOriginEstimate(nextOriginEstimate);
      setStatus((current) => current === SAVE_REFRESH_FAILURE_STATUS ? '' : current);
      const taken = new Set(nextSaveTree.map((entry) => entry.save.slotNumber));
      const firstEmpty = SAVE_SLOTS.find((slot) => !taken.has(slot)) ?? SAVE_SLOTS[0];
      setSelectedSlot(firstEmpty);
    } catch (error) {
      if (!mountedRef.current || request !== saveRefreshRequestRef.current) return;
      logger.error('Failed to refresh save and storage evidence:', error);
      setStatus(SAVE_REFRESH_FAILURE_STATUS);
    }
  }, [listSaveTree, readLocalStorageEstimate, readOriginEstimate]);

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
  };
}
