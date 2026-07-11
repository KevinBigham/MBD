import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/shared/components/PageShell';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import { useSaveRecovery } from '@/features/save-recovery';
import { useSetupPageController } from '@/features/setup/hooks/useSetupPageController';
import SetupPageContent from '@/features/setup/components/SetupPageContent';

export default function SetupPage() {
  const navigate = useNavigate();
  const worker = useWorker();
  const recovery = useSaveRecovery();
  const persistActiveSave = useActiveSaveAutosave();
  const {
    activeSaveId,
    activeSaveSlot,
    isInitialized,
    initializeGame,
    setInitialized,
  } = useGameStore();
  const { contentProps } = useSetupPageController({
    activeSaveId,
    activeSaveSlot,
    initializeGame,
    setInitialized,
    isInitialized,
    navigate,
    persistActiveSave,
    recovery,
    worker,
  });

  return (
    <PageShell>
      <SetupPageContent {...contentProps} />
    </PageShell>
  );
}
