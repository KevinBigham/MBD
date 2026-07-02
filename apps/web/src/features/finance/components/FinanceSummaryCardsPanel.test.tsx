import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { FinanceSummaryCardsPanel } from './FinanceSummaryCardsPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('FinanceSummaryCardsPanel', () => {
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

  it('renders payroll, budget, tax, and coaching summary cards', async () => {
    await act(async () => {
      root.render(
        <FinanceSummaryCardsPanel
          budget={210}
          capSpace={12.5}
          coachingPayroll={11.5}
          luxuryTax={0}
          luxuryTaxPayroll={217.5}
          minorsPayroll={23.2}
          mlbPayroll={162.3}
          totalPayroll={185.5}
        />,
      );
    });

    expect(container.textContent).toContain('Total Payroll');
    expect(container.textContent).toContain('$185.50M');
    expect(container.textContent).toContain('MLB');
    expect(container.textContent).toContain('$162.30M');
    expect(container.textContent).toContain('Minors');
    expect(container.textContent).toContain('$23.20M');
    expect(container.textContent).toContain('Budget');
    expect(container.textContent).toContain('$210.00M');
    expect(container.textContent).toContain('$24.50M remaining');
    expect(container.textContent).toContain('Luxury Tax');
    expect(container.textContent).toContain('None');
    expect(container.textContent).toContain('Overage');
    expect(container.textContent).toContain('--');
    expect(container.textContent).toContain('Coaching Staff');
    expect(container.textContent).toContain('$11.50M');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(4);
  });

  it('shows over-budget and over-tax pressure without route state', async () => {
    await act(async () => {
      root.render(
        <FinanceSummaryCardsPanel
          budget={180}
          capSpace={-18.25}
          coachingPayroll={14}
          luxuryTax={7.25}
          luxuryTaxPayroll={245.75}
          minorsPayroll={20}
          mlbPayroll={230}
          totalPayroll={250}
        />,
      );
    });

    expect(container.textContent).toContain('$70.00M over budget');
    expect(container.textContent).toContain('$7.25M');
    expect(container.textContent).toContain('$15.75M');
  });
});
