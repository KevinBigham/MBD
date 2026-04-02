import { Outlet, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SimControls } from './SimControls';
import { CommandPalette } from './CommandPalette';
import { SeasonFlowCard } from './SeasonFlowCard';
import { MonthlyPulseOverlay } from './MonthlyPulseOverlay';
import type { SeasonFlowState } from './seasonFlow';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { loadMostRecentSnapshot } from '@/shared/lib/saveSystem';
import type { MonthlyPulseState } from '@mbd/contracts';

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

export function AppLayout() {
  const navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [seasonFlow, setSeasonFlow] = useState<SeasonFlowState | null>(null);
  const [monthlyPulse, setMonthlyPulse] = useState<MonthlyPulseState | null>(null);
  const [monthlyPulseBusy, setMonthlyPulseBusy] = useState(false);
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { setSimulating, updateFromSim, initializeGame, isInitialized, isSimulating } = useGameStore();
  const initialized = useRef(false);

  const refreshSeasonFlow = useCallback(async () => {
    if (!workerReady) return;
    const next = await worker.getSeasonFlowState();
    setSeasonFlow(next as SeasonFlowState);
  }, [worker, workerReady]);

  const refreshMonthlyPulse = useCallback(async () => {
    if (!workerReady) return;
    const next = await worker.getMonthlyPulse();
    setMonthlyPulse(next as MonthlyPulseState);
  }, [worker, workerReady]);

  // Auto-initialize a new game when the worker is ready
  useEffect(() => {
    if (!workerReady || initialized.current || isInitialized) return;

    initialized.current = true;

    (async () => {
      try {
        const latestSave = await loadMostRecentSnapshot();
        if (latestSave?.snapshot) {
          const result = await worker.importSnapshot(latestSave.snapshot);
          initializeGame({
            season: result.season,
            day: result.day,
            phase: result.phase,
            playerCount: result.playerCount,
            userTeamId: result.userTeamId,
          });
          await Promise.all([refreshSeasonFlow(), refreshMonthlyPulse()]);
          return;
        }

        const result = await worker.newGame(Date.now(), 'nyy');
        initializeGame({
          season: result.season,
          day: result.day,
          phase: result.phase,
          playerCount: result.playerCount,
          userTeamId: 'nyy',
        });
        await Promise.all([refreshSeasonFlow(), refreshMonthlyPulse()]);
      } catch (err: unknown) {
        console.error('Failed to initialize game:', err);
      }
    })();
  }, [workerReady, initializeGame, isInitialized, refreshMonthlyPulse, refreshSeasonFlow, worker]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!workerReady || !isInitialized) return;

    void refreshSeasonFlow();
    void refreshMonthlyPulse();
    return worker.subscribeToFlowUpdates(() => {
      void refreshSeasonFlow();
      void refreshMonthlyPulse();
    });
  }, [isInitialized, refreshMonthlyPulse, refreshSeasonFlow, worker, workerReady]);

  const handleSim = useCallback(
    async (simFn: () => Promise<{ day: number; season: number; phase: string; gamesPlayed: number }>) => {
      if (!workerReady || !isInitialized) return;
      setSimulating(true);
      try {
        const result = await simFn();
        updateFromSim(result);
        await Promise.all([refreshSeasonFlow(), refreshMonthlyPulse()]);
      } catch (err) {
        console.error('Simulation error:', err);
      } finally {
        setSimulating(false);
      }
    },
    [workerReady, isInitialized, refreshMonthlyPulse, refreshSeasonFlow, setSimulating, updateFromSim]
  );

  const activeReport = monthlyPulse?.pendingReport ?? null;
  const activeDecision = activeReport ? null : (monthlyPulse?.decisionQueue[0] ?? null);

  const handleMonthlyReportContinue = useCallback(async () => {
    if (!activeReport) return;
    setMonthlyPulseBusy(true);
    try {
      await worker.acknowledgeMonthlyReport(activeReport.id);
      await refreshMonthlyPulse();
    } catch (err) {
      console.error('Failed to acknowledge monthly report:', err);
    } finally {
      setMonthlyPulseBusy(false);
    }
  }, [activeReport, refreshMonthlyPulse, worker]);

  const handleDecisionDismiss = useCallback(async () => {
    if (!activeDecision) return;
    setMonthlyPulseBusy(true);
    try {
      await worker.dismissDecisionSpotlight(activeDecision.id);
      await refreshMonthlyPulse();
    } catch (err) {
      console.error('Failed to dismiss decision spotlight:', err);
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
      console.error('Failed to handle decision spotlight action:', err);
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (commandPaletteOpen || isEditableTarget(event.target) || !seasonFlow?.canUseRegularSimControls) {
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
        void handleSim(() => worker.simMonth());
        return;
      }

      void handleSim(() => worker.simDay());
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [commandPaletteOpen, handleSim, seasonFlow?.canUseRegularSimControls, worker]);

  return (
    <div className="flex h-screen flex-col bg-dynasty-base">
      {/* Top bar */}
      <TopBar onOpenCommandPalette={() => setCommandPaletteOpen(true)} flow={seasonFlow} />

      {/* Main area: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          {!isInitialized ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="font-brand text-4xl text-accent-primary">MBD</div>
                <div className="mt-2 font-heading text-dynasty-muted">
                  Generating league...
                </div>
              </div>
            </div>
          ) : (
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
          )}
        </main>
      </div>

      {/* Bottom sim controls */}
      <SimControls
        onSimDay={() => handleSim(() => worker.simDay())}
        onSimWeek={() => handleSim(() => worker.simWeek())}
        onSimMonth={() => handleSim(() => worker.simMonth())}
        onSimToPlayoffs={() => handleSim(() => worker.simToPlayoffs())}
        onFlowAction={() => void handleFlowAction()}
        flow={seasonFlow}
      />

      {/* Command palette overlay */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      <MonthlyPulseOverlay
        report={activeReport}
        decision={activeDecision}
        busy={isSimulating || monthlyPulseBusy}
        onContinue={() => void handleMonthlyReportContinue()}
        onDecisionDismiss={() => void handleDecisionDismiss()}
        onDecisionAction={() => void handleDecisionAction()}
      />
    </div>
  );
}
