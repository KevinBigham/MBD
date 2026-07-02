import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import RecordWatchPage from './RecordWatchPage';
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

describe('RecordWatchPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 7,
      day: 112,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 111,
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

  it('renders empty watch and record-book states from the worker', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getRecordWatchList: vi.fn().mockResolvedValue([]),
      getRecordBook: vi.fn().mockResolvedValue({ franchise: [], league: [] }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RecordWatchPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Record Watch');
    expect(container.textContent).toContain('No active record chases');

    const franchiseTab = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Franchise Records'),
    );

    await act(async () => {
      franchiseTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('No franchise records yet');
  });

  it('renders loaded watch-list and record-book rows', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getRecordWatchList: vi.fn().mockResolvedValue([
        {
          id: 'watch-1',
          playerId: 'player-1',
          playerName: 'Milo Slugger',
          teamId: 'nym',
          recordId: 'hr-season',
          recordLabel: 'Single-season HR',
          currentValue: 55,
          holderValue: 61,
          projectedValue: 64.2,
          progressRatio: 0.91,
          summary: 'On pace to challenge the franchise mark.',
        },
      ]),
      getRecordBook: vi.fn().mockResolvedValue({
        franchise: [
          {
            id: 'record-1',
            label: 'Single-season HR',
            category: 'batting',
            scope: 'franchise',
            stat: 'hr',
            qualifier: null,
            teamId: 'nym',
            trackingFromSeason: 1,
            note: null,
            holders: [
              {
                value: 61,
                season: 6,
                teamId: 'nym',
                playerId: 'player-2',
                playerName: 'Arlo Hammer',
                displayValue: '61',
              },
            ],
          },
        ],
        league: [],
      }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RecordWatchPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Milo Slugger');
    expect(container.textContent).toContain('91%');
    expect(container.textContent).toContain('On pace to challenge the franchise mark.');

    const franchiseTab = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Franchise Records'),
    );

    await act(async () => {
      franchiseTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Arlo Hammer');
    expect(container.textContent).toContain('Single-season HR');
    expect(container.querySelector('a[href="/players/player-2"]')).toBeTruthy();
  });
});
