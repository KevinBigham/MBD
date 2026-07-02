import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  RosterExtensionNegotiationModal,
  type ExtensionOfferView,
  type ExtensionResponseView,
} from './RosterExtensionNegotiationModal';
import type { ExtensionCandidateView } from './ExtensionCommandCenter';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const candidate: ExtensionCandidateView = {
  playerId: 'ext-1',
  playerName: 'Diego Future',
  position: 'SS',
  yearsRemaining: 1,
  currentSalary: 10,
  willingness: 0.78,
  demandMultiplier: 1.2,
  walkAwayThreshold: 0.1,
};

const offer: ExtensionOfferView = {
  years: 4,
  annualSalary: 11,
  totalValue: 44,
  noTradeClause: false,
  noTradeClauseType: 'none',
  playerOption: false,
  teamOption: false,
  optOutYears: [],
  signingBonus: 4,
  buyoutAmount: 0,
  deferredMoney: [],
};

const response: ExtensionResponseView = {
  status: 'countered',
  rounds: [{ round: 1, status: 'countered' }],
  counterOffer: {
    ...offer,
    years: 5,
    annualSalary: 12.5,
    totalValue: 62.5,
  },
  review: {
    status: 'countered',
    riskLevel: 'medium',
    offerGapPct: 8.5,
    teamOfferAav: 12,
    playerDemandAav: 13,
    evidence: ['Agent sees room for one more move.'],
  },
};

function setInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function flushFocusTrap() {
  await act(async () => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 60);
    });
  });
}

describe('RosterExtensionNegotiationModal', () => {
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

  it('renders extension context, guardrails, latest response, and delegates controls', async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const onOfferYearsChange = vi.fn();
    const onOfferSalaryChange = vi.fn();
    const onOfferSigningBonusChange = vi.fn();
    const onOfferNoTradeChange = vi.fn();
    const onOfferOptOutChange = vi.fn();

    await act(async () => {
      root.render(
        <RosterExtensionNegotiationModal
          candidate={candidate}
          offer={offer}
          offerYears={4}
          offerSalary="11.0"
          offerSigningBonus="4.0"
          offerNoTrade={false}
          offerOptOut={false}
          negotiationResponse={response}
          busyAction={null}
          onClose={onClose}
          onSubmit={onSubmit}
          onOfferYearsChange={onOfferYearsChange}
          onOfferSalaryChange={onOfferSalaryChange}
          onOfferSigningBonusChange={onOfferSigningBonusChange}
          onOfferNoTradeChange={onOfferNoTradeChange}
          onOfferOptOutChange={onOfferOptOutChange}
        />,
      );
    });

    expect(container.textContent).toContain('Extension Negotiation');
    expect(container.textContent).toContain('Diego Future');
    expect(container.textContent).toContain('Current Deal');
    expect(container.textContent).toContain('$10.0M');
    expect(container.textContent).toContain('Proposed Extension');
    expect(container.textContent).toContain('Offer Guardrails');
    expect(container.textContent).toContain('Latest Response');
    expect(container.textContent).toContain('countered');
    expect(container.textContent).toContain('Counter AAV');
    expect(container.textContent).toContain('$12.5M');
    expect(container.textContent).toContain('Gap 8.5%');
    expect(container.textContent).toContain('medium risk');
    expect(container.textContent).toContain('Agent sees room for one more move.');

    const inputs = Array.from(container.querySelectorAll('input'));
    const yearsInput = inputs[0] as HTMLInputElement;
    const salaryInput = inputs[1] as HTMLInputElement;
    const bonusInput = inputs[2] as HTMLInputElement;
    const noTradeInput = inputs[3] as HTMLInputElement;
    const optOutInput = inputs[4] as HTMLInputElement;

    await act(async () => {
      setInputValue(yearsInput, '6');
      setInputValue(salaryInput, '12.5');
      setInputValue(bonusInput, '6.5');
      noTradeInput.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      optOutInput.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onOfferYearsChange).toHaveBeenCalledWith(6);
    expect(onOfferSalaryChange).toHaveBeenCalledWith('12.5');
    expect(onOfferSigningBonusChange).toHaveBeenCalledWith('6.5');
    expect(onOfferNoTradeChange).toHaveBeenCalledWith(true);
    expect(onOfferOptOutChange).toHaveBeenCalledWith(true);

    const closeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Close'),
    );
    const walkAwayButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Walk Away'),
    );
    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Submit Offer'),
    );

    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      walkAwayButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      submitButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('marks the submit button busy only for the selected extension action', async () => {
    await act(async () => {
      root.render(
        <RosterExtensionNegotiationModal
          candidate={candidate}
          offer={offer}
          offerYears={4}
          offerSalary="11.0"
          offerSigningBonus="4.0"
          offerNoTrade={false}
          offerOptOut={false}
          negotiationResponse={null}
          busyAction="extension-ext-1"
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          onOfferYearsChange={vi.fn()}
          onOfferSalaryChange={vi.fn()}
          onOfferSigningBonusChange={vi.fn()}
          onOfferNoTradeChange={vi.fn()}
          onOfferOptOutChange={vi.fn()}
        />,
      );
    });

    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Submit Offer'),
    ) as HTMLButtonElement | undefined;

    expect(submitButton?.disabled).toBe(true);
  });

  it('traps focus inside the dialog and restores launcher focus on Escape', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open extension negotiation
          </button>
          {open ? (
            <RosterExtensionNegotiationModal
              candidate={candidate}
              offer={offer}
              offerYears={4}
              offerSalary="11.0"
              offerSigningBonus="4.0"
              offerNoTrade={false}
              offerOptOut={false}
              negotiationResponse={null}
              busyAction={null}
              onClose={() => setOpen(false)}
              onSubmit={vi.fn()}
              onOfferYearsChange={vi.fn()}
              onOfferSalaryChange={vi.fn()}
              onOfferSigningBonusChange={vi.fn()}
              onOfferNoTradeChange={vi.fn()}
              onOfferOptOutChange={vi.fn()}
            />
          ) : null}
        </>
      );
    }

    await act(async () => {
      root.render(<Harness />);
    });

    const launcher = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Open extension negotiation'),
    ) as HTMLButtonElement;
    launcher.focus();

    await act(async () => {
      launcher.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushFocusTrap();

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('roster-extension-negotiation-title');

    const closeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Close'),
    ) as HTMLButtonElement;
    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Submit Offer'),
    ) as HTMLButtonElement;
    expect(document.activeElement).toBe(closeButton);

    submitButton.focus();
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      document.dispatchEvent(tabEvent);
    });
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(closeButton);

    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      document.dispatchEvent(shiftTabEvent);
    });
    expect(shiftTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(submitButton);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });
});
