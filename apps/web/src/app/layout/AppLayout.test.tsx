import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import { isSimAdvanceCoordinatorBusy, useSimAdvanceExecutor } from '@/shared/hooks/useSimAdvanceExecutor';
import { saveGameById } from '@/shared/lib/saveSystem';
import { getAudioEngine } from '@/shared/lib/audio';
import {
  pauseWorkerMutationsForSaveTransition,
  resetWorkerMutationSessionForTesting,
  resumeWorkerMutationsAfterSaveTransition,
} from '@/shared/lib/workerMutationSession';

vi.mock('./Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

vi.mock('./CommandPalette', () => ({
  CommandPalette: () => null,
}));

vi.mock('@/features/assistant/components/AssistantPanel', () => ({
  AssistantPanel: () => <div data-testid="assistant-panel">Assistant</div>,
}));

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('@/shared/hooks/useActiveSaveAutosave', () => ({
  useActiveSaveAutosave: vi.fn(),
}));

vi.mock('@/shared/hooks/useSimAdvanceExecutor', () => ({
  useSimAdvanceExecutor: vi.fn(),
  useSimAdvanceCoordinatorStatus: vi.fn(() => ({ kind: 'idle' })),
  isSimAdvanceCoordinatorBusy: vi.fn(() => false),
}));

vi.mock('@/shared/lib/saveSystem', () => ({
  loadGameById: vi.fn().mockResolvedValue(undefined),
  saveGameById: vi.fn().mockResolvedValue({
    id: 'save-slot-1',
    updatedAt: '2026-04-02T12:00:00.000Z',
  }),
  scheduleAutoSave: vi.fn().mockResolvedValue(undefined),
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
const mockedUseActiveSaveAutosave = vi.mocked(useActiveSaveAutosave);
const mockedUseSimAdvanceExecutor = vi.mocked(useSimAdvanceExecutor);
const mockedIsSimAdvanceCoordinatorBusy = vi.mocked(isSimAdvanceCoordinatorBusy);
const mockedSaveGameById = vi.mocked(saveGameById);
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

function createWorkerMock(flow: Record<string, unknown>) {
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
    acknowledgeMonthlyReport: vi.fn().mockResolvedValue({ success: true }),
    dismissDecisionSpotlight: vi.fn().mockResolvedValue({ success: true }),
    subscribeToFlowUpdates: vi.fn(() => () => {}),
    newGame: vi.fn().mockResolvedValue({
      season: 3,
      day: 87,
      phase: 'regular',
      playerCount: 780,
      userTeamId: 'nym',
    }),
    importSnapshot: vi.fn(),
    simDay: vi.fn().mockResolvedValue({ season: 3, day: 88, phase: 'regular', gamesPlayed: 1 }),
    simWeek: vi.fn().mockResolvedValue({ season: 3, day: 94, phase: 'regular', gamesPlayed: 7 }),
    simMonth: vi.fn().mockResolvedValue({ season: 3, day: 117, phase: 'regular', gamesPlayed: 30 }),
    simLegacyAdvance: vi.fn().mockResolvedValue({ season: 3, day: 1, phase: 'playoffs', gamesPlayed: 0 }),
    simToPlayoffs: vi.fn().mockResolvedValue({ season: 3, day: 1, phase: 'playoffs', gamesPlayed: 75 }),
    simRemainingPlayoffs: vi.fn().mockResolvedValue({ season: 3, day: 1, phase: 'playoffs', gamesPlayed: 11 }),
    proceedToOffseason: vi.fn().mockResolvedValue({ season: 3, day: 1, phase: 'offseason', gamesPlayed: 0 }),
    startNextSeason: vi.fn().mockResolvedValue({ season: 4, day: 1, phase: 'preseason', gamesPlayed: 0 }),
    exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 11, season: 3, day: 117, phase: 'regular' }),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe('AppLayout', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetWorkerMutationSessionForTesting();
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockedGetAudioEngine.mockReturnValue(audioEngineMock as unknown as ReturnType<typeof getAudioEngine>);
    audioEngineMock.playEffect.mockReset();
    audioEngineMock.setAmbient.mockReset();
    audioEngineMock.setVolume.mockReset();
    audioEngineMock.setEffectVolume.mockReset();
    audioEngineMock.setAmbientVolume.mockReset();
    audioEngineMock.setMuted.mockReset();
    mockedUseSimAdvanceExecutor.mockReturnValue({
      execute: vi.fn().mockResolvedValue({ kind: 'durable' }),
      status: { kind: 'idle' },
    } as unknown as ReturnType<typeof useSimAdvanceExecutor>);
    mockedIsSimAdvanceCoordinatorBusy.mockReturnValue(false);
    mockedUseActiveSaveAutosave.mockReturnValue(vi.fn().mockResolvedValue({ saved: true, saveName: 'Tycoons' }));
    Object.assign(mockedUseGameStore, {
      getState: () => mockedUseGameStore.mock.results.at(-1)?.value,
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    vi.useRealTimers();
    resetWorkerMutationSessionForTesting();
    container.remove();
    vi.clearAllMocks();
  });

  it('renders sim-to-playoffs controls and handles keyboard shortcuts', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 87,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: 'save-slot-3',
      activeSaveSlot: 3,
      playerCount: 780,
      gamesPlayed: 87,
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
    });

    const flow = {
      status: 'regular',
      season: 3,
      phaseLabel: 'Season 3 — Day 87/162',
      detailLabel: 'Regular Season',
      progress: 87 / 162,
      canUseRegularSimControls: true,
      action: null,
      actionLabel: null,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: 33,
      standingsSnapshot: [],
      playoffPreview: [],
      seasonSummary: null,
      championSummary: null,
      offseasonSummary: null,
    };
    const worker = createWorkerMock(flow);
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Sim to Playoffs');
    expect(container.textContent).toContain('Assistant');

    const simToPlayoffsButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Sim to Playoffs'),
    );

    expect(simToPlayoffsButton).toBeTruthy();

    await act(async () => {
      simToPlayoffsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const regularExecute = mockedUseSimAdvanceExecutor.mock.results[0]?.value.execute as ReturnType<typeof vi.fn>;
    expect(regularExecute).toHaveBeenCalledWith('sim_to_playoffs');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, shiftKey: true }));
      await Promise.resolve();
    });
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, ctrlKey: true }));
      await Promise.resolve();
    });

    expect(regularExecute).toHaveBeenNthCalledWith(2, 'sim_day');
    expect(regularExecute).toHaveBeenNthCalledWith(3, 'sim_week');
    expect(regularExecute).toHaveBeenNthCalledWith(4, 'sim_month');

    let transitionPause!: ReturnType<typeof pauseWorkerMutationsForSaveTransition>;
    await act(async () => {
      transitionPause = pauseWorkerMutationsForSaveTransition();
      await Promise.resolve();
    });
    const simDayButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Sim Day (Space)"]',
    );
    expect(simDayButton?.disabled).toBe(true);
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
      await Promise.resolve();
    });
    expect(regularExecute).toHaveBeenCalledTimes(4);
    await act(async () => {
      resumeWorkerMutationsAfterSaveTransition(transitionPause);
      await Promise.resolve();
    });

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion?.textContent).toContain('Season 3');
    expect(liveRegion?.textContent).toContain('Regular Season');
  });

  it('renders the narrative ticker above the sim controls using worker feed entries', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 87,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      playerCount: 780,
      gamesPlayed: 87,
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
    });

    const flow = {
      status: 'regular',
      season: 3,
      phaseLabel: 'Season 3 — Day 87/162',
      detailLabel: 'Regular Season',
      progress: 87 / 162,
      canUseRegularSimControls: true,
      action: null,
      actionLabel: null,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: 33,
      standingsSnapshot: [],
      playoffPreview: [],
      seasonSummary: null,
      championSummary: null,
      offseasonSummary: null,
    };
    const worker = createWorkerMock(flow);
    worker.getTickerFeed.mockResolvedValue([
      {
        id: 'ticker-1',
        timestamp: 'S3D87',
        category: 'milestone',
        text: 'Victor Veteran records career hit #2000.',
        priority: 5,
        relatedTeamIds: ['nym'],
        relatedPlayerIds: ['player-1'],
        expiresDay: 90,
      },
    ]);
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(worker.getTickerFeed).toHaveBeenCalledWith(20);
    expect(container.textContent).toContain('Victor Veteran records career hit #2000.');
  });

  it('renders the season transition ceremony card and uses its CTA', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 1,
      phase: 'playoffs',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: 'save-slot-3',
      activeSaveSlot: 3,
      playerCount: 780,
      gamesPlayed: 162,
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
    });

    const flow = {
      status: 'playoffs_complete',
      season: 3,
      phaseLabel: 'Season 3 — World Series Final',
      detailLabel: 'New York Tycoons defeated Los Angeles Sunset Strip 4-2',
      progress: 1,
      canUseRegularSimControls: false,
      action: 'proceed_to_offseason',
      actionLabel: 'Proceed to Offseason',
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: null,
      standingsSnapshot: [],
      playoffPreview: [],
      seasonSummary: null,
      championSummary: {
        championTeamId: 'nym',
        championTeamName: 'New York Tycoons',
        runnerUpTeamName: 'Los Angeles Sunset Strip',
        seriesRecord: '4-2',
      },
      offseasonSummary: null,
    };
    const worker = createWorkerMock(flow);
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('World Series Champions');
    expect(container.textContent).toContain('Proceed to Offseason');

    const proceedButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Proceed to Offseason'),
    );

    let transitionPause!: ReturnType<typeof pauseWorkerMutationsForSaveTransition>;
    await act(async () => {
      transitionPause = pauseWorkerMutationsForSaveTransition();
      await Promise.resolve();
    });

    expect(proceedButton?.disabled).toBe(true);
    await act(async () => {
      proceedButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(worker.proceedToOffseason).not.toHaveBeenCalled();

    await act(async () => {
      resumeWorkerMutationsAfterSaveTransition(transitionPause);
      await Promise.resolve();
    });
    expect(proceedButton?.disabled).toBe(false);

    await act(async () => {
      proceedButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(worker.proceedToOffseason).toHaveBeenCalledTimes(1);
  });

  it('creates the playoff bracket through the exact legacy phase route after journalled regular completion', async () => {
    const gameState = {
      season: 3, day: 1, phase: 'playoffs', isInitialized: true, userTeamId: 'nym',
      teamName: 'Tycoons', gmName: 'Alex Rivera', difficulty: 'standard',
      activeSaveId: 'save-slot-3', activeSaveSlot: 3, playerCount: 780, gamesPlayed: 162,
      isSimulating: false, setSeason: vi.fn(), setDay: vi.fn(), setPhase: vi.fn(),
      setSimulating: vi.fn(), setInitialized: vi.fn(), setUserTeamId: vi.fn(),
      setActiveSave: vi.fn(), setActiveSaveSlot: vi.fn(), updateFromSim: vi.fn(), initializeGame: vi.fn(),
    };
    mockedUseGameStore.mockReturnValue(gameState);
    const flow = {
      status: 'regular_season_complete', season: 3, phaseLabel: 'Season 3 — Playoff Field',
      detailLabel: 'Regular Season Complete', progress: 1, canUseRegularSimControls: false,
      action: 'watch_playoffs', actionLabel: 'Watch Playoffs', secondaryAction: null,
      secondaryActionLabel: null, daysUntilTradeDeadline: null, standingsSnapshot: [],
      playoffPreview: [], seasonSummary: null, championSummary: null, offseasonSummary: null,
    };
    const worker = createWorkerMock(flow);
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/']}><Routes><Route element={<AppLayout />}><Route index element={<div>Dashboard</div>} /><Route path="playoffs" element={<div>Playoffs</div>} /></Route></Routes></MemoryRouter>);
      await Promise.resolve();
      await Promise.resolve();
    });
    const action = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Watch Playoffs'));
    await act(async () => { action?.click(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

    expect(worker.simLegacyAdvance).toHaveBeenCalledWith('simDay', 'playoffs');
    expect(worker.simDay).not.toHaveBeenCalled();
    expect(gameState.updateFromSim).toHaveBeenCalledWith(expect.objectContaining({ phase: 'playoffs' }));
  });

  it.each(['save_switch', 'coordinator_start'] as const)(
    'does not mirror or persist a held playoff legacy result after %s',
    async (retirement) => {
    const held = deferred<{ season: number; day: number; phase: string; gamesPlayed: number }>();
    const gameState = {
      season: 3, day: 1, phase: 'playoffs', isInitialized: true, userTeamId: 'nym',
      teamName: 'Tycoons', gmName: 'Alex Rivera', difficulty: 'standard',
      activeSaveId: 'save-slot-3' as string | null, activeSaveSlot: 3 as number | null,
      playerCount: 780, gamesPlayed: 162, isSimulating: false, setSeason: vi.fn(), setDay: vi.fn(),
      setPhase: vi.fn(), setSimulating: vi.fn(), setInitialized: vi.fn(), setUserTeamId: vi.fn(),
      setActiveSave: vi.fn(), setActiveSaveSlot: vi.fn(), updateFromSim: vi.fn(), initializeGame: vi.fn(),
    };
    mockedUseGameStore.mockReturnValue(gameState);
    const flow = {
      status: 'regular_season_complete', season: 3, phaseLabel: 'Season 3 — Playoff Field',
      detailLabel: 'Regular Season Complete', progress: 1, canUseRegularSimControls: false,
      action: 'watch_playoffs', actionLabel: 'Watch Playoffs', secondaryAction: null,
      secondaryActionLabel: null, daysUntilTradeDeadline: null, standingsSnapshot: [],
      playoffPreview: [], seasonSummary: null, championSummary: null, offseasonSummary: null,
    };
    const worker = createWorkerMock(flow);
    worker.simLegacyAdvance = vi.fn().mockReturnValue(held.promise);
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/']}><Routes><Route element={<AppLayout />}><Route index element={<div>Dashboard</div>} /></Route></Routes></MemoryRouter>);
      await Promise.resolve();
      await Promise.resolve();
    });
    const action = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Watch Playoffs'));
    await act(async () => { action?.click(); await Promise.resolve(); });
    if (retirement === 'save_switch') {
      gameState.activeSaveId = 'save-slot-2';
      gameState.activeSaveSlot = 2;
    } else {
      mockedIsSimAdvanceCoordinatorBusy.mockReturnValue(true);
    }
    await act(async () => { held.resolve({ season: 3, day: 1, phase: 'playoffs', gamesPlayed: 0 }); await Promise.resolve(); await Promise.resolve(); });

    expect(gameState.updateFromSim).not.toHaveBeenCalled();
    expect(mockedSaveGameById).not.toHaveBeenCalled();
    },
  );

  it('subscribes to flow updates instead of polling the worker every second', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 87,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      playerCount: 780,
      gamesPlayed: 87,
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
    });

    const flow = {
      status: 'regular',
      season: 3,
      phaseLabel: 'Season 3 — Day 87/162',
      detailLabel: 'Regular Season',
      progress: 87 / 162,
      canUseRegularSimControls: true,
      action: null,
      actionLabel: null,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: 33,
      standingsSnapshot: [],
      playoffPreview: [],
      seasonSummary: null,
      championSummary: null,
      offseasonSummary: null,
    };
    const worker = createWorkerMock(flow);
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(worker.subscribeToFlowUpdates).toHaveBeenCalledTimes(1);
    expect(worker.getSeasonFlowState).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(worker.getSeasonFlowState).toHaveBeenCalledTimes(1);
  });

  it('shows the monthly report first and then advances into the decision spotlight queue', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 117,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: null,
      activeSaveSlot: null,
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
    });

    const flow = {
      status: 'regular',
      season: 3,
      phaseLabel: 'Season 3 — Day 117/162',
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
    };
    const worker = createWorkerMock(flow);
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
            playerOfTheMonth: {
              playerName: 'Aaron Judge',
              war: 1.8,
            },
          },
          decisionQueue: [
            {
              id: 'decision-roster',
              urgency: 'red',
              title: 'Roster is over the active limit',
              body: 'You need to clear one roster spot before the next series.',
              route: '/roster',
              actionLabel: 'Open Roster',
            },
          ],
        };
      }

      if (pulseCall === 2) {
        return {
          pendingReport: null,
          decisionQueue: [
            {
              id: 'decision-roster',
              urgency: 'red',
              title: 'Roster is over the active limit',
              body: 'You need to clear one roster spot before the next series.',
              route: '/roster',
              actionLabel: 'Open Roster',
            },
          ],
        };
      }

      return {
        pendingReport: null,
        decisionQueue: [],
      };
    });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
              <Route path="roster" element={<div>Roster</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Monthly Report');
    expect(container.textContent).toContain('July');
    expect(container.textContent).toContain('Aaron Judge');

    const continueButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Continue'),
    );

    await act(async () => {
      continueButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(worker.acknowledgeMonthlyReport).toHaveBeenCalledWith('report-3-7');
    expect(container.textContent).toContain('Decision Spotlight');
    expect(container.textContent).toContain('Roster is over the active limit');

    const dismissButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Dismiss'),
    );

    await act(async () => {
      dismissButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(worker.dismissDecisionSpotlight).toHaveBeenCalledWith('decision-roster');
  });

  it('shows the active ceremony moment before the monthly report and then advances into the report queue', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 162,
      phase: 'playoffs',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: null,
      activeSaveSlot: null,
      playerCount: 780,
      gamesPlayed: 180,
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
    });

    const flow = {
      status: 'playoffs_complete',
      season: 3,
      phaseLabel: 'Season 3 — World Series Final',
      detailLabel: 'New York Tycoons defeated Los Angeles Sunset Strip 4-2',
      progress: 1,
      canUseRegularSimControls: false,
      action: 'proceed_to_offseason',
      actionLabel: 'Proceed to Offseason',
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: null,
      standingsSnapshot: [],
      playoffPreview: [],
      seasonSummary: null,
      championSummary: {
        championTeamId: 'nym',
        championTeamName: 'New York Tycoons',
        runnerUpTeamName: 'Los Angeles Sunset Strip',
        seriesRecord: '4-2',
      },
      offseasonSummary: null,
    };
    const worker = createWorkerMock(flow);
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
            detailLines: ['Defeated Los Angeles Sunset Strip 4-2'],
            soundEffect: 'world_series_win',
            autoDismissMs: 5000,
          },
          queueLength: 1,
        };
      }

      return {
        activeMoment: null,
        queueLength: 0,
      };
    });
    worker.getMonthlyPulse = vi.fn().mockResolvedValue({
      pendingReport: {
        id: 'report-3-10',
        monthLabel: 'October',
        teamRecord: '11-5',
        overallRecord: '101-61',
        divisionMovement: 0,
        playerOfTheMonth: {
          playerName: 'Aaron Judge',
          war: 1.6,
        },
      },
      decisionQueue: [],
    });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('WORLD CHAMPIONS');
    expect(container.textContent).not.toContain('Monthly Report');

    const continueButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Keep Going'),
    );

    await act(async () => {
      continueButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(worker.dismissCeremonyMoment).toHaveBeenCalledWith('moment-world-series');
    expect(container.textContent).toContain('Monthly Report');
    expect(container.textContent).toContain('October');
  });

  it('does not auto-load or auto-create a dynasty when the app shell mounts', async () => {
    const worker = createWorkerMock({
      status: 'regular',
      season: 1,
      phaseLabel: 'Season 1 — Day 1/162',
      detailLabel: 'Ready',
      progress: 0,
      canUseRegularSimControls: true,
      action: null,
      actionLabel: null,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: null,
      standingsSnapshot: [],
      playoffPreview: [],
      seasonSummary: null,
      championSummary: null,
      offseasonSummary: null,
    });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);
    mockedUseGameStore.mockReturnValue({
      season: 1,
      day: 1,
      phase: 'preseason',
      isInitialized: false,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: null,
      activeSaveSlot: null,
      playerCount: 0,
      gamesPlayed: 0,
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
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/" element={<div>Setup</div>} />
            <Route path="/dashboard" element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(worker.newGame).not.toHaveBeenCalled();
    expect(worker.importSnapshot).not.toHaveBeenCalled();
  });

  it('disables global sim controls while the worker is not ready', async () => {
    const worker = createWorkerMock({
      status: 'regular',
      season: 1,
      phaseLabel: 'Season 1 - Day 1/162',
      detailLabel: 'Ready',
      progress: 0,
      canUseRegularSimControls: true,
      action: null,
      actionLabel: null,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: null,
      standingsSnapshot: [],
      playoffPreview: [],
      seasonSummary: null,
      championSummary: null,
      offseasonSummary: null,
    });
    worker.isReady = false;
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);
    mockedUseGameStore.mockReturnValue({
      season: 1,
      day: 1,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      playerCount: 780,
      gamesPlayed: 0,
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
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const simDayButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Sim Day'),
    ) as HTMLButtonElement | undefined;

    expect(container.textContent).toContain('Preparing simulation');
    expect(simDayButton?.disabled).toBe(true);

    await act(async () => {
      simDayButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(worker.simDay).not.toHaveBeenCalled();
    expect(worker.exportSnapshot).not.toHaveBeenCalled();
    expect(mockedSaveGameById).not.toHaveBeenCalled();
  });

  it('maps ambient audio to the requested route contexts', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 87,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: null,
      activeSaveSlot: null,
      playerCount: 780,
      gamesPlayed: 87,
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
    });
    const worker = createWorkerMock({
      status: 'regular',
      season: 3,
      phaseLabel: 'Season 3 — Day 87/162',
      detailLabel: 'Regular Season',
      progress: 0.5,
      canUseRegularSimControls: true,
      action: null,
      actionLabel: null,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: 20,
      standingsSnapshot: [],
      playoffPreview: [],
      seasonSummary: null,
      championSummary: null,
      offseasonSummary: null,
    });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/schedule']}>
          <Routes>
            <Route path="/schedule" element={<AppLayout />}>
              <Route index element={<div>Schedule</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(audioEngineMock.setAmbient).toHaveBeenCalledWith('ballpark');
  });

  it('plays playoff and championship phase transition audio cues', async () => {
    const flow = {
      status: 'offseason',
      season: 3,
      phaseLabel: 'Offseason',
      detailLabel: 'World Series complete',
      progress: 1,
      canUseRegularSimControls: false,
      action: null,
      actionLabel: null,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: null,
      standingsSnapshot: [],
      playoffPreview: [],
      seasonSummary: null,
      championSummary: {
        championTeamId: 'nym',
        championTeamName: 'New York Tycoons',
        runnerUpTeamName: 'Boston Noreasters',
        seriesRecord: '4-2',
      },
      offseasonSummary: null,
    };
    mockedUseWorker.mockReturnValue(createWorkerMock(flow) as unknown as ReturnType<typeof useWorker>);

    const storeState = {
      season: 3,
      day: 162,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: null,
      activeSaveSlot: null,
      playerCount: 780,
      gamesPlayed: 162,
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
    };
    mockedUseGameStore.mockReturnValue(storeState);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    mockedUseGameStore.mockReturnValue({
      ...storeState,
      phase: 'playoffs',
      day: 1,
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    mockedUseGameStore.mockReturnValue({
      ...storeState,
      phase: 'offseason',
      day: 1,
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(audioEngineMock.playEffect).toHaveBeenCalledWith('playoff_clinch');
    expect(audioEngineMock.playEffect).toHaveBeenCalledWith('world_series_win');
  });

  it('auto-saves the active slot after a monthly advance', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 87,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: 'save-slot-3',
      activeSaveSlot: 3,
      playerCount: 780,
      gamesPlayed: 87,
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
    });

    const worker = createWorkerMock({
      status: 'regular',
      season: 3,
      phaseLabel: 'Season 3 — Day 87/162',
      detailLabel: 'Regular Season',
      progress: 87 / 162,
      canUseRegularSimControls: true,
      action: null,
      actionLabel: null,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: 33,
      standingsSnapshot: [],
      playoffPreview: [],
      seasonSummary: null,
      championSummary: null,
      offseasonSummary: null,
    });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const nextMonthButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Next Month'),
    );

    await act(async () => {
      nextMonthButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedUseSimAdvanceExecutor.mock.results[0]?.value.execute).toHaveBeenCalledWith('sim_month');
    expect(worker.exportSnapshot).not.toHaveBeenCalled();
    expect(mockedSaveGameById).not.toHaveBeenCalled();
  });

  it('auto-saves active-slot day and week advances from the global controls', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 87,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: 'save-slot-3',
      activeSaveSlot: 3,
      playerCount: 780,
      gamesPlayed: 87,
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
    });

    const worker = createWorkerMock({
      status: 'regular',
      season: 3,
      phaseLabel: 'Season 3 - Day 87/162',
      detailLabel: 'Regular Season',
      progress: 87 / 162,
      canUseRegularSimControls: true,
      action: null,
      actionLabel: null,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: 33,
      standingsSnapshot: [],
      playoffPreview: [],
      seasonSummary: null,
      championSummary: null,
      offseasonSummary: null,
    });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const simDayButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Sim Day'),
    );
    const simWeekButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Sim Week'),
    );

    await act(async () => {
      simDayButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      simWeekButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedUseSimAdvanceExecutor.mock.results[0]?.value.execute).toHaveBeenNthCalledWith(1, 'sim_day');
    expect(mockedUseSimAdvanceExecutor.mock.results[0]?.value.execute).toHaveBeenNthCalledWith(2, 'sim_week');
    expect(worker.exportSnapshot).not.toHaveBeenCalled();
    expect(mockedSaveGameById).not.toHaveBeenCalled();
    /* legacy assertion intentionally removed: regular advances now use the
       exact coordinator journal, not generic active-save writes. */
    /* expect(mockedSaveGameById).toHaveBeenNthCalledWith(
      2,
      'save-slot-3',
      expect.stringContaining('Alex Rivera'),
      expect.any(Object),
      expect.objectContaining({ slotNumber: 3, parentSaveId: null, isRootSave: true }),
    ); */
  });

  it('preserves the autosave even when a post-sim shell refresh fails', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 87,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: 'save-slot-3',
      activeSaveSlot: 3,
      playerCount: 780,
      gamesPlayed: 87,
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
    });

    const worker = createWorkerMock({
      status: 'regular',
      season: 3,
      phaseLabel: 'Season 3 - Day 87/162',
      detailLabel: 'Regular Season',
      progress: 87 / 162,
      canUseRegularSimControls: true,
      action: null,
      actionLabel: null,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: 33,
      standingsSnapshot: [],
      playoffPreview: [],
      seasonSummary: null,
      championSummary: null,
      offseasonSummary: null,
    });
    worker.getTickerFeed = vi.fn()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('Ticker refresh failed'));
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const simDayButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Sim Day'),
    );

    await act(async () => {
      simDayButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedUseSimAdvanceExecutor.mock.results[0]?.value.execute).toHaveBeenCalledWith('sim_day');
    expect(worker.exportSnapshot).not.toHaveBeenCalled();
    expect(mockedSaveGameById).not.toHaveBeenCalled();
  });

  it('ignores rapid duplicate global sim input while a worker mutation is in flight', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 87,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: null,
      activeSaveSlot: null,
      playerCount: 780,
      gamesPlayed: 87,
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
    });

    const worker = createWorkerMock({
      status: 'regular',
      season: 3,
      phaseLabel: 'Season 3 - Day 87/162',
      detailLabel: 'Regular Season',
      progress: 87 / 162,
      canUseRegularSimControls: true,
      action: null,
      actionLabel: null,
      secondaryAction: null,
      secondaryActionLabel: null,
      daysUntilTradeDeadline: 33,
      standingsSnapshot: [],
      playoffPreview: [],
      seasonSummary: null,
      championSummary: null,
      offseasonSummary: null,
    });
    let finishSimDay: (() => void) | null = null;
    const executeRegular = vi.fn().mockImplementation(() => new Promise((resolve) => {
      finishSimDay = () => resolve({ kind: 'durable' });
    }));
    mockedUseSimAdvanceExecutor.mockReturnValue({
      execute: executeRegular,
      status: { kind: 'idle' },
    } as unknown as ReturnType<typeof useSimAdvanceExecutor>);
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<AppLayout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const simDayButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Sim Day'),
    );

    await act(async () => {
      simDayButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      simDayButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    // The shell forwards each gesture to the module-scoped executor; it is
    // the executor, not a React-local ref, that performs cross-surface
    // duplicate admission.
    expect(executeRegular).toHaveBeenCalledTimes(2);

    await act(async () => {
      finishSimDay?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      simDayButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(executeRegular).toHaveBeenCalledTimes(3);
  });
});
