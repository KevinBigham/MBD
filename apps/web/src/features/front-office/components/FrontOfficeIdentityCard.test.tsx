import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  FrontOfficeIdentityCard,
  type FrontOfficeIdentityView,
} from './FrontOfficeIdentityCard';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const IDENTITY: FrontOfficeIdentityView = {
  assistantGM: {
    id: 'elena_vargas',
    name: 'Elena Vargas',
    focus: 'Elena improves development and international looks.',
    upside: 'Player development, international scouting, prospect trust',
    watchout: 'Homegrown prospect selloffs carry extra heat.',
  },
  scoutingDirector: {
    name: 'Avery Solis',
    focus: 'International',
    draftAccuracy: 0.71,
    internationalAccuracy: 0.82,
    proAccuracy: 0.7,
  },
  philosophy: {
    seasonGoal: 'Rebuild',
    developmentStyle: 'Patient',
    scoutingFocus: 'International',
    spendingStyle: 'Penny Pincher',
    tradeApproach: 'Seller',
    mediaTone: 'Measured',
  },
  alignment: {
    overall: { score: 72, impact: 3, label: 'strong', summary: 'Overall identity alignment is 72.' },
    mandate: { score: 76, impact: 3, label: 'strong', summary: 'Rebuild mandate is aligned.' },
    spending: { score: 68, impact: 2, label: 'steady', summary: 'Spending is coherent.' },
    trade: { score: 71, impact: 3, label: 'strong', summary: 'Trade posture is coherent.' },
    development: { score: 74, impact: 3, label: 'strong', summary: 'Development posture is coherent.' },
    media: { score: 69, impact: -2, label: 'watch', summary: 'Media posture needs attention.' },
  },
  visibleEffects: [],
  recentConsequence: {
    headline: 'Day One identity is now on the ledger.',
    body: 'The scouting and development lanes are visible to the room.',
    timestamp: 'S1D1',
  },
};

describe('FrontOfficeIdentityCard', () => {
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

  it('renders assistant, scouting, philosophy, alignment, and consequence details', async () => {
    await act(async () => {
      root.render(<FrontOfficeIdentityCard identity={IDENTITY} />);
    });

    expect(container.textContent).toContain('Front Office Identity');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Elena Vargas');
    expect(container.textContent).toContain('prospect selloffs carry extra heat');
    expect(container.textContent).toContain('Avery Solis');
    expect(container.textContent).toContain('71%');
    expect(container.textContent).toContain('82%');
    expect(container.textContent).toContain('70%');
    expect(container.textContent).toContain('Overall Alignment');
    expect(container.textContent).toContain('Rebuild');
    expect(container.textContent).toContain('Penny Pincher');
    expect(container.textContent).toContain('Seller');
    expect(container.textContent).toContain('-2');
    expect(container.textContent).toContain('Day One identity is now on the ledger.');
  });

  it('renders base scouting labels and no consequence block when optional identity data is absent', async () => {
    await act(async () => {
      root.render(
        <FrontOfficeIdentityCard
          identity={{
            ...IDENTITY,
            scoutingDirector: null,
            recentConsequence: null,
          }}
        />,
      );
    });

    expect(container.textContent).toContain('Scouting Director');
    expect(container.textContent).toContain('Base');
    expect(container.textContent).not.toContain('Day One identity is now on the ledger.');
  });
});
