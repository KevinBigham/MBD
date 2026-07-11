import { Clock } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { PageShell } from '@/shared/components/PageShell';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import { PulseContentPanel } from '../components/PulseContentPanel';
import { usePulseRouteData } from '../hooks/usePulseRouteData';

export default function PulsePage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const persistActiveSave = useActiveSaveAutosave();
  const { isInitialized, season, day, phase } = useGameStore();
  const {
    handleAcknowledge,
    handleDismiss,
    hasContent,
    leagueEvents,
    loading,
    pulse,
    sortedDecisions,
  } = usePulseRouteData({
    acknowledgeMonthlyReport: worker.acknowledgeMonthlyReport,
    day,
    dismissDecisionSpotlight: worker.dismissDecisionSpotlight,
    getCurrentLeagueEvents: worker.getCurrentLeagueEvents,
    getMonthlyPulse: worker.getMonthlyPulse,
    isInitialized,
    persistActiveSave,
    phase,
    season,
    workerReady,
  });

  return (
    <PageShell loading={loading}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-brand text-3xl tracking-wide text-dynasty-textBright">Monthly Pulse</h1>
          <p className="mt-1 font-data text-sm text-dynasty-muted">
            <Clock className="mr-1 inline h-3.5 w-3.5" />
            Season reports and decision spotlights
          </p>
        </div>

        <PulseContentPanel
          decisions={sortedDecisions}
          hasContent={hasContent}
          leagueEvents={leagueEvents}
          onAcknowledgeReport={handleAcknowledge}
          onDismissDecision={handleDismiss}
          pendingReport={pulse?.pendingReport ?? null}
        />
      </div>
    </PageShell>
  );
}
