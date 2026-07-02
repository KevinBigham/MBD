import { useEffect, useRef } from 'react';
import type { TradeCondition } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type {
  MultiTeamFairnessView,
  MultiTeamTradeExecutionResult,
  MultiTeamTradeProposalResult,
} from '@/workers/sim.worker.trade';
import MultiTeamControlColumn from './MultiTeamControlColumn';
import MultiTeamFrameworkSummaryPanel, {
  type MultiTeamFrameworkTeamView,
  type MultiTeamMovedPlayerView,
} from './MultiTeamFrameworkSummaryPanel';
import MultiTeamLaneCard, { type MultiTeamLaneState } from './MultiTeamLaneCard';
import MultiTeamResultStack from './MultiTeamResultStack';

interface MultiTeamTeamOption {
  id: string;
  label: string;
}

interface MultiTeamTradeModalProps {
  lanes: MultiTeamLaneState[];
  teamOptions: MultiTeamTeamOption[];
  rosters: Record<string, PlayerDTO[]>;
  movedPlayers: MultiTeamMovedPlayerView[];
  proposalTeams: MultiTeamFrameworkTeamView[];
  conditionPlayerId: string;
  conditionTargets: MultiTeamMovedPlayerView[];
  conditions: TradeCondition[];
  disabled: boolean;
  fairness: MultiTeamFairnessView | null;
  message: string | null;
  proposalResult: MultiTeamTradeProposalResult | null;
  executionResult: MultiTeamTradeExecutionResult | null;
  onAddLane: () => void;
  onClose: () => void;
  onRemoveLane: (laneId: string) => void;
  onChangeLaneTeam: (laneId: string, teamId: string) => void;
  onToggleLanePlayer: (laneId: string, playerId: string) => void;
  onChangeLaneDestination: (laneId: string, playerId: string, destinationTeamId: string) => void;
  onAddCondition: () => void | Promise<void>;
  onChangeConditionPlayer: (playerId: string) => void;
  onEvaluate: () => void | Promise<void>;
  onPropose: () => void | Promise<void>;
  onExecute: () => void | Promise<void>;
  teamDisplayName: (teamId: string) => string;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function buildTeamOptionsForLane(
  lane: MultiTeamLaneState,
  lanes: MultiTeamLaneState[],
  teamOptions: MultiTeamTeamOption[],
) {
  return teamOptions.map((team) => ({
    ...team,
    disabled:
      team.id !== lane.teamId
      && lanes.some((candidate) => candidate.laneId !== lane.laneId && candidate.teamId === team.id),
  }));
}

function buildDestinationOptions(
  lane: MultiTeamLaneState,
  lanes: MultiTeamLaneState[],
  teamDisplayName: (teamId: string) => string,
) {
  return lanes
    .filter((candidate) => candidate.laneId !== lane.laneId && candidate.teamId)
    .map((candidate) => ({
      id: candidate.teamId,
      label: teamDisplayName(candidate.teamId),
    }));
}

export default function MultiTeamTradeModal({
  lanes,
  teamOptions,
  rosters,
  movedPlayers,
  proposalTeams,
  conditionPlayerId,
  conditionTargets,
  conditions,
  disabled,
  fairness,
  message,
  proposalResult,
  executionResult,
  onAddLane,
  onClose,
  onRemoveLane,
  onChangeLaneTeam,
  onToggleLanePlayer,
  onChangeLaneDestination,
  onAddCondition,
  onChangeConditionPlayer,
  onEvaluate,
  onPropose,
  onExecute,
  teamDisplayName,
}: MultiTeamTradeModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const getFocusableElements = () => Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    );

    const focusableElements = getFocusableElements();
    const initialFocus = closeButtonRef.current && !closeButtonRef.current.disabled
      ? closeButtonRef.current
      : focusableElements[0] ?? dialogRef.current;
    initialFocus?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!disabled) {
          onClose();
        }
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const currentFocusableElements = getFocusableElements();
      const firstElement = currentFocusableElements[0] ?? dialogRef.current;
      const lastElement = currentFocusableElements[currentFocusableElements.length - 1] ?? dialogRef.current;

      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey) {
        if (document.activeElement === firstElement || !dialogRef.current?.contains(document.activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (document.activeElement === lastElement || !dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [disabled, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 py-8">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="3+ Team Trade"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-7xl overflow-y-auto rounded-xl border border-dynasty-border bg-dynasty-surface p-5 shadow-2xl"
      >
        <div className="flex flex-col gap-3 border-b border-dynasty-border pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-dynasty-textBright">3+ Team Trade</h2>
            <p className="mt-1 font-heading text-sm text-dynasty-muted">
              Build a three- or four-club framework, add a condition, then route it through the room.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lanes.length < 4 ? (
              <button
                type="button"
                onClick={onAddLane}
                disabled={disabled}
                className="focus-ring rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-dynasty-text transition-colors hover:border-accent-info hover:text-accent-info disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add Fourth Team
              </button>
            ) : null}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              disabled={disabled}
              className="focus-ring rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted transition-colors hover:border-accent-danger hover:text-accent-danger disabled:cursor-not-allowed disabled:opacity-40"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {lanes.map((lane, index) => (
            <div key={lane.laneId} className="space-y-2">
              <MultiTeamLaneCard
                lane={lane}
                roster={rosters[lane.teamId] ?? []}
                teamOptions={buildTeamOptionsForLane(lane, lanes, teamOptions)}
                destinationOptions={buildDestinationOptions(lane, lanes, teamDisplayName)}
                teamSelectionLocked={index === 0}
                disabled={disabled}
                onChangeTeam={(teamId) => onChangeLaneTeam(lane.laneId, teamId)}
                onTogglePlayer={(playerId) => onToggleLanePlayer(lane.laneId, playerId)}
                onChangeDestination={(playerId, destinationTeamId) =>
                  onChangeLaneDestination(lane.laneId, playerId, destinationTeamId)
                }
              />
              {index >= 2 ? (
                <button
                  type="button"
                  onClick={() => onRemoveLane(lane.laneId)}
                  disabled={disabled}
                  className="focus-ring rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted transition-colors hover:border-accent-danger hover:text-accent-danger disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove Lane
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <MultiTeamFrameworkSummaryPanel
            movedPlayers={movedPlayers}
            multiTeamRosters={rosters}
            teamDisplayName={teamDisplayName}
            teams={proposalTeams}
          />

          <MultiTeamControlColumn
            conditionPlayerId={conditionPlayerId}
            conditionTargets={conditionTargets}
            conditions={conditions}
            disabled={disabled}
            fairness={fairness}
            onAddCondition={onAddCondition}
            onChangeConditionPlayer={onChangeConditionPlayer}
            onEvaluate={onEvaluate}
            teamDisplayName={teamDisplayName}
          />
        </div>

        <MultiTeamResultStack
          message={message}
          proposalResult={proposalResult}
          executionResult={executionResult}
        />

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-dynasty-border pt-4">
          <button
            type="button"
            onClick={() => void onPropose()}
            disabled={disabled}
            className="focus-ring rounded-md border border-accent-info/40 bg-accent-info/10 px-4 py-2 font-heading text-xs uppercase tracking-[0.18em] text-accent-info transition-colors hover:bg-accent-info/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Propose Framework
          </button>
          <button
            type="button"
            onClick={() => void onExecute()}
            disabled={disabled || !proposalResult?.accepted}
            className="focus-ring rounded-md bg-accent-primary px-4 py-2 font-heading text-xs uppercase tracking-[0.18em] text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Execute 3+ Team Trade
          </button>
        </div>
      </div>
    </div>
  );
}
