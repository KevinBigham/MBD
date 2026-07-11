import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  DecisionSpotlightUrgency,
  LeagueEvent,
  MonthlyPulseState,
} from '@mbd/contracts';

const URGENCY_ORDER: Record<DecisionSpotlightUrgency, number> = { red: 0, yellow: 1, blue: 2 };

interface UsePulseRouteDataOptions {
  acknowledgeMonthlyReport: (reportId: string) => Promise<unknown>;
  day: number;
  dismissDecisionSpotlight: (decisionId: string) => Promise<unknown>;
  getCurrentLeagueEvents: () => Promise<LeagueEvent[] | null | undefined>;
  getMonthlyPulse: () => Promise<MonthlyPulseState | null | undefined>;
  isInitialized: boolean;
  persistActiveSave: () => Promise<{ saved: boolean; saveName: string | null }>;
  phase: string;
  season: number;
  workerReady: boolean;
}

export function usePulseRouteData({
  acknowledgeMonthlyReport,
  day,
  dismissDecisionSpotlight,
  getCurrentLeagueEvents,
  getMonthlyPulse,
  isInitialized,
  persistActiveSave,
  phase,
  season,
  workerReady,
}: UsePulseRouteDataOptions) {
  const [pulse, setPulse] = useState<MonthlyPulseState | null>(null);
  const [leagueEvents, setLeagueEvents] = useState<LeagueEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    const [data, currentLeagueEvents] = await Promise.all([
      getMonthlyPulse(),
      getCurrentLeagueEvents(),
    ]);
    setPulse(data ?? null);
    setLeagueEvents(currentLeagueEvents ?? []);
    setLoading(false);
  }, [getCurrentLeagueEvents, getMonthlyPulse, isInitialized, workerReady]);

  useEffect(() => {
    void fetchData();
  }, [day, fetchData, phase, season]);

  const handleAcknowledge = useCallback(async () => {
    if (!pulse?.pendingReport) return;
    const result = await acknowledgeMonthlyReport(pulse.pendingReport.id);
    if (typeof result !== 'object' || result === null || !('success' in result) || !result.success) {
      return;
    }
    const persistence = await persistActiveSave();
    if (!persistence.saved) return;
    await fetchData();
  }, [acknowledgeMonthlyReport, fetchData, persistActiveSave, pulse]);

  const handleDismiss = useCallback(async (decisionId: string) => {
    const result = await dismissDecisionSpotlight(decisionId);
    if (typeof result !== 'object' || result === null || !('success' in result) || !result.success) {
      return;
    }
    const persistence = await persistActiveSave();
    if (!persistence.saved) return;
    await fetchData();
  }, [dismissDecisionSpotlight, fetchData, persistActiveSave]);

  const hasContent = Boolean(
    (pulse && (pulse.pendingReport || pulse.decisionQueue.length > 0))
    || leagueEvents.length > 0,
  );

  const sortedDecisions = useMemo(() => (
    pulse?.decisionQueue
      .slice()
      .sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]) ?? []
  ), [pulse]);

  return {
    handleAcknowledge,
    handleDismiss,
    hasContent,
    leagueEvents,
    loading,
    pulse,
    sortedDecisions,
  };
}
