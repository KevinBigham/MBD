import { beforeEach, describe, expect, it } from 'vitest';
import {
  AUDIO_PREFERENCES_DEFAULTS,
  AUDIO_PREFERENCES_STORAGE_KEY,
  useAudioPreferencesStore,
} from './useAudioPreferencesStore';

function createStorageMock(): Storage {
  const storage = new Map<string, string>();

  return {
    get length() {
      return storage.size;
    },
    clear() {
      storage.clear();
    },
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
  };
}

describe('useAudioPreferencesStore', () => {
  beforeEach(() => {
    const storage = createStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });

    window.localStorage.clear();
    useAudioPreferencesStore.setState({
      volume: AUDIO_PREFERENCES_DEFAULTS.volume,
      muted: AUDIO_PREFERENCES_DEFAULTS.muted,
    });
  });

  it('defaults to muted audio preferences', () => {
    const state = useAudioPreferencesStore.getState();

    expect(state.muted).toBe(true);
    expect(state.volume).toBe(AUDIO_PREFERENCES_DEFAULTS.volume);
  });

  it('persists volume changes to local storage', () => {
    useAudioPreferencesStore.getState().setVolume(1.4);

    expect(useAudioPreferencesStore.getState().volume).toBe(1);
    expect(window.localStorage.getItem(AUDIO_PREFERENCES_STORAGE_KEY)).toBe(
      JSON.stringify({ volume: 1, muted: true }),
    );
  });

  it('persists mute changes without disturbing the saved volume', () => {
    useAudioPreferencesStore.getState().setVolume(0.42);
    useAudioPreferencesStore.getState().setMuted(false);

    expect(useAudioPreferencesStore.getState().muted).toBe(false);
    expect(window.localStorage.getItem(AUDIO_PREFERENCES_STORAGE_KEY)).toBe(
      JSON.stringify({ volume: 0.42, muted: false }),
    );
  });

  it('hydrates the store from an existing saved preference record', () => {
    window.localStorage.setItem(
      AUDIO_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ volume: 0.33, muted: false }),
    );

    useAudioPreferencesStore.getState().hydrate();

    expect(useAudioPreferencesStore.getState().volume).toBe(0.33);
    expect(useAudioPreferencesStore.getState().muted).toBe(false);
  });
});
