import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import FinancialCardBody from './FinancialCardBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('FinancialCardBody', () => {
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

  async function renderBody(props: Parameters<typeof FinancialCardBody>[0]) {
    await act(async () => {
      root.render(<FinancialCardBody {...props} />);
    });
  }

  it('renders canonical owner policy before legacy budget fields and budget room math', async () => {
    await renderBody({
      payroll: 168.5,
      budget: 200,
      luxuryTax: 4,
      annualBudget: 190,
      payrollCap: 210,
      ownerPayrollPolicy: {
        archetype: 'win_now',
        floor: 100,
        softCeiling: 200,
        totalPayroll: 168.5,
        ownerBand: 'on_plan',
        floorShortfall: 0,
        softCeilingRoom: 31.5,
        softCeilingOverage: 0,
        taxThreshold: 230,
        luxuryTaxPayroll: 250,
        taxBand: 'taxpayer',
        taxRoom: 0,
        taxOverage: 20,
        projectedTax: 4,
      },
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Payroll vs owner plan');
    expect(text).toContain('$168.5M');
    expect(text).toContain('Inside owner plan');
    expect(text).toContain('Floor $100.0M');
    expect(text).toContain('Soft ceiling $200.0M');
    expect(text).toContain('Budget room');
    expect(text).toContain('$31.5M');
    expect(text).toContain('remaining');
    expect(text).toContain('Projected tax exposure');
    expect(text).toContain('Tax payroll $250.0M');
    expect(text).toContain('Line $230.0M');
    expect(text).toContain('$4.0M');
  });

  it('falls back to budget target, reports signed over-budget truth, and renders clear tax copy', async () => {
    await renderBody({
      payroll: 75,
      budget: 60,
      luxuryTax: 0,
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Budget target $60.0M');
    expect(text).toContain('$15.0M over budget');
    expect(text).toContain('Clear');
  });

  it('colors owner-plan progress from the canonical owner band instead of spend rate', async () => {
    const basePolicy = {
      archetype: 'win_now' as const,
      floor: 100,
      softCeiling: 200,
      totalPayroll: 195,
      floorShortfall: 0,
      softCeilingRoom: 5,
      softCeilingOverage: 0,
      taxThreshold: 230,
      luxuryTaxPayroll: 195,
      taxBand: 'clear' as const,
      taxRoom: 35,
      taxOverage: 0,
      projectedTax: 0,
    };
    await renderBody({
      payroll: 195,
      budget: 210,
      luxuryTax: 0,
      ownerPayrollPolicy: { ...basePolicy, ownerBand: 'on_plan' },
    });
    expect(container.querySelector('.bg-accent-success')).not.toBeNull();

    await renderBody({
      payroll: 80,
      budget: 210,
      luxuryTax: 0,
      ownerPayrollPolicy: {
        ...basePolicy,
        totalPayroll: 80,
        ownerBand: 'below_floor',
        floorShortfall: 20,
        softCeilingRoom: 120,
      },
    });
    expect(container.querySelector('.bg-accent-warning')).not.toBeNull();
  });
});
