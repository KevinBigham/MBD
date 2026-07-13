import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  FinanceContractTablePanel,
  type FinanceContractFilter,
  type FinanceContractSortKey,
} from './FinanceContractTablePanel';
import type { FinanceContractEntry } from './financePresentation';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const CONTRACTS: FinanceContractEntry[] = [
  {
    playerId: 'p1',
    name: 'Mike Trout',
    position: 'CF',
    rosterStatus: 'MLB',
    annualSalary: 35.5,
    yearsRemaining: 4,
    noTradeClause: true,
    playerOption: false,
    teamOption: false,
  },
  {
    playerId: 'p2',
    name: 'Anthony Rendon',
    position: '3B',
    rosterStatus: 'MLB',
    annualSalary: 28,
    yearsRemaining: 2,
    noTradeClause: false,
    playerOption: true,
    teamOption: false,
  },
  {
    playerId: 'p3',
    name: 'Rookie Starter',
    position: 'SP',
    rosterStatus: 'AAA',
    annualSalary: 0.8,
    yearsRemaining: 1,
    noTradeClause: false,
    playerOption: false,
    teamOption: false,
  },
];

const FILTER_COUNTS: Record<FinanceContractFilter, number> = {
  mlb: 2,
  minors: 1,
  expiring: 1,
  high_salary: 2,
  clauses: 2,
  extension_priority: 1,
  all: 3,
};

describe('FinanceContractTablePanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function renderPanel(
    overrides: Partial<{
      contractFilter: FinanceContractFilter;
      onContractFilterChange: (filter: FinanceContractFilter) => void;
      onSort: (key: FinanceContractSortKey) => void;
      sortIndicator: (key: FinanceContractSortKey) => string;
      visibleContracts: FinanceContractEntry[];
    }> = {},
  ) {
    const onContractFilterChange = overrides.onContractFilterChange ?? vi.fn();
    const onSort = overrides.onSort ?? vi.fn();
    const sortIndicator = overrides.sortIndicator ?? ((key) => (key === 'annualSalary' ? ' ▼' : ''));

    act(() => {
      root.render(
        <FinanceContractTablePanel
          contractFilter={overrides.contractFilter ?? 'mlb'}
          contractFilterCounts={FILTER_COUNTS}
          contracts={CONTRACTS}
          onContractFilterChange={onContractFilterChange}
          onSort={onSort}
          sortIndicator={sortIndicator}
          visibleContracts={overrides.visibleContracts ?? CONTRACTS.slice(0, 2)}
        />,
      );
    });

    return { onContractFilterChange, onSort };
  }

  it('renders contract rows, filter counts, salary indicator, and clause badges', () => {
    renderPanel();

    expect(container.textContent).toContain('Player Contracts (2/3)');
    expect(container.textContent).toContain('MLB · 2');
    expect(container.textContent).toContain('Minors · 1');
    expect(container.textContent).toContain('Full List · 3');
    expect(container.textContent).toContain('Salary ▼');
    expect(container.textContent).toContain('Mike Trout');
    expect(container.textContent).toContain('$35.5M');
    expect(container.textContent).toContain('Anthony Rendon');
    expect(container.textContent).toContain('NTC');
    expect(container.textContent).toContain('PO');
    expect(container.textContent).not.toContain('Expiring after this season');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });

  it('labels one-year contracts as expiring after this season', () => {
    renderPanel({ visibleContracts: [CONTRACTS[2]!] });

    expect(container.textContent).toContain('Rookie Starter');
    expect(container.textContent).toContain('Expiring after this season');
  });

  it('distinguishes a one-year team option from an actual expiry', () => {
    renderPanel({
      visibleContracts: [{ ...CONTRACTS[2]!, teamOption: true }],
    });

    expect(container.textContent).toContain('Team option after this season');
    expect(container.textContent).not.toContain('Expiring after this season');
  });

  it('delegates filter and sort changes to the route-owned handlers', () => {
    const { onContractFilterChange, onSort } = renderPanel();

    const fullListButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Full List'),
    );
    expect(fullListButton).toBeTruthy();

    act(() => {
      fullListButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onContractFilterChange).toHaveBeenCalledWith('all');

    const salaryHeader = Array.from(container.querySelectorAll('th')).find((heading) =>
      heading.textContent?.includes('Salary'),
    );
    expect(salaryHeader).toBeTruthy();

    act(() => {
      salaryHeader?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSort).toHaveBeenCalledWith('annualSalary');
  });

  it('marks contract filters as route-critical mobile controls', () => {
    renderPanel();

    const filterButtons = Array.from(
      container.querySelectorAll('button[data-mobile-critical-control="finance-contract-filter"]'),
    );

    expect(filterButtons.length).toBe(Object.keys(FILTER_COUNTS).length);
    for (const button of filterButtons) {
      expect(button.className).toContain('mobile-critical-control');
      expect(button.className).toContain('focus-ring');
    }
  });
});
