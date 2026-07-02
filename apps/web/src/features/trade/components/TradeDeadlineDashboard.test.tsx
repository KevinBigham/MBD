import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TradeDeadlineDashboard from './TradeDeadlineDashboard';
import type { TradeDeadlineStateView } from '@/workers/sim.worker.trade';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createDeadlineState(): TradeDeadlineStateView {
  return {
    currentPhase: 'regular',
    deadlineDay: 122,
    daysUntilDeadline: 4,
    deadlineMode: true,
    teamMode: 'buyer',
    modeSummary: 'The room expects you to push for MLB impact before the deadline shuts.',
    countdownLabel: '4 days to deadline',
    hotOffers: [],
    ticker: [],
    chatter: [
      {
        id: 'buyer-mode',
        headline: 'New York Tycoons are flagged as buyers',
        detail: 'The room is reading urgency around upgrades that move the playoff needle.',
        mode: 'buyer',
        teamId: null,
      },
    ],
    marketIntel: [],
    warRoom: {
      headline: 'Final sprint war room',
      detail: 'Keep the board narrow and pressure-test every ask.',
      currentCheckpointDay: 118,
      nextCheckpointDay: 120,
      completedCheckpoints: 6,
      totalCheckpoints: 8,
      callsToAction: [
        'Prioritize the hottest incoming offers.',
      ],
    },
    recap: {
      season: 4,
      deadlineDay: 122,
      analysisHeadline: 'Deadline winners and losers',
      analysisBody: 'New York pushed its chips in while Boston waited too long.',
      yourTrades: [
        {
          id: 'recap-trade-1',
          summary: 'New York Tycoons sent Anthony Volpe to Boston Noreasters for Roman Anthony.',
          outcome: 'completed',
          timestamp: 'S4D121',
        },
      ],
      majorMoves: [],
      winners: ['New York Tycoons'],
      losers: ['Boston Noreasters'],
    },
  };
}

describe('TradeDeadlineDashboard', () => {
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

  it('composes market status, deadline theatre, drama slot, and recap', async () => {
    await act(async () => {
      root.render(
        <TradeDeadlineDashboard
          deadlineDramaSlot={<section data-testid="deadline-drama-slot">Deadline Drama Slot</section>}
          deadlineState={createDeadlineState()}
          detail="Two weeks remain before the deadline."
          headline="Trade market is open"
          tradeMarketOpen
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Trade market is open');
    expect(container.textContent).toContain('Two weeks remain before the deadline.');
    expect(container.textContent).toContain('Trade Deadline Theatre');
    expect(container.textContent).toContain('Deadline Drama Slot');
    expect(container.textContent).toContain('Deadline winners and losers');
    expect(container.textContent).toContain('New York Tycoons sent Anthony Volpe');
  });

  it('keeps market and drama slot visible when deadline state is not loaded', async () => {
    await act(async () => {
      root.render(
        <TradeDeadlineDashboard
          deadlineDramaSlot={<section data-testid="deadline-drama-slot">Deadline Drama Slot</section>}
          deadlineState={null}
          detail="Trades reopen once the regular season resumes."
          headline="Trade market is closed"
          tradeMarketOpen={false}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Trade market is closed');
    expect(container.textContent).toContain('Trades reopen once the regular season resumes.');
    expect(container.textContent).toContain('Deadline Drama Slot');
    expect(container.textContent).not.toContain('Trade Deadline Theatre');
  });
});
