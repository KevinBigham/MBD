import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { TradeResultView } from '../components/TradeResultBanner';
import {
  tradeBuilderSelectionFromAssets,
  type TradeBuilderSelection,
} from '../lib/tradeBuilderTransforms';
import type { TradeRouteMode } from '../components/TradeQuickStartPanel';
import type { TradeNegotiationView } from '@/workers/sim.worker.trade';

export interface UseTradeNegotiationStateOptions {
  selectedTeam: string;
  setSelectedTeam: (teamId: string) => void;
}

export interface UseTradeNegotiationStateResult {
  activeCounterOfferId: string | null;
  activeNegotiation: TradeNegotiationView | null;
  clearTrade: (resetTradeAssets: () => void) => void;
  linkedNegotiationId: string | null;
  preselectedPlayerId: string | null;
  resumeLinkedNegotiation: (
    openNegotiations: TradeNegotiationView[],
    openNegotiationsLoading: boolean,
    applyTradeBuilderSelection: (selection: TradeBuilderSelection) => void,
  ) => void;
  resumeNegotiation: (
    negotiation: TradeNegotiationView,
    applyTradeBuilderSelection: (selection: TradeBuilderSelection) => void,
  ) => void;
  resetBuilder: (resetTradeAssets: () => void) => void;
  selectedTeam: string;
  selectTradePartner: (teamId: string, resetTradeAssets: () => void) => void;
  setActiveCounterOfferId: (offerId: string | null) => void;
  setActiveNegotiation: (negotiation: TradeNegotiationView | null) => void;
  setSelectedTeam: (teamId: string) => void;
  setTradeResult: (result: TradeResultView | null) => void;
  applyNegotiationToBuilder: (
    negotiation: TradeNegotiationView | null,
    applyTradeBuilderSelection: (selection: TradeBuilderSelection) => void,
  ) => void;
  tradeResult: TradeResultView | null;
  tradeMode: TradeRouteMode;
  updateNegotiationDeepLink: (negotiationId: string | null) => void;
}

export function useTradeNegotiationState({
  selectedTeam,
  setSelectedTeam,
}: UseTradeNegotiationStateOptions): UseTradeNegotiationStateResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tradeResult, setTradeResult] = useState<TradeResultView | null>(null);
  const [activeNegotiation, setActiveNegotiation] = useState<TradeNegotiationView | null>(null);
  const [activeCounterOfferId, setActiveCounterOfferId] = useState<string | null>(null);

  const preselectedPlayerId = searchParams.get('playerId');
  const linkedNegotiationId = searchParams.get('negotiationId');
  const rawMode = searchParams.get('mode');
  const tradeMode: TradeRouteMode =
    rawMode === 'quick'
    || rawMode === 'builder'
    || rawMode === 'offers'
    || rawMode === 'market'
    || rawMode === 'history'
      ? rawMode
      : preselectedPlayerId
        ? 'quick'
        : 'builder';

  const updateNegotiationDeepLink = useCallback((negotiationId: string | null) => {
    const nextParams = new URLSearchParams(searchParams);
    if (negotiationId) {
      nextParams.set('negotiationId', negotiationId);
    } else {
      nextParams.delete('negotiationId');
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const resetBuilder = useCallback((resetTradeAssets: () => void) => {
    resetTradeAssets();
    setActiveCounterOfferId(null);
    setActiveNegotiation(null);
    updateNegotiationDeepLink(null);
  }, [updateNegotiationDeepLink]);

  const clearTrade = useCallback((resetTradeAssets: () => void) => {
    resetBuilder(resetTradeAssets);
    setTradeResult(null);
  }, [resetBuilder]);

  const applyNegotiationToBuilder = useCallback((
    negotiation: TradeNegotiationView | null,
    applyTradeBuilderSelection: (selection: TradeBuilderSelection) => void,
  ) => {
    if (!negotiation) {
      return;
    }
    applyTradeBuilderSelection(tradeBuilderSelectionFromAssets(
      negotiation.proposal.offeringAssets,
      negotiation.proposal.requestingAssets,
    ));
  }, []);

  const resumeNegotiation = useCallback((
    negotiation: TradeNegotiationView,
    applyTradeBuilderSelection: (selection: TradeBuilderSelection) => void,
  ) => {
    setSelectedTeam(negotiation.teamId);
    setActiveCounterOfferId(null);
    setActiveNegotiation(negotiation);
    setTradeResult({
      status: 'counter',
      message: `Resumed active talks with ${negotiation.teamName}. Adjust the package or use the negotiation controls.`,
    });
    applyNegotiationToBuilder(negotiation, applyTradeBuilderSelection);
    updateNegotiationDeepLink(negotiation.id);
  }, [applyNegotiationToBuilder, setSelectedTeam, updateNegotiationDeepLink]);

  const resumeLinkedNegotiation = useCallback((
    openNegotiations: TradeNegotiationView[],
    openNegotiationsLoading: boolean,
    applyTradeBuilderSelection: (selection: TradeBuilderSelection) => void,
  ) => {
    if (!linkedNegotiationId || openNegotiationsLoading || activeNegotiation?.id === linkedNegotiationId) {
      return;
    }
    const match = openNegotiations.find((negotiation) => negotiation.id === linkedNegotiationId);
    if (match) {
      resumeNegotiation(match, applyTradeBuilderSelection);
    }
  }, [activeNegotiation?.id, linkedNegotiationId, resumeNegotiation]);

  const selectTradePartner = useCallback((teamId: string, resetTradeAssets: () => void) => {
    resetBuilder(resetTradeAssets);
    setSelectedTeam(teamId);
    setTradeResult(null);
  }, [resetBuilder, setSelectedTeam]);

  return {
    activeCounterOfferId,
    activeNegotiation,
    clearTrade,
    linkedNegotiationId,
    preselectedPlayerId,
    resumeLinkedNegotiation,
    resumeNegotiation,
    resetBuilder,
    selectedTeam,
    tradeMode,
    selectTradePartner,
    setActiveCounterOfferId,
    setActiveNegotiation,
    setSelectedTeam,
    setTradeResult,
    applyNegotiationToBuilder,
    tradeResult,
    updateNegotiationDeepLink,
  };
}
