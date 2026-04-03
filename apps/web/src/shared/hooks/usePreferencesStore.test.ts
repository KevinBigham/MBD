import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PREFERENCES_DEFAULTS,
  PREFERENCES_STORAGE_KEY,
  usePreferencesStore,
} from './usePreferencesStore';

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

describe('usePreferencesStore', () => {
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
    usePreferencesStore.getState().reset();
  });

  afterEach(() => {
    usePreferencesStore.getState().reset();
  });

  it('starts from the Phase 10 defaults', () => {
    expect(usePreferencesStore.getState()).toMatchObject(PREFERENCES_DEFAULTS);
  });

  it('persists updated preferences to localStorage', () => {
    usePreferencesStore.getState().setSimSpeed('detailed');
    usePreferencesStore.getState().setHighContrast(true);
    usePreferencesStore.getState().setReducedMotion(true);

    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? '{}')).toMatchObject({
      simSpeed: 'detailed',
      highContrast: true,
      reducedMotion: true,
    });
  });
});
