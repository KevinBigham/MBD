import { useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PageShell } from '@/shared/components/PageShell';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import { normalizePlayerProfileTab } from '../components/playerProfileShared';
import PlayerProfilePageContent, { PlayerProfileSkeleton } from '../components/PlayerProfilePageContent';
import { usePlayerProfileActions } from '../hooks/usePlayerProfileActions';
import { usePlayerProfileView } from '../hooks/usePlayerProfileView';

export default function PlayerProfilePage() {
  const { playerId } = useParams<{ playerId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, day, season, userTeamId } = useGameStore();
  const autosaveActiveGame = useActiveSaveAutosave();

  const activeTab = normalizePlayerProfileTab(searchParams.get('tab'));
  const {
    view,
    player,
    loading,
    fetchProfile,
  } = usePlayerProfileView({
    isInitialized,
    workerReady,
    playerId,
    day,
    season,
    worker,
  });

  const updateTab = useCallback((nextValue: string) => {
    const nextTab = normalizePlayerProfileTab(nextValue);
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === 'stats') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const isUserTeamPlayer = Boolean(player && !player.historical && player.teamId === userTeamId);
  const canPromote = Boolean(isUserTeamPlayer && player && player.rosterStatus !== 'MLB');
  const canDemote = Boolean(isUserTeamPlayer && player?.rosterStatus === 'MLB');
  const canDfa = Boolean(isUserTeamPlayer && player);
  const profileActions = usePlayerProfileActions({
    player,
    worker,
    season,
    fetchProfile,
    autosaveActiveGame,
  });

  const shouldRenderContent = Boolean(player) || (!loading && !player);

  return (
    <PageShell loading={loading && view == null} skeleton={<PlayerProfileSkeleton />}>
      {shouldRenderContent ? (
        <PlayerProfilePageContent
          activeTab={activeTab}
          canDemote={canDemote}
          canDfa={canDfa}
          canPromote={canPromote}
          isUserTeamPlayer={isUserTeamPlayer}
          onTabChange={updateTab}
          player={player}
          profileActions={profileActions}
          view={view}
        />
      ) : null}
    </PageShell>
  );
}
