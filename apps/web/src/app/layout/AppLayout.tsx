import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SimControls } from './SimControls';
import { CommandPalette } from './CommandPalette';
import { MomentCardOverlay } from './MomentCardOverlay';
import { SeasonFlowCard } from './SeasonFlowCard';
import { MonthlyPulseOverlay } from './MonthlyPulseOverlay';
import { TickerBar } from './TickerBar';
import { PressConferenceModal } from '@/features/press-room/components/PressConferenceModal';
import { AssistantPanel } from '@/features/assistant/components/AssistantPanel';
import { TourProvider } from '@/shared/components/TourProvider';
import { KeyboardShortcutsPanel } from '@/shared/components/KeyboardShortcutsPanel';
import type { SeasonFlowState } from './seasonFlow';
import { useWorker } from '@/shared/hooks/useWorker';
import { useAudioPreferencesStore } from '@/shared/hooks/useAudioPreferencesStore';
import { logger } from '@/shared/lib/logger';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { getAudioEngine, type AmbientMode } from '@/shared/lib/audio';
import { humanizeLabel } from '@/shared/lib/labels';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import { isSimAdvanceCoordinatorBusy, useSimAdvanceExecutor } from '@/shared/hooks/useSimAdvanceExecutor';
import type { SimAdvanceOperation } from '@/shared/lib/saveSystem';
import type { CeremonyMoment, MonthlyPulseState, TickerEntry } from '@mbd/contracts';
import {
  getWorkerMutationPauseSnapshot,
  subscribeToWorkerMutationPause,
} from '@/shared/lib/workerMutationSession';

interface MonthlyPulseView extends MonthlyPulseState {
  onboardingGuide?: string | null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable
    || target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
  );
}

function resolveAmbientMode(
  pathname: string,
  initialized: boolean,
  overlayVisible: boolean,
  celebrationVisible: boolean,
): AmbientMode | null {
  if (!initialized) {
    return null;
  }

  if (celebrationVisible) {
    return 'celebration';
  }

  if (overlayVisible) {
    return 'press-room';
  }

  if (pathname.startsWith('/draft')) {
    return 'draft-room';
  }

  if (pathname.startsWith('/press-room')) {
    return 'press-room';
  }

  if (pathname.startsWith('/schedule') || pathname.startsWith('/playoffs')) {
    return 'ballpark';
  }

  if (
    pathname.startsWith('/dashboard')
    || pathname.startsWith('/finance')
    || pathname.startsWith('/settings')
    || pathname.startsWith('/offseason')
    || pathname.startsWith('/free-agency')
  ) {
    return 'office';
  }

  return 'office';
}

function workerMutationSucceeded(result: unknown): boolean {
  return !(result != null
    && typeof result === 'object'
    && 'success' in result
    && (result as { success?: unknown }).success === false);
}

