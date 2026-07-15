import { useCallback, type ReactNode } from 'react';
import { getAudioEngine, type AudioEffectName } from '@/shared/lib/audio';
import type { DraftPageContentProps } from '../components/DraftPageContent';
import { useDraftActionHandlers } from './useDraftActionHandlers';
import { useDraftRouteData } from './useDraftRouteData';
import type {
  DraftRoomPick,
  DraftRoomView,
} from '@/workers/sim.worker.helpers';
import {
  useExactSaveMutationExecutor,
  type ExactOffseasonMutationWorker,
} from '@/shared/hooks/useExactOffseasonMutationExecutor';

function playDraftEffect(name: AudioEffectName) {
  getAudioEngine().playEffect(name);
}

function statusText(view: DraftRoomView | null, phase: string, offseasonPhase: string | null): string {
  if (phase !== 'offseason' || offseasonPhase !== 'draft') return 'Draft Unavailable';
  if (!view || view.status === 'available') return 'Draft Available';
  if (view.status === 'complete') return 'Draft Complete';
  return 'Draft In Progress';
}

function formatProgress(view: DraftRoomView | null, visiblePicks: DraftRoomPick[]): string {
  if (!view) return '';

  if (visiblePicks.length > 0) {
    const latest = visiblePicks[visiblePicks.length - 1]!;
    return `Round ${latest.round} of ${view.counts.totalRounds} — Pick ${latest.pickNumber} of ${view.counts.totalPicks}`;
  }

  if (view.currentPick) {
    return `Round ${view.currentPick.round} of ${view.counts.totalRounds} — Pick ${view.currentPick.pickNumber} of ${view.counts.totalPicks}`;
  }

  return `0 of ${view.counts.totalPicks}`;
}

interface DraftPageWorker {
  getDraftClass: () => Promise<unknown>;
  getDraftCommentary: (visiblePickCount?: number) => Promise<unknown>;
  getDraftPostDraftGrades: () => Promise<unknown>;
  getDraftProspectReaction: (prospectId: string) => Promise<unknown>;
  getOffseasonState?: () => Promise<unknown>;
  isReady: boolean;
  exactSaveMutation: ExactOffseasonMutationWorker<unknown>;
  makeDraftPick: (prospectId: string) => Promise<unknown>;
  scoutDraftPlayer: (prospectId: string) => Promise<unknown>;
  signDraftPick: (playerId: string, offeredBonus: number) => Promise<unknown>;
  simulateRemainingDraft: () => Promise<unknown>;
  startDraft: () => Promise<unknown>;
  toggleDraftBigBoard: (prospectId: string) => Promise<unknown>;
}

export interface UseDraftPageControllerOptions {
  autosaveActiveGame: (context: { season: number }) => Promise<unknown>;
  isInitialized: boolean;
  nudgeCard: ReactNode;
  phase: string;
  playEffect?: (name: AudioEffectName) => void;
  season: number;
  worker: DraftPageWorker;
}

interface UseDraftPageControllerResult {
  contentProps: DraftPageContentProps;
}

