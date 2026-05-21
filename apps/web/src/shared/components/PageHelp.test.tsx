import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { PageHelp } from './PageHelp';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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
});
