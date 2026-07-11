import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPageContent, { type SettingsSectionKey } from './SettingsPageContent';

vi.mock('@/shared/components/TourProvider', () => ({
  useTour: () => ({
    completed: false,
    restartTour: vi.fn(),
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createProps(overrides: Partial<Parameters<typeof SettingsPageContent>[0]> = {}): Parameters<typeof SettingsPageContent>[0] {
  return {
    activeSaveId: 'save-slot-1',
    diagnosticsData: {
      diagnostics: {
        queues: {
          activeWatchers: 2,
          briefingItems: 1,
          newsItems: 3,
          resolvedWatchers: 1,
          staleWatchers: 1,
          scoutConflicts: 0,
          staleTickerEntries: 1,
          tickerEntries: 4,
        },
        queryTimings: {
          enabled: false,
          topSlowQueries: [],
          warningCount: 0,
        },
        runtime: {
          lastLoadMs: 5,
          lastSaveMs: 7,
          lastSimDayMs: 11,
        },
        totals: {
          archivedSeasons: 1,
          liveArchiveSeasons: 3,
          snapshotSizeBytes: 1200,
          totalSeasons: 4,
        },
      },
      diagnosticsBusy: null,
      localEstimate: null,
      originEstimate: null,
      handleArchiveOldSeasons: vi.fn(),
      handlePruneStaleData: vi.fn(),
      refreshDiagnostics: vi.fn(),
    },
    installPrompt: {
      handleInstallApp: vi.fn(),
      installed: false,
    },
    guidanceReplay: {
      activeSaveLabel: 'save-slot-1',
      guidanceStatus: null,
      handleReplayAssistantGuidance: vi.fn(),
      handleReplayGuidedStartNudges: vi.fn(),
    },
    openSections: {
      accessibility: true,
      about: true,
      audio: true,
      data: true,
      diagnostics: true,
      display: true,
      guidance: true,
      simulation: true,
    },
    preferences: {
      ambientVolumePercent: 30,
      autoAdvance: false,
      defaultStatView: 'sabermetric',
      effectVolumePercent: 40,
      handleAmbientVolumeChange: vi.fn(),
      handleAutoAdvanceToggle: vi.fn(),
      handleDefaultStatViewChange: vi.fn(),
      handleEffectVolumeChange: vi.fn(),
      handleHighContrastToggle: vi.fn(),
      handleMuteToggle: vi.fn(),
      handleReducedMotionToggle: vi.fn(),
      handleSimSpeedChange: vi.fn(),
      handleTableDensityChange: vi.fn(),
      handleVolumeChange: vi.fn(),
      highContrast: false,
      muted: true,
      reducedMotion: false,
      simSpeed: 'normal',
      tableDensity: 'standard',
      volumePercent: 50,
    },
    saveData: {
      activeManagedSaveId: 'save-slot-1',
      activeRootSaveId: 'save-slot-1',
      branchBusy: false,
      branchDescription: '',
      branches: [],
      busySlot: null,
      operationBusy: false,
      handleClearAllSaves: vi.fn(),
      handleCreateBranch: vi.fn(),
      handleDelete: vi.fn(),
      handleDeleteBranch: vi.fn(),
      handleExportCurrent: vi.fn(),
      handleImportFile: vi.fn(),
      handleLoad: vi.fn(),
      handleSave: vi.fn(),
      refreshSaves: vi.fn(),
      saveSlots: [1, 2, 3, 4, 5],
      saves: [],
      setBranchDescription: vi.fn(),
      setStatus: vi.fn(),
      status: 'Saved snapshot to slot 1.',
    },
    session: {
      day: 87,
      phase: 'regular',
      season: 3,
      userTeamId: 'nym',
    },
    workerReady: true,
    onToggleSection: vi.fn(),
    ...overrides,
  };
}

describe('SettingsPageContent', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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

  it('renders settings content and delegates route-owned callbacks', async () => {
    const props = createProps();

    await act(async () => {
      root.render(<SettingsPageContent {...props} />);
    });

    expect(container.textContent).toContain('Settings');
    expect(container.textContent).toContain('Saved snapshot to slot 1.');
    expect(container.textContent).toContain('Current session: Season 3, Day 87, Regular as NYM.');
    expect(container.textContent).toContain('Data / Install');
    expect(container.textContent).toContain('Guidance Replay');
    expect(container.textContent).toContain('Diagnostics');
    expect(container.textContent).toContain('Mr. Baseball Dynasty v1.0.0');

    const mutedButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Muted'),
    );
    await act(async () => {
      mutedButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(props.preferences.handleMuteToggle).toHaveBeenCalledTimes(1);

    const refreshButton = container.querySelector('button[aria-label="Refresh save slot list"]');
    await act(async () => {
      refreshButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(props.saveData.refreshSaves).toHaveBeenCalledTimes(1);

    expect(container.textContent).toContain('Detailed season history is protected');

    const assistantReplayButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Replay Assistant Help'),
    );
    const guidedStartButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Replay Guided-Start Nudges'),
    );
    await act(async () => {
      assistantReplayButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      guidedStartButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(props.guidanceReplay.handleReplayAssistantGuidance).toHaveBeenCalledTimes(1);
    expect(props.guidanceReplay.handleReplayGuidedStartNudges).toHaveBeenCalledTimes(1);

    const dataToggle = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Data / Install'),
    );
    await act(async () => {
      dataToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(props.onToggleSection).toHaveBeenCalledWith('data' satisfies SettingsSectionKey);
  });

  it('visually disables prune while the shared Settings save-data operation owns the latch', async () => {
    const props = createProps({
      saveData: {
        ...createProps().saveData,
        operationBusy: true,
      },
    });
    await act(async () => {
      root.render(<SettingsPageContent {...props} />);
    });
    const prune = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Prune Stale Data'));
    expect(prune).toBeInstanceOf(HTMLButtonElement);
    expect((prune as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { prune?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(props.diagnosticsData.handlePruneStaleData).not.toHaveBeenCalled();
  });
});
