import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { FinancialPlaybook } from '@mbd/sim-core';
import { FinancialView } from './FinancialView';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createFinancialPlaybook(extensionCount: number): FinancialPlaybook {
  return {
    payroll: {
      totalPayroll: 180,
      hitterPayroll: 105,
      pitcherPayroll: 75,
      topPaidPlayer: { name: 'Jace Cannon', salary: 24 },
      averageSalary: 8,
      medianSalary: 6,
    },
    flexibility: {
      grade: 'B',
      availableSpace: 40,
      luxuryTaxRoom: 25,
      canAddStar: true,
      canAddRole: true,
      narrativeSummary: 'The books can support a targeted move.',
    },
    spendingOptions: [],
    extensions: Array.from({ length: extensionCount }, (_, index) => ({
      playerId: `extension-${index + 1}`,
      name: index === 0 ? 'Rowan Zoric' : `Extension Target ${index + 1}`,
      position: index === 0 ? '2B' : 'SP',
      urgency: index === 0 ? 'extend_now' : 'monitor',
      yearsRemaining: index + 1,
      currentSalary: 4 + index,
      estimatedMarketValue: 6 + index,
      reason: 'Useful roster fit.',
    })),
  };
}

describe('FinancialView', () => {
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

  it('caps extension priorities and separates player name from position text', async () => {
    await act(async () => {
      root.render(<FinancialView data={createFinancialPlaybook(6)} />);
    });

    expect(container.textContent).toContain('Rowan Zoric · 2B');
    expect(container.textContent).not.toContain('Rowan Zoric2B');
    expect(container.querySelectorAll('[data-testid="primary-extension-priority"]')).toHaveLength(4);
    expect(container.textContent).toContain('Show 2 more extension priorities');
  });
});
