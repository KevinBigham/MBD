import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { FileText } from 'lucide-react';
import { OffseasonCurrentPhasePanel } from './OffseasonCurrentPhasePanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('OffseasonCurrentPhasePanel', () => {
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
    vi.clearAllMocks();
  });

  it('renders the current phase and delegates advance/skip controls', async () => {
    const onAdvance = vi.fn();
    const onSkip = vi.fn();

    await act(async () => {
      root.render(
        <OffseasonCurrentPhasePanel
          label="Qualifying Offers"
          description="Extend qualifying offers before the market opens."
          icon={FileText}
          phaseDay={4}
          advancing={false}
          onAdvance={onAdvance}
          onSkip={onSkip}
        />,
      );
    });

    expect(container.textContent).toContain('Qualifying Offers');
    expect(container.textContent).toContain('Day 4');
    expect(container.textContent).toContain('Extend qualifying offers');

    const advanceButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Advance Day'),
    );
    const skipButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Skip Phase'),
    );

    expect(advanceButton?.getAttribute('data-mobile-critical-control')).toBe('offseason-advance-day');
    expect(skipButton?.getAttribute('data-mobile-critical-control')).toBe('offseason-skip-phase');

    await act(async () => {
      advanceButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      skipButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('disables controls while the route is advancing', async () => {
    await act(async () => {
      root.render(
        <OffseasonCurrentPhasePanel
          label="Free Agency"
          description="Sign free agents."
          icon={FileText}
          phaseDay={null}
          advancing
          onAdvance={vi.fn()}
          onSkip={vi.fn()}
        />,
      );
    });

    for (const button of container.querySelectorAll('button')) {
      expect(button.hasAttribute('disabled')).toBe(true);
    }
  });
});
