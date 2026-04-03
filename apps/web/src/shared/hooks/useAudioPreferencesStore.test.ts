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
      effectVolume: AUDIO_PREFERENCES_DEFAULTS.effectVolume,
      ambientVolume: AUDIO_PREFERENCES_DEFAULTS.ambientVolume,
      muted: AUDIO_PREFERENCES_DEFAULTS.muted,
    });
  });

  it('defaults to muted audio preferences', () => {
    const state = useAudioPreferencesStore.getState();

    expect(state.muted).toBe(true);
    expect(state.volume).toBe(AUDIO_PREFERENCES_DEFAULTS.volume);
    expect(state.effectVolume).toBe(AUDIO_PREFERENCES_DEFAULTS.effectVolume);
    expect(state.ambientVolume).toBe(AUDIO_PREFERENCES_DEFAULTS.ambientVolume);
  });

  it('persists master volume changes to local storage', () => {
    useAudioPreferencesStore.getState().setVolume(1.4);

    expect(useAudioPreferencesStore.getState().volume).toBe(1);
    expect(window.localStorage.getItem(AUDIO_PREFERENCES_STORAGE_KEY)).toBe(
      JSON.stringify({
        volume: 1,
        effectVolume: AUDIO_PREFERENCES_DEFAULTS.effectVolume,
        ambientVolume: AUDIO_PREFERENCES_DEFAULTS.ambientVolume,
        muted: true,
      }),
    );
  });

  it('persists effect and ambient volume changes independently', () => {
    useAudioPreferencesStore.getState().setEffectVolume(0.44);
    useAudioPreferencesStore.getState().setAmbientVolume(0.21);

    expect(useAudioPreferencesStore.getState().effectVolume).toBe(0.44);
    expect(useAudioPreferencesStore.getState().ambientVolume).toBe(0.21);
    expect(window.localStorage.getItem(AUDIO_PREFERENCES_STORAGE_KEY)).toBe(
      JSON.stringify({
        volume: AUDIO_PREFERENCES_DEFAULTS.volume,
        effectVolume: 0.44,
        ambientVolume: 0.21,
        muted: true,
      }),
    );
  });

  it('persists mute changes without disturbing the saved volume', () => {
    useAudioPreferencesStore.getState().setVolume(0.42);
    useAudioPreferencesStore.getState().setMuted(false);

    expect(useAudioPreferencesStore.getState().muted).toBe(false);
    expect(window.localStorage.getItem(AUDIO_PREFERENCES_STORAGE_KEY)).toBe(
      JSON.stringify({
        volume: 0.42,
        effectVolume: AUDIO_PREFERENCES_DEFAULTS.effectVolume,
        ambientVolume: AUDIO_PREFERENCES_DEFAULTS.ambientVolume,
        muted: false,
      }),
    );
  });

  it('hydrates the store from an existing saved preference record', () => {
    window.localStorage.setItem(
      AUDIO_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        volume: 0.33,
        effectVolume: 0.61,
        ambientVolume: 0.27,
        muted: false,
      }),
    );

    useAudioPreferencesStore.getState().hydrate();

    expect(useAudioPreferencesStore.getState().volume).toBe(0.33);
    expect(useAudioPreferencesStore.getState().effectVolume).toBe(0.61);
    expect(useAudioPreferencesStore.getState().ambientVolume).toBe(0.27);
    expect(useAudioPreferencesStore.getState().muted).toBe(false);
  });
});
