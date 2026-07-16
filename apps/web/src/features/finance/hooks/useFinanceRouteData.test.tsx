import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  useFinanceRouteData,
  type FinanceRouteDataOptions,
  type FinanceRouteDataResult,
} from './useFinanceRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function HookHarness({
  options,
  onRender,
}: {
  options: FinanceRouteDataOptions;
  onRender: (result: FinanceRouteDataResult) => void;
}) {
  onRender(useFinanceRouteData(options));
  return null;
}

const financeOverview = {
  totalPayroll: 185.5,
  mlbPayroll: 162.3,
  minorsPayroll: 23.2,
  luxuryTaxPayroll: 162.3,
  luxuryTax: 0,
  budget: 210,
  capSpace: 67.7,
  budgetRoom: 24.5,
  ownerPayrollPolicy: {
    archetype: 'patient_builder',
    floor: 72.92,
    softCeiling: 182.3,
    totalPayroll: 185.5,
    ownerBand: 'above_soft_ceiling',
    floorShortfall: 0,
    softCeilingRoom: 0,
    softCeilingOverage: 3.2,
    taxThreshold: 230,
    luxuryTaxPayroll: 162.3,
    taxBand: 'clear',
    taxRoom: 67.7,
    taxOverage: 0,
    projectedTax: 0,
  },
  futureCommitments: [140, 110, 80, 50, 20],
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
      annualSalary: 9,
      yearsRemaining: 1,
      noTradeClause: false,
      playerOption: true,
    },
    {
      playerId: 'p3',
      name: 'Jordan Prospect',
      position: 'SS',
      rosterStatus: 'AAA',
      annualSalary: 0.4,
      yearsRemaining: 1,
      noTradeClause: false,
      playerOption: false,
    },
    {
      playerId: 'p4',
      name: 'Zack Bridge',
      position: 'RP',
      rosterStatus: 'MLB',
      annualSalary: 1.2,
      yearsRemaining: 2,
      noTradeClause: false,
      playerOption: false,
    },
  ],
};

describe('useFinanceRouteData', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: FinanceRouteDataResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latest = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function makeOptions(overrides: Partial<FinanceRouteDataOptions> = {}) {
    const getFinanceOverview = vi.fn().mockResolvedValue(financeOverview);

    return {
      getFinanceOverview,
      options: {
        day: 45,
        getFinanceOverview,
        isInitialized: true,
        phase: 'regular_season',
        season: 3,
        workerReady: true,
        ...overrides,
      } satisfies FinanceRouteDataOptions,
    };
  }

  async function renderHook(options: FinanceRouteDataOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latest = result;
      }} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest).toBeTruthy();
    return latest as FinanceRouteDataResult;
  }

  it('waits without querying until game state and worker are ready', async () => {
    const { getFinanceOverview, options } = makeOptions({ workerReady: false });

    const result = await renderHook(options);

    expect(getFinanceOverview).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.visibleContracts).toEqual([]);
    expect(result.contractFilter).toBe('mlb');
  });

  it('loads finance data and derives contract filters from route-owned state', async () => {
    const { getFinanceOverview, options } = makeOptions();

    const result = await renderHook(options);

    expect(getFinanceOverview).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual(financeOverview);
    expect(result.contractFilterCounts).toMatchObject({
      all: 4,
      mlb: 3,
      minors: 1,
      expiring: 2,
      clauses: 2,
      extension_priority: 2,
    });
    expect(result.visibleContracts.map((contract) => contract.playerId)).toEqual(['p1', 'p2', 'p4']);

    await act(async () => {
      result.setContractFilter('all');
      await Promise.resolve();
    });

    let next = latest as FinanceRouteDataResult;
    expect(next.visibleContracts.map((contract) => contract.playerId)).toEqual(['p1', 'p2', 'p4', 'p3']);

    await act(async () => {
      next.handleSort('name');
      await Promise.resolve();
    });

    next = latest as FinanceRouteDataResult;
    expect(next.sortIndicator('name')).toBe(' ▲');
    expect(next.visibleContracts.map((contract) => contract.playerId)).toEqual(['p2', 'p3', 'p1', 'p4']);

    await act(async () => {
      next.handleSort('name');
      await Promise.resolve();
    });

    next = latest as FinanceRouteDataResult;
    expect(next.sortIndicator('name')).toBe(' ▼');
    expect(next.visibleContracts.map((contract) => contract.playerId)).toEqual(['p4', 'p1', 'p3', 'p2']);
  });
});
