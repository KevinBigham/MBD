import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { OffseasonArbitrationPanel, type OffseasonArbitrationCaseView } from './OffseasonArbitrationPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function arbitrationCase(overrides: Partial<OffseasonArbitrationCaseView> = {}): OffseasonArbitrationCaseView {
  return {
    playerId: 'arb-1',
    playerName: 'Docket Proof',
    teamId: 'nym',
    serviceClass: 'Year 4',
    previousSalary: 5.2,
    teamOffer: 7.8,
    playerAsk: 9.1,
    projectedSalary: 8.4,
    awardedSalary: null,
    winner: null,
    stage: 'filing',
    ...overrides,
  };
}

describe('OffseasonArbitrationPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('keeps private figures hidden during filing and labels the stage in text', async () => {
    await act(async () => root.render(<OffseasonArbitrationPanel cases={[arbitrationCase()]} />));

    expect(container.querySelector('#arbitration-docket-title')?.textContent).toContain('Arbitration docket');
    expect(container.textContent).toContain('Filed');
    expect(container.textContent).toContain('have not been exchanged publicly');
    expect(container.textContent).not.toContain('Club filing');
  });

  it('shows exchanged figures and a plain-language durable hearing result', async () => {
    await act(async () => root.render(<OffseasonArbitrationPanel cases={[arbitrationCase({
      stage: 'resolved',
      awardedSalary: 9.1,
      winner: 'player',
    })]} />));

    expect(container.textContent).toContain('Award issued');
    expect(container.textContent).toContain('Club filing');
    expect(container.textContent).toContain('$7.8M');
    expect(container.textContent?.match(/\$9\.1M/g)).toHaveLength(2);
    expect(container.textContent).toContain('player filing selected');
  });
});
