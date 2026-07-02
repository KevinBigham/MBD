import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, Skeleton } from '@mbd/ui';
import { ArrowLeft } from 'lucide-react';
import PlayerProfileActionsPanel, {
  type PendingProfileRosterAction,
  type PlayerProfileActionState,
  type PlayerProfileBusyAction,
  type PlayerProfileRosterAction,
} from './PlayerProfileActionsPanel';
import PlayerProfileContractSnapshotPanel from './PlayerProfileContractSnapshotPanel';
import PlayerProfileTabsPanel from './PlayerProfileTabsPanel';
import type {
  PlayerProfilePlayerView,
  PlayerProfileTab,
  PlayerProfileView,
} from './playerProfileShared';

const ProfileHeader = lazy(() => import('./ProfileHeader'));

export interface PlayerProfilePageActions {
  actionState: PlayerProfileActionState | null;
  busyAction: PlayerProfileBusyAction;
  pendingRosterAction: PendingProfileRosterAction | null;
  handleExtend: () => void | Promise<void>;
  requestRosterAction: (action: PlayerProfileRosterAction) => void;
  cancelRosterAction: () => void;
  confirmPendingRosterAction: () => void | Promise<void>;
}

export interface PlayerProfilePageContentProps {
  activeTab: PlayerProfileTab;
  canDemote: boolean;
  canDfa: boolean;
  canPromote: boolean;
  isUserTeamPlayer: boolean;
  onTabChange: (nextValue: string) => void;
  player: PlayerProfilePlayerView | null;
  profileActions: PlayerProfilePageActions;
  view: PlayerProfileView | null;
}

export function PlayerProfileSkeleton() {
  return (
    <div className="space-y-6" data-testid="player-profile-loading">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-48 rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-[34rem] rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function BackToPlayersLink() {
  return (
    <Link
      to="/players"
      className="inline-flex items-center gap-1.5 font-heading text-sm text-dynasty-muted hover:text-accent-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Players
    </Link>
  );
}

export default function PlayerProfilePageContent({
  activeTab,
  canDemote,
  canDfa,
  canPromote,
  isUserTeamPlayer,
  onTabChange,
  player,
  profileActions,
  view,
}: PlayerProfilePageContentProps) {
  if (!player) {
    return (
      <div className="space-y-6">
        <BackToPlayersLink />

        <Card>
          <CardContent className="p-10 text-center">
            <div className="font-brand text-3xl tracking-wide text-dynasty-textBright">Player Not Found</div>
            <p className="mt-3 font-heading text-sm text-dynasty-muted">
              The requested player profile is unavailable in the current save.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!view) {
    return null;
  }

  return (
    <div className="space-y-6">
      <BackToPlayersLink />

      <Suspense fallback={<Skeleton className="h-48 rounded-2xl" />}>
        <ProfileHeader
          player={player}
          nicknames={view.nicknames ?? null}
          milestoneAlerts={view.milestoneAlerts ?? []}
        />
      </Suspense>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <PlayerProfileTabsPanel activeTab={activeTab} view={view} onTabChange={onTabChange} />
        </div>

        <aside className="space-y-4">
          <PlayerProfileActionsPanel
            player={player}
            isUserTeamPlayer={isUserTeamPlayer}
            canPromote={canPromote}
            canDemote={canDemote}
            canDfa={canDfa}
            busyAction={profileActions.busyAction}
            actionState={profileActions.actionState}
            pendingRosterAction={profileActions.pendingRosterAction}
            onExtend={() => void profileActions.handleExtend()}
            onRequestRosterAction={profileActions.requestRosterAction}
            onCancelRosterAction={profileActions.cancelRosterAction}
            onConfirmRosterAction={() => void profileActions.confirmPendingRosterAction()}
          />

          <PlayerProfileContractSnapshotPanel player={player} />
        </aside>
      </div>
    </div>
  );
}
