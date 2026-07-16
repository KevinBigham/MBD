import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { FinanceSummaryCardsPanel } from './FinanceSummaryCardsPanel';

const CLEAR_POLICY = {
  archetype: 'patient_builder' as const,
  floor: 72,
  softCeiling: 180,
  totalPayroll: 185.5,
  ownerBand: 'above_soft_ceiling' as const,
  floorShortfall: 0,
  softCeilingRoom: 0,
  softCeilingOverage: 5.5,
  taxThreshold: 230,
  luxuryTaxPayroll: 217.5,
  taxBand: 'clear' as const,
  taxRoom: 12.5,
  taxOverage: 0,
  projectedTax: 0,
};

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
          budgetRoom={24.5}
          coachingPayroll={11.5}
          retainedSalaryCharges={5}
          cashConsiderationCharges={2}
          releasedContractCharges={0}
          acquiredSalaryCredits={7}
          luxuryTax={0}
          luxuryTaxPayroll={217.5}
          minorsPayroll={23.2}
          mlbPayroll={162.3}
          ownerPayrollPolicy={CLEAR_POLICY}
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
    expect(container.textContent).toContain('Effective Gameplay Budget');
    expect(container.textContent).toContain('$210.00M');
    expect(container.textContent).toContain('$24.50M effective room');
    expect(container.textContent).toContain('Owner Plan');
    expect(container.textContent).toContain('$72.00M');
    expect(container.textContent).toContain('$180.00M');
    expect(container.textContent).toContain('Projected Tax');
    expect(container.textContent).toContain('Clear');
    expect(container.textContent).toContain('Overage');
    expect(container.textContent).toContain('--');
    expect(container.textContent).toContain('Coaching Staff');
    expect(container.textContent).toContain('$11.50M');
    expect(container.textContent).toContain('Trade Salary Support');
    expect(container.textContent).toContain('$7.00M received');
    expect(container.textContent).toContain('Retained out');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(6);
  });

  it('labels a hard-difficulty overlay as effective gameplay budget and shows pressure', async () => {
    await act(async () => {
      root.render(
        <FinanceSummaryCardsPanel
          budget={180}
          budgetRoom={-70}
          coachingPayroll={14}
          retainedSalaryCharges={0}
          cashConsiderationCharges={0}
          releasedContractCharges={0}
          acquiredSalaryCredits={0}
          luxuryTax={3.15}
          luxuryTaxPayroll={245.75}
          minorsPayroll={20}
          mlbPayroll={230}
          ownerPayrollPolicy={{
            ...CLEAR_POLICY,
            softCeiling: 200,
            totalPayroll: 250,
            softCeilingOverage: 50,
            luxuryTaxPayroll: 245.75,
            taxBand: 'taxpayer',
            taxRoom: 0,
            taxOverage: 15.75,
            projectedTax: 3.15,
          }}
          totalPayroll={250}
        />,
      );
    });

    expect(container.textContent).toContain('Effective Gameplay Budget');
    expect(container.textContent).toContain('$70.00M over effective budget');
    expect(container.textContent).toContain('$3.15M');
    expect(container.textContent).toContain('$15.75M');
  });
});
