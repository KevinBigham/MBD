import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import MultiTeamResultStack from './MultiTeamResultStack';
import type {
  MultiTeamTradeExecutionResult,
  MultiTeamTradeProposalResult,
} from '@/workers/sim.worker.trade';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('MultiTeamResultStack', () => {
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

  it('renders multi-team message, proposal response, and execution cascade rows', async () => {
    const proposalResult: MultiTeamTradeProposalResult = {
      success: true,
      accepted: false,
      message: 'Framework needs one more club.',
      narrative: 'Seattle wants a young arm before signing off.',
      fairness: null,
      blockingTeamId: 'sea',
      blockReason: 'SEA is outside the current value tolerance.',
    };
    const executionResult: MultiTeamTradeExecutionResult = {
      success: true,
      accepted: true,
      message: 'Trade executed.',
      narrative: 'The three-team deal is official.',
      fairness: null,
      cascadeEvents: [
        {
          triggeredTradeId: 'trade-42',
          reason: 'Conditional prospect clause is now active.',
          affectedTeamIds: ['nym', 'sea'],
        },
      ],
      pendingTrades: [],
    };

    await act(async () => {
      root.render(
        <MultiTeamResultStack
          message="Room read updated."
          proposalResult={proposalResult}
          executionResult={executionResult}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Room read updated.');
    expect(container.textContent).toContain('Proposal Response');
    expect(container.textContent).toContain('Seattle wants a young arm before signing off.');
    expect(container.textContent).toContain('SEA is outside the current value tolerance.');
    expect(container.textContent).toContain('Execution Result');
    expect(container.textContent).toContain('The three-team deal is official.');
    expect(container.textContent).toContain('Conditional prospect clause is now active.');
  });

  it('renders no markup when there are no multi-team results', async () => {
    await act(async () => {
      root.render(
        <MultiTeamResultStack
          message={null}
          proposalResult={null}
          executionResult={null}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toBe('');
    expect(container.children).toHaveLength(0);
  });
});
