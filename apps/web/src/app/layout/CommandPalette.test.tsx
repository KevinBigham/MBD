import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);
const navigateSpy = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class ScrollIntoViewMock {
  static install(): void {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
  }
}

describe('CommandPalette', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
    ScrollIntoViewMock.install();

    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 88,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Alex Rivera',
      activeSaveId: null,
      activeSaveSlot: null,
      playerCount: 780,
      gamesPlayed: 88,
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

    mockedUseWorker.mockReturnValue({
      isReady: true,
      exportSnapshot: vi.fn(),
    } as unknown as ReturnType<typeof useWorker>);
    navigateSpy.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('lists the added navigation and trade action entries', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <CommandPalette open onOpenChange={vi.fn()} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Free Agency');
    expect(container.textContent).toContain('Offseason');
    expect(container.textContent).toContain('Compare Players');
    expect(container.textContent).toContain('Owner Intel');
    expect(container.textContent).toContain('Pulse');
    expect(container.textContent).toContain('Achievements');
    expect(container.textContent).toContain('Scenarios');
    expect(container.textContent).toContain('Start Negotiation');
    expect(container.textContent).toContain('Review Roster Needs');
    expect(container.textContent).toContain('Review Trade Market');
    expect(container.textContent).toContain('Scout Draft Class');
    expect(container.textContent).toContain('Review Free Agent Market');
    expect(container.textContent).toContain('Review Offseason Plan');
    expect(container.textContent).toContain('Study Franchise History');
    expect(container.textContent).toContain('Open Keyboard Shortcuts');
    expect(container.textContent).toContain('View Signature Moments');
    expect(container.textContent).toContain('What Now: Review Front Office');
    expect(container.textContent).toContain('Review Budget');
    expect(container.textContent).toContain('Open Reports');
  });

  it('searches common GM intent aliases from the shared navigation registry', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <CommandPalette open onOpenChange={vi.fn()} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    const input = container.querySelector('input[placeholder="Type a command or search..."]') as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      valueSetter?.call(input, 'shop player');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Trade Center');
    expect(container.textContent).toContain('Start Negotiation');
  });

  it('routes trade commands to distinct quick and market lanes', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <CommandPalette open onOpenChange={vi.fn()} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    const startNegotiation = Array.from(container.querySelectorAll('[cmdk-item]')).find((item) =>
      item.textContent?.includes('Start Negotiation'),
    ) as HTMLElement | undefined;
    const reviewMarket = Array.from(container.querySelectorAll('[cmdk-item]')).find((item) =>
      item.textContent?.includes('Review Trade Market'),
    ) as HTMLElement | undefined;

    expect(startNegotiation).toBeTruthy();
    expect(reviewMarket).toBeTruthy();

    await act(async () => {
      startNegotiation?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(navigateSpy).toHaveBeenLastCalledWith('/trade?mode=quick');

    await act(async () => {
      reviewMarket?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(navigateSpy).toHaveBeenLastCalledWith('/trade?mode=market');
  });

  it('renders as a mobile-safe dialog with a 16px command input', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <CommandPalette open onOpenChange={vi.fn()} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');

    const input = container.querySelector('input[placeholder="Type a command or search..."]');
    expect(input?.className).toContain('text-base');
    expect(input?.className).toContain('min-h-11');
  });
});
