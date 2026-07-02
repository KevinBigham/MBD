import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TradeMarketStatusPanel from './TradeMarketStatusPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('TradeMarketStatusPanel', () => {
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

  it('renders market copy with open and closed status tones', async () => {
    await act(async () => {
      root.render(
        <TradeMarketStatusPanel
          detail="Two weeks remain before the deadline."
          headline="Trade market is open"
          tradeMarketOpen
        />,
      );
      await Promise.resolve();
    });

    const openPanel = container.querySelector('[data-testid="trade-market-status-panel"]');
    expect(openPanel?.className).toContain('border-accent-warning/30');
    expect(container.textContent).toContain('Trade market is open');
    expect(container.textContent).toContain('Two weeks remain before the deadline.');

    await act(async () => {
      root.render(
        <TradeMarketStatusPanel
          detail="Trades reopen once the regular season resumes."
          headline="Trade market is closed"
          tradeMarketOpen={false}
        />,
      );
      await Promise.resolve();
    });

    const closedPanel = container.querySelector('[data-testid="trade-market-status-panel"]');
    expect(closedPanel?.className).toContain('border-dynasty-border');
    expect(container.textContent).toContain('Trade market is closed');
    expect(container.textContent).toContain('Trades reopen once the regular season resumes.');
  });
});
