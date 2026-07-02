import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TradeLoadingSkeleton from './TradeLoadingSkeleton';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('TradeLoadingSkeleton', () => {
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

  it('renders the trade route loading layout skeleton', async () => {
    await act(async () => {
      root.render(<TradeLoadingSkeleton />);
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="trade-loading"]')).not.toBeNull();
    expect(container.querySelectorAll('.h-\\[32rem\\]')).toHaveLength(2);
    expect(container.querySelector('.xl\\:col-span-4')).not.toBeNull();
    expect(container.querySelector('.xl\\:col-span-8')).not.toBeNull();
  });
});
