import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { PageHelp } from './PageHelp';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

async function flushFocusTrap() {
  await act(async () => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 60);
    });
  });
}

describe('PageHelp', () => {
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

  it('keeps the help dialog out of the tree until opened', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <PageHelp pageKey="roster" />
        </MemoryRouter>,
      );
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();

    const openButton = container.querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement | null;
    expect(openButton).not.toBeNull();

    await act(async () => {
      openButton?.click();
    });

    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');

    const closeButton = container.querySelector('button[aria-label="Close help panel"]') as HTMLButtonElement | null;
    await act(async () => {
      closeButton?.click();
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('resolves dynamic route page keys through the route guidance registry', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <PageHelp pageKey="/games/42" />
        </MemoryRouter>,
      );
    });

    const openButton = container.querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement | null;
    expect(openButton?.getAttribute('aria-label')).toBe('Help for Learn from one game');
  });

  it('traps focus inside the help dialog and restores launcher focus on Escape', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <PageHelp pageKey="roster" />
        </MemoryRouter>,
      );
    });

    const openButton = container.querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement;
    openButton.focus();

    await act(async () => {
      openButton.click();
    });
    await flushFocusTrap();

    const closeButton = container.querySelector('button[aria-label="Close help panel"]') as HTMLButtonElement;
    expect(document.activeElement).toBe(closeButton);

    const lastLink = Array.from(container.querySelectorAll('a')).find((link) =>
      link.textContent?.includes('Finance'),
    ) as HTMLAnchorElement;
    lastLink.focus();

    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      document.dispatchEvent(tabEvent);
    });
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(closeButton);

    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      document.dispatchEvent(shiftTabEvent);
    });
    expect(shiftTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(lastLink);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(openButton);
  });
});
