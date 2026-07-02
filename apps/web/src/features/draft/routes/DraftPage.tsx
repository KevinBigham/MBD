import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import { GuidedStartNudgeCard, useNudges } from '@/features/onboarding/nudges';
import DraftPageContent from '../components/DraftPageContent';
import { useDraftPageController } from '../hooks/useDraftPageController';

export default function DraftPage() {
  const worker = useWorker();
  const { phase, season, isInitialized, activeSaveId, activeSaveSlot } = useGameStore();
  const autosaveActiveGame = useActiveSaveAutosave();
  const saveSlotId = activeSaveSlot != null ? `save-slot-${activeSaveSlot}` : activeSaveId;
  const draftNudges = useNudges({
    saveSlotId,
    triggers: isInitialized && season === 1 && phase === 'offseason' ? ['first_draft_nudge'] : [],
  });
  const nudgeCard = (
    <GuidedStartNudgeCard current={draftNudges.current} onDismiss={draftNudges.dismiss} />
  );
  const { contentProps } = useDraftPageController({
    autosaveActiveGame,
    isInitialized,
    nudgeCard,
    phase,
    season,
    worker,
  });

  return <DraftPageContent {...contentProps} />;
}
