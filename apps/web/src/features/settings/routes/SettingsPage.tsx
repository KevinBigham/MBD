import { useEffect, useRef, useState } from 'react';
import { Download, Monitor, Save, Trash2, Upload, Volume2, VolumeX } from 'lucide-react';
import { PageShell } from '@/shared/components/PageShell';
import { useWorker } from '@/shared/hooks/useWorker';
import { useAudioPreferencesStore } from '@/shared/hooks/useAudioPreferencesStore';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { usePreferencesStore } from '@/shared/hooks/usePreferencesStore';
import { SaveRecoveryDialog } from '@/shared/components/SaveRecoveryDialog';
import { getAudioEngine } from '@/shared/lib/audio';
import {
  SAVE_SLOTS,
  clearAllSaves,
  deleteSave,
  exportSnapshotToJson,
  importSnapshotFromJson,
  listSaves,
  loadGameSafe,
  repairSave,
  saveGame,
  type SaveData,
  type SaveInspectionResult,
} from '@/shared/lib/saveSystem';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function SettingsPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { season, day, phase, userTeamId, initializeGame } = useGameStore();
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
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [recoveryState, setRecoveryState] = useState<{
    slot: number;
    message: string;
  } | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  async function refreshSaves() {
    setSaves(await listSaves());
  }

  useEffect(() => {
    void refreshSaves();
  }, []);

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
      console.error('Failed to save game:', error);
      setStatus(`Failed to save slot ${slot}.`);
    } finally {
      setBusySlot(null);
    }
  }

  async function handleLoad(slot: number) {
    if (!workerReady) return;
    setBusySlot(slot);
    setStatus('');
    try {
      const result = await loadGameSafe(slot);
      if (result.status !== 'ok') {
        setRecoveryState({
          slot,
          message: result.status === 'empty'
            ? `Slot ${slot} is empty.`
            : result.message,
        });
        return;
      }
      await continueFromInspection(result);
      setStatus(`Loaded slot ${slot}.`);
    } catch (error) {
      console.error('Failed to load game:', error);
      setStatus(`Failed to load slot ${slot}.`);
    } finally {
      setBusySlot(null);
    }
  }

  async function handleDelete(slot: number) {
    setBusySlot(slot);
    setStatus('');
    try {
      await deleteSave(slot);
      setRecoveryState((current) => (current?.slot === slot ? null : current));
      await refreshSaves();
      setStatus(`Deleted slot ${slot}.`);
    } catch (error) {
      console.error('Failed to delete save:', error);
      setStatus(`Failed to delete slot ${slot}.`);
    } finally {
      setBusySlot(null);
    }
  }

  async function continueFromInspection(result: Extract<SaveInspectionResult, { status: 'ok' }>) {
    const imported = await worker.importSnapshot(result.save.snapshot);
    initializeGame({
      season: imported.season,
      day: imported.day,
      phase: imported.phase,
      playerCount: imported.playerCount,
      userTeamId: imported.userTeamId,
      teamName: imported.teamName,
      gmName: imported.gmName,
      difficulty: imported.difficulty,
      activeSaveId: result.save.id,
      activeSaveSlot: result.save.slotNumber,
    });
  }

  async function handleRepair(slot: number) {
    setBusySlot(slot);
    setStatus('');
    try {
      const repaired = await repairSave(slot);
      if (repaired.status !== 'ok') {
        setStatus(`Unable to repair slot ${slot}.`);
        return;
      }

      setRecoveryState(null);
      await refreshSaves();
      await continueFromInspection(repaired);
      setStatus(`Repaired and loaded slot ${slot}.`);
    } catch (error) {
      console.error('Failed to repair save:', error);
      setStatus(`Failed to repair slot ${slot}.`);
    } finally {
      setBusySlot(null);
    }
  }

  async function handleStartFresh(slot: number) {
    await handleDelete(slot);
    setRecoveryState(null);
    setStatus(`Slot ${slot} is ready for a new dynasty.`);
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
      console.error('Failed to export snapshot:', error);
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
      console.error('Failed to import save:', error);
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

  const saveMap = new Map(saves.map((save) => [save.slotNumber, save]));
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
          Configure game preferences, simulation speed, display options, and
          manage save data.
        </p>
      </div>

      {status && (
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface px-4 py-3 font-heading text-sm text-accent-info">
          {status}
        </div>
      )}

      {recoveryState ? (
        <SaveRecoveryDialog
          slot={recoveryState.slot}
          message={recoveryState.message}
          busy={busySlot === recoveryState.slot}
          onRepair={() => void handleRepair(recoveryState.slot)}
          onStartFresh={() => void handleStartFresh(recoveryState.slot)}
          onDelete={() => void handleDelete(recoveryState.slot)}
          onClose={() => setRecoveryState(null)}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="mb-3 font-heading text-lg font-semibold text-dynasty-textBright">
                Audio
              </h2>
              <p className="font-heading text-sm text-dynasty-muted">
                Procedural effects and ambient beds. Audio starts muted until you opt in.
              </p>
            </div>
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
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-6">
          <h2 className="mb-3 font-heading text-lg font-semibold text-dynasty-textBright">
            Simulation
          </h2>
          <p className="font-heading text-sm text-dynasty-muted">
            Pace the calendar flow and decide how much intervention the sim takes between checkpoints.
          </p>
          <div className="mt-6 space-y-4">
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
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-6">
          <h2 className="mb-3 font-heading text-lg font-semibold text-dynasty-textBright">
            Display
          </h2>
          <p className="font-heading text-sm text-dynasty-muted">
            Information density, stat display preferences, and notification
            settings.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
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
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-6">
          <h2 className="mb-3 font-heading text-lg font-semibold text-dynasty-textBright">
            Accessibility
          </h2>
          <p className="font-heading text-sm text-dynasty-muted">
            Reduce motion, raise contrast, and keep the app readable in longer sessions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
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
        </div>
      </div>

      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-dynasty-textBright">
              Data / Install
            </h2>
            <p className="mt-1 font-heading text-sm text-dynasty-muted">
              Current session: Season {season}, Day {day}, {phase.toUpperCase()} as {userTeamId.toUpperCase()}.
            </p>
          </div>
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
        </div>
        <input
          ref={importInputRef}
          className="sr-only"
          onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)}
          type="file"
          accept="application/json"
        />

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
                        S{save.season} D{save.day} | {save.phase.toUpperCase()} | Updated {new Date(save.updatedAt).toLocaleString()}
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
      </div>

      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-6">
        <h2 className="mb-3 font-heading text-lg font-semibold text-dynasty-textBright">
          About
        </h2>
        <div className="space-y-1">
          <p className="font-heading text-sm text-dynasty-muted">
            Mr. Baseball Dynasty v0.0.1
          </p>
          <p className="font-data text-xs text-dynasty-muted">
            Built with TypeScript, React, Vite, Web Workers, and deterministic pure-rand simulation.
          </p>
        </div>
      </div>
      </div>
    </PageShell>
  );
}
