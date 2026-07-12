import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
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
import { useGameStore } from '@/shared/hooks/useGameStore';
import {
  isSimAdvanceCoordinatorBusy,
  useSimAdvanceCoordinatorStatus,
} from '@/shared/hooks/useSimAdvanceExecutor';
import type { useWorker } from '@/shared/hooks/useWorker';
import { loadGameById } from '@/shared/lib/saveSystem';
import { persistActiveSaveSnapshot } from '@/shared/lib/activeSavePersistence';
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

interface SaveActivationToken {
  epoch: number;
  saveId: string;
}

interface CompletionPersistenceTarget {
  saveId: string;
  saveSlot: number | null;
  saveName: string;
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
    actionDisabled: boolean;
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
  const coordinatorStatus = useSimAdvanceCoordinatorStatus();
  const mountedRef = useRef(false);
  const activationRef = useRef<{ epoch: number; saveId: string | null }>({ epoch: 0, saveId: activeSaveId });
  if (activationRef.current.saveId !== activeSaveId) {
    activationRef.current = { epoch: activationRef.current.epoch + 1, saveId: activeSaveId };
  }

  const hasSaveTarget = Boolean(activeSaveId);
  const currentChapter = getCurrentRevisedChapter(flowState);
  const currentScript = data?.script.chapters[currentChapter.id] ?? null;
  const selectedAGM = data?.script.agm ?? candidates.find((candidate) => candidate.id === flowState.selectedAGMId) ?? null;
  const isBusy = loading || submitting;
  const workerLaneBlocked = submitting || coordinatorStatus.kind !== 'idle';

  const isSaveActivationCurrent = useCallback((captured: SaveActivationToken): boolean => (
    mountedRef.current
    && activationRef.current.epoch === captured.epoch
    && activationRef.current.saveId === captured.saveId
    && useGameStore.getState().activeSaveId === captured.saveId
  ), []);

  const captureAdmissibleSave = useCallback((): SaveActivationToken | null => {
    const current = activationRef.current;
    if (!mountedRef.current
      || !current.saveId
      || useGameStore.getState().activeSaveId !== current.saveId
      || isSimAdvanceCoordinatorBusy()) {
      return null;
    }
    return { epoch: current.epoch, saveId: current.saveId };
  }, []);

  const isSaveStillAdmissible = useCallback((captured: SaveActivationToken): boolean => (
    isSaveActivationCurrent(captured)
    && !isSimAdvanceCoordinatorBusy()
  ), [isSaveActivationCurrent]);

  useEffect(() => {
    mountedRef.current = true;
    const unsubscribe = useGameStore.subscribe((state, previous) => {
      if (state.activeSaveId !== previous.activeSaveId) {
        activationRef.current = {
          epoch: activationRef.current.epoch + 1,
          saveId: state.activeSaveId,
        };
      }
    });
    return () => {
      mountedRef.current = false;
      activationRef.current = {
        epoch: activationRef.current.epoch + 1,
        saveId: activationRef.current.saveId,
      };
      unsubscribe();
    };
  }, []);

  const nudgeCard = (
    <GuidedStartNudgeCard
      current={introNudges.current}
      onDismiss={introNudges.dismiss}
    />
  );

  const loadCandidates = useCallback(async () => {
    const captured = captureAdmissibleSave();
    if (!worker.isReady || !captured) {
      return;
    }

    setLoading(true);
    try {
      const nextCandidates = await worker.getAGMCandidates();
      if (!isSaveStillAdmissible(captured)) return;
      setCandidates(nextCandidates);
      setError(null);
    } catch (caughtError) {
      if (isSaveStillAdmissible(captured)) {
        setError(readErrorMessage(caughtError, 'Failed to load AGM candidates.'));
      }
    } finally {
      if (isSaveActivationCurrent(captured)) setLoading(false);
    }
  }, [captureAdmissibleSave, isSaveActivationCurrent, isSaveStillAdmissible, worker]);

  useEffect(() => {
    setCandidates([]);
    setData(null);
    setFlowState(createRevisedOnboardingState());
    setLoading(true);
    setSubmitting(false);
    setError(null);
  }, [activeSaveId]);

