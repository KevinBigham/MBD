import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import StandingsContentPanel from './StandingsContentPanel';
import type { TeamStandingsDTO } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const standings: Record<string, TeamStandingsDTO[]> = {
  al_east: [
    {
      teamId: 'nym',
      teamName: 'Tycoons',
      city: 'New York',
      abbreviation: 'NYT',
      division: 'al_east',
      wins: 52,
      losses: 28,
      pct: '.650',
      gamesBack: 0,
      streak: 'W4',
      runDifferential: 84,
    },
    {
      teamId: 'bos',
      teamName: 'Noreasters',
      city: 'Boston',
      abbreviation: 'BOS',
      division: 'al_east',
      wins: 47,
      losses: 33,
      pct: '.588',
      gamesBack: 5,
      streak: 'L2',
      runDifferential: -11,
    },
  ],
  nl_west: [],
};

describe('StandingsContentPanel', () => {
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

  it('renders the standings header, sorted divisions, table rows, mobile rows, and empty divisions', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <StandingsContentPanel
            day={80}
            season={3}
            standings={standings}
            userTeamId="nym"
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('League Standings');
    expect(container.textContent).toContain('Season 3 | Day 80');
    expect(container.textContent).toContain('Al East');
    expect(container.textContent).toContain('Nl West');
    expect(container.textContent).toContain('NYT');
    expect(container.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('52');
    expect(container.textContent).toContain('.650');
    expect(container.textContent).toContain('+84');
    expect(container.textContent).toContain('W4');
    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('5.0');
    expect(container.textContent).toContain('-11');
    expect(container.textContent).toContain('L2');
    expect(container.textContent).toContain('Sim games to see standings');
    expect(container.querySelector('[aria-label="Help for Know your window"]')).not.toBeNull();
  });
});
