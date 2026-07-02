import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import MultiTeamTradeModal from './MultiTeamTradeModal';
import type { MultiTeamLaneState } from './MultiTeamLaneCard';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type {
  MultiTeamTradeExecutionResult,
  MultiTeamTradeProposalResult,
} from '@/workers/sim.worker.trade';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makePlayer(overrides: Partial<PlayerDTO> & Pick<PlayerDTO, 'id'>): PlayerDTO {
  const { id, ...rest } = overrides;
  return {
    id,
    firstName: overrides.firstName ?? 'Francisco',
    lastName: overrides.lastName ?? 'Alvarez',
    teamId: overrides.teamId ?? 'nym',
    position: overrides.position ?? 'C',
    age: overrides.age ?? 24,
    overallRating: overrides.overallRating ?? 78,
    displayRating: overrides.displayRating ?? 80,
    letterGrade: overrides.letterGrade ?? 'B',
    rosterStatus: overrides.rosterStatus ?? 'MLB',
    serviceTimeDays: overrides.serviceTimeDays ?? 540,
    optionYearsUsed: overrides.optionYearsUsed ?? 1,
    isOutOfOptions: overrides.isOutOfOptions ?? false,
    minorLeagueLevel: overrides.minorLeagueLevel ?? null,
    contract: overrides.contract ?? {
      years: 3,
      annualSalary: 4.2,
      totalValue: 12.6,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    ceiling: overrides.ceiling ?? 86,
    floor: overrides.floor ?? 66,
    developmentProgram: overrides.developmentProgram ?? null,
    developmentTrajectory: overrides.developmentTrajectory ?? 'steady',
    personalityTraits: overrides.personalityTraits ?? [],
    extensionHistory: overrides.extensionHistory ?? [],
    stats: overrides.stats ?? null,
    advanced: overrides.advanced ?? null,
    ...rest,
  };
}

function baseLanes(): MultiTeamLaneState[] {
  return [
    {
      laneId: 'lane-1',
      teamId: 'nym',
      role: 'initiator',
      outgoing: [{ playerId: 'nym-1', destinationTeamId: 'bos' }],
    },
    { laneId: 'lane-2', teamId: 'bos', role: 'partner', outgoing: [] },
    { laneId: 'lane-3', teamId: 'sea', role: 'facilitator', outgoing: [] },
  ];
}

describe('MultiTeamTradeModal', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the modal shell and routes top-level multi-team actions', async () => {
    const onAddLane = vi.fn();
    const onClose = vi.fn();
    const onRemoveLane = vi.fn();
    const onPropose = vi.fn();
    const onExecute = vi.fn();
    const proposalResult: MultiTeamTradeProposalResult = {
      success: true,
      accepted: true,
      message: 'Framework accepted.',
      narrative: 'All three rooms signed off.',
      fairness: null,
    };
    const executionResult: MultiTeamTradeExecutionResult = {
      success: true,
      accepted: true,
      message: 'Deal executed.',
      narrative: 'The three-club trade is official.',
      fairness: null,
      cascadeEvents: [
        {
          triggeredTradeId: 'trade-conditional-1',
          reason: 'A prospect threshold condition is now active.',
          affectedTeamIds: ['nym', 'bos'],
        },
      ],
      pendingTrades: [],
    };

    await act(async () => {
      root.render(
        <MultiTeamTradeModal
          lanes={baseLanes()}
          teamOptions={[
            { id: 'nym', label: 'NYM - New York Metros' },
            { id: 'bos', label: 'BOS - Boston Noreasters' },
            { id: 'sea', label: 'SEA - Seattle Drizzle' },
            { id: 'oak', label: 'OAK - Oakland Oaks' },
          ]}
          rosters={{ nym: [makePlayer({ id: 'nym-1' })], bos: [], sea: [] }}
          movedPlayers={[{ playerId: 'nym-1', label: 'Francisco Alvarez' }]}
          proposalTeams={[
            {
              teamId: 'nym',
              role: 'initiator',
              sendingPlayerIds: ['nym-1'],
              receivingPlayerIds: [],
            },
            { teamId: 'bos', role: 'partner', sendingPlayerIds: [], receivingPlayerIds: ['nym-1'] },
            { teamId: 'sea', role: 'facilitator', sendingPlayerIds: [], receivingPlayerIds: [] },
          ]}
          conditionPlayerId=""
          conditionTargets={[{ playerId: 'nym-1', label: 'Francisco Alvarez' }]}
          conditions={[]}
          disabled={false}
          fairness={null}
          message="Room read updated."
          proposalResult={proposalResult}
          executionResult={executionResult}
          onAddLane={onAddLane}
          onClose={onClose}
          onRemoveLane={onRemoveLane}
          onChangeLaneTeam={vi.fn()}
          onToggleLanePlayer={vi.fn()}
          onChangeLaneDestination={vi.fn()}
          onAddCondition={vi.fn()}
          onChangeConditionPlayer={vi.fn()}
          onEvaluate={vi.fn()}
          onPropose={onPropose}
          onExecute={onExecute}
          teamDisplayName={(teamId) => teamId.toUpperCase()}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('3+ Team Trade');
    expect(container.textContent).toContain('Add Fourth Team');
    expect(container.textContent).toContain('Remove Lane');
    expect(container.textContent).toContain('Francisco Alvarez');
    expect(container.textContent).toContain('Proposal Response');
    expect(container.textContent).toContain('Execution Result');
    expect(container.textContent).toContain('A prospect threshold condition is now active.');

    const buttons = Array.from(container.querySelectorAll('button'));
    await act(async () => {
      buttons.find((button) => button.textContent === 'Add Fourth Team')?.click();
      buttons.find((button) => button.textContent === 'Close')?.click();
      buttons.find((button) => button.textContent === 'Remove Lane')?.click();
      buttons.find((button) => button.textContent === 'Propose Framework')?.click();
      buttons.find((button) => button.textContent === 'Execute 3+ Team Trade')?.click();
    });

    expect(onAddLane).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRemoveLane).toHaveBeenCalledWith('lane-3');
    expect(onPropose).toHaveBeenCalledTimes(1);
    expect(onExecute).toHaveBeenCalledTimes(1);
  });

  it('hides add-lane control at four teams and disables execution without approval', async () => {
    const onExecute = vi.fn();

    await act(async () => {
      root.render(
        <MultiTeamTradeModal
          lanes={[
            ...baseLanes(),
            { laneId: 'lane-4', teamId: 'oak', role: 'facilitator', outgoing: [] },
          ]}
          teamOptions={[
            { id: 'nym', label: 'NYM - New York Metros' },
            { id: 'bos', label: 'BOS - Boston Noreasters' },
            { id: 'sea', label: 'SEA - Seattle Drizzle' },
            { id: 'oak', label: 'OAK - Oakland Oaks' },
          ]}
          rosters={{ nym: [], bos: [], sea: [], oak: [] }}
          movedPlayers={[]}
          proposalTeams={[]}
          conditionPlayerId=""
          conditionTargets={[]}
          conditions={[]}
          disabled={false}
          fairness={null}
          message={null}
          proposalResult={null}
          executionResult={null}
          onAddLane={vi.fn()}
          onClose={vi.fn()}
          onRemoveLane={vi.fn()}
          onChangeLaneTeam={vi.fn()}
          onToggleLanePlayer={vi.fn()}
          onChangeLaneDestination={vi.fn()}
          onAddCondition={vi.fn()}
          onChangeConditionPlayer={vi.fn()}
          onEvaluate={vi.fn()}
          onPropose={vi.fn()}
          onExecute={onExecute}
          teamDisplayName={(teamId) => teamId.toUpperCase()}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).not.toContain('Add Fourth Team');
    const executeButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Execute 3+ Team Trade') as HTMLButtonElement;
    expect(executeButton.disabled).toBe(true);

    await act(async () => {
      executeButton.click();
    });

    expect(onExecute).not.toHaveBeenCalled();
  });

  it('traps keyboard focus inside the dialog and closes on Escape', async () => {
    const onClose = vi.fn();
    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.textContent = 'Open multi-team trade';
    document.body.appendChild(launcher);
    launcher.focus();

    await act(async () => {
      root.render(
        <MultiTeamTradeModal
          lanes={baseLanes()}
          teamOptions={[
            { id: 'nym', label: 'NYM - New York Metros' },
            { id: 'bos', label: 'BOS - Boston Noreasters' },
            { id: 'sea', label: 'SEA - Seattle Drizzle' },
            { id: 'oak', label: 'OAK - Oakland Oaks' },
          ]}
          rosters={{ nym: [makePlayer({ id: 'nym-1' })], bos: [], sea: [] }}
          movedPlayers={[{ playerId: 'nym-1', label: 'Francisco Alvarez' }]}
          proposalTeams={[]}
          conditionPlayerId=""
          conditionTargets={[{ playerId: 'nym-1', label: 'Francisco Alvarez' }]}
          conditions={[]}
          disabled={false}
          fairness={null}
          message={null}
          proposalResult={{
            success: true,
            accepted: true,
            message: 'Framework accepted.',
            narrative: 'All three rooms signed off.',
            fairness: null,
          }}
          executionResult={null}
          onAddLane={vi.fn()}
          onClose={onClose}
          onRemoveLane={vi.fn()}
          onChangeLaneTeam={vi.fn()}
          onToggleLanePlayer={vi.fn()}
          onChangeLaneDestination={vi.fn()}
          onAddCondition={vi.fn()}
          onChangeConditionPlayer={vi.fn()}
          onEvaluate={vi.fn()}
          onPropose={vi.fn()}
          onExecute={vi.fn()}
          teamDisplayName={(teamId) => teamId.toUpperCase()}
        />,
      );
      await Promise.resolve();
    });

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    const closeButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Close') as HTMLButtonElement;
    const firstButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Add Fourth Team') as HTMLButtonElement;
    const executeButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Execute 3+ Team Trade') as HTMLButtonElement;

    expect(document.activeElement).toBe(closeButton);

    executeButton.focus();
    executeButton.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Tab',
    }));
    expect(document.activeElement).toBe(firstButton);

    firstButton.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Tab',
      shiftKey: true,
    }));
    expect(document.activeElement).toBe(executeButton);

    closeButton.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Escape',
    }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
    expect(document.activeElement).toBe(launcher);
    launcher.remove();
  });
});
