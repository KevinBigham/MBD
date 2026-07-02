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

  it('renders payroll pressure using payroll cap before annual budget and budget room math', async () => {
    await renderBody({
      payroll: 168.5,
      budget: 200,
      luxuryTax: 7.25,
      annualBudget: 190,
      payrollCap: 210,
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Payroll vs target');
    expect(text).toContain('$168.5M');
    expect(text).toContain('Budget target $210.0M');
    expect(text).toContain('Budget room');
    expect(text).toContain('$31.5M');
    expect(text).toContain('Luxury tax');
    expect(text).toContain('$7.3M');
  });

  it('falls back to budget target, clamps budget room, and renders clear tax copy', async () => {
    await renderBody({
      payroll: 75,
      budget: 60,
      luxuryTax: 0,
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Budget target $60.0M');
    expect(text).toContain('$0.0M');
    expect(text).toContain('Clear');
  });
});
