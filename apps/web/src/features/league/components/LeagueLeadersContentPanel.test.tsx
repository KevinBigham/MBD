import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import LeagueLeadersContentPanel from './LeagueLeadersContentPanel';

vi.mock('@/shared/components/TeamLogo', () => ({
  TeamLogo: ({ teamId }: { teamId: string }) => <span data-testid={`team-logo-${teamId}`} />,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const hitterLeader = {
  id: 'hitter-1',
  firstName: 'Aaron',
  lastName: 'Judge',
  position: 'RF',
  teamId: 'nym',
  displayRating: 73,
  stats: {
    avg: '.318',
    hr: 32,
    rbi: 88,
    hits: 126,
    strikeouts: 0,
    era: '0.00',
  },
  advanced: {
    war: 5.6,
    woba: 0.412,
    wrcPlus: 168,
    opsPlus: 171,
    iso: 0.294,
    fip: null,
    xfip: null,
    whip: null,
    kPer9: null,
    bbPer9: null,
    kBb: null,
  },
} as PlayerDTO;

const pitcherLeader = {
  id: 'pitcher-1',
  firstName: 'Gerrit',
  lastName: 'Cole',
  position: 'SP',
  teamId: 'nym',
  displayRating: 68,
  stats: {
    avg: '.000',
    hr: 0,
    rbi: 0,
    hits: 0,
    strikeouts: 151,
    era: '2.91',
  },
  advanced: {
    war: 4.9,
    woba: null,
    wrcPlus: null,
    opsPlus: null,
    iso: null,
    fip: 2.83,
    xfip: 3.04,
    whip: 1.01,
    kPer9: 10.8,
    bbPer9: 2.1,
    kBb: 5.14,
  },
} as PlayerDTO;

describe('LeagueLeadersContentPanel', () => {
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

  it('renders batting leader rows with stat category controls', async () => {
    const onSelectCategory = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <LeagueLeadersContentPanel
            season={5}
            activeCat="war"
            leaders={[hitterLeader]}
            onSelectCategory={onSelectCategory}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('League Leaders');
    expect(container.textContent).toContain('Season 5 sabermetric board');
    expect(container.textContent).toContain('Aaron Judge');
    expect(container.textContent).toContain('wOBA');
    expect(container.textContent).toContain('wRC+');
    expect(container.textContent).toContain('5.6');

    const hrButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('HR'),
    );

    await act(async () => {
      hrButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelectCategory).toHaveBeenCalledWith('hr');
  });

  it('marks category buttons as route-critical mobile controls', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <LeagueLeadersContentPanel
            season={5}
            activeCat="war"
            leaders={[hitterLeader]}
            onSelectCategory={vi.fn()}
          />
        </MemoryRouter>,
      );
    });

    const categoryButtons = Array.from(
      container.querySelectorAll('button[data-mobile-critical-control="league-leaders-category"]'),
    );

    expect(categoryButtons.length).toBeGreaterThan(0);
    expect(categoryButtons.length).toBe(container.querySelectorAll('button').length);
    for (const button of categoryButtons) {
      expect(button.className).toContain('mobile-critical-control');
      expect(button.className).toContain('focus-ring');
    }
  });

  it('renders pitching support columns and the empty leaderboard state', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <LeagueLeadersContentPanel
            season={5}
            activeCat="fip"
            leaders={[pitcherLeader]}
            onSelectCategory={vi.fn()}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Gerrit Cole');
    expect(container.textContent).toContain('FIP leaders');
    expect(container.textContent).toContain('xFIP');
    expect(container.textContent).toContain('2.83');

    await act(async () => {
      root.render(
        <MemoryRouter>
          <LeagueLeadersContentPanel
            season={5}
            activeCat="woba"
            leaders={[]}
            onSelectCategory={vi.fn()}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Sim games to populate the leaderboard board.');
  });
});
