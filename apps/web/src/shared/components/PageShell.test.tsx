import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { PageShell } from './PageShell';
import { usePreferencesStore } from '@/shared/hooks/usePreferencesStore';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matches && query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('PageShell', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    usePreferencesStore.getState().setReducedMotion(false);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders a skeleton fallback while the page is loading', async () => {
    mockReducedMotion(false);

    await act(async () => {
      root.render(
        <PageShell
          loading
          skeleton={<div data-testid="page-shell-skeleton">Loading shell</div>}
        >
          <div>Ready content</div>
        </PageShell>,
      );
    });

    expect(container.querySelector('[data-testid="page-shell-skeleton"]')).toBeTruthy();
    expect(container.textContent).not.toContain('Ready content');
  });

  it('disables motion styling when reduced motion is requested', async () => {
    mockReducedMotion(true);

    await act(async () => {
      root.render(
        <PageShell>
          <div>Quiet shell</div>
        </PageShell>,
      );
    });

    const shell = container.querySelector('[data-testid="page-shell"]');
    expect(shell?.getAttribute('data-motion')).toBe('reduced');
  });

  it('removes transform after the enter animation so fixed route overlays stay viewport-fixed', async () => {
    mockReducedMotion(false);
    let rafCallback: FrameRequestCallback | null = null;
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        rafCallback = callback;
        return 1;
      });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    await act(async () => {
      root.render(
        <PageShell>
          <div>Animated content</div>
        </PageShell>,
      );
    });

    const shell = container.querySelector('[data-testid="page-shell"]');
    expect(shell?.className).toContain('translate-y-2');

    await act(async () => {
      rafCallback?.(0);
    });

    expect(shell?.className).toContain('transform-none');
    expect(shell?.className).not.toContain('translate-y-0');
    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
  });
});
