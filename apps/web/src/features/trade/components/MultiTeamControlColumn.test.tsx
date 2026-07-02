import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import MultiTeamControlColumn from './MultiTeamControlColumn';
import type { TradeCondition } from '@mbd/contracts';
import type { MultiTeamMovedPlayerView } from './MultiTeamFrameworkSummaryPanel';
import type { MultiTeamFairnessView } from '@/workers/sim.worker.trade';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('MultiTeamControlColumn', () => {
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

  it('renders conditional clauses and routes condition/evaluation actions', async () => {
    const onAddCondition = vi.fn();
    const onChangeConditionPlayer = vi.fn();
    const onEvaluate = vi.fn();
    const conditionTargets: MultiTeamMovedPlayerView[] = [
      { playerId: 'nym-1', label: 'Anthony Volpe (NYM - New York Metros)' },
      { playerId: 'bos-1', label: 'Roman Anthony (BOS - Boston Noreasters)' },
    ];
    const conditions: TradeCondition[] = [
      {
        playerId: 'nym-1',
        type: 'games_played',
        threshold: 450,
        deadline: 5,
        description: 'If Anthony Volpe reaches 450 PA, NYM receives a fifth-round pick.',
      },
    ];
    const fairness: MultiTeamFairnessView = {
      isBalanced: false,
      maxImbalance: 14,
      mostDisadvantagedTeam: 'sea',
      fairnessScore: 72,
      netValueByTeam: [
        { teamId: 'nym', teamName: 'New York Metros', teamAbbreviation: 'NYM', netValue: 8.25 },
        { teamId: 'bos', teamName: 'Boston Noreasters', teamAbbreviation: 'BOS', netValue: -3.5 },
      ],
    };

    await act(async () => {
      root.render(
        <MultiTeamControlColumn
          conditionPlayerId="nym-1"
          conditionTargets={conditionTargets}
          conditions={conditions}
          disabled={false}
          fairness={fairness}
          onAddCondition={onAddCondition}
          onChangeConditionPlayer={onChangeConditionPlayer}
          onEvaluate={onEvaluate}
          teamDisplayName={(teamId) => ({
            sea: 'SEA - Seattle Drizzle',
          }[teamId] ?? teamId.toUpperCase())}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Conditional Clauses');
    expect(container.textContent).toContain('Add scaffolding from the moved-player pool');
    expect(container.textContent).toContain('Anthony Volpe (NYM - New York Metros)');
    expect(container.textContent).toContain('Roman Anthony (BOS - Boston Noreasters)');
    expect(container.textContent).toContain('Games Played · Deadline 5');
    expect(container.textContent).toContain('If Anthony Volpe reaches 450 PA');
    expect(container.textContent).toContain('Room Read');
    expect(container.textContent).toContain('Fairness Score');
    expect(container.textContent).toContain('72');
    expect(container.textContent).toContain('SEA - Seattle Drizzle is outside the current tolerance.');
    expect(container.textContent).toContain('New York Metros');
    expect(container.textContent).toContain('+8.3');
    expect(container.textContent).toContain('Boston Noreasters');
    expect(container.textContent).toContain('-3.5');

    await act(async () => {
      const select = container.querySelector('select') as HTMLSelectElement;
      select.value = 'bos-1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Add Condition')) as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Evaluate')) as HTMLButtonElement).click();
    });

    expect(onChangeConditionPlayer).toHaveBeenCalledWith('bos-1');
    expect(onAddCondition).toHaveBeenCalledOnce();
    expect(onEvaluate).toHaveBeenCalledOnce();
  });

  it('renders empty states and disables condition controls without moved players', async () => {
    const onAddCondition = vi.fn();
    const onEvaluate = vi.fn();

    await act(async () => {
      root.render(
        <MultiTeamControlColumn
          conditionPlayerId=""
          conditionTargets={[]}
          conditions={[]}
          disabled
          fairness={null}
          onAddCondition={onAddCondition}
          onChangeConditionPlayer={vi.fn()}
          onEvaluate={onEvaluate}
          teamDisplayName={(teamId) => teamId.toUpperCase()}
        />,
      );
      await Promise.resolve();
    });

    const addButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Add Condition')) as HTMLButtonElement;
    const evaluateButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Evaluate')) as HTMLButtonElement;
    const select = container.querySelector('select') as HTMLSelectElement;

    expect(container.textContent).toContain('No conditional clauses attached yet.');
    expect(container.textContent).toContain('Run an evaluation to see balance score');
    expect(addButton.disabled).toBe(true);
    expect(evaluateButton.disabled).toBe(true);
    expect(select.disabled).toBe(true);

    await act(async () => {
      addButton.click();
      evaluateButton.click();
    });

    expect(onAddCondition).not.toHaveBeenCalled();
    expect(onEvaluate).not.toHaveBeenCalled();
  });
});
