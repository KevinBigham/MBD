import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { PressConferenceModal } from './PressConferenceModal';

const mockPlayEffect = vi.fn();

vi.mock('@/shared/lib/audio', () => ({
  getAudioEngine: () => ({
    playEffect: mockPlayEffect,
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const conference = {
  id: 'press-1',
  topic: 'trade_deadline',
  question: 'The deadline is approaching. How do you explain the front office plan?',
  ownerTone: 'impatient' as const,
  teamId: 'nym',
  season: 4,
  day: 102,
  responses: [
    {
      id: 'confident',
      label: 'Set the standard',
      tone: 'confident' as const,
      quote: 'We know the bar, and we intend to clear it.',
      moraleDelta: 2,
      ownerDelta: 1,
    },
    {
      id: 'measured',
      label: 'Stay patient',
      tone: 'measured' as const,
      quote: 'We will not make a rushed move that hurts the club.',
      moraleDelta: 1,
      ownerDelta: -1,
    },
  ],
};

describe('PressConferenceModal', () => {
  let container: HTMLDivElement;
  let root: Root;
  let onDismiss: ReturnType<typeof vi.fn>;
  let onRespond: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    onDismiss = vi.fn();
    onRespond = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  async function renderModal() {
    await act(async () => {
      root.render(
        <PressConferenceModal
          conference={conference}
          onDismiss={onDismiss}
          onRespond={onRespond}
        />,
      );
    });
  }

  async function flushFocusTrap() {
    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 60);
      });
    });
  }

  it('renders as a labelled dialog and submits the selected response', async () => {
    await renderModal();

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('press-conference-modal-title');
    expect(container.textContent).toContain('Press Conference');
    expect(container.textContent).toContain(conference.question);

    const confidentButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Set the standard'),
    ) as HTMLButtonElement;

    await act(async () => {
      confidentButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Morale: +2');
    expect(container.textContent).toContain('Owner: +1');

    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Deliver Response'),
    ) as HTMLButtonElement;

    await act(async () => {
      submitButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onRespond).toHaveBeenCalledWith('press-1', 'confident');
    expect(container.textContent).toContain('Response delivered.');
    expect(container.textContent).toContain('Team Morale +2');
    expect(container.textContent).toContain('Owner Satisfaction +1');
  });

  it('keeps focus inside the dialog and restores launcher focus on Escape', async () => {
    function Harness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open press conference
          </button>
          {isOpen ? (
            <PressConferenceModal
              conference={conference}
              onDismiss={() => setIsOpen(false)}
              onRespond={onRespond}
            />
          ) : null}
        </>
      );
    }

    await act(async () => {
      root.render(<Harness />);
    });

    const launcher = container.querySelector('button') as HTMLButtonElement;
    launcher.focus();

    await act(async () => {
      launcher.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushFocusTrap();

    const closeButton = container.querySelector(
      'button[aria-label="Close press conference"]',
    ) as HTMLButtonElement;
    const skipButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Skip'),
    ) as HTMLButtonElement;

    expect(document.activeElement).toBe(closeButton);

    skipButton.focus();
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
    expect(document.activeElement).toBe(skipButton);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });
});
