import { PageShell } from '@/shared/components/PageShell';
import { humanizeLabel } from '@/shared/lib/labels';
import SettingsAboutPanel from './SettingsAboutPanel';
import SettingsDiagnosticsPanel from './SettingsDiagnosticsPanel';
import SettingsGuidanceReplayPanel from './SettingsGuidanceReplayPanel';
import { SettingsPreferencesPanel, type SettingsPreferenceSectionKey } from './SettingsPreferencesPanel';
import { SettingsSaveDataPanel } from './SettingsSaveDataPanel';
import SettingsSection from './SettingsSection';
import type { useSettingsDiagnosticsData } from '../hooks/useSettingsDiagnosticsData';
import type { useSettingsGuidanceReplay } from '../hooks/useSettingsGuidanceReplay';
import type { useSettingsInstallPrompt } from '../hooks/useSettingsInstallPrompt';
import type { useSettingsPreferenceControls } from '../hooks/useSettingsPreferenceControls';
import type { useSettingsSaveData } from '../hooks/useSettingsSaveData';

const WHAT_IF_BRANCH_LIMIT = 3;

export type SettingsSectionKey = SettingsPreferenceSectionKey | 'data' | 'guidance' | 'diagnostics' | 'about';

interface SettingsPageContentProps {
  activeSaveId: string | null | undefined;
  diagnosticsData: ReturnType<typeof useSettingsDiagnosticsData>;
  guidanceReplay: ReturnType<typeof useSettingsGuidanceReplay>;
  installPrompt: ReturnType<typeof useSettingsInstallPrompt>;
  openSections: Record<SettingsSectionKey, boolean>;
  preferences: ReturnType<typeof useSettingsPreferenceControls>;
  saveData: ReturnType<typeof useSettingsSaveData>;
  session: {
    day: number;
    phase: string;
    season: number;
    userTeamId: string;
  };
  workerReady: boolean;
  onToggleSection: (section: SettingsSectionKey) => void;
}

export default function SettingsPageContent({
  activeSaveId,
  diagnosticsData,
  guidanceReplay,
  installPrompt,
  openSections,
  preferences,
  saveData,
  session,
  workerReady,
  onToggleSection,
}: SettingsPageContentProps) {
  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
            Settings
          </h1>
          <p className="mt-1 font-heading text-sm text-dynasty-muted">
            Configure game preferences, simulation speed, display options, and manage save data.
          </p>
        </div>

        {saveData.status && (
          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface px-4 py-3 font-heading text-sm text-accent-info">
            {saveData.status}
          </div>
        )}

        <SettingsPreferencesPanel
          ambientVolumePercent={preferences.ambientVolumePercent}
          autoAdvance={preferences.autoAdvance}
          defaultStatView={preferences.defaultStatView}
          effectVolumePercent={preferences.effectVolumePercent}
          highContrast={preferences.highContrast}
          muted={preferences.muted}
          openSections={{
            accessibility: openSections.accessibility,
            audio: openSections.audio,
            display: openSections.display,
            simulation: openSections.simulation,
          }}
          reducedMotion={preferences.reducedMotion}
          simSpeed={preferences.simSpeed}
          tableDensity={preferences.tableDensity}
          volumePercent={preferences.volumePercent}
          onAmbientVolumeChange={preferences.handleAmbientVolumeChange}
          onAutoAdvanceToggle={preferences.handleAutoAdvanceToggle}
          onDefaultStatViewChange={preferences.handleDefaultStatViewChange}
          onEffectVolumeChange={preferences.handleEffectVolumeChange}
          onHighContrastToggle={preferences.handleHighContrastToggle}
          onMuteToggle={preferences.handleMuteToggle}
          onReducedMotionToggle={preferences.handleReducedMotionToggle}
          onSimSpeedChange={preferences.handleSimSpeedChange}
          onTableDensityChange={preferences.handleTableDensityChange}
          onToggleSection={onToggleSection}
          onVolumeChange={preferences.handleVolumeChange}
        />

        <SettingsSection
          title="Guidance Replay"
          description="Replay Assistant route help, guided-start nudges, tutorial help, and quickstart entry points."
          open={openSections.guidance}
          onToggle={() => onToggleSection('guidance')}
        >
          <SettingsGuidanceReplayPanel
            activeSaveLabel={guidanceReplay.activeSaveLabel}
            guidanceStatus={guidanceReplay.guidanceStatus}
            onReplayAssistantGuidance={guidanceReplay.handleReplayAssistantGuidance}
            onReplayGuidedStartNudges={guidanceReplay.handleReplayGuidedStartNudges}
          />
        </SettingsSection>

        <SettingsSection
          title="Data / Install"
          description={`Current session: Season ${session.season}, Day ${session.day}, ${humanizeLabel(session.phase)} as ${session.userTeamId.toUpperCase()}.`}
          open={openSections.data}
          onToggle={() => onToggleSection('data')}
        >
          <SettingsSaveDataPanel
            activeRootSaveId={saveData.activeRootSaveId}
            activeSaveId={activeSaveId}
            branchBusy={saveData.branchBusy}
            branchDescription={saveData.branchDescription}
            branches={saveData.branches}
            busySlot={saveData.busySlot}
            installed={installPrompt.installed}
            operationBusy={saveData.operationBusy}
            saveSlots={saveData.saveSlots}
            saves={saveData.saves}
            whatIfBranchLimit={WHAT_IF_BRANCH_LIMIT}
            workerReady={workerReady}
            onBranchDescriptionChange={saveData.setBranchDescription}
            onClearAllSaves={saveData.handleClearAllSaves}
            onCreateBranch={saveData.handleCreateBranch}
            onDeleteBranch={saveData.handleDeleteBranch}
            onDeleteSlot={saveData.handleDelete}
            onExportCurrent={saveData.handleExportCurrent}
            onImportFile={saveData.handleImportFile}
            onInstallApp={installPrompt.handleInstallApp}
            onLoadSlot={saveData.handleLoad}
            onRefreshSaves={saveData.refreshSaves}
            onSaveSlot={saveData.handleSave}
          />
        </SettingsSection>

        <SettingsSection
          title="Diagnostics"
          description="Runtime and save-footprint diagnostics for the active dynasty snapshot."
          open={openSections.diagnostics}
          onToggle={() => onToggleSection('diagnostics')}
        >
          <SettingsDiagnosticsPanel
            activeManagedSaveId={saveData.activeManagedSaveId}
            diagnostics={diagnosticsData.diagnostics}
            diagnosticsBusy={diagnosticsData.diagnosticsBusy}
            onArchiveOldSeasons={diagnosticsData.handleArchiveOldSeasons}
            onPruneStaleData={diagnosticsData.handlePruneStaleData}
          />
        </SettingsSection>

        <SettingsSection
          title="About"
          description="Build and engine context for the current local client."
          open={openSections.about}
          onToggle={() => onToggleSection('about')}
        >
          <SettingsAboutPanel />
        </SettingsSection>
      </div>
    </PageShell>
  );
}
