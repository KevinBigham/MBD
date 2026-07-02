import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StaffBudgetPanel } from './StaffBudgetPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('StaffBudgetPanel', () => {
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

  it('renders staff payroll budget and remaining room', async () => {
    await act(async () => {
      root.render(
        <StaffBudgetPanel
          budget={{ payroll: 11.2, budget: 13.4, remaining: 2.2 }}
        />,
      );
    });

    expect(container.textContent).toContain('Budget');
    expect(container.textContent).toContain('$2.20M room');
    expect(container.textContent).toContain('Payroll');
    expect(container.textContent).toContain('$11.20M');
    expect(container.textContent).toContain('$13.40M');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });

  it('renders a loading badge when budget data is unavailable', async () => {
    await act(async () => {
      root.render(<StaffBudgetPanel budget={null} />);
    });

    expect(container.textContent).toContain('Loading');
    expect(container.textContent).toContain('Payroll');
    expect(container.textContent).toContain('--');
  });
});
