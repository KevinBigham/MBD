import type { TradeAsset } from '@mbd/contracts';
import { useCallback, useState } from 'react';
import type { TradeResultView } from '../components/TradeResultBanner';
import {
  tradeBuilderSelectionFromAssetViews,
  tradeResultFromNegotiationAction,
  tradeResultFromOfferResponse,
  type TradeBuilderSelection,
  validateTradeSubmission,
} from '../lib/tradeBuilderTransforms';
import type {
  TradeAssetInventoryView,
  TradeNegotiationActionResult,
  TradeNegotiationView,
  TradeOfferResponseResult,
  TradeOfferView,
} from '@/workers/sim.worker.trade';

type TradePackage = {
  offeringAssets: TradeAsset[];
  requestingAssets: TradeAsset[];
};

function shouldPersistIncomingOfferResponse(response: TradeOfferResponseResult): boolean {
  return response.success && (
    response.decision === 'accepted'
    || response.decision === 'declined'
    || response.decision === 'countered'
  );
}

function shouldPersistNegotiationAction(result: TradeNegotiationActionResult): boolean {
  return result.success;
}

export interface UseTradeActionHandlersOptions {
  activeCounterOfferId: string | null;
  activeNegotiation: TradeNegotiationView | null;
  advanceNegotiation: (negotiationId: string, tradePackage: TradePackage) => Promise<unknown>;
  applyNegotiationToBuilder: (negotiation: TradeNegotiationView | null) => void;
  applyTradeBuilderSelection: (selection: TradeBuilderSelection) => void;
  loadOpenNegotiations: () => Promise<void>;
  loadTargetInventory: () => Promise<void>;
  loadTargetRoster: () => Promise<void>;
  loadTradeActivity: () => Promise<void>;
  loadUserInventory: () => Promise<void>;
  loadUserRoster: () => Promise<void>;
  offeringAssets: TradeAsset[];
  offeringIFAAmount: string;
  persistTradeSnapshot: () => Promise<void>;
  requestingAssets: TradeAsset[];
  requestingIFAAmount: string;
  resetBuilder: () => void;
  resolveNegotiation: (negotiationId: string, action: 'accept' | 'reject') => Promise<unknown>;
  respondToTradeOffer: (
    offerId: string,
    response: 'accept' | 'decline' | 'counter',
    counterPackage?: TradePackage,
  ) => Promise<unknown>;
  selectedTeam: string;
  setActiveCounterOfferId: (offerId: string | null) => void;
  setActiveNegotiation: (negotiation: TradeNegotiationView | null) => void;
  setSelectedTeam: (teamId: string) => void;
  setTradeResult: (result: TradeResultView | null) => void;
  startNegotiation: (
    offeringAssets: TradeAsset[],
    requestingAssets: TradeAsset[],
    selectedTeam: string,
  ) => Promise<unknown>;
  targetInventory: TradeAssetInventoryView;
  tradeMarketOpen: boolean;
  updateNegotiationDeepLink: (negotiationId: string | null) => void;
  yourInventory: TradeAssetInventoryView;
}

interface UseTradeActionHandlersResult {
  proposing: boolean;
  submitTrade: () => Promise<void>;
  handleResolveNegotiation: (action: 'accept' | 'reject') => Promise<void>;
  handleAcceptOffer: (offerId: string) => Promise<void>;
  handleDeclineOffer: (offerId: string) => Promise<void>;
  handleCounterOffer: (offer: TradeOfferView) => void;
}

