import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  OffseasonMarketDayBriefingPanel,
  type OffseasonMarketDaySummaryView,
} from './OffseasonMarketDayBriefingPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const summaries: OffseasonMarketDaySummaryView[] = [
  {
    id: 'market-fa-1',
    day: 18,
    category: 'signing',
    tone: 'user',
    headline: 'New York Tycoons commit $186.0M',
    detail: 'Juan Soto signed a 6-year deal at $31.0M/yr.',
    teamIds: ['nym'],
    playerIds: ['soto-1'],
    valueLabel: '$186.0M',
  },
  {
    id: 'market-trade-1',
    day: 17,
    category: 'trade',
    tone: 'division_rival',
    headline: 'Boston Noreasters reshaped the market',
    detail: 'Boston sent Rafael Devers to New York for Juan Soto.',
    teamIds: ['bos', 'nym'],
    playerIds: ['devers-1', 'soto-1'],
    valueLabel: 'Trade value +22',
  },
];

describe('OffseasonMarketDayBriefingPanel', () => {
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

  it('renders signing and trade summaries with tone styling and value labels', async () => {
    await act(async () => {
      root.render(<OffseasonMarketDayBriefingPanel summaries={summaries} />);
    });

    expect(container.textContent).toContain('Market Day Briefing');
    expect(container.textContent).toContain('2 major moves');
    expect(container.textContent).toContain('Signing');
    expect(container.textContent).toContain('Trade');
    expect(container.textContent).toContain('Day 18');
    expect(container.textContent).toContain('$186.0M');
    expect(container.textContent).toContain('New York Tycoons commit $186.0M');
    expect(container.textContent).toContain('Boston Noreasters reshaped the market');
    expect(container.textContent).toContain('Trade value +22');
    expect(container.innerHTML).toContain('accent-success');
    expect(container.innerHTML).toContain('accent-warning');
  });

  it('uses the singular move count for one summary', async () => {
    await act(async () => {
      root.render(<OffseasonMarketDayBriefingPanel summaries={[summaries[0]!]} />);
    });

    expect(container.textContent).toContain('1 major move');
    expect(container.textContent).not.toContain('1 major moves');
  });
});
