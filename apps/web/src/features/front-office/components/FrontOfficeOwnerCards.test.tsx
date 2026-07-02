import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  FrontOfficeBudgetCard,
  FrontOfficeOwnerProfileCard,
  type FrontOfficeOwnerView,
} from './FrontOfficeOwnerCards';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const OWNER: FrontOfficeOwnerView = {
  archetype: 'win_now',
  patience: 35,
  confidence: 72,
  hotSeat: true,
  summary: 'The owner demands results immediately.',
  expectations: { winsTarget: 95, playoffTarget: true, payrollTarget: 180_000_000 },
  satisfaction: 45,
  spendingWillingness: 80,
  winNowPressure: 90,
  meddlingLevel: 60,
  annualBudget: 200_000_000,
  payrollCap: 180_000_000,
  draftBonusPool: 8_000_000,
  ifaBonusPool: 5_000_000,
  staffBudget: 12_000_000,
};

describe('FrontOfficeOwnerCards', () => {
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

  it('renders owner profile expectations and budget money formatting', async () => {
    await act(async () => {
      root.render(
        <>
          <FrontOfficeOwnerProfileCard owner={OWNER} />
          <FrontOfficeBudgetCard owner={OWNER} />
        </>,
      );
    });

    expect(container.textContent).toContain('Owner Profile');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(2);
    expect(container.textContent).toContain('HOT SEAT');
    expect(container.textContent).toContain('Win Now');
    expect(container.textContent).toContain('95+');
    expect(container.textContent).toContain('Expected');
    expect(container.textContent).toContain('owner demands results');
    expect(container.textContent).toContain('$200.0M');
    expect(container.textContent).toContain('$180.0M');
    expect(container.textContent).toContain('$8.0M');
    expect(container.textContent).toContain('$5.0M');
    expect(container.textContent).toContain('$12.0M');
    expect(container.textContent).toContain('Spending Will');
  });

  it('renders calm owner state and small budget values without hot-seat treatment', async () => {
    const calmOwner: FrontOfficeOwnerView = {
      ...OWNER,
      archetype: 'patient_builder',
      hotSeat: false,
      expectations: { winsTarget: 81, playoffTarget: false, payrollTarget: 950_000 },
      annualBudget: 950_000,
    };

    await act(async () => {
      root.render(<FrontOfficeOwnerProfileCard owner={calmOwner} />);
    });

    expect(container.textContent).toContain('Patient Builder');
    expect(container.textContent).toContain('81+');
    expect(container.textContent).toContain('Optional');
    expect(container.textContent).toContain('$950K');
    expect(container.textContent).not.toContain('HOT SEAT');
  });
});
