import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import FreeAgencyMarketBoardPanel, {
  type DemandFilter,
  type FreeAgencyMarketAgent,
  type PositionFilter,
  type SortKey,
} from './FreeAgencyMarketBoardPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const agents: FreeAgencyMarketAgent[] = [
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
];

describe('FreeAgencyMarketBoardPanel', () => {
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

  function renderPanel(overrides: Partial<{
    agents: FreeAgencyMarketAgent[];
    positionFilter: PositionFilter;
    demandFilter: DemandFilter;
    sortKey: SortKey;
    sortDesc: boolean;
    searchQuery: string;
    selectedPlayerId: string | null;
    onPositionFilterChange: (filter: PositionFilter) => void;
    onDemandFilterChange: (filter: DemandFilter) => void;
    onSortKeyChange: (key: SortKey) => void;
    onSearchQueryChange: (query: string) => void;
    onSelectPlayer: (agent: FreeAgencyMarketAgent) => void;
  }> = {}) {
    const props = {
      agents,
      positionFilter: 'all' as PositionFilter,
      demandFilter: 'all' as DemandFilter,
      sortKey: 'marketValue' as SortKey,
      sortDesc: true,
      searchQuery: '',
      selectedPlayerId: null,
      onPositionFilterChange: vi.fn(),
      onDemandFilterChange: vi.fn(),
      onSortKeyChange: vi.fn(),
      onSearchQueryChange: vi.fn(),
      onSelectPlayer: vi.fn(),
      ...overrides,
    };

    root.render(
      <MemoryRouter>
        <FreeAgencyMarketBoardPanel {...props} />
      </MemoryRouter>,
    );

    return props;
  }

  it('renders market controls, player rows, links, demand badges, and selected state', async () => {
    await act(async () => {
      renderPanel({ selectedPlayerId: 'fa-1' });
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Available Free Agents (2)');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Power Bat');
    expect(container.textContent).toContain('Depth Arm');
    expect(container.textContent).toContain('$22.0M');
    expect(container.textContent).toContain('elite');
    expect(container.querySelector('a[href="/players/fa-1"]')).toBeTruthy();
    expect(container.querySelector('input[placeholder="Search name or position..."]')).toBeTruthy();
    expect(container.querySelector('[data-mobile-critical-control="free-agency-position-filter"]')).toBeTruthy();
    expect(container.querySelector('[data-mobile-critical-control="free-agency-demand-filter"]')).toBeTruthy();
    expect(container.querySelector('[data-mobile-critical-control="free-agency-sort"]')).toBeTruthy();
    expect(container.querySelector('tr.bg-accent-primary\\/10')).toBeTruthy();
  });

  it('delegates filter, search, sort, and player selection controls', async () => {
    const onPositionFilterChange = vi.fn();
    const onDemandFilterChange = vi.fn();
    const onSortKeyChange = vi.fn();
    const onSearchQueryChange = vi.fn();
    const onSelectPlayer = vi.fn();

    await act(async () => {
      renderPanel({
        onPositionFilterChange,
        onDemandFilterChange,
        onSortKeyChange,
        onSearchQueryChange,
        onSelectPlayer,
      });
      await Promise.resolve();
    });

    const positionButtons = Array.from(
      container.querySelectorAll('[data-mobile-critical-control="free-agency-position-filter"]'),
    );
    await act(async () => {
      positionButtons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(onPositionFilterChange).toHaveBeenCalledWith('hitters');

    const search = container.querySelector('input[placeholder="Search name or position..."]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(search, 'power');
      search.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(onSearchQueryChange).toHaveBeenCalledWith('power');

    const demandSelect = container.querySelector('[data-mobile-critical-control="free-agency-demand-filter"]') as HTMLSelectElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(demandSelect, 'elite');
      demandSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(onDemandFilterChange).toHaveBeenCalledWith('elite');

    const sortButtons = Array.from(
      container.querySelectorAll('[data-mobile-critical-control="free-agency-sort"]'),
    );
    await act(async () => {
      sortButtons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(onSortKeyChange).toHaveBeenCalledWith('displayRating');

    const armRow = Array.from(container.querySelectorAll('tr')).find((row) =>
      row.textContent?.includes('Depth Arm'),
    );
    await act(async () => {
      armRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(onSelectPlayer).toHaveBeenCalledWith(agents[1]);
  });

  it('renders an empty market state when no rows match the route filters', async () => {
    await act(async () => {
      renderPanel({ agents: [] });
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Available Free Agents (0)');
    expect(container.textContent).toContain('No free agents available');
  });
});
