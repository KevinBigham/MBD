import type { ReactNode } from 'react';
import type { useTradeActionHandlers } from '../hooks/useTradeActionHandlers';
import type { useTradeAssetBuilder } from '../hooks/useTradeAssetBuilder';
import type { useTradeDialogue } from '../hooks/useTradeDialogue';
import type { useTradeMarketContext } from '../hooks/useTradeMarketContext';
import type { useTradeMultiTeamBuilder } from '../hooks/useTradeMultiTeamBuilder';
import type { useTradePackageSummary } from '../hooks/useTradePackageSummary';
import type { useTradeRouteData } from '../hooks/useTradeRouteData';
import type { TradePageContentProps } from '../components/TradePageContent';
import type { TradeResultView } from '../components/TradeResultBanner';
import type { TradeNegotiationView } from '@/workers/sim.worker.trade';
import { buildTradePageContentProps } from './tradePageContentProps';
import { fairnessLabel, fairnessRatio } from './tradeBuilderTransforms';

export interface BuildTradeRouteContentPropsInput {
  actionHandlers: ReturnType<typeof useTradeActionHandlers>;
  assetBuilder: ReturnType<typeof useTradeAssetBuilder>;
  deadlineDramaSlot: ReactNode;
  gmDialogue: ReturnType<typeof useTradeDialogue>;
  marketContext: ReturnType<typeof useTradeMarketContext>;
  multiTeamBuilder: ReturnType<typeof useTradeMultiTeamBuilder>;
  negotiation: {
    activeCounterOfferId: string | null;
    activeNegotiation: TradeNegotiationView | null;
    resumeNegotiation: (negotiation: TradeNegotiationView) => void;
    setTradeResult: (result: TradeResultView | null) => void;
    tradeResult: TradeResultView | null;
  };
  packageSummary: ReturnType<typeof useTradePackageSummary>;
  routeActions: {
    clearTrade: () => void;
    selectTradePartner: (teamId: string) => void;
  };
  routeData: ReturnType<typeof useTradeRouteData>;
  season: number;
  selectedTeam: string;
  tradeMode: 'quick' | 'builder' | 'offers' | 'market' | 'history';
  preselectedPlayerId: string | null;
}