export function useTradeActionHandlers({
  activeCounterOfferId,
  activeNegotiation,
  advanceNegotiation,
  applyNegotiationToBuilder,
  applyTradeBuilderSelection,
  loadOpenNegotiations,
  loadTargetInventory,
  loadTargetRoster,
  loadTradeActivity,
  loadUserInventory,
  loadUserRoster,
  offeringAssets,
  offeringIFAAmount,
  persistTradeSnapshot,
  requestingAssets,
  requestingIFAAmount,
  resetBuilder,
  resolveNegotiation,
  respondToTradeOffer,
  selectedTeam,
  setActiveCounterOfferId,
  setActiveNegotiation,
  setSelectedTeam,
  setTradeResult,
  startNegotiation,
  targetInventory,
  tradeMarketOpen,
  updateNegotiationDeepLink,
  yourInventory,
}: UseTradeActionHandlersOptions): UseTradeActionHandlersResult {
  const [proposing, setProposing] = useState(false);

  const refreshTradeWorkspace = useCallback(async (persistSnapshot: boolean) => {
    const refreshTasks: Array<Promise<void>> = [
      loadUserRoster(),
      loadTargetRoster(),
      loadUserInventory(),
      loadTargetInventory(),
      loadTradeActivity(),
      loadOpenNegotiations(),
    ];

    if (persistSnapshot) {
      refreshTasks.push(persistTradeSnapshot());
    }

    await Promise.all(refreshTasks);
  }, [
    loadOpenNegotiations,
    loadTargetInventory,
    loadTargetRoster,
    loadTradeActivity,
    loadUserInventory,
    loadUserRoster,
    persistTradeSnapshot,
  ]);

  const submitTrade = useCallback(async () => {
    const validation = validateTradeSubmission({
      selectedTeam,
      offeringAssetCount: offeringAssets.length,
      requestingAssetCount: requestingAssets.length,
      tradeMarketOpen,
      offeringIFAAmount,
      requestingIFAAmount,
      userIFARemaining: yourInventory.ifaRemaining,
      targetIFARemaining: targetInventory.ifaRemaining,
    });
    if (!validation.ok) {
      if (validation.result) {
        setTradeResult(validation.result);
      }
      return;
    }

    setProposing(true);
    let shouldPersistSnapshot = false;
    try {
      if (activeCounterOfferId) {
        const result = await respondToTradeOffer(activeCounterOfferId, 'counter', {
          offeringAssets,
          requestingAssets,
        });
        const response = result as TradeOfferResponseResult;
        shouldPersistSnapshot = shouldPersistIncomingOfferResponse(response);
        setActiveNegotiation(null);
        setTradeResult(tradeResultFromOfferResponse(response));
        resetBuilder();
      } else if (activeNegotiation) {
        const result = await advanceNegotiation(activeNegotiation.id, {
          offeringAssets,
          requestingAssets,
        }) as TradeNegotiationActionResult;
        shouldPersistSnapshot = shouldPersistNegotiationAction(result);
        setTradeResult(tradeResultFromNegotiationAction(result));
        setActiveNegotiation(result.negotiation);
        applyNegotiationToBuilder(result.negotiation);
        updateNegotiationDeepLink(result.negotiation?.id ?? null);
        if (result.tradeExecuted) {
          resetBuilder();
        }
      } else {
        const result = await startNegotiation(
          offeringAssets,
          requestingAssets,
          selectedTeam,
        ) as TradeNegotiationActionResult;
        shouldPersistSnapshot = shouldPersistNegotiationAction(result);
        setTradeResult(tradeResultFromNegotiationAction(result));
        setActiveNegotiation(result.negotiation);
        applyNegotiationToBuilder(result.negotiation);
        updateNegotiationDeepLink(result.negotiation?.id ?? null);
        if (result.tradeExecuted) {
          resetBuilder();
        }
      }

      await refreshTradeWorkspace(shouldPersistSnapshot);
    } finally {
      setProposing(false);
    }
  }, [
    activeCounterOfferId,
    activeNegotiation,
    advanceNegotiation,
    applyNegotiationToBuilder,
    offeringAssets,
    offeringIFAAmount,
    refreshTradeWorkspace,
    requestingAssets,
    requestingIFAAmount,
    resetBuilder,
    respondToTradeOffer,
    selectedTeam,
    setActiveNegotiation,
    setTradeResult,
    startNegotiation,
    targetInventory.ifaRemaining,
    tradeMarketOpen,
    updateNegotiationDeepLink,
    yourInventory.ifaRemaining,
  ]);

  const handleResolveNegotiation = useCallback(async (action: 'accept' | 'reject') => {
    if (!activeNegotiation) {
      return;
    }
    setProposing(true);
    try {
      const result = await resolveNegotiation(activeNegotiation.id, action) as TradeNegotiationActionResult;
      setTradeResult(tradeResultFromNegotiationAction(result));
      setActiveNegotiation(result.negotiation);
      updateNegotiationDeepLink(result.negotiation?.id ?? null);
      if (result.tradeExecuted || action === 'reject') {
        resetBuilder();
      }
      await refreshTradeWorkspace(shouldPersistNegotiationAction(result));
    } finally {
      setProposing(false);
    }
  }, [
    activeNegotiation,
    refreshTradeWorkspace,
    resetBuilder,
    resolveNegotiation,
    setActiveNegotiation,
    setTradeResult,
    updateNegotiationDeepLink,
  ]);

  const handleAcceptOffer = useCallback(async (offerId: string) => {
    setProposing(true);
    try {
      const result = await respondToTradeOffer(offerId, 'accept');
      const response = result as TradeOfferResponseResult;
      setTradeResult(tradeResultFromOfferResponse(response));
      await Promise.all([
        loadUserRoster(),
        loadTargetRoster(),
        loadUserInventory(),
        loadTargetInventory(),
        loadTradeActivity(),
        shouldPersistIncomingOfferResponse(response) ? persistTradeSnapshot() : Promise.resolve(),
      ]);
    } finally {
      setProposing(false);
    }
  }, [
    loadTargetInventory,
    loadTargetRoster,
    loadTradeActivity,
    loadUserInventory,
    loadUserRoster,
    persistTradeSnapshot,
    respondToTradeOffer,
    setTradeResult,
  ]);

  const handleDeclineOffer = useCallback(async (offerId: string) => {
    setProposing(true);
    try {
      const result = await respondToTradeOffer(offerId, 'decline');
      const response = result as TradeOfferResponseResult;
      setTradeResult(tradeResultFromOfferResponse(response));
      await Promise.all([
        loadTradeActivity(),
        shouldPersistIncomingOfferResponse(response) ? persistTradeSnapshot() : Promise.resolve(),
      ]);
    } finally {
      setProposing(false);
    }
  }, [loadTradeActivity, persistTradeSnapshot, respondToTradeOffer, setTradeResult]);

  const handleCounterOffer = useCallback((offer: TradeOfferView) => {
    setSelectedTeam(offer.fromTeamId);
    applyTradeBuilderSelection(tradeBuilderSelectionFromAssetViews(
      offer.requestingAssets,
      offer.offeringAssets,
    ));
    setActiveCounterOfferId(offer.id);
    setTradeResult(null);
  }, [applyTradeBuilderSelection, setActiveCounterOfferId, setSelectedTeam, setTradeResult]);

  return {
    proposing,
    submitTrade,
    handleResolveNegotiation,
    handleAcceptOffer,
    handleDeclineOffer,
    handleCounterOffer,
  };
}
