import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ScoutingPage from './ScoutingPage';
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

describe('ScoutingPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 1,
      day: 1,
      phase: 'regular_season',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 0,
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

  it('renders scouting heading', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getScoutingStaff: vi.fn().mockResolvedValue([
        {
          id: 'scout-1',
          name: 'Marta Vega',
          quality: 72,
          specialty: 'international',
          bias: 'tools_lover',
        },
      ]),
      getTeamChemistry: vi.fn().mockResolvedValue({
        score: 68,
        tier: 'steady',
        summary: 'The clubhouse is stable.',
      }),
      getOwnerState: vi.fn().mockResolvedValue({
        hotSeat: false,
        patience: 62,
        confidence: 70,
        summary: 'Ownership trusts the current scouting plan.',
      }),
      getIFAPool: vi.fn().mockResolvedValue({
        season: 1,
        currentPhase: null,
        signingWindowOpen: false,
        budget: {
          baseAllocation: 5,
          tradedIn: 0,
          tradedOut: 0,
          committed: 0,
          remaining: 5,
        },
        staffAccuracy: 0.72,
        prospects: [],
      }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <ScoutingPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Scout');
    expect(container.textContent).toContain('Your Scouting Department');
    expect(container.textContent).toContain('Marta Vega');
  });
});
