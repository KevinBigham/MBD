import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BoxScorePage from './BoxScorePage';
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

function renderWithRoute(gameIndex: number) {
  return (
    <MemoryRouter initialEntries={[`/games/${gameIndex}`]}>
      <Routes>
        <Route path="/games/:gameIndex" element={<BoxScorePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BoxScorePage', () => {
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
      userTeamId: 'nyy',
      teamName: 'Yankees',
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

  it('renders team names and score', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getGamePlayByPlay: vi.fn().mockResolvedValue({
        gameIndex: 0,
        recap: 'A great game between NYY and BOS.',
        highlights: [],
        plays: [
          { inning: 1, halfInning: 'top', text: 'Batter grounds out.', isHighlight: false },
        ],
        boxScore: {
          homeTeamId: 'nyy',
          awayTeamId: 'bos',
          homeScore: 5,
          awayScore: 3,
          innings: 9,
          homeHits: 10,
          awayHits: 7,
        },
      }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(renderWithRoute(0));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('NYY');
    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('5');
    expect(container.textContent).toContain('3');
  });

  it('shows play-by-play text', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getGamePlayByPlay: vi.fn().mockResolvedValue({
        gameIndex: 0,
        recap: 'Great game.',
        highlights: [],
        plays: [
          { inning: 1, halfInning: 'top', text: 'Smith singles to center.', isHighlight: false },
          { inning: 1, halfInning: 'top', text: 'Jones homers to left.', isHighlight: true },
        ],
        boxScore: {
          homeTeamId: 'nyy',
          awayTeamId: 'bos',
          homeScore: 2,
          awayScore: 1,
          innings: 9,
          homeHits: 6,
          awayHits: 4,
        },
      }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(renderWithRoute(0));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Smith singles to center.');
    expect(container.textContent).toContain('Jones homers to left.');
  });

  it('shows game not found for missing data', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getGamePlayByPlay: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(renderWithRoute(999));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Game not found');
  });
});
