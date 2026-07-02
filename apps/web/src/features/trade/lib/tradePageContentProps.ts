import type { ComponentProps, ReactNode } from 'react';
import type { TradeCondition } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type {
  MultiTeamFairnessView,
  MultiTeamTradeExecutionResult,
  MultiTeamTradeProposalResult,
  TradeAssetInventoryView,
  TradeDeadlineStateView,
  TradeHistoryView,
  TradeNegotiationView,
  TradeOfferView,
} from '@/workers/sim.worker.trade';
import type { HotTradeOfferView, TradeDialogueView } from '../components/TradeActivityColumn';
import type { RelationshipView } from '../components/TradeBuilderContextPanel';
import type { MultiTeamFrameworkTeamView } from '../components/MultiTeamFrameworkSummaryPanel';
import type { MultiTeamLaneState } from '../components/MultiTeamLaneCard';
import type { DraftPickAsset, TradeAssetFilter } from '../components/TradeAssetSelectionGrid';
import type { TradePackageSummaryItem } from '../components/TradePackageEvaluationCard';
import type { TradeResultView } from '../components/TradeResultBanner';
import type { TradePageContentProps } from '../components/TradePageContent';
import type TradeQuickStartPanel from '../components/TradeQuickStartPanel';
import {
  ALL_TEAM_OPTIONS,
  fairnessLabel,
  fairnessRatio,
  teamDisplayName,
  type MultiTeamMovedPlayerView,
} from './tradeBuilderTransforms';

interface TradeMarketCopy {
  detail: string;
  disabledReason: string;
  headline: string;
}

interface TradeTeamOption {
  id: string;
  name: string;
  abbr: string;
}

export interface BuildTradePageContentPropsInput {
  activeCounterOfferId: string | null;
  activeNegotiation: TradeNegotiationView | null;
  conditionPlayerId: string;
  conditionTargets: MultiTeamMovedPlayerView[];
  conditions: TradeCondition[];
  deadlineDramaSlot: ReactNode;
  deadlineState: TradeDeadlineStateView | null;
  executionResult: MultiTeamTradeExecutionResult | null;
  fairness: MultiTeamFairnessView | null;
  filteredTargetRoster: PlayerDTO[];
  filteredYourRoster: PlayerDTO[];
  gmDialogue: TradeDialogueView | null;
  handleAcceptOffer: (offerId: string) => void | Promise<void>;
  handleAddConditionalClause: () => void | Promise<void>;
  handleCounterOffer: (offer: TradeOfferView) => void;
  handleDeclineOffer: (offerId: string) => void | Promise<void>;
  handleExecuteMultiTeamFramework: () => void | Promise<void>;
  handleEvaluateMultiTeamFramework: () => void | Promise<void>;
  handleProposeMultiTeamFramework: () => void | Promise<void>;
  handleResolveNegotiation: (action: 'accept' | 'reject') => void | Promise<void>;
  incomingOffers: HotTradeOfferView[];
  marketCopy: TradeMarketCopy;
  multiTeamLanes: MultiTeamLaneState[];
  multiTeamMessage: string | null;
  multiTeamMovedPlayers: MultiTeamMovedPlayerView[];
  multiTeamOpen: boolean;
  multiTeamProposalResult: MultiTeamTradeProposalResult | null;
  multiTeamProposalTeams: MultiTeamFrameworkTeamView[];
  multiTeamRosters: Record<string, PlayerDTO[]>;
  multiTeamSubmitting: boolean;
  offerTotal: number;
  offering: string[];
  offeringAssetCount: number;
  offeringIFAAmount: string;
  offeringPicks: DraftPickAsset[];
  offeringSummary: TradePackageSummaryItem[];
  onAddMultiTeamLane: () => void;
  onChangeConditionPlayer: (playerId: string) => void;
  onChangeLaneDestination: (laneId: string, playerId: string, destinationTeamId: string) => void;
  onChangeLaneTeam: (laneId: string, teamId: string) => void;
  onChangeOfferingFilter: (filter: TradeAssetFilter) => void;
  onChangeOfferingIFAAmount: (amount: string) => void;
  onChangeRequestingFilter: (filter: TradeAssetFilter) => void;
  onChangeRequestingIFAAmount: (amount: string) => void;
  onClearTrade: () => void;
  onCloseMultiTeamBuilder: () => void;
  onCounterNegotiation: () => void;
  onRemoveMultiTeamLane: (laneId: string) => void;
  onSelectTeam: (teamId: string) => void;
  onSubmitTrade: () => void | Promise<void>;
  onToggleLanePlayer: (laneId: string, playerId: string) => void;
  onToggleOfferingPick: (asset: DraftPickAsset) => void;
  onToggleOfferingPlayer: (playerId: string) => void;
  onToggleRequestingPick: (asset: DraftPickAsset) => void;
  onToggleRequestingPlayer: (playerId: string) => void;
  openMultiTeamBuilder: () => void;
  openNegotiations: TradeNegotiationView[];
  openNegotiationsLoading: boolean;
  otherTeams: TradeTeamOption[];
  playerById: (playerId: string) => PlayerDTO | undefined;
  proposing: boolean;
  quickStartProps: ComponentProps<typeof TradeQuickStartPanel>;
  relationshipsByTeamId: Map<string, RelationshipView>;
  requestTotal: number;
  requesting: string[];
  requestingAssetCount: number;
  requestingIFAAmount: string;
  requestingPicks: DraftPickAsset[];
  requestingSummary: TradePackageSummaryItem[];
  resumeNegotiation: (negotiation: TradeNegotiationView) => void;
  season: number;
  selectedRelationship: RelationshipView | null;
  selectedTeam: string;
  targetAssetFilter: TradeAssetFilter;
  targetInventory: TradeAssetInventoryView;
  targetRosterCount: number;
  tradeHistory: TradeHistoryView[];
  tradeMarketOpen: boolean;
  tradeResult: TradeResultView | null;
  yourAssetFilter: TradeAssetFilter;
  yourInventory: TradeAssetInventoryView;
  yourRosterCount: number;
}

