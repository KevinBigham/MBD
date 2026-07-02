import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import RosterPageContent from '../components/RosterPageContent';
import { useRosterPageController } from '../hooks/useRosterPageController';

export default function RosterPage() {
  const worker = useWorker();
  const { day, season, phase, userTeamId, isInitialized, activeSaveId, activeSaveSlot } = useGameStore();
  const autosaveActiveGame = useActiveSaveAutosave();
  const { contentProps } = useRosterPageController({
    autosaveActiveGame,
    game: {
      activeSaveId,
      activeSaveSlot,
      day,
      isInitialized,
      phase,
      season,
      userTeamId,
    },
    worker,
  });

  return <RosterPageContent {...contentProps} />;
}
