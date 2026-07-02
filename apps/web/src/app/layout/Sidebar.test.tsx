import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
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
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('Sidebar', () => {
  let container: HTMLDivElement;
  let root: Root;
  let getDashboardSummary: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 88,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 87,
      isSimulating: false,
      setSeason: vi.fn(),
      setDay: vi.fn(),
      setPhase: vi.fn(),
      setSimulating: vi.fn(),
      setInitialized: vi.fn(),
      setUserTeamId: vi.fn(),
      updateFromSim: vi.fn(),
      initializeGame: vi.fn(),
    });

    getDashboardSummary = vi.fn().mockResolvedValue({
      franchise: {
        achievementCount: 3,
      },
      pressRoom: {
        briefingCount: 4,
        newsCount: 8,
      },
    });

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getDashboardSummary,
    } as unknown as ReturnType<typeof useWorker>);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('shows the press room story count badge from the dashboard summary', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Press Room');
    expect(container.textContent).toContain('12');
    expect(container.textContent).toContain('History');
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('Free Agency');
    expect(container.textContent).toContain('Offseason');
    expect(container.textContent).toContain('Compare');
    expect(container.textContent).toContain('News');
    expect(container.textContent).toContain('Home');
    expect(container.textContent).toContain('Team');
    expect(container.textContent).toContain('Players');
    expect(container.textContent).toContain('Transactions');
    expect(container.textContent).toContain('League');
    expect(container.textContent).toContain('Story');
    expect(container.textContent).toContain('System');
    expect(getDashboardSummary).toHaveBeenCalledTimes(1);
  });

  it('closes the mobile more drawer on Escape', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    const moreButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('More'),
    ) as HTMLButtonElement | undefined;
    expect(moreButton).toBeTruthy();

    await act(async () => {
      moreButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toContain('Navigation');
    expect(container.textContent).toContain('Transactions');
    expect(container.textContent).toContain('System');
    expect(container.textContent).toContain('Settings');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(container.textContent).not.toContain('Navigation');
  });

  it('puts Trades and League in the primary mobile tab loop', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    const mobileNav = container.querySelector('nav[aria-label="Mobile navigation"]');
    expect(mobileNav?.textContent).toContain('Front O.');
    expect(mobileNav?.textContent).toContain('Roster');
    expect(mobileNav?.textContent).toContain('Draft');
    expect(mobileNav?.textContent).toContain('Trades');
    expect(mobileNav?.textContent).toContain('League');
    expect(mobileNav?.textContent).not.toContain('Free Ag.');
    expect(mobileNav?.textContent).not.toContain('Offseas.');
  });
});
