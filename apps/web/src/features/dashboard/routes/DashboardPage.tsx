import { PageShell } from '@/shared/components/PageShell';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import DashboardPageContent from '../components/DashboardPageContent';
import { DashboardSkeleton } from '../components/DashboardLoadingStates';
import { useDashboardPageController } from '../hooks/useDashboardPageController';

export default function DashboardPage() {
  const worker = useWorker();
  const {
    isInitialized,
    userTeamId,
    teamName,
    gmName,
    season,
    day,
    phase,
    playerCount,
    activeSaveId,
    activeSaveSlot,
    initializeGame,
    updateFromSim,
  } = useGameStore();
  const autosaveActiveGame = useActiveSaveAutosave();

  const { contentProps, pageShellLoading } = useDashboardPageController({
    autosaveActiveGame,
    game: {
      activeSaveId,
      activeSaveSlot,
      day,
      gmName,
      initializeGame,
      isInitialized,
      phase,
      playerCount,
      season,
      teamName,
      updateFromSim,
      userTeamId,
    },
    worker,
  });

  return (
    <PageShell loading={pageShellLoading} skeleton={<DashboardSkeleton />}>
      <DashboardPageContent {...contentProps} />
    </PageShell>
  );
}