export function buildTradeRouteContentProps({
  actionHandlers,
  assetBuilder,
  deadlineDramaSlot,
  gmDialogue,
  marketContext,
  multiTeamBuilder,
  negotiation,
  packageSummary,
  routeActions,
  routeData,
  season,
  selectedTeam,
  tradeMode,
  preselectedPlayerId,
}: BuildTradeRouteContentPropsInput): TradePageContentProps {
  return buildTradePageContentProps({
    activeCounterOfferId: negotiation.activeCounterOfferId,
    activeNegotiation: negotiation.activeNegotiation,
    conditionPlayerId: multiTeamBuilder.multiTeamConditionPlayerId,
    conditionTargets: multiTeamBuilder.multiTeamConditionTargets,
    conditions: multiTeamBuilder.multiTeamConditions,
    deadlineDramaSlot,
    deadlineState: routeData.deadlineState,
    executionResult: multiTeamBuilder.multiTeamExecutionResult,
    fairness: multiTeamBuilder.multiTeamFairness,
    filteredTargetRoster: assetBuilder.filteredTargetRoster,
    filteredYourRoster: assetBuilder.filteredYourRoster,
    gmDialogue,
    handleAcceptOffer: actionHandlers.handleAcceptOffer,
    handleAddConditionalClause: multiTeamBuilder.handleAddConditionalClause,
    handleCounterOffer: actionHandlers.handleCounterOffer,
    handleDeclineOffer: actionHandlers.handleDeclineOffer,
    handleEvaluateMultiTeamFramework: multiTeamBuilder.handleEvaluateMultiTeamFramework,
    handleExecuteMultiTeamFramework: multiTeamBuilder.handleExecuteMultiTeamFramework,
    handleProposeMultiTeamFramework: multiTeamBuilder.handleProposeMultiTeamFramework,
    handleResolveNegotiation: actionHandlers.handleResolveNegotiation,
    incomingOffers: routeData.incomingOffers,
    marketCopy: marketContext.marketCopy,
    multiTeamLanes: multiTeamBuilder.multiTeamLanes,
    multiTeamMessage: multiTeamBuilder.multiTeamMessage,
    multiTeamMovedPlayers: multiTeamBuilder.multiTeamMovedPlayers,
    multiTeamOpen: multiTeamBuilder.multiTeamOpen,
    multiTeamProposalResult: multiTeamBuilder.multiTeamProposalResult,
    multiTeamProposalTeams: multiTeamBuilder.multiTeamProposal.teams,
    multiTeamRosters: multiTeamBuilder.multiTeamRosters,
    multiTeamSubmitting: multiTeamBuilder.multiTeamSubmitting,
    offerTotal: packageSummary.offerTotal,
    offering: assetBuilder.offering,
    offeringAssetCount: assetBuilder.offeringAssets.length,
    offeringIFAAmount: assetBuilder.offeringIFAAmount,
    offeringPicks: assetBuilder.offeringPicks,
    offeringSummary: packageSummary.offeringSummary,
    onAddMultiTeamLane: multiTeamBuilder.addMultiTeamLane,
    onChangeConditionPlayer: multiTeamBuilder.setMultiTeamConditionPlayerId,
    onChangeLaneDestination: multiTeamBuilder.updateMultiTeamDestination,
    onChangeLaneTeam: multiTeamBuilder.setMultiTeamLaneTeam,
    onChangeOfferingFilter: assetBuilder.setYourAssetFilter,
    onChangeOfferingIFAAmount: assetBuilder.setOfferingIFAAmount,
    onChangeRequestingFilter: assetBuilder.setTargetAssetFilter,
    onChangeRequestingIFAAmount: assetBuilder.setRequestingIFAAmount,
    onClearTrade: routeActions.clearTrade,
    onCloseMultiTeamBuilder: multiTeamBuilder.resetMultiTeamBuilder,
    onCounterNegotiation: () => negotiation.setTradeResult({
      status: 'counter',
      message: 'Adjust the package below, then send the counter back through the room.',
    }),
    onRemoveMultiTeamLane: multiTeamBuilder.removeMultiTeamLane,
    onSelectTeam: routeActions.selectTradePartner,
    onSubmitTrade: actionHandlers.submitTrade,
    onToggleLanePlayer: multiTeamBuilder.toggleMultiTeamPlayer,
    onToggleOfferingPick: assetBuilder.toggleOfferingPick,
    onToggleOfferingPlayer: assetBuilder.toggleOffer,
    onToggleRequestingPick: assetBuilder.toggleRequestingPick,
    onToggleRequestingPlayer: assetBuilder.toggleRequest,
    openMultiTeamBuilder: multiTeamBuilder.openMultiTeamBuilder,
    openNegotiations: routeData.openNegotiations,
    openNegotiationsLoading: routeData.openNegotiationsLoading,
    otherTeams: marketContext.otherTeams,
    playerById: packageSummary.playerById,
    proposing: actionHandlers.proposing,
    quickStartProps: {
      disabledReason: marketContext.marketCopy.disabledReason,
      filteredTargetRoster: assetBuilder.filteredTargetRoster,
      filteredYourRoster: assetBuilder.filteredYourRoster,
      mode: tradeMode,
      offerTotal: packageSummary.offerTotal,
      offering: assetBuilder.offering,
      offeringSummary: packageSummary.offeringSummary,
      onSelectTeam: routeActions.selectTradePartner,
      onSubmitTrade: actionHandlers.submitTrade,
      onToggleOfferingPlayer: assetBuilder.toggleOffer,
      onToggleRequestingPlayer: assetBuilder.toggleRequest,
      otherTeams: marketContext.otherTeams,
      packageFairness: fairnessLabel(fairnessRatio(packageSummary.offerTotal, packageSummary.requestTotal)),
      preselectedPlayerId,
      proposing: actionHandlers.proposing,
      requestTotal: packageSummary.requestTotal,
      requesting: assetBuilder.requesting,
      requestingSummary: packageSummary.requestingSummary,
      selectedTeam,
      tradeMarketOpen: marketContext.tradeMarketOpen,
    },
    relationshipsByTeamId: marketContext.relationshipsByTeamId,
    requestTotal: packageSummary.requestTotal,
    requesting: assetBuilder.requesting,
    requestingAssetCount: assetBuilder.requestingAssets.length,
    requestingIFAAmount: assetBuilder.requestingIFAAmount,
    requestingPicks: assetBuilder.requestingPicks,
    requestingSummary: packageSummary.requestingSummary,
    resumeNegotiation: negotiation.resumeNegotiation,
    season,
    selectedRelationship: marketContext.selectedRelationship,
    selectedTeam,
    targetAssetFilter: assetBuilder.targetAssetFilter,
    targetInventory: routeData.targetInventory,
    targetRosterCount: routeData.targetRoster.length,
    tradeHistory: routeData.tradeHistory,
    tradeMarketOpen: marketContext.tradeMarketOpen,
    tradeResult: negotiation.tradeResult,
    yourAssetFilter: assetBuilder.yourAssetFilter,
    yourInventory: routeData.yourInventory,
    yourRosterCount: routeData.yourRoster.length,
  });
}
