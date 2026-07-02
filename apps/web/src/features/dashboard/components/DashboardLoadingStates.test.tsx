import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DashboardCardFallback, DashboardSkeleton } from './DashboardLoadingStates';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('DashboardLoadingStates', () => {
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

  it('renders the dashboard route skeleton with stable loading structure', async () => {
    await act(async () => {
      root.render(<DashboardSkeleton />);
    });

    expect(container.querySelector('[data-testid="dashboard-loading"]')).toBeTruthy();
    expect(container.querySelectorAll('.h-72')).toHaveLength(7);
    expect(container.querySelectorAll('.rounded-xl').length).toBeGreaterThanOrEqual(10);
  });

  it('renders the lazy dashboard card fallback title and placeholder rows', async () => {
    await act(async () => {
      root.render(<DashboardCardFallback title="Trade Intel" />);
    });

    expect(container.textContent).toContain('Trade Intel');
    expect(container.querySelector('section')).toBeTruthy();
    expect(container.querySelectorAll('.h-20')).toHaveLength(2);
  });
});