export function useDraftPageController({
  autosaveActiveGame,
  isInitialized,
  nudgeCard,
  phase,
  playEffect = playDraftEffect,
  season,
  worker,
}: UseDraftPageControllerOptions): UseDraftPageControllerResult {
  const {
    commentary,
    draft,
    gradesView,
    loadDraft,
    offseasonPhase,
    reaction,
    selectedProspect,
    selectedProspectId,
    setDraft,
    setRevealedPickCount,
    setSelectedProspectId,
    setWatchTargetCount,
    visiblePicks,
    watching,
  } = useDraftRouteData({
    getDraftClass: worker.getDraftClass,
    getDraftCommentary: worker.getDraftCommentary,
    getDraftPostDraftGrades: worker.getDraftPostDraftGrades,
    getDraftProspectReaction: worker.getDraftProspectReaction,
    getOffseasonState: worker.getOffseasonState,
    isInitialized,
    phase,
    playEffect,
    season,
    workerReady: worker.isReady,
  });
  const exactDraftResultChanged = useCallback((result: unknown) => (
    typeof result === 'object'
      && result !== null
      && 'success' in result
      && (result as { success?: unknown }).success === true
      && (!('flowStateChanged' in result)
        || (result as { flowStateChanged?: unknown }).flowStateChanged !== false)
  ), []);
  const executeExactDraftMutation = useExactSaveMutationExecutor(
    worker.exactSaveMutation,
    worker.isReady,
    exactDraftResultChanged,
  );
  const {
    bonusOffers,
    error,
    handleBonusOfferChange,
    handleMakePick,
    handleScoutProspect,
    handleSignDraftPick,
    handleStartDraft,
    handleToggleBigBoard,
    handleWatchDraft,
    loading,
    scouting,
    signingPlayerId,
  } = useDraftActionHandlers({
    autosaveActiveGame,
    gameplayMutationsAreDurable: true,
    loadDraft,
    makeDraftPick: (prospectId) => executeExactDraftMutation({ kind: 'makeDraftPick', prospectId }),
    scoutDraftPlayer: worker.scoutDraftPlayer,
    selectedProspect,
    season,
    setDraft,
    setRevealedPickCount,
    setWatchTargetCount,
    signDraftPick: (playerId, bonusAmount) => executeExactDraftMutation({ kind: 'signDraftPick', playerId, bonusAmount }),
    simulateRemainingDraft: () => executeExactDraftMutation({ kind: 'simulateRemainingDraft' }),
    startDraft: () => executeExactDraftMutation({ kind: 'startDraft' }),
    toggleDraftBigBoard: worker.toggleDraftBigBoard,
  });

  const status = statusText(draft, phase, offseasonPhase);
  const progressLabel = formatProgress(draft, visiblePicks);

  if (phase !== 'offseason' || offseasonPhase !== 'draft') {
    return {
      contentProps: {
        availabilityPanelProps: {
          error: null,
          loading: false,
          onStartDraft: handleStartDraft,
          season,
          status,
          variant: 'unavailable',
        },
        nudgeCard,
        roomContentProps: null,
      },
    };
  }

  if (!draft || draft.status === 'available') {
    return {
      contentProps: {
        availabilityPanelProps: {
          error,
          loading,
          onStartDraft: handleStartDraft,
          season,
          status,
          variant: 'available',
        },
        nudgeCard,
        roomContentProps: null,
      },
    };
  }

  return {
    contentProps: {
      availabilityPanelProps: null,
      nudgeCard,
      roomContentProps: {
        boardProps: {
          draft,
          visibleCount: visiblePicks.length,
        },
        currentPickPanelProps: {
          draft,
          drafting: loading,
          onDraft: handleMakePick,
          onScout: handleScoutProspect,
          onToggleBoard: handleToggleBigBoard,
          prospects: draft.availableProspects,
          scouting,
          selectedProspect,
        },
        error,
        postDraftGradesPanelProps: {
          gradesView,
        },
        prospectsPanelProps: {
          prospects: draft.availableProspects,
          selectedProspectId,
          onSelect: setSelectedProspectId,
        },
        roomHeaderPanelProps: {
          draftStatus: draft.status,
          loading,
          onWatchDraft: handleWatchDraft,
          progressLabel,
          status,
          userOnClock: draft.currentPick?.userOnClock ?? false,
          watching,
        },
        summaryPanelProps: {
          draft,
          bonusOffers,
          onBonusChange: handleBonusOfferChange,
          onSign: handleSignDraftPick,
          signingPlayerId,
        },
        tickerProps: {
          picks: visiblePicks,
          progressLabel,
        },
        warRoomPanelProps: {
          commentary,
          reaction,
          selectedProspect,
        },
      },
    },
  };
}
