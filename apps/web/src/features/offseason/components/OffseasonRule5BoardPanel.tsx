import { getTeamById } from '@mbd/sim-core';
import type { Rule5PlayerView, Rule5View } from './OffseasonRule5Panel';

interface OffseasonRule5BoardPanelProps {
  rule5: Rule5View;
  rule5Pool: Rule5PlayerView[];
  userOnClock: boolean;
  advancing: boolean;
  onRule5Pick: (playerId: string) => void | Promise<void>;
  onPassRule5Pick: () => void | Promise<void>;
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function teamAbbreviation(teamId: string): string {
  return getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase();
}

function playerLine(player: Rule5PlayerView): string {
  return `${player.playerName} | ${player.position} | Age ${player.age} | OVR ${player.overallRating}`;
}

export function OffseasonRule5BoardPanel({
  rule5,
  rule5Pool,
  userOnClock,
  advancing,
  onRule5Pick,
  onPassRule5Pick,
}: OffseasonRule5BoardPanelProps): JSX.Element {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
      <div className="flex items-start justify-between gap-4 border-b border-dynasty-border px-4 py-3">
        <div>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-dynasty-text">
            Rule 5 Board
          </h2>
          <p className="mt-1 font-heading text-xs text-dynasty-muted">
            Reverse-order draft. The board ends once the league passes out.
          </p>
        </div>
        <div className="text-right">
          <div className="font-data text-xs text-dynasty-textBright">
            On Clock: {rule5.currentTeamId ? teamLabel(rule5.currentTeamId) : 'Complete'}
          </div>
          <div className="font-heading text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            Consecutive Passes {rule5.consecutivePasses}/{rule5.draftOrder.length}
          </div>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <div className="mb-2 font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            Draft Order
          </div>
          <div className="flex flex-wrap gap-2">
            {rule5.draftOrder.map((teamId) => {
              const active = rule5.currentTeamId === teamId && rule5.phase === 'rule5_draft';
              return (
                <span
                  key={teamId}
                  className={`rounded border px-2 py-1 font-data text-xs ${
                    active
                      ? 'border-accent-primary bg-accent-primary/15 text-accent-primary'
                      : 'border-dynasty-border bg-dynasty-elevated text-dynasty-text'
                  }`}
                >
                  {teamAbbreviation(teamId)}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            Eligible Pool
          </div>
          {userOnClock && (
            <button
              type="button"
              data-mobile-critical-control="offseason-pass-rule5"
              onClick={() => void onPassRule5Pick()}
              disabled={advancing}
              className="mobile-critical-control rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-dynasty-text transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
            >
              Pass Pick
            </button>
          )}
        </div>
        <div className="space-y-2">
          {rule5Pool.length > 0 ? (
            rule5Pool.slice(0, 12).map((player) => (
              <div
                key={player.playerId}
                className="flex items-center justify-between gap-3 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2"
              >
                <div>
                  <div className="font-data text-xs text-dynasty-textBright">
                    {playerLine(player)}
                  </div>
                  <div className="mt-1 font-heading text-xs text-dynasty-muted">
                    {teamLabel(player.teamId)} | Eligible after Season {player.rule5EligibleAfterSeason}
                  </div>
                </div>
                <button
                  type="button"
                  data-mobile-critical-control="offseason-draft-rule5"
                  onClick={() => void onRule5Pick(player.playerId)}
                  disabled={advancing || !userOnClock}
                  className="mobile-critical-control rounded bg-accent-primary px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-accent-primary/80 disabled:opacity-50"
                >
                  Draft
                </button>
              </div>
            ))
          ) : (
            <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3 font-heading text-sm text-dynasty-muted">
              The eligible pool is empty.
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            Completed Selections
          </div>
          <div className="space-y-2">
            {rule5.selections.length > 0 ? (
              rule5.selections.map((selection) => (
                <div
                  key={`${selection.overallPick}-${selection.playerId}`}
                  className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2"
                >
                  <div className="font-data text-xs text-dynasty-textBright">
                    Pick {selection.overallPick}: {selection.playerName}
                  </div>
                  <div className="mt-1 font-heading text-xs text-dynasty-muted">
                    {teamLabel(selection.draftingTeamId)} from {teamLabel(selection.originalTeamId)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3 font-heading text-sm text-dynasty-muted">
                No Rule 5 picks have been made yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
