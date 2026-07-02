import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import FreeAgencyContractOfferPanel, {
  type FreeAgencyOfferBudget,
  type FreeAgentOfferPlayer,
} from './FreeAgencyContractOfferPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const selectedPlayer: FreeAgentOfferPlayer = {
  id: 'fa-1',
  firstName: 'Power',
  lastName: 'Bat',
  position: '1B',
  age: 31,
  displayRating: 66,
  marketValue: 22,
};

const offerBudget: FreeAgencyOfferBudget = {
  projectedPayroll: 162,
  budgetRoom: -2,
  taxRoom: 8,
};

describe('FreeAgencyContractOfferPanel', () => {
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

  it('renders the empty contract state until a player is selected', async () => {
    await act(async () => {
      root.render(
        <FreeAgencyContractOfferPanel
          selectedPlayer={null}
          offerYears={3}
          offerSalary={10}
          offerBudget={null}
          offerResult={null}
          onOfferYearsChange={vi.fn()}
          onOfferSalaryChange={vi.fn()}
          onSubmitOffer={vi.fn()}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Contract Offer');
    expect(container.textContent).toContain('Select a free agent to make an offer');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.querySelector('[data-mobile-critical-control="free-agency-offer-contract"]')).toBeNull();
  });

  it('renders offer terms, budget impact, and delegates offer actions', async () => {
    const onOfferYearsChange = vi.fn();
    const onOfferSalaryChange = vi.fn();
    const onSubmitOffer = vi.fn();

    await act(async () => {
      root.render(
        <FreeAgencyContractOfferPanel
          selectedPlayer={selectedPlayer}
          offerYears={4}
          offerSalary={22}
          offerBudget={offerBudget}
          offerResult="Rejected: Needs more years."
          onOfferYearsChange={onOfferYearsChange}
          onOfferSalaryChange={onOfferSalaryChange}
          onSubmitOffer={onSubmitOffer}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Power Bat');
    expect(container.textContent).toContain('1B | Age 31 | OVR 66');
    expect(container.textContent).toContain('$22.0M/yr');
    expect(container.textContent).toContain('Total: $88.0M / 4yr');
    expect(container.textContent).toContain('Projected payroll');
    expect(container.textContent).toContain('$162.0M');
    expect(container.textContent).toContain('$2.0M over');
    expect(container.textContent).toContain('$8.0M');
    expect(container.textContent).toContain('Rejected: Needs more years.');

    const rangeInputs = Array.from(container.querySelectorAll('input[type="range"]')) as HTMLInputElement[];
    const yearsInput = rangeInputs[0];
    const salaryInput = rangeInputs[1];
    if (!yearsInput || !salaryInput) {
      throw new Error('Expected contract offer years and salary range controls.');
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(yearsInput, '5');
      yearsInput.dispatchEvent(new Event('input', { bubbles: true }));
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(salaryInput, '24');
      salaryInput.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onOfferYearsChange).toHaveBeenCalledWith(5);
    expect(onOfferSalaryChange).toHaveBeenCalledWith(24);

    await act(async () => {
      container
        .querySelector('[data-mobile-critical-control="free-agency-offer-contract"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onSubmitOffer).toHaveBeenCalledTimes(1);
  });
});
