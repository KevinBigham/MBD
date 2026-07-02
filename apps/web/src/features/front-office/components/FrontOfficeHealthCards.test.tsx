import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { TeamChemistry } from '@mbd/contracts';
import {
  FrontOfficeChemistryCard,
  FrontOfficeReputationCard,
  type FrontOfficeReputationView,
} from './FrontOfficeHealthCards';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const REPUTATION: FrontOfficeReputationView = {
  reputation: 68,
  draftScore: 15,
  tradeScore: -5,
  freeAgencyScore: 22,
  playoffScore: 30,
  summary: 'A respected front office with strong draft acumen.',
};

const CHEMISTRY: TeamChemistry = {
  teamId: 'nym',
  score: 72,
  tier: 'connected',
  trend: 'rising',
  summary: 'Good vibes in the clubhouse.',
  reasons: ['Strong veteran leadership', 'Winning streak boosts morale'],
};

describe('FrontOfficeHealthCards', () => {
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

  it('renders reputation deltas and clubhouse chemistry reasons', async () => {
    await act(async () => {
      root.render(
        <>
          <FrontOfficeReputationCard reputation={REPUTATION} />
          <FrontOfficeChemistryCard chemistry={CHEMISTRY} />
        </>,
      );
    });

    expect(container.textContent).toContain('Front Office Reputation');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(2);
    expect(container.textContent).toContain('Overall Rating');
    expect(container.textContent).toContain('+15');
    expect(container.textContent).toContain('-5');
    expect(container.textContent).toContain('+22');
    expect(container.textContent).toContain('+30');
    expect(container.textContent).toContain('strong draft acumen');
    expect(container.textContent).toContain('Clubhouse Chemistry');
    expect(container.textContent).toContain('connected');
    expect(container.textContent).toContain('Trend: Improving');
    expect(container.textContent).toContain('Strong veteran leadership');
    expect(container.textContent).toContain('Good vibes in the clubhouse');
  });

  it('renders falling chemistry without requiring reason rows', async () => {
    await act(async () => {
      root.render(
        <FrontOfficeChemistryCard
          chemistry={{
            ...CHEMISTRY,
            tier: 'fractured',
            trend: 'falling',
            reasons: [],
          }}
        />,
      );
    });

    expect(container.textContent).toContain('fractured');
    expect(container.textContent).toContain('Trend: Declining');
    expect(container.textContent).not.toContain('Strong veteran leadership');
  });
});
