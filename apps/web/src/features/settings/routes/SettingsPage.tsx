import { useEffect, useState } from 'react';
import { Save, Trash2, Upload, Volume2, VolumeX } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useAudioPreferencesStore } from '@/shared/hooks/useAudioPreferencesStore';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { getAudioEngine } from '@/shared/lib/audio';
import {
  SAVE_SLOTS,
  deleteSave,
  listSaves,
  loadGame,
  saveGame,
  type SaveData,
} from '@/shared/lib/saveSystem';

export default function SettingsPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { season, day, phase, userTeamId, initializeGame } = useGameStore();
  const muted = useAudioPreferencesStore((state) => state.muted);
  const volume = useAudioPreferencesStore((state) => state.volume);
  const setMuted = useAudioPreferencesStore((state) => state.setMuted);
  const setVolume = useAudioPreferencesStore((state) => state.setVolume);
  const [saves, setSaves] = useState<SaveData[]>([]);
  const [status, setStatus] = useState<string>('');
  const [busySlot, setBusySlot] = useState<number | null>(null);

  async function refreshSaves() {
    setSaves(await listSaves());
  }

  useEffect(() => {
    void refreshSaves();
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
      const save = await loadGame(slot);
      if (!save) {
        setStatus(`Slot ${slot} is empty.`);
        return;
      }
      if (!save.snapshot) {
        setStatus(`Slot ${slot} is legacy metadata only and cannot be resumed.`);
        return;
      }
      const result = await worker.importSnapshot(save.snapshot);
      initializeGame({
        season: result.season,
        day: result.day,
        phase: result.phase,
        playerCount: result.playerCount,
        userTeamId: result.userTeamId,
        teamName: result.teamName,
        gmName: result.gmName,
        difficulty: result.difficulty,
        activeSaveSlot: slot,
      });
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
      await refreshSaves();
      setStatus(`Deleted slot ${slot}.`);
    } catch (error) {
      console.error('Failed to delete save:', error);
      setStatus(`Failed to delete slot ${slot}.`);
    } finally {
      setBusySlot(null);
    }
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

  const saveMap = new Map(saves.map((save) => [save.slotNumber, save]));
  const volumePercent = Math.round(volume * 100);

  return (
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        </div>
      </div>

      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-dynasty-textBright">
              Save Management
            </h2>
            <p className="mt-1 font-heading text-sm text-dynasty-muted">
              Current session: Season {season}, Day {day}, {phase.toUpperCase()} as {userTeamId.toUpperCase()}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshSaves()}
            className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated"
          >
            Refresh
          </button>
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
                    onClick={() => void handleSave(slot)}
                    className="inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </button>
                  <button
                    type="button"
                    disabled={disabled || !save?.snapshot || !workerReady}
                    onClick={() => void handleLoad(slot)}
                    className="inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Load
                  </button>
                  <button
                    type="button"
                    disabled={disabled || !save}
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
  );
}
