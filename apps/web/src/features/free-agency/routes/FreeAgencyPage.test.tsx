import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import FreeAgencyPage from './FreeAgencyPage';
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

describe('FreeAgencyPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 1,
      day: 1,
      phase: 'offseason',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 162,
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

  it('renders free agency heading', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getFreeAgents: vi.fn().mockResolvedValue([]),
      getFinanceOverview: vi.fn().mockResolvedValue({ totalPayroll: 100, budget: 150, capSpace: 50 }),
      getLeagueLeaders: vi.fn().mockResolvedValue([]),
      getFreeAgencyMarketIntelligence: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <FreeAgencyPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Free Agen');
  });

  it('filters the market and previews offer budget impact', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getFreeAgents: vi.fn().mockResolvedValue([
        {
          id: 'fa-1',
          firstName: 'Power',
          lastName: 'Bat',
          position: '1B',
          age: 31,
          displayRating: 66,
          letterGrade: 'A',
          marketValue: 22,
          demandLevel: 'elite',
        },
        {
          id: 'fa-2',
          firstName: 'Depth',
          lastName: 'Arm',
          position: 'SP',
          age: 35,
          displayRating: 51,
          letterGrade: 'C',
          marketValue: 5,
          demandLevel: 'low',
        },
      ]),
      getFinanceOverview: vi.fn().mockResolvedValue({
        totalPayroll: 120,
        budget: 160,
        capSpace: 30,
      }),
      makeContractOffer: vi.fn().mockResolvedValue({ accepted: false, reason: 'Needs more years.' }),
      getLeagueLeaders: vi.fn().mockResolvedValue([]),
      getFreeAgencyMarketIntelligence: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <FreeAgencyPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
      await vi.dynamicImportSettled();
    });

    expect(container.textContent).toContain('Power Bat');
    expect(container.textContent).toContain('Depth Arm');

    const search = container.querySelector('input[placeholder="Search name or position..."]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(search, 'power');
      search.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Power Bat');
    expect(container.textContent).not.toContain('Depth Arm');

    const powerRow = Array.from(container.querySelectorAll('tr')).find((row) =>
      row.textContent?.includes('Power Bat'),
    );
    await act(async () => {
      powerRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Projected payroll');
    expect(container.textContent).toContain('$130.0M');
    expect(container.querySelector('a[href="/players/fa-1"]')).toBeTruthy();
  });
});
