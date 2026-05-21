import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Download, Monitor, Save, Trash2, Upload, Volume2, VolumeX } from 'lucide-react';
import { PageShell } from '@/shared/components/PageShell';
import { useWorker } from '@/shared/hooks/useWorker';
import { useAudioPreferencesStore } from '@/shared/hooks/useAudioPreferencesStore';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { usePreferencesStore } from '@/shared/hooks/usePreferencesStore';
import { useTour } from '@/shared/components/TourProvider';
import { useSaveRecovery } from '@/features/save-recovery';
import { getAudioEngine } from '@/shared/lib/audio';
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
  type SaveData,
  type LoadSaveSafelyResult,
} from '@/shared/lib/saveSystem';
import { humanizeLabel } from '@/shared/lib/labels';
import type { PerformanceDiagnosticsView } from '@/workers/sim.worker.diagnostics';

const WHAT_IF_BRANCH_LIMIT = 3;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type SettingsSectionKey = 'audio' | 'simulation' | 'display' | 'accessibility' | 'data' | 'diagnostics' | 'about';

const DEFAULT_OPEN_SECTIONS: Record<SettingsSectionKey, boolean> = {
  audio: true,
  simulation: true,
  display: true,
  accessibility: true,
  data: true,
  diagnostics: true,
  about: true,
};

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  if (bytes >= 1000) {
    return `${(bytes / 1000).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function formatRuntime(value: number | null): string {
  return value == null ? 'Not measured yet' : `${value.toFixed(1)} ms`;
}

function SettingsSection(props: {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-dynasty-border bg-dynasty-surface ${props.className ?? ''}`}>
      <button
        type="button"
        onClick={props.onToggle}
        aria-expanded={props.open}
        className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left"
      >
        <div>
          <h2 className="font-heading text-lg font-semibold text-dynasty-textBright">
            {props.title}
          </h2>
          <p className="mt-2 font-heading text-sm text-dynasty-muted">
            {props.description}
          </p>
        </div>
        {props.open ? (
          <ChevronDown className="mt-1 h-4 w-4 text-dynasty-muted" />
        ) : (
          <ChevronRight className="mt-1 h-4 w-4 text-dynasty-muted" />
        )}
      </button>
      {props.open ? (
        <div className="border-t border-dynasty-border px-6 py-5">
          {props.children}
        </div>
      ) : null}
    </section>
  );
}

function TutorialRestartButton() {
  const { restartTour, completed } = useTour();
  return (
    <button
      type="button"
      onClick={restartTour}
      className="focus-ring rounded border border-dynasty-border px-3 py-1.5 font-heading text-xs text-dynasty-text transition-colors hover:bg-dynasty-elevated"
    >
      {completed ? 'Replay Tutorial Tour' : 'Start Tutorial Tour'}
    </button>
  );
}

