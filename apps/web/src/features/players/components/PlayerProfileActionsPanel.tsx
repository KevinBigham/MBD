import { Link } from 'react-router-dom';
import { Button } from '@mbd/ui';
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  ClipboardX,
  FileSignature,
  GitCompareArrows,
} from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import type { PlayerProfilePlayerView } from './playerProfileShared';

export type PlayerProfileRosterAction = 'promote' | 'demote' | 'dfa';
export type PlayerProfileBusyAction = 'extend' | PlayerProfileRosterAction | null;

export interface PlayerProfileActionState {
  tone: 'success' | 'error' | 'info';
  message: string;
}

export interface PendingProfileRosterAction {
  action: PlayerProfileRosterAction;
  title: string;
  detail: string;
  consequence: string;
}

export interface PlayerProfileActionsPanelProps {
  player: Pick<
    PlayerProfilePlayerView,
    'id' | 'historical' | 'position' | 'rosterStatus' | 'minorLeagueLevel' | 'optionYearsUsed' | 'isOutOfOptions'
  >;
  isUserTeamPlayer: boolean;
  canPromote: boolean;
  canDemote: boolean;
  canDfa: boolean;
  busyAction: PlayerProfileBusyAction;
  actionState: PlayerProfileActionState | null;
  pendingRosterAction: PendingProfileRosterAction | null;
  onExtend: () => void;
  onRequestRosterAction: (action: PlayerProfileRosterAction) => void;
  onCancelRosterAction: () => void;
  onConfirmRosterAction: () => void;
}

function actionToneClasses(tone: PlayerProfileActionState['tone']): string {
  switch (tone) {
    case 'success':
      return 'border-accent-success/30 bg-accent-success/10 text-accent-success';
    case 'info':
      return 'border-accent-info/30 bg-accent-info/10 text-accent-info';
    default:
      return 'border-accent-danger/30 bg-accent-danger/10 text-accent-danger';
  }
}

export default function PlayerProfileActionsPanel({
  player,
  isUserTeamPlayer,
  canPromote,
  canDemote,
  canDfa,
  busyAction,
  actionState,
  pendingRosterAction,
  onExtend,
  onRequestRosterAction,
  onCancelRosterAction,
  onConfirmRosterAction,
}: PlayerProfileActionsPanelProps) {
  return (
    <DensePanel title="Quick Actions" bodyClassName="space-y-3">
      {!player.historical && (
        <Button asChild variant="outline" className="w-full justify-start">
          <Link to={`/players/compare?a=${player.id}`}>
            <GitCompareArrows className="h-4 w-4" />
            Compare Player
          </Link>
        </Button>
      )}

      {isUserTeamPlayer ? (
        <>
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to={`/trade?playerId=${player.id}&mode=quick`}>
              <ArrowLeftRight className="h-4 w-4" />
              Shop Player
            </Link>
          </Button>

          <Button
            variant="secondary"
            className="w-full justify-start"
            loading={busyAction === 'extend'}
            onClick={onExtend}
          >
            <FileSignature className="h-4 w-4" />
            Extend Contract
          </Button>

          <Button
            variant="secondary"
            className="w-full justify-start"
            loading={busyAction === 'promote'}
            disabled={!canPromote}
            onClick={() => onRequestRosterAction('promote')}
          >
            <ArrowUpCircle className="h-4 w-4" />
            Promote to MLB
          </Button>

          <Button
            variant="secondary"
            className="w-full justify-start"
            loading={busyAction === 'demote'}
            disabled={!canDemote}
            onClick={() => onRequestRosterAction('demote')}
          >
            <ArrowDownCircle className="h-4 w-4" />
            Option to Minors
          </Button>

          <Button
            variant="destructive"
            className="w-full justify-start"
            loading={busyAction === 'dfa'}
            disabled={!canDfa}
            onClick={() => onRequestRosterAction('dfa')}
          >
            <ClipboardX className="h-4 w-4" />
            Designate for Assignment
          </Button>
        </>
      ) : (
        <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
          Quick actions are only available for live players on your active club.
        </div>
      )}

      {actionState ? (
        <div className={`rounded-lg border px-4 py-3 font-heading text-sm ${actionToneClasses(actionState.tone)}`}>
          {actionState.message}
        </div>
      ) : null}

      {pendingRosterAction ? (
        <div className="rounded-lg border border-accent-warning/40 bg-accent-warning/10 p-4">
          <div className="font-heading text-sm font-semibold text-dynasty-textBright">
            Confirm {pendingRosterAction.title}
          </div>
          <div className="mt-1 font-data text-xs text-dynasty-muted">{pendingRosterAction.detail}</div>
          <div className="mt-3 font-heading text-sm text-accent-warning">
            {pendingRosterAction.consequence}
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancelRosterAction}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={pendingRosterAction.action === 'dfa' ? 'destructive' : 'default'}
              size="sm"
              loading={busyAction === pendingRosterAction.action}
              onClick={onConfirmRosterAction}
            >
              Confirm
            </Button>
          </div>
        </div>
      ) : null}
    </DensePanel>
  );
}
