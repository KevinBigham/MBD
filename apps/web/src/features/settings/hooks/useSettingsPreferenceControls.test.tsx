import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  AUDIO_PREFERENCES_DEFAULTS,
  useAudioPreferencesStore,
} from '@/shared/hooks/useAudioPreferencesStore';
import { usePreferencesStore } from '@/shared/hooks/usePreferencesStore';
import { getAudioEngine, resetAudioEngineForTest } from '@/shared/lib/audio';
import { useSettingsPreferenceControls } from './useSettingsPreferenceControls';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookResult = ReturnType<typeof useSettingsPreferenceControls>;

function HookHarness({ onRender }: { onRender: (result: HookResult) => void }) {
  onRender(useSettingsPreferenceControls());
  return null;
}

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

describe('useSettingsPreferenceControls', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;

  beforeEach(() => {
    resetAudioEngineForTest();
    const storage = createStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });
    useAudioPreferencesStore.getState().reset();
    usePreferencesStore.getState().reset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    resetAudioEngineForTest();
  });

  async function renderHook() {
    await act(async () => {
      root.render(<HookHarness onRender={(result) => {
        latestResult = result;
      }} />);
    });
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  it('projects persisted audio and display preferences into panel-ready values', async () => {
    useAudioPreferencesStore.setState({
      volume: 0.42,
      effectVolume: 0.33,
      ambientVolume: 0.27,
      muted: false,
    });
    usePreferencesStore.setState({
      simSpeed: 'detailed',
      autoAdvance: true,
      defaultStatView: 'traditional',
      tableDensity: 'compact',
      reducedMotion: true,
      highContrast: true,
    });

    await renderHook();

    expect(latestResult).toMatchObject({
      ambientVolumePercent: 27,
      autoAdvance: true,
      defaultStatView: 'traditional',
      effectVolumePercent: 33,
      highContrast: true,
      muted: false,
      reducedMotion: true,
      simSpeed: 'detailed',
      tableDensity: 'compact',
      volumePercent: 42,
    });
  });

  it('updates audio store and engine state from audio control handlers', async () => {
    await renderHook();

    await act(async () => {
      latestResult?.handleMuteToggle();
    });

    expect(useAudioPreferencesStore.getState().muted).toBe(false);
    expect(getAudioEngine().isMuted()).toBe(false);
    expect(getAudioEngine().getVolume()).toBe(AUDIO_PREFERENCES_DEFAULTS.volume);

    await act(async () => {
      latestResult?.handleVolumeChange(0.41);
      latestResult?.handleEffectVolumeChange(0.63);
      latestResult?.handleAmbientVolumeChange(0.27);
    });

    expect(useAudioPreferencesStore.getState()).toMatchObject({
      ambientVolume: 0.27,
      effectVolume: 0.63,
      volume: 0.41,
    });
    expect(getAudioEngine().getVolume()).toBe(0.41);
    expect(getAudioEngine().getEffectVolume()).toBe(0.63);
    expect(getAudioEngine().getAmbientVolume()).toBe(0.27);
  });

  it('updates simulation, display, and accessibility preferences from control handlers', async () => {
    await renderHook();

    await act(async () => {
      latestResult?.handleAutoAdvanceToggle();
      latestResult?.handleReducedMotionToggle();
      latestResult?.handleHighContrastToggle();
      latestResult?.handleSimSpeedChange('normal');
      latestResult?.handleDefaultStatViewChange('traditional');
      latestResult?.handleTableDensityChange('compact');
    });

    expect(usePreferencesStore.getState()).toMatchObject({
      autoAdvance: true,
      defaultStatView: 'traditional',
      highContrast: true,
      reducedMotion: true,
      simSpeed: 'normal',
      tableDensity: 'compact',
    });
  });
});
