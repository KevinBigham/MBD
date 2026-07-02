import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { OffseasonResultSummaryGrid, type OffseasonPhaseResultsView } from './OffseasonResultSummaryGrid';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const phaseResults: OffseasonPhaseResultsView = {
  arbitrationResolved: [{ id: 'arb-1' }],
  tenderedPlayers: ['player-2', 'player-3'],
  nonTenderedPlayers: ['player-4'],
  extensions: [{ id: 'ext-1' }],
  qualifyingOffers: [{ id: 'qo-1' }, { id: 'qo-2' }],
  coachChanges: [{ id: 'coach-1' }],
  freeAgentSignings: [{ id: 'fa-1' }],
  draftPicks: [{ id: 'pick-1' }],
  ifaSignings: [{ id: 'ifa-1' }],
  retiredPlayers: [{ id: 'retire-1' }],
};

describe('OffseasonResultSummaryGrid', () => {
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

  it('renders the phase result counts used by the offseason summary grid', async () => {
    await act(async () => {
      root.render(<OffseasonResultSummaryGrid phaseResults={phaseResults} />);
    });

    expect(container.textContent).toContain('Arbitrations');
    expect(container.textContent).toContain('Tendered');
    expect(container.textContent).toContain('Non-Tendered');
    expect(container.textContent).toContain('Extensions');
    expect(container.textContent).toContain('QOs');
    expect(container.textContent).toContain('FA Signings');
    expect(container.textContent).toContain('Draft Picks');
    expect(container.textContent).toContain('Staff Moves');
    expect(container.textContent).toContain('Retirements');
    expect(container.textContent).toContain('2');
  });
});
