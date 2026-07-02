import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { ScoutingFrontOfficeContextPanel, type ScoutingOwnerStateView } from './ScoutingFrontOfficeContextPanel';
import type { TeamChemistry } from '@mbd/contracts';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const ownerState: ScoutingOwnerStateView = {
  hotSeat: true,
  patience: 42,
  confidence: 38,
  summary: 'Ownership wants faster scouting returns.',
};

const chemistry: TeamChemistry = {
  teamId: 'nym',
  score: 76,
  tier: 'connected',
  trend: 'rising',
  summary: 'The clubhouse trusts the player development plan.',
  reasons: [],
};

describe('ScoutingFrontOfficeContextPanel', () => {
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

  it('renders owner outlook and clubhouse chemistry context', async () => {
    await act(async () => {
      root.render(
        <ScoutingFrontOfficeContextPanel
          chemistry={chemistry}
          ownerState={ownerState}
        />,
      );
    });

    expect(container.textContent).toContain('Front Office Context');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Owner outlook');
    expect(container.textContent).toContain('HOT SEAT');
    expect(container.textContent).toContain('Ownership wants faster scouting returns.');
    expect(container.textContent).toContain('Patience 42');
    expect(container.textContent).toContain('Confidence 38');
    expect(container.textContent).toContain('Clubhouse read');
    expect(container.textContent).toContain('76');
    expect(container.textContent).toContain('The clubhouse trusts the player development plan.');
    expect(container.textContent).toContain('connected clubhouse');
  });

  it('renders stable fallback copy when owner and chemistry data are unavailable', async () => {
    await act(async () => {
      root.render(
        <ScoutingFrontOfficeContextPanel
          chemistry={null}
          ownerState={null}
        />,
      );
    });

    expect(container.textContent).toContain('STABLE');
    expect(container.textContent).toContain('Owner narrative not available yet.');
    expect(container.textContent).toContain('--');
    expect(container.textContent).toContain('Chemistry data not available yet.');
  });
});
