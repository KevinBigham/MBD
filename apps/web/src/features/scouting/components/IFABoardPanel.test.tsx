import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import IFABoardPanel from './IFABoardPanel';
import type { IFAPoolView, IFAProspectView } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const availableProspect: IFAProspectView = {
  id: 'ifa-1',
  playerName: 'Rafael Ortiz',
  age: 17,
  position: 'SS',
  region: 'dominican_republic',
  country: 'Dominican Republic',
  expectedBonus: 1.25,
  status: 'available',
  signedTeamId: null,
  signedBonus: null,
  looks: 2,
  overall: 58,
  confidence: 6,
  ceiling: 72,
  floor: 42,
  notes: 'Fast hands with room to add strength.',
  scoutConflict: {
    prospectId: 'ifa-1',
    teamId: 'nym',
    prospectType: 'ifa',
    createdSeason: 1,
    resolutionSeason: 4,
    resolved: false,
    headline: 'Front office split on Rafael Ortiz',
    divergence: 18,
    debateGenerated: true,
    resolution: null,
    winningSource: null,
    opinions: [],
    outcomeSummary: null,
  },
};

const signedProspect: IFAProspectView = {
  ...availableProspect,
  id: 'ifa-2',
  playerName: 'Luis Mercado',
  status: 'signed',
  signedTeamId: 'bos',
  signedBonus: 1.75,
  scoutConflict: null,
};

const pool: IFAPoolView = {
  season: 1,
  currentPhase: 'international_signing',
  signingWindowOpen: true,
  budget: {
    baseAllocation: 5,
    tradedIn: 0.5,
    tradedOut: 0.25,
    committed: 1,
    remaining: 4.25,
  },
  staffAccuracy: 0.78,
  prospects: [availableProspect, signedProspect],
};

describe('IFABoardPanel', () => {
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

  it('renders IFA board rows and delegates scout actions for available prospects only', async () => {
    const onScoutProspect = vi.fn();

    await act(async () => {
      root.render(
        <IFABoardPanel
          ifaLoading
          ifaPool={pool}
          onScoutProspect={onScoutProspect}
        />,
      );
    });

    const text = container.textContent ?? '';
    expect(text).toContain('IFA Board');
    expect(text).toContain('Updating international reports...');
    expect(text).toContain('Rafael Ortiz');
    expect(text).toContain('Divergence 18');
    expect(text).toContain('$1.25M');
    expect(text).toContain('Available');
    expect(text).toContain('Luis Mercado');
    expect(text).toContain('$1.75M');

    const scoutButtons = Array.from(container.querySelectorAll('button'));
    expect(scoutButtons).toHaveLength(2);
    expect(scoutButtons[1]?.disabled).toBe(true);

    await act(async () => {
      scoutButtons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      scoutButtons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onScoutProspect).toHaveBeenCalledTimes(1);
    expect(onScoutProspect).toHaveBeenCalledWith(availableProspect);
  });

  it('renders an empty board fallback when no prospects are loaded', async () => {
    await act(async () => {
      root.render(
        <IFABoardPanel
          ifaLoading={false}
          ifaPool={{ ...pool, prospects: [] }}
          onScoutProspect={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('No international prospects are loaded for this season yet.');
  });
});
