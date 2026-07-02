import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import MarketIntelPlayerReportCard, { type MarketReport } from './MarketIntelPlayerReportCard';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const report: MarketReport = {
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
    {
      playerName: 'Veteran Lefty',
      position: 'SP',
      ageAtSigning: 33,
      annualValue: 21.4,
      years: 3,
      season: 8,
    },
  ],
};

describe('MarketIntelPlayerReportCard', () => {
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
  });

  async function renderCard(nextReport: MarketReport = report) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <MarketIntelPlayerReportCard report={nextReport} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });
  }

  it('renders free-agent market demand, prediction, player link, and expandable comps', async () => {
    await renderCard();

    expect(container.querySelector('a[href="/players/fa-market-1"]')?.textContent).toContain('Marco Reyes');
    expect(container.textContent).toContain('Bidding War');
    expect(container.textContent).toContain('SP · Age 30 · 6 teams interested');
    expect(container.textContent).toContain('$36.1M');
    expect(container.textContent).toContain('6yr / $34.2M AAV');
    expect(container.textContent).toContain('High');
    expect(container.textContent).not.toContain('Ace Bell');

    const compsButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Show comps (2)'),
    );

    await act(async () => {
      compsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Comparable contracts');
    expect(container.textContent).toContain('Ace Bell (SP, age 31)');
    expect(container.textContent).toContain('5yr / $32.5M');
  });
});
