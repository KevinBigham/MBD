import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { SeasonRecapModal, type SeasonRecapData } from './SeasonRecapModal';

const mockPlayEffect = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/audio', () => ({
  getAudioEngine: () => ({
    playEffect: mockPlayEffect,
  }),
}));

vi.mock('@/shared/hooks/useEffectiveReducedMotion', () => ({
  useEffectiveReducedMotion: () => true,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const recapData: SeasonRecapData = {
  season: 12,
  teamName: 'New York Tycoons',
  teamId: 'nym',
  record: '98-64',
  winPct: '.605',
  divisionRank: 1,
  gamesBack: 0,
  playoffResult: 'Won World Series',
  isChampion: true,
  statLeaders: {
    hr: { name: 'Rafael Cruz', value: '44' },
    rbi: { name: 'Rafael Cruz', value: '121' },
    avg: { name: 'Luis Ortega', value: '.316' },
    era: { name: 'Mina Stone', value: '2.44' },
    k: { name: 'Mina Stone', value: '226' },
    w: { name: 'Diego Alvarez', value: '18' },
  },
  awards: [{ award: 'MVP', playerName: 'Rafael Cruz' }],
  keyTransactions: [{ description: 'Acquired a deadline ace for the playoff push.' }],
  narrative: 'A complete roster turned a strong summer into a franchise-defining fall.',
  storylines: ['A rookie breakout stabilized the lineup.', 'The bullpen carried October.'],
  fanSentiment: 91,
  payroll: '$245.0M',
};

describe('SeasonRecapModal', () => {
  let container: HTMLDivElement;
  let root: Root;
  let onDismiss: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    onDismiss = vi.fn();
    mockPlayEffect.mockClear();
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
      root.render(<SeasonRecapModal data={recapData} onDismiss={onDismiss} />);
    });
  }

  async function flushFocusTrap() {
    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 60);
      });
    });
  }

  it('renders as a modal dialog and supports recap keyboard navigation', async () => {
    await renderModal();

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Season 12 Year in Review');
    expect(container.textContent).toContain('Season 12');

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(container.textContent).toContain('98-64');

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    expect(container.textContent).toContain('Season 12');

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps focus inside the recap and restores launcher focus on close', async () => {
    function Harness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open season recap
          </button>
          {isOpen ? (
            <SeasonRecapModal
              data={recapData}
              onDismiss={() => setIsOpen(false)}
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

    const closeBtn = container.querySelector('button[aria-label="Close recap"]') as HTMLButtonElement;
    expect(document.activeElement).toBe(closeBtn);

    const buttons = Array.from(container.querySelectorAll('button'));
    const nextBtn = buttons.find((button) => button.textContent?.includes('Next')) as HTMLButtonElement;
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
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });
});
