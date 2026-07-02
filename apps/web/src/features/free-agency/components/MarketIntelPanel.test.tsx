import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import MarketIntelPanel from './MarketIntelPanel';

const mockWorker = {
  getFreeAgencyMarketIntelligence: vi.fn(),
};

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: () => mockWorker,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('MarketIntelPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockWorker.getFreeAgencyMarketIntelligence.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  async function renderPanel() {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <MarketIntelPanel />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders market summary, player reports, comps, and shared dense shell', async () => {
    mockWorker.getFreeAgencyMarketIntelligence.mockResolvedValue({
      totalFreeAgents: 42,
      summary: {
        totalProjectedSpending: 612.4,
        hottestPosition: 'SP',
        topFreeAgents: [
          { name: 'Marco Reyes', projectedAAV: 34.2 },
          { name: 'Jonah Price', projectedAAV: 27.5 },
        ],
        positionDemand: { SP: 7, CF: 4 },
      },
      reports: [
        {
          playerId: 'fa-market-1',
          playerName: 'Marco Reyes',
          position: 'SP',
          age: 30,
          projectedValue: 36.1,
          demandLevel: 'bidding_war',
          interestedTeamCount: 6,
          signingPrediction: {
            likelyTeamId: 'nym',
            projectedYears: 6,
            projectedAAV: 34.2,
            confidence: 'high',
          },
          comparableContracts: [
            {
              playerName: 'Ace Bell',
              position: 'SP',
              ageAtSigning: 31,
              annualValue: 32.5,
              years: 5,
              season: 9,
            },
          ],
        },
      ],
    });

    await renderPanel();

    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Market Intelligence');
    expect(container.textContent).toContain('42 free agents');
    expect(container.textContent).toContain('$612.4M');
    expect(container.textContent).toContain('SP');
    expect(container.textContent).toContain('Marco Reyes');
    expect(container.textContent).toContain('$34.2M');
    expect(container.textContent).toContain('Bidding War');
    expect(container.textContent).toContain('6yr / $34.2M AAV');
    expect(container.textContent).toContain('High');
    expect(container.querySelector('a[href="/players/fa-market-1"]')).toBeTruthy();

    await act(async () => {
      Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Show comps'),
      )?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Comparable contracts');
    expect(container.textContent).toContain('Ace Bell (SP, age 31)');
    expect(container.textContent).toContain('5yr / $32.5M');
    expect(mockWorker.getFreeAgencyMarketIntelligence).toHaveBeenCalledTimes(1);
  });

  it('renders empty market intelligence copy in the shared dense shell', async () => {
    mockWorker.getFreeAgencyMarketIntelligence.mockResolvedValue(null);

    await renderPanel();

    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Market intelligence available during free agency');
  });
});
