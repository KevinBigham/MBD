import { Suspense, lazy, useCallback } from 'react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useExactSaveMutationExecutor } from '@/shared/hooks/useExactOffseasonMutationExecutor';
import { getAudioEngine } from '@/shared/lib/audio';
import FreeAgencyPageContent from '../components/FreeAgencyPageContent';
import type { PositionFilter } from '../components/FreeAgencyMarketBoardPanel';
import { useFreeAgencyOfferActions } from '../hooks/useFreeAgencyOfferActions';
import { useFreeAgencyRouteData } from '../hooks/useFreeAgencyRouteData';

const MarketIntelPanel = lazy(() => import('../components/MarketIntelPanel'));

export default function FreeAgencyPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { phase, isInitialized } = useGameStore();
  const routeData = useFreeAgencyRouteData({
    getFinanceOverview: worker.getFinanceOverview,
    getFreeAgents: worker.getFreeAgents,
    isInitialized,
    phase,
    workerReady,
  });
  const { setPositionFilter } = routeData;
  const acceptedOfferChanged = useCallback((result: unknown) => (
    typeof result === 'object'
      && result !== null
      && 'accepted' in result
      && (result as { accepted?: unknown }).accepted === true
  ), []);
  const executeExactMutation = useExactSaveMutationExecutor(
    worker.exactSaveMutation,
    workerReady,
    acceptedOfferChanged,
  );
  const offerActions = useFreeAgencyOfferActions({
    fetchFreeAgents: routeData.fetchFreeAgents,
    finance: routeData.finance,
    makeContractOffer: (playerId, years, salary) => executeExactMutation({
      kind: 'makeContractOffer',
      playerId,
      years,
      salary,
    }).then((result) => (result ?? { accepted: false, reason: 'The signing could not be saved.' }) as {
      accepted: boolean;
      reason?: string;
      qualifyingOfferCompensation?: {
        tier: 'premium' | 'standard';
        forfeitedRound: number;
        forfeitedOriginalTeamId: string;
      } | null;
    }),
    playEffect: (name) => getAudioEngine().playEffect(name),
    publishDurablePresentation: worker.publishDurablePresentation,
    removeAgentById: routeData.removeAgentById,
  });

  const handlePositionFilterChange = useCallback((nextFilter: PositionFilter) => {
    getAudioEngine().playEffect('tab_switch');
    setPositionFilter(nextFilter);
  }, [setPositionFilter]);

  return (
    <FreeAgencyPageContent
      marketIntelSlot={(
        <Suspense fallback={null}>
          <MarketIntelPanel />
        </Suspense>
      )}
      offerActions={offerActions}
      phase={phase}
      routeData={routeData}
      onPositionFilterChange={handlePositionFilterChange}
    />
  );
}
