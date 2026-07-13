import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  OffseasonTransactionLedgerPanel,
  type OffseasonTransactionGroupView,
} from './OffseasonTransactionLedgerPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const groups: OffseasonTransactionGroupView[] = [
  {
    phase: 'arbitration',
    label: 'Arbitration',
    rows: [
      {
        id: 'arb-1',
        tone: 'user',
        summary: 'Juan Soto signed for $12.4M/yr (1 year)',
      },
    ],
  },
  {
    phase: 'extensions',
    label: 'Extensions',
    rows: [
      {
        id: 'contract-option-7-player-1',
        tone: 'user',
        summary: 'Alex Option had a team option exercised for the coming season.',
      },
    ],
  },
  {
    phase: 'free_agency',
    label: 'Free Agency',
    rows: [
      {
        id: 'fa-1',
        tone: 'division_rival',
        summary: 'Corbin Burnes signed with Boston Noreasters for $28.5M/yr (5 years)',
      },
      {
        id: 'fa-2',
        tone: 'neutral',
        summary: 'A depth catcher signed a minor-league deal.',
      },
    ],
  },
];

describe('OffseasonTransactionLedgerPanel', () => {
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
    vi.clearAllMocks();
  });

  it('renders expanded transaction groups with tone styling and counts', async () => {
    await act(async () => {
      root.render(
        <OffseasonTransactionLedgerPanel
          transactionGroups={groups}
          expandedPhases={{ arbitration: true, free_agency: true }}
          onToggleGroup={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('Completed Transactions');
    expect(container.textContent).toContain('Arbitration');
    expect(container.textContent).toContain('1 transaction');
    expect(container.textContent).toContain('Free Agency');
    expect(container.textContent).toContain('2 transactions');
    expect(container.textContent).toContain('Alex Option had a team option exercised for the coming season.');
    expect(container.textContent).toContain('Juan Soto signed for $12.4M/yr');
    expect(container.textContent).toContain('Corbin Burnes signed with Boston Noreasters');
    expect(container.textContent).toContain('A depth catcher signed a minor-league deal.');
    expect(container.innerHTML).toContain('accent-success');
    expect(container.innerHTML).toContain('accent-warning');
    expect(container.innerHTML).toContain('dynasty-elevated');
  });

  it('hides collapsed rows and delegates group toggles to the route', async () => {
    const onToggleGroup = vi.fn();

    await act(async () => {
      root.render(
        <OffseasonTransactionLedgerPanel
          transactionGroups={groups}
          expandedPhases={{ arbitration: false, free_agency: true }}
          onToggleGroup={onToggleGroup}
        />,
      );
    });

    expect(container.textContent).toContain('Arbitration');
    expect(container.textContent).not.toContain('Juan Soto signed for $12.4M/yr');

    const arbitrationButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Arbitration'),
    );
    await act(async () => {
      arbitrationButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onToggleGroup).toHaveBeenCalledWith('arbitration');
  });
});
