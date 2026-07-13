import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FinanceDecisionDeskPanel, type FinanceContractEntry } from './FinanceDecisionDeskPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const CONTRACTS: FinanceContractEntry[] = [
  {
    playerId: 'rental-ace',
    name: 'Rental Ace',
    position: 'SP',
    rosterStatus: 'MLB',
    annualSalary: 22,
    yearsRemaining: 1,
    noTradeClause: false,
    playerOption: false,
    teamOption: false,
  },
  {
    playerId: 'franchise-face',
    name: 'Franchise Face',
    position: 'CF',
    rosterStatus: 'MLB',
    annualSalary: 31,
    yearsRemaining: 4,
    noTradeClause: true,
    playerOption: true,
    teamOption: false,
  },
  {
    playerId: 'corner-bat',
    name: 'Corner Bat',
    position: '1B',
    rosterStatus: 'MLB',
    annualSalary: 16,
    yearsRemaining: 2,
    noTradeClause: false,
    playerOption: false,
    teamOption: false,
  },
  {
    playerId: 'depth-catcher',
    name: 'Depth Catcher',
    position: 'C',
    rosterStatus: 'AAA',
    annualSalary: 0.9,
    yearsRemaining: 1,
    noTradeClause: false,
    playerOption: false,
    teamOption: false,
  },
];

describe('FinanceDecisionDeskPanel', () => {
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

  it('surfaces expiring money, clause watch, and extension-priority contracts', async () => {
    await act(async () => {
      root.render(
        <FinanceDecisionDeskPanel
          contracts={CONTRACTS}
        />,
      );
    });

    expect(container.textContent).toContain('Finance Decision Desk');
    expect(container.textContent).toContain('Expiring Money');
    expect(container.textContent).toContain('Rental Ace');
    expect(container.textContent).toContain('$22.00M clears after this season');
    expect(container.textContent).toContain('Clause Watch');
    expect(container.textContent).toContain('Franchise Face');
    expect(container.textContent).toContain('No-trade protection');
    expect(container.textContent).toContain('Player option');
    expect(container.textContent).toContain('Extension Priority');
    expect(container.textContent).toContain('Corner Bat');
    expect(container.textContent).toContain('2 years left at $16.00M');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });

  it('renders stable empty states when no contracts need triage', async () => {
    await act(async () => {
      root.render(
        <FinanceDecisionDeskPanel
          contracts={[]}
        />,
      );
    });

    expect(container.textContent).toContain('No expiring contracts need attention.');
    expect(container.textContent).toContain('No no-trade or player-option clauses in the current view.');
    expect(container.textContent).toContain('No obvious extension-priority contracts right now.');
  });

  it('never presents a one-year team option as definite expiring money', async () => {
    await act(async () => {
      root.render(
        <FinanceDecisionDeskPanel
          contracts={[{
            ...CONTRACTS[0]!,
            playerId: 'club-option',
            name: 'Club Option',
            teamOption: true,
          }]}
        />,
      );
    });

    expect(container.textContent).toContain('Expiring Money');
    expect(container.textContent).toContain('No expiring contracts need attention.');
    expect(container.textContent).not.toContain('clears after this season');
  });

  it('keeps low-cost MLB players with short control windows in extension priority', async () => {
    await act(async () => {
      root.render(
        <FinanceDecisionDeskPanel
          contracts={[{
            playerId: 'low-cost-starter',
            name: 'Low Cost Starter',
            position: 'SP',
            rosterStatus: 'MLB',
            annualSalary: 2.5,
            yearsRemaining: 2,
            noTradeClause: false,
            playerOption: false,
            teamOption: false,
          }]}
        />,
      );
    });

    expect(container.textContent).toContain('Extension Priority');
    expect(container.textContent).toContain('Low Cost Starter');
    expect(container.textContent).toContain('2 years left at $2.50M');
  });
});
