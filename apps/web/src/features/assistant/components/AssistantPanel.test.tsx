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
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

function setNativeTextAreaValue(element: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(element, value);
}

function gameStoreState() {
  return {
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
  };
}

describe('AssistantPanel', () => {
  let container: HTMLDivElement;
  let root: Root | null;
  const clipboardWriteText = vi.fn();

  beforeEach(() => {
    const storage = createTestStorage();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });
    window.localStorage.clear();
    clipboardWriteText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockedUseGameStore.mockReturnValue(gameStoreState());
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    container.remove();
    root = null;
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('opens route-aware guidance, explains ratings, and persists dismissals by save slot', async () => {
    await act(async () => {
      root!.render(
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

    expect(container.textContent).toContain('Mack Mercer');
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

  it('focuses the close button on open and exposes expression-driven avatar identity', async () => {
    mockedUseGameStore.mockReturnValue({
      ...gameStoreState(),
      phase: 'playoffs',
    });

    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={['/playoffs']}>
          <AssistantPanel />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    const openButton = container.querySelector('button[aria-label="Open Mack Mercer Assistant"]');
    expect(openButton).toBeTruthy();
    expect(openButton?.textContent).toContain('Mack Mercer');

    await act(async () => {
      openButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close Assistant');
    expect(container.querySelector('[aria-label="Mack Mercer expression: excited"]')).toBeTruthy();
  });

  it('builds and copies closed-playtest feedback diagnostics without a backend', async () => {
    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={['/trade']}>
          <AssistantPanel />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    const openButton = container.querySelector('button[aria-label="Open Mack Mercer Assistant"]');
    await act(async () => {
      openButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const feedbackButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent?.includes('Give feedback')
    ));
    expect(feedbackButton).toBeTruthy();

    await act(async () => {
      feedbackButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const textArea = container.querySelector('textarea[name="assistant-confusion"]') as HTMLTextAreaElement | null;
    expect(textArea).toBeTruthy();
    await act(async () => {
      setNativeTextAreaValue(textArea!, 'I was not sure which offer was fair.');
      textArea!.dispatchEvent(new Event('input', { bubbles: true }));
      textArea!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const copyButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent?.includes('Copy report')
    ));
    await act(async () => {
      copyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(clipboardWriteText).toHaveBeenCalledTimes(1);
    expect(clipboardWriteText.mock.calls[0]?.[0]).toContain('Route: /trade (trade)');
    expect(clipboardWriteText.mock.calls[0]?.[0]).toContain('Assistant mode: newcomer');
    expect(clipboardWriteText.mock.calls[0]?.[0]).toContain('I was not sure which offer was fair.');
  });
});
