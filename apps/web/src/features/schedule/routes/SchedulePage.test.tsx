import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import SchedulePage from './SchedulePage';
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

describe('SchedulePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 1,
      day: 10,
      phase: 'regular_season',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 10,
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
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders schedule heading', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getScheduleView: vi.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <SchedulePage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('SEASON SCHEDULE');
  });

  it('shows schedule entries with opponent info', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getScheduleView: vi.fn().mockResolvedValue([
        {
          day: 1,
          opponentId: 'bos',
          opponentName: 'Boston Noreasters',
          opponentAbbr: 'BOS',
          isHome: true,
          isCompleted: true,
          userScore: 5,
          opponentScore: 3,
          result: 'W',
          gameIndex: 0,
        },
        {
          day: 2,
          opponentId: 'bal',
          opponentName: 'Baltimore Crab Cakes',
          opponentAbbr: 'BAL',
          isHome: false,
          isCompleted: false,
        },
      ]),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <SchedulePage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('BAL');
    expect(container.textContent).toContain('5-3');
  });

  it('shows W/L badges for completed games', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getScheduleView: vi.fn().mockResolvedValue([
        {
          day: 1,
          opponentId: 'bos',
          opponentName: 'Boston Noreasters',
          opponentAbbr: 'BOS',
          isHome: true,
          isCompleted: true,
          userScore: 5,
          opponentScore: 3,
          result: 'W',
          gameIndex: 0,
        },
        {
          day: 2,
          opponentId: 'bal',
          opponentName: 'Baltimore Crab Cakes',
          opponentAbbr: 'BAL',
          isHome: false,
          isCompleted: true,
          userScore: 1,
          opponentScore: 4,
          result: 'L',
          gameIndex: 1,
        },
      ]),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <SchedulePage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const wBadge = container.querySelector('.text-accent-success');
    const lBadge = container.querySelector('.text-accent-danger');
    expect(wBadge).not.toBeNull();
    expect(lBadge).not.toBeNull();
    expect(wBadge?.textContent).toBe('W');
    expect(lBadge?.textContent).toBe('L');
  });
});