  useEffect(() => {
    if (coordinatorStatus.kind === 'idle') void loadCandidates();
  }, [activeSaveId, coordinatorStatus.kind, loadCandidates]);

  const resolveCompletionPersistenceTarget = useCallback(async (
    captured: SaveActivationToken,
  ): Promise<CompletionPersistenceTarget> => {
    if (!isSaveStillAdmissible(captured)) {
      throw new Error('The active onboarding save changed before metadata resolution began.');
    }
    let targetSaveId: string | null = captured.saveId;
    let targetSaveSlot = activeSaveSlot;
    let targetSaveName = `${gmName} • Franchise`;

    if (captured.saveId) {
      const existingSave = await loadGameById(captured.saveId);
      if (!isSaveStillAdmissible(captured)) {
        throw new Error('The active onboarding save changed while its metadata was loading.');
      }
      if (existingSave) {
        targetSaveId = existingSave.id;
        targetSaveSlot = existingSave.slotNumber;
        targetSaveName = existingSave.name;
      } else if (activeSaveSlot == null) {
        throw new Error('The active onboarding save was not found.');
      }
    }

    targetSaveId ??= activeSaveSlot != null ? `save-slot-${activeSaveSlot}` : null;
    if (!targetSaveId) {
      throw new Error('Onboarding has no active save target.');
    }

    return {
      saveId: targetSaveId,
      saveSlot: targetSaveSlot,
      saveName: targetSaveName,
    };
  }, [activeSaveSlot, gmName, isSaveStillAdmissible]);

  const persistCompletion = useCallback(async (
    target: CompletionPersistenceTarget,
    captured: SaveActivationToken,
  ) => {
    if (!isSaveStillAdmissible(captured)) {
      throw new Error('The active onboarding save changed before persistence began.');
    }
    const result = await persistActiveSaveSnapshot({
      activeSaveId: target.saveId,
      activeSaveSlot: target.saveSlot,
      gmName,
      teamName: null,
      season: 1,
      saveName: target.saveName,
      exportSnapshot: async () => {
        if (!isSaveStillAdmissible(captured)) {
          throw new Error('The active onboarding save changed before snapshot export began.');
        }
        const snapshot = requireSnapshotObject(await worker.exportSnapshot());
        if (!isSaveStillAdmissible(captured)) {
          throw new Error('The active onboarding save changed during snapshot export.');
        }
        return snapshot;
      },
    });
    if (!isSaveStillAdmissible(captured)) {
      throw new Error('The active onboarding save changed before persistence completed.');
    }
    if (!result.saved) {
      throw new Error('The active onboarding save changed before persistence completed.');
    }
  }, [gmName, isSaveStillAdmissible, worker]);

