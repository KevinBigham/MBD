import { act } from 'react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import ScoutingPageContent from './ScoutingPageContent';

vi.mock('./InternationalScoutingPanel', () => ({
  default: ({ onTradePoolSpace }: { onTradePoolSpace: () => void }) => (
    <section>
      International Panel Mock
      <button type="button" onClick={onTradePoolSpace}>Trade Pool</button>
    </section>
  ),
  formatScoutingMoney: (value: number) => `$${value.toFixed(2)}M`,
}));

vi.mock('./ProScoutingPanel', () => ({
  default: ({ onSearch }: { onSearch: () => void }) => (
    <section>
      Pro Panel Mock
      <button type="button" onClick={onSearch}>Run Search</button>
    </section>
  ),
}));

vi.mock('./ScoutConflictsTab', () => ({
  ScoutConflictsTab: () => <section>Conflicts Panel Mock</section>,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ScoutingPageContent', () => {
  function renderContent(
    activeView: 'international' | 'pro' | 'conflicts',
    overrides: Partial<ComponentProps<typeof ScoutingPageContent>> = {},
  ) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const props: ComponentProps<typeof ScoutingPageContent> = {
      actionMessage: null,
      activeView,
      chemistry: null,
      ifaBonus: '',
      ifaLoading: false,
      ifaPool: null,
      ifaReport: null,
      loading: false,
      onChangeIFABonus: vi.fn(),
      onChangeSearchQuery: vi.fn(),
      onChangeTradeAmount: vi.fn(),
      onChangeTradeTarget: vi.fn(),
      onChangeView: vi.fn(),
      onScoutPlayer: vi.fn(),
      onScoutProspect: vi.fn(),
      onSearch: vi.fn(),
      onSignProspect: vi.fn(),
      onTradePoolSpace: vi.fn(),
      ownerState: null,
      recentReports: [],
      scoutReport: null,
      scouts: [{ id: 'scout-1', name: 'Marta Vega', quality: 72, specialty: 'international', bias: 'tools_lover' }],
      searchQuery: '',
      searchResults: [],
      tradeAmount: '0.50',
      tradeTarget: 'bos',
      tradeTargets: [{ id: 'bos', city: 'Boston', name: 'Noreasters' }],
      ...overrides,
    };

    return { container, props, root };
  }

  it('renders the selected scouting view and delegates route-owned callbacks', async () => {
    const { container, props, root } = renderContent('international');

    try {
      await act(async () => {
        root.render(<ScoutingPageContent {...props} />);
      });

      expect(container.textContent).toContain('Scouting');
      expect(container.textContent).toContain('Your Scouting Department');
      expect(container.textContent).toContain('Marta Vega');
      expect(container.textContent).toContain('International Panel Mock');
      expect(container.textContent).not.toContain('Pro Panel Mock');

      await act(async () => {
        container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(props.onChangeView).toHaveBeenCalledWith('international');

      const tradePoolButton = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Trade Pool'),
      );

      await act(async () => {
        tradePoolButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(props.onTradePoolSpace).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('switches between pro and conflict content without route hooks', async () => {
    const { container, props, root } = renderContent('pro');

    try {
      await act(async () => {
        root.render(<ScoutingPageContent {...props} />);
      });

      expect(container.textContent).toContain('Pro Panel Mock');
      expect(container.textContent).not.toContain('Conflicts Panel Mock');

      await act(async () => {
        root.render(<ScoutingPageContent {...props} activeView="conflicts" />);
      });

      expect(container.textContent).toContain('Conflicts Panel Mock');
      expect(container.textContent).not.toContain('Pro Panel Mock');
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
