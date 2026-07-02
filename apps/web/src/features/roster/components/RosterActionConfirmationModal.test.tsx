import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { RosterActionConfirmationModal, type PendingRosterActionView } from './RosterActionConfirmationModal';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const dfaAction: PendingRosterActionView = {
  kind: 'dfa',
  playerId: 'dfa-1',
  playerName: 'Logan Depth',
  position: '1B',
  detail: '1B | Age 29 | $2.2M',
  consequence: 'This removes the player from the active/40-man picture and exposes him to waiver-claim risk.',
  confirmLabel: 'Confirm DFA',
  actionId: 'dfa-dfa-1',
};

async function flushFocusTrap() {
  await act(async () => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 60);
    });
  });
}

describe('RosterActionConfirmationModal', () => {
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

  it('renders roster move context and delegates cancel/confirm actions', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    await act(async () => {
      root.render(
        <RosterActionConfirmationModal
          action={dfaAction}
          busyAction={null}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />,
      );
    });

    expect(container.textContent).toContain('Confirm Roster Move');
    expect(container.textContent).toContain('dfa | 1B');
    expect(container.textContent).toContain('Logan Depth');
    expect(container.textContent).toContain('1B | Age 29 | $2.2M');
    expect(container.textContent).toContain('waiver-claim risk');

    const cancelButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Cancel'),
    );
    const keepButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Keep Current Roster'),
    );
    const confirmButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Confirm DFA'),
    );

    await act(async () => {
      cancelButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      keepButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('marks only the matching action as busy', async () => {
    await act(async () => {
      root.render(
        <RosterActionConfirmationModal
          action={dfaAction}
          busyAction="dfa-dfa-1"
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />,
      );
    });

    const confirmButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Confirm DFA'),
    ) as HTMLButtonElement | undefined;

    expect(confirmButton?.disabled).toBe(true);
  });

  it('traps focus inside the dialog and restores launcher focus on Escape', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open roster move
          </button>
          {open ? (
            <RosterActionConfirmationModal
              action={dfaAction}
              busyAction={null}
              onCancel={() => setOpen(false)}
              onConfirm={vi.fn()}
            />
          ) : null}
        </>
      );
    }

    await act(async () => {
      root.render(<Harness />);
    });

    const launcher = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Open roster move'),
    ) as HTMLButtonElement;
    launcher.focus();

    await act(async () => {
      launcher.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushFocusTrap();

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('roster-action-confirmation-title');

    const cancelButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Cancel'),
    ) as HTMLButtonElement;
    const confirmButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Confirm DFA'),
    ) as HTMLButtonElement;
    expect(document.activeElement).toBe(cancelButton);

    confirmButton.focus();
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      document.dispatchEvent(tabEvent);
    });
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cancelButton);

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
    expect(document.activeElement).toBe(confirmButton);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });
});
