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
import { usePreferencesStore } from '@/shared/hooks/usePreferencesStore';
import { resetAudioEngineForTest } from '@/shared/lib/audio';
import { listSaves, loadGameSafe, loadSaveSafely, repairSave } from '@/shared/lib/saveSystem';

const recoveryMockState = vi.hoisted(() => ({
  showFailure: vi.fn(),
}));

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('@/shared/components/TourProvider', () => ({
  useTour: () => ({
    active: false,
    currentStep: 0,
    totalSteps: 9,
    startTour: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    skipTour: vi.fn(),
    restartTour: vi.fn(),
    completed: false,
  }),
}));

vi.mock('@/features/save-recovery', () => ({
  useSaveRecovery: () => ({
    showFailure: recoveryMockState.showFailure,
  }),
}));

vi.mock('@/shared/lib/saveSystem', () => ({
  SAVE_SLOTS: [1, 2, 3, 4, 5],
  deleteSave: vi.fn(),
  listSaves: vi.fn(),
  loadGame: vi.fn(),
  loadGameSafe: vi.fn(),
  loadSaveSafely: vi.fn(),
  repairSave: vi.fn(),
  saveGame: vi.fn(),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);
const mockedListSaves = vi.mocked(listSaves);
const mockedLoadGameSafe = vi.mocked(loadGameSafe);
const mockedLoadSaveSafely = vi.mocked(loadSaveSafely);
const mockedRepairSave = vi.mocked(repairSave);

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
    usePreferencesStore.getState().reset();
    recoveryMockState.showFailure.mockReset();

    mockedUseWorker.mockReturnValue({
      isReady: false,
    } as ReturnType<typeof useWorker>);

    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 87,
      phase: 'regular',
      userTeamId: 'nym',
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      initializeGame: vi.fn(),
    } as unknown as ReturnType<typeof useGameStore>);

    mockedListSaves.mockResolvedValue([]);
    mockedLoadGameSafe.mockResolvedValue({
      status: 'ok',
      save: {
        id: 'save-slot-1',
        slotNumber: 1,
        name: 'Healthy Save',
        season: 3,
        day: 87,
        phase: 'regular',
        schemaVersion: 11,
        hasSnapshot: true,
        snapshot: {
          schemaVersion: 11,
          season: 3,
          day: 87,
          phase: 'regular',
        },
        legacyState: null,
        createdAt: '2026-04-02T00:00:00.000Z',
        updatedAt: '2026-04-02T12:00:00.000Z',
      },
    } as never);
    mockedLoadSaveSafely.mockResolvedValue({
      ok: true,
      snapshot: {
        schemaVersion: 11,
        season: 3,
        day: 87,
        phase: 'regular',
      },
      save: {
        id: 'save-slot-1',
        slotNumber: 1,
        name: 'Healthy Save',
        season: 3,
        day: 87,
        phase: 'regular',
        schemaVersion: 11,
        hasSnapshot: true,
        snapshot: {
          schemaVersion: 11,
          season: 3,
          day: 87,
          phase: 'regular',
        },
        legacyState: null,
        createdAt: '2026-04-02T00:00:00.000Z',
        updatedAt: '2026-04-02T12:00:00.000Z',
      },
      rawJson: '{"id":"save-slot-1"}',
    } as never);
    mockedRepairSave.mockResolvedValue({
      status: 'ok',
      save: {
        id: 'save-slot-1',
        slotNumber: 1,
        name: 'Recovered Save',
        season: 3,
        day: 87,
        phase: 'regular',
        schemaVersion: 11,
        hasSnapshot: true,
        snapshot: {
          schemaVersion: 11,
          season: 3,
          day: 87,
          phase: 'regular',
        },
        legacyState: null,
        createdAt: '2026-04-02T00:00:00.000Z',
        updatedAt: '2026-04-02T12:00:00.000Z',
      },
    } as never);

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
    expect(container.textContent).toContain('Simulation');
    expect(container.textContent).toContain('Display');
    expect(container.textContent).toContain('Accessibility');
    expect(container.textContent).toContain('Data / Install');
    expect(container.textContent).toContain('Send Feedback');
  });

  it('opens the feedback form from the settings page', async () => {
    await act(async () => {
      root.render(<SettingsPage />);
      await Promise.resolve();
    });

    const feedbackButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Send Feedback'),
    );

    await act(async () => {
      feedbackButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Send feedback');
    expect(container.textContent).toContain('Bug');
    expect(container.textContent).toContain('Suggestion');
    expect(container.textContent).toContain('Question');
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

  it('hands corrupt save slots to the recovery flow with retry callbacks', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      importSnapshot: vi.fn(),
    } as unknown as ReturnType<typeof useWorker>);
    mockedListSaves.mockResolvedValueOnce([
      {
        id: 'save-slot-1',
        slotNumber: 1,
        name: 'Broken Save',
        season: 3,
        day: 87,
        phase: 'regular',
        schemaVersion: 11,
        hasSnapshot: true,
        snapshot: null,
        legacyState: null,
        createdAt: '2026-04-02T00:00:00.000Z',
        updatedAt: '2026-04-02T12:00:00.000Z',
      },
    ] as never);
    const failure = {
      ok: false,
      reason: 'migration_failed',
      detail: {
        slotId: 'save-slot-1',
        slotNumber: 1,
        message: 'Snapshot payload is invalid.',
        rawJson: '{"id":"save-slot-1"}',
        schemaVersion: 2,
      },
    } as const;
    mockedLoadSaveSafely.mockResolvedValueOnce(failure as never);

    await act(async () => {
      root.render(<SettingsPage />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const loadButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Load'),
    );

    await act(async () => {
      loadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(recoveryMockState.showFailure).toHaveBeenCalledWith(expect.objectContaining({
      failure,
      onDelete: expect.any(Function),
      onRetry: expect.any(Function),
    }));

    const options = recoveryMockState.showFailure.mock.calls[0]?.[0] as {
      onRetry: () => Promise<boolean | void>;
    };
    mockedLoadSaveSafely.mockResolvedValueOnce({
      ok: false,
      reason: 'storage_failed',
      detail: {
        slotId: 'save-slot-1',
        slotNumber: 1,
        message: 'IndexedDB failed.',
        rawJson: null,
      },
    } as never);

    let retryResult: boolean | void = undefined;
    await act(async () => {
      retryResult = await options.onRetry();
    });
    expect(retryResult).toBe(false);
  });

  it('updates reduced motion and high contrast preferences from the settings page', async () => {
    await act(async () => {
      root.render(<SettingsPage />);
      await Promise.resolve();
    });

    const reducedMotionButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Reduced Motion'),
    );
    const highContrastButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('High Contrast'),
    );

    await act(async () => {
      reducedMotionButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      highContrastButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(usePreferencesStore.getState().reducedMotion).toBe(true);
    expect(usePreferencesStore.getState().highContrast).toBe(true);
  });

  it('shows what-if branch management for the active root save', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getBranches: vi.fn().mockResolvedValue([
        {
          id: 'branch-1',
          slotNumber: null,
          name: 'Aggressive deadline push',
          season: 3,
          day: 87,
          phase: 'regular',
          schemaVersion: 15,
          hasSnapshot: true,
          snapshot: null,
          legacyState: null,
          createdAt: '2026-04-04T00:00:00.000Z',
          updatedAt: '2026-04-04T00:00:00.000Z',
          parentSaveId: 'save-slot-1',
          isRootSave: false,
          branchMeta: {
            id: 'branch-1',
            saveId: 'branch-1',
            branchedAtSeason: 3,
            branchedAtDay: 87,
            description: 'Aggressive deadline push',
            createdAt: '2026-04-04T00:00:00.000Z',
          },
        },
      ]),
      createWhatIfBranch: vi.fn().mockResolvedValue({ id: 'branch-2' }),
      deleteWhatIfBranch: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(<SettingsPage />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('What-If Branching');
    expect(container.textContent).toContain('1/3 branches');
    expect(container.textContent).toContain('Aggressive deadline push');
    expect(container.textContent).toContain('Create Branch');
    expect(container.textContent).toContain('Delete Branch');
  });

  it('loads diagnostics and runs archive and prune actions against the active save', async () => {
    const getPerformanceDiagnostics = vi.fn().mockResolvedValue({
      totals: {
        totalSeasons: 12,
        snapshotSizeBytes: 524288,
        liveArchiveSeasons: 10,
        archivedSeasons: 2,
      },
      queues: {
        newsItems: 14,
        briefingItems: 4,
        tickerEntries: 9,
        staleTickerEntries: 2,
        activeWatchers: 3,
        resolvedWatchers: 1,
        scoutConflicts: 2,
      },
      runtime: {
        lastSimDayMs: 18.4,
        lastSaveMs: 11.2,
        lastLoadMs: 6.8,
      },
    });
    const archiveOldSeasons = vi.fn().mockResolvedValue({
      success: true,
      archivedCount: 2,
      diagnostics: {
        totals: {
          totalSeasons: 12,
          snapshotSizeBytes: 500000,
          liveArchiveSeasons: 8,
          archivedSeasons: 4,
        },
        queues: {
          newsItems: 14,
          briefingItems: 4,
          tickerEntries: 9,
          staleTickerEntries: 2,
          activeWatchers: 3,
          resolvedWatchers: 1,
          scoutConflicts: 2,
        },
        runtime: {
          lastSimDayMs: 18.4,
          lastSaveMs: 12.1,
          lastLoadMs: 6.8,
        },
      },
    });
    const pruneStaleData = vi.fn().mockResolvedValue({
      success: true,
      prunedCount: 3,
      diagnostics: {
        totals: {
          totalSeasons: 12,
          snapshotSizeBytes: 480000,
          liveArchiveSeasons: 8,
          archivedSeasons: 4,
        },
        queues: {
          newsItems: 14,
          briefingItems: 4,
          tickerEntries: 7,
          staleTickerEntries: 0,
          activeWatchers: 2,
          resolvedWatchers: 0,
          scoutConflicts: 2,
        },
        runtime: {
          lastSimDayMs: 18.4,
          lastSaveMs: 10.6,
          lastLoadMs: 6.8,
        },
      },
    });

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getBranches: vi.fn().mockResolvedValue([]),
      getPerformanceDiagnostics,
      archiveOldSeasons,
      pruneStaleData,
      importSnapshot: vi.fn(),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(<SettingsPage />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Diagnostics');
    expect(container.textContent).toContain('Runtime');
    expect(container.textContent).toContain('524.3 KB');

    const archiveButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Archive Older Seasons'),
    );
    const pruneButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Prune Stale Data'),
    );

    await act(async () => {
      archiveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(archiveOldSeasons).toHaveBeenCalledWith('save-slot-1');
    expect(container.textContent).toContain('Archived 2 older seasons');

    await act(async () => {
      pruneButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(pruneStaleData).toHaveBeenCalledWith('save-slot-1');
    expect(container.textContent).toContain('Pruned 3 stale entries');
  });
});
