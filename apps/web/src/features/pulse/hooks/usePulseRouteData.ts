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
    await acknowledgeMonthlyReport(pulse.pendingReport.id);
    void fetchData();
  }, [acknowledgeMonthlyReport, fetchData, pulse]);

  const handleDismiss = useCallback(async (decisionId: string) => {
    await dismissDecisionSpotlight(decisionId);
    void fetchData();
  }, [dismissDecisionSpotlight, fetchData]);

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
