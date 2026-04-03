import { create } from 'zustand';

export const AUDIO_PREFERENCES_STORAGE_KEY = 'mbd-audio-preferences';
export const AUDIO_PREFERENCES_DEFAULTS = {
  volume: 0.65,
  effectVolume: 0.85,
  ambientVolume: 0.55,
  muted: true,
} as const;

interface AudioPreferencesRecord {
  volume: number;
  effectVolume: number;
  ambientVolume: number;
  muted: boolean;
}

interface AudioPreferencesState extends AudioPreferencesRecord {
  setVolume: (volume: number) => void;
  setEffectVolume: (volume: number) => void;
  setAmbientVolume: (volume: number) => void;
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
      effectVolume: clampVolume(parsed.effectVolume ?? AUDIO_PREFERENCES_DEFAULTS.effectVolume),
      ambientVolume: clampVolume(parsed.ambientVolume ?? AUDIO_PREFERENCES_DEFAULTS.ambientVolume),
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
      effectVolume: get().effectVolume,
      ambientVolume: get().ambientVolume,
      muted: get().muted,
    };
    persistAudioPreferences(next);
    set({ volume: next.volume });
  },
  setEffectVolume: (volume) => {
    const next = {
      volume: get().volume,
      effectVolume: clampVolume(volume),
      ambientVolume: get().ambientVolume,
      muted: get().muted,
    };
    persistAudioPreferences(next);
    set({ effectVolume: next.effectVolume });
  },
  setAmbientVolume: (volume) => {
    const next = {
      volume: get().volume,
      effectVolume: get().effectVolume,
      ambientVolume: clampVolume(volume),
      muted: get().muted,
    };
    persistAudioPreferences(next);
    set({ ambientVolume: next.ambientVolume });
  },
  setMuted: (muted) => {
    const next = {
      volume: get().volume,
      effectVolume: get().effectVolume,
      ambientVolume: get().ambientVolume,
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
