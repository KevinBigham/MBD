import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AssistantPanel } from './AssistantPanel';
import { useGameStore } from '@/shared/hooks/useGameStore';

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

const mockedUseGameStore = vi.mocked(useGameStore);
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createTestStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe('AssistantPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: createTestStorage(),
      configurable: true,
    });
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockedUseGameStore.mockReturnValue({
      season: 2,
      day: 95,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      difficulty: 'standard',
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      playerCount: 780,
      gamesPlayed: 95,
      isSimulating: false,
      setSeason: vi.fn(),
      setDay: vi.fn(),
      setPhase: vi.fn(),
      setSimulating: vi.fn(),
      setInitialized: vi.fn(),
      setUserTeamId: vi.fn(),
      setActiveSave: vi.fn(),
      setActiveSaveSlot: vi.fn(),
      updateFromSim: vi.fn(),
      initializeGame: vi.fn(),
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  async function flushFocusTrap() {
    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 60);
      });
    });
  }

  it('opens route-aware guidance, explains ratings, and persists dismissals by save slot', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/trade']}>
          <AssistantPanel
            tickerFeed={[
              {
                id: 'ticker-trade-1',
                category: 'trade',
                text: 'League rivals are calling about late-inning relief.',
              },
            ]}
          />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Assistant');
    expect(container.textContent).toContain('Trade');

    const openButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent?.includes('What now?')
    ));
    expect(openButton).toBeTruthy();

    await act(async () => {
      openButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Price the player and the situation');
    expect(container.textContent).toContain('Review one trade target');
    expect(container.textContent).toContain('League rivals are calling about late-inning relief.');

    const ratingsButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent?.includes('Explain ratings')
    ));
    await act(async () => {
      ratingsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('OVR starts the value conversation');

    const gotItButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent?.includes('Got it')
    ));
    await act(async () => {
      gotItButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(window.localStorage.getItem('mbd:assistant:v1:save-slot-2')).toContain('"trade":true');
  });

  it('surfaces active monthly pulse work as the next operator action', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AssistantPanel
            decisionQueue={[
              {
                id: 'spotlight-roster',
                urgency: 'red',
                title: 'Roster is over the active limit',
                body: 'You need to clear a roster spot before the next series starts.',
                route: '/roster',
                actionLabel: 'Open Roster',
              },
            ]}
          />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    const openButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent?.includes('What now?')
    ));

    await act(async () => {
      openButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Fix roster compliance');
    expect(container.textContent).toContain('You need to clear a roster spot before the next series starts.');
  });

  it('traps focus inside the assistant detail panel and restores launcher focus on Escape', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/trade']}>
          <AssistantPanel />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    const openButton = container.querySelector('button[aria-label="Open Assistant"]') as HTMLButtonElement;
    openButton.focus();

    await act(async () => {
      openButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushFocusTrap();

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    const closeButton = container.querySelector('button[aria-label="Close Assistant"]') as HTMLButtonElement;
    expect(document.activeElement).toBe(closeButton);

    const modeButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent?.includes('Hardcore mode')
    )) as HTMLButtonElement;
    modeButton.focus();

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
    expect(document.activeElement).toBe(modeButton);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 0);
      });
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(container.querySelector('button[aria-label="Open Assistant"]'));
  });
});
