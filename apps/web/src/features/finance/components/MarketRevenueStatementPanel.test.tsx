import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { deriveMarketRevenueStatement } from '@mbd/sim-core';
import { MarketRevenueStatementPanel } from './MarketRevenueStatementPanel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('MarketRevenueStatementPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('shows the settled causal statement without claiming attendance or paid-tax facts', async () => {
    const statement = deriveMarketRevenueStatement({
      teamId: 'nym',
      wins: 100,
      losses: 62,
      madePlayoffs: true,
      ownerArchetype: 'win_now',
    });
    await act(async () => root.render(<MarketRevenueStatementPanel statement={statement} />));

    expect(container.textContent).toContain('Market Revenue');
    expect(container.textContent).toContain('Settled');
    expect(container.textContent).toContain('large market baseline');
    expect(container.textContent).toContain('Modeled attendance · +1.88%');
    expect(container.textContent).toContain('Playoff bump · 3.5%');
    expect(container.textContent).toContain('Modeled gross revenue');
    expect(container.textContent).toContain('$331.94M');
    expect(container.textContent).toContain('Raw next-season budget');
    expect(container.textContent).toContain('$371.77M');
    expect(container.textContent).toContain('not a turnstile count or ticket ledger');
    expect(container.textContent).toContain('not deducted');
    expect(container.textContent).not.toMatch(/fans attended|paid tax/i);
  });

  it('states the exact future settlement seam before a receipt exists', async () => {
    await act(async () => root.render(<MarketRevenueStatementPanel statement={null} />));
    expect(container.textContent).toContain('first exact Advance or Skip');
    expect(container.textContent).toContain('completed Season Review');
    expect(container.textContent).toContain('active operating limits');
  });
});
