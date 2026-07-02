import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import AwardCeremonyModal from './AwardCeremonyModal';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const ceremony = {
  season: 8,
  openingRemarks: 'Tonight we honor the season that put the league on notice.',
  closingRemarks: 'History will remember this group for a long time.',
  awards: [
    {
      awardId: 'mvp',
      awardName: 'Most Valuable Player',
      winnerId: 'player-mvp',
      winnerName: 'Rafael Cruz',
      headline: 'Cruz powers the Tycoons back to October.',
      votingSummary: '.318 average, 44 home runs, and a league-leading 8.1 WAR.',
      historicalContext: 'The first Tycoons MVP since the rebuild began.',
      reactionQuote: 'The work started in spring and never stopped.',
      runnerUpNames: ['Marcus Bell', 'Kenji Mori'],
    },
  ],
};

describe('AwardCeremonyModal', () => {
  let container: HTMLDivElement;
  let root: Root;
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    onClose = vi.fn();
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
      root.render(<AwardCeremonyModal ceremony={ceremony} onClose={onClose} />);
    });
  }

  async function flushFocusTrap() {
    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 60);
      });
    });
  }

  it('renders as a labelled dialog and supports ceremony keyboard navigation', async () => {
    await renderModal();

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('award-ceremony-modal-title');
    expect(container.textContent).toContain(ceremony.openingRemarks);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(container.textContent).toContain(ceremony.awards[0]!.headline);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    });
    expect(container.textContent).toContain(ceremony.closingRemarks);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    expect(container.textContent).toContain(ceremony.awards[0]!.headline);
  });

  it('keeps focus inside the ceremony and restores launcher focus on close', async () => {
    function Harness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open awards ceremony
          </button>
          {isOpen ? (
            <AwardCeremonyModal
              ceremony={ceremony}
              onClose={() => setIsOpen(false)}
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

    const closeBtn = container.querySelector(
      'button[aria-label="Close awards ceremony"]',
    ) as HTMLButtonElement;
    const nextBtn = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Next'),
    ) as HTMLButtonElement;

    expect(document.activeElement).toBe(closeBtn);

    nextBtn.focus();
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      document.dispatchEvent(tabEvent);
    });
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(closeBtn);

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
    expect(document.activeElement).toBe(nextBtn);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });
});
