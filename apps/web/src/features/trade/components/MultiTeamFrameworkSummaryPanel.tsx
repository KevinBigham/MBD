import { Scale } from 'lucide-react';
import { Badge } from '@mbd/ui';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

export type MultiTeamRoleView = 'initiator' | 'partner' | 'facilitator';

export interface MultiTeamFrameworkTeamView {
  teamId: string;
  role: MultiTeamRoleView;
  sendingPlayerIds: string[];
  receivingPlayerIds: string[];
}

export interface MultiTeamMovedPlayerView {
  playerId: string;
  label: string;
}

interface MultiTeamFrameworkSummaryPanelProps {
  movedPlayers: MultiTeamMovedPlayerView[];
  multiTeamRosters: Record<string, PlayerDTO[]>;
  teamDisplayName: (teamId: string) => string;
  teams: MultiTeamFrameworkTeamView[];
}

function multiTeamRoleLabel(role: MultiTeamRoleView): string {
  switch (role) {
    case 'initiator':
      return 'Initiator';
    case 'partner':
      return 'Partner';
    case 'facilitator':
    default:
      return 'Facilitator';
  }
}

function playerNameFromRoster(player: PlayerDTO | undefined, fallbackPlayerId: string): string {
  return player ? `${player.firstName} ${player.lastName}` : fallbackPlayerId;
}

export default function MultiTeamFrameworkSummaryPanel({
  movedPlayers,
  multiTeamRosters,
  teamDisplayName,
  teams,
}: MultiTeamFrameworkSummaryPanelProps) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-dynasty-muted" />
        <h3 className="font-heading text-sm font-semibold text-dynasty-text">Framework Summary</h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {teams.map((team) => (
          <div key={team.teamId} className="rounded border border-dynasty-border bg-dynasty-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-heading text-sm text-dynasty-textBright">{teamDisplayName(team.teamId)}</div>
              <Badge className="border-dynasty-border bg-dynasty-elevated text-dynasty-muted">
                {multiTeamRoleLabel(team.role)}
              </Badge>
            </div>
            <div className="mt-3">
              <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-primary">Sending</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {team.sendingPlayerIds.length === 0 ? (
                  <span className="font-heading text-xs text-dynasty-muted">No players assigned.</span>
                ) : (
                  team.sendingPlayerIds.map((playerId) => {
                    const player = multiTeamRosters[team.teamId]?.find((candidate) => candidate.id === playerId);
                    return (
                      <span key={`${team.teamId}-send-${playerId}`} className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-xs text-dynasty-text">
                        {playerNameFromRoster(player, playerId)}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
            <div className="mt-3">
              <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-info">Receiving</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {team.receivingPlayerIds.length === 0 ? (
                  <span className="font-heading text-xs text-dynasty-muted">No inbound players yet.</span>
                ) : (
                  team.receivingPlayerIds.map((playerId) => (
                    <span key={`${team.teamId}-receive-${playerId}`} className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-xs text-dynasty-text">
                      {movedPlayers.find((candidate) => candidate.playerId === playerId)?.label ?? playerId}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
