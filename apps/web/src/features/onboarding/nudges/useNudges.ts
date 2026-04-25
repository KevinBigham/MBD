import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createInitialNudgeState,
  reduceNudgeState,
  selectCurrentNudgeId,
  type GuidedStartNudgeId,
  type GuidedStartNudgeState,
} from './nudgeState';
import {
  markGuidedStartNudgeSeen,
  normalizeGuidedStartSaveSlotId,
  readGuidedStartNudgeRecord,
  type GuidedStartSaveSlotId,
} from './guidedStartNudgeStore';

export interface UseNudgesOptions {
  saveSlotId: GuidedStartSaveSlotId | null;
  triggers?: readonly GuidedStartNudgeId[];
}

export interface UseNudgesResult {
  current: GuidedStartNudgeId | null;
  dismiss: (id: GuidedStartNudgeId) => void;
  skip: (id: GuidedStartNudgeId) => void;
  isSeen: (id: GuidedStartNudgeId) => boolean;
}

function loadState(saveSlotId: GuidedStartSaveSlotId | null): GuidedStartNudgeState {
  return createInitialNudgeState(readGuidedStartNudgeRecord(saveSlotId));
}

export function useNudges({
  saveSlotId,
  triggers = [],
}: UseNudgesOptions): UseNudgesResult {
  const normalizedSaveSlotId = useMemo(
    () => (saveSlotId == null ? null : normalizeGuidedStartSaveSlotId(saveSlotId)),
    [saveSlotId],
  );
  const triggerKey = triggers.join('|');
  const [state, setState] = useState<GuidedStartNudgeState>(() => loadState(normalizedSaveSlotId));

  useEffect(() => {
    setState(loadState(normalizedSaveSlotId));
  }, [normalizedSaveSlotId]);

  useEffect(() => {
    if (!normalizedSaveSlotId || triggers.length === 0) {
      return;
    }

    setState((currentState) =>
      triggers.reduce(
        (nextState, id) => reduceNudgeState(nextState, { type: 'trigger', id }),
        currentState,
      ));
    // triggerKey gives callers a stable dependency even when they pass a fresh array.
  }, [normalizedSaveSlotId, triggerKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback((id: GuidedStartNudgeId) => {
    markGuidedStartNudgeSeen(normalizedSaveSlotId, id);
    setState((currentState) => reduceNudgeState(currentState, { type: 'dismiss', id }));
  }, [normalizedSaveSlotId]);

  const skip = useCallback((id: GuidedStartNudgeId) => {
    markGuidedStartNudgeSeen(normalizedSaveSlotId, id);
    setState((currentState) => reduceNudgeState(currentState, { type: 'skip', id }));
  }, [normalizedSaveSlotId]);

  const isSeen = useCallback((id: GuidedStartNudgeId) => state.seen[id] === true, [state.seen]);

  return {
    current: selectCurrentNudgeId(state),
    dismiss,
    skip,
    isSeen,
  };
}