export function buildTradePageContentProps(input: BuildTradePageContentPropsInput): TradePageContentProps {
  const packageFairnessRatio = fairnessRatio(input.offerTotal, input.requestTotal);

  return {
    deadlineDashboardProps: {
      deadlineState: input.deadlineState,
      detail: input.marketCopy.detail,
      headline: input.marketCopy.headline,
      tradeMarketOpen: input.tradeMarketOpen,
    },
    deadlineDramaSlot: input.deadlineDramaSlot,
    quickStartProps: input.quickStartProps,
    activityColumnProps: {
      activeNegotiationId: input.activeNegotiation?.id ?? null,
      incomingOffers: input.incomingOffers,
      onAcceptOffer: (offerId) => void input.handleAcceptOffer(offerId),
      onCounterOffer: input.handleCounterOffer,
      onDeclineOffer: (offerId) => void input.handleDeclineOffer(offerId),
      onResumeNegotiation: input.resumeNegotiation,
      openNegotiations: input.openNegotiations,
      openNegotiationsLoading: input.openNegotiationsLoading,
      playerById: input.playerById,
      season: input.season,
      ticker: input.deadlineState?.ticker ?? [],
      tradeHistory: input.tradeHistory,
    },
    builderStackProps: {
      builderProps: {
        activeNegotiation: input.activeNegotiation,
        contextProps: {
          activeCounterOfferId: input.activeCounterOfferId,
          disabledReason: input.marketCopy.disabledReason,
          gmDialogue: input.gmDialogue,
          onOpenMultiTeamBuilder: input.openMultiTeamBuilder,
          onSelectTeam: input.onSelectTeam,
          otherTeams: input.otherTeams,
          relationshipsByTeamId: input.relationshipsByTeamId,
          selectedRelationship: input.selectedRelationship,
          selectedTeam: input.selectedTeam,
          tradeMarketOpen: input.tradeMarketOpen,
        },
        negotiationProps: {
          dialogueMode: input.gmDialogue?.mode ?? 'buyer',
          onAccept: () => void input.handleResolveNegotiation('accept'),
          onCounter: input.onCounterNegotiation,
          onReject: () => void input.handleResolveNegotiation('reject'),
          playerById: input.playerById,
          proposing: input.proposing,
        },
        assetGridProps: {
          disabledReason: input.marketCopy.disabledReason,
          filteredTargetRoster: input.filteredTargetRoster,
          filteredYourRoster: input.filteredYourRoster,
          offering: input.offering,
          offeringIFAAmount: input.offeringIFAAmount,
          offeringPicks: input.offeringPicks,
          onChangeOfferingFilter: input.onChangeOfferingFilter,
          onChangeOfferingIFAAmount: input.onChangeOfferingIFAAmount,
          onChangeRequestingFilter: input.onChangeRequestingFilter,
          onChangeRequestingIFAAmount: input.onChangeRequestingIFAAmount,
          onToggleOfferingPick: input.onToggleOfferingPick,
          onToggleOfferingPlayer: input.onToggleOfferingPlayer,
          onToggleRequestingPick: input.onToggleRequestingPick,
          onToggleRequestingPlayer: input.onToggleRequestingPlayer,
          requesting: input.requesting,
          requestingIFAAmount: input.requestingIFAAmount,
          requestingPicks: input.requestingPicks,
          selectedTeam: input.selectedTeam,
          targetAssetFilter: input.targetAssetFilter,
          targetInventory: input.targetInventory,
          targetRosterCount: input.targetRosterCount,
          tradeMarketOpen: input.tradeMarketOpen,
          yourAssetFilter: input.yourAssetFilter,
          yourInventory: input.yourInventory,
          yourRosterCount: input.yourRosterCount,
        },
        packageEvaluationProps: {
          activeCounterOfferId: input.activeCounterOfferId,
          activeNegotiation: input.activeNegotiation != null,
          disabledReason: input.marketCopy.disabledReason,
          fairnessRatio: packageFairnessRatio,
          hasOfferingAssets: input.offeringAssetCount > 0,
          hasRequestingAssets: input.requestingAssetCount > 0,
          offerTotal: input.offerTotal,
          offeringSummary: input.offeringSummary,
          onClear: input.onClearTrade,
          onSubmit: () => void input.onSubmitTrade(),
          packageFairness: fairnessLabel(packageFairnessRatio),
          proposing: input.proposing,
          requestTotal: input.requestTotal,
          requestingSummary: input.requestingSummary,
          selectedTeam: input.selectedTeam,
          tradeMarketOpen: input.tradeMarketOpen,
        },
      },
      result: input.tradeResult,
      multiTeamModalProps: input.multiTeamOpen ? {
        lanes: input.multiTeamLanes,
        teamOptions: ALL_TEAM_OPTIONS,
        rosters: input.multiTeamRosters,
        movedPlayers: input.multiTeamMovedPlayers,
        proposalTeams: input.multiTeamProposalTeams,
        conditionPlayerId: input.conditionPlayerId,
        conditionTargets: input.conditionTargets,
        conditions: input.conditions,
        disabled: input.multiTeamSubmitting,
        fairness: input.fairness,
        message: input.multiTeamMessage,
        proposalResult: input.multiTeamProposalResult,
        executionResult: input.executionResult,
        onAddLane: input.onAddMultiTeamLane,
        onClose: input.onCloseMultiTeamBuilder,
        onRemoveLane: input.onRemoveMultiTeamLane,
        onChangeLaneTeam: input.onChangeLaneTeam,
        onToggleLanePlayer: input.onToggleLanePlayer,
        onChangeLaneDestination: input.onChangeLaneDestination,
        onAddCondition: input.handleAddConditionalClause,
        onChangeConditionPlayer: input.onChangeConditionPlayer,
        onEvaluate: input.handleEvaluateMultiTeamFramework,
        onPropose: input.handleProposeMultiTeamFramework,
        onExecute: input.handleExecuteMultiTeamFramework,
        teamDisplayName,
      } : null,
    },
  };
}
