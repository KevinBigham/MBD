import type { TradeCondition } from '@mbd/contracts';
import { humanizeLabel } from '@/shared/lib/labels';
import type { MultiTeamFairnessView } from '@/workers/sim.worker.trade';
import type { MultiTeamMovedPlayerView } from './MultiTeamFrameworkSummaryPanel';

interface MultiTeamControlColumnProps {
  conditionPlayerId: string;
  conditionTargets: MultiTeamMovedPlayerView[];
  conditions: TradeCondition[];
  disabled: boolean;
  fairness: MultiTeamFairnessView | null;
  onAddCondition: () => void | Promise<void>;
  onChangeConditionPlayer: (playerId: string) => void;
  onEvaluate: () => void | Promise<void>;
  teamDisplayName: (teamId: string) => string;
}

export default function MultiTeamControlColumn({
  conditionPlayerId,
  conditionTargets,
  conditions,
  disabled,
  fairness,
  onAddCondition,
  onChangeConditionPlayer,
  onEvaluate,
  teamDisplayName,
}: MultiTeamControlColumnProps) {
  const conditionControlsDisabled = disabled || conditionTargets.length === 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-heading text-sm font-semibold text-dynasty-text">Conditional Clauses</h3>
            <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              Add scaffolding from the moved-player pool
            </p>
          </div>
          <button
            type="button"
            data-mobile-critical-control="trade-multi-add-condition"
            onClick={() => void onAddCondition()}
            disabled={conditionControlsDisabled}
            className="mobile-critical-control focus-ring rounded-md border border-accent-warning/40 bg-accent-warning/10 px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-accent-warning transition-colors hover:bg-accent-warning/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add Condition
          </button>
        </div>
        <select
          data-mobile-critical-control="trade-multi-condition-player"
          value={conditionPlayerId}
          onChange={(event) => onChangeConditionPlayer(event.target.value)}
          disabled={conditionControlsDisabled}
          className="mobile-critical-control mt-3 w-full rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-sm text-dynasty-text focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Choose a moved player...</option>
          {conditionTargets.map((player) => (
            <option key={player.playerId} value={player.playerId}>
              {player.label}
            </option>
          ))}
        </select>
        <div className="mt-3 space-y-2">
          {conditions.length === 0 ? (
            <p className="font-heading text-xs text-dynasty-muted">No conditional clauses attached yet.</p>
          ) : (
            conditions.map((condition, index) => (
              <div key={`${condition.playerId}-${condition.type}-${index}`} className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
                  {humanizeLabel(condition.type)} · Deadline {condition.deadline}
                </div>
                <p className="mt-1 font-heading text-xs text-dynasty-text">{condition.description}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-heading text-sm font-semibold text-dynasty-text">Room Read</h3>
          <button
            type="button"
            data-mobile-critical-control="trade-multi-evaluate"
            onClick={() => void onEvaluate()}
            disabled={disabled}
            className="mobile-critical-control focus-ring rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-dynasty-text transition-colors hover:border-accent-info hover:text-accent-info disabled:cursor-not-allowed disabled:opacity-40"
          >
            Evaluate
          </button>
        </div>
        {fairness ? (
          <div className="mt-3 space-y-3">
            <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
              <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Fairness Score</div>
              <div className="mt-1 font-heading text-lg text-dynasty-textBright">{fairness.fairnessScore}</div>
              <div className="mt-1 font-heading text-xs text-dynasty-muted">
                {fairness.isBalanced
                  ? 'Framework is inside tolerance.'
                  : `${teamDisplayName(fairness.mostDisadvantagedTeam)} is outside the current tolerance.`}
              </div>
            </div>
            <div className="space-y-2">
              {fairness.netValueByTeam.map((team) => (
                <div key={team.teamId} className="flex items-center justify-between rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                  <div>
                    <div className="font-heading text-sm text-dynasty-text">{team.teamName}</div>
                    <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">{team.teamAbbreviation}</div>
                  </div>
                  <div className={`font-data text-sm ${team.netValue >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                    {team.netValue >= 0 ? '+' : ''}{team.netValue.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 font-heading text-xs text-dynasty-muted">
            Run an evaluation to see balance score, net value by club, and which team is resisting the shape.
          </p>
        )}
      </div>
    </div>
  );
}