  const handleSelectAGM = useCallback(async (agmId: AGMCandidateId) => {
    const captured = captureAdmissibleSave();
    if (!captured) return;
    setSubmitting(true);
    try {
      const nextData = await worker.getRevisedOnboardingData(agmId);
      if (!isSaveStillAdmissible(captured)) return;
      setData(nextData);
      setFlowState(selectAGMInFlow(createRevisedOnboardingState(), agmId));
      setError(null);
    } catch (caughtError) {
      if (isSaveStillAdmissible(captured)) {
        setError(readErrorMessage(caughtError, 'Failed to load revised onboarding.'));
      }
    } finally {
      if (isSaveActivationCurrent(captured)) setSubmitting(false);
    }
  }, [captureAdmissibleSave, isSaveActivationCurrent, isSaveStillAdmissible, worker]);

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
    const captured = captureAdmissibleSave();
    if (!captured) return;
    setSubmitting(true);
    try {
      const persistenceTarget = await resolveCompletionPersistenceTarget(captured);
      if (!isSaveStillAdmissible(captured)) return;
      const result = await worker.applyStaffHires(hires) as WorkerMutationResult;
      if (!isSaveStillAdmissible(captured)) return;
      if (!result.success) throw new Error('The worker rejected the staff hires.');
      await persistCompletion(persistenceTarget, captured);
      if (!isSaveStillAdmissible(captured)) return;
      setFlowState(setStaffHiresInFlow(flowState, hires));
      setError(null);
    } catch (caughtError) {
      if (isSaveStillAdmissible(captured)) {
        setError(readErrorMessage(caughtError, 'Failed to apply staff hires.'));
      }
    } finally {
      if (isSaveActivationCurrent(captured)) setSubmitting(false);
    }
  }, [captureAdmissibleSave, flowState, isSaveActivationCurrent, isSaveStillAdmissible, persistCompletion, resolveCompletionPersistenceTarget, worker]);

  const handleScoutingHire = useCallback(async (scoutingDirectorId: string) => {
    const captured = captureAdmissibleSave();
    if (!captured) return;
    setSubmitting(true);
    try {
      const persistenceTarget = await resolveCompletionPersistenceTarget(captured);
      if (!isSaveStillAdmissible(captured)) return;
      const result = await worker.applyScoutingHire(scoutingDirectorId) as WorkerMutationResult;
      if (!isSaveStillAdmissible(captured)) return;
      if (!result.success) throw new Error('The worker rejected the scouting hire.');
      await persistCompletion(persistenceTarget, captured);
      if (!isSaveStillAdmissible(captured)) return;
      setFlowState(setScoutingHireInFlow(flowState, scoutingDirectorId));
      setError(null);
    } catch (caughtError) {
      if (isSaveStillAdmissible(captured)) {
        setError(readErrorMessage(caughtError, 'Failed to apply scouting hire.'));
      }
    } finally {
      if (isSaveActivationCurrent(captured)) setSubmitting(false);
    }
  }, [captureAdmissibleSave, flowState, isSaveActivationCurrent, isSaveStillAdmissible, persistCompletion, resolveCompletionPersistenceTarget, worker]);

  const handleEnterFrontOffice = useCallback(async () => {
    if (data == null) {
      setError('Revised onboarding data is missing.');
      return;
    }
    const captured = captureAdmissibleSave();
    if (!captured) return;

    setSubmitting(true);
    try {
      // Resolve presentation metadata before the canonical worker mutation.
      // Once the mutation succeeds, the next async boundary is the exact
      // persistence capture itself; no retained-export or route-read gap can
      // admit a simulation command against divergent worker/durable state.
      const persistenceTarget = await resolveCompletionPersistenceTarget(captured);
      if (!isSaveStillAdmissible(captured)) return;
      const result = getOnboardingResult(flowState, data.scoutingSlate);
      const mutation = await worker.completeRevisedOnboarding(result) as WorkerMutationResult;
      if (!isSaveStillAdmissible(captured)) return;
      if (!mutation.success) throw new Error('The worker rejected onboarding completion.');
      await persistCompletion(persistenceTarget, captured);
      if (!isSaveStillAdmissible(captured)) return;
      setError(null);
      navigate('/dashboard');
    } catch (caughtError) {
      if (isSaveStillAdmissible(captured)) {
        setError(readErrorMessage(caughtError, 'Failed to complete revised onboarding.'));
      }
    } finally {
      if (isSaveActivationCurrent(captured)) setSubmitting(false);
    }
  }, [captureAdmissibleSave, data, flowState, isSaveActivationCurrent, isSaveStillAdmissible, navigate, persistCompletion, resolveCompletionPersistenceTarget, worker]);

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
    if (isSimAdvanceCoordinatorBusy()) return;
    navigate('/');
  }, [navigate]);

  if (!hasSaveTarget) {
    return {
      screen: {
        kind: 'missing-save',
        actionDisabled: coordinatorStatus.kind !== 'idle',
        title: 'No active save selected',
        body: 'Revised onboarding needs an active save slot so the final front-office snapshot can be preserved.',
        onReturnToSaveHub: handleReturnToSaveHub,
        nudgeCard,
      },
    };
  }

  if (loading && candidates.length === 0) {
    return {
      screen: {
        kind: 'loading',
        label: 'Loading AGM candidates...',
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
        isBusy: isBusy || coordinatorStatus.kind !== 'idle',
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
        mutationBlocked: workerLaneBlocked,
        submitting,
      },
      nudgeCard,
    },
  };
}
