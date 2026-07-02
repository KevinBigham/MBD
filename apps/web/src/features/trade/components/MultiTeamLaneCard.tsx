import { Badge } from '@mbd/ui';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

export type MultiTeamRole = 'initiator' | 'partner' | 'facilitator';

export interface MultiTeamLaneState {
  laneId: string;
  teamId: string;
  role: MultiTeamRole;
  outgoing: Array<{
    playerId: string;
    destinationTeamId: string;
  }>;
}

interface MultiTeamLaneCardProps {
  lane: MultiTeamLaneState;
  roster: PlayerDTO[];
  teamOptions: Array<{ id: string; label: string; disabled: boolean }>;
  destinationOptions: Array<{ id: string; label: string }>;
  teamSelectionLocked: boolean;
  disabled: boolean;
  onChangeTeam: (teamId: string) => void;
  onTogglePlayer: (playerId: string) => void;
  onChangeDestination: (playerId: string, destinationTeamId: string) => void;
}

function multiTeamRoleLabel(role: MultiTeamRole): string {
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

export default function MultiTeamLaneCard({
  lane,
  roster,
  teamOptions,
  destinationOptions,
  teamSelectionLocked,
  disabled,
  onChangeTeam,
  onTogglePlayer,
  onChangeDestination,
}: MultiTeamLaneCardProps) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-heading text-sm font-semibold text-dynasty-textBright">
            {multiTeamRoleLabel(lane.role)}
          </div>
          <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            Build outgoing assignments for this lane
          </div>
        </div>
        <select
          value={lane.teamId}
          onChange={(event) => onChangeTeam(event.target.value)}
          disabled={disabled || teamSelectionLocked}
          className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-xs text-dynasty-text focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {teamOptions.map((team) => (
            <option key={team.id} value={team.id} disabled={team.disabled}>
              {team.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
        {roster.length === 0 ? (
          <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-4 font-heading text-xs text-dynasty-muted">
            No roster loaded for this lane yet.
          </div>
        ) : (
          roster.map((player) => {
            const assignment = lane.outgoing.find((candidate) => candidate.playerId === player.id) ?? null;
            return (
              <div
                key={player.id}
                className={`rounded border px-3 py-2 ${
                  assignment
                    ? 'border-accent-primary/40 bg-accent-primary/10'
                    : 'border-dynasty-border bg-dynasty-surface'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onTogglePlayer(player.id)}
                    disabled={disabled}
                    className="focus-ring flex-1 text-left"
                  >
                    <div className="font-heading text-sm text-dynasty-text">
                      {player.firstName} {player.lastName}
                    </div>
                    <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                      {player.position} · {player.displayRating} OVR · Age {player.age}
                    </div>
                  </button>
                  <Badge className={assignment ? 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary' : 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted'}>
                    {assignment ? 'In Framework' : 'Available'}
                  </Badge>
                </div>

                {assignment ? (
                  <div className="mt-3">
                    <label className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                      Destination Club
                    </label>
                    <select
                      value={assignment.destinationTeamId}
                      onChange={(event) => onChangeDestination(player.id, event.target.value)}
                      disabled={disabled}
                      className="mt-2 w-full rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs text-dynasty-text focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {destinationOptions.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
