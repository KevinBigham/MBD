import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('KeyboardShortcutsPanel', () => {
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

  it('renders as a modal dialog and keeps keyboard focus inside the panel', async () => {
    const onClose = vi.fn();

    await act(async () => {
      root.render(<KeyboardShortcutsPanel open onClose={onClose} />);
      await Promise.resolve();
    });

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('keyboard-shortcuts-title');

    const closeButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Close keyboard shortcuts panel"]',
    );
    expect(closeButton).not.toBeNull();
    expect(document.activeElement).toBe(closeButton);

    closeButton?.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Tab',
    }));
    expect(document.activeElement).toBe(closeButton);

    closeButton?.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Tab',
      shiftKey: true,
    }));
    expect(document.activeElement).toBe(closeButton);
  });
});
