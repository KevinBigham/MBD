import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import TradePageHeader from './TradePageHeader';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('TradePageHeader', () => {
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

  it('renders the trade route heading and help affordance', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <TradePageHeader />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    expect(container.querySelector('h1')?.textContent).toBe('Trade Center');
    expect(container.textContent).toContain('Deadline pressure, incoming offers, and every deal from around the league.');
    expect(container.querySelector('button[aria-label="Help for Price the player and the situation"]')).not.toBeNull();
  });
});
