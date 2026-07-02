import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import FreeAgencyPageContent from './FreeAgencyPageContent';
import type { FreeAgencyOfferActionsResult } from '../hooks/useFreeAgencyOfferActions';
import type { FreeAgencyRouteDataResult } from '../hooks/useFreeAgencyRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const powerBat = {
  id: 'fa-1',
  firstName: 'Power',
  lastName: 'Bat',
  position: '1B',
  age: 31,
  displayRating: 66,
  letterGrade: 'A',
  marketValue: 22,
  demandLevel: 'elite',
};

function buildRouteData(
  overrides: Partial<FreeAgencyRouteDataResult> = {},
): FreeAgencyRouteDataResult {
  return {
    agents: [powerBat],
    demandFilter: 'all',
    fetchFreeAgents: vi.fn(),
    filteredAgents: [powerBat],
    finance: { totalPayroll: 120, budget: 160, capSpace: 30 },
    handleSortKeyChange: vi.fn(),
    loading: false,
    positionFilter: 'all',
    removeAgentById: vi.fn(),
    searchQuery: '',
    setDemandFilter: vi.fn(),
    setPositionFilter: vi.fn(),
    setSearchQuery: vi.fn(),
    sortDesc: true,
    sortKey: 'marketValue',
    ...overrides,
  };
}

function buildOfferActions(
  overrides: Partial<FreeAgencyOfferActionsResult> = {},
): FreeAgencyOfferActionsResult {
  return {
    handleOffer: vi.fn(),
    handleSelectPlayer: vi.fn(),
    offerBudget: null,
    offerResult: null,
    offerSalary: 10,
    offerYears: 3,
    selectedPlayer: null,
    setOfferSalary: vi.fn(),
    setOfferYears: vi.fn(),
    ...overrides,
  };
}

describe('FreeAgencyPageContent', () => {
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

  it('renders the market-closed state before offseason when no agents are loaded', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <FreeAgencyPageContent
            marketIntelSlot={<div>Market Intelligence Slot</div>}
            offerActions={buildOfferActions()}
            phase="regular"
            routeData={buildRouteData({
              agents: [],
              filteredAgents: [],
            })}
            onPositionFilterChange={vi.fn()}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Free Agency');
    expect(container.textContent).toContain('Market Closed');
    expect(container.textContent).toContain('The free agent market opens during the offseason.');
    expect(container.textContent).not.toContain('Market Intelligence Slot');
  });

  it('renders the open market and delegates route callbacks', async () => {
    const routeData = buildRouteData();
    const offerActions = buildOfferActions();
    const handlePositionFilterChange = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <FreeAgencyPageContent
            marketIntelSlot={<div>Market Intelligence Slot</div>}
            offerActions={offerActions}
            phase="offseason"
            routeData={routeData}
            onPositionFilterChange={handlePositionFilterChange}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Sign available free agents to strengthen your roster.');
    expect(container.textContent).toContain('Power Bat');
    expect(container.textContent).toContain('Market Intelligence Slot');

    const hittersFilter = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('hitters'),
    );
    await act(async () => {
      hittersFilter?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(handlePositionFilterChange).toHaveBeenCalledWith('hitters');

    const powerRow = Array.from(container.querySelectorAll('tr')).find((row) =>
      row.textContent?.includes('Power Bat'),
    );
    await act(async () => {
      powerRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(offerActions.handleSelectPlayer).toHaveBeenCalledWith(powerBat);
  });
});
