import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import HistoryLoadingSkeleton from './HistoryLoadingSkeleton';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('HistoryLoadingSkeleton', () => {
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

  it('renders the history route loading layout skeleton', async () => {
    await act(async () => {
      root.render(<HistoryLoadingSkeleton />);
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="history-loading"]')).not.toBeNull();
    expect(container.querySelector('.h-12.w-72')).not.toBeNull();
    expect(container.querySelectorAll('.h-44')).toHaveLength(2);
    expect(container.querySelectorAll('.h-72')).toHaveLength(2);
  });
});
