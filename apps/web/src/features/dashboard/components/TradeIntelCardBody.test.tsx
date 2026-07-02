import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import TradeIntelCardBody from './TradeIntelCardBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('TradeIntelCardBody', () => {
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

  async function renderBody({
    activeTradeOffers = 0,
    daysUntilDeadline = null,
    phase = 'regular',
    recentSummary = null,
    recentTrades = [],
  }: Partial<Parameters<typeof TradeIntelCardBody>[0]> = {}) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <TradeIntelCardBody
            activeTradeOffers={activeTradeOffers}
            daysUntilDeadline={daysUntilDeadline}
            phase={phase}
            recentSummary={recentSummary}
            recentTrades={recentTrades}
          />
        </MemoryRouter>,
      );
    });
  }

  it('renders regular-season deadline pressure, active offers, summary, and trade wire rows', async () => {
    await renderBody({
      activeTradeOffers: 3,
      daysUntilDeadline: 34,
      recentSummary: 'The market is moving.',
      recentTrades: [
        {
          id: 'trade-1',
          timestamp: 'S7D92',
          summary: 'Boston acquired a late-inning arm.',
        },
      ],
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Deadline');
    expect(text).toContain('34');
    expect(text).toContain('Days until the regular-season market locks.');
    expect(text).toContain('Active offers');
    expect(text).toContain('3');
    expect(text).toContain('The market is moving.');
    expect(text).toContain('S7D92');
    expect(text).toContain('Boston acquired a late-inning arm.');
    expect(container.querySelector('a[href="/trade?mode=quick"]')).toBeTruthy();
    expect(container.querySelector('a[href="/trade?mode=market"]')).toBeTruthy();
    expect(container.querySelector('a[href="/trade?mode=history"]')).toBeTruthy();
  });

  it('renders phase-aware deadline copy and empty fallbacks without trade activity', async () => {
    await renderBody({
      phase: 'offseason',
    });

    const text = container.textContent ?? '';
    expect(text).toContain('--');
    expect(text).toContain('Offseason roster work runs through free agency before the deadline clock starts.');
    expect(text).toContain('No meaningful trade chatter has surfaced yet.');
    expect(text).toContain('No completed trades are on the league wire yet.');
  });
});
