import { useCallback, useEffect } from 'react';
import type { TradeNegotiationView } from '@/workers/sim.worker.trade';
import type { TradeBuilderSelection } from '../lib/tradeBuilderTransforms';

type ApplyTradeBuilderSelection = (selection: TradeBuilderSelection) => void;
type ResetTradeAssets = () => void;

interface TradeRosterPlayer {
  id: string;
}

export interface UseTradeBuilderCoordinatorOptions {
  addOfferingPlayer: (playerId: string) => void;
  applyNegotiationToBuilderState: (
    negotiation: TradeNegotiationView | null,
    applyTradeBuilderSelection: ApplyTradeBuilderSelection,
  ) => void;
  applyTradeBuilderSelection: ApplyTradeBuilderSelection;
  clearTradeState: (resetTradeAssets: ResetTradeAssets) => void;
  preselectedPlayerId: string | null;
  resetBuilderState: (resetTradeAssets: ResetTradeAssets) => void;
  resetTradeAssets: ResetTradeAssets;
  resumeNegotiationState: (
    negotiation: TradeNegotiationView,
    applyTradeBuilderSelection: ApplyTradeBuilderSelection,
  ) => void;
  selectTradePartnerState: (teamId: string, resetTradeAssets: ResetTradeAssets) => void;
  yourRoster: readonly TradeRosterPlayer[];
}

export interface UseTradeBuilderCoordinatorResult {
  applyNegotiationToBuilder: (negotiation: TradeNegotiationView | null) => void;
  clearTrade: () => void;
  resetBuilder: () => void;
  resumeNegotiation: (negotiation: TradeNegotiationView) => void;
  selectTradePartner: (teamId: string) => void;
}

export function useTradeBuilderCoordinator({
  addOfferingPlayer,
  applyNegotiationToBuilderState,
  applyTradeBuilderSelection,
  clearTradeState,
  preselectedPlayerId,
  resetBuilderState,
  resetTradeAssets,
  resumeNegotiationState,
  selectTradePartnerState,
  yourRoster,
}: UseTradeBuilderCoordinatorOptions): UseTradeBuilderCoordinatorResult {
  useEffect(() => {
    if (!preselectedPlayerId) {
      return;
    }
    if (!yourRoster.some((player) => player.id === preselectedPlayerId)) {
      return;
    }
    addOfferingPlayer(preselectedPlayerId);
  }, [addOfferingPlayer, preselectedPlayerId, yourRoster]);

  const resetBuilder = useCallback(() => {
    resetBuilderState(resetTradeAssets);
  }, [resetBuilderState, resetTradeAssets]);

  const clearTrade = useCallback(() => {
    clearTradeState(resetTradeAssets);
  }, [clearTradeState, resetTradeAssets]);

  const applyNegotiationToBuilder = useCallback((negotiation: TradeNegotiationView | null) => {
    applyNegotiationToBuilderState(negotiation, applyTradeBuilderSelection);
  }, [applyNegotiationToBuilderState, applyTradeBuilderSelection]);

  const resumeNegotiation = useCallback((negotiation: TradeNegotiationView) => {
    resumeNegotiationState(negotiation, applyTradeBuilderSelection);
  }, [applyTradeBuilderSelection, resumeNegotiationState]);

  const selectTradePartner = useCallback((teamId: string) => {
    selectTradePartnerState(teamId, resetTradeAssets);
  }, [resetTradeAssets, selectTradePartnerState]);

  return {
    applyNegotiationToBuilder,
    clearTrade,
    resetBuilder,
    resumeNegotiation,
    selectTradePartner,
  };
}
