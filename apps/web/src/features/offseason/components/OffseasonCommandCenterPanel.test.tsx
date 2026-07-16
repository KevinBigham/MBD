import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { deriveMarketRevenueStatement } from '@mbd/sim-core';
import {
  OffseasonCommandCenterPanel,
  type OffseasonCommandCenterView,
} from './OffseasonCommandCenterPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makeCommandCenter(overrides: Partial<OffseasonCommandCenterView> = {}): OffseasonCommandCenterView {
  return {
    checklist: [
      {
        id: 'arbitration',
        label: 'Arbitration',
        status: 'complete',
        detail: 'No active arbitration files.',
      },
      {
        id: 'free_agency',
        label: 'Free Agency',
        status: 'attention',
        detail: 'Market is open; fill the projected roster holes.',
      },
      {
        id: 'budget',
        label: 'Budget',
        status: 'blocked',
        detail: 'Payroll projects above the owner budget.',
      },
      {
        id: 'staff',
        label: 'Staff',
        status: 'upcoming',
        detail: 'Coaching changes open later in the offseason.',
      },
    ],
    warnings: [
      {
        id: 'roster-active_roster_under_limit',
        severity: 'warning',
        title: 'Roster hole',
        detail: 'Active roster has 24 players (target 26).',
      },
      {
        id: 'budget-over-cap',
        severity: 'danger',
        title: 'Budget overage',
        detail: 'Projected payroll is above the owner budget.',
      },
    ],
    projectedOpeningDay: {
      activeRosterCount: 24,
      activeRosterLimit: 26,
      fortyManCount: 39,
      fortyManLimit: 40,
      payroll: 186,
      budget: 180,
      payrollSpace: -6,
      ownerPayrollPolicy: {
        archetype: 'patient_builder',
        floor: 72,
        softCeiling: 180,
        totalPayroll: 186,
        ownerBand: 'above_soft_ceiling',
        floorShortfall: 0,
        softCeilingRoom: 0,
        softCeilingOverage: 6,
        taxThreshold: 230,
        luxuryTaxPayroll: 170,
        taxBand: 'clear',
        taxRoom: 60,
        taxOverage: 0,
        projectedTax: 0,
      },
      marketRevenueStatement: deriveMarketRevenueStatement({
        teamId: 'msp',
        wins: 92,
        losses: 70,
        madePlayoffs: true,
        ownerArchetype: 'patient_builder',
      }),
      rosterHoleCount: 2,
    },
    ...overrides,
  };
}

describe('OffseasonCommandCenterPanel', () => {
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

  it('renders projected roster/payroll totals, checklist statuses, and warnings', async () => {
    await act(async () => {
      root.render(<OffseasonCommandCenterPanel commandCenter={makeCommandCenter()} />);
    });

    expect(container.textContent).toContain('Offseason Command Center');
    expect(container.textContent).toContain('Opening Day Projection');
    expect(container.textContent).toContain('24/26');
    expect(container.textContent).toContain('39/40');
    expect(container.textContent).toContain('$186.0M');
    expect(container.textContent).toContain('-$6.0M');
    expect(container.textContent).toContain('Effective Payroll Space');
    expect(container.textContent).toContain('Above soft ceiling');
    expect(container.textContent).toContain('Floor');
    expect(container.textContent).toContain('$72.0M');
    expect(container.textContent).toContain('Tax line');
    expect(container.textContent).toContain('$230.0M');
    expect(container.textContent).toContain('Modeled gross revenue');
    expect(container.textContent).toContain('Record-driven attendance');
    expect(container.textContent).toContain('Playoff bump');
    expect(container.textContent).toContain('Raw next-season budget');
    expect(container.textContent).toContain('Complete');
    expect(container.textContent).toContain('Needs attention');
    expect(container.textContent).toContain('Blocked');
    expect(container.textContent).toContain('Upcoming');
    expect(container.textContent).toContain('Roster hole');
    expect(container.textContent).toContain('Budget overage');
    expect(container.innerHTML).toContain('text-red-300');
  });

  it('renders the no-warning state when roster and budget blockers are absent', async () => {
    await act(async () => {
      root.render(<OffseasonCommandCenterPanel commandCenter={makeCommandCenter({ warnings: [] })} />);
    });

    expect(container.textContent).toContain('No roster or budget blockers detected.');
  });
});
