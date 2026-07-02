import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { GameState } from '@/shared/hooks/useGameStore';
import type { useWorker } from '@/shared/hooks/useWorker';
import type { TradePageContentProps } from '../components/TradePageContent';
import { buildTradeRouteContentProps } from '../lib/tradeRouteContentProps';
import { useTradeActionHandlers } from './useTradeActionHandlers';
import { useTradeAssetBuilder } from './useTradeAssetBuilder';
import { useTradeBuilderCoordinator } from './useTradeBuilderCoordinator';
import { useTradeDialogue } from './useTradeDialogue';
import { useTradeMarketContext } from './useTradeMarketContext';
import { useTradeMultiTeamBuilder } from './useTradeMultiTeamBuilder';
import { useTradeNegotiationState } from './useTradeNegotiationState';
import { useTradePackageSummary } from './useTradePackageSummary';
import { useTradeResultAudio } from './useTradeResultAudio';
import { useTradeRouteData } from './useTradeRouteData';
import { useTradeSnapshotPersistence } from './useTradeSnapshotPersistence';

export type TradePageControllerWorker = Pick<
  ReturnType<typeof useWorker>,
  | 'advanceNegotiation'
  | 'evaluateMultiTeamFairness'
  | 'executeMultiTeamTrade'
  | 'exportSnapshot'
  | 'generateConditionalClause'
  | 'getOpenNegotiations'
  | 'getRelationships'
  | 'getSeasonFlowState'
  | 'getTeamRoster'
  | 'getTradeAssetInventory'
  | 'getTradeDeadlineState'
  | 'getTradeDialogue'
  | 'getTradeHistory'
  | 'isReady'
  | 'proposeMultiTeam'
  | 'resolveNegotiation'
  | 'respondToTradeOffer'
  | 'startNegotiation'
>;

export type TradePageControllerGameState = Pick<
  GameState,
  | 'activeSaveId'
  | 'activeSaveSlot'
  | 'day'
  | 'gmName'
  | 'isInitialized'
  | 'phase'
  | 'season'
  | 'teamName'
  | 'userTeamId'
>;

export interface UseTradePageControllerOptions {
  deadlineDramaSlot: ReactNode;
  game: TradePageControllerGameState;
  worker: TradePageControllerWorker;
}

export interface UseTradePageControllerResult {
  contentProps: TradePageContentProps;
  pageShellLoading: boolean;
}

