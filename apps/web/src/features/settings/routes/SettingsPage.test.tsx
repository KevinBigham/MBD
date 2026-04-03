import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import SettingsPage from './SettingsPage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import {
  AUDIO_PREFERENCES_DEFAULTS,
  useAudioPreferencesStore,
} from '@/shared/hooks/useAudioPreferencesStore';
import { resetAudioEngineForTest } from '@/shared/lib/audio';
import { listSaves } from '@/shared/lib/saveSystem';

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('@/shared/lib/saveSystem', () => ({
  SAVE_SLOTS: [1, 2, 3, 4, 5],
  deleteSave: vi.fn(),
  listSaves: vi.fn(),
  loadGame: vi.fn(),
  saveGame: vi.fn(),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);
const mockedListSaves = vi.mocked(listSaves);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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

describe('SettingsPage', () => {
  let container: HTMLDivElement;
  let root: Root;

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
    useAudioPreferencesStore.setState({
      volume: AUDIO_PREFERENCES_DEFAULTS.volume,
      muted: AUDIO_PREFERENCES_DEFAULTS.muted,
    });

    mockedUseWorker.mockReturnValue({
      isReady: false,
    } as ReturnType<typeof useWorker>);

    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 87,
      phase: 'regular',
      userTeamId: 'nyy',
      initializeGame: vi.fn(),
    } as unknown as ReturnType<typeof useGameStore>);

    mockedListSaves.mockResolvedValue([]);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders muted audio controls by default', async () => {
    await act(async () => {
      root.render(<SettingsPage />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Audio');
    expect(container.textContent).toContain('Muted');

    const volumeSlider = container.querySelector('#audio-volume') as HTMLInputElement | null;
    expect(volumeSlider).not.toBeNull();
    expect(volumeSlider?.value).toBe(String(Math.round(AUDIO_PREFERENCES_DEFAULTS.volume * 100)));
  });

  it('updates the mute toggle and volume slider through the page controls', async () => {
    await act(async () => {
      root.render(<SettingsPage />);
      await Promise.resolve();
    });

    const muteToggle = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Muted'),
    );
    const volumeSlider = container.querySelector('#audio-volume') as HTMLInputElement;

    await act(async () => {
      muteToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(useAudioPreferencesStore.getState().muted).toBe(false);

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set;
      setValue?.call(volumeSlider, '42');
      volumeSlider.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    expect(useAudioPreferencesStore.getState().volume).toBe(0.42);
    expect(container.textContent).toContain('42%');
  });
});
