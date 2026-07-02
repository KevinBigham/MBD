import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BoxScorePage from './BoxScorePage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { getAudioEngine } from '@/shared/lib/audio';

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('@/shared/lib/audio', () => ({
  getAudioEngine: vi.fn(),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);
const mockedGetAudioEngine = vi.mocked(getAudioEngine);
const audioEngineMock = {
  playEffect: vi.fn(),
};

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function renderWithRoute(gameRef: number | string) {
  return (
    <MemoryRouter initialEntries={[`/games/${gameRef}`]}>
      <Routes>
        <Route path="/games/:gameIndex" element={<BoxScorePage />} />
      </Routes>
    </MemoryRouter>
  );
}

function createWorkerMock(playByPlay: unknown) {
  return {
    isReady: true,
    getGamePlayByPlay: vi.fn().mockResolvedValue(playByPlay),
    getEnhancedGamePlayByPlay: vi.fn().mockResolvedValue(null),
  } as unknown as ReturnType<typeof useWorker>;
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
    mockedGetAudioEngine.mockReturnValue(audioEngineMock as unknown as ReturnType<typeof getAudioEngine>);
    audioEngineMock.playEffect.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders team names and score', async () => {
    mockedUseWorker.mockReturnValue(createWorkerMock({
      gameIndex: 0,
      recap: 'A great game between NYT and BOS.',
      highlights: [],
      plays: [
        { inning: 1, halfInning: 'top', text: 'Batter grounds out.', isHighlight: false },
      ],
      boxScore: {
        homeTeamId: 'nym',
        awayTeamId: 'bos',
        homeScore: 5,
        awayScore: 3,
        innings: 9,
        homeHits: 10,
        awayHits: 7,
      },
    }));

    await act(async () => {
      root.render(renderWithRoute(0));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('NYT');
    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('5');
    expect(container.textContent).toContain('3');
  });

  it('shows play-by-play text', async () => {
    mockedUseWorker.mockReturnValue(createWorkerMock({
      gameIndex: 0,
      recap: 'Great game.',
      highlights: [],
      plays: [
        { inning: 1, halfInning: 'top', text: 'Smith singles to center.', isHighlight: false },
        { inning: 1, halfInning: 'top', text: 'Jones homers to left.', isHighlight: true },
      ],
      boxScore: {
        homeTeamId: 'nym',
        awayTeamId: 'bos',
        homeScore: 2,
        awayScore: 1,
        innings: 9,
        homeHits: 6,
        awayHits: 4,
      },
    }));

    await act(async () => {
      root.render(renderWithRoute(0));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Smith singles to center.');
    expect(container.textContent).toContain('Jones homers to left.');
  });

  it('shows game not found for missing data', async () => {
    mockedUseWorker.mockReturnValue(createWorkerMock(null));

    await act(async () => {
      root.render(renderWithRoute(999));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Game not found');
  });

  it('plays the walk-off effect when the recap includes a walk-off finish', async () => {
    mockedUseWorker.mockReturnValue(createWorkerMock({
      gameIndex: 0,
      recap: 'Jones delivers a walk-off blast in the ninth.',
      highlights: [],
      plays: [
        { inning: 9, halfInning: 'bottom', text: 'Jones hits a walk-off homer.', isHighlight: true },
      ],
      boxScore: {
        homeTeamId: 'nym',
        awayTeamId: 'bos',
        homeScore: 4,
        awayScore: 3,
        innings: 9,
        homeHits: 8,
        awayHits: 6,
      },
    }));

    await act(async () => {
      root.render(renderWithRoute(0));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(audioEngineMock.playEffect).toHaveBeenCalledWith('walk_off');
  });

  it('loads archived box scores by stable id without enhanced play-by-play', async () => {
    const worker = createWorkerMock({
      archivedGameId: 'archived-game-s6-d120-nym-bos-rivalry',
      recap: 'The Tycoons beat Boston in a rivalry game worth saving.',
      highlights: [
        { inning: 9, halfInning: 'bottom', text: 'The Tycoons finished a rivalry classic.' },
      ],
      plays: [
        { inning: 9, halfInning: 'bottom', text: 'The Tycoons finished a rivalry classic.', isHighlight: true },
      ],
      lineScore: [
        { inning: 9, awayRuns: 0, homeRuns: 1 },
      ],
      boxScore: {
        homeTeamId: 'nym',
        awayTeamId: 'bos',
        homeScore: 5,
        awayScore: 4,
        innings: 9,
        homeHits: 8,
        awayHits: 7,
      },
    });
    mockedUseWorker.mockReturnValue(worker);

    await act(async () => {
      root.render(renderWithRoute('archived-game-s6-d120-nym-bos-rivalry'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(worker.getGamePlayByPlay).toHaveBeenCalledWith('archived-game-s6-d120-nym-bos-rivalry');
    expect(worker.getEnhancedGamePlayByPlay).not.toHaveBeenCalled();
    expect(container.textContent).toContain('The Tycoons beat Boston in a rivalry game worth saving.');
  });
});
