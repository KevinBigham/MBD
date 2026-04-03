import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { PageShell } from './PageShell';

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
});
