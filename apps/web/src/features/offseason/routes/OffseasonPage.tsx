import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import { useOffseasonPageController } from '../hooks/useOffseasonPageController';
import OffseasonPageContent from '../components/OffseasonPageContent';
import { OffseasonUnavailablePanel } from '../components/OffseasonUnavailablePanel';

export default function OffseasonPage() {
  const worker = useWorker();
  const { phase, season, isInitialized, userTeamId } = useGameStore();
  const autosaveActiveGame = useActiveSaveAutosave();
  const { contentProps } = useOffseasonPageController({
    autosaveActiveGame,
    isInitialized,
    phase,
    season,
    userTeamId,
    worker,
  });

  return contentProps ? <OffseasonPageContent {...contentProps} /> : <OffseasonUnavailablePanel />;
}
