import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SimControls } from './SimControls';
import { CommandPalette } from './CommandPalette';
import { MomentCardOverlay } from './MomentCardOverlay';
import { SeasonFlowCard } from './SeasonFlowCard';
import { MonthlyPulseOverlay } from './MonthlyPulseOverlay';
import { TickerBar } from './TickerBar';
import { PressConferenceModal } from '@/features/press-room/components/PressConferenceModal';
import { TourProvider } from '@/shared/components/TourProvider';
import { KeyboardShortcutsPanel } from '@/shared/components/KeyboardShortcutsPanel';
import type { SeasonFlowState } from './seasonFlow';
import { useWorker } from '@/shared/hooks/useWorker';
import { useAudioPreferencesStore } from '@/shared/hooks/useAudioPreferencesStore';
import { logger } from '@/shared/lib/logger';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { getAudioEngine, type AmbientMode } from '@/shared/lib/audio';
import { loadGameById, saveGameById, scheduleAutoSave } from '@/shared/lib/saveSystem';
import type { CeremonyMoment, MonthlyPulseState, TickerEntry } from '@mbd/contracts';

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
  phase: string,
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

  if (
    pathname.startsWith('/settings')
    || pathname.startsWith('/offseason')
    || pathname.startsWith('/free-agency')
  ) {
    return 'office';
  }

  if (phase === 'regular' || phase === 'playoffs') {
    return 'ballpark';
  }

  return 'office';
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
  const {
    phase,
    season,
    day,
    teamName,
    gmName,
    activeSaveId,
    activeSaveSlot,
    setSimulating,
    updateFromSim,
    isInitialized,
    isSimulating,
  } = useGameStore();
  const audioMuted = useAudioPreferencesStore((state) => state.muted);
  const audioVolume = useAudioPreferencesStore((state) => state.volume);
  const effectVolume = useAudioPreferencesStore((state) => state.effectVolume);
  const ambientVolume = useAudioPreferencesStore((state) => state.ambientVolume);
  const commandPaletteOpenRef = useRef<boolean | null>(null);

  const persistActiveSave = useCallback(async (targetSeason: number) => {
    if (activeSaveId == null) {
      return;
    }

    const snapshot = await worker.exportSnapshot();
    const saveName = `${gmName} • ${teamName} • Season ${targetSeason}`;

    if (activeSaveSlot != null) {
      void scheduleAutoSave(activeSaveSlot, saveName, snapshot).catch((error) => {
        logger.error('Failed to autosave snapshot:', error);
      });
      return;
    }

    const existing = await loadGameById(activeSaveId);
    void saveGameById(activeSaveId, saveName, snapshot, {
      slotNumber: existing?.slotNumber ?? null,
      parentSaveId: existing?.parentSaveId ?? null,
      isRootSave: existing?.isRootSave ?? false,
      branchMeta: existing?.branchMeta ?? null,
    }).catch((error) => {
      logger.error('Failed to autosave snapshot:', error);
    });
  }, [activeSaveId, activeSaveSlot, gmName, teamName, worker]);

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

  const handleSim = useCallback(
    async (
      simFn: () => Promise<{ day: number; season: number; phase: string; gamesPlayed: number }>,
      options: { autoSave?: boolean } = {},
    ) => {
      if (!workerReady || !isInitialized) return;
      setSimulating(true);
      try {
        const result = await simFn();
        updateFromSim(result);
        await Promise.all([refreshSeasonFlow(), refreshCeremony(), refreshMonthlyPulse(), refreshTickerFeed()]);
        if (options.autoSave || result.phase !== phase || result.season !== season) {
          await persistActiveSave(result.season);
        }
      } catch (err) {
        logger.error('Simulation error:', err);
      } finally {
        setSimulating(false);
      }
    },
    [workerReady, isInitialized, persistActiveSave, phase, refreshCeremony, refreshMonthlyPulse, refreshSeasonFlow, season, setSimulating, updateFromSim]
  );

  const activeReport = activeMoment ? null : (monthlyPulse?.pendingReport ?? null);
  const activeDecision = activeReport ? null : (monthlyPulse?.decisionQueue[0] ?? null);
  const ambientMode = resolveAmbientMode(
    location.pathname,
    phase,
    isInitialized,
    activeReport != null || activeDecision != null,
    activeMoment != null,
  );

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
    if (commandPaletteOpenRef.current == null) {
      commandPaletteOpenRef.current = commandPaletteOpen;
      return;
    }

    if (commandPaletteOpenRef.current !== commandPaletteOpen) {
      getAudioEngine().playEffect(commandPaletteOpen ? 'modal_open' : 'modal_close');
    }

    commandPaletteOpenRef.current = commandPaletteOpen;
  }, [commandPaletteOpen]);

  const handleMonthlyReportContinue = useCallback(async () => {
    if (!activeReport) return;
    setMonthlyPulseBusy(true);
    try {
      await worker.acknowledgeMonthlyReport(activeReport.id);
      await refreshMonthlyPulse();
    } catch (err) {
      logger.error('Failed to acknowledge monthly report:', err);
    } finally {
      setMonthlyPulseBusy(false);
    }
  }, [activeReport, refreshMonthlyPulse, worker]);

  const handleMomentDismiss = useCallback(async (momentId: string) => {
    setMonthlyPulseBusy(true);
    try {
      await worker.dismissCeremonyMoment(momentId);
      await Promise.all([refreshCeremony(), refreshMonthlyPulse()]);
    } catch (err) {
      logger.error('Failed to dismiss ceremony moment:', err);
    } finally {
      setMonthlyPulseBusy(false);
    }
  }, [refreshCeremony, refreshMonthlyPulse, worker]);

  const handleDecisionDismiss = useCallback(async () => {
    if (!activeDecision) return;
    setMonthlyPulseBusy(true);
    try {
      await worker.dismissDecisionSpotlight(activeDecision.id);
      await refreshMonthlyPulse();
    } catch (err) {
      logger.error('Failed to dismiss decision spotlight:', err);
    } finally {
      setMonthlyPulseBusy(false);
    }
  }, [activeDecision, refreshMonthlyPulse, worker]);

  const handleDecisionAction = useCallback(async () => {
    if (!activeDecision) return;
    setMonthlyPulseBusy(true);
    try {
      await worker.dismissDecisionSpotlight(activeDecision.id);
      await refreshMonthlyPulse();
      navigate(activeDecision.route);
    } catch (err) {
      logger.error('Failed to handle decision spotlight action:', err);
    } finally {
      setMonthlyPulseBusy(false);
    }
  }, [activeDecision, navigate, refreshMonthlyPulse, worker]);

  const handleFlowAction = useCallback(async (actionOverride?: SeasonFlowState['action']) => {
    const nextAction = actionOverride ?? seasonFlow?.action;
    if (!nextAction) return;

    if (nextAction === 'watch_playoffs') {
      if (seasonFlow?.status === 'regular_season_complete') {
        await handleSim(() => worker.simDay());
      }
      navigate('/playoffs');
      return;
    }

    if (nextAction === 'skip_to_offseason') {
      await handleSim(() => worker.simRemainingPlayoffs());
      await handleSim(() => worker.proceedToOffseason());
      navigate('/offseason');
      return;
    }

    if (nextAction === 'proceed_to_playoffs' || nextAction === 'sim_playoffs') {
      await handleSim(() => worker.simDay());
      return;
    }

    if (nextAction === 'proceed_to_offseason') {
      await handleSim(() => worker.proceedToOffseason());
      return;
    }

    if (nextAction === 'start_next_season') {
      await handleSim(() => worker.startNextSeason());
    }
  }, [handleSim, navigate, seasonFlow?.action, seasonFlow?.status, worker]);

  const handleTickerSelect = useCallback((entry: TickerEntry) => {
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
  }, [navigate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        setShortcutsPanelOpen((prev) => !prev);
        return;
      }

      if (commandPaletteOpen || shortcutsPanelOpen || isEditableTarget(event.target) || !seasonFlow?.canUseRegularSimControls) {
        return;
      }

      if (event.code !== 'Space') {
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        void handleSim(() => worker.simWeek());
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        void handleSim(() => worker.simMonth(), { autoSave: true });
        return;
      }

      void handleSim(() => worker.simDay());
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [commandPaletteOpen, shortcutsPanelOpen, handleSim, seasonFlow?.canUseRegularSimControls, worker]);

  if (!isInitialized) {
    return <Navigate to="/" replace />;
  }

  return (
    <TourProvider>
    <div className="flex h-screen flex-col bg-dynasty-base">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent-primary focus:px-4 focus:py-2 focus:font-heading focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>
      <div className="sr-only" aria-live="polite">
        {seasonFlow?.phaseLabel ?? `Season ${season}, Day ${day}`}
        {' '}
        {seasonFlow?.detailLabel ?? phase}
      </div>
      {/* Top bar */}
      <TopBar onOpenCommandPalette={() => setCommandPaletteOpen(true)} flow={seasonFlow} />

      {/* Main area: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main id="main-content" className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          <>
            {seasonFlow && (
              <SeasonFlowCard
                flow={seasonFlow}
                actionBusy={isSimulating}
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
        onSimDay={() => handleSim(() => worker.simDay())}
        onSimWeek={() => handleSim(() => worker.simWeek())}
        onSimMonth={() => handleSim(() => worker.simMonth(), { autoSave: true })}
        onSimToPlayoffs={() => handleSim(() => worker.simToPlayoffs(), { autoSave: true })}
        onFlowAction={() => void handleFlowAction()}
        flow={seasonFlow}
      />

      {/* Command palette overlay */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      <MomentCardOverlay
        moment={activeMoment}
        busy={isSimulating || monthlyPulseBusy}
        onDismiss={(momentId) => void handleMomentDismiss(momentId)}
      />

      <MonthlyPulseOverlay
        report={activeReport}
        decision={activeDecision}
        onboardingGuide={activeReport ? monthlyPulse?.onboardingGuide ?? null : null}
        busy={isSimulating || monthlyPulseBusy}
        onContinue={() => void handleMonthlyReportContinue()}
        onDecisionDismiss={() => void handleDecisionDismiss()}
        onDecisionAction={() => void handleDecisionAction()}
      />

      <KeyboardShortcutsPanel open={shortcutsPanelOpen} onClose={() => setShortcutsPanelOpen(false)} />

      {pressConference && !activeMoment && !activeReport && !activeDecision && (
        <PressConferenceModal
          conference={pressConference}
          onRespond={async (confId, respId) => {
            await worker.respondToPressConference(confId, respId);
          }}
          onDismiss={() => setPressConference(null)}
        />
      )}
    </div>
    </TourProvider>
  );
}
