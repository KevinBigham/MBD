import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import RivalriesContentPanel from './RivalriesContentPanel';
import type { Rivalry } from '@mbd/contracts';

vi.mock('@mbd/sim-core', () => ({
  getTeamById: vi.fn((teamId: string) => {
    if (teamId === 'nym') return { city: 'New York', name: 'Tycoons', abbreviation: 'NYT' };
    if (teamId === 'bos') return { city: 'Boston', name: "Noreasters", abbreviation: 'BOS' };
    if (teamId === 'lax') return { city: 'Los Angeles', name: 'Sunset Strip', abbreviation: 'LAX' };
    if (teamId === 'sfg') return { city: 'San Francisco', name: 'Sourdoughs', abbreviation: 'SFB' };
    return null;
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const rivalries: Rivalry[] = [
  {
    id: 'nym-bos',
    teamA: 'nym',
    teamB: 'bos',
    intensity: 85,
    summary: 'The greatest rivalry in baseball.',
    reasons: ['Division rivals', 'Historic postseason battles'],
    origin: 'historical',
    active: true,
    currentSeasonWinsA: 7,
    currentSeasonWinsB: 5,
    historicalWinsA: 1200,
    historicalWinsB: 1150,
    eventHistory: [
      { season: 5, type: 'playoff', summary: 'ALCS Game 7 thriller' },
      { season: 4, type: 'series_result', summary: 'Bench-clearing brawl' },
    ],
    closeRaceStreak: 4,
    playoffSeriesStreak: 3,
  },
  {
    id: 'lax-sfg',
    teamA: 'lax',
    teamB: 'sfg',
    intensity: 35,
    summary: 'West coast classic.',
    reasons: ['Division rivals'],
    origin: 'division_race',
    active: false,
    historicalWinsA: 500,
    historicalWinsB: 480,
    eventHistory: [],
  },
];

describe('RivalriesContentPanel', () => {
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

  it('renders rivalry summary, cards, badges, history, and head-to-head bars', async () => {
    await act(async () => {
      root.render(<RivalriesContentPanel rivalries={rivalries} />);
    });

    expect(container.textContent).toContain('Rivalry Watch');
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('active');
    expect(container.textContent).toContain('of 2 total');
    expect(container.textContent).toContain('NYT');
    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('New York Tycoons vs Boston Noreasters');
    expect(container.textContent).toContain('HEATED 85');
    expect(container.textContent).toContain('historical');
    expect(container.textContent).toContain('4-season race');
    expect(container.textContent).toContain('3 playoff meetings');
    expect(container.textContent).toContain('NYT 1200W');
    expect(container.textContent).toContain('7W');
    expect(container.textContent).toContain('ALCS Game 7 thriller');
    expect(container.textContent).toContain('Division rivals');
    expect(container.textContent).toContain('DORMANT');

    const bars = container.querySelectorAll('[data-rivalry-head-to-head-bar="true"]');
    expect(bars.length).toBeGreaterThanOrEqual(3);
  });

  it('renders the empty state when no rivalries have formed yet', async () => {
    await act(async () => {
      root.render(<RivalriesContentPanel rivalries={[]} />);
    });

    expect(container.textContent).toContain('No rivalries yet');
    expect(container.textContent).toContain('Rivalries form through division races');
  });
});
