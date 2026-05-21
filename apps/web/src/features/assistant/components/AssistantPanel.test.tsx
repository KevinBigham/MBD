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

describe('AssistantPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
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
    localStorage.clear();
  });

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

    expect(localStorage.getItem('mbd:assistant:v1:save-slot-2')).toContain('"trade":true');
  });
});