export default function SettingsPage() {
  const worker = useWorker();
  const recovery = useSaveRecovery();
  const workerReady = worker.isReady;
  const { season, day, phase, userTeamId, initializeGame, activeSaveId, activeSaveSlot } = useGameStore();
  const muted = useAudioPreferencesStore((state) => state.muted);
  const volume = useAudioPreferencesStore((state) => state.volume);
  const effectVolume = useAudioPreferencesStore((state) => state.effectVolume);
  const ambientVolume = useAudioPreferencesStore((state) => state.ambientVolume);
  const setMuted = useAudioPreferencesStore((state) => state.setMuted);
  const setVolume = useAudioPreferencesStore((state) => state.setVolume);
  const setEffectVolume = useAudioPreferencesStore((state) => state.setEffectVolume);
  const setAmbientVolume = useAudioPreferencesStore((state) => state.setAmbientVolume);
  const simSpeed = usePreferencesStore((state) => state.simSpeed);
  const autoAdvance = usePreferencesStore((state) => state.autoAdvance);
  const defaultStatView = usePreferencesStore((state) => state.defaultStatView);
  const tableDensity = usePreferencesStore((state) => state.tableDensity);
  const reducedMotion = usePreferencesStore((state) => state.reducedMotion);
  const highContrast = usePreferencesStore((state) => state.highContrast);
  const setSimSpeed = usePreferencesStore((state) => state.setSimSpeed);
  const setAutoAdvance = usePreferencesStore((state) => state.setAutoAdvance);
  const setDefaultStatView = usePreferencesStore((state) => state.setDefaultStatView);
  const setTableDensity = usePreferencesStore((state) => state.setTableDensity);
  const setReducedMotion = usePreferencesStore((state) => state.setReducedMotion);
  const setHighContrast = usePreferencesStore((state) => state.setHighContrast);
  const [saves, setSaves] = useState<SaveData[]>([]);
  const [status, setStatus] = useState<string>('');
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [branchBusy, setBranchBusy] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [branchDescription, setBranchDescription] = useState('');
  const [branches, setBranches] = useState<SaveData[]>([]);
  const [diagnostics, setDiagnostics] = useState<PerformanceDiagnosticsView | null>(null);
  const [diagnosticsBusy, setDiagnosticsBusy] = useState<'archive' | 'prune' | null>(null);
  const [openSections, setOpenSections] = useState<Record<SettingsSectionKey, boolean>>(DEFAULT_OPEN_SECTIONS);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const activeRootSaveId = activeSaveSlot != null ? `save-slot-${activeSaveSlot}` : null;
  const activeManagedSaveId = activeSaveId ?? activeRootSaveId;

  async function refreshSaves() {
    setSaves(await listSaves());
  }

  async function refreshBranches() {
    if (!workerReady || !activeRootSaveId || typeof worker.getBranches !== 'function') {
      setBranches([]);
      return;
    }

    setBranches(await worker.getBranches(activeRootSaveId) as SaveData[]);
  }

  async function refreshDiagnostics() {
    if (!workerReady || typeof worker.getPerformanceDiagnostics !== 'function') {
      setDiagnostics(null);
      return;
    }

    setDiagnostics(await worker.getPerformanceDiagnostics() as PerformanceDiagnosticsView | null);
  }

  useEffect(() => {
    void refreshSaves();
    void refreshBranches();
    void refreshDiagnostics();
  }, [activeRootSaveId, activeManagedSaveId, workerReady]);

  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      event.preventDefault();
      setInstallPrompt(promptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function handleSave(slot: number) {
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
  }

  async function handleLoad(slot: number): Promise<boolean> {
    if (!workerReady) return false;
    setBusySlot(slot);
    setStatus('');
    try {
      const result = await loadSaveSafely(slot);
      if (!result.ok) {
        recovery.showFailure({
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
  }

  async function handleDelete(slot: number) {
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
  }

  async function continueFromSafeLoad(result: Extract<LoadSaveSafelyResult, { ok: true }>) {
    await continueFromSave(result.save, result.snapshot);
  }

  async function continueFromSave(save: SaveData, snapshot: object | null) {
    const imported = await worker.importSnapshot(snapshot);
    if (!imported.success) {
      const errorMsg = 'error' in imported ? (imported as { error?: string }).error : 'Failed to load save.';
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
  }

  function handleMuteToggle() {
    const nextMuted = !muted;
    const audio = getAudioEngine();
    audio.setVolume(volume);
    audio.setMuted(nextMuted);
    setMuted(nextMuted);
    if (!nextMuted) {
      audio.playEffect('modal_open');
    }
  }

  function handleVolumeChange(nextVolume: number) {
    const audio = getAudioEngine();
    audio.setVolume(nextVolume);
    setVolume(nextVolume);
    if (!muted) {
      audio.playEffect('button_click');
    }
  }

  function handleEffectVolumeChange(nextVolume: number) {
    const audio = getAudioEngine();
    audio.setEffectVolume(nextVolume);
    setEffectVolume(nextVolume);
  }

  function handleAmbientVolumeChange(nextVolume: number) {
    const audio = getAudioEngine();
    audio.setAmbientVolume(nextVolume);
    setAmbientVolume(nextVolume);
  }

  async function handleExportCurrent() {
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
  }

  async function handleImportFile(file: File | null) {
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
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  }

  async function handleInstallApp() {
    if (!installPrompt) {
      setStatus(installed ? 'The app is already installed.' : 'Install prompt not available in this browser yet.');
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setInstallPrompt(null);
      setStatus('Install prompt accepted.');
      return;
    }

    setStatus('Install prompt dismissed.');
  }

  async function handleClearAllSaves() {
    if (typeof window !== 'undefined' && !window.confirm('Delete every save slot? This cannot be undone.')) {
      return;
    }

    await clearAllSaves();
    await refreshSaves();
    setStatus('Cleared every local save slot.');
  }

  async function handleCreateBranch() {
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
  }

  async function handleDeleteBranch(branchSaveId: string) {
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
  }

  async function handleArchiveOldSeasons() {
    if (!activeManagedSaveId || typeof worker.archiveOldSeasons !== 'function') {
      return;
    }

    setDiagnosticsBusy('archive');
    setStatus('');
    try {
      const result = await worker.archiveOldSeasons(activeManagedSaveId) as {
        archivedCount: number;
        diagnostics: PerformanceDiagnosticsView;
      };
      setDiagnostics(result.diagnostics);
      setStatus(`Archived ${result.archivedCount} older seasons into the long-term archive.`);
    } catch (error) {
      logger.error('Failed to archive older seasons:', error);
      setStatus('Failed to archive older seasons.');
    } finally {
      setDiagnosticsBusy(null);
    }
  }

  async function handlePruneStaleData() {
    if (!activeManagedSaveId || typeof worker.pruneStaleData !== 'function') {
      return;
    }

    setDiagnosticsBusy('prune');
    setStatus('');
    try {
      const result = await worker.pruneStaleData(activeManagedSaveId) as {
        prunedCount: number;
        diagnostics: PerformanceDiagnosticsView;
      };
      setDiagnostics(result.diagnostics);
      setStatus(`Pruned ${result.prunedCount} stale entries from the active save.`);
    } catch (error) {
      logger.error('Failed to prune stale data:', error);
      setStatus('Failed to prune stale data.');
    } finally {
      setDiagnosticsBusy(null);
    }
  }

  function toggleSection(section: SettingsSectionKey) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  const saveMap = new Map(saves.map((save) => [save.slotNumber, save]));
  const branchLimitReached = branches.length >= WHAT_IF_BRANCH_LIMIT;
  const volumePercent = Math.round(volume * 100);
  const effectVolumePercent = Math.round(effectVolume * 100);
  const ambientVolumePercent = Math.round(ambientVolume * 100);

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

        {status && (
          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface px-4 py-3 font-heading text-sm text-accent-info">
            {status}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SettingsSection
            title="Audio"
            description="Procedural effects and ambient beds. Audio starts muted until you opt in."
            open={openSections.audio}
            onToggle={() => toggleSection('audio')}
          >
            <div className="flex items-start justify-between gap-4">
              <div />
              <button
                type="button"
                onClick={handleMuteToggle}
                aria-label={muted ? 'Enable sound effects and ambience' : 'Mute all audio'}
                className={`inline-flex items-center gap-2 rounded border px-3 py-2 font-heading text-xs uppercase tracking-wide transition-colors ${
                  muted
                    ? 'border-dynasty-border text-dynasty-text hover:bg-dynasty-elevated'
                    : 'border-accent-success/40 text-accent-success hover:bg-accent-success/10'
                }`}
              >
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                {muted ? 'Muted' : 'Sound On'}
              </button>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <label htmlFor="audio-volume" className="font-heading text-sm text-dynasty-textBright">
                  Master Volume
                </label>
                <span className="font-data text-xs text-dynasty-muted">{volumePercent}%</span>
              </div>
              <input
                id="audio-volume"
                type="range"
                min={0}
                max={100}
                step={1}
                value={volumePercent}
                onChange={(event) => handleVolumeChange(Number(event.target.value) / 100)}
                className="mt-3 w-full accent-accent-primary"
              />
              <p className="mt-3 font-heading text-xs text-dynasty-muted">
                Ambient beds stay disabled when the browser requests reduced motion.
              </p>
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="audio-effect-volume" className="font-heading text-sm text-dynasty-textBright">
                    Effects Volume
                  </label>
                  <span className="font-data text-xs text-dynasty-muted">{effectVolumePercent}%</span>
                </div>
                <input
                  id="audio-effect-volume"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={effectVolumePercent}
                  onChange={(event) => handleEffectVolumeChange(Number(event.target.value) / 100)}
                  className="mt-3 w-full accent-accent-primary"
                />
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="audio-ambient-volume" className="font-heading text-sm text-dynasty-textBright">
                    Ambient Volume
                  </label>
                  <span className="font-data text-xs text-dynasty-muted">{ambientVolumePercent}%</span>
                </div>
                <input
                  id="audio-ambient-volume"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={ambientVolumePercent}
                  onChange={(event) => handleAmbientVolumeChange(Number(event.target.value) / 100)}
                  className="mt-3 w-full accent-accent-primary"
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Simulation"
            description="Pace the calendar flow and decide how much intervention the sim takes between checkpoints."
            open={openSections.simulation}
            onToggle={() => toggleSection('simulation')}
          >
            <div className="space-y-4">
              <label className="block">
                <span className="font-heading text-sm text-dynasty-textBright">Sim Speed</span>
                <select
                  aria-label="Sim Speed"
                  className="mt-2 w-full rounded border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
                  value={simSpeed}
                  onChange={(event) => setSimSpeed(event.target.value as typeof simSpeed)}
                >
                  <option value="fast">Fast</option>
                  <option value="normal">Normal</option>
                  <option value="detailed">Detailed</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setAutoAdvance(!autoAdvance)}
                aria-pressed={autoAdvance}
                className={`rounded border px-3 py-2 font-heading text-xs uppercase tracking-wide ${autoAdvance ? 'border-accent-success/40 text-accent-success' : 'border-dynasty-border text-dynasty-text'}`}
              >
                Auto Advance {autoAdvance ? 'On' : 'Off'}
              </button>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Display"
            description="Information density, stat display preferences, and table defaults."
            open={openSections.display}
            onToggle={() => toggleSection('display')}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="font-heading text-sm text-dynasty-textBright">Default Stat View</span>
                <select
                  aria-label="Default Stat View"
                  className="mt-2 w-full rounded border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
                  value={defaultStatView}
                  onChange={(event) => setDefaultStatView(event.target.value as typeof defaultStatView)}
                >
                  <option value="sabermetric">Sabermetric</option>
                  <option value="traditional">Traditional</option>
                </select>
              </label>
              <label className="block">
                <span className="font-heading text-sm text-dynasty-textBright">Table Density</span>
                <select
                  aria-label="Table Density"
                  className="mt-2 w-full rounded border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
                  value={tableDensity}
                  onChange={(event) => setTableDensity(event.target.value as typeof tableDensity)}
                >
                  <option value="standard">Standard</option>
                  <option value="compact">Compact</option>
                </select>
              </label>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Accessibility"
            description="Reduce motion, raise contrast, and keep the app readable in longer sessions."
            open={openSections.accessibility}
            onToggle={() => toggleSection('accessibility')}
          >
            <div className="flex flex-wrap gap-3">
              <button
                aria-pressed={reducedMotion}
                type="button"
                onClick={() => setReducedMotion(!reducedMotion)}
                className={`rounded border px-3 py-2 font-heading text-xs uppercase tracking-wide ${reducedMotion ? 'border-accent-info/40 text-accent-info' : 'border-dynasty-border text-dynasty-text'}`}
              >
                Reduced Motion {reducedMotion ? 'On' : 'Off'}
              </button>
              <button
                aria-pressed={highContrast}
                type="button"
                onClick={() => setHighContrast(!highContrast)}
                className={`rounded border px-3 py-2 font-heading text-xs uppercase tracking-wide ${highContrast ? 'border-accent-warning/40 text-accent-warning' : 'border-dynasty-border text-dynasty-text'}`}
              >
                High Contrast {highContrast ? 'On' : 'Off'}
              </button>
            </div>
          </SettingsSection>
        </div>

        <SettingsSection
          title="Data / Install"
          description={`Current session: Season ${season}, Day ${day}, ${humanizeLabel(phase)} as ${userTeamId.toUpperCase()}.`}
          open={openSections.data}
          onToggle={() => toggleSection('data')}
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-label="Refresh save slot list"
              onClick={() => void refreshSaves()}
              className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated"
            >
              Refresh
            </button>
            <button
              type="button"
              aria-label="Export the current dynasty as a JSON save file"
              onClick={() => void handleExportCurrent()}
              className="inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated"
            >
              <Download className="h-3.5 w-3.5" />
              Export Current Save
            </button>
            <button
              type="button"
              aria-label="Import a dynasty save file"
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated"
            >
              <Upload className="h-3.5 w-3.5" />
              Import Save
            </button>
            <button
              type="button"
              aria-label="Clear all local save slots"
              onClick={() => void handleClearAllSaves()}
              className="inline-flex items-center gap-2 rounded border border-accent-danger/40 px-3 py-2 font-heading text-xs uppercase tracking-wide text-accent-danger hover:bg-accent-danger/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear All Saves
            </button>
            <button
              type="button"
              aria-label={installed ? 'App already installed' : 'Install the Mr. Baseball Dynasty app'}
              onClick={() => void handleInstallApp()}
              className="inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated"
            >
              <Monitor className="h-3.5 w-3.5" />
              {installed ? 'Installed' : 'Install App'}
            </button>
          </div>
          <input
            ref={importInputRef}
            className="sr-only"
            onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)}
            type="file"
            accept="application/json"
          />

          <div className="mt-6 rounded-lg border border-dynasty-border/70 bg-dynasty-base/30 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="font-heading text-sm font-semibold text-dynasty-textBright">
                  What-If Branching
                </h3>
                <p className="mt-1 font-heading text-xs text-dynasty-muted">
                  Branch the active root save before aggressive deadline moves or long sim experiments.
                </p>
              </div>
              <div className="font-data text-xs uppercase tracking-[0.18em] text-dynasty-muted">
                {branches.length}/{WHAT_IF_BRANCH_LIMIT} branches
              </div>
            </div>

            {activeRootSaveId && activeSaveId === activeRootSaveId ? (
              <>
                <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                  <input
                    value={branchDescription}
                    onChange={(event) => setBranchDescription(event.target.value)}
                    placeholder="Aggressive deadline push"
                    className="w-full rounded border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
                  />
                  <button
                    type="button"
                    disabled={branchBusy || branchLimitReached || branchDescription.trim().length === 0}
                    onClick={() => void handleCreateBranch()}
                    className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Create Branch
                  </button>
                </div>
                {branchLimitReached ? (
                  <div className="mt-3 font-heading text-xs text-accent-warning">
                    This root save is already at the 3-branch limit.
                  </div>
                ) : null}

                <div className="mt-4 space-y-2">
                  {branches.length > 0 ? branches.map((branch) => (
                    <div
                      key={branch.id}
                      className="flex flex-col gap-3 rounded border border-dynasty-border/70 bg-dynasty-surface/70 p-3 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div>
                        <div className="font-heading text-sm text-dynasty-textBright">
                          {branch.branchMeta?.description ?? branch.name}
                        </div>
                        <div className="mt-1 font-data text-xs text-dynasty-muted">
                          S{branch.season} D{branch.day} | {humanizeLabel(branch.phase)} | Updated {new Date(branch.updatedAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={branchBusy}
                        onClick={() => void handleDeleteBranch(branch.id)}
                        className="inline-flex items-center gap-2 rounded border border-accent-danger/40 px-3 py-2 font-heading text-xs uppercase tracking-wide text-accent-danger hover:bg-accent-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Branch
                      </button>
                    </div>
                  )) : (
                    <div className="font-heading text-xs text-dynasty-muted">
                      No what-if branches exist for the active root save.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-4 font-heading text-xs text-dynasty-muted">
                Load a root dynasty save to create or manage what-if branches. Branch saves can be reviewed in History, but new branches only fork from the root timeline.
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3">
            {SAVE_SLOTS.map((slot) => {
              const save = saveMap.get(slot);
              const disabled = busySlot === slot;
              return (
                <div
                  key={slot}
                  className="flex flex-col gap-3 rounded-lg border border-dynasty-border/70 bg-dynasty-base/30 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <div className="font-heading text-sm font-semibold text-dynasty-textBright">
                      Slot {slot}
                    </div>
                    {save ? (
                      <div className="mt-1 space-y-1">
                        <div className="font-heading text-sm text-dynasty-text">
                          {save.name}
                        </div>
                        <div className="font-data text-xs text-dynasty-muted">
                          S{save.season} D{save.day} | {humanizeLabel(save.phase)} | Updated {new Date(save.updatedAt).toLocaleString()}
                        </div>
                        {!save.hasSnapshot && (
                          <div className="font-heading text-xs text-accent-warning">
                            Legacy metadata only. Resume unavailable until resaved as a snapshot.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1 font-heading text-sm text-dynasty-muted">
                        Empty slot
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={disabled || !workerReady}
                      aria-label={`Save current dynasty to slot ${slot}`}
                      onClick={() => void handleSave(slot)}
                      className="inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={disabled || !save || !workerReady}
                      aria-label={`Load save slot ${slot}`}
                      onClick={() => void handleLoad(slot)}
                      className="inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Load
                    </button>
                    <button
                      type="button"
                      disabled={disabled || !save}
                      aria-label={`Delete save slot ${slot}`}
                      onClick={() => void handleDelete(slot)}
                      className="inline-flex items-center gap-2 rounded border border-accent-danger/40 px-3 py-2 font-heading text-xs uppercase tracking-wide text-accent-danger hover:bg-accent-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Diagnostics"
          description="Runtime and save-footprint diagnostics for the active dynasty snapshot."
          open={openSections.diagnostics}
          onToggle={() => toggleSection('diagnostics')}
        >
          {diagnostics ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
                  <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Runtime</div>
                  <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
                    <div>Last Sim Day: {formatRuntime(diagnostics.runtime.lastSimDayMs)}</div>
                    <div>Last Save: {formatRuntime(diagnostics.runtime.lastSaveMs)}</div>
                    <div>Last Load: {formatRuntime(diagnostics.runtime.lastLoadMs)}</div>
                  </div>
                </div>
                <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
                  <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Storage</div>
                  <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
                    <div>{formatBytes(diagnostics.totals.snapshotSizeBytes)}</div>
                    <div>{diagnostics.totals.totalSeasons} total seasons tracked</div>
                  </div>
                </div>
                <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
                  <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Archive</div>
                  <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
                    <div>{diagnostics.totals.liveArchiveSeasons} live season archives</div>
                    <div>{diagnostics.totals.archivedSeasons} archived seasons</div>
                  </div>
                </div>
                <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
                  <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Queues</div>
                  <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
                    <div>{diagnostics.queues.tickerEntries} ticker entries</div>
                    <div>{diagnostics.queues.activeWatchers} active watchers</div>
                    <div>{diagnostics.queues.resolvedWatchers} resolved watchers</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
                  <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Narrative Footprint</div>
                  <div className="mt-3 space-y-2 font-heading text-sm text-dynasty-text">
                    <div>{diagnostics.queues.newsItems} news items</div>
                    <div>{diagnostics.queues.briefingItems} briefing items</div>
                    <div>{diagnostics.queues.scoutConflicts} scout conflicts</div>
                    <div>{diagnostics.queues.staleTickerEntries} stale ticker entries</div>
                  </div>
                </div>

                <div className="rounded border border-dynasty-border/70 bg-dynasty-base/30 p-4">
                  <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Maintenance</div>
                  <p className="mt-3 font-heading text-xs text-dynasty-muted">
                    Archive older season recap detail and prune stale runtime queues without changing save schema compatibility.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!activeManagedSaveId || diagnosticsBusy != null}
                      onClick={() => void handleArchiveOldSeasons()}
                      className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Archive Older Seasons
                    </button>
                    <button
                      type="button"
                      disabled={!activeManagedSaveId || diagnosticsBusy != null}
                      onClick={() => void handlePruneStaleData()}
                      className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Prune Stale Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="font-heading text-sm text-dynasty-muted">
              Diagnostics are unavailable until the simulation worker finishes booting.
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          title="About"
          description="Build and engine context for the current local client."
          open={openSections.about}
          onToggle={() => toggleSection('about')}
        >
          <div className="space-y-3">
            <div>
              <p className="font-heading text-sm text-dynasty-muted">
                Mr. Baseball Dynasty v1.0.0
              </p>
              <p className="font-data text-xs text-dynasty-muted">
                Built with TypeScript, React, Vite, Web Workers, and deterministic pure-rand simulation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TutorialRestartButton />
            </div>
          </div>
        </SettingsSection>
      </div>
    </PageShell>
  );
}
