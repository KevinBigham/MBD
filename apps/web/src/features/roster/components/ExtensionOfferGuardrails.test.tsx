import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { ExtensionOfferGuardrails } from './ExtensionOfferGuardrails';
import type { ExtensionCandidateView } from './ExtensionCommandCenter';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ExtensionOfferGuardrails', () => {
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

  it('summarizes effective AAV against target and walk-away guardrails', async () => {
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

    await act(async () => {
      root.render(
        <ExtensionOfferGuardrails
          candidate={candidate}
          years={4}
          annualSalary={11}
          signingBonus={4}
          noTradeClause
          optOut
        />,
      );
    });

    expect(container.textContent).toContain('Offer Guardrails');
    expect(container.textContent).toContain('Inside negotiation lane');
    expect(container.textContent).toContain('Effective AAV');
    expect(container.textContent).toContain('$12.0M');
    expect(container.textContent).toContain('Target');
    expect(container.textContent).toContain('Walk-Away');
    expect(container.textContent).toContain('$13.2M');
    expect(container.textContent).toContain('NTC + opt-out');
    expect(container.textContent).toContain('Payroll Runway');
    expect(container.textContent).toContain('1 year control');
    expect(container.textContent).toContain('Adds $2.0M/year');
    expect(container.textContent).toContain('On target');
  });

  it('flags lowball and over-walk-away offers from the same candidate data', async () => {
    const candidate: ExtensionCandidateView = {
      playerId: 'ext-2',
      playerName: 'Max Leverage',
      position: 'SP',
      yearsRemaining: 2,
      currentSalary: 20,
      willingness: 0.48,
      demandMultiplier: 1.3,
      walkAwayThreshold: 0.2,
    };

    await act(async () => {
      root.render(
        <ExtensionOfferGuardrails
          candidate={candidate}
          years={5}
          annualSalary={21}
          signingBonus={0}
          noTradeClause={false}
          optOut={false}
        />,
      );
    });

    expect(container.textContent).toContain('Below player target');

    await act(async () => {
      root.render(
        <ExtensionOfferGuardrails
          candidate={candidate}
          years={5}
          annualSalary={32}
          signingBonus={0}
          noTradeClause={false}
          optOut={false}
        />,
      );
    });

    expect(container.textContent).toContain('Over walk-away line');
  });
});
