import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import FinancePage from './FinancePage';
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

const MOCK_FINANCE_DATA = {
  totalPayroll: 185.5,
  mlbPayroll: 162.3,
  minorsPayroll: 23.2,
  luxuryTaxPayroll: 162.3,
  luxuryTax: 0,
  budget: 210.0,
  capSpace: 67.7,
  futureCommitments: [140.0, 110.0, 80.0, 50.0, 20.0],
  coachingPayroll: 11.5,
  contracts: [
    {
      playerId: 'p1',
      name: 'Mike Trout',
      position: 'CF',
      rosterStatus: 'MLB',
      annualSalary: 35.5,
      yearsRemaining: 4,
      noTradeClause: true,
      playerOption: false,
    },
    {
      playerId: 'p2',
      name: 'Anthony Rendon',
      position: '3B',
      rosterStatus: 'MLB',
      annualSalary: 28.0,
      yearsRemaining: 2,
      noTradeClause: false,
      playerOption: true,
    },
  ],
};

describe('FinancePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 45,
      phase: 'regular_season',
      isInitialized: true,
      userTeamId: 'dal',
      teamName: 'Lone Stars',
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
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders finance overview with payroll and contract table', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getFinanceOverview: vi.fn().mockResolvedValue(MOCK_FINANCE_DATA),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <FinancePage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Finance');
    expect(container.textContent).toContain('Total Payroll');
    expect(container.textContent).toContain('$185.50M');
    expect(container.textContent).toContain('Budget');
    expect(container.textContent).toContain('$210.00M');
    expect(container.textContent).toContain('Coaching Staff');
    expect(container.textContent).toContain('$11.50M');

    // Contract table
    expect(container.textContent).toContain('Mike Trout');
    expect(container.textContent).toContain('Anthony Rendon');
    expect(container.textContent).toContain('CF');
    expect(container.textContent).toContain('3B');
    expect(container.textContent).toContain('NTC');
    expect(container.textContent).toContain('PO');

    // Future commitments
    expect(container.textContent).toContain('Year 1');
    expect(container.textContent).toContain('$140.00M');
  });

  it('shows loading state when data is not yet available', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: false,
      getFinanceOverview: vi.fn(),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <FinancePage />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Loading finance data');
  });
});
