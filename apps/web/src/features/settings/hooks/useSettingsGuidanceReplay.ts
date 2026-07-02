import { useCallback, useMemo, useState } from 'react';
import {
  resetAssistantGuidanceProgress,
  type AssistantSaveId,
} from '@/features/assistant/lib/assistantState';
import {
  resetGuidedStartNudges,
  type GuidedStartSaveSlotId,
} from '@/features/onboarding/nudges/guidedStartNudgeStore';

interface UseSettingsGuidanceReplayOptions {
  activeSaveId: string | null | undefined;
  activeSaveSlot: number | null | undefined;
}

interface UseSettingsGuidanceReplayResult {
  activeSaveLabel: string;
  guidanceStatus: string | null;
  handleReplayAssistantGuidance: () => void;
  handleReplayGuidedStartNudges: () => void;
}

function labelForSaveId(saveId: AssistantSaveId): string {
  if (saveId == null) {
    return 'global profile';
  }
  return typeof saveId === 'number' ? `save-slot-${saveId}` : saveId;
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function useSettingsGuidanceReplay({
  activeSaveId,
  activeSaveSlot,
}: UseSettingsGuidanceReplayOptions): UseSettingsGuidanceReplayResult {
  const [guidanceStatus, setGuidanceStatus] = useState<string | null>(null);
  const assistantSaveId = useMemo<AssistantSaveId>(
    () => activeSaveSlot ?? activeSaveId ?? null,
    [activeSaveId, activeSaveSlot],
  );
  const guidedStartSaveSlotId = useMemo<GuidedStartSaveSlotId | null>(
    () => activeSaveSlot ?? activeSaveId ?? null,
    [activeSaveId, activeSaveSlot],
  );

  const handleReplayAssistantGuidance = useCallback(() => {
    const result = resetAssistantGuidanceProgress(assistantSaveId);
    const totalCleared = result.dismissedRoutes + result.completedRoutes + result.seenStoryCallbacks;
    setGuidanceStatus(totalCleared === 0
      ? 'Assistant help was already ready to replay.'
      : `Assistant help replayed: ${pluralize(result.dismissedRoutes, 'dismissed route')}, ${pluralize(result.completedRoutes, 'completed route')}, and ${pluralize(result.seenStoryCallbacks, 'story callback')} cleared.`);
  }, [assistantSaveId]);

  const handleReplayGuidedStartNudges = useCallback(() => {
    const result = resetGuidedStartNudges(guidedStartSaveSlotId);
    setGuidanceStatus(result.reset
      ? `Guided-start nudges reset: ${pluralize(result.seenNudges, 'seen flag')} cleared.`
      : 'No guided-start nudge record exists for this save yet.');
  }, [guidedStartSaveSlotId]);

  return {
    activeSaveLabel: labelForSaveId(assistantSaveId),
    guidanceStatus,
    handleReplayAssistantGuidance,
    handleReplayGuidedStartNudges,
  };
}
