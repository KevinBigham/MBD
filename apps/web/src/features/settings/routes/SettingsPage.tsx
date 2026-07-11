import { useState } from 'react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import { useSaveRecovery } from '@/features/save-recovery';
import SettingsPageContent, { type SettingsSectionKey } from '../components/SettingsPageContent';
import { useSettingsDiagnosticsData } from '../hooks/useSettingsDiagnosticsData';
import { useSettingsGuidanceReplay } from '../hooks/useSettingsGuidanceReplay';
import { useSettingsInstallPrompt } from '../hooks/useSettingsInstallPrompt';
import { useSettingsPreferenceControls } from '../hooks/useSettingsPreferenceControls';
import { useSettingsSaveData } from '../hooks/useSettingsSaveData';

const DEFAULT_OPEN_SECTIONS: Record<SettingsSectionKey, boolean> = {
  audio: true,
  simulation: true,
  display: true,
  accessibility: true,
  data: true,
  guidance: true,
  diagnostics: true,
  about: true,
};

export default function SettingsPage() {
  const worker = useWorker();
  const persistActiveSave = useActiveSaveAutosave();
  const recovery = useSaveRecovery();
  const workerReady = worker.isReady;
  const {
    season,
    day,
    phase,
    userTeamId,
    initializeGame,
    setInitialized,
    activeSaveId,
    activeSaveSlot,
  } = useGameStore();
  const preferences = useSettingsPreferenceControls();
  const [openSections, setOpenSections] = useState<Record<SettingsSectionKey, boolean>>(DEFAULT_OPEN_SECTIONS);
  const saveData = useSettingsSaveData({
    activeSaveId,
    activeSaveSlot,
    day,
    initializeGame,
    setInitialized,
    persistActiveSave,
    recoveryShowFailure: recovery.showFailure,
    season,
    worker,
  });
  const diagnosticsData = useSettingsDiagnosticsData({
    activeManagedSaveId: saveData.activeManagedSaveId,
    archiveOldSeasons: typeof worker.archiveOldSeasons === 'function' ? worker.archiveOldSeasons : undefined,
    getPerformanceDiagnostics: typeof worker.getPerformanceDiagnostics === 'function' ? worker.getPerformanceDiagnostics : undefined,
    onStatusChange: saveData.setStatus,
    persistActiveSave,
    pruneStaleData: typeof worker.pruneStaleData === 'function' ? worker.pruneStaleData : undefined,
    workerReady,
  });
  const installPrompt = useSettingsInstallPrompt({
    onStatusChange: saveData.setStatus,
  });
  const guidanceReplay = useSettingsGuidanceReplay({
    activeSaveId,
    activeSaveSlot,
  });

  function toggleSection(section: SettingsSectionKey) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  return (
    <SettingsPageContent
      activeSaveId={activeSaveId}
      diagnosticsData={diagnosticsData}
      guidanceReplay={guidanceReplay}
      installPrompt={installPrompt}
      openSections={openSections}
      preferences={preferences}
      saveData={saveData}
      session={{ day, phase, season, userTeamId }}
      workerReady={workerReady}
      onToggleSection={toggleSection}
    />
  );
}