function coordinatorStatusLabel(status: ReturnType<typeof useSimAdvanceExecutor>['status']): string | undefined {
  switch (status.kind) {
    case 'idle': return undefined;
    case 'preparing': return 'Preparing verified simulation';
    case 'running': return 'Simulation in progress';
    case 'persisting': return 'Saving simulation result';
    case 'retry_wait': return 'Simulation paused — retry exact save';
    case 'publishing': return 'Updating saved simulation';
    case 'rolling_back': return 'Restoring last saved state';
    case 'fail_closed': return 'Reload required';
  }
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsPanelOpen, setShortcutsPanelOpen] = useState(false);
  const [seasonFlow, setSeasonFlow] = useState<SeasonFlowState | null>(null);
  const [activeMoment, setActiveMoment] = useState<CeremonyMoment | null>(null);
  const [monthlyPulse, setMonthlyPulse] = useState<MonthlyPulseView | null>(null);
  const [tickerFeed, setTickerFeed] = useState<TickerEntry[]>([]);
  const [monthlyPulseBusy, setMonthlyPulseBusy] = useState(false);
  const [pressConference, setPressConference] = useState<{
    id: string; topic: string; question: string;
    ownerTone: 'supportive' | 'neutral' | 'impatient';
    teamId: string; season: number; day: number;
    responses: Array<{ id: string; label: string; tone: 'confident' | 'measured' | 'deflect'; quote: string; moraleDelta: number; ownerDelta: number; generatesNews: boolean }>;
  } | null>(null);
  const [pressConferenceShownForDay, setPressConferenceShownForDay] = useState<string | null>(null);
  const worker = useWorker();
  const workerReady = worker.isReady;
  const saveTransitionBusy = useSyncExternalStore(
    subscribeToWorkerMutationPause,
    getWorkerMutationPauseSnapshot,
  );
  const {
    phase,
    season,
    day,
    userTeamId,
    setSimulating,
    isInitialized,
    isSimulating,
  } = useGameStore();
  const audioMuted = useAudioPreferencesStore((state) => state.muted);
  const audioVolume = useAudioPreferencesStore((state) => state.volume);
  const effectVolume = useAudioPreferencesStore((state) => state.effectVolume);
  const ambientVolume = useAudioPreferencesStore((state) => state.ambientVolume);
  const commandPaletteOpenRef = useRef<boolean | null>(null);
  const previousPhaseRef = useRef(phase);
  const pendingWorldSeriesWinRef = useRef(false);
  const legacySimInFlightRef = useRef(false);
  const persistActiveSave = useActiveSaveAutosave();

  const refreshSeasonFlow = useCallback(async () => {
    if (!workerReady) return;
    const next = await worker.getSeasonFlowState();
    setSeasonFlow(next as SeasonFlowState);
  }, [worker, workerReady]);

  const refreshMonthlyPulse = useCallback(async () => {
    if (!workerReady) return;
    const next = await worker.getMonthlyPulse();
    setMonthlyPulse(next as MonthlyPulseView);
  }, [worker, workerReady]);

  const refreshPressConference = useCallback(async () => {
    if (!workerReady || phase !== 'regular') return;
    const dayKey = `${season}-${day}`;
    if (pressConferenceShownForDay === dayKey) return;
    try {
      const conf = await worker.getInteractivePressConference();
      if (conf) {
        setPressConference(conf as typeof pressConference);
        setPressConferenceShownForDay(dayKey);
      }
    } catch {
      // noop — press conferences are optional
    }
  }, [workerReady, phase, season, day, pressConferenceShownForDay, worker]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshTickerFeed = useCallback(async () => {
    if (!workerReady) return;
    const next = await worker.getTickerFeed(20);
    setTickerFeed(next as TickerEntry[]);
  }, [worker, workerReady]);

  const refreshCeremony = useCallback(async () => {
    if (!workerReady) return;
    const next = await worker.getCeremonyState();
    setActiveMoment(((next as { activeMoment: CeremonyMoment | null })?.activeMoment) ?? null);
  }, [worker, workerReady]);

  useEffect(() => {
    if (!workerReady || !isInitialized) return;

    void refreshSeasonFlow();
    void refreshCeremony();
    void refreshMonthlyPulse();
    void refreshTickerFeed();
    void refreshPressConference();
    return worker.subscribeToFlowUpdates(() => {
      void refreshSeasonFlow();
      void refreshCeremony();
      void refreshMonthlyPulse();
      void refreshTickerFeed();
      void refreshPressConference();
    });
  }, [isInitialized, refreshCeremony, refreshMonthlyPulse, refreshPressConference, refreshSeasonFlow, refreshTickerFeed, worker, workerReady]);

  const refreshRegularDurablePresentation = useCallback(async () => {
    // These reads are deliberately strict: they run only after the exact post
    // receipt is durable, while the coordinator still holds both lanes.
    await Promise.all([
      refreshSeasonFlow(),
      refreshCeremony(),
      refreshMonthlyPulse(),
      refreshTickerFeed(),
    ]);
    await refreshPressConference();
  }, [refreshCeremony, refreshMonthlyPulse, refreshPressConference, refreshSeasonFlow, refreshTickerFeed]);

  const regularAdvance = useSimAdvanceExecutor({
    worker: worker.simAdvance,
    workerReady,
    refreshAfterDurable: refreshRegularDurablePresentation,
  });
  const coordinatorBusy = regularAdvance.status.kind !== 'idle';

  const executeRegular = useCallback(async (operation: SimAdvanceOperation) => {
    const outcome = await regularAdvance.execute(operation);
    if (outcome.kind === 'blocked') {
      logger.info('Regular simulation command was blocked before coordinator admission.', outcome.error);
    }
    return outcome;
  }, [regularAdvance]);

  const executeLegacy = useCallback(
    async (
      simFn: () => Promise<{ day: number; season: number; phase: string; gamesPlayed: number }>,
      expectedPhase: 'playoffs' | 'offseason',
    ): Promise<boolean> => {
      const initial = useGameStore.getState();
      const capturedSaveId = initial.activeSaveId;
      if (!capturedSaveId
        || initial.phase !== expectedPhase
        || !initial.isInitialized
        || !workerReady
        || !isInitialized
        || isSimAdvanceCoordinatorBusy()
        || legacySimInFlightRef.current) return false;
      legacySimInFlightRef.current = true;
      setSimulating(true);
      try {
        const result = await simFn();
        const afterWorker = useGameStore.getState();
        if (isSimAdvanceCoordinatorBusy()
          || afterWorker.activeSaveId !== capturedSaveId
          || afterWorker.phase !== expectedPhase
          || !afterWorker.isInitialized) return false;
        const persisted = await persistActiveSave({ season: result.season });
        if (!persisted.saved
          || isSimAdvanceCoordinatorBusy()
          || useGameStore.getState().activeSaveId !== capturedSaveId) return false;
        useGameStore.getState().updateFromSim(result);
        await Promise.all([refreshSeasonFlow(), refreshCeremony(), refreshMonthlyPulse(), refreshTickerFeed()]);
        return !isSimAdvanceCoordinatorBusy()
          && useGameStore.getState().activeSaveId === capturedSaveId;
      } catch (err) {
        logger.error('Simulation error:', err);
        return false;
      } finally {
        legacySimInFlightRef.current = false;
        setSimulating(false);
      }
    },
    [coordinatorBusy, workerReady, isInitialized, persistActiveSave, refreshCeremony, refreshMonthlyPulse, refreshSeasonFlow, refreshTickerFeed, setSimulating]
  );

  const activeReport = activeMoment ? null : (monthlyPulse?.pendingReport ?? null);
  const activeDecision = activeReport ? null : (monthlyPulse?.decisionQueue[0] ?? null);
  const ambientMode = resolveAmbientMode(
    location.pathname,
    isInitialized,
    activeReport != null || activeDecision != null,
    activeMoment != null,
  );
  const persistShellMutation = useCallback(async () => {
    return persistActiveSave({ season });
  }, [persistActiveSave, season]);

  useEffect(() => {
    getAudioEngine().setVolume(audioVolume);
  }, [audioVolume]);

  useEffect(() => {
    getAudioEngine().setEffectVolume(effectVolume);
  }, [effectVolume]);

  useEffect(() => {
    getAudioEngine().setAmbientVolume(ambientVolume);
  }, [ambientVolume]);

  useEffect(() => {
    getAudioEngine().setMuted(audioMuted);
  }, [audioMuted]);

  useEffect(() => {
    getAudioEngine().setAmbient(ambientMode);
  }, [ambientMode]);

  useEffect(() => {
    if (previousPhaseRef.current === phase) {
      return;
    }

    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = phase;

    if (phase === 'playoffs') {
      getAudioEngine().playEffect('playoff_clinch');
    }

    pendingWorldSeriesWinRef.current = previousPhase === 'playoffs' && phase === 'offseason';
  }, [phase]);

  useEffect(() => {
    if (!pendingWorldSeriesWinRef.current || phase !== 'offseason') {
      return;
    }

    if (seasonFlow?.championSummary?.championTeamId === userTeamId) {
      getAudioEngine().playEffect('world_series_win');
    }

    pendingWorldSeriesWinRef.current = false;
  }, [phase, seasonFlow?.championSummary?.championTeamId, userTeamId]);

  useEffect(() => {
    if (commandPaletteOpenRef.current == null) {
      commandPaletteOpenRef.current = commandPaletteOpen;
      return;
    }

    if (commandPaletteOpenRef.current !== commandPaletteOpen) {
      getAudioEngine().playEffect(commandPaletteOpen ? 'modal_open' : 'modal_close');
    }

    commandPaletteOpenRef.current = commandPaletteOpen;
  }, [commandPaletteOpen]);

  useEffect(() => {
    if (coordinatorBusy) setCommandPaletteOpen(false);
  }, [coordinatorBusy]);

  const handleMonthlyReportContinue = useCallback(async () => {
    if (isSimAdvanceCoordinatorBusy() || !activeReport) return;
    setMonthlyPulseBusy(true);
    try {
      const result = await worker.acknowledgeMonthlyReport(activeReport.id);
      if (isSimAdvanceCoordinatorBusy()) return;
      if (workerMutationSucceeded(result)) {
        const persisted = await persistShellMutation();
        if (!persisted.saved || isSimAdvanceCoordinatorBusy()) {
          return;
        }
      }
      await refreshMonthlyPulse();
    } catch (err) {
      logger.error('Failed to acknowledge monthly report:', err);
    } finally {
      setMonthlyPulseBusy(false);
    }
  }, [activeReport, coordinatorBusy, persistShellMutation, refreshMonthlyPulse, worker]);

  const handleMonthlyReportAction = useCallback(async (route: string) => {
    if (isSimAdvanceCoordinatorBusy() || !activeReport) return;
    setMonthlyPulseBusy(true);
    try {
      const result = await worker.acknowledgeMonthlyReport(activeReport.id);
      if (isSimAdvanceCoordinatorBusy()) return;
      if (workerMutationSucceeded(result)) {
        const persisted = await persistShellMutation();
        if (!persisted.saved || isSimAdvanceCoordinatorBusy()) {
          return;
        }
      }
      await refreshMonthlyPulse();
      if (isSimAdvanceCoordinatorBusy()) return;
      navigate(route);
    } catch (err) {
      logger.error('Failed to route from monthly report:', err);
    } finally {
      setMonthlyPulseBusy(false);
    }
  }, [activeReport, coordinatorBusy, navigate, persistShellMutation, refreshMonthlyPulse, worker]);

  const handleMomentDismiss = useCallback(async (momentId: string) => {
    if (isSimAdvanceCoordinatorBusy()) return;
    setMonthlyPulseBusy(true);
    try {
      const result = await worker.dismissCeremonyMoment(momentId);
      if (isSimAdvanceCoordinatorBusy()) return;
      if (workerMutationSucceeded(result)) {
        const persisted = await persistShellMutation();
        if (!persisted.saved || isSimAdvanceCoordinatorBusy()) {
          return;
        }
      }
      await Promise.all([refreshCeremony(), refreshMonthlyPulse()]);
    } catch (err) {
      logger.error('Failed to dismiss ceremony moment:', err);
    } finally {
      setMonthlyPulseBusy(false);
    }
  }, [coordinatorBusy, persistShellMutation, refreshCeremony, refreshMonthlyPulse, worker]);

  const handleDecisionDismiss = useCallback(async () => {
    if (isSimAdvanceCoordinatorBusy() || !activeDecision) return;
    setMonthlyPulseBusy(true);
    try {
      const result = await worker.dismissDecisionSpotlight(activeDecision.id);
      if (isSimAdvanceCoordinatorBusy()) return;
      if (workerMutationSucceeded(result)) {
        const persisted = await persistShellMutation();
        if (!persisted.saved || isSimAdvanceCoordinatorBusy()) return;
      }
      await refreshMonthlyPulse();
    } catch (err) {
      logger.error('Failed to dismiss decision spotlight:', err);
    } finally {
      setMonthlyPulseBusy(false);
    }
  }, [activeDecision, coordinatorBusy, persistShellMutation, refreshMonthlyPulse, worker]);

  const handleDecisionAction = useCallback(async () => {
    if (isSimAdvanceCoordinatorBusy() || !activeDecision) return;
    setMonthlyPulseBusy(true);
    try {
      const result = await worker.dismissDecisionSpotlight(activeDecision.id);
      if (isSimAdvanceCoordinatorBusy()) return;
      if (workerMutationSucceeded(result)) {
        const persisted = await persistShellMutation();
        if (!persisted.saved || isSimAdvanceCoordinatorBusy()) return;
      }
      await refreshMonthlyPulse();
      if (isSimAdvanceCoordinatorBusy()) return;
      navigate(activeDecision.route);
    } catch (err) {
      logger.error('Failed to handle decision spotlight action:', err);
    } finally {
      setMonthlyPulseBusy(false);
    }
  }, [activeDecision, coordinatorBusy, navigate, persistShellMutation, refreshMonthlyPulse, worker]);

  const handlePressConferenceResponse = useCallback(async (conferenceId: string, responseId: string) => {
    if (isSimAdvanceCoordinatorBusy()) return false;
    const capturedSaveId = useGameStore.getState().activeSaveId;
    if (!capturedSaveId) return false;
    const result = await worker.respondToPressConference(conferenceId, responseId);
    if (isSimAdvanceCoordinatorBusy()
      || useGameStore.getState().activeSaveId !== capturedSaveId
      || !workerMutationSucceeded(result)) return false;
    if (workerMutationSucceeded(result)) {
      const persisted = await persistShellMutation();
      if (!persisted.saved || isSimAdvanceCoordinatorBusy() || useGameStore.getState().activeSaveId !== capturedSaveId) {
        return false;
      }
    }
    return true;
  }, [coordinatorBusy, persistShellMutation, worker]);

  const handleFlowAction = useCallback(async (actionOverride?: SeasonFlowState['action']) => {
    if (isSimAdvanceCoordinatorBusy()) return;
    const nextAction = actionOverride ?? seasonFlow?.action;
    if (!nextAction) return;

    if (nextAction === 'watch_playoffs') {
      if (seasonFlow?.status === 'regular_season_complete') {
        const createdBracket = await executeLegacy(
          () => worker.simLegacyAdvance('simDay', 'playoffs'),
          'playoffs',
        );
        if (!createdBracket) return;
      }
      navigate('/playoffs');
      return;
    }

    if (nextAction === 'skip_to_offseason') {
      const playoffs = await executeLegacy(() => worker.simRemainingPlayoffs(), 'playoffs');
      const offseason = playoffs && await executeLegacy(() => worker.proceedToOffseason(), 'playoffs');
      if (offseason) navigate('/offseason');
      return;
    }

    if (nextAction === 'proceed_to_playoffs' || nextAction === 'sim_playoffs') {
      await executeLegacy(() => worker.simLegacyAdvance('simDay', 'playoffs'), 'playoffs');
      return;
    }

    if (nextAction === 'proceed_to_offseason') {
      await executeLegacy(() => worker.proceedToOffseason(), 'playoffs');
      return;
    }

    if (nextAction === 'start_next_season') {
      await executeLegacy(() => worker.startNextSeason(), 'offseason');
    }
  }, [coordinatorBusy, executeLegacy, navigate, seasonFlow?.action, seasonFlow?.status, worker]);

  const handleTickerSelect = useCallback((entry: TickerEntry) => {
    if (isSimAdvanceCoordinatorBusy()) return;
    const playerId = entry.relatedPlayerIds[0];
    if (playerId) {
      navigate(`/players/${playerId}`);
      return;
    }

    if (entry.category === 'standings') {
      navigate('/standings');
      return;
    }

    if (entry.category === 'trade' || entry.category === 'rumor') {
      navigate('/trade');
      return;
    }

    navigate('/press-room');
  }, [coordinatorBusy, navigate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.documentElement.dataset.mbdModalOpen === 'true') {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (coordinatorBusy) return;
        event.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        setShortcutsPanelOpen((prev) => !prev);
        return;
      }

      if (coordinatorBusy
        || activeMoment
        || activeReport
        || activeDecision
        || pressConference
        || saveTransitionBusy
        || commandPaletteOpen
        || shortcutsPanelOpen
        || isEditableTarget(event.target)
        || !seasonFlow?.canUseRegularSimControls) {
        return;
      }

      if (event.code !== 'Space') {
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        void executeRegular('sim_week');
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        void executeRegular('sim_month');
        return;
      }

      void executeRegular('sim_day');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeDecision, activeMoment, activeReport, commandPaletteOpen, coordinatorBusy, executeRegular, pressConference, saveTransitionBusy, shortcutsPanelOpen, seasonFlow?.canUseRegularSimControls]);

  if (!isInitialized) {
    return <Navigate to="/" replace />;
  }

  return (
    <TourProvider>
    <div
      className="flex h-screen flex-col bg-dynasty-base"
      aria-busy={coordinatorBusy || undefined}
      onClickCapture={(event) => {
        if (!coordinatorBusy) return;
        const target = event.target;
        if (target instanceof Element && target.closest('a[href]')) {
          // A hard reload remains intentionally available; SPA navigation can
          // otherwise race an exact retained post/save transition.
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent-primary focus:px-4 focus:py-2 focus:font-heading focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>
      <div className="sr-only" aria-live="polite">
        {seasonFlow?.phaseLabel ?? `Season ${season}, Day ${day}`}
        {' '}
        {seasonFlow?.detailLabel ?? humanizeLabel(phase)}
      </div>
      {/* Top bar */}
      <TopBar onOpenCommandPalette={() => setCommandPaletteOpen(true)} flow={seasonFlow} />

      {/* Main area: sidebar + content */}
      {/* @ts-expect-error the deployed DOM supports inert; this repo's React DOM typings predate it. */}
      <div className="flex flex-1 overflow-hidden" aria-busy={coordinatorBusy || undefined} inert={coordinatorBusy ? '' : undefined}>
        <Sidebar />
        <main id="main-content" className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          <>
            {seasonFlow && (
              <SeasonFlowCard
                flow={seasonFlow}
                actionBusy={isSimulating || coordinatorBusy}
                onAction={() => void handleFlowAction()}
                onSecondaryAction={() => void handleFlowAction(seasonFlow.secondaryAction)}
              />
            )}
            <Outlet />
          </>
        </main>
      </div>

      <TickerBar entries={tickerFeed} onSelectEntry={handleTickerSelect} />

      {/* Bottom sim controls */}
      <SimControls
        onSimDay={() => void executeRegular('sim_day')}
        onSimWeek={() => void executeRegular('sim_week')}
        onSimMonth={() => void executeRegular('sim_month')}
        onSimToPlayoffs={() => void executeRegular('sim_to_playoffs')}
        onFlowAction={() => void handleFlowAction()}
        disabled={!workerReady || saveTransitionBusy || coordinatorBusy}
        statusLabel={coordinatorStatusLabel(regularAdvance.status)}
        flow={seasonFlow}
      />

      <AssistantPanel
        tickerFeed={tickerFeed}
        pendingMonthlyReport={activeReport != null}
        decisionQueue={monthlyPulse?.decisionQueue ?? []}
      />

      {/* Command palette overlay */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onOpenShortcuts={() => setShortcutsPanelOpen(true)}
      />

      <MomentCardOverlay
        moment={activeMoment}
        busy={isSimulating || monthlyPulseBusy || coordinatorBusy}
        onDismiss={(momentId) => void handleMomentDismiss(momentId)}
      />

      <MonthlyPulseOverlay
        report={activeReport}
        decision={activeDecision}
        onboardingGuide={activeReport ? monthlyPulse?.onboardingGuide ?? null : null}
        busy={isSimulating || monthlyPulseBusy || coordinatorBusy}
        onContinue={() => void handleMonthlyReportContinue()}
        onReportAction={(route) => void handleMonthlyReportAction(route)}
        onDecisionDismiss={() => void handleDecisionDismiss()}
        onDecisionAction={() => void handleDecisionAction()}
      />

      <KeyboardShortcutsPanel open={shortcutsPanelOpen} onClose={() => setShortcutsPanelOpen(false)} />

      {pressConference && !activeMoment && !activeReport && !activeDecision && (
        <PressConferenceModal
          conference={pressConference}
          onRespond={handlePressConferenceResponse}
          onDismiss={() => {
            if (!isSimAdvanceCoordinatorBusy()) setPressConference(null);
          }}
          disabled={coordinatorBusy}
        />
      )}
    </div>
    </TourProvider>
  );
}
