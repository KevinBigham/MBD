import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PlayerComparisonPage from './PlayerComparisonPage';
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

describe('PlayerComparisonPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 45,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 44,
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
    vi.useRealTimers();
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('searches players, selects two sides, and renders comparison results', async () => {
    vi.useFakeTimers();

    const searchPlayers = vi.fn().mockImplementation(async (query: string) => {
      if (query.toLowerCase().startsWith('ada')) {
        return [{
          id: 'player-a',
          firstName: 'Ada',
          lastName: 'Ace',
          position: 'SP',
          teamId: 'nym',
        }];
      }

      return [{
        id: 'player-b',
        firstName: 'Bea',
        lastName: 'Bat',
        position: 'RF',
        teamId: 'bos',
      }];
    });
    const getPlayerComparison = vi.fn().mockResolvedValue({
      comparison: {
        attributeComparison: [
          {
            attribute: 'power',
            label: 'Power',
            playerAValue: 62,
            playerBValue: 68,
            advantage: 'playerB',
            differenceDisplay: 6,
            significantGap: true,
          },
        ],
        overallAdvantage: 'playerB',
        advantageMargin: 8.4,
        headToHeadSummary: 'Bea has the stronger bat.',
      },
      statComparison: [
        {
          statName: 'WAR',
          playerAValue: '3.2',
          playerBValue: '4.1',
          advantage: 'playerB',
        },
      ],
      summary: 'Bea Bat brings more immediate star impact.',
      rankedA: [
        { attribute: 'command', label: 'Command', displayRating: 64, letterGrade: 'B+' },
      ],
      rankedB: [
        { attribute: 'power', label: 'Power', displayRating: 68, letterGrade: 'A-' },
      ],
      playerA: {
        id: 'player-a',
        name: 'Ada Ace',
        position: 'SP',
        age: 27,
        teamId: 'nym',
      },
      playerB: {
        id: 'player-b',
        name: 'Bea Bat',
        position: 'RF',
        age: 25,
        teamId: 'bos',
      },
    });

    mockedUseWorker.mockReturnValue({
      isReady: true,
      searchPlayers,
      getPlayerComparison,
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <PlayerComparisonPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Compare Players');
    expect(container.textContent).toContain('Search for two players');

    const firstInput = container.querySelectorAll('input[placeholder="Search players..."]')[0] as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(firstInput, 'Ada');
      firstInput.dispatchEvent(new Event('input', { bubbles: true }));
      vi.advanceTimersByTime(250);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(searchPlayers).toHaveBeenCalledWith('Ada', 10);

    const adaResult = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Ada Ace'),
    );
    await act(async () => {
      adaResult?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const secondInput = container.querySelectorAll('input[placeholder="Search players..."]')[1] as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(secondInput, 'Bea');
      secondInput.dispatchEvent(new Event('input', { bubbles: true }));
      vi.advanceTimersByTime(250);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(searchPlayers).toHaveBeenCalledWith('Bea', 10);

    const beaResult = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Bea Bat'),
    );
    await act(async () => {
      beaResult?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getPlayerComparison).toHaveBeenCalledWith('player-a', 'player-b');
    expect(container.textContent).toContain('Bea Bat brings more immediate star impact.');
    expect(container.textContent).toContain('Edge: Bea Bat (+8.4%)');
    expect(container.textContent).toContain('Attribute Comparison');
    expect(container.textContent).toContain('Season Stats');
    expect(container.textContent).toContain('Power');
  });
});
