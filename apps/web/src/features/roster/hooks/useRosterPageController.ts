import { useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import type { useWorker } from '@/shared/hooks/useWorker';
import type RosterPageContent from '../components/RosterPageContent';
import type { RosterTab } from '../components/RosterTabs';
import { buildHitterColumns, buildPitcherColumns } from '../lib/rosterMlbColumns';
import { useRosterRouteData } from './useRosterRouteData';
import { useRosterActionHandlers } from './useRosterActionHandlers';
import { useRosterExtensionNegotiation } from './useRosterExtensionNegotiation';
import { useRosterLineupControls } from './useRosterLineupControls';

type WorkerHook = ReturnType<typeof useWorker>;

type RosterPageWorker = Pick<
  WorkerHook,
  | 'claimOffWaivers'
  | 'demotePlayer'
  | 'designateForAssignment'
  | 'getAffiliateOverview'
  | 'getExtensionCandidates'
  | 'getExtensionOffer'
  | 'getFullRoster'
  | 'getPromotionCandidates'
  | 'getRosterComplianceIssues'
  | 'getRosterPlan'
  | 'getTeamChemistry'
  | 'isReady'
  | 'negotiateExtension'
  | 'promotePlayer'
  | 'updateRosterPlan'
>;

interface RosterPageGameState {
  activeSaveId: string | null;
  activeSaveSlot: number | null;
  day: number;
  isInitialized: boolean;
  phase: string;
  season: number;
  userTeamId: string;
}

interface UseRosterPageControllerOptions {
  autosaveActiveGame: (context?: { season?: number }) => Promise<unknown>;
  game: RosterPageGameState;
  worker: RosterPageWorker;
}

interface UseRosterPageControllerResult {
  contentProps: ComponentProps<typeof RosterPageContent>;
}

export function useRosterPageController({
  autosaveActiveGame,
  game,
  worker,
}: UseRosterPageControllerOptions): UseRosterPageControllerResult {
  const {
    activeSaveId,
    activeSaveSlot,
    day,
    isInitialized,
    phase,
    season,
    userTeamId,
  } = game;
  const workerReady = worker.isReady;
  const [activeTab, setActiveTab] = useState<RosterTab>('mlb');
  const {
    affiliateOverview,
    chemistry,
    compliance,
    extensionCandidates,
    fetchRoster,
    minors,
    mlbRoster,
    promotionCandidates,
    rosterPlan,
    setRosterPlan,
  } = useRosterRouteData({
    day,
    getAffiliateOverview: worker.getAffiliateOverview,
    getExtensionCandidates: worker.getExtensionCandidates,
    getFullRoster: worker.getFullRoster,
    getPromotionCandidates: worker.getPromotionCandidates,
    getRosterComplianceIssues: worker.getRosterComplianceIssues,
    getRosterPlan: worker.getRosterPlan,
    getTeamChemistry: worker.getTeamChemistry,
    isInitialized,
    phase,
    season,
    userTeamId,
    workerReady,
  });
  const {
    actionMessage,
    busyAction,
    claimWaiver,
    clearPendingRosterAction,
    confirmRosterAction,
    openDemoteAction,
    openDfaAction,
    openPromoteAction,
    openPromotionCandidateAction,
    pendingRosterAction,
  } = useRosterActionHandlers({
    autosaveActiveGame,
    claimOffWaivers: worker.claimOffWaivers,
    demotePlayer: worker.demotePlayer,
    designateForAssignment: worker.designateForAssignment,
    fetchRoster,
    promotePlayer: worker.promotePlayer,
    season,
  });
  const {
    closeNegotiation,
    extensionBusyAction,
    extensionOffer,
    negotiationResponse,
    offerNoTrade,
    offerOptOut,
    offerSalary,
    offerSigningBonus,
    offerYears,
    openNegotiation,
    selectedExtension,
    setOfferNoTrade,
    setOfferOptOut,
    setOfferSalary,
    setOfferSigningBonus,
    setOfferYears,
    submitExtensionOffer,
  } = useRosterExtensionNegotiation({
    autosaveActiveGame,
    fetchRoster,
    getExtensionOffer: worker.getExtensionOffer,
    negotiateExtension: worker.negotiateExtension,
    season,
  });

  const {
    hitters,
    lineupPanelProps,
    pitchers,
  } = useRosterLineupControls({
    activeSaveId,
    activeSaveSlot,
    autosaveActiveGame,
    mlbRoster,
    rosterPlan,
    season,
    setRosterPlan,
    updateRosterPlan: worker.updateRosterPlan,
    userTeamId,
  });

  const hitterColumns = useMemo(
    () => buildHitterColumns({ busyAction, onDemotePlayer: openDemoteAction }),
    [busyAction, openDemoteAction],
  );

  const pitcherColumns = useMemo(
    () => buildPitcherColumns({ busyAction, onDemotePlayer: openDemoteAction }),
    [busyAction, openDemoteAction],
  );

  return {
    contentProps: {
      activeTab,
      onChangeTab: setActiveTab,
      statusPanelProps: {
        activeRosterCount: mlbRoster.length,
        actionMessage,
        chemistry,
      },
      mlbControlPanelProps: {
        compliance,
        busyAction,
        hitters,
        pitchers,
        hitterColumns,
        pitcherColumns,
        onRequestDfa: openDfaAction,
      },
      minorsPanelProps: {
        promotionCandidates,
        affiliateOverview,
        minors,
        busyAction,
        onRequestPromotion: openPromotionCandidateAction,
        onPromotePlayer: openPromoteAction,
        onClaimWaiver: claimWaiver,
      },
      contractsPanelProps: {
        candidates: extensionCandidates,
        onOpenNegotiation: (candidate) => void openNegotiation(candidate),
      },
      actionConfirmationModalProps: pendingRosterAction ? {
        action: pendingRosterAction,
        busyAction,
        onCancel: clearPendingRosterAction,
        onConfirm: () => void confirmRosterAction(),
      } : null,
      extensionNegotiationModalProps: selectedExtension && extensionOffer ? {
        candidate: selectedExtension,
        offer: extensionOffer,
        offerYears,
        offerSalary,
        offerSigningBonus,
        offerNoTrade,
        offerOptOut,
        negotiationResponse,
        busyAction: extensionBusyAction ?? busyAction,
        onClose: closeNegotiation,
        onSubmit: () => void submitExtensionOffer(),
        onOfferYearsChange: setOfferYears,
        onOfferSalaryChange: setOfferSalary,
        onOfferSigningBonusChange: setOfferSigningBonus,
        onOfferNoTradeChange: setOfferNoTrade,
        onOfferOptOutChange: setOfferOptOut,
      } : null,
      lineupPanelProps,
    },
  };
}
