import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SaveSessionConflictDialog,
  type SaveSessionConflictDialogProps,
  type SaveSessionConflictKind,
} from './SaveSessionConflictDialog';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const defaultProps: SaveSessionConflictDialogProps = {
  failureKind: 'contended',
  checking: false,
  onCheckAgain: () => undefined,
};

function buttonIn(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector('button');
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('Expected the Check again button');
  }
  return button;
}

async function settleInitialFocus() {
  await act(async () => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 60);
    });
  });
}

describe('SaveSessionConflictDialog', () => {
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

  async function renderDialog(overrides: Partial<SaveSessionConflictDialogProps> = {}) {
    await act(async () => {
      root.render(<SaveSessionConflictDialog {...defaultProps} {...overrides} />);
    });
  }

  it('renders one labeled, assertive blocking action and safely known target details', async () => {
    const onCheckAgain = vi.fn();
    await renderDialog({
      targetName: 'South Side Dynasty',
      targetLabel: 'Opening Day branch',
      slotNumber: 3,
      onCheckAgain,
    });

    const dialog = container.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('data-failure-kind')).toBe('contended');

    const titleId = dialog?.getAttribute('aria-labelledby');
    expect(titleId).toBeTruthy();
    expect(document.getElementById(titleId ?? '')?.textContent).toBe('Dynasty already open');

    const descriptionIds = dialog?.getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(descriptionIds).toHaveLength(4);
    expect(descriptionIds.every((id) => document.getElementById(id) != null)).toBe(true);

    const initialAlert = container.querySelector('[role="alert"]');
    expect(initialAlert?.getAttribute('aria-live')).toBe('assertive');
    expect(initialAlert?.getAttribute('aria-atomic')).toBe('true');
    expect(initialAlert?.textContent).toContain('Another MBD tab controls editing');
    expect(container.textContent).toContain('South Side Dynasty');
    expect(container.textContent).toContain('Opening Day branch');
    expect(container.textContent).toContain('Slot 3');
    expect(container.textContent).toContain('Leaving the owner in the background does not release');

    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    const button = buttonIn(container);
    expect(button.textContent).toContain('Check again');
    expect(button.className).toContain('min-h-11');
    expect(button.getAttribute('aria-busy')).toBe('false');

    await act(async () => {
      button.click();
    });
    expect(onCheckAgain).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      kind: 'contended',
      title: 'Dynasty already open',
      summary: 'Another MBD tab controls editing',
      guidance: 'Close the other tab completely',
    },
    {
      kind: 'unavailable',
      title: 'Safe editing unavailable',
      summary: 'cannot provide the exclusive-tab protection',
      guidance: 'supported, secure browser window',
    },
    {
      kind: 'request_failed',
      title: 'Couldn\u2019t verify exclusive access',
      summary: 'browser rejected MBD\u2019s request',
      guidance: 'not save corruption or a failed autosave',
    },
    {
      kind: 'ownership_lost',
      title: 'Editing ownership changed',
      summary: 'lost exclusive editing ownership',
      guidance: 'browser did not reject this request',
    },
    {
      kind: 'unknown_tree',
      title: 'Couldn\u2019t identify this save tree',
      summary: 'which root dynasty owns this save or branch',
      guidance: 'related root and what-if saves cannot race',
    },
  ] satisfies Array<{
    kind: SaveSessionConflictKind;
    title: string;
    summary: string;
    guidance: string;
  }>)('uses distinct, honest copy for $kind', async ({ kind, title, summary, guidance }) => {
    await renderDialog({ failureKind: kind });

    expect(container.textContent).toContain(title);
    expect(container.textContent).toContain(summary);
    expect(container.textContent).toContain(guidance);
    expect(container.querySelector('[role="alertdialog"]')?.getAttribute('data-failure-kind')).toBe(kind);
  });

  it('initially focuses Check again and contains forward and reverse Tab navigation', async () => {
    await renderDialog();
    await settleInitialFocus();

    const button = buttonIn(container);
    expect(document.activeElement).toBe(button);

    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      button.dispatchEvent(tabEvent);
    });
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button);

    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      button.dispatchEvent(shiftTabEvent);
    });
    expect(shiftTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button);
  });

  it('cannot be dismissed by Escape or backdrop interaction and exposes no close action', async () => {
    const onCheckAgain = vi.fn();
    await renderDialog({ onCheckAgain });
    await settleInitialFocus();

    const dialog = container.querySelector('[role="alertdialog"]');
    const button = buttonIn(container);
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });

    await act(async () => {
      button.dispatchEvent(escapeEvent);
    });
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(onCheckAgain).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alertdialog"]')).toBe(dialog);

    await act(async () => {
      dialog?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onCheckAgain).not.toHaveBeenCalled();
    expect(container.querySelectorAll('button')).toHaveLength(1);
    expect(button.getAttribute('aria-label')).toBe('Check again');
  });

  it('disables duplicate checks, announces busy state politely, and keeps focus contained', async () => {
    const onCheckAgain = vi.fn();
    await renderDialog({ checking: true, onCheckAgain });
    await settleInitialFocus();

    const panel = container.querySelector('[tabindex="-1"]');
    const status = container.querySelector('[role="status"]');
    const button = buttonIn(container);

    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.getAttribute('aria-atomic')).toBe('true');
    expect(status?.textContent).toBe('Checking for exclusive access\u2026');
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Checking for exclusive save access');
    expect(button.textContent).toContain('Checking\u2026');
    expect(document.activeElement).toBe(panel);

    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      document.dispatchEvent(tabEvent);
      button.click();
    });
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(panel);
    expect(onCheckAgain).not.toHaveBeenCalled();
  });

  it('announces retry errors assertively while preserving a polite locked result', async () => {
    await renderDialog({
      actionError: 'MBD could not check access. No save data was changed.',
      failureKind: 'request_failed',
    });

    const alerts = Array.from(container.querySelectorAll('[role="alert"]'));
    const actionError = alerts.find((alert) => alert.textContent?.includes('No save data was changed'));
    expect(actionError).toBeDefined();
    expect(actionError?.getAttribute('aria-live')).toBe('assertive');
    expect(actionError?.getAttribute('aria-atomic')).toBe('true');

    const status = container.querySelector('[role="status"]');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.textContent).toContain('This tab remains locked');
    expect(status?.textContent).toContain('has not changed the save');
  });

  it('accepts an unknown target and keeps the full-screen panel bounded for 375x667 scrolling', async () => {
    await renderDialog({
      targetName: '   ',
      targetLabel: null,
      slotNumber: null,
      failureKind: 'unknown_tree',
    });

    const dialog = container.querySelector('[role="alertdialog"]');
    const panel = container.querySelector('[tabindex="-1"]');
    const button = buttonIn(container);

    expect(container.textContent).not.toContain('Locked target');
    expect(dialog?.className).toContain('min-h-[100dvh]');
    expect(dialog?.className).toContain('overflow-y-auto');
    expect(dialog?.className).toContain('px-4');
    expect(panel?.className).toContain('max-h-[calc(100dvh-2rem)]');
    expect(panel?.className).toContain('overflow-y-auto');
    expect(panel?.className).toContain('overscroll-contain');
    expect(button.className).toContain('min-h-11');
    expect(button.className).toContain('w-full');
  });
});
