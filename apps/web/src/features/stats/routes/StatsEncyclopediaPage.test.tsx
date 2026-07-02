import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import StatsEncyclopediaPage from './StatsEncyclopediaPage';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';

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

describe('StatsEncyclopediaPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 74,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 73,
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

  it('renders the route shell, league context, and quality scale filters', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getPerformanceDiagnostics: vi.fn().mockResolvedValue({
        leagueContext: {
          leagueWoba: 0.318,
          leagueOps: 0.721,
          leagueEra: 4.12,
          leagueFip: 4.04,
          runsPerWin: 9.7,
        },
      }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <StatsEncyclopediaPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Stats Encyclopedia');
    expect(container.textContent).toContain('Current League Environment');
    expect(container.textContent).toContain('0.318');
    expect(container.textContent).toContain('Quality Scale');
    expect(container.textContent).toContain('WAR');
    expect(container.textContent).toContain('wOBA');

    const pitchingFilter = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Pitching'),
    );

    await act(async () => {
      pitchingFilter?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('FIP');
    expect(container.textContent).toContain('WHIP');
    expect(container.textContent).not.toContain('Weighted On-Base Average');
  });
});
