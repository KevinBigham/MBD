import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useFocusTrap } from './useFocusTrap';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('useFocusTrap', () => {
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

  it('is a function', () => {
    expect(typeof useFocusTrap).toBe('function');
  });

  it('exports from the correct path', () => {
    expect(useFocusTrap).toBeDefined();
  });

  it('focuses the first visible element and wraps tab navigation', async () => {
    function Harness() {
      const trapRef = useFocusTrap<HTMLDivElement>(true);
      return createElement(
        'div',
        { ref: trapRef, tabIndex: -1 },
        createElement('button', { type: 'button' }, 'First'),
        createElement('a', { href: '#last' }, 'Last'),
      );
    }

    await act(async () => {
      root.render(createElement(Harness));
    });
    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 60);
      });
    });

    const first = container.querySelector('button') as HTMLButtonElement;
    const last = container.querySelector('a') as HTMLAnchorElement;
    expect(document.activeElement).toBe(first);

    last.focus();
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      document.dispatchEvent(tabEvent);
    });
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

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
    expect(document.activeElement).toBe(last);
  });
});