export function useTradePageController({
  deadlineDramaSlot,
  game,
  worker,
}: UseTradePageControllerOptions): UseTradePageControllerResult {
  const {
    getTeamRoster,
    getTradeHistory,
    getTradeDeadlineState,
    getTradeDialogue,
    getTradeAssetInventory,
    getRelationships,
    getOpenNegotiations,
    evaluateMultiTeamFairness,
    generateConditionalClause,
    startNegotiation,
    advanceNegotiation,
    resolveNegotiation,
    proposeMultiTeam,
    executeMultiTeamTrade,
    respondToTradeOffer,
    exportSnapshot,
    getSeasonFlowState,
  } = worker;
  const {
    userTeamId,
    isInitialized,
    day,
    season,
    phase,
    activeSaveId,
    activeSaveSlot,
    gmName,
    teamName,
  } = game;

  const [selectedTeam, setSelectedTeam] = useState('');
  const {
    activeCounterOfferId,
    activeNegotiation,
    applyNegotiationToBuilder: applyNegotiationToBuilderState,
    clearTrade: clearTradeState,
    preselectedPlayerId,
    resumeLinkedNegotiation,
    resumeNegotiation: resumeNegotiationState,
    resetBuilder: resetBuilderState,
    selectTradePartner: selectTradePartnerState,
    setActiveCounterOfferId,
    setActiveNegotiation,
    setTradeResult,
    tradeMode,
    tradeResult,
    updateNegotiationDeepLink,
  } = useTradeNegotiationState({
    selectedTeam,
    setSelectedTeam,
  });
  const workerReady = worker.isReady;
  const tradeRouteData = useTradeRouteData({
    day,
    getOpenNegotiations,
    getRelationships,
    getSeasonFlowState,
    getTeamRoster,
    getTradeAssetInventory,
    getTradeDeadlineState,
    getTradeHistory,
    isInitialized,
    phase,
    season,
    selectedTeam,
    userTeamId,
    workerReady,
  });
  const {
    deadlineState,
    loadOpenNegotiations,
    loadRelationshipData,
    loadTargetInventory,
    loadTargetRoster,
    loadTradeActivity,
    loadUserInventory,
    loadUserRoster,
    loading,
    openNegotiations,
    openNegotiationsLoading,
    relationships,
    seasonFlowStatus,
    targetInventory,
    targetRoster,
    yourInventory,
    yourRoster,
  } = tradeRouteData;
  const tradeAssetBuilder = useTradeAssetBuilder({
    onTradeResultChange: setTradeResult,
    targetRoster,
    yourRoster,
  });
  const {
    addOfferingPlayer,
    applyTradeBuilderSelection,
    offeringAssets,
    offeringIFAAmount,
    requestingAssets,
    requestingIFAAmount,
    resetTradeAssets,
  } = tradeAssetBuilder;
  const tradeMarketContext = useTradeMarketContext({
    deadlineState,
    phase,
    relationships,
    seasonFlowStatus,
    selectedTeam,
    userTeamId,
  });
  const { tradeMarketOpen } = tradeMarketContext;

  const persistTradeSnapshot = useTradeSnapshotPersistence({
    activeSaveId,
    activeSaveSlot,
    exportSnapshot,
    gmName,
    season,
    teamName,
  });

  const refreshAfterMultiTeamExecution = useCallback(async () => {
    await Promise.all([
      loadUserRoster(),
      loadTargetRoster(),
      loadUserInventory(),
      loadTargetInventory(),
      loadTradeActivity(),
      loadRelationshipData(),
    ]);
  }, [
    loadRelationshipData,
    loadTargetInventory,
    loadTargetRoster,
    loadTradeActivity,
    loadUserInventory,
    loadUserRoster,
  ]);

  const multiTeamBuilder = useTradeMultiTeamBuilder({
    userTeamId,
    selectedTeam,
    yourRoster,
    targetRoster,
    isInitialized,
    workerReady,
    getTeamRoster,
    evaluateMultiTeamFairness,
    generateConditionalClause,
    proposeMultiTeam,
    executeMultiTeamTrade,
    refreshAfterExecution: refreshAfterMultiTeamExecution,
    persistTradeSnapshot,
    onTradeResultChange: setTradeResult,
  });

  const {
    applyNegotiationToBuilder,
    clearTrade,
    resetBuilder,
    resumeNegotiation,
    selectTradePartner,
  } = useTradeBuilderCoordinator({
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
  });

  const tradePackageSummary = useTradePackageSummary({
    offeringAssets,
    requestingAssets,
    season,
    targetRoster,
    yourRoster,
  });
  const { offerTotal, requestTotal } = tradePackageSummary;
  const gmDialogue = useTradeDialogue({
    activeCounterOfferId,
    getTradeDialogue,
    isInitialized,
    offerTotal,
    requestTotal,
    selectedTeam,
    tradeMarketOpen,
    workerReady,
  });

  const tradeActionHandlers = useTradeActionHandlers({
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
  });

  useEffect(() => {
    resumeLinkedNegotiation(openNegotiations, openNegotiationsLoading, applyTradeBuilderSelection);
  }, [
    applyTradeBuilderSelection,
    openNegotiations,
    openNegotiationsLoading,
    resumeLinkedNegotiation,
  ]);

  useTradeResultAudio({ tradeResult });

  return {
    contentProps: buildTradeRouteContentProps({
      actionHandlers: tradeActionHandlers,
      assetBuilder: tradeAssetBuilder,
      deadlineDramaSlot,
      gmDialogue,
      marketContext: tradeMarketContext,
      multiTeamBuilder,
      negotiation: {
        activeCounterOfferId,
        activeNegotiation,
        resumeNegotiation,
        setTradeResult,
        tradeResult,
      },
      packageSummary: tradePackageSummary,
      routeActions: {
        clearTrade,
        selectTradePartner,
      },
      routeData: tradeRouteData,
      season,
      selectedTeam,
      tradeMode,
      preselectedPlayerId,
    }),
    pageShellLoading: loading && deadlineState == null,
  };
}
