import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import DeadlineRecapCard from './DeadlineRecapCard';
import type { TradeDeadlineRecapView } from '@/workers/sim.worker.trade';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('DeadlineRecapCard', () => {
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

  it('renders deadline analysis, user outcomes, major moves, winners, and losers', async () => {
    const recap: TradeDeadlineRecapView = {
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
        {
          id: 'recap-trade-2',
          summary: 'Boston Noreasters offer for Anthony Volpe expired at the deadline.',
          outcome: 'missed',
          timestamp: 'S4D122',
        },
      ],
      majorMoves: [
        {
          id: 'move-1',
          summary: 'Seattle Drizzle landed Drew Example before the final bell.',
          timestamp: 'S4D121',
        },
      ],
      winners: ['Seattle Drizzle', 'New York Tycoons'],
      losers: ['Boston Noreasters'],
    };

    await act(async () => {
      root.render(<DeadlineRecapCard recap={recap} />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Deadline winners and losers');
    expect(container.textContent).toContain('Completed');
    expect(container.textContent).toContain('Missed');
    expect(container.textContent).toContain('New York Tycoons sent Anthony Volpe');
    expect(container.textContent).toContain('Boston Noreasters offer for Anthony Volpe expired');
    expect(container.textContent).toContain('Major Moves');
    expect(container.textContent).toContain('Seattle Drizzle landed Drew Example');
    expect(container.textContent).toContain('Winners');
    expect(container.textContent).toContain('Seattle Drizzle, New York Tycoons');
    expect(container.textContent).toContain('Losers');
    expect(container.textContent).toContain('Boston Noreasters');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });

  it('renders fallback labels when there are no winners or losers', async () => {
    const recap: TradeDeadlineRecapView = {
      season: 4,
      deadlineDay: 122,
      analysisHeadline: 'Quiet deadline',
      analysisBody: 'No team separated from the field.',
      yourTrades: [],
      majorMoves: [],
      winners: [],
      losers: [],
    };

    await act(async () => {
      root.render(<DeadlineRecapCard recap={recap} />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Quiet deadline');
    expect(container.textContent).toContain('Major Moves');
    expect(container.textContent).toContain('Winners');
    expect(container.textContent).toContain('Losers');
    expect(container.textContent).toContain('None');
  });
});
