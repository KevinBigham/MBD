import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { AudioEffectName } from '@/shared/lib/audio';
import type { SeasonRecapView, OffseasonHeadlineView } from '@/workers/sim.worker.seasonNarrative';
import type {
  OffseasonCommandCenterView,
} from '../components/OffseasonCommandCenterPanel';
import type {
  OffseasonMarketDaySummaryView,
} from '../components/OffseasonMarketDayBriefingPanel';
import type {
  OffseasonTransactionGroupView,
} from '../components/OffseasonTransactionLedgerPanel';
import type {
  OffseasonPhaseResultsView,
} from '../components/OffseasonResultSummaryGrid';
import type {
  ExtensionCandidateView,
} from '../components/OffseasonExtensionCandidatesPanel';
import type {
  QualifyingOfferEligibleView,
} from '../components/OffseasonQualifyingOffersPanel';
import type {
  SpringTrainingView,
} from '../components/OffseasonSpringTrainingPanel';
import type {
  Rule5View,
} from '../components/OffseasonRule5Panel';

export interface OffseasonData {
  currentPhase: string;
  phaseDay: number;
  totalDay: number;
  completed: boolean;
  phaseResults: OffseasonPhaseResultsView;
  transactionGroups?: OffseasonTransactionGroupView[];
  marketDaySummaries?: OffseasonMarketDaySummaryView[];
  commandCenter?: OffseasonCommandCenterView;
  rule5?: Rule5View;
}

interface UseOffseasonRouteDataOptions {
  getExtensionCandidates: (teamId?: string) => Promise<unknown>;
  getOffseasonHeadline: (season?: number) => Promise<unknown>;
  getOffseasonState: () => Promise<unknown>;
  getQualifyingOfferEligible: (teamId?: string) => Promise<unknown>;
  getQualifyingOfferSalary: () => Promise<unknown>;
  getSeasonRecap: (season?: number) => Promise<unknown>;
  getSpringTrainingView: () => Promise<unknown>;
  isInitialized: boolean;
  phase: string;
  playEffect: (name: AudioEffectName) => void;
  season: number;
  userTeamId: string | null;
  workerReady: boolean;
}

interface UseOffseasonRouteDataResult {
  applyOffseasonData: (data: OffseasonData | null) => void;
  expandedPhases: Record<string, boolean>;
  extensionCandidates: ExtensionCandidateView[];
  fetchOffseason: () => Promise<OffseasonData | null>;
  offseason: OffseasonData | null;
  offseasonHeadline: OffseasonHeadlineView | null;
  qualifyingOfferEligible: QualifyingOfferEligibleView[];
  qualifyingOfferSalary: number | null;
  seasonRecap: SeasonRecapView | null;
  setExpandedPhases: Dispatch<SetStateAction<Record<string, boolean>>>;
  springTraining: SpringTrainingView | null;
}

export function useOffseasonRouteData({
  getExtensionCandidates,
  getOffseasonHeadline,
  getOffseasonState,
  getQualifyingOfferEligible,
  getQualifyingOfferSalary,
  getSeasonRecap,
  getSpringTrainingView,
  isInitialized,
  phase,
  playEffect,
  season,
  userTeamId,
  workerReady,
}: UseOffseasonRouteDataOptions): UseOffseasonRouteDataResult {
  const [offseason, setOffseason] = useState<OffseasonData | null>(null);
  const [seasonRecap, setSeasonRecap] = useState<SeasonRecapView | null>(null);
  const [offseasonHeadline, setOffseasonHeadline] = useState<OffseasonHeadlineView | null>(null);
  const [extensionCandidates, setExtensionCandidates] = useState<ExtensionCandidateView[]>([]);
  const [qualifyingOfferEligible, setQualifyingOfferEligible] = useState<QualifyingOfferEligibleView[]>([]);
  const [qualifyingOfferSalary, setQualifyingOfferSalary] = useState<number | null>(null);
  const [springTraining, setSpringTraining] = useState<SpringTrainingView | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
  const previousResultsRef = useRef<OffseasonData['phaseResults'] | null>(null);

  const applyOffseasonData = useCallback((data: OffseasonData | null) => {
    if (!data) return;

    const previous = previousResultsRef.current;
    if (previous) {
      if (data.phaseResults.extensions.length > previous.extensions.length) {
        playEffect('extension_signed');
      }

      if (data.phaseResults.freeAgentSignings.length > previous.freeAgentSignings.length) {
        playEffect('free_agent_signed');
      }
    }

    previousResultsRef.current = data.phaseResults;
    setOffseason(data);
    setExpandedPhases((current) => {
      const next = { ...current };
      for (const group of data.transactionGroups ?? []) {
        if (!(group.phase in next)) {
          next[group.phase] = true;
        }
      }
      return next;
    });
  }, [playEffect]);

  const fetchOffseason = useCallback(async () => {
    if (!isInitialized || !workerReady) return null;
    const [data, extensionData, qualifyingOfferData, qualifyingOfferAmount, recapView, headlineView] = await Promise.all([
      getOffseasonState(),
      getExtensionCandidates(userTeamId ?? undefined),
      getQualifyingOfferEligible(userTeamId ?? undefined),
      getQualifyingOfferSalary(),
      getSeasonRecap(season),
      getOffseasonHeadline(season),
    ]);

    setExtensionCandidates((extensionData ?? []) as ExtensionCandidateView[]);
    setQualifyingOfferEligible((qualifyingOfferData ?? []) as QualifyingOfferEligibleView[]);
    setQualifyingOfferSalary(typeof qualifyingOfferAmount === 'number' ? qualifyingOfferAmount : null);
    setSeasonRecap((recapView ?? null) as SeasonRecapView | null);
    setOffseasonHeadline((headlineView ?? null) as OffseasonHeadlineView | null);

    if (data) {
      applyOffseasonData(data as OffseasonData);
      const offseasonData = data as OffseasonData;
      if (offseasonData.currentPhase === 'spring_training') {
        const stView = await getSpringTrainingView();
        setSpringTraining(stView as SpringTrainingView | null);
      } else {
        setSpringTraining(null);
      }
      return offseasonData;
    }
    return null;
  }, [
    applyOffseasonData,
    getExtensionCandidates,
    getOffseasonHeadline,
    getOffseasonState,
    getQualifyingOfferEligible,
    getQualifyingOfferSalary,
    getSeasonRecap,
    getSpringTrainingView,
    isInitialized,
    season,
    userTeamId,
    workerReady,
  ]);

  useEffect(() => {
    void fetchOffseason();
  }, [fetchOffseason, phase]);

  return {
    applyOffseasonData,
    expandedPhases,
    extensionCandidates,
    fetchOffseason,
    offseason,
    offseasonHeadline,
    qualifyingOfferEligible,
    qualifyingOfferSalary,
    seasonRecap,
    setExpandedPhases,
    springTraining,
  };
}
