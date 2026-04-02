import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import LeadersPage from './LeadersPage';
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

describe('LeadersPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 5,
      day: 88,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nyy',
      teamName: 'Yankees',
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
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders advanced leaderboards and switches between WAR and FIP boards', async () => {
    const getLeagueLeaders = vi.fn().mockImplementation(async (stat: string) => {
      if (stat === 'fip') {
        return [{
          id: 'p2',
          firstName: 'Gerrit',
          lastName: 'Cole',
          position: 'SP',
          teamId: 'nyy',
          displayRating: 68,
          stats: {
            avg: '.000',
            hr: 0,
            rbi: 0,
            hits: 0,
            strikeouts: 151,
            era: '2.91',
          },
          advanced: {
            war: 4.9,
            woba: null,
            wrcPlus: null,
            opsPlus: null,
            iso: null,
            fip: 2.83,
            xfip: 3.04,
            whip: 1.01,
            kPer9: 10.8,
            bbPer9: 2.1,
            kBb: 5.14,
          },
        }];
      }

      return [{
        id: 'p1',
        firstName: 'Aaron',
        lastName: 'Judge',
        position: 'RF',
        teamId: 'nyy',
        displayRating: 73,
        stats: {
          avg: '.318',
          hr: 32,
          rbi: 88,
          hits: 126,
          strikeouts: 0,
          era: '0.00',
        },
        advanced: {
          war: 5.6,
          woba: 0.412,
          wrcPlus: 168,
          opsPlus: 171,
          iso: 0.294,
          fip: null,
          xfip: null,
          whip: null,
          kPer9: null,
          bbPer9: null,
          kBb: null,
        },
      }];
    });

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getLeagueLeaders,
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <LeadersPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('League Leaders');
    expect(container.textContent).toContain('Aaron Judge');
    expect(container.textContent).toContain('wOBA');
    expect(container.textContent).toContain('wRC+');
    expect(container.textContent).toContain('5.6');

    const fipButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('FIP'),
    );

    await act(async () => {
      fipButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getLeagueLeaders).toHaveBeenCalledWith('war', 20);
    expect(getLeagueLeaders).toHaveBeenCalledWith('fip', 20);
    expect(container.textContent).toContain('Gerrit Cole');
    expect(container.textContent).toContain('xFIP');
    expect(container.textContent).toContain('2.83');
  });
});
