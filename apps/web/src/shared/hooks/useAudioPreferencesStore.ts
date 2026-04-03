import { create } from 'zustand';

export const AUDIO_PREFERENCES_STORAGE_KEY = 'mbd-audio-preferences';
export const AUDIO_PREFERENCES_DEFAULTS = {
  volume: 0.65,
  muted: true,
} as const;

interface AudioPreferencesRecord {
  volume: number;
  muted: boolean;
}

interface AudioPreferencesState extends AudioPreferencesRecord {
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  hydrate: () => void;
  reset: () => void;
}

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return AUDIO_PREFERENCES_DEFAULTS.volume;
  }
  return Math.max(0, Math.min(1, Number(volume.toFixed(2))));
}

function readPersistedAudioPreferences(): AudioPreferencesRecord {
  if (typeof window === 'undefined') {
    return { ...AUDIO_PREFERENCES_DEFAULTS };
  }

  try {
    const raw = window.localStorage.getItem(AUDIO_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return { ...AUDIO_PREFERENCES_DEFAULTS };
    }

    const parsed = JSON.parse(raw) as Partial<AudioPreferencesRecord>;
    return {
      volume: clampVolume(parsed.volume ?? AUDIO_PREFERENCES_DEFAULTS.volume),
      muted: typeof parsed.muted === 'boolean'
        ? parsed.muted
        : AUDIO_PREFERENCES_DEFAULTS.muted,
    };
  } catch {
    return { ...AUDIO_PREFERENCES_DEFAULTS };
  }
}

function persistAudioPreferences(preferences: AudioPreferencesRecord) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    AUDIO_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences),
  );
}

export const useAudioPreferencesStore = create<AudioPreferencesState>((set, get) => ({
  ...readPersistedAudioPreferences(),
  setVolume: (volume) => {
    const next = {
      volume: clampVolume(volume),
      muted: get().muted,
    };
    persistAudioPreferences(next);
    set({ volume: next.volume });
  },
  setMuted: (muted) => {
    const next = {
      volume: get().volume,
      muted,
    };
    persistAudioPreferences(next);
    set({ muted });
  },
  hydrate: () => {
    set(readPersistedAudioPreferences());
  },
  reset: () => {
    persistAudioPreferences(AUDIO_PREFERENCES_DEFAULTS);
    set({ ...AUDIO_PREFERENCES_DEFAULTS });
  },
}));
