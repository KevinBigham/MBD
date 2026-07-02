import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FinanceFutureCommitmentsPanel } from './FinanceFutureCommitmentsPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('FinanceFutureCommitmentsPanel', () => {
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

  it('renders future payroll commitments with year labels and money values', async () => {
    await act(async () => {
      root.render(
        <FinanceFutureCommitmentsPanel
          futureCommitments={[140, 110, 80]}
          totalPayroll={185.5}
        />,
      );
    });

    expect(container.textContent).toContain('Future Commitments');
    expect(container.textContent).toContain('Year 1');
    expect(container.textContent).toContain('Year 2');
    expect(container.textContent).toContain('Year 3');
    expect(container.textContent).toContain('$140.00M');
    expect(container.textContent).toContain('$110.00M');
    expect(container.textContent).toContain('$80.00M');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });
});
