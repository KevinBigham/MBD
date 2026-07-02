import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { FrontOfficeLeagueStandingCard, type FrontOfficeRelationshipView } from './FrontOfficeLeagueStandingCard';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const RELATIONSHIPS: FrontOfficeRelationshipView[] = [
  {
    teamId: 'bos',
    teamName: 'Boston Noreasters',
    teamAbbreviation: 'BOS',
    score: 38,
    tier: 'friendly',
    tooltip: 'Boston Noreasters view you as a friendly trade partner.',
    lastInteractionSeason: 5,
    lastEventLabel: 'S5',
    latestMemoryDescription: 'a trade both sides could justify',
  },
  {
    teamId: 'sea',
    teamName: 'Seattle Drizzle',
    teamAbbreviation: 'SEA',
    score: -22,
    tier: 'neutral',
    tooltip: 'Seattle Drizzle hold a neutral stance toward your front office.',
    lastInteractionSeason: 4,
    lastEventLabel: 'S4',
    latestMemoryDescription: null,
  },
  {
    teamId: 'atl',
    teamName: 'Atlanta Kings',
    teamAbbreviation: 'ATL',
    score: 12,
    tier: 'trusted',
    tooltip: 'Atlanta Kings trust your front office.',
    lastInteractionSeason: 7,
    lastEventLabel: 'S7',
    latestMemoryDescription: 'a deadline call that helped both clubs',
  },
];

function textIndex(container: HTMLElement, text: string): number {
  return container.textContent?.indexOf(text) ?? -1;
}

describe('FrontOfficeLeagueStandingCard', () => {
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

  it('renders relationship standings with deterministic score, team, and season sort controls', async () => {
    await act(async () => {
      root.render(<FrontOfficeLeagueStandingCard relationships={RELATIONSHIPS} />);
    });

    expect(container.textContent).toContain('League Standing');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(textIndex(container, 'BOS · Boston Noreasters')).toBeLessThan(textIndex(container, 'ATL · Atlanta Kings'));
    expect(textIndex(container, 'ATL · Atlanta Kings')).toBeLessThan(textIndex(container, 'SEA · Seattle Drizzle'));
    expect(container.textContent).toContain('Friendly');
    expect(container.textContent).toContain('Trusted');
    expect(container.textContent).toContain('No memorable front-office friction or goodwill logged yet.');

    const teamButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Team');
    await act(async () => {
      teamButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(textIndex(container, 'ATL · Atlanta Kings')).toBeLessThan(textIndex(container, 'BOS · Boston Noreasters'));
    expect(textIndex(container, 'BOS · Boston Noreasters')).toBeLessThan(textIndex(container, 'SEA · Seattle Drizzle'));

    const seasonButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Last Event');
    await act(async () => {
      seasonButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(textIndex(container, 'ATL · Atlanta Kings')).toBeLessThan(textIndex(container, 'BOS · Boston Noreasters'));
    expect(textIndex(container, 'BOS · Boston Noreasters')).toBeLessThan(textIndex(container, 'SEA · Seattle Drizzle'));
  });
});
