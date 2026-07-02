import { useCallback, useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import {
  REVISED_CHAPTER_ORDER,
  advanceRevisedChapter,
  createRevisedOnboardingState,
  getOnboardingResult,
  selectAGMInFlow,
  setPhilosophyChoiceInFlow,
  setScoutingHireInFlow,
  setStaffHiresInFlow,
  type AGMCandidate,
  type AGMCandidateId,
  type GMPhilosophy,
  type OnboardingFlowState,
  type StaffHireChoices,
} from '@mbd/sim-core';
import type { GameState } from '@/shared/hooks/useGameStore';
import type { useWorker } from '@/shared/hooks/useWorker';
import { loadGameById, saveGame, saveGameById } from '@/shared/lib/saveSystem';
import type { RevisedOnboardingData } from '@/workers/sim.worker.onboarding';
import { AGMRuntimePanel } from '../components/AGMRuntimePanel';
import RevisedOnboardingFlowContent from '../components/RevisedOnboardingFlowContent';
import {
  buildDialogueText,
  buildFallbackBody,
  type ChoiceField,
} from '../components/RevisedOnboardingChapterPanel';
import { GuidedStartNudgeCard, useNudges } from '../nudges';

interface WorkerMutationResult {
  success: boolean;
  flowStateChanged: boolean;
}

type RevisedOnboardingFlowContentProps = ComponentProps<typeof RevisedOnboardingFlowContent>;

export type RevisedOnboardingPageControllerWorker = Pick<
  ReturnType<typeof useWorker>,
  | 'isReady'
  | 'getAGMCandidates'
  | 'getRevisedOnboardingData'
  | 'applyStaffHires'
  | 'applyScoutingHire'
  | 'completeRevisedOnboarding'
  | 'exportSnapshot'
>;

export type RevisedOnboardingPageControllerGameState = Pick<
  GameState,
  'activeSaveId' | 'activeSaveSlot' | 'gmName'
>;

export interface UseRevisedOnboardingPageControllerOptions {
  game: RevisedOnboardingPageControllerGameState;
  navigate: (path: string) => void;
  worker: RevisedOnboardingPageControllerWorker;
}

export type RevisedOnboardingPageScreen =
  | {
    kind: 'loading';
    label: string;
    nudgeCard: ReactNode;
  }
  | {
    kind: 'missing-save';
    body: string;
    nudgeCard: ReactNode;
    onReturnToSaveHub: () => void;
    title: string;
  }
  | {
    kind: 'agm-selection';
    candidates: AGMCandidate[];
    error: string | null;
    isBusy: boolean;
    nudgeCard: ReactNode;
    onSelectAGM: (agmId: AGMCandidateId) => Promise<void>;
  }
  | {
    kind: 'flow';
    contentProps: RevisedOnboardingFlowContentProps;
    nudgeCard: ReactNode;
  };

export interface UseRevisedOnboardingPageControllerResult {
  screen: RevisedOnboardingPageScreen;
}

function readErrorMessage(caughtError: unknown, fallback: string) {
  return caughtError instanceof Error ? caughtError.message : fallback;
}

function requireSnapshotObject(snapshot: unknown): object {
  if (snapshot == null || typeof snapshot !== 'object') {
    throw new Error('Worker did not return a valid snapshot object.');
  }

  return snapshot;
}

function getCurrentRevisedChapter(state: OnboardingFlowState) {
  return REVISED_CHAPTER_ORDER[state.currentChapter] ?? REVISED_CHAPTER_ORDER[0]!;
}

export function useRevisedOnboardingPageController({
  game,
  navigate,
  worker,
}: UseRevisedOnboardingPageControllerOptions): UseRevisedOnboardingPageControllerResult {
  const { activeSaveId, activeSaveSlot, gmName } = game;
  const saveSlotId = activeSaveSlot != null ? `save-slot-${activeSaveSlot}` : activeSaveId;
  const introNudges = useNudges({
    saveSlotId,
    triggers: ['intro_scroll'],
  });

  const [candidates, setCandidates] = useState<AGMCandidate[]>([]);
  const [data, setData] = useState<RevisedOnboardingData | null>(null);
  const [flowState, setFlowState] = useState<OnboardingFlowState>(() => createRevisedOnboardingState());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSaveTarget = Boolean(activeSaveId) || activeSaveSlot != null;
  const currentChapter = getCurrentRevisedChapter(flowState);
  const currentScript = data?.script.chapters[currentChapter.id] ?? null;
  const selectedAGM = data?.script.agm ?? candidates.find((candidate) => candidate.id === flowState.selectedAGMId) ?? null;
  const isBusy = loading || submitting;

  const nudgeCard = (
    <GuidedStartNudgeCard
      current={introNudges.current}
      onDismiss={introNudges.dismiss}
    />
  );

  const loadCandidates = useCallback(async () => {
    if (!worker.isReady) {
      return;
    }

    setLoading(true);
    try {
      const nextCandidates = await worker.getAGMCandidates();
      setCandidates(nextCandidates);
      setError(null);
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, 'Failed to load AGM candidates.'));
    } finally {
      setLoading(false);
    }
  }, [worker]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const persistCompletion = useCallback(async (snapshot: object) => {
    if (activeSaveId) {
      const existingSave = await loadGameById(activeSaveId);
      if (existingSave) {
        await saveGameById(existingSave.id, existingSave.name, snapshot, {
          slotNumber: existingSave.slotNumber,
          parentSaveId: existingSave.parentSaveId,
          isRootSave: existingSave.isRootSave,
          branchMeta: existingSave.branchMeta,
        });
        return;
      }
    }

    if (activeSaveSlot != null) {
      await saveGame(activeSaveSlot, `${gmName} • Franchise`, snapshot);
    }
  }, [activeSaveId, activeSaveSlot, gmName]);

  const handleSelectAGM = useCallback(async (agmId: AGMCandidateId) => {
    setSubmitting(true);
    try {
      const nextData = await worker.getRevisedOnboardingData(agmId);
      setData(nextData);
      setFlowState(selectAGMInFlow(createRevisedOnboardingState(), agmId));
      setError(null);
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, 'Failed to load revised onboarding.'));
    } finally {
      setSubmitting(false);
    }
  }, [worker]);

  const completeLocalChapter = useCallback((nextState: OnboardingFlowState) => {
    setFlowState(nextState);
    setError(null);
  }, []);

  const handleChoice = useCallback(<K extends ChoiceField>(field: K, value: GMPhilosophy[K]) => {
    completeLocalChapter(setPhilosophyChoiceInFlow(flowState, field, value));
  }, [completeLocalChapter, flowState]);

  const handleRosterAdvance = useCallback(() => {
    completeLocalChapter(advanceRevisedChapter(flowState));
  }, [completeLocalChapter, flowState]);

  const handleStaffHires = useCallback(async (hires: StaffHireChoices) => {
    setSubmitting(true);
    try {
      await worker.applyStaffHires(hires) as WorkerMutationResult;
      setFlowState(setStaffHiresInFlow(flowState, hires));
      setError(null);
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, 'Failed to apply staff hires.'));
    } finally {
      setSubmitting(false);
    }
  }, [flowState, worker]);

  const handleScoutingHire = useCallback(async (scoutingDirectorId: string) => {
    setSubmitting(true);
    try {
      await worker.applyScoutingHire(scoutingDirectorId) as WorkerMutationResult;
      setFlowState(setScoutingHireInFlow(flowState, scoutingDirectorId));
      setError(null);
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, 'Failed to apply scouting hire.'));
    } finally {
      setSubmitting(false);
    }
  }, [flowState, worker]);

  const handleEnterFrontOffice = useCallback(async () => {
    if (data == null) {
      setError('Revised onboarding data is missing.');
      return;
    }

    setSubmitting(true);
    try {
      const result = getOnboardingResult(flowState, data.scoutingSlate);
      await worker.completeRevisedOnboarding(result) as WorkerMutationResult;
      const snapshot = requireSnapshotObject(await worker.exportSnapshot());
      await persistCompletion(snapshot);
      setError(null);
      navigate('/dashboard');
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, 'Failed to complete revised onboarding.'));
    } finally {
      setSubmitting(false);
    }
  }, [data, flowState, navigate, persistCompletion, worker]);

  const agmPanel = useMemo(() => {
    if (selectedAGM == null || data == null) {
      return null;
    }

    const introText = buildDialogueText(currentScript, 'intro');
    const reactionText = buildDialogueText(currentScript, 'reaction');

    return (
      <AGMRuntimePanel
        candidate={selectedAGM}
        mode={flowState.isComplete ? 'chapter' : 'desk'}
        expression={flowState.isComplete ? 'confident' : currentChapter.isHiring ? 'focused' : 'neutral'}
        eyebrow={flowState.isComplete ? 'Front Office Ready' : currentChapter.label}
        headline={introText || `${selectedAGM.name} is guiding the room.`}
        body={reactionText || introText || buildFallbackBody(currentChapter.id)}
      />
    );
  }, [currentChapter, currentScript, data, flowState.isComplete, selectedAGM]);

  const handleReturnToSaveHub = useCallback(() => {
    navigate('/');
  }, [navigate]);

  if (loading && candidates.length === 0) {
    return {
      screen: {
        kind: 'loading',
        label: 'Loading AGM candidates...',
        nudgeCard,
      },
    };
  }

  if (!hasSaveTarget) {
    return {
      screen: {
        kind: 'missing-save',
        title: 'No active save selected',
        body: 'Revised onboarding needs an active save slot so the final front-office snapshot can be preserved.',
        onReturnToSaveHub: handleReturnToSaveHub,
        nudgeCard,
      },
    };
  }

  if (data == null) {
    return {
      screen: {
        kind: 'agm-selection',
        candidates,
        error,
        isBusy,
        onSelectAGM: handleSelectAGM,
        nudgeCard,
      },
    };
  }

  return {
    screen: {
      kind: 'flow',
      contentProps: {
        agmPanel,
        currentChapter,
        currentScript,
        data,
        error,
        flowState,
        onChoice: handleChoice,
        onEnterFrontOffice: handleEnterFrontOffice,
        onRosterAdvance: handleRosterAdvance,
        onScoutingHire: handleScoutingHire,
        onStaffHires: handleStaffHires,
        submitting,
      },
      nudgeCard,
    },
  };
}
