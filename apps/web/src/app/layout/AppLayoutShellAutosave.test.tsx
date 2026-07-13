import { act } from 'react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { persistActiveSaveSnapshot } from '@/shared/lib/activeSavePersistence';
import { getAudioEngine } from '@/shared/lib/audio';

vi.mock('./Sidebar', () => ({
  Sidebar: () => null,
}));

vi.mock('./TopBar', () => ({
  TopBar: () => null,
}));

vi.mock('./SimControls', () => ({
  SimControls: () => null,
}));

vi.mock('./SeasonFlowCard', () => ({
  SeasonFlowCard: () => null,
}));

vi.mock('./TickerBar', () => ({
  TickerBar: () => null,
}));

vi.mock('./CommandPalette', () => ({
  CommandPalette: () => null,
}));

vi.mock('./KeyboardShortcutsPanel', () => ({
  KeyboardShortcutsPanel: () => null,
}));

vi.mock('@/features/assistant/components/AssistantPanel', () => ({
  AssistantPanel: () => null,
}));

vi.mock('@/shared/components/TourProvider', () => ({
  TourProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('./MomentCardOverlay', () => ({
  MomentCardOverlay: ({
    moment,
    onDismiss,
  }: {
    moment: { id: string } | null;
    onDismiss: (momentId: string) => void;
  }) => (
    moment ? (
      <button type="button" onClick={() => onDismiss(moment.id)}>
        dismiss ceremony
      </button>
    ) : null
  ),
}));

vi.mock('./MonthlyPulseOverlay', () => ({
  MonthlyPulseOverlay: ({
    report,
    decision,
    onContinue,
    onDecisionDismiss,
  }: {
    report: { id: string } | null;
    decision: { id: string } | null;
    onContinue: () => void;
    onDecisionDismiss: () => void;
  }) => (
    <div>
      {report ? (
        <button type="button" onClick={onContinue}>
          continue monthly report
        </button>
      ) : null}
      {decision ? (
        <button type="button" onClick={onDecisionDismiss}>
          dismiss decision
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock('@/features/press-room/components/PressConferenceModal', () => ({
  PressConferenceModal: ({
    conference,
    onRespond,
  }: {
    conference: { id: string; responses: Array<{ id: string }> };
    onRespond: (conferenceId: string, responseId: string) => Promise<void>;
  }) => (
    <button type="button" onClick={() => void onRespond(conference.id, conference.responses[0]?.id ?? '')}>
      answer press conference
    </button>
  ),
}));

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('@/shared/hooks/useAudioPreferencesStore', () => ({
  useAudioPreferencesStore: (selector: (state: {
    muted: boolean;
    volume: number;
    effectVolume: number;
    ambientVolume: number;
  }) => unknown) => selector({
    muted: false,
    volume: 0.7,
    effectVolume: 0.7,
    ambientVolume: 0.7,
  }),
}));

vi.mock('@/shared/lib/activeSavePersistence', () => ({
  persistActiveSaveSnapshot: vi.fn(async ({ exportSnapshot }: { exportSnapshot: () => Promise<object> }) => {
    await exportSnapshot();
    return { saved: true, saveName: 'Saved game' };
  }),
}));

vi.mock('@/shared/lib/audio', () => ({
  getAudioEngine: vi.fn(),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);
const mockedPersistActiveSaveSnapshot = vi.mocked(persistActiveSaveSnapshot);
const mockedGetAudioEngine = vi.mocked(getAudioEngine);

const audioEngineMock = {
  playEffect: vi.fn(),
  setAmbient: vi.fn(),
  setVolume: vi.fn(),
  setEffectVolume: vi.fn(),
  setAmbientVolume: vi.fn(),
  setMuted: vi.fn(),
};

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createStoreState(overrides: Record<string, unknown> = {}) {
  return {
    season: 3,
    day: 117,
    phase: 'regular',
    isInitialized: true,
    userTeamId: 'nym',
    teamName: 'Tycoons',
    gmName: 'Alex Rivera',
    difficulty: 'standard',
    activeSaveId: 'save-slot-3',
    activeSaveSlot: 3,
    playerCount: 780,
    gamesPlayed: 117,
    isSimulating: false,
    setSeason: vi.fn(),
    setDay: vi.fn(),
    setPhase: vi.fn(),
    setSimulating: vi.fn(),
    setInitialized: vi.fn(),
    setUserTeamId: vi.fn(),
    setActiveSave: vi.fn(),
    setActiveSaveSlot: vi.fn(),
    updateFromSim: vi.fn(),
    initializeGame: vi.fn(),
    ...overrides,
  };
}

function createSeasonFlow(overrides: Record<string, unknown> = {}) {
  return {
    status: 'regular',
    season: 3,
    phaseLabel: 'Season 3 - Day 117/162',
    detailLabel: 'Regular Season',
    progress: 117 / 162,
    canUseRegularSimControls: true,
    action: null,
    actionLabel: null,
    secondaryAction: null,
    secondaryActionLabel: null,
    daysUntilTradeDeadline: 5,
    standingsSnapshot: [],
    playoffPreview: [],
    seasonSummary: null,
    championSummary: null,
    offseasonSummary: null,
    ...overrides,
  };
}

function createWorkerMock(flow: Record<string, unknown> = createSeasonFlow()) {
  return {
    isReady: true,
    getSeasonFlowState: vi.fn().mockResolvedValue(flow),
    getTickerFeed: vi.fn().mockResolvedValue([]),
    getCeremonyState: vi.fn().mockResolvedValue({
      activeMoment: null,
      queueLength: 0,
    }),
    dismissCeremonyMoment: vi.fn().mockResolvedValue({ success: true }),
    getMonthlyPulse: vi.fn().mockResolvedValue({
      pendingReport: null,
      decisionQueue: [],
    }),
    getInteractivePressConference: vi.fn().mockResolvedValue(null),
    acknowledgeMonthlyReport: vi.fn().mockResolvedValue({ success: true }),
    dismissDecisionSpotlight: vi.fn().mockResolvedValue({ success: true }),
    respondToPressConference: vi.fn().mockResolvedValue({ success: true }),
    subscribeToFlowUpdates: vi.fn(() => () => {}),
    simDay: vi.fn().mockResolvedValue({ season: 3, day: 118, phase: 'regular', gamesPlayed: 1 }),
    simWeek: vi.fn().mockResolvedValue({ season: 3, day: 124, phase: 'regular', gamesPlayed: 7 }),
    simMonth: vi.fn().mockResolvedValue({ season: 3, day: 147, phase: 'regular', gamesPlayed: 30 }),
    simToPlayoffs: vi.fn().mockResolvedValue({ season: 3, day: 1, phase: 'playoffs', gamesPlayed: 45 }),
    simRemainingPlayoffs: vi.fn().mockResolvedValue({ season: 3, day: 1, phase: 'playoffs', gamesPlayed: 11 }),
    proceedToOffseason: vi.fn().mockResolvedValue({ season: 3, day: 1, phase: 'offseason', gamesPlayed: 0 }),
    startNextSeason: vi.fn().mockResolvedValue({ season: 4, day: 1, phase: 'preseason', gamesPlayed: 0 }),
    exportSnapshot: vi.fn().mockResolvedValue({
      schemaVersion: 34,
      season: 3,
      day: 117,
      phase: 'regular',
    }),
  };
}

async function flushPromises(times = 3) {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

describe('AppLayout shell autosave', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    // AppLayout's exact-save stale-callback fence reads the imperative Zustand
    // surface as well as the render hook. This mocked hook models both.
    Object.assign(mockedUseGameStore, { getState: () => createStoreState() });
    mockedGetAudioEngine.mockReturnValue(audioEngineMock as unknown as ReturnType<typeof getAudioEngine>);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  async function renderLayout(initialPath = '/') {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
              <Route path="dashboard" element={<div>Dashboard</div>} />
              <Route path="roster" element={<div>Roster</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await flushPromises();
    });
  }

  it('autosaves monthly report and decision acknowledgements', async () => {
    mockedUseGameStore.mockReturnValue(createStoreState());
    const worker = createWorkerMock();
    let pulseCall = 0;
    worker.getMonthlyPulse = vi.fn().mockImplementation(async () => {
      pulseCall += 1;
      if (pulseCall === 1) {
        return {
          pendingReport: {
            id: 'report-3-7',
            monthLabel: 'July',
            teamRecord: '18-10',
            overallRecord: '62-55',
            divisionMovement: 1,
            playerOfTheMonth: { playerName: 'Mateo Cruz', war: 1.8 },
          },
          decisionQueue: [{
            id: 'decision-roster',
            urgency: 'red',
            title: 'Roster is over the active limit',
            body: 'Clear one roster spot before the next series.',
            route: '/roster',
            actionLabel: 'Open Roster',
          }],
        };
      }
      if (pulseCall === 2) {
        return {
          pendingReport: null,
          decisionQueue: [{
            id: 'decision-roster',
            urgency: 'red',
            title: 'Roster is over the active limit',
            body: 'Clear one roster spot before the next series.',
            route: '/roster',
            actionLabel: 'Open Roster',
          }],
        };
      }
      return { pendingReport: null, decisionQueue: [] };
    });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderLayout();

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushPromises();
    });

    expect(worker.acknowledgeMonthlyReport).toHaveBeenCalledWith('report-3-7');
    expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledTimes(1);

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushPromises();
    });

    expect(worker.dismissDecisionSpotlight).toHaveBeenCalledWith('decision-roster');
    expect(worker.exportSnapshot).toHaveBeenCalledTimes(2);
    expect(mockedPersistActiveSaveSnapshot).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        activeSaveId: 'save-slot-3',
        activeSaveSlot: 3,
        exportSnapshot: expect.any(Function),
        gmName: 'Alex Rivera',
        season: 3,
        teamName: 'Tycoons',
      }),
    );
    expect(mockedPersistActiveSaveSnapshot).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        activeSaveId: 'save-slot-3',
        activeSaveSlot: 3,
        exportSnapshot: expect.any(Function),
        gmName: 'Alex Rivera',
        season: 3,
        teamName: 'Tycoons',
      }),
    );
  });

  it('does not autosave rejected monthly report or decision acknowledgements', async () => {
    mockedUseGameStore.mockReturnValue(createStoreState());
    const worker = createWorkerMock();
    worker.acknowledgeMonthlyReport = vi.fn().mockResolvedValue({ success: false });
    worker.dismissDecisionSpotlight = vi.fn().mockResolvedValue({ success: false });
    worker.getMonthlyPulse = vi.fn()
      .mockResolvedValueOnce({
        pendingReport: {
          id: 'report-rejected',
          monthLabel: 'July',
          teamRecord: '18-10',
          overallRecord: '62-55',
          divisionMovement: 1,
          playerOfTheMonth: { playerName: 'Mateo Cruz', war: 1.8 },
        },
        decisionQueue: [],
      })
      .mockResolvedValue({ pendingReport: null, decisionQueue: [] });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderLayout();

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushPromises();
    });

    expect(worker.acknowledgeMonthlyReport).toHaveBeenCalledWith('report-rejected');
    expect(mockedPersistActiveSaveSnapshot).not.toHaveBeenCalled();
    expect(worker.exportSnapshot).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockedGetAudioEngine.mockReturnValue(audioEngineMock as unknown as ReturnType<typeof getAudioEngine>);

    const decisionWorker = createWorkerMock();
    decisionWorker.dismissDecisionSpotlight = vi.fn().mockResolvedValue({ success: false });
    decisionWorker.getMonthlyPulse = vi.fn()
      .mockResolvedValueOnce({
        pendingReport: null,
        decisionQueue: [{
          id: 'decision-rejected',
          urgency: 'red',
          title: 'Roster is over the active limit',
          body: 'Clear one roster spot before the next series.',
          route: '/roster',
          actionLabel: 'Open Roster',
        }],
      })
      .mockResolvedValue({ pendingReport: null, decisionQueue: [] });
    mockedUseGameStore.mockReturnValue(createStoreState());
    mockedUseWorker.mockReturnValue(decisionWorker as unknown as ReturnType<typeof useWorker>);

    await renderLayout();

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushPromises();
    });

    expect(decisionWorker.dismissDecisionSpotlight).toHaveBeenCalledWith('decision-rejected');
    expect(mockedPersistActiveSaveSnapshot).not.toHaveBeenCalled();
    expect(decisionWorker.exportSnapshot).not.toHaveBeenCalled();
  });

  it('autosaves ceremony dismissals', async () => {
    mockedUseGameStore.mockReturnValue(createStoreState({
      day: 162,
      phase: 'playoffs',
      gamesPlayed: 180,
    }));
    const worker = createWorkerMock(createSeasonFlow({
      status: 'playoffs_complete',
      phaseLabel: 'Season 3 - World Series Final',
      detailLabel: 'New York Tycoons won it all',
      progress: 1,
      canUseRegularSimControls: false,
      action: 'proceed_to_offseason',
      actionLabel: 'Proceed to Offseason',
      daysUntilTradeDeadline: null,
    }));
    let ceremonyCalls = 0;
    worker.getCeremonyState = vi.fn().mockImplementation(async () => {
      ceremonyCalls += 1;
      if (ceremonyCalls === 1) {
        return {
          activeMoment: {
            id: 'moment-world-series',
            type: 'world_series_win',
            title: 'WORLD CHAMPIONS',
            subtitle: 'New York Tycoons',
            detailLines: ['Defeated Los Angeles 4-2'],
            soundEffect: 'world_series_win',
            autoDismissMs: 5000,
          },
          queueLength: 1,
        };
      }
      return { activeMoment: null, queueLength: 0 };
    });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderLayout();

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushPromises();
    });

    expect(worker.dismissCeremonyMoment).toHaveBeenCalledWith('moment-world-series');
    expect(worker.exportSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledTimes(1);
  });

  it('presents a durably published signing ceremony before its dismissible save', async () => {
    mockedUseGameStore.mockReturnValue(createStoreState());
    const worker = createWorkerMock();
    let notifyDurablePresentation: (() => void) | null = null;
    worker.subscribeToFlowUpdates = vi.fn((callback: () => void) => {
      notifyDurablePresentation = callback;
      return () => {};
    });
    worker.getCeremonyState = vi.fn()
      .mockResolvedValueOnce({ activeMoment: null, queueLength: 0 })
      .mockResolvedValueOnce({
        activeMoment: {
          id: 'achievement-first_signing',
          type: 'achievement',
          title: 'ACHIEVEMENT UNLOCKED',
          subtitle: 'Open for Business',
          detailLines: ['Sign your first free agent.'],
          soundEffect: 'achievement_unlock',
          autoDismissMs: 5000,
        },
        queueLength: 1,
      })
      .mockResolvedValue({ activeMoment: null, queueLength: 0 });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderLayout();

    expect(container.textContent).not.toContain('dismiss ceremony');
    expect(notifyDurablePresentation).not.toBeNull();
    await act(async () => {
      notifyDurablePresentation?.();
      await flushPromises();
    });
    expect(container.textContent).toContain('dismiss ceremony');

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushPromises();
    });

    expect(worker.dismissCeremonyMoment).toHaveBeenCalledWith('achievement-first_signing');
    expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledTimes(1);
  });

  it('does not autosave rejected ceremony dismissals', async () => {
    mockedUseGameStore.mockReturnValue(createStoreState({
      day: 162,
      phase: 'playoffs',
      gamesPlayed: 180,
    }));
    const worker = createWorkerMock(createSeasonFlow({
      status: 'playoffs_complete',
      phaseLabel: 'Season 3 - World Series Final',
      detailLabel: 'New York Tycoons won it all',
      progress: 1,
      canUseRegularSimControls: false,
      action: 'proceed_to_offseason',
      actionLabel: 'Proceed to Offseason',
      daysUntilTradeDeadline: null,
    }));
    worker.dismissCeremonyMoment = vi.fn().mockResolvedValue({ success: false });
    worker.getCeremonyState = vi.fn().mockResolvedValue({
      activeMoment: {
        id: 'moment-world-series',
        type: 'world_series_win',
        title: 'WORLD CHAMPIONS',
        subtitle: 'New York Tycoons',
        detailLines: ['Defeated Los Angeles 4-2'],
        soundEffect: 'world_series_win',
        autoDismissMs: 5000,
      },
      queueLength: 1,
    });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderLayout();

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushPromises();
    });

    expect(worker.dismissCeremonyMoment).toHaveBeenCalledWith('moment-world-series');
    expect(mockedPersistActiveSaveSnapshot).not.toHaveBeenCalled();
    expect(worker.exportSnapshot).not.toHaveBeenCalled();
  });

  it('autosaves press conference responses', async () => {
    mockedUseGameStore.mockReturnValue(createStoreState({
      day: 88,
      gamesPlayed: 88,
    }));
    const worker = createWorkerMock(createSeasonFlow({
      phaseLabel: 'Season 3 - Day 88/162',
      progress: 88 / 162,
      daysUntilTradeDeadline: 32,
    }));
    worker.getInteractivePressConference = vi.fn().mockResolvedValue({
      id: 'press-3-88',
      topic: 'deadline',
      question: 'How do you answer the clubhouse after a rough week?',
      ownerTone: 'neutral',
      teamId: 'nym',
      season: 3,
      day: 88,
      responses: [{
        id: 'measured',
        label: 'Own the plan',
        tone: 'measured',
        quote: 'We know the standard and we are staying with the work.',
        moraleDelta: 2,
        ownerDelta: 1,
        generatesNews: true,
      }],
    });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderLayout('/dashboard');

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushPromises();
    });

    expect(worker.respondToPressConference).toHaveBeenCalledWith('press-3-88', 'measured');
    expect(worker.exportSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledTimes(1);
  });

  it('does not autosave rejected press conference responses', async () => {
    mockedUseGameStore.mockReturnValue(createStoreState({
      day: 88,
      gamesPlayed: 88,
    }));
    const worker = createWorkerMock(createSeasonFlow({
      phaseLabel: 'Season 3 - Day 88/162',
      progress: 88 / 162,
      daysUntilTradeDeadline: 32,
    }));
    worker.getInteractivePressConference = vi.fn().mockResolvedValue({
      id: 'press-3-88',
      topic: 'deadline',
      question: 'How do you answer the clubhouse after a rough week?',
      ownerTone: 'neutral',
      teamId: 'nym',
      season: 3,
      day: 88,
      responses: [{
        id: 'measured',
        label: 'Own the plan',
        tone: 'measured',
        quote: 'We know the standard and we are staying with the work.',
        moraleDelta: 2,
        ownerDelta: 1,
        generatesNews: true,
      }],
    });
    worker.respondToPressConference = vi.fn().mockResolvedValue({ success: false });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderLayout('/dashboard');

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushPromises();
    });

    expect(worker.respondToPressConference).toHaveBeenCalledWith('press-3-88', 'measured');
    expect(mockedPersistActiveSaveSnapshot).not.toHaveBeenCalled();
    expect(worker.exportSnapshot).not.toHaveBeenCalled();
  });
});
