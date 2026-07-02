import { Suspense, lazy, useCallback } from 'react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import { getAudioEngine } from '@/shared/lib/audio';
import FreeAgencyPageContent from '../components/FreeAgencyPageContent';
import type { PositionFilter } from '../components/FreeAgencyMarketBoardPanel';
import { useFreeAgencyOfferActions } from '../hooks/useFreeAgencyOfferActions';
import { useFreeAgencyRouteData } from '../hooks/useFreeAgencyRouteData';

const MarketIntelPanel = lazy(() => import('../components/MarketIntelPanel'));

export default function FreeAgencyPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { phase, isInitialized, season } = useGameStore();
  const autosaveActiveGame = useActiveSaveAutosave();
  const routeData = useFreeAgencyRouteData({
    getFinanceOverview: worker.getFinanceOverview,
    getFreeAgents: worker.getFreeAgents,
    isInitialized,
    phase,
    workerReady,
  });
  const { setPositionFilter } = routeData;
  const offerActions = useFreeAgencyOfferActions({
    autosaveActiveGame,
    fetchFreeAgents: routeData.fetchFreeAgents,
    finance: routeData.finance,
    makeContractOffer: worker.makeContractOffer,
    playEffect: (name) => getAudioEngine().playEffect(name),
    removeAgentById: routeData.removeAgentById,
    season,
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
