import { PageShell } from '@/shared/components/PageShell';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import ScoutingPageContent from '../components/ScoutingPageContent';
import { useScoutingPageController } from '../hooks/useScoutingPageController';

export default function ScoutingPage() {
  const worker = useWorker();
  const { userTeamId, isInitialized, season } = useGameStore();
  const autosaveActiveGame = useActiveSaveAutosave();
  const { contentProps } = useScoutingPageController({
    autosaveActiveGame,
    isInitialized,
    season,
    userTeamId,
    worker,
  });

  return (
    <PageShell>
      <ScoutingPageContent {...contentProps} />
    </PageShell>
  );
}
